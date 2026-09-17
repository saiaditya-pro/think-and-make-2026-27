"""
One-off migration command: reads the existing
"Datla-Think & Make _ 2026-2027.xlsx" (Google Form response dumps) and
upserts every row into the new relational tables, keeping the original
"Submission ID" as ``external_ref`` on each row for traceability -- see the
"Migration off Google Sheets" section of the approved architecture plan.

Usage:
    python manage.py import_legacy_sheets --file "../docs/Datla-Think & Make _ 2026-2027.xlsx"

Re-running is safe: rows are upserted by external_ref (or by natural key
where no Submission ID exists), never duplicated.
"""

import re
from datetime import datetime

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from openpyxl import load_workbook

from apps.headcounts.models import StudentHeadcount
from apps.kits.models import KitDelivery
from apps.programs.models import Partner, ProgramInstance
from apps.schools.models import School, SchoolGradeEnrollment, SchoolTeacher, SessionSchedule
from apps.sl_selection.models import SLSelection

TRUE_STRINGS = {"yes", "y", "true", "1"}


def _headers(sheet):
    return {cell.value: idx for idx, cell in enumerate(next(sheet.iter_rows(min_row=1, max_row=1)))}


def _rows(sheet, headers):
    for row in sheet.iter_rows(min_row=2, values_only=True):
        if row[0] is None:
            continue
        yield {name: row[idx] for name, idx in headers.items() if name is not None}


def _bool(value) -> bool:
    return str(value).strip().lower() in TRUE_STRINGS if value is not None else False


def _smart_board(value) -> str:
    """Tri-state: 'yes' / 'no' / 'yes_not_working', matching School.SMART_BOARD_CHOICES."""
    if value is None:
        return ""
    normalized = str(value).strip().lower()
    if "not working" in normalized:
        return "yes_not_working"
    if normalized in TRUE_STRINGS:
        return "yes"
    return "no"


def _date(value):
    if isinstance(value, datetime):
        return value.date()
    return value


def _clean_str(value) -> str:
    """openpyxl returns whole-number section/grade cells as Python floats
    (e.g. 1.0) -- normalize those to '1' instead of storing '1.0'."""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip() if value is not None else ""


class Command(BaseCommand):
    help = "Import the legacy Google Sheets xlsx export into the new relational schema."

    def add_arguments(self, parser):
        parser.add_argument("--file", required=True, help="Path to the Datla-Think & Make xlsx export")
        parser.add_argument("--instance-code", default="DATLA-HYD-2026")
        parser.add_argument("--partner-name", default="Datla")
        parser.add_argument("--year", type=int, default=2026)

    def handle(self, *args, **options):
        try:
            wb = load_workbook(options["file"], data_only=True)
        except FileNotFoundError as exc:
            raise CommandError(str(exc)) from exc

        partner, _ = Partner.objects.get_or_create(name=options["partner_name"])
        instance, _ = ProgramInstance.objects.get_or_create(
            code=options["instance_code"], defaults={"partner": partner, "year": options["year"]}
        )

        with transaction.atomic():
            n_schools = self._import_school_enrollment(wb, instance)
            n_contact = self._import_schools_contact_info(wb, instance)
            n_kits = self._import_kits(wb, instance)
            n_sl = self._import_sl_selection(wb, instance)
            n_headcounts = self._import_headcounts(wb, instance)

        self.stdout.write(self.style.SUCCESS(
            f"Imported: {n_schools} schools (enrollment), {n_contact} contact-info updates, "
            f"{n_kits} kit deliveries, {n_sl} SL selections, {n_headcounts} headcounts."
        ))

    # -- School_Enrollment -------------------------------------------------
    def _import_school_enrollment(self, wb, instance) -> int:
        if "School_Enrollment" not in wb.sheetnames:
            return 0
        sheet = wb["School_Enrollment"]
        headers = _headers(sheet)
        count = 0
        for row in _rows(sheet, headers):
            code = row.get("School Code")
            if not code:
                continue
            School.objects.update_or_create(
                instance=instance,
                school_code=code,
                defaults={
                    "name": row.get("School") or code,
                    "district": row.get("District") or "",
                    "location": row.get("School Location") or "",
                    "distance_to_iif_km": row.get("Distance to IIF (km)") or None,
                    "gender_type": self._map_choice(row.get("Gender Type"), School.GENDER_TYPE_CHOICES),
                    "school_type": self._map_choice(row.get("School Type"), School.SCHOOL_TYPE_CHOICES),
                    "medium": self._map_choice(row.get("Medium"), School.MEDIUM_CHOICES),
                    "grades_offered": str(row.get("Grades") or ""),
                    "total_sections": row.get("Total Sections") or None,
                    "principal_name": row.get("Principal Name") or "",
                    "principal_phone": row.get("Principal Phone") or "",
                    "principal_email": row.get("Principal Email") or "",
                    "principal_acknowledged": _bool(row.get("Principal Acknowledged")),
                    "lab_room": _bool(row.get("Lab Room")) if row.get("Lab Room") is not None else None,
                    "internet": _bool(row.get("Internet")) if row.get("Internet") is not None else None,
                    "smart_board": _smart_board(row.get("Smart Board")),
                    "kit_storage": _bool(row.get("Kit Storage")) if row.get("Kit Storage") is not None else None,
                    "maps_link": row.get("Maps Link") or "",
                    "observations": row.get("Observations") or "",
                    "next_steps": row.get("Next Steps") or "",
                    "visited_by": row.get("Visited By") or "",
                    "visit_date": _date(row.get("Visit Date")),
                    "external_ref": str(row.get("Submission ID") or ""),
                },
            )
            school = School.objects.get(instance=instance, school_code=code)
            self._parse_grade_data(school, row.get("Grade Data"))
            count += 1
        return count

    def _parse_grade_data(self, school, raw: str | None):
        """Parses the free-text 'Grade Data' cell, e.g.
        "Grade 6: 41 students, 1 sections\\nGrade 7: 42 students, 1 sections"."""
        if not raw:
            return
        SchoolGradeEnrollment.objects.filter(school=school).delete()
        for entry in re.split(r"[\n;]+", str(raw)):
            entry = entry.strip()
            if not entry:
                continue
            m = re.match(
                r"^Grade\s*(?P<grade>\d+)\s*:\s*(?P<students>\d+)\s*students?\s*,\s*(?P<sections>\d+)\s*sections?$",
                entry, re.IGNORECASE,
            )
            if not m:
                self.stderr.write(f"Could not parse grade data entry for {school.school_code}: {entry!r}")
                continue
            SchoolGradeEnrollment.objects.create(
                school=school,
                grade=int(m.group("grade")),
                total_students=int(m.group("students")),
                total_sections=int(m.group("sections")),
            )

    @staticmethod
    def _map_choice(value, choices):
        if not value:
            return ""
        value = str(value).strip().lower()
        for key, label in choices:
            if value in (key, label.lower()):
                return key
        return ""

    # -- Schools_Contact_Info -----------------------------------------------
    def _import_schools_contact_info(self, wb, instance) -> int:
        if "Schools_Contact_Info" not in wb.sheetnames:
            return 0
        sheet = wb["Schools_Contact_Info"]
        headers = _headers(sheet)
        count = 0
        for row in _rows(sheet, headers):
            code = row.get("School Code")
            if not code:
                continue
            try:
                school = School.objects.get(instance=instance, school_code=code)
            except School.DoesNotExist:
                self.stderr.write(f"Schools_Contact_Info: no matching school for code {code!r}, skipping")
                continue

            updates = {}
            if row.get("Maps Link") and not school.maps_link:
                updates["maps_link"] = row["Maps Link"]
            if row.get("IIF PoC"):
                updates["iif_poc"] = row["IIF PoC"]
            if updates:
                School.objects.filter(pk=school.pk).update(**updates)

            self._parse_teachers(school, row.get("Teachers"))
            self._parse_session_schedule(school, row.get("Session Schedule"))
            count += 1
        return count

    def _parse_teachers(self, school, raw: str | None):
        """
        Parses the free-text 'Teachers' cell, one teacher per line, in the
        real export's format: "Teacher 1: Name - Phone - Grade X,Y".
        """
        if not raw:
            return
        entries = re.split(r"[\n;]+", str(raw))
        SchoolTeacher.objects.filter(school=school).delete()
        for entry in entries:
            entry = entry.strip()
            if not entry:
                continue
            m = re.match(
                r"^(?:Teacher\s*\d+\s*:\s*)?(?P<name>[^-]+?)\s*-\s*(?P<phone>\d{6,15})\s*-\s*"
                r"Grade\s*(?P<grades>[\d,\s]+)$",
                entry, re.IGNORECASE,
            )
            if not m:
                self.stderr.write(f"Could not parse teacher entry for {school.school_code}: {entry!r}")
                continue
            SchoolTeacher.objects.create(
                school=school,
                name=m.group("name").strip(),
                phone=m.group("phone").strip(),
                grades_taught=re.sub(r"\s+", "", m.group("grades")),
            )

    def _parse_session_schedule(self, school, raw: str | None):
        """
        Parses the free-text 'Session Schedule' cell, one entry per line, in
        the real export's format: "6th Grade - Tue - 2:45 PM".
        """
        if not raw:
            return
        day_map = {"mon": "mon", "tue": "tue", "wed": "wed", "thu": "thu", "fri": "fri", "sat": "sat", "sun": "sun"}
        entries = re.split(r"[\n;]+", str(raw))
        SessionSchedule.objects.filter(school=school).delete()
        for entry in entries:
            entry = entry.strip()
            if not entry:
                continue
            m = re.match(
                r"^(?P<grade>\d+)\w*\s*Grade\s*-\s*(?P<day>Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*\s*-\s*"
                r"(?P<time>\d{1,2}:\d{2}\s*[AP]M)$",
                entry, re.IGNORECASE,
            )
            if not m:
                self.stderr.write(f"Could not parse session schedule entry for {school.school_code}: {entry!r}")
                continue
            SessionSchedule.objects.create(
                school=school,
                grade=int(m.group("grade")),
                day_of_week=day_map[m.group("day").lower()[:3]],
                time=datetime.strptime(m.group("time").strip().upper(), "%I:%M %p").time(),
            )

    # -- Kits_Info ------------------------------------------------------------
    def _import_kits(self, wb, instance) -> int:
        if "Kits_Info" not in wb.sheetnames:
            return 0
        sheet = wb["Kits_Info"]
        headers = _headers(sheet)
        count = 0
        for row in _rows(sheet, headers):
            code = row.get("School Code")
            if not code or not row.get("Date of Delivery"):
                continue
            try:
                school = School.objects.get(instance=instance, school_code=code)
            except School.DoesNotExist:
                self.stderr.write(f"Kits_Info: no matching school for code {code!r}, skipping")
                continue
            KitDelivery.objects.update_or_create(
                school=school,
                external_ref=str(row.get("Submission ID") or ""),
                defaults={
                    "delivered_by": row.get("Delivered By") or "",
                    "received_by": row.get("Received By") or "",
                    "date_of_delivery": _date(row["Date of Delivery"]),
                    "grade_6_kit": _bool(row.get("Grade 6 Kit")),
                    "grade_7_kit": _bool(row.get("Grade 7 Kit")),
                    "grade_8_kit": _bool(row.get("Grade 8 Kit")),
                    "grade_9_kit": _bool(row.get("Grade 9 Kit")),
                },
            )
            count += 1
        return count

    # -- SL_Selection_Assessment ----------------------------------------------
    def _import_sl_selection(self, wb, instance) -> int:
        if "SL_Selection_Assessment" not in wb.sheetnames:
            return 0
        sheet = wb["SL_Selection_Assessment"]
        headers = _headers(sheet)
        count = 0
        for row in _rows(sheet, headers):
            code = row.get("School Code")
            if not code or not row.get("SL Name"):
                continue
            try:
                school = School.objects.get(instance=instance, school_code=code)
            except School.DoesNotExist:
                self.stderr.write(f"SL_Selection_Assessment: no matching school for code {code!r}, skipping")
                continue
            SLSelection.objects.update_or_create(
                school=school,
                external_ref=str(row.get("Submission ID") or ""),
                defaults={
                    "grade": row.get("Grade") or 0,
                    "section": _clean_str(row.get("Section")),
                    "teacher": row.get("Teacher") or "",
                    "sl_name": row["SL Name"],
                    "interested_in_role": _bool(row.get("Interested in Role")),
                    "attendance_above_90": _bool(row.get("Attendance >90%")),
                    "sl_status": self._map_choice(row.get("SL Status"), SLSelection.STATUS_CHOICES) or "pending",
                    "speaks_clearly": _bool(row.get("Speaks Clearly")),
                    "speaks_loudly": _bool(row.get("Speaks Loudly")),
                    "understands_english": _bool(row.get("Understands English")),
                    "teacher_acknowledged": _bool(row.get("Teacher Acknowledged")),
                },
            )
            count += 1
        return count

    # -- Students_Count_Info ------------------------------------------------
    def _import_headcounts(self, wb, instance) -> int:
        if "Students_Count_Info" not in wb.sheetnames:
            return 0
        sheet = wb["Students_Count_Info"]
        headers = _headers(sheet)
        count = 0
        for row in _rows(sheet, headers):
            code = row.get("School Code")
            if not code or not row.get("Grade") or not row.get("Section"):
                continue
            try:
                school = School.objects.get(instance=instance, school_code=code)
            except School.DoesNotExist:
                self.stderr.write(f"Students_Count_Info: no matching school for code {code!r}, skipping")
                continue
            StudentHeadcount.objects.update_or_create(
                school=school,
                grade=row["Grade"],
                section=_clean_str(row["Section"]),
                defaults={
                    "total_sl": row.get("Total SL") or 0,
                    "total_clusters": row.get("Total Clusters") or 0,
                    "total_teams": row.get("Total Teams") or 0,
                    "total_students": row.get("Total Students") or 0,
                    "extraction_status": self._map_extraction_status(row.get("Extraction Status")),
                    "count_validation": self._map_count_validation(row.get("Count Validation")),
                    "external_ref": str(row.get("Submission ID") or ""),
                },
            )
            count += 1
        return count

    @staticmethod
    def _map_extraction_status(value) -> str:
        text = str(value or "").lower()
        if "error" in text:
            return StudentHeadcount.EXTRACTION_STATUS_CHOICES[1][0]  # extraction_error
        if "valid" in text:
            return StudentHeadcount.EXTRACTION_STATUS_CHOICES[2][0]  # needs_validation
        return StudentHeadcount.EXTRACTION_STATUS_CHOICES[0][0]  # ok

    @staticmethod
    def _map_count_validation(value) -> str:
        text = str(value or "").lower()
        if "mismatch" in text:
            return StudentHeadcount.COUNT_VALIDATION_CHOICES[1][0]  # mismatch
        if "valid" in text:
            return StudentHeadcount.COUNT_VALIDATION_CHOICES[2][0]  # needs_validation
        return StudentHeadcount.COUNT_VALIDATION_CHOICES[0][0]  # ok

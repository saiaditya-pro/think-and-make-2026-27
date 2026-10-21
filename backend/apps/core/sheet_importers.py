"""
Maps rows of the legacy Google Sheets onto the relational schema.

Used by the one-off ``import_legacy_sheets`` command (xlsx export) and by the
live sync (``apps.core.sync``, Sheets API) -- both hand in a row source from
``apps.core.sheets_source``. Every write is an upsert keyed by the Google
Form "Submission ID" (``external_ref``) or a natural key, so re-running is
safe and never duplicates rows.

Two spreadsheet shapes exist:

* the **master** sheet (T&M_PWA_Master): PartnerConfig, Schools_List, Users
  -- handled by ``MasterSheetImporter``;
* one **partner** sheet per partner (e.g. "Datla-Think & Make _ 2026-2027"):
  School_Enrollment, Schools_Contact_Info, Kits_Info,
  SL_Selection_Assessment, Students_Count_Info -- ``PartnerSheetImporter``.
"""

import re
from datetime import date, datetime

from apps.accounts.models import User
from apps.headcounts.models import StudentHeadcount
from apps.kits.models import KitDelivery
from apps.programs.models import Partner, ProgramInstance
from apps.schools.models import School, SchoolGradeEnrollment, SchoolTeacher, SessionSchedule
from apps.sl_selection.models import SLSelection

TRUE_STRINGS = {"yes", "y", "true", "1"}
DATE_FORMATS = ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%d %b %Y"]


def _bool(value) -> bool:
    return str(value).strip().lower() in TRUE_STRINGS if value is not None else False


def _optional_bool(value):
    return _bool(value) if value not in (None, "") else None


def _smart_board(value) -> str:
    """Tri-state: 'yes' / 'no' / 'yes_not_working', matching School.SMART_BOARD_CHOICES."""
    if value in (None, ""):
        return ""
    normalized = str(value).strip().lower()
    if "not working" in normalized:
        return "yes_not_working"
    if normalized in TRUE_STRINGS:
        return "yes"
    return "no"


def _date(value):
    """openpyxl gives datetimes; the Sheets API gives formatted strings."""
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if value in (None, ""):
        return None
    text = str(value).strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _clean_str(value) -> str:
    """openpyxl returns whole-number section/grade cells as Python floats
    (e.g. 1.0) -- normalize those to '1' instead of storing '1.0'."""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip() if value is not None else ""


def _int(value, default=None):
    if value in (None, ""):
        return default
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _ref(row) -> str:
    return _clean_str(row.get("Submission ID"))


def _map_choice(value, choices):
    if not value:
        return ""
    value = str(value).strip().lower()
    for key, label in choices:
        if value in (key, label.lower()):
            return key
    return ""


def instance_for_partner(partner_name: str, year: int) -> ProgramInstance:
    """The active instance for ``partner_name``/``year``, created as
    ``<PARTNER>-<year>`` if none exists yet (Datla keeps DATLA-HYD-2026)."""
    partner, _ = Partner.objects.get_or_create(name=partner_name)
    instance = ProgramInstance.objects.filter(partner=partner, year=year, is_active=True).first()
    if instance:
        return instance
    instance, _ = ProgramInstance.objects.get_or_create(
        code=f"{re.sub(r'[^A-Z0-9]+', '-', partner_name.upper()).strip('-')}-{year}",
        defaults={"partner": partner, "year": year, "label": f"{partner_name} {year}-{str(year + 1)[-2:]}"},
    )
    return instance


class _Importer:
    def __init__(self, source, warn=None):
        self.source = source
        self.warn = warn or (lambda message: None)


class PartnerSheetImporter(_Importer):
    """Imports one partner's form-response spreadsheet into ``instance``."""

    def __init__(self, source, instance, warn=None):
        super().__init__(source, warn)
        self.instance = instance

    def run(self) -> dict[str, int]:
        return {
            "schools": self.import_school_enrollment(),
            "contact_info": self.import_schools_contact_info(),
            "kits": self.import_kits(),
            "sl_selections": self.import_sl_selection(),
            "headcounts": self.import_headcounts(),
        }

    def _school(self, tab, code):
        try:
            return School.objects.get(instance=self.instance, school_code=code)
        except School.DoesNotExist:
            self.warn(f"{tab}: no matching school for code {code!r}, skipping")
            return None

    # -- School_Enrollment -------------------------------------------------
    def import_school_enrollment(self) -> int:
        count = 0
        for row in self.source.rows("School_Enrollment"):
            code = _clean_str(row.get("School Code"))
            if not code:
                continue
            school, _ = School.objects.update_or_create(
                instance=self.instance,
                school_code=code,
                defaults={
                    "name": row.get("School") or code,
                    "district": row.get("District") or "",
                    "location": row.get("School Location") or "",
                    "distance_to_iif_km": row.get("Distance to IIF (km)") or None,
                    "gender_type": _map_choice(row.get("Gender Type"), School.GENDER_TYPE_CHOICES),
                    "school_type": _map_choice(row.get("School Type"), School.SCHOOL_TYPE_CHOICES),
                    "medium": _map_choice(row.get("Medium"), School.MEDIUM_CHOICES),
                    "grades_offered": _clean_str(row.get("Grades")),
                    "total_sections": _int(row.get("Total Sections")),
                    "principal_name": row.get("Principal Name") or "",
                    "principal_phone": _clean_str(row.get("Principal Phone")),
                    "principal_email": row.get("Principal Email") or "",
                    "principal_acknowledged": _bool(row.get("Principal Acknowledged")),
                    "lab_room": _optional_bool(row.get("Lab Room")),
                    "internet": _optional_bool(row.get("Internet")),
                    "smart_board": _smart_board(row.get("Smart Board")),
                    "kit_storage": _optional_bool(row.get("Kit Storage")),
                    "maps_link": row.get("Maps Link") or "",
                    "observations": row.get("Observations") or "",
                    "next_steps": row.get("Next Steps") or "",
                    "visited_by": row.get("Visited By") or "",
                    "visit_date": _date(row.get("Visit Date")),
                    "external_ref": _ref(row),
                },
            )
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
                self.warn(f"Could not parse grade data entry for {school.school_code}: {entry!r}")
                continue
            SchoolGradeEnrollment.objects.create(
                school=school,
                grade=int(m.group("grade")),
                total_students=int(m.group("students")),
                total_sections=int(m.group("sections")),
            )

    # -- Schools_Contact_Info -----------------------------------------------
    def import_schools_contact_info(self) -> int:
        count = 0
        for row in self.source.rows("Schools_Contact_Info"):
            code = _clean_str(row.get("School Code"))
            if not code:
                continue
            school = self._school("Schools_Contact_Info", code)
            if not school:
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
                self.warn(f"Could not parse teacher entry for {school.school_code}: {entry!r}")
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
        entries = re.split(r"[\n;]+", str(raw))
        SessionSchedule.objects.filter(school=school).delete()
        valid_days = {key for key, _ in SessionSchedule.DAY_CHOICES}
        for entry in entries:
            entry = entry.strip()
            if not entry:
                continue
            m = re.match(
                r"^(?P<grade>\d+)\w*\s*Grade\s*-\s*(?P<day>Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*\s*-\s*"
                r"(?P<time>\d{1,2}:\d{2}\s*[AP]M)$",
                entry, re.IGNORECASE,
            )
            if not m or m.group("day").lower()[:3] not in valid_days:
                self.warn(f"Could not parse session schedule entry for {school.school_code}: {entry!r}")
                continue
            SessionSchedule.objects.create(
                school=school,
                grade=int(m.group("grade")),
                day_of_week=m.group("day").lower()[:3],
                time=datetime.strptime(m.group("time").strip().upper(), "%I:%M %p").time(),
            )

    # -- Kits_Info ------------------------------------------------------------
    def import_kits(self) -> int:
        count = 0
        for row in self.source.rows("Kits_Info"):
            code = _clean_str(row.get("School Code"))
            delivered_on = _date(row.get("Date of Delivery"))
            if not code or not delivered_on:
                continue
            if not _ref(row):
                # Without a Submission ID the row would collide with deliveries
                # entered on the website (external_ref="").
                self.warn(f"Kits_Info: row for {code!r} has no Submission ID, skipping")
                continue
            school = self._school("Kits_Info", code)
            if not school:
                continue
            KitDelivery.objects.update_or_create(
                school=school,
                external_ref=_ref(row),
                defaults={
                    "delivered_by": row.get("Delivered By") or "",
                    "received_by": row.get("Received By") or "",
                    "date_of_delivery": delivered_on,
                    "grade_6_kit": _bool(row.get("Grade 6 Kit")),
                    "grade_7_kit": _bool(row.get("Grade 7 Kit")),
                    "grade_8_kit": _bool(row.get("Grade 8 Kit")),
                    "grade_9_kit": _bool(row.get("Grade 9 Kit")),
                },
            )
            count += 1
        return count

    # -- SL_Selection_Assessment ----------------------------------------------
    def import_sl_selection(self) -> int:
        count = 0
        for row in self.source.rows("SL_Selection_Assessment"):
            code = _clean_str(row.get("School Code"))
            if not code or not row.get("SL Name"):
                continue
            if not _ref(row):
                self.warn(f"SL_Selection_Assessment: row for {code!r} has no Submission ID, skipping")
                continue
            school = self._school("SL_Selection_Assessment", code)
            if not school:
                continue
            SLSelection.objects.update_or_create(
                school=school,
                external_ref=_ref(row),
                defaults={
                    "grade": _int(row.get("Grade"), 0),
                    "section": _clean_str(row.get("Section")),
                    "teacher": row.get("Teacher") or "",
                    "sl_name": row["SL Name"],
                    "interested_in_role": _bool(row.get("Interested in Role")),
                    "attendance_above_90": _bool(row.get("Attendance >90%")),
                    "sl_status": _map_choice(row.get("SL Status"), SLSelection.STATUS_CHOICES) or "pending",
                    "speaks_clearly": _bool(row.get("Speaks Clearly")),
                    "speaks_loudly": _bool(row.get("Speaks Loudly")),
                    "understands_english": _bool(row.get("Understands English")),
                    "teacher_acknowledged": _bool(row.get("Teacher Acknowledged")),
                },
            )
            count += 1
        return count

    # -- Students_Count_Info ------------------------------------------------
    def import_headcounts(self) -> int:
        count = 0
        for row in self.source.rows("Students_Count_Info"):
            code = _clean_str(row.get("School Code"))
            grade = _int(row.get("Grade"))
            section = _clean_str(row.get("Section"))
            if not code or not grade or not section:
                continue
            school = self._school("Students_Count_Info", code)
            if not school:
                continue
            existing = StudentHeadcount.objects.filter(school=school, grade=grade, section=section).first()
            if existing and not existing.external_ref and _ref(row):
                # Entered on the website -- the website copy wins.
                continue
            StudentHeadcount.objects.update_or_create(
                school=school,
                grade=grade,
                section=section,
                defaults={
                    "total_sl": _int(row.get("Total SL"), 0),
                    "total_clusters": _int(row.get("Total Clusters"), 0),
                    "total_teams": _int(row.get("Total Teams"), 0),
                    "total_students": _int(row.get("Total Students"), 0),
                    "extraction_status": self._map_extraction_status(row.get("Extraction Status")),
                    "count_validation": self._map_count_validation(row.get("Count Validation")),
                    "external_ref": _ref(row),
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


class MasterSheetImporter(_Importer):
    """
    Imports the T&M_PWA_Master spreadsheet: which partners exist and where
    their sheets live (PartnerConfig), every school (Schools_List) and every
    login (Users).
    """

    ROLE_MAP = {"admin": User.ADMIN, "iif": User.IIF_STAFF, "school": User.SCHOOL}

    def __init__(self, source, year, warn=None):
        super().__init__(source, warn)
        self.year = year

    def partner_configs(self) -> list[dict]:
        """[{name, sheet_id, student_db_sheet_id, session_obs_sheet_id, idea_feedback_sheet_id}]"""
        configs = []
        for row in self.source.rows("PartnerConfig"):
            name = _clean_str(row.get("PartnerName"))
            if not name:
                continue
            configs.append({
                "name": name,
                "sheet_id": _clean_str(row.get("SheetID")),
                "student_db_sheet_id": _clean_str(row.get("StudentDbSheetId")),
                "session_obs_sheet_id": _clean_str(row.get("SessionObsSheetId")),
                "idea_feedback_sheet_id": _clean_str(row.get("IdeaFeedbackSheetId")),
            })
        return configs

    def run(self) -> dict[str, int]:
        return {"schools_list": self.import_schools_list(), "users": self.import_users()}

    def import_schools_list(self) -> int:
        count = 0
        for row in self.source.rows("Schools_List"):
            partner_name = _clean_str(row.get("Partner"))
            code = _clean_str(row.get("School Code"))
            if not partner_name or not code:
                continue
            instance = instance_for_partner(partner_name, self.year)
            school = School.objects.filter(instance=instance, school_code=code).first()
            if not school:
                school = self._adopt_placeholder_school(code, instance)
            if school:
                if not school.name or school.name == code:
                    school.name = row.get("School") or code
                    school.save(update_fields=["name", "updated_at"])
            else:
                School.objects.create(instance=instance, school_code=code, name=row.get("School") or code)
            count += 1
        return count

    @staticmethod
    def _adopt_placeholder_school(code, instance):
        """``import_master_users`` parked unknown codes under "Partner X
        (pending)" instances; move such a school under its real partner."""
        school = School.objects.filter(
            school_code=code, instance__partner__name__endswith="(pending)"
        ).first()
        if school:
            school.instance = instance
            school.save(update_fields=["instance", "updated_at"])
        return school

    def import_users(self) -> int:
        """
        Creates missing accounts with the sheet's PIN as the initial password
        and keeps role/school/active in sync for existing ones. Passwords of
        existing accounts are never touched, so a password changed on the
        website survives every later sync.
        """
        count = 0
        for row in self.source.rows("Users"):
            username = _clean_str(row.get("Email"))
            role = self.ROLE_MAP.get(_clean_str(row.get("Role")).lower())
            if not username or not role:
                continue
            school = None
            if role == User.SCHOOL:
                code = _clean_str(row.get("School Code"))
                school = School.objects.filter(school_code=code).order_by("-instance__year").first()
                if not school:
                    self.warn(f"Users: no school with code {code!r} for {username!r}, skipping")
                    continue
            active = row.get("Active")
            defaults = {
                "email": username if role != User.SCHOOL else "",
                "display_name": row.get("Name") or "",
                "role": role,
                "school": school,
                "is_active": True if active in (None, "") else _bool(active),
                "is_staff": role == User.ADMIN,
                "is_superuser": role == User.ADMIN,
            }
            user, created = User.objects.update_or_create(username=username, defaults=defaults)
            if created:
                pin = _clean_str(row.get("PIN"))
                if pin:
                    user.set_password(pin)
                else:
                    user.set_unusable_password()
                user.save(update_fields=["password"])
            count += 1
        return count

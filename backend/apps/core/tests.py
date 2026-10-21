import datetime
from pathlib import Path

import pytest

from apps.accounts.models import User
from apps.core.models import SyncRun
from apps.core.sheet_importers import MasterSheetImporter, PartnerSheetImporter, _date
from apps.core.sheets_source import GoogleSheetsSource, XlsxSource, _row_dicts
from apps.core.sync import SyncAlreadyRunning, run_sync
from apps.headcounts.models import StudentHeadcount
from apps.kits.models import KitDelivery
from apps.programs.models import Partner, ProgramInstance
from apps.schools.models import School, SchoolGradeEnrollment, SessionSchedule

DOCS = Path(__file__).resolve().parents[3] / "docs"


class FakeSource:
    """In-memory stand-in for XlsxSource / GoogleSheetsSource."""

    def __init__(self, tabs: dict[str, list[list]]):
        self._tabs = tabs

    @property
    def sheetnames(self):
        return list(self._tabs)

    def rows(self, tab):
        values = self._tabs.get(tab) or []
        return _row_dicts(values[0], values[1:]) if values else iter(())


MASTER = {
    "PartnerConfig": [
        ["PartnerName", "FolderID", "SheetID", "StudentDbSheetId", "IdeaFeedbackSheetId", "SessionObsSheetId"],
        ["Datla", "f1", "datla-sheet", "", "", ""],
        ["Micron", "f2", "micron-sheet", "", "", ""],
        ["HBL", "f3", "", "", "", ""],
    ],
    "Schools_List": [
        ["Partner", "School", "School Code", "SchoolTrack"],
        ["Datla", "ZPHS Turkapally", "DA", "OLD"],
        ["Micron", "KGBV KOSGI", "MC", "OLD"],
    ],
    "Users": [
        [" Email", "Name", "Role", "School Code", "PIN", "Active"],
        ["staff@example.org", "Staff", "IIF", "", "1234", True],
        ["TMDATURKAPALLY", "TURKAPALLY", "School", "DA", "TMDA@2026", True],
    ],
}

DATLA = {
    "School_Enrollment": [
        ["Submission ID", "School", "School Code", "Visit Date", "Grade Data", "Smart Board", "Lab Room"],
        ["SUB-1", "ZPHS Turkapally", "DA", "15/07/2026", "Grade 6: 41 students, 2 sections", "Yes", ""],
    ],
    "Schools_Contact_Info": [
        ["Submission ID", "School Code", "IIF PoC", "Session Schedule"],
        ["SUB-2", "DA", "Ravi", "6th Grade - Sun - 2:45 PM"],
    ],
    "Kits_Info": [
        ["Submission ID", "School Code", "Date of Delivery", "Grade 6 Kit"],
        ["SUB-3", "DA", "2026-08-01", "Yes"],
        ["", "DA", "2026-08-02", "Yes"],  # no Submission ID -> skipped
    ],
    "Students_Count_Info": [
        ["Submission ID", "School Code", "Grade", "Section", "Total SL", "Total Students"],
        ["SUB-4", "DA", 6, "A", 4, 30],
    ],
}


def test_date_parses_sheet_strings_and_excel_datetimes():
    assert _date("15/07/2026") == datetime.date(2026, 7, 15)
    assert _date("2026-07-15") == datetime.date(2026, 7, 15)
    assert _date(datetime.datetime(2026, 7, 15, 10, 0)) == datetime.date(2026, 7, 15)
    assert _date("") is None
    assert _date("not a date") is None


def test_row_dicts_pads_ragged_api_rows_and_skips_blank_first_cell():
    rows = list(_row_dicts([" Email", "Name", "Role"], [["a@x", "A"], ["", "B", "C"]]))
    assert rows == [{"Email": "a@x", "Name": "A", "Role": None}]


@pytest.mark.django_db
def test_master_import_creates_instances_schools_and_users(instance):
    importer = MasterSheetImporter(FakeSource(MASTER), year=2026)
    counts = importer.run()

    assert counts == {"schools_list": 2, "users": 2}
    # Datla reuses the existing DATLA-HYD-2026 instance; Micron gets a new one.
    assert School.objects.get(school_code="DA").instance == instance
    assert School.objects.get(school_code="MC").instance.code == "MICRON-2026"
    school_user = User.objects.get(username="TMDATURKAPALLY")
    assert school_user.role == User.SCHOOL and school_user.check_password("TMDA@2026")
    assert User.objects.get(username="staff@example.org").role == User.IIF_STAFF
    assert [c["sheet_id"] for c in importer.partner_configs()] == ["datla-sheet", "micron-sheet", ""]


@pytest.mark.django_db
def test_master_import_never_resets_existing_passwords(instance):
    MasterSheetImporter(FakeSource(MASTER), year=2026).run()
    user = User.objects.get(username="TMDATURKAPALLY")
    user.set_password("changed-on-website")
    user.save()

    MasterSheetImporter(FakeSource(MASTER), year=2026).run()

    user.refresh_from_db()
    assert user.check_password("changed-on-website")


@pytest.mark.django_db
def test_master_import_adopts_placeholder_school(db):
    pending = Partner.objects.create(name="Partner M (pending)")
    placeholder = ProgramInstance.objects.create(code="M-2026", partner=pending, year=2026)
    school = School.objects.create(instance=placeholder, school_code="MC", name="MC")

    MasterSheetImporter(FakeSource(MASTER), year=2026).run()

    school.refresh_from_db()
    assert school.instance.partner.name == "Micron"
    assert school.name == "KGBV KOSGI"
    assert School.objects.filter(school_code="MC").count() == 1


@pytest.mark.django_db
def test_partner_import_is_idempotent(instance):
    for _ in range(2):
        counts = PartnerSheetImporter(FakeSource(DATLA), instance).run()

    assert counts == {"schools": 1, "contact_info": 1, "kits": 1, "sl_selections": 0, "headcounts": 1}
    school = School.objects.get(school_code="DA")
    assert school.visit_date == datetime.date(2026, 7, 15)
    assert school.smart_board == "yes"
    assert school.lab_room is None
    assert school.iif_poc == "Ravi"
    assert SchoolGradeEnrollment.objects.get(school=school).total_sections == 2
    assert SessionSchedule.objects.get(school=school).day_of_week == "sun"
    assert KitDelivery.objects.count() == 1
    assert StudentHeadcount.objects.count() == 1


@pytest.mark.django_db
def test_partner_import_keeps_website_entered_headcount(two_schools, instance):
    school_a, _ = two_schools
    StudentHeadcount.objects.create(school=school_a, grade=6, section="A", total_sl=9, total_students=40)

    PartnerSheetImporter(FakeSource(DATLA), instance).run()

    headcount = StudentHeadcount.objects.get(school=school_a, grade=6, section="A")
    assert headcount.total_sl == 9 and headcount.external_ref == ""


@pytest.mark.django_db
def test_run_sync_follows_partner_config_and_records_partial_failure(instance, settings):
    settings.GOOGLE_MASTER_SHEET_ID = "master-sheet"
    sheets = {"master-sheet": MASTER, "datla-sheet": DATLA}

    def factory(sheet_id):
        if sheet_id not in sheets:
            raise RuntimeError(f"403 for {sheet_id}")
        return FakeSource(sheets[sheet_id])

    run = run_sync(trigger=SyncRun.COMMAND, source_factory=factory)

    assert run.status == SyncRun.PARTIAL  # micron-sheet is not shared with us
    assert run.counts["Datla"]["schools"] == 1
    assert "Micron" not in run.counts
    assert "[Micron] FAILED" in run.log
    assert School.objects.get(school_code="DA").progress is not None  # reconciled


@pytest.mark.django_db
def test_run_sync_refuses_to_overlap(instance, settings):
    settings.GOOGLE_MASTER_SHEET_ID = "master-sheet"
    SyncRun.objects.create(status=SyncRun.RUNNING)
    with pytest.raises(SyncAlreadyRunning):
        run_sync(source_factory=lambda _id: FakeSource(MASTER))


class FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


class FakeSession:
    def __init__(self):
        self.calls = []

    def get(self, url, params=None):
        self.calls.append((url, params))
        if url.endswith("values:batchGet"):
            return FakeResponse({"valueRanges": [{"values": MASTER["Users"]}, {}]})
        return FakeResponse({"sheets": [{"properties": {"title": "Users"}}, {"properties": {"title": "Empty"}}]})


def test_google_source_reads_all_tabs_in_one_batch():
    session = FakeSession()
    source = GoogleSheetsSource("abc", session=session)

    assert source.sheetnames == ["Users", "Empty"]
    assert [r["Email"] for r in source.rows("Users")] == ["staff@example.org", "TMDATURKAPALLY"]
    assert list(source.rows("Empty")) == []
    assert list(source.rows("Missing")) == []
    _, params = session.calls[1]
    assert ("ranges", "'Users'") in params and ("valueRenderOption", "UNFORMATTED_VALUE") in params


@pytest.mark.django_db
def test_sync_status_requires_staff_and_run_requires_admin(iif_staff_client, school_client):
    client, _ = school_client
    assert client.get("/api/v1/sync/status/").status_code == 403
    assert iif_staff_client.get("/api/v1/sync/status/").json()["last_run"] is None
    assert iif_staff_client.post("/api/v1/sync/run/").status_code == 403


@pytest.mark.django_db
def test_sync_run_without_broker_starts_background_thread(admin_client, settings, monkeypatch):
    from apps.core import views
    from apps.core.tasks import sync_google_sheets

    settings.GOOGLE_MASTER_SHEET_ID = "master"
    settings.GOOGLE_SERVICE_ACCOUNT_JSON = "{}"

    def broker_down(*args, **kwargs):
        raise ConnectionError("no broker")

    started = []

    class FakeThread:
        def __init__(self, target, args, daemon):
            started.append((target, daemon))

        def start(self):
            pass

    monkeypatch.setattr(sync_google_sheets, "apply_async", broker_down)
    monkeypatch.setattr(views.threading, "Thread", FakeThread)

    resp = admin_client.post("/api/v1/sync/run/")
    assert resp.status_code == 202
    assert resp.json() == {"queued": True}
    assert started == [(views._run_sync_in_background, True)]


@pytest.mark.django_db
def test_sync_run_refuses_while_another_sync_is_running(admin_client, settings):
    settings.GOOGLE_MASTER_SHEET_ID = "master"
    settings.GOOGLE_SERVICE_ACCOUNT_JSON = "{}"
    SyncRun.objects.create(trigger=SyncRun.MANUAL)  # status defaults to running

    assert admin_client.post("/api/v1/sync/run/").status_code == 409


def test_healthz_needs_no_auth(client):
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.content == b"ok"


@pytest.mark.django_db
@pytest.mark.skipif(not (DOCS / "Datla-Think & Make _ 2026-2027.xlsx").exists(), reason="local export not present")
def test_real_datla_export_imports(instance):
    counts = PartnerSheetImporter(XlsxSource(DOCS / "Datla-Think & Make _ 2026-2027.xlsx"), instance).run()
    assert counts["schools"] > 0

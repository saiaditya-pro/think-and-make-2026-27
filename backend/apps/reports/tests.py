import pytest

from apps.headcounts.models import StudentHeadcount
from apps.kits.models import KitDelivery
from apps.reports.models import SchoolProgress
from apps.reports.services import reconcile_all_schools, reconcile_school, reconcile_section
from apps.schools.models import SchoolGradeEnrollment
from apps.sl_selection.models import SLSelection


def _grade_enrollment(school, grade=6, sections=2, students=60):
    return SchoolGradeEnrollment.objects.create(
        school=school, grade=grade, total_sections=sections, total_students=students
    )


def _headcount(school, grade=6, section="A", total_sl=4):
    return StudentHeadcount.objects.create(
        school=school, grade=grade, section=section, total_sl=total_sl, total_students=32
    )


def _sl_selection(school, grade=6, section="A", n=4):
    for i in range(n):
        SLSelection.objects.create(school=school, grade=grade, section=section, sl_name=f"SL {i}")


@pytest.mark.django_db
def test_reconcile_school_computes_form3_and_form4_pct(two_schools):
    school_a, _ = two_schools
    _grade_enrollment(school_a, grade=6, sections=2)
    _headcount(school_a, grade=6, section="A")

    progress = reconcile_school(school_a)

    assert progress.form3_pct == 50  # 1 of 2 sections has a headcount entry
    assert progress.form4_pct == 0  # no SLSelection rows at all yet


@pytest.mark.django_db
def test_reconcile_school_zero_denominator_does_not_crash(two_schools):
    school_a, _ = two_schools  # no grade_enrollments -- Form 1 never submitted
    progress = reconcile_school(school_a)
    assert progress.form3_pct == 0
    assert progress.form4_pct == 0


@pytest.mark.django_db
def test_mismatch_flagged_and_count_validation_updated_when_totals_disagree(two_schools):
    school_a, _ = two_schools
    _grade_enrollment(school_a)
    headcount = _headcount(school_a, total_sl=7)
    _sl_selection(school_a, n=5)  # Form 4 has 5, Form 3 says 7

    progress = reconcile_school(school_a)

    assert progress.mismatch_flags == [{"grade": 6, "section": "A", "total_sl": 7, "sl_selection_count": 5}]
    headcount.refresh_from_db()
    assert headcount.count_validation == "mismatch"


@pytest.mark.django_db
def test_no_mismatch_flag_when_form4_not_started_for_section(two_schools):
    """total_sl=7 with zero SLSelection rows is 'not started', not a mismatch."""
    school_a, _ = two_schools
    _grade_enrollment(school_a)
    headcount = _headcount(school_a, total_sl=7)

    progress = reconcile_school(school_a)

    assert progress.mismatch_flags == []
    headcount.refresh_from_db()
    assert headcount.count_validation == "ok"


@pytest.mark.django_db
def test_mismatch_cleared_once_counts_are_corrected(two_schools):
    school_a, _ = two_schools
    _grade_enrollment(school_a)
    headcount = _headcount(school_a, total_sl=7)
    _sl_selection(school_a, n=5)
    reconcile_school(school_a)
    headcount.refresh_from_db()
    assert headcount.count_validation == "mismatch"

    headcount.total_sl = 5
    headcount.save(update_fields=["total_sl"])
    progress = reconcile_school(school_a)

    assert progress.mismatch_flags == []
    headcount.refresh_from_db()
    assert headcount.count_validation == "ok"


@pytest.mark.django_db
def test_section_string_normalized_before_compare(two_schools):
    school_a, _ = two_schools
    _grade_enrollment(school_a)
    _headcount(school_a, section=" a ", total_sl=5)
    _sl_selection(school_a, section="A", n=5)

    progress = reconcile_school(school_a)

    assert progress.mismatch_flags == []


@pytest.mark.django_db
def test_reconcile_section_matches_reconcile_school_result(two_schools):
    school_a, _ = two_schools
    _grade_enrollment(school_a)
    _headcount(school_a, total_sl=7)
    _sl_selection(school_a, n=5)

    warning = reconcile_section(school_a, grade=6, section="A")

    assert warning == {"grade": 6, "section": "A", "total_sl": 7, "sl_selection_count": 5}


@pytest.mark.django_db
def test_reconcile_section_returns_none_for_unknown_section(two_schools):
    school_a, _ = two_schools
    assert reconcile_section(school_a, grade=9, section="Z") is None


@pytest.mark.django_db
def test_kit_status_not_started_without_any_delivery(two_schools):
    school_a, _ = two_schools
    school_a.grades_offered = "6,7"
    school_a.save(update_fields=["grades_offered"])

    progress = reconcile_school(school_a)
    assert progress.kit_status == "not_started"


@pytest.mark.django_db
def test_kit_status_in_progress_when_some_grades_delivered(two_schools):
    school_a, _ = two_schools
    school_a.grades_offered = "6,7"
    school_a.save(update_fields=["grades_offered"])
    KitDelivery.objects.create(school=school_a, date_of_delivery="2026-08-01", grade_6_kit=True, grade_7_kit=False)

    progress = reconcile_school(school_a)
    assert progress.kit_status == "in_progress"


@pytest.mark.django_db
def test_kit_status_complete_when_all_offered_grades_delivered(two_schools):
    school_a, _ = two_schools
    school_a.grades_offered = "6,7"
    school_a.save(update_fields=["grades_offered"])
    KitDelivery.objects.create(school=school_a, date_of_delivery="2026-08-01", grade_6_kit=True, grade_7_kit=True)

    progress = reconcile_school(school_a)
    assert progress.kit_status == "complete"


@pytest.mark.django_db
def test_kit_status_uses_latest_delivery_row(two_schools):
    school_a, _ = two_schools
    school_a.grades_offered = "6"
    school_a.save(update_fields=["grades_offered"])
    KitDelivery.objects.create(school=school_a, date_of_delivery="2026-07-01", grade_6_kit=False)
    KitDelivery.objects.create(school=school_a, date_of_delivery="2026-08-01", grade_6_kit=True)

    progress = reconcile_school(school_a)
    assert progress.kit_status == "complete"


@pytest.mark.django_db
def test_reconcile_all_schools_skips_a_failing_school_without_stopping(two_schools, monkeypatch):
    school_a, school_b = two_schools
    _grade_enrollment(school_a)

    calls = []
    real_reconcile = reconcile_school

    def flaky_reconcile(school):
        calls.append(school.pk)
        if school.pk == school_a.pk:
            raise RuntimeError("boom")
        return real_reconcile(school)

    monkeypatch.setattr("apps.reports.services.reconcile_school", flaky_reconcile)
    reconcile_all_schools()

    assert set(calls) == {school_a.pk, school_b.pk}
    assert SchoolProgress.objects.filter(school=school_b).exists()
    assert not SchoolProgress.objects.filter(school=school_a).exists()


@pytest.mark.django_db
def test_reports_summary_admin_sees_all_schools_with_kpis(admin_client, two_schools):
    school_a, school_b = two_schools
    reconcile_school(school_a)
    reconcile_school(school_b)

    resp = admin_client.get("/api/v1/reports/summary/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["kpis"] is not None
    assert body["kpis"]["schools_enrolled"] == 2
    assert {row["school"] for row in body["schools"]} == {school_a.id, school_b.id}


@pytest.mark.django_db
def test_reports_summary_school_role_sees_only_own_row_and_no_kpis(school_client, two_schools):
    school_a, school_b = two_schools
    reconcile_school(school_a)
    reconcile_school(school_b)
    client, _ = school_client

    resp = client.get("/api/v1/reports/summary/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["kpis"] is None
    assert [row["school"] for row in body["schools"]] == [school_a.id]


@pytest.mark.django_db
def test_school_progress_detail_endpoint_scoped_to_own_school(school_client, two_schools):
    client, school_a = school_client
    _, school_b = two_schools

    own = client.get(f"/api/v1/schools/{school_a.id}/progress/")
    assert own.status_code == 200

    other = client.get(f"/api/v1/schools/{school_b.id}/progress/")
    assert other.status_code == 404


@pytest.mark.django_db
def test_school_progress_detail_creates_row_on_first_read(admin_client, two_schools):
    school_a, _ = two_schools
    assert not SchoolProgress.objects.filter(school=school_a).exists()

    resp = admin_client.get(f"/api/v1/schools/{school_a.id}/progress/")
    assert resp.status_code == 200
    assert resp.json()["form1_status"] == "not_started"
    assert SchoolProgress.objects.filter(school=school_a).exists()


@pytest.mark.django_db
def test_headcount_submit_returns_mismatch_warning(iif_staff_client, two_schools):
    school_a, _ = two_schools
    _sl_selection(school_a, n=5)

    resp = iif_staff_client.post(
        "/api/v1/student-headcounts/",
        {"school": school_a.id, "grade": 6, "section": "A", "total_sl": 7, "total_students": 32},
        format="json",
    )
    assert resp.status_code == 201
    assert resp.json()["mismatch_warning"] == {"grade": 6, "section": "A", "total_sl": 7, "sl_selection_count": 5}


@pytest.mark.django_db
def test_headcount_submit_returns_null_warning_when_form4_not_started(iif_staff_client, two_schools):
    school_a, _ = two_schools

    resp = iif_staff_client.post(
        "/api/v1/student-headcounts/",
        {"school": school_a.id, "grade": 6, "section": "A", "total_sl": 7, "total_students": 32},
        format="json",
    )
    assert resp.status_code == 201
    assert resp.json()["mismatch_warning"] is None

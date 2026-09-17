import pytest

from apps.schools.models import SchoolGradeEnrollment, SchoolTeacher, SessionSchedule


def _form1_payload(**overrides):
    payload = {
        "visited_by": "Asha",
        "visit_date": "2026-09-17",
        "location": "Turkapally",
        "district": "Sangareddy",
        "distance_to_iif_km": "12.5",
        "principal_name": "Principal Rao",
        "principal_phone": "9876543210",
        "gender_type": "co-ed",
        "school_type": "government",
        "medium": "telugu",
        "grades": [6, 7],
        "lab_room": True,
        "internet": False,
        "smart_board": "yes_not_working",
        "kit_storage": True,
        "maps_link": "https://www.google.com/maps?q=1,2",
        "principal_acknowledged": True,
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
def test_school_user_only_sees_own_school(school_client, two_schools):
    client, school_a = school_client
    resp = client.get("/api/v1/schools/")
    assert resp.status_code == 200
    ids = [row["id"] for row in resp.json()["results"]]
    assert ids == [school_a.id]


@pytest.mark.django_db
def test_school_user_cannot_write_another_school(school_client, two_schools):
    client, _ = school_client
    _, school_b = two_schools
    resp = client.patch(f"/api/v1/schools/{school_b.id}/", {"name": "hacked"}, format="json")
    assert resp.status_code in (403, 404)


@pytest.mark.django_db
def test_admin_sees_all_schools(admin_client, two_schools):
    resp = admin_client.get("/api/v1/schools/")
    assert resp.status_code == 200
    assert resp.json()["count"] == 2


@pytest.mark.django_db
def test_unauthenticated_request_rejected(two_schools):
    from rest_framework.test import APIClient

    client = APIClient()
    resp = client.get("/api/v1/schools/")
    assert resp.status_code == 401


@pytest.mark.django_db
def test_schools_filterable_by_partner(iif_staff_client, two_schools, instance):
    school_a, _ = two_schools
    resp = iif_staff_client.get(f"/api/v1/schools/?instance__partner={instance.partner_id}")
    assert resp.status_code == 200
    assert resp.json()["count"] == 2


@pytest.mark.django_db
def test_submit_form1_marks_submitted_and_upserts_grade_enrollments(iif_staff_client, two_schools):
    school_a, _ = two_schools
    resp = iif_staff_client.post(f"/api/v1/schools/{school_a.id}/submit-form1/", _form1_payload(), format="json")
    assert resp.status_code == 200
    body = resp.json()
    assert body["form1_submitted"] is True
    assert body["form1_submitted_at"] is not None
    assert body["total_sections"] == 2
    assert body["grades_offered"] == "6,7"
    assert set(SchoolGradeEnrollment.objects.filter(school=school_a).values_list("grade", flat=True)) == {6, 7}


@pytest.mark.django_db
def test_submit_form1_missing_required_field_rejected(iif_staff_client, two_schools):
    school_a, _ = two_schools
    payload = _form1_payload()
    del payload["principal_name"]
    resp = iif_staff_client.post(f"/api/v1/schools/{school_a.id}/submit-form1/", payload, format="json")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_submit_form1_blocked_once_already_submitted_for_non_admin(iif_staff_client, two_schools):
    school_a, _ = two_schools
    first = iif_staff_client.post(f"/api/v1/schools/{school_a.id}/submit-form1/", _form1_payload(), format="json")
    assert first.status_code == 200

    second = iif_staff_client.post(f"/api/v1/schools/{school_a.id}/submit-form1/", _form1_payload(), format="json")
    assert second.status_code == 400
    assert "already been submitted" in str(second.json())


@pytest.mark.django_db
def test_admin_can_resubmit_form1_after_already_submitted(admin_client, two_schools):
    school_a, _ = two_schools
    first = admin_client.post(f"/api/v1/schools/{school_a.id}/submit-form1/", _form1_payload(), format="json")
    assert first.status_code == 200

    second = admin_client.post(
        f"/api/v1/schools/{school_a.id}/submit-form1/", _form1_payload(district="Updated District"), format="json"
    )
    assert second.status_code == 200
    assert second.json()["district"] == "Updated District"


@pytest.mark.django_db
def test_draft_patch_does_not_require_full_fields(iif_staff_client, two_schools):
    school_a, _ = two_schools
    resp = iif_staff_client.patch(f"/api/v1/schools/{school_a.id}/", {"visited_by": "Asha"}, format="json")
    assert resp.status_code == 200
    assert resp.json()["visited_by"] == "Asha"
    assert resp.json()["form1_submitted"] is False


@pytest.mark.django_db
def test_draft_patch_blocked_once_already_submitted_for_non_admin(iif_staff_client, two_schools):
    school_a, _ = two_schools
    submitted = iif_staff_client.post(f"/api/v1/schools/{school_a.id}/submit-form1/", _form1_payload(), format="json")
    assert submitted.status_code == 200

    resp = iif_staff_client.patch(f"/api/v1/schools/{school_a.id}/", {"visited_by": "Someone else"}, format="json")
    assert resp.status_code == 403


@pytest.mark.django_db
def test_submit_form1_never_clobbers_existing_grade_enrollment_counts(iif_staff_client, two_schools):
    school_a, _ = two_schools
    SchoolGradeEnrollment.objects.create(school=school_a, grade=6, total_sections=4, total_students=120)

    resp = iif_staff_client.post(f"/api/v1/schools/{school_a.id}/submit-form1/", _form1_payload(), format="json")
    assert resp.status_code == 200

    enrollment = SchoolGradeEnrollment.objects.get(school=school_a, grade=6)
    assert enrollment.total_sections == 4
    assert enrollment.total_students == 120


def _form2_payload(grades=(6, 7), **overrides):
    payload = {
        "iif_poc": "Ravi",
        "teachers": [{"name": "Teacher One", "phone": "9000000001", "grades_taught": ",".join(str(g) for g in grades)}],
        "session_schedules": [{"grade": g, "day_of_week": "mon", "time": "10:30:00"} for g in grades],
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
def test_submit_form2_requires_form1_submitted_first(iif_staff_client, two_schools):
    school_a, _ = two_schools
    resp = iif_staff_client.post(f"/api/v1/schools/{school_a.id}/submit-form2/", _form2_payload(), format="json")
    assert resp.status_code == 400
    assert "Form 1" in str(resp.json())


@pytest.mark.django_db
def test_submit_form2_marks_submitted_and_creates_teachers_and_schedules(iif_staff_client, two_schools):
    school_a, _ = two_schools
    iif_staff_client.post(f"/api/v1/schools/{school_a.id}/submit-form1/", _form1_payload(grades=[6, 7]), format="json")

    resp = iif_staff_client.post(f"/api/v1/schools/{school_a.id}/submit-form2/", _form2_payload(), format="json")
    assert resp.status_code == 200
    body = resp.json()
    assert body["form2_submitted"] is True
    assert body["form2_submitted_at"] is not None
    assert body["iif_poc"] == "Ravi"
    assert SchoolTeacher.objects.filter(school=school_a).count() == 1
    assert SessionSchedule.objects.filter(school=school_a).count() == 2


@pytest.mark.django_db
def test_submit_form2_missing_schedule_for_active_grade_rejected(iif_staff_client, two_schools):
    school_a, _ = two_schools
    iif_staff_client.post(f"/api/v1/schools/{school_a.id}/submit-form1/", _form1_payload(grades=[6, 7]), format="json")

    resp = iif_staff_client.post(
        f"/api/v1/schools/{school_a.id}/submit-form2/", _form2_payload(grades=[6]), format="json"
    )
    assert resp.status_code == 400
    assert "7" in str(resp.json())


@pytest.mark.django_db
def test_submit_form2_requires_at_least_one_teacher(iif_staff_client, two_schools):
    school_a, _ = two_schools
    iif_staff_client.post(f"/api/v1/schools/{school_a.id}/submit-form1/", _form1_payload(grades=[6, 7]), format="json")

    resp = iif_staff_client.post(
        f"/api/v1/schools/{school_a.id}/submit-form2/", _form2_payload(teachers=[]), format="json"
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_submit_form2_blocked_once_already_submitted_for_non_admin(iif_staff_client, two_schools):
    school_a, _ = two_schools
    iif_staff_client.post(f"/api/v1/schools/{school_a.id}/submit-form1/", _form1_payload(grades=[6, 7]), format="json")

    first = iif_staff_client.post(f"/api/v1/schools/{school_a.id}/submit-form2/", _form2_payload(), format="json")
    assert first.status_code == 200

    second = iif_staff_client.post(f"/api/v1/schools/{school_a.id}/submit-form2/", _form2_payload(), format="json")
    assert second.status_code == 400
    assert "already been submitted" in str(second.json())


@pytest.mark.django_db
def test_admin_can_resubmit_form2_after_already_submitted(admin_client, two_schools):
    school_a, _ = two_schools
    admin_client.post(f"/api/v1/schools/{school_a.id}/submit-form1/", _form1_payload(grades=[6, 7]), format="json")
    admin_client.post(f"/api/v1/schools/{school_a.id}/submit-form2/", _form2_payload(), format="json")

    second = admin_client.post(
        f"/api/v1/schools/{school_a.id}/submit-form2/", _form2_payload(iif_poc="Someone Else"), format="json"
    )
    assert second.status_code == 200
    assert second.json()["iif_poc"] == "Someone Else"
    assert SchoolTeacher.objects.filter(school=school_a).count() == 1

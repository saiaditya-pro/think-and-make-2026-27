import pytest

from apps.sl_selection.models import SLSelection


def _bulk_payload(school_id, **overrides):
    payload = {
        "school": school_id,
        "grade": 6,
        "section": "A",
        "teacher": "Ms. Rao",
        "teacher_acknowledged": True,
        "entries": [
            {
                "sl_name": "Asha",
                "interested_in_role": True,
                "attendance_above_90": True,
                "sl_status": "selected",
                "speaks_clearly": True,
                "speaks_loudly": True,
                "understands_english": True,
            },
            {
                "sl_name": "Rahul",
                "interested_in_role": False,
                "attendance_above_90": True,
                "sl_status": "pending",
                "speaks_clearly": True,
                "speaks_loudly": False,
                "understands_english": True,
            },
        ],
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
def test_bulk_submit_creates_rows_for_each_entry(iif_staff_client, two_schools):
    school_a, _ = two_schools
    resp = iif_staff_client.post("/api/v1/sl-selections/bulk-submit/", _bulk_payload(school_a.id), format="json")
    assert resp.status_code == 201, resp.json()
    assert len(resp.json()) == 2
    assert SLSelection.objects.filter(school=school_a, grade=6, section="A").count() == 2


@pytest.mark.django_db
def test_bulk_submit_blocked_for_duplicate_grade_section_non_admin(iif_staff_client, two_schools):
    school_a, _ = two_schools
    first = iif_staff_client.post("/api/v1/sl-selections/bulk-submit/", _bulk_payload(school_a.id), format="json")
    assert first.status_code == 201

    second = iif_staff_client.post("/api/v1/sl-selections/bulk-submit/", _bulk_payload(school_a.id), format="json")
    assert second.status_code == 400
    assert "already been submitted" in str(second.json())


@pytest.mark.django_db
def test_admin_can_bulk_submit_again_for_same_grade_section(admin_client, two_schools):
    school_a, _ = two_schools
    first = admin_client.post("/api/v1/sl-selections/bulk-submit/", _bulk_payload(school_a.id), format="json")
    assert first.status_code == 201

    second = admin_client.post("/api/v1/sl-selections/bulk-submit/", _bulk_payload(school_a.id), format="json")
    assert second.status_code == 201
    assert SLSelection.objects.filter(school=school_a, grade=6, section="A").count() == 4


@pytest.mark.django_db
def test_bulk_submit_requires_at_least_one_entry(iif_staff_client, two_schools):
    school_a, _ = two_schools
    resp = iif_staff_client.post(
        "/api/v1/sl-selections/bulk-submit/", _bulk_payload(school_a.id, entries=[]), format="json"
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_school_user_bulk_submit_auto_assigned_to_own_school(school_client):
    client, school_a = school_client
    payload = _bulk_payload(school_a.id)
    del payload["school"]
    resp = client.post("/api/v1/sl-selections/bulk-submit/", payload, format="json")
    assert resp.status_code == 201, resp.json()
    assert SLSelection.objects.filter(school=school_a).count() == 2


@pytest.mark.django_db
def test_school_user_cannot_bulk_submit_for_another_school(school_client, two_schools):
    client, _ = school_client
    _, school_b = two_schools
    resp = client.post("/api/v1/sl-selections/bulk-submit/", _bulk_payload(school_b.id), format="json")
    assert resp.status_code == 201
    # The view always forces `school` to the requesting user's own school for SCHOOL role.
    assert not SLSelection.objects.filter(school=school_b).exists()

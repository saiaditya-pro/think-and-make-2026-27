import pytest

from apps.headcounts.models import StudentHeadcount


@pytest.mark.django_db
def test_school_user_headcount_auto_assigned_to_own_school(school_client):
    client, school_a = school_client
    resp = client.post(
        "/api/v1/student-headcounts/",
        {"grade": 6, "section": "A", "total_sl": 4, "total_clusters": 8, "total_teams": 8, "total_students": 32},
        format="json",
    )
    assert resp.status_code == 201, resp.json()
    headcount = StudentHeadcount.objects.get(id=resp.json()["id"])
    assert headcount.school_id == school_a.id


@pytest.mark.django_db
def test_duplicate_grade_section_for_same_school_rejected(iif_staff_client, two_schools):
    school_a, _ = two_schools
    first = iif_staff_client.post(
        "/api/v1/student-headcounts/",
        {"school": school_a.id, "grade": 6, "section": "A", "total_students": 32},
        format="json",
    )
    assert first.status_code == 201

    second = iif_staff_client.post(
        "/api/v1/student-headcounts/",
        {"school": school_a.id, "grade": 6, "section": "A", "total_students": 30},
        format="json",
    )
    assert second.status_code == 400


@pytest.mark.django_db
def test_same_grade_different_section_allowed(iif_staff_client, two_schools):
    school_a, _ = two_schools
    first = iif_staff_client.post(
        "/api/v1/student-headcounts/",
        {"school": school_a.id, "grade": 6, "section": "A", "total_students": 32},
        format="json",
    )
    assert first.status_code == 201

    second = iif_staff_client.post(
        "/api/v1/student-headcounts/",
        {"school": school_a.id, "grade": 6, "section": "B", "total_students": 30},
        format="json",
    )
    assert second.status_code == 201

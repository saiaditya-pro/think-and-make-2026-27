import pytest


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

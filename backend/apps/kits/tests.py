import pytest

from apps.kits.models import KitDelivery


@pytest.mark.django_db
def test_school_user_kit_delivery_auto_assigned_to_own_school(school_client):
    client, school_a = school_client
    resp = client.post(
        "/api/v1/kit-deliveries/",
        {"date_of_delivery": "2026-06-01", "grade_6_kit": True},
        format="json",
    )
    assert resp.status_code == 201, resp.json()
    delivery = KitDelivery.objects.get(id=resp.json()["id"])
    assert delivery.school_id == school_a.id


@pytest.mark.django_db
def test_school_user_cannot_spoof_another_schools_delivery(school_client, two_schools):
    client, _ = school_client
    _, school_b = two_schools
    resp = client.post(
        "/api/v1/kit-deliveries/",
        {"school": school_b.id, "date_of_delivery": "2026-06-01", "grade_6_kit": True},
        format="json",
    )
    # The mixin always forces `school` to the requesting user's own school,
    # regardless of what the client sends.
    delivery = KitDelivery.objects.get(id=resp.json()["id"])
    assert delivery.school_id != school_b.id


@pytest.mark.django_db
def test_second_kit_delivery_blocked_for_school_role(school_client):
    client, _ = school_client
    first = client.post(
        "/api/v1/kit-deliveries/", {"date_of_delivery": "2026-06-01", "grade_6_kit": True}, format="json"
    )
    assert first.status_code == 201

    second = client.post(
        "/api/v1/kit-deliveries/", {"date_of_delivery": "2026-06-02", "grade_7_kit": True}, format="json"
    )
    assert second.status_code == 403
    assert "already been recorded" in str(second.json())


@pytest.mark.django_db
def test_iif_staff_cannot_create_second_kit_delivery_for_same_school(iif_staff_client, two_schools):
    school_a, _ = two_schools
    first = iif_staff_client.post(
        "/api/v1/kit-deliveries/",
        {"school": school_a.id, "date_of_delivery": "2026-06-01", "grade_6_kit": True},
        format="json",
    )
    assert first.status_code == 201

    second = iif_staff_client.post(
        "/api/v1/kit-deliveries/",
        {"school": school_a.id, "date_of_delivery": "2026-06-02", "grade_7_kit": True},
        format="json",
    )
    assert second.status_code == 403
    assert "already been recorded" in str(second.json())


@pytest.mark.django_db
def test_admin_can_create_additional_kit_delivery_for_same_school(admin_client, two_schools):
    school_a, _ = two_schools
    first = admin_client.post(
        "/api/v1/kit-deliveries/",
        {"school": school_a.id, "date_of_delivery": "2026-06-01", "grade_6_kit": True},
        format="json",
    )
    assert first.status_code == 201

    second = admin_client.post(
        "/api/v1/kit-deliveries/",
        {"school": school_a.id, "date_of_delivery": "2026-06-02", "grade_7_kit": True},
        format="json",
    )
    assert second.status_code == 201

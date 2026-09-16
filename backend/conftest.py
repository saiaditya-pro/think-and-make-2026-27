import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.programs.models import Partner, ProgramInstance
from apps.schools.models import School


@pytest.fixture(autouse=True)
def _isolated_media_root(tmp_path, settings):
    """Keeps test file uploads out of the real ./media directory."""
    settings.MEDIA_ROOT = tmp_path


@pytest.fixture
def instance(db):
    partner = Partner.objects.create(name="Datla")
    return ProgramInstance.objects.create(code="DATLA-HYD-2026", partner=partner, year=2026)


@pytest.fixture
def two_schools(instance):
    a = School.objects.create(instance=instance, school_code="DA", name="School A")
    b = School.objects.create(instance=instance, school_code="DB", name="School B")
    return a, b


@pytest.fixture
def school_client(two_schools):
    school_a, _ = two_schools
    user = User.objects.create_user(username="DA", password="pw", role=User.SCHOOL, school=school_a)
    client = APIClient()
    client.force_authenticate(user=user)
    return client, school_a


@pytest.fixture
def admin_client(db):
    admin = User.objects.create_user(username="admin", password="pw", role=User.ADMIN, is_staff=True)
    client = APIClient()
    client.force_authenticate(user=admin)
    return client

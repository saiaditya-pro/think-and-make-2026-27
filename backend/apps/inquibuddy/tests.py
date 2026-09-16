from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.inquibuddy.models import InquibuddySubmission
from apps.teams.models import Cluster, Team


@pytest.fixture
def team(two_schools):
    school_a, _ = two_schools
    cluster = Cluster.objects.create(school=school_a, grade=8, section="A", cluster_number=1)
    return Team.objects.create(cluster=cluster, team_code="T001", sl_name="Ravi Kumar")


@pytest.mark.django_db
def test_team_creation_auto_creates_pending_submission(team):
    submission = InquibuddySubmission.objects.get(team=team)
    assert submission.status == InquibuddySubmission.PENDING


@pytest.mark.django_db
def test_upload_photo_then_generate_feedback_enqueues_job(school_client, team):
    client, _ = school_client
    submission = InquibuddySubmission.objects.get(team=team)

    photo = SimpleUploadedFile("idea.jpg", b"fake-image-bytes", content_type="image/jpeg")
    resp = client.post(f"/api/v1/inquibuddy-submissions/{submission.id}/upload-photo/", {"file": photo}, format="multipart")
    assert resp.status_code == 200, resp.json()
    assert len(resp.json()["submission_files"]) == 1

    # generate_ai_feedback is the 1-3 min Gemini job -- mock .delay so the
    # test doesn't need a live Celery worker/broker.
    with patch("apps.inquibuddy.views.generate_ai_feedback.delay") as mock_delay:
        resp = client.post(f"/api/v1/inquibuddy-submissions/{submission.id}/generate-feedback/")
        assert resp.status_code == 200, resp.json()
        mock_delay.assert_called_once_with(submission.id)

    submission.refresh_from_db()
    assert submission.status == InquibuddySubmission.PROCESSING


@pytest.mark.django_db
def test_generate_feedback_requires_photo_first(school_client, team):
    client, _ = school_client
    submission = InquibuddySubmission.objects.get(team=team)
    resp = client.post(f"/api/v1/inquibuddy-submissions/{submission.id}/generate-feedback/")
    assert resp.status_code == 400

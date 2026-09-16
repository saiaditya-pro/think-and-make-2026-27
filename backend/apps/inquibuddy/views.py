from django.http import FileResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import scope_queryset_to_role
from apps.inquibuddy import services
from apps.inquibuddy.models import InquibuddySubmission, SubmissionFile
from apps.inquibuddy.serializers import InquibuddySubmissionSerializer
from apps.inquibuddy.tasks import generate_ai_feedback


class InquibuddySubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Maps 1:1 onto the InquiBuddy user flow manual: upload photo/audio per
    team, generate AI feedback (async), download PDF reports.
    """

    serializer_class = InquibuddySubmissionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = [
        "team__cluster", "status",
        "team__cluster__school", "team__cluster__grade", "team__cluster__section",
    ]

    def get_queryset(self):
        qs = InquibuddySubmission.objects.select_related(
            "team__cluster__school__instance__partner"
        ).prefetch_related("submission_files__file", "ai_feedback_questions", "feedback_reports")
        return scope_queryset_to_role(qs, self.request, school_field="team__cluster__school_id")

    @action(detail=True, methods=["post"], url_path="upload-photo")
    def upload_photo(self, request, pk=None):
        return self._upload(request, pk, SubmissionFile.PHOTO)

    @action(detail=True, methods=["post"], url_path="upload-audio")
    def upload_audio(self, request, pk=None):
        return self._upload(request, pk, SubmissionFile.AUDIO)

    def _upload(self, request, pk, kind):
        submission = self.get_object()
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            raise ValidationError({"file": "This field is required."})
        services.attach_submission_file(submission=submission, uploaded_file=uploaded_file, kind=kind, user=request.user)
        # Re-fetch: `submission`'s prefetch_related cache (from get_object())
        # predates the file we just attached above.
        submission = self.get_queryset().get(pk=submission.pk)
        return Response(self.get_serializer(submission).data)

    @action(detail=True, methods=["post"], url_path="generate-feedback")
    def generate_feedback(self, request, pk=None):
        """Enqueues the async Gemini job for one team; returns status=processing immediately."""
        submission = self.get_object()
        if not submission.submission_files.filter(kind=SubmissionFile.PHOTO).exists():
            raise ValidationError("Upload an idea photo before generating feedback.")
        submission.status = InquibuddySubmission.PROCESSING
        submission.save(update_fields=["status"])
        generate_ai_feedback.delay(submission.id)
        return Response(self.get_serializer(submission).data)

    @action(detail=False, methods=["post"], url_path="generate-feedback-bulk")
    def generate_feedback_bulk(self, request):
        """"Generate Feedback for All Submitted Teams" -- enqueues one job per
        team in the given grade/section that has a photo ready."""
        school_id, grade, section = self._require_section(request.data)
        submissions = self.get_queryset().filter(
            team__cluster__school_id=school_id, team__cluster__grade=grade, team__cluster__section=section,
            submission_files__kind=SubmissionFile.PHOTO,
        ).distinct()
        for submission in submissions:
            submission.status = InquibuddySubmission.PROCESSING
            submission.save(update_fields=["status"])
            generate_ai_feedback.delay(submission.id)
        return Response({"queued": submissions.count()})

    @action(detail=True, methods=["get"], url_path="report")
    def download_report(self, request, pk=None):
        submission = self.get_object()
        if submission.status != InquibuddySubmission.EVALUATED:
            raise ValidationError("Feedback has not been generated for this team yet.")
        report = services.get_or_create_individual_report(submission, request.user)
        return FileResponse(report.file.file.open("rb"), as_attachment=True, filename=report.file.file.name.split("/")[-1])

    @action(detail=False, methods=["get"], url_path="report-all")
    def download_all_report(self, request):
        school_id, grade, section = self._require_section(request.query_params)
        submissions = list(
            self.get_queryset().filter(
                team__cluster__school_id=school_id, team__cluster__grade=grade, team__cluster__section=section,
                status=InquibuddySubmission.EVALUATED,
            )
        )
        if not submissions:
            raise ValidationError("No evaluated teams in this grade/section yet.")
        report = services.create_all_teams_report(submissions, request.user)
        return FileResponse(report.file.file.open("rb"), as_attachment=True, filename=report.file.file.name.split("/")[-1])

    @staticmethod
    def _require_section(params):
        school_id, grade, section = params.get("school"), params.get("grade"), params.get("section")
        if not (school_id and grade and section):
            raise ValidationError("school, grade and section are all required.")
        return school_id, grade, section

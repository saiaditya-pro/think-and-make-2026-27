from django.core.files.uploadedfile import UploadedFile
from django.utils import timezone

from apps.core.audit import record_audit
from apps.files.models import File
from apps.inquibuddy.models import FeedbackReport, InquibuddySubmission, SubmissionFile
from lib.pdf_builder import render_all_teams_feedback_pdf, render_team_feedback_pdf


def attach_submission_file(*, submission: InquibuddySubmission, uploaded_file: UploadedFile, kind: str, user) -> SubmissionFile:
    file = File.objects.create(
        file=uploaded_file,
        mime_type=uploaded_file.content_type or "",
        size=uploaded_file.size,
        uploaded_by=user,
        entity_type="InquibuddySubmission",
        entity_id=submission.id,
    )
    # Only one photo/audio per team at a time -- a re-upload replaces the previous one.
    SubmissionFile.objects.filter(submission=submission, kind=kind).delete()
    return SubmissionFile.objects.create(submission=submission, file=file, kind=kind)


def _report_context(submission: InquibuddySubmission) -> dict:
    team = submission.team
    cluster = team.cluster
    school = cluster.school
    photo = submission.submission_files.filter(kind=SubmissionFile.PHOTO).first()
    return {
        "school_name": school.name,
        "partner_name": school.instance.partner.name,
        "grade": cluster.grade,
        "section": cluster.section,
        "team_code": team.team_code,
        "sl_name": team.sl_name,
        "student_names": list(team.students.values_list("name", flat=True)),
        "idea_photo_url": photo.file.file.url if photo else None,
        "questions": [
            {"question_en": q.question_en, "question_te": q.question_te}
            for q in submission.ai_feedback_questions.all().order_by("order")
        ],
        "generated_at": timezone.now(),
    }


def get_or_create_individual_report(submission: InquibuddySubmission, user) -> FeedbackReport:
    existing = submission.feedback_reports.filter(type=FeedbackReport.INDIVIDUAL).order_by("-created_at").first()
    if existing:
        return existing

    pdf_bytes = render_team_feedback_pdf(**_report_context(submission))
    file = File.objects.create(
        file=_pdf_content_file(pdf_bytes, f"InquiBuddy_{submission.team.team_code}.pdf"),
        mime_type="application/pdf",
        size=len(pdf_bytes),
        uploaded_by=user,
        entity_type="FeedbackReport",
        entity_id=submission.id,
    )
    report = FeedbackReport.objects.create(submission=submission, type=FeedbackReport.INDIVIDUAL, file=file)
    record_audit(user=user, action="download_individual_report", entity_type="InquibuddySubmission", entity_id=submission.id)
    return report


def create_all_teams_report(submissions: list[InquibuddySubmission], user) -> FeedbackReport:
    contexts = [_report_context(s) for s in submissions]
    pdf_bytes = render_all_teams_feedback_pdf(contexts)
    file = File.objects.create(
        file=_pdf_content_file(pdf_bytes, "InquiBuddy_AllTeams.pdf"),
        mime_type="application/pdf",
        size=len(pdf_bytes),
        uploaded_by=user,
        entity_type="FeedbackReport",
        entity_id="all_teams",
    )
    report = FeedbackReport.objects.create(submission=None, type=FeedbackReport.ALL_TEAMS, file=file)
    record_audit(user=user, action="download_all_teams_report", entity_type="FeedbackReport", entity_id=report.id)
    return report


def _pdf_content_file(pdf_bytes: bytes, filename: str):
    from django.core.files.base import ContentFile

    return ContentFile(pdf_bytes, name=filename)

from celery import shared_task
from celery.utils.log import get_task_logger

from apps.core.audit import record_audit
from apps.inquibuddy.models import AIFeedbackQuestion, InquibuddySubmission, SubmissionFile
from lib.gemini_client import generate_feedback_questions

logger = get_task_logger(__name__)


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def generate_ai_feedback(self, submission_id: int):
    """
    The 1-3 minute job behind "Generate Feedback for All Submitted Teams" in
    the InquiBuddy manual. Runs off the request thread so the mobile/web
    client only has to poll InquibuddySubmission.status.
    """
    submission = InquibuddySubmission.objects.select_related("team").get(id=submission_id)
    photo = submission.submission_files.filter(kind=SubmissionFile.PHOTO).first()
    if not photo:
        logger.warning("No idea photo for submission %s, skipping", submission_id)
        return

    audio = submission.submission_files.filter(kind=SubmissionFile.AUDIO).first()

    try:
        questions = generate_feedback_questions(
            photo_bytes=photo.file.file.read(),
            photo_mime=photo.file.mime_type or "image/jpeg",
            audio_bytes=audio.file.file.read() if audio else None,
            audio_mime=audio.file.mime_type if audio else None,
        )
    except Exception as exc:  # network/API errors -> retry, don't leave status stuck on "processing"
        logger.exception("Gemini call failed for submission %s", submission_id)
        raise self.retry(exc=exc)

    submission.ai_feedback_questions.all().delete()
    AIFeedbackQuestion.objects.bulk_create(
        [
            AIFeedbackQuestion(submission=submission, order=i, question_en=q["question_en"], question_te=q["question_te"])
            for i, q in enumerate(questions, start=1)
        ]
    )
    submission.status = InquibuddySubmission.EVALUATED
    submission.evaluation_count += 1
    submission.save(update_fields=["status", "evaluation_count"])
    record_audit(
        user=None, action="generate_ai_feedback", entity_type="InquibuddySubmission", entity_id=submission_id,
        after={"question_count": len(questions)},
    )

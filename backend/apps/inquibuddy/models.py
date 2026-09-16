from django.db import models

from apps.core.models import TimeStampedModel
from apps.teams.models import Team


class InquibuddySubmission(TimeStampedModel):
    """One per team per program instance. Status mirrors the staged UX in the
    InquiBuddy manual: pending -> processing (AI job running) -> evaluated."""

    PENDING = "pending"
    PROCESSING = "processing"
    EVALUATED = "evaluated"
    STATUS_CHOICES = [(PENDING, "Pending"), (PROCESSING, "Processing"), (EVALUATED, "Evaluated")]

    team = models.OneToOneField(Team, on_delete=models.CASCADE, related_name="inquibuddy_submission")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    evaluation_count = models.PositiveIntegerField(default=0)

    def __str__(self) -> str:
        return f"InquiBuddy submission for {self.team.team_code} ({self.status})"


class SubmissionFile(TimeStampedModel):
    PHOTO = "photo"
    AUDIO = "audio"
    KIND_CHOICES = [(PHOTO, "Idea Photo"), (AUDIO, "Idea Audio")]

    submission = models.ForeignKey(InquibuddySubmission, on_delete=models.CASCADE, related_name="submission_files")
    file = models.ForeignKey("files.File", on_delete=models.CASCADE, related_name="+")
    kind = models.CharField(max_length=10, choices=KIND_CHOICES)


class AIFeedbackQuestion(TimeStampedModel):
    submission = models.ForeignKey(InquibuddySubmission, on_delete=models.CASCADE, related_name="ai_feedback_questions")
    order = models.PositiveSmallIntegerField()
    question_en = models.TextField()
    question_te = models.TextField()

    class Meta:
        ordering = ["submission", "order"]


class FeedbackReport(TimeStampedModel):
    INDIVIDUAL = "individual"
    ALL_TEAMS = "all_teams"
    TYPE_CHOICES = [(INDIVIDUAL, "Individual"), (ALL_TEAMS, "All Teams")]

    submission = models.ForeignKey(
        InquibuddySubmission, null=True, blank=True, on_delete=models.CASCADE, related_name="feedback_reports"
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    file = models.ForeignKey("files.File", on_delete=models.CASCADE, related_name="+")

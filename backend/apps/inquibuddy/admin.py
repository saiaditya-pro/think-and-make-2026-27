from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.inquibuddy.models import AIFeedbackQuestion, FeedbackReport, InquibuddySubmission, SubmissionFile


@admin.register(InquibuddySubmission)
class InquibuddySubmissionAdmin(ModelAdmin):
    list_display = ["team", "status", "evaluation_count"]
    list_filter = ["status"]


@admin.register(SubmissionFile)
class SubmissionFileAdmin(ModelAdmin):
    pass


@admin.register(AIFeedbackQuestion)
class AIFeedbackQuestionAdmin(ModelAdmin):
    pass


@admin.register(FeedbackReport)
class FeedbackReportAdmin(ModelAdmin):
    pass

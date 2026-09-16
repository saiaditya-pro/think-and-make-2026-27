from django.contrib import admin

from apps.inquibuddy.models import AIFeedbackQuestion, FeedbackReport, InquibuddySubmission, SubmissionFile


@admin.register(InquibuddySubmission)
class InquibuddySubmissionAdmin(admin.ModelAdmin):
    list_display = ["team", "status", "evaluation_count"]
    list_filter = ["status"]


admin.site.register(SubmissionFile)
admin.site.register(AIFeedbackQuestion)
admin.site.register(FeedbackReport)

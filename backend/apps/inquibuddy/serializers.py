from rest_framework import serializers

from apps.inquibuddy.models import AIFeedbackQuestion, FeedbackReport, InquibuddySubmission, SubmissionFile


class SubmissionFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubmissionFile
        fields = ["id", "kind", "file", "created_at"]


class AIFeedbackQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIFeedbackQuestion
        fields = ["id", "order", "question_en", "question_te"]


class FeedbackReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackReport
        fields = ["id", "type", "file", "created_at"]


class InquibuddySubmissionSerializer(serializers.ModelSerializer):
    submission_files = SubmissionFileSerializer(many=True, read_only=True)
    ai_feedback_questions = AIFeedbackQuestionSerializer(many=True, read_only=True)
    feedback_reports = FeedbackReportSerializer(many=True, read_only=True)
    team_code = serializers.CharField(source="team.team_code", read_only=True)
    sl_name = serializers.CharField(source="team.sl_name", read_only=True)

    class Meta:
        model = InquibuddySubmission
        fields = [
            "id", "team", "team_code", "sl_name", "status", "evaluation_count",
            "submission_files", "ai_feedback_questions", "feedback_reports",
        ]
        read_only_fields = ["status", "evaluation_count"]

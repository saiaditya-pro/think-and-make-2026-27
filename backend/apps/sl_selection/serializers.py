from rest_framework import serializers

from apps.schools.models import School
from apps.sl_selection.models import SLSelection


class SLSelectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SLSelection
        fields = [
            "id", "school", "grade", "section", "teacher", "sl_name",
            "interested_in_role", "attendance_above_90", "sl_status",
            "speaks_clearly", "speaks_loudly", "understands_english", "teacher_acknowledged",
        ]
        extra_kwargs = {"school": {"required": False}}


class SLEntryInputSerializer(serializers.Serializer):
    sl_name = serializers.CharField(max_length=150)
    interested_in_role = serializers.BooleanField()
    attendance_above_90 = serializers.BooleanField()
    sl_status = serializers.ChoiceField(choices=SLSelection.STATUS_CHOICES)
    speaks_clearly = serializers.BooleanField()
    speaks_loudly = serializers.BooleanField()
    understands_english = serializers.BooleanField()


class SLSelectionBulkSubmitSerializer(serializers.Serializer):
    """
    One submission -> many `SLSelection` rows (one per SL assessed for a
    grade/section), matching the legacy form's "+ Add another SL" UX.
    ``school`` is optional so a school-role client can rely on server-side
    auto-assignment instead of knowing its own school id.
    """

    school = serializers.PrimaryKeyRelatedField(queryset=School.objects.all(), required=False)
    grade = serializers.IntegerField()
    section = serializers.CharField(max_length=5)
    teacher = serializers.CharField(max_length=150)
    teacher_acknowledged = serializers.BooleanField()
    entries = SLEntryInputSerializer(many=True)

    def validate_entries(self, value):
        if not value:
            raise serializers.ValidationError("Add at least one SL.")
        return value

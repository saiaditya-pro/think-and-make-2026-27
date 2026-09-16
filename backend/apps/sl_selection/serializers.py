from rest_framework import serializers

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

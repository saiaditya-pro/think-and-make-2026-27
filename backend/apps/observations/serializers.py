from rest_framework import serializers

from apps.observations.models import SessionObservation


class SessionObservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionObservation
        fields = [
            "id", "school", "grade", "section", "unit", "session_no",
            "observed_by", "date", "notes",
        ]
        extra_kwargs = {"school": {"required": False}}

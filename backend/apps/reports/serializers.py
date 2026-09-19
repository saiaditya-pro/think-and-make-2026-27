from rest_framework import serializers

from apps.reports.models import SchoolProgress


class SchoolProgressSerializer(serializers.ModelSerializer):
    school_code = serializers.CharField(source="school.school_code", read_only=True)
    school_name = serializers.CharField(source="school.name", read_only=True)

    class Meta:
        model = SchoolProgress
        fields = [
            "school",
            "school_code",
            "school_name",
            "form1_status",
            "form2_status",
            "form3_pct",
            "form4_pct",
            "kit_status",
            "mismatch_flags",
            "updated_at",
        ]

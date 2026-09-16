from rest_framework import serializers

from apps.headcounts.models import StudentHeadcount


class StudentHeadcountSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentHeadcount
        fields = [
            "id", "school", "grade", "section", "total_sl", "total_clusters",
            "total_teams", "total_students", "teams_info_photo", "student_database_file",
            "extraction_status", "count_validation",
        ]
        extra_kwargs = {"school": {"required": False}}

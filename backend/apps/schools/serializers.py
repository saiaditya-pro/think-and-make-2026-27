from rest_framework import serializers

from apps.schools.models import School, SchoolGradeEnrollment, SchoolTeacher, SessionSchedule


class SchoolGradeEnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolGradeEnrollment
        fields = ["id", "school", "grade", "total_sections", "total_students"]


class SchoolTeacherSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolTeacher
        fields = ["id", "school", "name", "phone", "grades_taught"]


class SessionScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionSchedule
        fields = ["id", "school", "grade", "day_of_week", "time"]


class SchoolSerializer(serializers.ModelSerializer):
    grade_enrollments = SchoolGradeEnrollmentSerializer(many=True, read_only=True)
    teachers = SchoolTeacherSerializer(many=True, read_only=True)
    session_schedules = SessionScheduleSerializer(many=True, read_only=True)

    class Meta:
        model = School
        fields = [
            "id", "instance", "school_code", "name", "district", "location",
            "distance_to_iif_km", "gender_type", "school_type", "medium",
            "grades_offered", "total_sections", "principal_name", "principal_phone",
            "principal_email", "principal_acknowledged", "lab_room", "internet",
            "smart_board", "kit_storage", "maps_link", "school_photo", "iif_poc",
            "observations", "next_steps", "visited_by", "visit_date",
            "grade_enrollments", "teachers", "session_schedules",
        ]

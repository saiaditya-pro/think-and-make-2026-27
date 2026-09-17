from rest_framework import serializers

from apps.schools.models import School, SchoolGradeEnrollment, SchoolTeacher, SessionSchedule

FORM1_GRADE_CHOICES = [6, 7, 8, 9]


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
            "form1_submitted", "form1_submitted_at",
            "form2_submitted", "form2_submitted_at",
            "grade_enrollments", "teachers", "session_schedules",
        ]
        read_only_fields = ["form1_submitted", "form1_submitted_at", "form2_submitted", "form2_submitted_at"]


class SchoolForm1SubmitSerializer(serializers.ModelSerializer):
    """
    Validates a full School Enrollment Form 1 submission. Unlike
    ``SchoolSerializer``/the base model (which stay nullable so a
    pre-seeded roster row -- school_code + name only -- is always valid),
    every Form 1 field is required here.
    """

    grades = serializers.MultipleChoiceField(choices=FORM1_GRADE_CHOICES)

    class Meta:
        model = School
        fields = [
            "visited_by", "visit_date", "location", "district", "distance_to_iif_km",
            "principal_name", "principal_phone", "principal_email",
            "gender_type", "school_type", "medium", "grades",
            "lab_room", "internet", "smart_board", "kit_storage",
            "maps_link", "school_photo", "observations", "next_steps",
            "principal_acknowledged",
        ]
        extra_kwargs = {
            "principal_email": {"required": False, "allow_blank": True},
            "school_photo": {"required": False, "allow_null": True},
            "observations": {"required": False, "allow_blank": True},
            "next_steps": {"required": False, "allow_blank": True},
            "visited_by": {"required": True, "allow_blank": False},
            "visit_date": {"required": True, "allow_null": False},
            "location": {"required": True, "allow_blank": False},
            "district": {"required": True, "allow_blank": False},
            "distance_to_iif_km": {"required": True, "allow_null": False},
            "principal_name": {"required": True, "allow_blank": False},
            "principal_phone": {"required": True, "allow_blank": False},
            "gender_type": {"required": True, "allow_blank": False},
            "school_type": {"required": True, "allow_blank": False},
            "medium": {"required": True, "allow_blank": False},
            "lab_room": {"required": True, "allow_null": False},
            "internet": {"required": True, "allow_null": False},
            "smart_board": {"required": True, "allow_blank": False},
            "kit_storage": {"required": True, "allow_null": False},
            "principal_acknowledged": {"required": True},
            "maps_link": {"required": True, "allow_blank": False},
        }


class ContactTeacherInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    grades_taught = serializers.CharField(max_length=50, required=False, allow_blank=True)


class ContactSessionScheduleInputSerializer(serializers.Serializer):
    grade = serializers.IntegerField()
    day_of_week = serializers.ChoiceField(choices=SessionSchedule.DAY_CHOICES)
    time = serializers.TimeField()


class SchoolContactSubmitSerializer(serializers.ModelSerializer):
    """
    Validates a full Schools Contact Info (Form 2) submission. ``teachers``
    and ``session_schedules`` aren't real model fields on ``School`` --
    they're popped out of validated_data by the view and used to
    replace the school's ``SchoolTeacher``/``SessionSchedule`` rows.
    """

    teachers = ContactTeacherInputSerializer(many=True)
    session_schedules = ContactSessionScheduleInputSerializer(many=True)

    class Meta:
        model = School
        fields = ["iif_poc", "teachers", "session_schedules"]
        extra_kwargs = {"iif_poc": {"required": True, "allow_blank": False}}

    def validate_teachers(self, value):
        if not value:
            raise serializers.ValidationError("Add at least one teacher.")
        return value

    def validate(self, attrs):
        school = self.instance
        active_grades = (
            {int(g) for g in school.grades_offered.split(",") if g.strip()}
            if school and school.grades_offered
            else set()
        )
        scheduled_grades = {s["grade"] for s in attrs.get("session_schedules", [])}
        missing = active_grades - scheduled_grades
        if missing:
            raise serializers.ValidationError(
                {
                    "session_schedules": (
                        f"Missing a session schedule for grade(s): {', '.join(str(g) for g in sorted(missing))}."
                    )
                }
            )
        return attrs

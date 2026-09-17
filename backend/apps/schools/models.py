from django.db import models

from apps.core.models import TimeStampedModel
from apps.programs.models import ProgramInstance


class School(TimeStampedModel):
    """
    From School_Enrollment + Schools_Contact_Info. ``school_code`` replaces
    the old shared School Code + static PIN login -- it now just identifies
    the school; auth is a real accounts.User row per school.
    """

    GENDER_TYPE_CHOICES = [("boys", "Boys"), ("girls", "Girls"), ("co-ed", "Co-ed")]
    SCHOOL_TYPE_CHOICES = [
        ("government", "Government"),
        ("private", "Private"),
        ("aided", "Aided"),
    ]
    MEDIUM_CHOICES = [("telugu", "Telugu"), ("english", "English"), ("urdu", "Urdu")]
    SMART_BOARD_CHOICES = [
        ("yes", "Yes"),
        ("no", "No"),
        ("yes_not_working", "Yes but not working"),
    ]

    instance = models.ForeignKey(ProgramInstance, on_delete=models.PROTECT, related_name="schools")
    school_code = models.CharField(max_length=20)
    name = models.CharField(max_length=200)
    district = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=200, blank=True)
    distance_to_iif_km = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    gender_type = models.CharField(max_length=10, choices=GENDER_TYPE_CHOICES, blank=True)
    school_type = models.CharField(max_length=20, choices=SCHOOL_TYPE_CHOICES, blank=True)
    medium = models.CharField(max_length=10, choices=MEDIUM_CHOICES, blank=True)
    grades_offered = models.CharField(max_length=50, blank=True, help_text="e.g. '6,7,8'")
    total_sections = models.PositiveIntegerField(null=True, blank=True)

    principal_name = models.CharField(max_length=150, blank=True)
    principal_phone = models.CharField(max_length=20, blank=True)
    principal_email = models.EmailField(blank=True)
    principal_acknowledged = models.BooleanField(default=False)

    lab_room = models.BooleanField(null=True, blank=True)
    internet = models.BooleanField(null=True, blank=True)
    smart_board = models.CharField(max_length=20, choices=SMART_BOARD_CHOICES, blank=True, default="")
    kit_storage = models.BooleanField(null=True, blank=True)

    maps_link = models.URLField(blank=True)
    school_photo = models.ForeignKey(
        "files.File", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    iif_poc = models.CharField(max_length=150, blank=True)
    observations = models.TextField(blank=True)
    next_steps = models.TextField(blank=True)

    visited_by = models.CharField(max_length=150, blank=True)
    visit_date = models.DateField(null=True, blank=True)

    form1_submitted = models.BooleanField(
        default=False, help_text="Set once School Enrollment Form 1 has been submitted for this school."
    )
    form1_submitted_at = models.DateTimeField(null=True, blank=True)

    form2_submitted = models.BooleanField(
        default=False, help_text="Set once Schools Contact Info (Form 2) has been submitted for this school."
    )
    form2_submitted_at = models.DateTimeField(null=True, blank=True)

    external_ref = models.CharField(
        max_length=64, blank=True, default="", help_text="Original Google Form Submission ID."
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["instance", "school_code"], name="unique_school_code_per_instance")
        ]
        ordering = ["school_code"]

    def __str__(self) -> str:
        return f"{self.school_code} - {self.name}"


class SchoolGradeEnrollment(TimeStampedModel):
    """One row per grade, parsed out of School_Enrollment's free-text 'Grade Data' cell."""

    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="grade_enrollments")
    grade = models.PositiveSmallIntegerField()
    total_sections = models.PositiveIntegerField(default=0)
    total_students = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["school", "grade"], name="unique_grade_enrollment_per_school")
        ]


class SchoolTeacher(TimeStampedModel):
    """Parsed out of Schools_Contact_Info's free-text 'Teachers' cell -- one row per teacher, not one blob."""

    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="teachers")
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True)
    grades_taught = models.CharField(max_length=50, blank=True, help_text="e.g. '6,7'")


class SessionSchedule(TimeStampedModel):
    """Parsed out of Schools_Contact_Info's free-text 'Session Schedule' cell."""

    DAY_CHOICES = [
        ("mon", "Monday"), ("tue", "Tuesday"), ("wed", "Wednesday"),
        ("thu", "Thursday"), ("fri", "Friday"), ("sat", "Saturday"),
    ]

    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="session_schedules")
    grade = models.PositiveSmallIntegerField()
    day_of_week = models.CharField(max_length=3, choices=DAY_CHOICES)
    time = models.TimeField()

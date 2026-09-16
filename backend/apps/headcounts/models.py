from django.db import models

from apps.core.models import TimeStampedModel
from apps.schools.models import School


class StudentHeadcount(TimeStampedModel):
    """
    From Students_Count_Info. ``extraction_status``/``count_validation`` are
    real enum columns here -- in the old sheet these were free-text notes
    like "Counts mismatch - Needs validation" that only a human reading the
    cell would catch; now they're queryable/filterable on an admin dashboard.
    """

    EXTRACTION_STATUS_CHOICES = [
        ("ok", "OK"),
        ("extraction_error", "Extraction Error"),
        ("needs_validation", "Needs Validation"),
    ]
    COUNT_VALIDATION_CHOICES = [
        ("ok", "OK"),
        ("mismatch", "Counts Mismatch"),
        ("needs_validation", "Needs Validation"),
    ]

    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="student_headcounts")
    grade = models.PositiveSmallIntegerField()
    section = models.CharField(max_length=5)
    total_sl = models.PositiveIntegerField(default=0)
    total_clusters = models.PositiveIntegerField(default=0)
    total_teams = models.PositiveIntegerField(default=0)
    total_students = models.PositiveIntegerField(default=0)
    teams_info_photo = models.ForeignKey(
        "files.File", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    student_database_file = models.ForeignKey(
        "files.File", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    extraction_status = models.CharField(max_length=20, choices=EXTRACTION_STATUS_CHOICES, default="ok")
    count_validation = models.CharField(max_length=20, choices=COUNT_VALIDATION_CHOICES, default="ok")
    external_ref = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["school", "grade", "section"], name="unique_headcount_per_section")
        ]

    def __str__(self) -> str:
        return f"{self.school.school_code} G{self.grade}{self.section} headcount"

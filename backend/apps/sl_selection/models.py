from django.db import models

from apps.core.models import TimeStampedModel
from apps.schools.models import School


class SLSelection(TimeStampedModel):
    """One row per Student Leader assessed, from SL_Selection_Assessment."""

    STATUS_CHOICES = [("selected", "Selected"), ("not_selected", "Not Selected"), ("pending", "Pending")]

    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="sl_selections")
    grade = models.PositiveSmallIntegerField()
    section = models.CharField(max_length=5)
    teacher = models.CharField(max_length=150, blank=True)
    sl_name = models.CharField(max_length=150)
    interested_in_role = models.BooleanField(default=False)
    attendance_above_90 = models.BooleanField(default=False)
    sl_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    speaks_clearly = models.BooleanField(default=False)
    speaks_loudly = models.BooleanField(default=False)
    understands_english = models.BooleanField(default=False)
    teacher_acknowledged = models.BooleanField(default=False)
    external_ref = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        ordering = ["school", "grade", "section"]

    def __str__(self) -> str:
        return f"{self.sl_name} ({self.school.school_code} G{self.grade}{self.section})"

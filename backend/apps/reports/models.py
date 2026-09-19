from django.db import models

from apps.core.models import TimeStampedModel
from apps.schools.models import School


class SchoolProgress(TimeStampedModel):
    """
    One row per school, upserted by ``apps.reports.services.reconcile_school``
    -- either from the nightly Celery task or immediately after a Form 3
    submit. This is a derived cache, not a new source of truth: every field
    here is re-computable from School/StudentHeadcount/SLSelection/KitDelivery
    at any time, which is what lets the reconciliation job recover from a
    missed run or a bad intermediate value just by running again.
    """

    STATUS_CHOICES = [
        ("not_started", "Not Started"),
        ("in_progress", "In Progress"),
        ("complete", "Complete"),
    ]

    school = models.OneToOneField(School, on_delete=models.CASCADE, related_name="progress")
    form1_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="not_started")
    form2_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="not_started")
    form3_pct = models.PositiveSmallIntegerField(default=0)
    form4_pct = models.PositiveSmallIntegerField(default=0)
    kit_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="not_started")
    mismatch_flags = models.JSONField(default=list, blank=True)

    def __str__(self) -> str:
        return f"Progress for {self.school.school_code}"

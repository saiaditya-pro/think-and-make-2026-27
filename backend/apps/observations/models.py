from django.db import models

from apps.core.models import TimeStampedModel
from apps.schools.models import School


class SessionObservation(TimeStampedModel):
    """
    One row per observed session. The old sheet's 'L1/L2/L3 Session Tracker'
    and 'Session_Progress' tabs were manually "auto-filled" pivots of exactly
    this data -- here they're just queries (see observations.selectors),
    so they can never drift out of sync with the real observations again.
    """

    UNIT_CHOICES = [(1, "Level 1"), (2, "Level 2"), (3, "Level 3")]

    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="session_observations")
    grade = models.PositiveSmallIntegerField()
    section = models.CharField(max_length=5)
    unit = models.PositiveSmallIntegerField(choices=UNIT_CHOICES)
    session_no = models.PositiveSmallIntegerField()
    observed_by = models.CharField(max_length=150, blank=True)
    date = models.DateField()
    notes = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["school", "grade", "section", "unit", "session_no"],
                name="unique_session_observation",
            )
        ]
        ordering = ["school", "grade", "section", "unit", "session_no"]

    def __str__(self) -> str:
        return f"{self.school.school_code} G{self.grade}{self.section} U{self.unit}S{self.session_no}"

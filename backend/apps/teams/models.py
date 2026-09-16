from django.db import models

from apps.core.models import TimeStampedModel
from apps.schools.models import School


class Cluster(TimeStampedModel):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="clusters")
    grade = models.PositiveSmallIntegerField()
    section = models.CharField(max_length=5)
    cluster_number = models.PositiveIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["school", "grade", "section", "cluster_number"], name="unique_cluster"
            )
        ]
        ordering = ["school", "grade", "section", "cluster_number"]

    def __str__(self) -> str:
        return f"{self.school.school_code} G{self.grade}{self.section} Cluster {self.cluster_number}"


class Team(TimeStampedModel):
    """Team code e.g. 'T001', as shown on the InquiBuddy team cards."""

    cluster = models.ForeignKey(Cluster, on_delete=models.CASCADE, related_name="teams")
    team_code = models.CharField(max_length=20)
    sl_name = models.CharField(max_length=150, help_text="Student Leader name")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["cluster", "team_code"], name="unique_team_code_per_cluster")
        ]
        ordering = ["team_code"]

    def __str__(self) -> str:
        return self.team_code


class Student(TimeStampedModel):
    """Sourced from the OCR'd student database referenced in Students_Count_Info."""

    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="students")
    name = models.CharField(max_length=150)

    def __str__(self) -> str:
        return self.name

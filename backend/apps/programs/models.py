from django.db import models

from apps.core.models import TimeStampedModel


class Partner(TimeStampedModel):
    """Funding/CSR partner, e.g. 'Datla'."""

    name = models.CharField(max_length=150, unique=True)

    def __str__(self) -> str:
        return self.name


class ProgramInstance(TimeStampedModel):
    """One program year/city run, e.g. 'DATLA-HYD-2026'."""

    code = models.CharField(max_length=50, unique=True)
    label = models.CharField(max_length=200, blank=True)
    partner = models.ForeignKey(Partner, on_delete=models.PROTECT, related_name="instances")
    year = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.code

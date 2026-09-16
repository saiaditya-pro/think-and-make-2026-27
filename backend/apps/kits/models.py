from django.db import models

from apps.core.models import TimeStampedModel
from apps.schools.models import School


class KitDelivery(TimeStampedModel):
    """One row per Kits_Info form submission."""

    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="kit_deliveries")
    delivered_by = models.CharField(max_length=150, blank=True)
    received_by = models.CharField(max_length=150, blank=True)
    date_of_delivery = models.DateField()
    grade_6_kit = models.BooleanField(default=False)
    grade_7_kit = models.BooleanField(default=False)
    grade_8_kit = models.BooleanField(default=False)
    grade_9_kit = models.BooleanField(default=False)
    delivery_proof_photo = models.ForeignKey(
        "files.File", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    acknowledgement_letter = models.ForeignKey(
        "files.File", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    external_ref = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        ordering = ["-date_of_delivery"]

    def __str__(self) -> str:
        return f"Kit delivery to {self.school.school_code} on {self.date_of_delivery}"

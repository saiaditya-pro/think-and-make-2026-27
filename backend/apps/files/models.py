from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


def upload_path(instance, filename):
    return f"{instance.entity_type}/{instance.entity_id or 'misc'}/{filename}"


class File(TimeStampedModel):
    """
    Thin wrapper around storage (local disk in dev, Supabase Storage/S3 in
    staging+prod via django-storages -- see USE_S3_STORAGE in settings).
    Every upload in the system (idea photos/audio, kit delivery proof,
    school photos, generated PDFs) is one row here, so access can be
    controlled and audited in one place instead of scattering public Drive
    links across the data model like the old Sheets setup did.
    """

    file = models.FileField(upload_to=upload_path)
    mime_type = models.CharField(max_length=100, blank=True)
    size = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="uploaded_files"
    )
    entity_type = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=64, blank=True, default="")
    legacy_url = models.URLField(
        blank=True,
        default="",
        help_text="Original Google Drive URL, kept as a fallback until fully migrated.",
    )

    class Meta:
        indexes = [models.Index(fields=["entity_type", "entity_id"])]

    def __str__(self) -> str:
        return f"{self.entity_type}:{self.entity_id} -> {self.file.name}"

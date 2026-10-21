from django.conf import settings
from django.db import models


class TimeStampedModel(models.Model):
    """Abstract base adding created/updated timestamps to every table."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class AuditLog(models.Model):
    """
    Records who changed what. Populated explicitly by services/viewsets that
    perform sensitive mutations (user management, InquiBuddy status
    transitions, etc.) via ``apps.core.audit.record_audit`` -- not every
    request needs a row, only ones that change state that matters later.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=64, blank=True, default="")
    before = models.JSONField(null=True, blank=True)
    after = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["entity_type", "entity_id"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.action} on {self.entity_type}:{self.entity_id} by {self.user_id}"


class SyncRun(models.Model):
    """One pull of the Google Sheets into the database -- see apps.core.sync."""

    RUNNING = "running"
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"
    STATUS_CHOICES = [
        (RUNNING, "Running"),
        (SUCCESS, "Success"),
        (PARTIAL, "Partial (some partners failed)"),
        (FAILED, "Failed"),
    ]

    SCHEDULE = "schedule"
    MANUAL = "manual"
    COMMAND = "command"
    TRIGGER_CHOICES = [(SCHEDULE, "Schedule"), (MANUAL, "Manual"), (COMMAND, "Command")]

    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=RUNNING)
    trigger = models.CharField(max_length=10, choices=TRIGGER_CHOICES, default=SCHEDULE)
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    counts = models.JSONField(default=dict, blank=True, help_text="{partner: {tab: rows imported}}")
    log = models.TextField(blank=True, help_text="Warnings and errors from the run.")

    class Meta:
        ordering = ["-started_at"]

    def __str__(self) -> str:
        return f"Sync {self.started_at:%Y-%m-%d %H:%M} ({self.status})"

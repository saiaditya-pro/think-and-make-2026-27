from django.contrib import admin, messages
from django.shortcuts import redirect
from django.urls import reverse
from unfold.admin import ModelAdmin
from unfold.decorators import action

from apps.core.models import AuditLog, SyncRun


@admin.register(AuditLog)
class AuditLogAdmin(ModelAdmin):
    list_display = ["created_at", "user", "action", "entity_type", "entity_id"]
    list_filter = ["action", "entity_type"]
    readonly_fields = [f.name for f in AuditLog._meta.fields]


@admin.register(SyncRun)
class SyncRunAdmin(ModelAdmin):
    list_display = ["started_at", "finished_at", "status", "trigger", "triggered_by"]
    list_filter = ["status", "trigger"]
    readonly_fields = [f.name for f in SyncRun._meta.fields]
    actions_list = ["sync_now"]

    def has_add_permission(self, request):
        return False

    @action(description="Sync from Google Sheets now", url_path="sync-now", icon="sync")
    def sync_now(self, request):
        from apps.core.sheets_source import SheetsConfigError
        from apps.core.sync import SyncAlreadyRunning, run_sync

        try:
            run = run_sync(trigger=SyncRun.MANUAL, user=request.user)
        except (SheetsConfigError, SyncAlreadyRunning) as exc:
            messages.error(request, str(exc))
        else:
            level = messages.SUCCESS if run.status == SyncRun.SUCCESS else messages.WARNING
            messages.add_message(request, level, f"Sync finished: {run.get_status_display()}.")
        return redirect(reverse("admin:core_syncrun_changelist"))

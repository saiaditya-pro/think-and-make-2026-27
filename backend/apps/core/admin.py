from django.contrib import admin

from apps.core.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["created_at", "user", "action", "entity_type", "entity_id"]
    list_filter = ["action", "entity_type"]
    readonly_fields = [f.name for f in AuditLog._meta.fields]

from django.contrib import admin

from apps.reports.models import SchoolProgress


@admin.register(SchoolProgress)
class SchoolProgressAdmin(admin.ModelAdmin):
    list_display = ["school", "form1_status", "form2_status", "form3_pct", "form4_pct", "kit_status", "updated_at"]
    list_filter = ["form1_status", "form2_status", "kit_status"]

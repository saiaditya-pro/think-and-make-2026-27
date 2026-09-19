from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.headcounts.models import StudentHeadcount


@admin.register(StudentHeadcount)
class StudentHeadcountAdmin(ModelAdmin):
    list_display = ["school", "grade", "section", "total_students", "extraction_status", "count_validation"]
    list_filter = ["extraction_status", "count_validation"]

from django.contrib import admin

from apps.headcounts.models import StudentHeadcount


@admin.register(StudentHeadcount)
class StudentHeadcountAdmin(admin.ModelAdmin):
    list_display = ["school", "grade", "section", "total_students", "extraction_status", "count_validation"]
    list_filter = ["extraction_status", "count_validation"]

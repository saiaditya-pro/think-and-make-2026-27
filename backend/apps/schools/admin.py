from django.contrib import admin

from apps.schools.models import School, SchoolGradeEnrollment, SchoolTeacher, SessionSchedule


@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = ["school_code", "name", "instance", "district"]
    search_fields = ["school_code", "name"]
    list_filter = ["instance", "district"]


admin.site.register(SchoolGradeEnrollment)
admin.site.register(SchoolTeacher)
admin.site.register(SessionSchedule)

from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.schools.models import School, SchoolGradeEnrollment, SchoolTeacher, SessionSchedule


@admin.register(School)
class SchoolAdmin(ModelAdmin):
    list_display = ["school_code", "name", "instance", "district"]
    search_fields = ["school_code", "name"]
    list_filter = ["instance", "district"]


@admin.register(SchoolGradeEnrollment)
class SchoolGradeEnrollmentAdmin(ModelAdmin):
    pass


@admin.register(SchoolTeacher)
class SchoolTeacherAdmin(ModelAdmin):
    pass


@admin.register(SessionSchedule)
class SessionScheduleAdmin(ModelAdmin):
    pass

from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.teams.models import Cluster, Student, Team


@admin.register(Cluster)
class ClusterAdmin(ModelAdmin):
    pass


@admin.register(Team)
class TeamAdmin(ModelAdmin):
    pass


@admin.register(Student)
class StudentAdmin(ModelAdmin):
    pass

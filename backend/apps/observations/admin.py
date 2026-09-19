from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.observations.models import SessionObservation


@admin.register(SessionObservation)
class SessionObservationAdmin(ModelAdmin):
    pass

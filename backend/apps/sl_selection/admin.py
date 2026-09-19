from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.sl_selection.models import SLSelection


@admin.register(SLSelection)
class SLSelectionAdmin(ModelAdmin):
    pass

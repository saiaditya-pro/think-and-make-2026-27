from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.programs.models import Partner, ProgramInstance


@admin.register(Partner)
class PartnerAdmin(ModelAdmin):
    pass


@admin.register(ProgramInstance)
class ProgramInstanceAdmin(ModelAdmin):
    pass

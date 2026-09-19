from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.files.models import File


@admin.register(File)
class FileAdmin(ModelAdmin):
    pass

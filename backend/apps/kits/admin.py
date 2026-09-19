from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.kits.models import KitDelivery


@admin.register(KitDelivery)
class KitDeliveryAdmin(ModelAdmin):
    pass

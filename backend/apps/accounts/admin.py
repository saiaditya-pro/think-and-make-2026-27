from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from apps.accounts.models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Think & Make", {"fields": ("role", "school", "display_name")}),
    )
    list_display = ["username", "role", "school", "is_active"]
    list_filter = ["role", "is_active"]

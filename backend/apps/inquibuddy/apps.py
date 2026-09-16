from django.apps import AppConfig


class InquibuddyConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.inquibuddy"

    def ready(self):
        from apps.inquibuddy import signals  # noqa: F401

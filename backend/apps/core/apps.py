from django.apps import AppConfig
from django.db.models.signals import post_migrate


def enable_row_level_security(using="default", **kwargs):
    """
    Supabase exposes every table in the ``public`` schema through its Data
    API, reachable with the project's public ``anon`` key. Turning on RLS with
    no policies closes that door. Django is unaffected: it connects as the
    table owner, which RLS doesn't apply to. Runs after every migrate so new
    tables are covered too; a no-op on SQLite.
    """
    from django.db import connections

    connection = connections[using]
    if connection.vendor != "postgresql":
        return
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity"
        )
        for (table,) in cursor.fetchall():
            cursor.execute(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY')


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"

    def ready(self):
        # Once per migrate run (connected to this app only), not once per app.
        post_migrate.connect(enable_row_level_security, sender=self)

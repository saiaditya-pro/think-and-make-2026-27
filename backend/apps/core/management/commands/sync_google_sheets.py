"""
Pulls the live Google Sheets into the database once -- the same job Celery
beat runs every SHEETS_SYNC_INTERVAL_MIN minutes. Handy for the first load,
or on machines without Redis/Celery (schedule it with Windows Task
Scheduler / cron instead).

Usage:
    python manage.py sync_google_sheets
"""

from django.core.management.base import BaseCommand, CommandError

from apps.core.models import SyncRun
from apps.core.sheets_source import SheetsConfigError
from apps.core.sync import SyncAlreadyRunning, run_sync


class Command(BaseCommand):
    help = "Sync every partner's Google Sheet into the database (via the master sheet's PartnerConfig)."

    def handle(self, *args, **options):
        try:
            run = run_sync(trigger=SyncRun.COMMAND)
        except (SheetsConfigError, SyncAlreadyRunning) as exc:
            raise CommandError(str(exc)) from exc

        if run.log:
            self.stderr.write(run.log)
        for partner, tabs in run.counts.items():
            summary = ", ".join(f"{n} {tab}" for tab, n in tabs.items())
            self.stdout.write(f"{partner}: {summary}")
        style = self.style.SUCCESS if run.status == SyncRun.SUCCESS else self.style.ERROR
        self.stdout.write(style(f"Sync {run.status}."))

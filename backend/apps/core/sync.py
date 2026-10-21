"""
Live Google Sheets -> database sync.

Starting from the master spreadsheet (``GOOGLE_MASTER_SHEET_ID``), imports
Schools_List + Users, then follows PartnerConfig to every partner's own
form-response spreadsheet and imports that into the partner's program
instance. Runs every ``SHEETS_SYNC_INTERVAL_MIN`` minutes via Celery beat
(``apps.core.tasks.sync_google_sheets``), on demand from the admin / API,
or by hand with ``python manage.py sync_google_sheets``.

Each partner is imported in its own transaction, so one broken sheet doesn't
block the others; the run is then recorded as "partial".
"""

import logging
import traceback
from datetime import timedelta

from django.conf import settings
from django.db import close_old_connections, transaction
from django.utils import timezone

from apps.core.models import SyncRun
from apps.core.sheet_importers import MasterSheetImporter, PartnerSheetImporter, instance_for_partner
from apps.core.sheets_source import GoogleSheetsSource, SheetsConfigError

logger = logging.getLogger(__name__)

STALE_RUN_AFTER = timedelta(minutes=30)


class SyncAlreadyRunning(Exception):
    pass


def is_configured() -> bool:
    return bool(settings.GOOGLE_MASTER_SHEET_ID) and bool(
        settings.GOOGLE_SERVICE_ACCOUNT_FILE or settings.GOOGLE_SERVICE_ACCOUNT_JSON
    )


def sync_in_progress() -> bool:
    """A run still marked RUNNING; ones older than STALE_RUN_AFTER are assumed crashed."""
    return SyncRun.objects.filter(
        status=SyncRun.RUNNING, started_at__gte=timezone.now() - STALE_RUN_AFTER
    ).exists()


def run_sync(trigger=SyncRun.SCHEDULE, user=None, source_factory=GoogleSheetsSource) -> SyncRun:
    if not settings.GOOGLE_MASTER_SHEET_ID:
        raise SheetsConfigError("Set GOOGLE_MASTER_SHEET_ID in backend/.env.")
    if sync_in_progress():
        raise SyncAlreadyRunning("Another Google Sheets sync is still running.")

    run = SyncRun.objects.create(trigger=trigger, triggered_by=user)
    log_lines: list[str] = []
    counts: dict[str, dict] = {}
    failures = 0

    def warn(message):
        log_lines.append(message)

    try:
        master = MasterSheetImporter(source_factory(settings.GOOGLE_MASTER_SHEET_ID), settings.SHEETS_SYNC_YEAR, warn)
        with transaction.atomic():
            counts["master"] = master.run()

        for config in master.partner_configs():
            if not config["sheet_id"]:
                continue
            try:
                source = source_factory(config["sheet_id"])
                with transaction.atomic():
                    instance = instance_for_partner(config["name"], settings.SHEETS_SYNC_YEAR)
                    counts[config["name"]] = PartnerSheetImporter(source, instance, warn).run()
            except Exception as exc:  # one partner's sheet must not sink the rest
                failures += 1
                logger.exception("Sheets sync failed for partner %s", config["name"])
                warn(f"[{config['name']}] FAILED: {exc}")
                close_old_connections()  # reconnect if the DB connection is what broke

        from apps.reports.services import reconcile_all_schools

        reconcile_all_schools()
        run.status = SyncRun.PARTIAL if failures else SyncRun.SUCCESS
    except Exception as exc:
        logger.exception("Sheets sync failed")
        warn(f"FAILED: {exc}\n{traceback.format_exc()}")
        run.status = SyncRun.FAILED

    run.finished_at = timezone.now()
    run.counts = counts
    run.log = "\n".join(log_lines)
    run.save(update_fields=["status", "finished_at", "counts", "log"])
    return run

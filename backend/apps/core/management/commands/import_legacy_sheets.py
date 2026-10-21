"""
Imports one partner's form-response spreadsheet (e.g. "Datla-Think & Make _
2026-2027") into the relational tables, keeping the original "Submission ID"
as ``external_ref`` on each row for traceability -- see the "Migration off
Google Sheets" section of the approved architecture plan.

Reads either a downloaded xlsx export or the live spreadsheet. To pull every
partner at once via the master sheet, use ``sync_google_sheets`` instead.

Usage:
    python manage.py import_legacy_sheets --file "../docs/Datla-Think & Make _ 2026-2027.xlsx"
    python manage.py import_legacy_sheets --spreadsheet-id <google sheet id>

Re-running is safe: rows are upserted by external_ref (or by natural key
where no Submission ID exists), never duplicated.
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.core.sheet_importers import PartnerSheetImporter
from apps.core.sheets_source import GoogleSheetsSource, SheetsConfigError, XlsxSource
from apps.programs.models import Partner, ProgramInstance


class Command(BaseCommand):
    help = "Import a partner's Google Sheets data (xlsx export or live sheet) into the new relational schema."

    def add_arguments(self, parser):
        source = parser.add_mutually_exclusive_group(required=True)
        source.add_argument("--file", help="Path to the Datla-Think & Make xlsx export")
        source.add_argument("--spreadsheet-id", help="ID of the live Google Sheet (from its URL)")
        parser.add_argument("--instance-code", default="DATLA-HYD-2026")
        parser.add_argument("--partner-name", default="Datla")
        parser.add_argument("--year", type=int, default=2026)

    def handle(self, *args, **options):
        try:
            if options["file"]:
                source = XlsxSource(options["file"])
            else:
                source = GoogleSheetsSource(options["spreadsheet_id"])
        except (FileNotFoundError, SheetsConfigError) as exc:
            raise CommandError(str(exc)) from exc

        partner, _ = Partner.objects.get_or_create(name=options["partner_name"])
        instance, _ = ProgramInstance.objects.get_or_create(
            code=options["instance_code"], defaults={"partner": partner, "year": options["year"]}
        )

        with transaction.atomic():
            counts = PartnerSheetImporter(source, instance, warn=self.stderr.write).run()

        self.stdout.write(self.style.SUCCESS(
            f"Imported: {counts['schools']} schools (enrollment), {counts['contact_info']} contact-info updates, "
            f"{counts['kits']} kit deliveries, {counts['sl_selections']} SL selections, "
            f"{counts['headcounts']} headcounts."
        ))

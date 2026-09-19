from django.core.management.base import BaseCommand

from apps.reports.services import reconcile_all_schools


class Command(BaseCommand):
    help = (
        "Recompute SchoolProgress + StudentHeadcount.count_validation mismatch flags "
        "for every school -- the same logic the nightly Celery task runs. Safe to "
        "re-run any time; use this for the first manual run right after migrating."
    )

    def handle(self, *args, **options):
        reconcile_all_schools()
        self.stdout.write(self.style.SUCCESS("Reconciled school progress for all schools."))

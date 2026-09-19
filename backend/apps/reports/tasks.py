from celery import shared_task


@shared_task
def reconcile_school_progress():
    """Nightly Celery beat task -- see CELERY_BEAT_SCHEDULE in settings.py."""
    from apps.reports.services import reconcile_all_schools

    reconcile_all_schools()

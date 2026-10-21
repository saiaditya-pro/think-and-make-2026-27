from celery import shared_task


@shared_task
def sync_google_sheets(trigger="schedule", user_id=None):
    """Celery beat task -- see CELERY_BEAT_SCHEDULE in settings.py."""
    from django.conf import settings

    from apps.core.sync import SyncAlreadyRunning, run_sync

    if not settings.SHEETS_SYNC_ENABLED:
        return None
    try:
        return run_sync(trigger=trigger, user=_user(user_id)).pk
    except SyncAlreadyRunning:
        return None


def _user(user_id):
    if user_id is None:
        return None
    from apps.accounts.models import User

    return User.objects.filter(pk=user_id).first()

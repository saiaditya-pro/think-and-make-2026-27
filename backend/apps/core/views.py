import logging
import threading

from django.db import connections
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import SyncRun
from apps.core.permissions import IsAdmin, IsAdminOrIIFStaff
from apps.core.serializers import SyncRunSerializer
from apps.core.sync import is_configured

logger = logging.getLogger(__name__)


class SyncStatusView(APIView):
    """Latest Google Sheets sync, for the "Last synced" badge on the dashboard."""

    permission_classes = [IsAdminOrIIFStaff]

    def get(self, request):
        last = SyncRun.objects.first()
        return Response({
            "configured": is_configured(),
            "last_run": SyncRunSerializer(last).data if last else None,
        })


def _run_sync_in_background(user):
    """A full sync takes minutes -- far longer than a web request may run
    (gunicorn would kill the worker) -- so without Celery it runs in a
    thread; the dashboard picks up the result by polling /sync/status/."""
    from apps.core.sync import run_sync

    try:
        run_sync(trigger=SyncRun.MANUAL, user=user)
    except Exception:
        logger.exception("Background Google Sheets sync failed")
    finally:
        connections.close_all()


class SyncRunView(APIView):
    """
    Queues a sync on the Celery worker. When no broker is reachable (local
    dev without Redis, or a host with no worker such as Render's free plan)
    the sync runs in a background thread of the web process instead.
    """

    permission_classes = [IsAdmin]

    def post(self, request):
        from apps.core.sync import sync_in_progress
        from apps.core.tasks import sync_google_sheets

        if not is_configured():
            return Response({"detail": "Google Sheets sync is not configured."}, status=status.HTTP_400_BAD_REQUEST)
        if sync_in_progress():
            return Response(
                {"detail": "Another Google Sheets sync is still running."}, status=status.HTTP_409_CONFLICT
            )
        try:
            sync_google_sheets.apply_async(kwargs={"trigger": SyncRun.MANUAL, "user_id": request.user.pk}, retry=False)
        except Exception:  # broker down -- run it in this process instead
            threading.Thread(target=_run_sync_in_background, args=(request.user,), daemon=True).start()
        return Response({"queued": True}, status=status.HTTP_202_ACCEPTED)

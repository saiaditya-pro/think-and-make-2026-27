from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import SyncRun
from apps.core.permissions import IsAdmin, IsAdminOrIIFStaff
from apps.core.serializers import SyncRunSerializer
from apps.core.sync import is_configured


class SyncStatusView(APIView):
    """Latest Google Sheets sync, for the "Last synced" badge on the dashboard."""

    permission_classes = [IsAdminOrIIFStaff]

    def get(self, request):
        last = SyncRun.objects.first()
        return Response({
            "configured": is_configured(),
            "last_run": SyncRunSerializer(last).data if last else None,
        })


class SyncRunView(APIView):
    """
    Queues a sync on the Celery worker. When no broker is reachable (local
    dev without Redis) the sync runs inside the request instead.
    """

    permission_classes = [IsAdmin]

    def post(self, request):
        from apps.core.sheets_source import SheetsConfigError
        from apps.core.sync import SyncAlreadyRunning, run_sync
        from apps.core.tasks import sync_google_sheets

        if not is_configured():
            return Response({"detail": "Google Sheets sync is not configured."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            sync_google_sheets.apply_async(kwargs={"trigger": SyncRun.MANUAL, "user_id": request.user.pk}, retry=False)
            return Response({"queued": True}, status=status.HTTP_202_ACCEPTED)
        except Exception:  # broker down -- fall back to running inline
            pass
        try:
            run = run_sync(trigger=SyncRun.MANUAL, user=request.user)
        except SyncAlreadyRunning as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        except SheetsConfigError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"queued": False, "run": SyncRunSerializer(run).data})

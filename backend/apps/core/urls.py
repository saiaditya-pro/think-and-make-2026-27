from django.urls import path

from apps.core.views import SyncRunView, SyncStatusView

urlpatterns = [
    path("sync/status/", SyncStatusView.as_view(), name="sync-status"),
    path("sync/run/", SyncRunView.as_view(), name="sync-run"),
]

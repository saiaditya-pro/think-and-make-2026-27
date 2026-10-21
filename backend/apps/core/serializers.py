from rest_framework import serializers

from apps.core.models import SyncRun


class SyncRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyncRun
        fields = ["id", "started_at", "finished_at", "status", "trigger", "counts", "log"]

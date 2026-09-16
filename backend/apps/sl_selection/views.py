from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.mixins import SchoolScopedViewSetMixin
from apps.sl_selection.models import SLSelection
from apps.sl_selection.serializers import SLSelectionSerializer


class SLSelectionViewSet(SchoolScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = SLSelection.objects.select_related("school")
    serializer_class = SLSelectionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["school", "grade", "section", "sl_status"]

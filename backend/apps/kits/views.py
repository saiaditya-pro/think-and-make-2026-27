from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.mixins import SchoolScopedViewSetMixin
from apps.kits.models import KitDelivery
from apps.kits.serializers import KitDeliverySerializer


class KitDeliveryViewSet(SchoolScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = KitDelivery.objects.select_related("school")
    serializer_class = KitDeliverySerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["school", "date_of_delivery"]

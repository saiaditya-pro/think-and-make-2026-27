from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from apps.core.mixins import SchoolScopedViewSetMixin
from apps.core.permissions import ADMIN, SCHOOL
from apps.kits.models import KitDelivery
from apps.kits.serializers import KitDeliverySerializer

ALREADY_SUBMITTED_MESSAGE = (
    "Kit handover has already been recorded for this school. Please contact admin to make any changes."
)


class KitDeliveryViewSet(SchoolScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = KitDelivery.objects.select_related("school")
    serializer_class = KitDeliverySerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["school", "date_of_delivery"]

    def perform_create(self, serializer):
        school = (
            self.request.user.school
            if self.request.user.role == SCHOOL
            else serializer.validated_data.get("school")
        )
        if school and self.request.user.role != ADMIN and KitDelivery.objects.filter(school=school).exists():
            raise PermissionDenied(ALREADY_SUBMITTED_MESSAGE)
        super().perform_create(serializer)

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.mixins import SchoolScopedViewSetMixin
from apps.headcounts.models import StudentHeadcount
from apps.headcounts.serializers import StudentHeadcountSerializer


class StudentHeadcountViewSet(SchoolScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = StudentHeadcount.objects.select_related("school")
    serializer_class = StudentHeadcountSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["school", "grade", "section", "extraction_status", "count_validation"]

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.mixins import SchoolScopedViewSetMixin
from apps.headcounts.models import StudentHeadcount
from apps.headcounts.serializers import StudentHeadcountSerializer
from apps.reports.services import reconcile_section


class StudentHeadcountViewSet(SchoolScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = StudentHeadcount.objects.select_related("school")
    serializer_class = StudentHeadcountSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["school", "grade", "section", "extraction_status", "count_validation"]

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        response.data["mismatch_warning"] = self._mismatch_warning(response.data["id"])
        return response

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        response.data["mismatch_warning"] = self._mismatch_warning(response.data["id"])
        return response

    def _mismatch_warning(self, headcount_id):
        """Synchronous check for just this row's grade/section -- so the
        warning banner shows up immediately, without waiting on the nightly
        reconciliation job."""
        headcount = self.get_queryset().get(pk=headcount_id)
        return reconcile_section(headcount.school, headcount.grade, headcount.section)

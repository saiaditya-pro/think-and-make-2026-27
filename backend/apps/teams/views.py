from rest_framework import viewsets

from apps.core.permissions import IsAdminOrIIFStaffOrReadOnly, scope_queryset_to_role
from apps.teams.models import Cluster, Student, Team
from apps.teams.serializers import ClusterSerializer, StudentSerializer, TeamSerializer


class ClusterViewSet(viewsets.ModelViewSet):
    """Clusters/Teams/Students are populated from the OCR'd student database
    (Students_Count_Info) via the import command, not hand-typed by schools --
    so only admin/IIF staff can write; schools can read their own."""

    serializer_class = ClusterSerializer
    permission_classes = [IsAdminOrIIFStaffOrReadOnly]
    filterset_fields = ["school", "grade", "section"]

    def get_queryset(self):
        qs = Cluster.objects.select_related("school").prefetch_related("teams__students")
        return scope_queryset_to_role(qs, self.request)


class TeamViewSet(viewsets.ModelViewSet):
    serializer_class = TeamSerializer
    permission_classes = [IsAdminOrIIFStaffOrReadOnly]
    filterset_fields = ["cluster"]

    def get_queryset(self):
        qs = Team.objects.select_related("cluster__school").prefetch_related("students")
        return scope_queryset_to_role(qs, self.request, school_field="cluster__school_id")


class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    permission_classes = [IsAdminOrIIFStaffOrReadOnly]
    filterset_fields = ["team"]

    def get_queryset(self):
        qs = Student.objects.select_related("team__cluster__school")
        return scope_queryset_to_role(qs, self.request, school_field="team__cluster__school_id")

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.mixins import SchoolScopedViewSetMixin
from apps.observations import selectors
from apps.observations.models import SessionObservation
from apps.observations.serializers import SessionObservationSerializer


class SessionObservationViewSet(SchoolScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = SessionObservation.objects.select_related("school")
    serializer_class = SessionObservationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["school", "grade", "section", "unit"]


class SessionTrackerView(APIView):
    """Replaces the manually 'auto-filled' L1/L2/L3_Session_Tracker sheets."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        unit = int(request.query_params.get("unit", 1))
        grade = int(request.query_params.get("grade", 6))
        rows = selectors.session_tracker(unit, grade)
        if request.user.role == "school":
            rows = rows.filter(school_id=request.user.school_id)
        return Response(list(rows))


class SessionProgressView(APIView):
    """Replaces the manually 'auto-filled' Session_Progress sheet."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = selectors.session_progress()
        if request.user.role == "school":
            rows = rows.filter(school_id=request.user.school_id)
        return Response(list(rows))

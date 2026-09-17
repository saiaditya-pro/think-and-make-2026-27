from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.mixins import SchoolScopedViewSetMixin
from apps.core.permissions import ADMIN, SCHOOL
from apps.sl_selection.models import SLSelection
from apps.sl_selection.serializers import SLSelectionBulkSubmitSerializer, SLSelectionSerializer

ALREADY_SUBMITTED_MESSAGE = (
    "SL Selection data has already been submitted for this grade/section. "
    "Please contact admin to make any changes."
)


class SLSelectionViewSet(SchoolScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = SLSelection.objects.select_related("school")
    serializer_class = SLSelectionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["school", "grade", "section", "sl_status"]

    @action(detail=False, methods=["post"], url_path="bulk-submit")
    def bulk_submit(self, request):
        serializer = SLSelectionBulkSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        school = request.user.school if request.user.role == SCHOOL else data.get("school")
        if school is None:
            raise ValidationError({"school": "This field is required."})
        grade = data["grade"]
        section = data["section"]

        if request.user.role != ADMIN and SLSelection.objects.filter(school=school, grade=grade, section=section).exists():
            raise ValidationError(ALREADY_SUBMITTED_MESSAGE)

        rows = [
            SLSelection(
                school=school,
                grade=grade,
                section=section,
                teacher=data["teacher"],
                teacher_acknowledged=data["teacher_acknowledged"],
                **entry,
            )
            for entry in data["entries"]
        ]
        SLSelection.objects.bulk_create(rows)

        return Response(SLSelectionSerializer(rows, many=True, context={"request": request}).data, status=status.HTTP_201_CREATED)

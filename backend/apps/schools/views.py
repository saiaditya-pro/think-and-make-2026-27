from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.core.permissions import ADMIN, IsAdminOrIIFStaffOrReadOnly, scope_queryset_to_role
from apps.reports.models import SchoolProgress
from apps.reports.serializers import SchoolProgressSerializer
from apps.schools.models import School, SchoolGradeEnrollment, SchoolTeacher, SessionSchedule
from apps.schools.serializers import (
    SchoolContactSubmitSerializer,
    SchoolForm1SubmitSerializer,
    SchoolGradeEnrollmentSerializer,
    SchoolSerializer,
    SchoolTeacherSerializer,
    SessionScheduleSerializer,
)

ALREADY_SUBMITTED_MESSAGE = (
    "Form 1 data has already been submitted for this school. Please contact admin to make any changes."
)
FORM2_ALREADY_SUBMITTED_MESSAGE = (
    "Form 2 data has already been submitted for this school. Please contact admin to make any changes."
)
FORM1_NOT_SUBMITTED_MESSAGE = "Form 1 must be submitted before Form 2."


class SchoolViewSet(viewsets.ModelViewSet):
    serializer_class = SchoolSerializer
    permission_classes = [IsAdminOrIIFStaffOrReadOnly]
    filterset_fields = ["instance", "instance__partner", "school_code", "district"]

    def get_queryset(self):
        qs = School.objects.select_related("instance").prefetch_related(
            "grade_enrollments", "teachers", "session_schedules"
        )
        return scope_queryset_to_role(qs, self.request, school_field="id")

    def perform_update(self, serializer):
        school = serializer.instance
        if school.form1_submitted and self.request.user.role != ADMIN:
            raise PermissionDenied(ALREADY_SUBMITTED_MESSAGE)
        serializer.save()

    @action(detail=True, methods=["post"], url_path="submit-form1")
    def submit_form1(self, request, pk=None):
        school = self.get_object()
        if school.form1_submitted and request.user.role != ADMIN:
            raise ValidationError(ALREADY_SUBMITTED_MESSAGE)

        serializer = SchoolForm1SubmitSerializer(school, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        grades = sorted(int(g) for g in serializer.validated_data.pop("grades"))

        school = serializer.save(
            grades_offered=",".join(str(g) for g in grades),
            total_sections=len(grades),
            form1_submitted=True,
            form1_submitted_at=timezone.now(),
        )
        for grade in grades:
            SchoolGradeEnrollment.objects.get_or_create(school=school, grade=grade)

        return Response(SchoolSerializer(school, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="submit-form2")
    def submit_form2(self, request, pk=None):
        school = self.get_object()
        if not school.form1_submitted:
            raise ValidationError(FORM1_NOT_SUBMITTED_MESSAGE)
        if school.form2_submitted and request.user.role != ADMIN:
            raise ValidationError(FORM2_ALREADY_SUBMITTED_MESSAGE)

        serializer = SchoolContactSubmitSerializer(school, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        teachers = serializer.validated_data.pop("teachers")
        schedules = serializer.validated_data.pop("session_schedules")

        school = serializer.save(form2_submitted=True, form2_submitted_at=timezone.now())

        school.teachers.all().delete()
        school.session_schedules.all().delete()
        SchoolTeacher.objects.bulk_create(SchoolTeacher(school=school, **teacher) for teacher in teachers)
        SessionSchedule.objects.bulk_create(SessionSchedule(school=school, **schedule) for schedule in schedules)

        return Response(SchoolSerializer(school, context={"request": request}).data)

    @action(detail=True, methods=["get"], url_path="progress")
    def progress(self, request, pk=None):
        """Single-school progress detail -- same row that appears in
        ``/api/v1/reports/summary/``'s table, scoped by the same
        ``get_queryset()`` role-check every other School action already uses.
        ``get_or_create`` so a brand-new school never 404s here just because
        the nightly reconciliation job hasn't run for it yet."""
        school = self.get_object()
        progress, _ = SchoolProgress.objects.get_or_create(school=school)
        return Response(SchoolProgressSerializer(progress).data)


class SchoolGradeEnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = SchoolGradeEnrollmentSerializer
    permission_classes = [IsAdminOrIIFStaffOrReadOnly]
    filterset_fields = ["school", "grade"]

    def get_queryset(self):
        qs = SchoolGradeEnrollment.objects.select_related("school")
        return scope_queryset_to_role(qs, self.request)


class SchoolTeacherViewSet(viewsets.ModelViewSet):
    serializer_class = SchoolTeacherSerializer
    permission_classes = [IsAdminOrIIFStaffOrReadOnly]
    filterset_fields = ["school"]

    def get_queryset(self):
        qs = SchoolTeacher.objects.select_related("school")
        return scope_queryset_to_role(qs, self.request)


class SessionScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = SessionScheduleSerializer
    permission_classes = [IsAdminOrIIFStaffOrReadOnly]
    filterset_fields = ["school", "grade"]

    def get_queryset(self):
        qs = SessionSchedule.objects.select_related("school")
        return scope_queryset_to_role(qs, self.request)

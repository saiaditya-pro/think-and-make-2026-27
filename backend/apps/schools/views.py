from rest_framework import viewsets

from apps.core.permissions import IsAdminOrIIFStaffOrReadOnly, scope_queryset_to_role
from apps.schools.models import School, SchoolGradeEnrollment, SchoolTeacher, SessionSchedule
from apps.schools.serializers import (
    SchoolGradeEnrollmentSerializer,
    SchoolSerializer,
    SchoolTeacherSerializer,
    SessionScheduleSerializer,
)


class SchoolViewSet(viewsets.ModelViewSet):
    serializer_class = SchoolSerializer
    permission_classes = [IsAdminOrIIFStaffOrReadOnly]
    filterset_fields = ["instance", "school_code", "district"]

    def get_queryset(self):
        qs = School.objects.select_related("instance").prefetch_related(
            "grade_enrollments", "teachers", "session_schedules"
        )
        return scope_queryset_to_role(qs, self.request, school_field="id")


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

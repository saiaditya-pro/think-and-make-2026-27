from rest_framework.routers import DefaultRouter

from apps.schools.views import (
    SchoolGradeEnrollmentViewSet,
    SchoolTeacherViewSet,
    SchoolViewSet,
    SessionScheduleViewSet,
)

router = DefaultRouter()
router.register("schools", SchoolViewSet, basename="school")
router.register("school-grade-enrollments", SchoolGradeEnrollmentViewSet, basename="school-grade-enrollment")
router.register("school-teachers", SchoolTeacherViewSet, basename="school-teacher")
router.register("session-schedules", SessionScheduleViewSet, basename="session-schedule")

urlpatterns = router.urls

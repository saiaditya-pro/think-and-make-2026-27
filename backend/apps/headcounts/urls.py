from rest_framework.routers import DefaultRouter

from apps.headcounts.views import StudentHeadcountViewSet

router = DefaultRouter()
router.register("student-headcounts", StudentHeadcountViewSet, basename="student-headcount")

urlpatterns = router.urls

from rest_framework.routers import DefaultRouter

from apps.teams.views import ClusterViewSet, StudentViewSet, TeamViewSet

router = DefaultRouter()
router.register("clusters", ClusterViewSet, basename="cluster")
router.register("teams", TeamViewSet, basename="team")
router.register("students", StudentViewSet, basename="student")

urlpatterns = router.urls

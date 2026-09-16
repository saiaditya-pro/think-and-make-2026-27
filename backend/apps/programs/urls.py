from rest_framework.routers import DefaultRouter

from apps.programs.views import PartnerViewSet, ProgramInstanceViewSet

router = DefaultRouter()
router.register("partners", PartnerViewSet, basename="partner")
router.register("instances", ProgramInstanceViewSet, basename="instance")

urlpatterns = router.urls

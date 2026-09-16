from rest_framework.routers import DefaultRouter

from apps.sl_selection.views import SLSelectionViewSet

router = DefaultRouter()
router.register("sl-selections", SLSelectionViewSet, basename="sl-selection")

urlpatterns = router.urls

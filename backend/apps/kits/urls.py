from rest_framework.routers import DefaultRouter

from apps.kits.views import KitDeliveryViewSet

router = DefaultRouter()
router.register("kit-deliveries", KitDeliveryViewSet, basename="kit-delivery")

urlpatterns = router.urls

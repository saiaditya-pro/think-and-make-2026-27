from rest_framework.routers import DefaultRouter

from apps.inquibuddy.views import InquibuddySubmissionViewSet

router = DefaultRouter()
router.register("inquibuddy-submissions", InquibuddySubmissionViewSet, basename="inquibuddy-submission")

urlpatterns = router.urls

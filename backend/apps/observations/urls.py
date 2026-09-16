from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.observations.views import SessionObservationViewSet, SessionProgressView, SessionTrackerView

router = DefaultRouter()
router.register("session-observations", SessionObservationViewSet, basename="session-observation")

urlpatterns = [
    path("session-tracker/", SessionTrackerView.as_view(), name="session-tracker"),
    path("session-progress/", SessionProgressView.as_view(), name="session-progress"),
] + router.urls

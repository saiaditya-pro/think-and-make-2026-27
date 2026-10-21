from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path

api_v1 = [
    path("", include("apps.accounts.urls")),
    path("", include("apps.programs.urls")),
    path("", include("apps.schools.urls")),
    path("", include("apps.kits.urls")),
    path("", include("apps.sl_selection.urls")),
    path("", include("apps.headcounts.urls")),
    path("", include("apps.teams.urls")),
    path("", include("apps.observations.urls")),
    path("", include("apps.inquibuddy.urls")),
    path("", include("apps.files.urls")),
    path("", include("apps.reports.urls")),
    path("", include("apps.core.urls")),
]

def healthz(request):
    """Render's health check: no auth and no DB, so it stays cheap."""
    return HttpResponse("ok", content_type="text/plain")


urlpatterns = [
    path("healthz", healthz),
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1)),
]

if settings.DEBUG and not getattr(settings, "USE_S3_STORAGE", False):
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
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
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1)),
]

if settings.DEBUG and not getattr(settings, "USE_S3_STORAGE", False):
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

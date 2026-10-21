"""
Django settings for the Think & Make 2026-27 backend.
"""

import sys
from datetime import timedelta
from pathlib import Path

import dj_database_url
from decouple import Csv, config
from django.templatetags.static import static

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config("DJANGO_SECRET_KEY", default="dev-only-insecure-secret-key")
DEBUG = config("DJANGO_DEBUG", default=True, cast=bool)
ALLOWED_HOSTS = config("DJANGO_ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())
CSRF_TRUSTED_ORIGINS = config("CSRF_TRUSTED_ORIGINS", default="", cast=Csv())

# Render sets this to the service's public hostname (e.g. think-and-make.onrender.com).
RENDER_EXTERNAL_HOSTNAME = config("RENDER_EXTERNAL_HOSTNAME", default="")
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)
    CSRF_TRUSTED_ORIGINS.append(f"https://{RENDER_EXTERNAL_HOSTNAME}")

if not DEBUG:
    if SECRET_KEY == "dev-only-insecure-secret-key":
        raise RuntimeError("Set DJANGO_SECRET_KEY when DJANGO_DEBUG is False.")
    # Behind Render's proxy: trust its X-Forwarded-Proto so Django knows the
    # request was HTTPS. Render already redirects HTTP -> HTTPS, so no
    # SECURE_SSL_REDIRECT here (it would also break the HTTP health check).
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

INSTALLED_APPS = [
    "unfold",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    # local apps
    "apps.core",
    "apps.accounts",
    "apps.programs",
    "apps.schools",
    "apps.kits",
    "apps.sl_selection",
    "apps.headcounts",
    "apps.teams",
    "apps.observations",
    "apps.inquibuddy",
    "apps.files",
    "apps.reports",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # Serves the admin's CSS/JS from STATIC_ROOT in production (no nginx).
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# --- Database ---
# Set DATABASE_URL in backend/.env to the Supabase *Session pooler* connection
# string; without it the backend falls back to the local SQLite file. Read via
# decouple (not dj_database_url.config, which only sees real env vars and
# would silently ignore .env).
DATABASE_URL = config("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}")
_is_postgres = DATABASE_URL.startswith(("postgres://", "postgresql://"))
DATABASES = {
    "default": dj_database_url.parse(
        DATABASE_URL,
        conn_max_age=600,
        # Supabase pooler connections can drop while idle; check before reuse.
        conn_health_checks=_is_postgres,
        ssl_require=_is_postgres,
    )
}

# pytest builds its own throwaway database. Keep that on in-memory SQLite so
# tests stay fast/offline and never try to CREATE DATABASE on Supabase.
if "pytest" in sys.modules:
    DATABASES["default"] = {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"  # filled by `collectstatic` (build.sh)
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- REST Framework ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
    ),
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.ScopedRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "login": "10/min",
    },
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

# --- CORS (for the Next.js website; the mobile app is a native HTTP client) ---
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000",
    
    cast=Csv(),
)

CORS_ALLOW_CREDENTIALS = True

# --- Celery ---
CELERY_BROKER_URL = config("CELERY_BROKER_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = config("CELERY_RESULT_BACKEND", default="redis://localhost:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE

# Static schedule for now (no django-celery-beat dependency) -- revisit only if
# ops need to change the run time without a deploy. Requires running
# `celery -A config beat` as its own process alongside the existing worker.
from celery.schedules import crontab  # noqa: E402

CELERY_BEAT_SCHEDULE = {
    "reconcile-school-progress-nightly": {
        "task": "apps.reports.tasks.reconcile_school_progress",
        "schedule": crontab(hour=2, minute=0),
    },
    "sync-google-sheets": {
        "task": "apps.core.tasks.sync_google_sheets",
        "schedule": timedelta(minutes=config("SHEETS_SYNC_INTERVAL_MIN", default=15, cast=int)),
    },
}

# --- Google Sheets live sync (apps.core.sync) ---
# The service account must be shared (Viewer) on the master sheet and on every
# partner sheet listed in its PartnerConfig tab.
GOOGLE_SERVICE_ACCOUNT_FILE = config("GOOGLE_SERVICE_ACCOUNT_FILE", default="")
GOOGLE_SERVICE_ACCOUNT_JSON = config("GOOGLE_SERVICE_ACCOUNT_JSON", default="")
GOOGLE_MASTER_SHEET_ID = config("GOOGLE_MASTER_SHEET_ID", default="")
SHEETS_SYNC_ENABLED = config("SHEETS_SYNC_ENABLED", default=True, cast=bool)
SHEETS_SYNC_YEAR = config("SHEETS_SYNC_YEAR", default=2026, cast=int)

# --- File storage (Supabase Storage, S3-compatible) ---
# Local dev falls back to Django's default filesystem storage so the app runs
# with zero external services; set these env vars to point at a real bucket.
USE_S3_STORAGE = config("USE_S3_STORAGE", default=False, cast=bool)

# Hashed + compressed static files served by WhiteNoise. Tests run without
# collectstatic, so they keep the plain backend (the manifest one would fail).
_STATICFILES_BACKEND = (
    "django.contrib.staticfiles.storage.StaticFilesStorage"
    if "pytest" in sys.modules
    else "whitenoise.storage.CompressedManifestStaticFilesStorage"
)

if USE_S3_STORAGE:
    STORAGES = {
        "default": {"BACKEND": "storages.backends.s3boto3.S3Boto3Storage"},
        "staticfiles": {"BACKEND": _STATICFILES_BACKEND},
    }
    AWS_ACCESS_KEY_ID = config("SUPABASE_STORAGE_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = config("SUPABASE_STORAGE_SECRET_ACCESS_KEY")
    AWS_STORAGE_BUCKET_NAME = config("SUPABASE_STORAGE_BUCKET", default="think-and-make")
    AWS_S3_ENDPOINT_URL = config("SUPABASE_STORAGE_ENDPOINT_URL", default="")
    AWS_S3_REGION_NAME = config("SUPABASE_STORAGE_REGION", default="ap-south-1")
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = True
    AWS_QUERYSTRING_EXPIRE = 600  # signed URLs valid 10 min
    AWS_S3_ADDRESSING_STYLE = "path"
else:
    STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {"BACKEND": _STATICFILES_BACKEND},
    }
    MEDIA_URL = "/media/"
    MEDIA_ROOT = BASE_DIR / "media"

# --- Third-party API keys ---
GEMINI_API_KEY = config("GEMINI_API_KEY", default="")

# --- Admin theme (django-unfold), palette matches the Think & Make brand colors ---
UNFOLD = {
    "SITE_TITLE": "Think & Make Admin",
    "SITE_HEADER": "Think & Make",
    "SITE_SUBHEADER": "2026-27 Program Admin",
    "SITE_SYMBOL": "auto_awesome",
    # The website has no dark mode; force the admin to match instead of
    # following the OS/browser preference (Unfold defaults to "auto", which
    # made text colors meant for a dark background land on our light theme).
    "THEME": "light",
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": True,
    "SHOW_BACK_BUTTON": True,
    "STYLES": [
        lambda request: static("admin/theme.css"),
    ],
    "SCRIPTS": [
        lambda request: static("admin/force-light.js"),
    ],
    "COLORS": {
        "primary": {
            "50": "254 246 240",
            "100": "253 232 219",
            "200": "251 208 182",
            "300": "247 173 130",
            "400": "245 143 92",
            "500": "242 112 60",
            "600": "216 90 42",
            "700": "184 72 31",
            "800": "147 57 26",
            "900": "120 47 23",
            "950": "64 23 11",
        },
    },
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": True,
    },
}

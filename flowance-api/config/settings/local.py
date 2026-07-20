from . import base as base_settings
from .base import *  # noqa: F403

DEBUG = True

CORS_ALLOWED_ORIGINS = base_settings.env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:3000"],
)
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = base_settings.env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=["http://localhost:3000"],
)

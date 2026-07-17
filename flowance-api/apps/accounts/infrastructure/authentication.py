"""Cookie-based SimpleJWT authentication with CSRF enforcement."""

from django.conf import settings
from rest_framework.authentication import CSRFCheck
from rest_framework.permissions import SAFE_METHODS
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.common.exceptions import CsrfFailedError


def enforce_csrf(request) -> None:
    if request.method in SAFE_METHODS:
        return

    check = CSRFCheck(lambda current_request: None)
    check.process_request(request)
    reason = check.process_view(request, None, (), {})
    if reason:
        raise CsrfFailedError()


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        raw_token = request.COOKIES.get(settings.JWT_ACCESS_COOKIE_NAME)
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)
        enforce_csrf(request)
        return user, validated_token

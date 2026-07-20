from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings
from django.http import HttpResponse
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.exceptions import AuthenticationError

from ..models import User


@dataclass(frozen=True, slots=True)
class TokenPair:
    access: str
    refresh: str


def issue_token_pair(user: User) -> TokenPair:
    refresh = RefreshToken.for_user(user)
    return TokenPair(access=str(refresh.access_token), refresh=str(refresh))


def rotate_token_pair(raw_refresh_token: str) -> TokenPair:
    serializer = TokenRefreshSerializer(data={"refresh": raw_refresh_token})
    try:
        serializer.is_valid(raise_exception=True)
    except TokenError as exc:
        raise AuthenticationError(
            "Refresh Tokenが無効または期限切れです。", code="TOKEN_INVALID"
        ) from exc

    return TokenPair(
        access=str(serializer.validated_data["access"]),
        refresh=str(serializer.validated_data["refresh"]),
    )


def blacklist_refresh_token(raw_refresh_token: str) -> None:
    try:
        RefreshToken(raw_refresh_token).blacklist()
    except TokenError as exc:
        raise AuthenticationError(
            "Refresh Tokenが無効または期限切れです。", code="TOKEN_INVALID"
        ) from exc


def set_auth_cookies(response: HttpResponse, pair: TokenPair) -> None:
    access_lifetime = settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]
    refresh_lifetime = settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]
    common = {
        "httponly": True,
        "secure": settings.JWT_COOKIE_SECURE,
        "samesite": settings.JWT_COOKIE_SAMESITE,
    }
    response.set_cookie(
        settings.JWT_ACCESS_COOKIE_NAME,
        pair.access,
        max_age=int(access_lifetime.total_seconds()),
        path=settings.JWT_ACCESS_COOKIE_PATH,
        **common,
    )
    response.set_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        pair.refresh,
        max_age=int(refresh_lifetime.total_seconds()),
        path=settings.JWT_REFRESH_COOKIE_PATH,
        **common,
    )


def clear_auth_cookies(response: HttpResponse) -> None:
    response.delete_cookie(
        settings.JWT_ACCESS_COOKIE_NAME,
        path=settings.JWT_ACCESS_COOKIE_PATH,
        samesite=settings.JWT_COOKIE_SAMESITE,
    )
    response.delete_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        path=settings.JWT_REFRESH_COOKIE_PATH,
        samesite=settings.JWT_COOKIE_SAMESITE,
    )

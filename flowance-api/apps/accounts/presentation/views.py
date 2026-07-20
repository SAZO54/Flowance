from django.conf import settings
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit_logs.services import AuditLogService
from apps.common.exceptions import AuthenticationError

from ..application.auth_service import AuthContext, AuthService, permissions_for
from ..infrastructure.authentication import enforce_csrf
from ..infrastructure.tokens import (
    blacklist_refresh_token,
    clear_auth_cookies,
    issue_token_pair,
    rotate_token_pair,
    set_auth_cookies,
)
from .serializers import LoginSerializer, RegisterSerializer


def _auth_context_payload(context: AuthContext, *, include_permissions: bool = False):
    membership = context.membership
    payload = {
        "user": {
            "id": str(context.user.id),
            "email": context.user.email,
            "displayName": context.user.display_name,
            "timezone": context.user.timezone,
        },
        "organization": {
            "id": str(membership.organization.id),
            "name": membership.organization.name,
            "role": membership.role,
        },
    }
    if include_permissions:
        payload["permissions"] = list(permissions_for(membership.role))
    return payload


class PublicAuthAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]


@method_decorator(ensure_csrf_cookie, name="dispatch")
class RegisterView(PublicAuthAPIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        context = AuthService.register(
            email=values["email"],
            password=values["password"],
            display_name=values["displayName"],
            organization_name=values["organizationName"],
            timezone_name=values["timezone"],
            trace_id=request.trace_id,
        )
        pair = issue_token_pair(context.user)
        response = Response(
            _auth_context_payload(context),
            status=status.HTTP_201_CREATED,
        )
        get_token(request)
        set_auth_cookies(response, pair)
        response["Location"] = "/api/v1/auth/me"
        return response


@method_decorator(ensure_csrf_cookie, name="dispatch")
class LoginView(PublicAuthAPIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        context = AuthService.login(request=request, **serializer.validated_data)
        pair = issue_token_pair(context.user)
        response = Response(_auth_context_payload(context))
        get_token(request)
        set_auth_cookies(response, pair)
        return response


class RefreshTokenView(PublicAuthAPIView):
    def post(self, request):
        enforce_csrf(request)
        raw_refresh = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if not raw_refresh:
            raise AuthenticationError("Refresh Tokenが必要です。", code="TOKEN_INVALID")
        pair = rotate_token_pair(raw_refresh)
        response = Response(status=status.HTTP_200_OK)
        set_auth_cookies(response, pair)
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        raw_refresh = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if not raw_refresh:
            raise AuthenticationError("Refresh Tokenが必要です。", code="TOKEN_INVALID")
        blacklist_refresh_token(raw_refresh)
        AuditLogService.record(
            actor_user=request.user,
            action="LOGOUT",
            resource_type="user",
            resource_id=request.user.id,
            trace_id=request.trace_id,
        )
        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_auth_cookies(response)
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        context = AuthService.current_context(request.user)
        return Response(_auth_context_payload(context, include_permissions=True))

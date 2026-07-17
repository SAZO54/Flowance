"""Authentication application use cases and transaction boundaries."""

from __future__ import annotations

from dataclasses import dataclass

from django.contrib.auth import authenticate, password_validation
from django.db import transaction
from django.utils import timezone

from apps.audit_logs.services import AuditLogService
from apps.common.exceptions import AuthenticationError, ConflictError
from apps.organizations.models import (
    Organization,
    OrganizationMember,
    OrganizationMemberStatus,
    OrganizationRole,
    OrganizationStatus,
)

from ..models import User, UserStatus, normalize_email_for_comparison


class EmailAlreadyRegisteredError(ConflictError):
    code = "EMAIL_ALREADY_REGISTERED"
    default_message = "このメールアドレスは既に登録されています。"


@dataclass(frozen=True, slots=True)
class AuthContext:
    user: User
    membership: OrganizationMember


ROLE_PERMISSIONS = {
    OrganizationRole.OWNER: (
        "clients:read",
        "clients:create",
        "clients:update",
        "projects:read",
        "projects:create",
        "projects:update",
        "contracts:read",
        "contracts:create",
        "contracts:update",
        "schedules:read",
        "schedules:create",
        "schedules:update",
        "workRecords:read",
        "workRecords:create",
        "workRecords:update",
        "settlements:calculate",
        "settlements:finalize",
    ),
    OrganizationRole.ADMIN: (
        "clients:read",
        "clients:create",
        "clients:update",
        "projects:read",
        "projects:create",
        "projects:update",
        "contracts:read",
        "contracts:create",
        "contracts:update",
        "schedules:read",
        "schedules:create",
        "schedules:update",
        "workRecords:read",
        "workRecords:create",
        "workRecords:update",
        "settlements:calculate",
        "settlements:finalize",
    ),
    OrganizationRole.MEMBER: (
        "clients:read",
        "projects:read",
        "contracts:read",
        "schedules:read",
        "schedules:createOwn",
        "schedules:updateOwn",
        "workRecords:readOwn",
        "workRecords:createOwn",
        "workRecords:updateOwn",
    ),
}


def get_active_membership(user: User) -> OrganizationMember:
    try:
        return (
            OrganizationMember.objects.select_related("organization")
            .filter(
                user=user,
                status=OrganizationMemberStatus.ACTIVE,
                organization__status=OrganizationStatus.ACTIVE,
                organization__deleted_at__isnull=True,
            )
            .order_by("created_at")
            .get()
        )
    except OrganizationMember.DoesNotExist as exc:
        raise AuthenticationError() from exc
    except OrganizationMember.MultipleObjectsReturned:
        return (
            OrganizationMember.objects.select_related("organization")
            .filter(
                user=user,
                status=OrganizationMemberStatus.ACTIVE,
                organization__status=OrganizationStatus.ACTIVE,
                organization__deleted_at__isnull=True,
            )
            .earliest("created_at")
        )


class AuthService:
    @staticmethod
    @transaction.atomic
    def register(
        *,
        email: str,
        password: str,
        display_name: str,
        organization_name: str,
        timezone_name: str,
        trace_id=None,
    ) -> AuthContext:
        normalized_email = normalize_email_for_comparison(email)
        if User.all_objects.filter(normalized_email=normalized_email).exists():
            raise EmailAlreadyRegisteredError()

        candidate = User(
            email=email.strip(),
            normalized_email=normalized_email,
            display_name=display_name,
            timezone=timezone_name,
        )
        password_validation.validate_password(password, user=candidate)
        candidate.set_password(password)
        candidate.save()

        organization = Organization.objects.create(
            name=organization_name,
            owner_user=candidate,
            timezone=timezone_name,
        )
        membership = OrganizationMember.objects.create(
            organization=organization,
            user=candidate,
            role=OrganizationRole.OWNER,
            status=OrganizationMemberStatus.ACTIVE,
            joined_at=timezone.now(),
        )
        AuditLogService.record(
            organization=organization,
            actor_user=candidate,
            action="USER_REGISTERED",
            resource_type="user",
            resource_id=candidate.id,
            trace_id=trace_id,
        )
        return AuthContext(user=candidate, membership=membership)

    @staticmethod
    def login(*, email: str, password: str, request=None) -> AuthContext:
        normalized_email = normalize_email_for_comparison(email)
        user = authenticate(
            request=request,
            normalized_email=normalized_email,
            password=password,
        )
        if user is None or user.status != UserStatus.ACTIVE:
            AuditLogService.record(
                action="LOGIN_FAILED",
                resource_type="user",
                trace_id=getattr(request, "trace_id", None),
            )
            raise AuthenticationError(
                "メールアドレスまたはパスワードが正しくありません。"
            )

        membership = get_active_membership(user)
        AuditLogService.record(
            organization=membership.organization,
            actor_user=user,
            action="LOGIN_SUCCEEDED",
            resource_type="user",
            resource_id=user.id,
            trace_id=getattr(request, "trace_id", None),
        )
        return AuthContext(user=user, membership=membership)

    @staticmethod
    def current_context(user: User) -> AuthContext:
        return AuthContext(user=user, membership=get_active_membership(user))


def permissions_for(role: str) -> tuple[str, ...]:
    return ROLE_PERMISSIONS.get(role, ())

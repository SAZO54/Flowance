"""Tenant and schedule permission checks."""

from apps.common.exceptions import AuthorizationError, ResourceNotFoundError
from apps.organizations.models import (
    OrganizationMember,
    OrganizationMemberStatus,
    OrganizationRole,
)
from apps.projects.models import Project, ProjectMember


class ScheduleProjectNotFoundError(ResourceNotFoundError):
    code = "PROJECT_NOT_FOUND"
    default_message = "案件が見つかりません。"


class ScheduleUserNotFoundError(ResourceNotFoundError):
    code = "USER_NOT_FOUND"
    default_message = "利用者が見つかりません。"


def get_schedule_project(membership, project_id) -> Project:
    project = (
        Project.objects.for_organization(membership.organization)
        .filter(pk=project_id)
        .first()
    )
    if project is None:
        raise ScheduleProjectNotFoundError()
    return project


def get_organization_user(membership, user_id):
    organization_membership = (
        OrganizationMember.objects.filter(
            organization=membership.organization,
            user_id=user_id,
            status=OrganizationMemberStatus.ACTIVE,
        )
        .select_related("user")
        .first()
    )
    if organization_membership is None:
        raise ScheduleUserNotFoundError()
    return organization_membership.user


def require_schedule_editor(membership, project, *, target_user_id=None) -> None:
    if membership.role in (OrganizationRole.OWNER, OrganizationRole.ADMIN):
        return
    if target_user_id is not None and target_user_id != membership.user_id:
        raise AuthorizationError()
    allowed = (
        ProjectMember.objects.for_organization(membership.organization)
        .filter(
            project=project,
            user=membership.user,
            can_edit_schedule=True,
        )
        .exists()
    )
    if not allowed:
        raise AuthorizationError()

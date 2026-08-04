from datetime import date, datetime, time
from decimal import Decimal
from zoneinfo import ZoneInfo

import factory
from factory.django import DjangoModelFactory

from apps.accounts.models import User
from apps.clients.models import Client, ClientStatus
from apps.contracts.models import ContractStatus, ContractType, ProjectContract
from apps.files.models import (
    BackgroundTask,
    BackgroundTaskStatus,
    BackgroundTaskType,
    FileCategory,
    FileStatus,
    StoredFile,
)
from apps.organizations.models import (
    Organization,
    OrganizationBusinessProfile,
    OrganizationMember,
    OrganizationMemberStatus,
    OrganizationRole,
)
from apps.projects.models import (
    Project,
    ProjectMember,
    ProjectMemberRole,
    ProjectStatus,
)
from apps.schedules.models import WeeklySchedule, WeeklyScheduleStatus, WorkSchedule
from apps.work_records.models import WorkRecord, WorkRecordStatus


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda value: f"user{value}@example.com")
    password = factory.PostGenerationMethodCall("set_password", "safe-password-123!")
    display_name = factory.Sequence(lambda value: f"User {value}")
    timezone = "Asia/Tokyo"


class OrganizationFactory(DjangoModelFactory):
    class Meta:
        model = Organization

    name = factory.Sequence(lambda value: f"Organization {value}")
    owner_user = factory.SubFactory(UserFactory)
    timezone = "Asia/Tokyo"

    @factory.post_generation
    def business_profile(self, create, extracted, **kwargs):
        if create:
            OrganizationBusinessProfile.objects.get_or_create(organization=self)


class OrganizationMemberFactory(DjangoModelFactory):
    class Meta:
        model = OrganizationMember

    organization = factory.SubFactory(OrganizationFactory)
    user = factory.SubFactory(UserFactory)
    role = OrganizationRole.OWNER
    status = OrganizationMemberStatus.ACTIVE


class ClientFactory(DjangoModelFactory):
    class Meta:
        model = Client

    organization = factory.SubFactory(OrganizationFactory)
    created_by = factory.SubFactory(UserFactory)
    updated_by = factory.SelfAttribute("created_by")
    name = factory.Sequence(lambda value: f"Client {value}")
    status = ClientStatus.ACTIVE
    default_icon_text = "CL"
    default_icon_background_color = "#E5F2FA"
    default_icon_text_color = "#75A8C7"


class ProjectFactory(DjangoModelFactory):
    class Meta:
        model = Project

    organization = factory.SubFactory(OrganizationFactory)
    client = factory.SubFactory(
        ClientFactory, organization=factory.SelfAttribute("..organization")
    )
    created_by = factory.SubFactory(UserFactory)
    updated_by = factory.SelfAttribute("created_by")
    name = factory.Sequence(lambda value: f"Project {value}")
    label_color = "#75A8C7"
    status = ProjectStatus.ACTIVE
    default_icon_text = "PR"
    default_icon_background_color = "#E5F2FA"
    default_icon_text_color = "#75A8C7"


class ProjectMemberFactory(DjangoModelFactory):
    class Meta:
        model = ProjectMember

    organization = factory.SubFactory(OrganizationFactory)
    project = factory.SubFactory(
        ProjectFactory, organization=factory.SelfAttribute("..organization")
    )
    user = factory.SubFactory(UserFactory)
    role = ProjectMemberRole.MEMBER
    can_view = True
    can_edit_schedule = False
    can_edit_work_record = False


class ProjectContractFactory(DjangoModelFactory):
    class Meta:
        model = ProjectContract

    organization = factory.SubFactory(OrganizationFactory)
    project = factory.SubFactory(
        ProjectFactory, organization=factory.SelfAttribute("..organization")
    )
    created_by = factory.SubFactory(UserFactory)
    updated_by = factory.SelfAttribute("created_by")
    contract_type = ContractType.HOURLY
    currency = "JPY"
    hourly_rate = 6000
    tax_rate = Decimal("10.00")
    withholding_tax_rate = Decimal("10.21")
    rounding_unit_minutes = 1
    rounding_method = "ROUND_DOWN"
    valid_from = date(2026, 7, 1)
    valid_until = None
    status = ContractStatus.ACTIVE


class WeeklyScheduleFactory(DjangoModelFactory):
    class Meta:
        model = WeeklySchedule

    organization = factory.SubFactory(OrganizationFactory)
    project = factory.SubFactory(
        ProjectFactory, organization=factory.SelfAttribute("..organization")
    )
    user = factory.SubFactory(UserFactory)
    created_by = factory.SelfAttribute("user")
    updated_by = factory.SelfAttribute("user")
    day_of_week = 1
    start_time = time(9, 0)
    end_time = time(17, 0)
    break_minutes = 60
    valid_from = date(2026, 7, 1)
    valid_until = None
    status = WeeklyScheduleStatus.ACTIVE


class WorkScheduleFactory(DjangoModelFactory):
    class Meta:
        model = WorkSchedule

    organization = factory.SubFactory(OrganizationFactory)
    project = factory.SubFactory(
        ProjectFactory, organization=factory.SelfAttribute("..organization")
    )
    user = factory.SubFactory(UserFactory)
    created_by = factory.SelfAttribute("user")
    updated_by = factory.SelfAttribute("user")
    title = "予定"
    scheduled_start_at = datetime(2026, 7, 20, 9, 0, tzinfo=ZoneInfo("Asia/Tokyo"))
    scheduled_end_at = datetime(2026, 7, 20, 17, 0, tzinfo=ZoneInfo("Asia/Tokyo"))
    break_minutes = 60


class WorkRecordFactory(DjangoModelFactory):
    class Meta:
        model = WorkRecord

    organization = factory.SubFactory(OrganizationFactory)
    project = factory.SubFactory(
        ProjectFactory, organization=factory.SelfAttribute("..organization")
    )
    user = factory.SubFactory(UserFactory)
    created_by = factory.SelfAttribute("user")
    updated_by = factory.SelfAttribute("user")
    actual_start_at = datetime(2026, 7, 20, 9, 0, tzinfo=ZoneInfo("Asia/Tokyo"))
    actual_end_at = datetime(2026, 7, 20, 17, 0, tzinfo=ZoneInfo("Asia/Tokyo"))
    actual_minutes = 480
    break_minutes = 0
    billable_minutes = 480
    is_billable = True
    status = WorkRecordStatus.DRAFT


class StoredFileFactory(DjangoModelFactory):
    class Meta:
        model = StoredFile

    organization = factory.SubFactory(OrganizationFactory)
    created_by = factory.SubFactory(UserFactory)
    category = FileCategory.CLIENT_ICON
    status = FileStatus.PENDING
    storage_provider = "LOCAL"
    original_object_key = factory.Sequence(lambda value: f"test/original/{value}.png")
    original_filename = "icon.png"
    content_type = "image/png"


class BackgroundTaskFactory(DjangoModelFactory):
    class Meta:
        model = BackgroundTask

    organization = factory.SubFactory(OrganizationFactory)
    task_type = BackgroundTaskType.IMAGE_PROCESSING
    resource_type = "stored_file"
    resource_id = factory.LazyAttribute(lambda obj: obj.stored_file.id)
    status = BackgroundTaskStatus.PENDING

    class Params:
        stored_file = factory.SubFactory(StoredFileFactory)

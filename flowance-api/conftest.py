import pytest

from apps.common.tests.factories import OrganizationFactory, OrganizationMemberFactory
from apps.organizations.models import OrganizationRole


@pytest.fixture
def organization(db):
    return OrganizationFactory()


@pytest.fixture
def owner_membership(db, organization):
    return OrganizationMemberFactory(
        organization=organization,
        role=OrganizationRole.OWNER,
    )

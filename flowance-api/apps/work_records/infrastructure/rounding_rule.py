"""Resolve the active contract rounding rule without coupling Domain to ORM."""

from dataclasses import dataclass
from zoneinfo import ZoneInfo

from django.apps import apps


@dataclass(frozen=True, slots=True)
class ContractRoundingRule:
    unit_minutes: int | None
    method: str | None


def find_contract_rounding_rule(*, organization, project, actual_start_at):
    try:
        contract_model = apps.get_model("contracts", "ProjectContract")
    except LookupError:
        return ContractRoundingRule(None, None)

    work_date = actual_start_at.astimezone(ZoneInfo(organization.timezone)).date()
    queryset = contract_model.objects.for_organization(organization).filter(
        project=project,
        valid_from__lte=work_date,
    )
    field_names = {field.name for field in contract_model._meta.fields}
    if "valid_until" in field_names:
        from django.db.models import Q

        queryset = queryset.filter(
            Q(valid_until__isnull=True) | Q(valid_until__gte=work_date)
        )
    if "status" in field_names:
        queryset = queryset.filter(status="ACTIVE")
    contract = queryset.order_by("-valid_from").first()
    if contract is None:
        return ContractRoundingRule(None, None)
    return ContractRoundingRule(
        getattr(contract, "rounding_unit_minutes", None),
        getattr(contract, "rounding_method", None),
    )

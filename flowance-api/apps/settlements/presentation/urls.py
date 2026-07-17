from django.urls import path

from .views import (
    SettlementCalculateView,
    SettlementDetailView,
    SettlementFinalizeView,
    SettlementRecalculateView,
)

app_name = "settlements"

urlpatterns = [
    path("calculate", SettlementCalculateView.as_view(), name="calculate"),
    path("<uuid:settlement_id>", SettlementDetailView.as_view(), name="detail"),
    path(
        "<uuid:settlement_id>/recalculate",
        SettlementRecalculateView.as_view(),
        name="recalculate",
    ),
    path(
        "<uuid:settlement_id>/finalize",
        SettlementFinalizeView.as_view(),
        name="finalize",
    ),
]

from django.urls import path

from .views import ContractCollectionView, ContractDetailView

app_name = "contracts"

urlpatterns = [
    path(
        "projects/<uuid:project_id>/contracts",
        ContractCollectionView.as_view(),
        name="collection",
    ),
    path(
        "projects/<uuid:project_id>/contracts/<uuid:contract_id>",
        ContractDetailView.as_view(),
        name="detail",
    ),
]

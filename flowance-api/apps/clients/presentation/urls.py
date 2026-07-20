from django.urls import path

from .views import ClientCollectionView, ClientDetailView

app_name = "clients"

urlpatterns = [
    path("clients", ClientCollectionView.as_view(), name="collection"),
    path("clients/<uuid:client_id>", ClientDetailView.as_view(), name="detail"),
]

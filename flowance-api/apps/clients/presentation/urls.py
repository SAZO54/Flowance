from django.urls import path

from .views import ClientCollectionView, ClientDetailView

app_name = "clients"

urlpatterns = [
    path("", ClientCollectionView.as_view(), name="collection"),
    path("<uuid:client_id>", ClientDetailView.as_view(), name="detail"),
]

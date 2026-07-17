from django.urls import path

from .views import ProjectCollectionView, ProjectDetailView

app_name = "projects"

urlpatterns = [
    path("", ProjectCollectionView.as_view(), name="collection"),
    path("<uuid:project_id>", ProjectDetailView.as_view(), name="detail"),
]

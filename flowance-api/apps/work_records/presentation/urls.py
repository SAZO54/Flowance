from django.urls import path

from .views import WorkRecordCollectionView, WorkRecordDetailView

app_name = "work_records"

urlpatterns = [
    path("", WorkRecordCollectionView.as_view(), name="collection"),
    path("<uuid:record_id>", WorkRecordDetailView.as_view(), name="detail"),
]

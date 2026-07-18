from django.urls import path

from .views import WorkRecordCollectionView, WorkRecordDetailView

app_name = "work_records"

urlpatterns = [
    path("work-records", WorkRecordCollectionView.as_view(), name="collection"),
    path("work-records/<uuid:record_id>", WorkRecordDetailView.as_view(), name="detail"),
]

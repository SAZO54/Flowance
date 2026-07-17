from django.urls import path

from .views import (
    CalendarEventsView,
    WeeklyScheduleBulkView,
    WeeklyScheduleCollectionView,
    WeeklyScheduleDetailView,
    WorkScheduleCollectionView,
    WorkScheduleDetailView,
    WorkScheduleGenerateView,
)

app_name = "schedules"

urlpatterns = [
    path(
        "projects/<uuid:project_id>/weekly-schedules",
        WeeklyScheduleCollectionView.as_view(),
        name="weekly-collection",
    ),
    path(
        "projects/<uuid:project_id>/weekly-schedules/bulk",
        WeeklyScheduleBulkView.as_view(),
        name="weekly-bulk",
    ),
    path(
        "projects/<uuid:project_id>/weekly-schedules/<uuid:weekly_schedule_id>",
        WeeklyScheduleDetailView.as_view(),
        name="weekly-detail",
    ),
    path(
        "work-schedules/generate",
        WorkScheduleGenerateView.as_view(),
        name="work-generate",
    ),
    path(
        "work-schedules",
        WorkScheduleCollectionView.as_view(),
        name="work-collection",
    ),
    path(
        "work-schedules/<uuid:work_schedule_id>",
        WorkScheduleDetailView.as_view(),
        name="work-detail",
    ),
    path("calendar/events", CalendarEventsView.as_view(), name="calendar-events"),
]

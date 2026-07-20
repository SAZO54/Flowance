from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.accounts.presentation.urls")),
    path("api/v1/", include("apps.settings.presentation.urls")),
    path("api/v1/", include("apps.clients.presentation.urls")),
    path("api/v1/", include("apps.projects.presentation.urls")),
    path("api/v1/", include("apps.contracts.presentation.urls")),
    path("api/v1/", include("apps.schedules.presentation.urls")),
    path("api/v1/", include("apps.work_records.presentation.urls")),
    path("api/v1/settlements/", include("apps.settlements.presentation.urls")),
]

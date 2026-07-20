from django.urls import path

from .views import SettingsView

app_name = "settings"

urlpatterns = [path("settings", SettingsView.as_view(), name="detail")]

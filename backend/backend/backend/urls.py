from django.contrib import admin
from django.urls import path, include
from django.conf import settings

from .media_view import serve_media

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("forum.urls")),
    path("media/<path:path>", serve_media, name="media"),
]

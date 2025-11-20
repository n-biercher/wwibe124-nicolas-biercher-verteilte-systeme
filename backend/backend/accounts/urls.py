# accounts/urls.py
from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    RefreshTokenView,
    MeView,
    LogoutView,
    ChangePasswordView,
    DeleteAccountView, 
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", RefreshTokenView.as_view(), name="auth-refresh"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("change-password/", ChangePasswordView.as_view(), name="auth-change-password"),
    path(
        "delete-account/",
        DeleteAccountView.as_view(),
        name="auth-delete-account",
    ),
]

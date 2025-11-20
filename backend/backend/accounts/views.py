from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, response, status, parsers
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser

from .serializers import RegisterSerializer, MeSerializer, ChangePasswordSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class LoginView(TokenObtainPairView):
    """
    Nutzt den Default-Serializer von SimpleJWT.
    Erwartet standardmäßig 'email' + 'password'.
    """
    serializer_class = TokenObtainPairSerializer


class RefreshTokenView(TokenRefreshView):
    """Stellt neuen Access-Token aus."""
    pass


class MeView(APIView):
    """
    GET: eigene Profildaten
    PATCH: Profildaten + Bild ändern
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, *args, **kwargs):
        serializer = MeSerializer(request.user, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, *args, **kwargs):
        print(">>> MeView.patch content_type:", request.content_type)
        print(">>> MeView.patch FILES keys:", list(request.FILES.keys()))

        serializer = MeSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        print(">>> MeView.patch user.image:", bool(user.image), "name:", getattr(user.image, "name", None))

        return Response(
            MeSerializer(user, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(APIView):
    """
    POST: {"old_password": "...", "new_password": "..."}
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request, *args, **kwargs):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_password = serializer.validated_data["old_password"]
        new_password = serializer.validated_data["new_password"]

        user = request.user
        if not user.check_password(old_password):
            return Response(
                {"detail": "Das aktuelle Passwort ist falsch."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()

        return Response(
            {"detail": "Passwort wurde erfolgreich geändert."},
            status=status.HTTP_200_OK,
        )


class DeleteAccountView(APIView):
    """
    DELETE: aktuelles Konto löschen
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        user = request.user
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)



class LogoutView(APIView):
    """Nimmt einen Refresh-Token entgegen und blacklistet ihn."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token_str = request.data.get("refresh")
        if not token_str:
            return Response({"detail": "refresh fehlt"}, status=400)
        try:
            token = RefreshToken(token_str)
            token.blacklist()
        except Exception:
            return Response({"detail": "Ungültiger refresh"}, status=400)
        return Response(status=status.HTTP_205_RESET_CONTENT)



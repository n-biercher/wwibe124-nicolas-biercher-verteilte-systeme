from django.contrib.auth import get_user_model, password_validation
from django.db import IntegrityError
from rest_framework import serializers

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    username = serializers.CharField(
        write_only=True,
        max_length=30,
        required=True,
    )

    class Meta:
        model = User
        fields = ("id", "email", "password", "username")

    def validate_email(self, value: str):
        email = (value or "").strip().lower()
        if not email:
            raise serializers.ValidationError("E-Mail ist erforderlich.")
        return email

    def validate_username(self, value: str):
        username = (value or "").strip()
        if not username:
            raise serializers.ValidationError("Username ist erforderlich.")
        if " " in username:
            raise serializers.ValidationError("Username darf keine Leerzeichen enthalten.")
        if not username.isascii():
            raise serializers.ValidationError("Username darf nur ASCII-Zeichen enthalten.")
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("Dieser Username ist bereits vergeben.")
        return username

    def validate_password(self, value: str):
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        email = validated_data["email"]
        password = validated_data["password"]
        username = validated_data["username"]

        try:
            user = User.objects.create_user(
                email=email,
                password=password,
                username=username,
            )
        except IntegrityError as e:
            if "username" in str(e):
                raise serializers.ValidationError({"username": "Dieser Username ist bereits vergeben."})
            raise serializers.ValidationError({"email": "Es existiert bereits ein Konto mit dieser E-Mail."})

        return user



class MeSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    username = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=30,
    )

    class Meta:
        model  = User
        fields = ["id", "email", "username", "first_name", "last_name", "image", "image_url"]
        extra_kwargs = {
            "image": {"write_only": True, "required": False},
        }

    def validate_username(self, value: str):
        username = value.strip()
        if not username:
            raise serializers.ValidationError("Username darf nicht leer sein.")
        if " " in username:
            raise serializers.ValidationError("Username darf keine Leerzeichen enthalten.")
        if User.objects.filter(username__iexact=username).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("Dieser Username ist bereits vergeben.")
        return username

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get("request")
            url = obj.image.url
            return request.build_absolute_uri(url) if request else url
        return None

    def update(self, instance, validated_data):
        request = self.context.get("request")
        image = validated_data.pop("image", None)

        if not image and request is not None:
            file_from_request = request.FILES.get("image") or request.FILES.get("file")
            if file_from_request:
                image = file_from_request

        for attr, val in validated_data.items():
            setattr(instance, attr, val)

        if image is not None:
            instance.image = image

        instance.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        password_validation.validate_password(value)
        return value

from django.contrib.auth import get_user_model
from django.utils.text import slugify
from django.db.models import Count, Q
from rest_framework import serializers

from .models import Community, Membership, Post, PostImage, Comment

User = get_user_model()

class CommunitySerializer(serializers.ModelSerializer):
    members_count = serializers.IntegerField(read_only=True)
    posts_count = serializers.IntegerField(read_only=True)
    my_role = serializers.SerializerMethodField(read_only=True)
    banner_url = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    class Meta:
        model = Community
        fields = [
            "id",
            "slug",
            "name",
            "description",
            "visibility",
            "icon_url",
            "banner_url",
            "created_by",
            "created_at",
            "members_count",
            "posts_count",
            "my_role",
        ]
        read_only_fields = [
            "created_by",
            "created_at",
            "members_count",
            "posts_count",
            "my_role",
        ]

    def validate_slug(self, value):
        v = slugify(value or "")
        if not v:
            raise serializers.ValidationError("Slug ist erforderlich.")
        if len(v) > 50:
            raise serializers.ValidationError("Slug zu lang (max. 50).")
        return v

    def create(self, validated_data):
        user = self.context["request"].user
        validated_data["created_by"] = user
        comm = super().create(validated_data)
        Membership.objects.create(
            community=comm,
            user=user,
            role=Membership.Role.OWNER,
        )
        return comm

    def get_my_role(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        m = getattr(obj, "_my_membership", None)
        if m:
            return m.role
        membership = Membership.objects.filter(
            community=obj,
            user=request.user,
        ).only("role").first()
        return membership.role if membership else None

class MembershipSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source="user.username")
    email = serializers.ReadOnlyField(source="user.email")
    first_name = serializers.ReadOnlyField(source="user.first_name")
    last_name = serializers.ReadOnlyField(source="user.last_name")
    posts_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Membership
        fields = [
            "id",
            "community",
            "user",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "created_at",
            "posts_count",
        ]

class PostImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostImage
        fields = ["id", "image_url", "position"]

class PostSerializer(serializers.ModelSerializer):
    community_slug   = serializers.ReadOnlyField(source="community.slug")
    author_email     = serializers.ReadOnlyField(source="author.email")
    author_username  = serializers.ReadOnlyField(source="author.username")
    author_image_url = serializers.SerializerMethodField()
    score            = serializers.IntegerField(read_only=True)
    my_vote          = serializers.IntegerField(read_only=True)
    comment_count    = serializers.IntegerField(read_only=True)

    is_pinned = serializers.BooleanField(required=False)
    is_locked = serializers.BooleanField(required=False)

    images = PostImageSerializer(many=True, read_only=True)
    image_urls = serializers.ListField(
        child=serializers.CharField(max_length=500),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Post
        fields = [
            "id",
            "community",
            "community_slug",
            "author",
            "author_email",
            "author_username",
            "author_image_url", 
            "title",
            "body",
            "image_url",
            "images",
            "image_urls",
            "is_pinned",
            "is_locked",
            "score",
            "my_vote",
            "created_at",
            "updated_at",
            "comment_count",
        ]
        read_only_fields = [
            "author",
            "author_email",
            "author_username",
            "author_image_url", 
            "community_slug",
            "images",
            "score",
            "my_vote",
            "created_at",
            "updated_at",
            "comment_count",
        ]

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        community = (
            attrs.get("community")
            or getattr(self.instance, "community", None)
        )

        if request.method == "POST" and community:
            is_member = Membership.objects.filter(
                community=community,
                user=user,
                role__in=[
                    Membership.Role.MEMBER,
                    Membership.Role.MODERATOR,
                    Membership.Role.OWNER,
                ],
            ).exists()
            if not is_member:
                raise serializers.ValidationError(
                    {"community": "Du musst Mitglied der Community sein, um zu posten."}
                )

        wants_pin = "is_pinned" in attrs
        wants_lock = "is_locked" in attrs
        if (wants_pin or wants_lock) and community:
            is_mod_or_owner = Membership.objects.filter(
                community=community,
                user=user,
                role__in=[Membership.Role.MODERATOR, Membership.Role.OWNER],
            ).exists()
            if not is_mod_or_owner:
                raise serializers.ValidationError(
                    {"detail": "Nur Moderatoren oder Owner dürfen Beiträge anpinnen oder sperren."}
                )

        return attrs

    def create(self, validated_data):
        image_urls = validated_data.pop("image_urls", [])
        first_image = image_urls[0] if image_urls else None
        if first_image and "image_url" not in validated_data:
            validated_data["image_url"] = first_image

        post = super().create(validated_data)

        for idx, url in enumerate(image_urls, start=1):
            PostImage.objects.create(
                post=post,
                image_url=url,
                position=idx,
            )
        return post
    
    def get_author_image_url(self, obj):
        img = getattr(obj.author, "image", None)
        if not img:
            return None
        request = self.context.get("request")
        url = img.url
        return request.build_absolute_uri(url) if request else url


class CommentSerializer(serializers.ModelSerializer):
    author_email = serializers.ReadOnlyField(source="author.email")
    author_username = serializers.ReadOnlyField(source="author.username")
    author_image_url  = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id",
            "post",
            "parent",
            "author",
            "author_email",
            "author_username",
            "author_image_url", 
            "body",
            "is_deleted",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "author",
            "author_email",
            "author_username",
            "author_image_url", 
            "is_deleted",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        request = self.context["request"]
        post = attrs.get("post") or getattr(self.instance, "post", None)

        if not post:
            return attrs

        is_member = Membership.objects.filter(
            community=post.community,
            user=request.user,
            role__in=[
                Membership.Role.MEMBER,
                Membership.Role.MODERATOR,
                Membership.Role.OWNER,
            ],
        ).exists()
        if not is_member:
            raise serializers.ValidationError(
                {"post": "Du musst Mitglied der Community sein, um zu kommentieren."}
            )

        parent = attrs.get("parent")
        if parent and parent.post_id != post.id:
            raise serializers.ValidationError(
                {"parent": "Parent-Kommentar gehört zu einem anderen Post."}
            )

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["author"] = request.user
        return super().create(validated_data)
    
    def get_author_image_url(self, obj):
        img = getattr(obj.author, "image", None)
        if not img:
            return None
        request = self.context.get("request")
        url = img.url
        return request.build_absolute_uri(url) if request else url

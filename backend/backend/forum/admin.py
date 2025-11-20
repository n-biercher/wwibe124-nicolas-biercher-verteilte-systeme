# forum/admin.py

from django.contrib import admin
from django.db.models import Count, Q, Sum
from django.utils.html import format_html
from django.utils.text import Truncator

from .models import (
    Community,
    Membership,
    Post,
    PostImage,
    PostVote,
    Comment,
)


class MembershipInline(admin.TabularInline):
    model = Membership
    extra = 0
    autocomplete_fields = ["user"]
    readonly_fields = ["created_at"]
    ordering = ["-created_at"]


class PostImageInline(admin.TabularInline):
    model = PostImage
    extra = 0
    readonly_fields = []
    ordering = ["position", "id"]


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0
    fields = ["author", "body", "parent", "is_deleted", "created_at"]
    readonly_fields = ["author", "body", "parent", "created_at"]
    show_change_link = True
    ordering = ["-created_at"]
    autocomplete_fields = ["author", "parent"]



@admin.register(Community)
class CommunityAdmin(admin.ModelAdmin):
    list_display = (
        "slug",
        "name",
        "visibility",
        "created_by",
        "members_count_display",
        "posts_count_display",
        "created_at",
    )
    list_filter = ("visibility", "created_at")
    search_fields = ("slug", "name", "description", "created_by__username", "created_by__email")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "created_by")
    inlines = [MembershipInline]
    prepopulated_fields = {"slug": ("name",)}
    autocomplete_fields = ["created_by"]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.annotate(
            _members_count=Count(
                "memberships",
                filter=Q(
                    memberships__role__in=[
                        Membership.Role.MEMBER,
                        Membership.Role.MODERATOR,
                        Membership.Role.OWNER,
                    ]
                ),
                distinct=True,
            ),
            _posts_count=Count(
                "posts",
                filter=Q(posts__is_deleted=False),
                distinct=True,
            ),
        )

    @admin.display(description="Mitglieder", ordering="_members_count")
    def members_count_display(self, obj):
        return obj._members_count

    @admin.display(description="Beiträge", ordering="_posts_count")
    def posts_count_display(self, obj):
        return obj._posts_count


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "community",
        "user",
        "role",
        "created_at",
    )
    list_filter = ("role", "created_at", "community")
    search_fields = (
        "community__slug",
        "community__name",
        "user__username",
        "user__email",
        "user__first_name",
        "user__last_name",
    )
    autocomplete_fields = ["community", "user"]
    ordering = ("-created_at",)

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title_short",
        "community",
        "author",
        "score_display",
        "comment_count_display",
        "is_pinned",
        "is_locked",
        "is_deleted",
        "created_at",
    )
    list_filter = (
        "is_pinned",
        "is_locked",
        "is_deleted",
        "community",
        "created_at",
    )
    search_fields = (
        "title",
        "body",
        "community__slug",
        "community__name",
        "author__username",
        "author__email",
    )
    readonly_fields = ("created_at", "updated_at")
    autocomplete_fields = ["community", "author"]
    inlines = [PostImageInline, CommentInline]
    date_hierarchy = "created_at"
    ordering = ("-created_at",)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.annotate(
            _score=Sum("votes__value"),
            _comment_count=Count(
                "comments",
                filter=Q(comments__is_deleted=False),
                distinct=True,
            ),
        )

    @admin.display(description="Titel")
    def title_short(self, obj):
        return Truncator(obj.title).chars(60)

    @admin.display(description="Score", ordering="_score")
    def score_display(self, obj):
        return obj._score or 0

    @admin.display(description="Kommentare", ordering="_comment_count")
    def comment_count_display(self, obj):
        return obj._comment_count or 0

@admin.register(PostImage)
class PostImageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "post",
        "position",
        "image_preview",
    )
    list_filter = ("position", "post__community")
    search_fields = ("post__title", "image_url")
    autocomplete_fields = ["post"]
    ordering = ("post", "position", "id")

    @admin.display(description="Vorschau")
    def image_preview(self, obj):
        if not obj.image_url:
            return "-"
        return format_html(
            '<img src="{}" style="max-height: 60px; max-width: 120px; object-fit: cover;" />',
            obj.image_url,
        )

@admin.register(PostVote)
class PostVoteAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "post",
        "user",
        "value",
        "created_at",
        "updated_at",
    )
    list_filter = ("value", "created_at", "post__community")
    search_fields = (
        "post__title",
        "post__community__slug",
        "user__username",
        "user__email",
    )
    autocomplete_fields = ["post", "user"]
    ordering = ("-created_at",)


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "post",
        "community_slug",
        "author",
        "body_short",
        "parent",
        "is_deleted",
        "created_at",
    )
    list_filter = (
        "is_deleted",
        "post__community",
        "created_at",
    )
    search_fields = (
        "body",
        "post__title",
        "post__community__slug",
        "author__username",
        "author__email",
    )
    autocomplete_fields = ["post", "author", "parent"]
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "created_at"
    ordering = ("-created_at",)

    @admin.display(description="Community")
    def community_slug(self, obj):
        return obj.post.community.slug if obj.post and obj.post.community else "-"

    @admin.display(description="Text")
    def body_short(self, obj):
        return Truncator(obj.body).chars(80)

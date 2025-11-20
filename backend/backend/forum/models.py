from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Community(models.Model):
    class Visibility(models.TextChoices):
        PUBLIC = "public", "Public"
        RESTRICTED = "restricted", "Restricted"

    slug = models.SlugField(unique=True, max_length=50)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    visibility = models.CharField(
        max_length=12,
        choices=Visibility.choices,
        default=Visibility.PUBLIC,
    )
    icon_url = models.URLField(blank=True)
    banner_url = models.URLField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="communities_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["visibility"]),
            models.Index(fields=["created_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.slug} – {self.name}"

    def clean_slug(self):
        if self.slug:
            self.slug = slugify(self.slug)


class Membership(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        MODERATOR = "moderator", "Moderator"
        MEMBER = "member", "Member"
        PENDING = "pending", "Pending"
    community = models.ForeignKey(
        Community, on_delete=models.CASCADE, related_name="memberships"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships"
    )
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.MEMBER)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("community", "user")]
        indexes = [models.Index(fields=["community", "role"])]

    def __str__(self):
        return f"{self.user} in {self.community} as {self.role}"


class Post(models.Model):
    community = models.ForeignKey(
        "forum.Community",
        on_delete=models.CASCADE,
        related_name="posts",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="posts",
    )
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    image_url = models.URLField(blank=True)

    is_pinned = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)

    is_deleted = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["community", "created_at"]),
            models.Index(fields=["author", "created_at"]),
            models.Index(fields=["is_deleted"]),
            models.Index(fields=["is_pinned"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.community.slug}] {self.title[:50]}"

class PostImage(models.Model):
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name="images",
    )
    image_url = models.URLField()
    position = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["position", "id"]

    def __str__(self):
        return f"Image {self.position} for post {self.post_id}"


class PostVote(models.Model):
    class Value(models.IntegerChoices):
        DOWN = -1, "Down"
        UP = 1, "Up"

    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="votes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="post_votes")
    value = models.SmallIntegerField(choices=Value.choices)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("post", "user")]
        indexes = [
            models.Index(fields=["post"]),
            models.Index(fields=["user"]),
            models.Index(fields=["post", "user"]),
        ]

    def __str__(self):
        return f"{self.user_id} -> {self.post_id} ({self.value})"
    
class Comment(models.Model):
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    body = models.TextField()
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="replies",
    )

    is_deleted = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["post", "created_at"]),
            models.Index(fields=["author", "created_at"]),
            models.Index(fields=["post", "parent", "created_at"]),
        ]
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment {self.id} on post {self.post_id}"
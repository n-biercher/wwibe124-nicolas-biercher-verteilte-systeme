from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import Membership, Community, Post, Comment


class IsOwner(BasePermission):
    """Nur Community-Owner dürfen die Community löschen/administrieren (harte Aktionen)."""

    def has_object_permission(self, request, view, obj: Community):
        if request.method in SAFE_METHODS:
            return True
        if not request.user.is_authenticated:
            return False
        return Membership.objects.filter(
            community=obj, user=request.user, role=Membership.Role.OWNER
        ).exists()


class IsModOrOwnerForCommunity(BasePermission):
    """Für Moderation & Regeln bearbeiten."""

    def has_object_permission(self, request, view, obj: Community):
        if request.method in SAFE_METHODS:
            return True
        if not request.user.is_authenticated:
            return False
        return Membership.objects.filter(
            community=obj,
            user=request.user,
            role__in=[Membership.Role.MODERATOR, Membership.Role.OWNER],
        ).exists()

class IsAuthorOrModOrOwner(BasePermission):
    """
    - SAFE_METHODS: lesen erlaubt
    - sonst: Erlaubt, wenn Post-Autor ODER (in der Community Mod/Owner)
    """

    def has_object_permission(self, request, view, obj: Post):
        if request.method in SAFE_METHODS:
            return True
        if not request.user.is_authenticated:
            return False
        if obj.author_id == request.user.id:
            return True
        return Membership.objects.filter(
            community=obj.community,
            user=request.user,
            role__in=[Membership.Role.MODERATOR, Membership.Role.OWNER],
        ).exists()

class IsCommentAuthorOrModOrOwner(BasePermission):
    """
    - SAFE_METHODS: lesen erlaubt
    - sonst: Autor oder Mod/Owner der Community
    """

    def has_object_permission(self, request, view, obj: Comment):
        if request.method in SAFE_METHODS:
            return True
        if not request.user.is_authenticated:
            return False
        if obj.author_id == request.user.id:
            return True
        return Membership.objects.filter(
            community=obj.post.community,
            user=request.user,
            role__in=[Membership.Role.MODERATOR, Membership.Role.OWNER],
        ).exists()

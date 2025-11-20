from django.db import models
from rest_framework import generics
from django.db.models import Count, Q, Subquery, Sum, OuterRef, IntegerField, Value as V
from django.db.models.functions import Coalesce
from rest_framework import viewsets, permissions, decorators, response, status, filters
from rest_framework.exceptions import PermissionDenied, ValidationError
import os
import uuid
from django.core.files.storage import default_storage
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import permissions
from django.shortcuts import get_object_or_404

from .models import Community, Membership, Post, PostVote, PostImage, Comment
from .serializers import (
    CommunitySerializer,
    MembershipSerializer,
    PostSerializer,
    CommentSerializer
)
from .permissions import IsOwner, IsModOrOwnerForCommunity, IsAuthorOrModOrOwner, IsCommentAuthorOrModOrOwner


class CommunityViewSet(viewsets.ModelViewSet):
    """
    Directory + CRUD.
    """
    serializer_class = CommunitySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["slug", "name", "description"]
    ordering_fields = ["created_at", "members_count", "name"]
    ordering = ["-created_at"]

    lookup_field = "slug"
    lookup_url_kwarg = "slug"

    def get_queryset(self):
        qs = Community.objects.all().annotate(
            members_count=Count(
                "memberships",
                filter=Q(memberships__role__in=[
                    Membership.Role.MEMBER,
                    Membership.Role.MODERATOR,
                    Membership.Role.OWNER
                ]),
                distinct=True,
            ),
            posts_count=Count(
                "posts",
                filter=Q(posts__is_deleted=False),
                distinct=True,
            ),
        )
        return qs


    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        my_map = {}
        if request.user.is_authenticated:
            for m in Membership.objects.filter(user=request.user, community__in=qs):
                my_map[m.community_id] = m
        for c in qs:
            setattr(c, "_my_membership", my_map.get(c.id))
        page = self.paginate_queryset(qs)
        if page is not None:
            for c in page:
                setattr(c, "_my_membership", my_map.get(c.id))
            ser = self.get_serializer(page, many=True)
            return self.get_paginated_response(ser.data)
        ser = self.get_serializer(qs, many=True)
        return response.Response(ser.data)

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        if request.user.is_authenticated:
            m = Membership.objects.filter(community=obj, user=request.user).first()
            setattr(obj, "_my_membership", m)
        return super().retrieve(request, *args, **kwargs)

    def perform_create(self, serializer):
        if not self.request.user.is_authenticated:
            raise PermissionDenied("Login erforderlich.")
        serializer.save()

    

    def get_permissions(self):
        if self.action in ["update", "partial_update", "destroy",
                           "members_promote", "members_demote", "members_remove"]:
            return [IsOwner()]
        if self.action in ["members_approve", "members_decline"]:
            return [IsModOrOwnerForCommunity()]
        return super().get_permissions()

    @decorators.action(detail=True, methods=["post"], permission_classes=[IsOwner])
    def members_promote(self, request, slug=None):
        """
        Owner kann ein Mitglied zum Moderator befördern.
        Erwartet: {"membership_id": <id>}
        """
        membership_id = request.data.get("membership_id")
        if not membership_id:
            return response.Response(
                {"detail": "membership_id erforderlich."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        community = self.get_object()

        try:
            m = Membership.objects.select_related("user", "community").get(
                pk=membership_id, community=community
            )
        except Membership.DoesNotExist:
            return response.Response(
                {"detail": "Mitgliedschaft nicht gefunden."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if m.role == Membership.Role.OWNER:
            return response.Response(
                {"detail": "Owner-Rolle kann nicht verändert werden."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        m.role = Membership.Role.MODERATOR
        m.save(update_fields=["role"])

        ser = MembershipSerializer(m)
        return response.Response(ser.data, status=status.HTTP_200_OK)

    @decorators.action(detail=True, methods=["post"], permission_classes=[IsOwner])
    def members_demote(self, request, slug=None):
        """
        Owner kann einen Moderator wieder zum normalen Member machen.
        Erwartet: {"membership_id": <id>}
        """
        membership_id = request.data.get("membership_id")
        if not membership_id:
            return response.Response(
                {"detail": "membership_id erforderlich."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        community = self.get_object()

        try:
            m = Membership.objects.select_related("user", "community").get(
                pk=membership_id, community=community
            )
        except Membership.DoesNotExist:
            return response.Response(
                {"detail": "Mitgliedschaft nicht gefunden."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if m.role != Membership.Role.MODERATOR:
            return response.Response(
                {"detail": "Nur Moderatoren können zu Membern zurückgestuft werden."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        m.role = Membership.Role.MEMBER
        m.save(update_fields=["role"])

        ser = MembershipSerializer(m)
        return response.Response(ser.data, status=status.HTTP_200_OK)

    @decorators.action(detail=True, methods=["post"], permission_classes=[IsOwner])
    def members_remove(self, request, slug=None):
        """
        Owner kann ein Mitglied aus der Community entfernen.
        Erwartet: {"membership_id": <id>}
        """
        membership_id = request.data.get("membership_id")
        if not membership_id:
            return response.Response(
                {"detail": "membership_id erforderlich."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        community = self.get_object()

        try:
            m = Membership.objects.select_related("user", "community").get(
                pk=membership_id, community=community
            )
        except Membership.DoesNotExist:
            return response.Response(
                {"detail": "Mitgliedschaft nicht gefunden."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if m.role == Membership.Role.OWNER:
            owners = Membership.objects.filter(
                community=community, role=Membership.Role.OWNER
            ).count()
            if owners <= 1:
                return response.Response(
                    {"detail": "Letzter Owner kann nicht entfernt werden."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        m.delete()
        return response.Response(status=status.HTTP_204_NO_CONTENT)

    
    @decorators.action(
        detail=True,
        methods=["get"],
        permission_classes=[permissions.IsAuthenticated])
    def members_pending(self, request, slug=None):
        community = self.get_object()

        qs = (
            Membership.objects
            .filter(community=community, role=Membership.Role.PENDING)
            .select_related("user")
            .annotate(
                posts_count=Count(
                    "user__posts",
                    filter=Q(
                        user__posts__community=community,
                        user__posts__is_deleted=False,
                    ),
                    distinct=True,
                ),
            )
            .order_by("user__username")
        )

        page = self.paginate_queryset(qs)
        if page is not None:
            ser = MembershipSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(ser.data)

        ser = MembershipSerializer(qs, many=True, context={"request": request})
        return response.Response(ser.data)
    

    @decorators.action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated])
    def members_approve(self, request, slug=None):
        community = self.get_object()
        membership_id = request.data.get("membership_id")

        if not membership_id:
            return response.Response(
                {"detail": "membership_id ist erforderlich."},
                status=400,
            )

        try:
            m = Membership.objects.get(
                pk=membership_id,
                community=community,
                role=Membership.Role.PENDING,
            )
        except Membership.DoesNotExist:
            return response.Response(
                {"detail": "Pending-Mitgliedschaft nicht gefunden."},
                status=404,
            )

        m.role = Membership.Role.MEMBER
        m.save(update_fields=["role"])

        ser = MembershipSerializer(m, context={"request": request})
        return response.Response(ser.data, status=200)
    

    @decorators.action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated])
    def members_decline(self, request, slug=None):
        community = self.get_object()
        membership_id = request.data.get("membership_id")

        if not membership_id:
            return response.Response(
                {"detail": "membership_id ist erforderlich."},
                status=400,
            )

        try:
            m = Membership.objects.get(
                pk=membership_id,
                community=community,
                role=Membership.Role.PENDING,
            )
        except Membership.DoesNotExist:
            return response.Response(
                {"detail": "Pending-Mitgliedschaft nicht gefunden."},
                status=404,
            )

        m.delete()
        return response.Response(status=204)

    @decorators.action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def join(self, request, slug=None):
        community = self.get_object()
        user = request.user
        m, created = Membership.objects.get_or_create(community=community, user=user)
        if not created:
            if m.role == Membership.Role.PENDING:
                return response.Response({"detail": "Anfrage bereits gestellt."}, status=200)
            return response.Response({"detail": "Bereits Mitglied."}, status=409)
        m.role = (Membership.Role.MEMBER
                  if community.visibility == Community.Visibility.PUBLIC
                  else Membership.Role.PENDING)
        m.save(update_fields=["role"])
        return response.Response(MembershipSerializer(m).data, status=201)

    @decorators.action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def leave(self, request, slug=None):
        community = self.get_object()
        user = request.user
        try:
            m = Membership.objects.get(community=community, user=user)
        except Membership.DoesNotExist:
            return response.Response({"detail": "Nicht Mitglied."}, status=404)
        if m.role == Membership.Role.OWNER:
            owners = Membership.objects.filter(
                community=community, role=Membership.Role.OWNER
            ).count()
            if owners <= 1:
                return response.Response(
                    {"detail": "Letzter Owner kann nicht verlassen. Übertrage Ownership."},
                    status=400,
                )
        m.delete()
        return response.Response(status=204)

    @decorators.action(
        detail=True,
        methods=["get"],
        permission_classes=[permissions.IsAuthenticated])
    def members(self, request, slug=None):
        community = self.get_object()

        is_ok = Membership.objects.filter(
            community=community,
            user=request.user,
            role__in=[Membership.Role.MODERATOR, Membership.Role.OWNER],
        ).exists()
        if not is_ok:
            raise PermissionDenied("Moderator- oder Owner-Rechte erforderlich.")

        qs = (
            Membership.objects
            .filter(community=community)
            .select_related("user")
            .annotate(
                posts_count=Count(
                    "user__posts",
                    filter=Q(
                        user__posts__community=community,
                        user__posts__is_deleted=False,
                    ),
                    distinct=True,
                )
            )
            .order_by("user__username")
        )

        page = self.paginate_queryset(qs)
        if page is not None:
            ser = MembershipSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(ser.data)

        ser = MembershipSerializer(qs, many=True, context={"request": request})
        return response.Response(ser.data)


    @decorators.action(
        detail=True,
        methods=["get", "post"],
        url_path="posts",
        permission_classes=[permissions.IsAuthenticatedOrReadOnly])
    def posts(self, request, slug=None):
        community = self.get_object()

        if request.method.lower() == "get":
            vote_score_sub = (
                PostVote.objects
                .filter(post=OuterRef("pk"))
                .values("post")              
                .annotate(s=Coalesce(Sum("value"), V(0)))
                .values("s")[:1]
            )

            qs = (
                Post.objects
                .select_related("community", "author")
                .filter(
                    is_deleted=False,
                    community=community,
                )
                .annotate(
                    score=Coalesce(
                        Subquery(vote_score_sub, output_field=IntegerField()),
                        V(0),
                    ),
                    comment_count=Count(
                        "comments",
                        filter=Q(comments__is_deleted=False),
                        distinct=True,
                    ),
                )
            )

            if request.user.is_authenticated:
                sub = PostVote.objects.filter(
                    post=OuterRef("pk"),
                    user=request.user,
                ).values("value")[:1]
                qs = qs.annotate(
                    my_vote=Coalesce(
                        Subquery(sub, output_field=IntegerField()),
                        V(0),
                    )
                )
            else:
                qs = qs.annotate(
                    my_vote=V(0, output_field=IntegerField())
                )

            ordering = request.query_params.get("ordering") or "-created_at"
            if ordering.lstrip("-") in ["created_at", "score"]:
                qs = qs.order_by("-is_pinned", ordering)
            else:
                qs = qs.order_by("-is_pinned", "-created_at")

            page = self.paginate_queryset(qs)
            if page is not None:
                ser = PostSerializer(page, many=True, context={"request": request})
                return self.get_paginated_response(ser.data)

            ser = PostSerializer(qs, many=True, context={"request": request})
            return response.Response(ser.data)

        data = request.data.copy()
        data["community"] = community.pk
        ser = PostSerializer(data=data, context={"request": request})
        ser.is_valid(raise_exception=True)
        ser.save(author=request.user)
        return response.Response(ser.data, status=status.HTTP_201_CREATED)
    

class ManagedCommunityListView(generics.ListAPIView):
    """
    Gibt alle Communities zurück, in denen der aktuelle User
    Owner oder Moderator ist.
    """
    serializer_class = CommunitySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["slug", "name", "description"]
    ordering_fields = ["created_at", "members_count", "name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user

        qs = Community.objects.annotate(
            members_count=Count(
                "memberships",
                filter=Q(memberships__role__in=[
                    Membership.Role.MEMBER,
                    Membership.Role.MODERATOR,
                    Membership.Role.OWNER,
                ]),
                distinct=True,
            ),
            posts_count=Count(
                "posts",
                filter=Q(posts__is_deleted=False),
                distinct=True,
            ),
        ).filter(
            memberships__user=user,
            memberships__role__in=[
                Membership.Role.OWNER,
                Membership.Role.MODERATOR,
            ],
        ).distinct()

        return qs


class MembershipViewSet(viewsets.ReadOnlyModelViewSet):
    """Optional: Übersicht mit ?community=<id>"""
    serializer_class = MembershipSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Membership.objects.select_related("community", "user")
        community_id = self.request.query_params.get("community")
        if community_id:
            qs = qs.filter(community_id=community_id)
        return qs


class PostViewSet(viewsets.ModelViewSet):
    """
    CRUD für Posts. Lesen öffentlich.
    Erstellen: nur Mitglieder (Membership check in Serializer.validate)
    Update/Delete: Autor oder Mod/Owner.
    Extras:
      - Filter: ?community=<id> | ?community_slug=<slug>
      - Ordering: created_at, score
      - POST /posts/{id}/vote/  body: {"value": 1|-1|0}
      - POST /posts/{id}/restore/  (soft-deleted rückgängig)
    """
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrModOrOwner]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    ordering_fields = ["created_at", "score"]
    search_fields = ["title", "body"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user

        vote_score_sub = (
            PostVote.objects
            .filter(post=OuterRef("pk"))
            .values("post")
            .annotate(s=Coalesce(Sum("value"), V(0)))
            .values("s")[:1]
        )

        qs = (
            Post.objects
            .select_related("community", "author")
            .filter(is_deleted=False)
            .annotate(
                score=Coalesce(
                    Subquery(vote_score_sub, output_field=IntegerField()),
                    V(0),
                ),
                comment_count=Count(
                    "comments",
                    filter=Q(comments__is_deleted=False),
                    distinct=True,
                ),
            )
        )

        if user.is_authenticated:
            sub = PostVote.objects.filter(
                post=OuterRef("pk"),
                user=user,
            ).values("value")[:1]
            qs = qs.annotate(
                my_vote=Coalesce(
                    Subquery(sub, output_field=IntegerField()),
                    V(0),
                )
            )
        else:
            qs = qs.annotate(
                my_vote=V(0, output_field=IntegerField())
            )

        cid = self.request.query_params.get("community")
        cslug = self.request.query_params.get("community_slug")
        if cid:
            qs = qs.filter(community_id=cid)
        if cslug:
            qs = qs.filter(community__slug=cslug)

        ordering = self.request.query_params.get("ordering") or "-created_at"
        if ordering.lstrip("-") in ["created_at", "score"]:
            qs = qs.order_by("-is_pinned", ordering)
        else:
            qs = qs.order_by("-is_pinned", "-created_at")

        return qs
    def perform_create(self, serializer):
        if not self.request.user.is_authenticated:
            raise PermissionDenied("Login erforderlich.")
        serializer.save(author=self.request.user)

    def destroy(self, request, *args, **kwargs):
        post = self.get_object()
        post.is_deleted = True
        post.save(update_fields=["is_deleted"])
        return response.Response(status=204)

    @decorators.action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def restore(self, request, pk=None):
        post = Post.objects.filter(pk=pk).first()
        if not post:
            return response.Response(status=404)
        if not (
            post.author_id == request.user.id or
            Membership.objects.filter(
                community=post.community,
                user=request.user,
                role__in=[Membership.Role.MODERATOR, Membership.Role.OWNER],
            ).exists()
        ):
            raise PermissionDenied("Keine Rechte zum Wiederherstellen.")
        post.is_deleted = False
        post.save(update_fields=["is_deleted"])
        ser = self.get_serializer(self.get_queryset().filter(pk=pk).first())
        return response.Response(ser.data, status=200)
    
    @decorators.action(
        detail=True,
        methods=["get", "post"],
        url_path="comments",
        permission_classes=[permissions.IsAuthenticatedOrReadOnly])
    def comments(self, request, pk=None):
        post = self.get_object()

        if request.method.lower() == "get":
            qs = Comment.objects.select_related("author").filter(
                post=post,
                is_deleted=False,
            ).order_by("created_at")

            parent_id = request.query_params.get("parent")
            if parent_id is not None:
                if parent_id in ["", "null", "None"]:
                    qs = qs.filter(parent__isnull=True)
                else:
                    qs = qs.filter(parent_id=parent_id)

            page = self.paginate_queryset(qs)
            if page is not None:
                ser = CommentSerializer(page, many=True, context={"request": request})
                return self.get_paginated_response(ser.data)

            ser = CommentSerializer(qs, many=True, context={"request": request})
            return response.Response(ser.data)
        data = request.data.copy()
        data["post"] = post.pk
        ser = CommentSerializer(data=data, context={"request": request})
        ser.is_valid(raise_exception=True)
        ser.save()
        return response.Response(ser.data, status=status.HTTP_201_CREATED)

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_community_image(request):
    """
    Nimmt eine Bilddatei entgegen, speichert sie unter MEDIA_ROOT
    und gibt die absolute URL zurück.
    """
    file = request.FILES.get("file")
    if not file:
        return Response({"detail": "Keine Datei hochgeladen."}, status=400)

    if not file.content_type.startswith("image/"):
        return Response({"detail": "Nur Bilddateien sind erlaubt."}, status=400)

    ext = os.path.splitext(file.name)[1]
    filename = f"community_banners/{uuid.uuid4().hex}{ext}"

    saved_path = default_storage.save(filename, file)
    relative_url = default_storage.url(saved_path) 

    absolute_url = request.build_absolute_uri(relative_url)

    return Response({"url": absolute_url}, status=201)

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_post_images(request):
    """
    Nimmt mehrere Bilddateien (Feldname 'files') entgegen,
    speichert sie und gibt eine Liste von URLs zurück.
    """
    files = request.FILES.getlist("files")
    if not files:
        return Response({"detail": "Keine Dateien hochgeladen."}, status=400)

    urls = []
    for file in files:
        if not file.content_type.startswith("image/"):
            return Response({"detail": "Nur Bilddateien sind erlaubt."}, status=400)

        ext = os.path.splitext(file.name)[1]
        filename = f"post_images/{uuid.uuid4().hex}{ext}"

        saved_path = default_storage.save(filename, file)
        relative_url = default_storage.url(saved_path)
        absolute_url = request.build_absolute_uri(relative_url)
        urls.append(absolute_url)

    return Response({"urls": urls}, status=201)

class CommentViewSet(viewsets.ModelViewSet):
    """
    CRUD für Kommentare.
    Lesen öffentlich.
    Erstellen: nur Mitglieder (Membership check im Serializer).
    Update/Delete: Autor oder Mod/Owner.
    Filter:
      - ?post=<id>
      - ?post_slug=<slug>
      - ?parent=<id> (für Threading/Top-Level)
    """
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsCommentAuthorOrModOrOwner]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at"]
    ordering = ["created_at"]

    def get_queryset(self):
        qs = Comment.objects.select_related("post", "author", "post__community").filter(
            is_deleted=False
        )
        post_id = self.request.query_params.get("post")
        post_slug = self.request.query_params.get("post_slug")
        parent_id = self.request.query_params.get("parent")

        if post_id:
            qs = qs.filter(post_id=post_id)
        if post_slug:
            qs = qs.filter(post__community__slug=post_slug)
        if parent_id is not None:
            if parent_id in ["", "null", "None"]:
                qs = qs.filter(parent__isnull=True)
            else:
                qs = qs.filter(parent_id=parent_id)

        return qs

    def perform_create(self, serializer):
        if not self.request.user.is_authenticated:
            raise PermissionDenied("Login erforderlich.")
        serializer.save() 

    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        comment.is_deleted = True
        comment.save(update_fields=["is_deleted"])
        return response.Response(status=204)

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def post_vote(request, pk: int):
    post = get_object_or_404(Post, pk=pk)
    try:
        value = int(request.data.get("value", 0))
    except (TypeError, ValueError):
        return Response(
            {"detail": "Ungültiger Vote-Wert."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if value not in (-1, 0, 1):
        return Response(
            {"detail": "Vote-Wert muss -1, 0 oder 1 sein."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    existing = PostVote.objects.filter(post=post, user=request.user).first()

    if value == 0:
        if existing:
            existing.delete()
        my_vote = 0
    else:
        if existing:
            if existing.value == value:
                existing.delete()
                my_vote = 0
            else:
                existing.value = value
                existing.save(update_fields=["value"])
                my_vote = value
        else:
            PostVote.objects.create(post=post, user=request.user, value=value)
            my_vote = value

    agg = PostVote.objects.filter(post=post).aggregate(
        score=Coalesce(models.Sum("value"), 0),
    )
    score = agg["score"] or 0

    return Response(
        {
            "id": post.id,
            "score": score,
            "my_vote": my_vote,
        },
        status=status.HTTP_200_OK,
    )
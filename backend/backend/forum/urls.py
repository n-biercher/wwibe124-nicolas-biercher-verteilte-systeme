from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CommunityViewSet, MembershipViewSet, PostViewSet, ManagedCommunityListView, upload_community_image, upload_post_images, CommentViewSet, post_vote

router = DefaultRouter()
router.register(r"communities", CommunityViewSet, basename="community")
router.register(r"memberships", MembershipViewSet, basename="membership")
router.register(r"posts", PostViewSet, basename="post")
router.register(r"comments", CommentViewSet, basename="comment") 

urlpatterns = [
    path("communities/manage/", ManagedCommunityListView.as_view(), name="community-managed"),
    path("upload_post_images/", upload_post_images, name="upload_post_images"),
    path("uploads/community-image/", upload_community_image, name="upload-community-image"),
    path("posts/<int:pk>/vote/", post_vote, name="post-vote"),
    path("", include(router.urls))
    ]

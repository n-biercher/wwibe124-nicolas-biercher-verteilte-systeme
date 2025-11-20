import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from forum.models import Community, Membership, Post, PostImage, PostVote, Comment


class Command(BaseCommand):
    help = (
        "Bereinigt Demo-Daten und seedet eine große Menge Demo-Daten "
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help=(
                "Ignoriert vorhandene Communities und setzt die Demo-Daten "
                "trotzdem zurück (Vorsicht: löscht bestehende Demo-Daten)."
            ),
        )

    def handle(self, *args, **options):
        force = options["force"]
        self.stdout.write(self.style.WARNING("Starte Demo-DB-Reset + Seed …"))
        seed_demo_data(self.stdout, force=force)
        self.stdout.write(self.style.SUCCESS("Seed erfolgreich abgeschlossen."))


def seed_demo_data(stdout, force: bool = True):
    User = get_user_model()

    NUM_USERS = 150
    NUM_COMMUNITIES = 80
    POSTS_PER_COMMUNITY_MIN = 30
    POSTS_PER_COMMUNITY_MAX = 80
    COMMENTS_PER_POST_MIN = 10
    COMMENTS_PER_POST_MAX = 40

    DEFAULT_PASSWORD = "Test1234!!"

    now = timezone.now()
    random.seed(42)

    existing_communities = Community.objects.count()
    if existing_communities > 0 and not force:
        return

    with transaction.atomic():
        stdout.write("Lösche sicherheitshalber alle Daten")

        PostVote.objects.all().delete()
        Comment.objects.all().delete()
        PostImage.objects.all().delete()
        Post.objects.all().delete()
        Membership.objects.all().delete()
        Community.objects.all().delete()

        demo_users = User.objects.filter(
            email__endswith="@example.com",
            is_staff=False,
            is_superuser=False,
        )
        deleted_users_count = demo_users.count()
        demo_users.delete()

        stdout.write("Prüfe auf Superuser …")

        if not User.objects.filter(is_superuser=True).exists():
            stdout.write("Kein Superuser gefunden – erstelle default Superuser …")
            User.objects.create_superuser(
                email="admin@example.com",
                password="Test1234!!",
                username="admin"
            )
            stdout.write("Superuser admin@example.com erstellt (PW: Test1234!!)")
        else:
            stdout.write("Superuser existiert bereits – wird nicht überschrieben.")

        stdout.write(f"Alte User gelöscht: {deleted_users_count}")

        stdout.write("Erzeuge Benutzer …")

        users = []
        for i in range(1, NUM_USERS + 1):
            email = f"user{i:03d}@example.com"
            username = f"user{i:03d}"

            users.append(
                User(
                    email=email,
                    username=username,
                    is_active=True,
                )
            )

        User.objects.bulk_create(users)
        users = list(User.objects.filter(email__endswith="@example.com").order_by("id"))
        user_by_id = {u.id: u for u in users}

        stdout.write("Setze Passwort für alle Demo-Benutzer …")
        for u in users:
            u.set_password(DEFAULT_PASSWORD)
        User.objects.bulk_update(users, ["password"])

        stdout.write("Erzeuge Communities …")

        communities = []
        for i in range(1, NUM_COMMUNITIES + 1):
            owner = random.choice(users)
            visibility = random.choice(
                [Community.Visibility.PUBLIC, Community.Visibility.RESTRICTED]
            )

            communities.append(
                Community(
                    slug=f"community{i:03d}",
                    name=f"Community {i:03d}",
                    description=(
                        f"Dies ist eine automatisch generierte Demo-Community Nummer {i}. "
                    ),
                    visibility=visibility,
                    icon_url=f"https://picsum.photos/seed/icon-{i}/64/64",
                    banner_url=f"https://picsum.photos/seed/banner-{i}/1200/300",
                    created_by=owner,
                    created_at=now - timedelta(days=random.randint(0, 365)),
                )
            )

        Community.objects.bulk_create(communities)
        communities = list(Community.objects.all().order_by("id"))

        stdout.write("Erzeuge Memberships …")

        memberships = []
        for c in communities:
            role_by_user_id: dict[int, str] = {}

            owner = c.created_by
            role_by_user_id[owner.id] = Membership.Role.OWNER

            available_for_mods = [u for u in users if u.id != owner.id]
            if available_for_mods:
                num_mods = random.randint(1, min(4, len(available_for_mods)))
                moderators = random.sample(available_for_mods, k=num_mods)
                for m in moderators:
                    # Owner bleibt Owner, sonst Moderator
                    if role_by_user_id.get(m.id) != Membership.Role.OWNER:
                        role_by_user_id[m.id] = Membership.Role.MODERATOR

            available_for_members = [u for u in users if u.id not in role_by_user_id]
            if available_for_members:
                num_members = random.randint(
                    15, min(60, len(available_for_members))
                )
                members = random.sample(available_for_members, k=num_members)
                for m in members:
                    if m.id not in role_by_user_id:
                        role_by_user_id[m.id] = Membership.Role.MEMBER

            for user_id, role in role_by_user_id.items():
                memberships.append(
                    Membership(
                        community=c,
                        user=user_by_id[user_id],
                        role=role,
                    )
                )

        Membership.objects.bulk_create(memberships)

        stdout.write("Erzeuge Posts …")

        posts_to_create = []
        for c in communities:
            comm_members = [m.user for m in c.memberships.all()]
            if not comm_members:
                comm_members = users

            num_posts = random.randint(
                POSTS_PER_COMMUNITY_MIN, POSTS_PER_COMMUNITY_MAX
            )

            for _ in range(num_posts):
                author = random.choice(comm_members)
                created = c.created_at + timedelta(
                    days=random.randint(0, 365),
                    minutes=random.randint(0, 60 * 24),
                )

                posts_to_create.append(
                    Post(
                        community=c,
                        author=author,
                        title=f"Beitrag {_}",
                        body=(
                            f"Dies ist ein automatisch generierter Demo-Post von {author.username} "
                            f"in der Community {c.slug}. "
                            f"Ist wirklich nur zum Testen da."
                        ),
                        image_url="",
                        is_pinned=random.random() < 0.05,
                        is_locked=random.random() < 0.05,
                        is_deleted=False,
                        created_at=created,
                        updated_at=created,
                    )
                )

        Post.objects.bulk_create(posts_to_create)
        posts = list(Post.objects.all())

        stdout.write("Erzeuge Post-Bilder …")

        post_images = []
        for post in posts:
            num_images = random.choice([0, 0, 1, 1, 2])
            for pos in range(1, num_images + 1):
                post_images.append(
                    PostImage(
                        post=post,
                        image_url=f"https://picsum.photos/seed/post-{post.id}-{pos}/800/400",
                        position=pos,
                    )
                )

        if post_images:
            PostImage.objects.bulk_create(post_images)

        stdout.write("Erzeuge Kommentare …")

        comments_to_create = []
        for post in posts:
            comm_members = [m.user for m in post.community.memberships.all()]
            if not comm_members:
                comm_members = users

            num_comments = random.randint(
                COMMENTS_PER_POST_MIN, COMMENTS_PER_POST_MAX
            )

            for _ in range(num_comments):
                author = random.choice(comm_members)
                created = post.created_at + timedelta(
                    minutes=random.randint(1, 60 * 7)
                )

                comments_to_create.append(
                    Comment(
                        post=post,
                        author=author,
                        body=(
                            f"Kommentar {_}, "
                            f"das ist ein automatisch generierter Kommentar."
                        ),
                        parent=None,
                        is_deleted=False,
                        created_at=created,
                        updated_at=created,
                    )
                )

        Comment.objects.bulk_create(comments_to_create)

        stdout.write("Erzeuge Votes …")

        votes_to_create = []
        for post in posts:
            voters = random.sample(
                users, k=random.randint(15, min(60, len(users)))
            )
            for v in voters:
                value = random.choice(
                    [PostVote.Value.UP, PostVote.Value.UP]
                )
                votes_to_create.append(
                    PostVote(
                        post=post,
                        user=v,
                        value=value,
                    )
                )

        PostVote.objects.bulk_create(votes_to_create, ignore_conflicts=True)

        stdout.write(
        "Seed abgeschlossen:\n"
        f"- {User.objects.filter(email__endswith='@example.com').count()} User "
        f"(alle mit Passwort: {DEFAULT_PASSWORD})\n"
        f"- {Community.objects.count()} Communities\n"
        f"- {Post.objects.count()} Posts\n"
        f"- {Comment.objects.count()} Kommentare\n"
        f"- {PostVote.objects.count()} Votes\n"
    )


import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cookies } from "next/headers"
import { MessageSquare, Users, Cake } from "lucide-react"
import Link from "next/link"

import { Navbar } from "@/components/navbar"
import { PostCard } from "@/components/postcard"
import { CreatePostForm } from "@/components/create-post-form"
import type { ApiCommunity, Post } from "@/lib/types"
import { CommunityJoinButton } from "@/components/community-join-button"
import { normalizeMediaUrl } from "@/lib/media-url"
import { MediaImage } from "@/components/media-image"


const API_BASE = process.env.DJANGO_API_BASE!

async function fetchCommunity(slug: string): Promise<ApiCommunity | null> {
  const cookieStore = await cookies()
  const access = cookieStore.get("access")?.value

  const res = await fetch(
    `${API_BASE}/api/communities/${encodeURIComponent(slug)}/`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
      cache: "no-store",
    },
  )

  if (res.status === 404) {
    return null
  }

  if (!res.ok) {
    console.error(
      "Fehler beim Laden der Community:",
      res.status,
      await res.text(),
    )
    throw new Error("Fehler beim Laden der Community")
  }

  return (await res.json()) as ApiCommunity
}

async function fetchCommunityPosts(slug: string): Promise<Post[]> {
  const cookieStore = await cookies()
  const access = cookieStore.get("access")?.value

  const res = await fetch(
    `${API_BASE}/api/communities/${encodeURIComponent(slug)}/posts/`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
      cache: "no-store",
    },
  )

  if (!res.ok) {
    console.error(
      "Fehler beim Laden der Posts:",
      res.status,
      await res.text(),
    )
    throw new Error("Fehler beim Laden der Posts")
  }

  const data = await res.json()
  const items: any[] = Array.isArray(data) ? data : data.results

  return items.map(
    (p): Post => ({
      id: p.id,
      community_slug: p.community_slug,
      title: p.title,
      body: p.body,
      image_url: p.image_url || null,
      images: Array.isArray(p.images) ? p.images : [],
      score: p.score,
      my_vote: p.my_vote,
      author_email: p.author_email,
      author_username: p.author_username,
      author_image_url: p.author_image_url ?? null,
      created_at: p.created_at,
      is_pinned: !!p.is_pinned,
      is_locked: !!p.is_locked,
      comment_count: p.comment_count ?? 0,
    }),
  )
}

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata(
  { params }: PageProps,
): Promise<Metadata> {
  const { slug } = await params
  const community = await fetchCommunity(slug)

  if (!community) {
    return {
      title: "Community nicht gefunden",
    }
  }

  return {
    title: `r/${community.slug} – ${community.name}`,
    description: community.description,
  }
}

export default async function CommunityPage({ params }: PageProps) {
  const { slug } = await params

  const community = await fetchCommunity(slug)
  if (!community) {
    notFound()
  }

  const posts = await fetchCommunityPosts(slug)

  const visiblePosts = posts
    .filter((p) => !p.is_locked)
    .sort((a, b) => {
      if (a.is_pinned === b.is_pinned) return 0
      return a.is_pinned ? -1 : 1
    })

  const createdDate = new Date(community.created_at)
  const createdFormatted = createdDate.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  const myRole = community.my_role as
    | "owner"
    | "moderator"
    | "member"
    | null
    | undefined

  const canManage = myRole === "owner" || myRole === "moderator"
  const canPost =
    myRole === "owner" || myRole === "moderator" || myRole === "member"

  const bannerSrc =
    community.banner_url && community.banner_url.trim() !== ""
      ? normalizeMediaUrl(community.banner_url)
      : null

  return (
    <div className="min-h-screen border-l border-r">
      <Navbar />
      <section className="border-b bg-gradient-to-b from-muted/60 to-background">
        <div className="mx-auto max-w-5xl px-4 pb-6 pt-6 md:px-6 md:pb-8">
          {bannerSrc && (
  <div className="mb-5 overflow-hidden rounded-xl border bg-muted">
    <div className="relative h-32 w-full md:h-40">
      <MediaImage
        src={bannerSrc}
        alt={`${community.name} Banner`}
        fill
        sizes="(max-width: 768px) 100vw, 960px"
        className="object-cover"
      />
    </div>
  </div>
)}

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  r/{community.slug}
                </h1>
                {community.my_role && (
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground capitalize">
                    {community.my_role}
                  </span>
                )}
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {community.description}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {canManage ? (
                <Link
                  href={`/community/${community.slug}/manage`}
                  className="inline-flex items-center rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background shadow-sm hover:brightness-110"
                >
                  Verwalten
                </Link>
              ) : (
                <CommunityJoinButton slug={community.slug} myRole={myRole} />
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">
                {community.members_count.toLocaleString("de-DE")}
              </span>
              <span>Mitglieder</span>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">
                {community.posts_count.toLocaleString("de-DE")}
              </span>
              <span>Beiträge</span>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <Cake className="h-3.5 w-3.5" />
              <span>Erstellt am {createdFormatted}</span>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-6 md:px-0 md:py-8">
        <CreatePostForm slug={community.slug} canPost={!!canPost} />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Beiträge
          </h2>
        </div>
        <div className="space-y-4">
          {visiblePosts.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
              Noch keine Beiträge in dieser Community.
              <br />
              Sei der Erste und starte eine Diskussion!
            </div>
          ) : (
            visiblePosts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </section>
    </div>
  )
}

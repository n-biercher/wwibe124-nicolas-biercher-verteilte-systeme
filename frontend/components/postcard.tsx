"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { MessageSquare, Share2, Bookmark, Pin, Lock } from "lucide-react"

import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Textarea } from "./ui/textarea"
import { VoteRail } from "./voterail"

import type { Post } from "@/lib/types"
import { useAuth } from "@/lib/authcontext"
import { normalizeMediaUrl } from "@/lib/media-url"

const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_BASE!

type Comment = {
  id: number
  body: string
  author_email: string
  author_username: string
  author_image_url?: string | null
  created_at: string
}

export function PostCard({ post }: { post: Post }) {
  const { accessToken } = useAuth()

  const displayName = post.author_username || post.author_email || "Unbekannt"
  const initials = (displayName[0] ?? "U").toUpperCase()

  const created = new Date(post.created_at)
  const createdFormatted = created.toLocaleString("de-DE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const postAuthorImage = post.author_image_url
    ? normalizeMediaUrl(post.author_image_url)
    : null

  const [score, setScore] = React.useState(post.score)
  const [myVote, setMyVote] = React.useState(post.my_vote ?? 0)
  const [votePending, setVotePending] = React.useState(false)
  const [voteError, setVoteError] = React.useState<string | null>(null)

async function sendVote(newValue: number) {
  if (!accessToken) {
    setVoteError("Zum Voten musst du eingeloggt sein.")
    return
  }

  try {
    setVotePending(true)
    setVoteError(null)

    const prevVote = myVote
    const prevScore = score
    const finalValue = newValue === prevVote ? 0 : newValue

    setMyVote(finalValue)
    setScore(prevScore - prevVote + finalValue)

    const res = await fetch("/api/posts/vote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        postId: post.id,
        value: finalValue,
      }),
    })

    const text = await res.text()

    if (!res.ok) {
      console.error("Vote-Error:", res.status, text)
      let msg = "Vote fehlgeschlagen."
      try {
        const data = JSON.parse(text)
        if (data.detail) msg = data.detail
      } catch {}
      setMyVote(prevVote)
      setScore(prevScore)
      throw new Error(msg)
    }

    const data = JSON.parse(text)
    if (typeof data.score === "number") setScore(data.score)
    if (typeof data.my_vote === "number") setMyVote(data.my_vote)
  } catch (err: any) {
    setVoteError(err?.message || "Vote fehlgeschlagen.")
  } finally {
    setVotePending(false)
  }
}


  const handleUp = () => {
    if (votePending) return
    void sendVote(1)
  }

  const handleDown = () => {
    if (votePending) return
    void sendVote(-1)
  }

  const [showComments, setShowComments] = React.useState(false)
  const [comments, setComments] = React.useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = React.useState(false)
  const [errorComments, setErrorComments] = React.useState<string | null>(null)
  const [nextUrl, setNextUrl] = React.useState<string | null>(null)

  const [commentCount, setCommentCount] = React.useState(
    post.comment_count ?? 0,
  )

  async function loadComments(next?: string | null) {
    try {
      setLoadingComments(true)
      setErrorComments(null)

      const params = new URLSearchParams()
      params.set("postId", String(post.id))
      if (next) {
        params.set("next", next)
      }

      const res = await fetch(`/api/posts/comments?${params.toString()}`, {
        method: "GET",
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        console.error("Fehler beim Laden der Kommentare:", res.status, text)
        throw new Error("Kommentare konnten nicht geladen werden.")
      }

      const data = await res.json()
      const items: any[] = Array.isArray(data.items) ? data.items : []
      const mapped: Comment[] = items.map((c) => ({
        id: c.id,
        body: c.body,
        author_email: c.author_email,
        author_username: c.author_username,
        author_image_url: c.author_image_url ?? null,
        created_at: c.created_at,
      }))

      setComments((prev) => (next ? [...prev, ...mapped] : mapped))

      const nextVal =
        typeof data === "object" && data !== null ? data.next ?? null : null
      setNextUrl(nextVal)
    } catch (err: any) {
      console.error(err)
      setErrorComments(
        err?.message || "Kommentare konnten nicht geladen werden.",
      )
    } finally {
      setLoadingComments(false)
    }
  }

  function handleToggleComments() {
    if (!showComments) {
      setShowComments(true)
      if (comments.length === 0) {
        void loadComments(null)
      }
    } else {
      setShowComments(false)
    }
  }

  const [newComment, setNewComment] = React.useState("")
  const [creatingComment, setCreatingComment] = React.useState(false)
  const [createError, setCreateError] = React.useState<string | null>(null)

  async function handleCreateComment(e: React.FormEvent) {
    e.preventDefault()
    const body = newComment.trim()
    if (!body) return

    if (!accessToken) {
      setCreateError("Zum Kommentieren musst du eingeloggt sein.")
      return
    }

    try {
      setCreatingComment(true)
      setCreateError(null)

      const res = await fetch("/api/posts/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          postId: post.id,
          body,
          parent: null,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error("Fehler beim Erstellen des Kommentars:", res.status, text)
        let msg = "Kommentar konnte nicht erstellt werden."
        try {
          const data = JSON.parse(text)
          if (data.detail) msg = data.detail
        } catch (err: any) {
          console.log(err)
        }
        throw new Error(msg)
      }

      const c = await res.json()
      const newC: Comment = {
        id: c.id,
        body: c.body,
        author_email: c.author_email,
        author_username: c.author_username,
        author_image_url: c.author_image_url ?? null,
        created_at: c.created_at,
      }

      if (!showComments) {
        setShowComments(true)
      }

      setComments((prev) => [newC, ...prev])
      setCommentCount((prev) => prev + 1)
      setNewComment("")
    } catch (err: any) {
      console.error(err)
      setCreateError(
        err?.message || "Kommentar konnte nicht erstellt werden.",
      )
    } finally {
      setCreatingComment(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-2xl overflow-hidden transition-shadow hover:shadow-sm">
      <div className="flex">
        <VoteRail count={score} onUp={handleUp} onDown={handleDown} />
        <div className="flex-1">
          <CardHeader className="space-y-2 pb-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:text-sm">
              <Link
                href={`/community/${post.community_slug}`}
                className="font-medium hover:underline"
              >
                r/{post.community_slug}
              </Link>
              <span>•</span>
              <span suppressHydrationWarning>{createdFormatted}</span>
              {(post.is_pinned || post.is_locked) && (
                <>
                  <span>•</span>
                  <div className="inline-flex flex-wrap items-center gap-1">
                    {post.is_pinned && (
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[11px] font-medium">
                        <Pin className="h-3 w-3" />
                        Angepinnt
                      </span>
                    )}
                    {post.is_locked && (
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[11px] font-medium">
                        <Lock className="h-3 w-3" />
                        Gesperrt
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-lg leading-snug md:text-xl">
                {post.title}
              </CardTitle>
              <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                <Avatar className="h-7 w-7">
                  {postAuthorImage ? (
                    <AvatarImage src={postAuthorImage} alt={displayName} />
                  ) : (
                    <AvatarFallback>{initials}</AvatarFallback>
                  )}
                </Avatar>
              </div>
            </div>
          </CardHeader>

          <PostImages post={post} />

          <CardContent className="space-y-4">
            {post.body && (
              <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-muted-foreground">
                {post.body}
              </p>
            )}
            <div className="flex items-center justify-between gap-3 text-xs md:text-sm">
              <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7 sm:hidden">
                    {postAuthorImage ? (
                      <AvatarImage src={postAuthorImage} alt={displayName} />
                    ) : (
                      <AvatarFallback>{initials}</AvatarFallback>
                    )}
                  </Avatar>
                  <span>
                    Von{" "}
                    <span className="font-medium text-foreground">
                      {displayName}
                    </span>
                  </span>
                </div>
                <span className="hidden text-muted-foreground sm:inline">•</span>
                <button
                  type="button"
                  onClick={handleToggleComments}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>
                    {commentCount === 1
                      ? "1 Kommentar anzeigen"
                      : `${commentCount} Kommentare anzeigen`}
                  </span>
                </button>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" aria-label="Teilen">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Speichern">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {voteError && (
              <p className="text-xs text-red-500">{voteError}</p>
            )}

            {showComments && (
              <div className="mt-3 space-y-3 border-t pt-3">
                <form onSubmit={handleCreateComment} className="space-y-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={
                      accessToken
                        ? "Kommentar schreiben..."
                        : "Zum Kommentieren einloggen..."
                    }
                    disabled={!accessToken || creatingComment}
                    className="min-h-[60px] text-xs md:text-sm"
                  />
                  {createError && (
                    <p className="text-xs text-red-500">{createError}</p>
                  )}
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        creatingComment || !newComment.trim() || !accessToken
                      }
                    >
                      {creatingComment
                        ? "Sende Kommentar..."
                        : "Kommentieren"}
                    </Button>
                  </div>
                </form>

                {errorComments && (
                  <p className="text-xs text-red-500">{errorComments}</p>
                )}

                {loadingComments && comments.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Kommentare werden geladen...
                  </p>
                )}

                {!loadingComments &&
                  comments.length === 0 &&
                  !errorComments && (
                    <p className="text-xs text-muted-foreground">
                      Noch keine Kommentare.
                    </p>
                  )}

                {comments.map((c) => {
                  const authorName =
                    c.author_username || c.author_email || "Unbekannt"
                  const authorInitials =
                    (authorName[0] ?? "U").toUpperCase()
                  const createdStr = new Date(
                    c.created_at,
                  ).toLocaleString("de-DE", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })

                  const commentAuthorImage = c.author_image_url
                    ? normalizeMediaUrl(c.author_image_url)
                    : null

                  return (
                    <div
                      key={c.id}
                      className="flex gap-3 rounded-md bg-muted/40 p-2.5 text-xs"
                    >
                      <Avatar className="h-7 w-7">
                        {commentAuthorImage ? (
                          <AvatarImage
                            src={commentAuthorImage}
                            alt={authorName}
                          />
                        ) : (
                          <AvatarFallback>{authorInitials}</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {authorName}
                          </span>
                          <span>•</span>
                          <span suppressHydrationWarning>{createdStr}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-[0.8rem] leading-relaxed">
                          {c.body}
                        </p>
                      </div>
                    </div>
                  )
                })}

                {nextUrl && (
                  <div className="pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void loadComments(nextUrl)}
                      disabled={loadingComments}
                    >
                      {loadingComments
                        ? "Lade weitere Kommentare..."
                        : "Mehr Kommentare laden"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </div>
      </div>
    </Card>
  )
}

export function PostImages({ post }: { post: Post }) {
  const images = React.useMemo(() => {
    if (post.images && post.images.length > 0) {
      return [...post.images].sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0),
      )
    }

    if (post.image_url) {
      return [
        {
          id: `fallback-${post.id}`,
          image_url: post.image_url,
          position: 1,
        },
      ]
    }

    return []
  }, [post])

  if (images.length === 0) return null

  if (images.length === 1) {
    const img = images[0]
    const src = normalizeMediaUrl(img.image_url)

    return (
      <div className="px-6">
        <div className="relative h-64 w-full overflow-hidden rounded-lg border">
          <Image
            src={src}
            alt="Post image"
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            className="object-cover transition-transform duration-300 hover:scale-[1.02]"
            loader={({ src }) => src}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="px-6">
      <div className="mt-1 grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-2 md:grid-cols-3">
        {images.slice(0, 4).map((img, i) => {
          const src = normalizeMediaUrl(img.image_url)
          return (
            <div
              key={img.id ?? `img-${post.id}-${i}`}
              className="relative h-32 w-full overflow-hidden rounded-md bg-background"
            >
              <Image
                src={src}
                alt="Post image"
                fill
                sizes="(max-width: 768px) 100vw, 600px"
                className="object-cover transition-transform duration-300 hover:scale-[1.03]"
                loader={({ src }) => src}
              />
            </div>
          )
        })}

        {images.length > 4 && (
          <div className="flex items-center justify-center rounded-md bg-background text-xs font-medium text-muted-foreground">
            + {images.length - 4} weitere
          </div>
        )}
      </div>
    </div>
  )
}

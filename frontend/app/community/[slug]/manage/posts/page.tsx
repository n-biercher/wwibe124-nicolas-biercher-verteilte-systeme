"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import {
  Lock,
  MessageSquare,
  Pin,
  Search,
  Trash2,
} from "lucide-react"

import type { ApiComment, PostComment } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/authcontext"
import type { Post } from "@/lib/types"
import { PostImages } from "@/components/postcard"



export default function CommunityPostsPage() {
  const params = useParams()
  const slugParam = params?.slug
  const slug =
    typeof slugParam === "string"
      ? slugParam
      : Array.isArray(slugParam)
        ? slugParam[0]
        : undefined

  const { accessToken, logout } = useAuth()

  const [posts, setPosts] = React.useState<Post[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState("")
  const [selectedPostId, setSelectedPostId] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (!slug || !accessToken) {
      if (!accessToken) setLoading(false)
      return
    }

    let isMounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const url = `/api/communities/${encodeURIComponent(slug!)}/posts`

        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (res.status === 401) {
          await logout()
          throw new Error("Session abgelaufen. Bitte erneut einloggen.")
        }

        if (!res.ok) {
          const text = await res.text()
          console.error("Fehler beim Laden der Posts:", res.status, text)
          if (res.status === 404) {
            throw new Error("Community oder Beiträge nicht gefunden.")
          }
          if (res.status === 403) {
            throw new Error(
              "Du hast keine Berechtigung, die Beiträge dieser Community zu verwalten.",
            )
          }
          throw new Error("Fehler beim Laden der Beiträge.")
        }

        const data = await res.json()
        const items: Post[] = Array.isArray(data) ? data : data.results


        if (isMounted) {
          setPosts(items)
          if (items.length > 0) {
            setSelectedPostId(items[0].id)
          }
        }
      } catch (err: any) {
        console.error(err)
        if (isMounted) {
          setError(err?.message || "Fehler beim Laden der Beiträge.")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [slug, accessToken, logout])

  const filtered = React.useMemo(() => {
    if (!query.trim()) return posts
    const q = query.toLowerCase()
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.author_username.toLowerCase().includes(q),
    )
  }, [posts, query])

  const selectedPost = React.useMemo(
    () => filtered.find((p) => p.id === selectedPostId) ?? null,
    [filtered, selectedPostId],
  )

  function handlePostChange(postId: number, updated: Post | null) {
    setPosts((prev) => {
      if (updated === null) {
        const newList = prev.filter((p) => p.id !== postId)
        if (selectedPostId === postId) {
          setSelectedPostId(newList[0]?.id ?? null)
        }
        return newList
      }
      return prev.map((p) => (p.id === postId ? updated : p))
    })
  }

  if (!accessToken) {
    return (
      <Card className="border bg-card/90">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Du bist nicht eingeloggt. Bitte melde dich an, um Beiträge zu
          verwalten.
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="border bg-card/90">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Lade Beiträge...
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border bg-card/90">
        <CardContent className="p-4 text-sm text-red-500">
          {error}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border bg-card/95 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Community-Moderation
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Beiträge und Kommentare in{" "}
              <span className="font-medium">r/{slug}</span> verwalten.
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            {filtered.length}{" "}
            {filtered.length === 1 ? "Beitrag" : "Beiträge"}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)]">
          <Card className="border bg-background/90 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Beiträge
                </CardTitle>
              </div>
              <div className="mt-3 relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nach Titel oder Autor suchen..."
                  className="pl-9 text-xs md:text-sm"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="max-h-[480px] space-y-3 overflow-auto px-2 scrollbar-hide">
                {filtered.length === 0 ? (
                  <div className="rounded-md border border-dashed bg-muted/40 p-4 text-center text-xs text-muted-foreground">
                    Keine passenden Beiträge gefunden.
                  </div>
                ) : (
                  filtered.map((p) => {
                    const created = new Date(
                      p.created_at,
                    ).toLocaleDateString("de-DE", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                    const active = p.id === selectedPostId
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPostId(p.id)}
                        className={[
                          "group flex w-full flex-col items-stretch gap-1 rounded-lg border px-4 py-3 text-left text-xs transition",
                          "ring-offset-2 ring-offset-background",
                          active
                            ? "ring-2 ring-primary/70 bg-accent/40"
                            : "bg-background/80 hover:bg-accent/30",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="line-clamp-2 text-[13px] font-semibold text-foreground">
                            {p.title}
                          </span>
                          <div className="flex items-center gap-1">
                            {p.is_pinned && (
                              <Badge
                                variant="outline"
                                className="inline-flex h-5 items-center gap-1 rounded-full px-2 py-0 text-[10px]"
                              >
                                <Pin className="h-3 w-3" />
                                Pin
                              </Badge>
                            )}
                            {p.is_locked && (
                              <Badge
                                variant="outline"
                                className="inline-flex h-5 items-center gap-1 rounded-full px-2 py-0 text-[10px]"
                              >
                                <Lock className="h-3 w-3" />
                                Locked
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="max-w-[120px] truncate">
                            von {p.author_username}
                          </span>
                          <span>•</span>
                          <span>{created}</span>
                          <span>•</span>
                          <span>Score: {p.score}</span>
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {p.comment_count} Kommentare
                          </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
          {selectedPost ? (
            <PostDetailCard
              post={selectedPost}
              accessToken={accessToken}
              onPostChange={handlePostChange}
            />
          ) : (
            <Card className="flex h-full items-center justify-center border border-dashed bg-muted/30">
              <CardContent className="p-4 text-center text-xs text-muted-foreground">
                Wähle links einen Beitrag aus, um Details und Kommentare zu
                verwalten.
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

type PostDetailCardProps = {
  post: Post
  accessToken: string
  onPostChange: (postId: number, updated: Post | null) => void
}

function PostDetailCard({
  post,
  accessToken,
  onPostChange,
}: PostDetailCardProps) {
  const [saving, setSaving] =
    React.useState<null | "pin" | "lock" | "delete">(null)
  const [error, setError] = React.useState<string | null>(null)

  const createdFull = new Date(post.created_at).toLocaleString("de-DE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  async function toggleField(field: "is_pinned" | "is_locked", value: boolean) {
    try {
      setSaving(field === "is_pinned" ? "pin" : "lock")
      setError(null)

      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ [field]: value }),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error("Post toggle error:", field, res.status, text)
        let msg = "Aktion fehlgeschlagen."
        try {
          const data = JSON.parse(text)
          if (data.detail) msg = data.detail
        } catch (err: any) {
          console.log(err)
        }
        throw new Error(msg)
      }

      const data = (await res.json()) as Post
      onPostChange(post.id, data)
    } catch (err: any) {
      console.error(err)
      setError(err?.message || "Aktion fehlgeschlagen.")
    } finally {
      setSaving(null)
    }
  }

  async function handleDelete() {
    try {
      setSaving("delete")
      setError(null)

      const res = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!res.ok && res.status !== 204) {
        const text = await res.text()
        console.error("Post delete error:", res.status, text)
        let msg = "Löschen fehlgeschlagen."
        try {
          const data = JSON.parse(text)
          if (data.detail) msg = data.detail
        } catch (err: any) {
          console.log(err)
        }
        throw new Error(msg)
      }

      onPostChange(post.id, null)
    } catch (err: any) {
      console.error(err)
      setError(err?.message || "Löschen fehlgeschlagen.")
    } finally {
      setSaving(null)
    }
  }

  return (
    <Card className="flex h-full flex-col border bg-background/95 shadow-sm">
      <CardHeader className="pb-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-sm font-semibold text-foreground">
              {post.title}
            </CardTitle>
            {post.is_pinned && (
              <Badge
                variant="outline"
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
              >
                <Pin className="h-3 w-3" />
                Angepinnt
              </Badge>
            )}
            {post.is_locked && (
              <Badge
                variant="outline"
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
              >
                <Lock className="h-3 w-3" />
                Gesperrt
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span>von {post.author_username}</span>
            <span>•</span>
            <span>{createdFull}</span>
            <span>•</span>
            <span>Score: {post.score}</span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {post.comment_count} Kommentare
            </span>
          </div>
          {error && (
            <p className="text-[11px] text-red-500">
              {error}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 p-2 text-xs">
          <Button
            size="sm"
            variant="outline"
            onClick={() => toggleField("is_pinned", !post.is_pinned)}
            disabled={!!saving}
          >
            <Pin className="mr-1.5 h-3 w-3" />
            {saving === "pin"
              ? "Ändere..."
              : post.is_pinned
                ? "Entpinnen"
                : "Anpinnen"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toggleField("is_locked", !post.is_locked)}
            disabled={!!saving}
          >
            <Lock className="mr-1.5 h-3 w-3" />
            {saving === "lock"
              ? "Ändere..."
              : post.is_locked
                ? "Entsperren"
                : "Sperren"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-red-500 hover:text-red-600"
            onClick={handleDelete}
            disabled={!!saving}
          >
            <Trash2 className="mr-1.5 h-3 w-3" />
            {saving === "delete" ? "Lösche..." : "Beitrag löschen"}
          </Button>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>
                Post
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PostImages post={post} />
              <div className="mt-4">
                {post.body}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex-1">
          <CommentManager postId={post.id} accessToken={accessToken} />
        </div>
      </CardContent>
    </Card>
  )
}
type CommentManagerProps = {
  postId: number
  accessToken: string
}

function CommentManager({ postId, accessToken }: CommentManagerProps) {
  const [comments, setComments] = React.useState<PostComment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [nextUrl, setNextUrl] = React.useState<string | null>(null)
  const [loadingMore, setLoadingMore] = React.useState(false)

  async function load(url?: string, append = false) {
    try {
      if (!append) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError(null)

      const targetUrl =
        url ?? `/api/posts/${postId}/comments`

      const res = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!res.ok) {
        const text = await res.text()
        console.error("Fehler beim Laden der Kommentare:", res.status, text)
        throw new Error("Kommentare konnten nicht geladen werden.")
      }

      const data = await res.json()
      const items: ApiComment[] = Array.isArray(data)
        ? data
        : data.results

      const mapped: PostComment[] = items.map((c) => ({
        id: c.id,
        body: c.body,
        author_username: c.author_username,
        author_email: c.author_email,
        created_at: c.created_at,
      }))

      setComments((prev) => (append ? [...prev, ...mapped] : mapped))

      const next =
        typeof data === "object" && data !== null ? data.next ?? null : null
      setNextUrl(next)
    } catch (err: any) {
      console.error(err)
      setError(err?.message || "Kommentare konnten nicht geladen werden.")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  React.useEffect(() => {
    void load()
  }, [postId, accessToken])

  async function handleDeleteComment(id: number) {
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!res.ok && res.status !== 204) {
        const text = await res.text()
        console.error("Fehler beim Löschen des Kommentars:", res.status, text)
        throw new Error("Kommentar konnte nicht gelöscht werden.")
      }

      setComments((prev) => prev.filter((c) => c.id !== id))
    } catch (err: any) {
      console.error(err)
      setError(err?.message || "Kommentar konnte nicht gelöscht werden.")
    }
  }

  return (
    <div className="flex h-full flex-col gap-2 rounded-md bg-muted/30 p-2 text-xs">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">
          Kommentare
        </span>
        <span>
          {comments.length}{" "}
          {comments.length === 1 ? "Kommentar" : "Kommentare"}
        </span>
      </div>
      {loading && comments.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          Lade Kommentare...
        </p>
      )}
      {error && (
        <p className="text-[11px] text-red-500">
          {error}
        </p>
      )}
      {!loading && comments.length === 0 && !error && (
        <p className="text-[11px] text-muted-foreground">
          Keine Kommentare vorhanden.
        </p>
      )}
      <div className="flex-1 space-y-1 overflow-auto pr-1">
        {comments.map((c) => {
          const author =
            c.author_username || c.author_email || "Unbekannt"
          const created = new Date(c.created_at).toLocaleString("de-DE", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
          return (
            <div
              key={c.id}
              className="flex items-start justify-between gap-2 rounded border bg-background/95 px-2 py-1.5"
            >
              <div className="space-y-0.5 text-[11px]">
                <div className="flex flex-wrap items-center gap-1 text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {author}
                  </span>
                  <span>•</span>
                  <span>{created}</span>
                </div>
                <p className="whitespace-pre-wrap text-[11px]">
                  {c.body}
                </p>
              </div>
              <button
                type="button"
                className="ml-1 text-[11px] text-red-500 hover:text-red-600"
                onClick={() => void handleDeleteComment(c.id)}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )
        })}
      </div>
      {nextUrl && (
        <div className="pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            disabled={loadingMore}
            onClick={() => void load(nextUrl, true)}
          >
            {loadingMore
              ? "Lade weitere Kommentare..."
              : "Mehr Kommentare laden"}
          </Button>
        </div>
      )}
    </div>
  )
}

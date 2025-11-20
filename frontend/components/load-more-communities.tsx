"use client"

import * as React from "react"
import { CommunityCard } from "@/components/communitycard"
import { Button } from "@/components/ui/button"

type ApiCommunity = {
  slug: string
  name: string
  description: string
  visibility: string
  members_count: number
  posts_count: number
  icon_url: string | null
  banner_url: string | null
  created_at: string
}

export function LoadMoreCommunities({
  initialNextUrl,
}: {
  initialNextUrl: string | null
}) {
  const [nextPath, setNextPath] = React.useState<string | null>(initialNextUrl)
  const [loading, setLoading] = React.useState(false)
  const [communities, setCommunities] = React.useState<ApiCommunity[]>([])
  const [error, setError] = React.useState<string | null>(null)

  async function loadMore() {
    if (!nextPath || loading) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (nextPath) {
        params.set("next", nextPath)
      }

      const res = await fetch(`/api/communities/loadmore?${params.toString()}`, {
        method: "GET",
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        console.error("Pagination error:", res.status, text)
        throw new Error("Weitere Communities konnten nicht geladen werden.")
      }

      const data = await res.json()
      const items: ApiCommunity[] = data.items ?? []

      setCommunities((prev) => [...prev, ...items])
      setNextPath(data.next ?? null)
    } catch (err: any) {
      console.error("Load more error:", err)
      setError(err.message ?? "Unbekannter Fehler beim Laden.")
    } finally {
      setLoading(false)
    }
  }

  if (!nextPath && communities.length === 0) return null

  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-3">
        {communities.map((c, idx) => (
          <CommunityCard
            key={c.slug + "-lm-" + idx}
            slug={c.slug}
            name={c.name}
            description={c.description}
            visibility={c.visibility}
            membersCount={c.members_count}
            postsCount={c.posts_count}
            myRole={null}
            iconUrl={c.icon_url}
            bannerUrl={c.banner_url}
            createdAt={c.created_at}
          />
        ))}
      </div>

      {nextPath && (
        <Button
          onClick={loadMore}
          variant="outline"
          size="sm"
          disabled={loading}
          className="rounded-full px-6"
        >
          {loading ? "Lade weitere Communities…" : "Mehr laden"}
        </Button>
      )}
    </div>
  )
}

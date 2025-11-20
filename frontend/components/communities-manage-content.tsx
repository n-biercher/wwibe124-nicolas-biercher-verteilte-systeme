"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowUpRight,
  Filter,
  Search,
  Shield,
  ShieldAlert,
  Users,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ApiCommunity } from "@/lib/types"
import { useAuth } from "@/lib/authcontext"
import { normalizeMediaUrl } from "@/lib/media-url"

type Role = "owner" | "moderator"

type ManagedCommunity = {
  id: number
  slug: string
  name: string
  description?: string
  created_at: string
  members: number
  online: number
  role: Role
  banner_image_url?: string | null
}

export function CommunitiesManageContent({
  className,
  ...props
}: React.ComponentProps<"main">) {
  const { user, loading: authLoading } = useAuth()

  const [query, setQuery] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState<"all" | Role>("all")
  const [communities, setCommunities] = React.useState<ManagedCommunity[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let isMounted = true

    async function load() {
      if (authLoading) return

      if (!user) {
        if (isMounted) {
          setCommunities([])
          setLoading(false)
        }
        return
      }

      try {
        setLoading(true)
        setError(null)

        const res = await fetch("/api/communities/manage", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!res.ok) {
          const text = await res.text()
          console.error(
            "Fehler beim Laden der Communities:",
            res.status,
            text,
          )
          if (res.status === 401) {
            throw new Error("Nicht autorisiert – bitte neu einloggen.")
          }
          throw new Error("Fehler beim Laden der Communities")
        }

        const data = await res.json()
        const items: ApiCommunity[] = Array.isArray(data) ? data : data.results

        const managed: ManagedCommunity[] = items.map((c) => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
          description: c.description,
          created_at: c.created_at,
          members: c.members_count,
          online: 0,
          role: (c.my_role as Role) || "owner",
          banner_image_url: c.banner_url,
        }))

        if (isMounted) {
          setCommunities(managed)
        }
      } catch (err: any) {
        console.error(err)
        if (isMounted) {
          setError(err?.message || "Fehler beim Laden deiner Communities.")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [authLoading, user])

  const filtered = React.useMemo(() => {
    return communities.filter((c) => {
      if (roleFilter !== "all" && c.role !== roleFilter) return false

      if (!query.trim()) return true
      const q = query.toLowerCase()

      return (
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q)
      )
    })
  }, [communities, query, roleFilter])

  const communitiesCount = filtered.length

  return (
    <main
      className={cn("mx-auto max-w-5xl px-4 py-8 md:py-10", className)}
      {...props}
    >
      <header className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Deine Communities
          </h1>
          <p className="text-sm text-muted-foreground">
            Verwalte alle Communities, in denen du Owner oder Moderator bist.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/community/new">
              <span className="mr-1.5 text-xs">+</span>
              Neue Community erstellen
            </Link>
          </Button>
        </div>
      </header>

      <section className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nach Name, Slug oder Beschreibung suchen..."
              className="pl-9 text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs md:text-sm">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="inline-flex gap-1 rounded-full bg-muted p-1">
            <FilterChip
              active={roleFilter === "all"}
              onClick={() => setRoleFilter("all")}
            >
              Alle
            </FilterChip>
            <FilterChip
              active={roleFilter === "owner"}
              onClick={() => setRoleFilter("owner")}
            >
              Owner
            </FilterChip>
            <FilterChip
              active={roleFilter === "moderator"}
              onClick={() => setRoleFilter("moderator")}
            >
              Moderator
            </FilterChip>
          </div>
        </div>
      </section>

      {(loading || authLoading) && (
        <div className="mb-4 text-xs text-muted-foreground">
          Lade deine Communities...
        </div>
      )}

      {error && (
        <Card className="mb-4 border-destructive/40 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {communitiesCount === 0
              ? "Keine passenden Communities gefunden."
              : communitiesCount === 1
                ? "1 Community gefunden."
                : `${communitiesCount} Communities gefunden.`}
          </span>
        </div>
        {communitiesCount === 0 ? (
          <Card className="border-dashed bg-muted/40">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Du bist aktuell in keiner Community als Owner oder Moderator
              eingetragen oder dein Filter ist zu streng.
              <br />
              <span className="mt-1 inline-block">
                Erstelle eine neue Community oder passe die Filter an.
              </span>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => (
              <CommunityRow key={c.id} community={c} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium transition",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-background/60",
      )}
    >
      {children}
    </button>
  )
}

function CommunityRow({ community }: { community: ManagedCommunity }) {
  const created = new Date(community.created_at)
  const createdLabel = created.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  const roleBadge =
    community.role === "owner" ? (
      <Badge
        variant="default"
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
      >
        <Shield className="h-3 w-3" />
        Owner
      </Badge>
    ) : (
      <Badge
        variant="outline"
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
      >
        <ShieldAlert className="h-3 w-3" />
        Moderator
      </Badge>
    )
  const bannerSrc =
    community.banner_image_url && community.banner_image_url.trim() !== ""
      ? normalizeMediaUrl(community.banner_image_url)
      : null

  return (
    <Card className="overflow-hidden border bg-card/90">
      <div className="flex flex-col md:flex-row">
        <div className="relative w-full border-b bg-muted/50 md:w-48 md:border-b-0 md:border-r">
          <div className="relative h-20 w-full md:h-24">
            {bannerSrc ? (
              <Image
                src={bannerSrc}
                alt={`${community.name} Banner`}
                fill
                sizes="(max-width: 768px) 100vw, 192px"
                className="object-cover"
                loader={({ src }) => src}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[11px] text-muted-foreground">
                Kein Banner
              </div>
            )}
          </div>
          <div className="pointer-events-none absolute bottom-1 left-2 inline-flex items-center rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium shadow-sm">
            r/{community.slug}
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-between">
          <CardHeader className="flex flex-col gap-1 pb-2 pr-4 pt-3 md:pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="truncate text-base font-semibold">
                {community.name}
              </CardTitle>
              {roleBadge}
            </div>
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {community.description || "Keine Beschreibung angegeben."}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col items-start justify-between gap-3 pb-3 pr-4 pt-0 md:flex-row md:items-center">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">
                  {community.members.toLocaleString("de-DE")}
                </span>
                <span>Mitglieder</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                <span>Seit {createdLabel}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/community/${community.slug}`}>
                    <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />
                    Öffnen
                  </Link>
                </Button>
                <Button asChild size="sm" variant="ghost" className="text-xs">
                  <Link href={`/community/${community.slug}/manage`}>
                    Verwalten
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  )
}

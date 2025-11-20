import Link from "next/link"
import { cookies } from "next/headers"
import { Sparkles, PlusCircle } from "lucide-react"

import { Navbar } from "@/components/navbar"
import { CommunityCard } from "@/components/communitycard"
import type { ApiCommunity, CommunityCardProps } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoadMoreCommunities } from "@/components/load-more-communities"

const API_BASE = process.env.DJANGO_API_BASE!

function normalizeNext(next: string | null | undefined): string | null {
  if (!next) return null
  try {
    const u = new URL(next)
    return u.pathname + u.search
  } catch {
    return next
  }
}

async function fetchCommunities() {
  const cookieStore = await cookies()
  const access = cookieStore.get("access")?.value

  const res = await fetch(`${API_BASE}/api/communities/?page=1`, {
    headers: {
      "Content-Type": "application/json",
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    },
    cache: "no-store",
  })

  if (!res.ok) {
    console.error(
      "Fehler beim Laden der Communities:",
      res.status,
      await res.text(),
    )
    throw new Error("Fehler beim Laden der Communities")
  }

  const data = await res.json()

  return {
    items: data.results as ApiCommunity[],
    next: normalizeNext(data.next as string | null),
  }
}

function mapApiCommunityToCard(c: ApiCommunity): CommunityCardProps {
  const role =
    c.my_role === "owner" ||
    c.my_role === "moderator" ||
    c.my_role === "member"
      ? c.my_role
      : null

  return {
    slug: c.slug,
    name: c.name,
    description: c.description,
    visibility: c.visibility,
    membersCount: c.members_count,
    postsCount: c.posts_count,
    myRole: role,
    iconUrl: c.icon_url,
    bannerUrl: c.banner_url,
    createdAt: c.created_at,
  }
}

export default async function Home() {
  const { items, next } = await fetchCommunities()
  const communities = items
  const nextUrl = next
  const cards = communities.map(mapApiCommunityToCard)

  const myCommunities = cards.filter((c) => !!c.myRole)

  const totalMembers = communities.reduce(
    (sum, c) => sum + (c.members_count ?? 0),
    0,
  )
  const totalPosts = communities.reduce(
    (sum, c) => sum + (c.posts_count ?? 0),
    0,
  )

  const popularCommunities = [...cards]
    .sort((a, b) => b.postsCount - a.postsCount)
    .slice(0, 6)

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-muted/40 to-background">
      <Navbar />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-12 pt-6 md:px-6 md:pt-10">
        <section className="grid gap-6 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)] md:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs text-muted-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="font-medium tracking-[0.16em] uppercase">
                Communities entdecken
              </span>
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold leading-tight tracking-tight md:text-3xl">
                Ein verteiltes System für Communities und Posts
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground md:text-base">
                Durchstöbere Communities, tritt ihnen bei oder starte deine
                eigene. Upvotes, Kommentare und Rollen wie Owner oder Moderator
                sorgen für klare Strukturen – ähnlich wie bei Reddit.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button asChild size="sm">
                <Link href="/community/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Neue Community erstellen
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/community/manage">
                  Deine Communities verwalten
                </Link>
              </Button>
              <span className="text-xs text-muted-foreground">
                Oder wähle einfach eine Community aus der Liste unten aus.
              </span>
            </div>
          </div>
          <div className="space-y-3 rounded-xl border bg-card/80 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Wie funktionieren Communities?
                </h2>
                <p className="text-xs text-muted-foreground">
                  Kurz erklärt, wie das Mini-Reddit aufgebaut ist:
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] uppercase tracking-[0.16em]"
              >
                Overview
              </Badge>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>• Jede Community hat Mitglieder, die Posts erstellen können.</li>
              <li>
                • Jeder Post kann kommentiert werden und Up- oder Downvotes
                erhalten.
              </li>
              <li>
                • Rollen wie{" "}
                <span className="font-medium">Owner</span> und{" "}
                <span className="font-medium">Moderator</span> verwalten
                Mitglieder und Inhalte.
              </li>
              <li>• Öffentliche Communities können von allen gelesen werden.</li>
              <li>
                • Private Communities benötigen eine genehmigte
                Beitrittsanfrage, um sie einzusehen.
              </li>
              <li>
                • Über dein Account-Profil steuerst du dein Passwort und dein
                Profilbild.
              </li>
            </ul>
          </div>
        </section>
        {myCommunities.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Deine Communities
                </h2>
                <p className="text-xs text-muted-foreground">
                  Räume, in denen du Owner, Moderator oder Mitglied bist – hier
                  bist du direkt eingebunden.
                </p>
              </div>
              <Badge variant="secondary" className="text-[11px]">
                {myCommunities.length.toLocaleString("de-DE")} aktiv
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {myCommunities.map((c) => (
                <CommunityCard key={c.slug} {...c} />
              ))}
            </div>
          </section>
        )}
        {popularCommunities.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Beliebte Communities
                </h2>
                <p className="text-xs text-muted-foreground">
                  Sortiert nach Anzahl der Beiträge – hier ist meistens am
                  meisten los.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {popularCommunities.map((c) => (
                <CommunityCard key={c.slug} {...c} />
              ))}
            </div>
          </section>
        )}
        <LoadMoreCommunities initialNextUrl={nextUrl} />
      </div>
    </main>
  )
}

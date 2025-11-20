"use client"

import * as React from "react"
import {
  Search,
  Users,
  Shield,
  ShieldAlert,
  Trash2,
  UserPlus,
  Clock3,
} from "lucide-react"
import { useParams } from "next/navigation"

import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/authcontext"

type Role = "owner" | "moderator" | "member"

type CommunityMember = {
  id: number
  userId: number
  username: string
  role: Role
  joined_at: string
  posts_count: number
}

type ApiMembership = {
  id: number
  community: number
  user: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: "owner" | "moderator" | "member" | "pending"
  created_at: string
  posts_count: number
}

type PendingMembership = ApiMembership & { role: "pending" }

function mapApiMembership(m: ApiMembership): CommunityMember {
  return {
    id: m.id,
    userId: m.user,
    username: m.username,
    role:
      m.role === "owner" || m.role === "moderator"
        ? m.role
        : "member",
    joined_at: m.created_at,
    posts_count: m.posts_count,
  }
}

export default function CommunityMembersPage() {
  const params = useParams()
  const slugParam = params?.slug
  const slug =
    typeof slugParam === "string"
      ? slugParam
      : Array.isArray(slugParam)
        ? slugParam[0]
        : undefined

  const { accessToken, user, logout } = useAuth()

  const [members, setMembers] = React.useState<CommunityMember[]>([])
  const [pending, setPending] = React.useState<PendingMembership[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [query, setQuery] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState<"all" | Role>("all")

  const [myRole, setMyRole] = React.useState<Role | null>(null)

  const currentUserId = user ? Number(user.id) : null

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

      const membersUrl = `/api/communities/${encodeURIComponent(slug!)}/members`
      const pendingUrl = `/api/communities/${encodeURIComponent(
        slug!,
      )}/members_pending`
      const communityUrl = `/api/communities/${encodeURIComponent(slug!)}`

      const [membersRes, pendingRes, communityRes] = await Promise.all([
        fetch(membersUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        fetch(pendingUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        fetch(communityUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      ])

      if (membersRes.status === 401 || communityRes.status === 401) {
        await logout()
        throw new Error("Session abgelaufen. Bitte erneut einloggen.")
      }

      if (!membersRes.ok) {
        const text = await membersRes.text()
        console.error(
          "Fehler beim Laden der Community-Members:",
          membersRes.status,
          text,
        )
        if (membersRes.status === 404) {
          throw new Error("Community nicht gefunden.")
        }
        if (membersRes.status === 403) {
          throw new Error(
            "Du hast keine Berechtigung, die Mitglieder dieser Community zu sehen.",
          )
        }
        throw new Error("Fehler beim Laden der Mitglieder.")
      }

      const data = await membersRes.json()
      const items: ApiMembership[] = Array.isArray(data) ? data : data.results

      const mapped: CommunityMember[] = items
        .filter((m) => m.role !== "pending")
        .map(mapApiMembership)

      let pendingItems: PendingMembership[] = []
      if (pendingRes.ok) {
        const pdata = await pendingRes.json()
        const raw: ApiMembership[] = Array.isArray(pdata)
          ? pdata
          : pdata.results
        pendingItems = raw
          .filter((m) => m.role === "pending")
          .map((m) => m as PendingMembership)
      } else if (pendingRes.status !== 403) {
        console.error(
          "Fehler beim Laden der Pending-Members:",
          pendingRes.status,
          await pendingRes.text(),
        )
      }

      if (communityRes.ok) {
        const c = await communityRes.json()
        const rawRole = c.my_role as string | null | undefined

        const role: Role | null =
          rawRole === "owner" || rawRole === "moderator" || rawRole === "member"
            ? rawRole
            : null

        if (isMounted) {
          setMyRole(role)
        }
      } else if (communityRes.status === 403) {
        if (isMounted) {
          setMyRole(null)
        }
      } else {
        console.error(
          "Fehler beim Laden der Community-Details:",
          communityRes.status,
          await communityRes.text(),
        )
      }

      if (isMounted) {
        setMembers(mapped)
        setPending(pendingItems)
      }
    } catch (err: any) {
      console.error(err)
      if (isMounted) {
        setError(err?.message || "Fehler beim Laden der Mitglieder.")
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
    return members.filter((m) => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return m.username.toLowerCase().includes(q)
    })
  }, [members, roleFilter, query])

  function handleMemberChange(
    membershipId: number,
    updated: CommunityMember | null,
  ) {
    setMembers((prev) => {
      if (updated === null) {
        return prev.filter((m) => m.id !== membershipId)
      }
      const exists = prev.some((m) => m.id === membershipId)
      if (!exists) {
        return [...prev, updated]
      }
      return prev.map((m) => (m.id === membershipId ? updated : m))
    })
  }

  function handlePendingRemoved(membershipId: number) {
    setPending((prev) => prev.filter((p) => p.id !== membershipId))
  }

  if (!accessToken) {
    return (
      <Card className="border bg-card/90">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Du bist nicht eingeloggt. Bitte melde dich an, um die Mitglieder zu
          verwalten.
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="border bg-card/90">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Lade Mitglieder...
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

  const canModerateRequests =
    myRole === "owner" || myRole === "moderator"

console.log("DEBUG myRole:", myRole, "currentUserId:", currentUserId, "members:", members)


  return (
    <Card className="border bg-card/90">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Mitglieder
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Übersicht aller Mitglieder von r/{slug}.
            </p>
          </div>
          <Badge className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px]">
            <Users className="h-3 w-3" />
            {members.length} Mitglieder
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nach Benutzername suchen..."
              className="pl-9 text-xs md:text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="inline-flex gap-1 rounded-full bg-muted p-1 text-xs">
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
              Moderatoren
            </FilterChip>
            <FilterChip
              active={roleFilter === "member"}
              onClick={() => setRoleFilter("member")}
            >
              Mitglieder
            </FilterChip>
          </div>
        </div>
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="rounded-md border border-dashed bg-muted/40 p-4 text-center text-xs text-muted-foreground">
              Keine passenden Mitglieder gefunden.
            </div>
          ) : (
            filtered.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                myRole={myRole}
                slug={slug!}
                accessToken={accessToken}
                onMemberChange={handleMemberChange}
                currentUserId={user?.id ?? null}
              />
            ))
          )}
        </div>
        {canModerateRequests && (
          <div className="mt-4 border-t pt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Beitrittsanfragen
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {pending.length}{" "}
                {pending.length === 1 ? "Anfrage" : "Anfragen"}
              </span>
            </div>
            {pending.length === 0 ? (
              <div className="rounded-md border border-dashed bg-muted/40 p-3 text-center text-[11px] text-muted-foreground">
                Aktuell liegen keine offenen Beitrittsanfragen vor.
              </div>
            ) : (
              <div className="space-y-2">
                {pending.map((p) => (
                  <PendingRow
                    key={p.id}
                    pending={p}
                    slug={slug!}
                    accessToken={accessToken}
                    onApproved={(apiMembership) => {
                      handlePendingRemoved(p.id)
                      handleMemberChange(
                        apiMembership.id,
                        mapApiMembership(apiMembership),
                      )
                    }}
                    onDeclined={() => handlePendingRemoved(p.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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
        "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-background/60",
      )}
    >
      {children}
    </button>
  )
}

type MemberRowProps = {
  member: CommunityMember
  myRole: Role | null
  slug: string
  accessToken: string
  onMemberChange: (membershipId: number, updated: CommunityMember | null) => void
  currentUserId: number | null
}

function MemberRow({
  member,
  myRole,
  slug,
  accessToken,
  onMemberChange,
  currentUserId,
}: MemberRowProps) {
  const [saving, setSaving] = React.useState<null | "promote" | "demote" | "remove">(null)
  const [error, setError] = React.useState<string | null>(null)

  const joined = new Date(member.joined_at).toLocaleDateString("de-DE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  const isSelf = currentUserId != null && currentUserId === member.userId
  const canManage = myRole === "owner" && !isSelf && member.role !== "owner"

async function callAction(kind: "promote" | "demote" | "remove") {
  try {
    setSaving(kind)
    setError(null)

    let endpoint = ""
    if (kind === "promote") {
      endpoint = `/api/communities/${encodeURIComponent(
        slug,
      )}/members_promote`
    } else if (kind === "demote") {
      endpoint = `/api/communities/${encodeURIComponent(
        slug,
      )}/members_demote`
    } else {
      endpoint = `/api/communities/${encodeURIComponent(
        slug,
      )}/members_remove`
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ membership_id: member.id }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("Member action error:", kind, res.status, text)
      let msg = "Aktion fehlgeschlagen."
      try {
        const data = JSON.parse(text)
        if (data.detail) msg = data.detail
      } catch (err: any) {
        console.log(err)
      }
      throw new Error(msg)
    }

    if (kind === "remove") {
      onMemberChange(member.id, null)
      return
    }

    const data = (await res.json()) as ApiMembership
    onMemberChange(member.id, mapApiMembership(data))
  } catch (err: any) {
    console.error(err)
    setError(err?.message || "Aktion fehlgeschlagen.")
  } finally {
    setSaving(null)
  }
}

console.log(canManage);


  return (
    <div className="flex flex-col gap-1 rounded-md border bg-background/60 px-3 py-2 text-xs md:flex-row md:items-center md:justify-between">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">
            {member.username}
          </span>
          <RoleBadge role={member.role} />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span>Beigetreten am {joined}</span>
          <span>{member.posts_count} Beiträge</span>
          {error && (
            <span className="text-red-500">
              {error}
            </span>
          )}
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 md:mt-0 md:justify-end">
        {canManage && (
          <>
           {member.role === "moderator" ? (
  <Button
    size="sm"
    variant="outline"
    onClick={() => void callAction("demote")}
    disabled={!!saving}
  >
    <ShieldAlert className="mr-1.5 h-3 w-3" />
    {saving === "demote" ? "Ändere..." : "Zu Member machen"}
  </Button>
) : (
  <Button
    size="sm"
    variant="outline"
    onClick={() => void callAction("promote")}
    disabled={!!saving}
  >
    <Shield className="mr-1.5 h-3 w-3" />
    {saving === "promote" ? "Ändere..." : "Zum Moderator machen"}
  </Button>
)}
<Button
  size="sm"
  variant="ghost"
  className="text-red-500 hover:text-red-600"
  onClick={() => void callAction("remove")}
  disabled={!!saving}
>
  <Trash2 className="mr-1.5 h-3 w-3" />
  {saving === "remove" ? "Entferne..." : "Entfernen"}
</Button>

          </>
        )}
      </div>
    </div>
  )
}

type PendingRowProps = {
  pending: PendingMembership
  slug: string
  accessToken: string
  onApproved: (updated: ApiMembership) => void
  onDeclined: () => void
}

function PendingRow({
  pending,
  slug,
  accessToken,
  onApproved,
  onDeclined,
}: PendingRowProps) {
  const [saving, setSaving] = React.useState<null | "approve" | "decline">(null)
  const [error, setError] = React.useState<string | null>(null)

  const requestedAt = new Date(pending.created_at).toLocaleDateString("de-DE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  async function callAction(kind: "approve" | "decline") {
    try {
      setSaving(kind)
      setError(null)

      const endpoint =
        kind === "approve"
          ? `/api/communities/${encodeURIComponent(
            slug!,
          )}/members_approve`
          : `/api/communities/${encodeURIComponent(
            slug!,
          )}/members_decline`

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ membership_id: pending.id }),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error("Pending action error:", kind, res.status, text)
        let msg = "Aktion fehlgeschlagen."
        try {
          const data = JSON.parse(text)
          if (data.detail) msg = data.detail
        } catch (err: any) {
          console.log(err)
        }
        throw new Error(msg)
      }

      if (kind === "approve") {
        const updated = (await res.json()) as ApiMembership
        onApproved(updated)
      } else {
        onDeclined()
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.message || "Aktion fehlgeschlagen.")
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="flex flex-col gap-1 rounded-md border bg-background/60 px-3 py-2 text-xs md:flex-row md:items-center md:justify-between">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">
            {pending.username}
          </span>
          <Badge
            variant="outline"
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
          >
            <Clock3 className="h-3 w-3" />
            Anfrage ausstehend
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span>Seit {requestedAt}</span>
          <span>{pending.posts_count} Beiträge (bisher)</span>
          {error && (
            <span className="text-red-500">
              {error}
            </span>
          )}
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 md:mt-0 md:justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => void callAction("approve")}
          disabled={!!saving}
        >
          {saving === "approve" ? "Bestätige..." : "Bestätigen"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-red-500 hover:text-red-600"
          onClick={() => void callAction("decline")}
          disabled={!!saving}
        >
          {saving === "decline" ? "Lehne ab..." : "Ablehnen"}
        </Button>
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: Role }) {
  if (role === "owner") {
    return (
      <Badge
        variant="default"
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
      >
        <Shield className="h-3 w-3" />
        Owner
      </Badge>
    )
  }
  if (role === "moderator") {
    return (
      <Badge
        variant="outline"
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
      >
        <ShieldAlert className="h-3 w-3" />
        Moderator
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
    >
      Member
    </Badge>
  )
}

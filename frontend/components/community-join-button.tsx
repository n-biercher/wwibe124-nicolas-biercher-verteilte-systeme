"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/authcontext"

type Role = "owner" | "moderator" | "member" | "pending" | null | undefined

type Props = {
  slug: string
  myRole: Role
}

export function CommunityJoinButton({ slug, myRole }: Props) {
  const router = useRouter()
  const { accessToken, loading } = useAuth()

  const [submitting, setSubmitting] = React.useState(false)
  const [localRole, setLocalRole] = React.useState<Role>(myRole)
  const [error, setError] = React.useState<string | null>(null)

  const effectiveRole = localRole ?? myRole

  const isMember =
    effectiveRole === "owner" ||
    effectiveRole === "moderator" ||
    effectiveRole === "member"

  if (loading) return null
  if (isMember) return null

  const isPending = effectiveRole === "pending"

  async function handleJoin() {
    setError(null)

    if (!accessToken) {
      router.push(`/login?next=/community/${encodeURIComponent(slug)}`)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(
        `/api/communities/${encodeURIComponent(slug)}/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )

      if (!res.ok) {
        const text = await res.text()
        console.error("Join-Fehler:", res.status, text)

        if (res.status === 409) {
          setError("Du bist bereits Mitglied dieser Community.")
        } else if (res.status === 400) {
          setError("Ungültige Anfrage.")
        } else if (res.status === 403) {
          setError("Du darfst dieser Community nicht beitreten.")
        } else if (res.status === 404) {
          setError("Community wurde nicht gefunden.")
        } else {
          setError("Beitritt fehlgeschlagen.")
        }
        return
      }

      const data = await res.json()
      const newRole: Role = data.role ?? null
      setLocalRole(newRole)

      router.refresh()
    } catch (err: any) {
      console.error(err)
      setError(err?.message || "Unbekannter Fehler beim Beitritt.")
    } finally {
      setSubmitting(false)
    }
  }

  const label = !accessToken
    ? "Anmelden, um beizutreten"
    : isPending
      ? "Anfrage gesendet"
      : "Beitreten"

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        onClick={handleJoin}
        disabled={submitting || !accessToken || isPending}
        className="inline-flex items-center rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background shadow-sm hover:brightness-110"
      >
        {submitting ? "Beitreten..." : label}
      </Button>
      {error && (
        <p className="text-[11px] text-red-500">
          {error}
        </p>
      )}
      {isPending && !error && (
        <p className="text-[11px] text-muted-foreground">
          Deine Anfrage wird von den Moderatoren geprüft.
        </p>
      )}
    </div>
  )
}

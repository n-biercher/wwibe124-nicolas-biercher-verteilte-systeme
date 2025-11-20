"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { ImagePlus, Lock, Unlock, Users, X, Trash2 } from "lucide-react"
import { useAuth } from "@/lib/authcontext"
import type { ApiCommunity } from "@/lib/types"
import { normalizeMediaUrl } from "@/lib/media-url"
import { Card, CardContent } from "@/components/ui/card"
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
  FieldSeparator,
} from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function CommunityGeneralPage() {
  const params = useParams()
  const slugParam = params?.slug
  const slug =
    typeof slugParam === "string"
      ? slugParam
      : Array.isArray(slugParam)
        ? slugParam[0]
        : undefined

  const { accessToken, logout } = useAuth()

  const [community, setCommunity] = React.useState<ApiCommunity | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

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

        const res = await fetch(
          `/api/communities/${encodeURIComponent(slug!)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          },
        )

        if (!res.ok) {
          const text = await res.text()
          console.error(
            "Fehler beim Laden der Community für Manage/General:",
            res.status,
            text,
          )
          if (res.status === 404) {
            throw new Error("Community nicht gefunden.")
          }
          if (res.status === 403) {
            throw new Error(
              "Keine Berechtigung, diese Community zu verwalten.",
            )
          }
          throw new Error("Fehler beim Laden der Community.")
        }

        const data = (await res.json()) as ApiCommunity
        if (isMounted) {
          setCommunity(data)
        }
      } catch (err: any) {
        console.error(err)
        if (isMounted) {
          logout()
          setError(err?.message || "Fehler beim Laden der Community.")
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
  }, [slug, accessToken])

  if (!accessToken) {
    return (
      <Card className="overflow-hidden border bg-card/90">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Du bist nicht eingeloggt. Bitte melde dich an, um diese Community zu
          verwalten.
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="overflow-hidden border bg-card/90">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Lade Community-Daten...
        </CardContent>
      </Card>
    )
  }

  if (error || !community) {
    return (
      <Card className="overflow-hidden border bg-card/90">
        <CardContent className="p-4 text-sm text-red-500">
          {error ?? "Community konnte nicht geladen werden."}
        </CardContent>
      </Card>
    )
  }

  const bannerSrc = community.banner_url
    ? normalizeMediaUrl(community.banner_url)
    : null

  return (
    <Card className="overflow-hidden border bg-card/90">
      <div className="relative h-24 w-full border-b bg-muted/40 md:h-28">
        {bannerSrc ? (
          <img
            src={bannerSrc}
            alt="Banner"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Kein Banner hinterlegt
          </div>
        )}
        <div className="pointer-events-none absolute bottom-2 left-3 inline-flex items-center rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow-sm">
          <Users className="mr-1.5 h-3.5 w-3.5" />
          r/{community.slug}
        </div>
      </div>
      <CardContent className="p-4 md:p-5">
        <GeneralForm community={community} onUpdated={(updated) => setCommunity(updated)} />
      </CardContent>
    </Card>
  )
}

type GeneralFormProps = {
  community: ApiCommunity
  onUpdated: (c: ApiCommunity) => void
}

function GeneralForm({ community, onUpdated }: GeneralFormProps) {
  const { accessToken } = useAuth()
  const router = useRouter()

  const [isPrivate, setIsPrivate] = React.useState(
    community.visibility !== "public",
  )
  const [description, setDescription] = React.useState(
    community.description ?? "",
  )
  const [bannerPreview, setBannerPreview] = React.useState<string | null>(
    community.banner_url || null,
  )
  const [bannerFile, setBannerFile] = React.useState<File | null>(null)
  const [bannerRemoved, setBannerRemoved] = React.useState(false)

  const [saving, setSaving] = React.useState(false)
  const [msg, setMsg] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const [deleteConfirm, setDeleteConfirm] = React.useState("")
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  const [deleteSaving, setDeleteSaving] = React.useState(false)

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    return () => {
      if (bannerPreview && bannerPreview.startsWith("blob:")) {
        URL.revokeObjectURL(bannerPreview)
      }
    }
  }, [bannerPreview])

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Bitte eine Bilddatei auswählen.")
      return
    }
    setError(null)
    setBannerRemoved(false)
    setBannerFile(file)
    const url = URL.createObjectURL(file)
    setBannerPreview((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev)
      return url
    })
  }

  function handleRemoveBannerClick() {
    setBannerFile(null)
    setBannerRemoved(true)
    if (bannerPreview && bannerPreview.startsWith("blob:")) {
      URL.revokeObjectURL(bannerPreview)
    }
    setBannerPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  async function uploadBannerIfNeeded(): Promise<string | null> {
    if (!bannerFile) return null
    if (!accessToken) throw new Error("Nicht eingeloggt (kein Access-Token).")

    const formData = new FormData()
    formData.append("file", bannerFile)

    const res = await fetch("/api/uploads/community-image", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    })

    if (!res.ok) {
      let msg = "Banner-Upload fehlgeschlagen."
      try {
        const data = await res.json()
        if (data.detail) msg = data.detail as string
      } catch (err: any) {
        console.log(err)
      }
      throw new Error(msg)
    }

    const data = (await res.json()) as { url: string }
    return data.url
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setMsg(null)

    if (!accessToken) {
      setError("Nicht eingeloggt.")
      return
    }

    setSaving(true)
    try {
      const visibility = isPrivate ? "restricted" : "public"

      let bannerUrl: string | null | undefined = undefined

      if (bannerFile) {
        bannerUrl = await uploadBannerIfNeeded()
      } else if (bannerRemoved) {
        bannerUrl = ""
      }

      const payload: Partial<ApiCommunity> = {
        description,
        visibility,
      }

      if (bannerUrl !== undefined) {
        payload.banner_url = bannerUrl
      }

      const res = await fetch(
        `/api/communities/${encodeURIComponent(community.slug)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        },
      )

      if (!res.ok) {
        console.error(
          "Fehler beim Speichern der Community-Settings:",
          res.status,
          await res.text(),
        )
        if (res.status === 403) {
          throw new Error(
            "Du hast keine Berechtigung, diese Community zu bearbeiten.",
          )
        }
        throw new Error("Speichern fehlgeschlagen.")
      }

      const updated = (await res.json()) as ApiCommunity
      onUpdated(updated)
      setMsg("Änderungen wurden gespeichert.")
      setError(null)
      setBannerRemoved(false)
    } catch (err: any) {
      console.error(err)
      setError(err?.message || "Speichern fehlgeschlagen.")
    } finally {
      setSaving(false)
    }
  }

  const canDelete = community.my_role === "owner"

  async function handleDeleteCommunity(e: React.FormEvent) {
    e.preventDefault()
    setDeleteError(null)

    if (!accessToken) {
      setDeleteError("Nicht eingeloggt.")
      return
    }

    const expected = `r/${community.slug}`
    if (deleteConfirm.trim() !== expected) {
      setDeleteError(
        `Bitte gib exakt "${expected}" ein, um die Community zu löschen.`,
      )
      return
    }

    setDeleteSaving(true)
    try {
      const res = await fetch(
        `/api/communities/${encodeURIComponent(community.slug)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )

      if (!res.ok && res.status !== 204) {
        const text = await res.text()
        let msg = "Community konnte nicht gelöscht werden."
        try {
          const data = JSON.parse(text)
          if (data.detail) msg = data.detail
        } catch (err: any) {
          console.log(err)
        }
        throw new Error(msg)
      }
      
      router.push("/community/manage")
    } catch (err: any) {
      console.error(err)
      setDeleteError(
        err?.message || "Community konnte nicht gelöscht werden.",
      )
    } finally {
      setDeleteSaving(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Allgemein
              </h2>
              <p className="text-xs text-muted-foreground">
                Status, Beschreibung und Banner dieser Community.
              </p>
            </div>
            <Badge
              variant={isPrivate ? "outline" : "default"}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px]"
            >
              {isPrivate ? (
                <>
                  <Lock className="h-3 w-3" />
                  Privat
                </>
              ) : (
                <>
                  <Unlock className="h-3 w-3" />
                  Öffentlich
                </>
              )}
            </Badge>
          </div>
          {error && <p className="mb-1 text-xs text-red-500">{error}</p>}
          {msg && <p className="mb-1 text-xs text-emerald-500">{msg}</p>}
          <Field>
            <FieldLabel>Status</FieldLabel>
            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
              <div className="space-y-0.5">
                <p className="text-xs font-medium">
                  {isPrivate
                    ? "Private Community"
                    : "Öffentliche Community"}
                </p>
                <FieldDescription>
                  Steuert, wer Inhalte sehen und beitreten kann.
                </FieldDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsPrivate((v) => !v)}
              >
                {isPrivate ? "Öffentlich machen" : "Privat machen"}
              </Button>
            </div>
          </Field>
          <Field>
            <FieldLabel>Beschreibung</FieldLabel>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Worum geht es in dieser Community?"
            />
            <FieldDescription>
              Wird oben in der Community angezeigt.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Bannerbild</FieldLabel>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerChange}
            />
            <div className="flex flex-col gap-2 rounded-md border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ImagePlus className="h-4 w-4" />
                  <span>Breites Bild (ca. 1600×400px) für das Banner.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Bild wählen
                  </Button>
                  {(bannerPreview || community.banner_url) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600"
                      onClick={handleRemoveBannerClick}
                    >
                      <X className="mr-1.5 h-3 w-3" />
                      Banner entfernen
                    </Button>
                  )}
                </div>
              </div>
              {bannerFile && (
                <div className="rounded-md bg-background px-3 py-1.5">
                  Ausgewählt:{" "}
                  <span className="font-medium text-foreground">
                    {bannerFile.name}
                  </span>{" "}
                  ({Math.round(bannerFile.size / 1024)} kB)
                </div>
              )}
              {bannerRemoved && !bannerFile && (
                <div className="rounded-md bg-background px-3 py-1.5 text-[11px] text-red-500">
                  Banner wird beim Speichern entfernt.
                </div>
              )}
            </div>
            <FieldDescription>
              Neues Banner hochladen oder das bestehende Banner entfernen und
              dann speichern.
            </FieldDescription>
          </Field>
          <Field>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Speichere..." : "Änderungen speichern"}
            </Button>
          </Field>
          <FieldSeparator />
        </FieldGroup>
      </form>

      {canDelete && (
        <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-destructive">
                Community löschen
              </h2>
              <p className="text-xs text-destructive/80">
                Dies kann nicht rückgängig gemacht werden und löscht alle
                Inhalte von r/{community.slug}.
              </p>
            </div>
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          {deleteError && (
            <p className="text-xs text-destructive">{deleteError}</p>
          )}
          <form
            onSubmit={handleDeleteCommunity}
            className="mt-2 space-y-2 text-xs"
          >
            <Field>
              <FieldLabel htmlFor="delete_confirm">
                Bestätigung
              </FieldLabel>
              <input
                id="delete_confirm"
                className="w-full rounded-md border bg-background px-3 py-2 text-xs"
                placeholder={`Tippe "r/${community.slug}" zum Bestätigen`}
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
              />
              <FieldDescription>
                Zur Sicherheit musst du den Community-Slug exakt eingeben.
              </FieldDescription>
            </Field>
            <Field>
              <Button
                type="submit"
                variant="destructive"
                className="w-full"
                disabled={deleteSaving}
              >
                {deleteSaving
                  ? "Lösche Community..."
                  : "Community dauerhaft löschen"}
              </Button>
            </Field>
          </form>
        </div>
      )}
    </>
  )
}

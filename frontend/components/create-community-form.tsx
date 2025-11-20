"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ImagePlus, Users } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/authcontext"

export function CreateCommunityForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const { accessToken } = useAuth()

  const [name, setName] = React.useState("")
  const [slug, setSlug] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [slugTouched, setSlugTouched] = React.useState(false)

  const [bannerFile, setBannerFile] = React.useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!slugTouched) {
      const newSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
      setSlug(newSlug)
    }
  }, [name, slugTouched])

  React.useEffect(() => {
    return () => {
      if (bannerPreview) {
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
    setBannerFile(file)

    const url = URL.createObjectURL(file)
    setBannerPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
  }

  function handleRemoveBanner() {
    setBannerFile(null)
    if (bannerPreview) URL.revokeObjectURL(bannerPreview)
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
    } catch {
    }
    throw new Error(msg)
  }

  const data = (await res.json()) as { url: string }
  return data.url
}

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!name.trim()) {
      setError("Bitte einen Namen angeben.")
      return
    }

    if (!slug.trim()) {
      setError("Bitte einen gültigen Slug angeben.")
      return
    }

    if (!accessToken) {
      setError("Du bist nicht eingeloggt. Bitte melde dich erneut an.")
      return
    }

    setSubmitting(true)

    try {
      let bannerUrl: string | null = null
      if (bannerFile) {
        bannerUrl = await uploadBannerIfNeeded()
      }

      const payload: Record<string, any> = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
      }
      if (bannerUrl) {
        payload.banner_url = bannerUrl
      }

      const res = await fetch("/api/communities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let msg = "Community konnte nicht erstellt werden."
        try {
          const data = await res.json()
          if (data.detail) msg = data.detail as string
          else if (data.slug?.[0]) msg = data.slug[0] as string
          else if (data.name?.[0]) msg = data.name[0] as string
        } catch (err: any) {
          console.log(err)
        }
        throw new Error(msg)
      }

      const data = (await res.json()) as { slug: string }
      const finalSlug = data.slug || slug

      setSuccess(`Community r/${finalSlug} wurde erstellt.`)
      router.push(`/community/${finalSlug}`)
    } catch (err: any) {
      console.error("Create community error:", err)
      setError(
        err?.message || "Unbekannter Fehler beim Erstellen der Community.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-5 rounded-xl border bg-card/95 p-6 shadow-lg md:p-7",
        className,
      )}
      {...props}
    >
      <div className="overflow-hidden rounded-lg border bg-muted/40">
        <div className="relative h-24 w-full md:h-28">
          {bannerPreview ? (
            <img
              src={bannerPreview}
              alt="Community-Banner Vorschau"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              Kein Banner ausgewählt – optional
            </div>
          )}

          <div className="pointer-events-none absolute bottom-2 left-3 inline-flex items-center rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow-sm">
            <Users className="mr-1.5 h-3 w-3" />
            <span>{slug ? `r/${slug}` : "r/deine-community"}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="mb-2 flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/80">
                <Users className="h-4 w-4" />
              </div>
              <span>Community konfigurieren</span>
            </div>
            <h2 className="text-lg font-semibold">
              Basisdaten deiner Community
            </h2>
            <FieldDescription>
              Name, Slug und Beschreibung bestimmen, wie deine Community nach außen wirkt.
            </FieldDescription>
          </div>

          {error && (
            <p className="mt-1 text-sm text-red-500">{error}</p>
          )}
          {success && (
            <p className="mt-1 text-sm text-emerald-500">{success}</p>
          )}
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              placeholder="Mein Restaurant-Feedback"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <FieldDescription>
              Der sichtbare Titel deiner Community.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="slug">Slug</FieldLabel>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">r/</span>
              <Input
                id="slug"
                placeholder="meine-community"
                required
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(e.target.value)
                }}
                onBlur={() => setSlugTouched(true)}
              />
            </div>
            <FieldDescription>
              URL-Name deiner Community, nur Kleinbuchstaben, Zahlen und Bindestriche.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="description">Beschreibung</FieldLabel>
            <Textarea
              id="description"
              placeholder="Worum geht es in deiner Community?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
            <FieldDescription>
              Kurz und knackig – erscheint oben in deiner Community.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Bannerbild (optional)</FieldLabel>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerChange}
            />
            <div className="flex flex-col gap-2 rounded-md border border-dashed bg-muted/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ImagePlus className="h-4 w-4" />
                  <span>
                    Lade ein breites Bild hoch (z.&nbsp;B. 1600×400px) für das
                    Community-Banner.
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Bild wählen
                </Button>
              </div>
              {bannerFile && (
                <div className="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-2 text-xs">
                  <span className="truncate">
                    {bannerFile.name} ({Math.round(bannerFile.size / 1024)} kB)
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleRemoveBanner}
                  >
                    Entfernen
                  </Button>
                </div>
              )}
            </div>
          </Field>
          <Field>
            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? "Community wird erstellt..." : "Community erstellen"}
            </Button>
          </Field>
          <FieldSeparator />
          <FieldDescription className="text-xs">
            Du kannst Name, Beschreibung & Banner später jederzeit anpassen.
          </FieldDescription>
        </FieldGroup>
      </form>
    </div>
  )
}

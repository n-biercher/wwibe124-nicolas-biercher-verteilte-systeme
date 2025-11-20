"use client"

import * as React from "react"
import Image from "next/image"
import { Camera, Mail, User, ShieldCheck, Lock, Trash2 } from "lucide-react"

import { useAuth } from "@/lib/authcontext"
import { normalizeMediaUrl } from "@/lib/media-url"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_BASE!

export function AccountContent() {
  const { user, accessToken } = useAuth()

  if (!user || !accessToken) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 md:py-10">
        <p className="text-sm text-muted-foreground">
          Du bist nicht eingeloggt. Bitte melde dich an, um deinen Account zu verwalten.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:py-10">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Dein Account
        </h1>
        <p className="text-sm text-muted-foreground">
          Hier kannst du dein Profilbild und dein Passwort verwalten.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
        <ProfileCard />
        <div className="space-y-4">
          <PasswordCard />
          <DeleteAccountCard />
        </div>
      </div>
    </main>
  )
}

function ProfileCard() {
  const { user, accessToken } = useAuth()

  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(
    user?.image_url ? normalizeMediaUrl(user.image_url) : null,
  )
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    if (user?.image_url) {
      setAvatarPreview(normalizeMediaUrl(user.image_url))
    } else {
      setAvatarPreview(null)
    }
  }, [user?.image_url])

  React.useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Bitte eine Bilddatei auswählen.")
      return
    }

    setError(null)
    setAvatarFile(file)

    const url = URL.createObjectURL(file)
    setAvatarPreview((prev) => {
      if (prev && prev.startsWith("blob:")) {
        URL.revokeObjectURL(prev)
      }
      return url
    })
  }

  async function handleAvatarSave(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setError(null)

    if (!avatarFile) {
      setError("Bitte zuerst ein Bild auswählen.")
      return
    }
    if (!accessToken) {
      setError("Nicht eingeloggt.")
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("image", avatarFile)

      const res = await fetch("/api/account/me", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      })

      const data = await res.json().catch(() => ({} as any))

      if (!res.ok) {
        console.error("Avatar-Update-Fehler:", res.status, data)
        throw new Error(
          data.detail ||
            data.image ||
            data.image?.[0] ||
            "Bild konnte nicht aktualisiert werden.",
        )
      }

      if (data.image_url) {
        const proxied = normalizeMediaUrl(data.image_url)
        setAvatarPreview((prev) => {
          if (prev && prev.startsWith("blob:")) {
            URL.revokeObjectURL(prev)
          }
          return proxied
        })
      }

      setAvatarFile(null)
      setMessage("Profilbild wurde aktualisiert.")
    } catch (err: any) {
      console.error(err)
      setError(err.message ?? "Bild konnte nicht aktualisiert werden.")
    } finally {
      setUploading(false)
    }
  }

  const displayName = user?.username || user?.email || "User"
  const initials = displayName[0]?.toUpperCase() ?? "U"

  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <FieldGroup>
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Profil
            </h2>
            <p className="text-sm text-muted-foreground">
              Basisdaten deines Accounts.
            </p>
          </div>
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
        </div>
        <form onSubmit={handleAvatarSave} className="mb-4">
          <Field>
            <FieldLabel>Profilbild</FieldLabel>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="relative h-16 w-16 overflow-hidden rounded-xl border bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
                  {avatarPreview ? (
                    <Image
                      src={avatarPreview}
                      alt={displayName}
                      fill
                      sizes="64px"
                      className="object-cover"
                      loader={({ src }) => src}
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -right-1 -bottom-1 inline-flex h-7 w-7 items-center justify-center rounded-full border bg-background text-[11px] shadow-sm hover:bg-muted"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  Neues Bild hochladen
                </span>
                <span>Empfohlen: quadratisch, mind. 256×256px.</span>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Datei wählen
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={uploading || !avatarFile}
                  >
                    {uploading ? "Speichere..." : "Speichern"}
                  </Button>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </Field>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          {message && (
            <p className="mt-2 text-xs text-emerald-500">{message}</p>
          )}
        </form>
        <FieldSeparator />
        <Field>
          <FieldLabel>E-Mail</FieldLabel>
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{user?.email}</span>
          </div>
          <FieldDescription>
            Deine Login-Adresse. Änderungen sind aktuell nicht im UI möglich.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel>Benutzername</FieldLabel>
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{user?.username}</span>
          </div>
          <FieldDescription>
            Öffentlicher Name, der z.&nbsp;B. bei Posts angezeigt wird.
          </FieldDescription>
        </Field>
      </FieldGroup>
    </section>
  )
}


function PasswordCard() {
  const { accessToken } = useAuth()
  const [oldPassword, setOldPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [newPassword2, setNewPassword2] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [message, setMessage] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (newPassword !== newPassword2) {
      setError("Die neuen Passwörter stimmen nicht überein.")
      return
    }
    if (!accessToken) {
      setError("Nicht eingeloggt.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/account/change-password", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    old_password: oldPassword,
    new_password: newPassword,
  }),
})

      const data = await res.json().catch(() => ({} as any))

      if (!res.ok) {
        throw new Error(
          data.detail || "Passwort konnte nicht geändert werden.",
        )
      }

      setMessage("Dein Passwort wurde aktualisiert.")
      setOldPassword("")
      setNewPassword("")
      setNewPassword2("")
    } catch (err: any) {
      setError(err.message ?? "Passwort konnte nicht geändert werden.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Sicherheit
              </h2>
              <p className="text-sm text-muted-foreground">
                Ändere regelmäßig dein Passwort.
              </p>
            </div>
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          {error && (
            <p className="mb-2 text-xs text-red-500">{error}</p>
          )}
          {message && (
            <p className="mb-2 text-xs text-emerald-500">{message}</p>
          )}
          <Field>
            <FieldLabel htmlFor="old_password">Aktuelles Passwort</FieldLabel>
            <Input
              id="old_password"
              type="password"
              autoComplete="current-password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="new_password">Neues Passwort</FieldLabel>
            <Input
              id="new_password"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <FieldDescription>
              Nutze ein sicheres Passwort mit Buchstaben, Zahlen und Sonderzeichen.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="new_password2">
              Neues Passwort wiederholen
            </FieldLabel>
            <Input
              id="new_password2"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
            />
          </Field>
          <Field>
            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? "Aktualisiere..." : "Passwort ändern"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </section>
  )
}


function DeleteAccountCard() {
  const { accessToken, logout } = useAuth()
  const [confirmText, setConfirmText] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (confirmText !== "LÖSCHEN") {
      setError('Bitte gib "LÖSCHEN" ein, um zu bestätigen.')
      return
    }
    if (!accessToken) {
      setError("Nicht eingeloggt.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/delete-account/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({} as any))
        throw new Error(
          data.detail || "Konto konnte nicht gelöscht werden.",
        )
      }

      logout()
    } catch (err: any) {
      setError(err.message ?? "Konto konnte nicht gelöscht werden.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-lg border border-destructive/40 bg-destructive/5 p-5 shadow-sm">
      <form onSubmit={handleDelete}>
        <FieldGroup>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-destructive">
                Konto löschen
              </h2>
              <p className="text-xs text-destructive/80">
                Dies kann nicht rückgängig gemacht werden.
              </p>
            </div>
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          {error && (
            <p className="mb-2 text-xs text-destructive">
              {error}
            </p>
          )}
          <Field>
            <FieldLabel htmlFor="confirm_delete">
              Bestätigung
            </FieldLabel>
            <Input
              id="confirm_delete"
              placeholder='Tippe "LÖSCHEN" zum Bestätigen'
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </Field>
          <Field>
            <Button
              type="submit"
              variant="destructive"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? "Lösche..." : "Konto dauerhaft löschen"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </section>
  )
}

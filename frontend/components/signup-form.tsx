"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { GalleryVerticalEnd } from "lucide-react"
import Link from "next/link"

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
import { useAuth } from "@/lib/authcontext"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const { register } = useAuth()

  const [email, setEmail] = React.useState("")
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [password2, setPassword2] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== password2) {
      setError("Die Passwörter stimmen nicht überein.")
      return
    }

    setLoading(true)
    try {
      await register({ email, username, password })
      router.push("/")
    } catch (err: any) {
      setError(err.message ?? "Registrierung fehlgeschlagen")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <button
              type="button"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">RED.</span>
            </button>
            <h1 className="text-xl font-bold">Willkommen bei RED</h1>
            <FieldDescription>
              Du hast bereits einen Account?{" "}
              <Link href="/login" className="underline">
                Jetzt einloggen
              </Link>
            </FieldDescription>
          </div>

          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="username">Nutzername</FieldLabel>
            <Input
              id="username"
              type="text"
              placeholder="Dein Nutzername"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Passwort</FieldLabel>
            <Input
              id="password"
              type="password"
              placeholder="********"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password2">Passwort wiederholen</FieldLabel>
            <Input
              id="password2"
              type="password"
              placeholder="********"
              required
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
          </Field>
          <Field>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Account wird erstellt..." : "Create Account"}
            </Button>
          </Field>
          <FieldSeparator />
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        Danke fürs Registrieren
      </FieldDescription>
    </div>
  )
}

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/lib/authcontext"
import { Navbar } from "@/components/navbar"
import { CreateCommunityForm } from "@/components/create-community-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Sparkles, ShieldCheck, Globe2, Lock } from "lucide-react"

export default function CreateCommunityPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/community/new")
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="min-h-svh bg-background">
        <Navbar />
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-muted-foreground">
          Laden...
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-svh bg-gradient-to-b from-background via-muted/40 to-background">
      <Navbar />

      <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-5xl flex-col gap-6 px-4 py-8 md:px-6 lg:py-10">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Neue Community erstellen</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Baue deinen eigenen Space auf
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Erstelle eine Community für dein Projekt, dein Team oder deine Interessen –
            mit eigenem Banner, Beschreibung und klarer Identität.
          </p>
        </header>
        <div className="grid flex-1 gap-6 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)] items-start">
          <CreateCommunityForm className="h-full" />
          <Card className="h-full border bg-card/90 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Hinweise & Beispiele</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <h2 className="text-sm font-medium">Gute Namen & Slugs</h2>
                <p className="text-xs text-muted-foreground">
                  Wähle einen klaren, merkbaren Namen – der Slug wird später deine URL:
                </p>
                <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                  <li>
                    <Badge variant="outline" className="mr-1 text-[11px]">
                      r/lydo
                    </Badge>
                    für dein Produkt oder Startup
                  </li>
                  <li>
                    <Badge variant="outline" className="mr-1 text-[11px]">
                      r/restaurant-feedback
                    </Badge>
                    für Kundenfeedback & Ideen
                  </li>
                  <li>
                    <Badge variant="outline" className="mr-1 text-[11px]">
                      r/team-internal
                    </Badge>
                    für dein internes Team
                  </li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-sm font-medium">Banner-Empfehlungen</h2>
                <p className="text-xs text-muted-foreground">
                  Nutze ein breites, ruhiges Bild (z.&nbsp;B. 1600×400px).
                  Achte darauf, dass Text im Banner nicht zu klein ist und
                  zentral platziert wird.
                </p>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-sm font-medium">Zugriff & Moderation</h2>
                <p className="text-xs text-muted-foreground">
                  In den Community-Einstellungen kannst du später festlegen, wer posten darf
                  und wie streng moderiert wird.
                </p>
                <div className="flex flex-wrap gap-2 pt-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                    <Globe2 className="h-3 w-3" />
                    Public
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                    <Lock className="h-3 w-3" />
                    Restricted
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                    <ShieldCheck className="h-3 w-3" />
                    Owner & Mods
                  </span>
                </div>
              </div>

              <div className="rounded-md border border-dashed bg-muted/40 p-3 text-[11px] text-muted-foreground">
                Tipp: Du kannst Name, Beschreibung und Banner später jederzeit anpassen –
                wichtig ist nur, dass der Slug sauber gewählt ist, da er deine URL bestimmt.
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

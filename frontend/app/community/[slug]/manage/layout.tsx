"use client"

import * as React from "react"
import Link from "next/link"
import { Settings, Users, Shield, MessageSquare, ArrowLeft } from "lucide-react"

import { Navbar } from "@/components/navbar"
import { useAuth } from "@/lib/authcontext"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { useParams, usePathname, useRouter } from "next/navigation"

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const slugParam = params?.slug
  const slug =
    typeof slugParam === "string"
      ? slugParam
      : Array.isArray(slugParam)
      ? slugParam[0]
      : undefined

  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="min-h-svh bg-background">
        <Navbar />
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-muted-foreground">
          Lade...
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-svh bg-background">
        <Navbar />
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-muted-foreground">
          Weiterleitung zum Login...
        </div>
      </div>
    )
  }

  if (!slug) {
    return (
      <div className="min-h-svh bg-background">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 pb-10 pt-6 md:px-6 md:pt-8">
          <p className="text-sm text-red-500">
            Ungültige URL: Kein Community-Slug gefunden.
          </p>
        </main>
      </div>
    )
  }

  const base = `/community/${slug}/manage`
  const tabs = [
    { href: `${base}/general`, label: "Allgemein", icon: Settings },
    { href: `${base}/members`, label: "Mitglieder", icon: Users },
    { href: `${base}/posts`, label: "Beiträge", icon: MessageSquare },
  ]

  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-10 pt-6 md:px-6 md:pt-8">
        <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => router.push(`/community/manage`)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Zu deiner Community Übersicht
            </button>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              r/{slug} verwalten
            </h1>
            <p className="text-sm text-muted-foreground">
              Verwaltung für Status, Mitglieder, Moderatoren und Beiträge.
            </p>
          </div>
        </div>
        <div className="mb-6 flex flex-wrap items-center gap-2 border-b pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = pathname.startsWith(tab.href)
            return (
              <Button
                key={tab.href}
                asChild
                size="sm"
                variant={active ? "default" : "ghost"}
                className={cn(
                  "gap-1.5 rounded-full px-3 text-xs",
                  active && "shadow-sm",
                )}
              >
                <Link href={tab.href}>
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </Link>
              </Button>
            )
          })}
        </div>
        {children}
      </main>
    </div>
  )
}

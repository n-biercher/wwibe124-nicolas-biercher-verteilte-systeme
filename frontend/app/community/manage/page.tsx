"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { useAuth } from "@/lib/authcontext"
import { CommunitiesManageContent } from "@/components/communities-manage-content"

export default function CommunitiesManagePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="min-h-svh">
        <Navbar />
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-muted-foreground">
          Lade deine Communities...
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <CommunitiesManageContent />
    </div>
  )
}

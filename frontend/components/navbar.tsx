"use client"

import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { NavUser } from "./navuser"
import { useAuth } from "@/lib/authcontext"

export function Navbar() {
  const { user, loading, logout } = useAuth()

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background/80 px-4 backdrop-blur">
      <div className="flex flex-1 items-center gap-2">
        <Link href="/" className="font-semibold tracking-tight">
          RED
        </Link>
      </div>
      {loading ? null : user ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {user.username}
          </span>
          <NavUser user={user} onLogout={logout} />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button size="sm">Login</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" variant="outline">
              Registrieren
            </Button>
          </Link>
          <Avatar className="h-8 w-8">
            <AvatarFallback>?</AvatarFallback>
          </Avatar>
        </div>
      )}
    </header>
  )
}

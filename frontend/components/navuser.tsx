"use client"

import { BadgeCheck, ChevronDown, LogOut } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

import type { User } from "@/lib/authcontext"
import { normalizeMediaUrl } from "@/lib/media-url"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type NavUserProps = {
  onLogout?: () => Promise<void> | void
  user: User
}

export function NavUser({ onLogout, user }: NavUserProps) {
  const fallbackInitial =
    user.username?.[0]?.toUpperCase() ??
    user.email?.[0]?.toUpperCase() ??
    "N"

  const avatarSrc = user.image_url
    ? normalizeMediaUrl(user.image_url)
    : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex cursor-pointer flex-row items-center gap-3">
          <div className="relative h-8 w-8 overflow-hidden rounded-lg border bg-muted text-xs font-semibold text-muted-foreground flex items-center justify-center">
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt={user.username || user.email || "Profilbild"}
                fill
                sizes="32px"
                className="object-cover"
                loader={({ src }) => src}
              />
            ) : (
              <span>{fallbackInitial}</span>
            )}
          </div>
          <ChevronDown className="size-3" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
        side="right"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg border bg-muted text-xs font-semibold text-muted-foreground flex items-center justify-center">
              {avatarSrc ? (
                <Image
                  src={avatarSrc}
                  alt={user.username || user.email || "Profilbild"}
                  fill
                  sizes="32px"
                  className="object-cover"
                  loader={({ src }) => src}
                />
              ) : (
                <span>{fallbackInitial}</span>
              )}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
                {user.username}
              </span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/community/manage" className="flex items-center gap-2">
              <BadgeCheck className="size-4" />
              <span>Deine Communities</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account" className="flex items-center gap-2">
              <BadgeCheck className="size-4" />
              <span>Account</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async (e) => {
            e.preventDefault()
            if (onLogout) {
              await onLogout()
            }
          }}
        >
          <LogOut className="mr-2 size-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

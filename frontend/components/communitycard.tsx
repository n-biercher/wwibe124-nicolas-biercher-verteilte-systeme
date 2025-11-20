"use client"

import Link from "next/link"
import Image from "next/image"
import { Users, MessageSquare, Lock, Globe2, Crown } from "lucide-react"

import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import type { CommunityCardProps } from "@/lib/types"
import { normalizeMediaUrl } from "@/lib/media-url"

export function CommunityCard(props: CommunityCardProps) {
  const created =
    props.createdAt &&
    new Date(props.createdAt).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })

  const visibilityLabel =
    props.visibility === "public"
      ? "Öffentlich"
      : props.visibility === "restricted"
        ? "Privat"
        : props.visibility

  const roleLabel =
    props.myRole === "owner"
      ? "Owner"
      : props.myRole === "moderator"
        ? "Moderator"
        : props.myRole === "member"
          ? "Mitglied"
          : null

  const bannerSrc =
    props.bannerUrl && props.bannerUrl.trim() !== ""
      ? normalizeMediaUrl(props.bannerUrl)
      : null

  return (
    <Link
      href={`/community/${props.slug}`}
      className="group block h-full"
      prefetch={false}
    >
      <Card className="flex h-full flex-col overflow-hidden border bg-card/80 transition-all group-hover:-translate-y-[1px] group-hover:border-foreground/30 group-hover:shadow-md">
        {bannerSrc && (
          <div className="relative h-24 w-full overflow-hidden md:h-28">
            <Image
              src={bannerSrc}
              alt={props.name ?? "Community Banner"}
              fill
              sizes="(max-width: 768px) 100vw, 600px"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loader={({ src }) => src}
            />
            <div className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium shadow">
              <span className="mr-1 text-xs text-muted-foreground">r/</span>
              <span className="truncate max-w-[150px] md:max-w-[180px]">
                {props.slug}
              </span>
            </div>
          </div>
        )}

        <CardHeader className="space-y-2 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold leading-tight">
              {props.name}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em]"
              >
                {props.visibility === "public" ? (
                  <Globe2 className="h-3 w-3" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
                {visibilityLabel}
              </Badge>
              {roleLabel && (
                <Badge
                  variant="secondary"
                  className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em]"
                >
                  {props.myRole === "owner" && <Crown className="h-3 w-3" />}
                  {roleLabel}
                </Badge>
              )}
            </div>
          </div>
          {props.description && (
            <p className="line-clamp-3 text-[0.85rem] leading-relaxed text-muted-foreground">
              {props.description}
            </p>
          )}
        </CardHeader>

        <CardContent className="mt-auto space-y-3 pb-3 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">
                  {props.membersCount.toLocaleString("de-DE")}
                </span>
                <span>Mitglieder</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">
                  {props.postsCount.toLocaleString("de-DE")}
                </span>
                <span>Beiträge</span>
              </span>
            </div>
            {created && (
              <span className="text-[10px]">
                Seit <span className="font-medium">{created}</span>
              </span>
            )}
          </div>
          <div className="flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
            <span className="line-clamp-1">
              Community öffnen, Beiträge lesen & diskutieren.
            </span>
            <span className="text-xs font-medium text-foreground group-hover:underline">
              Ansehen →
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

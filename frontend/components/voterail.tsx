"use client"

import { ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

type VoteRailProps = {
  count: number
  myVote?: number
  pending?: boolean
  onUp: () => void
  onDown: () => void
}

export function VoteRail({
  count,
  myVote = 0,
  pending = false,
  onUp,
  onDown,
}: VoteRailProps) {
  const isUpvoted = myVote === 1
  const isDownvoted = myVote === -1

  return (
    <div className="flex w-10 flex-col items-center gap-1 border-r bg-muted/40 px-1 py-2 text-xs">
      <button
        type="button"
        aria-label="Upvote"
        disabled={pending}
        onClick={onUp}
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded transition",
          "hover:bg-background",
          pending && "opacity-60 cursor-not-allowed",
          isUpvoted && "text-orange-500",
        )}
      >
        <ArrowUp className="h-4 w-4" />
      </button>

      <span className="text-xs font-medium tabular-nums">
        {count}
      </span>

      <button
        type="button"
        aria-label="Downvote"
        disabled={pending}
        onClick={onDown}
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded transition",
          "hover:bg-background",
          pending && "opacity-60 cursor-not-allowed",
          isDownvoted && "text-sky-500",
        )}
      >
        <ArrowDown className="h-4 w-4" />
      </button>
    </div>
  )
}

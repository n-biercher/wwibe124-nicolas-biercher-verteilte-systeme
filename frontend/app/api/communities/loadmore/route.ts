import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const DJANGO_API_BASE = process.env.DJANGO_API_BASE!
const BASE_PATH = "/api/communities/"

function normalizeNext(next: string | null | undefined): string | null {
  if (!next) return null
  try {
    const u = new URL(next)
    return u.pathname + u.search
  } catch {
    return next
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const rawNext = searchParams.get("next")

    const path = rawNext ? normalizeNext(rawNext) : BASE_PATH

    if (!path) {
      return NextResponse.json(
        { items: [], next: null },
        { status: 200 },
      )
    }

    const cookieStore = await cookies()
    const access = cookieStore.get("access")?.value

    const url = `${DJANGO_API_BASE}${path}`

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
      cache: "no-store",
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      console.error("loadmore proxy error:", res.status, text)
      return NextResponse.json(
        { error: "Fehler beim Laden der Communities." },
        { status: res.status },
      )
    }

    const data = await res.json()
    const items = data.results ?? []
    const next = normalizeNext(data.next ?? null)

    return NextResponse.json({ items, next }, { status: 200 })
  } catch (err) {
    console.error("loadmore handler error:", err)
    return NextResponse.json(
      { error: "Unerwarteter Fehler im Loadmore-Handler." },
      { status: 500 },
    )
  }
}

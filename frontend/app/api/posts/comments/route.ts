import { NextRequest, NextResponse } from "next/server"

const API_BASE =
  process.env.DJANGO_API_BASE || process.env.NEXT_PUBLIC_DJANGO_API_BASE || ""

function getApiBaseOrError() {
  if (!API_BASE) {
    console.error(
      "[posts/comments] DJANGO_API_BASE / NEXT_PUBLIC_DJANGO_API_BASE ist nicht gesetzt.",
    )
    return null
  }
  return API_BASE.replace(/\/$/, "")
}

function buildHeaders(req: NextRequest, withJson = false): HeadersInit {
  const headers: HeadersInit = {}
  if (withJson) {
    headers["Content-Type"] = "application/json"
  }

  const auth = req.headers.get("authorization")
  if (auth) headers["Authorization"] = auth

  return headers
}

export async function GET(req: NextRequest) {
  const base = getApiBaseOrError()
  if (!base) {
    return NextResponse.json(
      { detail: "Server-Konfiguration fehlt (DJANGO_API_BASE)." },
      { status: 500 },
    )
  }

  try {
    const { searchParams } = req.nextUrl
    const postId = searchParams.get("postId")
    const next = searchParams.get("next")

    if (!postId && !next) {
      return NextResponse.json(
        { detail: "postId oder next muss angegeben werden." },
        { status: 400 },
      )
    }

    let targetUrl: string
    if (next) {
      targetUrl = next
    } else {
      const url = new URL(
        `${base}/api/posts/${encodeURIComponent(postId!)}/comments/`,
      )
      url.searchParams.set("parent", "null")
      targetUrl = url.toString()
    }

    const upstream = await fetch(targetUrl, {
      method: "GET",
      headers: buildHeaders(req),
    })

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "")
      console.error(
        "[posts/comments GET] Django-Fehler:",
        upstream.status,
        text,
      )
      return NextResponse.json(
        { detail: "Kommentare konnten nicht geladen werden." },
        { status: upstream.status },
      )
    }

    const data = await upstream.json()
    const items = Array.isArray(data) ? data : data.results ?? []
    const nextPage =
      typeof data === "object" && data !== null ? data.next ?? null : null

    return NextResponse.json({ items, next: nextPage })
  } catch (err: any) {
    console.error("Unerwarteter Fehler in GET /api/posts/comments:", err)
    return NextResponse.json(
      { detail: "Interner Fehler beim Laden der Kommentare." },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const base = getApiBaseOrError()
  if (!base) {
    return NextResponse.json(
      { detail: "Server-Konfiguration fehlt (DJANGO_API_BASE)." },
      { status: 500 },
    )
  }

  try {
    const payload = await req.json().catch(() => null)

    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        { detail: "Ungültiger Request-Body." },
        { status: 400 },
      )
    }

    const { postId, body, parent = null } = payload as {
      postId?: number | string
      body?: string
      parent?: number | null
    }

    if (!postId) {
      return NextResponse.json(
        { detail: "postId ist erforderlich." },
        { status: 400 },
      )
    }
    if (!body || !body.toString().trim()) {
      return NextResponse.json(
        { detail: "Kommentartext darf nicht leer sein." },
        { status: 400 },
      )
    }

    const djangoUrl = `${base}/api/posts/${encodeURIComponent(
      String(postId),
    )}/comments/`

    const upstream = await fetch(djangoUrl, {
      method: "POST",
      headers: buildHeaders(req, true),
      body: JSON.stringify({
        body: body.toString().trim(),
        parent,
      }),
    })

    const text = await upstream.text().catch(() => "")

    if (!upstream.ok) {
      console.error(
        "[posts/comments POST] Django-Fehler:",
        upstream.status,
        text,
      )
      try {
        const data = JSON.parse(text)
        return NextResponse.json(data, { status: upstream.status })
      } catch {
        return NextResponse.json(
          { detail: "Kommentar konnte nicht erstellt werden." },
          { status: upstream.status },
        )
      }
    }

    try {
      const data = JSON.parse(text)
      return NextResponse.json(data, { status: 201 })
    } catch {
      return NextResponse.json(
        {
          detail:
            "Kommentar wurde erstellt, aber Antwort vom Backend konnte nicht gelesen werden.",
        },
        { status: 201 },
      )
    }
  } catch (err: any) {
    console.error("Unerwarteter Fehler in POST /api/posts/comments:", err)
    return NextResponse.json(
      { detail: "Interner Fehler beim Erstellen des Kommentars." },
      { status: 500 },
    )
  }
}

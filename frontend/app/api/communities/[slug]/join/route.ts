import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_BASE = process.env.DJANGO_API_BASE!

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  if (!DJANGO_API_BASE) {
    return NextResponse.json(
      { detail: "DJANGO_API_BASE ist nicht konfiguriert" },
      { status: 500 },
    )
  }

  const authHeader = req.headers.get("authorization") ?? undefined

  try {
    const djangoRes = await fetch(
      `${DJANGO_API_BASE}/api/communities/${encodeURIComponent(slug)}/join/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      },
    )

    const contentType =
      djangoRes.headers.get("content-type") || "application/json"
    const text = await djangoRes.text()

    return new NextResponse(text, {
      status: djangoRes.status,
      headers: {
        "content-type": contentType,
      },
    })
  } catch (err) {
    console.error("[join proxy] Fehler:", err)
    return NextResponse.json(
      { detail: "Fehler beim Proxy-Aufruf zu Django" },
      { status: 502 },
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const DJANGO_API_BASE = process.env.DJANGO_API_BASE!

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const access = cookieStore.get("access")?.value
    const authHeader = req.headers.get("authorization")
    const body = await req.text()

    const res = await fetch(`${DJANGO_API_BASE}/api/communities/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader
          ? { Authorization: authHeader }
          : access
          ? { Authorization: `Bearer ${access}` }
          : {}),
      },
      body,
    })

    const text = await res.text()

    if (!res.ok) {
      console.error("Communities POST error:", res.status, text)
      try {
        const data = JSON.parse(text)
        return NextResponse.json(data, { status: res.status })
      } catch {
        return NextResponse.json(
          { detail: "Community konnte nicht erstellt werden." },
          { status: res.status },
        )
      }
    }

    try {
      const data = JSON.parse(text)
      return NextResponse.json(data, { status: 201 })
    } catch {
      return new NextResponse(text, {
        status: 201,
        headers: {
          "Content-Type": res.headers.get("content-type") ?? "application/json",
        },
      })
    }
  } catch (err) {
    console.error("Communities POST handler error:", err)
    return NextResponse.json(
      { detail: "Unerwarteter Fehler beim Erstellen der Community." },
      { status: 500 },
    )
  }
}

import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_BASE =
  process.env.DJANGO_API_BASE ??
  process.env.NEXT_PUBLIC_DJANGO_API_BASE ??
  ""

export const runtime = "nodejs"

async function proxyPost(req: NextRequest) {
  if (!DJANGO_API_BASE) {
    return NextResponse.json(
      { detail: "DJANGO_API_BASE ist nicht konfiguriert" },
      { status: 500 },
    )
  }

  const targetUrl = `${DJANGO_API_BASE}/api/auth/change-password/`

  const headers = new Headers()
  const auth = req.headers.get("authorization")
  if (auth) {
    headers.set("authorization", auth)
  }
  headers.set("content-type", "application/json")

  let body: string
  try {
    body = await req.text()
  } catch {
    body = ""
  }

  try {
    const djangoRes = await fetch(targetUrl, {
      method: "POST",
      headers,
      body,
    })

    const text = await djangoRes.text()
    const contentType =
      djangoRes.headers.get("content-type") ?? "application/json"

    return new NextResponse(text, {
      status: djangoRes.status,
      headers: { "content-type": contentType },
    })
  } catch (err) {
    console.error("[/api/account/change-password] Proxy-Fehler:", err)
    return NextResponse.json(
      { detail: "Fehler beim Proxy-Aufruf zu Django." },
      { status: 502 },
    )
  }
}

export async function POST(req: NextRequest) {
  return proxyPost(req)
}

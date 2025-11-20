import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_BASE =
  process.env.DJANGO_API_BASE ??
  process.env.NEXT_PUBLIC_DJANGO_API_BASE ??
  ""

export const runtime = "nodejs"

async function proxyGet(req: NextRequest) {
  if (!DJANGO_API_BASE) {
    return NextResponse.json(
      { detail: "DJANGO_API_BASE ist nicht konfiguriert" },
      { status: 500 },
    )
  }

  const targetUrl = `${DJANGO_API_BASE}/api/auth/me/`

  const headers = new Headers()
  const auth = req.headers.get("authorization")
  if (auth) {
    headers.set("authorization", auth)
  }

  const djangoRes = await fetch(targetUrl, {
    method: "GET",
    headers,
  })

  const text = await djangoRes.text()
  const contentType = djangoRes.headers.get("content-type") ?? "application/json"

  return new NextResponse(text, {
    status: djangoRes.status,
    headers: { "content-type": contentType },
  })
}

async function proxyPatch(req: NextRequest) {
  if (!DJANGO_API_BASE) {
    return NextResponse.json(
      { detail: "DJANGO_API_BASE ist nicht konfiguriert" },
      { status: 500 },
    )
  }

  const targetUrl = `${DJANGO_API_BASE}/api/auth/me/`

  const headers = new Headers()
  const auth = req.headers.get("authorization")
  if (auth) {
    headers.set("authorization", auth)
  }

  const incomingForm = await req.formData()

  const outgoingForm = new FormData()
  for (const [key, value] of incomingForm.entries()) {
    outgoingForm.append(key, value as any)
  }

  try {
    const djangoRes = await fetch(targetUrl, {
      method: "PATCH",
      headers,
      body: outgoingForm as any,
    })

    const text = await djangoRes.text()
    const contentType =
      djangoRes.headers.get("content-type") ?? "application/json"

    return new NextResponse(text, {
      status: djangoRes.status,
      headers: { "content-type": contentType },
    })
  } catch (err) {
    console.error("[/api/account/me] Proxy-Fehler:", err)
    return NextResponse.json(
      { detail: "Fehler beim Proxy-Aufruf zu Django." },
      { status: 502 },
    )
  }
}

export async function GET(req: NextRequest) {
  return proxyGet(req)
}

export async function PATCH(req: NextRequest) {
  return proxyPatch(req)
}

import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_BASE =
  process.env.DJANGO_API_BASE ?? process.env.NEXT_PUBLIC_DJANGO_API_BASE ?? ""

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  if (!DJANGO_API_BASE) {
    return NextResponse.json(
      { detail: "DJANGO_API_BASE ist nicht konfiguriert" },
      { status: 500 },
    )
  }

  try {
    const auth = req.headers.get("authorization") || ""

    const formData = await req.formData()

    const djangoRes = await fetch(
      `${DJANGO_API_BASE}/api/uploads/community-image/`,
      {
        method: "POST",
        headers: {
          ...(auth ? { Authorization: auth } : {}),
        },
        body: formData as any,
      },
    )

    if (djangoRes.status === 204) {
      return new NextResponse(null, {
        status: 204,
        headers: djangoRes.headers,
      })
    }

    const text = await djangoRes.text()
    const resHeaders = new Headers()
    const djangoContentType = djangoRes.headers.get("content-type")
    if (djangoContentType) {
      resHeaders.set("content-type", djangoContentType)
    }

    return new NextResponse(text, {
      status: djangoRes.status,
      headers: resHeaders,
    })
  } catch (err) {
    console.error("[community-image upload proxy] Fehler:", err)
    return NextResponse.json(
      { detail: "Fehler beim Upload-Proxy zu Django." },
      { status: 502 },
    )
  }
}

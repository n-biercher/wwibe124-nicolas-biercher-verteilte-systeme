import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_BASE =
  process.env.DJANGO_API_BASE ?? process.env.NEXT_PUBLIC_DJANGO_API_BASE ?? ""

export async function GET(req: NextRequest) {
  if (!DJANGO_API_BASE) {
    return NextResponse.json(
      { detail: "DJANGO_API_BASE ist nicht konfiguriert" },
      { status: 500 },
    )
  }

  const auth = req.headers.get("authorization") || ""
  const url = new URL(req.url)
  const search = url.search

  const djangoRes = await fetch(
    `${DJANGO_API_BASE}/api/posts/${search}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
    },
  )

  const text = await djangoRes.text()
  return new NextResponse(text, {
    status: djangoRes.status,
    headers: {
      "Content-Type":
        djangoRes.headers.get("content-type") ?? "application/json",
    },
  })
}

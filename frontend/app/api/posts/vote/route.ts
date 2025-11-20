import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_BASE =
  process.env.DJANGO_API_BASE ?? process.env.NEXT_PUBLIC_DJANGO_API_BASE ?? ""

export async function POST(req: NextRequest) {
  if (!DJANGO_API_BASE) {
    return NextResponse.json(
      { detail: "DJANGO_API_BASE ist nicht konfiguriert" },
      { status: 500 },
    )
  }

  const auth = req.headers.get("authorization") || ""
  const bodyText = await req.text()

  let postId: number | null = null
  let value: number | null = null

  try {
    const parsed = JSON.parse(bodyText)
    postId = parsed.postId
    value = parsed.value
  } catch {
    return NextResponse.json(
      { detail: "Ungültiger Body." },
      { status: 400 },
    )
  }

  if (!postId || typeof value !== "number") {
    return NextResponse.json(
      { detail: "postId und value sind erforderlich." },
      { status: 400 },
    )
  }

  const djangoRes = await fetch(
    `${DJANGO_API_BASE}/api/posts/${postId}/vote/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify({ value }),
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

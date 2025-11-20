import { NextRequest, NextResponse } from "next/server"

const API_BASE =
  process.env.DJANGO_API_BASE ?? process.env.NEXT_PUBLIC_DJANGO_API_BASE ?? ""

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

async function getId(context: RouteContext): Promise<string> {
  const { id } = await context.params
  return id
}

export async function GET(req: NextRequest, context: RouteContext) {
  if (!API_BASE) {
    return NextResponse.json(
      { detail: "DJANGO_API_BASE ist nicht konfiguriert" },
      { status: 500 },
    )
  }

  const postId = await getId(context)

  const incomingSearchParams = req.nextUrl.searchParams
  const djangoUrl = new URL(`${API_BASE}/api/comments/`)
  djangoUrl.searchParams.set("post", postId)
  for (const [key, value] of incomingSearchParams.entries()) {
    if (key === "post") continue
    djangoUrl.searchParams.append(key, value)
  }

  const djangoRes = await fetch(djangoUrl.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: req.headers.get("authorization") ?? "",
    },
  })

  const contentType = djangoRes.headers.get("content-type") ?? ""

  if (!contentType.includes("application/json")) {
    const text = await djangoRes.text()
    return new NextResponse(text, {
      status: djangoRes.status,
      headers: { "Content-Type": contentType || "application/json" },
    })
  }

  const data = await djangoRes.json()

  if (data && typeof data === "object" && "next" in data) {
    const originalNext = data.next as string | null
    if (originalNext) {
      try {
        const originalNextUrl = new URL(originalNext)
        const search = originalNextUrl.search
        data.next = `/api/posts/${postId}/comments${search}`
      } catch {
      }
    }
  }

  return NextResponse.json(data, { status: djangoRes.status })
}

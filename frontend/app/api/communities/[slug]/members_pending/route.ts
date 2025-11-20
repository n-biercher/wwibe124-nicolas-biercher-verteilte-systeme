import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_BASE =
  process.env.DJANGO_API_BASE ?? process.env.NEXT_PUBLIC_DJANGO_API_BASE ?? ""

type RouteContext = {
  params: Promise<{
    slug: string
  }>
}

async function getSlug(context: RouteContext): Promise<string> {
  const { slug } = await context.params
  return slug
}

export async function GET(req: NextRequest, context: RouteContext) {
  if (!DJANGO_API_BASE) {
    return NextResponse.json(
      { detail: "DJANGO_API_BASE ist nicht konfiguriert" },
      { status: 500 },
    )
  }

  const slug = await getSlug(context)
  const auth = req.headers.get("authorization") || ""

  const djangoRes = await fetch(
    `${DJANGO_API_BASE}/api/communities/${encodeURIComponent(
      slug,
    )}/members_pending/`,
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

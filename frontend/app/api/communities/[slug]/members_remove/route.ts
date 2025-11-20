import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_BASE =
  process.env.DJANGO_API_BASE ?? process.env.NEXT_PUBLIC_DJANGO_API_BASE ?? ""

type RouteContext = {
  params: Promise<{ slug: string }>
}

async function getSlug(context: RouteContext): Promise<string> {
  const { slug } = await context.params
  return slug
}

export async function POST(req: NextRequest, context: RouteContext) {
  if (!DJANGO_API_BASE) {
    return NextResponse.json(
      { detail: "DJANGO_API_BASE ist nicht konfiguriert" },
      { status: 500 },
    )
  }

  const slug = await getSlug(context)
  const auth = req.headers.get("authorization") || ""
  const body = await req.text()

  const djangoRes = await fetch(
    `${DJANGO_API_BASE}/api/communities/${encodeURIComponent(
      slug,
    )}/members_remove/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
      body,
    },
  )

  const status = djangoRes.status
  const contentType =
    djangoRes.headers.get("content-type") ?? "application/json"

  if (status === 204 || status === 205 || status === 304) {
    return new NextResponse(null, {
      status,
      headers: { "Content-Type": contentType },
    })
  }

  const text = await djangoRes.text()

  return new NextResponse(text, {
    status,
    headers: {
      "Content-Type": contentType,
    },
  })
}

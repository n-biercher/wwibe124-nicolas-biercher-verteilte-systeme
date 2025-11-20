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

async function proxyCommunity(
  req: NextRequest,
  context: RouteContext,
  method: "GET" | "PATCH" | "DELETE",
) {
  if (!DJANGO_API_BASE) {
    return NextResponse.json(
      { detail: "DJANGO_API_BASE ist nicht konfiguriert" },
      { status: 500 },
    )
  }

  const slug = await getSlug(context)
  const targetUrl = `${DJANGO_API_BASE}/api/communities/${encodeURIComponent(
    slug,
  )}/`

  const headers = new Headers()
  const auth = req.headers.get("authorization")
  if (auth) {
    headers.set("authorization", auth)
  }

  let body: string | undefined

  if (method === "PATCH") {
    const contentType = req.headers.get("content-type") ?? "application/json"
    headers.set("content-type", contentType)
    body = await req.text()
  }

  const djangoRes = await fetch(targetUrl, {
    method,
    headers,
    ...(body ? { body } : {}),
  })

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
}

export async function GET(req: NextRequest, context: RouteContext) {
  return proxyCommunity(req, context, "GET")
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  return proxyCommunity(req, context, "PATCH")
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  return proxyCommunity(req, context, "DELETE")
}

import { NextRequest, NextResponse } from "next/server"

const API_BASE = process.env.DJANGO_API_BASE

if (!API_BASE) {
  console.warn(
    "[communities/[slug]/posts] DJANGO_API_BASE ist nicht gesetzt. Bitte in .env konfigurieren.",
  )
}

async function proxyToBackend(
  req: NextRequest,
  context: any,
  method: "GET" | "POST",
) {
  if (!API_BASE) {
    return NextResponse.json(
      { detail: "DJANGO_API_BASE ist nicht konfiguriert." },
      { status: 500 },
    )
  }

  const params = await context.params
  const slug = params.slug as string

  const url = new URL(req.url)
  const search = url.search || ""

  const backendUrl = `${API_BASE}/api/communities/${encodeURIComponent(
    slug,
  )}/posts/${search}`

  const headers: HeadersInit = {
    Authorization: req.headers.get("authorization") ?? "",
  }

  const init: RequestInit = { method, headers }

  if (method === "POST") {
    headers["Content-Type"] = "application/json"
    init.body = await req.text()
  }

  const backendRes = await fetch(backendUrl, init)
  const contentType =
    backendRes.headers.get("content-type") || "application/json"
  const bodyText = await backendRes.text()

  return new NextResponse(bodyText, {
    status: backendRes.status,
    headers: { "Content-Type": contentType },
  })
}

export async function GET(req: NextRequest, context: any) {
  return proxyToBackend(req, context, "GET")
}

export async function POST(req: NextRequest, context: any) {
  return proxyToBackend(req, context, "POST")
}

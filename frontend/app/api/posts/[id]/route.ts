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

export async function PATCH(req: NextRequest, context: RouteContext) {
  if (!API_BASE) {
    return NextResponse.json(
      { detail: "DJANGO_API_BASE ist nicht konfiguriert" },
      { status: 500 },
    )
  }

  const id = await getId(context)
  const body = await req.text()

  const djangoRes = await fetch(`${API_BASE}/api/posts/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: req.headers.get("authorization") ?? "",
    },
    body,
  })

  const text = await djangoRes.text()

  return new NextResponse(text, {
    status: djangoRes.status,
    headers: {
      "Content-Type":
        djangoRes.headers.get("content-type") ?? "application/json",
    },
  })
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  if (!API_BASE) {
    return NextResponse.json(
      { detail: "DJANGO_API_BASE ist nicht konfiguriert" },
      { status: 500 },
    )
  }

  const id = await getId(context)

  const djangoRes = await fetch(`${API_BASE}/api/posts/${id}/`, {
    method: "DELETE",
    headers: {
      Authorization: req.headers.get("authorization") ?? "",
    },
  })

  return new NextResponse(null, { status: djangoRes.status })
}

import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_BASE = process.env.DJANGO_API_BASE ?? process.env.NEXT_PUBLIC_DJANGO_API_BASE

export async function POST(req: NextRequest) {
  const body = await req.json()

  const djangoRes = await fetch(`${DJANGO_API_BASE}/api/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!djangoRes.ok) {
    const error = await djangoRes.json().catch(() => ({}))
    return NextResponse.json(error, { status: djangoRes.status })
  }

  const user = await djangoRes.json()
  return NextResponse.json(user, { status: 201 })
}

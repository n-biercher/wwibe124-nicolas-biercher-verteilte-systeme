import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_BASE =
  process.env.DJANGO_API_BASE ?? process.env.NEXT_PUBLIC_DJANGO_API_BASE

const cookieOptionsBase = {
  httpOnly: true,
  secure: false,
  sameSite: "lax" as const,
  path: "/",
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const djangoRes = await fetch(`${DJANGO_API_BASE}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  if (!djangoRes.ok) {
    const error = await djangoRes.json().catch(() => ({}))
    return NextResponse.json(error, { status: djangoRes.status })
  }

  const data: { access: string; refresh: string } = await djangoRes.json()

  const res = NextResponse.json({ success: true })

  res.cookies.set("access", data.access, {
    ...cookieOptionsBase,
    maxAge: 60 * 15,
  })
  res.cookies.set("refresh", data.refresh, {
    ...cookieOptionsBase,
    maxAge: 60 * 60 * 24 * 7,
  })

  return res
}

import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const DJANGO_API_BASE =
  process.env.DJANGO_API_BASE ?? process.env.NEXT_PUBLIC_DJANGO_API_BASE

const cookieOptionsBase = {
  httpOnly: true,
  secure: false,
  sameSite: "lax" as const,
  path: "/",
}

async function fetchMeWithAccess(access?: string) {
  const headers: Record<string, string> = {}
  if (access) headers.Authorization = `Bearer ${access}`

  return fetch(`${DJANGO_API_BASE}/api/auth/me/`, { headers })
}

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies()
  let access = cookieStore.get("access")?.value
  const refresh = cookieStore.get("refresh")?.value

  if (!access) {
    return NextResponse.json({ detail: "Nicht eingeloggt" }, { status: 401 })
  }

  let meRes = await fetchMeWithAccess(access)

  if (meRes.status === 401 && refresh) {
    const refreshRes = await fetch(`${DJANGO_API_BASE}/api/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })

    if (!refreshRes.ok) {
      const res = NextResponse.json(
        { detail: "Session abgelaufen" },
        { status: 401 },
      )
      res.cookies.set("access", "", { path: "/", maxAge: 0 })
      res.cookies.set("refresh", "", { path: "/", maxAge: 0 })
      return res
    }

    const data = await refreshRes.json()
    access = data.access

    meRes = await fetchMeWithAccess(access)
    if (!meRes.ok) {
      const res = NextResponse.json(
        { detail: "Auth fehlgeschlagen" },
        { status: meRes.status },
      )
      res.cookies.set("access", "", { path: "/", maxAge: 0 })
      res.cookies.set("refresh", "", { path: "/", maxAge: 0 })
      return res
    }

    const user = await meRes.json()

    const res = NextResponse.json({ user, access })
    res.cookies.set("access", access!, {
      ...cookieOptionsBase,
      maxAge: 60 * 15,
    })
    return res
  }

  if (!meRes.ok) {
    return NextResponse.json(
      { detail: "Auth fehlgeschlagen" },
      { status: meRes.status },
    )
  }

  const user = await meRes.json()
  return NextResponse.json({ user, access })
}

import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const DJANGO_API_BASE =
  process.env.DJANGO_API_BASE ?? process.env.NEXT_PUBLIC_DJANGO_API_BASE

export async function POST(_req: NextRequest) {
  const cookieStore = await cookies()
  const refresh = cookieStore.get("refresh")?.value
  const access = cookieStore.get("access")?.value

  if (refresh) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (access) {
      headers.Authorization = `Bearer ${access}`
    }

    await fetch(`${DJANGO_API_BASE}/api/auth/logout/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ refresh }),
    }).catch(() => {})
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set("access", "", { path: "/", maxAge: 0 })
  res.cookies.set("refresh", "", { path: "/", maxAge: 0 })
  return res
}

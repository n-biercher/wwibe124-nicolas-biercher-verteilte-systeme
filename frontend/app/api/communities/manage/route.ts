import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(_req: NextRequest) {
  const DJANGO_API_BASE =
    process.env.DJANGO_API_BASE ?? process.env.NEXT_PUBLIC_DJANGO_API_BASE

  if (!DJANGO_API_BASE) {
    return NextResponse.json(
      { detail: "DJANGO_API_BASE ist nicht konfiguriert." },
      { status: 500 },
    )
  }

  const cookieStore = await cookies()
  const access = cookieStore.get("access")?.value

  if (!access) {
    return NextResponse.json(
      { detail: "Authentication credentials were not provided." },
      { status: 401 },
    )
  }

  try {
    const djangoRes = await fetch(
      `${DJANGO_API_BASE}/api/communities/manage/`,
      {
        headers: {
          Authorization: `Bearer ${access}`,
        },
      },
    )

    const text = await djangoRes.text()

    try {
      const json = text ? JSON.parse(text) : null
      return NextResponse.json(json, { status: djangoRes.status })
    } catch {
      return new NextResponse(text, { status: djangoRes.status })
    }
  } catch (err) {
    console.error("Proxy /api/communities/manage Fehler:", err)
    return NextResponse.json(
      { detail: "Fehler beim Laden der Communities." },
      { status: 500 },
    )
  }
}

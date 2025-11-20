import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_BASE = process.env.DJANGO_API_BASE!

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    const formData = await req.formData()

    const res = await fetch(`${DJANGO_API_BASE}/api/upload_post_images/`, {
      method: "POST",
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: formData,
    })

    const text = await res.text()

    if (!res.ok) {
      console.error("upload_post_images error:", res.status, text)
      return NextResponse.json(
        { detail: "Bilder konnten nicht hochgeladen werden." },
        { status: res.status },
      )
    }

    try {
      const data = JSON.parse(text)
      return NextResponse.json(data, { status: 200 })
    } catch {
      return new NextResponse(text, {
        status: 200,
        headers: {
          "Content-Type": res.headers.get("content-type") ?? "application/json",
        },
      })
    }
  } catch (err) {
    console.error("upload_post_images handler error:", err)
    return NextResponse.json(
      { detail: "Unerwarteter Fehler beim Hochladen der Bilder." },
      { status: 500 },
    )
  }
}

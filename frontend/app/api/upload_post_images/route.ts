import { NextRequest, NextResponse } from "next/server"

const API_BASE = process.env.DJANGO_API_BASE

if (!API_BASE) {
  console.warn(
    "[upload_post_images] DJANGO_API_BASE ist nicht gesetzt. Bitte in .env konfigurieren.",
  )
}

export async function POST(req: NextRequest) {
  try {
    if (!API_BASE) {
      return NextResponse.json(
        { detail: "DJANGO_API_BASE ist nicht konfiguriert." },
        { status: 500 },
      )
    }

    const auth = req.headers.get("authorization") ?? ""

    const formData = await req.formData()

    const backendRes = await fetch(`${API_BASE}/api/upload_post_images/`, {
      method: "POST",
      headers: {
        Authorization: auth,
      },
      body: formData,
    })

    const contentType =
      backendRes.headers.get("content-type") || "application/json"
    const bodyText = await backendRes.text()

    if (!backendRes.ok) {
      console.error(
        "[upload_post_images] Backend-Fehler:",
        backendRes.status,
        bodyText,
      )
      return new NextResponse(bodyText, {
        status: backendRes.status,
        headers: { "Content-Type": contentType },
      })
    }

    return new NextResponse(bodyText, {
      status: 200,
      headers: { "Content-Type": contentType },
    })
  } catch (err) {
    console.error("[upload_post_images] Proxy-Fehler:", err)
    return NextResponse.json(
      { detail: "Upload-Fehler im Frontend-Proxy." },
      { status: 500 },
    )
  }
}

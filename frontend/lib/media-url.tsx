export function normalizeMediaUrl(raw?: string | null): string {
  if (!raw) return ""

  if (raw.startsWith("/api/media/")) return raw

  try {
    const url = new URL(raw)

    if (url.hostname === "backend") {
      const mediaIndex = url.pathname.indexOf("/media/")
      if (mediaIndex !== -1) {
        const rel = url.pathname.slice(mediaIndex + "/media/".length)
        return `/api/media/${rel}`
      }
      return `/api/media${url.pathname}`
    }
    return raw
  } catch {
    if (raw.startsWith("/media/")) {
      const rel = raw.replace(/^\/media\//, "")
      return `/api/media/${rel}`
    }

    return raw
  }
}

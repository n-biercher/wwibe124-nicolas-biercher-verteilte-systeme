"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ImagePlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Field,
    FieldGroup,
    FieldLabel,
    FieldDescription,
} from "@/components/ui/field"
import { useAuth } from "@/lib/authcontext"

const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_BASE!

type Props = {
    slug: string
    canPost: boolean
}

export function CreatePostForm({ slug, canPost }: Props) {
    const router = useRouter()
    const { accessToken, user } = useAuth()

    const [title, setTitle] = React.useState("")
    const [body, setBody] = React.useState("")

    const [files, setFiles] = React.useState<File[]>([])
    const [previewUrls, setPreviewUrls] = React.useState<string[]>([])

    const [submitting, setSubmitting] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const fileInputRef = React.useRef<HTMLInputElement | null>(null)

    React.useEffect(
        () => () => {
            previewUrls.forEach((url) => URL.revokeObjectURL(url))
        },
        [previewUrls],
    )

    function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
        const fileList = e.target.files
        if (!fileList) return

        const arr = Array.from(fileList)
        const images = arr.filter((f) => f.type.startsWith("image/"))

        if (images.length !== arr.length) {
            setError("Es sind nur Bilddateien erlaubt.")
        } else {
            setError(null)
        }

        previewUrls.forEach((url) => URL.revokeObjectURL(url))

        const newPreviews = images.map((f) => URL.createObjectURL(f))
        setFiles(images)
        setPreviewUrls(newPreviews)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        if (!accessToken) {
            setError("Du bist nicht eingeloggt.")
            return
        }
        if (!canPost) {
            setError("Du musst Mitglied sein, um zu posten.")
            return
        }
        if (!title.trim()) {
            setError("Titel darf nicht leer sein.")
            return
        }

        setSubmitting(true)
        try {
            let imageUrls: string[] = []
            if (files.length > 0) {
                const form = new FormData()
                files.forEach((file) => form.append("files", file))

                const uploadRes = await fetch("/api/upload_post_images", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: form,
                })

                if (!uploadRes.ok) {
                    const text = await uploadRes.text()
                    console.error(
                        "Fehler beim Hochladen der Bilder:",
                        uploadRes.status,
                        text,
                    )
                    throw new Error("Bilder konnten nicht hochgeladen werden.")
                }

                const uploadData = await uploadRes.json()

                const rawUrls: string[] = Array.isArray(uploadData.urls)
                    ? uploadData.urls
                    : []

                const base = (process.env.NEXT_PUBLIC_DJANGO_API_BASE || "").replace(
                    /\/$/,
                    "",
                )

                imageUrls = rawUrls
                    .map((u) => (u ?? "").toString().trim())
                    .filter(Boolean)
                    .map((u) =>
                        /^https?:\/\//i.test(u)
                            ? u
                            : `${base}${u.startsWith("/") ? u : `/${u}`}`,
                    )

                console.log("imageUrls, die an Django gehen:", imageUrls)
            }


            const payload = {
                title: title.trim(),
                body: body.trim(),
                image_urls: imageUrls,
            }

            const postRes = await fetch(
                `/api/communities/${encodeURIComponent(slug)}/posts`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify(payload),
                },
            )



            if (!postRes.ok) {
                const text = await postRes.text()
                console.error(
                    "Fehler beim Erstellen des Posts:",
                    postRes.status,
                    text,
                )
                throw new Error("Post konnte nicht erstellt werden.")
            }

            setTitle("")
            setBody("")
            files.forEach((f, idx) => URL.revokeObjectURL(previewUrls[idx]))
            setFiles([])
            setPreviewUrls([])

            router.refresh()
        } catch (err: any) {
            console.error(err)
            setError(
                err?.message || "Unbekannter Fehler beim Erstellen des Posts.",
            )
        } finally {
            setSubmitting(false)
        }
    }
    if (!user) return null

    return (
        <div className="mb-8 rounded-lg border bg-card p-4 md:p-5">
            <form onSubmit={handleSubmit}>
                <FieldGroup>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-medium">Neuen Beitrag erstellen</h2>
                        {!canPost && (
                            <p className="text-xs text-muted-foreground">
                                Du musst Mitglied sein, um zu posten.
                            </p>
                        )}
                    </div>

                    {error && (
                        <p className="mb-2 text-xs text-red-500">
                            {error}
                        </p>
                    )}

                    <Field>
                        <FieldLabel htmlFor="title">Titel</FieldLabel>
                        <Input
                            id="title"
                            placeholder="Worüber möchtest du sprechen?"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="body">Text (optional)</FieldLabel>
                        <Textarea
                            id="body"
                            placeholder="Weitere Details, Links, Erfahrungen ..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={4}
                        />
                    </Field>

                    <Field>
                        <FieldLabel>Bilder (optional)</FieldLabel>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={handleFilesChange}
                        />
                        <div className="flex flex-col gap-2 rounded-md border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <ImagePlus className="h-4 w-4" />
                                    <span>Wähle ein oder mehrere Bilder aus.</span>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Bilder wählen
                                </Button>
                            </div>
                            {files.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
                                    {previewUrls.map((url, idx) => (
                                        <div
                                            key={idx}
                                            className="relative overflow-hidden rounded-md border bg-background"
                                        >
                                            <img
                                                src={url}
                                                alt={`Preview ${idx + 1}`}
                                                className="h-20 w-full object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <FieldDescription>
                            Die Bilder werden zuerst hochgeladen, anschließend wird der Post mit den Bild-URLs erstellt.
                        </FieldDescription>
                    </Field>

                    <Field>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={submitting || !canPost}
                        >
                            {submitting ? "Veröffentliche..." : "Post veröffentlichen"}
                        </Button>
                    </Field>
                </FieldGroup>
            </form>
        </div>
    )
}

# backend/media_view.py
from pathlib import Path
from django.conf import settings
from django.http import FileResponse, Http404
import logging

logger = logging.getLogger("django.request")


def serve_media(request, path: str):
    """
    Servt Dateien unter MEDIA_ROOT, z.B. /media/post_images/foo.png
    """
    media_root = Path(settings.MEDIA_ROOT).resolve()
    full_path = (media_root / path).resolve()

    # Sicherheit: verhindert Path-Traversal (../../etc/passwd)
    if not str(full_path).startswith(str(media_root)):
        logger.warning("Blocked media path traversal attempt: %s", full_path)
        raise Http404("Invalid path")

    if not full_path.exists():
        # wichtiger Log: wir sehen exakt, welchen Pfad Django nutzt
        logger.warning("Media file not found: %s", full_path)
        raise Http404("File not found")

    # Erfolgreiche Ausgabe
    return FileResponse(open(full_path, "rb"))

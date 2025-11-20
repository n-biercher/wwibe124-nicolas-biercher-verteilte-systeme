FROM python:3.12-slim

# Python-Standard-Konfiguration
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Systemabhängigkeiten für psycopg2 / PostgreSQL
RUN apt-get update && apt-get install -y \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

# Arbeitsverzeichnis im Container
WORKDIR /app

# Requirements installieren
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Projektcode kopieren (inkl. manage.py, backend/, accounts/, forum/ etc.)
COPY backend/ /app/

# Ordner für gesammelte Staticfiles (collectstatic)
RUN mkdir -p /app/staticfiles

EXPOSE 8000

# Startkommando: Staticfiles sammeln, migrieren, Seed ausführen, Gunicorn starten
CMD ["sh", "-c", "\
  python manage.py collectstatic --noinput && \
  python manage.py migrate --noinput && \
  python manage.py seed_demo_data && \
  gunicorn backend.wsgi:application --bind 0.0.0.0:8000 --workers 3 \
"]

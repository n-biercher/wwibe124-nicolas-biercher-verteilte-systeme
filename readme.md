# Mini Reddit

Dieses Projekt besteht aus einem Django Backend, einem Next.js Frontend
und einer SQLite Datenbank. Die gesamte Anwendung wird über Docker
ausgeführt. Nachfolgend ist dargestellt wie diese Anwendung installiert werden kann.

## Repository klonen

Zunächst das Repository per SSH klonen

``` bash
git clone git@github.com:n-biercher/wwibe124-nicolas-biercher-verteilte-systeme.git
cd wwibe124-nicolas-biercher-verteilte-systeme
```

## Docker Container starten

Nach dem Klonen die Services mit Docker Compose starten

``` bash
docker compose up --build
```

## Zugriff auf die Anwendung

Frontend erreichbar unter\
http://localhost:3000

Backend erreichbar unter\
http://localhost:8000

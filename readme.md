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

## Erklärung zu dieser Komponente

Diese Komponente bildet die zentralen Funktionen der Community-Verwaltung eines vereinfachten Reddit Systems nach. Im System können Communities angelegt, verwaltet und gelöscht werden. Jede Community besitzt grundlegende Metadaten wie Name, Beschreibung, Bannerbild und Sichtbarkeit.

Innerhalb einer Community können Benutzer Beiträge erstellen, bearbeiten, bewerten und moderieren. Jeder Beitrag kann Bilder enthalten und verfügt über Kommentare, die angezeigt und ebenfalls moderiert werden können. Zusätzlich unterstützt das System das Sperren und Anpinnen von Beiträgen, um typische Moderationsprozesse abzubilden.

Benutzer können sich registrieren, anmelden und ihr Profil verwalten. Dazu gehören ein Profilbild, ein Benutzername sowie Funktionen wie Passwort ändern und Konto löschen. Die komplette Datenverarbeitung erfolgt im Django Backend, während das Next.js Frontend alle Benutzerinteraktionen darstellt.



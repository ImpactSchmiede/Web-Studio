# Projekt-Steckbrief — Web-Studio

> Ergänzt `C:\Users\AI User\Projekte\Autonomes Arbeiten\Steckbrief_Standard.md` (gleiche Gliederung): nur Grunddaten und
> Abweichungen. Ablauf und Rechte: `Batch-Prozess.md`. Angelegt 19.10.2026 aus der Projektvorlage (Rahmen-Stand 2026-10-17).

## Grunddaten
- Repo `https://github.com/ImpactSchmiede/Web-Studio.git` (privat) · Ordner `C:\Users\AI User\Projekte\Web-Studio`
- Stack: Je Web-Projekt zu entscheiden
- Zielplattformen: Web und Mobil (responsiv)
- Produkt: Konzipiert/designt (UX/UI, Content), setzt um, pflegt und verwaltet alle Website-Projekte von Enrico. Infrastruktur und alles auf dem VPS liegt beim PO VPS-Administration, enge Abstimmung; Synergien und Wiederverwendbarkeit zwischen den Web-Projekten werden gemeinsam erkannt und gestärkt. Konzept: `docs/konzept/`, Roadmap: `_Austausch\Web-Studio\_roadmap.md`.
- Ressourcen: TWS-Client-IDs 20300–20399 · Ports 8400–8499 · externe Systeme: VPS (PO VPS-Administration), Bedarf je Projekt abstimmen

## Nutzer
- **Persona:** Je Web-Projekt unterschiedlich; Personas werden beim Start jedes Web-Projekts im Rahmen von Design/Konzeption erarbeitet (eigene Cowork-Chats je Web-Projekt möglich).
- **Hauptszenarien (Vorhaben 1, Freelancer-Seite):** Entscheider:in prüft am Handy in unter 2 Minuten und schreibt eine Mail · Vermittler:in gleicht Profil mit Rolle ab und nimmt das Profil-PDF mit · Bekannte prüfen Zertifikate/Arbeitsweise · Details am Laptop. Siehe `docs/konzept/freelancer-seite.md`.
- **Am wichtigsten:** Klarheit in unter einer Minute (was, Erfahrung, Kontakt) und das Gefühl, dass Enrico helfen kann.

## Produktentscheidungen
- 2026-10-19 Enrico: Erstes Web-Projekt ist die eigene Freelancer-Seite (enricofalk.de); Ziel Visitenkarte + Anfragekanal, Konzept/Design/Metriken entscheidet der Co-PO.
- 2026-10-19 Co-PO (Entwurf, Go offen): kein Tracking, keine Cookies, Kontakt per Mail/LinkedIn/XING, Deutsch zuerst. Details A1–A8 im Konzept.

## Git
- Wie Standard (Conventional Commits mit Ticket-Scope).

## Tickets
- Wie Rahmen: Ticket = Thread `_Austausch\Web-Studio\<Batch>\T-<Nr>_<kurz>.md`; am Batch-Ende nach `docs/batches/<Batch>/`.

## Guidelines
- Wie Rahmen (`Autonomes Arbeiten\guidelines\`). Abweichungen: `docs/guidelines/` (bisher keine).

## Befehle
- Voraussetzung: Node.js ab Version 22. Keine npm-Pakete, daher kein `npm install` und kein `npm ci`.
- **Setup:** keine
- **Build:** `npm run build` (schreibt `dist/`, listet die Dateien, prüft die Lieferform; Exit 1 bei Verstoß)
- **Tests:** `npm test` (`node --test`, baut nur in Temp-Ordnern)
- **Lieferform prüfen:** `npm run check` (prüft ein vorhandenes `dist/`; optional Ordner als Argument)
- **Lint / Format / Typen:** nicht vorhanden (keine Werkzeuge ohne Abhängigkeit); der Test führt `node --check` für jede Quelldatei aus
- **Smoke** = Build + Seite öffnen: `npm run build`, dann `dist/index.html` im Browser öffnen. Erwartung: Seite wie das Mockup, mit JavaScript steht die Adresse im Klartext und „Adresse kopieren“ ist sichtbar, ohne JavaScript steht „kontakt [at] enricofalk.de“ ohne Knöpfe
- **App starten:** keine laufende App; `dist/` ist eine statische Seite (Übergabe an den VPS-Admin als .tar kommt mit T-003)
- Texte ändern: `src/content/de.json` · Aussehen: `src/styles/site.css` · Entscheidungen: `docs/ENTSCHEIDUNGEN.md`

## Testautomatisierung
- Wie Standard. UI-Tests automatisiert über Frameworks; Computer-Use nur für Nutzertests/Sichtprüfung.
- Erlaubte echte Testumgebung: Offen, mit PO VPS-Administration abzustimmen

## Leitplanken
- Wie Standard. Keine Live-Konten, kein echtes Geld, keine Kosten, keine neuen Konten, keine Geheimnisse in Repo/Threads/Ablage.

## Für Enrico: Stand holen und starten
- Mac: `cd ~/Projekte/Web-Studio && git pull --ff-only && npm run build && open dist/index.html`
- Windows (PowerShell): `cd "<Pfad zum Repo>"; git pull --ff-only; npm run build; start dist\index.html`
- Voraussetzung: Node.js ab Version 22 (`node -v`). Weitere Installation ist nicht nötig. Die Seite öffnet sich direkt aus dem Ordner, ein Server ist nicht erforderlich.

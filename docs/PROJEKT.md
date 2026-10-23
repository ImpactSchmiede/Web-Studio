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
- Batch-Ablauf wie Rahmen (`Batch-Prozess.md` 5b): Mission → Batch-Plan mit Plan-Gate des Co-PO → Architektur-Review (Agent `reviewer`; Blocker/Major vor dem ersten Ticket beheben, Minor ins Backlog) → Tickets nacheinander → Härtung → Abnahme → Merge. Am Vorhabenende Schlusslauf über die Gesamtarchitektur (`reviewer`). Bericht je Review unter `docs/batches/<Batch>/evidenz/`.
- Agenten, Workflow, Modell: wie Rahmen (`RAHMEN-STAND.md` „Subagenten, Workflow, Modell“, `KONZEPT-AGENTEN.md`). Sub-Agenten nur `reviewer` (Architektur-Review) und `qa` (QA, Black-Box je Ticket); Plan, Umsetzung und Selbsttest rechts und links macht Code selbst; Modell und Aufwand nach Rahmen.

## Guidelines
- Wie Rahmen (`Autonomes Arbeiten\guidelines\`). Abweichungen: `docs/guidelines/` (bisher keine).

## Befehle
- Voraussetzung: Node.js ab Version 22. Build und Tests ohne npm-Pakete; Prüfwerkzeug: `npm ci --prefix tools/pruefung` (nur für `npm run pruefen`).
- **Setup:** Build und Tests keine. Prüfwerkzeug (nur für `npm run pruefen`, eigene Pakete in `tools/pruefung/`, nicht im Build): `npm ci --prefix tools/pruefung` (Chrome muss installiert sein, sonst `CHROME_PATH` setzen)
- **Build:** `npm run build` (schreibt `dist/`, listet die Dateien, prüft die Lieferform; Exit 1 bei Verstoß)
- **Tests:** `npm test` (`node --test`, baut nur in Temp-Ordnern)
- **Lieferform prüfen:** `npm run check` (prüft ein vorhandenes `dist/`; optional Ordner als Argument)
- **Prüfläufe:** `npm run pruefen -- --ausgabe <Berichtsordner>` (Pflichtangabe, kein Standardpfad; Lighthouse mobil und Desktop für `index.html`, Zusatzlauf mit `indexierbar:true`, axe hell und dunkel auf 1280 und 390 px, html-validate, Linkprüfung, Fremdanfragen-Protokoll. Vorher werden nur die eigenen Berichte im Ordner entfernt. Optionen: `--html` schreibt zusätzlich die Lighthouse-Berichte als HTML (je rund 1 MB), `--ohne-links`, `--nur lighthouse,axe,html,links`. Der Prüfserver bindet nur 127.0.0.1, Port 8400 bis 8449. Beispiel T-002: `npm run pruefen -- --ausgabe docs/batches/B-001/evidenz/T-002/pruefung`)
- **Profil-PDF erzeugen:** `npm run profil [-- --stand JJJJ-MM-TT] [--seitenbilder <Ordner>] [--markierung <Datei.png>]` (Chrome, Prüfserver Port 8412 bis 8419; legt `src/profil/profil-enrico-falk.pdf` und `quelle.json` ab, beides committen). Nach jeder Änderung an `de.json`, Adresse, `profil.css` oder Schriften neu erzeugen: `npm run build`, `npm run paket` und `npm test` melden sonst „veraltet“. Die PDF ist Entwurf (Fußzeile „Entwurf, Stand <Datum>“) und wird nach dem Interview neu erzeugt.
- **Paket:** `npm run paket [-- --datum JJJJ-MM-TT] [--ersetzen]` (Profil-PDF aktuell? dann `dist/` bauen, unkomprimiertes `.tar` und `.sha256` nach `paket/`, lokal und von git ignoriert, nicht in `_Austausch`; danach automatisch die Paketprüfung). `npm run paket:pruefen [-- <paket.tar>]` prüft wie der VPS-Administrator (Hash und Name der `.sha256`, strenges ustar, Entpacken in leeren Ordner, Lieferform inklusive PDF, `robots.txt` sperrt alles; ohne Argument das jüngste `paket/*.tar`).
- **Platzhalterliste:** `npm run platzhalter` (alle gelben Stellen aus `de.json` plus Foto und Terminlink aus der Konfiguration)
- **Bilder neu erzeugen:** `node tools/pruefung/bilder.mjs <foto.png>` (Original wird nur gelesen)
- **Lint / Format / Typen:** nicht vorhanden (keine Werkzeuge ohne Abhängigkeit); der Test führt `node --check` für jede Quelldatei aus
- **Smoke** = Build + Seite öffnen: `npm run build`, dann `dist/index.html` im Browser öffnen. Erwartung: Seite wie das Mockup, mit JavaScript steht die Adresse im Klartext und „Adresse kopieren“ ist sichtbar, ohne JavaScript steht „kontakt [at] enricofalk.de“ ohne Knöpfe. Seit T-003 zusätzlich: Knopf „Profil als PDF laden“ öffnet die PDF (A4, 2 Seiten, Fußzeile „Entwurf, Stand …“, gelbe Platzhalter, markierbarer Text); `npm run paket` und danach `npm run paket:pruefen` laufen grün
- **App starten:** keine laufende App; `dist/` ist eine statische Seite (Übergabe an den VPS-Admin als .tar: `npm run paket`, Ablage in `_Austausch` macht der Co-PO in B-003)
- Texte ändern: `src/content/de.json` · Kontaktadresse und Terminlink: `src/site.config.json` · Aussehen: `src/styles/site.css` · Entscheidungen: `docs/ENTSCHEIDUNGEN.md`

## Testautomatisierung
- Wie Standard. UI-Tests automatisiert über Frameworks; Computer-Use nur für Nutzertests/Sichtprüfung.
- Erlaubte echte Testumgebung: Offen, mit PO VPS-Administration abzustimmen

## Leitplanken
- Wie Standard. Keine Live-Konten, kein echtes Geld, keine Kosten, keine neuen Konten, keine Geheimnisse in Repo/Threads/Ablage.

## Für Enrico: Stand holen und starten
- Mac: `cd ~/Projekte/Web-Studio && git pull --ff-only && npm run build && open dist/index.html`
- Windows (PowerShell): `cd "<Pfad zum Repo>"; git pull --ff-only; npm run build; start dist\index.html`
- Voraussetzung: Node.js ab Version 22 (`node -v`). Weitere Installation ist nicht nötig. Die Seite öffnet sich direkt aus dem Ordner, ein Server ist nicht erforderlich.

# Mission B-001 – Web-Studio (Freelancer-Seite: Durchstich)

## Absicht
- **Outcome:** Es steht ein lauffähiges, getestetes Gerüst der Freelancer-Seite (enricofalk.de) mit dem entschiedenen Stack, dem Mockup-Look und dem Profil-PDF. Enrico kann Look und Ton am echten Ergebnis beurteilen.
- **Warum:** Erst der Durchstich zeigt, ob Stack, Design und Lieferform (dist/-Paket) tragen, bevor die Inhalte in B-002 vollständig werden.

## Scope
- **Grundlage:** `docs/konzept/freelancer-seite.md`; Mockup `Meine Ablage\Web-Studio\Freelancer-Seite\Mockups\Mockup_Startseite.html` (Look, Texte als Entwurf); Hosting-Vorgaben aus `_Austausch\VPS-Administration\Anfragen\Web-Studio_freelancer-seite.md`.
- **Enthalten:** Stack-Entscheidung mit Begründung (lokal, kostenlos, ohne Konto, ohne Fremdanfragen); Gerüst mit Seite, Impressum-/Datenschutz-Platzhaltern, 404, robots.txt, sitemap.xml; selbst gehostete Schriften (OFL, Lizenztexte beilegen); Build erzeugt `dist/` (nur normale Dateien, unter 20 MB und 500 Dateien); Profil-PDF per Chromium-Druck; Prüfläufe (Lighthouse, axe-core, html-validate, Linkprüfung); Konzept ins Repo committen.
- **Nicht enthalten:** echte persönliche Angaben, Zertifikatstexte, Wirkungsbeispiele und Rechtstexte (B-002); Deployment und DNS (B-003).

## Zusätzliche Abnahmekriterien
- Seite läuft ohne Fremdanfragen und ohne Cookies; kein Inline-CSS, kein Inline-JS (CSP `default-src 'self'`); einziges Skript: Adress-Verschleierung/„Adresse kopieren“ als eigene .js-Datei.
- Desktop und Handy (390 px) ohne horizontales Scrollen; Dark Mode und reduzierte Bewegung funktionieren; sichtbarer Tastaturfokus.
- Lighthouse mobil: Performance, Barrierefreiheit, Best Practices, SEO je ≥ 90; axe ohne schwere Befunde.
- Platzhalter im Text bleiben als solche erkennbar (nicht als echte Daten).

## Stand der Inhalte (19.10. 17:00)
- Mockup ist inhaltlich neu: Positionierung „Agile Coach und Problemlöser“ (kein Scrum-Master-Schwerpunkt, SAFe nicht im Vordergrund), Zertifikate mit Namen/Ausstellern, Vermittler-Zeile, 3 anonymisierte Beispiele (Entwurf aus Lebenslauf), Foto `Mockups\foto.png`, Geschichte (Entwurf). Quelle der Wahrheit für Texte: `Mockup_Startseite.html`; Enricos Angaben: `Meine Ablage\Web-Studio\Freelancer-Seite\Meine_Angaben.txt`.
- T-001 baut das Gerüst; **T-002 übernimmt die aktuellen Texte nach `de.json`** und bringt Foto (webp/jpg, Exif entfernt) und Feinschliff der Details (Look bleibt).
- Persönliche Angaben (Anschrift, USt-IdNr.) gehören nur in Impressum (B-002), nicht in dieses Repo-Mockup.

## Tickets (Reihenfolge)
| Nr | Ticket | Kurz | Status |
|---|---|---|---|
| 1 | T-001 | Stack entscheiden, Gerüst, Konzept committen | **abgenommen** (d1a7ccf) |
| 2 | T-002 | Seite nach Mockup bauen, Prüfläufe | **abgenommen** (3769709) |
| 3 | T-003 | Profil-PDF und `dist/`-Paket (.tar + .sha256) | abgenommen (587c8cb, Suite 387/387 grün Linux+Windows) |
| 4 | T-004 | Fix: Test `pruefePdf … Benutzername` portabel, Suite unter Linux grün | abgenommen (587c8cb) |

## Go
- Vorhaben-Go von Enrico: 2026-10-19 (Roadmap `_roadmap.md`) · Batch-Start durch Co-PO: 2026-10-19 · Branch: `batch/B-001`

## Batch-Abnahme und Retro (19.10.2026)
- **Abgenommen** nach Härtung (Regression grün, Review 0 Blocker/Major, Rundgang R1–R12). Merge durch Code.
- **Gut:** Rot-ist-No-Go griff: der Linux-Lauf fand einen maschinenabhängigen Test, bevor er in main kam. Frischer Klon als Gegenprobe war wertvoll.
- **Schlecht:** Zeit in Kopfzeile geschätzt (Befund Weckdienst), Quittung vergessen (Eskalation), ABSCHLUSS statt AUFTRAG bei Übergabe an Code (Befund).
- **Maßnahmen:** Kopfzeile nur per Werkzeug; Weckruf zuerst quittieren; bei Übergabe an Code immer AUFTRAG/ANTWORT. Zwei Rechner-Tests früh mit Fake-Werten schreiben (Testregel für alle Tickets).
- **Offen →** B-002: R1 (Vertrauenszeile Hero), R2 (Kontakt auf PDF-Seite 1), R3 (Kontakt auf Desktop jederzeit), R4 (Ergebnisse je Beispiel, Interview), R5–R7, R9–R10, Landmarks; später R8, R11; B-003-Checkliste R12. S1/S2 (Header, Cache) → VPS-Anfrage.

# Konzept-Abdeckung B-001 – Freelancer-Seite (Stand 19.10.2026, Co-PO)
> Quelle: `docs/konzept/freelancer-seite.md`. Nach Batch-Abnahme nach `docs/batches/B-001/konzept-abdeckung.md` verschieben (Code). „Gebaut“ heißt: im Repo, getestet. Inhalte sind Entwurf (Gate: Interview).

| Konzept-Punkt | Ticket | Stand |
|---|---|---|
| Struktur One-Pager (Hero, Wobei ich helfe, Profil, So arbeite ich, Hintergrund, Kontakt, Footer) | T-001/T-002 | umgesetzt (Entwurfstexte) |
| Wirkungsbeispiele (2–3 anonymisiert) | T-002 | gebaut als Entwurf aus Lebenslauf; Anonymisierung und Freigabe offen → B-002 nach Interview |
| Profil-PDF | T-003 | umgesetzt (2 Seiten, Entwurf); LinkedIn-URL sichtbar drucken und Neuerzeugung nach Interview → B-002 |
| Zertifikate mit Namen/Ausstellern | T-002 | umgesetzt; Erklärsätze und Verifikationslinks offen → B-002 |
| Vermittler-Zeile | T-002 | umgesetzt (Angaben Enrico); „verfügbar ab: auf Anfrage“ |
| Kontakt: Klartext, Kopieren, Mail-Link, Betreff, Erwartungssatz | T-001/T-002 | umgesetzt; Mailbox/Testmail extern → B-003 |
| Terminlink | – | bewusst verschoben (Calendly noch für Impact Schmiede konfiguriert, Enrico richtet später ein); im Konzept V1 ausgeschlossen, jetzt Platzhalter |
| LinkedIn (kein Xing) | T-002 | umgesetzt; Enrico prüft URL im Mockup |
| Impressum, Datenschutz | T-002 | nur Platzhalterseiten „in Arbeit“ → B-002 (Anschrift, USt-IdNr., Hoster-Logs mit PO VPS-Administration, Rechtstexte-Prüfung, Kosten entscheidet Enrico) |
| A1 Deutsch, Struktur für Englisch vorbereitet | T-001 | umgesetzt (Texte in `de.json`); Englisch → B-004 |
| A5 kein Tracking/Cookies/Fremdanfragen | T-001/T-002 | umgesetzt und geprüft (0 Fremdanfragen, 0 Cookies, strenge CSP) |
| A6 Mobil zuerst, Kontakt erreichbar | T-002 | umgesetzt (390 px, mobile Leiste) |
| A7 Stil ruhig/warm, Foto | T-002 | umgesetzt; Foto vorläufig (2019, 512 px), aktuelles Foto und Veröffentlichungs-Ja offen → vor B-003 |
| A8 Texte Co-PO-Entwurf, Enrico gibt frei | – | offen → B-002 (Gate Interview) |
| Lighthouse ≥ 90, WCAG AA | T-002 | Lighthouse erfüllt (99–100; SEO 100 mit indexierbar); axe ohne schwere Befunde; Landmark für Banner/mobile Leiste → B-002 |
| Lieferform VPS (`dist/`, `.tar` + SHA-256, Endungen) | T-001/T-003 | umgesetzt und geprüft; Ablage erst B-003 nach Gate |
| Nutzungsmessung (Caddy-Log ohne IP) | – | bewusst verschoben → B-003 (hängt am PO VPS-Administration) |
| Wirkungsmessung (Frage im Erstgespräch) | – | offen → nach Livegang (B-003/B-004) |
| Persönliche Geschichte (Spiele → Coaching) | T-002 | Entwurf; finale Fassung nach Interview → B-002 |
| Impact Schmiede als separates Label, dezente Verlinkung | T-002 | umgesetzt (Footer, „Wobei ich helfe“); Konzept-Punkt A4 aktualisieren (Personenmarke, nicht Impressum-Firmierung) |
| Positionierung „Agile Coach und Problemlöser“ | T-002 | umgesetzt; im Konzept noch nachzuziehen (Hero, Rollen, SPC nachrangig) |

# T-003 Profil-PDF und Auslieferungspaket – Web-Studio B-001

## 2026-10-19 18:10 | PO Web-Studio -> Code | AUFTRAG
Auftragsart: Umsetzung. Branch `batch/B-001`. Mission `_batch.md`. Pflichtlektüre: Mission, `docs/konzept/freelancer-seite.md`, VPS-Thread `_Austausch\VPS-Administration\Anfragen\Web-Studio_freelancer-seite.md` (Paketformat, Ablage, Endungsliste), dein Abnahmestand T-002.
Ziel: Das Profil lässt sich als PDF laden, und `dist/` lässt sich als prüfbares Paket für den VPS-Administrator bauen.
Akzeptanzkriterien:
1. Profil-PDF (A4, 1 bis 2 Seiten) aus denselben Inhalten wie die Seite (`de.json`), per Chromium-Druck, mit eigenem Druck-Layout: Name, Positionierung, Schwerpunkte, Zertifikate mit Ausstellern, Branchen, Vermittler-Zeile (Verfügbarkeit, Einsatzform, Sprachen, Antwortzeit), 2 bis 3 Beispiele, Kontakt (Seiten-Adresse aus `site.config.json`, Webadresse, LinkedIn). **Keine Anschrift, kein Telefon, keine USt-IdNr., kein Foto** (kommt erst mit Enricos Freigabe). Entwurfs- und Platzhaltertexte bleiben als „Entwurf“ erkennbar (Fußzeile „Entwurf, Stand <Datum>“).
2. PDF-Metadaten bereinigt (kein Benutzername, kein Pfad, Titel und Autor „Enrico Falk“), Schriften eingebettet, Dateiname `profil-enrico-falk.pdf` (ASCII), Textauswahl möglich, Größe unter 1 MB. Der Knopf auf der Seite verweist auf die PDF (statt der gelben Notiz), die PDF liegt in `dist/`.
3. Der Build prüft das PDF (Endung `.pdf` erlaubt, Größe, Metadaten, keine Fremdreferenzen).
4. Paket: `npm run paket` erzeugt aus `dist/` ein **unkomprimiertes** `.tar` (index.html und 404.html zuerst, nur normale Dateien, keine Symlinks, keine versteckten Dateien, unter 20 MB und 500 Dateien, nur erlaubte Endungen `.html .css .js .woff2 .txt .xml .pdf .webp .jpg .png .ico`) und `.sha256`. Dateiname `<JJJJ-MM-TT>.tar`. Ausgabe lokal im Repo-Ordner `paket/` (nicht committen). **Noch nicht** in `_Austausch\VPS-Administration\Pakete\enricofalk\` ablegen: Foto-Freigabe, Texte und Rechtstexte stehen aus; die Ablage macht der Co-PO in B-003 nach Gate.
5. Paketprüfung wie sie der VPS-Administrator macht, soweit bekannt: Entpacken in leeren Ordner, Hash prüfen, Lieferform-Prüfung gegen den Inhalt des `.tar`, `robots.txt` sperrt alles (Entwurf).
6. Tests und Evidenz wie T-001/T-002 (Beleg-Tabelle, Screenshot/PDF-Seitenbilder, `dir paket`, Hash). Alle bisherigen Tests bleiben grün (frischer Klon).
Entscheidungen, die du treffen darfst: PDF-Erzeugung (Chromium über das vorhandene Prüfwerkzeug), Layout-Details des Druck-Layouts im Look der Seite (Farben, Schriften wie Seite), Tar-Erzeugung mit Node-Bordmitteln.
Nicht ändern: Texte der Seite, Positionierung, Look.
Hinweis: axe `region` und Landmark für Banner und mobile Leiste ist B-002.
**Ball:** bei Code

## 2026-10-19 18:22 | Code -> PO Web-Studio | FRAGE
Plan-Gate T-003. Plan: `Web-Studio\docs\batches\B-001\evidenz\T-003\plan.md`. Fassung 2 ist in Arbeit und übernimmt die Review-Befunde; der fachliche Inhalt bleibt gleich.
- **Was wird gebaut:**
  - Eine eigene Druckseite im Look der Seite, gespeist aus `de.json` und `site.config.json`. Chrome druckt sie einmal als `profil-enrico-falk.pdf`.
  - Die PDF wird eingecheckt wie das Foto. Ein Test schlägt fehl, wenn sich die Inhalte ändern und die PDF nicht neu erzeugt wurde.
  - Metadaten werden neu geschrieben: nur Titel, Autor und Stand-Datum, keine Browser-Kennung, kein Pfad, kein Benutzername. Die Messung hat gezeigt, dass Chrome relative Links sonst als lokalen Dateipfad mit Benutzernamen ins PDF schreibt; deshalb sind nur `https:`- und `mailto:`-Links erlaubt.
  - Der Knopf „Profil als PDF laden“ zeigt auf die PDF, die gelbe Notiz entfällt.
  - `npm run paket` erzeugt `paket/<Datum>.tar` (unkomprimiert, index und 404 zuerst, zweimal gepackt bytegleich) und `.sha256`.
  - `npm run paket:pruefen` macht die Prüfung des VPS-Admins nach: Hash und Name, Entpacken in einen leeren Ordner mit gehärtetem Leser, Lieferform-Prüfung, robots sperrt alles. Die Gegenprobe läuft mit dem System-`tar`.
- **Was ändert sich für den Nutzer:** Das Profil lässt sich als 1–2-seitige PDF laden. Für dich: Es gibt ein geprüftes Paket, das noch nicht abgelegt wird.
- **Was wird NICHT geändert:** Seitentexte, Positionierung, Look. Kein Foto, keine Anschrift, kein Telefon, keine USt-IdNr. in der PDF. Keine Ablage in `Pakete\enricofalk\`. Keine neue Abhängigkeit.
- **Auslöser des Gates:**
  - **Paketdefinition:** `package.json` bekommt die Skripte `paket`, `paket:pruefen` und `profil`, ohne Abhängigkeit.
  - **WAS-Fragen:**
    1. **Mailadresse in der PDF:** `kontakt@enricofalk.de` stünde im Klartext und als mailto-Link. Eine Verschleierung wie auf der Seite geht in einer PDF nicht, ohne die Textauswahl zu verlieren, und Sammler werten auch PDFs aus. Vorschlag: Klartext mit Link, weil die PDF zum Kontaktieren da ist.
    2. **PDF-Titel:** wörtlich „Enrico Falk“ (Ticket) oder „Enrico Falk – Profil“? Vorschlag: wie im Ticket.
    3. **Untertitel und neue Texte nur für die PDF:**
       - Als Untertitel unter dem Namen schlage ich „Agile Coach und Problemlöser“ vor. Die Formulierung steht schon in der Einleitung der Seite; als eigene Zeile wäre sie aber neu.
       - Sonst nur Beschriftungen („Kontakt“, „E-Mail“, „Web“, „LinkedIn“) und die Fußzeile „Entwurf, Stand 19.10.2026“.
       - Einverstanden? Wenn nicht, verwende ich nur vorhandene Texte (z. B. die Hero-Überschrift).
    4. **Seitenzahl:** Das Konzept sagt 1 Seite, das Ticket 1–2. Mit 8 Zertifikaten und 3 Beispielen werden es voraussichtlich 2 Seiten. Vorschlag: höchstens 2 Seiten.
    5. **Webadresse:** `https://enricofalk.de/` steht in der PDF, obwohl die Domain noch nicht live ist. Unkritisch, weil die PDF erst mit dem Livegang veröffentlicht wird.
- **Technik:** siehe plan.md. Reviewer: freigabefähig nach Einarbeitung, kein Blocker. Die 5 Majors sind im Plan:
  - nur erlaubte Schriften in der PDF, sonst Abbruch (kein stiller Systemschrift-Ersatz);
  - Datum deterministisch;
  - Tar-Leser gehärtet gegen Windows-Namen, Duplikate und abgeschnittene Archive;
  - die Positionierungsfrage oben;
  - Gate wegen `package.json`.
- **Umsetzung P5 (Entscheidung Code, zur Information):** Der Binärcode für PDF-Nachbearbeitung, Tar-Schreiber und -Leser samt Tests geht an den Agenten `umsetzer` mit Sonnet/hoch. Das Druck-Layout und die Evidenz macht die Hauptsitzung (Opus/mittel).
-> "Ja, umsetzen" oder "Nein, weil ..." (gern mit Antworten zu 1–5; Offenes setze ich wie vorgeschlagen um und führe es im Bericht auf)

## 2026-10-19 18:23 | PO Web-Studio -> Code | ANTWORT
Ja, umsetzen (Skripte `paket`, `paket:pruefen`, `profil` in `package.json` ohne neue Abhaengigkeit sind freigegeben). Zu 1-5:
1. Klartext mit mailto-Link, ok. Die Adresse ist austauschbar; wechselt sie, wird die PDF neu erzeugt (dein Test erzwingt das).
2. Titel „Enrico Falk – Profil“ (sinnvoller im Browser-Tab und in Ablagen); meine Ticketformulierung ist damit angepasst.
3. Untertitel „Agile Coach und Problemlöser“ ist freigegeben, ebenso die Beschriftungen und die Fusszeile „Entwurf, Stand <Datum>“.
4. Hoechstens 2 Seiten.
5. Webadresse ok.
Wichtig: Enrico hat entschieden, dass finale Inhalte erst nach einem Interview entstehen. Die PDF ist deshalb Entwurf und wird nach dem Interview neu erzeugt; der Test, der bei Inhaltsaenderung ohne neue PDF fehlschlaegt, ist dafuer genau richtig. Paket weiterhin nur lokal in `paket/`.
**Ball:** bei Code

## 2026-10-19 19:11 | Code -> PO Web-Studio | BERICHT
T-003 bereit zur Abnahme
**Was wurde gebaut:**
- `profil-enrico-falk.pdf`: A4, 2 Seiten, 130 KB, im Look der Seite. Inhalte aus `de.json`:
  - Name und Untertitel, Hero
  - Profil, 8 Zertifikate mit Ausstellern
  - Vermittler-Box
  - 3 Beispiele
  - Kontakt (Mailadresse im Klartext mit mailto-Link, Web, LinkedIn)
  - Fußzeile „Entwurf, Stand 19. Oktober 2026“
- Der Knopf „Profil als PDF laden“ öffnet die PDF.
- `npm run paket` erzeugt `paket/2026-10-19.tar` (unkomprimiert, 19 Dateien, 313 856 Byte) und `.sha256`. Das Paket liegt nur lokal, `_Austausch\...\Pakete\` ist unberührt.
- `npm run paket:pruefen` prüft wie der VPS-Admin.
**Wie testen:** `npm run build`, `npm test`, `npm run paket -- --ersetzen`, `npm run paket:pruefen`. Neu erzeugen der PDF nach dem Interview: `npm run profil` (siehe `docs/PROJEKT.md` Befehle).
| AK | Test | QA | Beleg (`docs/batches/B-001/evidenz/T-003/`) |
|---|---|---|---|
| 1 Inhalt | profil.test (Text aus der echten PDF: alle Teile, keine Anschrift/Telefon/USt-IdNr., kein Bild, Fußzeile) | ✅ | `pdf-seiten/seite-1.png`, `seite-2.png` |
| 2 Metadaten, Schriften, Größe, Knopf | pdf.test, seite.test | ✅ (Knopf mit CSP-Server, Klick öffnet PDF) | `pdf-pruefung.txt`, `pdf-markierter-text.png`, `qa/knopf-profil-pdf.png` |
| 3 Build prüft PDF | pdf.test, check.test (Rot-Tests je Regel) | ✅ (14 manipulierte PDFs abgelehnt) | `qa/pdf-manipulation.txt` |
| 4 Paket | paket.test (ustar, Reihenfolge, Grenzen, Endungen, Determinismus) | ✅ (zweimal gepackt bytegleich) | `paket-ausgabe.txt` |
| 5 Paketprüfung | paket.test, Gegenprobe bsdtar 3.8.9 und GNU tar 1.35 | ✅ (23 manipulierte Pakete abgelehnt) | `paket-pruefung.txt`, `qa/paket-pruefung.txt` |
| 6 Tests, Evidenz, frischer Klon | `npm test` | ✅ | `test-ausgabe.txt`, `frischer-klon.txt` |

**Prüfwerte der PDF:**
- Metadaten: nur Title „Enrico Falk – Profil“, Author „Enrico Falk“ und das Stand-Datum. Kein Creator, kein Producer, kein XMP. Benutzername, Pfad und Rechnername sind nirgends enthalten, auch nicht in dekomprimierten Strömen.
- Schriften: nur Atkinson (Type0) und Bricolage (Type3, so bettet Chrome variable Schriften ein), alle mit ToUnicode. Der Text ist markierbar.
- Erlaubt sind nur Link-Annotationen und die Aktionen URI/GoTo, auch ohne `/Type` und in `/Next`-Ketten.
- Das Paket ist deterministisch: SHA-256 `d05bb94d…c299`, im frischen Klon identisch.

**Plattform:** Ende-zu-Ende unter Windows, Chrome 155. Die Gegenprobe mit GNU tar steht stellvertretend für Linux und den VPS. Mit einer anderen Chrome-Hauptversion kann sich die PDF-Struktur ändern; dann bricht `npm run profil` sichtbar ab (`docs/referenzen/pdf-chrome.md`).
**Commit:** 4b11b52, dazu 7270951 (Evidenz `git log -1`), gepusht. Frischer `git clone` von 7270951: build, test (369: 368 bestanden, 1 übersprungen wie bisher), paket und paket:pruefen sind grün, derselbe Hash.
**Prüfung:** Planer, Reviewer (5 Majors eingearbeitet), Umsetzer (Sonnet/hoch), Diff-Check (1 Major: Positivliste für Aktionen und Annotationen ließ sich ohne `/Type` umgehen; behoben, dazu 8 Minors mit Rot-Tests), QA (Black-Box mit Manipulationen) und Nacharbeit. 28 neue Tests waren vor dem Code rot.
**Zusätzlich behoben (QA):**
- Die Prüfung, die der VPS-Admin nachstellt, vergleicht jetzt Titel und Autor mit den Sollwerten.
- Lokale Pfade mit Benutzernamen sind aus der gesamten Evidenz B-001 entfernt, auch rückwirkend bei T-001 und T-002. Ein Test verhindert das künftig.
**Bitte prüfen / Hinweise:**
1. **LinkedIn in der PDF** steht nur als Linkwort „LinkedIn“, die Adresse ist nicht sichtbar. Gedruckt ist das kein nutzbarer Kontaktweg; E-Mail und Web stehen im Klartext. Soll die Profil-URL sichtbar gedruckt werden? Das wäre ein kleiner Folgepunkt, passend nach dem Interview.
2. **Sichtprüfung Enrico:** die Seitenbilder der PDF.
3. **Prüflauf (`npm run pruefen`):** Er meldet, dass `https://impact-schmiede.de` gerade nicht erreichbar ist (TLS-Fehler auf Serverseite, `ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR`). Das liegt nicht an unserer Seite; vielleicht ein Hinweis an den PO VPS-Administration bzw. an Enrico (WordPress-Hosting).
4. **Neu erzeugen:** Nach dem Interview `npm run profil -- --stand <Datum>`, dann committen. Build und Paket melden sonst „veraltet“.
**Offene Minor-Befunde / Annahmen:** Die Begründung der Leck-Muster `\ws-` und `/ws-` (statt `ws-`, gegen Fehlalarme) steht noch nicht in `pdf-chrome.md`; das reiche ich mit dem nächsten Ticket nach.
-> "Abgenommen" oder "Nicht abgenommen, weil ..."

## 2026-10-19 19:12 | PO Web-Studio -> Code | ABSCHLUSS
Abgenommen. Geprueft im frischen Klon von 7270951 (Linux): build, paket und paket:pruefen gruen, SHA-256 d05bb94d... identisch zu deinem Bericht; PDF gesichtet (2 Seiten, Inhalt und Layout stimmig, keine Anschrift/Telefon/USt-IdNr., Text markierbar). **Auflage (Minor, kein Abnahmehindernis, mit dem naechsten Ticket):** `npm test` ist unter Linux nicht gruen: 368 von 369, es faellt `pruefePdf rot bei: Benutzername in Name mit \#20` (pdf.test.mjs:84, „kein Befund“). Vermutlich haengt der Test am Windows-Benutzernamen mit Leerzeichen („<benutzer>“, in der PDF `#20`) und ist dadurch nicht portabel. Bitte mit festem Fake-Benutzernamen im Test statt `os.userInfo()` portabel machen; deine Aussage „Linux verhaelt sich gleich“ gilt sonst nicht fuer die Tests. Zu den Hinweisen: (1) LinkedIn-URL sichtbar drucken: ja, mit dem Folgepunkt nach dem Interview. (3) impact-schmiede.de TLS-Fehler gebe ich an Enrico weiter. (4) Neuerzeugen der PDF nach dem Interview wie beschrieben. B-001 ist damit inhaltlich abgeschlossen; es folgt die Retro.

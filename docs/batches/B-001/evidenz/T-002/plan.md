# Plan T-002 – Seite nach Mockup, Texte, Feinschliff, Prüfläufe (B-001) · Fassung 2

Fassung 2 arbeitet das Plan-Review ein (freigegeben mit Auflagen: Major 1–3, Minor 4–14), siehe Abschnitt „Review-Befunde“ am Ende. Wo Abschnitt „Review-Befunde“ und Fassung-1-Text abweichen, gilt „Review-Befunde“.

Stand 2026-10-19 · Planer (opus/medium) · Grundlage: Ticket T-002 (AK 1–7, frisch von Disk), Nachtrag PO 17:21 (Adresse `kontakt@enricofalk.de`, Foto vorläufig, Terminlink bleibt Platzhalter), Mission B-001, Abschluss T-001 17:16, Mockup `Mockup_Startseite.html` (SHA-256 `5204cdf3…`, 16:58), `foto.png`.

**0. Recherche** – [Live-Code] Mockup neu: Abschnitt `#beispiele` (3 `article.case` mit `.tag`), Nav-Punkt „Aus der Praxis“, 8 Zertifikate mit `<small>` + 1 Platzhalter, 6 Vermittler-Felder, `<figure class="photo"><img src="foto.png" 512×512>`, Knopf „Erstgespräch buchen“ (`href="#"`), neuer Inline-Stil `margin-top:1.4rem;font-size:.95rem;color:var(--muted)`. CSS-Diff zu `site.css`: `h1`, `.certs li`, `.certs small`, `.story`, `.photo`, `.photo img`, `.cases` (3 Spalten), `.case*`, Mobil `.agency dl`. [Live-Code] `foto.png` = `Foto\Enrico2019_512.png` (bytegleich), 512×512 RGBA, Alpha überall 255, Chunks `zTXt "Raw profile type exif"` (6,9 KB), `iCCP`, `tIME` → Metadaten vorhanden. [Live-Code] **Mockup-Fehler Dark Mode:** `.contact` hat im Dunkelmodus hellen Grund (`--ink`), `.contact .note{color:#C5D2DB}` und `.ph-hell` (#F3E3BC) liegen dann hell auf hell (Kontrast ≈ 1,3:1). [Doku, npm-Registry 19.10.] `lighthouse@13.5.0` (18.09., Node ≥ 22.19, zieht `puppeteer-core ^25.9`, `axe-core ^4.13`, `chrome-launcher`, `configstore` und `@sentry/node` als **reguläre** Abhängigkeiten), `axe-core@4.14.0` (05.10.), `html-validate@11.16.2` (04.10., Node ^22.22 \|\| ≥ 24.8), `puppeteer-core@25.12.0` (23.09.); alle ≥ 14 Tage alt. [Doku, Lighthouse-README] Chrome-Pfad über `CHROME_PATH`; vorhanden Chrome 155.0.8059.80. [Doku, in P5 bestätigen] Lighthouse-Audit `is-crawlable` wertet `robots.txt` aus → mit `Disallow: /` SEO ≈ 66–70 (nur Entwurfsstand).

## 1. Impact-Analyse
Suche: Bildverarbeitung, Favicon, Linkprüfung, Prüfläufe im Repo ergebnislos; lokale Verweise prüft bereits `check.mjs` (wird erweitert, kein Neubau). Kontaktadresse steht heute als `lokal`/`domain`/`rueckfall` in `de.json`.

| Bereich | Datei | Anpassungsbedarf |
|---|---|---|
| Inhalt | `src/content/de.json` | alle Texte des Mockups 16:58 (AK 1); neu `kopf.beispiele`, `beispiele{titel,einleitung,felder[3],eintraege[3]{titel,tag,werte},hinweis}`, `profil.zertifikate.eintraege[{name,aussteller}]` + `hinweis`, `hintergrund.foto.alt`, `kontakt.terminknopf`, `fehlerseite.entwurf`, `rechtliches{impressum,datenschutz}{titel,text}`; **entfällt** `kontakt.lokal/domain/rueckfall`, `hintergrund.beispiele`, `hintergrund.foto.titel/text` |
| Konfig | `src/site.config.json` | `kontakt.adresse: "kontakt@enricofalk.de"` (einzige Stelle, AK 4), `kontakt.terminUrl: ""` (leer = Platzhalter), `foto{datei:"foto-vorlaeufig",breite:512,hoehe:512}`, Endungen + `.webp .jpg .png .ico` |
| Build | `src/build/build.mjs` | Vertrag anpassen; Konfig prüfen (Adresse genau ein `@`, `terminUrl` leer oder via `pruefeUrl` nur `https:`); `lokal`/`domain`/Rückfall „lokal [at] domain“ ableiten; Seiten `impressum.html`, `datenschutz.html`; `src/bilder/` nach `dist/bilder/`, `favicon.ico` nach oben kopieren |
| Prüfung | `src/build/check.mjs` | **Linkprüfung ohne Abhängigkeit:** lokale `<a href>` (Datei existiert) und `#anker` (id existiert in Zieldatei); externe `<a href>` werden gesammelt und ausgegeben (nicht geladen) |
| Vergleich | `src/build/compare.mjs` | Stil-Klassen um `mt-14`, `fs-095`, `c-muted` ergänzen; erlaubte Unterschiede: Footer-`href` auf Platzhalterseiten, Termin-`href`, `<picture>/<source>` und `img src`; neu `vergleicheTexte` (nur Textknoten + `alt`/`aria-label`/`title`/description, streng); `vergleicheCss` → **Look-Invarianten** (s. 3.) |
| Templates | `src/templates/{layout,index,fehlerseite}.mjs`, neu `rechtliches.mjs` | Abschnitt `#beispiele`, Zertifikate mit `<small>`, `<picture>`, Termin-Knopf, Favicon-`<link>`, Footer-Links (relativ, auf 404 absolut), `banner(c, {hinweis})` |
| Stil | `src/styles/site.css` | Mockup-CSS 16:58 wörtlich, Zusatzregeln T-001, danach Abschnitt `/* Feinschliff T-002 */` (s. 2.5) |
| Skript | `src/scripts/kontakt.js` | unverändert (liest `data-l/-d/-s`) |
| Bilder | neu `src/bilder/foto-vorlaeufig.{webp,jpg}`, `favicon.ico`, `apple-touch-icon.png` | einmalig erzeugt, committet; Kommentar/Dateiname „vorläufig“ |
| Werkzeug | neu `tools/pruefung/{package.json,package-lock.json,bilder.mjs,pruefen.mjs,server.mjs,README.md}` | **neue Abhängigkeiten (Gate)**, außerhalb der Build-Kette |
| Tests | `test/*.test.mjs`, `test/fixtures/mockup-startseite.html` | Fixture = Mockup 16:58 mit Kopfzeile (SHA); Erwartungslisten anpassen; neue Tests (3.) |
| Git | `.gitattributes`, `.gitignore` | `*.webp *.jpg *.ico binary`; `tools/pruefung/node_modules/` deckt `node_modules/` schon ab |
| Doku | `docs/ENTSCHEIDUNGEN.md`, `docs/PROJEKT.md` (Befehle) | Prüfwerkzeug, Bildweg, Adress-Konstante, Look-Invarianten; Befehl `npm run pruefen` (nur PROJEKT-Abschnitt „Befehle“) |
| Unverändert | Mockup, Konzept, `kontakt.js`, `scripts/*.mjs`, Root-`package.json` (bleibt ohne Abhängigkeiten) | fremd bzw. nicht nötig |

## 2. Vorgehen
1. Fixture aktualisieren, Tests anpassen/neu (rot).
2. **Texte (AK 1):** `de.json` aus Mockup; Platzhalter als `{ph:…}`/`{ph-hell:…}`; Templates nach Mockup-Struktur. Platzhalterliste wird aus `de.json` erzeugt (`evidenz/T-002/platzhalter.txt`).
3. **Kontakt (AK 4):** Adresse nur in `site.config.json`; Build leitet `data-l`, `data-d`, Rückfall ab. Termin: `terminUrl` leer → `<a class="btn ghost" href="#termin">` (Text aus `de.json`), Ziel ist die gelb markierte Notiz „Der Terminlink folgt.“ (`id="termin"`); gesetzt → `href=URL` mit `rel="noopener"`, ohne Einbettung.
4. **Bilder (AK 2, AK 3):** `tools/pruefung/bilder.mjs` lädt `foto.png` in Headless-Chrome (`puppeteer-core`), zeichnet in Canvas, `toBlob('image/webp', .82)` und `('image/jpeg', .85)`; Canvas schreibt keine Metadaten. Favicon: Motiv aus der Grafik (gelber Block auf `--ink`, WAS-Frage 2) als PNG 32/180 per Canvas; `favicon.ico` = ICO-Kopf + PNG (Node-Bordmittel). Ergebnis committen; Build kopiert nur.
5. **Feinschliff (AK 5), nur Abschnitt am Ende von `site.css`, keine neuen Farben/Schriften/Texte:** (a) Fokus: `:focus-visible` auch für `.name`, `nav a`, Footer-Links, Knöpfe im Kontakt (Kontrast auf dunklem Grund mit `--amber`); (b) Hover: Unterstreichung für Footer- und Textlinks, kein `transition`; (c) Typografie: `text-wrap:balance` für h1–h3, `text-wrap:pretty` für `p`, `hyphens:auto` + `overflow-wrap:break-word` (390 px, lange Komposita); (d) Abstände: `.case h3`/`.tag`, `.certs small`, Abstand Kontakt ↔ Fußleiste mit `.bar` (390 px nichts verdeckt); (e) Dark Mode: `:root{color-scheme:light dark}`; Kontrastfehler im Kontakt mit vorhandenen Palettenfarben beheben (Notiz = helles `--muted` #475A68, `.ph-hell` = `var(--bg)`, WAS-Frage 1); (f) reduzierte Bewegung: bestehende Regel bleibt, zusätzlich keine weitere Animation; Einstiegsanimation der Grafik bleibt einzige Bewegung; (g) Druck: `.bar`, Nav, `.cta`, Kontakt-Knöpfe aus; Kontakt hell; externe Links mit URL; `break-inside:avoid` für `.case`, `.row`, `.certs li`; `.ph` mit `print-color-adjust:exact`; Entwurfsbanner bleibt; (h) Foto `loading="lazy" decoding="async"`.
6. **Platzhalterseiten/404 (AK 3):** `impressum.html`, `datenschutz.html` (Banner, Titel, „{ph:in Arbeit}“, keine Angaben); 404-Banner ohne Gelb-Hinweis, Text `fehlerseite.entwurf`.
7. **Prüfwerkzeug (AK 6):** `tools/pruefung/package.json` mit exakt festgenagelten devDependencies `lighthouse 13.5.0`, `axe-core 4.14.0`, `html-validate 11.16.2`, `puppeteer-core 25.12.0`; `.npmrc` (s. Review 3), Einrichtung `npm ci --prefix tools/pruefung`; `npm audit` in Evidenz. `server.mjs` (node:http, Port 8400–8499 nach Belegung, Header `Content-Security-Policy: default-src 'self'`, liefert `404.html` bei Fehlpfad). `pruefen.mjs`: Build in Temp, Lighthouse programmatisch (Node-API, kein CLI) für `index.html` mobil + Desktop (Desktop-Konfiguration, `CHROME_PATH`, ohne Fehlerbericht, JSON+HTML), axe hell **und** dunkel, auf 1280 und 390 px, alle Seiten; html-validate über alle `.html`; Linkbericht (aus `check.mjs`, externe Links einmal per `fetch` mit Status, LinkedIn-999 begründen); `scrollWidth ≤ 390`; Screenshots 1280/390 hell/dunkel. Zusätzlicher SEO-Lauf gegen Temp-Build mit `indexierbar:true` (belegt: Rest-SEO ≥ 90). Berichte nach `evidenz/T-002/pruefung/`.
8. Doku (`ENTSCHEIDUNGEN.md`, PROJEKT „Befehle“), Evidenz (`dir dist`, Platzhalterliste, `git log -1`).

## 3. Tests (AK → Test/Beleg), Root-Suite ohne Abhängigkeit
| AK | Test / Beleg |
|---|---|
| 1 | `vergleicheTexte(Fixture, index)` = keine Differenz außer Adresse; Struktur-Vergleich mit Erlaubtliste leer; Anzahl `ul.certs li > b` = 8, `article.case` = 3; jeder `.ph` des Mockups auch in der Seite; Selbsttests (Text geändert → gemeldet) |
| 2 | WebP: RIFF/`WEBP`, Maße 512×512, keine Chunks `EXIF`/`XMP `/`ICCP`; JPEG: SOF 512×512, kein APP1 (`Exif`/XMP), kein APP2 `ICC_PROFILE`; `<img>` mit `width`, `height`, `alt` aus `de.json`, `<source type="image/webp">`; `check` lehnt `.svg`/`.gif` ab |
| 3 | `dist` enthält `favicon.ico` (ICO-Kopf, PNG darin), `<link rel="icon">` auf allen Seiten; 404-Banner enthält nicht `entwurf.text`; Footer verweist auf `impressum.html`/`datenschutz.html`, beide existieren, enthalten „in Arbeit“ als `.ph`, keine Ziffernfolgen ≥ 5 (keine PLZ/USt) |
| 4 | Adresse aus Konfig geändert (`x@example.org`) → `data-l/-d` und Rückfall ändern sich, sonst bytegleich; `kontakt@enricofalk.de` und `info@` stehen in keiner Datei unter `src/` außer `site.config.json`; HTML ohne `mailto:`/Klartext-Adresse; `terminUrl` leer → `href="#termin"` und `id="termin"` existiert; `terminUrl="javascript:…"`/`http:` → Build-Fehler |
| 5 | Look-Invarianten: `:root`-Tokens hell/dunkel gleich Mockup; Farbliterale in `site.css` ⊆ Mockup (+ `#F3E3BC`); `font-family`-Namen ⊆ Mockup; `@keyframes` nur `rein`, `animation` nur `.gauge`, kein `transition`; Mockup-Regeln vorhanden außer benannter Liste `GEAENDERT` (Begründung je Regel); Regeln `@media print` und `prefers-reduced-motion` vorhanden. Sicht: Screenshots (QA, ⚠️ Sichtprüfung Enrico für Look) |
| 6 | Berichte in `pruefung/` (Werte je Kategorie, Befunde begründet); `check.mjs`-Linkprüfung als Test: toter `#anker`, fehlende `.html` → rot |
| 7 | bestehende `check`-Tests grün; neu: alle 4 HTML-Seiten ohne Inline-CSS/-JS; Root-`package.json` weiter ohne `dependencies`/`devDependencies` |

## 4. Scope-Grenze
Keine Textänderung außer 404-Banner und den vom Ticket verlangten Platzhalterseiten; keine Rechtstexte, Anschrift, USt-IdNr. (B-002); kein Skip-Link (neuer Text); keine neue Sitemap-Einträge; kein PDF/.tar (T-003); `kontakt.js`, Header am Server, `noindex`-Strategie unverändert.

## 5. Smoke
`npm run build` grün; Seite über `server.mjs` mit CSP-Header: Konsole ohne CSP-Verletzung, Foto (WebP) geladen, Favicon ohne 404, mit/ohne JS Kontakt wie T-001, Termin-Knopf springt zur Notiz, 404 unter tiefem Pfad, Druckvorschau (PDF-Druck headless, Sicht).

## 6. Plattform
E2E Windows (Chrome 155, Node 24.19). Build und Root-Tests nur Bordmittel → Linux/IONOS gleich; Bilder sind committete Dateien. Prüfwerkzeug läuft nur auf dem KI-PC (Linux-Kompatibilität nicht nötig, nicht Teil von `dist`).

## 7. DoD-Abgleich
Hilfe-Doku: nicht betroffen (keine Hilfe-Seite). Persistenz/Backup: nicht betroffen. Datenschutz: keine Fremdanfragen/Cookies, Bild ohne Metadaten, keine persönlichen Angaben aus `Meine_Angaben.txt` außer Mockup-Inhalten; Foto-Freigabe offen (WAS 3). Kompatibilität: Node ≥ 22 für Build; Prüfwerkzeug Node ≥ 22.22/24.8. Betrieb: Befehle in PROJEKT. Tests/Lint: `npm test`, `node --check`; html-validate ersetzt teilweise Lint fürs HTML. Evidenz: `docs/batches/B-001/evidenz/T-002/`.

## P2 Selbstreview (eingearbeitet)
- (1 Outcome) Lighthouse-SEO kann wegen `Disallow` nicht ≥ 90 sein → Zusatzlauf mit `indexierbar:true` belegt, dass nur der Entwurfsstand fehlt (ergänzt in 2.7).
- (2 Verträge) Inhaltsvertrag ändert sich: alle Leser kartiert (Vertrag, `index.mjs`, `build.test` AK3/AK7, `compare.mjs` `{adresse}`); `kontakt.js` bleibt über `data-*` stabil. Footer auf 404 absolut, auf Seiten relativ (öffnen per `file://` bleibt möglich).
- (3 Fehlerfälle) Dark-Mode-Kontrast nur sichtbar mit axe im Dunkelmodus → axe hell und dunkel (ergänzt). `image-size-responsive` kann bei 512-px-Foto auf Mobil warnen → im Bericht begründen, Ursache Quellbild (WAS 3).
- (4 Seiteneffekte) Prüfwerkzeug isoliert unter `tools/pruefung/`, Root bleibt ohne Abhängigkeit; Chrome-Profil in Temp, nicht im Benutzerprofil.
- (5/6) Linkprüfung erweitert `check.mjs` statt `linkinator` (keine weitere Abhängigkeit); Bildweg ohne `sharp` (native Binärdatei, größere Lieferkette) über ohnehin nötiges `puppeteer-core`.
- (7 Sicherheit) Abhängigkeiten festgenagelt, Lockfile, `--ignore-scripts`, `npm audit`; Lighthouse ohne Fehlerberichte (Sentry aus); `terminUrl` über `pruefeUrl`.
- (8 Fremdes) Dark-Mode-Korrektur ist eine Farbabweichung vom Mockup → als WAS-Frage, nicht still.

## Review-Befunde (Plan-Review Runde 1, freigegeben mit Auflagen) und Umsetzung
**Major**
1. *„Profil als PDF laden“ mit `href="#"`* (`index.mjs:101`): wird sichtbarer Platzhalter wie der Terminlink: `href="#pdf"`, Ziel ist eine gelb markierte Notiz (`{ph:…}`, Text WAS 2), PDF folgt in T-003. `check.mjs`-Linkprüfung meldet jedes bloße `href="#"` als Befund, ausgenommen `a.name` (Sprung nach oben wie im Mockup). Test: `href="#"` an anderem Element → rot.
2. *Kontakt-Notiz „Die Adresse ist vorläufig, ob eine eigene Seiten-Adresse kommt, ist offen“* passt nicht mehr zum Nachtrag 17:21 (`kontakt@enricofalk.de`). Bis zur Antwort bleibt der Mockup-Text unverändert (AK 1: Texte nicht ändern); WAS 3.
3. *Lieferkette Lighthouse:* `@sentry/node` und `configstore` sind reguläre Abhängigkeiten (Recherche korrigiert). Lighthouse läuft **nur programmatisch** aus `pruefen.mjs` (Node-API `lighthouse(url, flags, config)` mit eigenem `chrome-launcher`-Start), kein CLI, also kein Aufruf von `configstore`/Nachfrage, Fehlerbericht aus (`enableErrorReporting` nicht gesetzt bzw. `false`). `tools/pruefung/.npmrc`: `ignore-scripts=true`, `save-exact=true`, `fund=false`. Gate-Unterlage `evidenz/T-002/abhaengigkeiten.txt` (nur `--package-lock-only` im Scratch-Ordner): **121 Pakete**, davon 14 `@sentry`/`@opentelemetry`, keine Install-Skripte, `ws` 8.22.0 und 7.5.13 (≥ 7.5.10), `npm audit`: 0 Befunde.

**Minor, verbindliche Umsetzungshinweise**
4. `bilder.mjs`: Quellpfad als Argument (kein fester Pfad in „Meine Ablage“), Bild als `data:`-URL bzw. `createImageBitmap` in die Seite, kein Dateizugriff aus der Seite. Test über **alle** Bilder in `dist/`: keine PNG-Chunks `tEXt`/`zTXt`/`iTXt`/`eXIf`/`tIME`, WebP ohne `EXIF`/`XMP `/`ICCP`, JPEG ohne APP1/APP2-Metadaten; `foto.png` liegt nie unter `src/` oder `dist/`.
5. Prüfserver bindet nur `127.0.0.1`, fester Port aus 8400–8499 (Belegung), Pfad normalisieren und auf `dist` begrenzen (`..`, Backslash, `%2e` → 404). Chrome wird im `finally` beendet; Flags `--headless=new --disable-background-networking --disable-component-update --no-first-run`, Profil in Temp.
6. Vergleich: **eine** abschließende Erlaubtliste in `compare.mjs` (Stil-Klassen, Mail-Teil, Footer-Ziele, `href="#termin"`/`#pdf`, `id="termin"`/`id="pdf"`, `<picture>/<source>`, `img src`, `loading`, `decoding`, Favicon-`<link>`); je Ausnahme ein Selbsttest (Ausnahme an anderem Element → gemeldet).
7. Lighthouse Pflicht nur `index.html`, mobil und Desktop; `impressum.html`, `datenschutz.html`, `404.html` mit axe und html-validate. SEO-Abweichung durch `Disallow` als eigener offener Punkt im Bericht (WAS 6), Zusatzlauf mit `indexierbar:true` als Beleg.
8. Bericht nennt, dass Termin- und PDF-Platzhalter über die gelbe Notiz markiert sind (Platzhalterliste).
9. Test/axe: `.ph` im Kontaktbereich im Dunkelmodus erkennbar (Kontrast Text ≥ 4,5:1, Markierung sichtbar; Screenshot dunkel 390/1280).
10. `hyphens:auto` nur für Fließtext (`p`, `dd`, `li`) bis 560 px, nicht für `h1`–`h3` und `.name`.
11. LinkedIn: `de.json` übernimmt die Profil-URL des Mockups; der Link steht in der Platzhalterliste zur Bestätigung (WAS 5). Externe Abrufe mit Timeout (10 s), Ergebnis nur im Bericht. Puppeteer protokolliert jede Anfrage an einen anderen Host als `127.0.0.1` als Evidenz (`fremdanfragen.txt`, Erwartung: leer).
12. `tools/pruefung/.htmlvalidate.json` mit `html-validate:recommended`; jede abgeschaltete Regel mit Grund in `ENTSCHEIDUNGEN.md`.
13. Root-`package.json` bekommt nur das Skript `"pruefen": "node tools/pruefung/pruefen.mjs"` (keine Abhängigkeit). Root-Test: keine Datei unter `src/` und `scripts/` importiert aus `tools/`. Einrichtung als Einzelbefehl `npm ci --prefix tools/pruefung` (PROJEKT „Befehle“).
14. Bericht nennt Chrome 155 gegenüber der von `puppeteer-core 25.12.0` erwarteten Chrome-Version (Abweichung, Wirkung). `.gitattributes`: `*.webp binary`, `*.jpg binary`, `*.ico binary`.

## Offene Punkte (Gate)
**Gate-Auslöser:** neue Paketdefinition mit Abhängigkeiten `tools/pruefung/package.json` + Lockfile + `.npmrc` (121 Pakete, nur Prüfwerkzeug, nicht in Build/`dist`; Unterlage `abhaengigkeiten.txt`) und Root-Skript `pruefen`.

WAS-Fragen:
1. Dark-Mode-Kontrast im Kontakt mit vorhandenen Palettenfarben korrigieren (Mockup-Fehler, sonst axe „serious“)?
2. „Profil als PDF laden“: bis T-003 Link auf gelbe Notiz, Vorschlag Text „Das Profil als PDF folgt.“ (neuer Text) – einverstanden?
3. Kontakt-Notiz „Die Adresse ist vorläufig, ob eine eigene Seiten-Adresse kommt, ist offen“ ist nach 17:21 überholt: neuer Text? Bis dahin bleibt der Mockup-Text.
4. Termin-Platzhalter als Link auf die gelbe Notiz „Der Terminlink folgt.“ – passt die Form?
5. LinkedIn-Profil-URL aus dem Mockup bestätigen.
6. SEO < 90 nur wegen `robots.txt Disallow` (Entwurfsstand) mit Begründung und Zusatzlauf – als AK-6-Erfüllung akzeptiert?
7. Favicon-Motiv: gelber Block aus der Grafik auf dunklem Grund?
8. Foto: Veröffentlichung in `Meine_Angaben.txt` unbeantwortet; Quelle nur 512 px (gewünscht ≥ 1200, Lighthouse kann „niedrige Auflösung“ melden).
9. 404-Banner „Entwurf vom 19.10.2026.“ + „Diese Seite ist Teil des Entwurfs.“; Entwurfsbanner bleibt im Druck sichtbar.

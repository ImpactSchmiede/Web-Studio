# Plan T-001 – Stack entscheiden und Gerüst (B-001) · Fassung 2

Stand 2026-10-19 · Planer (opus/medium) · Grundlage: Ticket T-001 inkl. **AK 7** (frisch von Disk), Mission B-001, Konzept, Mockup `Mockup_Startseite.html` (UTF-8 ohne BOM, LF), VPS-Thread. Fassung 2 arbeitet das Plan-Review ein (B1, B2, M1–M4, m1–m8).

**0. Recherche** – [Live-Code] Node v24.19.0: `fs.cpSync`, `readdirSync({recursive:true})`, `node:test`; `node --test` mit Glob ab Node 21. [Live-Code] Edge und Chrome vorhanden. [Live-Code] Beide Lizenzen SIL OFL 1.1, ASCII mit LF (bleiben unter `text=auto eol=lf` hash-gleich). [Live-Code] Mockup hat 24 `style=""`-Attribute (14× SVG `--i:N`, 9× Abstände, 1× `ph` mit `color:#F3E3BC`), einen Inline-`<style>`, ein Inline-`<script>`. [Doku, in P5 bestätigen] Headless `--screenshot`, `--window-size`, `--virtual-time-budget`, `--blink-settings=scriptEnabled=false` (falls nicht wirksam: Rückfall per Test auf statischem HTML belegen, im Bericht nennen).

## 1. Impact-Analyse
Projektweite Suche nach Build/Template/Generator: ergebnislos (Repo nur `docs/`, `.claude/`).

| Bereich | Datei | Anpassungsbedarf |
|---|---|---|
| Paket | `package.json` (neu) | `private`, `type: module`, `engines.node >=22`, Scripts `build`, `test`, `check`; keine dependencies |
| Inhalt | `src/content/de.json` (neu) | alle Texte inkl. Nav, `aria-label`, SVG-Ebenennamen, 404, Mail-Adressteile (`lokal`, `domain`, `betreff`, Rückfalltext) |
| Konfig | `src/site.config.json` (neu) | `baseUrl: https://enricofalk.de/` (kanonisch, ohne www), `indexierbar: false`, `erlaubteEndungen` |
| Layout | `src/templates/*.mjs` (neu) | Template-Funktionen, keine Texte, kein Inline-CSS/JS |
| Stil | `src/styles/site.css` → `dist/css/site.css` | Mockup-CSS wörtlich + neue Klassen für die 24 `style=""`; `@font-face` → `url(../fonts/…)` |
| Skript | `src/scripts/kontakt.js` → `dist/js/kontakt.js` | Adresse setzen, `mailto`-href, Kopier-Handler (Logik aus Mockup) |
| Build | `src/build/{build,check,text,compare}.mjs`, `scripts/{build,check}.mjs` | Bibliothek + dünne CLIs |
| Schriften | `src/fonts/` (4 woff2 + 2 LICENSE) | Kopie, hash-gleich |
| Tests | `test/*.test.mjs`, `test/fixtures/mockup-startseite.html` | Fixture = unveränderte Mockup-Kopie (Quelle, Datum im Kopf) |
| Git | `.gitattributes` | `*.woff2 binary`, `*.png binary`; Lizenz-`.txt` bleiben Text (LF, geprüft) |
| Doku | `docs/ENTSCHEIDUNGEN.md` (neu), `docs/architektur/README.md` (Verweis) | 5-Zeilen-Begründung, eine Quelle |
| Doku | `docs/PROJEKT.md` | nur „Befehle“ und „Für Enrico: Stand holen und starten“ (2.10) |
| Konzept | `docs/konzept/freelancer-seite.md` | nur `git add` (geschützt, Co-PO) |
| Unverändert | Mockup, `docs/konzept/*`, Co-PO-Zeilen in `PROJEKT.md`, `.claude/` | fremd bzw. T-002 |

## 2. Vorgehen
1. Tests zuerst (rot), Fixture kopieren.
2. Schriften + Lizenzen nach `src/fonts/`. CSS aus Mockup nach `site.css`; Schriftpfade `../fonts/`.
3. **Inline-Stile in Klassen (B1):** SVG `--i:0…13` → `.d0`–`.d13` (je `--i:N` in `site.css`, Animation unverändert); Abstände → benannte Klassen (z. B. `.mt-06`, `.mt-1`, `.mt-2`, `.mb-08`, `.m0`, `.mt-12`); `ph` im Kontakt-Hinweis → `.ph-hell` (`color:#F3E3BC`). Werte exakt wie im Mockup.
4. **Seiten-Kopf:** `<link rel="stylesheet" href="css/site.css">`, `<script src="js/kontakt.js" defer>`; 404 nutzt `/css/site.css` absolut (wird unter beliebigem Pfad ausgeliefert), kein Skript, Links auf `/`, Entwurfsbanner (offener Punkt 3).
5. **Mail-Verschleierung (M1, AK 7):** HTML enthält weder Klartext-Adresse noch `mailto:`. Ohne JS: Rückfall „kontakt [at] enricofalk.de“ im `#addr`, Mail-Knopf und Kopier-Knopf verborgen (`hidden`). `kontakt.js` liest Adressteile aus `data-`-Attributen (aus `de.json`, z. B. `data-l`, `data-d`, `data-s`), setzt Text der Adresse, `href="mailto:…?subject=Anfrage%20Agile%20Coaching"`, zeigt Knöpfe, hängt den Kopier-Handler an. Mit JS identisch zum Mockup. **Vom Ticket verlangte Ausnahme** zu „Look unverändert“: nur ohne JS sichtbar.
6. **Text (m4):** erst tokenisieren (`{ph:…}`, `[Text](url)`), dann Textteile und URL getrennt escapen (`& < > " '`). URL: Schema roh, getrimmt, klein gegen Allowlist `https:`, `mailto:`; relativ nur `#…` und `/…` (nicht `//`); Steuer- und Leerzeichen am Anfang ablehnen → Build-Fehler.
7. **Build:** `build({outDir, root})` leert `outDir` nur, wenn es `<root>/dist` oder unter `os.tmpdir()` liegt; schreibt `index.html`, `404.html`, `css/site.css`, `js/kontakt.js`, `robots.txt` (`indexierbar:false` → `User-agent: *` / `Disallow: /`), `sitemap.xml` (nur `<loc>` der Basis-URL, kein `lastmod`), `fonts/`; prüft Inhaltsvertrag (Pflichtschlüssel, String) mit Schlüsselnamen im Fehler; danach `checkDist`.
8. **checkDist(dir, {maxBytes 20 MB, maxFiles 500, endungen}) (M2, M3, m2, m3):** Traversierung per `readdirSync({recursive:true, withFileTypes:true})` bzw. `lstat`, folgt keinen Links; nur reguläre Dateien/Ordner; kein Pfadteil mit `.` am Anfang; Endungs-Allowlist `.html .css .js .woff2 .txt .xml` (konfigurierbar, `.pdf`/Bilder in T-003, endgültige Liste liefert VPS-PO); `index.html` und `404.html` auf oberster Ebene; Größe/Anzahl. HTML: kein `<style`, kein `<script` ohne `src`, kein `style=`-Attribut (auch SVG), keine `on…=`-Handler, keine `javascript:`-URL. Extern verboten: `src`, `srcset`, `<link href`, `url(…)` (ohne/mit `"`/`'`), `@import` mit `http(s):` oder `//`; `<a href>` nach außen erlaubt. Existenz: jede lokale Referenz aus `src`, `<link href>` und `url(…)` in `.css` (relativ zur jeweiligen Datei, `/…` relativ zu `dist`). Alle Befunde sammeln, Exit 1.
9. CLI gibt Dateiliste mit Größen und Summe aus.
10. **PROJEKT.md (m1):** eigene Abschnitte auf Basis `git show HEAD:docs/PROJEKT.md` in einer Scratch-Datei ändern → `git hash-object -w <datei>` → `git update-index --cacheinfo 100644,<hash>,docs/PROJEKT.md` → `git diff --cached docs/PROJEKT.md` prüfen (nur eigene Zeilen). Dieselben Abschnitte auch im Arbeitsbaum ergänzen, Co-PO-Zeilen bleiben dort unversioniert; Hinweis im BERICHT.
11. `ENTSCHEIDUNGEN.md`: Stack + 5 Zeilen (keine Abhängigkeit/Lieferkette; offline, ohne Konto; `dist/` ziel-neutral VPS/IONOS, CSP-tauglich; wenig Pflege; übertragbar) + verworfene Alternativen (Eleventy, Astro).
12. Evidenz: Build-Ausgabe, `npm test`, `dir /s dist`, Vergleichsbericht (3.), Screenshots, `git log -1`.

## 3. Tests (AK → Test/Beleg)
| AK | Test / Beleg |
|---|---|
| 1 | Artefakt `docs/ENTSCHEIDUNGEN.md` |
| 2 | `git ls-files docs/konzept/freelancer-seite.md` nicht leer |
| 3 | jeder `de.json`-String (≥ 12 Zeichen) fehlt in `src/templates/*`; geänderter Text erscheint in Ausgabe; fehlender Schlüssel bricht Build mit Namen ab; Escaping/URL: `<script>&`, `javascript:`, `JaVaScRiPt:`, `" javascript:"`, `//evil`, `data:` → abgelehnt bzw. escaped |
| 4 | `dist` enthält genau die Pflichtdateien; robots sperrt alles; sitemap nennt `https://enricofalk.de/`; zwei Builds bytegleich |
| 5 | Schriften und Lizenzen hash-gleich zur Quelle; Lizenzen enthalten „SIL Open Font License“ |
| 6 | `npm run build` + `npm test` auf Windows, Ausgabe + `dir /s dist` |
| 7 | `checkDist` grün auf echtem Build; je Zweig ein Negativtest: `<style>`, Inline-`<script>`, `style=` (HTML und SVG), `onclick=`, `javascript:`-href, externe `url(https://…)`/`url("//…")`/`url('…')`, `<link href="//…">`, fehlende lokale CSS-/Schriftdatei, Punktdatei, `.php`, `index.html` nur in Unterordner, Limits (kleine Grenzwerte), Link: Junction (Windows) bzw. Symlink (Linux), je nach Plattform, nie still übersprungen; Mail: HTML ohne Adresse und ohne `mailto:`, Rückfalltext vorhanden, `kontakt.js` enthält keine Klartext-Adresse |
| 1:1 (B2) | `compare.mjs` im Test: (a) Body von Fixture und `dist/index.html` normalisiert (Whitespace, Attributreihenfolge), Textknoten identisch bis auf Kontakt-Adresse; Unterschiede nur: entfernte `style`, neue Klassen, Mail-Teil; (b) jede Regel des Mockup-CSS ist in `site.css` enthalten (nach Normalisierung, Schriftpfad `../fonts/` berücksichtigt), zusätzliche Regeln nur für neue Klassen |
| 1:1 Bild (M4) | Screenshots Mockup vs. `dist`, 1280 und 390 px, hohes Fenster (ganzseitig), `--virtual-time-budget=5000`, beide per HTTP aus Scratch-Server (Port 8400–8499 nach Belegung); PNG-Hash-Abweichung = Befund im Bericht, kein Testfehlschlag |

Tests bauen in `fs.mkdtempSync(os.tmpdir())`, nie in `dist/`, lesen nicht aus „Meine Ablage“.

## 4. Scope-Grenze
Keine Änderung an Look/Texten außer der von AK 7 verlangten Mail-Verschleierung (nur ohne JS sichtbar); keine Impressum-/Datenschutz-Seiten (Footer bleibt `href="#"`, offener Punkt 4); kein `noindex`-Meta; kein PDF/`.tar`/SHA256 (T-003); keine Prüfläufe Lighthouse/axe/html-validate (T-002); kein `.htaccess`/Header (VPS-Admin).

## 5. Smoke
`npm run build` (Exit 0, Check grün); `dist/` per Scratch-HTTP-Server headless rendern (Index, 404 unter `/gibt/es/nicht`): Schriften geladen, Adresse mit JS als Klartext und „Adresse kopieren“ sichtbar; ohne JS (`--blink-settings=scriptEnabled=false`) Rückfalltext sichtbar. Kein externes System.

## 6. Plattform
Belegt auf Windows. Nur Node-Bordmittel, Pfade über `path`, LF, ASCII-Dateinamen → Linux (VPS) und IONOS gleich. Link-Negativtest je Plattform (Junction/Symlink).

## 7. DoD-Abgleich
Hilfe-Doku: nicht betroffen (P0). Persistenz/Migration/Backup: nicht betroffen, `dist/` erzeugbar. Datenschutz: keine Drittanfragen, keine Cookies, Adresse für Sammler verschleiert, Skript nur Kontakt. Kompatibilität: Node ≥ 22. Betrieb: Befehle im Steckbrief. Tests: `npm test`; Lint/Format/Typen: nicht anwendbar (keine Werkzeuge ohne Abhängigkeit), `node --check` je Datei im Test. Evidenz: `docs/batches/B-001/evidenz/T-001/`.

## P2 Selbstreview (Fassung 2, eingearbeitet)
- (1 Outcome) 1:1 jetzt über Struktur-/CSS-Vergleich + Screenshots statt Bytegleichheit, die AK 7 unmöglich macht.
- (2 Verträge) CSS in Unterordner → Schriftpfade `../fonts/`; 404 absolut `/css/`; Existenzprüfung löst relativ zur jeweiligen Datei auf. `data-`-Attribute sind Vertrag zwischen Template und `kontakt.js`.
- (3 Fehlerfälle) Negativtest je Check-Zweig und je URL-Angriffsform; Link-Test plattformabhängig, ohne stilles Überspringen.
- (4 Seiteneffekte) `dist/` nur mit Pfadwächter leeren; Staging von `PROJEKT.md` ohne Co-PO-Zeilen.
- (5/6) Suche ergebnislos; keine Template-Engine, zwei Inline-Formen.
- (7 Sicherheit) CSP `default-src 'self'` ohne Ausnahme erfüllbar; Escaping nach Tokenisierung; URL-Allowlist.
- (8 Fremdes) Rückfall-Look ohne JS ist vom Ticket verlangt und benannt; sonst nichts außerhalb des Tickets.

## Offene Punkte (für Gate/Hauptsitzung)
1. **Gate-Auslöser:** neue Paketdefinition `package.json` (ohne Abhängigkeiten) → P4 als FRAGE.
2. WAS (m5): `robots.txt` sperrt alles, kein `noindex`-Meta; `X-Robots-Tag` für Vorschau als Wunsch an VPS-Admin. Einverstanden?
3. WAS: 404 mit Entwurfsbanner? Vorschlag: ja.
4. WAS (m6): Impressum-/Datenschutz-Platzhalterseiten (Mission „Enthalten“) in T-002 statt T-001?
5. WAS: Rückfall ohne JS „kontakt [at] enricofalk.de“ mit verborgenen Mail-/Kopier-Knöpfen. Passt das als Schreibweise?
6. Endgültige Endungsliste kommt vom VPS-PO; bis dahin vorläufige Allowlist (konfigurierbar).

## Auflagen Plan-Review Runde 2 (freigegeben mit Auflagen, in P5 umzusetzen)
- N1: `[hidden]{display:none!important}` in `site.css` (als erlaubte Zusatzregel in compare.mjs (b)); Smoke ohne JS prüft, dass beide Knöpfe unsichtbar sind.
- N2: compare.mjs bewusst eng (Regex auf das bekannte Mockup); Selbsttest Mockup gegen Mockup = keine Differenz, gezielte Textänderung = Differenz gemeldet.
- N3: vorläufige Endungsliste über den PO an den VPS-Admin melden (im Gate genannt).
- N4: Grenze der Verschleierung (data-Attribute, schwacher Schutz gegen Sammler) in ENTSCHEIDUNGEN.md festhalten.

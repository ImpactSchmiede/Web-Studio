# T-001 Stack entscheiden und Gerüst – Web-Studio B-001

## 2026-10-19 16:24 | PO Web-Studio -> Code | AUFTRAG
Auftragsart: Umsetzung. Branch `batch/B-001`. Mission: `_Austausch\Web-Studio\B-001\_batch.md`.
Pflichtlektüre: `docs/konzept/freelancer-seite.md`, Mockup `C:\Users\<benutzer>\Meine Ablage\Web-Studio\Freelancer-Seite\Mockups\Mockup_Startseite.html` samt `fonts\`, Hosting-Vorgaben im VPS-Thread (Abschnitt Lieferform).
Ziel: Ein Gerüst, das das Mockup 1:1 als Seite erzeugt und ein gültiges `dist/` baut.
Akzeptanzkriterien:
1. Stack-Entscheidung (statischer Generator oder schlankes Node-Skript) mit 5 Zeilen Begründung in `docs/ENTSCHEIDUNGEN.md`; lokal, kostenlos, ohne Konto, ohne Fremdanfragen.
2. Konzept `docs/konzept/freelancer-seite.md` ist im Repo committet (liegt unversioniert unter `docs/konzept/`).
3. Inhalte getrennt von Layout (Texte in einer Datei), damit B-002 nur Texte füllt.
4. `npm run build` erzeugt `dist/` mit index.html, 404.html, robots.txt (noindex bis B-003), sitemap.xml, `fonts/` samt Lizenztexten, nur normale Dateien.
5. Kopierte Schriften: Bricolage Grotesque und Atkinson Hyperlegible aus dem Mockup-Ordner, Lizenztexte liegen bei.
6. Selbstcheck: Build läuft sauber auf Windows; Ausgabe `dist/` aufgelistet.
7. Vorgaben des PO VPS-Administration (CSP `default-src 'self'`): kein Inline-CSS, kein Inline-JS, Skript und Stile nur als eigene Dateien in `dist/`; die Mockup-Datei hat beides noch inline und wird entsprechend aufgeteilt (Mail-Verschleierung als eigene .js, ohne JS Rückfall auf lesbare Schreibweise). `dist/` später als unkomprimiertes .tar, index.html und 404.html oben, keine Symlinks/versteckten Dateien, erlaubte Endungen liefert der VPS-PO nach.
Entscheidungen, die du treffen darfst: Generator, Ordnerstruktur, Build-Werkzeuge.
Nicht ändern: Look und Texte des Mockups (das ist T-002).
Evidenz im BERICHT: Entscheidungstext, `git log -1`, `dir dist` (rekursiv), Build-Ausgabe.
Einzelne git-Befehle, keine verketteten.

## 2026-10-19 16:33 | Code -> PO Web-Studio | FRAGE
Plan-Gate T-001 (Plan: `Web-Studio\docs\batches\B-001\evidenz\T-001\plan.md`, Fassung 2 + Auflagen).
- **Was wird gebaut:** Ein kleines Build-Skript in Node ohne Fremdpakete. Es baut aus einer Textdatei (`src/content/de.json`), Layout-Vorlagen, `site.css` und `kontakt.js` die Seite in `dist/`. Look und Texte bleiben wie im Mockup. Der Build prüft die Lieferform selbst und bricht bei Verstößen ab.
- **Was ändert sich für den Nutzer:** Die Seite sieht aus wie das Mockup. Mit JS sind Adresse, Mail-Link und „Adresse kopieren“ wie im Mockup. Ohne JS steht „kontakt [at] enricofalk.de“ da, und die beiden Knöpfe sind ausgeblendet (verlangt von AK 7).
- **Was wird NICHT geändert:** Texte und Look (T-002), PDF und .tar (T-003), Prüfläufe Lighthouse und axe (T-002), Header und CSP am Server (VPS-Admin).
- **Auslöser des Gates:** neue Paketdefinition `package.json` (ohne Abhängigkeiten) und WAS-Fragen:
  1. robots.txt sperrt alles, die Seite selbst bekommt kein noindex-Meta. Für die Vorschau den Header `X-Robots-Tag: noindex` als Wunsch an den VPS-Admin. Einverstanden?
  2. 404-Seite mit Entwurfsbanner? Vorschlag: ja.
  3. Die Mission nennt Platzhalterseiten für Impressum und Datenschutz, T-001 hat dafür kein AK. Vorschlag: in T-002, die Footer-Links bleiben bis dahin `#`.
  4. Rückfall ohne JS wie oben beschrieben in Ordnung?
  5. Vorläufige Endungsliste für den VPS-PO (bitte weitergeben): `.html .css .js .woff2 .txt .xml`, später `.pdf` (T-003) und ggf. Bilder (`.webp`/`.jpg` für das Foto). Der Build hat dafür eine einstellbare Positivliste.
- **Technik:** siehe plan.md. Reviewer: Runde 1 nicht freigegeben (Ticket hatte inzwischen AK 7), Runde 2 freigegeben mit Auflagen (`[hidden]`-Regel, Selbsttest des Vergleichers). Die Auflagen sind im Plan.
- **Hinweis:** Die Mail-Verschleierung (Adressteile in data-Attributen, per JS zusammengesetzt) schützt nur schwach gegen Sammler. Für AK 7 reicht das. Die Grenze dokumentiere ich in ENTSCHEIDUNGEN.md.
- **Hinweis:** `docs/PROJEKT.md` hat nicht committete Änderungen von dir. Ich committe nur meine Abschnitte „Befehle“ und „Für Enrico“, deine Zeilen bleiben unangetastet im Arbeitsbaum.
- **Umsetzung P5 (Entscheidung Code, zur Information):** Agent `umsetzer` mit Sonnet/hoch. Grund: eng umrissener Plan mit vielen Randfällen (Vergleich, Prüfzweige, Escaping). Diff, Commit und Staging macht die Hauptsitzung.
-> "Ja, umsetzen" oder "Nein, weil ..."

## 2026-10-19 16:34 | PO Web-Studio -> Code | ANTWORT
Ja, umsetzen. Zu den Fragen:
1. Einverstanden: robots.txt sperrt alles, kein noindex-Meta; Wunsch `X-Robots-Tag: noindex` fuer die Vorschau gebe ich an den VPS-Admin.
2. 404 mit Entwurfsbanner: ja.
3. Impressum/Datenschutz-Platzhalter in T-002; Footer-Links bleiben bis dahin `#`.
4. Rueckfall ohne JS (Adresse als „kontakt [at] enricofalk.de“, beide Knoepfe ausgeblendet): in Ordnung.
5. Endungsliste gebe ich weiter.
Neu: Das Mockup ist von mir angepasst (SAFe/SPC weniger prominent: Titel, Einleitung, Rollen, SPC am Ende der Zertifikate). Bitte aus der aktuellen Datei bauen. Agent `umsetzer` mit Sonnet/hoch ist fuer mich ok. `docs/PROJEKT.md`: meine Aenderungen sind fertig, bitte mitcommitten (sie gehoeren in dieses Repo).
Hinweis fuer T-002 (noch kein Auftrag): Look bleibt, aber Feinschliff der Details ist erwuenscht (Enrico: Design gefaellt, darf ausgefeilter sein).
**Ball:** bei Code

## 2026-10-19 17:15 | Code -> PO Web-Studio | BERICHT
T-001 bereit zur Abnahme
**Was wurde gebaut:** Ein Build-Skript in Node ohne Fremdpakete. Die Texte stehen in `src/content/de.json`, das Layout in `src/templates/`, Stil und Skript liegen als eigene Dateien vor (`site.css`, `kontakt.js`). `npm run build` erzeugt `dist/` und prüft dabei die Lieferform: nur normale Dateien, keine Punktdateien, Endungsliste, 20 MB/500 Dateien, kein Inline-CSS/-JS, keine Fremd-Ressourcen. Bei einem Verstoß bricht der Build ab.
**Wie testen:** im Repo `npm run build`, dann `npm test`. Ergebnis: `dist/` mit 12 Dateien (123 KB), „Pruefung der Lieferform: gruen“. Zum Ansehen `dist/index.html` über einen lokalen Server öffnen (die 404-Seite nutzt absolute Pfade).
**Entscheidungstext:** `docs/ENTSCHEIDUNGEN.md` (Node-Skript statt Generator; 5 Gründe: keine Lieferkette, offline/ohne Konto, `dist/` ziel-neutral VPS/IONOS, wenig Pflege, übertragbar; verworfen: Eleventy, Astro; Grenze der Mail-Verschleierung).

| AK | Test | QA | Beleg |
|---|---|---|---|
| 1 Stack + 5 Zeilen | docs.test | ✅ | `docs/ENTSCHEIDUNGEN.md` |
| 2 Konzept committet | docs.test (git ls-files) | ✅ nach Commit | d286e16 |
| 3 Texte getrennt | build.test (Text ändern → Ausgabe), Inhaltsvertrag | ✅ (Text in Kopie geändert) | `qa/textdatei-test.txt` |
| 4 dist/ Pflichtdateien, nur normale Dateien | build/check.test inkl. Junction, Punktdatei, Endung | ✅ | `dir-dist.txt`, `build-ausgabe.txt` |
| 5 Schriften + Lizenzen | build.test (hash-gleich) | ✅ (im Browser geladen) | `qa/schriften-hash.txt` |
| 6 Build auf Windows | `npm run build`/`npm test` | ✅ | `test-ausgabe.txt` (112 Tests: 111 bestanden, 1 übersprungen = Datei-Symlink braucht unter Windows Sonderrecht, Junction-Test deckt es ab) |
| 7 CSP/kein Inline, Mail-Verschleierung | check.test, compare.test | ✅ (mit CSP-Header ausgeliefert, keine Verletzung; mit/ohne JS geprüft) | `qa/inline-pruefung.txt`, `ohne-js-*.png` |
| 1:1 Mockup | compare.test (Struktur/Text/CSS) + Screenshots | ✅ gegen Stand `e226eb8e` | `vergleich-mockup-dist.txt`, `screenshots-hashes.txt` (1280/390 px bitgleich) |

Belege unter `Web-Studio\docs\batches\B-001\evidenz\T-001\`, `dir dist` rekursiv in `dir-dist.txt`, `git log -1` in `git-log-1.txt`.
**Plattform:** E2E unter Windows (Node 24, Edge/Chrome headless). Für Linux (VPS) und IONOS: nur Node-Bordmittel, `path`-Pfade, LF, ASCII-Dateinamen, Prüfung mit Groß-/Kleinschreibung. Der Symlink-Test läuft dort wirklich.
**Commit:** d286e16 (Code), d1a7ccf (Evidenz `git log -1`), gepusht auf `batch/B-001`. Tests: 111 bestanden, 1 übersprungen (s. o.). Lint/Typen: entfallen, weil es keine Werkzeuge ohne Abhängigkeiten gibt. Smoke: Build, Headless mit/ohne JS, 404 unter tiefem Pfad.
**Prüfung:** Planer → Reviewer (Runde 1 nicht freigegeben wegen AK 7, Runde 2 mit Auflagen) → Umsetzer (Sonnet/hoch) → Diff-Check (1 Major, 6 Minor; die Minors sind behoben, 19 neue Negativtests) → QA (Black-Box, alle AK).
**Wartet auf / bitte prüfen:**
1. **Annahme Mockup-Stand:** Gebaut ist gegen deine Fassung von etwa 16:37 (`e226eb8e`, SAFe/SPC weniger prominent). Um 16:58 hat sich das Mockup noch einmal deutlich geändert: echtes Foto, ausgefüllte Zertifikate und Vermittler-Angaben, eine neue Praxis-Sektion, `info@impact-schmiede.de` und ein Knopf „Erstgespräch buchen“. Das habe ich als Inhalt/Feinschliff für T-002 gewertet und nicht mehr eingebaut. Gründe: Echte Angaben sind laut Mission B-002, ein externer Terminlink ist im Konzept für V1 ausgeschlossen (bitte klären), und für das Foto (`.png`/`.webp`) fehlt noch die Endung in der VPS-Liste. Siehst du das anders: „Nicht abgenommen“, dann ziehe ich nach.
2. **Neue Texte nur auf der 404-Seite** (in `de.json`): Titel „Seite nicht gefunden (Entwurf)“, „Diese Seite gibt es nicht.“, „Vielleicht ist der Link veraltet oder die Adresse falsch geschrieben.“ Das Entwurfsbanner dort nennt „gelb hinterlegte Stellen“, obwohl die Seite keine hat; das ist T-002-Feinschliff.
3. **Für T-002 vorgemerkt:** Es gibt kein Favicon (der Browser fragt `/favicon.ico` an und bekommt 404). Impressum und Datenschutz sind noch Platzhalter.
**Offene Minor-Befunde / Annahmen:**
- `docs/PROJEKT.md` ist mit deinen Änderungen committet; ich habe die Abschnitte „Befehle“ und „Für Enrico“ ergänzt. Die Zeile „Stack: Je Web-Projekt zu entscheiden“ in den Grunddaten ist dein Abschnitt; ein Verweis auf `docs/ENTSCHEIDUNGEN.md` wäre dort sinnvoll.
- Im Temp-Verzeichnis liegen noch 87 alte Testordner `ws-*` aus den ersten Läufen. Der Schutz-Hook blockiert rekursives Löschen; ich umgehe ihn nicht. Neue Testläufe räumen selbst auf.
- QA-Belege mit dem neuen Mockup (echtes Foto, Adresse) habe ich bewusst nicht ins Repo genommen.
-> "Abgenommen" oder "Nicht abgenommen, weil ..."

## 2026-10-19 17:16 | PO Web-Studio -> Code | ABSCHLUSS
Abgenommen. Geprueft: HEAD d1a7ccf = origin/batch/B-001, Arbeitsbaum sauber, `dist/` mit index, 404, robots, sitemap, css, js, fonts vorhanden; Belegtabelle deckt alle AK. Zu deinen Punkten: (1) Mockup-Stand: richtig als T-002 gewertet, das neue Mockup ist der Textstand fuer T-002. Ein Terminlink ist als reiner Link nach aussen erlaubt (keine Einbettung, keine Anfrage vor dem Klick); die URL fehlt noch, bis dahin Platzhalter. Foto-Endungen `.jpg .webp .png .ico` stehen in der Liste des VPS-PO (kein `.svg`). (2) 404-Texte und Banner: ok, Banner in T-002 anpassen. (3) Favicon, Impressum und Datenschutz in T-002. PROJEKT.md-Verweis auf ENTSCHEIDUNGEN ergaenze ich selbst. Temp-Ordner `ws-*`: nicht umgehen, Enrico loescht sie bei Gelegenheit.

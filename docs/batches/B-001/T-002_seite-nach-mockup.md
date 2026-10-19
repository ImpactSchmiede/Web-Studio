# T-002 Seite nach Mockup, Texte, Feinschliff, Prüfläufe – Web-Studio B-001

## 2026-10-19 17:16 | PO Web-Studio -> Code | AUFTRAG
Auftragsart: Umsetzung. Branch `batch/B-001`. Mission: `_batch.md`. Pflichtlektüre: `docs/konzept/freelancer-seite.md`, Mockup `C:\Users\<benutzer>\Meine Ablage\Web-Studio\Freelancer-Seite\Mockups\Mockup_Startseite.html` (aktueller Stand), `foto.png` daneben, Enricos Angaben in `...\Freelancer-Seite\Meine_Angaben.txt` (nur lesen; Anschrift und USt-IdNr. erst in B-002 ins Impressum).
Ziel: Die Seite im Repo entspricht dem aktuellen Mockup inhaltlich und gestalterisch und besteht die Prüfläufe.
Akzeptanzkriterien:
1. Alle Texte aus dem aktuellen Mockup stehen in `de.json` (Hero, Wobei ich helfe, Aus der Praxis mit 3 Beispielen, Profil mit 8 Zertifikaten, Vermittler-Zeile, So arbeite ich, Geschichte, Kontakt, Footer). Entwurfs-/Platzhalterstellen bleiben als solche markiert (gelb) und sind in einer Liste im Bericht aufgeführt.
2. Foto: aus `foto.png` als WebP (und JPG-Rückfall), Exif entfernt, mit Breite/Höhe und Alt-Text; nur erlaubte Endungen (`.jpg .webp .png .ico`).
3. Favicon (`.ico` und/oder PNG, kein SVG-Datei-Icon), 404-Seite ohne falschen Banner-Text, Footer-Links zu Platzhalterseiten `impressum.html` und `datenschutz.html` (Text „in Arbeit“, noch keine echten Angaben).
4. Kontakt: Adresse `info@impact-schmiede.de` nur an einer Stelle (Konstante), damit sie später ohne Eingriff in Layout wechselt; Verschleierung und Rückfall wie in T-001. „Erstgespräch buchen“ als gewöhnlicher Link, Ziel als Platzhalter, bis Enrico die URL liefert (nicht als toter Link ausliefern, sondern sichtbar als Platzhalter).
5. Feinschliff der Details ohne Änderung von Look, Farben, Schriften und Texten: Abstände, Typografie-Feinheiten, Fokus-Stile, Hover, Druckansicht, Dark Mode, Handy 390 px, reduzierte Bewegung. Eine Einstiegsanimation bleibt die einzige Bewegung.
6. Prüfläufe, Berichte im Evidenzordner: Lighthouse mobil und Desktop (Performance, Barrierefreiheit, Best Practices, SEO je ≥ 90), axe-core ohne schwere Befunde, html-validate ohne Fehler, Linkprüfung. Befunde, die nur am Entwurfsstand liegen (noindex, Platzhalter), im Bericht begründen.
7. Die Lieferform-Prüfung des Builds bleibt grün; keine Fremdanfragen, kein Inline-CSS/-JS.
Entscheidungen, die du treffen darfst: Prüfwerkzeuge (lokal, kostenlos, ohne Konto), Bildverarbeitung, Details des Feinschliffs. Nicht ändern: Texte (außer 404), Positionierung „Agile Coach und Problemlöser“, Zertifikatsnamen.
Evidenz im BERICHT: Prüfberichte, Screenshots 1280 und 390 px (hell und dunkel), `dir dist`, Platzhalterliste, `git log -1`.
Einzelne git-Befehle, keine verketteten.
**Ball:** bei Code

## 2026-10-19 17:21 | PO Web-Studio -> Code | ANTWORT
Nachtrag zu AK 4/2: Enrico hat die Seiten-Adresse geaendert, sie lautet jetzt `kontakt@enricofalk.de` (Quelle: `Meine_Angaben.txt`, Teil A). Bitte diese Adresse in die Konstante (Mockup zeigt noch die alte). Foto: Enrico hat aktuell kein neues; das 2019er Foto dient nur als Vorlaeufer, bitte als klar vorlaeufig behandeln (Dateiname/Kommentar), Austausch spaeter. Terminlink: bleibt Platzhalter, Enrico konfiguriert erst spaeter. **Ball:** bei Code

## 2026-10-19 17:29 | Code -> PO Web-Studio | FRAGE
Plan-Gate T-002. Plan: `Web-Studio\docs\batches\B-001\evidenz\T-002\plan.md` (Fassung 2), Nachtrag 17:21 ist eingearbeitet.
- **Was wird gebaut:** Alle Texte aus dem aktuellen Mockup kommen nach `de.json`. Die Adresse `kontakt@enricofalk.de` steht nur an einer Stelle (`site.config.json`). Das Foto wird als `foto-vorlaeufig.webp/.jpg` eingebunden, ohne Exif. Dazu kommen ein Favicon, die Platzhalterseiten `impressum.html` und `datenschutz.html` („in Arbeit“) und eine 404-Seite mit passendem Banner. Feinschliff gibt es bei Fokus, Hover, Typografie, Abständen, Dark Mode, Druck und reduzierter Bewegung, ohne neue Farben, Schriften oder Texte. Die Prüfläufe sind Lighthouse (index mobil und Desktop), axe (hell und dunkel, 1280 und 390 px), html-validate und eine Linkprüfung; Fremdanfragen werden protokolliert.
- **Was ändert sich für den Nutzer:** Die Seite zeigt den Inhalt des neuen Mockups. Termin- und PDF-Knopf führen sichtbar zu gelb markierten Hinweisen und nicht ins Leere.
- **Was wird NICHT geändert:** Texte (außer 404, Platzhalterseiten und den beiden Hinweisen unten), Positionierung, Zertifikatsnamen, Farben und Schriften. Das PDF kommt in T-003, echte Rechtstexte in B-002.
- **Auslöser des Gates:**
  - **Neue Abhängigkeit:** nur für die Prüfung, getrennt vom Build in `tools/pruefung/` (eigene `package.json`, Lockfile, `.npmrc` mit `ignore-scripts`). Der Build und `dist/` bleiben ohne Fremdpakete. Versionen fest: lighthouse 13.5.0, axe-core 4.14.0, html-validate 11.16.2, puppeteer-core 25.12.0. Das sind 121 Pakete, `npm audit` meldet 0 Befunde, kein Paket hat ein Install-Skript (`evidenz/T-002/abhaengigkeiten.txt`). Lighthouse bringt Sentry mit; es läuft deshalb nur programmatisch und mit abgeschaltetem Fehlerbericht. Netzzugriffe gibt es nur bei der Installation über die npm-Registry und bei der Linkprüfung (einmal je externem Link, mit Timeout).
  - **WAS-Fragen:**
    1. **Dark Mode, Kontaktbereich:** Im Mockup stehen Notiz und gelber Platzhalter dort hell auf hell (etwa 1,3:1), axe meldet das als schwer. Darf ich das mit vorhandenen Palettenfarben korrigieren?
    2. **PDF-Knopf:** Bis T-003 führt er auf eine gelbe Notiz „Das Profil als PDF folgt.“ (neuer Text). Einverstanden?
    3. **Kontakt-Notiz:** Die Notiz „Adresse ist vorläufig, ob eine eigene Seiten-Adresse kommt, ist offen“ passt nicht mehr zu `kontakt@enricofalk.de`. Welcher Text soll dort stehen? Bis zu deiner Antwort bleibt der Mockup-Text.
    4. **Terminknopf:** Er führt auf die gelbe Notiz „Der Terminlink folgt.“ Einverstanden?
    5. **LinkedIn-Link:** Stimmt die Profil-URL aus dem Mockup? Wenn nicht, kommt sie in die Platzhalterliste.
    6. **SEO bei Lighthouse:** Der Wert liegt nur wegen `robots.txt Disallow` (Entwurf, noindex) unter 90. Ich belege das mit einem Zusatzlauf mit `indexierbar:true`. Gilt AK 6 damit als erfüllt?
    7. **Favicon:** Ist der gelbe Block aus der Grafik auf dunklem Grund recht?
    8. **Foto:** Die Freigabe zur Veröffentlichung ist in `Meine_Angaben.txt` unbeantwortet. Die Quelle hat nur 512 px; ich binde es bis höchstens 512 px ein.
    9. **404-Seite:** Banner „Entwurf vom 19.10.2026.“ plus „Diese Seite ist Teil des Entwurfs.“? Das Entwurfsbanner bleibt auch im Druck sichtbar.
- **Technik:** siehe plan.md. Reviewer: freigegeben mit Auflagen, kein Blocker. Die 3 Majors (PDF-Link, Kontakt-Notiz, Lighthouse-Lieferkette) und die Minors sind eingearbeitet.
- **Umsetzung P5 (Entscheidung Code, zur Information):** Code und Tests macht der Agent `umsetzer` mit Sonnet/hoch. Prüfläufe und Feinschliff nach den Befunden macht die Hauptsitzung (Opus/mittel), weil sie dort visuell abwägen muss.
-> "Ja, umsetzen" oder "Nein, weil ..." (gern mit Antworten zu 1–9; was offen bleibt, setze ich wie vorgeschlagen um und führe es im Bericht auf)

## 2026-10-19 17:30 | PO Web-Studio -> Code | ANTWORT
Ja, umsetzen. Pruefwerkzeuge in `tools/pruefung/` (getrennt, fest versioniert, ignore-scripts, audit 0, ohne Konto) sind freigegeben. Zu 1-9:
1. Ja, mit vorhandenen Palettenfarben korrigieren (Kontrast mindestens 4,5:1).
2. Ja.
3. Text: „Platzhalter: Die Mailbox wird vor dem Livegang von aussen getestet.“
4. Ja.
5. Ja, die URL aus dem Mockup stimmt (Enrico: www.linkedin.com/in/enrico-falk-b8369517, mit https:// davor).
6. Ja, AK 6 gilt als erfuellt, wenn der Zusatzlauf mit `indexierbar:true` alle Werte >= 90 zeigt; Beleg im Bericht.
7. Ja, ich pruefe es in den Screenshots.
8. Foto bleibt `foto-vorlaeufig`, hoechstens 512 px; veroeffentlicht wird es erst nach Enricos Ja (Gate vor B-003), fuer die Vorschau reicht es.
9. Ja.
**Ball:** bei Code

## 2026-10-19 18:08 | Code -> PO Web-Studio | BERICHT
T-002 bereit zur Abnahme
**Was wurde gebaut:**
- **Inhalt:** Die Seite zeigt das aktuelle Mockup mit allen Texten aus `de.json`. Die Kontaktadresse `kontakt@enricofalk.de` steht nur in `site.config.json`. LinkedIn zeigt auf das Profil.
- **Bilder:** `foto-vorlaeufig` liegt als WebP mit JPG-Rückfall vor, 512 px, ohne Exif und ohne Farbprofil. Dazu kommen Favicon (`.ico`) und `apple-touch-icon.png`.
- **Neue Seiten:** `impressum.html` und `datenschutz.html` mit „in Arbeit“. Die 404-Seite hat das neue Banner.
- **Termin- und PDF-Knopf:** führen auf gelbe Notizen.
- **Feinschliff:** Fokus, Hover, Typografie, Druckansicht und reduzierte Bewegung sind überarbeitet. Der Dark-Mode-Kontrast im Kontaktbereich ist korrigiert, mit vorhandenen Palettenfarben.
- **Prüfwerkzeug:** liegt getrennt in `tools/pruefung/`.
**Wie testen:** im Repo `npm run build`, `npm test`, `npm run platzhalter`. Die Prüfläufe brauchen einmal `npm ci --prefix tools/pruefung`, dann `npm run pruefen -- --ausgabe <Ordner>`.
| AK | Test | QA | Beleg (`docs/batches/B-001/evidenz/T-002/`) |
|---|---|---|---|
| 1 Texte und Platzhalter | compare.test (strenger Textvergleich gegen die Mockup-Fixture `5204cdf3`) | ✅ Text-Diff nur mit den freigegebenen Änderungen | `platzhalter.txt` |
| 2 Foto | seite.test (Maße, keine Metadaten-Chunks, `foto.png` nicht im Repo) | ✅ Bytes geparst | `dir-dist.txt` |
| 3 Favicon, 404, Platzhalterseiten | build.test, seite.test | ✅ 404 unter tiefem Pfad | `qa/404-tief-390-dunkel.png` |
| 4 Kontakt | build.test (Adresse tauschen ändert nur `data-*`), check.test | ✅ mit und ohne JS, Kopieren, `#termin` | `qa/kontakt-1280-dunkel.png` |
| 5 Feinschliff | compare.test (Look-Invarianten: Farben, Schriften, nur eine Animation) | ✅ 390 px ohne Überlauf; Kontrast ≥ 5,5:1 auf allen Platzhaltern | `pruefung/screenshots/`, `pruefung/druck/index-hell.pdf` |
| 6 Prüfläufe | `npm run pruefen` | ✅ unabhängig wiederholt | `pruefung/zusammenfassung.txt` |
| 7 Lieferform, keine Fremdanfragen, kein Inline | check.test | ✅ 0 Fremdanfragen, 0 CSP-Verletzungen, 0 Cookies | `pruefung/fremdanfragen.txt` |
**Prüfwerte:**
- **Lighthouse** (index):

  | Lauf | Leistung | Barrierefreiheit | Best Practices | SEO |
  |---|---|---|---|---|
  | mobil | 99 | 100 | 100 | 66 |
  | Desktop | 100 | 100 | 100 | 66 |
  | Zusatzlauf `indexierbar:true`, mobil | 99 | 100 | 100 | 100 |
  | Zusatzlauf `indexierbar:true`, Desktop | 100 | 100 | 100 | 100 |

  SEO 66 kommt nur von `robots.txt Disallow` (Audit `is-crawlable`). Damit ist AK 6 laut deiner Antwort 6 erfüllt.
- **axe:** 4 Seiten × hell/dunkel × 1280/390 px. Keine kritischen oder schweren Befunde, je Lauf 1 mittlerer Befund `region`. Banner und mobile Leiste liegen außerhalb von Landmarks, die Mockup-Struktur ist unverändert.
- **html-validate:** 0 Meldungen.
- **Links:** lokal ohne Befund, impact-schmiede.de 200, LinkedIn 999 (blockt automatische Abrufe, bitte einmal von Hand öffnen).
**Plattform:** Ende-zu-Ende unter Windows, Chrome 155 headless über puppeteer-core 25.12. Das ist nicht die Chrome-Version, die Puppeteer festlegt; die Läufe sind stabil. Build und Tests nutzen nur Node-Bordmittel, deshalb verhält sich Linux gleich.
**Commit:** f06fc01, dazu 3769709 (Evidenz `git log -1`), gepusht. Tests 179: 178 bestanden, 1 übersprungen (Symlink unter Windows, wie T-001). Die Lieferform-Prüfung ist grün.
**Prüfung:** Planer, Reviewer (mit Auflagen), Umsetzer (Sonnet/hoch), Diff-Check, QA, Nachbesserung (10 Auflagen), Test im frischen Klon.
**Wichtig, Korrektur zu T-001:** Die Regel `build/` in `.gitignore` hat auch `src/build/` ausgeschlossen. Im T-001-Commit fehlten deshalb die Build-Quellen (`build.mjs`, `check.mjs`, `compare.mjs`, `text.mjs`), ein frischer Klon war nicht baubar. Das ist mein Fehler beim Stagen; die T-001-Abnahme beruhte auf meinem Arbeitsstand.
- Behoben mit f06fc01: `.gitignore` jetzt `/build/` und `/dist/`, ein Schutztest prüft, dass kein Quellordner ignoriert wird.
- Nachweis: frischer Klon von 3769709, `npm run build` grün (18 Dateien), `npm test` 178/179.
- Recherche: Laut gitignore-Doku (man gitignore) gilt ein Muster ohne führenden Schrägstrich in jeder Ebene; `/build/` verankert es am Repo-Root.
**Bitte prüfen / Sichtprüfung Enrico:**
1. **Favicon-Motiv** (deine Antwort 7) und den zusätzlichen dunklen Fokusring. Amber allein hätte auf Hell unter 3:1 Kontrast; den Ring sieht man im Screenshot `qa/fokus-kopieren-390-dunkel.png`.
2. **Zeilenumbrüche:** Einige Überschriften brechen anders um als im Mockup („Auf jeder Flughöhe / hakt etwas anderes.“), der Text ist unverändert.
3. **Druckansicht:** `pruefung/druck/index-hell.pdf`. Der Ausdruck ist auch im Dunkelmodus hell, Banner und Termin-Notiz sind sichtbar.
**Platzhalterliste:** `evidenz/T-002/platzhalter.txt`, abrufbar mit `npm run platzhalter`.
- Gelb markiert:
  - Beispiele-Hinweis
  - Zertifikats-Hinweis
  - PDF-Notiz
  - „Dauer folgt“
  - Hintergrund-Absatz
  - Kontakt-Notiz (Mailbox-Test)
  - Termin-Notiz
  - Impressum „in Arbeit“
  - Datenschutz „in Arbeit“
- Nicht gelb, aber offen: Foto vorläufig (Veröffentlichung erst nach Enricos Ja, Gate vor B-003) und Terminlink leer.
**Offene Minor-Befunde / Annahmen:**
- „von außen“ statt „aussen“ geschrieben; ich habe dein „aussen“ als ASCII-Umschrift gelesen.
- axe `region`: Für B-002 schlage ich vor, die mobile Leiste in eine Landmark zu setzen (`aside`/`nav`). Das ist eine kleine Strukturänderung.
- Die Evidenz ist auf 3,8 MB verkleinert: Lighthouse-HTML und doppelte Druck-PDFs sind nicht im Repo. `pruefen` braucht jetzt `--ausgabe`.
-> "Abgenommen" oder "Nicht abgenommen, weil ..."

## 2026-10-19 18:10 | PO Web-Studio -> Code | ABSCHLUSS
Abgenommen. Geprueft: HEAD 3769709 = origin/batch/B-001, frischer Klon baut (18 Dateien, Lieferform gruen), `npm test` 179/179 (unter Linux ohne Uebersprungenes), Dunkel-Screenshot gesichtet, Prueftabelle schluessig (Lighthouse 99-100, mit indexierbar:true SEO 100). Danke fuer die offene Korrektur zu T-001 (.gitignore): akzeptiert, das Schutztest ist die richtige Antwort. Zu den Vorschlaegen: Landmark fuer die mobile Leiste und Banner (axe `region`) nehme ich in B-002 auf. Es folgt T-003.

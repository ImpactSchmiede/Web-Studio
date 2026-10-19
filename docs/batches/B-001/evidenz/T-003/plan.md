# Plan T-003 – Profil-PDF und Auslieferungspaket (B-001) · Fassung 2

Fassung 2 arbeitet das Plan-Review ein (freigabefähig, 0 Blocker, 5 Major, 12 Minor), siehe Abschnitt „Review-Befunde“ am Ende. Wo „Review-Befunde“ und der Text der Fassung 1 abweichen, gilt „Review-Befunde“.

Stand 2026-10-19 · Planer (opus/medium) · Grundlage: Ticket T-003 (AK 1–6, frisch von Disk), Mission B-001, Abschluss T-002 (3769709), VPS-Thread (Paketformat, Endungsliste 16:34), Konzept (Profil-PDF „deckungsgleich mit der Seite, ohne Metadaten“).

**0. Recherche**
- [Live-Messung, Chrome 155.0.8059.80, puppeteer-core 25.12, `page.pdf` von `dist/index.html`, Scratchpad]
  - **Aufbau:** PDF 1.4 mit klassischer xref-Tabelle, ohne Objektstrom, ohne `/XRef`, ohne `/Prev`, ohne `/Encrypt`, ohne XMP (`/Metadata`).
  - **Info-Dict:** `Title` = `<title>` (UTF-16BE), `Creator` = User-Agent `HeadlessChrome/155 … Windows NT 10.0`, `Producer` `Skia/PDF m155`, `CreationDate` und `ModDate` = Erzeugungszeit. Ein `Author` fehlt.
  - **Pfad-Leck:** Relative Links werden zu `/URI (file:///C:/Users/<benutzer>/…)`. Das Druck-Layout darf deshalb nur `https:`- und `mailto:`-Links enthalten.
  - **URIs:** Chrome normalisiert sie (`https://impact-schmiede.de` → `…de/`).
  - **Schriften:** Atkinson ist als Type0/CIDFontType2 mit `FontFile2` eingebettet. Bricolage (variable Schrift) kommt als **Type3** mit `CharProcs`. Alle Schriften haben `/ToUnicode`.
  - **Bild:** Das Foto steckt als `/Subtype /Image` im PDF.
  - **Determinismus:** Zwei Läufe unterscheiden sich nur in den beiden Datumswerten.
  - **Fallstrick:** Ein naiver Suchtreffer auf `/AA` trifft auch `/AAAAAA+Atkinson…`. Namen müssen deshalb als ganzes Token geprüft werden, und `#xx`-Escapes sind vorher zu dekodieren.
- [Doku, puppeteer-core 25.12 `types.d.ts`] Optionen von `page.pdf`: `tagged`, `outline` (Standard false), `waitForFonts` (Standard true), `preferCSSPageSize`, `printBackground`.
- [Doku, ISO 32000-1, aus Kenntnis; Abschnittsnummern in P5 gegen die frei zugängliche Fassung prüfen]
  - Info-Dict (14.3.3) und Textstrings (7.9.2.2: PDFDocEncoding oder UTF-16BE mit BOM).
  - xref-Einträge zu je 20 Byte (7.5.4).
  - Ein **inkrementelles Update (7.5.6) lässt das alte Info-Objekt in der Datei stehen** und scheidet deshalb aus. Gewählt: ein vollständiges Neuschreiben.
  - Weitere Abschnitte: URI-Aktion (12.6.4.7), ToUnicode (9.10.3), Type3 (9.6.5).
- [Doku, POSIX.1-2017 pax „ustar Interchange Format“, aus Kenntnis]
  - Der Header hat 512 Byte: `name[100]`, `mode`, `uid`, `gid`, `size[12]` und `mtime[12]` oktal, `chksum` (Summe aller Header-Bytes, das Feld selbst als 8 Leerzeichen gezählt), `typeflag` `'0'`, `magic "ustar\0"` + `"00"`, `uname`/`gname`, `prefix[155]`.
  - Die Daten werden auf 512 Byte aufgefüllt, am Ende folgen 2 Nullblöcke.
- [Live-Code] Vorhanden sind `C:\Windows\System32\tar.exe` (bsdtar) und GNU tar 1.35 (Git).
  - GNU tar deutet `C:\…` als Host. Aufrufe deshalb mit `cwd` und relativem Namen.

## 1. Impact-Analyse
Suche: PDF-Erzeugung gibt es nur als Druck-Evidenz in `pruefen.mjs` (`page.pdf`). PDF-Prüfung, Tar und SHA256 gibt es im Repo nicht (ergebnislose Suche). Wiederverwendet werden das Muster von `bilder.mjs` (einmal per Chrome erzeugen, committen, der Build kopiert nur), `mitChrome`, `server.mjs` (CSP), `checkDist`, `pruefeUrl`/`renderText` und die Farb- und Schriftprüfung aus `compare.mjs`.

| Bereich | Datei | Anpassung |
|---|---|---|
| Inhalt | `src/content/de.json` | **neu nur Labels** `profilPdf{kontaktTitel,mail,web}` und Fußzeile `fuss:"Entwurf, Stand {datum}"`; kein neuer Fließtext (Positionierung siehe R-M1); **entfällt** `profil.vermittler.pdfHinweis` (AK 2: keine Notiz mehr). Die Seitentexte bleiben sonst unverändert. |
| Konfig | `src/site.config.json` | `.pdf` in `erlaubteEndungen`; `profilPdf{datei:"profil-enrico-falk.pdf",maxBytes:1000000}` (ASCII-Name, einzige Quelle für Knopf und Build) |
| Druck-Layout | **neu** `src/templates/profil.mjs`, `src/styles/profil.css` | A4, höchstens 2 Seiten, Look der Seite (Tokens, Schriften), `{ph:}` bleibt gelb, Fußzeile `position:fixed` auf jeder Seite. Links nur `https:`/`mailto:`. Kein Bild, keine Anschrift, kein Telefon, keine USt-IdNr. **Wird nicht ausgeliefert** (nur Quelle der PDF). |
| PDF-Artefakt | **neu** `src/profil/profil-enrico-falk.pdf`, `src/profil/quelle.json` | eingecheckt; `quelle.json` = `{stand, eingang: sha256(Profil-HTML+profil.css+Schriften), pdf: sha256, chrome}` |
| PDF-Modul | **neu** `src/build/pdf.mjs` (Bordmittel, `zlib`) | `lesePdf` (xref/Trailer/Objekte, streng), `setzeInfo` (Neuschreiben: nur das Info-Objekt ersetzen, xref neu), `pruefePdf` (s. 2.3) |
| Build | `src/build/build.mjs` | Vertrag und Konfigprüfung; PDF nach `dist/` kopieren; Prüfung mit genauer Erwartung (Titel/Autor = `kopf.name`, URIs ⊆ hrefs des Profil-HTML); **neu** `profilAktuell(root)` |
| Lieferform | `src/build/check.mjs` | jede `.pdf` allgemein prüfen (gilt auch für `npm run check` und den entpackten Tar-Inhalt); `STANDARD.endungen` = VPS-Liste |
| Seite | `src/templates/index.mjs`, `src/site.css` | Knopf `href="profil-enrico-falk.pdf"`, `<p id="pdf">` entfällt; `#pdf` raus aus dem Selektor `scroll-margin` (Look unverändert) |
| Vergleich | `src/build/compare.mjs` | Ausnahme 7: `#pdf` → PDF-Datei (nur am `a.btn.ghost`); Ausnahme 8: nur noch `termin` |
| Paket | **neu** `src/build/paket.mjs`, `scripts/paket.mjs`, `scripts/paket-pruefen.mjs` | ustar schreiben und lesen, SHA256 und Paketprüfung (s. 2.4) |
| Skripte | `scripts/build.mjs`, `package.json` | `build` bricht bei veralteter PDF ab; **nur neue npm-Skripte** `paket`, `paket:pruefen`, `profil`; keine Abhängigkeit |
| Werkzeug | **neu** `tools/pruefung/profil.mjs`; `server.mjs`, `README.md` | Erzeugung (s. 2.2); `server.mjs`: `.pdf` → `application/pdf` |
| Git | `.gitignore` | `/paket/` |
| Doku | `docs/PROJEKT.md` (Befehle, Smoke), `docs/ENTSCHEIDUNGEN.md`, **neu** `docs/referenzen/pdf-chrome.md`, `docs/referenzen/ustar.md` | Befehle; Entscheidungen T-003; Messbefunde mit Quelle, Datum, Version |
| Tests | **neu** `test/profil.test.mjs`, `test/paket.test.mjs`, `test/_pdftext.mjs`; angepasst `seite`, `compare`, `docs`, `pruefwerkzeug` | s. 3 |
| Unverändert | `kontakt.js`, Bilder, Schriften, `layout/fehlerseite/rechtliches.mjs`, `robots`/`sitemap` (PDF nicht in der Sitemap, Entwurf), `chrome.mjs`, `bilder.mjs`, `pruefen.mjs` (die PDF läuft über `checkDist` mit), Konzept | nicht nötig bzw. fremd |

## 2. Vorgehen
1. Tests zuerst (rot), siehe 3.
2. **Erzeugung `npm run profil`** (`tools/pruefung/profil.mjs`):
   - Profil-HTML und `profil.css` + Schriften kommen in einen Temp-Ordner `ws-`. `server.mjs` liefert sie aus (CSP).
   - Druck: `page.pdf({format:'A4', printBackground:true, tagged:true, outline:false, preferCSSPageSize:true})`.
   - `setzeInfo`: nur `Title` und `Author` (`kopf.name`), `CreationDate` = `ModDate` = Stand-Datum. `Creator` und `Producer` fallen weg.
   - Danach wird `pruefePdf` vor dem Schreiben ausgeführt.
   - Geschrieben werden PDF und `quelle.json`.
   - **Grenze bei abweichender Struktur:** Hat das PDF nicht genau eine Revision mit klassischer xref, oder hat es `/Encrypt` oder `/Metadata`, dann bricht die Erzeugung **sichtbar ab** (Hinweis: Chrome-Version prüfen). Es gibt keinen stillen Rückfall.
3. **Prüfung der PDF (`pruefePdf`, AK 2/3)**, Befunde gesammelt:
   - Struktur: Kopf `%PDF-`, genau ein `startxref`/`trailer`, kein `/Prev`/`/XRef`/`/ObjStm`/`/Encrypt`; die xref-Offsets zeigen auf `n 0 obj`.
   - Info-Dict: Schlüssel nur `Title`, `Author`, `CreationDate`, `ModDate`; kein `/Metadata`.
   - Verbotene Namens-Token (nach `#xx`-Dekodierung): `JavaScript JS Launch EmbeddedFile(s) RichMedia OpenAction AA SubmitForm ImportData GoToR GoToE AcroForm XFA`.
   - Jede `/URI` beginnt mit `https:` oder `mailto:`.
   - Roh und in allen dekomprimierten Strömen stehen weder `file:`, `127.0.0.1`, `\Users\`, `/Users/`, `/home/` noch `os.userInfo().username`.
   - Jede `/Type /Font` ist eingebettet: Type0 → Nachkomme mit `FontFile2`/`FontFile3`, Type3 → `CharProcs`, TrueType/Type1 → `FontFile*`. Jede oberste Schrift hat `/ToUnicode`.
   - 1 bis 2 Seiten, MediaBox A4 (±1 pt), kein `/Subtype /Image` (kein Foto), Größe ≤ `maxBytes`.
   - Der Build prüft zusätzlich genau: Titel und Autor = `kopf.name`, URIs (nach `new URL().href`) ⊆ hrefs des Profil-HTML.
4. **Paket `npm run paket [-- --datum JJJJ-MM-TT]`:**
   - Ablauf: `profilAktuell` → `build()` nach `dist/` → `checkDist` → Tar → `paket/<datum>.tar` + `.sha256`. Die `.sha256` hat das Format `"<hex>  <datum>.tar\n"` wie `sha256sum`.
   - Danach läuft automatisch `pruefePaket`.
   - **Tar-Einträge:** nur `typeflag '0'`, keine Ordnereinträge. Reihenfolge: `index.html`, `404.html`, danach die übrigen Pfade nach Bytes sortiert. Namen nur ASCII mit `/`, höchstens 100 Zeichen (sonst Abbruch, kein `prefix`).
   - **Header-Werte:** `mode 0644`, `uid`/`gid` 0, `uname`/`gname` leer, `mtime` = Datum 00:00 UTC. Ergebnis: deterministisch und ohne Benutzernamen.
   - **Grenzen:** Tar ≤ `maxBytes`, Dateien ≤ `maxDateien`, Endungen laut Konfig.
5. **Paketprüfung `npm run paket:pruefen -- <tar>` (AK 5, auch für den VPS-Admin nutzbar):**
   - Hash gegen `.sha256` prüfen.
   - `leseTar` streng: Prüfsumme, Magic, Blockraster, Typ, Namen ohne `..`, `/`-Anfang, `\` und versteckte Teile, die ersten beiden Einträge, 2 Nullblöcke.
   - In einen leeren Temp-Ordner entpacken, dort `checkDist` ausführen (PDF eingeschlossen).
   - `robots.txt` = `robots(konfig)`; im Entwurf `Disallow: /`.
6. Danach anpassen: Knopf, `compare.mjs`, `server.mjs` und Doku.
7. PDF erzeugen und Seitenbilder ablegen: Chrome-PDF-Ansicht, falls Headless sie zeigt, sonst Druckansicht A4 als Screenshot plus die PDF selbst. Dazu Evidenz und `npm run pruefen`.
8. Test in einem frischen Klon.

## 3. Tests (AK → Test), Root-Suite nur Bordmittel
| AK | Test (rot bei Verletzung) |
|---|---|
| 1 | Text aus der **eingecheckten PDF** über `_pdftext.mjs` (Inhaltsströme, `ToUnicode` bfchar/bfrange, Type3 1-Byte). Geprüft wird ohne Leerraum: Name, Positionierung, 4 Fakten, 8 Zertifikate mit Ausstellern, Branchen, 6 Vermittler-Felder, 3 Beispiel-Titel, Adresse aus der Konfig, Web, LinkedIn, „Entwurf, Stand“, die Platzhaltertexte. **Nicht** enthalten: Ziffernfolge ≥ 5, `USt`, `Telefon`, Bild. Profil-HTML: nur `https:`/`mailto:`-hrefs, kein `<img>`, `{ph}` → `span.ph`. `profilAktuell` = true; ein geändertes `de.json` (Kopie) oder `profil.css` → false mit Hinweis `npm run profil`. `profil.css`: Farben und Schriften ⊆ Mockup. |
| 2 | Info-Dict der PDF genau `{Title, Author: "Enrico Falk", CreationDate, ModDate}`; Ströme ohne Benutzer und Pfad; Schriften eingebettet mit `ToUnicode`; Name ASCII; < 1 MB; `dist/profil-enrico-falk.pdf` bytegleich mit `src/profil`. Knopf `href` = Datei, kein `id="pdf"`, Notiz nicht in der Platzhalterliste. `setzeInfo` auf echter Chrome-PDF: alte Werte (`HeadlessChrome`, `Skia`) **nirgends** mehr in der Datei, xref-Offsets stimmen, Umlaut-Titel als UTF-16BE. |
| 3 | `checkDist`/`build` rot bei: `.pdf` nicht erlaubt, > `maxBytes`, `/Creator`, `/Metadata`, `/JavaScript` und `/J#61vaScript`, `/Launch`, `/EmbeddedFile`, `/URI (file:…)`, `http:`, Schrift ohne Einbettung oder ohne `ToUnicode`, 3 Seiten, `/Prev` (inkrementelles Update). Synthetische Mini-PDFs werden im Test erzeugt. Kein Fehlalarm bei `/AAAAAA+Font`. |
| 4 | Tar: Header-Prüfsumme unabhängig nachgerechnet, Magic, Ordnung `index.html`, `404.html`, …, nur Typ `0`, `uid`/`gid` 0, kein Benutzername in den Bytes, Endblöcke, Größe ein Vielfaches von 512. Zweimal gepackt ergibt dieselben Bytes. Rot bei Symlink, versteckter Datei, `.svg`, Name > 100, Grenze überschritten. `.sha256` im `sha256sum`-Format; `paket/` ist von git ignoriert (`git check-ignore`). |
| 5 | Ein Paket mit `--datum` in Temp: `pruefePaket` grün. Rot bei: 1 Byte geändert (Hash), defekter Prüfsumme, `../`-Name, falscher Reihenfolge, `robots.txt` ≠ Konfig. **Gegenprobe mit System-`tar`** (`-tf` gleiche Reihenfolge, `-xf` bytegleich). Fehlt `tar`, schlägt der Test sichtbar fehl. |
| 6 | Bestehende 179 Tests bleiben grün (angepasst nur, wo AK 2 die Notiz streicht); frischer Klon: `npm run build`, `npm test`, `npm run paket`. |

## 4. Scope-Grenze
- Unverändert bleiben: Seitentexte (außer der gestrichenen PDF-Notiz), Positionierung, Look, Sitemap und `robots`-Logik.
- Keine Ablage in `_Austausch\…\Pakete\` (B-003), kein Foto in der PDF.
- Kein PDF/A, keine englische Fassung.
- axe `region` folgt in B-002.

## 5. Smoke
- `npm run build` ist grün.
- `dist/index.html` öffnen und „Profil als PDF laden“ klicken: die PDF öffnet sich mit A4, 1–2 Seiten, Fußzeile „Entwurf, Stand …“, gelben Platzhaltern und markierbarem Text.
- `npm run paket` und danach `npm run paket:pruefen` laufen grün.
- `npm run pruefen` zeigt keine harten Befunde; die Linkprüfung findet die PDF.

## 6. Plattform
- Ende-zu-Ende unter Windows (Chrome 155, Node 24.19, bsdtar und GNU tar).
- Build, PDF-Prüfung und Tar nutzen nur Node-Bordmittel und laufen deshalb unter Linux gleich; die Tar-Gegenprobe läuft dort mit GNU tar.
- Die PDF-Erzeugung läuft nur auf dem KI-PC. Ändert sich Chrome, prüft `pruefePdf` die Struktur und bricht sichtbar ab.

## 7. DoD-Abgleich
- **Hilfe-Doku:** Das Ticket nennt keine. Im Plan enthalten sind die Befehle in PROJEKT.md und die README des Werkzeugs.
- **Persistenz/Backup:** nicht betroffen. Pakete bleiben lokal und sind ignoriert.
- **Datenschutz:** PDF ohne Metadaten, Pfad, Foto, Anschrift, Telefon und USt-IdNr. Tar ohne Benutzername. Die Mailadresse steht im Klartext in der PDF (WAS 1).
- **Kompatibilität:** Node ≥ 22.
- **Sicherheit:** PDF-Aktionen gesperrt, Tar-Leser gegen Pfadausbruch; keine Abhängigkeit, kein Netz.
- **Tests:** `npm test` mit `node --check`.
- **Evidenz:** `evidenz/T-003/` (Beleg-Tabelle, Seitenbilder, `dir paket`, Hash, `git log -1`).

## Selbstreview P2 (eingearbeitet)
1. **Outcome:** Die Aktualität der PDF war nur behauptet. Jetzt bindet `quelle.json` die PDF an das Profil-HTML, und `build`, `paket` und Test werden rot, wenn sie veraltet ist.
   - Die Prüfung sitzt bewusst in `profilAktuell` und nicht in `build()`. Grund: Tests bauen mit absichtlich geänderter Adresse, und ein Test-Flag soll es nicht geben.
2. **Verträge:** Folgende Stellen waren übersehen und sind jetzt im Plan:
   - Vertrag `pdfHinweis`
   - Ausnahmen 7/8 in `compare.mjs`
   - Test der Endungsliste (`seite.test` Z. 144)
   - Erwartung der Platzhalterliste
   - MIME-Typ im Server
3. **Randfälle:** Aus der Messung neu aufgenommen:
   - `file://`-URIs
   - Type3-Schriften
   - `#xx`-Namen
   - `/AA`-Fehltreffer
   - URI-Normalisierung
   - GNU tar mit `C:`-Pfad
4. **Seiteneffekt:** `checkDist` prüft jetzt auch PDFs. Das ist gewollt, weil dadurch AK 5 auf dem Tar-Inhalt greift.
5. **Komplexität:** Kein `prefix` und keine Ordnereinträge im Tar; kein PDF-Parser „für alles“, sondern ein strenger Leser für genau die Chrome-Struktur, mit sichtbarem Abbruch bei allem anderen.
6. **Fremdes:** Ablage im Austausch und Sitemap bleiben draußen.

## Gate-Auslöser (für P4)
- **Paketdefinition:** `package.json` bekommt 3 neue npm-Skripte: `paket`, `paket:pruefen`, `profil`. Es kommt keine Abhängigkeit dazu, und `tools/pruefung/package.json` bleibt unverändert. Der Koordinator stellt dazu eine FRAGE.
- **Offene WAS-Fragen:**
  - Mailadresse im Klartext in der PDF
  - Untertitel „Agile Coach und Problemlöser“ (R-M1)
  - PDF-Titel
  - 1 bis 2 Seiten statt „1 Seite“ wie im Konzept

## Review-Befunde (Umsetzung, verbindlich)

### Major-Befunde

**R-M1 Positionierung**
- Es entsteht kein neuer Fließtext.
- **Fallback (gilt, bis der PO antwortet):** Die Positionierung kommt aus vorhandenen Inhalten:
  - Untertitel = `meta.titel`, mit einem Ausschnitt nach festem Muster: Text nach „Enrico Falk, “ und ohne Klammerzusatz „(Mockup-Entwurf)“.
  - Lead = `hero.titel`, dazu `hero.einleitung`.
  - Ein Test belegt, dass der Untertitel wörtlich in `hero.einleitung` vorkommt.
- Erlaubt der PO eine eigene Zeile, wird sie `profilPdf.positionierung`. Dann gilt derselbe Test.
- **Trennung im Vertrag:**
  - Neu als **Labels**: `profilPdf.kontaktTitel`, `mail`, `web`.
  - Neu als **Text**: nur `profilPdf.fuss`.
  - Alles andere wird wiederverwendet.

**R-M2 Datum**
- `{datum}` kommt nur aus `src/profil/quelle.json` (`stand`, `JJJJ-MM-TT`, streng geprüft), nie aus der Uhr.
- `profilAktuell` rendert mit `stand`.
- Die Erzeugung setzt `stand` aus `--stand` oder dem heutigen Tag in Europe/Berlin.
- **Test:** `profilAktuell` bleibt grün, wenn `Date.now` um +1 Tag verschoben ist (die Uhr wird im Test kontrolliert).

**R-M3 Schriften-Positivliste**
- Jede `/BaseFont` (ohne Subset-Präfix `XXXXXX+`) und jede Type3-`FontDescriptor/FontName` muss mit `AtkinsonHyperlegible` oder `BricolageGrotesque` beginnen. Alles andere ist ein Befund.
- **Rot-Test:** Mini-PDF mit `/BaseFont /Helvetica` und mit `/ABCDEF+Arial`.

**R-M4 Paketdefinition**
- Siehe „Gate-Auslöser“: Der Punkt ist dort aufgeführt, die Code-Sitzung entscheidet nicht allein.

**R-M5 Tar-Leser gehärtet (`leseTar`/`pruefePaket`)**
- **Namen:**
  - Positivliste `^[A-Za-z0-9._/-]+$`; jedes Segment ≠ `''`, `.`, `..`.
  - Kein Segment beginnt mit `.`.
  - Kein Segment endet mit Punkt oder Leerzeichen.
  - Keine Windows-reservierten Namen (`CON PRN AUX NUL COM1–9 LPT1–9`, auch mit Endung).
  - Keine Duplikate, auch nicht nach Groß-/Kleinschreibung (`Index.html` + `index.html`).
- **Header:**
  - Oktalfelder streng: nur `[0-7]`, abgeschlossen mit NUL oder Leerzeichen, nicht leer.
  - `size` ≤ verbleibende Bytes.
  - Abgeschnittenes Archiv oder fehlende 2 Nullblöcke = Befund. Nach den Nullblöcken stehen nur noch Nullen.
- **Entpacken:**
  - Ziel per `path.resolve` gerechnet und auf den Temp-Ordner geprüft.
  - Die Liste der entpackten Dateien muss genau der Tar-Liste entsprechen (gleiche Menge).
- **Rot-Tests:** `a:b`, Duplikat, `Index.html` + `index.html`, `CON.txt`, `x.` / `x `, abgeschnittenes Archiv, `size` zu groß, Müll nach dem Ende, ungültiges Oktalfeld, `../x`.

### Minor-Befunde (Umsetzungshinweise)

**PDF-Struktur und -Prüfung**
- **m1:** Trailer-Positivliste `{Size, Root, Info, ID}`, andere Schlüssel sind ein Befund. `/ID` ist erlaubt, aber nicht nötig. `setzeInfo` übernimmt eine vorhandene `/ID` unverändert.
- **m2:** Die Strukturmessung läuft mit den echten Optionen (`tagged:true`, `outline:false`, `printBackground:true`, `preferCSSPageSize:true`) auf der Druckseite. Das Ergebnis steht in `docs/referenzen/pdf-chrome.md` (Quelle, Datum, Chrome-Version, Restunsicherheit).
- **m3:** Aktionen und Annotationen per Positivliste:
  - Jedes `/S` in einem Aktions-Dictionary ∈ {`URI`, `GoTo`}.
  - Jedes `/Subtype` einer Annotation ∈ {`Link`}.
  - Die Suche läuft nur in Dictionaries (Objekt-Körper außerhalb von Strömen). Strombytes zählen nicht als Treffer.
- **m4:** Leck-Suche:
  - Groß-/Kleinschreibung egal.
  - Auch als UTF-16BE und in den Formen `%20` und `#20`.
  - Muster: `file:`, `127.0.0.1`, `localhost`, `\Users\`, `/Users/`, `/home/`, `AppData`, `\Temp\`, `ws-`, Benutzername.
  - Ein Strom mit unbekanntem Filter (nicht `FlateDecode` und nicht ungefiltert) ist ein Befund.

**Druck-Layout und Evidenz**
- **m5:** Evidenz: Die PDF wird über `server.mjs` mit CSP im Chrome-PDF-Viewer geöffnet. Ein Screenshot mit markiertem Text belegt die Textauswahl (Ergänzung zu `_pdftext.mjs`).
- **m6:** LinkedIn erscheint nur als Link mit dem Text „LinkedIn“; die Profil-URL wird nicht ausgeschrieben. Die Ziffernregel (≥ 5 Ziffern) gilt gezielt für den Text und nicht für URIs.
- **m7:** Keine gerasterten Effekte im Druck-Layout: kein `box-shadow`, `filter`, `opacity`, kein Verlauf und kein Bild. Ein Test prüft `profil.css`; `pruefePdf` meldet jedes `/Image`.

**Paket und Paketprüfung**
- **m8:** Das Datum des Pakets:
  - `--datum` ist streng `JJJJ-MM-TT` und muss ein gültiges Kalenderdatum sein. Ohne Angabe gilt der heutige Tag in Europe/Berlin.
  - Ein vorhandenes `paket/<datum>.tar` wird nicht still überschrieben: ohne `--ersetzen` bricht der Lauf ab (Exit 1).
- **m9:** `docs/referenzen/ustar.md` hält fest: `mtime` = Paketdatum 00:00 UTC, gewählt für die Wiederholbarkeit. Entpackte Dateien tragen dieses Datum, die Quelle ist die POSIX-pax-Spezifikation.
- **m10:** Gegenprobe mit System-tar:
  - Sie läuft mit `C:\Windows\System32\tar.exe` (bsdtar) und mit GNU tar (Git), soweit vorhanden. Mindestens eines ist Pflicht, sonst wird der Test rot.
  - Pfad und Version jedes Programms stehen in der Evidenz.
- **m11:** Strenge in `paket:pruefen`:
  - Bei `indexierbar:false` muss `robots.txt` exakt `"User-agent: *\nDisallow: /\n"` lauten.
  - Die `.sha256` prüft Hash **und** Dateinamen (genau `<datum>.tar`, zwei Leerzeichen, LF).
  - Rot-Tests: abweichendes `robots.txt`, falscher Name in `.sha256`.
- **m12:** Doku und Grenzen:
  - `docs/ENTSCHEIDUNGEN.md` hält fest:
    - 1 bis 2 Seiten (Ticket) statt 1 Seite (Konzept)
    - Klartext-Adresse in der PDF bewusst
    - Positionierung aus vorhandenen Texten
  - Die Tar-Grenze gilt für die tar-Datei selbst, inklusive Header und Auffüllung (≤ `maxBytes`).
  - Grenztest: `maxBytes` = Tar-Größe ist grün, −1 Byte ist rot.

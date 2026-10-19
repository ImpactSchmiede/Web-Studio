# T-004 Fix: Testsuite unter Linux gruen – Web-Studio B-001

## 2026-10-19 19:13 | PO Web-Studio -> Code | AUFTRAG
Auftragsart: Fix (eng begrenzt, `hotfix`-nah, im Batch). Anlass: Beim Abnehmen von T-003 habe ich in einem frischen Klon unter Linux (Node 22, Benutzername ohne Leerzeichen) `npm test` laufen lassen: 369 Tests, 368 bestanden, **1 rot**: `pruefePdf rot bei: Benutzername in Name mit \#20` (`test/pdf.test.mjs:84`, „kein Befund“). Build, `paket`, `paket:pruefen` sind grün, SHA-256 identisch zu deinem Bericht.
Regel: **Rot ist No-Go** (Batch-Prozess 4.): Abnahme von T-003 und der Merge erst bei Grün. Ich nehme T-003 deshalb unter dieser Auflage ab und führe sie hier als Fix.
Akzeptanzkriterien:
1. RCA im Thread (vermutlich nutzt der Test den echten Benutzernamen aus der Umgebung statt eines festen Testnamens; `#20` entsteht nur bei Leerzeichen wie „<benutzer>“).
2. Der Test (und alle verwandten, die Umgebungswerte lesen) verwendet feste Fake-Werte mit Leerzeichen und ohne; die Prüfung selbst bleibt scharf (weiterhin rot bei echtem Benutzernamen/Pfad in der PDF, auch mit `#20`-Kodierung).
3. `npm test` ist grün **unter Windows und Linux** (Linux-Lauf im frischen Klon oder in der Sandbox, die du hast; sonst bitte klar sagen, was nicht prüfbar war). Ein Test, der vor dem Fix rot ist (Linux-Nachstellung), liegt vor dem Code.
4. Suche nach weiteren umgebungsabhängigen Tests (Benutzername, Rechnername, Pfad, Zeitzone, Locale) und Ergebnis im Bericht.
5. Kein Eingriff in Seite, PDF, Paket (Hash bleibt `d05bb94d…c299`, sofern der Inhalt unverändert ist).
Danach (Batch-Ende, Batch-Prozess 5.): volle Regression, Security/Performance-Review über den Batch-Diff, Nutzer-Rundgang (QA), Befunde bündeln. Die Konzept-Abdeckung (3a) schreibe ich; Merge und Retro folgen nach meiner Batch-Abnahme.
Evidenz im BERICHT: RCA, rot→grün (beide Plattformen), Liste weiterer Umgebungsabhängigkeiten, `git log -1`.
Einzelne git-Befehle, keine verketteten.
**Ball:** bei Code

## 2026-10-19 19:17 | Code -> PO Web-Studio | INFO
HF-001: RCA und Plan (kein Gate-Auslöser, ich arbeite weiter). Recherche, RCA, Evidenz und Fix-Richtung wie unten; der Fix ist bereits umgesetzt, die QA läuft.
- **Recherche:** Suche nach „PDF name object #20 escape“. Laut Adobe-Doku zu COS-Objekten steht `#20` in PDF-Namen für ein Leerzeichen. Die Kodierung entsteht also nur bei Namen mit Leerzeichen. Die Prüfung selbst ist richtig, der Test ist es nicht.
- **RCA:** `pruefePdf` hat die Suchmuster für Benutzer- und Rechnername aus der Umgebung gelesen (`os.userInfo()`, `os.hostname()`). Der Testfall schleuste aber fest „AI#20User“ ein. Das passt nur, wenn der Benutzer der Umgebung „<benutzer>“ heißt; unter Linux heißt er anders, also gab es keinen Befund, und der Test war rot. Mein Fehler: Ein Test hing an der Maschine, auf der er geschrieben wurde.
- **Evidenz:** In WSL-Ubuntu (Node 22.20, portabel installiert) ist der Stand 7270951 bei 368 von 369 rot, genau `pruefePdf rot bei: Benutzername in Name mit \#20`, wie bei dir. Dazu kommt eine Nachstellung unter Windows: Die Umgebung wird per Mock zu Linux-Nutzer „ci“, dann sind 8 neue Tests rot. Belege: `evidenz/T-004/test-rot-vor-fix.txt`, `linux-lauf.txt`.
- **Fix:**
  - `pruefePdf` nimmt Benutzer- und Rechnername optional als Option `kennungen`. Ohne Option gelten weiter die Werte der Umgebung, so dass `npm run check` und `paket:pruefen` scharf bleiben.
  - Die Tests verwenden feste Fake-Werte, je einmal mit Leerzeichen („<benutzer>“/„Server-PC“) und ohne („jemand“/„build-runner-01“). Geprüft wird Klartext, `#20`, `%20` und der Rechnername.
  - Kennungen unter 4 Zeichen werden nicht gesucht, damit es keine Fehlalarme gibt. Das betrifft auch einen Paket-Test, der bei einem Linux-Nutzer wie „ci“ fälschlich rot geworden wäre.
- **Nicht geändert:** Seite, PDF und Paket. Der Hash bleibt `d05bb94d…c299`, unter Windows und Linux gleich.
- **Rollback:** Commit zurücknehmen; es betrifft nur Prüfcode und Tests.

## 2026-10-19 19:32 | Code -> PO Web-Studio | BERICHT
Hotfix HF-001 (T-004)
**Was wurde gefixt:** Die Testsuite ist jetzt auf jeder Maschine grün, nicht nur auf der, die das PDF erzeugt hat. Die Leck-Prüfung im PDF bleibt scharf und gibt keine Fehlalarme mehr bei Benutzern wie `root` (Docker), `info` oder `Enrico Falk`. Bei `Enrico Falk` wäre auf Enricos eigenem Rechner sonst `npm run build` rot gewesen.
**Wie testen:** frischer Klon von `batch/B-001`, dann `npm test`, `npm run build`, `npm run paket`, `npm run paket:pruefen`.
**RCA** (Details in der INFO 19:17 und in `docs/hotfixes/HF-001.md`):
- Der Testfall setzte fest `AI#20User` ein, die Prüfung suchte aber den Benutzernamen der Umgebung. Das passte nur unter Windows mit dem Benutzer „<benutzer>“.
- Die QA fand danach eine zweite Ursache: Benutzer- und Rechnernamen wurden als Teilzeichenkette gesucht. Das traf Strukturnamen wie `/Root` sowie Titel und Domain („Enrico Falk“, `enricofalk.de`).
**Recherche:** Laut Adobe-Doku zu COS-Objekten steht `#20` in PDF-Namen für ein Leerzeichen. Die Norm ISO 32000-1 §7.3.5 habe ich nicht im Original gelesen.

**Rot → Grün** (Belege in `evidenz/T-004/`: `linux-lauf.txt`, `windows-lauf.txt`, `test-rot-vor-fix.txt`, `qa/`):

| Lauf | Ergebnis |
|---|---|
| Linux (WSL2 Ubuntu, Node 22.20), Stand 7270951 | 368 von 369, genau dein Test rot |
| Windows mit gemockter Linux-Umgebung (Nachstellung) | 8 neue Tests rot |
| Windows, frischer Klon 587c8cb | 386 bestanden, 1 übersprungen (Datei-Symlink braucht Sonderrecht, Junction-Test deckt ab) |
| Linux, frischer Klon 587c8cb | 387/387 |
| Linux als normaler Benutzer und als root | grün |
| QA zusätzlich: TZ=America/Los_Angeles bzw. Pacific/Kiritimati, LANG=C, fremde Benutzer- und Rechnernamen | grün |

Paket-SHA-256 überall `d05bb94d…c299`, Seite, PDF und Paket sind also unverändert (AK 5).

**Fix:**
- `pruefePdf` nimmt Benutzer- und Rechnername als Option `kennungen` (ohne Angabe: Umgebung).
- Kennungen werden nur als ganzes Wort gesucht.
- Nicht gesucht wird eine Schreibweise, die einem PDF-Strukturnamen gleicht oder im erwarteten Titel/Autor bzw. einem erlaubten `https:`/`mailto:`-Verweis steht. Das gilt nur mit Erwartung, und Build, `check` und `paket:pruefen` geben die immer mit. Die Prüfung nennt die Kennung dann als Hinweis, `npm run check` gibt ihn aus.
- Alle Tests nutzen feste Werte. Ein Test belegt, dass die Prüfung ohne Option weiter die Umgebung prüft und dabei scharf bleibt.
- Mit Rot-Tests belegt bleibt rot: echter Name als Klartext, mit `%20`, mit `#20` und als Rechnername.

**Weitere Umgebungsabhängigkeiten (AK 4):**
- **Benutzer- und Rechnername:** Nur noch der gezielte Test „ohne Option, Umgebung gemockt“ liest die Umgebung, alle anderen Tests nutzen feste Werte.
- **Zeitzone:** Datumstests setzen Europe/Berlin ausdrücklich. Ein Restrisiko besteht nur um Mitternacht.
- **Temp-Ordner und Plattformpfade:** `os.tmpdir()` sowie `path.sep`/Junction bzw. `tar.exe` sind plattformneutral bzw. abgefragt.
- **Linux-Tests brauchen ein Git-Repo:** Ohne `.git` (z. B. eine reine Dateikopie) sind 3 Tests rot. Ein echter Klon ist also nötig.
- **Grenze:** Geprüft wird nur der Name der prüfenden Maschine; ein Windows-Name fällt unter Linux nur über die Pfadmuster auf. Dokumentiert in `docs/referenzen/pdf-chrome.md`. Dort steht jetzt auch die offene Begründung der Muster `\ws-` und `/ws-` aus T-003.

**Prüfung:**
- QA mit zwei Befunden; beide behoben.
- Diff-Check mit 2 Majors (Mehrwort-Name „Enrico Falk“, ein Test noch umgebungsabhängig) und 3 Minors; alle behoben.

**Commits:** bf4dc6b (Fix) und 587c8cb (HF-Doku `docs/hotfixes/HF-001.md` und INDEX, `git log -1` in der Evidenz), beide gepusht.
**Installiert:** portables Node 22.20 in der eigenen WSL-Ubuntu (`~/.local/node`, SHA256 geprüft), eingetragen in `installiert.md`.
→ "Abgenommen" oder "Nicht OK, weil ...". Danach Batch-Ende nach Batch-Prozess 5: volle Regression, Security/Performance-Review über den Batch-Diff, Nutzer-Rundgang.

## 2026-10-19 19:36 | PO Web-Studio -> Code | ABSCHLUSS
Abgenommen. T-004 ist erledigt, und damit auch T-003. Ich habe es selbst nachgeprueft: frischer Klon von batch/B-001 (587c8cb) unter Linux, npm test 387/387 gruen, build und paket gruen, paket:pruefen gruen, SHA-256 weiter d05bb94d…c299. Die zweite Ursache (Teilstring-Treffer auf /Root, Titel, Domain) war gut gefunden. Bitte weiter mit Batch-Ende nach Batch-Prozess 5: volle Regression, Security/Performance-Review ueber den Batch-Diff, Nutzer-Rundgang. Die Konzept-Abdeckung liegt in _Austausch/Web-Studio/B-001/konzept-abdeckung.md. Befunde gebuendelt an mich.
**Ball:** bei Code (Batch-Ende)

## 2026-10-19 19:36 | PO Web-Studio -> Code | AUFTRAG
Batch-Ende B-001 (Batch-Prozess 5.): volle Regression, Security/Performance-Review ueber den Batch-Diff, Nutzer-Rundgang (QA). Befunde gebuendelt als BERICHT hierher. Danach Batch-Abnahme durch mich, dann ff-Merge nach main und Push, Threads nach docs/batches/B-001/, konzept-abdeckung.md nach docs/batches/B-001/. Offene Punkte (B-002, nach Interview) bleiben ausserhalb.
**Ball:** bei Code

## 2026-10-19 19:44 | Code -> PO Web-Studio | BERICHT
Batch-Ende B-001: Härtung abgeschlossen, gebündelte Befunde. Evidenz unter `docs/batches/B-001/evidenz/batch-ende/`, Commit c93d5e6 (gepusht). `batch/B-001` ist bereit für den ff-Merge nach deiner Batch-Abnahme.

**1. Volle Regression (Code):** grün. Belege: `regression.txt`, `pruefung/zusammenfassung.txt`.
- **Tests:** Windows 386 bestanden, 1 übersprungen (der bekannte Symlink-Test). Linux 387/387, belegt in T-004.
- **Build und Paket:** build, check, paket und paket:pruefen grün. SHA-256 `d05bb94d…c299`.
- **Prüfläufe:**

  | Lauf | Leistung | Barrierefreiheit | Best Practices | SEO |
  |---|---|---|---|---|
  | Lighthouse index, mobil | 99 | 100 | 100 | 66 |
  | Lighthouse index, Desktop | 100 | 100 | 100 | 66 |
  | Zusatzlauf `indexierbar`, mobil | 99 | 100 | 100 | 100 |
  | Zusatzlauf `indexierbar`, Desktop | 100 | 100 | 100 | 100 |

  SEO 66 kommt nur von `robots.txt` (Entwurf). axe zeigt keine schweren Befunde (nur `region`, bereits für B-002 vorgemerkt), html-validate 0 Meldungen, keine Fremdanfragen.
- **Links:** `impact-schmiede.de` ist wieder erreichbar (200). LinkedIn blockt automatische Abrufe weiter, bitte einmal von Hand öffnen.

**2. Security/Performance-Review über `main...batch/B-001` (Reviewer):** freigabefähig, 0 Blocker, 0 Major.
- **Ohne Befund geprüft:**
  - Escaping und Liste erlaubter URLs
  - CSP-Tauglichkeit, `kontakt.js`
  - keine persönlichen Daten oder Benutzerpfade
  - Bild- und PDF-Metadaten
  - Pfad-Ausbrüche (Prüfserver, Tar, Build-Ausgabe)
  - Lieferkette `tools/pruefung` (`npm audit` 0, alles aus registry.npmjs.org mit integrity, ignore-scripts)
  - keine Secrets in der Historie
- **Leistung:** `dist` 298 KB, das Foto 10 KB als WebP.
- **Minor S1, für die VPS-Anfrage:** vollständiger Header-Satz statt nur `default-src 'self'`, nämlich `base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'`. Dazu Referrer-Policy, Permissions-Policy, HSTS und `X-Robots-Tag: noindex` für die Vorschau. Ich passe danach den Prüfserver daran an. → B-002, über dich an den PO VPS-Administration.
- **Minor S2, Cache-Empfehlung für den VPS:** Die Dateinamen tragen keinen Hash. Vorschlag:
  - HTML, robots, sitemap: `no-cache` mit Revalidierung
  - CSS, JS, PDF, Bilder: 1 h bis 1 Tag
  - Schriften: 30 Tage

  Alternativ später Hash-Dateinamen mit `immutable`. → B-002 bzw. VPS-Anfrage.
- **Hinweise:**
  - Die Mail-Verschleierung ist nur leicht, das PDF nennt die Adresse im Klartext. Spam-Schutz läuft praktisch über die austauschbare Adresse und den Postfach-Filter; das sollte Enrico wissen.
  - Die Kursiv-Schrift (18 KB) dient nur den Platzhaltern und kann mit dem Release-Ticket weg.
  - Ein Font-Preload ist optional.
  - Der Prüfwerkzeug-Aufräumer und der Prüfserver haben kleine Robustheitspunkte → Backlog.
  - Das Repo wächst durch die Evidenz-Screenshots → Retro. Die Batch-Ende-Evidenz habe ich von 5,4 auf 1,5 MB verkleinert, die großen Dateien liegen nur lokal.

**3. Nutzer-Rundgang (QA, Black-Box, CSP-Server):**
- **Ohne Befund:** Personas, Tastatur, Fokus, reduzierte Bewegung, Dunkelmodus, 200 % Zoom, Druck, 404, Mail und Kopieren, mobile Leiste, PDF; keine Fremdanfragen, keine Cookies.
- **Befunde mit Nutzen-Einschätzung, Ziel nach meinem Vorschlag:**

  | Nr | Befund | Schwere / Nutzen | Ziel |
  |---|---|---|---|
  | R1 | Am Handy kommt die **Erfahrung erst nach etwa 5 Bildschirmhöhen** („rund 15 Jahre“, Foto noch später). Was die Seite anbietet und der Kontakt sind in unter 10 s klar, die Erfahrung nur über „Profil ansehen“. Vorschlag: Vertrauenszeile im Hero, z. B. „15 Jahre · Flight Levels · SPC · DACH“, ggf. mit kleinem Porträt. | mittel / hoch | B-002 (Produktentscheidung) |
  | R2 | **Profil-PDF Seite 1 ohne Kontakt**; Mail, Web und LinkedIn stehen nur unten auf Seite 2, Vermittler leiten oft nur Seite 1 weiter. Vorschlag: Mail in den Kopf von Seite 1. | mittel / hoch | B-002, mit der Neuerzeugung nach dem Interview |
  | R3 | **Desktop:** Kontakt ist nicht auf jeder Höhe erreichbar, der Kopf scrollt weg und die Leiste gibt es nur am Handy. Das widerspricht der Konzept-Journey. Vorschlag: Kontakt-Button in der Vermittler-Box und/oder mitlaufender Kopf. | mittel / mittel | B-002 |
  | R4 | **Beispiele zeigen Tätigkeiten, keine Ergebnisse** („Was sich geändert hat“ ohne beobachtbare Wirkung). Vorschlag: im Interview je Beispiel ein Ergebnis erfragen. | mittel / hoch | B-002, Interview |
  | R5 | „Diplom-Informatiker (FH)“ steht unter „Zertifikate“. Vorschlag: „Abschluss und Zertifikate“. | niedrig / mittel | B-002 |
  | R6 | Vermittler-Box ohne Rollentitel (Agile Coach / SPC …), obwohl Vermittler nach Titeln abgleichen. Produktfrage zur neuen Positionierung. | niedrig / mittel | B-002, Entscheidung PO/Enrico |
  | R7 | Am Handy verdeckt die Leiste im ersten Bildschirm halb „Profil ansehen“; „Gespräch anfragen“ steht doppelt; die Leiste bleibt im Kontaktbereich stehen. | niedrig / niedrig | B-002 |
  | R8 | Druck: 6 Seiten, Seite 1 fast nur Hero-Grafik. Vorschlag: SVG und Banner im Druck ausblenden. | niedrig / niedrig | später |
  | R9 | Bei Textgröße 200 % am Handy läuft die H1 über (Zoom auf 320 px CSS ist ok, WCAG 1.4.10 erfüllt). | niedrig / niedrig | B-002 |
  | R10 | „Profil als PDF laden“ öffnet im selben Tab, ohne Angabe von Format und Größe. Vorschlag: „(PDF, 2 Seiten, 130 KB)“ oder `download`. | niedrig / niedrig | B-002 |
  | R11 | Kein Sprunglink „Zum Inhalt“. | niedrig / niedrig | später |
  | R12 | Das Entwurfsbanner duzt, die Seite siezt. Für den Live-Build Prüfpunkt: kein Banner, kein „(Entwurf)“ im Titel. | niedrig / mittel | B-003, Gate-Checkliste |

- **Bestätigt, aber schon offen laut Konzept-Abdeckung:** Terminlink, Impressum und Datenschutz, LinkedIn-URL im PDF, Erklärsätze zu Zertifikaten, „Dauer folgt“, Foto vorläufig.
- **Belege:** `rundgang/01…11.png`.

**Meine Einschätzung:** Kein Befund hält B-001 auf; die DoD aller Tickets ist erfüllt. R1, R2 und R4 haben den höchsten Nutzen und hängen am Interview bzw. an Produktentscheidungen; ich empfehle sie als B-002-Tickets. Ein kleines Ticket noch in B-001 sehe ich nicht, weil alle Kandidaten Text, PDF-Neuerzeugung oder Produktentscheidungen berühren.

**Nach deiner Batch-Abnahme mache ich:**
- ff-Merge `batch/B-001` → `main` und Push
- Threads und `_batch.md` nach `docs/batches/B-001/`
- `konzept-abdeckung.md` nach `docs/batches/B-001/`
- `_betrieb.md` archivieren, falls gewünscht

→ "Batch abgenommen" oder Rückfragen.

## 2026-10-19 19:45 | PO Web-Studio -> Code | AUFTRAG
Batch B-001 abgenommen. Befunde R1..R12 und S1/S2 uebernehme ich in die Roadmap (B-002, S1/S2 als VPS-Anfrage ueber mich). Bitte jetzt: ff-Merge batch/B-001 nach main und Push, Threads und _batch.md nach docs/batches/B-001/, konzept-abdeckung.md und Release_Notes.md (liegen in _Austausch/Web-Studio/B-001/) ebenfalls dorthin, _betrieb.md bitte nicht archivieren. Dann BERICHT mit git log -1 auf main. Danach pausiert Code bis B-002 (Gate: Interview).
**Ball:** bei Code

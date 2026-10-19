# Entscheidungen Web-Studio

Eine Quelle für Entscheidungen, die für mehrere Tickets gelten. Größere Architekturentscheidungen als eigene Datei unter `docs/architektur/`.

## 2026-10-19 · T-001 · Stack der Freelancer-Seite (enricofalk.de)

**Entscheidung:** Schlankes Node-Skript statt statischem Generator. Node `>=22`, keine npm-Abhängigkeiten, kein `npm install` von Paketen. Texte stehen in `src/content/de.json`, das Layout in Template-Funktionen (`src/templates/`), Stil in `src/styles/site.css`, das einzige Skript in `src/scripts/kontakt.js`. `npm run build` schreibt `dist/` und prüft die Lieferform selbst (`src/build/check.mjs`). `npm test` nutzt `node --test`.

## Begründung
1. Keine Abhängigkeit, keine Lieferkette: Es gibt nichts zu aktualisieren und kein Paket, das nachträglich kompromittiert werden kann. Das passt zu „keine Fremdanfragen“ und „keine Kosten“.
2. Läuft offline und ohne Konto: Node genügt, Build und Tests brauchen weder Netz noch Dienst.
3. `dist/` ist ziel-neutral: nur Dateien (HTML, CSS, JS, Schriften, robots, sitemap), kein Inline-CSS und kein Inline-JS, damit die CSP `default-src 'self'` des VPS ohne Ausnahme gilt. Dasselbe Verzeichnis geht später auch zu IONOS.
4. Wenig Pflege: vier kleine Build-Module (Build, Prüfung der Lieferform, Vergleich mit dem Mockup, Textausgabe) mit zusammen rund 600 Zeilen statt eines Frameworks mit eigenen Versionssprüngen. Texte lassen sich ändern, ohne Layout anzufassen (B-002 füllt nur `de.json`).
5. Übertragbar auf weitere Web-Projekte: Inhaltsvertrag, Prüfung der Lieferform und Vergleich mit dem Mockup sind allgemein gehalten und lassen sich in ein nächstes Projekt kopieren.

## Verworfen
- **Eleventy:** gut für viele Seiten und Blog. Hier eine Seite plus Fehlerseite. Bringt rund 100 Pakete in die Lieferkette und eine Template-Sprache, die erst gelernt und gepflegt werden muss.
- **Astro:** bringt Komponenten- und Build-Werkzeuge (Vite) samt großer Abhängigkeitsmenge. Der Nutzen (Inseln, Komponenten) fällt bei einer statischen Seite mit einem kleinen Skript nicht an.

## Eckpunkte der Umsetzung
- Mockup (Co-PO) ist die Vorlage: Look und Texte unverändert. Zwei Änderungen sind vom Ticket (AK 7) verlangt: Inline-Stile des Mockups sind jetzt Klassen mit gleichen Werten, und die Mail-Adresse wird erst im Browser zusammengesetzt. `src/build/compare.mjs` belegt im Test, dass Struktur, Texte und CSS dem Mockup entsprechen.
- `robots.txt` sperrt alles, es gibt kein `noindex`-Meta. Der Header `X-Robots-Tag: noindex` für die Vorschau ist ein Wunsch an den VPS-Admin.
- Erlaubte Dateiendungen im Build (einstellbar in `src/site.config.json`): `.html .css .js .woff2 .txt .xml`. Später `.pdf` (T-003) und ggf. Bildformate. Die endgültige Liste liefert der PO VPS-Administration.
- Die 404-Seite trägt den Entwurfsbanner und verweist mit absoluten Pfaden (`/css/site.css`, `/`), weil sie unter beliebigem Pfad ausgeliefert wird.

## Grenze der Mail-Verschleierung (AK 7)
Die Adresse steht weder als Klartext noch als `mailto:` im HTML. Die Teile liegen in `data-`-Attributen (`data-l`, `data-d`, `data-s`) und werden von `kontakt.js` zusammengesetzt. Ohne JavaScript erscheint „kontakt [at] enricofalk.de“, beide Knöpfe bleiben ausgeblendet.
Das ist ein **schwacher** Schutz: Er hält einfache Sammler ab, die nur den HTML-Text nach `@` oder `mailto:` durchsuchen. Wer die Seite mit JavaScript ausführt (Headless-Browser) oder die `data-`-Attribute kennt, findet die Adresse. Die Domain steht ohnehin öffentlich im Impressum (T-002). Für AK 7 reicht der Schutz. Wirksamer wäre nur ein Kontaktformular, das aber einen Server und Datenschutzfolgen bräuchte.

## 2026-10-19 · T-002 · Prüfwerkzeug, Bildweg, Adress-Konstante, Look-Invarianten

**Prüfwerkzeug (Gate 17:30 freigegeben):** getrennt vom Build in `tools/pruefung/` mit eigener `package.json`, Lockfile (121 Pakete, `npm audit`: 0 Befunde, kein Paket mit Install-Skript) und `.npmrc` (`ignore-scripts=true`, `save-exact=true`, `fund=false`). Feste Versionen: lighthouse 13.5.0, axe-core 4.14.0, html-validate 11.16.2, puppeteer-core 25.12.0. Einrichtung `npm ci --prefix tools/pruefung`, Aufruf `npm run pruefen`. Der Root-Build bleibt ohne Abhängigkeiten, nichts unter `src/` oder `scripts/` importiert aus `tools/`.
- Lighthouse läuft nur programmatisch (Node-API, kein CLI). Der Fehlerbericht (Sentry) wird nur vom CLI gestartet (`lighthouse-cli/bin.js`), die API lässt ihn aus; `configstore` wird nicht benutzt.
- Chrome startet mit eigenem Profil im Temp-Ordner (Variable `PRUEFUNG_TMP`) und wird im `finally` beendet. Der Prüfserver bindet nur `127.0.0.1` (Port 8400 bis 8449) und setzt `Content-Security-Policy: default-src 'self'`. Jede Anfrage der geprüften Seiten an einen anderen Host als 127.0.0.1 steht in `fremdanfragen.txt` (Fremdanfragen, Erwartung: leer; nicht erfasst sind Chrome-Eigenverkehr und die Abrufe der Linkprüfung). Nur die Linkprüfung ruft die zwei externen Links einmal ab (Timeout 10 s).
- Das installierte Chrome 155 ist neuer als die von puppeteer-core 25.12.0 erwartete Version 154; bisher ohne Auswirkung.
- **SEO und indexierbar:** `robots.txt` sperrt im Entwurf alles, daher meldet Lighthouse `is-crawlable` und SEO 66. AK 6 gilt laut PO als erfüllt, wenn der Zusatzlauf mit `indexierbar:true` alle Werte ≥ 90 zeigt (`lighthouse-zusatz-indexierbar-*`).
- **html-validate:** Vorgabe `html-validate:recommended`, geändert ist nur `doctype-style` (auf `lowercase` gestellt, weil das Mockup `<!doctype html>` kleinschreibt und der Build das übernimmt). Keine Regel ist abgeschaltet.

**Bildweg:** `tools/pruefung/bilder.mjs <foto.png>` zeichnet das Original in Chrome in eine Canvas und kodiert WebP (.82) und JPG (.85) neu, höchstens 512 px. Das Original (mit Exif) wird nur gelesen, nie ins Repo kopiert. Chrome hängt dabei ein ICC-Profil an JPG und WebP an (im Test beobachtet), das entfernen `entferneIccWebp` und `entferneMetadatenJpeg`; die Pixel sind sRGB. Favicon: gelber Block (Farben der Palette `--amber` auf `--ink`) als PNG 32 px (in `favicon.ico`) und 180 px (`apple-touch-icon.png`), kein SVG. Die Ergebnisse liegen in `src/bilder/` und sind eingecheckt, der Build kopiert nur. Das Foto heißt `foto-vorlaeufig` (Foto von 2019, Austausch später, Veröffentlichung erst nach Enricos Ja). Die Tests prüfen alle Bilder in `dist/` auf Metadaten (Exif, XMP, ICC, Textchunks, Zeitstempel).

**Adress-Konstante:** `kontakt.adresse` in `src/site.config.json` ist die einzige Stelle. Der Build leitet daraus `data-l`, `data-d` und den Rückfalltext (`lokal [at] domain`) ab; `terminUrl` leer heißt Platzhalter (der Knopf führt auf die gelbe Notiz `#termin`), gesetzt nur `https://`.

**Look-Invarianten (AK 5):** Das Mockup-CSS steht wortgleich in `site.css`, der Feinschliff nur additiv im Abschnitt `/* Feinschliff T-002 */`. `compare.mjs` prüft: `:root`-Tokens hell und dunkel gleich dem Mockup (im Druck dürfen sie auf Hell zurückgesetzt werden), Farbliterale ⊆ Mockup, Schriftfamilien ⊆ Mockup, `@keyframes` nur `rein`, `animation` nur an `.gauge`, kein `transition`, Druck- und Reduced-Motion-Regeln vorhanden. `GEAENDERT` (ersetzte Mockup-Regeln) ist leer.
- **Dark Mode im Kontakt:** Im Mockup lag helle Schrift auf hellem Grund (Kontrast etwa 1,3:1). Im Dunkelmodus gilt jetzt `#475A68` (= `--muted` hell) für die Notiz und `var(--bg)` für den gelben Platzhalter; das sind vorhandene Palettenfarben (PO: Ja, mindestens 4,5:1).
- Fokus: amberfarbener Ring bleibt, dazu ein Ring in `--ink` (Amber allein hat auf Hell zu wenig Kontrast); im Kontakt `--bg`.

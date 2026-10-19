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

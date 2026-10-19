# Prüfwerkzeug (T-002)

Nur für Prüfläufe, nicht Teil von Build und `dist/`. Eigene Pakete, damit der Root-Build ohne Abhängigkeiten bleibt.

- Einrichtung (einmal): `npm ci --prefix tools/pruefung` (`.npmrc`: `ignore-scripts=true`, `save-exact=true`). Chrome muss installiert sein, sonst `CHROME_PATH` auf `chrome.exe` setzen.
- Prüfläufe: `npm run pruefen -- --ausgabe <Berichtsordner>` (`--ausgabe` ist Pflicht, kein Standardpfad; vorher werden nur die eigenen Berichte im Ordner entfernt). Optionen: `--html` (Lighthouse-Berichte zusätzlich als HTML, je rund 1 MB), `--ohne-links`, `--nur lighthouse,axe,html,links`. Exit 1 bei harten Befunden (axe schwer oder kritisch, html-validate-Fehler, tote Links, Fremdanfragen, Lighthouse unter 90 mit Ausnahme SEO der echten Konfiguration). Strg+C und SIGTERM beenden Chrome und löschen das Temp-Profil.
- Bilder: `node tools/pruefung/bilder.mjs <foto.png> [zielordner]` (Standard `src/bilder`).
- Dateien: `pruefen.mjs` (Ablauf), `server.mjs` (nur 127.0.0.1, Port 8400 bis 8449, CSP `default-src 'self'`), `chrome.mjs` (Chrome mit Temp-Profil, Variable `PRUEFUNG_TMP`), `bilder.mjs`, `.htmlvalidate.json`.
- Netz: nur die Installation (npm-Registry) und die Linkprüfung der externen Links (einmal je Link, Timeout 10 s). Lighthouse läuft nur über die Node-API, ohne Fehlerbericht.

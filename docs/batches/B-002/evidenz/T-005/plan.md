# Plan T-005 Projekt auf die neue Agentenregel umstellen

Pipeline `dev.md` (Plan, Umsetzung und Selbsttest durch Code; Agenten nur QA). Branch `batch/B-002` ab `main` (a4a7df7).

## Impact-Analyse
| Bereich | Datei | Anpassungsbedarf |
|---|---|---|
| Projektgedächtnis | `CLAUDE.md` | Absatz unter „Rahmen“: Verweis auf RAHMEN-STAND (Subagenten, Workflow, Modell), KONZEPT-AGENTEN, Batch-Prozess 5b; `reviewer` = Architektur-Review, `qa` = QA |
| Steckbrief | `docs/PROJEKT.md` | Abschnitt „Tickets“: Batch-Ablauf mit Architektur-Review nach dem Plan und Schlusslauf; Zeile Agenten, Workflow, Modell |
| Agenten | `.claude/agents/reviewer.md` | Fassung der Rahmen-Vorlage (byte-gleich) |
| Agenten | `.claude/agents/planer.md`, `umsetzer.md` | entfernen |
| Agenten | `.claude/agents/qa.md` | unverändert (gleich der Vorlage) |
| Tests | `test/prozess.test.mjs` (neu) | AK1, AK2, AK4 als Test |
| bewusst unverändert | `.claude/agents/*.vor-konsistenz` | versioniert; Löschen würde das Merge-Gate sperren (Ausnahme deckt nur die vier Agentendateien) → als Altlast benannt |
| bewusst unverändert | `.claude/settings.json`, `hooks/`, `protected-files.conf` | AK3 |
| bewusst unverändert | `docs/konzept/freelancer-seite.md` („Gegenprüfung 19.10.“) | Co-PO-Dokument, geschützt, beschreibt Historie |
| bewusst unverändert | `docs/batches/B-001/**` | Archiv |

Suche: `grep -rni "planer|umsetzer|plan-review|diff-check|gegenpr|sonnet"` über `*.md`, `*.mjs`, `*.json` außerhalb `docs/batches` und `node_modules`: Treffer nur in den oben genannten Dateien.

## Vorgehen
1. Test `test/prozess.test.mjs` schreiben (rot). 2. Dateien ändern. 3. `npm test` grün. 4. Selbsttest rechts/links. 5. QA-Agent (Black-Box). 6. Commit, Push `batch/B-002`, Merge-Marker mit `"ausnahme":"agenten-2026-10-22"` und Wächter-Auftrag `ff-merge`.

## Tests (AK → Test)
AK1: CLAUDE.md/PROJEKT.md nennen RAHMEN-STAND, Batch-Prozess 5b, `reviewer`+Architektur-Review, `qa`+QA; keine alten Rollen, kein Sonnet. AK2: `.claude/agents/*.md` = {qa, reviewer}; reviewer gleich Vorlage (wenn Vorlage erreichbar), qa unverändert gegen Commit a4a7df7. AK4: PROJEKT.md nennt Architektur-Review nach dem Batch-Plan und Schlusslauf Gesamtarchitektur. AK3/AK5: `git diff --stat` und Merge-Ergebnis als Evidenz.

## Scope-Grenze
Keine Änderung an Seite, Inhalten, Paket, Hooks, Settings.

## Smoke / Plattform / DoD
Smoke: `npm run build` unverändert grün (keine Produktdatei berührt). Plattform: nicht betroffen (reine Prozessdateien). Hilfe-Doku, Persistenz, Datenschutz, Betrieb: nicht betroffen laut Ticket. Security: keine Secrets, keine neuen Abhängigkeiten.

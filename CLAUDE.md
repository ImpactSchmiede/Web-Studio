# Web-Studio — Claude Code Projektgedächtnis

Konzipiert/designt (UX/UI, Content), setzt um, pflegt und verwaltet alle Website-Projekte von Enrico. Infrastruktur und alles auf dem VPS liegt beim PO VPS-Administration, enge Abstimmung; Synergien und Wiederverwendbarkeit zwischen den Web-Projekten werden gemeinsam erkannt und gestärkt.

## Rahmen (gilt vor allen Projektregeln, vor jeder Arbeit lesen)
- Ablauf, Rollen, DoD, Stopp-Kriterien: `C:\Users\AI User\Projekte\Autonomes Arbeiten\Batch-Prozess.md`
- **Pipelines (Pflicht, jede Arbeit beginnt mit dem vollständigen Lesen der passenden Pipeline):**
  `C:\Users\AI User\Projekte\Autonomes Arbeiten\pipelines\` (`README.md` = Goldene Regeln)
- Guidelines: `C:\Users\AI User\Projekte\Autonomes Arbeiten\guidelines\` + Abweichungen in `docs/guidelines/`
- Austausch mit dem Co-PO: `C:\Users\AI User\Projekte\Autonomes Arbeiten\Austausch-Regeln.md`
  (Threads unter `C:\Users\AI User\Projekte\_Austausch\Web-Studio\`)
- Gemeinsame Ressourcen (Computer-Use, Wartung, Rahmen, TWS, VPS) nur nach Belegung, Client-IDs/Ports aus dem eigenen Bereich:
  `C:\Users\AI User\Projekte\Autonomes Arbeiten\Ressourcen-und-Belegung.md`
- VPS (Webseite, Dienst): nur ueber eine Anfrage des PO an den PO VPS-Administration (Vorlage `C:\Users\AI User\Projekte\_Austausch\VPS-Administration\Anfragen\_VORLAGE.md`); kein SSH, keine Zugangsdaten, nie selbst am Server installieren.
- **Projekt-Steckbrief (Grunddaten, Abweichungen, Befehle, Testumgebung, Leitplanken): `docs/PROJEKT.md`**

Bei Widerspruch gelten Rahmen und `docs/PROJEKT.md`.

**Agenten, Workflow, Modell: wie Rahmen** (`RAHMEN-STAND.md` „Subagenten, Workflow, Modell“, `KONZEPT-AGENTEN.md`, `Batch-Prozess.md` 5b):
- Sub-Agenten nur an zwei Stellen: `reviewer` für das Architektur-Review (zu Beginn jedes Batches nach dem Batch-Plan, am Vorhabenende als Schlusslauf über die Gesamtarchitektur) und `qa` für die QA (Black-Box je Ticket). Definitionen in `.claude/agents/`.
- Plan und Umsetzung macht Code selbst im Hauptkontext, danach den Selbsttest rechts und links (`guidelines\SELF_REVIEW.md` Teil B).
- Modell und Aufwand nach Rahmen (Standard Opus `medium`). Workflow und Modelle über Opus 5.5 nur mit Enricos Freigabe (`guidelines\ENTSCHEIDUNGSVORLAGE.md`).

## Beim Session-Start
```
git status
git pull --ff-only
```
Uncommitted changes und neu hereingekommene Commits kurz nennen. Danach Threads nach Austausch-Regeln prüfen.

## Wichtige Dateien
- `docs/PROJEKT.md` — Steckbrief (Startpunkt)
- `docs/konzept/` — Produkt und Konzept (Co-PO pflegt; Code liest nur)
- `docs/referenzen/` — geprüfte Fremdreferenzen (Quelle, Datum, Version)
- `docs/architektur/` — Architekturentscheidungen
- `docs/analysen/`, `docs/hotfixes/` — A-NNN / HF-NNN mit `INDEX.md`
- `docs/batches/<Batch>/` — archivierte Threads und Evidenz je Batch · `docs/releases/` — Release Notes

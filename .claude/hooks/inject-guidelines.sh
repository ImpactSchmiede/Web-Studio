#!/bin/bash
# UserPromptSubmit — beim ersten Prompt den Projekt-Steckbrief injizieren, danach kompakter Reminder (nach 2 h erneut voll).
PROJECT_NAME=$(basename "$CLAUDE_PROJECT_DIR" | tr '[:upper:]' '[:lower:]' | tr ' ' '_')
FLAG="${TMPDIR:-/tmp}/${PROJECT_NAME}_guidelines_injected"
REMINDER="[$(basename "$CLAUDE_PROJECT_DIR") | Rahmen: Batch-Prozess.md + docs/PROJEKT.md | Pipeline vollständig lesen vor jeder Arbeit | vor jedem Schritt STOPP-Datei + Thread prüfen | gemeinsame Ressourcen nur nach Belegung | Fehler zuerst bei uns, Primärdoku + Netz]"
if [ -f "$FLAG" ] && [ -z "$(find "$FLAG" -mmin +120 2>/dev/null)" ]; then echo "$REMINDER"; exit 0; fi
touch "$FLAG"
echo "═══ $(basename "$CLAUDE_PROJECT_DIR") — Projekt-Steckbrief (docs/PROJEKT.md) ═══"
[ -f "$CLAUDE_PROJECT_DIR/docs/PROJEKT.md" ] && cat "$CLAUDE_PROJECT_DIR/docs/PROJEKT.md"
echo ""; echo "$REMINDER"; exit 0

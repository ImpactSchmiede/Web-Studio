#!/bin/bash
# SessionEnd — Reiner Statusbericht am Ende jeder Session.
#
# WICHTIG: Dieser Hook verändert den Git-Zustand NICHT (Commits macht Code bewusst je Ticket).
#   - Kein git add / git commit
#   - Kein git reset / git checkout / git stash
#   - Nur lesende Git-Befehle (status, branch)
#
# Hintergrund: Bis 2026-07-22 hat dieser Hook beim Session-Ende automatisch
# `git add -A` + WIP-Commit ausgeführt. Bei parallelen Sessions hat das den
# uncommitteten Arbeitsstand einer anderen Session mit eingesammelt und damit
# faktisch zurückgesetzt. Commits entstehen ab jetzt ausschließlich manuell.

PROJECT_DIR="$CLAUDE_PROJECT_DIR"
cd "$PROJECT_DIR" || { echo "❌ CLAUDE_PROJECT_DIR nicht erreichbar: $PROJECT_DIR" >&2; exit 1; }

BRANCH=$(git branch --show-current 2>/dev/null)
STATUS=$(git status --porcelain 2>/dev/null)

if [ -z "$STATUS" ]; then
  echo "✅ Keine offenen Änderungen — Working-Tree sauber (Branch: ${BRANCH:-?})."
  exit 0
fi

COUNT=$(printf '%s\n' "$STATUS" | grep -c .)

echo ""
echo "📋 Session-Ende — Working-Tree unverändert erhalten."
echo "   Branch : ${BRANCH:-?}"
echo "   Offen  : $COUNT Datei(en) — NICHT committet, bleibt genau so liegen."
echo ""
printf '%s\n' "$STATUS" | sed 's/^/   /'
echo ""

# ── Nur-Hinweis: sensible Dateien im Working-Tree ────────────────────────
ENV_HITS=$(printf '%s\n' "$STATUS" | grep -E '(^|/|\s)\.env' || true)
if [ -n "$ENV_HITS" ]; then
  echo "⚠️  Hinweis: .env-artige Dateien im Working-Tree — vor einem Commit prüfen:"
  printf '%s\n' "$ENV_HITS" | sed 's/^/   /'
  echo ""
fi

echo "   → Eigene abgeschlossene Arbeit nach Batch-Prozess committen; fremde Änderungen nicht anfassen."
echo ""

exit 0

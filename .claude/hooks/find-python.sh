#!/bin/bash
# Wird von den Guard-Hooks per "source" geladen. Setzt PY auf einen funktionierenden
# Python-Interpreter (System oder projektlokale .venv). Ohne Interpreter blockieren die
# Guards (fail-closed), statt Befehle ungeprüft durchzulassen.
# Kompatibel mit: macOS, Linux, WSL, Git Bash (Windows)

PY=""
for candidate in python3 python py \
  "$CLAUDE_PROJECT_DIR/.venv/Scripts/python.exe" "$CLAUDE_PROJECT_DIR/.venv/bin/python"; do
  if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c "" >/dev/null 2>&1; then
    PY="$candidate"
    break
  fi
done

# Letzter Kandidat: von uv verwaltetes Python (frischer Klon ohne .venv)
if [ -z "$PY" ] && command -v uv >/dev/null 2>&1; then
  UV_PY="$(uv python find 2>/dev/null)"
  if [ -n "$UV_PY" ] && "$UV_PY" -c "" >/dev/null 2>&1; then
    PY="$UV_PY"
  fi
fi

if [ -z "$PY" ]; then
  echo "❌ Kein Python-Interpreter gefunden (python3, python, py, .venv, uv) — Guard blockiert vorsichtshalber." >&2
  echo "   Abhilfe (Co-PO/Enrico): Python oder uv installieren bzw. Projekt-.venv anlegen (docs/PROJEKT.md)." >&2
  return 2 2>/dev/null || exit 2
fi

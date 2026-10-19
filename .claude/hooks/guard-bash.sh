#!/bin/bash
# PreToolUse(Bash) — Sicherheitsregeln für Claude Code im Projekt.
# Logik: guard_bash.py (Push-/Merge-/Historienregeln nach Batch-Prozess.md).
# Ohne Python-Interpreter blockiert der Hook (fail-closed).
# Kompatibel mit: macOS, Linux, WSL, Git Bash (Windows)

HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$HOOK_DIR/find-python.sh" || exit 2
"$PY" "$HOOK_DIR/guard_bash.py"
exit $?

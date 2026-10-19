#!/bin/bash
# PreToolUse(Write|Edit) — Schützt Co-PO-Dateien vor Änderungen durch Claude Code.
# Logik: guard_protected_files.py, Konfiguration: .claude/protected-files.conf.
# Ohne Python-Interpreter blockiert der Hook (fail-closed).
# Kompatibel mit: macOS, Linux, WSL, Git Bash (Windows)

HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$HOOK_DIR/find-python.sh" || exit 2
"$PY" "$HOOK_DIR/guard_protected_files.py"
exit $?

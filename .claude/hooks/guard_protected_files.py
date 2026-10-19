"""PreToolUse(Write|Edit) — schützt Co-PO-Dateien (Konzept, Produktkontext, Historie, Guards).

Konfiguration: .claude/protected-files.conf — Dateiname (überall), projektrelativer Pfad
(auch mit * und ?), Ordner/ oder ~/... für Pfade im Benutzerprofil.
Exit 2 blockiert das Werkzeug; nicht lesbare Eingaben blockieren ebenfalls (fail-closed).
"""

from __future__ import annotations

import json
import os
import re
import sys
from fnmatch import fnmatchcase
from pathlib import Path


def native_path(value: str) -> str:
    """Git-Bash-Pfade (/c/Users/...) unter Windows in C:/Users/... umsetzen."""
    match = re.match(r"^/([a-zA-Z])(/.*)?$", value)
    if os.name == "nt" and match:
        return f"{match.group(1).upper()}:{match.group(2) or '/'}"
    return value


def read_input() -> dict:
    """Hook-JSON von stdin (UTF-8, ein evtl. BOM wird ignoriert)."""
    data = json.loads(sys.stdin.buffer.read().decode("utf-8-sig"))
    if not isinstance(data, dict):
        raise ValueError("Hook-Eingabe ist kein JSON-Objekt")
    return data


def project_dir() -> Path:
    return Path(native_path(os.environ.get("CLAUDE_PROJECT_DIR", "."))).resolve()


def load_protected(root: Path) -> list[str]:
    conf = root / ".claude" / "protected-files.conf"
    if not conf.is_file():
        return []
    entries = []
    for line in conf.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            entries.append(line)
    return entries


def absolute_path(file_path: str, root: Path) -> Path:
    raw = native_path(file_path)
    path = Path(raw).expanduser() if raw.startswith("~") else Path(raw)
    if not path.is_absolute():
        path = root / path
    return path.resolve()


def relative_path(file_path: str, root: Path) -> str:
    path = absolute_path(file_path, root)
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return path.as_posix()


def _fold(value: str) -> str:
    return value.casefold() if os.name == "nt" else value


def _inside(child: str, parent: str) -> bool:
    child, parent = _fold(child), _fold(parent.rstrip("/"))
    return child == parent or child.startswith(parent + "/")


def protected_rule(
    target: str, root: Path, entries: list[str], include_parents: bool = False
) -> str | None:
    """Greifende Schutzregel für ein Ziel oder None.

    include_parents: auch Ordner melden, die einen geschützten Pfad enthalten (für Verschieben,
    Umbenennen und Löschen - sonst ließe sich z. B. .claude/hooks samt Guards entfernen).
    """
    absolute = absolute_path(target, root).as_posix()
    rel = relative_path(target, root)
    in_project = _inside(absolute, root.as_posix())
    for entry in entries:
        if entry.startswith("~/"):
            pattern = (Path.home() / entry[2:]).as_posix()
            if fnmatchcase(_fold(absolute), _fold(pattern)):
                return entry
            if include_parents and _inside(pattern, absolute):
                return entry
            continue
        if include_parents and _inside(root.as_posix(), absolute):
            return "Projektordner"  # Projektordner selbst oder ein Elternordner davon
        if not in_project:
            continue
        if "/" not in entry:
            if _fold(rel.rsplit("/", 1)[-1]) == _fold(entry):
                return entry
        elif entry.endswith("/"):
            if _inside(rel, entry):
                return entry
        elif fnmatchcase(_fold(rel), _fold(entry)):
            return entry
        if include_parents and rel not in ("", ".") and _inside(entry, rel):
            return entry
    return None


def main() -> int:
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
    try:
        data = read_input()
        tool_input = data.get("tool_input", {})
        file_path = (
            tool_input.get("file_path")
            or tool_input.get("notebook_path")
            or tool_input.get("path")
            or ""
        )
        if not file_path:
            return 0
        root = project_dir()
        rel = relative_path(file_path, root)
        rule = protected_rule(file_path, root, load_protected(root))
    except Exception as error:  # fail-closed: jeder interne Fehler blockiert
        message = f"Hook-Eingabe/Prüfung fehlgeschlagen ({type(error).__name__})"
        print(f"❌ {message} — Änderung vorsichtshalber blockiert.", file=sys.stderr)
        return 2
    if rule:
        print(
            f"❌ {rel} gehört dem Co-PO (Regel: {rule}) und darf von Claude Code nicht "
            "bearbeitet werden. Änderungswunsch als FRAGE an den Co-PO.",
            file=sys.stderr,
        )
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())

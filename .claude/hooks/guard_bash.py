"""PreToolUse(Bash) — Sicherheitsregeln für Claude Code im Projekt (Rahmen: Batch-Prozess.md).

Erlaubt: Push von batch/*-Branches und den fast-forward-Merge + Push nach main.
Blockiert: Force-/Lösch-/Mirror-Push, Historie umschreiben, Arbeit verwerfen, rm -rf,
Merge/Pull auf main ohne --ff-only, Rebase mit main-Bezug, Git-Aliase per -c, Commit mit
TEMP_INSTRUMENT sowie Bash-Schreiben auf Co-PO-Dateien.

Der Befehl wird wie von der Shell zerlegt (Quoting, Operatoren); je Teilbefehl wird das
Git-Unterkommando bestimmt. Commit-Nachrichten in Quotes lösen deshalb keine Regeln aus.
Exit 2 blockiert; nicht lesbare Eingaben und interne Fehler blockieren ebenfalls (fail-closed).

Gilt für das Bash- und das PowerShell-Werkzeug (Feld tool_name); eingebettete Aufrufe über
bash/sh -c, pwsh/powershell -Command, cmd /c, eval und Invoke-Expression werden rekursiv geprüft.

Grenzen (bewusst, Sicherheitsnetz neben dem Auto-Modus, kein Bollwerk): Indirektionen wie
Skriptdateien (`pwsh -File`, `python -c`, `[IO.File]::WriteAllText`), Umgebungsvariablen als
Befehlsname, Start-Process oder zur Laufzeit zusammengesetzte Befehle werden nicht ausgewertet.
Nicht gesperrt sind außerdem `cd … && git checkout <pfad>`, `git branch -D`, `git worktree remove`,
`find -delete` sowie Git-Rückwege auf ältere .claude-Stände (`git revert`, `reset --keep/--merge`,
`stash pop`, Branchwechsel), Zuweisungen vor dem Befehl (`$x = git push --force`) und die
Parameterform `-Path:wert`. Bewusst streng: `Get-ChildItem … | Remove-Item -Recurse -Force`
(Ziele kommen aus der Pipe) und `rm -rf` in Bash sind auch im Temp-Verzeichnis gesperrt;
Ausweichen über Remove-Item mit Pfad im Temp-Verzeichnis. Dafür gelten die Deny-Regeln in
.claude/settings.json und ggf. Branch-Regeln auf GitHub. Heredoc-Texte ohne Quotes
(z. B. `git commit -F - <<EOF`) werden zeilenweise wie Befehle geprüft und können daher einen
Fehlalarm auslösen; Commit-Nachrichten besser per `-m "..."` übergeben.
"""

from __future__ import annotations

import os
import re
import shlex
import subprocess
import sys
import tempfile
from pathlib import Path

from guard_protected_files import (
    load_protected,
    native_path,
    project_dir,
    protected_rule,
    read_input,
)

SEPARATORS = {";", "&", "&&", "|", "||", "|&", "(", ")", ";;"}
REDIRECTS = {">", ">>", ">|", "&>", "&>>"}
WRAPPERS = {"sudo", "command", "env", "exec", "nohup", "time", "xargs"}
SHELLS = {"bash", "sh", "zsh", "dash"}
GIT_OPTS_WITH_VALUE = {"-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path"}
MAIN = re.compile(r"(^|[/:])(main|master)$")


def newlines_to_separators(command: str) -> str:
    """Zeilenumbrüche außerhalb von Quotes werden zu ';' (wie in der Shell)."""
    out: list[str] = []
    quote, escape = "", False
    for char in command:
        if escape:
            escape = False
            if char == "\n":
                out.pop()  # Zeilenfortsetzung: Backslash und Umbruch entfallen
            else:
                out.append(char)
            continue
        if char == "\\" and quote != "'":
            escape = True
        elif quote:
            if char == quote:
                quote = ""
        elif char in "'\"":
            quote = char
        elif char == "\n":
            char = " ; "
        out.append(char)
    return "".join(out)


def tokenize(command: str, mode: str = "bash") -> list[str]:
    if mode in ("powershell", "cmd"):
        # Backtick-Zeilenfortsetzung entfernen; Backslashes sind dort Pfadtrenner, kein Escape.
        command = re.sub(r"`\r?\n", " ", command).replace("\\", "/")
    try:
        lexer = shlex.shlex(newlines_to_separators(command), posix=True, punctuation_chars=True)
        lexer.whitespace_split = True
        return list(lexer)
    except ValueError:
        # Unbalancierte Quotes (z. B. Heredoc-Text): konservativ ohne Quotes zerlegen.
        stripped = re.sub(r"[\"']", " ", command.replace("\n", " ; "))
        return re.findall(r"&&|\|\||>>|[;&|()<>]|[^\s;&|()<>]+", stripped)


def segments(tokens: list[str]) -> list[list[str]]:
    result: list[list[str]] = [[]]
    for token in tokens:
        if token in SEPARATORS:
            result.append([])
        else:
            result[-1].append(token)
    return [segment for segment in result if segment]


def command_words(segment: list[str]) -> list[str]:
    """Entfernt Variablenzuweisungen und Wrapper wie sudo/env vor dem eigentlichen Befehl."""
    words = list(segment)
    while words and (re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", words[0]) or words[0] in WRAPPERS):
        words.pop(0)
    return words


def base_name(word: str) -> str:
    name = word.replace("\\", "/").rsplit("/", 1)[-1].lower()
    return name[:-4] if name.endswith(".exe") else name


def short_flags(args: list[str]) -> str:
    return "".join(a[1:] for a in args if a.startswith("-") and not a.startswith("--"))


def has_long(args: list[str], name: str) -> bool:
    """Langoption inkl. der von Git akzeptierten Abkürzungen (z. B. --ha für --hard)."""
    for arg in args:
        option = arg.split("=", 1)[0]
        if option.startswith(name) or (len(option) >= 4 and name.startswith(option)):
            return True
    return False


def risky_config(key_value: str) -> bool:
    """Git-Konfiguration, über die Aliase oder Force-Push-Refspecs eingeschleust werden."""
    key = key_value.lower()
    return key.startswith("alias.") or re.match(r"^remote\.[^=\s]*\.push\b", key) is not None


def git_subcommand(words: list[str]) -> tuple[str, list[str]] | str:
    """Liefert (Unterkommando, Argumente) oder einen Blockgrund für riskante -c-Werte."""
    index = 1
    while index < len(words) and words[index].startswith("-"):
        option = words[index]
        if option.startswith("-c"):
            value = words[index + 1] if option == "-c" and index + 1 < len(words) else option[2:]
            if risky_config(value):
                return "Git-Aliase oder Push-Refspecs per -c sind blockiert."
        index += 2 if option in GIT_OPTS_WITH_VALUE else 1
    if index >= len(words):
        return ("", [])
    return (words[index].lower(), words[index + 1 :])


def check_push(args: list[str]) -> str | None:
    flags = short_flags(args)
    plain = [a for a in args if not a.startswith("-")]
    if any(has_long(args, name) for name in ("--force", "--mirror", "--prune")):
        return "Force-/Mirror-/Prune-Push ist blockiert."
    if "f" in flags:
        return "Force-Push ist blockiert."
    if "d" in flags or has_long(args, "--delete"):
        return "Löschen von Remote-Branches ist blockiert."
    if any(a.startswith("+") for a in plain):
        return "Force-Push per +Refspec ist blockiert."
    if any(a.startswith(":") for a in plain):
        return "Löschen von Remote-Branches per :Refspec ist blockiert."
    return None


def checkout_discards(args: list[str], flags: str, plain: list[str], root: Path) -> bool:
    """checkout --, -f oder Pfade (".", existierende Dateien, Tree-ish + Pfad) verwerfen Arbeit."""
    if "--" in args or "f" in flags or has_long(args, "--force"):
        return True
    if "b" in flags or "B" in flags or has_long(args, "--orphan"):
        return False  # neuen Branch anlegen
    if "." in plain or len(plain) >= 2:
        return True
    return any((root / p).exists() for p in plain if not p.startswith("origin/"))


def restore_only_unstages(args: list[str], flags: str) -> bool:
    staged = "S" in flags or has_long(args, "--staged")
    worktree = "W" in flags or has_long(args, "--worktree")
    return staged and not worktree


def check_git(words: list[str], mentions_main: bool, on_main: bool, root: Path) -> str | None:
    parsed = git_subcommand(words)
    if isinstance(parsed, str):
        return parsed
    sub, args = parsed
    flags = short_flags(args)
    plain = [a for a in args if not a.startswith("-")]
    if sub == "push":
        return check_push(args)
    if sub == "reset" and has_long(args, "--hard"):
        return "git reset --hard ist blockiert."
    if sub == "clean" and ("f" in flags or has_long(args, "--force")):
        return "Erzwingendes git clean ist blockiert."
    if sub == "checkout" and checkout_discards(args, flags, plain, root):
        return "Verwerfen von Änderungen (checkout -- / -f / Pfade) ist blockiert."
    if sub == "switch" and ("f" in flags or has_long(args, "--discard-changes")):
        return "Verwerfen von Änderungen (switch --discard-changes / -f) ist blockiert."
    if sub == "switch" and has_long(args, "--force"):
        return "Verwerfen von Änderungen (switch --force) ist blockiert."
    if sub == "restore" and not restore_only_unstages(args, flags):
        return "Verwerfen von Änderungen (git restore) ist blockiert; erlaubt: restore --staged."
    if sub == "stash" and plain[:1] in (["clear"], ["drop"]):
        return "Verwerfen von Stashes ist blockiert."
    if sub in ("filter-branch", "filter-repo"):
        return "Historie umschreiben ist blockiert."
    if sub == "update-ref" and "d" in flags:
        return "Löschen von Refs ist blockiert."
    if sub == "reflog" and plain[:1] in (["expire"], ["delete"]):
        return "Bereinigen des Reflogs ist blockiert."
    if sub == "config" and any(risky_config(a) for a in plain):
        return "Git-Aliase und Push-Refspecs per git config sind blockiert."
    if sub in ("merge", "pull") and (mentions_main or on_main):
        if not ({"--ff-only", "--abort"} & set(args)):
            return "Nach main nur fast-forward: git merge --ff-only bzw. git pull --ff-only."
    if sub == "rebase" and (mentions_main or on_main):
        return "Rebase mit Bezug auf main ist blockiert (Historie umschreiben)."
    if sub == "commit":
        hits = temp_instrument_hits(root)
        if hits:
            return "TEMP_INSTRUMENT-Marker gefunden — Commit blockiert: " + ", ".join(hits)
    if sub == "mv" or (sub == "rm" and "--cached" not in args):
        return check_targets(plain, root, include_parents=True)
    return None


def check_rm(args: list[str]) -> str | None:
    flags = short_flags(args)
    recursive = "r" in flags or "R" in flags or "--recursive" in args
    force = "f" in flags or "--force" in args
    if recursive and force:
        return "rm -rf ist blockiert — gezielte, wiederherstellbare Operation verwenden."
    return None


# PowerShell: Cmdlets und Aliase (klein geschrieben)
PS_REMOVE = {"remove-item", "rm", "del", "ri", "rd", "rmdir", "erase"}
PS_WRITE = {
    "set-content",
    "sc",
    "add-content",
    "ac",
    "clear-content",
    "clc",
    "out-file",
    "tee-object",
    "tee",
    "new-item",
    "ni",
    "set-item",
    "si",
}
PS_MOVE = {"move-item", "mi", "move", "mv", "rename-item", "rni", "ren"}
PS_COPY = {"copy-item", "cpi", "copy", "cp"}
PS_SWITCHES = {
    "-recurse",
    "-force",
    "-whatif",
    "-confirm",
    "-passthru",
    "-nonewline",
    "-append",
    "-noclobber",
    "-container",
}
PS_PATH_PARAMS = ("-path", "-literalpath", "-filepath", "-pspath")
SHELL_REDIRECTS = REDIRECTS | {"*>", "*>>", "1>", "2>", "1>>", "2>>"}


def ps_param(word: str) -> tuple[str, str | None]:
    """'-Force:$true' -> ('-force', '$true'); Parameter case-insensitiv."""
    name, _, value = word.partition(":")
    return name.lower(), (value or None)


def ps_is(word: str, full: str, minimum: int) -> bool:
    name, value = ps_param(word)
    if value is not None and value.lower() == "$false":
        return False
    return len(name) >= minimum and full.startswith(name)


def ps_arguments(words: list[str]) -> tuple[list[str], dict[str, list[str]]]:
    """Positionsargumente und benannte Parameter (Kommalisten aufgelöst)."""
    positional: list[str] = []
    named: dict[str, list[str]] = {}
    index = 1
    while index < len(words):
        word = words[index]
        if word.startswith("-") and len(word) > 1:
            name, value = ps_param(word)
            if value is None and not any(s.startswith(name) for s in PS_SWITCHES):
                if index + 1 < len(words):
                    value = words[index + 1]
                    index += 1
            named.setdefault(name, []).extend((value or "").split(","))
        else:
            positional.extend(word.split(","))
        index += 1
    return [p for p in positional if p], named


def named_value(named: dict[str, list[str]], *prefixes: str) -> list[str]:
    values: list[str] = []
    for name, items in named.items():
        if any(len(name) >= 3 and full.startswith(name) for full in prefixes):
            values.extend(item for item in items if item)
    return values


def resolve_target(target: str, root: Path) -> Path:
    temp = tempfile.gettempdir()
    for variable in ("$env:temp", "$env:tmp", "%temp%", "%tmp%", "$tmpdir"):
        if target.lower().startswith(variable):
            target = temp + target[len(variable) :]
    target = native_path(target)
    path = Path(target).expanduser()
    if not path.is_absolute():
        path = root / path
    return Path(os.path.normpath(str(path)))


def in_temp(target: str, root: Path) -> bool:
    """Liegt das Ziel im Temp-Verzeichnis? realpath gleicht 8.3-Kurz- und Langform an."""
    temp = os.path.realpath(tempfile.gettempdir())
    path = os.path.realpath(str(resolve_target(target, root)))
    if os.name == "nt":
        temp, path = temp.casefold(), path.casefold()
    return path.startswith(temp.rstrip(os.sep) + os.sep)


def in_project(target: str, root: Path) -> bool:
    project = os.path.realpath(str(root))
    path = os.path.realpath(str(resolve_target(target, root)))
    if os.name == "nt":
        project, path = project.casefold(), path.casefold()
    return path == project or path.startswith(project.rstrip(os.sep) + os.sep)


def check_recursive_delete(targets: list[str], root: Path) -> str | None:
    """Rekursives Löschen mit Force nur im Temp-Verzeichnis und nie im Projekt."""
    if targets and all(in_temp(t, root) and not in_project(t, root) for t in targets):
        return None
    return "Rekursives Löschen mit Force ist nur im Temp-Verzeichnis erlaubt."


def check_targets(targets: list[str], root: Path, include_parents: bool = False) -> str | None:
    entries = load_protected(root)
    for target in targets:
        rule = protected_rule(target, root, entries, include_parents=include_parents)
        if rule:
            return f"Schreib-/Löschzugriff auf geschützten Pfad blockiert (Regel: {rule})."
    return None


def redirect_targets(segment: list[str]) -> list[str]:
    return [segment[i + 1] for i, token in enumerate(segment[:-1]) if token in SHELL_REDIRECTS]


def check_bash_files(name: str, words: list[str], segment: list[str], root: Path) -> str | None:
    args = [a for a in words[1:] if not a.startswith("-")]
    writes = redirect_targets(segment)
    moves: list[str] = []
    if name in ("tee", "truncate"):
        writes += args
    elif name in ("mv", "rm"):
        moves += args
    elif name == "cp" and args:
        writes.append(args[-1])
    elif name in ("sed", "perl") and any(a.startswith("-i") or a == "-pi" for a in words[1:]):
        writes += args[1:]
    return check_targets(writes, root) or check_targets(moves, root, include_parents=True)


def check_powershell(name: str, words: list[str], segment: list[str], root: Path) -> str | None:
    positional, named = ps_arguments(words)
    paths = named_value(named, *PS_PATH_PARAMS) or positional[:1]
    if name in PS_REMOVE:
        recurse = any(ps_is(w, "-recurse", 2) for w in words[1:])
        force = any(ps_is(w, "-force", 3) for w in words[1:])
        targets = named_value(named, *PS_PATH_PARAMS) + positional
        if recurse and force:
            reason = check_recursive_delete(targets, root)
            if reason:
                return reason
        return check_targets(targets, root, include_parents=True)
    if name in PS_WRITE:
        return check_targets(paths, root)
    if name in PS_MOVE:
        destination = named_value(named, "-destination", "-newname") or positional[1:2]
        return check_targets(paths, root, include_parents=True) or check_targets(destination, root)
    if name in PS_COPY:
        destination = named_value(named, "-destination") or positional[1:2]
        return check_targets(destination, root)
    return None


def check_cmd(name: str, words: list[str], root: Path) -> str | None:
    switches = {w.lower() for w in words[1:] if w.startswith("/")}
    targets = [w for w in words[1:] if not w.startswith("/")]
    if name in ("rd", "rmdir", "del", "erase") and "/s" in switches:
        return check_recursive_delete(targets, root)
    if name in ("rd", "rmdir", "del", "erase", "move", "ren", "rename"):
        return check_targets(targets[:1], root, include_parents=True)
    if name == "copy" and len(targets) > 1:
        return check_targets(targets[-1:], root)
    return None


def nested_command(name: str, words: list[str]) -> tuple[str, str] | str | None:
    """Erkennt Shell-Aufrufe mit eingebettetem Befehl: (Modus, Befehl), Blockgrund oder None."""
    rest = words[1:]
    if name in SHELLS and "-c" in rest:
        script = rest[rest.index("-c") + 1 :][:1]
        return ("bash", script[0]) if script else None
    if name in ("pwsh", "powershell"):
        for index, word in enumerate(rest):
            option = word.lower()
            option_name = option.split(":")[0]
            if option_name == "-ec" or (
                option.startswith("-e") and "-encodedcommand".startswith(option_name)
            ):
                return "PowerShell -EncodedCommand ist nicht prüfbar und blockiert."
            if option in ("-c", "-command", "-com", "-comm", "-comma", "-comman"):
                return ("powershell", " ".join(rest[index + 1 :]))
            if option.startswith("-f") and "-file".startswith(option):
                return None  # Skriptdatei: bekannte Grenze
        plain = [w for w in rest if not w.startswith("-")]
        return ("powershell", " ".join(plain)) if plain else None
    if name == "cmd":
        for index, word in enumerate(rest):
            if word.lower() in ("/c", "/k"):
                return ("cmd", " ".join(rest[index + 1 :]))
        return None
    if name in ("eval", "iex", "invoke-expression"):
        mode = "bash" if name == "eval" else "powershell"
        return (mode, " ".join(rest))
    return None


def temp_instrument_hits(root: Path) -> list[str]:
    hits = []
    for folder in ("src", "tests", "scripts"):
        base = root / folder
        if not base.is_dir():
            continue
        for path in base.rglob("*.py"):
            if "TEMP_INSTRUMENT" in path.read_text(encoding="utf-8", errors="ignore"):
                hits.append(path.relative_to(root).as_posix())
    return hits[:5]


def current_branch(root: Path) -> str:
    try:
        result = subprocess.run(
            ["git", "-C", str(root), "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
        )
    except (OSError, subprocess.SubprocessError):
        return ""
    return result.stdout.strip()


def evaluate(
    command: str, root: Path, branch: str, depth: int = 0, mode: str = "bash"
) -> str | None:
    """Liefert den Blockgrund oder None, wenn der Befehl erlaubt ist."""
    tokens = tokenize(command, mode)
    mentions_main = any(MAIN.search(token) for token in tokens)
    on_main = branch in ("main", "master")
    for segment in segments(tokens):
        words = command_words(segment)
        if not words:
            continue
        name = base_name(words[0])
        nested = nested_command(name, words)
        if isinstance(nested, str):
            return nested
        if nested is not None:
            if depth >= 3:
                return "Zu tief verschachtelte Shell-Aufrufe sind blockiert."
            reason = evaluate(nested[1], root, branch, depth + 1, nested[0])
        elif name == "git":
            reason = check_git(words, mentions_main, on_main, root)
        elif mode == "bash" and name == "rm":
            reason = check_rm(words[1:]) or check_bash_files(name, words, segment, root)
        elif mode == "powershell":
            reason = check_powershell(name, words, segment, root)
            reason = reason or check_targets(redirect_targets(segment), root)
        elif mode == "cmd":
            reason = check_cmd(name, words, root) or check_targets(redirect_targets(segment), root)
        else:
            reason = check_bash_files(name, words, segment, root)
        if reason:
            return reason
    return None


def main() -> int:
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
    try:
        data = read_input()
        command = str(data.get("tool_input", {}).get("command") or "")
        mode = "powershell" if data.get("tool_name") == "PowerShell" else "bash"
        if mode == "powershell" and not command.strip():
            reason: str | None = "PowerShell-Aufruf ohne prüfbaren Befehl ist blockiert."
        else:
            root = project_dir()
            reason = evaluate(command, root, current_branch(root), mode=mode)
    except Exception as error:  # fail-closed: jeder interne Fehler blockiert
        message = f"Guard-Fehler ({type(error).__name__}) — Befehl vorsichtshalber blockiert."
        print(f"❌ {message}", file=sys.stderr)
        return 2
    if reason:
        print(f"❌ {reason}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())

# Auslieferungspaket: POSIX ustar (T-003)

Quelle: POSIX.1-2017 (pax-Spezifikation, Abschnitt „ustar Interchange Format“, aus Kenntnis), Anforderungen des PO VPS-Administration (Thread `Web-Studio_freelancer-seite.md`, Paketformat und Endungsliste 16:34), eigene Gegenprobe. Prüfdatum 2026-10-19.
Version: bsdtar 3.8.9 (libarchive 3.8.9, `C:\Windows\System32\tar.exe`), GNU tar 1.35 (Git für Windows, `C:\Program Files\Git\usr\bin\tar.exe`), Node 24.19.

## Format (nur das, was `src/build/paket.mjs` schreibt und liest)
- Je Datei ein Kopf von 512 Byte, dann die Daten, aufgefüllt mit Nullen auf ein Vielfaches von 512, am Ende zwei Nullblöcke.
- Kopffelder: `name[100]`, `mode[8]` (0000644), `uid`/`gid[8]` (0), `size[12]` und `mtime[12]` oktal, `chksum[8]`, `typeflag` (`0`), `linkname[100]` leer, `magic` `ustar\0`, Version `00`, `uname`/`gname[32]` leer, `devmajor`/`devminor` leer, `prefix[155]` leer.
- Prüfsumme (`chksum`): Summe aller 512 Header-Bytes, das Feld selbst als 8 Leerzeichen gezählt, geschrieben als sechs Oktalziffern, NUL, Leerzeichen.
- Oktalfelder streng: nur `0` bis `7`, nicht leer, mit NUL oder Leerzeichen abgeschlossen.
- Erlaubt sind nur normale Dateien (`typeflag 0`), keine Ordnereinträge, keine Links. Namen nur aus `[A-Za-z0-9._/-]`, höchstens 100 Zeichen (deshalb kein `prefix`), kein Segment leer, `.` oder `..`, keines beginnt mit `.` oder endet mit `.`, keine reservierten Windows-Namen (`CON PRN AUX NUL COM1-9 LPT1-9`, auch mit Endung), keine Duplikate (auch nicht nach Groß-/Kleinschreibung).
- Reihenfolge: `index.html`, `404.html`, danach alle übrigen Pfade nach Bytes sortiert.
- **`mtime` = Paketdatum 00:00 UTC**, gewählt für die Wiederholbarkeit (zweimal packen ergibt dieselben Bytes). Entpackte Dateien tragen dieses Datum, nicht das Erstellungsdatum.
- `.sha256` im Format von `sha256sum`: `<64 Hex>␣␣<datum>.tar` und ein LF.

## Messung und Gegenprobe
- Beide System-`tar` listen die Einträge in der Paketreihenfolge und entpacken bytegleich zu `dist/`.
- GNU tar deutet einen Pfad wie `C:\…` als Rechnername (`host:datei`); Aufrufe laufen deshalb mit `cwd` und relativem Dateinamen.
- Ein von System-`tar --format=ustar` erzeugtes Archiv liest `leseTar` (mit Befunden zu Benutzername und Modus, weil es nicht das reproduzierbare Format ist).

## Restunsicherheit
- Der VPS-Administrator prüft möglicherweise anders (andere tar-Version, eigene Skripte); `npm run paket:pruefen` bildet nur das bekannte Verfahren nach.
- Die POSIX-Angaben stammen aus der Kenntnis, nicht aus einer erneuten Lektüre der Spezifikation.
- Erweiterte Köpfe (pax, GNU-Langnamen, sparse) sind nicht vorgesehen und werden als Typ-Befund abgelehnt.

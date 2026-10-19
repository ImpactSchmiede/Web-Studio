# Chrome-PDF: Aufbau, Messbefunde, Grenzen (T-003)

Quelle: eigene Messung (Skript `tools/pruefung/profil.mjs`, Fixture `test/fixtures/chrome-roh.pdf`), Prüfdatum 2026-10-19.
Version: Chrome 155.0.8059.80 (Windows, Headless), puppeteer-core 25.12.0, `page.pdf({ format: 'A4', printBackground: true, tagged: true, outline: false, preferCSSPageSize: true })`.
Norm (aus Kenntnis, Abschnittsnummern vor Änderungen am Leser gegen die frei zugängliche ISO-32000-1-Fassung prüfen): Info-Dictionary 14.3.3, Textstrings 7.9.2.2, xref 7.5.4, inkrementelles Update 7.5.6, URI-Aktion 12.6.4.7, ToUnicode 9.10.3, Type3 9.6.5.

## Messbefunde (Profil-PDF, 2 Seiten, 350 Objekte, rund 129 KB)
- **Aufbau:** PDF 1.4, genau eine klassische xref-Tabelle (ein Abschnitt `0 N`, 20-Byte-Einträge), `trailer` mit `/Size /Root /Info` (keine `/ID`, kein `/Prev`, kein `/XRef`, keine Objektströme, keine Verschlüsselung, kein `/Metadata`). Katalog: `/Pages /MarkInfo /StructTreeRoot /ViewerPreferences /Lang`.
- **Info-Dictionary** (Objekt 1): `Title` = `<title>` der Seite (UTF-16BE, Hex), `Creator` = User-Agent (`Mozilla/5.0 (Windows NT 10.0; Win64; x64) … HeadlessChrome/155 …`), `Producer` = `Skia/PDF m155`, `CreationDate` und `ModDate` = Erzeugungszeit. Kein `Author`.
- **Schriften:** Atkinson Hyperlegible als Type0 mit CIDFontType2 und `FontFile2` (eingebettet, Teilmenge `AAAAAA+…`), Bricolage Grotesque (variable Schrift) als **Type3** mit `CharProcs` und Descriptor-Name `…+Bricolage-Grotesque-96pt-ExtraBold-14pt-Bold` (mit Bindestrichen, deshalb vergleicht `pruefePdf` die Namen ohne Nicht-Buchstaben). Jede oberste Schrift hat `/ToUnicode`. Ein Systemschrift-Ersatz würde als andere `BaseFont` auffallen und wird abgelehnt.
- **Verweise:** Relative Links werden mit der Adresse des Prüfservers eingetragen (gemessen: `href="impressum.html"` wird `/URI (http://127.0.0.1:8415/impressum.html)`, bei `file://` als `file:///C:/Users/…` mit dem Benutzernamen). Darum enthält die Druck-Seite nur `https:` und `mailto:`, und `pruefePdf` lehnt jeden anderen URI und jede lokale Kennung ab. Absolute URLs normalisiert Chrome (`https://impact-schmiede.de` wird `…de/`). Ein Anker `#x` wird ein `/Dest`.
- **Determinismus:** Zwei Läufe unterscheiden sich nur in den beiden Datumswerten. Danach schreibt `setzeInfo` Titel, Autor und den Stand fest, die Datei wird bytegleich wiederholbar.
- **Bild:** Das Foto der Seite stünde als `/Subtype /Image` im PDF; die Druck-Seite hat keines.
- **Fixierte Fußzeile:** `position: fixed` wird zwar auf jeder Seite wiederholt, sitzt aber am unteren Rand der Inhaltsfläche und überdeckt dort Inhalt; mit negativem `bottom` erschien sie auf Seite 2 an falscher Stelle. Gewählt sind zwei feste Blätter (`.blatt`, Höhe 262 mm bei A4 mit 14 mm Rand). Ein Blatt von 266 mm erzeugte durch Rundung eine dritte Seite. Läuft ein Blatt über, schlägt die Prüfung (höchstens 2 Seiten) an.
- **Fallstrick:** Ein einfacher Suchtreffer auf `/AA` trifft auch `/AAAAAA+Atkinson…`. Der Leser zerlegt die Namen und vergleicht ganze Namen nach Auflösung der `#xx`-Maskierung.
- **Leck-Suche (`pruefePdf`, HF-001):**
  - Feste Pfadmuster werden als Teilzeichenkette gesucht: `file:`, `127.0.0.1`, `localhost`, `\users\`, `/users/`, `/home/`, `appdata`, `\temp\`, `/tmp/`. Dazu kommen `\ws-` und `/ws-` für die Temp-Ordner unserer Werkzeuge; mit Pfadtrenner, weil ein bloßes `ws-` auch in Schriftnamen und Strömen zufällig vorkommt.
  - Benutzer- und Rechnername der Umgebung (`os.userInfo`, `os.hostname`, ab 4 Zeichen) werden nur als ganzes Wort gesucht. Beim Benutzernamen gilt das auch mit `%20`, mit `#20` (PDF-Namen kodieren Leerzeichen so) und ohne Leerzeichen.
  - Nicht gesucht wird eine Schreibweise der Kennung, die einem Strukturnamen jeder Chrome-PDF gleicht (`root`, `info`, `page`, `font`, `fontname` …, z. B. Docker als root). Ebenso ausgenommen ist eine Schreibweise, die als ganzes Wort oder Wortfolge im erwarteten Titel oder Autor steht oder in einem erlaubten `https:`/`mailto:`-Verweis (z. B. Benutzer `Enrico Falk` → `enricofalk` in `https://enricofalk.de/`). Diese Ausnahmen gelten nur, wenn eine Erwartung übergeben wird (Build, `npm run check`, `paket:pruefen` tun das immer), nie anhand der eigenen Info-Werte der Datei. Sonst entstünde ein Fehlalarm; die Prüfung nennt die Kennung dann in `hinweise`, und `npm run check` gibt sie als „Hinweis:“ aus.
  - Tests übergeben feste Kennungen (`opt.kennungen`), damit sie auf jeder Plattform gleich laufen.
  - **Grenze:** Geprüft werden nur die Kennungen der Maschine, auf der geprüft wird. Ein unter Windows erzeugtes PDF mit dem Windows-Benutzernamen fällt bei einer Prüfung unter Linux nur über die Pfadmuster auf, nicht über den Namen selbst. Die PDF wird deshalb auf der Maschine erzeugt und geprüft, auf der `npm run profil` läuft.

## Vorgehen beim Neuschreiben
Vollständiges Neuschreiben (`src/build/pdf.mjs`, `setzeInfo`): nur das Info-Objekt wird ersetzt, alle anderen Objekte bleiben bytegleich, die xref-Tabelle wird neu berechnet. Ein inkrementelles Update ließe das alte Info-Objekt (mit Browser-Kennung) in der Datei. Der Leser ist streng: Weicht die Struktur ab (zweites `startxref`, `/Prev`, Objektstrom, `/Encrypt`, freie xref-Einträge), bricht `npm run profil` mit Hinweis auf die Chrome-Version ab.

## Restunsicherheit
- Eine andere Chrome-Hauptversion kann die Struktur ändern (Objektströme, `/ID`, Metadaten). Dann bricht die Erzeugung sichtbar ab; die Prüfung der eingecheckten Datei bleibt davon unberührt.
- Die Norm-Abschnitte stammen aus der Kenntnis, nicht aus einer erneuten Lektüre.
- Die Wiedergabe in anderen Betrachtern (Acrobat, Vorschau, Mobil) ist nicht geprüft; geprüft ist der Chrome-PDF-Viewer (Seitenbilder und Textauswahl in der Evidenz).

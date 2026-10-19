# Konzept — Freelancer-Seite enricofalk.de (V0)

> Stand 19.10.2026 · Pflege: Co-PO. Entwurf nach Antworten Enricos (19.10.). Annahmen tragen ein A-Kürzel und werden mit dem Go bestätigt oder korrigiert. Erstes Web-Projekt von Web-Studio, auch Probeprojekt für Vorgehen und Wiederverwendbarkeit.

## Absicht
- **Problem:** Enrico hat keine eigene Seite als Visitenkarte und Kontaktmöglichkeit. Anfragen kommen über Berufsnetzwerke; wer ihn dort findet oder empfohlen bekommt, kann nirgends ruhig prüfen, ob er passt.
- **Outcome:** Besucher erkennen in unter einer Minute (1) was Enrico anbietet, (2) welche Erfahrung dahintersteht, (3) wie sie ihn erreichen, und bekommen das Gefühl, dass er ihr Problem lösen kann.
- **Rolle der Seite:** Visitenkarte und Anfragekanal zugleich. Kein Verkaufstrichter, keine Erwartung an Menge (Probeprojekt).

## Nutzer
| Persona | Wer | Was sie suchen | Was sie bremst |
|---|---|---|---|
| **Entscheider:in** | Bereichs-/Programmleitung, HR/Transformation in DACH-Unternehmen, die jemanden für Agile Transformation/Coaching suchen | „Versteht er mein Problem? Wirkt er kompetent und ruhig? Wie läuft das mit ihm ab?“ | Buzzword-Wände, unklares Angebot, Unsicherheit, was nach dem Kontakt passiert |
| **Vermittler:in** | Recruiter/Sourcer/Agenturen mit offener Rolle | „Passt Profil zur Rolle (SAFe, SPC, Flight Levels, Scrum Master)? Wie erreiche ich ihn sofort?“ | Skills nur im Fließtext, keine schnelle Kontaktmöglichkeit, kein mitnehmbares Profil |

**Emotionale Journey (Leitlinie für Texte und Layout):** Erkannt werden (ihr Problem steht im Hero, nicht mein Lebenslauf) → Vertrauen (Erfahrung, Zertifikate, konkrete Arbeitsweise) → Sicherheit (so läuft ein Start mit mir ab) → Handeln (Kontakt in einem Klick, auf jeder Höhe der Seite erreichbar).

**Hauptszenarien**
1. Entscheider:in kommt über LinkedIn-/XING-Profil oder Empfehlung, prüft am Handy in unter 2 Minuten, ob Enrico passt, und schreibt eine Mail.
2. Vermittler:in gleicht eine Rolle mit dem Profil ab, nimmt sich das Profil als PDF mit und meldet sich.
3. Jemand, der Enrico schon kennt, prüft Details (Zertifikate, Arbeitsweise) vor einem Gespräch.
4. Besucher am Laptop liest vertieft (Angebote und Arbeitsweise), ohne dass die Seite lang oder überladen wirkt.

## Inhalt und Struktur (One-Pager mit Ankern + Impressum + Datenschutz)
1. **Hero:** Wer (Enrico Falk, Agile Coach & SAFe Program Consultant, DACH), welches Problem er löst (ein Satz in der Sprache der Zielgruppe), primärer Kontakt-Button.
2. **Wobei ich helfe:** 3–4 Karten als Probleme, nicht Produkte (z. B. Transformation im Enterprise ins Laufen bringen; Teams und Führung befähigen; Wirkung statt Aktivität messbar machen; Veränderung begleiten). Methoden (SAFe, Flight Levels, OKRs, ADKAR/Kotter) nur als Beleg unter den Problemen.
3. **Profil auf einen Blick:** ca. 15 Jahre Erfahrung, Zertifikate (CAL-ETO, FL2D, SPC) je mit einem Satz Erklärung und, wo möglich, Link zur Verifikation, Rollen (Agile Coach, SPC, Scrum Master), Region, **Zeile für Vermittler:innen** (verfügbar ab, Einsatzformat remote/vor Ort, Sprachen, Branchen; nur mit Enricos Angaben). Skimmbar.
   - **Wirkungsbeispiele:** 2–3 anonymisierte Beispiele (Kontext, Rolle, Ergebnis), sobald Enrico klärt, was NDA-sicher ist. Ersetzen die fehlenden Kundenstimmen. Dazu **Profil-PDF** (1 Seite) zum Mitnehmen.
4. **So arbeite ich:** 3–4 Schritte vom ersten Gespräch bis zur Wirkung, beruhigt den Moment nach dem Kontakt.
5. **Hintergrund:** kurze, persönliche Geschichte (A3: Weg von der Spieleentwicklung zum Agile Coaching), macht ihn greifbar.
6. **Kontakt:** E-Mail-Adresse sichtbar im Klartext mit Kopieren-Funktion **und** Mail-Link mit vorausgefülltem Betreff (z. B. „Anfrage Agile Coaching“), LinkedIn/XING-Links, ein Erwartungssatz zur Antwortzeit und zum ersten Gespräch (nur mit Enricos Werten, nie erfunden). Rückruf-Wunsch per Mail statt externer Terminlink.
7. **Footer:** Impressum, Datenschutz.
- **Bewusst nicht in V1:** Kundenstimmen/Kundenlogos (keine freigegebenen vorhanden, werden nie erfunden), Blog, externer Terminlink, Kontaktformular, Newsletter, Englisch.

## UX-Entscheidungen (Co-PO, reversibel; Batch-Prozess 7.)
- **A1 Sprache:** Deutsch; Englisch ist Ausbaustufe, die Struktur wird dafür vorbereitet. Weil Zielgruppe DACH.
- **A2 Kontaktweg:** E-Mail (mailto, eigene austauschbare Adresse nur für die Seite, leicht verschleiert, siehe VPS-Thread 19.10.) plus LinkedIn/XING statt Formular oder Terminbuchung. Weil ohne Konto, Kosten und Datenerfassung machbar; ein Formular braucht Backend/Spamschutz auf dem VPS (Option für Ausbau, Abstimmung mit PO VPS-Administration).
- **A3 Persönliche Geschichte:** Spieleentwicklung als Hintergrund wird genannt, wenn Enrico zustimmt (Einblick in sein Berufsleben, öffentlich).
- **A4 Marke:** Personenmarke „Enrico Falk“ auf enricofalk.de; „Impact Schmiede“ erscheint als Name der Selbstständigkeit im Impressum/Footer (A4, bitte bestätigen).
- **A5 Tracking:** keines, keine Cookies, keine externen Schriften/Skripte (Schriften selbst gehostet). Folge: kein Cookie-Banner, einfache Datenschutzerklärung.
- **A6 Mobil zuerst:** Entwurf und Prüfung zuerst am Handy; Kontakt-Button bleibt erreichbar.
- **A7 Stil:** ruhig, professionell, warm; Typografie und Weißraum vor Effekten; Ein echtes Foto von Enrico wird dringend empfohlen (Vertrauen); ohne Foto trägt die Gestaltung allein (A7).
- **A8 Texte:** Co-PO entwirft aus bekannten Fakten; nichts wird erfunden. Enrico gibt Texte frei (Sichtprüfung) vor dem Livegang.

## Erfolgsmessung (3 Monate, Co-PO-Wahl)
Da Tracking ausgeschlossen ist (A5), nur ohne personenbezogene Daten:
- **Qualität:** Lighthouse mobil ≥ 90 in Performance, Zugänglichkeit, Best Practices, SEO; Barrierefreiheit nach WCAG 2.1 AA geprüft.
- **Nutzung:** aggregierte Zugriffszahlen aus dem Server-Log (ohne IP-Speicherung), falls der PO VPS-Administration das bereitstellen kann (offen).
- **Wirkung:** Enrico fragt in Erstgesprächen „Woher kennen Sie mich / haben Sie die Seite gesehen?“ und notiert die Zahl; Messwert = Anzahl Anfragen mit Seitenbezug in 3 Monaten (kein Zielwert, Probeprojekt).

## Nicht-funktional
- Statische Seite (Klasse S im VPS-Konzept) ist das Ziel; Stack-Wahl im ersten Batch durch Code mit Begründung (Kriterien: wenig Pflege, schnell, wiederverwendbar für weitere Web-Projekte, ohne laufenden Dienst).
- **Ziel-Hosting (Stand 19.10. 15:59): VPS Klasse S, Webhosting nur Plan B** (Webspace teilt sich mit der WordPress-Seite impact-schmiede.de). Header/HTTPS setzt der PO VPS-Administration über Caddy, kein `.htaccess`.
- **Lieferform für den VPS (Antwort PO VPS-Administration 19.10.):** ein Ordner je Projekt, Ausgabe `dist/` mit `index.html` und `404.html`, nur normale Dateien (keine Symlinks, keine versteckten Dateien), alles selbst gehostet, keine Anfragen an Dritte, Paket unter 20 MB und 500 Dateien; Auslieferung als `.tar` mit SHA256 im Austausch, Server holt nichts aus GitHub. Vorschau-Adresse voraussichtlich `vorschau.enricofalk.de` (noindex, anfangs mit Zugangsschutz); Zugriffszahlen aus Caddy-Log ohne IP/User-Agent, 7 Tage Aufbewahrung (Zusage nach Test in der Übungs-VM).
- Mobil und Desktop; Lighthouse/WCAG siehe oben; keine Drittanbieter-Anfragen beim Laden.
- Rechtliches: Impressum nach § 5 DDG, Datenschutzerklärung nach DSGVO. Enrico liefert die Angaben; Texte sollten vor Livegang kurz geprüft werden (Generator oder Fachperson). Co-PO ist keine Rechtsberatung.

## Ergebnis der Gegenprüfung (19.10., unabhängiger Reviewer)
| Einwand | Entscheidung Co-PO |
|---|---|
| Vertrauen ohne Belege (Foto, Zertifikate unbekannt, Vermittler wollen Verfügbarkeit) | Übernommen: Zertifikate erklärt, Vermittler-Zeile, anonymisierte Wirkungsbeispiele, Foto empfohlen. Angaben kommen von Enrico. |
| Kontakt nur per Mail ist reibungsreich | Übernommen: Adresse im Klartext + Kopieren, Betreff vorausgefüllt, Erwartungssatz. Terminlink bleibt draußen (Datenschutz/Konto). |
| Rechts-/Datenschutzlücken spät entdeckt | Übernommen: Checkliste (Anschrift, USt-ID, Foto-Rechte, Kundennennung, Server-Logs des Hosters in der Datenschutzerklärung mit PO VPS-Administration) schon in B-001 als Eingangsfragen; PDF ohne Metadaten und deckungsgleich mit der Seite. |
| VPS/DNS-Engpass erst spät sichtbar | Anfrage ist raus. Vor jeder DNS-Änderung Ist-Zustand sichern (alle Records inkl. MX/SPF/DKIM), nur A/AAAA ändern, nach Livegang Testmail von extern, danach monatlich; Ausfall-Verantwortlicher wird benannt (B-003). |
| Messung zu weich, Mockups vor Inhalt | Teilweise übernommen: Mockups entstehen mit Entwurfstexten des Co-PO statt Platzhaltern; Material von Enrico läuft parallel. Messgrößen: Anfragen mit Seitenbezug (feste Frage im Erstgespräch), Startseiten-Aufrufe und PDF-Downloads aus Logs, Erwähnungen in Profilen. Seite in LinkedIn/XING/Signatur eintragen und SEO-Grundlagen (Titel, Beschreibung) gehören zu B-002/B-003. Kein Zielwert (Probeprojekt); Entscheidung zu B-004 nach drei Monaten. |

## Abhängigkeiten und Risiken
- **VPS:** Testumgebung/Vorschau-Adresse, Auslieferungsweg, Domain-Anbindung. Anfrage `_Austausch\VPS-Administration\Anfragen\Web-Studio_freelancer-seite.md`. Der Auslieferungsweg ist laut Rahmen noch nicht gebaut: Entwicklung und Vorschau laufen vorerst lokal.
- **Domain/DNS (enricofalk.de bei IONOS):** Umstellung nur durch Enrico bzw. nach Absprache mit PO VPS-Administration. **Risiko E-Mail:** Hängt Enricos Postfach an dieser Domain, dürfen nur A/AAAA-Einträge geändert werden, nie die Nameserver/MX, sonst fällt Mail aus.
- **Rechtstexte:** Fehlerhaftes Impressum ist abmahnbar → Pflichtangaben vollständig, Prüfung vor Livegang.
- **Inhalte:** Ohne Enricos Freigabe der Texte, des Fotos und der Kontaktdaten kein Livegang.

## Offene Angaben von Enrico (für Impressum/Inhalt)
Name der Selbstständigkeit, ladungsfähige Anschrift, öffentliche E-Mail, Telefon (optional), USt-IdNr. oder Hinweis Kleinunternehmer, LinkedIn-/XING-URLs, Foto ja/nein, Zustimmung zu A3/A4.

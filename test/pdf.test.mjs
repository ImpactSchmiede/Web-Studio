// T-003: PDF-Modul (src/build/pdf.mjs): strenger Leser, Metadaten neu schreiben, Pruefung. Synthetische Mini-PDFs und ein echtes
// Chrome-PDF (test/fixtures/chrome-roh.pdf, einmal mit Chrome 155 erzeugt, siehe docs/referenzen/pdf-chrome.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Name, lesePdf, pdfDatum, pruefePdf, setzeInfo, aufloesen, textString } from '../src/build/pdf.mjs';
import { baueMini, basisPdf, hexText, mini, strom } from './_pdfmini.mjs';
import { ROOT } from './_hilfe.mjs';
import { ohneLeer, pdfText } from './_pdftext.mjs';

const roh = fs.readFileSync(path.join(ROOT, 'test/fixtures/chrome-roh.pdf'));
const befunde = (buf, opt) => pruefePdf(buf, opt).fehler;

test('Basis-Mini-PDF ist fehlerfrei (auch /AAAAAA+Font ist kein Fehlalarm fuer /AA)', () => {
  assert.deepEqual(befunde(basisPdf()), []);
  assert.match(basisPdf().toString('latin1'), /\/AAAAAA\+Atkinson/);
});

test('lesePdf: Chrome-PDF wird streng gelesen (xref, Offsets, Info, Seiten), Namen mit #xx werden dekodiert', () => {
  const pdf = lesePdf(roh);
  assert.deepEqual([...pdf.trailer.keys()].sort(), ['Info', 'Root', 'Size']);
  const info = aufloesen(pdf, pdf.trailer.get('Info'));
  assert.ok(info.get('Creator') && info.get('Producer'));
  assert.equal(textString(info.get('Title')), 'Prüfung – Äöü');
  const m = lesePdf(mini((o) => { o[1] = '<</Type /Pages /Count 1 /Kids [3 0 R] /J#61vaScript true>>'; }));
  assert.ok(aufloesen(m, m.objekte.get(2).wert).has('JavaScript'));
});

test('lesePdf: lehnt abweichende Struktur ab (kein startxref, falscher Offset, Praefix, doppeltes startxref)', () => {
  const gut = basisPdf();
  assert.throws(() => lesePdf(Buffer.from('kein pdf')), /PDF/i);
  assert.throws(() => lesePdf(gut.subarray(0, gut.length - 20)), /startxref/);
  const zeilen = gut.toString('latin1').split('\n');
  const i = zeilen.findIndex((z) => z.startsWith('0000000000 65535 f'));
  [zeilen[i + 1], zeilen[i + 2]] = [zeilen[i + 2], zeilen[i + 1]]; // zwei Offsets vertauscht
  assert.throws(() => lesePdf(Buffer.from(zeilen.join('\n'), 'latin1')), /Offset.*zeigt nicht auf/);
  assert.throws(() => lesePdf(Buffer.concat([gut, Buffer.from('startxref\n0\n%%EOF\n')])), /startxref/);
  assert.throws(() => lesePdf(Buffer.concat([Buffer.from('x'), gut])), /PDF-Kopf/);
  assert.throws(() => lesePdf(Buffer.concat([gut, Buffer.from('Muell')])), /startxref|%%EOF/);
});

// ---- Pruefung: je Zweig ein Negativtest (Plan Abschnitt 3, AK 3, R-M3, m1, m3, m4)
const faelle = [
  ['Creator im Info-Dict', (o) => { o[9] = o[9].replace('>>', ' /Creator (HeadlessChrome/155)>>'); }, /Info.*Creator|Creator/],
  ['Producer im Info-Dict', (o) => { o[9] = o[9].replace('>>', ' /Producer (Skia/PDF m155)>>'); }, /Producer/],
  ['/Metadata im Katalog', (o) => { o[0] = o[0].replace('>>', ' /Metadata 8 0 R>>'); }, /Metadata/],
  ['/JavaScript', (o) => { o[10] = o[10].replace('/A <<', '/A <</JavaScript (x) '); }, /JavaScript/],
  ['/J#61vaScript (maskierter Name)', (o) => { o[10] = o[10].replace('/A <<', '/A <</J#61vaScript (x) '); }, /JavaScript/],
  ['/JS', (o) => { o[10] = o[10].replace('/A <<', '/A <</JS (x) '); }, /\bJS\b/],
  ['/Launch', (o) => { o[10] = o[10].replace('/S /URI', '/S /Launch'); }, /Launch/],
  ['/EmbeddedFile', (o) => { o.push('<</Type /EmbeddedFile /Length 0>>'); }, /EmbeddedFile/],
  ['/OpenAction', (o) => { o[0] = o[0].replace('>>', ' /OpenAction 3 0 R>>'); }, /OpenAction/],
  ['/AA', (o) => { o[2] = o[2].replace('/Parent', '/AA <<>> /Parent'); }, /\bAA\b/],
  ['/AcroForm', (o) => { o[0] = o[0].replace('>>', ' /AcroForm <<>>>>'); }, /AcroForm/],
  ['/XFA', (o) => { o.push('<</XFA []>>'); }, /XFA/],
  ['/GoToR', (o) => { o[10] = o[10].replace('/S /URI', '/S /GoToR'); }, /GoToR|Aktion/],
  ['Aktion ausserhalb {URI, GoTo}', (o) => { o[10] = o[10].replace('/S /URI', '/S /Named'); }, /Aktion/],
  ['Annotation ausserhalb {Link}', (o) => { o[10] = o[10].replace('/Subtype /Link', '/Subtype /FileAttachment'); }, /Annotation/],
  ['URI file:', (o) => { o[10] = o[10].replace('https://enricofalk.de/', 'file:///C:/x/y.pdf'); }, /URI/],
  ['URI http:', (o) => { o[10] = o[10].replace('https://enricofalk.de/', 'http://enricofalk.de/'); }, /URI/],
  ['URI javascript:', (o) => { o[10] = o[10].replace('https://enricofalk.de/', 'javascript:alert(1)'); }, /URI/],
  ['Schrift ohne FontFile2', (o) => { o[5] = '<</Type /FontDescriptor /FontName /AAAAAA+AtkinsonHyperlegible-Regular /Flags 4>>'; }, /eingebettet|FontFile/],
  ['Type0 ohne ToUnicode', (o) => { o[3] = o[3].replace(' /ToUnicode 7 0 R', ''); }, /ToUnicode/],
  ['Type3 ohne CharProcs', (o) => { o[3] = '<</Type /Font /Subtype /Type3 /FontDescriptor 6 0 R /ToUnicode 7 0 R>>'; }, /CharProcs|eingebettet/],
  ['Standardschrift /Helvetica', (o) => { o[3] = '<</Type /Font /Subtype /Type1 /BaseFont /Helvetica /ToUnicode 7 0 R>>'; }, /Helvetica|eingebettet|Schrift/],
  ['Fremdschrift /ABCDEF+Arial (eingebettet, aber nicht erlaubt)', (o) => { o[3] = o[3].replace('AAAAAA+AtkinsonHyperlegible-Regular', 'ABCDEF+Arial'); o[4] = o[4].replace('AAAAAA+AtkinsonHyperlegible-Regular', 'ABCDEF+Arial'); }, /Arial|Schrift/],
  ['Fremdschrift ohne Praefix /Helvetica-Bold (Type0)', (o) => { o[3] = o[3].replace('AAAAAA+AtkinsonHyperlegible-Regular', 'Helvetica-Bold'); }, /Helvetica/],
  ['3 Seiten', (o) => { o[1] = '<</Type /Pages /Count 3 /Kids [3 0 R 3 0 R 3 0 R]>>'; }, /Seiten/],
  ['0 Seiten', (o) => { o[1] = '<</Type /Pages /Count 0 /Kids []>>'; }, /Seiten/],
  ['Seitenformat nicht A4', (o) => { o[2] = o[2].replace('[0 0 595.96 841.92]', '[0 0 612 792]'); }, /A4|MediaBox/],
  ['Bild (/Subtype /Image)', (o) => { o.push(strom('/Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceGray /BitsPerComponent 8', 'x')); }, /Bild|Image/],
  ['Strom mit unbekanntem Filter', (o) => { o.push(strom('/Filter /LZWDecode', 'abc')); }, /Filter/],
  ['Pfad C:\\Users\\ im Inhaltsstrom (komprimiert)', (o) => { o[7] = strom('', 'BT (C:\\Users\\jemand\\x) Tj ET', { flate: true }); }, /Pfad|Users/],
  ['Pfad /home/ im Inhaltsstrom', (o) => { o[7] = strom('', 'BT (/home/jemand) Tj ET', { flate: true }); }, /home/],
  ['file: im Inhaltsstrom unkomprimiert', (o) => { o[7] = strom('', 'BT (file:///x) Tj ET'); }, /file:/],
  ['127.0.0.1 im Wert eines Dictionaries', (o) => { o[9] = o[9].replace('(Enrico Falk)', '(127.0.0.1)'); }, /127\.0\.0\.1/],
  ['localhost im Hex-Textstring (UTF-16BE)', (o) => { o[9] = o[9].replace(/\/Title <[^>]*>/, `/Title ${hexText('http://localhost:8412/')}`); }, /localhost/],
  ['Temp-Ordner ws-profil-', (o) => { o[7] = strom('', 'BT (\\ws-profil-abc) Tj ET', { flate: true }); }, /ws-/],
];
for (const [name, aendere, erwartet] of faelle) {
  test(`pruefePdf rot bei: ${name}`, () => {
    const f = befunde(mini(aendere));
    assert.ok(f.length > 0, 'kein Befund');
    assert.ok(f.some((x) => erwartet.test(x)), `Befunde: ${f.join(' | ')}`);
  });
}

test('pruefePdf rot bei /Prev im Trailer (inkrementelles Update), /Encrypt und /ObjStm', () => {
  assert.ok(befunde(mini(() => '/Root 1 0 R /Info 10 0 R /Prev 5')).some((x) => /Prev|Trailer/.test(x)));
  assert.ok(befunde(mini(() => '/Root 1 0 R /Info 10 0 R /Encrypt 3 0 R')).some((x) => /Encrypt|Trailer/.test(x)));
  assert.ok(befunde(mini((o) => { o.push('<</Type /ObjStm /N 0 /First 0 /Length 0>>'); })).some((x) => /ObjStm/.test(x)));
});

test('pruefePdf: ID im Trailer ist erlaubt, fremde Trailer-Schluessel nicht', () => {
  assert.deepEqual(befunde(mini(() => '/Root 1 0 R /Info 10 0 R /ID [<00> <00>]')), []);
  assert.ok(befunde(mini(() => '/Root 1 0 R /Info 10 0 R /Foo 1')).some((x) => /Trailer/.test(x)));
});

test('pruefePdf: Groessengrenze (maxBytes) und Seitengrenze (maxSeiten) sind einstellbar, genau an der Grenze gruen', () => {
  const b = basisPdf();
  assert.deepEqual(befunde(b, { maxBytes: b.length }), []);
  assert.ok(befunde(b, { maxBytes: b.length - 1 }).some((x) => /Gr(ö|oe)(ß|ss)e|Byte/.test(x)));
  assert.ok(befunde(b, { maxSeiten: 0 }).some((x) => /Seiten/.test(x)));
});

test('pruefePdf liefert Kennzahlen: Seiten, Schriften, URIs, Info', () => {
  const r = pruefePdf(basisPdf());
  assert.equal(r.seiten, 1);
  assert.deepEqual(r.uris, ['https://enricofalk.de/']);
  assert.deepEqual(r.info, { Title: 'Enrico Falk – Profil', Author: 'Enrico Falk', CreationDate: 'D:20261019000000Z', ModDate: 'D:20261019000000Z' });
  assert.equal(r.schriften.length, 1);
  assert.match(r.schriften[0].name, /AtkinsonHyperlegible/);
});

test('pruefePdf: erwartete Info-Werte (Title/Author) werden exakt geprueft', () => {
  const b = basisPdf();
  assert.deepEqual(befunde(b, { erwartung: { Title: 'Enrico Falk – Profil', Author: 'Enrico Falk' } }), []);
  assert.ok(befunde(b, { erwartung: { Title: 'Enrico Falk', Author: 'Enrico Falk' } }).some((x) => /Title/.test(x)));
  assert.ok(befunde(b, { erwartung: { Title: 'Enrico Falk – Profil', Author: 'Jemand' } }).some((x) => /Author/.test(x)));
});

test('pruefePdf auf dem rohen Chrome-PDF: nur Info (Creator, Producer) und Schrift-Befunde, Struktur ist lesbar', () => {
  const f = befunde(roh);
  assert.ok(f.some((x) => /Creator/.test(x)) && f.some((x) => /Producer/.test(x)), f.join(' | '));
  assert.ok(!f.some((x) => /Struktur|ToUnicode|eingebettet|Schrift/.test(x)), f.join(' | '));
});

// ---- setzeInfo
const STAND = '2026-10-19';
const neuInfo = { Title: 'Enrico Falk – Profil', Author: 'Enrico Falk', stand: STAND };

test('pdfDatum: Stand-Datum als PDF-Datum in UTC, ungueltiges Datum wirft', () => {
  assert.equal(pdfDatum('2026-10-19'), 'D:20261019000000Z');
  assert.throws(() => pdfDatum('2026-02-30'), /Datum/);
  assert.throws(() => pdfDatum('19.10.2026'), /Datum/);
});

test('setzeInfo auf echtem Chrome-PDF: nur Title, Author, CreationDate, ModDate; alte Werte nirgends mehr; xref stimmt', () => {
  const neu = setzeInfo(roh, neuInfo);
  const t = neu.toString('latin1');
  for (const alt of ['HeadlessChrome', 'Skia', 'Mozilla', 'Windows NT', 'Creator', 'Producer']) assert.ok(!t.includes(alt), `${alt} steht noch in der Datei`);
  const pdf = lesePdf(neu); // streng: Offsets zeigen auf "n 0 obj", xref-Eintraege 20 Byte, genau ein startxref
  const info = aufloesen(pdf, pdf.trailer.get('Info'));
  assert.deepEqual([...info.keys()].sort(), ['Author', 'CreationDate', 'ModDate', 'Title']);
  assert.equal(textString(info.get('Title')), 'Enrico Falk – Profil');
  assert.equal(textString(info.get('Author')), 'Enrico Falk');
  assert.equal(textString(info.get('CreationDate')), 'D:20261019000000Z');
  assert.equal(textString(info.get('ModDate')), 'D:20261019000000Z');
  assert.deepEqual([...pdf.trailer.keys()].sort(), ['Info', 'Root', 'Size']);
  assert.equal(pdf.objekte.size, lesePdf(roh).objekte.size);
});

test('setzeInfo: Text mit Umlauten und Gedankenstrich steht als UTF-16BE (FEFF) im Info-Objekt', () => {
  const neu = setzeInfo(roh, { Title: 'Prüfung – Äöü', Author: 'Zoë', stand: STAND });
  const t = neu.toString('latin1');
  assert.ok(t.includes(`/Title ${hexText('Prüfung – Äöü')}`), 'Titel nicht als UTF-16BE');
  assert.ok(t.includes(`/Author ${hexText('Zoë')}`));
  assert.equal(textString(aufloesen(lesePdf(neu), lesePdf(neu).trailer.get('Info')).get('Title')), 'Prüfung – Äöü');
});

test('setzeInfo: ASCII-Text steht als Klartext-Zeichenkette, Klammern und Backslash werden maskiert', () => {
  const neu = setzeInfo(roh, { Title: 'a (b) \\ c', Author: 'x', stand: STAND });
  assert.ok(neu.toString('latin1').includes('/Title (a \\(b\\) \\\\ c)'));
  assert.equal(textString(aufloesen(lesePdf(neu), lesePdf(neu).trailer.get('Info')).get('Title')), 'a (b) \\ c');
});

test('setzeInfo: Inhalt (alle anderen Objekte) bleibt bytegleich, Ergebnis ist deterministisch und idempotent', () => {
  const neu = setzeInfo(roh, neuInfo);
  assert.ok(neu.equals(setzeInfo(roh, neuInfo)));
  assert.ok(setzeInfo(neu, neuInfo).equals(neu), 'zweimal setzen ergibt dieselben Bytes');
  const a = lesePdf(roh);
  const b = lesePdf(neu);
  const infoNr = a.trailer.get('Info').nr;
  for (const [nr, o] of a.objekte) {
    if (nr === infoNr) continue;
    const g = b.objekte.get(nr);
    assert.ok(g, `Objekt ${nr} fehlt`);
    assert.deepEqual(g.strom === null, o.strom === null);
    if (o.strom) assert.ok(g.strom.equals(o.strom), `Strom ${nr} veraendert`);
  }
});

test('setzeInfo: vorhandene /ID im Trailer bleibt unveraendert', () => {
  const mitId = baueMini(
    (() => { const o = ['<</Type /Catalog /Pages 2 0 R>>', '<</Type /Pages /Count 0 /Kids []>>', '<</Creator (x)>>']; return o; })(),
    '/Root 1 0 R /Info 3 0 R /ID [<AABBCC> <DDEEFF>]',
  );
  const neu = setzeInfo(mitId, neuInfo);
  assert.match(neu.toString('latin1'), /\/ID \[<AABBCC> <DDEEFF>\]/i);
});

test('setzeInfo: lehnt abweichende Struktur sichtbar ab (/Prev, /Encrypt, /XRef-Strom, ohne /Info, Metadaten)', () => {
  assert.throws(() => setzeInfo(mini(() => '/Root 1 0 R /Info 10 0 R /Prev 5'), neuInfo), /Struktur|Trailer|Prev/);
  assert.throws(() => setzeInfo(mini(() => '/Root 1 0 R /Info 10 0 R /Encrypt 3 0 R'), neuInfo), /Struktur|Trailer|Encrypt/);
  assert.throws(() => setzeInfo(mini(() => '/Root 1 0 R'), neuInfo), /Info/);
  assert.throws(() => setzeInfo(mini((o) => { o[0] = o[0].replace('>>', ' /Metadata 8 0 R>>'); }), neuInfo), /Metadata/);
  assert.throws(() => setzeInfo(Buffer.from('%PDF-1.7\nkein xref'), neuInfo), /PDF|xref/i);
});

test('setzeInfo: Ergebnis besteht pruefePdf (Chrome-PDF mit Atkinson und Bricolage/Type3, Struktur, Links)', () => {
  const f = befunde(setzeInfo(roh, neuInfo), { erwartung: { Title: 'Enrico Falk – Profil', Author: 'Enrico Falk' } });
  assert.deepEqual(f, []);
});

test('pdfText (Testhilfe) liest die Fixture: Umlaute, Ligaturen, Type3 (1 Byte) und Type0 (2 Byte)', () => {
  const t = ohneLeer(pdfText(roh));
  assert.ok(t.includes('ÜberschriftÄöü'), t);
  assert.ok(t.includes('Größe'), t);
  assert.ok(t.includes('Textfettund') || t.includes('Text'), t);
});

test('Name-Klasse: Namen werden ohne Schraegstrich und dekodiert gefuehrt', () => {
  assert.equal(new Name('Type').name, 'Type');
});

// ---- Nacharbeit T-003 (Diff-Check): Aktionen und Annotationen ueber Position statt /Type, indirekte URIs, Schriftnamen, Inline-Bilder
const naechste = (o, rest) => { o[10] = o[10].replace('/URI (https://enricofalk.de/)>>', `/URI (https://enricofalk.de/) ${rest}>>`); };
const nacharbeit = [
  ['M1 Link mit /Next /S /Named (ohne /Type)', (o) => naechste(o, '/Next <</S /Named /N /Print>>'), /Aktion/],
  ['M1 /Next als Liste, rekursiv verschachtelt', (o) => naechste(o, '/Next [<</S /URI /URI (https://x.de/) /Next <</S /Print>>>>]'), /Aktion/],
  ['M1 Annotation ohne /Type mit /Subtype /Screen', (o) => { o[10] = o[10].replace('/Type /Annot /Subtype /Link', '/Subtype /Screen'); }, /Annotation/],
  ['M1 Annotation nur ueber /Annots, ohne /Type und ohne /Subtype', (o) => { o[10] = '<</Rect [0 0 1 1]>>'; }, /Annotation/],
  ['M1 Annotation /Subtype /Widget ohne /Type', (o) => { o[10] = '<</Rect [0 0 1 1] /Subtype /Widget>>'; }, /Annotation/],
  ['M1 Aktion in /A ohne /Type mit /S /Rendition', (o) => { o[10] = o[10].replace('/Type /Action /S /URI', '/S /Rendition'); }, /Aktion/],
  ['M1 Dictionary mit /S ohne /Type (freie Aktion)', (o) => { o.push('<</S /Named /N /Print>>'); }, /Aktion/],
  ['m1 indirekter /URI zeigt auf http:', (o) => { o[10] = o[10].replace('/URI (https://enricofalk.de/)', '/URI 12 0 R'); o.push('(http://evil.example/)'); }, /URI/],
  ['m1 indirekter /URI ist kein String', (o) => { o[10] = o[10].replace('/URI (https://enricofalk.de/)', '/URI 12 0 R'); o.push('42'); }, /URI/],
  ['m1 /URI direkt ohne String (Zahl)', (o) => { o[10] = o[10].replace('/URI (https://enricofalk.de/)', '/URI 7'); }, /URI/],
  ['m2 Type0 ohne BaseFont, Nachkomme Arial', (o) => {
    o[3] = o[3].replace('/BaseFont /AAAAAA+AtkinsonHyperlegible-Regular ', '');
    o[4] = o[4].replace(/AtkinsonHyperlegible/g, 'Arial'); o[5] = o[5].replace(/AtkinsonHyperlegible/g, 'Arial');
  }, /Arial/],
  ['m2 Type0 ok, aber Nachkomme-BaseFont Arial', (o) => { o[4] = o[4].replace('AAAAAA+AtkinsonHyperlegible-Regular', 'ABCDEF+Arial'); }, /Arial/],
  ['m2 Type0 ok, aber FontDescriptor-FontName Arial', (o) => { o[5] = o[5].replace('AAAAAA+AtkinsonHyperlegible-Regular', 'ABCDEF+Arial'); }, /Arial/],
  ['m2 Schrift ohne jeden Namen', (o) => {
    o[3] = o[3].replace('/BaseFont /AAAAAA+AtkinsonHyperlegible-Regular ', '');
    o[4] = o[4].replace('/BaseFont /AAAAAA+AtkinsonHyperlegible-Regular ', '');
    o[5] = o[5].replace('/FontName /AAAAAA+AtkinsonHyperlegible-Regular ', '');
  }, /ohne Name/],
  ['m3 Inline-Bild (BI ... ID ... EI) im Inhaltsstrom', (o) => { o[7] = strom('', 'q 10 0 0 10 0 0 cm BI /W 1 /H 1 /CS /G /BPC 8 ID \xff EI Q BT /F1 12 Tf <0001> Tj ET', { flate: true }); }, /Inline|Bild/],
];
for (const [name, aendere, erwartet] of nacharbeit) {
  test(`pruefePdf rot bei: ${name}`, () => {
    const f = befunde(mini(aendere));
    assert.ok(f.some((x) => erwartet.test(x)), `Befunde: ${JSON.stringify(f)}`);
  });
}

test('pruefePdf: indirekter /URI auf einen https-String ist gueltig und wird in uris gefuehrt; "BI" im Text eines Strings ist kein Inline-Bild', () => {
  const r = pruefePdf(mini((o) => {
    o[10] = o[10].replace('/URI (https://enricofalk.de/)', '/URI 12 0 R'); o.push('(https://enricofalk.de/)');
    o[7] = strom('', 'BT /F1 12 Tf (BI ID EI) Tj <0001> Tj ET', { flate: true });
  }));
  assert.deepEqual(r.fehler, []);
  assert.deepEqual(r.uris, ['https://enricofalk.de/']);
});

test('pruefePdf auf dem eingecheckten Profil-PDF bleibt ohne Befund (Aktionen, Annotationen, Schriften nach den neuen Regeln)', () => {
  const pdf = fs.readFileSync(path.join(ROOT, 'src/profil/profil-enrico-falk.pdf'));
  assert.deepEqual(befunde(pdf, { kennungen: { benutzer: 'jemand', rechner: 'build-runner-01' } }), []);
});

// ---- HF-001: Leck-Pruefung unabhaengig von Benutzer- und Rechnername der Umgebung (feste Testwerte, Windows wie Linux)
// Nachstellung Linux: Benutzername ohne Leerzeichen und kurzer Rechnername der Umgebung (os.userInfo/os.hostname gemockt).
const KENNUNGEN = [
  { benutzer: 'AI User', rechner: 'Server-PC' },
  { benutzer: 'jemand', rechner: 'build-runner-01' },
];
const leckFaelle = (k) => [
  ['Benutzername im Klartext', (o) => { o[7] = strom('', `BT (C:/x/${k.benutzer}/y) Tj ET`, { flate: true }); }, /Benutzername/],
  ['Benutzername in Name mit #20', (o) => { o[3] = o[3].replace('/Type0', `/Type0 /X /${k.benutzer.replace(/ /g, '#20')}`); }, /Benutzername/],
  ['Benutzername mit %20', (o) => { o[9] = o[9].replace('(Enrico Falk)', `(file-x/Users/${k.benutzer.replace(/ /g, '%20')}/y)`.replace('/Users', '')); }, /Benutzername/],
  ['Rechnername im Inhaltsstrom', (o) => { o[7] = strom('', `BT (${k.rechner}) Tj ET`, { flate: true }); }, /Rechnername/],
];
for (const k of KENNUNGEN) {
  for (const [name, aendere, erwartet] of leckFaelle(k)) {
    test(`HF-001 pruefePdf rot bei: ${name} (Testkennung "${k.benutzer}" / "${k.rechner}", Umgebung gemockt als Linux-Nutzer)`, (t) => {
      t.mock.method(os, 'userInfo', () => ({ username: 'ci', uid: 1000, gid: 1000, shell: '/bin/sh', homedir: '/home/ci' }));
      t.mock.method(os, 'hostname', () => 'ci');
      const f = befunde(mini(aendere), { kennungen: k });
      assert.ok(f.some((x) => erwartet.test(x)), `Befunde: ${JSON.stringify(f)}`);
      assert.ok(!f.some((x) => x.toLowerCase().includes(k.benutzer.toLowerCase())), 'Meldung nennt den Namen nicht im Klartext');
    });
  }
  test(`HF-001 pruefePdf gruen ohne Leck (Testkennung "${k.benutzer}")`, () => {
    assert.deepEqual(befunde(basisPdf(), { kennungen: k }), []);
  });
}

test('HF-001 ohne Option kennungen gelten weiter Benutzer- und Rechnername der Umgebung (Pruefung bleibt im Echtbetrieb scharf)', (t) => {
  t.mock.method(os, 'userInfo', () => ({ username: 'Max Muster', uid: 1, gid: 1, shell: '', homedir: '' }));
  t.mock.method(os, 'hostname', () => 'rechner-abc');
  assert.ok(befunde(mini((o) => { o[3] = o[3].replace('/Type0', '/Type0 /X /Max#20Muster'); })).some((x) => /Benutzername/.test(x)));
  assert.ok(befunde(mini((o) => { o[7] = strom('', 'BT (rechner-abc) Tj ET', { flate: true }); })).some((x) => /Rechnername/.test(x)));
});

test('HF-001 zu kurze Kennungen (unter 4 Zeichen) erzeugen keine Fehlalarme', () => {
  assert.deepEqual(befunde(basisPdf(), { kennungen: { benutzer: 'ci', rechner: 'pc' } }), []);
});

// QA B1/B2 zu HF-001: typische Build-Umgebungen (Docker als root, Benutzer gleich einem Wort des Titels) ohne Fehlalarm
for (const k of [
  { benutzer: 'root', rechner: 'localhost' },
  { benutzer: 'info', rechner: 'font' },
  { benutzer: 'enrico', rechner: 'page' },
]) {
  test(`HF-001 kein Fehlalarm bei Strukturwort oder Titelwort als Kennung ("${k.benutzer}" / "${k.rechner}"), mit Hinweis`, () => {
    const r = pruefePdf(basisPdf(), { kennungen: k, erwartung: { Title: 'Enrico Falk – Profil', Author: 'Enrico Falk' } });
    assert.deepEqual(r.fehler.filter((f) => /Kennung|Benutzername|Rechnername/.test(f)), []);
    if (k.rechner !== 'localhost') assert.ok(r.hinweise.length >= 1, 'nicht gesuchte Kennung wird als Hinweis genannt');
  });
}

test('HF-001 Rechnername "localhost": das feste Muster bleibt wirksam und heisst weiter localhost', () => {
  const f = befunde(mini((o) => { o[9] = o[9].replace(/\/Title <[^>]*>/, `/Title ${hexText('http://localhost:8412/')}`); }), { kennungen: { benutzer: 'jemand', rechner: 'localhost' } });
  assert.ok(f.some((x) => /localhost/.test(x)), JSON.stringify(f));
});

test('HF-001 Kennung nur als ganzes Wort: "jemand" schlaegt in "jemandem" nicht an, in "/jemand/" schon', () => {
  const k = { benutzer: 'jemand', rechner: 'build-runner-01' };
  assert.deepEqual(befunde(mini((o) => { o[7] = strom('', 'BT (jemandem) Tj ET', { flate: true }); }), { kennungen: k }), []);
  assert.ok(befunde(mini((o) => { o[7] = strom('', 'BT (x/jemand/y) Tj ET', { flate: true }); }), { kennungen: k }).some((x) => /Benutzername/.test(x)));
});

// Diff-Check HF-001: Benutzername aus mehreren Woertern des Titels, Varianten als Strukturname, Hinweise
test('HF-001 Benutzer "Enrico Falk" (Wortfolge aus Titel/Autor): kein Fehlalarm, Hinweis', () => {
  const pdf = fs.readFileSync(path.join(ROOT, 'src/profil/profil-enrico-falk.pdf'));
  const erwartung = { Title: 'Enrico Falk – Profil', Author: 'Enrico Falk' };
  const r = pruefePdf(pdf, { erwartung, kennungen: { benutzer: 'Enrico Falk', rechner: 'build-runner-01' } });
  assert.deepEqual(r.fehler, []);
  assert.ok(r.hinweise.some((h) => /Benutzername/.test(h)));
  for (const benutzer of ['enrico', 'falk', 'profil']) {
    assert.deepEqual(befunde(pdf, { erwartung, kennungen: { benutzer, rechner: 'build-runner-01' } }), [], benutzer);
  }
  // ohne Erwartung bleibt ein Name im Titel ein Befund (keine Ausnahme aus den eigenen Info-Werten der Datei)
  assert.ok(befunde(pdf, { kennungen: { benutzer: 'Enrico Falk', rechner: 'build-runner-01' } }).some((x) => /Benutzername/.test(x)));
});

test('HF-001 Variante als Strukturname ("Font Name" -> fontname) ohne Fehlalarm; andere Varianten bleiben gesucht', () => {
  assert.deepEqual(befunde(basisPdf(), { kennungen: { benutzer: 'Font Name', rechner: 'build-runner-01' } }), []);
  const f = befunde(mini((o) => { o[7] = strom('', 'BT (C:/x/font%20name/y) Tj ET', { flate: true }); }), { kennungen: { benutzer: 'Font Name', rechner: 'build-runner-01' } });
  assert.ok(f.some((x) => /Benutzername/.test(x)), JSON.stringify(f));
});

test('HF-001 checkDist gibt Hinweise der PDF-Pruefung weiter', () => {
  assert.ok(Array.isArray(pruefePdf(basisPdf()).hinweise));
});

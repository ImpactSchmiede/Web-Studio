// Kleine synthetische PDFs fuer die Tests (klassische xref wie bei Chrome/Skia). Unabhaengig vom Code unter src/:
// Offsets und xref werden hier selbst berechnet. Ein Basis-PDF ist fehlerfrei, jeder Test aendert genau eine Stelle.
import zlib from 'node:zlib';

// Strom-Objekt: dict ohne << >> und Laenge; flate=true komprimiert.
export function strom(dictText, daten, { flate = false } = {}) {
  const roh = Buffer.isBuffer(daten) ? daten : Buffer.from(daten, 'latin1');
  const bytes = flate ? zlib.deflateSync(roh) : roh;
  return { dictText: `${dictText}${flate ? ' /Filter /FlateDecode' : ''} /Length ${bytes.length}`, bytes };
}

// objekte: Liste von Texten (Objekt 1..n) oder Strom-Objekten. trailer: Text innerhalb von << >> ohne /Size.
export function baueMini(objekte, trailerText = '/Root 1 0 R /Info 10 0 R') {
  const teile = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
  const offsets = [];
  let pos = teile[0].length;
  objekte.forEach((o, i) => {
    offsets.push(pos);
    const kopf = Buffer.from(`${i + 1} 0 obj\n`, 'latin1');
    const koerper = typeof o === 'string'
      ? Buffer.from(`${o}\nendobj\n`, 'latin1')
      : Buffer.concat([Buffer.from(`<<${o.dictText}>>\nstream\n`, 'latin1'), o.bytes, Buffer.from('\nendstream\nendobj\n', 'latin1')]);
    teile.push(kopf, koerper);
    pos += kopf.length + koerper.length;
  });
  const xref = ['xref', `0 ${objekte.length + 1}`, '0000000000 65535 f ']
    .concat(offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n `));
  teile.push(Buffer.from(`${xref.join('\n')}\ntrailer\n<</Size ${objekte.length + 1} ${trailerText}>>\nstartxref\n${pos}\n%%EOF\n`, 'latin1'));
  return Buffer.concat(teile);
}

// Hex-Textstring (UTF-16BE mit BOM) wie ihn Chrome fuer Titel schreibt.
export const hexText = (s) => `<FEFF${Buffer.from(s, 'utf16le').swap16().toString('hex').toUpperCase()}>`;

// Basis: 1 Katalog, 2 Seiten, 3 Seite, 4 Schrift Type0, 5 CIDFont, 6 FontDescriptor, 7 ToUnicode, 8 Inhalt, 9 FontFile2, 10 Info.
export function basisObjekte() {
  return [
    '<</Type /Catalog /Pages 2 0 R /Lang (de)>>',
    '<</Type /Pages /Count 1 /Kids [3 0 R]>>',
    '<</Type /Page /Parent 2 0 R /MediaBox [0 0 595.96 841.92] /Resources <</Font <</F1 4 0 R>>>> /Contents 8 0 R /Annots [11 0 R]>>',
    '<</Type /Font /Subtype /Type0 /BaseFont /AAAAAA+AtkinsonHyperlegible-Regular /Encoding /Identity-H /DescendantFonts [5 0 R] /ToUnicode 7 0 R>>',
    '<</Type /Font /Subtype /CIDFontType2 /BaseFont /AAAAAA+AtkinsonHyperlegible-Regular /FontDescriptor 6 0 R /CIDToGIDMap /Identity>>',
    '<</Type /FontDescriptor /FontName /AAAAAA+AtkinsonHyperlegible-Regular /Flags 4 /FontFile2 9 0 R>>',
    strom('', '/CIDInit /ProcSet findresource begin begincmap 1 begincodespacerange <0000> <ffff> endcodespacerange 1 beginbfchar <0001> <0041> endbfchar endcmap', { flate: true }),
    strom('', 'BT /F1 12 Tf <0001> Tj ET', { flate: true }),
    strom('/Length1 4', 'abcd', { flate: true }),
    `<</Title ${hexText('Enrico Falk – Profil')} /Author (Enrico Falk) /CreationDate (D:20261019000000Z) /ModDate (D:20261019000000Z)>>`,
    '<</Type /Annot /Subtype /Link /Rect [0 0 10 10] /A <</Type /Action /S /URI /URI (https://enricofalk.de/)>>>>',
  ];
}

export const basisPdf = () => baueMini(basisObjekte());

// Aenderung am Basis-PDF: fn bekommt die Objektliste (veraenderbar) und den Trailertext, gibt optional einen neuen Trailertext zurueck.
export function mini(fn) {
  const o = basisObjekte();
  const t = fn?.(o, '/Root 1 0 R /Info 10 0 R');
  return baueMini(o, typeof t === 'string' ? t : '/Root 1 0 R /Info 10 0 R');
}

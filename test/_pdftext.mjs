// Text aus einem PDF lesen (nur Testhilfe, unabhaengig von der Anzeige): Inhaltsstroeme der Seiten, Schriften ueber /ToUnicode
// (bfchar und bfrange), Type0 mit 2-Byte-Codes, Type3 mit 1-Byte-Codes. Genau die Struktur, die Chrome/Skia schreibt.
import { lesePdf, aufloesen, stromDaten, Name } from '../src/build/pdf.mjs';

function utf16be(hex) {
  const b = Buffer.from(hex, 'hex');
  let s = '';
  for (let i = 0; i + 1 < b.length; i += 2) s += String.fromCharCode((b[i] << 8) | b[i + 1]);
  return s;
}

export function leseCMap(text) {
  const karte = new Map();
  for (const m of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const p of m[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) karte.set(parseInt(p[1], 16), utf16be(p[2]));
  }
  for (const m of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const p of m[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(?:<([0-9a-fA-F]+)>|\[((?:\s*<[0-9a-fA-F]+>)+)\s*\])/g)) {
      const von = parseInt(p[1], 16);
      const bis = parseInt(p[2], 16);
      if (p[3] !== undefined) {
        const basis = utf16be(p[3]);
        for (let c = von; c <= bis; c += 1) {
          karte.set(c, basis.slice(0, -1) + String.fromCharCode(basis.charCodeAt(basis.length - 1) + (c - von)));
        }
      } else {
        [...p[4].matchAll(/<([0-9a-fA-F]+)>/g)].forEach((d, i) => karte.set(von + i, utf16be(d[1])));
      }
    }
  }
  return karte;
}

export function pdfText(buf) {
  const pdf = lesePdf(buf);
  const aufl = (v) => aufloesen(pdf, v);
  const seiten = [];
  const geh = (knoten) => {
    const d = aufl(knoten);
    if (d.get('Type') instanceof Name && d.get('Type').name === 'Pages') d.get('Kids').forEach(geh);
    else seiten.push(d);
  };
  geh(aufl(pdf.trailer.get('Root')).get('Pages'));
  const schriften = new Map();
  const schrift = (ref) => {
    if (!schriften.has(ref.nr)) {
      const d = aufl(ref);
      const tu = d.get('ToUnicode');
      schriften.set(ref.nr, {
        zwei: d.get('Subtype').name === 'Type0',
        karte: tu ? leseCMap(stromDaten(pdf.objekte.get(tu.nr)).toString('latin1')) : new Map(),
      });
    }
    return schriften.get(ref.nr);
  };
  const aus = [];
  for (const seite of seiten) {
    const fonts = aufl(aufl(seite.get('Resources')).get('Font'));
    const inhalte = [].concat(seite.get('Contents'));
    let aktuell = null;
    const zeige = (hex) => {
      if (!aktuell) return;
      const b = Buffer.from(hex, 'hex');
      const schritt = aktuell.zwei ? 2 : 1;
      for (let i = 0; i + schritt <= b.length; i += schritt) {
        const code = schritt === 2 ? b.readUInt16BE(i) : b[i];
        aus.push(aktuell.karte.get(code) ?? '�');
      }
    };
    for (const ref of inhalte) {
      const text = stromDaten(pdf.objekte.get(ref.nr)).toString('latin1');
      for (const m of text.matchAll(/\/(F\d+)\s+[\d.]+\s+Tf|<([0-9a-fA-F\s]*)>|\bET\b/g)) {
        if (m[1]) aktuell = schrift(fonts.get(m[1]));
        else if (m[2] !== undefined) zeige(m[2].replace(/\s+/g, ''));
        else aus.push('\n');
      }
    }
    aus.push('\n\f');
  }
  return aus.join('');
}

export const ohneLeer = (s) => s.replace(/\s+/g, '');

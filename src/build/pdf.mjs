// PDF: strenger Leser fuer genau die Struktur, die Chrome/Skia schreibt (PDF 1.4, eine klassische xref-Tabelle, keine Objektstroeme),
// Neuschreiben des Info-Dictionarys (setzeInfo) und Pruefung der Lieferform (pruefePdf). Nur Node-Bordmittel (zlib).
// Alles, was von dieser Struktur abweicht, ist ein sichtbarer Fehler ("Chrome-Version pruefen"), kein stiller Rueckfall.
// Hintergrund und Messbefunde: docs/referenzen/pdf-chrome.md
import os from 'node:os';
import zlib from 'node:zlib';

export class Name {
  constructor(name) { this.name = name; }
}
export class Ref {
  constructor(nr) { this.nr = nr; }
}

const WS = '\0\t\n\f\r ';
const DELIM = '()<>[]{}/%';
const istWs = (c) => c !== undefined && WS.includes(c);
const istTrenner = (c) => c === undefined || istWs(c) || DELIM.includes(c);

class Leser {
  constructor(s, i = 0) { this.s = s; this.i = i; }

  ueberspringe() {
    for (;;) {
      while (istWs(this.s[this.i])) this.i += 1;
      if (this.s[this.i] === '%') {
        while (this.i < this.s.length && this.s[this.i] !== '\n' && this.s[this.i] !== '\r') this.i += 1;
      } else return;
    }
  }

  name() {
    if (this.s[this.i] !== '/') throw new Error(`Name erwartet bei ${this.i}`);
    this.i += 1;
    let roh = '';
    while (!istTrenner(this.s[this.i])) { roh += this.s[this.i]; this.i += 1; }
    return roh.replace(/#([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  }

  wert() {
    this.ueberspringe();
    const s = this.s;
    const c = s[this.i];
    if (c === '<' && s[this.i + 1] === '<') {
      this.i += 2;
      const d = new Map();
      for (;;) {
        this.ueberspringe();
        if (s.startsWith('>>', this.i)) { this.i += 2; return d; }
        const k = this.name();
        if (d.has(k)) throw new Error(`doppelter Schluessel /${k}`);
        d.set(k, this.wert());
      }
    }
    if (c === '<') {
      const e = s.indexOf('>', this.i);
      if (e < 0) throw new Error('Hex-Zeichenkette nicht abgeschlossen');
      const hex = s.slice(this.i + 1, e).replace(/[\0\t\n\f\r ]/g, '');
      if (!/^[0-9a-fA-F]*$/.test(hex)) throw new Error('Hex-Zeichenkette ungueltig');
      this.i = e + 1;
      return Buffer.from(hex.length % 2 ? `${hex}0` : hex, 'hex');
    }
    if (c === '[') {
      this.i += 1;
      const a = [];
      for (;;) {
        this.ueberspringe();
        if (s[this.i] === ']') { this.i += 1; return a; }
        if (this.i >= s.length) throw new Error('Liste nicht abgeschlossen');
        a.push(this.wert());
      }
    }
    if (c === '(') return this.zeichenkette();
    if (c === '/') return new Name(this.name());
    const zahl = /[+-]?(?:\d+\.?\d*|\.\d+)/y;
    zahl.lastIndex = this.i;
    const m = zahl.exec(s);
    if (m) {
      this.i += m[0].length;
      if (/^\d+$/.test(m[0])) {
        const r = /\s+(\d+)\s+R(?=[\0\t\n\f\r \/\[\]<>()%]|$)/y;
        r.lastIndex = this.i;
        const rm = r.exec(s);
        if (rm) { this.i += rm[0].length; return new Ref(Number(m[0])); }
      }
      return Number(m[0]);
    }
    for (const [w, v] of [['true', true], ['false', false], ['null', null]]) {
      if (s.startsWith(w, this.i) && istTrenner(s[this.i + w.length])) { this.i += w.length; return v; }
    }
    throw new Error(`unerwartetes Zeichen ${JSON.stringify(c)} bei ${this.i}`);
  }

  zeichenkette() {
    const s = this.s;
    this.i += 1;
    let tiefe = 1;
    const b = [];
    while (this.i < s.length) {
      const c = s[this.i];
      this.i += 1;
      if (c === '\\') {
        const n = s[this.i];
        this.i += 1;
        const einfach = { n: 10, r: 13, t: 9, b: 8, f: 12, '(': 40, ')': 41, '\\': 92 };
        if (n in einfach) b.push(einfach[n]);
        else if (/[0-7]/.test(n)) {
          let o = n;
          while (o.length < 3 && /[0-7]/.test(s[this.i] ?? '')) { o += s[this.i]; this.i += 1; }
          b.push(parseInt(o, 8) & 255);
        } else if (n === '\r') { if (s[this.i] === '\n') this.i += 1; } else if (n !== '\n') b.push(n.charCodeAt(0) & 255);
      } else if (c === '(') { tiefe += 1; b.push(40); } else if (c === ')') {
        tiefe -= 1;
        if (tiefe === 0) return Buffer.from(b);
        b.push(41);
      } else b.push(c.charCodeAt(0) & 255);
    }
    throw new Error('Zeichenkette nicht abgeschlossen');
  }
}

export function aufloesen(pdf, v) {
  let n = 0;
  while (v instanceof Ref) {
    const o = pdf.objekte.get(v.nr);
    if (!o) throw new Error(`Verweis auf fehlendes Objekt ${v.nr}`);
    v = o.wert;
    n += 1;
    if (n > 20) throw new Error('Verweiskette zu lang');
  }
  return v;
}

const istName = (v, n) => v instanceof Name && (n === undefined || v.name === n);

export function stromDaten(obj) {
  if (!obj?.strom) throw new Error('kein Strom');
  const d = obj.wert;
  if (d.has('DecodeParms') || d.has('DP')) throw new Error('DecodeParms (Predictor) nicht unterstuetzt');
  let f = d.get('Filter');
  if (f === undefined) return obj.strom;
  if (Array.isArray(f)) f = f.length === 1 ? f[0] : f;
  if (istName(f, 'FlateDecode')) return zlib.inflateSync(obj.strom);
  throw new Error(`unbekannter Filter ${istName(f) ? `/${f.name}` : JSON.stringify(f)}`);
}

// Text-String eines PDF-Wertes: UTF-16BE mit BOM oder PDFDocEncoding (hier Latin-1).
export function textString(b) {
  if (!Buffer.isBuffer(b)) throw new Error('Zeichenkette erwartet');
  if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) {
    let s = '';
    for (let i = 2; i + 1 < b.length; i += 2) s += String.fromCharCode((b[i] << 8) | b[i + 1]);
    return s;
  }
  return b.toString('latin1');
}

// ---- lesen ----
const ENDE_EINTRAG = / \n|\r\n| \r/;

export function lesePdf(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 32 || buf.toString('latin1', 0, 5) !== '%PDF-') throw new Error('kein PDF-Kopf (%PDF-) am Dateianfang');
  const s = buf.toString('latin1');
  const startRe = /startxref/g;
  const treffer = [...s.matchAll(startRe)];
  if (treffer.length !== 1) throw new Error(`startxref kommt ${treffer.length}-mal vor (genau 1 erwartet, inkrementelles Update?)`);
  const sm = /^startxref[\0\t\n\f\r ]+(\d+)[\0\t\n\f\r ]+%%EOF[\0\t\n\f\r ]*$/.exec(s.slice(treffer[0].index));
  if (!sm) throw new Error('startxref/%%EOF am Dateiende fehlt oder Daten folgen dahinter');
  const xrefOffset = Number(sm[1]);
  if (!s.startsWith('xref', xrefOffset)) throw new Error(`xref-Tabelle fehlt am Offset ${xrefOffset}`);
  const kopf = /^xref[\0\t\n\f\r ]+0 (\d+)(?:\r\n|\n|\r| \n| \r)/.exec(s.slice(xrefOffset, xrefOffset + 64));
  if (!kopf) throw new Error('xref: genau ein Abschnitt "0 N" erwartet');
  const n = Number(kopf[1]);
  let pos = xrefOffset + kopf[0].length;
  const offsets = new Map();
  for (let nr = 0; nr < n; nr += 1) {
    const e = s.slice(pos, pos + 20);
    const m = /^(\d{10}) (\d{5}) ([nf])(.{2})$/s.exec(e);
    if (!m || !ENDE_EINTRAG.test(m[4])) throw new Error(`xref-Eintrag ${nr} ist keine 20-Byte-Zeile`);
    if (nr === 0) {
      if (m[3] !== 'f' || m[2] !== '65535') throw new Error('xref: Eintrag 0 muss "f 65535" sein');
    } else {
      if (m[3] !== 'n' || m[2] !== '00000') throw new Error(`xref: Eintrag ${nr} ist frei oder hat eine Generation (nicht unterstuetzt)`);
      offsets.set(nr, Number(m[1]));
    }
    pos += 20;
  }
  const tm = /^[\0\t\n\f\r ]*trailer[\0\t\n\f\r ]*/.exec(s.slice(pos, pos + 32));
  if (!tm) throw new Error('trailer fehlt hinter der xref-Tabelle');
  const lt = new Leser(s, pos + tm[0].length);
  const trailer = lt.wert();
  if (!(trailer instanceof Map)) throw new Error('trailer ist kein Dictionary');
  if (trailer.get('Size') !== n) throw new Error(`trailer /Size ${trailer.get('Size')} passt nicht zur xref-Tabelle (${n})`);
  if (s.slice(lt.i).trimStart().slice(0, 9) !== 'startxref') throw new Error('Daten zwischen trailer und startxref');

  const objekte = new Map();
  const stromInfo = [];
  for (const [nr, off] of offsets) {
    const hm = new RegExp(`${nr} 0 obj(?=[\\0\\t\\n\\f\\r \\/<\\[(])`, 'y');
    hm.lastIndex = off;
    if (!hm.exec(s)) throw new Error(`xref-Offset ${off} von Objekt ${nr} zeigt nicht auf "${nr} 0 obj"`);
    const l = new Leser(s, hm.lastIndex);
    const wert = l.wert();
    l.ueberspringe();
    let strom = null;
    let von = 0;
    let bis = 0;
    if (s.startsWith('stream', l.i)) {
      if (!(wert instanceof Map)) throw new Error(`Objekt ${nr}: Strom ohne Dictionary`);
      let p = l.i + 6;
      if (s[p] === '\r' && s[p + 1] === '\n') p += 2;
      else if (s[p] === '\n') p += 1;
      else throw new Error(`Objekt ${nr}: Zeilenende hinter "stream" fehlt`);
      von = p;
      stromInfo.push(nr);
    } else if (!s.startsWith('endobj', l.i)) {
      throw new Error(`Objekt ${nr}: "endobj" erwartet`);
    }
    objekte.set(nr, { nr, wert, strom, stromVon: von, stromBis: bis, offset: off });
  }
  for (const nr of stromInfo) {
    const o = objekte.get(nr);
    let len = o.wert.get('Length');
    if (len instanceof Ref) len = objekte.get(len.nr)?.wert;
    if (!Number.isInteger(len) || len < 0) throw new Error(`Objekt ${nr}: /Length ungueltig`);
    const bis = o.stromVon + len;
    const rest = s.slice(bis, bis + 24).replace(/^(\r\n|\n|\r)/, '');
    if (!rest.startsWith('endstream')) throw new Error(`Objekt ${nr}: "endstream" nicht an der erwarteten Stelle`);
    if (bis > xrefOffset) throw new Error(`Objekt ${nr}: Strom ragt ueber die xref-Tabelle`);
    o.stromBis = bis;
    o.strom = buf.subarray(o.stromVon, bis);
  }
  return { buf, version: s.slice(5, 8), objekte, trailer, xrefOffset, offsets };
}

// ---- Datum und Textstrings schreiben ----
function pruefeDatum(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof iso === 'string' ? iso : '');
  const d = m && new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (!m || d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) {
    throw new Error(`Datum ungueltig (JJJJ-MM-TT erwartet): ${JSON.stringify(iso)}`);
  }
  return m;
}

// 'JJJJ-MM-TT' -> 'D:JJJJMMTT000000Z' (UTC, deterministisch)
export function pdfDatum(iso) {
  const m = pruefeDatum(iso);
  return `D:${m[1]}${m[2]}${m[3]}000000Z`;
}

function schreibeText(s) {
  if (/^[\x20-\x7e]*$/.test(s)) return `(${s.replace(/[\\()]/g, '\\$&')})`;
  return `<FEFF${Buffer.from(s, 'utf16le').swap16().toString('hex').toUpperCase()}>`;
}

const TRAILER_ERLAUBT = new Set(['Size', 'Root', 'Info', 'ID']);
const INFO_ERLAUBT = ['Title', 'Author', 'CreationDate', 'ModDate'];

// Struktur, die setzeInfo und pruefePdf voraussetzen (Positivliste, Plan m1)
function strukturBefunde(pdf) {
  const b = [];
  for (const k of pdf.trailer.keys()) {
    if (!TRAILER_ERLAUBT.has(k)) b.push(`Trailer: /${k} nicht erlaubt (erlaubt: ${[...TRAILER_ERLAUBT].join(' ')}); inkrementelles Update oder Verschluesselung?`);
  }
  for (const o of pdf.objekte.values()) {
    const t = o.wert instanceof Map ? o.wert.get('Type') : null;
    if (istName(t, 'ObjStm') || istName(t, 'XRef')) b.push(`Objekt ${o.nr}: /${t.name} (Objektstrom oder XRef-Strom) nicht unterstuetzt`);
  }
  if (!(pdf.trailer.get('Root') instanceof Ref)) b.push('Trailer: /Root fehlt');
  else {
    const k = aufloesen(pdf, pdf.trailer.get('Root'));
    if (k instanceof Map && k.has('Metadata')) b.push('Katalog: /Metadata (XMP) nicht erlaubt');
  }
  return b;
}

// Info-Dictionary ersetzen: vollstaendiges Neuschreiben (ein inkrementelles Update liesse das alte Info-Objekt in der Datei stehen).
// Nur Title, Author, CreationDate, ModDate (aus stand, UTC 00:00). Alle uebrigen Objekte bleiben bytegleich.
export function setzeInfo(buf, { Title, Author, stand }) {
  const pdf = lesePdf(buf);
  const probleme = strukturBefunde(pdf);
  if (!(pdf.trailer.get('Info') instanceof Ref)) probleme.push('Trailer: /Info fehlt');
  if (probleme.length) throw new Error(`abweichende PDF-Struktur (Chrome-Version pruefen): ${probleme.join('; ')}`);
  if (typeof Title !== 'string' || typeof Author !== 'string') throw new Error('Title und Author muessen Texte sein');
  const datum = pdfDatum(stand);
  const infoNr = pdf.trailer.get('Info').nr;
  const reihe = [...pdf.objekte.values()].sort((a, b) => a.offset - b.offset);
  const teile = [buf.subarray(0, reihe[0].offset)];
  let pos = teile[0].length;
  const neu = new Map();
  reihe.forEach((o, i) => {
    const ende = i + 1 < reihe.length ? reihe[i + 1].offset : pdf.xrefOffset;
    const bytes = o.nr === infoNr
      ? Buffer.from(`${o.nr} 0 obj\n<</Title ${schreibeText(Title)} /Author ${schreibeText(Author)} /CreationDate (${datum}) /ModDate (${datum})>>\nendobj\n`, 'latin1')
      : buf.subarray(o.offset, ende);
    neu.set(o.nr, pos);
    teile.push(bytes);
    pos += bytes.length;
  });
  const n = pdf.trailer.get('Size');
  const zeilen = ['xref', `0 ${n}`, '0000000000 65535 f '];
  for (let nr = 1; nr < n; nr += 1) {
    if (!neu.has(nr)) throw new Error(`abweichende PDF-Struktur: Objekt ${nr} fehlt`);
    zeilen.push(`${String(neu.get(nr)).padStart(10, '0')} 00000 n `);
  }
  const id = pdf.trailer.get('ID');
  const idText = Array.isArray(id) ? `\n/ID [${id.map((x) => `<${x.toString('hex').toUpperCase()}>`).join(' ')}]` : '';
  teile.push(Buffer.from(
    `${zeilen.join('\n')}\ntrailer\n<</Size ${n}\n/Root ${pdf.trailer.get('Root').nr} 0 R\n/Info ${infoNr} 0 R${idText}>>\nstartxref\n${pos}\n%%EOF\n`,
    'latin1',
  ));
  return Buffer.concat(teile);
}

// ---- pruefen ----
const VERBOTEN = new Set([
  'JavaScript', 'JS', 'Launch', 'EmbeddedFile', 'EmbeddedFiles', 'RichMedia', 'OpenAction', 'AA', 'SubmitForm', 'ImportData',
  'GoToR', 'GoToE', 'AcroForm', 'XFA', 'Metadata',
]);
const AKTIONEN_ERLAUBT = new Set(['URI', 'GoTo']);
const SCHRIFTEN_ERLAUBT = ['AtkinsonHyperlegible', 'BricolageGrotesque'];
const A4 = [595.28, 841.89];

// Kennungen der Umgebung (Benutzer- und Rechnername); Tests uebergeben feste Werte (opt.kennungen), damit sie auf jeder Plattform gleich laufen (HF-001).
function umgebungsKennungen() {
  const k = { benutzer: '', rechner: '' };
  try { k.benutzer = os.userInfo().username; } catch { /* kein Benutzername ermittelbar */ }
  try { k.rechner = os.hostname(); } catch { /* kein Rechnername ermittelbar */ }
  return k;
}

// Woerter, die in jeder Chrome-PDF als Strukturnamen stehen (/Root, /Info, /Page, /Font ...). Ein Benutzer- oder Rechnername,
// der einem davon gleicht (z. B. "root" in Docker), ist nicht von der Struktur unterscheidbar und wird nicht gesucht (HF-001, QA B1).
const PDF_STRUKTUR = new Set(('annot annots ascent basefont border capheight catalog charprocs cidfonttype2 cidsysteminfo cidtogidmap '
  + 'contents count creationdate creator descendantfonts descent differences document encoding extgstate filter firstchar flags '
  + 'flatedecode font fontbbox fontdescriptor fontfamily fontfile2 fontmatrix fontname fontstretch fontweight identity info '
  + 'italicangle kids lang lastchar length link markinfo mediabox moddate nums objr ordering page pages parent procset producer '
  + 'rect registry resources root size stemv structelem structparent structparents structtreeroot subtype supplement tabs text '
  + 'title tounicode type type0 type3 viewerpreferences widths xheight action uri goto names dests xobject image').split(' '));

// Muster fuer die Leck-Suche. Feste Pfadmuster als Teilzeichenkette; Benutzer- und Rechnername (ab 4 Zeichen) nur als ganzes Wort,
// nie im Klartext in Meldungen, und nicht, wenn sie einem Strukturnamen oder einem Wort aus dem erwarteten Titel/Autor gleichen
// (z. B. Benutzer "enrico" bei Titel "Enrico Falk – Profil"); solche Kennungen stehen in ergebnis.hinweise.
function leckMuster({ benutzer = '', rechner = '' }, erwarteterText, hinweise) {
  const m = ['file:', '127.0.0.1', 'localhost', '\\users\\', '/users/', '/home/', 'appdata', '\\temp\\', '/tmp/', '\\ws-', '/ws-']
    .map((x) => ({ muster: x, anzeige: x, wort: false }));
  const fest = new Set(m.map((x) => x.muster));
  const kennung = (wert, anzeige, varianten) => {
    if (wert.length < 4) return;
    let ausgelassen = false;
    for (const v of varianten(wert.toLowerCase())) {
      if (fest.has(v)) continue;
      // je Variante: Strukturname (z. B. "Font Name" -> "fontname") oder ganzes Wort/ganze Wortfolge im erwarteten Titel/Autor
      if (PDF_STRUKTUR.has(v) || findeMuster(erwarteterText, { muster: v, wort: true })) { ausgelassen = true; continue; }
      m.push({ muster: v, anzeige, wort: true });
    }
    if (ausgelassen) hinweise.push(`${anzeige} (oder eine Schreibweise davon) nicht gesucht: gleicht einem Strukturnamen oder dem erwarteten Titel/Autor`);
  };
  kennung(benutzer, '<Benutzername>', (k) => [...new Set([k, k.replace(/ /g, '%20'), k.replace(/ /g, '#20'), k.replace(/ /g, '')])]);
  kennung(rechner, '<Rechnername>', (k) => [k]);
  return m;
}

const RE_ESC = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const findeMuster = (text, { muster, wort }) => (wort ? new RegExp(`(?<![a-z0-9])${RE_ESC(muster)}(?![a-z0-9])`).test(text) : text.includes(muster));

const utf16be = (b) => {
  let s = '';
  for (let i = 0; i + 1 < b.length; i += 2) s += String.fromCharCode((b[i] << 8) | b[i + 1]);
  return s;
};

function schriftNameOk(roh, erlaubt) {
  const n = String(roh).replace(/^[A-Z]{6}\+/, '').replace(/[^A-Za-z0-9]/g, '');
  return erlaubt.some((e) => n.startsWith(e));
}

// Inline-Bilder in Inhaltsstroemen: Zeichenketten vorher entfernen, damit "(BI)" im Text kein Treffer ist.
const KLAMMERTEXT = /\((?:\\.|[^\\()])*\)/g;
const HEXTEXT = /<[0-9a-fA-F\s]*>/g;
const INLINE_BILD = /(?:^|[\s\]>)])BI(?=[\s/])/;

export function pruefePdf(buf, opt = {}) {
  const o = { maxBytes: 1000000, maxSeiten: 2, erwartung: null, schriften: SCHRIFTEN_ERLAUBT, ...opt };
  const fehler = [];
  const ergebnis = { fehler, hinweise: [], info: {}, seiten: 0, schriften: [], uris: [], bytes: buf.length };
  if (buf.length > o.maxBytes) fehler.push(`Groesse ${buf.length} Byte ueber dem Limit ${o.maxBytes}`);
  let pdf;
  try {
    pdf = lesePdf(buf);
  } catch (e) {
    fehler.push(`PDF-Struktur nicht lesbar: ${e.message} (Chrome-Version pruefen)`);
    return ergebnis;
  }
  fehler.push(...strukturBefunde(pdf));
  const haystacks = []; // [Bezeichnung, Kleinbuchstaben-Text]
  const melde = (t) => { if (!fehler.includes(t)) fehler.push(t); };
  const texteMerken = (wo, b) => {
    haystacks.push([wo, b.toString('latin1').toLowerCase()]);
    if (b.length >= 2) haystacks.push([wo, utf16be(b.length % 2 ? b.subarray(0, -1) : b).toLowerCase()]);
  };

  // Aktionen: jedes Dictionary als Wert von /A, /Next (auch Liste, rekursiv), /OpenAction, /AA-Eintraegen, mit /Type /Action oder mit /S ohne /Type.
  // Erlaubt sind nur /S /URI und /S /GoTo. Ein /URI muss ein String mit https: oder mailto: sein (auch indirekt).
  const formNr = new Set();
  const pruefeAktion = (w, nr, tiefe = 0) => {
    if (tiefe > 20) { melde(`Aktionskette zu tief (Objekt ${nr})`); return; }
    const d = aufloesen(pdf, w);
    if (Array.isArray(d)) { for (const x of d) pruefeAktion(x, nr, tiefe + 1); return; }
    if (!(d instanceof Map)) return;
    const sa = d.get('S');
    if (!istName(sa) || !AKTIONEN_ERLAUBT.has(sa.name)) melde(`Aktion /S ${istName(sa) ? `/${sa.name}` : '?'} nicht erlaubt (Objekt ${nr}; erlaubt: ${[...AKTIONEN_ERLAUBT].join(', ')})`);
    if (d.has('Next')) pruefeAktion(d.get('Next'), nr, tiefe + 1);
  };
  // Annotationen: jedes Element jedes /Annots-Arrays (unabhaengig von /Type) und jedes Dictionary mit /Type /Annot; nur /Subtype /Link.
  const pruefeAnnotation = (w, nr) => {
    const d = aufloesen(pdf, w);
    if (!(d instanceof Map)) { melde(`Annotation in Objekt ${nr} ist kein Dictionary`); return; }
    const st = d.get('Subtype');
    if (!istName(st, 'Link')) melde(`Annotation /Subtype ${istName(st) ? `/${st.name}` : '(fehlt)'} nicht erlaubt (Objekt ${w instanceof Ref ? w.nr : nr}; erlaubt: Link)`);
    if (d.has('A')) pruefeAktion(d.get('A'), nr);
  };
  const pruefeUri = (w, nr) => {
    const u = aufloesen(pdf, w);
    if (!Buffer.isBuffer(u)) { melde(`URI in Objekt ${nr} ist kein String`); return; }
    const s = u.toString('latin1');
    ergebnis.uris.push(s);
    if (!/^(https:|mailto:)/.test(s)) melde(`URI nicht erlaubt (nur https: und mailto:): ${s}`);
  };
  const inhaltsStroeme = new Set(); // Seiteninhalte, Type3-CharProcs und Form-XObjects: hier wird nach Inline-Bildern gesucht

  // Alle Dictionaries und Listen (ohne Strombytes) auf verbotene Namen, Aktionen, Annotationen, URIs, Bilder durchsuchen.
  const geh = (v, nr) => {
    if (v instanceof Name) {
      if (VERBOTEN.has(v.name)) melde(`verbotenes PDF-Element /${v.name} (Objekt ${nr})`);
      haystacks.push([`Name in Objekt ${nr}`, v.name.toLowerCase()]);
    } else if (Buffer.isBuffer(v)) {
      texteMerken(`Zeichenkette in Objekt ${nr}`, v);
    } else if (Array.isArray(v)) {
      for (const x of v) geh(x, nr);
    } else if (v instanceof Map) {
      const typ = v.get('Type');
      if (istName(typ, 'Annot')) pruefeAnnotation(v, nr);
      if (istName(typ, 'Action') || (v.has('S') && !v.has('Type'))) pruefeAktion(v, nr);
      if (istName(v.get('Subtype'), 'Image')) melde(`Bild (/Subtype /Image, Objekt ${nr}) nicht erlaubt (kein Foto, keine gerasterten Effekte)`);
      if (istName(v.get('Subtype'), 'Form')) formNr.add(nr);
      for (const [k, w] of v) {
        if (VERBOTEN.has(k)) melde(`verbotenes PDF-Element /${k} (Objekt ${nr})`);
        haystacks.push([`Schluessel in Objekt ${nr}`, k.toLowerCase()]);
        if (k === 'URI') pruefeUri(w, nr);
        if (k === 'A' || k === 'OpenAction') pruefeAktion(w, nr);
        if (k === 'AA') { const aa = aufloesen(pdf, w); if (aa instanceof Map) for (const x of aa.values()) pruefeAktion(x, nr); }
        if (k === 'Annots') { const liste = aufloesen(pdf, w); if (Array.isArray(liste)) for (const x of liste) pruefeAnnotation(x, nr); }
        if (k === 'Contents' && istName(typ, 'Page')) for (const x of (w instanceof Ref ? (Array.isArray(pdf.objekte.get(w.nr)?.wert) ? pdf.objekte.get(w.nr).wert : [w]) : [].concat(w))) if (x instanceof Ref) inhaltsStroeme.add(x.nr);
        if (k === 'CharProcs') { const cp = aufloesen(pdf, w); if (cp instanceof Map) for (const x of cp.values()) if (x instanceof Ref) inhaltsStroeme.add(x.nr); }
        geh(w, nr);
      }
    }
  };
  for (const [nr, ob] of pdf.objekte) geh(ob.wert, nr);
  for (const nr of formNr) inhaltsStroeme.add(nr);
  // Inline-Bilder: der Operator BI (ausserhalb von Zeichenketten) in Inhaltsstroemen ist ein Bild, das /Subtype /Image umgeht.
  for (const nr of inhaltsStroeme) {
    const ob = pdf.objekte.get(nr);
    if (!ob?.strom) continue;
    let text;
    try { text = stromDaten(ob).toString('latin1'); } catch { continue; } // unbekannter Filter wird weiter unten gemeldet
    for (let i = 0; i < 5; i += 1) text = text.replace(KLAMMERTEXT, ' ');
    text = text.replace(HEXTEXT, ' ');
    if (INLINE_BILD.test(text)) melde(`Inline-Bild (Operator BI) im Inhaltsstrom ${nr} nicht erlaubt (kein Foto, keine gerasterten Effekte)`);
  }

  // Info-Dictionary
  const infoRef = pdf.trailer.get('Info');
  if (infoRef) {
    const info = aufloesen(pdf, infoRef);
    for (const [k, w] of info) {
      if (!INFO_ERLAUBT.includes(k)) melde(`Info-Dictionary: /${k} nicht erlaubt (erlaubt: ${INFO_ERLAUBT.join(' ')})`);
      else if (Buffer.isBuffer(w)) ergebnis.info[k] = textString(w);
    }
  }
  if (o.erwartung) {
    for (const [k, soll] of Object.entries(o.erwartung)) {
      if (ergebnis.info[k] !== soll) melde(`Info-Dictionary: /${k} ist ${JSON.stringify(ergebnis.info[k])}, erwartet ${JSON.stringify(soll)}`);
    }
  }

  // Strome dekodieren und nach Pfaden und Kennungen durchsuchen; unbekannter Filter ist ein Befund.
  const maske = Buffer.from(buf);
  for (const ob of pdf.objekte.values()) {
    if (!ob.strom) continue;
    maske.fill(0x20, ob.stromVon, ob.stromBis);
    try {
      haystacks.push([`Strom ${ob.nr}`, stromDaten(ob).toString('latin1').toLowerCase()]);
    } catch (e) {
      melde(`Strom ${ob.nr}: ${e.message} (Filter)`);
    }
  }
  haystacks.push(['Dateikopf und Dictionaries', maske.toString('latin1').toLowerCase()]);
  // Grundlage fuer Ausnahmen: nur die vorgegebene Erwartung (Build, check, paket:pruefen geben sie immer mit) und, wenn sie vorliegt,
  // die erlaubten https-/mailto-Verweise (z. B. Benutzer "Enrico Falk" -> "enricofalk" in https://enricofalk.de/). Die eigenen Info-Werte der Datei nie.
  const erwarteterText = o.erwartung
    ? [...Object.values(o.erwartung), ...ergebnis.uris.filter((u) => /^(https|mailto):/i.test(u))].join(' | ').toLowerCase()
    : '';
  for (const lm of leckMuster(o.kennungen ?? umgebungsKennungen(), erwarteterText, ergebnis.hinweise)) {
    const wo = haystacks.find(([, t]) => findeMuster(t, lm));
    if (wo) melde(`lokaler Pfad oder Kennung "${lm.anzeige}" in der Datei (${wo[0].replace(lm.muster, '<>')})`);
  }

  // Schriften: jeder vorhandene Name (Type0: BaseFont, Nachkomme-BaseFont, FontDescriptor-FontName; sonst BaseFont und FontName) muss erlaubt sein, mindestens einer muss existieren.
  const hatStrom = (ref) => ref instanceof Ref && !!pdf.objekte.get(ref.nr)?.strom;
  const deskriptorOk = (d, ...schluessel) => d instanceof Map && schluessel.some((k) => hatStrom(d.get(k)));
  const nameVon = (d, k) => (d instanceof Map && istName(d.get(k)) ? d.get(k).name : '');
  for (const [nr, ob] of pdf.objekte) {
    const d = ob.wert;
    if (!(d instanceof Map) || !istName(d.get('Type'), 'Font')) continue;
    const art = d.get('Subtype');
    if (!istName(art)) { melde(`Schrift ${nr}: /Subtype fehlt`); continue; }
    if (art.name === 'CIDFontType0' || art.name === 'CIDFontType2') continue; // Nachkomme eines Type0, dort geprueft
    const eintrag = { name: '', art: art.name, eingebettet: false, toUnicode: hatStrom(d.get('ToUnicode')) };
    let fd = null;
    let namen = [];
    if (art.name === 'Type0') {
      const kinder = aufloesen(pdf, d.get('DescendantFonts'));
      const kind = Array.isArray(kinder) ? aufloesen(pdf, kinder[0]) : null;
      fd = kind instanceof Map ? aufloesen(pdf, kind.get('FontDescriptor')) : null;
      namen = [nameVon(d, 'BaseFont'), nameVon(kind, 'BaseFont'), nameVon(fd, 'FontName')];
      eintrag.eingebettet = deskriptorOk(fd, 'FontFile2', 'FontFile3');
    } else if (art.name === 'Type3') {
      const cp = aufloesen(pdf, d.get('CharProcs'));
      eintrag.eingebettet = cp instanceof Map && cp.size > 0;
      fd = aufloesen(pdf, d.get('FontDescriptor'));
      namen = [nameVon(d, 'BaseFont'), nameVon(fd, 'FontName')];
      if (!eintrag.eingebettet) melde(`Schrift ${nr} (Type3): /CharProcs fehlt, Schrift nicht eingebettet`);
    } else if (['TrueType', 'Type1', 'MMType1'].includes(art.name)) {
      fd = aufloesen(pdf, d.get('FontDescriptor'));
      namen = [nameVon(d, 'BaseFont'), nameVon(fd, 'FontName')];
      eintrag.eingebettet = deskriptorOk(fd, 'FontFile', 'FontFile2', 'FontFile3');
    } else {
      melde(`Schrift ${nr}: /Subtype /${art.name} nicht unterstuetzt`);
      continue;
    }
    namen = namen.filter(Boolean);
    eintrag.name = (namen[0] ?? '').replace(/^[A-Z]{6}\+/, '');
    ergebnis.schriften.push(eintrag);
    if (!namen.length) melde(`Schrift ${nr} (${art.name}) ohne Name (BaseFont/FontName fehlen)`);
    if (!eintrag.eingebettet) melde(`Schrift ${eintrag.name || nr} nicht eingebettet (kein FontFile/CharProcs)`);
    if (!eintrag.toUnicode) melde(`Schrift ${eintrag.name || nr} ohne ToUnicode (Text nicht auswaehlbar oder durchsuchbar)`);
    for (const n of namen) {
      if (!schriftNameOk(n, o.schriften)) melde(`Schrift ${n.replace(/^[A-Z]{6}\+/, '')} nicht erlaubt (erlaubt: ${o.schriften.join(', ')})`);
    }
  }

  // Seiten, Format
  const seiten = [];
  const baum = (knoten, erbt, tiefe) => {
    if (tiefe > 20) throw new Error('Seitenbaum zu tief');
    const dd = aufloesen(pdf, knoten);
    if (!(dd instanceof Map)) return;
    const mb = dd.get('MediaBox') ?? erbt;
    if (istName(dd.get('Type'), 'Pages')) {
      for (const k of aufloesen(pdf, dd.get('Kids')) ?? []) baum(k, mb, tiefe + 1);
    } else seiten.push(aufloesen(pdf, mb));
  };
  try {
    const wurzel = aufloesen(pdf, pdf.trailer.get('Root'));
    baum(wurzel.get('Pages'), undefined, 0);
  } catch (e) {
    melde(`Seitenbaum nicht lesbar: ${e.message}`);
  }
  ergebnis.seiten = seiten.length;
  if (seiten.length < 1 || seiten.length > o.maxSeiten) melde(`Seiten: ${seiten.length} (erlaubt 1 bis ${o.maxSeiten})`);
  for (const [i, mb] of seiten.entries()) {
    const zahlen = Array.isArray(mb) && mb.length === 4 ? mb.map((z) => aufloesen(pdf, z)) : null;
    if (!zahlen || !zahlen.every(Number.isFinite)) { melde(`Seite ${i + 1}: MediaBox fehlt oder ist ungueltig`); continue; }
    const w = Math.abs(zahlen[2] - zahlen[0]);
    const h = Math.abs(zahlen[3] - zahlen[1]);
    if (Math.abs(w - A4[0]) > 1 || Math.abs(h - A4[1]) > 1) melde(`Seite ${i + 1}: MediaBox ${w.toFixed(1)} x ${h.toFixed(1)} pt ist nicht A4 (595 x 842)`);
  }
  return ergebnis;
}

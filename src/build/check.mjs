// Lieferform-Pruefung fuer dist/ (Vorgaben PO VPS-Administration, CSP default-src 'self'):
// nur normale Dateien, keine Links/versteckten Dateien, Endungs-Allowlist, Pflichtdateien oben, Limits,
// kein Inline-CSS/-JS, keine Ereignis-Handler, keine externen Ladeziele, lokale Verweise existieren.
// Linkpruefung ohne Abhaengigkeit: lokale <a href> (Datei vorhanden, #anker existiert als id in der Zieldatei), bloesses
// href="#" nur am Namen im Kopf (a.name = Sprung nach oben), externe <a href> werden nur gesammelt (Ergebnis: externe), nicht geladen.
// Jede .pdf wird mit pruefePdf geprueft (Metadaten, Schriften, Verweise, Aktionen, Seiten, Groesse); pdfErwartung {Title, Author} ist optional.
// Sammelt alle Befunde (kein Abbruch beim ersten).
import fs from 'node:fs';
import path from 'node:path';
import { pruefePdf } from './pdf.mjs';

export const STANDARD = {
  maxBytes: 20 * 1024 * 1024,
  maxFiles: 500,
  // Endungsliste des PO VPS-Administration (Thread Web-Studio_freelancer-seite, 16:34)
  endungen: ['.html', '.css', '.js', '.woff2', '.txt', '.xml', '.pdf', '.webp', '.jpg', '.png', '.ico'],
  pdfMaxBytes: 1000000,
};

const PFLICHT = ['index.html', '404.html'];

const posix = (p) => p.split(path.sep).join('/');

function attribute(rest) {
  const aus = [];
  const re = /([^\s=\/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (const m of rest.matchAll(re)) {
    aus.push([m[1].toLowerCase(), m[2] ?? m[3] ?? m[4] ?? null]);
  }
  return aus;
}

// Zeichenverweise wie der Browser aufloesen (&#106; &#x6a; &colon; &Tab; ...), bevor Werte geprueft werden.
const BENANNT = {
  colon: ':', Tab: '\t', NewLine: '\n', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", sol: '/', bsol: '\\',
  lpar: '(', rpar: ')', num: '#', period: '.', semi: ';', comma: ',', lowbar: '_', hyphen: '-', nbsp: String.fromCharCode(160),
};
function dekodiere(v) {
  return v.replace(/&#(\d+);?|&#[xX]([0-9a-fA-F]+);?|&([A-Za-z][A-Za-z0-9]*);/g, (m, dez, hex, name) => {
    if (name !== undefined) return Object.hasOwn(BENANNT, name) ? BENANNT[name] : m;
    const code = dez !== undefined ? Number(dez) : parseInt(hex, 16);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
  });
}

// Schema (auch data:), protokoll-relativ (//host) oder Backslash-Variante (zwei Backslashes, Schraegstrich-Backslash)
// = Ladeziel ausserhalb von dist. Tab und Zeilenumbruch ignorieren Browser innerhalb von URLs.
function istExtern(v) {
  const s = v.replace(/[\t\n\r]/g, '').trim();
  return /^[a-z][a-z0-9+.-]*:/i.test(s) || /^[\\/]{2}/.test(s);
}

function sammle(dir, root, fehler, dateien) {
  let eintraege;
  try {
    eintraege = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    fehler.push(`${posix(path.relative(root, dir)) || '.'}: Ordner nicht lesbar (${e.code})`);
    return;
  }
  eintraege.sort((a, b) => (a.name < b.name ? -1 : 1));
  for (const e of eintraege) {
    const abs = path.join(dir, e.name);
    const rel = posix(path.relative(root, abs));
    const st = fs.lstatSync(abs);
    if (st.isSymbolicLink()) {
      fehler.push(`${rel}: Link (Symlink/Junction) nicht erlaubt, wird nicht verfolgt`);
    } else if (e.name.startsWith('.')) {
      fehler.push(`${rel}: versteckte Datei oder versteckter Ordner nicht erlaubt`);
    } else if (st.isDirectory()) {
      sammle(abs, root, fehler, dateien);
    } else if (st.isFile()) {
      dateien.push({ pfad: rel, bytes: st.size });
    } else {
      fehler.push(`${rel}: keine normale Datei`);
    }
  }
}

export function checkDist(dir, opts = {}) {
  const o = { ...STANDARD, ...opts };
  const root = path.resolve(dir);
  const fehler = [];
  const dateien = [];
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    return { fehler: [`${dir}: Ordner fehlt`], dateien, summe: 0 };
  }
  sammle(root, root, fehler, dateien);
  dateien.sort((a, b) => (a.pfad < b.pfad ? -1 : 1));
  const summe = dateien.reduce((s, d) => s + d.bytes, 0);
  const vorhanden = new Set(dateien.map((d) => d.pfad));

  for (const pf of PFLICHT) {
    if (!vorhanden.has(pf)) fehler.push(`${pf}: Pflichtdatei fehlt auf oberster Ebene`);
  }
  for (const d of dateien) {
    const ext = path.extname(d.pfad).toLowerCase();
    if (!o.endungen.includes(ext)) fehler.push(`${d.pfad}: Endung nicht erlaubt (${ext || 'keine'}; erlaubt: ${o.endungen.join(' ')})`);
  }
  if (dateien.length > o.maxFiles) fehler.push(`zu viele Dateien: ${dateien.length} (Limit ${o.maxFiles})`);
  if (summe > o.maxBytes) fehler.push(`Gesamtgroesse zu gross: ${summe} Byte (Limit ${o.maxBytes})`);

  for (const d of dateien) {
    if (path.extname(d.pfad).toLowerCase() !== '.pdf') continue;
    const r = pruefePdf(fs.readFileSync(path.join(root, d.pfad)), { maxBytes: o.pdfMaxBytes, erwartung: o.pdfErwartung });
    for (const f of r.fehler) fehler.push(`${d.pfad}: PDF: ${f}`);
  }

  const verweise = []; // { von, ref }
  const anker = []; // { von, ref } (Linkziele mit #...)
  const ids = new Map(); // Datei -> Set der id-Werte
  const externe = new Map(); // url -> Fundstelle (erste)
  const meldung = new Set();
  const melde = (text) => {
    if (!meldung.has(text)) {
      meldung.add(text);
      fehler.push(text);
    }
  };
  const ref = (von, attr, wert) => {
    if (wert === null || wert.trim() === '') return;
    if (istExtern(wert)) melde(`${von}: externe Referenz (${attr}): ${wert.trim()}`);
    else verweise.push({ von, ref: wert.trim() });
  };
  // <a href>: ausgehende Links sind erlaubt (nur gesammelt), lokale Ziele und Anker muessen existieren.
  const link = (von, wert, istName) => {
    if (wert === null || wert.trim() === '') return;
    const w = wert.trim();
    if (istExtern(w)) {
      if (!externe.has(w)) externe.set(w, von);
      return;
    }
    if (w === '#') {
      if (!istName) melde(`${von}: href="#" fuehrt ins Leere (nur der Name im Kopf darf nach oben springen)`);
      return;
    }
    verweise.push({ von, ref: w });
    if (w.includes('#')) anker.push({ von, ref: w });
  };

  for (const d of dateien) {
    const ext = path.extname(d.pfad).toLowerCase();
    if (ext !== '.html' && ext !== '.css') continue;
    const text = fs.readFileSync(path.join(root, d.pfad), 'utf8');
    if (ext === '.html') ids.set(d.pfad, pruefeHtml(d.pfad, text, melde, ref, link));
    else pruefeCss(d.pfad, text, melde, ref);
  }

  // Verweisziel als Pfad relativ zu dist ('' = Startseite); null bei Ausbruch aus dist.
  const zielPfad = (von, ohne) => {
    const ziel = ohne.startsWith('/') ? path.join(root, ohne) : path.join(root, path.dirname(von), ohne);
    let rel = posix(path.relative(root, ziel));
    if (rel.startsWith('..')) return null;
    if (rel === '' || ohne.endsWith('/')) rel = rel === '' ? 'index.html' : `${rel}/index.html`;
    return rel;
  };

  for (const { von, ref: r } of verweise) {
    const ohne = r.split('#')[0].split('?')[0];
    if (ohne === '') continue;
    const rel = zielPfad(von, ohne);
    if (rel === null) melde(`${von}: Verweis ausserhalb von dist: ${r}`);
    else if (!vorhanden.has(rel)) melde(`${von}: lokale Datei fehlt: ${r}`);
  }

  for (const { von, ref: r } of anker) {
    const [pfadTeil, ...rest] = r.split('?')[0].split('#');
    const name = decodeURIComponent(rest.join('#'));
    if (name === '') continue;
    const rel = pfadTeil === '' ? von : zielPfad(von, pfadTeil);
    if (rel === null || !ids.has(rel)) continue; // Datei fehlt: oben schon gemeldet
    if (!ids.get(rel).has(name)) melde(`${von}: Anker fehlt: ${r} (kein id="${name}" in ${rel})`);
  }

  return { fehler, dateien, summe, externe: [...externe].map(([url, von]) => ({ url, von })) };
}

function pruefeHtml(rel, text, melde, ref, link) {
  const ids = new Set();
  const re = /<([a-zA-Z][^\s>\/]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  for (const m of text.matchAll(re)) {
    const tag = m[1].toLowerCase();
    const attrs = attribute(m[2]).map(([n, v]) => [n, v === null ? null : dekodiere(v)]);
    const hat = (n) => attrs.some(([a]) => a === n);
    const idWert = attrs.find(([a]) => a === 'id')?.[1];
    if (idWert) ids.add(idWert);
    const wert = (n) => attrs.find(([a]) => a === n)?.[1] ?? null;
    if (tag === 'style') melde(`${rel}: Inline-CSS (<style>-Element) nicht erlaubt`);
    if (tag === 'base') melde(`${rel}: <base>-Element nicht erlaubt`);
    if (tag === 'meta' && (wert('http-equiv') ?? '').trim().toLowerCase() === 'refresh') {
      melde(`${rel}: <meta http-equiv="refresh"> nicht erlaubt`);
    }
    if (hat('srcdoc')) melde(`${rel}: srcdoc-Attribut an <${tag}> nicht erlaubt`);
    if (tag === 'script' && !hat('src')) melde(`${rel}: Inline-Skript (<script> ohne src) nicht erlaubt`);
    for (const [name, v] of attrs) {
      if (name === 'style') melde(`${rel}: style-Attribut an <${tag}> nicht erlaubt`);
      if (/^on/.test(name)) melde(`${rel}: Ereignis-Handler ${name} an <${tag}> nicht erlaubt`);
      if (v !== null && v.replace(/[\u0000-\u0020]/g, '').toLowerCase().startsWith('javascript:')) {
        melde(`${rel}: javascript:-URL (${name}) nicht erlaubt`);
      }
    }
    if (hat('src')) ref(rel, 'src', wert('src'));
    if (hat('poster')) ref(rel, 'poster', wert('poster'));
    if (tag === 'object' && hat('data')) ref(rel, 'object data', wert('data'));
    if ((tag === 'use' || tag === 'image') && hat('href')) ref(rel, `${tag} href`, wert('href'));
    if ((tag === 'use' || tag === 'image') && hat('xlink:href')) ref(rel, `${tag} xlink:href`, wert('xlink:href'));
    if (hat('srcset') && wert('srcset') !== null) {
      for (const kandidat of wert('srcset').split(',')) ref(rel, 'srcset', kandidat.trim().split(/\s+/)[0]);
    }
    if (tag === 'link' && hat('href')) ref(rel, 'link href', wert('href'));
    if (tag === 'a' && hat('href')) {
      const klassen = (wert('class') ?? '').split(/\s+/);
      link(rel, wert('href'), klassen.includes('name'));
    }
  }
  return ids;
}

function pruefeCss(rel, text, melde, ref) {
  const css = text.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"]*?))\s*\)/gi)) {
    ref(rel, 'url()', m[1] ?? m[2] ?? m[3] ?? '');
  }
  for (const m of css.matchAll(/image-set\(/gi)) {
    let tiefe = 1;
    let j = m.index + m[0].length;
    while (j < css.length && tiefe > 0) {
      if (css[j] === '(') tiefe += 1;
      else if (css[j] === ')') tiefe -= 1;
      j += 1;
    }
    for (const s of css.slice(m.index + m[0].length, j).matchAll(/"([^"]*)"|'([^']*)'/g)) {
      ref(rel, 'image-set()', s[1] ?? s[2]);
    }
  }
  for (const m of css.matchAll(/@import\s+(?:url\(\s*)?(["']?)([^"')\s;]+)\1/gi)) {
    ref(rel, '@import', m[2]);
  }
}

export function formatListe(dateien, summe) {
  const breite = Math.max(...dateien.map((d) => String(d.bytes).length), 1);
  const zeilen = dateien.map((d) => `${String(d.bytes).padStart(breite)}  ${d.pfad}`);
  zeilen.push(`${String(summe).padStart(breite)}  Summe (${dateien.length} Dateien)`);
  return zeilen.join('\n');
}

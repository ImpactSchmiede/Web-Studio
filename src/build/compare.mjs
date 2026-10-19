// Vergleich Mockup <-> gebaute Seite (Ticket: "Mockup 1:1 als Seite"). Bewusst eng gehalten: kein allgemeiner
// HTML-Parser, sondern ein Tokenizer fuer das bekannte Mockup (Plan T-001, Auflage N2). Selbsttests: test/compare.test.mjs.
//
// ERLAUBTLISTE (eine abschliessende Liste, je Ausnahme ein Selbsttest; alles andere muss gleich sein):
//  1. Inline-Stile des Mockups sind Klassen (STYLE_KLASSEN),
//  2. Skripte im Body; hidden und data-* nur an #addr, #mail, #copy (Mail-Verschleierung, Auflage AK 7),
//  3. Mail-Adresse, mailto-Link (href) und dessen id,
//  4. Kontakt-Notiz: ein vom PO (Gate 17:30) vorgegebener Ersatztext (TEXT_ERSETZUNGEN, Mockup-Text -> Seitentext),
//  5. Foto: <picture> und <source> entfallen, am <img> die Attribute src, loading, decoding (nur an img),
//  6. Footer: Ziele impressum.html und datenschutz.html statt href="#" (nur im Footer),
//  7. Ziele statt href="#": "#termin" (Platzhalter) und der PDF-Dateiname aus profilPdf.datei der Konfiguration (nur an a.btn.ghost),
//  8. Notiz <p id="termin"> (neuer Text laut PO): der Absatz selbst, sein Text und ein <span class="ph">
//     bzw. <span class="ph ph-hell"> entfallen im Vergleich; jedes andere Element darin wird weiter verglichen (nur als <p>).
// Die Kopfzeilen (title, description, lang) werden verglichen, weitere <head>-Elemente (Favicon, Stil) nicht.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STYLE_KLASSEN = new Map([
  ['margin-top:1rem', 'mt-1'],
  ['margin-top:.6rem', 'mt-06'],
  ['margin:0', 'm0'],
  ['margin-bottom:.8rem', 'mb-08'],
  ['margin-top:2rem', 'mt-2'],
  ['margin:1.2rem 0 0', 'mt-12'],
  ['margin-top:1.4rem', 'mt-14'],
  ['font-size:.95rem', 'fs-095'],
  ['color:var(--muted)', 'c-muted'],
  ['color:#F3E3BC', 'ph-hell'],
]);
for (let i = 0; i < 14; i += 1) STYLE_KLASSEN.set(`--i:${i}`, `d${i}`);

// Mockup-Text -> Text der Seite (Ausnahme 4). Der alte Text enthielt die Aussage zur vorlaeufigen Adresse, die mit
// neue Seiten-Adresse ueberholt ist; der neue Text stammt vom PO (Thread T-002, 17:30).
export const TEXT_ERSETZUNGEN = new Map([
  [
    'Platzhalter: Die Adresse ist vorläufig, ob eine eigene Seiten-Adresse kommt, ist offen. Der Terminlink folgt.',
    'Platzhalter: Die Mailbox wird vor dem Livegang von außen getestet.',
  ],
]);

// Mockup-CSS-Regeln, die die Seite bewusst anders fuehrt. Leer: Korrekturen (Dark-Mode-Kontrast, Fokus, Druck ...)
// stehen additiv im Abschnitt "Feinschliff T-002" am Ende von site.css, keine Mockup-Regel wird veraendert.
export const GEAENDERT = [];

const FEINSCHLIFF_MARKE = '/* Feinschliff T-002 */';
const FOOTER_ZIELE = new Set(['impressum.html', 'datenschutz.html']);
const NOTIZ_IDS = new Set(['termin']);

// T-003: der Knopf "Profil als PDF laden" zeigt auf die PDF. Der Dateiname kommt aus profilPdf.datei der Konfiguration
// (Aufrufer: opt.pdfZiel; ohne Angabe die Konfiguration der Quelle), nicht aus einer Konstante.
export function standardPdfZiel() {
  const pfad = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'site.config.json');
  return JSON.parse(fs.readFileSync(pfad, 'utf8')).profilPdf.datei;
}

const ENTITAETEN = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
const entschluessle = (s) => s.replace(/&(?:amp|lt|gt|quot|#39);/g, (m) => ENTITAETEN[m]);

function attribute(rest) {
  const aus = [];
  for (const m of rest.matchAll(/([^\s=\/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    aus.push([m[1].toLowerCase(), entschluessle(m[2] ?? m[3] ?? m[4] ?? '')]);
  }
  return aus;
}

function normalisiereStil(wert) {
  return wert
    .split(';')
    .map((d) => d.trim().replace(/\s*:\s*/, ':'))
    .filter(Boolean);
}

function kopfZeilen(html) {
  const lang = /<html[^>]*\slang="([^"]*)"/i.exec(html)?.[1] ?? '';
  const titel = /<title>([^<]*)<\/title>/i.exec(html)?.[1] ?? '';
  const beschr = /<meta\s+name="description"\s+content="([^"]*)"/i.exec(html)?.[1] ?? '';
  return [`KOPF lang=${lang}`, `KOPF title=${entschluessle(titel)}`, `KOPF description=${entschluessle(beschr)}`];
}

export function normalisiere(html, { pdfZiel = standardPdfZiel() } = {}) {
  const aus = kopfZeilen(html);
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
  if (!body) return [...aus, 'FEHLER kein <body>'];
  const text = body[1].replace(/<script\b[\s\S]*?<\/script>/gi, '');
  let adresseFolgt = false;
  let imFooter = false;
  let imNotiz = false; // Ausnahme 8: Notiz-Absatz (id termin) bis </p>
  for (const m of text.matchAll(/<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|[^<]+/g)) {
    const t = m[0];
    if (t.startsWith('<!--')) continue;
    if (imNotiz) {
      if (/^<\/p\s*>$/i.test(t)) {
        imNotiz = false;
        continue;
      }
      if (!t.startsWith('<') || /^<\/span\s*>$/i.test(t) || /^<span\s+class="(?:ph|ph ph-hell)"\s*>$/i.test(t)) continue;
      // anderes Element in der Notiz: normal weiter vergleichen
    }
    if (!t.startsWith('<')) {
      const s = entschluessle(t).replace(/\s+/g, ' ').trim();
      if (s === '') continue;
      aus.push(adresseFolgt ? '{adresse}' : s);
      adresseFolgt = false;
      continue;
    }
    if (t.startsWith('</')) {
      const zu = t.replace(/\s+/g, '').toLowerCase();
      if (zu === '</picture>') continue; // Ausnahme 5
      if (zu === '</footer>') imFooter = false;
      aus.push(zu);
      continue;
    }
    const name = /^<([a-zA-Z][^\s>\/]*)/.exec(t)[1].toLowerCase();
    if (name === 'picture' || name === 'source') continue; // Ausnahme 5
    if (name === 'footer') imFooter = true;
    const attrs = new Map();
    const klassen = [];
    const roh = attribute(t.slice(name.length + 1));
    const idWert = roh.find(([a]) => a === 'id')?.[1];
    const hrefWert = roh.find(([a]) => a === 'href')?.[1] ?? '';
    if (name === 'p' && NOTIZ_IDS.has(idWert)) {
      imNotiz = true; // Ausnahme 8
      continue;
    }
    const mailLink = name === 'a' && (hrefWert.startsWith('mailto:') || idWert === 'mail');
    // Erlaubte Mail-Ausnahmen gelten nur fuer diese drei Elemente (Adresse, Mail-Knopf, Kopier-Knopf).
    const ausnahme = mailLink || (name === 'span' && idWert === 'addr') || (name === 'button' && idWert === 'copy');
    for (const [a, v] of roh) {
      if (a === 'style') {
        for (const d of normalisiereStil(v)) {
          if (STYLE_KLASSEN.has(d)) klassen.push(STYLE_KLASSEN.get(d));
          else attrs.set(`style:${d}`, '');
        }
      } else if (a === 'class') {
        klassen.push(...v.split(/\s+/).filter(Boolean));
      } else if (ausnahme && (a === 'hidden' || a.startsWith('data-'))) {
        // Mail-Verschleierung: bewusst erlaubter Unterschied
      } else if (name === 'img' && (a === 'src' || a === 'loading' || a === 'decoding')) {
        // Ausnahme 5: Bilddatei, Laden und Dekodieren
      } else {
        attrs.set(a, v);
      }
    }
    if (mailLink) {
      attrs.delete('href');
      attrs.delete('id');
    }
    const istBtnGhost = name === 'a' && klassen.includes('btn') && klassen.includes('ghost');
    if (istBtnGhost && (attrs.get('href') === '#termin' || attrs.get('href') === pdfZiel)) attrs.set('href', '#'); // Ausnahme 7
    if (imFooter && name === 'a' && FOOTER_ZIELE.has(attrs.get('href'))) attrs.set('href', '#'); // Ausnahme 6
    if (name === 'span' && attrs.get('id') === 'addr') adresseFolgt = true;
    if (klassen.length) attrs.set('class', [...new Set(klassen)].sort().join(' '));
    const teile = [...attrs.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([a, v]) => (v === '' ? a : `${a}="${v}"`));
    aus.push(`<${[name, ...teile].join(' ')}>`);
  }
  return aus;
}

// Kleinstes Differenz-Verfahren (LCS), Ausgabe: "- Mockup" / "+ Seite" in Reihenfolge.
function unterschied(a, b) {
  const n = a.length;
  const m = b.length;
  const l = new Uint16Array((n + 1) * (m + 1));
  const z = (i, j) => i * (m + 1) + j;
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      l[z(i, j)] = a[i] === b[j] ? l[z(i + 1, j + 1)] + 1 : Math.max(l[z(i + 1, j)], l[z(i, j + 1)]);
    }
  }
  const aus = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      i += 1;
      j += 1;
    } else if (j >= m || (i < n && l[z(i + 1, j)] >= l[z(i, j + 1)])) {
      aus.push(`- Mockup: ${a[i]}`);
      i += 1;
    } else {
      aus.push(`+ Seite: ${b[j]}`);
      j += 1;
    }
  }
  return aus;
}

const mitErsetzungen = (tokens) => tokens.map((t) => TEXT_ERSETZUNGEN.get(t) ?? t);

export function vergleicheSeite(mockupHtml, seiteHtml, opt = {}) {
  const a = mitErsetzungen(normalisiere(mockupHtml, opt));
  const b = normalisiere(seiteHtml, opt);
  return { unterschiede: unterschied(a, b), tokens: a.length };
}

// Nur Texte: Textknoten, alt, aria-label, title (Attribut) sowie <title> und description. Streng, ohne Struktur.
export function vergleicheTexte(mockupHtml, seiteHtml, opt = {}) {
  const texte = (tokens) => tokens.flatMap((t) => {
    if (!t.startsWith('<')) return [t];
    if (t.startsWith('</')) return [];
    return [...t.matchAll(/\s(?:alt|aria-label|title)="([^"]*)"/g)].map((m) => `[Attribut] ${m[1]}`);
  });
  const a = texte(mitErsetzungen(normalisiere(mockupHtml, opt)));
  const b = texte(normalisiere(seiteHtml, opt));
  return { unterschiede: unterschied(a, b), texte: a.length };
}

// ---- CSS ----
const norm = (s) => s.replace(/\s+/g, ' ').trim().replace(/\s*([{}:;,>])\s*/g, '$1');

function regeln(css, vorn = '') {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const aus = [];
  let i = 0;
  while (i < text.length) {
    const auf = text.indexOf('{', i);
    if (auf < 0) break;
    const kopf = norm(text.slice(i, auf));
    let tiefe = 1;
    let j = auf + 1;
    while (j < text.length && tiefe > 0) {
      if (text[j] === '{') tiefe += 1;
      else if (text[j] === '}') tiefe -= 1;
      j += 1;
    }
    const innen = text.slice(auf + 1, j - 1);
    if (innen.includes('{')) aus.push(...regeln(innen, `${vorn}${kopf}|`));
    else aus.push(`${vorn}${kopf}{${norm(innen).replace(/;$/, '')}}`);
    i = j;
  }
  return aus;
}

const ZUSATZREGELN = [
  ...[...STYLE_KLASSEN].map(([d, k]) => norm(`.${k}{${d}}`)),
  norm('[hidden]{display:none!important}'),
];

// Mockup-Regeln muessen wortgleich und in Reihenfolge in site.css stehen (ausser GEAENDERT). Vor der Marke
// "Feinschliff T-002" sind nur die Zusatzregeln fuer ehemalige Inline-Stile erlaubt; der Feinschliff-Abschnitt dahinter
// ist frei, wird aber von lookInvarianten() eingegrenzt.
export function vergleicheCss(mockupHtml, siteCss) {
  const fehler = [];
  const stil = /<style>\n?([\s\S]*?)<\/style>/.exec(mockupHtml);
  if (!stil) return { fehler: ['Mockup enthaelt kein <style>'], regeln: 0, zusatz: 0 };
  const teile = siteCss.split(FEINSCHLIFF_MARKE);
  if (teile.length !== 2) fehler.push(`Marke "${FEINSCHLIFF_MARKE}" fehlt oder steht mehrfach in site.css`);
  const alt = regeln(stil[1].replace(/url\(fonts\//g, 'url(../fonts/')).filter((r) => !GEAENDERT.some((g) => g.mockup === r));
  const neu = regeln(teile[0]);
  const benutzt = new Set();
  let ab = 0;
  for (const r of alt) {
    let k = ab;
    while (k < neu.length && neu[k] !== r) k += 1;
    if (k >= neu.length) {
      fehler.push(`Mockup-Regel fehlt, abweichend oder an anderer Stelle: ${r}`);
    } else {
      benutzt.add(k);
      ab = k + 1;
    }
  }
  let zusatz = 0;
  neu.forEach((r, k) => {
    if (benutzt.has(k)) return;
    if (ZUSATZREGELN.includes(r)) zusatz += 1;
    else fehler.push(`Zusatzregel nicht erlaubt: ${r}`);
  });
  for (const r of ZUSATZREGELN) {
    if (!neu.includes(r)) fehler.push(`Pflicht-Zusatzregel fehlt: ${r}`);
  }
  return { fehler, regeln: alt.length, zusatz };
}

// ---- Look-Invarianten (AK 5: "ohne Aenderung von Look, Farben, Schriften") ----
function flach(css, kontext = '') {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const aus = [];
  let i = 0;
  while (i < text.length) {
    const auf = text.indexOf('{', i);
    if (auf < 0) break;
    const kopf = norm(text.slice(i, auf));
    let tiefe = 1;
    let j = auf + 1;
    while (j < text.length && tiefe > 0) {
      if (text[j] === '{') tiefe += 1;
      else if (text[j] === '}') tiefe -= 1;
      j += 1;
    }
    const innen = text.slice(auf + 1, j - 1);
    if (kopf.startsWith('@keyframes')) aus.push({ kontext, selektor: kopf, innen: '' });
    else if (innen.includes('{')) aus.push(...flach(innen, kontext ? `${kontext}|${kopf}` : kopf));
    else aus.push({ kontext, selektor: kopf, innen: norm(innen) });
    i = j;
  }
  return aus;
}

// Deklarationen "name:wert" (Trenner ; ausserhalb von Anfuehrungszeichen und Klammern).
function deklarationen(innen) {
  const aus = [];
  let akt = '';
  let tiefe = 0;
  let q = '';
  for (const ch of innen) {
    if (q) {
      if (ch === q) q = '';
    } else if (ch === '"' || ch === "'") q = ch;
    else if (ch === '(') tiefe += 1;
    else if (ch === ')') tiefe -= 1;
    if (ch === ';' && tiefe === 0 && !q) {
      aus.push(akt);
      akt = '';
    } else akt += ch;
  }
  aus.push(akt);
  return aus
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const k = d.indexOf(':');
      return { name: d.slice(0, k).trim().toLowerCase(), wert: d.slice(k + 1).trim() };
    });
}

const FARBWOERTER = /\b(white|black|red|green|blue|gray|grey|yellow|orange|purple|pink|brown|cyan|magenta|silver|gold|navy|teal|maroon|olive|lime|aqua|fuchsia|violet|indigo|crimson|coral|salmon|tan|beige|ivory)\b/i;
const TOKEN_NAMEN = new Set(['--bg', '--surface', '--ink', '--muted', '--blue', '--line', '--amber', '--amber-ink', '--ph', '--r']);
const GENERISCH = new Set(['system-ui', 'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'inherit', 'initial', 'unset']);

function farbLiterale(css) {
  const t = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const aus = new Set();
  for (const m of t.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) aus.add(m[0].toLowerCase());
  for (const m of t.matchAll(/\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\([^)]*\)/gi)) aus.add(m[0].toLowerCase().replace(/\s+/g, ''));
  return aus;
}

function familien(regelListe) {
  const aus = new Set();
  for (const r of regelListe) {
    for (const d of deklarationen(r.innen)) {
      let wert = null;
      if (d.name === 'font-family') wert = d.wert;
      else if (d.name === 'font') {
        const m = /\d(?:px|rem|em|%|pt)(?:\/[^\s,]+)?\s+(.*)$/.exec(d.wert);
        wert = m ? m[1] : null;
      }
      if (wert === null) continue;
      for (const f of wert.split(',')) {
        const n = f.trim().replace(/^["']|["']$/g, '');
        if (n) aus.add(GENERISCH.has(n) ? n : n.toLowerCase());
      }
    }
  }
  return aus;
}

export function lookInvarianten(mockupHtml, siteCss) {
  const fehler = [];
  const stil = /<style>\n?([\s\S]*?)<\/style>/.exec(mockupHtml);
  if (!stil) return ['Mockup enthaelt kein <style>'];
  const mCss = stil[1];
  const mRegeln = flach(mCss);
  const sRegeln = flach(siteCss);

  // 1. Farbliterale der Seite sind eine Teilmenge der Mockup-Farben (Palette bleibt).
  const erlaubteFarben = farbLiterale(mockupHtml); // auch Inline-Stile (color:#F3E3BC)
  for (const f of farbLiterale(siteCss)) {
    if (!erlaubteFarben.has(f)) fehler.push(`Farbe nicht aus dem Mockup: ${f}`);
  }
  for (const r of sRegeln) {
    for (const d of deklarationen(r.innen)) {
      if (/^font|^content$/.test(d.name)) continue;
      const ohneVar = d.wert.replace(/var\([^)]*\)/g, '');
      const w = FARBWOERTER.exec(ohneVar);
      if (w) fehler.push(`Farbname "${w[0]}" in ${r.selektor}{${d.name}}: nur Palettenfarben erlaubt`);
    }
  }

  // 2. Tokens (:root, hell und dunkel) gleich dem Mockup; im Druck duerfen sie auf Hell zurueckgesetzt werden.
  const mTokens = new Map();
  for (const r of mRegeln.filter((x) => x.selektor === ':root')) {
    for (const d of deklarationen(r.innen)) if (d.name.startsWith('--')) mTokens.set(`${r.kontext}|${d.name}`, d.wert);
  }
  for (const r of sRegeln) {
    if (/print/.test(r.kontext)) {
      // Im Druck duerfen die Tokens nur auf die HELLEN Mockup-Werte zurueckgesetzt werden (nie dunkel, nie neu).
      for (const d of deklarationen(r.innen)) {
        if (!d.name.startsWith('--')) continue;
        if (r.selektor === ':root') {
          const soll = mTokens.get(`|${d.name}`);
          if (soll === undefined) fehler.push(`Neuer Token im Druck: ${d.name}`);
          else if (soll !== d.wert) fehler.push(`Token ${d.name} im Druck weicht vom hellen Mockup-Wert ab: ${d.wert} statt ${soll}`);
        } else if (TOKEN_NAMEN.has(d.name)) {
          fehler.push(`Palette-Token ${d.name} im Druck ausserhalb von :root gesetzt (${r.selektor})`);
        }
      }
      continue;
    }
    for (const d of deklarationen(r.innen)) {
      if (!d.name.startsWith('--')) continue;
      if (r.selektor === ':root') {
        const soll = mTokens.get(`${r.kontext}|${d.name}`);
        if (soll === undefined) fehler.push(`Neuer Token in :root (${r.kontext || 'hell'}): ${d.name}`);
        else if (soll !== d.wert) fehler.push(`Token ${d.name} (${r.kontext || 'hell'}) weicht ab: ${d.wert} statt ${soll}`);
      } else if (TOKEN_NAMEN.has(d.name)) {
        fehler.push(`Palette-Token ${d.name} ausserhalb von :root neu gesetzt (${r.selektor})`);
      }
    }
  }

  // 3. Schriften: nur die Familien des Mockups.
  const erlaubteFamilien = familien(mRegeln);
  for (const f of familien(sRegeln)) {
    if (!erlaubteFamilien.has(f)) fehler.push(`Schrift nicht aus dem Mockup: ${f}`);
  }

  // 4. Bewegung: keine Uebergaenge, @keyframes nur "rein", Animationen nur an der Grafik (.gauge).
  for (const m of siteCss.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/@keyframes\s+([\w-]+)/g)) {
    if (m[1] !== 'rein') fehler.push(`@keyframes ${m[1]}: nur "rein" (Einstiegsanimation) erlaubt`);
  }
  for (const r of sRegeln) {
    for (const d of deklarationen(r.innen)) {
      if (d.name.startsWith('transition')) fehler.push(`transition nicht erlaubt: ${r.selektor}`);
      if (d.name.startsWith('animation') && !r.selektor.split(',').every((s) => s.trim().startsWith('.gauge'))) {
        fehler.push(`animation nur an .gauge erlaubt: ${r.selektor}`);
      }
    }
  }

  // 5. Pflicht: Druck und reduzierte Bewegung sind geregelt.
  if (!sRegeln.some((r) => /@media print/.test(r.kontext))) fehler.push('Regeln fuer @media print fehlen');
  if (!sRegeln.some((r) => /prefers-reduced-motion/.test(r.kontext))) fehler.push('Regel fuer prefers-reduced-motion fehlt');
  return fehler;
}

// Profil-PDF: Eingang (Druck-Seite, CSS, Schriften), Quelle (src/profil/quelle.json) und die Aktualitaetspruefung.
// Die PDF wird einmal mit Chrome erzeugt (npm run profil, Werkzeug im Pruefordner) und eingecheckt. quelle.json bindet sie
// an ihren Eingang: aendert sich de.json, die Adresse, profil.css, eine Schrift oder der Stand, ist die PDF veraltet.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { formatiereDatum, pdfErwartung, profilSeite } from '../templates/profil.mjs';
import { lesePdf, pruefePdf } from './pdf.mjs';

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const HINWEIS = 'Neu erzeugen: npm run profil';

export const QUELLE_DATEI = 'src/profil/quelle.json';

export function leseQuelle(root) {
  const p = path.join(root, QUELLE_DATEI);
  if (!fs.existsSync(p)) throw new Error(`${QUELLE_DATEI} fehlt`);
  let q;
  try { q = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { throw new Error(`${QUELLE_DATEI} ist kein JSON: ${e.message}`); }
  const schluessel = Object.keys(q ?? {}).sort().join(',');
  if (schluessel !== 'chrome,eingang,pdf,stand') throw new Error(`${QUELLE_DATEI}: Schluessel chrome, eingang, pdf, stand erwartet (gefunden: ${schluessel})`);
  formatiereDatum(q.stand);
  for (const k of ['eingang', 'pdf']) if (!/^[0-9a-f]{64}$/.test(q[k])) throw new Error(`${QUELLE_DATEI}: ${k} ist kein SHA-256`);
  if (typeof q.chrome !== 'string' || !/^Chrome\/\d+\./.test(q.chrome)) throw new Error(`${QUELLE_DATEI}: chrome erwartet "Chrome/<Version>"`);
  return q;
}

// Alles, was in die PDF einfliesst: gerenderte Druck-Seite, profil.css, die woff2-Schriften (sortiert). hash = SHA-256 darueber.
export function profilEingang(root, { inhalt, konfig, stand } = {}) {
  const lesen = (rel) => fs.readFileSync(path.join(root, rel));
  const c = inhalt ?? JSON.parse(lesen('src/content/de.json').toString('utf8'));
  const k = konfig ?? JSON.parse(lesen('src/site.config.json').toString('utf8'));
  const html = profilSeite(c, { adresse: k.kontakt.adresse, baseUrl: k.baseUrl, stand });
  const css = lesen('src/styles/profil.css');
  const fonts = fs.readdirSync(path.join(root, 'src/fonts')).filter((f) => f.endsWith('.woff2')).sort()
    .map((name) => ({ name, daten: lesen(`src/fonts/${name}`) }));
  const h = crypto.createHash('sha256');
  h.update(`html\0${html}\0css\0`);
  h.update(css);
  for (const f of fonts) { h.update(`\0font\0${f.name}\0`); h.update(f.daten); }
  return { html, css, fonts, hash: h.digest('hex') };
}

// Verweise (href) der Druck-Seite, normalisiert wie Chrome sie in die PDF schreibt.
export function profilVerweise(html) {
  return [...html.matchAll(/\shref="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, '&')).filter((h) => /^(https:|mailto:)/.test(h))
    .map((h) => (h.startsWith('mailto:') ? h : new URL(h).href));
}

// -> { aktuell: true } oder { aktuell: false, hinweis }. Datum nur aus quelle.json, nie aus der Uhr.
export function profilAktuell(root, { inhalt, konfig } = {}) {
  root = path.resolve(root);
  const nein = (grund) => ({ aktuell: false, hinweis: `Profil-PDF ist veraltet oder ungueltig: ${grund}. ${HINWEIS}` });
  try {
    const k = konfig ?? JSON.parse(fs.readFileSync(path.join(root, 'src/site.config.json'), 'utf8'));
    const c = inhalt ?? JSON.parse(fs.readFileSync(path.join(root, 'src/content/de.json'), 'utf8'));
    const q = leseQuelle(root);
    const pdfPfad = path.join(root, 'src/profil', k.profilPdf.datei);
    if (!fs.existsSync(pdfPfad)) return nein(`src/profil/${k.profilPdf.datei} fehlt`);
    const pdf = fs.readFileSync(pdfPfad);
    if (sha(pdf) !== q.pdf) return nein('die PDF-Datei passt nicht zu quelle.json (anderer Hash)');
    const e = profilEingang(root, { inhalt: c, konfig: k, stand: q.stand });
    if (e.hash !== q.eingang) return nein('Inhalt, Adresse, profil.css, Schriften oder Stand haben sich seit der Erzeugung geaendert');
    const erlaubt = new Set(profilVerweise(e.html));
    for (const u of pruefePdf(pdf, { maxBytes: k.profilPdf.maxBytes }).uris) {
      if (!erlaubt.has(u)) return nein(`Verweis ${u} steht nicht auf der Druck-Seite`);
    }
    const r = pruefePdf(pdf, { maxBytes: k.profilPdf.maxBytes, erwartung: pdfErwartung(c) });
    if (r.fehler.length) return nein(r.fehler.join('; '));
    lesePdf(pdf);
    return { aktuell: true, stand: q.stand };
  } catch (e) {
    return nein(e.message);
  }
}

// Build: src/ -> dist/. Nur Node-Bordmittel. Deterministisch (keine Zeitstempel), LF.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDist } from './check.mjs';
import { esc, pruefeUrl } from './text.mjs';
import { seite } from '../templates/layout.mjs';
import { startseite } from '../templates/index.mjs';
import { fehlerseite } from '../templates/fehlerseite.mjs';
import { rechtlicheSeite } from '../templates/rechtliches.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const S = 'text';
// Inhaltsvertrag: jedes Blatt ist ein Text. [Element] = Liste mit mindestens einem Eintrag, [Element, n] = genau n.
const VERTRAG = {
  meta: { titel: S, beschreibung: S },
  entwurf: { titel: S, text: S, beispiel: S },
  kopf: { name: S, navigation: S, hilfe: S, beispiele: S, profil: S, vorgehen: S, kontakt: S },
  hero: { titel: S, einleitung: S, anfrage: S, profil: S, grafik: { beschreibung: S, ebenen: [S, 3] } },
  hilfe: {
    titel: S,
    einleitung: S,
    zeilen: [{ ebene: S, untertitel: S, titel: S, text: S, methoden: S }, 3],
    auch: { titel: S, text: S },
  },
  beispiele: {
    titel: S, einleitung: S, felder: [S, 3], eintraege: [{ titel: S, tag: S, werte: [S, 3] }, 3], hinweis: S,
  },
  profil: {
    titel: S,
    fakten: [{ name: S, wert: S }],
    zertifikate: { titel: S, eintraege: [{ name: S, aussteller: S }], hinweis: S },
    vermittler: { titel: S, felder: [{ name: S, wert: S }], pdf: S, pdfHinweis: S },
  },
  vorgehen: { titel: S, schritte: [{ titel: S, text: S }] },
  hintergrund: { foto: { alt: S }, titel: S, absaetze: [S] },
  kontakt: {
    titel: S, betreff: S, mailknopf: S, terminknopf: S, kopierknopf: S, kopiert: S, kopierfehler: S,
    hinweis: S, terminHinweis: S, antwort: S,
  },
  fuss: { text: S, impressum: S, datenschutz: S },
  fehlerseite: { titel: S, ueberschrift: S, text: S, zurueck: S, entwurf: S },
  rechtliches: {
    impressum: { seitentitel: S, titel: S, text: S },
    datenschutz: { seitentitel: S, titel: S, text: S },
  },
};

function pruefe(spec, wert, pfad, probleme) {
  if (spec === S) {
    if (typeof wert !== 'string' || wert.trim() === '') probleme.push(`${pfad}: Text fehlt oder ist leer`);
  } else if (Array.isArray(spec)) {
    if (!Array.isArray(wert)) return probleme.push(`${pfad}: Liste fehlt`);
    if (spec[1] !== undefined && wert.length !== spec[1]) probleme.push(`${pfad}: genau ${spec[1]} Eintraege erwartet, ${wert.length} gefunden`);
    if (wert.length === 0) probleme.push(`${pfad}: Liste ist leer`);
    wert.forEach((w, i) => pruefe(spec[0], w, `${pfad}[${i}]`, probleme));
  } else if (wert === null || typeof wert !== 'object' || Array.isArray(wert)) {
    probleme.push(`${pfad}: Abschnitt fehlt`);
  } else {
    for (const [k, s] of Object.entries(spec)) pruefe(s, wert[k], pfad ? `${pfad}.${k}` : k, probleme);
  }
}

export function pruefeInhalt(inhalt) {
  const probleme = [];
  pruefe(VERTRAG, inhalt, '', probleme);
  return probleme;
}

// Kontaktadresse: genau ein @, einfache Zeichen, Domain mit Punkt. Quelle ist nur site.config.json (kontakt.adresse).
const ADRESSE = /^([A-Za-z0-9._+-]+)@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)$/;

export function adresseTeile(adresse) {
  const m = ADRESSE.exec(typeof adresse === 'string' ? adresse : '');
  if (!m) return null;
  return { lokal: m[1], domain: m[2], rueckfall: `${m[1]} [at] ${m[2]}` };
}

function pruefeKonfig(k) {
  const p = [];
  if (typeof k?.sprache !== 'string' || !k.sprache) p.push('sprache');
  if (typeof k?.baseUrl !== 'string' || !/^https:\/\/[^/\s]+\/$/.test(k.baseUrl)) p.push('baseUrl (https://host/)');
  if (typeof k?.indexierbar !== 'boolean') p.push('indexierbar (true/false)');
  if (!Array.isArray(k?.erlaubteEndungen) || !k.erlaubteEndungen.every((e) => /^\.[a-z0-9]+$/.test(e))) p.push('erlaubteEndungen');
  if (!Number.isInteger(k?.maxBytes) || k.maxBytes <= 0) p.push('maxBytes');
  if (!Number.isInteger(k?.maxDateien) || k.maxDateien <= 0) p.push('maxDateien');
  if (!adresseTeile(k?.kontakt?.adresse)) p.push('kontakt.adresse (lokal@domain.tld, genau ein @)');
  const u = k?.kontakt?.terminUrl;
  if (typeof u !== 'string') p.push('kontakt.terminUrl (Text, leer = Platzhalter)');
  else if (u !== '') {
    try {
      pruefeUrl(u);
      if (!u.startsWith('https://')) p.push('kontakt.terminUrl (nur https://)');
    } catch (e) {
      p.push(`kontakt.terminUrl (${e.message})`);
    }
  }
  const fo = k?.foto;
  if (typeof fo?.datei !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(fo.datei)) p.push('foto.datei (Dateiname ohne Endung, a-z 0-9 -)');
  for (const m of ['breite', 'hoehe']) {
    if (!Number.isInteger(fo?.[m]) || fo[m] <= 0 || fo[m] > 512) p.push(`foto.${m} (1 bis 512)`);
  }
  if (p.length) throw new Error(`site.config.json ungueltig: ${p.join(', ')}`);
}

// Aufloesen ueber den echten Pfad (8.3-Namen unter Windows, Links), auch wenn der Ordner noch nicht existiert.
function echt(p) {
  let vorn = path.resolve(p);
  const rest = [];
  while (!fs.existsSync(vorn)) {
    rest.unshift(path.basename(vorn));
    const eltern = path.dirname(vorn);
    if (eltern === vorn) break;
    vorn = eltern;
  }
  return path.join(fs.realpathSync.native(vorn), ...rest);
}

// Unter dem Temp-Ordner nur Ordner, deren erster Pfadteil mit dem mkdtemp-Praefix beginnt (Tests: ws-).
export const TEMP_PRAEFIX = 'ws-';

function imTempOrdner(basis, ziel) {
  const r = path.relative(basis, ziel);
  if (r === '' || r.startsWith('..') || path.isAbsolute(r)) return false;
  return r.split(path.sep)[0].startsWith(TEMP_PRAEFIX);
}

export function pruefeAusgabe(outDir, root) {
  const ziel = echt(outDir);
  const erlaubt = ziel === echt(path.join(root, 'dist')) || imTempOrdner(echt(os.tmpdir()), ziel);
  if (!erlaubt) {
    throw new Error(`Ausgabeordner nicht erlaubt: ${outDir} (erlaubt: <root>/dist oder ein Ordner ${TEMP_PRAEFIX}* direkt unter dem Temp-Ordner)`);
  }
  return path.resolve(outDir);
}

export function robots(konfig) {
  if (konfig.indexierbar) return `User-agent: *\nAllow: /\nSitemap: ${konfig.baseUrl}sitemap.xml\n`;
  return 'User-agent: *\nDisallow: /\n';
}

export function sitemap(konfig) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${esc(konfig.baseUrl)}</loc></url>\n</urlset>\n`;
}

export function build({ outDir, root = ROOT, inhalt, konfig } = {}) {
  if (!outDir) throw new Error('outDir fehlt');
  root = path.resolve(root);
  const lesen = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
  const c = inhalt ?? JSON.parse(lesen('src/content/de.json'));
  const k = konfig ?? JSON.parse(lesen('src/site.config.json'));
  const ziel = pruefeAusgabe(outDir, root);
  pruefeKonfig(k);
  const probleme = pruefeInhalt(c);
  if (probleme.length) throw new Error(`Inhalt unvollstaendig (src/content/de.json):\n - ${probleme.join('\n - ')}`);

  // Erst rendern (kann an unzulaessigen URLs scheitern), dann erst dist leeren und schreiben.
  const opt = { adresse: adresseTeile(k.kontakt.adresse), terminUrl: k.kontakt.terminUrl, foto: k.foto };
  const index = seite({
    lang: k.sprache, titel: c.meta.titel, beschreibung: c.meta.beschreibung,
    skript: 'js/kontakt.js', body: startseite(c, opt),
  });
  const fehler404 = seite({
    lang: k.sprache, titel: c.fehlerseite.titel, basis: '/', body: fehlerseite(c),
  });
  const rechtlich = ['impressum', 'datenschutz'].map((n) => [
    `${n}.html`,
    seite({ lang: k.sprache, titel: c.rechtliches[n].seitentitel, body: rechtlicheSeite(c, c.rechtliches[n]) }),
  ]);
  const bilderQuelle = path.join(root, 'src/bilder');
  const bilder = fs.existsSync(bilderQuelle) ? fs.readdirSync(bilderQuelle) : [];
  for (const endung of ['.webp', '.jpg']) {
    if (!bilder.includes(`${k.foto.datei}${endung}`)) throw new Error(`Foto fehlt: src/bilder/${k.foto.datei}${endung}`);
  }
  if (!bilder.includes('favicon.ico') || !bilder.includes('apple-touch-icon.png')) throw new Error('Favicon fehlt: src/bilder/favicon.ico oder apple-touch-icon.png');

  fs.rmSync(ziel, { recursive: true, force: true });
  fs.mkdirSync(path.join(ziel, 'css'), { recursive: true });
  fs.mkdirSync(path.join(ziel, 'js'), { recursive: true });
  fs.mkdirSync(path.join(ziel, 'fonts'), { recursive: true });
  fs.mkdirSync(path.join(ziel, 'bilder'), { recursive: true });
  const schreibe = (rel, text) => fs.writeFileSync(path.join(ziel, rel), text);
  schreibe('index.html', index);
  schreibe('404.html', fehler404);
  for (const [datei, text] of rechtlich) schreibe(datei, text);
  schreibe('robots.txt', robots(k));
  schreibe('sitemap.xml', sitemap(k));
  fs.copyFileSync(path.join(root, 'src/styles/site.css'), path.join(ziel, 'css/site.css'));
  fs.copyFileSync(path.join(root, 'src/scripts/kontakt.js'), path.join(ziel, 'js/kontakt.js'));
  for (const f of fs.readdirSync(path.join(root, 'src/fonts'))) {
    fs.copyFileSync(path.join(root, 'src/fonts', f), path.join(ziel, 'fonts', f));
  }
  // Das Favicon liegt oben (Browser fragen /favicon.ico), alle anderen Bilder unter bilder/.
  for (const f of bilder) {
    fs.copyFileSync(path.join(bilderQuelle, f), path.join(ziel, f === 'favicon.ico' ? f : path.join('bilder', f)));
  }

  const r = checkDist(ziel, { endungen: k.erlaubteEndungen, maxBytes: k.maxBytes, maxFiles: k.maxDateien });
  if (r.fehler.length) throw new Error(`dist-Pruefung fehlgeschlagen:\n - ${r.fehler.join('\n - ')}`);
  return { outDir: ziel, dateien: r.dateien, summe: r.summe };
}

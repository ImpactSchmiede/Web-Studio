// npm run profil [-- --stand JJJJ-MM-TT] [--seitenbilder <ordner>] [--markierung <datei.png>]
// Erzeugt das Profil-PDF einmal mit Chrome und legt es ein: src/profil/<datei> und src/profil/quelle.json (Ergebnis wird committet,
// der Build kopiert nur). Ablauf: Druck-Seite, profil.css und Schriften in einen Temp-Ordner ws-profil-*, ueber den Pruefserver
// (nur 127.0.0.1, Port 8412-8419, CSP default-src 'self') laden, page.pdf (A4, tagged), Info-Dictionary neu schreiben
// (nur Title, Author, CreationDate, ModDate = Stand), pruefen, erst dann schreiben. Weicht die Struktur ab, bricht der Lauf sichtbar ab.
//   --stand          Datum fuer Fusszeile und Metadaten (Standard: heute, Europe/Berlin)
//   --seitenbilder   danach je PDF-Seite ein PNG aus dem Chrome-PDF-Viewer (seite-1.png ...), ueber den Server mit CSP
//   --markierung     danach ein PNG des PDF-Viewers mit markiertem Text (Strg+A), Beleg fuer die Textauswahl
// Vorher einmalig: npm ci --prefix tools/pruefung
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from '../../src/build/build.mjs';
import { profilEingang, profilVerweise, QUELLE_DATEI } from '../../src/build/profil.mjs';
import { pruefePdf, setzeInfo } from '../../src/build/pdf.mjs';
import { formatiereDatum, pdfErwartung } from '../../src/templates/profil.mjs';
import { mitChrome } from './chrome.mjs';
import { startServer } from './server.mjs';

const PORT_VON = 8412;
const PORT_BIS = 8419;
const heute = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });

export function parseArgs(a) {
  const o = { stand: heute(), seitenbilder: null, markierung: null };
  for (let i = 0; i < a.length; i += 1) {
    const wert = () => {
      if (a[i + 1] === undefined || a[i + 1].startsWith('--')) throw new Error(`${a[i]} braucht einen Wert (fehlt)`);
      i += 1;
      return a[i];
    };
    if (a[i] === '--stand') { o.stand = wert(); formatiereDatum(o.stand); } else if (a[i] === '--seitenbilder') o.seitenbilder = path.resolve(wert());
    else if (a[i] === '--markierung') o.markierung = path.resolve(wert());
    else throw new Error(`Unbekannte Option: ${a[i]} (erlaubt: --stand JJJJ-MM-TT, --seitenbilder <ordner>, --markierung <datei.png>)`);
  }
  return o;
}

// Schreibt Druck-Seite, CSS und Schriften in dir (Seite als index.html, damit der Pruefserver sie unter / ausliefert).
export function schreibeEingang(dir, { root = ROOT, stand, inhalt, konfig }) {
  const e = profilEingang(root, { inhalt, konfig, stand });
  fs.mkdirSync(path.join(dir, 'css'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'fonts'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), e.html);
  fs.writeFileSync(path.join(dir, 'css/profil.css'), e.css);
  for (const f of e.fonts) fs.writeFileSync(path.join(dir, 'fonts', f.name), f.daten);
  return e;
}

async function mitServer(dir, aufgabe) {
  let letzter;
  for (let port = PORT_VON; port <= PORT_BIS; port += 1) {
    try {
      const s = await startServer({ dir, port });
      try { return await aufgabe(s); } finally { await s.close(); }
    } catch (e) {
      if (!/Kein freier Port/.test(e.message)) throw e;
      letzter = e;
    }
  }
  throw letzter ?? new Error(`Kein freier Port in ${PORT_VON}-${PORT_BIS}`);
}

async function druckeProfil(dir) {
  return mitServer(dir, (s) => mitChrome(async (browser) => {
    const page = await browser.newPage();
    const probleme = [];
    page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) probleme.push(`${r.status()} ${r.url()}`); });
    page.on('requestfailed', (r) => probleme.push(`fehlgeschlagen: ${r.url()}`));
    page.on('request', (r) => { if (!r.url().startsWith(`${s.url}/`)) probleme.push(`Fremdanfrage: ${r.url()}`); });
    await page.goto(`${s.url}/`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    const geladen = await page.evaluate(() => ['400 1em "Atkinson Hyperlegible"', '700 1em "Atkinson Hyperlegible"', '700 1em "Bricolage Grotesque"'].map((f) => document.fonts.check(f)));
    if (probleme.length || !geladen.every(Boolean)) throw new Error(`Druck-Seite nicht sauber geladen (Schriften ${JSON.stringify(geladen)}): ${probleme.join(', ')}`);
    const pdf = Buffer.from(await page.pdf({ format: 'A4', printBackground: true, tagged: true, outline: false, preferCSSPageSize: true }));
    return { pdf, chrome: await browser.version() };
  }));
}

// PDF im Chrome-PDF-Viewer ueber den Pruefserver (mit CSP) zeigen: ein PNG je Seite, optional eines mit markiertem Text.
async function viewerBilder(pdfPfad, seiten, { bilderOrdner, markierung }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-profilansicht-'));
  try {
    fs.copyFileSync(pdfPfad, path.join(dir, 'profil.pdf'));
    fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>Ansicht</title>\n');
    await mitServer(dir, (s) => mitChrome(async (browser) => {
      const page = await browser.newPage();
      await page.setViewport({ width: 794, height: 1123 });
      const warte = (ms) => new Promise((r) => { setTimeout(r, ms); });
      if (bilderOrdner) {
        fs.mkdirSync(bilderOrdner, { recursive: true });
        for (let n = 1; n <= seiten; n += 1) {
          // Der Abfrageteil erzwingt ein neues Laden; nur der Anker wuerde im Viewer nicht neu zeichnen.
          await page.goto(`${s.url}/profil.pdf?seite=${n}#page=${n}&zoom=page-fit&toolbar=0&navpanes=0`);
          await warte(2500);
          await page.screenshot({ path: path.join(bilderOrdner, `seite-${n}.png`) });
        }
      }
      if (markierung) {
        await page.setViewport({ width: 1000, height: 1200 });
        await page.goto(`${s.url}/profil.pdf#page=1&zoom=page-fit&navpanes=0`);
        await warte(2500);
        await page.mouse.click(500, 700);
        await page.keyboard.down('Control');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Control');
        await warte(800);
        fs.mkdirSync(path.dirname(markierung), { recursive: true });
        await page.screenshot({ path: markierung });
      }
    }));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export async function erzeugeProfil(o, root = ROOT) {
  const konfig = JSON.parse(fs.readFileSync(path.join(root, 'src/site.config.json'), 'utf8'));
  const inhalt = JSON.parse(fs.readFileSync(path.join(root, 'src/content/de.json'), 'utf8'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-profil-'));
  try {
    const e = schreibeEingang(dir, { root, stand: o.stand, inhalt, konfig });
    const { pdf: roh, chrome } = await druckeProfil(dir);
    const fertig = setzeInfo(roh, { ...pdfErwartung(inhalt), stand: o.stand });
    const r = pruefePdf(fertig, { maxBytes: konfig.profilPdf.maxBytes, erwartung: pdfErwartung(inhalt) });
    const erlaubt = new Set(profilVerweise(e.html));
    for (const u of r.uris) if (!erlaubt.has(u)) r.fehler.push(`Verweis ${u} steht nicht auf der Druck-Seite`);
    if (r.fehler.length) throw new Error(`PDF-Pruefung rot, nichts geschrieben:\n - ${r.fehler.join('\n - ')}`);
    const ziel = path.join(root, 'src/profil', konfig.profilPdf.datei);
    fs.mkdirSync(path.dirname(ziel), { recursive: true });
    fs.writeFileSync(ziel, fertig);
    const quelle = { stand: o.stand, eingang: e.hash, pdf: crypto.createHash('sha256').update(fertig).digest('hex'), chrome: chrome.replace(/^HeadlessChrome\//, 'Chrome/') };
    fs.writeFileSync(path.join(root, QUELLE_DATEI), `${JSON.stringify(quelle, null, 2)}\n`);
    return { ziel, quelle, pruefung: r, bytes: fertig.length };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const r = await erzeugeProfil(o);
  console.log(`Profil-PDF geschrieben: ${path.relative(ROOT, r.ziel).split(path.sep).join('/')}`);
  console.log(`${r.pruefung.seiten} Seiten, ${r.bytes} Byte, Schriften: ${r.pruefung.schriften.map((s) => `${s.name} (${s.art})`).join(', ')}`);
  console.log(`Metadaten: ${JSON.stringify(r.pruefung.info)}`);
  console.log(`Verweise: ${r.pruefung.uris.join(' ')}`);
  console.log(`quelle.json: ${JSON.stringify(r.quelle)}`);
  if (o.seitenbilder || o.markierung) {
    await viewerBilder(r.ziel, r.pruefung.seiten, { bilderOrdner: o.seitenbilder, markierung: o.markierung });
    if (o.seitenbilder) console.log(`Seitenbilder: ${o.seitenbilder}`);
    if (o.markierung) console.log(`Markierung: ${o.markierung}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((e) => {
    console.error(`Profil-PDF fehlgeschlagen: ${e.message}`);
    process.exitCode = 1;
  });
}

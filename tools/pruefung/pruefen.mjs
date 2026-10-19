// npm run pruefen -- --ausgabe <ordner>: Pruefwerkzeug fuer die Freelancer-Seite (nicht Teil von Build und dist).
//   node tools/pruefung/pruefen.mjs --ausgabe <ordner> [--html] [--ohne-links] [--nur lighthouse,axe,html,links]
// --ausgabe ist Pflicht (kein Standardpfad). Vor dem Lauf entfernt das Werkzeug seine eigenen Berichte im Ausgabeordner
// (nur die bekannten Dateinamen und Unterordner screenshots/ und druck/), andere Dateien bleiben unberuehrt.
// --html schreibt zusaetzlich die Lighthouse-Berichte als HTML (je rund 1 MB); ohne das Flag entstehen nur die *-kurz.json.
// Ablauf: baut dist zweimal in Temp-Ordner (echte Konfiguration und Zusatzbuild mit indexierbar:true), startet den Pruefserver
// (nur 127.0.0.1, Port 8400-8449), laeuft Lighthouse (nur programmatisch, kein CLI, ohne Fehlerbericht), axe hell und dunkel auf
// 1280 und 390 px, html-validate, Linkpruefung (lokal mit check.mjs, extern je Link einmal mit Timeout) und protokolliert jede
// Anfrage der geprueften Seiten an einen anderen Host als 127.0.0.1 (fremdanfragen.txt, Erwartung: leer).
// Vorher einmalig: npm ci --prefix tools/pruefung
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build, ROOT } from '../../src/build/build.mjs';
import { checkDist } from '../../src/build/check.mjs';
import { mitChrome } from './chrome.mjs';
import { startServer } from './server.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const EIGENE_BERICHTE = [
  /^axe\.json$/, /^axe-zusammenfassung\.txt$/, /^fremdanfragen\.txt$/, /^html-validate\.txt$/, /^konsole\.txt$/, /^layout\.txt$/,
  /^links\.txt$/, /^zusammenfassung\.txt$/, /^lighthouse-.*-kurz\.json$/, /^lighthouse-.*\.html$/,
];

function args() {
  const a = process.argv.slice(2);
  const o = { ausgabe: null, html: false, links: true, nur: null };
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] === '--ausgabe') o.ausgabe = a[i + 1] ? path.resolve(a[(i += 1)]) : null;
    else if (a[i] === '--html') o.html = true;
    else if (a[i] === '--ohne-links') o.links = false;
    else if (a[i] === '--nur') o.nur = new Set(a[(i += 1)].split(','));
    else throw new Error(`Unbekannte Option: ${a[i]}`);
  }
  if (!o.ausgabe) throw new Error('--ausgabe <ordner> fehlt (Pflicht, es gibt keinen Standardpfad). Beispiel: npm run pruefen -- --ausgabe <berichtsordner>');
  return o;
}

// Entfernt nur die eigenen Berichte des vorigen Laufs aus dem Ausgabeordner.
function raeumeAus(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const eigen = e.isDirectory() ? ['screenshots', 'druck'].includes(e.name) : EIGENE_BERICHTE.some((re) => re.test(e.name));
    if (eigen) fs.rmSync(path.join(dir, e.name), { recursive: true, force: true });
  }
}

const schreibe = (dir, name, inhalt) => {
  fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
  fs.writeFileSync(path.join(dir, name), inhalt);
};

const fremdanfragen = []; // { quelle, url }
function fremd(quelle, url, port) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return;
  }
  if (['data:', 'blob:', 'about:'].includes(u.protocol)) return;
  if (u.hostname === '127.0.0.1' && Number(u.port) === port) return;
  fremdanfragen.push({ quelle, url });
}

// ---- Lighthouse
const KATEGORIEN = ['performance', 'accessibility', 'best-practices', 'seo'];

function kurzbericht(lhr) {
  const werte = Object.fromEntries(KATEGORIEN.map((k) => [k, Math.round((lhr.categories[k]?.score ?? 0) * 100)]));
  const befunde = Object.values(lhr.audits)
    .filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable' && a.scoreDisplayMode !== 'manual')
    .map((a) => ({ id: a.id, titel: a.title, score: a.score, anzeige: a.displayValue ?? null }));
  return {
    lighthouse: lhr.lighthouseVersion,
    url: lhr.finalDisplayedUrl,
    formFactor: lhr.configSettings.formFactor,
    userAgent: lhr.environment.hostUserAgent,
    werte,
    befunde,
    warnungen: lhr.runWarnings,
    netzwerk: (lhr.audits['network-requests']?.details?.items ?? []).map((i) => i.url),
  };
}

async function lighthouseLauf(url, port, form, name, ziel, ordner, html) {
  const { default: lighthouse } = await import('lighthouse');
  const desktop = form === 'desktop' ? (await import('lighthouse/core/config/desktop-config.js')).default : undefined;
  return mitChrome(async (browser) => {
    const chromePort = Number(new URL(browser.wsEndpoint()).port);
    const r = await lighthouse(url, { port: chromePort, output: [html ? 'html' : 'json'], logLevel: 'error', onlyCategories: KATEGORIEN }, desktop);
    const kurz = kurzbericht(r.lhr);
    if (html) schreibe(ordner, `${name}.html`, r.report[0] ?? r.report);
    schreibe(ordner, `${name}-kurz.json`, `${JSON.stringify(kurz, null, 2)}\n`);
    for (const u of kurz.netzwerk) fremd(`Lighthouse ${name}`, u, port);
    return { name, ziel, kurz, chrome: await browser.version() };
  });
}

// ---- axe, Layout, Screenshots, Druck
const ANSICHTEN = [
  { name: '1280', breite: 1280, hoehe: 900 },
  { name: '390', breite: 390, hoehe: 844 },
];
const SCHEMEN = [
  { name: 'hell', wert: 'light' },
  { name: 'dunkel', wert: 'dark' },
];
const SEITEN = ['index.html', 'impressum.html', 'datenschutz.html', '404.html'];
const SCREENSHOT_SEITEN = new Set(['index.html', '404.html']);

async function axeUndBilder(basis, port, ordner) {
  const axeQuelle = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  const ergebnis = { axe: [], layout: [], konsole: [], chrome: '' };
  await mitChrome(async (browser) => {
    ergebnis.chrome = await browser.version();
    for (const seite of SEITEN) {
      for (const sch of SCHEMEN) {
        for (const ans of ANSICHTEN) {
          const page = await browser.newPage();
          const kennung = `${seite} ${sch.name} ${ans.name}`;
          page.on('request', (rq) => fremd(`Seite ${kennung}`, rq.url(), port));
          page.on('console', (m) => {
            // Die Fehlerseite selbst hat Status 404; Chrome meldet das als Konsolenfehler. Unterressourcen fangen die response-Meldungen ab.
            if (seite === '404.html' && /status of 404/.test(m.text())) return;
            if (['error', 'warning'].includes(m.type())) ergebnis.konsole.push(`${kennung}: console.${m.type()}: ${m.text()}`);
          });
          page.on('pageerror', (e) => ergebnis.konsole.push(`${kennung}: pageerror: ${e.message}`));
          page.on('requestfailed', (rq) => ergebnis.konsole.push(`${kennung}: Anfrage fehlgeschlagen: ${rq.url()} (${rq.failure()?.errorText})`));
          page.on('response', (rs) => {
            if (rs.status() >= 400 && !(seite === '404.html' && rs.url().endsWith('/gibts-nicht'))) ergebnis.konsole.push(`${kennung}: HTTP ${rs.status()} ${rs.url()}`);
          });
          await page.emulateMediaFeatures([
            { name: 'prefers-color-scheme', value: sch.wert },
            { name: 'prefers-reduced-motion', value: 'reduce' },
          ]);
          await page.setViewport({ width: ans.breite, height: ans.hoehe, deviceScaleFactor: 1 });
          // 404.html wird ueber einen unbekannten tiefen Pfad geladen (Status 404, absolute Verweise).
          const url = seite === '404.html' ? `${basis}/tief/unten/gibts-nicht` : `${basis}/${seite}`;
          await page.goto(url, { waitUntil: 'networkidle0' });
          // Lazy-Bild laden lassen: einmal durchscrollen
          await page.evaluate(async () => {
            for (let y = 0; y < document.body.scrollHeight; y += 400) {
              window.scrollTo(0, y);
              await new Promise((r) => setTimeout(r, 30));
            }
            window.scrollTo(0, 0);
            await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; }))));
          });
          const layout = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
          ergebnis.layout.push({ kennung, ...layout, ok: layout.scrollWidth <= layout.innerWidth });
          await page.evaluate(axeQuelle);
          const r = await page.evaluate(() => window.axe.run(document, { resultTypes: ['violations', 'incomplete'] }));
          const vereinfache = (liste) => liste.map((v) => ({
            id: v.id, impact: v.impact, hilfe: v.help, url: v.helpUrl,
            knoten: v.nodes.map((n) => ({ ziel: n.target.join(' '), html: n.html.slice(0, 160), hinweis: n.failureSummary?.split('\n').slice(1).join(' ').slice(0, 220) ?? '' })),
          }));
          ergebnis.axe.push({ kennung, seite, schema: sch.name, breite: ans.name, verstoesse: vereinfache(r.violations), pruefen: vereinfache(r.incomplete) });
          if (SCREENSHOT_SEITEN.has(seite)) {
            await page.screenshot({ path: path.join(ordner, 'screenshots', `${seite.replace('.html', '')}-${ans.name}-${sch.name}.png`), fullPage: true });
          }
          if (seite === 'index.html') {
            const kontakt = await page.$('#kontakt');
            await kontakt.screenshot({ path: path.join(ordner, 'screenshots', `kontakt-${ans.name}-${sch.name}.png`) });
          }
          if (ans.name === '1280' && (seite === 'index.html' || seite === '404.html')) {
            await page.emulateMediaType('print');
            const pdf = await page.pdf({ format: 'A4', printBackground: false });
            schreibe(ordner, `druck/${seite.replace('.html', '')}-${sch.name}.pdf`, pdf);
            await page.emulateMediaType('screen');
          }
          await page.close();
        }
      }
    }
  });
  return ergebnis;
}

// ---- html-validate
async function htmlPruefen(distDir) {
  const { HtmlValidate } = await import('html-validate/node');
  const konfig = JSON.parse(fs.readFileSync(path.join(HIER, '.htmlvalidate.json'), 'utf8'));
  const hv = new HtmlValidate(konfig);
  const aus = [];
  for (const f of fs.readdirSync(distDir).filter((x) => x.endsWith('.html')).sort()) {
    const r = await hv.validateString(fs.readFileSync(path.join(distDir, f), 'utf8'), f);
    for (const res of r.results) {
      for (const m of res.messages) aus.push({ datei: f, regel: m.ruleId, schwere: m.severity === 2 ? 'Fehler' : 'Warnung', zeile: m.line, spalte: m.column, text: m.message });
    }
  }
  return aus;
}

// ---- Links
async function externePruefen(externe) {
  const aus = [];
  for (const e of externe) {
    if (!e.url.startsWith('https://')) {
      aus.push({ ...e, status: null, hinweis: 'nicht https, nicht geladen' });
      continue;
    }
    let status = null;
    let hinweis = '';
    for (const methode of ['HEAD', 'GET']) {
      try {
        const r = await fetch(e.url, { method: methode, redirect: 'follow', signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'web-studio-pruefung/1 (Linkpruefung, einmal je Link)' } });
        status = r.status;
        hinweis = r.url !== e.url ? `weitergeleitet nach ${r.url}` : '';
        if (r.status < 400) break;
      } catch (err) {
        hinweis = `Fehler: ${err.cause?.code ?? err.name}`;
      }
    }
    aus.push({ ...e, status, hinweis });
  }
  return aus;
}

async function main() {
  const opt = args();
  const dirs = [];
  const tmp = () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-pruefung-'));
    dirs.push(d);
    return d;
  };
  const server = [];
  const log = [];
  const wolle = (s) => !opt.nur || opt.nur.has(s);
  const puppeteerRev = (await import('puppeteer-core/internal/revisions.js').catch(() => ({}))).PUPPETEER_REVISIONS;
  const konfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/site.config.json'), 'utf8'));
  let hart = 0;
  const befund = (text) => {
    hart += 1;
    log.push(`BEFUND: ${text}`);
  };
  raeumeAus(opt.ausgabe);
  fs.mkdirSync(path.join(opt.ausgabe, 'screenshots'), { recursive: true });
  try {
    const distA = path.join(tmp(), 'dist');
    const distB = path.join(tmp(), 'dist');
    build({ outDir: distA, root: ROOT });
    build({ outDir: distB, root: ROOT, konfig: { ...konfig, indexierbar: true } });
    const a = await startServer({ dir: distA, onAnfrage: null });
    server.push(a);
    const b = await startServer({ dir: distB });
    server.push(b);
    log.push(`Pruefserver: ${a.url} (echte Konfiguration, indexierbar=${konfig.indexierbar}), ${b.url} (Zusatzbuild indexierbar=true)`);

    let chrome = '';
    const lh = [];
    if (wolle('lighthouse')) {
      for (const form of ['mobile', 'desktop']) {
        lh.push(await lighthouseLauf(`${a.url}/index.html`, a.port, form, `lighthouse-index-${form === 'mobile' ? 'mobil' : 'desktop'}`, 'echt', opt.ausgabe, opt.html));
      }
      for (const form of ['mobile', 'desktop']) {
        lh.push(await lighthouseLauf(`${b.url}/index.html`, b.port, form, `lighthouse-zusatz-indexierbar-${form === 'mobile' ? 'mobil' : 'desktop'}`, 'zusatz', opt.ausgabe, opt.html));
      }
      chrome = lh[0].chrome;
      for (const l of lh) {
        const w = l.kurz.werte;
        log.push(`Lighthouse ${l.name}: Leistung ${w.performance}, Barrierefreiheit ${w.accessibility}, Best Practices ${w['best-practices']}, SEO ${w.seo}`);
        for (const bf of l.kurz.befunde) log.push(`   - ${bf.id}: ${bf.titel} (${bf.score}${bf.anzeige ? `, ${bf.anzeige}` : ''})`);
        const grenze = l.ziel === 'zusatz' ? KATEGORIEN : KATEGORIEN.filter((k) => k !== 'seo');
        for (const k of grenze) if (w[k] < 90) befund(`Lighthouse ${l.name}: ${k} ${w[k]} < 90`);
      }
    }

    let axeErg = null;
    if (wolle('axe')) {
      axeErg = await axeUndBilder(a.url, a.port, opt.ausgabe);
      chrome = chrome || axeErg.chrome;
      schreibe(opt.ausgabe, 'axe.json', `${JSON.stringify(axeErg.axe, null, 2)}\n`);
      const zeilen = [];
      for (const e of axeErg.axe) {
        const nachSchwere = {};
        for (const v of e.verstoesse) nachSchwere[v.impact] = (nachSchwere[v.impact] ?? 0) + 1;
        zeilen.push(`${e.kennung.padEnd(28)} Verstoesse: ${JSON.stringify(nachSchwere)}  zu pruefen: ${e.pruefen.length}`);
        for (const v of e.verstoesse) {
          zeilen.push(`   [${v.impact}] ${v.id}: ${v.hilfe}`);
          for (const n of v.knoten.slice(0, 4)) zeilen.push(`      ${n.ziel}  ${n.hinweis}`);
          if (['serious', 'critical'].includes(v.impact)) befund(`axe ${e.kennung}: ${v.id} (${v.impact})`);
        }
      }
      schreibe(opt.ausgabe, 'axe-zusammenfassung.txt', `${zeilen.join('\n')}\n`);
      schreibe(opt.ausgabe, 'layout.txt', `${axeErg.layout.map((l) => `${l.ok ? 'ok ' : 'BREIT'} ${l.kennung.padEnd(28)} scrollWidth ${l.scrollWidth} / Fenster ${l.innerWidth}`).join('\n')}\n`);
      for (const l of axeErg.layout.filter((x) => !x.ok)) befund(`Seite breiter als das Fenster: ${l.kennung}`);
      schreibe(opt.ausgabe, 'konsole.txt', axeErg.konsole.length ? `${[...new Set(axeErg.konsole)].join('\n')}\n` : 'Keine Konsolenfehler, Warnungen, CSP-Verletzungen, fehlgeschlagenen oder fehlerhaften Anfragen (ausser dem erwarteten 404 der Fehlerseite).\n');
      for (const k of new Set(axeErg.konsole)) befund(`Konsole: ${k}`);
    }

    if (wolle('html')) {
      const h = await htmlPruefen(distA);
      const zeilen = h.map((m) => `${m.datei}:${m.zeile}:${m.spalte} [${m.schwere}] ${m.regel}: ${m.text}`);
      schreibe(opt.ausgabe, 'html-validate.txt', `${zeilen.length ? zeilen.join('\n') : 'Keine Fehler.'}\n${h.length} Meldung(en) in ${fs.readdirSync(distA).filter((x) => x.endsWith('.html')).length} Dateien.\n`);
      log.push(`html-validate: ${h.length} Meldung(en)`);
      for (const m of h) if (m.schwere === 'Fehler') befund(`html-validate ${m.datei}:${m.zeile} ${m.regel}`);
    }

    if (wolle('links')) {
      const r = checkDist(distA, { endungen: konfig.erlaubteEndungen, maxBytes: konfig.maxBytes, maxFiles: konfig.maxDateien });
      const zeilen = [`Lokale Links, Anker und Lieferform: ${r.fehler.length ? `${r.fehler.length} Befund(e)` : 'keine Befunde'}`, ...r.fehler.map((f) => `  - ${f}`)];
      for (const f of r.fehler) befund(`Lieferform/Link: ${f}`);
      zeilen.push('', `Externe Links (${r.externe.length}), Fundstelle in Klammern:`);
      if (opt.links) {
        for (const e of await externePruefen(r.externe)) {
          const lin = /linkedin\.com/.test(e.url) && (e.status === 999 || e.status === 429 || e.status === 403 || e.status === null);
          zeilen.push(`  ${String(e.status ?? '-').padEnd(4)} ${e.url} (${e.von})${e.hinweis ? ` ${e.hinweis}` : ''}${lin ? ' [LinkedIn blockt automatische Abrufe (999/403), von Hand pruefen]' : ''}`);
          if (!lin && (e.status === null || e.status >= 400)) befund(`Externer Link nicht erreichbar: ${e.url} (${e.status ?? e.hinweis})`);
        }
      } else {
        for (const e of r.externe) zeilen.push(`  -    ${e.url} (${e.von}) nicht geladen (--ohne-links)`);
      }
      schreibe(opt.ausgabe, 'links.txt', `${zeilen.join('\n')}\n`);
    }

    schreibe(opt.ausgabe, 'fremdanfragen.txt', fremdanfragen.length
      ? `${fremdanfragen.length} Anfrage(n) an andere Hosts als 127.0.0.1:\n${fremdanfragen.map((f) => `  ${f.quelle}: ${f.url}`).join('\n')}\n`
      : 'Keine Anfragen an andere Hosts als 127.0.0.1 (Seiten per Puppeteer, Lighthouse-Netzwerkliste). Die Linkpruefung der externen Links ruft die Ziele bewusst ab (links.txt).\n');
    for (const f of fremdanfragen) befund(`Fremdanfrage: ${f.quelle} -> ${f.url}`);

    const kopf = [
      `Pruefung vom ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC, Node ${process.version}`,
      `Chrome (Pruefung): ${chrome || '-'}; puppeteer-core 25.12.0 erwartet Chrome ${puppeteerRev?.chrome ?? '154.0.8037.57'}`,
      `Versionen: ${['lighthouse', 'axe-core', 'html-validate', 'puppeteer-core'].map((n) => `${n} ${require(`${n}/package.json`).version}`).join(', ')}`,
    ];
    schreibe(opt.ausgabe, 'zusammenfassung.txt', `${[...kopf, '', ...log, '', hart ? `${hart} harte(r) Befund(e)` : 'Keine harten Befunde.'].join('\n')}\n`);
    console.log([...kopf, '', ...log, '', hart ? `${hart} harte(r) Befund(e)` : 'Keine harten Befunde.', `Berichte: ${path.relative(ROOT, opt.ausgabe).startsWith('..') ? '<ausserhalb des Repos>' : path.relative(ROOT, opt.ausgabe).split(path.sep).join('/')}`].join('\n'));
    if (hart) process.exitCode = 1;
  } finally {
    for (const s of server) await s.close();
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  }
}

main().catch((e) => {
  console.error(`pruefen fehlgeschlagen: ${e.stack ?? e.message}`);
  process.exitCode = 2;
});

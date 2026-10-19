// Auslieferungspaket: unkomprimiertes .tar (POSIX ustar) aus dist/, dazu <datum>.sha256, und die Paketpruefung wie beim VPS-Administrator
// (Hash, Entpacken in einen leeren Ordner, Lieferform-Pruefung, robots.txt sperrt im Entwurf alles). Nur Node-Bordmittel.
// Format und Messbefunde: docs/referenzen/ustar.md. Bewusst eng: nur normale Dateien (Typ 0), kein prefix, keine Ordnereintraege,
// Namen aus [A-Za-z0-9._/-] bis 100 Zeichen, deterministisch (mtime = Paketdatum 00:00 UTC, uid/gid 0, kein Benutzername).
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkDist } from './check.mjs';
import { robots } from './build.mjs';

const BLOCK = 512;
const NAME_ZEICHEN = /^[A-Za-z0-9._/-]+$/;
const RESERVIERT = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
const ERSTE = ['index.html', '404.html'];

export const sha256Hex = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

// ---- Datum ----
export function pruefeDatum(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof d === 'string' ? d : '');
  const t = m && new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (!m || Number(m[1]) < 2000 || t.getUTCFullYear() !== Number(m[1]) || t.getUTCMonth() !== Number(m[2]) - 1 || t.getUTCDate() !== Number(m[3])) {
    throw new Error(`Datum ungueltig (JJJJ-MM-TT, gueltiger Kalendertag erwartet): ${JSON.stringify(d)}`);
  }
  return d;
}

// Heutiger Tag in Europe/Berlin als JJJJ-MM-TT.
export const heute = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });

// ---- Namen ----
// Liste der Probleme eines Eintragsnamens (leer = ok).
export function nameProbleme(name) {
  const p = [];
  if (typeof name !== 'string' || name === '') return ['Name leer'];
  if (name.length > 100) p.push(`Name laenger als 100 Zeichen (${name.length})`);
  if (!NAME_ZEICHEN.test(name)) p.push(`Name enthaelt Zeichen ausserhalb von [A-Za-z0-9._/-] (nur ASCII, kein Leerzeichen, kein Backslash, kein Doppelpunkt): ${JSON.stringify(name)}`);
  for (const seg of name.split('/')) {
    if (seg === '' || seg === '.' || seg === '..') p.push(`Name mit leerem, "." oder ".." Teil (absolut, Ordner oder Ausbruch): ${JSON.stringify(name)}`);
    else if (seg.startsWith('.')) p.push(`Name mit verstecktem Teil: ${JSON.stringify(name)}`);
    if (seg.endsWith('.') && seg !== '.' && seg !== '..') p.push(`Name-Teil endet mit Punkt: ${JSON.stringify(name)}`);
    if (RESERVIERT.test(seg)) p.push(`Name ist unter Windows reserviert (${seg}): ${JSON.stringify(name)}`);
  }
  return [...new Set(p)];
}

// ---- schreiben ----
const feld = (b, off, len, text) => Buffer.from(text, 'latin1').copy(b, off, 0, len);
const oktal = (n, stellen) => `${n.toString(8).padStart(stellen, '0')}\0`;

function kopfBlock(name, size, mtime) {
  const k = Buffer.alloc(BLOCK);
  feld(k, 0, 100, name);
  feld(k, 100, 8, '0000644\0');
  feld(k, 108, 8, '0000000\0');
  feld(k, 116, 8, '0000000\0');
  feld(k, 124, 12, oktal(size, 11));
  feld(k, 136, 12, oktal(mtime, 11));
  feld(k, 148, 8, '        ');
  k[156] = 0x30;
  feld(k, 257, 6, 'ustar\0');
  feld(k, 263, 2, '00');
  let summe = 0;
  for (let i = 0; i < BLOCK; i += 1) summe += k[i];
  feld(k, 148, 8, `${summe.toString(8).padStart(6, '0')}\0 `);
  return k;
}

// eintraege: [{ name, daten: Buffer }] in der gewuenschten Reihenfolge. opt.mtime: Sekunden seit 1970.
export function schreibeTar(eintraege, { mtime }) {
  if (!Number.isInteger(mtime) || mtime < 0) throw new Error('mtime muss eine ganze Zahl >= 0 sein');
  const gesehen = new Set();
  const teile = [];
  for (const e of eintraege) {
    const p = nameProbleme(e.name);
    if (p.length) throw new Error(`Datei ${JSON.stringify(e.name)} nicht packbar: ${p.join('; ')}`);
    const schluessel = e.name.toLowerCase();
    if (gesehen.has(schluessel)) throw new Error(`Name doppelt (auch ohne Gross-/Kleinschreibung): ${e.name}`);
    gesehen.add(schluessel);
    teile.push(kopfBlock(e.name, e.daten.length, mtime), e.daten, Buffer.alloc((BLOCK - (e.daten.length % BLOCK)) % BLOCK));
  }
  teile.push(Buffer.alloc(2 * BLOCK));
  return Buffer.concat(teile);
}

// dist -> [{ name, daten }] in Paketreihenfolge: index.html, 404.html, danach alle uebrigen Pfade nach Bytes sortiert.
export function sammleEintraege(distDir) {
  const wurzel = path.resolve(distDir);
  const alle = fs.readdirSync(wurzel, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => path.relative(wurzel, path.join(d.parentPath, d.name)).split(path.sep).join('/'));
  for (const n of ERSTE) if (!alle.includes(n)) throw new Error(`${n} fehlt in ${distDir}`);
  const rest = alle.filter((n) => !ERSTE.includes(n)).sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
  return [...ERSTE, ...rest].map((name) => ({ name, daten: fs.readFileSync(path.join(wurzel, name)) }));
}

export function erzeugePaket({ distDir, outDir, datum, ersetzen = false, konfig, maxTarBytes, pdfErwartung }) {
  const tag = pruefeDatum(datum ?? heute());
  const grenzen = { endungen: konfig.erlaubteEndungen, maxBytes: konfig.maxBytes, maxFiles: konfig.maxDateien, pdfMaxBytes: konfig.profilPdf?.maxBytes, pdfErwartung };
  const r = checkDist(distDir, grenzen);
  if (r.fehler.length) throw new Error(`dist ist nicht packbar (Lieferform):\n - ${r.fehler.join('\n - ')}`);
  const [j, mo, d] = tag.split('-').map(Number);
  const tar = schreibeTar(sammleEintraege(distDir), { mtime: Date.UTC(j, mo - 1, d) / 1000 });
  const grenze = maxTarBytes ?? konfig.maxBytes;
  if (tar.length > grenze) throw new Error(`Groesse der .tar ${tar.length} Byte ueber dem Limit ${grenze}`);
  const name = `${tag}.tar`;
  const ziel = path.join(outDir, name);
  if (fs.existsSync(ziel) && !ersetzen) throw new Error(`${ziel} ist bereits vorhanden (mit --ersetzen ueberschreiben)`);
  fs.mkdirSync(outDir, { recursive: true });
  const hash = sha256Hex(tar);
  const sha256Datei = path.join(outDir, `${tag}.sha256`);
  fs.writeFileSync(ziel, tar);
  fs.writeFileSync(sha256Datei, `${hash}  ${name}\n`);
  return { tar: ziel, sha256Datei, name, hash, dateien: r.dateien.length, bytes: tar.length };
}

// ---- lesen (streng) ----
const NULLEN = (b) => b.every((x) => x === 0);

// Oktalfeld: nur [0-7], nicht leer, abgeschlossen mit NUL oder Leerzeichen, danach nur NUL oder Leerzeichen. -> Zahl oder null.
function leseOktal(b) {
  const m = /^([0-7]+)[\0 ][\0 ]*$/.exec(b.toString('latin1'));
  return m ? parseInt(m[1], 8) : null;
}

export function leseTar(buf) {
  const befunde = [];
  const eintraege = [];
  const namen = new Set();
  let pos = 0;
  let endeGefunden = false;
  let abgebrochen = false;
  if (buf.length % BLOCK !== 0) befunde.push(`Archivgroesse ${buf.length} ist kein Vielfaches von 512 (abgeschnitten oder Daten angehaengt)`);
  while (pos + BLOCK <= buf.length) {
    const k = buf.subarray(pos, pos + BLOCK);
    if (NULLEN(k)) { endeGefunden = true; break; }
    const n = eintraege.length + 1;
    const nul = k.indexOf(0);
    const namensRest = nul >= 0 && nul < 100 ? k.subarray(nul, 100) : k.subarray(100, 100);
    const name = k.toString('latin1', 0, nul >= 0 && nul < 100 ? nul : 100);
    const wo = `Eintrag ${n} (${name})`;
    const bef = (t) => befunde.push(`${wo}: ${t}`);
    for (const p of nameProbleme(name)) bef(p);
    if (!NULLEN(namensRest)) bef('Namensfeld: Rest nach dem NUL ist nicht Null (versteckte Daten im Namensfeld)');
    if (!NULLEN(k.subarray(500, 512))) bef('Header-Bytes 500 bis 511 sind nicht Null (Rest des Headers)');
    if (namen.has(name.toLowerCase())) bef('Name doppelt (auch ohne Gross-/Kleinschreibung)');
    namen.add(name.toLowerCase());
    const zahl = (von, bis, label) => {
      const z = leseOktal(k.subarray(von, bis));
      if (z === null) bef(`Oktalfeld ${label} ungueltig (nur 0-7, nicht leer, mit NUL oder Leerzeichen abgeschlossen)`);
      return z;
    };
    const mode = zahl(100, 108, 'mode');
    zahl(108, 116, 'uid');
    zahl(116, 124, 'gid');
    const size = zahl(124, 136, 'size');
    zahl(136, 148, 'mtime');
    const soll = zahl(148, 156, 'chksum');
    let summe = 0;
    for (let i = 0; i < BLOCK; i += 1) summe += i >= 148 && i < 156 ? 0x20 : k[i];
    if (soll !== null && soll !== summe) bef(`Pruefsumme ${soll} stimmt nicht (berechnet ${summe})`);
    if (mode !== null && (mode & 0o7000) !== 0) bef(`Modus ${mode.toString(8)} setzt Sonderbits (mode)`);
    if (k.toString('latin1', 257, 263) !== 'ustar\0') bef('Magic ist nicht "ustar" (POSIX ustar erwartet)');
    if (k.toString('latin1', 263, 265) !== '00') bef('ustar-Version ist nicht "00"');
    if (k[156] !== 0x30) bef(`Typ ${JSON.stringify(String.fromCharCode(k[156]))} nicht erlaubt (nur normale Dateien, Typ 0)`);
    if (!NULLEN(k.subarray(157, 257))) bef('linkname gesetzt (Typ Link nicht erlaubt)');
    if (!NULLEN(k.subarray(265, 329))) bef('uname/gname gesetzt (Benutzername im Paket nicht erlaubt)');
    if (!NULLEN(k.subarray(345, 500))) bef('prefix gesetzt (nicht erlaubt, Namen hoechstens 100 Zeichen)');
    const dev = k.toString('latin1', 329, 345);
    if (!/^[0\0 ]*$/.test(dev)) bef('devmajor/devminor gesetzt');
    if (size === null) { abgebrochen = true; break; }
    const belegt = Math.ceil(size / BLOCK) * BLOCK;
    if (pos + BLOCK + size > buf.length) { bef(`abgeschnitten: size ${size} groesser als der Rest des Archivs (${buf.length - pos - BLOCK})`); abgebrochen = true; break; }
    eintraege.push({
      name, typ: String.fromCharCode(k[156]), mode, size, daten: buf.subarray(pos + BLOCK, pos + BLOCK + size),
    });
    pos += BLOCK + belegt;
    if (pos > buf.length) { befunde.push(`${wo}: abgeschnitten (Auffuellung fehlt)`); abgebrochen = true; break; }
  }
  if (!abgebrochen && !endeGefunden) {
    befunde.push(pos < buf.length
      ? 'abgeschnitten: unvollstaendiger Header am Ende'
      : 'Endbloecke fehlen: 2 Nullbloecke erwartet, gefunden 0 (Ende des Archivs)');
  }
  if (endeGefunden) {
    const rest = buf.subarray(pos);
    if (rest.length < 2 * BLOCK) befunde.push(`Endbloecke: 2 Nullbloecke erwartet, gefunden ${Math.floor(rest.length / BLOCK)} (Ende des Archivs)`);
    if (!NULLEN(rest)) befunde.push('Daten nach dem Ende des Archivs (nach den Nullbloecken)');
  }
  // Datei/Ordner-Kollisionen (Praefix-Konflikt, Ordner nur in Gross-/Kleinschreibung verschieden) sind Befunde, keine Ausnahmen beim Entpacken.
  const dateiLower = new Map(eintraege.map((e) => [e.name.toLowerCase(), e.name]));
  const ordnerSchreibung = new Map();
  for (const e of eintraege) {
    const teile = e.name.split('/');
    for (let i = 1; i < teile.length; i += 1) {
      const ordner = teile.slice(0, i).join('/');
      const schluessel = ordner.toLowerCase();
      if (dateiLower.has(schluessel)) befunde.push(`Ordner "${ordner}" kollidiert mit der Datei "${dateiLower.get(schluessel)}" (Praefix-Konflikt)`);
      const bekannt = ordnerSchreibung.get(schluessel);
      if (bekannt === undefined) ordnerSchreibung.set(schluessel, ordner);
      else if (bekannt !== ordner) befunde.push(`Ordnername nur in Gross-/Kleinschreibung verschieden: "${bekannt}" und "${ordner}"`);
    }
  }
  const ersten = eintraege.slice(0, 2).map((e) => e.name);
  if (eintraege.length >= 2 && (ersten[0] !== ERSTE[0] || ersten[1] !== ERSTE[1])) {
    befunde.push(`Reihenfolge: ${ERSTE.join(' und ')} muessen die ersten beiden Eintraege sein (gefunden: ${ersten.join(', ')})`);
  } else if (eintraege.length < 2 && !abgebrochen) befunde.push(`Reihenfolge: ${ERSTE.join(' und ')} fehlen`);
  return { eintraege, befunde };
}

// ---- pruefen ----
export function pruefePaket(tarPfad, { konfig, pdfErwartung } = {}) {
  if (!konfig || typeof konfig !== 'object') throw new Error('pruefePaket: konfig fehlt (Inhalt von src/site.config.json uebergeben)');
  const fehler = [];
  const ergebnis = { fehler, dateien: 0, bytes: 0, hash: null };
  const name = path.basename(tarPfad);
  if (!/^\d{4}-\d{2}-\d{2}\.tar$/.test(name)) fehler.push(`Dateiname ${name}: erwartet <JJJJ-MM-TT>.tar`);
  else {
    try { pruefeDatum(name.slice(0, 10)); } catch (e) { fehler.push(`Dateiname ${name}: ${e.message}`); }
  }
  if (!fs.existsSync(tarPfad)) { fehler.push(`${tarPfad}: Datei fehlt`); return ergebnis; }
  const tar = fs.readFileSync(tarPfad);
  ergebnis.bytes = tar.length;
  ergebnis.hash = sha256Hex(tar);

  const shaPfad = path.join(path.dirname(tarPfad), `${name.replace(/\.tar$/, '')}.sha256`);
  if (!fs.existsSync(shaPfad)) fehler.push(`${path.basename(shaPfad)}: sha256-Datei fehlt neben der .tar`);
  else {
    const text = fs.readFileSync(shaPfad, 'latin1');
    const m = /^([0-9a-f]{64}) {2}([^\n\r]+)\n$/.exec(text);
    if (!m) fehler.push(`${path.basename(shaPfad)}: sha256-Format falsch (erwartet "<64 Hex>  <name>.tar" mit zwei Leerzeichen und LF)`);
    else {
      if (m[2] !== name) fehler.push(`${path.basename(shaPfad)}: sha256-Datei nennt den Dateinamen ${m[2]}, erwartet ${name}`);
      if (m[1] !== ergebnis.hash) fehler.push(`Hash stimmt nicht: Datei ${ergebnis.hash}, sha256-Datei ${m[1]}`);
    }
  }
  const k = konfig;
  if (tar.length > k.maxBytes) fehler.push(`Groesse der .tar ${tar.length} Byte ueber dem Limit ${k.maxBytes}`);

  const { eintraege, befunde } = leseTar(tar);
  fehler.push(...befunde);
  ergebnis.dateien = eintraege.length;
  if (eintraege.length > k.maxDateien) fehler.push(`zu viele Dateien: ${eintraege.length} (Limit ${k.maxDateien})`);

  // Entpacken in einen leeren Ordner; nur Eintraege mit gueltigem, eindeutigem Namen, Ziel immer innerhalb des Ordners.
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-paket-'));
  try {
    const geschrieben = [];
    const belegt = new Set();
    for (const e of eintraege) {
      if (nameProbleme(e.name).length || belegt.has(e.name.toLowerCase())) continue;
      belegt.add(e.name.toLowerCase());
      const ziel = path.resolve(temp, e.name);
      if (!ziel.startsWith(temp + path.sep)) { fehler.push(`${e.name}: Ziel ausserhalb des Entpackordners`); continue; }
      try {
        fs.mkdirSync(path.dirname(ziel), { recursive: true });
        fs.writeFileSync(ziel, e.daten, { flag: 'wx' });
        geschrieben.push(e.name);
      } catch (err) {
        fehler.push(`${e.name}: Entpacken nicht moeglich (${err.code ?? err.message})`);
      }
    }
    const vorhanden = fs.readdirSync(temp, { recursive: true, withFileTypes: true }).filter((d) => d.isFile())
      .map((d) => path.relative(temp, path.join(d.parentPath, d.name)).split(path.sep).join('/')).sort();
    if (befunde.length === 0 && JSON.stringify(vorhanden) !== JSON.stringify([...geschrieben].sort())) {
      fehler.push('entpackte Dateien entsprechen nicht der Liste im Archiv');
    }
    const r = checkDist(temp, { endungen: k.erlaubteEndungen, maxBytes: k.maxBytes, maxFiles: k.maxDateien, pdfMaxBytes: k.profilPdf?.maxBytes, pdfErwartung });
    fehler.push(...r.fehler);
    const robotsPfad = path.join(temp, 'robots.txt');
    if (!fs.existsSync(robotsPfad)) fehler.push('robots.txt fehlt im Paket');
    else if (fs.readFileSync(robotsPfad, 'utf8') !== robots(k)) {
      fehler.push(`robots.txt weicht von der Konfiguration ab (erwartet bei indexierbar=${k.indexierbar}: ${JSON.stringify(robots(k))})`);
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
  return ergebnis;
}

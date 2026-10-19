// T-003 AK 4 und 5: Auslieferungspaket (.tar, ustar, unkomprimiert), .sha256, Paketpruefung wie beim VPS-Administrator.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { erzeugePaket, leseTar, pruefeDatum, pruefePaket, schreibeTar, sammleEintraege } from '../src/build/paket.mjs';
import { ROOT, baue, dateien, tmp } from './_hilfe.mjs';
import { gueltigeEintraege, kopf, pruefsumme, roherTar } from './_tar.mjs';

const konfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/site.config.json'), 'utf8'));
const { outDir: dist } = baue();
const DATUM = '2026-10-19';
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

const paket = (opt = {}) => erzeugePaket({ distDir: dist, outDir: tmp(), datum: DATUM, konfig, ...opt });
// Legt ein (auch kaputtes) Archiv samt passender .sha256 ab und prueft es.
function ablegen(buf, { datum = DATUM, sha256Text } = {}) {
  const dir = tmp();
  const tar = path.join(dir, `${datum}.tar`);
  fs.writeFileSync(tar, buf);
  fs.writeFileSync(path.join(dir, `${datum}.sha256`), sha256Text ?? `${sha(buf)}  ${datum}.tar\n`);
  return tar;
}
const befunde = (buf, opt) => pruefePaket(ablegen(buf), { konfig, ...opt }).fehler;

// ---- AK 4: Tar schreiben
test('AK4: Tar-Header unabhaengig nachgerechnet (Pruefsumme, Magic, Typ 0, uid/gid 0, Modus 0644, mtime = Datum 00:00 UTC)', () => {
  const p = paket();
  const t = fs.readFileSync(p.tar);
  assert.equal(t.length % 512, 0);
  let pos = 0;
  let n = 0;
  while (!t.subarray(pos, pos + 512).every((b) => b === 0)) {
    const k = t.subarray(pos, pos + 512);
    const soll = parseInt(k.toString('latin1', 148, 154), 8);
    assert.equal(soll, pruefsumme(k), `Pruefsumme Eintrag ${n}`);
    assert.equal(k.toString('latin1', 257, 263), 'ustar\0');
    assert.equal(k.toString('latin1', 263, 265), '00');
    assert.equal(String.fromCharCode(k[156]), '0');
    assert.equal(parseInt(k.toString('latin1', 100, 107), 8), 0o644);
    assert.equal(parseInt(k.toString('latin1', 108, 115), 8), 0);
    assert.equal(parseInt(k.toString('latin1', 116, 123), 8), 0);
    assert.equal(parseInt(k.toString('latin1', 136, 147), 8), Date.UTC(2026, 9, 19) / 1000);
    assert.ok(k.subarray(265, 329).every((b) => b === 0), 'uname/gname leer');
    assert.ok(k.subarray(345, 500).every((b) => b === 0), 'prefix leer');
    const groesse = parseInt(k.toString('latin1', 124, 135), 8);
    pos += 512 + Math.ceil(groesse / 512) * 512;
    n += 1;
  }
  assert.equal(n, dateien(dist).length);
  assert.ok(t.subarray(pos).every((b) => b === 0));
  assert.equal(t.length - pos, 1024, 'genau zwei Endbloecke');
});

test('AK4: Reihenfolge index.html, 404.html, dann die uebrigen Pfade nach Bytes sortiert; nur Dateien, keine Ordnereintraege', () => {
  const { eintraege } = leseTar(fs.readFileSync(paket().tar));
  const namen = eintraege.map((e) => e.name);
  assert.deepEqual(namen.slice(0, 2), ['index.html', '404.html']);
  const rest = namen.slice(2);
  assert.deepEqual(rest, [...rest].sort((a, b) => (Buffer.compare(Buffer.from(a), Buffer.from(b)))));
  assert.deepEqual([...namen].sort(), dateien(dist));
  assert.ok(namen.includes('profil-enrico-falk.pdf'));
  assert.ok(eintraege.every((e) => e.typ === '0'));
  assert.ok(!namen.some((n) => n.endsWith('/')));
});

test('AK4: unkomprimiert und kein Benutzername, kein Pfad, keine Zeit ausser dem Datum in den Bytes', () => {
  const t = fs.readFileSync(paket().tar);
  const text = t.toString('latin1');
  assert.ok(text.includes('<!doctype html>'), 'Klartext lesbar, also unkomprimiert');
  assert.notEqual(t[0], 0x1f);
  for (const verboten of [os.userInfo().username, 'C:\\Users', os.tmpdir()]) assert.ok(!text.includes(verboten), verboten);
});

test('AK4: zweimal gepackt ergibt dieselben Bytes; Dateiinhalt ist bytegleich zu dist', () => {
  const a = fs.readFileSync(paket().tar);
  const b = fs.readFileSync(paket().tar);
  assert.ok(a.equals(b));
  for (const e of leseTar(a).eintraege) assert.ok(e.daten.equals(fs.readFileSync(path.join(dist, e.name))), e.name);
});

test('AK4: .sha256 im Format von sha256sum ("<hex>  <datum>.tar\\n"), Paketname <JJJJ-MM-TT>.tar', () => {
  const p = paket();
  assert.equal(path.basename(p.tar), `${DATUM}.tar`);
  assert.equal(path.basename(p.sha256Datei), `${DATUM}.sha256`);
  const text = fs.readFileSync(p.sha256Datei, 'latin1');
  assert.match(text, /^[0-9a-f]{64} {2}2026-10-19\.tar\n$/);
  assert.equal(text.slice(0, 64), sha(fs.readFileSync(p.tar)));
  assert.equal(p.hash, text.slice(0, 64));
});

test('AK4: Datum streng JJJJ-MM-TT und ein gueltiges Kalenderdatum', () => {
  assert.equal(pruefeDatum('2026-10-19'), '2026-10-19');
  for (const d of ['2026-13-01', '2026-02-30', '19.10.2026', '2026-1-1', '', '2026-10-19x', 'heute', '0000-00-00']) {
    assert.throws(() => pruefeDatum(d), /Datum/, d);
    assert.throws(() => paket({ datum: d }), /Datum/, d);
  }
});

test('AK4: ohne --datum gilt der heutige Tag (Europe/Berlin); ein vorhandenes Paket wird nicht still ueberschrieben', () => {
  const dir = tmp();
  const heute = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
  const p = erzeugePaket({ distDir: dist, outDir: dir, konfig });
  assert.equal(path.basename(p.tar), `${heute}.tar`);
  assert.throws(() => erzeugePaket({ distDir: dist, outDir: dir, konfig }), /vorhanden|ersetzen/);
  const q = erzeugePaket({ distDir: dist, outDir: dir, konfig, ersetzen: true });
  assert.ok(fs.readFileSync(q.tar).equals(fs.readFileSync(p.tar)));
});

test('AK4: Grenzen aus der Konfiguration: Dateien, Endungen, Gesamtgroesse der .tar (Grenzfall genau gleich gruen, ein Byte weniger rot)', () => {
  const groesse = fs.statSync(paket().tar).size;
  assert.doesNotThrow(() => paket({ konfig: { ...konfig, maxBytes: 20 * 1024 * 1024 }, maxTarBytes: groesse }));
  assert.throws(() => paket({ maxTarBytes: groesse - 1 }), /Gr(ö|oe)(ß|ss)e|Byte|Limit/);
  assert.throws(() => paket({ konfig: { ...konfig, maxDateien: 5 } }), /Dateien/);
  assert.doesNotThrow(() => paket({ konfig: { ...konfig, maxDateien: dateien(dist).length } }));
  assert.throws(() => paket({ konfig: { ...konfig, erlaubteEndungen: konfig.erlaubteEndungen.filter((e) => e !== '.pdf') } }), /Endung/);
});

test('AK4: Quelle mit Symlink, versteckter Datei, SVG oder zu langem Namen bricht das Packen ab (kein Paket entsteht)', () => {
  const faelle = [
    ['versteckte Datei', (d) => fs.writeFileSync(path.join(d, '.versteckt'), 'x'), /versteckt/],
    ['.svg', (d) => fs.writeFileSync(path.join(d, 'a.svg'), '<svg/>'), /Endung/],
    ['Name > 100 Zeichen', (d) => fs.writeFileSync(path.join(d, `${'a'.repeat(98)}.txt`), 'x'), /100|lang/],
    ['Name mit Umlaut', (d) => fs.writeFileSync(path.join(d, 'größe.txt'), 'x'), /Name|ASCII|Zeichen/],
  ];
  for (const [name, f, re] of faelle) {
    const d = path.join(tmp(), 'dist');
    fs.cpSync(dist, d, { recursive: true });
    f(d);
    const ziel = tmp();
    assert.throws(() => erzeugePaket({ distDir: d, outDir: ziel, datum: DATUM, konfig }), re, name);
    assert.deepEqual(fs.readdirSync(ziel), [], `${name}: Paket darf nicht entstehen`);
  }
  const d = path.join(tmp(), 'dist');
  fs.cpSync(dist, d, { recursive: true });
  try {
    fs.symlinkSync(path.join(d, 'index.html'), path.join(d, 'link.html'));
    assert.throws(() => erzeugePaket({ distDir: d, outDir: tmp(), datum: DATUM, konfig }), /Link|Symlink|normale Datei/);
  } catch (e) {
    if (!['EPERM', 'EACCES'].includes(e.code)) throw e; // Windows ohne Symlink-Recht: Fall entfaellt, checkDist deckt ihn in check.test ab
  }
});

test('AK4: paket/ ist von git ignoriert, Paketdateien erscheinen nie in git status', () => {
  for (const f of ['paket/2026-10-19.tar', 'paket/2026-10-19.sha256']) {
    assert.equal(spawnSync('git', ['check-ignore', '-q', f], { cwd: ROOT }).status, 0, f);
  }
});

test('sammleEintraege: liest dist als [{name, daten}] in Paketreihenfolge', () => {
  const e = sammleEintraege(dist);
  assert.deepEqual(e.slice(0, 2).map((x) => x.name), ['index.html', '404.html']);
  assert.equal(e.length, dateien(dist).length);
});

// ---- schreibeTar: Eingabe-Grenzen
test('schreibeTar: wirft bei Namen ausserhalb der Positivliste, doppelten Namen und zu langem Namen', () => {
  const e = (name) => [{ name, daten: Buffer.from('x') }];
  assert.doesNotThrow(() => schreibeTar(e('a/b-c_d.html'), { mtime: 0 }));
  for (const n of ['', '../x', '/x', 'a\\b', 'a b', 'ä.html', `${'x'.repeat(101)}`, '.x', 'a//b']) {
    assert.throws(() => schreibeTar(e(n), { mtime: 0 }), /Name|Datei/, JSON.stringify(n));
  }
  assert.throws(() => schreibeTar([...e('a.html'), ...e('a.html')], { mtime: 0 }), /doppelt|Duplikat/i);
});

// ---- AK 5: Paketpruefung
test('AK5: pruefePaket gruen auf dem echten Paket (Hash, Tar, Entpacken, Lieferform inkl. PDF, robots)', () => {
  const p = paket();
  const r = pruefePaket(p.tar, { konfig });
  assert.deepEqual(r.fehler, []);
  assert.equal(r.dateien, dateien(dist).length);
  assert.equal(r.hash, p.hash);
  assert.equal(r.bytes, fs.statSync(p.tar).size);
});

test('AK5: rot bei einem veraenderten Byte (Hash), bei geaendertem Namen in der .sha256 und bei fehlender .sha256', () => {
  const p = paket();
  const t = fs.readFileSync(p.tar);
  t[600] ^= 1;
  fs.writeFileSync(p.tar, t);
  assert.ok(pruefePaket(p.tar, { konfig }).fehler.some((x) => /Hash|SHA/i.test(x)));
  const q = paket();
  fs.writeFileSync(q.sha256Datei, `${q.hash}  anderer-name.tar\n`);
  assert.ok(pruefePaket(q.tar, { konfig }).fehler.some((x) => /Name|sha256/i.test(x)));
  fs.writeFileSync(q.sha256Datei, `${q.hash} ${DATUM}.tar\n`);
  assert.ok(pruefePaket(q.tar, { konfig }).fehler.some((x) => /Format|sha256/i.test(x)), 'ein Leerzeichen statt zwei');
  fs.writeFileSync(q.sha256Datei, `${q.hash}  ${DATUM}.tar\r\n`);
  assert.ok(pruefePaket(q.tar, { konfig }).fehler.some((x) => /Format|sha256/i.test(x)), 'CRLF');
  fs.rmSync(q.sha256Datei);
  assert.ok(pruefePaket(q.tar, { konfig }).fehler.some((x) => /sha256/i.test(x)));
});

test('AK5: rot bei Dateiname der .tar ausserhalb von <JJJJ-MM-TT>.tar', () => {
  const dir = tmp();
  const buf = roherTar(gueltigeEintraege());
  fs.writeFileSync(path.join(dir, 'paket.tar'), buf);
  fs.writeFileSync(path.join(dir, 'paket.sha256'), `${sha(buf)}  paket.tar\n`);
  assert.ok(pruefePaket(path.join(dir, 'paket.tar'), { konfig }).fehler.some((x) => /Dateiname|JJJJ/.test(x)));
});

test('AK5: Referenz-Archiv aus gueltigeEintraege ist gruen (Gegenprobe fuer die Rot-Tests)', () => {
  assert.deepEqual(befunde(roherTar(gueltigeEintraege())), []);
});

const tarFaelle = [
  ['defekte Header-Pruefsumme', () => roherTar([{ ...gueltigeEintraege()[0], chksum: '0000000\0 ' }, ...gueltigeEintraege().slice(1)]), /Pr(ü|ue)fsumme/],
  ['Name ../x', () => roherTar([...gueltigeEintraege(), { name: '../x.html', daten: 'x' }]), /Name|\.\./],
  ['Name mit Doppelpunkt a:b', () => roherTar([...gueltigeEintraege(), { name: 'a:b.html', daten: 'x' }]), /Name|Zeichen/],
  ['absoluter Name', () => roherTar([...gueltigeEintraege(), { name: '/etc/x.html', daten: 'x' }]), /Name|absolut|Zeichen/],
  ['Backslash im Namen', () => roherTar([...gueltigeEintraege(), { name: 'a\\b.html', daten: 'x' }]), /Name|Zeichen/],
  ['versteckter Name', () => roherTar([...gueltigeEintraege(), { name: '.versteckt', daten: 'x' }]), /Name|versteckt/],
  ['verstecktes Segment', () => roherTar([...gueltigeEintraege(), { name: 'a/.b/c.html', daten: 'x' }]), /Name|versteckt/],
  ['Duplikat', () => roherTar([...gueltigeEintraege(), { name: 'robots.txt', daten: 'x' }]), /doppelt|Duplikat/i],
  ['Index.html neben index.html (Gross/Klein)', () => roherTar([...gueltigeEintraege(), { name: 'Index.html', daten: 'x' }]), /doppelt|Duplikat|Gro(ß|ss)/i],
  ['Windows-reservierter Name CON.txt', () => roherTar([...gueltigeEintraege(), { name: 'CON.txt', daten: 'x' }]), /reserviert|Name/],
  ['Windows-reservierter Name lpt1', () => roherTar([...gueltigeEintraege(), { name: 'a/lpt1.txt', daten: 'x' }]), /reserviert|Name/],
  ['Name endet mit Punkt', () => roherTar([...gueltigeEintraege(), { name: 'x.', daten: 'x' }]), /Name|Punkt|Leerzeichen/],
  ['Name endet mit Leerzeichen', () => roherTar([...gueltigeEintraege(), { name: 'x ', daten: 'x' }]), /Name|Punkt|Leerzeichen|Zeichen/],
  ['Symlink (Typ 2)', () => roherTar([...gueltigeEintraege(), { name: 'l.html', typ: '2', linkname: 'index.html', daten: '' }]), /Typ|Link/],
  ['Ordnereintrag (Typ 5)', () => roherTar([...gueltigeEintraege(), { name: 'ordner', typ: '5', daten: '' }]), /Typ/],
  ['Typ NUL (altes Format)', () => roherTar([...gueltigeEintraege(), { name: 'x.html', typ: '\0', daten: 'x' }]), /Typ/],
  ['falsche Reihenfolge (404 vor index)', () => roherTar([gueltigeEintraege()[1], gueltigeEintraege()[0], gueltigeEintraege()[2]]), /Reihenfolge|index\.html|404/],
  ['index.html fehlt als erstes', () => roherTar([gueltigeEintraege()[2], gueltigeEintraege()[0], gueltigeEintraege()[1]]), /Reihenfolge|index\.html/],
  ['abgeschnittenes Archiv (Daten fehlen)', () => roherTar(gueltigeEintraege(), { kuerzeUm: 1024 + 512 }), /abgeschnitten|Ende|Gr(ö|oe)(ß|ss)e/],
  ['abgeschnitten mitten im Header', () => roherTar(gueltigeEintraege(), { kuerzeUm: 1024 + 512 + 300 }), /abgeschnitten|Ende|Header|Gr(ö|oe)(ß|ss)e/],
  ['nur ein Endblock', () => roherTar(gueltigeEintraege(), { ende: 1 }), /Endbl(ö|oe)ck|Ende/],
  ['keine Endbloecke', () => roherTar(gueltigeEintraege(), { ende: 0 }), /Endbl(ö|oe)ck|Ende/],
  ['Muell nach den Endbloecken', () => roherTar(gueltigeEintraege(), { danach: Buffer.from('muell') }), /nach dem Ende|Muell|Müll/i],
  ['size groesser als der Rest', () => roherTar([{ ...gueltigeEintraege()[0], size: '77777777777\0' }, ...gueltigeEintraege().slice(1)]), /size|Gr(ö|oe)(ß|ss)e|abgeschnitten/],
  ['ungueltiges Oktalfeld (size mit 8)', () => roherTar([{ ...gueltigeEintraege()[0], size: '0000000008\0\0' }, ...gueltigeEintraege().slice(1)]), /Oktal|size/],
  ['leeres Oktalfeld (mode)', () => roherTar([{ ...gueltigeEintraege()[0], mode: '' }, ...gueltigeEintraege().slice(1)]), /Oktal|mode/],
  ['Oktalfeld ohne Abschluss (uid voll mit Ziffern)', () => roherTar([{ ...gueltigeEintraege()[0], uid: '00000000' }, ...gueltigeEintraege().slice(1)]), /Oktal|uid/],
  ['falsche Magic', () => roherTar([{ ...gueltigeEintraege()[0], magic: 'xstar\0' }, ...gueltigeEintraege().slice(1)]), /Magic|ustar/],
  ['falsche Version', () => roherTar([{ ...gueltigeEintraege()[0], version: '01' }, ...gueltigeEintraege().slice(1)]), /Version|ustar/],
  ['Benutzername gesetzt', () => roherTar([{ ...gueltigeEintraege()[0], uname: 'jemand' }, ...gueltigeEintraege().slice(1)]), /uname|Benutzer/],
  ['prefix gesetzt', () => roherTar([{ ...gueltigeEintraege()[0], prefix: 'ordner' }, ...gueltigeEintraege().slice(1)]), /prefix/],
  ['setuid-Bit im Modus', () => roherTar([{ ...gueltigeEintraege()[0], mode: '0004755\0' }, ...gueltigeEintraege().slice(1)]), /Modus|mode/],
  ['Endung .svg (Lieferform)', () => roherTar([...gueltigeEintraege(), { name: 'a.svg', daten: '<svg/>' }]), /Endung/],
  ['Lieferform: Inline-Skript in index.html', () => roherTar([{ name: 'index.html', daten: '<script>x()</script>' }, ...gueltigeEintraege().slice(1)]), /Inline-Skript/],
  ['robots.txt weicht von der Konfiguration ab', () => roherTar([...gueltigeEintraege().slice(0, 2), { name: 'robots.txt', daten: 'User-agent: *\nAllow: /\n' }]), /robots/],
  ['robots.txt fehlt', () => roherTar(gueltigeEintraege().slice(0, 2)), /robots/],
  ['robots.txt ohne LF am Ende', () => roherTar([...gueltigeEintraege().slice(0, 2), { name: 'robots.txt', daten: 'User-agent: *\nDisallow: /' }]), /robots/],
];
for (const [name, tar, erwartet] of tarFaelle) {
  test(`AK5: pruefePaket rot bei: ${name}`, () => {
    const f = befunde(tar());
    assert.ok(f.length > 0, 'kein Befund');
    assert.ok(f.some((x) => erwartet.test(x)), `Befunde: ${f.join(' | ')}`);
  });
}

test('AK5: Name mit genau 100 Zeichen (Namensfeld voll, ohne NUL, kein Endung) ist ein Befund', () => {
  const f = befunde(roherTar([...gueltigeEintraege(), { name: 'a'.repeat(100), daten: 'x' }]));
  assert.ok(f.some((x) => /Name|Endung|100/.test(x)), f.join(' | '));
});

test('AK5: Grenze der Tar-Groesse in der Paketpruefung (genau gleich gruen, ein Byte weniger rot)', () => {
  const buf = roherTar(gueltigeEintraege());
  const tar = ablegen(buf);
  assert.deepEqual(pruefePaket(tar, { konfig: { ...konfig, maxBytes: buf.length } }).fehler, []);
  assert.ok(pruefePaket(tar, { konfig: { ...konfig, maxBytes: buf.length - 1 } }).fehler.some((x) => /Gr(ö|oe)(ß|ss)e|Limit/.test(x)));
  assert.ok(pruefePaket(tar, { konfig: { ...konfig, maxDateien: 2 } }).fehler.some((x) => /Dateien/.test(x)));
});

test('AK5: Entpacken in einen leeren Temp-Ordner, der danach geloescht ist; entpackte Menge = Tar-Liste', () => {
  const vorher = fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith('ws-paket-'));
  const r = pruefePaket(paket().tar, { konfig });
  assert.deepEqual(r.fehler, []);
  assert.deepEqual(fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith('ws-paket-')).sort(), vorher.sort(), 'Temp-Ordner aufgeraeumt');
});

test('AK5: leseTar ohne Befund fuer das echte Paket; Rueckgabe enthaelt Eintraege mit Name, Daten, Typ', () => {
  const r = leseTar(fs.readFileSync(paket().tar));
  assert.deepEqual(r.befunde, []);
  assert.ok(r.eintraege.length >= 19);
});

// ---- Gegenprobe mit System-tar (bsdtar unter Windows, GNU tar unter Git/Linux). Mindestens eines ist Pflicht.
function systemTars() {
  const kandidaten = [
    process.env.SystemRoot && path.join(process.env.SystemRoot, 'System32', 'tar.exe'),
    'C:\\Program Files\\Git\\usr\\bin\\tar.exe',
    'tar',
  ].filter(Boolean);
  const gefunden = new Map();
  for (const k of kandidaten) {
    const r = spawnSync(k, ['--version'], { encoding: 'utf8' });
    if (r.status === 0) {
      const v = r.stdout.split('\n')[0];
      if (![...gefunden.values()].includes(v)) gefunden.set(k, v);
    }
  }
  return gefunden;
}

test('AK5 Gegenprobe: System-tar listet dieselbe Reihenfolge und entpackt bytegleich (Pfad und Version stehen in der Ausgabe)', () => {
  const tars = systemTars();
  assert.ok(tars.size >= 1, 'kein System-tar gefunden (bsdtar, GNU tar): Gegenprobe nicht moeglich');
  const p = paket();
  const soll = leseTar(fs.readFileSync(p.tar)).eintraege.map((e) => e.name);
  for (const [programm, version] of tars) {
    console.log(`# Gegenprobe mit ${programm} (${version})`);
    // Relativer Name mit cwd: GNU tar deutet "C:\\..." als Host.
    const liste = spawnSync(programm, ['-tf', path.basename(p.tar)], { cwd: path.dirname(p.tar), encoding: 'utf8' });
    assert.equal(liste.status, 0, `${programm}: ${liste.stderr}`);
    assert.deepEqual(liste.stdout.split(/\r?\n/).filter(Boolean), soll, programm);
    const ziel = tmp();
    fs.copyFileSync(p.tar, path.join(ziel, 'p.tar'));
    const x = spawnSync(programm, ['-xf', 'p.tar'], { cwd: ziel, encoding: 'utf8' });
    assert.equal(x.status, 0, `${programm}: ${x.stderr}`);
    assert.deepEqual(dateien(ziel).filter((n) => n !== 'p.tar'), dateien(dist), programm);
    for (const n of dateien(dist)) assert.ok(fs.readFileSync(path.join(ziel, n)).equals(fs.readFileSync(path.join(dist, n))), `${programm}: ${n}`);
  }
});

test('Gegenprobe umgekehrt: Archiv von System-tar (ustar) wird vom strengen Leser verstanden oder klar abgelehnt', () => {
  const tars = systemTars();
  assert.ok(tars.size >= 1);
  for (const [programm] of tars) {
    const ziel = tmp();
    fs.writeFileSync(path.join(ziel, 'a.txt'), 'x');
    const r = spawnSync(programm, ['--format=ustar', '-cf', 'out.tar', 'a.txt'], { cwd: ziel, encoding: 'utf8' });
    if (r.status !== 0) continue;
    const l = leseTar(fs.readFileSync(path.join(ziel, 'out.tar')));
    assert.deepEqual(l.eintraege.map((e) => e.name), ['a.txt'], `${programm}: ${l.befunde.join(' | ')}`);
  }
});

// ---- Nacharbeit T-003 (Diff-Check): Kollisionen, Header-Reste, Konfiguration, Sollwerte der PDF
const mitEnde = (extra) => [...gueltigeEintraege(), ...extra];
const nacharbeitTar = [
  ['m5 Datei a und Ordner a/ (Praefix-Konflikt)', () => roherTar(mitEnde([{ name: 'a', daten: 'x' }, { name: 'a/b.html', daten: 'x' }])), /Ordner|Praefix|Kollision/],
  ['m5 Ordner a/ vor Datei a', () => roherTar(mitEnde([{ name: 'a/b.html', daten: 'x' }, { name: 'a', daten: 'x' }])), /Ordner|Praefix|Kollision/],
  ['m5 Ordner nur in Gross-/Kleinschreibung verschieden (a/ und A/)', () => roherTar(mitEnde([{ name: 'a/b.html', daten: 'x' }, { name: 'A/c.html', daten: 'x' }])), /Ordner|Gro(ß|ss)/],
  ['m6 Rest des Namensfelds nach NUL (Name mit Benutzernamen dahinter)', () => roherTar(mitEnde([{ name: 'x.html\0AI User', daten: 'x' }])), /Namensfeld|Rest|NUL/],
  ['m6 Bytes 500 bis 511 des Headers nicht Null', () => roherTar([{ ...gueltigeEintraege()[0], ende: 'AI User' }, ...gueltigeEintraege().slice(1)]), /Bytes 500|Rest|Header/],
];
for (const [name, tar, erwartet] of nacharbeitTar) {
  test(`AK5: pruefePaket rot (Befund statt Ausnahme) bei: ${name}`, () => {
    const f = befunde(tar());
    assert.ok(f.some((x) => erwartet.test(x)), `Befunde: ${JSON.stringify(f)}`);
  });
}

test('m8: pruefePaket ohne konfig bricht mit klarer Meldung ab (statt TypeError)', () => {
  const tar = ablegen(roherTar(gueltigeEintraege()));
  assert.throws(() => pruefePaket(tar), /konfig.*fehlt|site\.config/);
  assert.throws(() => pruefePaket(tar, {}), /konfig.*fehlt|site\.config/);
});

// QA-1: Sollwerte von Title und Author aus de.json, nicht nur die Feldnamen
const inhalt = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/de.json'), 'utf8'));
const SOLL = { Title: `${inhalt.kopf.name} \u2013 ${inhalt.kopf.profil}`, Author: inhalt.kopf.name };

function distMitFremdemTitel() {
  const d = path.join(tmp(), 'dist');
  fs.cpSync(dist, d, { recursive: true });
  const pdf = fs.readFileSync(path.join(d, konfig.profilPdf.datei)).toString('latin1');
  assert.ok(pdf.includes('/Author (Enrico Falk)'));
  // gleiche Laenge, Offsets bleiben: Autor "Enrico Falk" -> "Fremdautor1"
  fs.writeFileSync(path.join(d, konfig.profilPdf.datei), Buffer.from(pdf.replace('/Author (Enrico Falk)', '/Author (Fremdautor1)'), 'latin1'));
  return d;
}

test('QA-1: pruefePaket mit pdfErwartung ist rot bei falschem Autor, gruen bei den Sollwerten; erzeugePaket lehnt das Packen ab', () => {
  const p = paket();
  assert.deepEqual(pruefePaket(p.tar, { konfig, pdfErwartung: SOLL }).fehler, []);
  const d = distMitFremdemTitel();
  assert.throws(() => erzeugePaket({ distDir: d, outDir: tmp(), datum: DATUM, konfig, pdfErwartung: SOLL }), /Author/);
  const q = erzeugePaket({ distDir: d, outDir: tmp(), datum: DATUM, konfig });
  assert.ok(pruefePaket(q.tar, { konfig, pdfErwartung: SOLL }).fehler.some((x) => /Author/.test(x)));
  assert.deepEqual(pruefePaket(q.tar, { konfig }).fehler, [], 'ohne Sollwerte nur die allgemeine Pruefung');
});

test('QA-1: npm run paket:pruefen prueft die Sollwerte aus de.json (Exit 1 bei fremdem Autor, 0 beim echten Paket)', () => {
  const q = erzeugePaket({ distDir: distMitFremdemTitel(), outDir: tmp(), datum: DATUM, konfig });
  const r = spawnSync(process.execPath, ['scripts/paket-pruefen.mjs', q.tar], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Author/);
  assert.equal(spawnSync(process.execPath, ['scripts/paket-pruefen.mjs', paket().tar], { cwd: ROOT, encoding: 'utf8' }).status, 0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { build, pruefeAusgabe } from '../src/build/build.mjs';
import { ROOT, baue, dateien, lies, tmp } from './_hilfe.mjs';

const inhalt = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/de.json'), 'utf8'));
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const klon = () => structuredClone(inhalt);

function strings(wert, pfad = '') {
  if (typeof wert === 'string') return [[pfad, wert]];
  if (Array.isArray(wert)) return wert.flatMap((w, i) => strings(w, `${pfad}[${i}]`));
  if (wert && typeof wert === 'object') {
    return Object.entries(wert).flatMap(([k, w]) => strings(w, pfad ? `${pfad}.${k}` : k));
  }
  return [];
}

const { outDir } = baue();

test('AK4: dist enthaelt genau die Pflichtdateien, nur normale Dateien', () => {
  assert.deepEqual(dateien(outDir), [
    '404.html',
    'bilder/apple-touch-icon.png',
    'bilder/foto-vorlaeufig.jpg',
    'bilder/foto-vorlaeufig.webp',
    'css/site.css',
    'datenschutz.html',
    'favicon.ico',
    'fonts/LICENSE-Atkinson-Hyperlegible.txt',
    'fonts/LICENSE-Bricolage-Grotesque.txt',
    'fonts/atkinson-hyperlegible-latin-400-italic.woff2',
    'fonts/atkinson-hyperlegible-latin-400-normal.woff2',
    'fonts/atkinson-hyperlegible-latin-700-normal.woff2',
    'fonts/bricolage-grotesque-latin-wght-normal.woff2',
    'impressum.html',
    'index.html',
    'js/kontakt.js',
    'profil-enrico-falk.pdf',
    'robots.txt',
    'sitemap.xml',
  ]);
  for (const e of fs.readdirSync(outDir, { recursive: true })) {
    const st = fs.lstatSync(path.join(outDir, e));
    assert.ok(st.isFile() || st.isDirectory(), e);
    assert.ok(!e.split(path.sep).some((t) => t.startsWith('.')), e);
  }
});

test('AK4: robots.txt sperrt alles, kein noindex-Meta', () => {
  assert.equal(lies(outDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  for (const s of ['index.html', '404.html', 'impressum.html', 'datenschutz.html']) {
    assert.doesNotMatch(lies(outDir, s), /noindex/i, s);
  }
});

test('AK4: robots.txt bei indexierbar=true erlaubt und nennt die Sitemap', () => {
  const k = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/site.config.json'), 'utf8'));
  const { outDir: o } = baue({ konfig: { ...k, indexierbar: true } });
  assert.equal(lies(o, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://enricofalk.de/sitemap.xml\n');
});

test('AK4: sitemap nennt nur die Basis-URL, kein lastmod', () => {
  const s = lies(outDir, 'sitemap.xml');
  assert.match(s, /<loc>https:\/\/enricofalk\.de\/<\/loc>/);
  assert.equal((s.match(/<loc>/g) || []).length, 1);
  assert.doesNotMatch(s, /lastmod/);
});

test('AK4: zwei Builds sind bytegleich', () => {
  const { outDir: b } = baue();
  const a = dateien(outDir);
  assert.deepEqual(dateien(b), a);
  for (const f of a) {
    assert.ok(fs.readFileSync(path.join(outDir, f)).equals(fs.readFileSync(path.join(b, f))), f);
  }
});

test('AK5: Schriften und Lizenzen sind hash-gleich zur Quelle, Lizenzen nennen die OFL', () => {
  const quelle = fs.readdirSync(path.join(ROOT, 'src/fonts'));
  assert.equal(quelle.length, 6);
  for (const f of quelle) {
    assert.equal(sha(path.join(outDir, 'fonts', f)), sha(path.join(ROOT, 'src/fonts', f)), f);
    if (f.endsWith('.txt')) assert.match(lies(outDir, `fonts/${f}`), /SIL Open Font License/);
  }
});

test('Bilder in dist sind hash-gleich zu src/bilder (Build kopiert nur, Favicon liegt oben)', () => {
  for (const f of ['foto-vorlaeufig.webp', 'foto-vorlaeufig.jpg', 'apple-touch-icon.png']) {
    assert.equal(sha(path.join(outDir, 'bilder', f)), sha(path.join(ROOT, 'src/bilder', f)), f);
  }
  assert.equal(sha(path.join(outDir, 'favicon.ico')), sha(path.join(ROOT, 'src/bilder/favicon.ico')));
  assert.ok(!fs.existsSync(path.join(outDir, 'bilder/favicon.ico')));
});

test('AK3: kein Inhaltstext (>= 12 Zeichen) steht in den Templates', () => {
  const dir = path.join(ROOT, 'src/templates');
  const dateienT = fs.readdirSync(dir).filter((f) => f.endsWith('.mjs'));
  assert.ok(dateienT.length >= 4);
  const quelltext = dateienT.map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const treffer = strings(inhalt)
    .filter(([, s]) => s.length >= 12 && quelltext.includes(s))
    .map(([k]) => k);
  assert.deepEqual(treffer, []);
});

test('AK3: geaenderter Text erscheint in der Ausgabe, maskiert', () => {
  const c = klon();
  c.hero.titel = 'Ganz neuer Titel <b>&</b>';
  const { outDir: o } = baue({ inhalt: c });
  assert.match(lies(o, 'index.html'), /Ganz neuer Titel &lt;b&gt;&amp;&lt;\/b&gt;/);
  assert.doesNotMatch(lies(o, 'index.html'), /Wenn es im Unternehmen hakt/);
});

test('AK3: fehlender Schluessel bricht den Build mit Schluesselnamen ab', () => {
  const c = klon();
  delete c.kontakt.betreff;
  assert.throws(() => baue({ inhalt: c }), /kontakt\.betreff/);
  const d = klon();
  d.hilfe.zeilen[1].titel = 5;
  assert.throws(() => baue({ inhalt: d }), /hilfe\.zeilen\[1\]\.titel/);
  const e = klon();
  delete e.fehlerseite.entwurf;
  assert.throws(() => baue({ inhalt: e }), /fehlerseite\.entwurf/);
  const f = klon();
  f.beispiele.eintraege[1].werte.pop();
  assert.throws(() => baue({ inhalt: f }), /beispiele\.eintraege\[1\]\.werte/);
  const g = klon();
  g.profil.zertifikate.eintraege = [];
  assert.throws(() => baue({ inhalt: g }), /profil\.zertifikate\.eintraege/);
  const h = klon();
  delete h.rechtliches.impressum.text;
  assert.throws(() => baue({ inhalt: h }), /rechtliches\.impressum\.text/);
});

test('AK3: unzulaessige URL im Inhalt bricht den Build ab', () => {
  const c = klon();
  c.hilfe.auch.text = 'x [y](javascript:alert(1)) z';
  assert.throws(() => baue({ inhalt: c }), /URL/i);
});

test('Build leert nur dist unter root oder unter dem Temp-Ordner', () => {
  const ziel = path.join(ROOT, 'gesperrt-testordner');
  fs.mkdirSync(ziel, { recursive: true });
  fs.writeFileSync(path.join(ziel, 'marke.txt'), 'x');
  try {
    assert.throws(() => build({ outDir: ziel, root: ROOT }), /Ausgabeordner/);
    assert.throws(() => build({ outDir: path.join(ROOT, 'src'), root: ROOT }), /Ausgabeordner/);
    assert.ok(fs.existsSync(path.join(ziel, 'marke.txt')));
    assert.ok(fs.existsSync(path.join(ROOT, 'src/content/de.json')));
  } finally {
    fs.rmSync(ziel, { recursive: true, force: true });
  }
});

test('Ausgabeziel unter dem Temp-Ordner nur mit ws--Praefix direkt unter dem Temp-Ordner', () => {
  const basis = path.resolve(os.tmpdir());
  assert.equal(pruefeAusgabe(path.join(basis, 'ws-abc123', 'dist'), ROOT), path.join(basis, 'ws-abc123', 'dist'));
  assert.ok(pruefeAusgabe(path.join(basis, 'ws-abc123'), ROOT));
  assert.equal(pruefeAusgabe(path.join(ROOT, 'dist'), ROOT), path.join(ROOT, 'dist'));
  for (const p of [basis, path.join(basis, 'fremd'), path.join(basis, 'fremd', 'ws-x'), path.join(basis, 'xws-abc'), path.join(basis, '..', 'ws-abc')]) {
    assert.throws(() => pruefeAusgabe(p, ROOT), /Ausgabeordner/, p);
  }
});

test('Build lehnt einen fremden Ordner im Temp-Ordner ab und laesst ihn unveraendert', () => {
  const fremd = fs.mkdtempSync(path.join(os.tmpdir(), 'fremd-'));
  try {
    fs.writeFileSync(path.join(fremd, 'marke.txt'), 'x');
    assert.throws(() => build({ outDir: fremd, root: ROOT }), /Ausgabeordner/);
    assert.ok(fs.existsSync(path.join(fremd, 'marke.txt')));
  } finally {
    fs.rmSync(fremd, { recursive: true, force: true });
  }
});

test('Build leert vorhandene Reste im Ausgabeordner', () => {
  const o = path.join(tmp(), 'dist');
  fs.mkdirSync(o, { recursive: true });
  fs.writeFileSync(path.join(o, 'alt.txt'), 'alt');
  build({ outDir: o, root: ROOT });
  assert.ok(!fs.existsSync(path.join(o, 'alt.txt')));
});

test('AK7: HTML ohne Klartext-Adresse und ohne mailto, Rueckfalltext vorhanden', () => {
  const h = lies(outDir, 'index.html');
  assert.doesNotMatch(h, /mailto:/i);
  assert.doesNotMatch(h, /[A-Za-z0-9._+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/);
  assert.ok(h.includes('kontakt [at] enricofalk.de'));
  assert.match(h, /id="mail"[^>]*\shidden/);
  assert.match(h, /id="copy"[^>]*\shidden/);
  const js = lies(outDir, 'js/kontakt.js');
  assert.doesNotMatch(js, /[A-Za-z0-9._+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/);
  assert.ok(!js.includes('enricofalk'));
});

test('AK7: Seite referenziert Stil und Skript als eigene Dateien', () => {
  const h = lies(outDir, 'index.html');
  assert.match(h, /<link rel="stylesheet" href="css\/site\.css">/);
  assert.match(h, /<script src="js\/kontakt\.js" defer><\/script>/);
  assert.match(lies(outDir, 'css/site.css'), /url\(\.\.\/fonts\/bricolage-grotesque-latin-wght-normal\.woff2\)/);
});

test('404: Entwurfsbanner, absolutes CSS, kein Skript, Links auf /', () => {
  const h = lies(outDir, '404.html');
  assert.match(h, /class="entwurf"/);
  assert.match(h, /href="\/css\/site\.css"/);
  assert.doesNotMatch(h, /<script/i);
  assert.match(h, /href="\/"/);
});

test('Konfiguration: Pflichtfelder fuer Kontakt und Foto werden geprueft', () => {
  const k = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/site.config.json'), 'utf8'));
  for (const kaputt of [
    { ...k, kontakt: undefined },
    { ...k, kontakt: { adresse: 'a@b.de' } },
    { ...k, foto: undefined },
    { ...k, foto: { ...k.foto, breite: 513 } },
    { ...k, foto: { ...k.foto, datei: '../x' } },
  ]) {
    assert.throws(() => baue({ konfig: kaputt }), /site\.config\.json ungueltig/);
  }
});

test('node --check fuer jede Quelldatei (auch tools/)', () => {
  const liste = [];
  const geh = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'node_modules') geh(p);
      } else if (/\.(mjs|js)$/.test(e.name)) liste.push(p);
    }
  };
  for (const d of ['src', 'scripts', 'test', 'tools']) geh(path.join(ROOT, d));
  assert.ok(liste.length >= 16);
  for (const n of ['pruefen.mjs', 'bilder.mjs', 'server.mjs']) assert.ok(liste.some((f) => f.endsWith(n)), n);
  for (const f of liste) {
    const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});

test('keine npm-Abhaengigkeiten im Root, Skript pruefen vorhanden', () => {
  const p = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(p.private, true);
  assert.equal(p.type, 'module');
  assert.equal(p.dependencies, undefined);
  assert.equal(p.devDependencies, undefined);
  assert.ok(p.scripts.build && p.scripts.test && p.scripts.check);
  assert.equal(p.scripts.pruefen, 'node tools/pruefung/pruefen.mjs');
});

test('Pruefwerkzeug: eigene package.json mit festen Versionen, Lockfile, .npmrc, node_modules ignoriert', () => {
  const dir = path.join(ROOT, 'tools/pruefung');
  const p = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  assert.equal(p.private, true);
  assert.equal(p.dependencies, undefined);
  assert.deepEqual(Object.keys(p.devDependencies).sort(), ['axe-core', 'html-validate', 'lighthouse', 'puppeteer-core']);
  for (const [n, v] of Object.entries(p.devDependencies)) assert.match(v, /^\d+\.\d+\.\d+$/, `${n}: ${v} nicht fest`);
  assert.deepEqual(
    [p.devDependencies.lighthouse, p.devDependencies['axe-core'], p.devDependencies['html-validate'], p.devDependencies['puppeteer-core']],
    ['13.5.0', '4.14.0', '11.16.2', '25.12.0'],
  );
  const npmrc = fs.readFileSync(path.join(dir, '.npmrc'), 'utf8');
  assert.match(npmrc, /^ignore-scripts=true$/m);
  assert.match(npmrc, /^save-exact=true$/m);
  assert.match(npmrc, /^fund=false$/m);
  const lock = JSON.parse(fs.readFileSync(path.join(dir, 'package-lock.json'), 'utf8'));
  assert.equal(lock.lockfileVersion, 3);
  assert.ok(Object.keys(lock.packages).length > 100);
  assert.ok(Object.values(lock.packages).every((q) => !q.hasInstallScript), 'Paket mit Install-Skript im Lockfile');
  assert.match(fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8'), /^node_modules\/$/m);
  assert.ok(fs.existsSync(path.join(dir, '.htmlvalidate.json')));
});

test('Trennung: keine Datei unter src/ oder scripts/ importiert aus tools/, der Build kennt keine Pruefpakete', () => {
  const geh = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? geh(p) : [p];
  });
  for (const f of [...geh(path.join(ROOT, 'src')), ...geh(path.join(ROOT, 'scripts'))].filter((x) => /\.(mjs|js)$/.test(x))) {
    const t = fs.readFileSync(f, 'utf8');
    assert.doesNotMatch(t, /tools[\\/]/, f);
    assert.doesNotMatch(t, /from\s+['"](lighthouse|axe-core|html-validate|puppeteer-core)/, f);
  }
});

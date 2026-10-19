import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { checkDist } from '../src/build/check.mjs';
import { aendere, baue, kopie, schreibe, tmp } from './_hilfe.mjs';

const { outDir: gut } = baue();
const ENDUNGEN = ['.html', '.css', '.js', '.woff2', '.txt', '.xml'];

const pruefe = (dir, opts = {}) => checkDist(dir, { endungen: ENDUNGEN, ...opts });

test('checkDist ist gruen auf dem echten Build und liefert Dateiliste mit Groessen', () => {
  const r = pruefe(gut);
  assert.deepEqual(r.fehler, []);
  assert.equal(r.dateien.length, 12);
  assert.ok(r.dateien.every((d) => d.pfad && d.bytes > 0));
  assert.equal(r.summe, r.dateien.reduce((s, d) => s + d.bytes, 0));
});

// Negativtest je Zweig: [Name, Aenderung, erwartete Meldung]
const html = (rel, fn) => (d) => aendere(d, rel, fn);
const anIndex = (zusatz) => html('index.html', (t) => t.replace('</body>', `${zusatz}</body>`));
const anCss = (zusatz) => html('css/site.css', (t) => `${t}\n${zusatz}\n`);

const faelle = [
  ['style-Element', anIndex('<style>a{color:red}</style>'), /Inline-CSS/],
  ['Inline-Skript', anIndex('<script>alert(1)</script>'), /Inline-Skript/],
  ['style-Attribut in HTML', anIndex('<p style="color:red">x</p>'), /style-Attribut/],
  ['style-Attribut in SVG', anIndex('<svg><rect style="--i:1" x="1"/></svg>'), /style-Attribut/],
  ['onclick', anIndex('<a href="#x" onclick="f()">x</a>'), /Ereignis-Handler/],
  ['onload (Grossbuchstaben)', anIndex('<body ONLOAD="f()"></body>'), /Ereignis-Handler/],
  ['javascript:-href', anIndex('<a href="javascript:alert(1)">x</a>'), /javascript:/],
  ['javascript:-href gemischt, mit Leerzeichen', anIndex('<a href=" JaVaScRiPt:alert(1)">x</a>'), /javascript:/],
  ['externes Skript', anIndex('<script src="https://x.de/a.js"></script>'), /extern/],
  ['externes Bild', anIndex('<img src="https://x.de/a.png" alt="">'), /extern/],
  ['externes srcset', anIndex('<img src="css/site.css" srcset="https://x.de/a.png 2x" alt="">'), /extern/],
  ['link href //', anIndex('<link rel="stylesheet" href="//x.de/a.css">'), /extern/],
  ['css url(https)', anCss('a{background:url(https://x.de/a.png)}'), /extern/],
  ['css url("//")', anCss('a{background:url("//x.de/a.png")}'), /extern/],
  ["css url('https')", anCss("a{background:url('https://x.de/a.png')}"), /extern/],
  ['css @import https', anCss('@import "https://x.de/a.css";'), /extern/],
  ['css @import url(//)', anCss('@import url(//x.de/a.css);'), /extern/],
  ["SVG <use href> extern", anIndex('<svg><use href="https://x.de/a.svg#i"/></svg>'), /extern/],
  ["SVG <use xlink:href> protokoll-relativ", anIndex('<svg><use xlink:href="//x.de/a.svg#i"/></svg>'), /extern/],
  ["SVG <image href> extern", anIndex('<svg><image href="https://x.de/a.png"/></svg>'), /extern/],
  ["video poster extern", anIndex('<video poster="https://x.de/p.png"></video>'), /extern/],
  ["object data extern", anIndex('<object data="https://x.de/a.swf"></object>'), /extern/],
  ["iframe src extern", anIndex('<iframe src="https://x.de/"></iframe>'), /extern/],
  ["iframe srcdoc", anIndex('<iframe srcdoc="&lt;p&gt;x&lt;/p&gt;"></iframe>'), /srcdoc/],
  ["base href", anIndex('<base href="/">'), /<base>/],
  ["meta refresh", anIndex('<meta http-equiv="refresh" content="0;url=https://x.de">'), /refresh/],
  ["meta refresh gemischt geschrieben", anIndex('<meta HTTP-EQUIV="Refresh" content="5">'), /refresh/],
  ["javascript: dezimal kodiert", anIndex('<a href="&#106;avascript:alert(1)">x</a>'), /javascript:/],
  ["javascript: hex kodiert", anIndex('<a href="&#x6a;avascript:alert(1)">x</a>'), /javascript:/],
  ["javascript: mit &colon;", anIndex('<a href="javascript&colon;alert(1)">x</a>'), /javascript:/],
  ["javascript: mit &Tab;", anIndex('<a href="java&Tab;script:alert(1)">x</a>'), /javascript:/],
  ["extern kodiert (&#104;ttps)", anIndex('<img src="&#104;ttps://x.de/a.png" alt="">'), /extern/],
  ['extern mit Backslash-Host (zwei Backslashes)', anIndex('<img src="\\\\x.de\\a.png" alt="">'), /extern/],
  ['extern mit Schraegstrich-Backslash-Host', anIndex('<img src="/\\x.de/a.png" alt="">'), /extern/],
  ["css image-set mit String https", anCss('a{background:image-set("https://x.de/a.png" 1x)}'), /extern/],
  ["css -webkit-image-set mit String //", anCss("a{background:-webkit-image-set('//x.de/a.png' 1x)}"), /extern/],
  ['fehlende CSS-Datei', (d) => fs.rmSync(path.join(d, 'css/site.css')), /fehlt/],
  ['fehlende Schriftdatei', (d) => fs.rmSync(path.join(d, 'fonts/bricolage-grotesque-latin-wght-normal.woff2')), /fehlt/],
  ['fehlendes Skript', (d) => fs.rmSync(path.join(d, 'js/kontakt.js')), /fehlt/],
  ['Punktdatei', (d) => schreibe(d, '.versteckt.txt', 'x'), /versteckt/],
  ['Punktordner', (d) => schreibe(d, '.git/x.txt', 'x'), /versteckt/],
  ['.php-Endung', (d) => schreibe(d, 'x.php', '<?php'), /Endung/],
  ['Datei ohne Endung', (d) => schreibe(d, 'LICENSE', 'x'), /Endung/],
  [
    'index.html nur im Unterordner',
    (d) => {
      fs.renameSync(path.join(d, 'index.html'), path.join(d, 'unter.html'));
      schreibe(d, 'sub/index.html', '<!doctype html>');
    },
    /index\.html/,
  ],
  ['404.html fehlt', (d) => fs.rmSync(path.join(d, '404.html')), /404\.html/],
];

for (const [name, aendern, erwartet] of faelle) {
  test(`checkDist meldet: ${name}`, () => {
    const d = kopie(gut);
    aendern(d);
    const r = pruefe(d);
    assert.ok(r.fehler.length > 0, 'kein Befund');
    assert.ok(r.fehler.some((f) => erwartet.test(f)), `erwartet ${erwartet}, erhalten: ${r.fehler.join(' | ')}`);
  });
}

test('checkDist meldet mehrere Befunde zugleich (kein Abbruch beim ersten)', () => {
  const d = kopie(gut);
  anIndex('<style>a{}</style><script>x()</script>')(d);
  schreibe(d, 'x.php', 'x');
  const r = pruefe(d);
  assert.ok(r.fehler.length >= 3, r.fehler.join(' | '));
});

test('checkDist: Limit Dateianzahl', () => {
  const r = pruefe(gut, { maxFiles: 3 });
  assert.ok(r.fehler.some((f) => /zu viele Dateien/.test(f)), r.fehler.join(' | '));
});

test('checkDist: Limit Gesamtgroesse', () => {
  const r = pruefe(gut, { maxBytes: 100 });
  assert.ok(r.fehler.some((f) => /zu gro/.test(f)), r.fehler.join(' | '));
});

test('checkDist: Verzeichnis-Link (Junction unter Windows, Symlink sonst) wird gemeldet, nie uebersprungen', () => {
  const d = kopie(gut);
  const ziel = tmp('ws-linkziel-');
  fs.writeFileSync(path.join(ziel, 'geheim.txt'), 'x');
  fs.symlinkSync(ziel, path.join(d, 'verweis'), process.platform === 'win32' ? 'junction' : 'dir');
  const r = pruefe(d);
  assert.ok(r.fehler.some((f) => /Link/.test(f) && /verweis/.test(f)), r.fehler.join(' | '));
  assert.ok(!r.dateien.some((x) => /geheim/.test(x.pfad)), 'Link wurde verfolgt');
});

test('checkDist: Datei-Symlink wird gemeldet (Windows ohne Sonderrecht nicht anlegbar, dort belegt der Junction-Test)', (t) => {
  const d = kopie(gut);
  try {
    fs.symlinkSync(path.join(d, 'robots.txt'), path.join(d, 'verweis.txt'));
  } catch (e) {
    if (process.platform === 'win32' && e.code === 'EPERM') {
      t.skip('Windows: Datei-Symlink braucht Sonderrecht (EPERM); Verzeichnis-Link per Junction im Test davor');
      return;
    }
    throw e;
  }
  const r = pruefe(d);
  assert.ok(r.fehler.some((f) => /Link/.test(f) && /verweis\.txt/.test(f)), r.fehler.join(' | '));
});

test('checkDist erlaubt ausgehende <a href> und prueft keine fremden Seiten', () => {
  const d = kopie(gut);
  anIndex('<a href="https://x.de/">x</a><a href="//y.de/">y</a>')(d);
  assert.deepEqual(pruefe(d).fehler, []);
});

test('checkDist loest lokale Referenzen relativ zur jeweiligen Datei auf (404 absolut)', () => {
  const d = kopie(gut);
  fs.rmSync(path.join(d, 'fonts'), { recursive: true });
  const r = pruefe(d);
  assert.ok(r.fehler.some((f) => /fonts\//.test(f) && /fehlt/.test(f)), r.fehler.join(' | '));
});

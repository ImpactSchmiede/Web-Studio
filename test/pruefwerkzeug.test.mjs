// Pruefwerkzeug (tools/pruefung): Server und Bildhilfen. Nur Bordmittel, kein Chrome, kein Netz ausser 127.0.0.1.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { loeseAuf, startServer } from '../tools/pruefung/server.mjs';
import { entferneIccWebp, entferneMetadatenJpeg, icoAusPng } from '../tools/pruefung/bilder.mjs';
import { bildMasse, icoEintraege, jpegSegmente, webpChunks } from './_bild.mjs';
import { baue } from './_hilfe.mjs';

const { outDir } = baue();

function hole(port, pfad, roh = false) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: pfad, method: 'GET', agent: false }, (res) => {
      const teile = [];
      res.on('data', (c) => teile.push(c));
      res.on('end', () => resolve({ status: res.statusCode, header: res.headers, body: Buffer.concat(teile) }));
    });
    req.on('error', reject);
    req.end();
    void roh;
  });
}

test('Server: bindet nur 127.0.0.1, Port aus 8400-8449, CSP default-src self', async () => {
  const s = await startServer({ dir: outDir });
  try {
    assert.equal(s.host, '127.0.0.1');
    assert.ok(s.port >= 8400 && s.port <= 8449, `Port ${s.port}`);
    assert.equal(s.server.address().address, '127.0.0.1');
    const r = await hole(s.port, '/');
    assert.equal(r.status, 200);
    assert.equal(r.header['content-security-policy'], "default-src 'self'");
    assert.match(r.header['content-type'], /text\/html/);
    assert.ok(r.body.equals(fs.readFileSync(path.join(outDir, 'index.html'))));
    const c = await hole(s.port, '/css/site.css');
    assert.match(c.header['content-type'], /text\/css/);
    const w = await hole(s.port, '/bilder/foto-vorlaeufig.webp');
    assert.equal(w.header['content-type'], 'image/webp');
    const i = await hole(s.port, '/favicon.ico');
    assert.equal(i.status, 200);
    assert.match(i.header['content-type'], /icon/);
  } finally {
    await s.close();
  }
});

test('Server: unbekannter Pfad liefert 404.html mit Status 404, Verzeichnisausbruch und Sonderformen ebenfalls 404', async () => {
  const s = await startServer({ dir: outDir });
  try {
    const not404 = fs.readFileSync(path.join(outDir, '404.html'));
    for (const p of ['/gibts-nicht', '/tief/unten/seite.html', '/%2e%2e/%2e%2e/package.json', '/..%2fpackage.json', '/css/..%5c..%5cpackage.json', '/%00', '/css/', '/%2e%2e%2fsrc/content/de.json', '/.git/config']) {
      const r = await hole(s.port, p);
      assert.equal(r.status, 404, p);
      assert.ok(r.body.equals(not404), `${p}: kein 404.html`);
    }
    const p = await hole(s.port, '/package.json');
    assert.equal(p.status, 404);
  } finally {
    await s.close();
  }
});

test('Server: zweiter Start waehlt einen anderen freien Port, close gibt ihn frei', async () => {
  const a = await startServer({ dir: outDir });
  const b = await startServer({ dir: outDir });
  try {
    assert.notEqual(a.port, b.port);
  } finally {
    await a.close();
    await b.close();
  }
  const c = await startServer({ dir: outDir });
  await c.close();
});

test('Server: Fremdanfragen koennen nicht entstehen (nur GET und HEAD, kein Proxy)', async () => {
  const s = await startServer({ dir: outDir });
  try {
    const r = await new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port: s.port, path: 'http://example.org/', method: 'POST', agent: false }, (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      });
      req.on('error', reject);
      req.end('x');
    });
    assert.equal(r, 405);
  } finally {
    await s.close();
  }
});

test('Bildhilfe: icoAusPng setzt Kopf und Eintrag korrekt um, PNG bleibt bytegleich', () => {
  const png = fs.readFileSync(path.join(outDir, 'bilder/apple-touch-icon.png'));
  const ico = icoAusPng(png, 32, 32);
  const e = icoEintraege(ico);
  assert.equal(e.length, 1);
  assert.deepEqual([e[0].breite, e[0].hoehe], [32, 32]);
  assert.ok(e[0].daten.equals(png));
  assert.equal(ico.length, 22 + png.length);
});

function riff(chunks) {
  const teile = chunks.map(([typ, daten]) => {
    const h = Buffer.alloc(8);
    h.write(typ, 0, 'latin1');
    h.writeUInt32LE(daten.length, 4);
    return Buffer.concat([h, daten, daten.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
  });
  const k = Buffer.alloc(12);
  k.write('RIFF', 0, 'latin1');
  k.write('WEBP', 8, 'latin1');
  const body = Buffer.concat(teile);
  k.writeUInt32LE(4 + body.length, 4);
  return Buffer.concat([k, body]);
}

test('Bildhilfe: entferneIccWebp entfernt ICCP, EXIF und XMP und das VP8X ohne Alpha; Bilddaten bleiben', () => {
  const vp8 = Buffer.from([0, 0, 0, 0x9d, 0x01, 0x2a, 0, 2, 0, 2, 1, 2, 3]);
  const vp8x = Buffer.from([0x20 | 0x08 | 0x04, 0, 0, 0, 0xff, 0x01, 0, 0xff, 0x01, 0]);
  const aus = entferneIccWebp(riff([['VP8X', vp8x], ['ICCP', Buffer.from('profil!')], ['VP8 ', vp8], ['EXIF', Buffer.from('ex')], ['XMP ', Buffer.from('xmp')]]));
  assert.deepEqual(webpChunks(aus).map((c) => c.typ), ['VP8 ']);
  assert.equal(aus.readUInt32LE(4), aus.length - 8);
  assert.deepEqual(bildMasse(aus, '.webp'), { breite: 512, hoehe: 512 });
  const mitAlpha = entferneIccWebp(riff([['VP8X', Buffer.from([0x20 | 0x10, 0, 0, 0, 0, 0, 0, 0, 0, 0])], ['ICCP', Buffer.from('p')], ['ALPH', Buffer.from([0, 1])], ['VP8 ', vp8]]));
  assert.deepEqual(webpChunks(mitAlpha).map((c) => c.typ), ['VP8X', 'ALPH', 'VP8 ']);
  assert.equal(mitAlpha[20], 0x10);
});

test('Bildhilfe: entferneMetadatenJpeg behaelt JFIF und Bildsegmente, entfernt APP1, APP2, APP13 und Kommentare', () => {
  const seg = (m, daten) => Buffer.concat([Buffer.from([0xff, m, (daten.length + 2) >> 8, (daten.length + 2) & 255]), daten]);
  const sof = Buffer.from([8, 0x02, 0x00, 0x02, 0x00, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);
  const jpg = Buffer.concat([
    Buffer.from([0xff, 0xd8]), seg(0xe0, Buffer.from('JFIF-Kopf')), seg(0xe1, Buffer.from('Exif-Daten')),
    seg(0xe2, Buffer.from('ICC_PROFILE-Daten')), seg(0xed, Buffer.from('iptc')), seg(0xfe, Buffer.from('kommentar')),
    seg(0xc0, sof), seg(0xda, Buffer.from([3, 1, 0, 2, 0x11, 3, 0x11, 0, 0x3f, 0])), Buffer.from([1, 2, 3, 0xff, 0xd9]),
  ]);
  const aus = entferneMetadatenJpeg(jpg);
  assert.deepEqual(jpegSegmente(aus).map((s) => s.marker), [0xe0, 0xc0, 0xda]);
  assert.deepEqual(bildMasse(aus, '.jpg'), { breite: 512, hoehe: 512 });
  assert.ok(aus.subarray(-5).equals(Buffer.from([1, 2, 3, 0xff, 0xd9])));
});

test('Server: loeseAuf lehnt Backslash, NUL, .., versteckte Dateien und Verzeichnisse ab', () => {
  for (const p of ['/..' + String.fromCharCode(92) + 'package.json', '/a%00b', '/../package.json', '/%2e%2e/package.json', '/.git/config', '/css', '/css/', '/nicht-da.html', 'index.html']) {
    assert.equal(loeseAuf(outDir, p), null, p);
  }
  assert.equal(loeseAuf(outDir, '/'), path.join(outDir, 'index.html'));
  assert.equal(loeseAuf(outDir, '/css/site.css?x=1'), path.join(outDir, 'css', 'site.css'));
});

test('Bildhilfe: Laengenangaben ueber die Puffergrenze hinaus lassen entferneIccWebp und entferneMetadatenJpeg abbrechen', () => {
  const vp8 = Buffer.from([0, 0, 0, 0x9d, 0x01, 0x2a, 0, 2, 0, 2, 1, 2, 3]);
  const gut = riff([['VP8 ', vp8]]);
  const kaputt = Buffer.from(gut);
  kaputt.writeUInt32LE(5000, 16); // Chunk-Laenge groesser als der Rest
  assert.throws(() => entferneIccWebp(kaputt), /Chunk|Puffer|Laenge|abgeschnitten/i);
  assert.throws(() => entferneIccWebp(gut.subarray(0, gut.length - 3)), /Chunk|Puffer|Laenge|abgeschnitten/i);
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 1, 2, 3]); // APP0 behauptet 16 Byte, es sind 3
  assert.throws(() => entferneMetadatenJpeg(jpg), /Segment|Puffer|Laenge|abgeschnitten/i);
  assert.throws(() => entferneMetadatenJpeg(Buffer.from([0xff, 0xd8, 0xff, 0xc0])), /Segment|Puffer|Laenge|abgeschnitten/i);
});

test('Bildhilfe: JPEG mit Fuellbytes 0xFF vor einem Marker wird verarbeitet', () => {
  const seg = (m, daten) => Buffer.concat([Buffer.from([0xff, m, (daten.length + 2) >> 8, (daten.length + 2) & 255]), daten]);
  const jpg = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xff, 0xff]), seg(0xe1, Buffer.from('Exif-Daten')).subarray(1),
    seg(0xe0, Buffer.from('JFIF-Kopf')), Buffer.from([0xff, 0xff]), seg(0xda, Buffer.from([1, 1, 0, 0, 0x3f, 0])), Buffer.from([9, 8, 0xff, 0xd9]),
  ]);
  const aus = entferneMetadatenJpeg(jpg);
  assert.deepEqual(jpegSegmente(aus).map((s) => s.marker), [0xe0, 0xda]);
  assert.ok(!aus.toString('latin1').includes('Exif'));
});

test('Chrome: beiAbbruch haengt SIGINT/SIGTERM-Handler an und entfernt sie wieder; der Handler raeumt auf', async () => {
  const { beiAbbruch } = await import('../tools/pruefung/chrome.mjs');
  const vorher = [process.listenerCount('SIGINT'), process.listenerCount('SIGTERM')];
  let aufgeraeumt = 0;
  const weg = beiAbbruch(() => { aufgeraeumt += 1; }, { beenden: false });
  assert.equal(process.listenerCount('SIGINT'), vorher[0] + 1);
  assert.equal(process.listenerCount('SIGTERM'), vorher[1] + 1);
  process.listeners('SIGTERM').at(-1)('SIGTERM');
  assert.equal(aufgeraeumt, 1);
  weg();
  assert.deepEqual([process.listenerCount('SIGINT'), process.listenerCount('SIGTERM')], vorher);
});

// ---- T-003: PDF ueber den Pruefserver, Profil-Werkzeug (ohne Chrome testbar)
test('Server: PDF wird als application/pdf mit CSP und nosniff ausgeliefert, bytegleich', async () => {
  const s = await startServer({ dir: outDir });
  try {
    const r = await hole(s.port, '/profil-enrico-falk.pdf');
    assert.equal(r.status, 200);
    assert.equal(r.header['content-type'], 'application/pdf');
    assert.equal(r.header['content-security-policy'], "default-src 'self'");
    assert.equal(r.header['x-content-type-options'], 'nosniff');
    assert.ok(r.body.equals(fs.readFileSync(path.join(outDir, 'profil-enrico-falk.pdf'))));
    assert.ok(r.body.subarray(0, 5).toString('latin1') === '%PDF-');
  } finally {
    await s.close();
  }
});

test('Profil-Werkzeug: Argumente streng (--stand JJJJ-MM-TT, --seitenbilder Ordner, nichts anderes), Standard ist der heutige Tag in Berlin', async () => {
  const { parseArgs } = await import('../tools/pruefung/profil.mjs');
  const heute = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
  assert.deepEqual(parseArgs([]), { stand: heute, seitenbilder: null, markierung: null });
  assert.equal(parseArgs(['--stand', '2026-10-19']).stand, '2026-10-19');
  assert.equal(parseArgs(['--seitenbilder', 'x']).seitenbilder, path.resolve('x'));
  assert.equal(parseArgs(['--markierung', 'm.png']).markierung, path.resolve('m.png'));
  for (const a of [['--stand'], ['--stand', 'gestern'], ['--stand', '2026-02-30'], ['--unbekannt'], ['--seitenbilder']]) {
    assert.throws(() => parseArgs(a), /stand|Datum|Option|seitenbilder|fehlt/i, a.join(' '));
  }
});

test('Profil-Werkzeug: Eingangsordner enthaelt nur index.html, css/profil.css und die vier woff2-Schriften; der Hash ist stabil', async () => {
  const { schreibeEingang } = await import('../tools/pruefung/profil.mjs');
  const { profilEingang } = await import('../src/build/profil.mjs');
  const { ROOT, tmp } = await import('./_hilfe.mjs');
  const dir = tmp();
  const e = schreibeEingang(dir, { root: ROOT, stand: '2026-10-19' });
  const alle = fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((d) => d.isFile())
    .map((d) => path.relative(dir, path.join(d.parentPath, d.name)).split(path.sep).join('/')).sort();
  assert.deepEqual(alle, [
    'css/profil.css', 'fonts/atkinson-hyperlegible-latin-400-italic.woff2', 'fonts/atkinson-hyperlegible-latin-400-normal.woff2',
    'fonts/atkinson-hyperlegible-latin-700-normal.woff2', 'fonts/bricolage-grotesque-latin-wght-normal.woff2', 'index.html',
  ]);
  assert.equal(e.hash, profilEingang(ROOT, { stand: '2026-10-19' }).hash);
  assert.notEqual(e.hash, profilEingang(ROOT, { stand: '2026-10-20' }).hash);
});

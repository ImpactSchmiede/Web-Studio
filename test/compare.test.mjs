import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { vergleicheCss, vergleicheSeite } from '../src/build/compare.mjs';
import { FIXTURE, ROOT, baue, lies } from './_hilfe.mjs';

const mockup = fs.readFileSync(FIXTURE, 'utf8');
const { outDir } = baue();
const index = lies(outDir, 'index.html');
const css = lies(outDir, 'css/site.css');

test('Mockup-Fixture ist unveraendert (nur eine Kommentarzeile davor)', () => {
  assert.match(mockup, /^<!-- Fixture: /);
  assert.match(mockup, /\n<!doctype html>\n<html lang="de">/);
  assert.equal((mockup.match(/ style="/g) || []).length, 24);
});

test('Struktur: dist/index.html entspricht dem Mockup (Unterschiede nur Stil-Klassen, Mail-Teil)', () => {
  const r = vergleicheSeite(mockup, index);
  assert.deepEqual(r.unterschiede, []);
  assert.ok(r.tokens > 400, `zu wenige Token: ${r.tokens}`);
});

test('Selbsttest N2: Mockup gegen Mockup ergibt keine Differenz', () => {
  assert.deepEqual(vergleicheSeite(mockup, mockup).unterschiede, []);
});

test('Selbsttest N2: gezielte Textaenderung wird gemeldet', () => {
  const r = vergleicheSeite(mockup, index.replace('Profil ansehen', 'Profil ansehen!'));
  assert.ok(r.unterschiede.length >= 2);
  assert.ok(r.unterschiede.some((u) => u.includes('Profil ansehen!')));
});

test('Selbsttest N2: fehlendes Element, geaenderte Klasse, fremder Inline-Stil, geaenderter Titel werden gemeldet', () => {
  assert.ok(vergleicheSeite(mockup, index.replace(/<li><b>FL2D<\/b>[\s\S]*?<\/li>/, '')).unterschiede.length > 0);
  assert.ok(vergleicheSeite(mockup, index.replace('class="btn ghost"', 'class="btn"')).unterschiede.length > 0);
  assert.ok(vergleicheSeite(mockup, index.replace('<h1>', '<h1 style="color:red">')).unterschiede.length > 0);
  assert.ok(vergleicheSeite(mockup, index.replace(/<title>[^<]*/, '<title>Anders')).unterschiede.length > 0);
});

test('CSS: jede Mockup-Regel steckt in site.css (Reihenfolge, Schriftpfad ../fonts/), Zusatzregeln nur fuer neue Klassen', () => {
  const r = vergleicheCss(mockup, css);
  assert.deepEqual(r.fehler, []);
  assert.ok(r.regeln > 80, `zu wenige Regeln: ${r.regeln}`);
  assert.equal(r.zusatz, 14 + 7 + 1);
});

test('CSS: Selbsttest, geaenderte oder fehlende Regel und unbekannte Zusatzregel werden gemeldet', () => {
  assert.ok(vergleicheCss(mockup, css.replace('--r:14px', '--r:15px')).fehler.length > 0);
  assert.ok(vergleicheCss(mockup, css.replace(/\.hero\{[^}]*\}/, '')).fehler.length > 0);
  assert.ok(vergleicheCss(mockup, `${css}\nbody{display:none}\n`).fehler.length > 0);
  assert.ok(vergleicheCss(mockup, css.replace('url(../fonts/', 'url(fonts/')).fehler.length > 0);
});

test('N1: [hidden]-Regel mit !important steht in site.css', () => {
  assert.match(css.replace(/\s+/g, ''), /\[hidden\]\{display:none!important\}/);
  const quelle = fs.readFileSync(path.join(ROOT, 'src/styles/site.css'), 'utf8');
  assert.equal(quelle, css);
});

test('Ausnahmen (hidden, data-*) gelten nur fuer #addr, #mail, #copy: sonst wird gemeldet', () => {
  assert.ok(vergleicheSeite(mockup, index.replace('<h1>', '<h1 hidden>')).unterschiede.length > 0);
  assert.ok(vergleicheSeite(mockup, index.replace('<h1>', '<h1 data-x="1">')).unterschiede.length > 0);
  assert.ok(vergleicheSeite(mockup, index.replace('<ul class="certs">', '<ul class="certs" hidden>')).unterschiede.length > 0);
  assert.ok(vergleicheSeite(mockup, index.replace('id="addr" data-l=', 'id="addr" hidden data-l=')).unterschiede.length === 0);
  assert.ok(vergleicheSeite(mockup, index.replace('id="mail" hidden', 'id="mail" hidden href="#x"')).unterschiede.length === 0);
  assert.ok(vergleicheSeite(mockup, index.replace('<footer>', '<footer id="mail" href="#x">')).unterschiede.length > 0);
});

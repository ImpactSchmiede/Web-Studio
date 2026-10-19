import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT } from './_hilfe.mjs';

const lesen = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('AK1: ENTSCHEIDUNGEN.md nennt Stack, 5 Begruendungszeilen, Alternativen und Grenze der Mail-Verschleierung', () => {
  const t = lesen('docs/ENTSCHEIDUNGEN.md');
  assert.match(t, /Node/);
  const abschnitt = t.split(/^## /m).find((a) => /^Begr(ü|ue)ndung/.test(a));
  assert.ok(abschnitt, 'Abschnitt Begruendung fehlt');
  assert.equal((abschnitt.match(/^\d\. /gm) || []).length, 5);
  assert.match(t, /Eleventy/);
  assert.match(t, /Astro/);
  assert.match(t, /schwach/i);
  assert.match(t, /data-/);
});

test('AK1: Verweis aus docs/architektur/README.md', () => {
  assert.match(lesen('docs/architektur/README.md'), /ENTSCHEIDUNGEN\.md/);
});

test('AK2: docs/konzept/freelancer-seite.md ist versioniert (git ls-files nicht leer)', () => {
  const aus = execFileSync('git', ['ls-files', 'docs/konzept/freelancer-seite.md'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(aus.trim(), 'docs/konzept/freelancer-seite.md');
});

test('PROJEKT.md: Befehle und Anleitung fuer Enrico sind eingetragen', () => {
  const t = lesen('docs/PROJEKT.md');
  const befehle = t.split(/^## /m).find((a) => a.startsWith('Befehle'));
  assert.match(befehle, /npm run build/);
  assert.match(befehle, /npm test/);
  assert.match(befehle, /Smoke/);
  const enrico = t.split(/^## /m).find((a) => a.startsWith('Für Enrico'));
  assert.match(enrico, /git pull/);
  assert.match(enrico, /npm run build/);
});

test('.gitattributes: Binaerdateien sind markiert, LF bleibt', () => {
  const t = lesen('.gitattributes');
  assert.match(t, /\*\.woff2 binary/);
  assert.match(t, /\*\.png binary/);
  assert.match(t, /\* text=auto eol=lf/);
});

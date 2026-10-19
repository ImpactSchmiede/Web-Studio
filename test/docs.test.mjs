import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
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

test('T-002: .gitattributes markiert webp, jpg und ico als binaer', () => {
  const t = lesen('.gitattributes');
  assert.match(t, /\*\.webp binary/);
  assert.match(t, /\*\.jpg binary/);
  assert.match(t, /\*\.ico binary/);
});

test('T-002: PROJEKT.md nennt Einrichtung und Aufruf des Pruefwerkzeugs im Abschnitt Befehle', () => {
  const befehle = lesen('docs/PROJEKT.md').split(/^## /m).find((a) => a.startsWith('Befehle'));
  assert.match(befehle, /npm ci --prefix tools\/pruefung/);
  assert.match(befehle, /npm run pruefen/);
  assert.match(befehle, /npm run platzhalter/);
  assert.match(befehle, /Port 84\d\d/);
});

test('T-002: ENTSCHEIDUNGEN.md hat den Abschnitt zum Pruefwerkzeug mit Versionen, Bildweg, Adress-Konstante, Look-Invarianten und Regel-Begruendungen', () => {
  const t = lesen('docs/ENTSCHEIDUNGEN.md');
  const a = t.split(/^## /m).find((x) => /T-002/.test(x.split('\n')[0]));
  assert.ok(a, 'Abschnitt T-002 fehlt');
  for (const w of ['lighthouse 13.5.0', 'axe-core 4.14.0', 'html-validate 11.16.2', 'puppeteer-core 25.12.0', 'ignore-scripts', 'Look-Invarianten', 'site.config.json', 'WebP', 'indexierbar', 'Fremdanfragen']) {
    assert.ok(a.includes(w), `fehlt: ${w}`);
  }
  const regeln = JSON.parse(lesen('tools/pruefung/.htmlvalidate.json')).rules ?? {};
  for (const r of Object.keys(regeln)) assert.ok(a.includes(r), `abgeschaltete Regel ohne Begruendung: ${r}`);
});

test('Schutz: keine Datei unter src/, scripts/, test/, tools/pruefung/ (ohne node_modules) ist von .gitignore erfasst; dist/ bleibt ignoriert', () => {
  const sammle = (rel) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return [];
    return fs.readdirSync(abs, { withFileTypes: true }).flatMap((e) => {
      if (e.name === 'node_modules') return [];
      const r = `${rel}/${e.name}`;
      return e.isDirectory() ? sammle(r) : [r];
    });
  };
  const dateien = ['src', 'scripts', 'test', 'tools/pruefung'].flatMap(sammle);
  assert.ok(dateien.length > 40, `nur ${dateien.length} Dateien`);
  assert.ok(dateien.some((f) => f === 'src/build/build.mjs'));
  const r = spawnSync('git', ['check-ignore', '--stdin'], { cwd: ROOT, input: `${dateien.join('\n')}\n`, encoding: 'utf8' });
  assert.equal(r.stdout.trim(), '', `von .gitignore erfasst:\n${r.stdout}`);
  assert.equal(r.status, 1);
  for (const f of dateien.filter((x) => x.startsWith('src/'))) {
    assert.equal(spawnSync('git', ['check-ignore', '-q', f], { cwd: ROOT }).status, 1, f);
  }
  assert.equal(spawnSync('git', ['check-ignore', '-q', 'dist/index.html'], { cwd: ROOT }).status, 0, 'dist/ muss ignoriert bleiben');
});

test('T-002: .gitattributes markiert pdf als binaer', () => {
  assert.match(lesen('.gitattributes'), /\*\.pdf binary/);
});

test('T-002: PROJEKT.md grenzt die Voraussetzung ein und dokumentiert --ausgabe', () => {
  const t = lesen('docs/PROJEKT.md');
  assert.match(t, /Build und Tests ohne npm-Pakete; Prüfwerkzeug: `npm ci --prefix tools\/pruefung`/);
  assert.doesNotMatch(t, /Keine npm-Pakete, daher kein `npm install`/);
  const befehle = t.split(/^## /m).find((a) => a.startsWith('Befehle'));
  assert.match(befehle, /npm run pruefen -- --ausgabe/);
  assert.match(befehle, /--html/);
  assert.match(lesen('tools/pruefung/README.md'), /npm run pruefen -- --ausgabe/);
});

test('T-002: ENTSCHEIDUNGEN.md grenzt die Fremdanfragen auf die geprueften Seiten ein', () => {
  const t = lesen('docs/ENTSCHEIDUNGEN.md');
  assert.match(t, /Anfrage der geprüften Seiten an einen anderen Host/);
});

test('Prueftool: --ausgabe ist Pflicht (kein Standardpfad), ohne Angabe Exit 2 und Hinweis', () => {
  const r = spawnSync(process.execPath, ['tools/pruefung/pruefen.mjs'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--ausgabe/);
  const q = lesen('tools/pruefung/pruefen.mjs');
  assert.doesNotMatch(q, /T-002/);
  assert.match(q, /--html/);
});

// ---- T-003
test('T-003: package.json: nur die neuen Skripte profil, paket, paket:pruefen; keine Abhaengigkeit im Root', () => {
  const p = JSON.parse(lesen('package.json'));
  assert.equal(p.scripts.profil, 'node tools/pruefung/profil.mjs');
  assert.equal(p.scripts.paket, 'node scripts/paket.mjs');
  assert.equal(p.scripts['paket:pruefen'], 'node scripts/paket-pruefen.mjs');
  assert.deepEqual(Object.keys(p.scripts).sort(), ['build', 'check', 'paket', 'paket:pruefen', 'platzhalter', 'profil', 'pruefen', 'test']);
  assert.equal(p.dependencies, undefined);
  assert.equal(p.devDependencies, undefined);
  const t = JSON.parse(lesen('tools/pruefung/package.json'));
  assert.deepEqual(t.devDependencies, { lighthouse: '13.5.0', 'axe-core': '4.14.0', 'html-validate': '11.16.2', 'puppeteer-core': '25.12.0' });
});

test('T-003: src/ und scripts/ importieren nur node:-Module oder relative Dateien (keine npm-Abhaengigkeit, nichts aus tools/)', () => {
  const sammle = (rel) => fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? sammle(`${rel}/${e.name}`) : [`${rel}/${e.name}`]));
  const quellen = [...sammle('src'), ...sammle('scripts')].filter((f) => f.endsWith('.mjs'));
  assert.ok(quellen.length >= 15);
  for (const f of quellen) {
    for (const m of lesen(f).matchAll(/^(?:import\b[^'"\n;]*?|export\b[^'"\n;]*?\sfrom\s*)['"]([^'"]+)['"]/gm)) {
      assert.match(m[1], /^(node:|\.\.?\/)/, `${f}: ${m[1]}`);
      assert.doesNotMatch(m[1], /tools\//, `${f}: ${m[1]}`);
    }
  }
});

test('T-003: PROJEKT.md nennt profil, paket, paket:pruefen und paket/ im Abschnitt Befehle', () => {
  const befehle = lesen('docs/PROJEKT.md').split(/^## /m).find((a) => a.startsWith('Befehle'));
  assert.match(befehle, /npm run profil/);
  assert.match(befehle, /npm run paket\b/);
  assert.match(befehle, /npm run paket:pruefen/);
  assert.match(befehle, /paket\//);
  assert.match(befehle, /--datum/);
  assert.match(befehle, /--stand/);
  assert.match(befehle, /Port 841\d/);
  assert.doesNotMatch(befehle, /kommt mit T-003/);
});

test('T-003: ENTSCHEIDUNGEN.md hat den Abschnitt T-003 (Seitenzahl, Klartext-Adresse, Positionierung, Titel, Schriften, Tar, Paketdefinition)', () => {
  const t = lesen('docs/ENTSCHEIDUNGEN.md');
  const a = t.split(/^## /m).find((x) => /T-003/.test(x.split('\n')[0]));
  assert.ok(a, 'Abschnitt T-003 fehlt');
  for (const w of [
    '1 bis 2 Seiten', 'Konzept', 'Klartext', 'mailto', 'Agile Coach und Problemlöser', 'Enrico Falk \u2013 Profil', 'Entwurf, Stand', 'quelle.json',
    'Type3', 'ToUnicode', 'Metadaten', 'ustar', 'mtime', 'Paketdefinition', 'paket:pruefen', 'profil', 'Gate', 'Chrome', 'Interview', 'Pakete',
  ]) assert.ok(a.includes(w), `fehlt: ${w}`);
});

test('T-003: Referenzen pdf-chrome.md und ustar.md mit Quelle, Datum, Version und Restunsicherheit', () => {
  for (const [datei, woerter] of [
    ['docs/referenzen/pdf-chrome.md', ['Chrome 155', 'puppeteer-core 25.12', 'Type3', 'xref', 'Info', 'file:///', 'Restunsicherheit', '2026-10-19']],
    ['docs/referenzen/ustar.md', ['POSIX', 'ustar', 'chksum', 'mtime', 'bsdtar', 'GNU tar 1.35', 'Restunsicherheit', '2026-10-19']],
  ]) {
    const t = lesen(datei);
    for (const w of woerter) assert.ok(t.includes(w), `${datei}: ${w}`);
    assert.match(t, /Quelle/);
    assert.match(t, /Version/);
  }
});

test('T-003: Werkzeug-README nennt npm run profil mit --stand, --seitenbilder und die Ports 8412 bis 8419', () => {
  const t = lesen('tools/pruefung/README.md');
  assert.match(t, /npm run profil/);
  assert.match(t, /--stand/);
  assert.match(t, /--seitenbilder/);
  assert.match(t, /8412/);
});

// QA-3: keine lokalen Pfade oder Benutzernamen in den Evidenzdateien (docs/batches/**)
test('QA-3: docs/batches/** (.txt, .md) enthaelt keinen lokalen Benutzernamen und keinen Profilpfad (Muster im Test)', () => {
  const sammle = (rel) => fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? sammle(`${rel}/${e.name}`) : [`${rel}/${e.name}`]));
  const dateien = sammle('docs/batches').filter((f) => /\.(txt|md)$/.test(f));
  assert.ok(dateien.length >= 20, `nur ${dateien.length} Dateien`);
  const treffer = [];
  for (const f of dateien) {
    lesen(f).split('\n').forEach((z, i) => {
      if (/AI User|AIUSER~1|AI-User|AI%20User/i.test(z)) treffer.push(`${f}:${i + 1}`);
    });
  }
  assert.deepEqual(treffer, []);
});

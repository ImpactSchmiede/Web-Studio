// Gemeinsame Hilfen der Tests. Gebaut wird nur in Temp-Ordnern, nie in dist/.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../src/build/build.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FIXTURE = path.join(ROOT, 'test', 'fixtures', 'mockup-startseite.html');

const angelegt = [];
process.on('exit', () => {
  for (const d of angelegt) fs.rmSync(d, { recursive: true, force: true });
});

export function tmp(prefix = 'ws-') {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  angelegt.push(d);
  return d;
}

export function baue(extra = {}) {
  const outDir = path.join(tmp(), 'dist');
  const ergebnis = build({ outDir, root: ROOT, ...extra });
  return { outDir, ergebnis };
}

export function kopie(dir) {
  const ziel = path.join(tmp(), 'dist');
  fs.cpSync(dir, ziel, { recursive: true });
  return ziel;
}

export function lies(dir, rel) {
  return fs.readFileSync(path.join(dir, rel), 'utf8');
}

export function schreibe(dir, rel, inhalt) {
  const p = path.join(dir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, inhalt);
}

export function aendere(dir, rel, fn) {
  schreibe(dir, rel, fn(lies(dir, rel)));
}

export function dateien(dir) {
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => path.relative(dir, path.join(d.parentPath, d.name)).split(path.sep).join('/'))
    .sort();
}

// npm run check [ordner]: prueft ein vorhandenes dist/ (Standard: <Repo>/dist) auf die Lieferform.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../src/build/build.mjs';
import { checkDist, formatListe } from '../src/build/check.mjs';

const k = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/site.config.json'), 'utf8'));
const dir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'dist');
const r = checkDist(dir, { endungen: k.erlaubteEndungen, maxBytes: k.maxBytes, maxFiles: k.maxDateien });
if (r.dateien.length) console.log(formatListe(r.dateien, r.summe));
if (r.fehler.length) {
  console.error(`\n${r.fehler.length} Befund(e):\n - ${r.fehler.join('\n - ')}`);
  process.exitCode = 1;
} else {
  console.log('Pruefung der Lieferform: gruen');
}

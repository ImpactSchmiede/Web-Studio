// npm run build: baut dist/ und listet die Dateien mit Groessen.
import path from 'node:path';
import { build, ROOT } from '../src/build/build.mjs';
import { formatListe } from '../src/build/check.mjs';

try {
  const r = build({ outDir: path.join(ROOT, 'dist'), root: ROOT });
  console.log(`dist gebaut: ${r.outDir}`);
  console.log(formatListe(r.dateien, r.summe));
  console.log('Pruefung der Lieferform: gruen');
} catch (e) {
  console.error(`Build fehlgeschlagen: ${e.message}`);
  process.exitCode = 1;
}

// npm run build: baut dist/ und listet die Dateien mit Groessen. Bricht ab, wenn das Profil-PDF veraltet ist (npm run profil).
import path from 'node:path';
import { build, profilAktuell, ROOT } from '../src/build/build.mjs';
import { formatListe } from '../src/build/check.mjs';

try {
  const p = profilAktuell(ROOT);
  if (!p.aktuell) throw new Error(p.hinweis);
  const r = build({ outDir: path.join(ROOT, 'dist'), root: ROOT });
  console.log(`dist gebaut: ${path.relative(ROOT, r.outDir).split(path.sep).join('/')}`);
  console.log(formatListe(r.dateien, r.summe));
  console.log(`Profil-PDF aktuell (Stand ${p.stand})`);
  console.log('Pruefung der Lieferform: gruen');
} catch (e) {
  console.error(`Build fehlgeschlagen: ${e.message}`);
  process.exitCode = 1;
}

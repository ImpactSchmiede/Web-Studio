// npm run paket:pruefen [-- <paket.tar>]: prueft ein Paket wie der VPS-Administrator (Hash und Name der .sha256, strenges ustar,
// Entpacken in einen leeren Ordner, Lieferform inkl. PDF, robots.txt). Ohne Argument: das juengste paket/*.tar. Exit 1 bei Befund.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../src/build/build.mjs';
import { pruefePaket } from '../src/build/paket.mjs';
import { pdfErwartung } from '../src/templates/profil.mjs';

// Ausgaben nennen Pfade relativ zum Repo (keine lokalen Benutzerpfade in Evidenz und Protokollen).
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/') || '.';

try {
  const konfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/site.config.json'), 'utf8'));
  const inhalt = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/de.json'), 'utf8'));
  let tar = process.argv[2] ? path.resolve(process.argv[2]) : null;
  if (!tar) {
    const dir = path.join(ROOT, 'paket');
    const liste = fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => /^\d{4}-\d{2}-\d{2}\.tar$/.test(n)).sort() : [];
    if (!liste.length) throw new Error('kein Paket in paket/ (erst npm run paket)');
    tar = path.join(dir, liste[liste.length - 1]);
  }
  const r = pruefePaket(tar, { konfig, pdfErwartung: pdfErwartung(inhalt) });
  console.log(`Paket: ${rel(tar)}`);
  console.log(`${r.dateien} Dateien, ${r.bytes} Byte, SHA-256 ${r.hash}`);
  if (r.fehler.length) {
    console.error(`${r.fehler.length} Befund(e):\n - ${r.fehler.join('\n - ')}`);
    process.exitCode = 1;
  } else {
    console.log('Paketpruefung: gruen');
  }
} catch (e) {
  console.error(`Paketpruefung nicht moeglich: ${e.message}`);
  process.exitCode = 1;
}

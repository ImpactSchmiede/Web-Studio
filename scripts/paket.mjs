// npm run paket [-- --datum JJJJ-MM-TT] [--ersetzen]: Profil-PDF aktuell? -> dist/ bauen -> unkomprimiertes .tar plus .sha256 in paket/
// (lokal, von git ignoriert, nicht in den Austausch) -> Paketpruefung wie beim VPS-Administrator.
import fs from 'node:fs';
import path from 'node:path';
import { build, profilAktuell, ROOT } from '../src/build/build.mjs';
import { erzeugePaket, pruefeDatum, pruefePaket } from '../src/build/paket.mjs';
import { pdfErwartung } from '../src/templates/profil.mjs';

// Ausgaben nennen Pfade relativ zum Repo (keine lokalen Benutzerpfade in Evidenz und Protokollen).
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/') || '.';

function args(a) {
  const o = { datum: undefined, ersetzen: false };
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] === '--datum') {
      if (!a[i + 1]) throw new Error('--datum braucht JJJJ-MM-TT');
      o.datum = pruefeDatum(a[(i += 1)]);
    } else if (a[i] === '--ersetzen') o.ersetzen = true;
    else throw new Error(`Unbekannte Option: ${a[i]} (erlaubt: --datum JJJJ-MM-TT, --ersetzen)`);
  }
  return o;
}

try {
  const o = args(process.argv.slice(2));
  const konfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/site.config.json'), 'utf8'));
  const inhalt = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/de.json'), 'utf8'));
  const soll = pdfErwartung(inhalt);
  const p = profilAktuell(ROOT);
  if (!p.aktuell) throw new Error(p.hinweis);
  const b = build({ outDir: path.join(ROOT, 'dist'), root: ROOT });
  const r = erzeugePaket({ distDir: b.outDir, outDir: path.join(ROOT, 'paket'), datum: o.datum, ersetzen: o.ersetzen, konfig, pdfErwartung: soll });
  console.log(`Paket: ${rel(r.tar)}`);
  console.log(`sha256: ${rel(r.sha256Datei)}`);
  console.log(`${r.dateien} Dateien, ${r.bytes} Byte, SHA-256 ${r.hash}`);
  const pr = pruefePaket(r.tar, { konfig, pdfErwartung: soll });
  if (pr.fehler.length) throw new Error(`Paketpruefung rot:\n - ${pr.fehler.join('\n - ')}`);
  console.log('Paketpruefung: gruen');
} catch (e) {
  console.error(`Paket fehlgeschlagen: ${e.message}`);
  process.exitCode = 1;
}

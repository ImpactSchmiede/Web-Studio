// npm run platzhalter: listet alle gelben Platzhalter (de.json) und Konfig-Platzhalter (site.config.json).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../src/build/build.mjs';
import { formatPlatzhalter, platzhalterListe } from '../src/build/platzhalter.mjs';

const inhalt = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/de.json'), 'utf8'));
const konfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/site.config.json'), 'utf8'));
process.stdout.write(formatPlatzhalter(platzhalterListe(inhalt, konfig)));

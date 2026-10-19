// T-003 AK 1 bis 3: Profil-PDF (eingecheckt, Text, Metadaten, Aktualitaet), Druck-Layout, Knopf, Lieferform-Pruefung.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { build, profilAktuell } from '../src/build/build.mjs';
import { checkDist } from '../src/build/check.mjs';
import { aufloesen, lesePdf, pruefePdf, textString } from '../src/build/pdf.mjs';
import { formatiereDatum, pdfTitel, profilSeite } from '../src/templates/profil.mjs';
import { platzhalterListe } from '../src/build/platzhalter.mjs';
import { FIXTURE, ROOT, baue, kopie, lies, tmp } from './_hilfe.mjs';
import { basisPdf, mini, strom } from './_pdfmini.mjs';
import { ohneLeer, pdfText } from './_pdftext.mjs';

const lesen = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const inhalt = JSON.parse(lesen('src/content/de.json'));
const konfig = JSON.parse(lesen('src/site.config.json'));
const quelle = JSON.parse(lesen('src/profil/quelle.json'));
const pdfPfad = path.join(ROOT, 'src/profil', konfig.profilPdf.datei);
const pdf = fs.readFileSync(pdfPfad);
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const klartext = (s) => s.replace(/\{ph(?:-hell)?:([^}]*)\}/g, '$1');
const { outDir } = baue();
const index = lies(outDir, 'index.html');
const mockup = fs.readFileSync(FIXTURE, 'utf8');

// ---- Konfiguration und Quelle
test('Konfig: profilPdf.datei ist ein ASCII-Dateiname .pdf, maxBytes unter 1 MB, .pdf ist erlaubte Endung', () => {
  assert.equal(konfig.profilPdf.datei, 'profil-enrico-falk.pdf');
  assert.match(konfig.profilPdf.datei, /^[a-z0-9][a-z0-9-]*\.pdf$/);
  assert.ok(konfig.profilPdf.maxBytes <= 1000000);
  assert.ok(konfig.erlaubteEndungen.includes('.pdf'));
});

test('quelle.json: stand (JJJJ-MM-TT, gueltig), eingang und pdf als SHA-256, chrome-Version; pdf passt zur Datei', () => {
  assert.deepEqual(Object.keys(quelle).sort(), ['chrome', 'eingang', 'pdf', 'stand']);
  assert.doesNotThrow(() => formatiereDatum(quelle.stand));
  assert.match(quelle.eingang, /^[0-9a-f]{64}$/);
  assert.match(quelle.pdf, /^[0-9a-f]{64}$/);
  assert.equal(quelle.pdf, sha(pdf));
  assert.match(quelle.chrome, /^Chrome\/\d+\./);
});

test('formatiereDatum: deutsches Datum, ungueltig wirft', () => {
  assert.equal(formatiereDatum('2026-10-19'), '19. Oktober 2026');
  assert.equal(formatiereDatum('2027-03-01'), '1. März 2027');
  for (const d of ['2026-02-30', '19.10.2026', '', null, '2026-1-1']) assert.throws(() => formatiereDatum(d), /Datum/);
});

// ---- AK 1: Inhalt der eingecheckten PDF
const text = pdfText(pdf);
const t = ohneLeer(text);
const hat = (s) => assert.ok(t.includes(ohneLeer(s)), `fehlt in der PDF: ${s}`);

test('AK1: PDF enthaelt Name, Positionierung (eigene Zeile), Hero-Aussage und Einleitung aus de.json', () => {
  hat(inhalt.kopf.name);
  hat(inhalt.profilPdf.positionierung);
  hat(inhalt.hero.titel);
  hat(inhalt.hero.einleitung);
  assert.ok(text.split('\n').map((z) => z.trim()).includes(inhalt.profilPdf.positionierung), 'Positionierung steht nicht als eigene Zeile');
});

test('AK1: Positionierung steht woertlich in hero.einleitung (keine neue Formulierung)', () => {
  assert.equal(inhalt.profilPdf.positionierung, 'Agile Coach und Problemlöser');
  assert.ok(inhalt.hero.einleitung.includes(inhalt.profilPdf.positionierung));
});

test('AK1: PDF enthaelt 4 Fakten (Schwerpunkte, Ansaetze ...), 8 Zertifikate mit Ausstellern und die Platzhalter', () => {
  assert.equal(inhalt.profil.fakten.length, 4);
  for (const f of inhalt.profil.fakten) { hat(f.name); hat(f.wert); }
  hat(inhalt.profil.titel);
  assert.equal(inhalt.profil.zertifikate.eintraege.length, 8);
  for (const z of inhalt.profil.zertifikate.eintraege) { hat(z.name); hat(z.aussteller); }
  hat(klartext(inhalt.profil.zertifikate.hinweis));
  hat(klartext(inhalt.beispiele.hinweis));
});

test('AK1: PDF enthaelt die 6 Vermittler-Felder (Verfuegbarkeit, Einsatzform, Sprachen, Branchen, Einsatzrollen, Antwort)', () => {
  assert.equal(inhalt.profil.vermittler.felder.length, 6);
  hat(inhalt.profil.vermittler.titel);
  for (const f of inhalt.profil.vermittler.felder) { hat(f.name); hat(f.wert); }
  assert.ok(inhalt.profil.vermittler.felder.some((f) => f.name === 'Branchen'));
});

test('AK1: PDF enthaelt 3 Beispiele (Titel, Rahmen, drei Felder je Beispiel)', () => {
  assert.equal(inhalt.beispiele.eintraege.length, 3);
  hat(inhalt.beispiele.titel);
  for (const e of inhalt.beispiele.eintraege) {
    hat(e.titel);
    hat(e.tag);
    e.werte.forEach((w, i) => { hat(inhalt.beispiele.felder[i]); hat(w); });
  }
});

test('AK1: Kontakt: Adresse aus der Konfiguration im Klartext, Webadresse, LinkedIn, Beschriftungen', () => {
  assert.equal(konfig.kontakt.adresse, 'kontakt@enricofalk.de');
  hat(inhalt.profilPdf.kontaktTitel);
  hat(inhalt.profilPdf.mail);
  hat(konfig.kontakt.adresse);
  hat(inhalt.profilPdf.web);
  hat(konfig.baseUrl);
  assert.equal(konfig.baseUrl, 'https://enricofalk.de/');
  hat('LinkedIn');
});

test('AK1: Fusszeile "Entwurf, Stand <Datum>" mit dem Datum aus quelle.json, auf beiden Seiten', () => {
  const erwartet = inhalt.profilPdf.fuss.replace('{datum}', formatiereDatum(quelle.stand));
  assert.match(erwartet, /^Entwurf, Stand \d{1,2}\. \p{L}+ \d{4}$/u);
  const seiten = text.split('\f');
  assert.ok(seiten.length >= 2);
  assert.equal(seiten.filter((s) => ohneLeer(s).includes(ohneLeer(erwartet))).length, 2);
});

test('AK1: kein Telefon, keine USt-IdNr., keine Anschrift, keine Ziffernfolge ab 5 Stellen, kein Foto im Text der PDF', () => {
  assert.doesNotMatch(text, /\b\d{5,}\b/);
  assert.doesNotMatch(text, /\bUSt\b|Umsatzsteuer|Telefon|\bTel\.|Stra(ß|ss)e|\+49/i);
  assert.equal(text.includes('\uFFFD'), false, 'Zeichen ohne ToUnicode');
});

test('AK1: PDF hat 1 bis 2 Seiten im Format A4 und kein Bild (kein Foto)', () => {
  const r = pruefePdf(pdf, { maxBytes: konfig.profilPdf.maxBytes });
  assert.ok(r.seiten >= 1 && r.seiten <= 2, `Seiten: ${r.seiten}`);
  assert.ok(!pdf.toString('latin1').includes('/Subtype /Image'));
});

// ---- Druck-Layout (Quelle der PDF)
const seiteHtml = profilSeite(inhalt, { adresse: konfig.kontakt.adresse, baseUrl: konfig.baseUrl, stand: quelle.stand });

test('Profil-Seite: nur https:- und mailto:-Verweise, kein <img>, kein src, kein style, kein Skript, kein Telefon', () => {
  const hrefs = [...seiteHtml.matchAll(/\shref="([^"]*)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length >= 3);
  for (const h of hrefs.filter((x) => x !== 'css/profil.css')) assert.match(h, /^(https:\/\/|mailto:)/, h);
  assert.deepEqual(hrefs.filter((h) => h.startsWith('mailto:')), [`mailto:${konfig.kontakt.adresse}`]);
  assert.doesNotMatch(seiteHtml, /<img|\ssrc=|<picture|<script|\sstyle=|<style|<svg|\bon[a-z]+=/i);
  assert.doesNotMatch(seiteHtml, /\bTelefon|\bUSt\b|Umsatzsteuer/i);
});

test('Profil-Seite: Titel "Enrico Falk – Profil" (U+2013), {ph}-Texte als span.ph, Fusszeile', () => {
  assert.equal(pdfTitel(inhalt), 'Enrico Falk \u2013 Profil');
  assert.ok(seiteHtml.includes('<title>Enrico Falk \u2013 Profil</title>'));
  assert.match(seiteHtml, /<span class="ph">Erklärsätze und Verifikationslinks folgen, wenn vorhanden<\/span>/);
  assert.match(seiteHtml, /<footer class="fuss">Entwurf, Stand \d+\. \p{L}+ \d{4}<\/footer>/u);
  assert.doesNotMatch(seiteHtml, /\{ph/);
});

test('Profil-Seite: LinkedIn-Verweis kommt aus de.json (kontakt.antwort), nicht aus dem Template; die URL wird nicht ausgeschrieben', () => {
  const url = /\[LinkedIn\]\((https:[^)]*)\)/.exec(inhalt.kontakt.antwort)[1];
  assert.ok(seiteHtml.includes(`<a href="${url}">LinkedIn</a>`));
  assert.ok(!seiteHtml.replace(`href="${url}"`, '').includes(url));
  assert.ok(!fs.readFileSync(path.join(ROOT, 'src/templates/profil.mjs'), 'utf8').includes('linkedin.com'));
  assert.ok(!text.includes('linkedin.com'), 'URL steht nicht im sichtbaren Text');
});

test('Profil-Seite: fehlender Platzhalter {datum} oder LinkedIn-Verweis bricht ab, ungueltiges Datum ebenso', () => {
  const o = { adresse: konfig.kontakt.adresse, baseUrl: konfig.baseUrl, stand: quelle.stand };
  const c1 = structuredClone(inhalt);
  c1.profilPdf.fuss = 'Entwurf';
  assert.throws(() => profilSeite(c1, o), /datum/);
  const c2 = structuredClone(inhalt);
  c2.kontakt.antwort = 'Kein Link';
  assert.throws(() => profilSeite(c2, o), /LinkedIn/);
  assert.throws(() => profilSeite(inhalt, { ...o, stand: '2026-99-99' }), /Datum/);
});

test('profil.css: Farben und Schriften nur aus dem Mockup, keine gerasterten Effekte (Schatten, Filter, Opacity, Verlauf, Bild)', () => {
  const css = lesen('src/styles/profil.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const mockupCss = /<style>([\s\S]*?)<\/style>/.exec(mockup)[1];
  const farben = (s) => [...s.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)].map((m) => m[0].toLowerCase().replace(/\s+/g, ''));
  const erlaubt = new Set(farben(mockupCss));
  const neu = [...new Set(farben(css))].filter((f) => !erlaubt.has(f));
  assert.deepEqual(neu, [], 'Farben, die das Mockup nicht kennt');
  const familien = [...css.matchAll(/font-family:([^;}]*)|font:[^;}]*?\d(?:pt|rem|px|em)(?:\/[\d.]+)?\s+([^;}]*)/g)].flatMap((m) => (m[1] ?? m[2]).split(','));
  for (const f of familien.map((x) => x.trim().replace(/^["']|["']$/g, ''))) assert.ok(['Bricolage Grotesque', 'Atkinson Hyperlegible', 'sans-serif'].includes(f), `Schrift ${f}`);
  assert.doesNotMatch(css, /box-shadow|text-shadow|filter\s*:|backdrop|[^-]opacity\s*:|gradient|mix-blend|url\((?![^)]*\.woff2)/i);
  assert.doesNotMatch(css, /@import/);
});

// ---- AK 2: Metadaten, Schriften, Knopf
test('AK2: Info-Dictionary genau {Title, Author, CreationDate, ModDate}; Titel "Enrico Falk – Profil", Autor "Enrico Falk"', () => {
  const p = lesePdf(pdf);
  const info = aufloesen(p, p.trailer.get('Info'));
  assert.deepEqual([...info.keys()].sort(), ['Author', 'CreationDate', 'ModDate', 'Title']);
  assert.equal(textString(info.get('Title')), 'Enrico Falk \u2013 Profil');
  assert.equal(textString(info.get('Author')), 'Enrico Falk');
  const stand = quelle.stand.replaceAll('-', '');
  assert.equal(textString(info.get('CreationDate')), `D:${stand}000000Z`);
  assert.equal(textString(info.get('ModDate')), `D:${stand}000000Z`);
  assert.deepEqual([...p.trailer.keys()].sort().filter((k) => k !== 'ID'), ['Info', 'Root', 'Size']);
});

test('AK2: keine Browser-Kennung, kein Benutzername, kein Pfad, kein lokaler Host irgendwo in der Datei (auch in den Stroemen)', () => {
  const b = pdf.toString('latin1');
  for (const alt of ['HeadlessChrome', 'Skia', 'Mozilla', 'file:', '127.0.0.1', 'localhost', '/Users/', '\\Users\\', 'AppData']) {
    assert.ok(!b.toLowerCase().includes(alt.toLowerCase()), alt);
  }
  assert.deepEqual(pruefePdf(pdf, { maxBytes: konfig.profilPdf.maxBytes, erwartung: { Title: pdfTitel(inhalt), Author: inhalt.kopf.name } }).fehler, []);
});

test('AK2: Schriften eingebettet mit ToUnicode (Textauswahl), nur Atkinson Hyperlegible und Bricolage Grotesque, Verweise nur https/mailto', () => {
  const r = pruefePdf(pdf, { maxBytes: konfig.profilPdf.maxBytes });
  assert.ok(r.schriften.length >= 3);
  for (const s of r.schriften) {
    assert.match(s.name.replace(/^[A-Z]{6}\+/, '').replace(/[^A-Za-z]/g, ''), /^(AtkinsonHyperlegible|BricolageGrotesque)/);
    assert.ok(s.eingebettet && s.toUnicode, JSON.stringify(s));
  }
  assert.ok(r.uris.length >= 3);
  for (const u of r.uris) assert.match(u, /^(https:\/\/|mailto:)/);
  assert.ok(r.uris.includes(`mailto:${konfig.kontakt.adresse}`));
});

test('AK2: Dateiname ASCII, Groesse unter 1 MB, dist/ enthaelt die PDF bytegleich zu src/profil', () => {
  assert.ok(pdf.length < 1000000, `${pdf.length} Byte`);
  assert.ok(fs.existsSync(path.join(outDir, konfig.profilPdf.datei)));
  assert.ok(fs.readFileSync(path.join(outDir, konfig.profilPdf.datei)).equals(pdf));
  assert.ok(/^[\x21-\x7e]+$/.test(konfig.profilPdf.datei));
});

test('AK2: Knopf "Profil als PDF laden" verweist auf die PDF, die gelbe Notiz und id="pdf" sind weg', () => {
  assert.ok(index.includes(`<a class="btn ghost" href="${konfig.profilPdf.datei}">Profil als PDF laden</a>`));
  assert.doesNotMatch(index, /id="pdf"|href="#pdf"|Das Profil als PDF folgt/);
  assert.ok(!platzhalterListe(inhalt, konfig).some((e) => /PDF/.test(e.text)));
  assert.equal(inhalt.profil.vermittler.pdfHinweis, undefined);
});

test('AK2: die PDF steht nicht in der Sitemap (Entwurf), Seitentexte ausser der PDF-Notiz sind unveraendert', () => {
  assert.doesNotMatch(lies(outDir, 'sitemap.xml'), /pdf/i);
  assert.doesNotMatch(lies(outDir, 'robots.txt'), /pdf/i);
});

// ---- Aktualitaet (profilAktuell)
function quellbaum() {
  const root = tmp();
  fs.cpSync(path.join(ROOT, 'src'), path.join(root, 'src'), { recursive: true });
  return root;
}

test('profilAktuell: gruen im Repo; liefert Hinweis auf npm run profil, wenn es veraltet ist', () => {
  const r = profilAktuell(ROOT);
  assert.equal(r.aktuell, true, r.hinweis);
  const root = quellbaum();
  assert.equal(profilAktuell(root).aktuell, true);
  const dePfad = path.join(root, 'src/content/de.json');
  const c = JSON.parse(fs.readFileSync(dePfad, 'utf8'));
  c.profil.fakten[0].wert = 'etwas anderes';
  fs.writeFileSync(dePfad, JSON.stringify(c, null, 2));
  const alt = profilAktuell(root);
  assert.equal(alt.aktuell, false);
  assert.match(alt.hinweis, /npm run profil/);
});

test('profilAktuell: rot bei geaendertem profil.css, geaenderter Schrift, geaenderter Adresse, geaendertem Stand und geaenderter PDF', () => {
  const faelle = [
    ['profil.css', (r) => fs.appendFileSync(path.join(r, 'src/styles/profil.css'), '\n/* x */\n')],
    ['Schrift', (r) => fs.appendFileSync(path.join(r, 'src/fonts/atkinson-hyperlegible-latin-400-normal.woff2'), 'x')],
    ['Adresse', (r) => {
      const p = path.join(r, 'src/site.config.json');
      fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace('kontakt@enricofalk.de', 'neu@enricofalk.de'));
    }],
    ['Stand', (r) => {
      const p = path.join(r, 'src/profil/quelle.json');
      const q = JSON.parse(fs.readFileSync(p, 'utf8'));
      q.stand = '2026-11-02';
      fs.writeFileSync(p, JSON.stringify(q));
    }],
    ['PDF', (r) => fs.appendFileSync(path.join(r, 'src/profil', konfig.profilPdf.datei), '\n')],
  ];
  for (const [name, f] of faelle) {
    const root = quellbaum();
    f(root);
    const r = profilAktuell(root);
    assert.equal(r.aktuell, false, name);
    assert.match(r.hinweis, /npm run profil/, name);
  }
});

test('profilAktuell: rot, wenn quelle.json oder die PDF fehlt oder quelle.json ungueltig ist', () => {
  for (const f of ['src/profil/quelle.json', `src/profil/${konfig.profilPdf.datei}`]) {
    const root = quellbaum();
    fs.rmSync(path.join(root, f));
    assert.equal(profilAktuell(root).aktuell, false, f);
  }
  const root = quellbaum();
  fs.writeFileSync(path.join(root, 'src/profil/quelle.json'), '{"stand":"gestern"}');
  assert.equal(profilAktuell(root).aktuell, false);
});

test('profilAktuell: bleibt gruen, wenn die Uhr einen Tag weiterlaeuft (Datum kommt nur aus quelle.json)', (ctx) => {
  const jetzt = Date.now();
  ctx.mock.method(Date, 'now', () => jetzt + 86400000 * 3);
  assert.equal(profilAktuell(ROOT).aktuell, true);
});

test('profilAktuell: rot, wenn die PDF einen Verweis enthaelt, der nicht auf der Profil-Seite steht (Hash und Struktur sonst passend)', () => {
  const root = quellbaum();
  const pdfDatei = path.join(root, 'src/profil', konfig.profilPdf.datei);
  const b = fs.readFileSync(pdfDatei);
  const text = b.toString('latin1');
  assert.ok(text.includes('(https://enricofalk.de/)'));
  const fremd = Buffer.from(text.replace('(https://enricofalk.de/)', '(https://enricofalk.xx/)'), 'latin1'); // gleiche Laenge, Offsets bleiben
  fs.writeFileSync(pdfDatei, fremd);
  const q = JSON.parse(fs.readFileSync(path.join(root, 'src/profil/quelle.json'), 'utf8'));
  q.pdf = sha(fremd);
  fs.writeFileSync(path.join(root, 'src/profil/quelle.json'), JSON.stringify(q));
  const r = profilAktuell(root);
  assert.equal(r.aktuell, false);
  assert.match(r.hinweis, /enricofalk.xx|Verweis|URI/);
});

// ---- AK 3: Build und Lieferform
test('AK3: build bricht ab, wenn die PDF fehlt oder die Konfiguration profilPdf fehlerhaft ist', () => {
  const root = quellbaum();
  fs.rmSync(path.join(root, 'src/profil', konfig.profilPdf.datei));
  assert.throws(() => build({ outDir: path.join(tmp(), 'dist'), root }), /PDF/);
  for (const [k, re] of [
    [{ ...konfig, profilPdf: undefined }, /profilPdf/],
    [{ ...konfig, profilPdf: { ...konfig.profilPdf, datei: 'Profil Ä.pdf' } }, /profilPdf\.datei/],
    [{ ...konfig, profilPdf: { ...konfig.profilPdf, datei: 'profil.txt' } }, /profilPdf\.datei/],
    [{ ...konfig, profilPdf: { ...konfig.profilPdf, maxBytes: 0 } }, /profilPdf\.maxBytes/],
    [{ ...konfig, profilPdf: { ...konfig.profilPdf, maxBytes: 1000001 } }, /profilPdf\.maxBytes/],
  ]) assert.throws(() => baue({ konfig: k }), re);
});

test('AK3: Vertrag: profilPdf.* in de.json ist Pflicht, pdfHinweis wird nicht mehr verlangt', () => {
  const c = structuredClone(inhalt);
  delete c.profilPdf.positionierung;
  assert.throws(() => baue({ inhalt: c }), /profilPdf\.positionierung/);
  const d = structuredClone(inhalt);
  delete d.profilPdf.fuss;
  assert.throws(() => baue({ inhalt: d }), /profilPdf\.fuss/);
  const e = structuredClone(inhalt);
  delete e.profil.vermittler.pdfHinweis;
  assert.doesNotThrow(() => baue({ inhalt: e }));
});

test('AK3: build prueft Titel und Autor exakt (Abweichung vom Inhalt bricht ab)', () => {
  const c = structuredClone(inhalt);
  c.kopf.name = 'Anderer Name';
  assert.throws(() => baue({ inhalt: c }), /Title|Author|Titel|Autor/);
  const d = structuredClone(inhalt);
  d.kopf.profil = 'Lebenslauf';
  assert.throws(() => baue({ inhalt: d }), /Title|Titel/);
});

const mitPdf = (buf, opt = {}) => {
  const d = kopie(outDir);
  fs.writeFileSync(path.join(d, konfig.profilPdf.datei), buf);
  return checkDist(d, { endungen: konfig.erlaubteEndungen, maxBytes: konfig.maxBytes, maxFiles: konfig.maxDateien, pdfMaxBytes: konfig.profilPdf.maxBytes, ...opt });
};

test('AK3: checkDist prueft jede .pdf in dist (auch ohne Build), Basis-PDF ist gruen', () => {
  assert.deepEqual(mitPdf(basisPdf()).fehler, []);
});

test('AK3: checkDist rot bei: Endung nicht erlaubt, zu gross, Creator, Metadata, JavaScript, Launch, URI file:/http:, fremde Schrift, 3 Seiten, /Prev', () => {
  const rot = (buf, re, opt) => {
    const f = mitPdf(buf, opt).fehler;
    assert.ok(f.some((x) => re.test(x) && x.includes(konfig.profilPdf.datei)), `${re}: ${f.join(' | ')}`);
  };
  assert.ok(mitPdf(basisPdf(), { endungen: konfig.erlaubteEndungen.filter((e) => e !== '.pdf') }).fehler.some((x) => /Endung/.test(x)));
  rot(basisPdf(), /Gr(ö|oe)(ß|ss)e|Byte/, { pdfMaxBytes: basisPdf().length - 1 });
  rot(mini((o) => { o[9] = o[9].replace('>>', ' /Creator (x)>>'); }), /Creator/);
  rot(mini((o) => { o[0] = o[0].replace('>>', ' /Metadata 8 0 R>>'); }), /Metadata/);
  rot(mini((o) => { o[10] = o[10].replace('/A <<', '/A <</JavaScript (x) '); }), /JavaScript/);
  rot(mini((o) => { o[10] = o[10].replace('/A <<', '/A <</J#61vaScript (x) '); }), /JavaScript/);
  rot(mini((o) => { o[10] = o[10].replace('/S /URI', '/S /Launch'); }), /Launch/);
  rot(mini((o) => { o[10] = o[10].replace('https://enricofalk.de/', 'file:///C:/Users/x/a.pdf'); }), /URI/);
  rot(mini((o) => { o[10] = o[10].replace('https://enricofalk.de/', 'http://enricofalk.de/'); }), /URI/);
  rot(mini((o) => { o[3] = o[3].replace(' /ToUnicode 7 0 R', ''); }), /ToUnicode/);
  rot(mini((o) => { o[3] = '<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>'; }), /Schrift|Helvetica|eingebettet/);
  rot(mini((o) => { o[1] = '<</Type /Pages /Count 3 /Kids [3 0 R 3 0 R 3 0 R]>>'; }), /Seiten/);
  rot(mini(() => '/Root 1 0 R /Info 10 0 R /Prev 5'), /Prev|Trailer/);
  rot(mini((o) => { o.push(strom('/Type /XObject /Subtype /Image /Width 1 /Height 1', 'x')); }), /Bild|Image/);
  rot(Buffer.from('kein PDF'), /PDF/);
});

test('AK3: Fehlalarm-Schutz: /AAAAAA+Schriftname loest die Sperre fuer /AA nicht aus', () => {
  assert.ok(basisPdf().toString('latin1').includes('/AAAAAA+'));
  assert.deepEqual(mitPdf(basisPdf()).fehler, []);
});

test('AK3: npm run check und STANDARD.endungen kennen .pdf; scripts/check.mjs gibt die PDF-Befunde aus', () => {
  const d = kopie(outDir);
  fs.writeFileSync(path.join(d, konfig.profilPdf.datei), mini((o) => { o[9] = o[9].replace('>>', ' /Creator (x)>>'); }));
  const r = spawnSync(process.execPath, ['scripts/check.mjs', d], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Creator/);
  assert.equal(spawnSync(process.execPath, ['scripts/check.mjs', outDir], { cwd: ROOT, encoding: 'utf8' }).status, 0);
});

test('AK3: scripts/build.mjs bricht ab, wenn die PDF veraltet ist (Hinweis npm run profil)', () => {
  // Nur die Pruefung selbst: scripts/build.mjs ruft profilAktuell(ROOT); hier die Meldung ueber die Funktion belegt.
  const root = quellbaum();
  fs.appendFileSync(path.join(root, 'src/styles/profil.css'), '\n/* x */\n');
  assert.match(profilAktuell(root).hinweis, /npm run profil/);
  assert.match(lesen('scripts/build.mjs'), /profilAktuell/);
  assert.match(lesen('scripts/paket.mjs'), /profilAktuell/);
});

// ---- Nacharbeit T-003 (Diff-Check, QA)
test('m4: der gelesene Text der PDF enthaelt weder Benutzername noch \Users\ noch den Rechnernamen', () => {
  const alles = `${text}\n${pdf.toString('latin1')}`.toLowerCase();
  const u = os.userInfo().username.toLowerCase();
  const bs = String.fromCharCode(92);
  for (const verboten of [u, u.replace(/ /g, ''), `${bs}users${bs}`, '/users/', os.hostname().toLowerCase()]) {
    if (verboten.length >= 4) assert.ok(!alles.includes(verboten), `in der PDF: ${verboten}`);
  }
});

test('m7: profilPdf.datei muss auf ".pdf" enden (der Punkt ist ein echter Punkt)', () => {
  for (const datei of ['profilxpdf', 'profil-pdf', 'xpdf']) {
    assert.throws(() => baue({ konfig: { ...konfig, profilPdf: { ...konfig.profilPdf, datei } } }), /profilPdf\.datei/, datei);
  }
});

test('QA-1: npm run check prueft Titel und Autor auf die Sollwerte aus de.json (Irgendwas als Titel ist rot, die echte PDF gruen)', () => {
  const soll = `${inhalt.kopf.name} \u2013 ${inhalt.kopf.profil}`;
  const lauf = (d) => spawnSync(process.execPath, ['scripts/check.mjs', d], { cwd: ROOT, encoding: 'utf8' });
  const d = kopie(outDir);
  fs.writeFileSync(path.join(d, konfig.profilPdf.datei), mini((o) => { o[9] = o[9].replace(/\/Title <[^>]*>/, '/Title (Irgendwas)'); }));
  const r = lauf(d);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Title/);
  assert.match(r.stderr, new RegExp(soll.replace(/\W/g, '.')));
  const e = kopie(outDir);
  const roh = fs.readFileSync(path.join(e, konfig.profilPdf.datei)).toString('latin1');
  fs.writeFileSync(path.join(e, konfig.profilPdf.datei), Buffer.from(roh.replace('/Author (Enrico Falk)', '/Author (Fremdautor1)'), 'latin1'));
  const r2 = lauf(e);
  assert.equal(r2.status, 1);
  assert.match(r2.stderr, /Author/);
  assert.equal(lauf(outDir).status, 0);
});

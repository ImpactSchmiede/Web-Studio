import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { GEAENDERT, lookInvarianten, vergleicheCss, vergleicheSeite, vergleicheTexte } from '../src/build/compare.mjs';
import { FIXTURE, ROOT, baue, lies } from './_hilfe.mjs';

const mockup = fs.readFileSync(FIXTURE, 'utf8');
const { outDir } = baue();
const index = lies(outDir, 'index.html');
const css = lies(outDir, 'css/site.css');
const MARKE = '/* Feinschliff T-002 */';

test('Mockup-Fixture ist unveraendert (nur eine Kommentarzeile davor, Stand 16:58, SHA 5204cdf3)', () => {
  assert.match(mockup, /^<!-- Fixture: /);
  assert.match(mockup.split('\n')[0], /5204cdf364707edfe80766e8b3d6dee9a3c5336180297bf3fd7778044a11fa02/);
  assert.match(mockup, /\n<!doctype html>\n<html lang="de">/);
  assert.equal((mockup.match(/ style="/g) || []).length, 25);
  assert.match(mockup, /id="beispiele"/);
});

test('AK1 Struktur: dist/index.html entspricht dem Mockup (Unterschiede nur die benannte Erlaubtliste)', () => {
  const r = vergleicheSeite(mockup, index);
  assert.deepEqual(r.unterschiede, []);
  assert.ok(r.tokens > 600, `zu wenige Token: ${r.tokens}`);
});

test('AK1 Texte: alle Textknoten, alt, aria-label, title, description entsprechen dem Mockup (Ausnahmen: Adresse, Kontakt-Notiz)', () => {
  const r = vergleicheTexte(mockup, index);
  assert.deepEqual(r.unterschiede, []);
  assert.ok(r.texte > 100, `zu wenige Texte: ${r.texte}`);
});

test('Selbsttest: Mockup gegen Mockup ergibt nur die eine benannte Textersetzung (Kontakt-Notiz)', () => {
  for (const u of [vergleicheSeite(mockup, mockup).unterschiede, vergleicheTexte(mockup, mockup).unterschiede]) {
    assert.equal(u.length, 2, u.join(' | '));
    assert.match(u[0], /Mailbox/);
    assert.match(u[1], /Adresse ist vorläufig/);
  }
});

test('Selbsttest: gezielte Textaenderung wird gemeldet (Struktur und Text)', () => {
  const r = vergleicheSeite(mockup, index.replace('Profil ansehen', 'Profil ansehen!'));
  assert.ok(r.unterschiede.length >= 2);
  assert.ok(r.unterschiede.some((u) => u.includes('Profil ansehen!')));
  const t = vergleicheTexte(mockup, index.replace('Wobei ich helfe', 'Wobei ich helfe!'));
  assert.ok(t.unterschiede.some((u) => u.includes('Wobei ich helfe!')));
  const a = vergleicheTexte(mockup, index.replace('alt="Porträt von Enrico Falk"', 'alt="Foto"'));
  assert.ok(a.unterschiede.length > 0, 'alt-Text geaendert, nicht gemeldet');
  const d = vergleicheTexte(mockup, index.replace(/<meta name="description" content="[^"]*"/, '<meta name="description" content="x"'));
  assert.ok(d.unterschiede.length > 0);
});

test('Selbsttest: fehlendes Element, geaenderte Klasse, fremder Inline-Stil, geaenderter Titel werden gemeldet', () => {
  assert.ok(vergleicheSeite(mockup, index.replace(/<li><b>Certified Scrum Master \(CSM\)<\/b>[\s\S]*?<\/li>/, '')).unterschiede.length > 0);
  assert.ok(vergleicheSeite(mockup, index.replace('class="btn ghost"', 'class="btn"')).unterschiede.length > 0);
  assert.ok(vergleicheSeite(mockup, index.replace('<h1>', '<h1 style="color:red">')).unterschiede.length > 0);
  assert.ok(vergleicheSeite(mockup, index.replace(/<title>[^<]*/, '<title>Anders')).unterschiede.length > 0);
});

test('Ausnahme Kontakt-Notiz: nur der vom PO vorgegebene Text ist erlaubt, der alte Mockup-Text wird gemeldet', () => {
  assert.match(index, /Platzhalter: Die Mailbox wird vor dem Livegang von außen getestet\./);
  const alt = index.replace(
    'Platzhalter: Die Mailbox wird vor dem Livegang von außen getestet.',
    'Platzhalter: Die Adresse ist vorläufig, ob eine eigene Seiten-Adresse kommt, ist offen. Der Terminlink folgt.',
  );
  assert.ok(vergleicheTexte(mockup, alt).unterschiede.length > 0);
  assert.ok(vergleicheSeite(mockup, alt).unterschiede.length > 0);
  assert.ok(vergleicheTexte(mockup, index.replace('von außen getestet', 'von aussen getestet')).unterschiede.length > 0);
});

test('Ausnahme Foto: <picture>, <source>, img src/loading/decoding sind erlaubt, an anderen Elementen nicht', () => {
  assert.match(index, /<picture>/);
  assert.match(index, /<source type="image\/webp" srcset="bilder\/foto-vorlaeufig\.webp">/);
  assert.match(index, /<img src="bilder\/foto-vorlaeufig\.jpg" width="512" height="512" alt="[^"]+" loading="lazy" decoding="async">/);
  assert.ok(vergleicheSeite(mockup, index.replace('<h1>', '<h1 loading="lazy">')).unterschiede.length > 0);
  assert.ok(vergleicheSeite(mockup, index.replace('<h1>', '<h1 src="x.jpg">')).unterschiede.length > 0);
  assert.ok(vergleicheSeite(mockup, index.replace('<h1>', '<h1 decoding="async">')).unterschiede.length > 0);
  assert.ok(vergleicheSeite(mockup, index.replace('width="512" height="512"', 'width="500" height="512"')).unterschiede.length > 0);
});

test('Ausnahme Footer-Ziele: impressum.html/datenschutz.html nur im Footer', () => {
  assert.match(index, /<footer>[\s\S]*href="impressum\.html"[\s\S]*href="datenschutz\.html"[\s\S]*<\/footer>/);
  assert.ok(vergleicheSeite(mockup, index.replace('class="name" href="#"', 'class="name" href="impressum.html"')).unterschiede.length > 0);
  assert.ok(vergleicheSeite(mockup, index.replace('href="datenschutz.html"', 'href="anders.html"')).unterschiede.length > 0);
});

test('Ausnahme Termin und PDF: href #termin/#pdf nur an btn ghost, Notizen id=termin/id=pdf nur als <p>', () => {
  assert.match(index, /<a class="btn ghost" href="#termin">/);
  assert.match(index, /<a class="btn ghost" href="#pdf">/);
  assert.match(index, /<p class="[^"]*" id="pdf"><span class="ph">Das Profil als PDF folgt\.<\/span><\/p>/);
  assert.match(index, /<p class="note" id="termin"><span class="ph ph-hell">Der Terminlink folgt\.<\/span><\/p>/);
  assert.ok(vergleicheSeite(mockup, index.replace('class="name" href="#"', 'class="name" href="#termin"')).unterschiede.length > 0);
  assert.ok(vergleicheSeite(mockup, index.replace('class="name" href="#"', 'class="name" href="#pdf"')).unterschiede.length > 0);
  assert.ok(vergleicheSeite(mockup, index.replace('<h2>Von Spielen', '<h2 id="termin">Von Spielen')).unterschiede.length > 0);
  assert.ok(vergleicheSeite(mockup, index.replace('<span class="ph">Das Profil als PDF folgt.</span>', '<span class="ph">Anderer Text</span>')).unterschiede.length === 0, 'Notiz-Text selbst ist frei (neuer Text laut PO)');
});

test('CSS: jede Mockup-Regel steckt in site.css (Reihenfolge, Schriftpfad ../fonts/), Zusatzregeln nur fuer neue Klassen', () => {
  const r = vergleicheCss(mockup, css);
  assert.deepEqual(r.fehler, []);
  assert.ok(r.regeln > 90, `zu wenige Regeln: ${r.regeln}`);
  assert.equal(r.zusatz, 14 + 7 + 3 + 1);
  assert.deepEqual(GEAENDERT, [], 'keine Mockup-Regel wird ersetzt, Korrekturen stehen additiv im Abschnitt Feinschliff');
});

test('CSS: Selbsttest, geaenderte oder fehlende Regel und unbekannte Zusatzregel vor der Marke werden gemeldet', () => {
  assert.ok(vergleicheCss(mockup, css.replace('--r:14px', '--r:15px')).fehler.length > 0);
  assert.ok(vergleicheCss(mockup, css.replace(/\.hero\{[^}]*\}/, '')).fehler.length > 0);
  assert.ok(vergleicheCss(mockup, css.replace(MARKE, `body{display:none}\n${MARKE}`)).fehler.length > 0);
  assert.ok(vergleicheCss(mockup, css.replace('url(../fonts/', 'url(fonts/')).fehler.length > 0);
  assert.ok(vergleicheCss(mockup, css.replace(MARKE, '')).fehler.length > 0, 'Marke fehlt');
  assert.equal(css.split(MARKE).length, 2, 'genau eine Marke');
});

test('N1: [hidden]-Regel mit !important steht in site.css', () => {
  assert.match(css.replace(/\s+/g, ''), /\[hidden\]\{display:none!important\}/);
  const quelle = fs.readFileSync(path.join(ROOT, 'src/styles/site.css'), 'utf8');
  assert.equal(quelle, css);
});

test('Look-Invarianten (AK5): Tokens, Farben, Schriften, Animation, Uebergaenge gleich dem Mockup', () => {
  assert.deepEqual(lookInvarianten(mockup, css), []);
});

test('Look-Invarianten: Selbsttest, neue Farbe, geaenderter Token, neue Schrift, Uebergang, weitere Animation werden gemeldet', () => {
  const nach = (s) => `${css}\n${s}\n`;
  assert.ok(lookInvarianten(mockup, nach('a{color:#123456}')).length > 0);
  assert.ok(lookInvarianten(mockup, nach('a{color:rgb(1,2,3)}')).length > 0);
  assert.ok(lookInvarianten(mockup, nach('a{background:hsl(10 20% 30%)}')).length > 0);
  assert.ok(lookInvarianten(mockup, nach('a{color:white}')).length > 0);
  assert.ok(lookInvarianten(mockup, nach(':root{--amber:#E3A62C}')).length > 0);
  assert.ok(lookInvarianten(mockup, nach('@media (prefers-color-scheme:dark){:root{--bg:#000000}}')).length > 0);
  assert.ok(lookInvarianten(mockup, nach('p{font-family:"Comic Sans MS",cursive}')).length > 0);
  assert.ok(lookInvarianten(mockup, nach('a{transition:color .2s}')).length > 0);
  assert.ok(lookInvarianten(mockup, nach('h1{animation:rein 1s}')).length > 0);
  assert.ok(lookInvarianten(mockup, nach('@keyframes neu{from{opacity:0}to{opacity:1}}')).length > 0);
  assert.ok(lookInvarianten(mockup, nach('@media print{:root{--bg:#EDF2F5}}')).length === 0, 'Tokens im Druck auf Hell zuruecksetzen ist erlaubt');
});

test('Feinschliff (AK5): Druck, reduzierte Bewegung, Fokus und Dark-Mode-Kontrast im Kontakt sind vorhanden', () => {
  const nach = css.split(MARKE)[1];
  assert.match(nach, /@media print/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);
  assert.match(nach, /color-scheme:\s*light dark/);
  assert.match(nach.replace(/\s+/g, ' '), /\.name:focus-visible/);
  assert.match(nach.replace(/\s+/g, ' '), /nav a:focus-visible/);
  assert.match(nach.replace(/\s+/g, ' '), /footer a:focus-visible/);
  const dunkel = nach.replace(/\s+/g, '');
  assert.match(dunkel, /@media\(prefers-color-scheme:dark\)\{[^@]*\.contact\.note\{color:#475A68\}/);
  assert.match(dunkel, /\.contact\.ph-hell\{color:var\(--bg\)\}/);
  assert.match(nach, /hyphens:\s*auto/);
  assert.match(nach, /text-wrap:\s*balance/);
});

test('Feinschliff: hyphens:auto nur fuer Fliesstext (p, dd, li), nie fuer h1-h3 und .name', () => {
  const nach = css.split(MARKE)[1].replace(/\s+/g, ' ');
  let n = 0;
  for (const m of nach.matchAll(/([^{}]+)\{[^{}]*hyphens:\s*auto[^{}]*\}/g)) {
    n += 1;
    for (const s of m[1].trim().split(',').map((x) => x.trim())) {
      assert.match(s, /(^|[ >])(p|dd|li)$|^\.(note|methods)$/, `hyphens auf ${s}`);
    }
  }
  assert.ok(n >= 1);
});

test('Feinschliff: Entwurfsbanner bleibt im Druck sichtbar, Navigation, CTA und feste Leiste nicht', () => {
  const druck = css.split(MARKE)[1].replace(/\s+/g, '');
  const block = /@mediaprint\{(.*)$/.exec(druck)?.[1] ?? '';
  assert.ok(block.length > 50, 'kein @media print');
  assert.match(block, /\.bar[^{]*\{[^}]*display:none/);
  assert.match(block, /nav[^{]*\{[^}]*display:none/);
  assert.match(block, /\.cta[^{]*\{[^}]*display:none/);
  assert.doesNotMatch(block, /\.entwurf[^{]*\{[^}]*display:none/);
  assert.match(block, /\.entwurf\{[^}]*color:var\(--ink\)/);
  assert.match(block, /print-color-adjust:exact/);
  assert.match(block, /break-inside:avoid/);
  assert.match(block, /attr\(href\)/);
});

test('Look-Invarianten: im Druck muessen die Tokens den hellen Mockup-Werten entsprechen', () => {
  const nach = (s) => `${css}
${s}
`;
  assert.ok(lookInvarianten(mockup, nach('@media print{:root{--bg:#EDF2F5;--ink:#15222D}}')).length === 0);
  assert.ok(lookInvarianten(mockup, nach('@media print{:root{--bg:#EDF2F6}}')).length > 0);
  assert.ok(lookInvarianten(mockup, nach('@media print{:root{--ink:#E9EFF3}}')).length > 0, 'dunkler Wert im Druck');
  assert.ok(lookInvarianten(mockup, nach('@media print{:root{--neu:#EDF2F5}}')).length > 0, 'neuer Token im Druck');
  assert.ok(lookInvarianten(mockup, nach('@media print{.contact{--bg:#000000}}')).length > 0);
});

test('Ausnahme 8 (Notizen): nur Textknoten und span.ph in p#termin/p#pdf entfallen, andere Elemente werden weiter verglichen', () => {
  const pdf = '<p class="mt-06" id="pdf"><span class="ph">Das Profil als PDF folgt.</span></p>';
  assert.ok(index.includes(pdf));
  const mit = (inneres) => index.replace(pdf, `<p class="mt-06" id="pdf">${inneres}</p>`);
  assert.deepEqual(vergleicheSeite(mockup, mit('<span class="ph">Anderer Text</span>')).unterschiede, []);
  assert.deepEqual(vergleicheSeite(mockup, mit('<span class="ph ph-hell">Anderer Text</span>')).unterschiede, []);
  assert.ok(vergleicheSeite(mockup, mit('<span class="ph">x</span><a href="https://fremd.example">y</a>')).unterschiede.some((u) => u.includes('<a ')));
  assert.ok(vergleicheSeite(mockup, mit('<b>x</b>')).unterschiede.some((u) => u.includes('<b>')));
  assert.ok(vergleicheSeite(mockup, mit('<span class="anders">x</span>')).unterschiede.length > 0);
  const termin = '<p class="note" id="termin"><span class="ph ph-hell">Der Terminlink folgt.</span></p>';
  assert.ok(index.includes(termin));
  assert.ok(vergleicheSeite(mockup, index.replace(termin, '<p class="note" id="termin"><img alt="x"></p>')).unterschiede.some((u) => u.includes('<img')));
  assert.ok(vergleicheTexte(mockup, mit('<span class="ph">Anderer Text</span>')).unterschiede.length === 0);
});

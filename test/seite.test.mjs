// T-002: Seite nach Mockup 16:58 (AK 1 bis 4 und 7 des Tickets, Plan Abschnitt 3).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { platzhalterListe } from '../src/build/platzhalter.mjs';
import { ROOT, FIXTURE, baue, dateien, lies } from './_hilfe.mjs';
import { bildMasse, icoEintraege, jpegSegmente, pngChunks, pngPixel, webpChunks } from './_bild.mjs';

const deText = fs.readFileSync(path.join(ROOT, 'src/content/de.json'), 'utf8');
const inhalt = JSON.parse(deText);
const konfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/site.config.json'), 'utf8'));
const mockup = fs.readFileSync(FIXTURE, 'utf8');
const { outDir } = baue();
const index = lies(outDir, 'index.html');
const SEITEN = ['index.html', 'impressum.html', 'datenschutz.html', '404.html'];
const zaehle = (text, re) => (text.match(re) || []).length;
const phTexte = (html) => [...html.matchAll(/<span class="ph(?: ph-hell)?">([^<]*)<\/span>/g)].map((m) => m[1]);

// ---- AK 1: Inhalt
test('AK1: Abschnitt Aus der Praxis (3 Beispiele), Navigation, 8 Zertifikate mit Aussteller und Hinweis', () => {
  assert.match(index, /<section id="beispiele"><div class="wrap">/);
  assert.equal(zaehle(index, /<article class="case">/g), 3);
  assert.equal(zaehle(index, /<li><b>[^<]+<\/b><small>[^<]+<\/small><\/li>/g), 8);
  assert.match(index, /<li><a href="#beispiele">Aus der Praxis<\/a><\/li>/);
  assert.match(index, /<li><span class="ph">Erklärsätze und Verifikationslinks folgen, wenn vorhanden<\/span><\/li>/);
  assert.equal(zaehle(index, /<dt>Einsatzrollen<\/dt>/g), 1);
  assert.equal(zaehle(index.split('<div class="agency">')[1].split('</dl>')[0], /<dt>/g), 6);
  assert.equal(zaehle(index.split('<section id="profil"')[1].split('</dl>')[0], /<dt>/g), 4);
  assert.match(index, /<title>Enrico Falk, Agile Coach und Problemlöser \(Mockup-Entwurf\)<\/title>/);
});

test('AK1: jeder gelbe Platzhalter des Mockups steht auch auf der Seite (ausser dem vom PO ersetzten Hinweis)', () => {
  const alt = 'Platzhalter: Die Adresse ist vorläufig, ob eine eigene Seiten-Adresse kommt, ist offen. Der Terminlink folgt.';
  const neu = 'Platzhalter: Die Mailbox wird vor dem Livegang von außen getestet.';
  const ausMockup = phTexte(mockup.replace(/<span class="ph" style="color:#F3E3BC">/g, '<span class="ph">'));
  assert.ok(ausMockup.length >= 6);
  const seite = phTexte(index);
  for (const t of ausMockup) {
    if (t === alt) assert.ok(seite.includes(neu), 'neuer Hinweistext fehlt');
    else assert.ok(seite.includes(t), `Platzhalter fehlt: ${t}`);
  }
});

test('AK1: Kontakt-Hinweis nach Vorgabe des PO (Gate 17:30) und Terminlink-Notiz als gelbe Platzhalter; der PDF-Knopf zeigt auf die PDF (T-003)', () => {
  assert.match(index, /<span class="ph ph-hell">Platzhalter: Die Mailbox wird vor dem Livegang von außen getestet\.<\/span>/);
  assert.match(index, /<p class="note" id="termin"><span class="ph ph-hell">Der Terminlink folgt\.<\/span><\/p>/);
  assert.match(index, /<a class="btn ghost" href="profil-enrico-falk\.pdf">Profil als PDF laden<\/a>/);
  assert.doesNotMatch(index, /Das Profil als PDF folgt/);
  assert.doesNotMatch(index, /vorläufig, ob eine eigene Seiten-Adresse/);
});

test('AK1: LinkedIn-URL ist die bestaetigte Profil-URL und kein Platzhalter', () => {
  assert.match(index, /<a href="https:\/\/www\.linkedin\.com\/in\/enrico-falk-b8369517">LinkedIn<\/a>/);
  assert.ok(!phTexte(index).some((t) => /linkedin/i.test(t)));
});

test('Scope: keine Anschrift, USt-IdNr., Telefon oder Ziffernfolge >= 5 auf irgendeiner Seite', () => {
  for (const s of SEITEN) {
    const h = lies(outDir, s);
    assert.doesNotMatch(h, /\b\d{5,}\b/, s);
    assert.doesNotMatch(h, /\bUSt\b|Umsatzsteuer|\bTelefon|\bTel\.\s/, s);
  }
  assert.ok(!fs.existsSync(path.join(outDir, 'Meine_Angaben.txt')));
});

test('Platzhalterliste: aus de.json erzeugt, vollstaendig, mit Schluessel; Foto und Terminlink kommen aus der Konfiguration', () => {
  const l = platzhalterListe(inhalt, konfig);
  assert.ok(l.length >= 10, `nur ${l.length}`);
  assert.ok(l.every((e) => e.stelle && e.text && ['gelb', 'konfig'].includes(e.art)));
  assert.ok(!l.some((e) => e.text === 'Das Profil als PDF folgt.'), 'PDF-Notiz entfaellt (T-003)');
  assert.ok(l.some((e) => e.text === 'Der Terminlink folgt.'));
  assert.ok(l.some((e) => /Mailbox/.test(e.text)));
  assert.ok(l.some((e) => e.art === 'konfig' && /foto/i.test(e.stelle)));
  assert.ok(l.some((e) => e.art === 'konfig' && /terminUrl/.test(e.stelle)));
  assert.equal(l.filter((e) => e.art === 'gelb').length, zaehle(deText, /\{ph(?:-hell)?:/g));
  const ohneTermin = platzhalterListe(inhalt, { ...konfig, kontakt: { ...konfig.kontakt, terminUrl: 'https://x.example/t' } });
  assert.ok(!ohneTermin.some((e) => e.art === 'konfig' && /terminUrl/.test(e.stelle)));
});

// ---- AK 2: Foto
const bilderInDist = () => dateien(outDir).filter((f) => /\.(png|jpe?g|webp|ico)$/i.test(f));

test('AK2: Foto als WebP und JPG, 512x512, ohne Exif/XMP/ICC, Dateiname vorlaeufig', () => {
  assert.ok(fs.existsSync(path.join(outDir, 'bilder/foto-vorlaeufig.webp')));
  assert.ok(fs.existsSync(path.join(outDir, 'bilder/foto-vorlaeufig.jpg')));
  const w = fs.readFileSync(path.join(outDir, 'bilder/foto-vorlaeufig.webp'));
  assert.deepEqual(bildMasse(w, '.webp'), { breite: 512, hoehe: 512 });
  const wk = webpChunks(w).map((c) => c.typ);
  for (const verboten of ['EXIF', 'XMP ', 'ICCP']) assert.ok(!wk.includes(verboten), `WebP-Chunk ${verboten}`);
  const j = fs.readFileSync(path.join(outDir, 'bilder/foto-vorlaeufig.jpg'));
  assert.deepEqual(bildMasse(j, '.jpg'), { breite: 512, hoehe: 512 });
  for (const s of jpegSegmente(j)) {
    assert.notEqual(s.marker, 0xe1, 'JPEG APP1 (Exif/XMP)');
    assert.notEqual(s.marker, 0xe2, 'JPEG APP2 (ICC)');
    assert.ok(!/^(Exif|http:\/\/ns\.adobe|ICC_PROFILE)/.test(s.name), s.name);
  }
});

test('AK2: Foto-<img> mit Breite, Hoehe, Alt-Text aus de.json, WebP zuerst, JPG als Rueckfall, lazy', () => {
  assert.equal(inhalt.hintergrund.foto.alt, 'Porträt von Enrico Falk');
  assert.ok(index.includes(
    '<figure class="photo"><picture><source type="image/webp" srcset="bilder/foto-vorlaeufig.webp">'
    + '<img src="bilder/foto-vorlaeufig.jpg" width="512" height="512" alt="Porträt von Enrico Falk" loading="lazy" decoding="async"></picture></figure>',
  ));
});

test('AK2: alle Bilder in dist ohne Metadaten-Chunks, hoechstens 512 px, nur erlaubte Endungen', () => {
  const liste = bilderInDist();
  assert.ok(liste.length >= 4, liste.join(','));
  for (const f of liste) {
    const buf = fs.readFileSync(path.join(outDir, f));
    const ext = path.extname(f).toLowerCase();
    assert.ok(['.png', '.jpg', '.webp', '.ico'].includes(ext), f);
    if (ext === '.png') {
      for (const c of pngChunks(buf)) assert.ok(!['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME', 'iCCP'].includes(c), `${f}: PNG-Chunk ${c}`);
      const m = bildMasse(buf, ext);
      assert.ok(m.breite <= 512 && m.hoehe <= 512, f);
    } else if (ext === '.webp') {
      for (const c of webpChunks(buf)) assert.ok(!['EXIF', 'XMP ', 'ICCP'].includes(c.typ), `${f}: ${c.typ}`);
      assert.ok(bildMasse(buf, ext).breite <= 512, f);
    } else if (ext === '.jpg') {
      assert.ok(jpegSegmente(buf).every((s) => s.marker !== 0xe1 && s.marker !== 0xe2), f);
      assert.ok(bildMasse(buf, ext).breite <= 512, f);
    } else {
      for (const e of icoEintraege(buf)) {
        for (const c of pngChunks(e.daten)) assert.ok(!['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME', 'iCCP'].includes(c), `${f}: ${c}`);
      }
    }
  }
});

test('AK2: foto.png (Original mit Exif) liegt nie unter src/ oder dist/; src/bilder enthaelt nur erlaubte Dateien', () => {
  for (const wurzel of [path.join(ROOT, 'src'), outDir]) {
    const alle = fs.readdirSync(wurzel, { recursive: true });
    assert.ok(!alle.some((e) => /(^|[\\/])foto\.png$/i.test(e) || /Enrico2019/i.test(e)), wurzel);
  }
  assert.deepEqual(fs.readdirSync(path.join(ROOT, 'src/bilder')).sort(), [
    'apple-touch-icon.png', 'favicon.ico', 'foto-vorlaeufig.jpg', 'foto-vorlaeufig.webp',
  ]);
});

test('AK2: SVG-Datei, GIF und andere Endungen bleiben ausserhalb der Allowlist', () => {
  assert.deepEqual([...konfig.erlaubteEndungen].sort(), ['.css', '.html', '.ico', '.jpg', '.js', '.pdf', '.png', '.txt', '.webp', '.woff2', '.xml']);
});

// ---- AK 3: Favicon, 404, Platzhalterseiten
test('AK3: favicon.ico (PNG 32x32 darin, gelber Block auf dunklem Grund) und apple-touch-icon (180 px) ohne SVG', () => {
  const ico = fs.readFileSync(path.join(outDir, 'favicon.ico'));
  const e = icoEintraege(ico);
  assert.equal(e.length, 1);
  assert.deepEqual([e[0].breite, e[0].hoehe], [32, 32]);
  assert.deepEqual(bildMasse(e[0].daten, '.png'), { breite: 32, hoehe: 32 });
  assert.deepEqual(pngPixel(e[0].daten, 16, 16).slice(0, 3), [0xe3, 0xa6, 0x2b], 'Mitte: Gelb der Palette');
  assert.deepEqual(pngPixel(e[0].daten, 1, 1).slice(0, 3), [0x15, 0x22, 0x2d], 'Rand: dunkler Grund der Palette');
  const t = fs.readFileSync(path.join(outDir, 'bilder/apple-touch-icon.png'));
  assert.deepEqual(bildMasse(t, '.png'), { breite: 180, hoehe: 180 });
  assert.deepEqual(pngPixel(t, 90, 90).slice(0, 3), [0xe3, 0xa6, 0x2b]);
  assert.deepEqual(pngPixel(t, 2, 2), [0x15, 0x22, 0x2d, 255]);
  assert.ok(!dateien(outDir).some((f) => f.endsWith('.svg')));
});

test('AK3: alle Seiten verweisen im <head> auf das Favicon (404 absolut), kein SVG-Icon', () => {
  for (const s of SEITEN) {
    const h = lies(outDir, s);
    const p = s === '404.html' ? '/' : '';
    assert.ok(h.includes(`<link rel="icon" href="${p}favicon.ico" sizes="32x32">`), s);
    assert.ok(h.includes(`<link rel="apple-touch-icon" href="${p}bilder/apple-touch-icon.png">`), s);
    assert.doesNotMatch(h, /image\/svg/, s);
  }
});

test('AK3: 404 mit Banner "Entwurf vom 19.10.2026." und "Diese Seite ist Teil des Entwurfs.", ohne den Gelb-Hinweis der Startseite', () => {
  const h = lies(outDir, '404.html');
  assert.match(h, /<div class="entwurf"><div class="wrap"><strong>Entwurf vom 19\.10\.2026\.<\/strong><span>Diese Seite ist Teil des Entwurfs\.<\/span><\/div><\/div>/);
  assert.ok(!h.includes(inhalt.entwurf.text));
  assert.ok(!h.includes(inhalt.entwurf.beispiel));
  assert.doesNotMatch(h, /class="ph/);
});

test('AK3: Footer verweist auf impressum.html/datenschutz.html (Seiten relativ, 404 absolut), beide Seiten "in Arbeit" ohne Angaben', () => {
  for (const s of SEITEN) {
    const h = lies(outDir, s);
    const p = s === '404.html' ? '/' : '';
    assert.ok(h.includes(`<li><a href="${p}impressum.html">Impressum</a></li><li><a href="${p}datenschutz.html">Datenschutz</a></li>`), s);
  }
  for (const [datei, titel] of [['impressum.html', 'Impressum'], ['datenschutz.html', 'Datenschutz']]) {
    const h = lies(outDir, datei);
    assert.match(h, new RegExp(`<h1>${titel}</h1>`));
    assert.match(h, /<span class="ph">in Arbeit<\/span>/);
    assert.match(h, /<link rel="stylesheet" href="css\/site\.css">/);
    assert.match(h, /class="entwurf"/);
    assert.doesNotMatch(h, /<script/i);
    assert.match(h, /<a class="name" href="index\.html">Enrico Falk<\/a>/);
    assert.match(h, /<a class="btn primary" href="index\.html">Zur Startseite<\/a>/);
  }
});

// ---- AK 4: Kontakt
test('AK4: Adresse steht nur in site.config.json (und in keiner anderen Datei unter src/ oder scripts/)', () => {
  assert.equal(konfig.kontakt.adresse, 'kontakt@enricofalk.de');
  const verboten = [/kontakt@enricofalk\.de/i, /info@impact-schmiede/i, /"lokal"/, /"domain"/, /"rueckfall"/];
  const geh = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? geh(p) : [p];
  });
  for (const f of [...geh(path.join(ROOT, 'src')), ...geh(path.join(ROOT, 'scripts'))]) {
    if (/\.(woff2|png|jpg|webp|ico|pdf)$/.test(f) || f.endsWith('site.config.json')) continue; // das PDF enthaelt die Adresse (AK 1 T-003)
    const t = fs.readFileSync(f, 'utf8');
    for (const v of verboten) assert.doesNotMatch(t, v, `${f}: ${v}`);
  }
});

test('AK4: Aenderung der Adresse in der Konfiguration aendert nur data-l, data-d und den Rueckfalltext', () => {
  const alt = baue().outDir;
  const neu = baue({ konfig: { ...konfig, kontakt: { ...konfig.kontakt, adresse: 'x.y@example.org' } } }).outDir;
  const erwartet = lies(alt, 'index.html')
    .replace('data-l="kontakt"', 'data-l="x.y"')
    .replace('data-d="enricofalk.de"', 'data-d="example.org"')
    .replace('kontakt [at] enricofalk.de', 'x.y [at] example.org');
  assert.equal(lies(neu, 'index.html'), erwartet);
  assert.ok(lies(neu, 'index.html').includes('data-d="example.org"'));
  for (const f of dateien(alt)) {
    if (f === 'index.html') continue;
    assert.ok(fs.readFileSync(path.join(alt, f)).equals(fs.readFileSync(path.join(neu, f))), f);
  }
});

test('AK4: ungueltige Adresse in der Konfiguration bricht den Build ab', () => {
  for (const a of ['', 'ohne-at.de', 'a@b@c.de', '@example.org', 'x@', 'x@kein-punkt', 'x y@example.org', 'mailto:x@example.org']) {
    assert.throws(() => baue({ konfig: { ...konfig, kontakt: { ...konfig.kontakt, adresse: a } } }), /kontakt\.adresse/, JSON.stringify(a));
  }
});

test('AK4: Termin-Knopf ohne URL verweist auf die gelbe Notiz #termin (id existiert, kein toter Link)', () => {
  assert.equal(konfig.kontakt.terminUrl, '');
  assert.match(index, /<a class="btn ghost" href="#termin">Erstgespräch buchen<\/a>/);
  assert.equal(zaehle(index, /id="termin"/g), 1);
  assert.equal(zaehle(index, /id="pdf"/g), 0);
  assert.doesNotMatch(index, /href="#"[^>]*>Erstgespräch/);
});

test('AK4: Termin-Knopf mit https-URL ist ein gewoehnlicher Link, ohne Notiz #termin', () => {
  const { outDir: o } = baue({ konfig: { ...konfig, kontakt: { ...konfig.kontakt, terminUrl: 'https://termin.example.org/enrico' } } });
  const h = lies(o, 'index.html');
  assert.match(h, /<a class="btn ghost" href="https:\/\/termin\.example\.org\/enrico" rel="noopener">Erstgespräch buchen<\/a>/);
  assert.doesNotMatch(h, /id="termin"/);
  assert.doesNotMatch(h, /href="#termin"/);
});

test('AK4: terminUrl mit javascript:, http: oder Fremdschema bricht den Build ab', () => {
  for (const u of ['javascript:alert(1)', 'http://termin.example.org', 'data:text/html,x', '//termin.example.org', '#termin', 'mailto:a@b.de', 'termin.example.org']) {
    assert.throws(() => baue({ konfig: { ...konfig, kontakt: { ...konfig.kontakt, terminUrl: u } } }), /terminUrl/, u);
  }
});

test('AK4: HTML ohne Klartext-Adresse, ohne mailto, Mail- und Kopierknopf versteckt, Rueckfalltext abgeleitet', () => {
  for (const s of SEITEN) {
    assert.doesNotMatch(lies(outDir, s), /[A-Za-z0-9._+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}|mailto:/i, s);
  }
  assert.match(index, /id="addr" data-l="kontakt" data-d="enricofalk\.de" data-s="Anfrage Agile Coaching">kontakt \[at\] enricofalk\.de<\/span>/);
  assert.match(index, /id="mail" hidden/);
  assert.match(index, /id="copy"[^>]*hidden/);
});

// ---- AK 7: Lieferform
test('AK7: alle Seiten ohne Inline-CSS, Inline-JS, Ereignis-Handler und Fremd-Ladeziele', () => {
  for (const s of SEITEN) {
    const h = lies(outDir, s);
    assert.doesNotMatch(h, /<style|\sstyle=|\son[a-z]+=|<script(?![^>]*\ssrc=)/i, s);
    assert.doesNotMatch(h, /<(link|script|img|source)[^>]*(src|href|srcset)="(https?:)?\/\//i, s);
  }
});

test('Der Inhalt von de.json passt zum Mockup: Seitentitel, Namen der Abschnitte und Reihenfolge', () => {
  const ids = [...index.matchAll(/<section id="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['hilfe', 'beispiele', 'profil', 'vorgehen', 'hintergrund', 'kontakt']);
  const mid = [...mockup.matchAll(/<section id="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, mid);
});

// ---- Metadaten-Zeichenfolgen in allen Bildern (Diff-Check T-002)
test('AK2: JPG endet mit EOI, nach dem Scan-Beginn (SOS) folgt kein APPn-Marker', () => {
  for (const f of bilderInDist().filter((x) => x.endsWith('.jpg'))) {
    const b = fs.readFileSync(path.join(outDir, f));
    assert.deepEqual([b[b.length - 2], b[b.length - 1]], [0xff, 0xd9], `${f}: kein EOI am Ende`);
    const sos = jpegSegmente(b).find((s) => s.marker === 0xda);
    assert.ok(sos, `${f}: kein SOS`);
    for (let i = sos.offset + sos.laenge; i < b.length - 1; i += 1) {
      if (b[i] === 0xff) assert.ok(b[i + 1] < 0xe0 || b[i + 1] === 0xff, `${f}: Marker ${b[i + 1].toString(16)} nach SOS bei ${i}`);
    }
  }
});

test('AK2: Zeichenfolgen Exif, ICC_PROFILE, XMP (ns.adobe.com/xap) und tIME stehen in keinem Bild unter dist/', () => {
  const liste = bilderInDist();
  assert.ok(liste.length >= 4);
  for (const f of liste) {
    const t = fs.readFileSync(path.join(outDir, f)).toString('latin1');
    for (const s of ['Exif', 'ICC_PROFILE', 'http://ns.adobe.com/xap', 'tIME']) assert.ok(!t.includes(s), `${f} enthaelt ${s}`);
  }
});

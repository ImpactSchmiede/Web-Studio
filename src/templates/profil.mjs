// Druck-Layout des Profil-PDF (A4). Eigene Seite aus denselben Inhalten wie die Startseite (de.json, site.config.json).
// Wird NICHT ausgeliefert: Chrome druckt sie einmal (npm run profil), das PDF ist eingecheckt. Verweise nur https: und mailto:
// (relative Links schreibt Chrome als lokalen Dateipfad ins PDF). Kein Bild, keine Anschrift, kein Telefon, keine USt-IdNr.
import { esc, renderText as t } from '../build/text.mjs';

export const TITEL_TRENNER = ' – '; // Gedankenstrich U+2013 (Entscheidung PO 2026-10-19 18:23)

const MONATE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

// 'JJJJ-MM-TT' (gueltiges Kalenderdatum) -> '19. Oktober 2026'. Wirft bei allem anderen.
export function formatiereDatum(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof iso === 'string' ? iso : '');
  const d = m && new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (!m || d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) {
    throw new Error(`Datum ungueltig (JJJJ-MM-TT erwartet): ${JSON.stringify(iso)}`);
  }
  return `${Number(m[3])}. ${MONATE[Number(m[2]) - 1]} ${m[1]}`;
}

export const pdfTitel = (c) => `${c.kopf.name}${TITEL_TRENNER}${c.kopf.profil}`;

// Sollwerte der Info-Felder fuer jede Pruefung (Build, check, Paket): nicht nur die Feldnamen, auch der Inhalt.
export const pdfErwartung = (c) => ({ Title: pdfTitel(c), Author: c.kopf.name });

// LinkedIn-Verweis steht nur einmal im Inhalt (kontakt.antwort als [LinkedIn](https://...)); hier wird er gelesen, nicht kopiert.
export function linkedin(c) {
  const m = /\[(LinkedIn)\]\((https:\/\/[^)\s]+)\)/.exec(c.kontakt.antwort);
  if (!m) throw new Error('de.json kontakt.antwort: Verweis [LinkedIn](https://...) fehlt');
  return { text: m[1], url: m[2] };
}

// opt: { adresse: 'lokal@domain.tld', baseUrl: 'https://host/', stand: 'JJJJ-MM-TT' }
export function profilSeite(c, opt) {
  const p = c.profil;
  const pdf = c.profilPdf;
  if (!pdf.fuss.includes('{datum}')) throw new Error('de.json profilPdf.fuss: Platzhalter {datum} fehlt');
  const fuss = pdf.fuss.replace('{datum}', formatiereDatum(opt.stand));
  const li = linkedin(c);
  const fakten = p.fakten.map((f) => `<dt>${t(f.name)}</dt><dd>${t(f.wert)}</dd>`).join('');
  const zertifikate = p.zertifikate.eintraege.map((z) => `  <li><b>${t(z.name)}</b><small>${t(z.aussteller)}</small></li>`);
  const felder = p.vermittler.felder.map((f) => `<dt>${t(f.name)}</dt><dd>${t(f.wert)}</dd>`).join('');
  const b = c.beispiele;
  const fall = (e) => {
    const paare = b.felder.map((f, i) => `<dt>${t(f)}</dt><dd>${t(e.werte[i])}</dd>`).join('');
    return `  <article class="case"><h3>${t(e.titel)}</h3><p class="tag">${t(e.tag)}</p><dl>${paare}</dl></article>`;
  };
  const fusszeile = `<footer class="fuss">${t(fuss)}</footer>`;
  // Zwei feste Blaetter (A4): Blatt 1 Kopf, Profil, Zertifikate, Vermittler; Blatt 2 Beispiele und Kontakt. Die Fusszeile steht auf
  // jedem Blatt. Laeuft ein Blatt ueber, entsteht eine dritte Seite, und die Pruefung (hoechstens 2 Seiten) schlaegt an.
  const body = [
    '<div class="blatt">',
    '<header class="kopf">',
    ` <h1>${t(c.kopf.name)}</h1>`,
    ` <p class="pos">${t(pdf.positionierung)}</p>`,
    ` <p class="claim">${t(c.hero.titel)}</p>`,
    ` <p class="lead">${t(c.hero.einleitung)}</p>`,
    '</header>',
    '<main>',
    '<section class="blick">',
    ` <h2>${t(p.titel)}</h2>`,
    ` <dl class="fakten">${fakten}</dl>`,
    '</section>',
    '<section class="zert">',
    ` <h2>${t(p.zertifikate.titel)}</h2>`,
    ' <ul class="certs">',
    ...zertifikate,
    `  <li class="hinweis">${t(p.zertifikate.hinweis)}</li>`,
    ' </ul>',
    '</section>',
    '<section class="agency">',
    ` <h2>${t(p.vermittler.titel)}</h2>`,
    ` <dl>${felder}</dl>`,
    '</section>',
    '</main>',
    fusszeile,
    '</div>',
    '<div class="blatt">',
    '<section class="praxis">',
    ` <h2>${t(b.titel)}</h2>`,
    ' <div class="cases">',
    ...b.eintraege.map(fall),
    ' </div>',
    ` <p class="hinweis">${t(b.hinweis)}</p>`,
    '</section>',
    '<section class="kontakt">',
    ` <h2>${t(pdf.kontaktTitel)}</h2>`,
    ' <ul>',
    `  <li><span class="l">${t(pdf.mail)}</span><a href="mailto:${esc(opt.adresse)}">${esc(opt.adresse)}</a></li>`,
    `  <li><span class="l">${t(pdf.web)}</span><a href="${esc(opt.baseUrl)}">${esc(opt.baseUrl)}</a></li>`,
    `  <li><a href="${esc(li.url)}">${esc(li.text)}</a></li>`,
    ' </ul>',
    '</section>',
    fusszeile,
    '</div>',
  ].join('\n');
  return [
    '<!doctype html>',
    '<html lang="de">',
    '<head>',
    '<meta charset="utf-8">',
    `<title>${esc(pdfTitel(c))}</title>`,
    '<link rel="stylesheet" href="css/profil.css">',
    '</head>',
    '<body>',
    body,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

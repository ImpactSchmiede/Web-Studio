// Startseite. Struktur und Klassen wie im Mockup, Texte aus dem Inhalt (de.json).
// Inline-Stile des Mockups sind Klassen: --i:N -> dN, Abstaende -> mt-*, mb-*, m0, ph-hell, fs-095, c-muted.
import { esc, renderText as t } from '../build/text.mjs';
import { banner, fuss } from './layout.mjs';

// Geometrie der Grafik (Form, keine Texte): [Klasse, Index, x, y, Breite, Hoehe, Rundung]
const BLOECKE = [
  ['item', 0, 150, 38, 96, 40, 6], ['hot', 1, 262, 38, 96, 40, 6], ['item', 2, 374, 38, 46, 40, 6],
  ['item', 3, 150, 158, 52, 40, 6], ['item', 4, 212, 158, 52, 40, 6], ['hot', 5, 274, 158, 52, 40, 6], ['item', 6, 336, 158, 52, 40, 6],
  ['item', 7, 150, 280, 28, 40, 5], ['item', 8, 186, 280, 28, 40, 5], ['item', 9, 222, 280, 28, 40, 5], ['hot', 10, 258, 280, 28, 40, 5],
  ['item', 11, 294, 280, 28, 40, 5], ['item', 12, 330, 280, 28, 40, 5], ['item', 13, 366, 280, 28, 40, 5],
];
const BAHNEN_Y = [1, 121, 241];
const BEZEICHNUNG_Y = [24, 144, 264];

function grafik(c) {
  const bahnen = BAHNEN_Y.map((y) => `<rect class="lane" x="1" y="${y}" width="438" height="98" rx="12"/>`).join('');
  const namen = c.hero.grafik.ebenen.map((n, i) => `<text x="18" y="${BEZEICHNUNG_Y[i]}">${t(n)}</text>`).join('');
  const bloecke = BLOECKE.map(([k, i, x, y, w, h, r]) => `<rect class="${k} d${i}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`);
  return [
    `<svg class="gauge" viewBox="0 0 440 340" role="img" aria-label="${esc(c.hero.grafik.beschreibung)}">`,
    `  ${bahnen}`,
    `  ${namen}`,
    '  <g>',
    `   ${bloecke.slice(0, 3).join('')}`,
    `   ${bloecke.slice(3, 7).join('')}`,
    `   ${bloecke.slice(7).join('')}`,
    '   <path class="thread" d="M310 78 V158 M300 198 V280"/>',
    '  </g>',
    ' </svg>',
  ].join('\n');
}

function kopf(c) {
  return [
    '<header class="top"><div class="wrap">',
    ` <a class="name" href="#">${t(c.kopf.name)}</a>`,
    ` <nav aria-label="${esc(c.kopf.navigation)}"><ul>`,
    `  <li><a href="#hilfe">${t(c.kopf.hilfe)}</a></li><li><a href="#beispiele">${t(c.kopf.beispiele)}</a></li><li><a href="#profil">${t(c.kopf.profil)}</a></li><li><a href="#vorgehen">${t(c.kopf.vorgehen)}</a></li><li><a class="btn primary" href="#kontakt">${t(c.kopf.kontakt)}</a></li>`,
    ' </ul></nav>',
    '</div></header>',
  ].join('\n');
}

function hero(c) {
  return [
    '<section class="hero"><div class="wrap grid">',
    ' <div>',
    `  <h1>${t(c.hero.titel)}</h1>`,
    `  <p class="lead">${t(c.hero.einleitung)}</p>`,
    `  <div class="cta"><a class="btn primary" href="#kontakt">${t(c.hero.anfrage)}</a><a class="btn ghost" href="#profil">${t(c.hero.profil)}</a></div>`,
    ' </div>',
    ` ${grafik(c)}`,
    '</div></section>',
  ].join('\n');
}

function ebenenAnzeige(index) {
  const balken = [0, 1, 2].map((j) => (j === index ? '<i class="on"></i>' : '<i></i>')).join('');
  return `<span class="lv" aria-hidden="true">${balken}</span>`;
}

function hilfe(c) {
  const h = c.hilfe;
  const zeilen = h.zeilen.map((z, i) => [
    `  <div class="row"><div class="alt">${ebenenAnzeige(i)}<div><b>${t(z.ebene)}</b><small>${t(z.untertitel)}</small></div></div>`,
    `   <div><h3>${t(z.titel)}</h3><p class="mt-06">${t(z.text)}</p><p class="methods">${t(z.methoden)}</p></div></div>`,
  ].join('\n'));
  return [
    '<section id="hilfe"><div class="wrap">',
    ` <h2>${t(h.titel)}</h2>`,
    ` <p class="mt-1">${t(h.einleitung)}</p>`,
    ' <div class="rows">',
    ...zeilen,
    ' </div>',
    ` <div class="also"><h3>${t(h.auch.titel)}</h3><p class="m0">${t(h.auch.text)}</p></div>`,
    '</div></section>',
  ].join('\n');
}

function beispiele(c) {
  const b = c.beispiele;
  const fall = (e) => {
    const paare = b.felder.map((f, i) => `<dt>${t(f)}</dt><dd>${t(e.werte[i])}</dd>`);
    return [
      `  <article class="case"><h3>${t(e.titel)}</h3><p class="tag">${t(e.tag)}</p><dl>`,
      `   ${paare.join('\n   ')}</dl></article>`,
    ].join('\n');
  };
  return [
    '<section id="beispiele"><div class="wrap">',
    ` <h2>${t(b.titel)}</h2>`,
    ` <p class="mt-1">${t(b.einleitung)}</p>`,
    ' <div class="cases">',
    ...b.eintraege.map(fall),
    ' </div>',
    ` <p class="mt-14 fs-095 c-muted">${t(b.hinweis)}</p>`,
    '</div></section>',
  ].join('\n');
}

function profil(c, pdf) {
  const p = c.profil;
  const fakten = p.fakten.map((f) => `<dt>${t(f.name)}</dt><dd>${t(f.wert)}</dd>`).join('');
  const zertifikate = p.zertifikate.eintraege.map((z) => `    <li><b>${t(z.name)}</b><small>${t(z.aussteller)}</small></li>`);
  const felder = p.vermittler.felder.map((f) => `<dt>${t(f.name)}</dt><dd>${t(f.wert)}</dd>`).join('');
  return [
    '<section id="profil" class="profile"><div class="wrap">',
    ` <h2>${t(p.titel)}</h2>`,
    ' <div class="cols">',
    `  <dl>${fakten}</dl>`,
    '  <div>',
    `   <h3 class="mb-08">${t(p.zertifikate.titel)}</h3>`,
    '   <ul class="certs">',
    ...zertifikate,
    `    <li>${t(p.zertifikate.hinweis)}</li>`,
    '   </ul>',
    '  </div>',
    ' </div>',
    ' <div class="agency">',
    `  <h3>${t(p.vermittler.titel)}</h3>`,
    `  <dl>${felder}</dl>`,
    `  <p class="mt-12"><a class="btn ghost" href="${esc(pdf)}">${t(p.vermittler.pdf)}</a></p>`,
    ' </div>',
    '</div></section>',
  ].join('\n');
}

function vorgehen(c) {
  const v = c.vorgehen;
  const schritte = v.schritte.map((s) => `  <li><h3>${t(s.titel)}</h3><p>${t(s.text)}</p></li>`);
  return [
    '<section id="vorgehen"><div class="wrap">',
    ` <h2>${t(v.titel)}</h2>`,
    ' <ol class="steps">',
    ...schritte,
    ' </ol>',
    '</div></section>',
  ].join('\n');
}

// Foto: WebP mit JPG-Rueckfall, Breite und Hoehe aus der Konfiguration (kein Layoutsprung), Datei ohne Metadaten.
function hintergrund(c, foto) {
  const h = c.hintergrund;
  const [erster, ...weitere] = h.absaetze;
  const bild = `bilder/${foto.datei}`;
  return [
    '<section id="hintergrund" class="profile"><div class="wrap story">',
    ` <figure class="photo"><picture><source type="image/webp" srcset="${esc(bild)}.webp"><img src="${esc(bild)}.jpg" width="${foto.breite}" height="${foto.hoehe}" alt="${esc(h.foto.alt)}" loading="lazy" decoding="async"></picture></figure>`,
    ' <div>',
    `  <h2>${t(h.titel)}</h2>`,
    `  <p class="mt-1">${t(erster)}</p>`,
    ...weitere.map((a) => `  <p>${t(a)}</p>`),
    '</div>',
    '</div></section>',
  ].join('\n');
}

// Termin: ohne URL fuehrt der Knopf auf die gelbe Notiz #termin (kein toter Link), mit URL ist es ein gewoehnlicher Link.
function kontakt(c, adresse, terminUrl) {
  const k = c.kontakt;
  const termin = terminUrl
    ? `<a class="btn ghost" href="${esc(terminUrl)}" rel="noopener">${t(k.terminknopf)}</a>`
    : `<a class="btn ghost" href="#termin">${t(k.terminknopf)}</a>`;
  return [
    '<section id="kontakt" class="contact"><div class="wrap">',
    ` <h2>${t(k.titel)}</h2>`,
    ' <div class="mail">',
    `  <span class="addr" id="addr" data-l="${esc(adresse.lokal)}" data-d="${esc(adresse.domain)}" data-s="${esc(k.betreff)}">${esc(adresse.rueckfall)}</span>`,
    `  <a class="btn primary" id="mail" hidden>${t(k.mailknopf)}</a>`,
    `  ${termin}<button class="btn ghost" type="button" id="copy" data-ok="${esc(k.kopiert)}" data-fehler="${esc(k.kopierfehler)}" hidden>${t(k.kopierknopf)}</button>`,
    ' </div>',
    ' <p class="note" id="copied" aria-live="polite"></p>',
    ` <p class="note">${t(k.hinweis)}</p>`,
    terminUrl ? null : ` <p class="note" id="termin">${t(k.terminHinweis)}</p>`,
    ` <p class="note">${t(k.antwort)}</p>`,
    '</div></section>',
  ]
    .filter((z) => z !== null)
    .join('\n');
}

// opt: { adresse: { lokal, domain, rueckfall }, terminUrl, foto: { datei, breite, hoehe }, pdf: Dateiname des Profil-PDF } (aus site.config.json abgeleitet)
export function startseite(c, opt) {
  return [
    banner(c),
    '',
    kopf(c),
    '',
    '<main>',
    hero(c),
    '',
    hilfe(c),
    '',
    beispiele(c),
    '',
    profil(c, opt.pdf),
    '',
    vorgehen(c),
    '',
    hintergrund(c, opt.foto),
    '',
    kontakt(c, opt.adresse, opt.terminUrl),
    '</main>',
    '',
    fuss(c),
    '',
    `<div class="bar"><a class="btn primary" href="#kontakt">${t(c.hero.anfrage)}</a></div>`,
  ].join('\n');
}

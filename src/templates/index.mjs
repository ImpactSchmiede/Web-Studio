// Startseite. Struktur und Klassen wie im Mockup, Texte aus dem Inhalt (de.json).
// Inline-Stile des Mockups sind Klassen: --i:N -> dN, Abstaende -> mt-*, mb-*, m0, ph-hell.
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
    `  <li><a href="#hilfe">${t(c.kopf.hilfe)}</a></li><li><a href="#profil">${t(c.kopf.profil)}</a></li><li><a href="#vorgehen">${t(c.kopf.vorgehen)}</a></li><li><a class="btn primary" href="#kontakt">${t(c.kopf.kontakt)}</a></li>`,
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

function profil(c) {
  const p = c.profil;
  const fakten = p.fakten.map((f) => `<dt>${t(f.name)}</dt><dd>${t(f.wert)}</dd>`).join('');
  const zertifikate = p.zertifikate.eintraege.map((z) => `    <li><b>${t(z.name)}</b>${t(z.text)}</li>`);
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
    '   </ul>',
    '  </div>',
    ' </div>',
    ' <div class="agency">',
    `  <h3>${t(p.vermittler.titel)}</h3>`,
    `  <dl>${felder}</dl>`,
    `  <p class="mt-12"><a class="btn ghost" href="#">${t(p.vermittler.pdf)}</a></p>`,
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

function hintergrund(c) {
  const h = c.hintergrund;
  const [erster, ...weitere] = h.absaetze;
  const fall = (e) => {
    const paare = h.beispiele.felder.map((f, i) => `<dt>${t(f)}</dt><dd>${t(e.werte[i])}</dd>`).join('');
    return `   <div class="case"><strong>${t(e.titel)}</strong><dl>${paare}</dl></div>`;
  };
  return [
    '<section id="hintergrund" class="profile"><div class="wrap story">',
    ` <div class="photo"><div><strong>${t(h.foto.titel)}</strong><br>${t(h.foto.text)}</div></div>`,
    ' <div>',
    `  <h2>${t(h.titel)}</h2>`,
    `  <p class="mt-1">${t(erster)}</p>`,
    ...weitere.map((a) => `  <p>${t(a)}</p>`),
    `  <h3 class="mt-2">${t(h.beispiele.titel)}</h3>`,
    '  <div class="cases">',
    ...h.beispiele.eintraege.map(fall),
    '  </div>',
    ' </div>',
    '</div></section>',
  ].join('\n');
}

function kontakt(c) {
  const k = c.kontakt;
  return [
    '<section id="kontakt" class="contact"><div class="wrap">',
    ` <h2>${t(k.titel)}</h2>`,
    ' <div class="mail">',
    `  <span class="addr" id="addr" data-l="${esc(k.lokal)}" data-d="${esc(k.domain)}" data-s="${esc(k.betreff)}">${t(k.rueckfall)}</span>`,
    `  <a class="btn primary" id="mail" hidden>${t(k.mailknopf)}</a>`,
    `  <button class="btn ghost" type="button" id="copy" data-ok="${esc(k.kopiert)}" data-fehler="${esc(k.kopierfehler)}" hidden>${t(k.kopierknopf)}</button>`,
    ' </div>',
    ' <p class="note" id="copied" aria-live="polite"></p>',
    ` <p class="note">${t(k.hinweis)}</p>`,
    ` <p class="note">${t(k.linkedin)}</p>`,
    '</div></section>',
  ].join('\n');
}

export function startseite(c) {
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
    profil(c),
    '',
    vorgehen(c),
    '',
    hintergrund(c),
    '',
    kontakt(c),
    '</main>',
    '',
    fuss(c),
    '',
    `<div class="bar"><a class="btn primary" href="#kontakt">${t(c.hero.anfrage)}</a></div>`,
  ].join('\n');
}

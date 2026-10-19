// Gemeinsame Bausteine. Hier stehen nur Struktur und Klassen, keine Texte (Texte: src/content/de.json).
import { esc, renderText as t } from '../build/text.mjs';

export function seite({ lang, titel, beschreibung, css, skript, body }) {
  return [
    '<!doctype html>',
    `<html lang="${esc(lang)}">`,
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${esc(titel)}</title>`,
    beschreibung ? `<meta name="description" content="${esc(beschreibung)}">` : null,
    `<link rel="stylesheet" href="${esc(css)}">`,
    skript ? `<script src="${esc(skript)}" defer></script>` : null,
    '</head>',
    '<body>',
    body,
    '</body>',
    '</html>',
    '',
  ]
    .filter((zeile) => zeile !== null)
    .join('\n');
}

export function banner(c) {
  return `<div class="entwurf"><div class="wrap"><strong>${t(c.entwurf.titel)}</strong><span>${t(c.entwurf.text)}</span><span class="ph">${t(c.entwurf.beispiel)}</span></div></div>`;
}

export function fuss(c) {
  return [
    '<footer><div class="wrap">',
    ` <div>${t(c.fuss.text)}</div>`,
    ` <ul><li><a href="#">${t(c.fuss.impressum)}</a></li><li><a href="#">${t(c.fuss.datenschutz)}</a></li></ul>`,
    '</div></footer>',
  ].join('\n');
}

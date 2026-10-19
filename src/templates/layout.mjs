// Gemeinsame Bausteine. Hier stehen nur Struktur und Klassen, keine Texte (Texte: src/content/de.json).
// basis: '' (Seiten im Hauptordner, relative Verweise, auch per file:// zu oeffnen) oder '/' (404-Seite, die unter
// beliebigem Pfad ausgeliefert wird, darum nur absolute Verweise).
import { esc, renderText as t } from '../build/text.mjs';

export function seite({ lang, titel, beschreibung, basis = '', skript, body }) {
  return [
    '<!doctype html>',
    `<html lang="${esc(lang)}">`,
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${esc(titel)}</title>`,
    beschreibung ? `<meta name="description" content="${esc(beschreibung)}">` : null,
    `<link rel="icon" href="${basis}favicon.ico" sizes="32x32">`,
    `<link rel="apple-touch-icon" href="${basis}bilder/apple-touch-icon.png">`,
    `<link rel="stylesheet" href="${basis}css/site.css">`,
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

// Voller Hinweis mit gelbem Beispiel (Startseite, Platzhalterseiten) oder nur Titel plus eigener Satz (404).
export function banner(c, hinweis) {
  if (hinweis !== undefined) {
    return `<div class="entwurf"><div class="wrap"><strong>${t(c.entwurf.titel)}</strong><span>${t(hinweis)}</span></div></div>`;
  }
  return `<div class="entwurf"><div class="wrap"><strong>${t(c.entwurf.titel)}</strong><span>${t(c.entwurf.text)}</span><span class="ph">${t(c.entwurf.beispiel)}</span></div></div>`;
}

export function fuss(c, basis = '') {
  return [
    '<footer><div class="wrap">',
    ` <div>${t(c.fuss.text)}</div>`,
    ` <ul><li><a href="${basis}impressum.html">${t(c.fuss.impressum)}</a></li><li><a href="${basis}datenschutz.html">${t(c.fuss.datenschutz)}</a></li></ul>`,
    '</div></footer>',
  ].join('\n');
}

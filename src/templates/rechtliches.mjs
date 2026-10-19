// Platzhalterseiten Impressum und Datenschutz (T-002): nur Titel und gelber Hinweis "in Arbeit", keine Angaben.
// Die echten Texte folgen in B-002. Verweise relativ (Seiten liegen im Hauptordner).
import { renderText as t } from '../build/text.mjs';
import { banner, fuss } from './layout.mjs';

export function rechtlicheSeite(c, abschnitt) {
  return [
    banner(c),
    '',
    `<header class="top"><div class="wrap"><a class="name" href="index.html">${t(c.kopf.name)}</a></div></header>`,
    '',
    '<main>',
    '<section class="hero"><div class="wrap">',
    ` <h1>${t(abschnitt.titel)}</h1>`,
    ` <p class="lead">${t(abschnitt.text)}</p>`,
    ` <div class="cta"><a class="btn primary" href="index.html">${t(c.fehlerseite.zurueck)}</a></div>`,
    '</div></section>',
    '</main>',
    '',
    fuss(c),
  ].join('\n');
}

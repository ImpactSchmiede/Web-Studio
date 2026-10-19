// 404-Seite: gleicher Kopf und Fuss, Entwurfsbanner (Titel plus eigener Satz, ohne gelbes Beispiel), kein Skript.
// Wird unter beliebigem Pfad ausgeliefert, darum nur absolute Verweise (Stil unter /css/, Startseite unter /).
import { renderText as t } from '../build/text.mjs';
import { banner, fuss } from './layout.mjs';

export function fehlerseite(c) {
  return [
    banner(c, c.fehlerseite.entwurf),
    '',
    `<header class="top"><div class="wrap"><a class="name" href="/">${t(c.kopf.name)}</a></div></header>`,
    '',
    '<main>',
    '<section class="hero"><div class="wrap">',
    ` <h1>${t(c.fehlerseite.ueberschrift)}</h1>`,
    ` <p class="lead">${t(c.fehlerseite.text)}</p>`,
    ` <div class="cta"><a class="btn primary" href="/">${t(c.fehlerseite.zurueck)}</a></div>`,
    '</div></section>',
    '</main>',
    '',
    fuss(c, '/'),
  ].join('\n');
}

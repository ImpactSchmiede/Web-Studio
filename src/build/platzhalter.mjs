// Platzhalterliste: alle gelb markierten Stellen aus dem Inhalt (de.json) plus Platzhalter, die in der Konfiguration stehen
// (Foto vorlaeufig, Terminlink leer). Quelle fuer die Liste im Bericht (npm run platzhalter).

const TOKEN = /\{(ph|ph-hell):([^}]*)\}/g;

function strings(wert, pfad = '') {
  if (typeof wert === 'string') return [[pfad, wert]];
  if (Array.isArray(wert)) return wert.flatMap((w, i) => strings(w, `${pfad}[${i}]`));
  if (wert && typeof wert === 'object') {
    return Object.entries(wert).flatMap(([k, w]) => strings(w, pfad ? `${pfad}.${k}` : k));
  }
  return [];
}

// -> [{ stelle, text, art }]  art: 'gelb' (de.json) oder 'konfig' (site.config.json)
export function platzhalterListe(inhalt, konfig) {
  const liste = [];
  for (const [stelle, text] of strings(inhalt)) {
    for (const m of text.matchAll(TOKEN)) {
      liste.push({ stelle: `de.json ${stelle}`, text: m[2], art: 'gelb' });
    }
  }
  if (konfig?.foto?.datei && /vorlaeufig/.test(konfig.foto.datei)) {
    liste.push({
      stelle: `site.config.json foto.datei (${konfig.foto.datei})`,
      text: 'Foto ist vorläufig (Foto von 2019, höchstens 512 px, nicht gelb markiert). Veröffentlichung erst nach Enricos Ja, Austausch später.',
      art: 'konfig',
    });
  }
  if (!konfig?.kontakt?.terminUrl) {
    liste.push({
      stelle: 'site.config.json kontakt.terminUrl',
      text: 'Terminlink noch leer: der Knopf „Erstgespräch buchen“ führt auf die gelbe Notiz #termin.',
      art: 'konfig',
    });
  }
  return liste;
}

export function formatPlatzhalter(liste) {
  const zeilen = liste.map((e, i) => `${String(i + 1).padStart(2)}. [${e.art}] ${e.stelle}: ${e.text}`);
  return `${zeilen.join('\n')}\n\n${liste.length} Platzhalter (${liste.filter((e) => e.art === 'gelb').length} gelb markiert in der Seite, ${liste.filter((e) => e.art === 'konfig').length} aus der Konfiguration)\n`;
}

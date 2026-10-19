// Text-Ausgabe: Maskierung und die zwei erlaubten Inline-Formen im Inhalt:
//   {ph:Text}      -> <span class="ph">Text</span>   (gelber Platzhalter)
//   {ph-hell:Text} -> <span class="ph ph-hell">Text</span> (Platzhalter mit heller Schrift auf dunklem Grund)
//   [Text](url)    -> <a href="url">Text</a>
// Reihenfolge: erst tokenisieren, dann Textteile und URL getrennt maskieren.

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SCHEMA_ERLAUBT = new Set(['https', 'mailto']);

// Gibt die URL unveraendert zurueck oder wirft. Allowlist, keine Negativliste.
export function pruefeUrl(url) {
  if (typeof url !== 'string' || url === '') throw new Error('URL leer oder kein Text');
  // Steuer- und Leerzeichen (auch mitten im Schema, z. B. "java<TAB>script:") und Backslash lehnt der Build ab,
  // weil Browser sie entfernen bzw. als Schraegstrich lesen.
  if (/[\u0000-\u0020\u007f-\u00a0\\]/.test(url)) throw new Error(`URL enthaelt Steuer-/Leerzeichen oder Backslash: ${JSON.stringify(url)}`);
  const m = /^([a-z][a-z0-9+.-]*):/i.exec(url);
  if (m) {
    if (!SCHEMA_ERLAUBT.has(m[1].toLowerCase())) throw new Error(`URL-Schema nicht erlaubt: ${JSON.stringify(url)}`);
    return url;
  }
  if (url.startsWith('#')) return url;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  throw new Error(`URL nicht erlaubt (nur https:, mailto:, #... und /...): ${JSON.stringify(url)}`);
}

const TOKEN = /\{(ph|ph-hell):([^}]*)\}|\[([^\]]*)\]\(([^)]*)\)/g;

export function renderText(s) {
  if (typeof s !== 'string') throw new Error('Text erwartet');
  let aus = '';
  let ende = 0;
  for (const m of s.matchAll(TOKEN)) {
    aus += esc(s.slice(ende, m.index));
    if (m[1] !== undefined) {
      const klasse = m[1] === 'ph' ? 'ph' : 'ph ph-hell';
      aus += `<span class="${klasse}">${esc(m[2])}</span>`;
    } else {
      aus += `<a href="${esc(pruefeUrl(m[4]))}">${esc(m[3])}</a>`;
    }
    ende = m.index + m[0].length;
  }
  return aus + esc(s.slice(ende));
}

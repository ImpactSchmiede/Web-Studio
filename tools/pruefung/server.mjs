// Pruefserver: liefert einen dist-Ordner nur an 127.0.0.1 aus (Port 8400-8449, Belegung Web-Studio 8400-8499).
// Header wie auf dem VPS vorgesehen: Content-Security-Policy default-src 'self'. Unbekannte Pfade liefern 404.html mit Status 404.
// Nur Bordmittel (node:http). Pfade werden normalisiert und auf den Ordner begrenzt (.., Backslash, %2e, NUL, versteckte Dateien -> 404).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

export const HOST = '127.0.0.1';
export const PORT_VON = 8400;
export const PORT_BIS = 8449;
const PORT_START = 8410;

const TYPEN = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// URL-Pfad -> absoluter Dateipfad im Ordner, sonst null.
export function loeseAuf(dir, urlPfad) {
  let pfad;
  try {
    pfad = decodeURIComponent(urlPfad.split('?')[0].split('#')[0]);
  } catch {
    return null;
  }
  if (pfad.includes('\0') || pfad.includes('\\') || !pfad.startsWith('/')) return null;
  const teile = pfad.split('/').slice(1);
  if (pfad === '/') teile[0] = 'index.html';
  if (teile.some((t) => t === '' || t === '.' || t === '..' || t.startsWith('.'))) return null;
  const wurzel = path.resolve(dir);
  const ziel = path.join(wurzel, ...teile);
  if (!ziel.startsWith(wurzel + path.sep)) return null;
  try {
    const st = fs.lstatSync(ziel);
    return st.isFile() ? ziel : null;
  } catch {
    return null;
  }
}

export async function startServer({ dir, port, onAnfrage } = {}) {
  const wurzel = path.resolve(dir);
  const fehlerseite = path.join(wurzel, '404.html');
  const server = http.createServer((req, res) => {
    onAnfrage?.(req);
    const kopf = {
      'Content-Security-Policy': "default-src 'self'",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache',
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { ...kopf, Allow: 'GET, HEAD' });
      res.end();
      return;
    }
    let datei = loeseAuf(wurzel, req.url ?? '/');
    let status = 200;
    if (datei === null) {
      datei = fehlerseite;
      status = 404;
    }
    let inhalt;
    try {
      inhalt = fs.readFileSync(datei);
    } catch {
      res.writeHead(404, { ...kopf, 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404');
      return;
    }
    res.writeHead(status, {
      ...kopf,
      'Content-Type': TYPEN[path.extname(datei).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': inhalt.length,
    });
    res.end(req.method === 'HEAD' ? undefined : inhalt);
  });

  const kandidaten = port
    ? [port]
    : [...Array.from({ length: PORT_BIS - PORT_START + 1 }, (_, i) => PORT_START + i), ...Array.from({ length: PORT_START - PORT_VON }, (_, i) => PORT_VON + i)];
  for (const p of kandidaten) {
    if (p < PORT_VON || p > PORT_BIS) throw new Error(`Port ${p} ausserhalb ${PORT_VON}-${PORT_BIS}`);
    const ok = await new Promise((resolve) => {
      const fehler = (e) => {
        server.off('listening', erfolg);
        resolve(e.code === 'EADDRINUSE' || e.code === 'EACCES' ? false : Promise.reject(e));
      };
      const erfolg = () => {
        server.off('error', fehler);
        resolve(true);
      };
      server.once('error', fehler);
      server.once('listening', erfolg);
      server.listen(p, HOST);
    });
    if (ok) {
      return {
        server,
        host: HOST,
        port: p,
        url: `http://${HOST}:${p}`,
        close: () => new Promise((resolve) => {
          server.closeAllConnections?.();
          server.close(() => resolve());
        }),
      };
    }
  }
  throw new Error(`Kein freier Port in ${PORT_VON}-${PORT_BIS}`);
}

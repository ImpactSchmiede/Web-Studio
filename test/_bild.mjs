import zlib from 'node:zlib';
// Minimale Leser fuer PNG, WebP, JPEG und ICO (nur Bordmittel): Chunks bzw. Segmente und Masse.
// Dienen den Tests, um zu belegen, dass keine Metadaten (Exif, XMP, ICC, Textchunks, Zeitstempel) in den Bildern stehen.

export function pngChunks(buf) {
  if (!buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) throw new Error('kein PNG');
  const aus = [];
  let i = 8;
  while (i + 8 <= buf.length) {
    const len = buf.readUInt32BE(i);
    aus.push(buf.toString('latin1', i + 4, i + 8));
    i += 12 + len;
  }
  return aus;
}

export function webpChunks(buf) {
  if (buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WEBP') throw new Error('kein WebP');
  const aus = [];
  let i = 12;
  while (i + 8 <= buf.length) {
    const len = buf.readUInt32LE(i + 4);
    if (i + 8 + len > buf.length) throw new Error('WebP: Chunk-Laenge ueber die Puffergrenze');
    aus.push({ typ: buf.toString('latin1', i, i + 4), offset: i + 8, laenge: len });
    i += 8 + len + (len % 2);
  }
  return aus;
}

export function jpegSegmente(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error('kein JPEG');
  const aus = [];
  let i = 2;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) throw new Error(`JPEG: Marker erwartet bei ${i}`);
    const m = buf[i + 1];
    if (m === 0xff) {
      i += 1;
      continue;
    }
    if (m === 0xd9) break;
    const len = buf.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > buf.length) throw new Error('JPEG: Segment-Laenge ueber die Puffergrenze');
    aus.push({ marker: m, offset: i + 4, laenge: len - 2, name: buf.toString('latin1', i + 4, i + 4 + Math.min(len - 2, 14)) });
    if (m === 0xda) break; // Bilddaten
    i += 2 + len;
  }
  return aus;
}

export function bildMasse(buf, endung) {
  if (endung === '.png') return { breite: buf.readUInt32BE(16), hoehe: buf.readUInt32BE(20) };
  if (endung === '.jpg' || endung === '.jpeg') {
    const sof = jpegSegmente(buf).find((s) => [0xc0, 0xc1, 0xc2].includes(s.marker));
    if (!sof) throw new Error('JPEG ohne SOF');
    return { hoehe: buf.readUInt16BE(sof.offset + 1), breite: buf.readUInt16BE(sof.offset + 3) };
  }
  if (endung === '.webp') {
    const c = webpChunks(buf);
    const x = c.find((k) => k.typ === 'VP8X');
    if (x) return { breite: 1 + buf.readUIntLE(x.offset + 4, 3), hoehe: 1 + buf.readUIntLE(x.offset + 7, 3) };
    const l = c.find((k) => k.typ === 'VP8 ');
    if (l) return { breite: buf.readUInt16LE(l.offset + 6) & 0x3fff, hoehe: buf.readUInt16LE(l.offset + 8) & 0x3fff };
    const ll = c.find((k) => k.typ === 'VP8L');
    if (ll) {
      const b = buf.readUInt32LE(ll.offset + 1);
      return { breite: (b & 0x3fff) + 1, hoehe: ((b >> 14) & 0x3fff) + 1 };
    }
    throw new Error('WebP ohne VP8/VP8L/VP8X');
  }
  throw new Error(`Endung ${endung} unbekannt`);
}

// ICO: Kopf (0, 1, Anzahl) und Eintraege; liefert die eingebetteten Bilddaten.
export function icoEintraege(buf) {
  if (buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) throw new Error('kein ICO');
  const n = buf.readUInt16LE(4);
  const aus = [];
  for (let k = 0; k < n; k += 1) {
    const o = 6 + 16 * k;
    const bytes = buf.readUInt32LE(o + 8);
    const offset = buf.readUInt32LE(o + 12);
    aus.push({ breite: buf[o] || 256, hoehe: buf[o + 1] || 256, daten: buf.subarray(offset, offset + bytes) });
  }
  return aus;
}

// Einzelnes Pixel eines PNG (8 Bit, RGB oder RGBA, nicht verschachtelt) als [r, g, b, a].

export function pngPixel(buf, x, y) {
  const breite = buf.readUInt32BE(16);
  const hoehe = buf.readUInt32BE(20);
  const tiefe = buf[24];
  const farbtyp = buf[25];
  if (tiefe !== 8 || ![2, 6].includes(farbtyp) || buf[28] !== 0) throw new Error('PNG-Format nicht unterstuetzt');
  const bpp = farbtyp === 6 ? 4 : 3;
  const teile = [];
  let i = 8;
  while (i + 8 <= buf.length) {
    const len = buf.readUInt32BE(i);
    if (buf.toString('latin1', i + 4, i + 8) === 'IDAT') teile.push(buf.subarray(i + 8, i + 8 + len));
    i += 12 + len;
  }
  const roh = zlib.inflateSync(Buffer.concat(teile));
  const zeile = breite * bpp;
  let vor = Buffer.alloc(zeile);
  const bild = [];
  for (let r = 0; r < hoehe; r += 1) {
    const f = roh[r * (zeile + 1)];
    const z = Buffer.from(roh.subarray(r * (zeile + 1) + 1, (r + 1) * (zeile + 1)));
    for (let k = 0; k < zeile; k += 1) {
      const a = k >= bpp ? z[k - bpp] : 0;
      const b = vor[k];
      const c = k >= bpp ? vor[k - bpp] : 0;
      let p = 0;
      if (f === 3) p = (a + b) >> 1;
      else if (f === 4) {
        const s = a + b - c;
        const pa = Math.abs(s - a);
        const pb = Math.abs(s - b);
        const pc = Math.abs(s - c);
        p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (f === 1) p = a;
      else if (f === 2) p = b;
      z[k] = (z[k] + p) & 255;
    }
    bild.push(z);
    vor = z;
  }
  const o = x * bpp;
  return [bild[y][o], bild[y][o + 1], bild[y][o + 2], bpp === 4 ? bild[y][o + 3] : 255];
}

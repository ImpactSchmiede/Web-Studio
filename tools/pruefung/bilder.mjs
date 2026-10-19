// Bilder fuer die Seite einmalig erzeugen (Ergebnis wird committet, der Build kopiert nur):
//   node tools/pruefung/bilder.mjs <foto.png> [zielordner]      Standard-Ziel: src/bilder
// Das Original (mit Exif) wird nur gelesen und nie ins Repo kopiert. Chrome zeichnet das Bild in eine Canvas und kodiert neu;
// die Canvas uebernimmt kein Exif und kein XMP, Chrome haengt aber ein ICC-Profil an JPEG und WebP an (im Test beobachtet).
// Darum entfernen entferneIccWebp/entferneMetadatenJpeg alles ausser den Bilddaten (Pixel sind sRGB). Erzeugt:
//   foto-vorlaeufig.webp (Qualitaet .82), foto-vorlaeufig.jpg (.85), jeweils hoechstens 512 px,
//   favicon.ico (PNG 32x32 eingebettet), apple-touch-icon.png (180x180): gelber Block aus der Grafik auf dunklem Grund.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mitChrome } from './chrome.mjs';

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// Farben der Palette (Mockup): --ink hell und --amber.
const INK = '#15222D';
const AMBER = '#E3A62B';
const MAX = 512;

// ICO mit einem PNG-Bild (Browser lesen PNG in ICO seit Jahren): Kopf 6 Byte, Eintrag 16 Byte, dann die PNG-Daten.
export function icoAusPng(png, breite, hoehe) {
  const kopf = Buffer.alloc(22);
  kopf.writeUInt16LE(0, 0);
  kopf.writeUInt16LE(1, 2);
  kopf.writeUInt16LE(1, 4);
  kopf[6] = breite >= 256 ? 0 : breite;
  kopf[7] = hoehe >= 256 ? 0 : hoehe;
  kopf[8] = 0;
  kopf[9] = 0;
  kopf.writeUInt16LE(1, 10);
  kopf.writeUInt16LE(32, 12);
  kopf.writeUInt32LE(png.length, 14);
  kopf.writeUInt32LE(22, 18);
  return Buffer.concat([kopf, png]);
}

// WebP: nur Bildchunks (VP8, VP8L, ALPH) behalten; ICCP, EXIF, XMP raus; VP8X nur, wenn Alpha oder Animation es brauchen.
export function entferneIccWebp(buf) {
  if (buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WEBP') throw new Error('kein WebP');
  const chunks = [];
  let i = 12;
  while (i + 8 <= buf.length) {
    const len = buf.readUInt32LE(i + 4);
    if (i + 8 + len > buf.length) throw new Error('WebP abgeschnitten: Chunk-Laenge ueber die Puffergrenze');
    chunks.push({ typ: buf.toString('latin1', i, i + 4), daten: buf.subarray(i + 8, i + 8 + len) });
    i += 8 + len + (len % 2);
  }
  if (i < buf.length) throw new Error('WebP abgeschnitten: Chunk-Kopf ueber die Puffergrenze');
  const x = chunks.find((c) => c.typ === 'VP8X');
  const behalten = chunks.filter((c) => ['VP8 ', 'VP8L', 'ALPH', 'ANIM', 'ANMF'].includes(c.typ));
  const flags = x ? x.daten[0] & ~(0x20 | 0x08 | 0x04) : 0;
  const teile = [];
  if (x && (flags & (0x10 | 0x02)) !== 0) {
    const kopf = Buffer.from(x.daten);
    kopf[0] = flags;
    teile.push({ typ: 'VP8X', daten: kopf });
  }
  teile.push(...behalten);
  const koerper = Buffer.concat(teile.map((c) => {
    const h = Buffer.alloc(8);
    h.write(c.typ, 0, 'latin1');
    h.writeUInt32LE(c.daten.length, 4);
    return Buffer.concat([h, c.daten, c.daten.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
  }));
  const kopf = Buffer.alloc(12);
  kopf.write('RIFF', 0, 'latin1');
  kopf.writeUInt32LE(4 + koerper.length, 4);
  kopf.write('WEBP', 8, 'latin1');
  return Buffer.concat([kopf, koerper]);
}

// JPEG: nur APP0 (JFIF) und die Bildsegmente behalten; APP1 (Exif, XMP), APP2 (ICC), APP13 (IPTC), Kommentare raus.
export function entferneMetadatenJpeg(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error('kein JPEG');
  const teile = [buf.subarray(0, 2)];
  let i = 2;
  let fertig = false;
  while (i + 2 <= buf.length) {
    if (buf[i] !== 0xff) throw new Error(`JPEG: Marker erwartet bei ${i}`);
    if (buf[i + 1] === 0xff) { // Fuellbytes 0xFF vor einem Marker sind erlaubt und fallen weg
      i += 1;
      continue;
    }
    const m = buf[i + 1];
    if (m === 0xd9) {
      teile.push(buf.subarray(i));
      fertig = true;
      break;
    }
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { // Marker ohne Laenge
      teile.push(buf.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (i + 4 > buf.length) throw new Error('JPEG abgeschnitten: Segment-Laenge fehlt');
    const len = buf.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > buf.length) throw new Error('JPEG abgeschnitten: Segment-Laenge ueber die Puffergrenze');
    if (m === 0xda) {
      teile.push(buf.subarray(i));
      fertig = true;
      break;
    }
    const weg = (m >= 0xe1 && m <= 0xef) || m === 0xfe;
    if (!weg) teile.push(buf.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  if (!fertig) throw new Error('JPEG abgeschnitten: kein Scan (SOS) gefunden');
  return Buffer.concat(teile);
}

async function erzeuge(quelle) {
  const b64 = fs.readFileSync(quelle).toString('base64');
  return mitChrome(async (browser) => {
    const seite = await browser.newPage();
    return seite.evaluate(async (daten, max, ink, amber) => {
      const bytes = Uint8Array.from(atob(daten), (c) => c.charCodeAt(0));
      const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const leinwand = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
      const alsBase64 = async (blob) => {
        const roh = new Uint8Array(await blob.arrayBuffer());
        let s = '';
        for (let i = 0; i < roh.length; i += 0x8000) s += String.fromCharCode(...roh.subarray(i, i + 0x8000));
        return btoa(s);
      };
      const blob = (c, typ, q) => new Promise((ok) => c.toBlob(ok, typ, q));

      const faktor = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const w = Math.round(bmp.width * faktor);
      const h = Math.round(bmp.height * faktor);
      const foto = leinwand(w, h);
      const fx = foto.getContext('2d');
      fx.imageSmoothingQuality = 'high';
      fx.drawImage(bmp, 0, 0, w, h);

      const symbol = (s) => {
        const c = leinwand(s, s);
        const x = c.getContext('2d');
        x.fillStyle = ink;
        x.fillRect(0, 0, s, s);
        const bw = Math.round(s * 0.56);
        const bh = Math.round(s * 0.44);
        x.fillStyle = amber;
        x.beginPath();
        x.roundRect(Math.round((s - bw) / 2), Math.round((s - bh) / 2), bw, bh, Math.round(s * 0.09));
        x.fill();
        return c;
      };

      return {
        breite: w,
        hoehe: h,
        webp: await alsBase64(await blob(foto, 'image/webp', 0.82)),
        jpg: await alsBase64(await blob(foto, 'image/jpeg', 0.85)),
        icon32: await alsBase64(await blob(symbol(32), 'image/png')),
        icon180: await alsBase64(await blob(symbol(180), 'image/png')),
      };
    }, b64, MAX, INK, AMBER);
  });
}

async function main() {
  const [quelle, ziel = path.join(WURZEL, 'src', 'bilder')] = process.argv.slice(2);
  if (!quelle) {
    console.error('Aufruf: node tools/pruefung/bilder.mjs <foto.png> [zielordner]');
    process.exitCode = 2;
    return;
  }
  const r = await erzeuge(path.resolve(quelle));
  fs.mkdirSync(ziel, { recursive: true });
  const schreibe = (name, b64) => {
    const buf = Buffer.from(b64, 'base64');
    fs.writeFileSync(path.join(ziel, name), buf);
    console.log(`${name}: ${buf.length} Byte`);
  };
  r.webp = entferneIccWebp(Buffer.from(r.webp, 'base64')).toString('base64');
  r.jpg = entferneMetadatenJpeg(Buffer.from(r.jpg, 'base64')).toString('base64');
  schreibe('foto-vorlaeufig.webp', r.webp);
  schreibe('foto-vorlaeufig.jpg', r.jpg);
  schreibe('apple-touch-icon.png', r.icon180);
  const ico = icoAusPng(Buffer.from(r.icon32, 'base64'), 32, 32);
  fs.writeFileSync(path.join(ziel, 'favicon.ico'), ico);
  console.log(`favicon.ico: ${ico.length} Byte`);
  console.log(`Foto ${r.breite}x${r.hoehe}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((e) => {
    console.error(`bilder.mjs fehlgeschlagen: ${e.message}`);
    process.exitCode = 1;
  });
}

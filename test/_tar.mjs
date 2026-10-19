// Rohes ustar fuer die Tests, unabhaengig von src/build/paket.mjs (eigene Pruefsumme, jedes Feld ueberschreibbar).
// So lassen sich auch absichtlich kaputte Archive herstellen.

const BLOCK = 512;

const feld = (text, laenge) => {
  const b = Buffer.alloc(laenge);
  Buffer.from(text, 'latin1').copy(b, 0, 0, laenge);
  return b;
};

export function pruefsumme(kopf) {
  let s = 0;
  for (let i = 0; i < BLOCK; i += 1) s += i >= 148 && i < 156 ? 0x20 : kopf[i];
  return s;
}

// f: ende = Bytes 500 bis 511 (Standard leer), name, mode, uid, gid, size, mtime, chksum, typ, linkname, magic, version, uname, gname, prefix (Texte, werden roh geschrieben)
export function kopf(f) {
  const k = Buffer.alloc(BLOCK);
  const o = {
    mode: '0000644\0', uid: '0000000\0', gid: '0000000\0', mtime: '00000000000\0', typ: '0', linkname: '', magic: 'ustar\0', version: '00',
    uname: '', gname: '', prefix: '', ...f,
  };
  feld(o.name, 100).copy(k, 0);
  feld(o.mode, 8).copy(k, 100);
  feld(o.uid, 8).copy(k, 108);
  feld(o.gid, 8).copy(k, 116);
  feld(o.size, 12).copy(k, 124);
  feld(o.mtime, 12).copy(k, 136);
  feld('        ', 8).copy(k, 148);
  feld(o.typ, 1).copy(k, 156);
  feld(o.linkname, 100).copy(k, 157);
  feld(o.magic, 6).copy(k, 257);
  feld(o.version, 2).copy(k, 263);
  feld(o.uname, 32).copy(k, 265);
  feld(o.gname, 32).copy(k, 297);
  feld(o.prefix, 155).copy(k, 345);
  feld(o.ende ?? '', 12).copy(k, 500);
  const summe = o.chksum ?? `${pruefsumme(k).toString(8).padStart(6, '0')}\0 `;
  feld(summe, 8).copy(k, 148);
  return k;
}

const auffuellen = (b) => Buffer.concat([b, Buffer.alloc((BLOCK - (b.length % BLOCK)) % BLOCK)]);

// eintraege: [{ name, daten (Buffer|string), ...Kopffelder }]; optionen: ende (Anzahl Nullbloecke, Standard 2), danach (Bytes nach dem Ende)
export function roherTar(eintraege, { ende = 2, danach = null, kuerzeUm = 0 } = {}) {
  const teile = [];
  for (const e of eintraege) {
    const daten = Buffer.isBuffer(e.daten) ? e.daten : Buffer.from(e.daten ?? '', 'latin1');
    const { daten: _d, ...felder } = e;
    teile.push(kopf({ size: `${daten.length.toString(8).padStart(11, '0')}\0`, ...felder }), auffuellen(daten));
  }
  teile.push(Buffer.alloc(BLOCK * ende));
  if (danach) teile.push(danach);
  const alles = Buffer.concat(teile);
  return kuerzeUm ? alles.subarray(0, alles.length - kuerzeUm) : alles;
}

// Standardinhalt, der die Lieferform erfuellt (Seiten minimal, kein PDF).
export const gueltigeEintraege = () => [
  { name: 'index.html', daten: '<!doctype html><title>x</title>' },
  { name: '404.html', daten: '<!doctype html><title>404</title>' },
  { name: 'robots.txt', daten: 'User-agent: *\nDisallow: /\n' },
];

// Chrome fuer das Pruefwerkzeug: eigenes Profil in einem Temp-Ordner (PRUEFUNG_TMP oder Betriebssystem-Temp), nie das Benutzerprofil.
// Aufrufer beenden den Browser im finally ueber mitChrome (schliesst Browser, loescht Profil).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function findeChrome() {
  const kandidaten = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  const gefunden = kandidaten.find((p) => fs.existsSync(p));
  if (!gefunden) throw new Error('Chrome nicht gefunden (Umgebungsvariable CHROME_PATH setzen)');
  return gefunden;
}

// Flags: ohne Hintergrundverkehr und ohne Komponenten-Updates, damit nur Anfragen der Seite entstehen.
const ARGUMENTE = [
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-sync',
  '--disable-default-apps',
  '--no-first-run',
  '--no-default-browser-check',
  '--metrics-recording-only',
  '--disable-features=Translate,MediaRouter,OptimizationHints',
];

// Bei Strg+C (SIGINT) oder SIGTERM: aufraeumen (Chrome beenden, Temp-Profil loeschen), dann mit Exit 130/143 beenden.
// Gibt eine Funktion zurueck, die die Handler wieder entfernt. beenden:false nur fuer Tests.
export function beiAbbruch(aufraeumen, { beenden = true } = {}) {
  const handler = (signal) => {
    try {
      aufraeumen();
    } finally {
      if (beenden) process.exit(signal === 'SIGINT' ? 130 : 143);
    }
  };
  process.on('SIGINT', handler);
  process.on('SIGTERM', handler);
  return () => {
    process.off('SIGINT', handler);
    process.off('SIGTERM', handler);
  };
}

export async function mitChrome(aufgabe) {
  // Erst hier laden: Der Root-Test importiert bilder.mjs, ohne dass tools/pruefung/node_modules vorhanden sein muss.
  const { default: puppeteer } = await import('puppeteer-core');
  const profil = fs.mkdtempSync(path.join(process.env.PRUEFUNG_TMP ?? os.tmpdir(), 'ws-pruefung-chrome-'));
  let browser;
  const loescheProfil = () => fs.rmSync(profil, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  const wegDamit = beiAbbruch(() => {
    try {
      browser?.process()?.kill('SIGKILL');
    } finally {
      loescheProfil();
    }
  });
  try {
    browser = await puppeteer.launch({
      executablePath: findeChrome(),
      headless: true,
      userDataDir: profil,
      args: ARGUMENTE,
      defaultViewport: null,
    });
    return await aufgabe(browser);
  } finally {
    try {
      await browser?.close();
    } catch {
      browser?.process()?.kill();
    }
    wegDamit();
    loescheProfil();
  }
}

export async function chromeVersion(browser) {
  return browser.version();
}

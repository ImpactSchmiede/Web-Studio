import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { esc, pruefeUrl, renderText } from '../src/build/text.mjs';

test('esc maskiert & < > " und Apostroph', () => {
  assert.equal(esc(`<a href="x">&'</a>`), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
});

test('renderText: Script-Text wird maskiert, nicht ausgefuehrt', () => {
  assert.equal(renderText('<script>&'), '&lt;script&gt;&amp;');
});

test('renderText: {ph:...} wird Platzhalter-Span, Inhalt maskiert', () => {
  assert.equal(renderText('a {ph:x <b> y} b'), 'a <span class="ph">x &lt;b&gt; y</span> b');
});

test('renderText: Link, Text und URL getrennt maskiert', () => {
  assert.equal(
    renderText('Siehe [a"b](https://x.de/?a=1&b=2) hier'),
    'Siehe <a href="https://x.de/?a=1&amp;b=2">a&quot;b</a> hier',
  );
});

test('renderText: Reihenfolge Text, Platzhalter, Link', () => {
  assert.equal(renderText('A {ph:B} [C](#d)'), 'A <span class="ph">B</span> <a href="#d">C</a>');
});

const abgelehnt = [
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  ' javascript:alert(1)',
  '\tjavascript:alert(1)',
  'java\tscript:alert(1)',
  '//evil.de',
  '/\\evil.de',
  'data:text/html,x',
  'vbscript:x',
  'http://unsicher.de',
  'foo.html',
  '',
];
for (const url of abgelehnt) {
  test(`pruefeUrl lehnt ab: ${JSON.stringify(url)}`, () => {
    assert.throws(() => pruefeUrl(url));
    assert.throws(() => renderText(`[x](${url})`));
  });
}

const erlaubt = ['https://impact-schmiede.de', 'HTTPS://X.DE/a', 'mailto:a@b.de', '#kontakt', '#', '/', '/pfad/seite'];
for (const url of erlaubt) {
  test(`pruefeUrl erlaubt: ${url}`, () => {
    assert.equal(pruefeUrl(url), url);
  });
}

test('renderText: {ph-hell:...} wird Platzhalter mit heller Schrift', () => {
  assert.equal(renderText('{ph-hell:x}'), '<span class="ph ph-hell">x</span>');
});

test('pruefeUrl: geschuetztes Leerzeichen (NBSP) wird abgelehnt, im Quelltext als Escape geschrieben', () => {
  assert.throws(() => pruefeUrl('\u00a0javascript:x'));
  const quelle = fs.readFileSync(new URL('../src/build/text.mjs', import.meta.url), 'utf8');
  assert.ok(!quelle.includes('\u00a0'), 'woertliches NBSP im Quelltext');
  assert.ok(quelle.includes('\\u00a0'));
});

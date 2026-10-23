import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './_hilfe.mjs';

const lesen = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const ALTE_ROLLEN = /planer|umsetzer|plan-review|diff-check|gegenpr(ü|ue)fung|sonnet/i;

test('T-005 AK1: CLAUDE.md und PROJEKT.md verweisen fuer Agenten, Workflow und Modell auf den Rahmen', () => {
  for (const datei of ['CLAUDE.md', 'docs/PROJEKT.md']) {
    const t = lesen(datei);
    assert.match(t, /RAHMEN-STAND\.md.{0,10}Subagenten, Workflow, Modell/, `${datei}: Verweis RAHMEN-STAND fehlt`);
    assert.match(t, /Batch-Prozess\.md.{0,5} 5b/, `${datei}: Verweis Batch-Prozess 5b fehlt`);
    assert.match(t, /`reviewer`[^\n]*Architektur-Review/, `${datei}: reviewer = Architektur-Review fehlt`);
    assert.match(t, /`qa`[^\n]*QA/, `${datei}: qa = QA fehlt`);
    assert.doesNotMatch(t, ALTE_ROLLEN, `${datei}: alte Aufstellung noch genannt`);
  }
});

test('T-005 AK2: .claude/agents enthaelt nur qa.md und reviewer.md (Architektur-Review), qa.md unveraendert', () => {
  const agenten = fs.readdirSync(path.join(ROOT, '.claude/agents')).filter((f) => f.endsWith('.md')).sort();
  assert.deepEqual(agenten, ['qa.md', 'reviewer.md']);
  const reviewer = lesen('.claude/agents/reviewer.md');
  assert.match(reviewer, /^name: reviewer$/m);
  assert.match(reviewer, /^description: Architektur-Review \(Batch-Prozess 5b\)/m);
  assert.match(reviewer, /Schlusslauf/);
  assert.doesNotMatch(reviewer, /Modus (Plan-Review|Diff-Check)/);
  const alt = spawnSync('git', ['show', 'a4a7df7:.claude/agents/qa.md'], { cwd: ROOT, encoding: 'utf8' });
  if (alt.status === 0) assert.equal(lesen('.claude/agents/qa.md').replace(/\r\n/g, '\n'), alt.stdout.replace(/\r\n/g, '\n'));
});

test('T-005 AK4: Batch-Ablauf nennt Architektur-Review nach dem Batch-Plan und den Schlusslauf Gesamtarchitektur', () => {
  const tickets = lesen('docs/PROJEKT.md').split(/^## /m).find((a) => a.startsWith('Tickets'));
  assert.match(tickets, /Batch-Plan[^\n]*Architektur-Review/);
  assert.match(tickets, /Schlusslauf[^\n]*Gesamtarchitektur/);
});

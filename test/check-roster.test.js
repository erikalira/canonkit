import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let scratch, readme;
before(async () => {
  scratch = await mkdtemp(path.join(os.tmpdir(), 'canonkit-roster-'));
  await mkdir(path.join(scratch, 'reference'));
  await writeFile(path.join(scratch, 'reference/agents-block.md'), await readFile(path.join(repo, 'reference/agents-block.md')));
  readme = await readFile(path.join(repo, 'README.md'), 'utf8');
});
after(async () => { await rm(scratch, { recursive: true, force: true }); });

for (const [name, change, passes] of [
  ['current roster', (s) => s, true],
  ['CRLF and table spacing', (s) => s.replace(/\r?\n/g, '\r\n').replaceAll('|---|', '| --- |'), true],
  ['ownership drift', (s) => s.replace('architecture: patterns,', 'architecture: other,'), false],
  ['authority drift', (s) => s.replace('| veto |', '| none |'), false],
  ['missing row', (s) => s.replace(/^\| \*\*Bob\*\*[^\r\n]+\r?\n/m, ''), false],
  ['duplicate row', (s) => s.replace(/^(\| \*\*Bob\*\*[^\r\n]+)/m, '$1\n$1'), false],
  ['extra table', (s) => s.replace('**Specialists**:', '| Other | Table |\n|---|---|\n\n**Specialists**:'), false],
  ['missing section end', (s) => s.replace('**Specialists**:', '**Other**:'), false],
]) {
  test(`README roster: ${name}`, async () => {
    await writeFile(path.join(scratch, 'README.md'), change(readme));
    const result = spawnSync(process.execPath, [path.join(repo, 'scripts/check-roster.mjs'), scratch], { encoding: 'utf8' });
    assert.equal(result.status, passes ? 0 : 1, result.stdout + result.stderr);
    assert.match(result.stdout, passes ? /^OK\t/ : /^FAIL\t/);
  });
}

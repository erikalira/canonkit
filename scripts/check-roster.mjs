#!/usr/bin/env node
// Compare every core-roster cell in order, allowing Markdown spacing and CRLF.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.argv[2] || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function table(text, start, end) {
  text = text.replace(/\r\n/g, '\n');
  const from = text.indexOf(start), to = text.indexOf(end, from + start.length);
  if (from < 0 || to < 0 || text.indexOf(start, from + start.length) >= 0) return null;
  const tables = text.slice(from + start.length, to).match(/(?:^\|[^\n]+\|\n?)+/gm);
  if (tables?.length !== 1) return null;
  const rows = tables[0].trim().split('\n')
    .filter((row) => !/^[| :\-]+$/.test(row))
    .map((row) => row.slice(1, -1).split('|').map((cell) => cell.trim()));
  if (rows.length < 2 || rows.some((r) => r.length !== 3)) return null;
  const names = rows.slice(1).map((r) => r[0]);
  return new Set(names).size === names.length ? rows : null;
}

try {
  const canonical = table(fs.readFileSync(path.join(root, 'reference/agents-block.md'), 'utf8'), '## Core team', '## Domain specialists');
  const published = table(fs.readFileSync(path.join(root, 'README.md'), 'utf8'), '**Core**:', '**Specialists**:');
  if (!canonical || !published || JSON.stringify(canonical) !== JSON.stringify(published)) {
    throw new Error('README core roster differs from reference/agents-block.md (names, order, ownership or authority)');
  }
  console.log('OK\tREADME core roster matches reference/agents-block.md');
} catch (error) {
  console.log(`FAIL\t${error.message}`);
  process.exitCode = 1;
}

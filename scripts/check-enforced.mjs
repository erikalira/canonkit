#!/usr/bin/env node
/**
 * Hold every `[ENFORCED]` rule in a reference block to a gate that exists.
 *
 *   node scripts/check-enforced.mjs [root]    # root defaults to the repo root
 *
 * A list item that opens with `[ENFORCED]` is a promise that a hook backs the
 * rule. Each such item in reference/{routing,codex,opencode}-block.md must end
 * with `<!-- enforced-by: kind,kind -->`, and every kind named must
 *   - be in GATE_KINDS or RECORD_KINDS (hooks/canonkit-hook.js), and
 *   - be `enforce` in that block's adapter (routing -> claude, codex -> codex,
 *     opencode -> opencode). Adapters are discovered the way test/hook-core.test.js
 *     does: every .js file HOOK_FILES (bin/cli.js) ships, every *_GATE_MODES export.
 * A block with `[ENFORCED]` items and no adapter fails. A non-Claude block with
 * `[ENFORCED]` items also needs a "Verified on" row in docs/hooks.md: a table row
 * whose first cell is `Verified on`, whose second cell is the harness name
 * (codex, opencode; any case) and which has at least one more non-empty cell.
 *
 * Prose that only mentions the marker is not checked, and a block file that does
 * not exist is skipped. Only `root` (blocks, docs/hooks.md) is read from the
 * argument; the hook code is always this repository's own.
 *
 * Prints one OK/FAIL line per finding; exits 1 on any FAIL.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { HOOK_FILES } from "../bin/cli.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(process.argv[2] ?? REPO);
const requireCjs = createRequire(import.meta.url);

const BLOCKS = [
  ["routing-block.md", "claude"],
  ["codex-block.md", "codex"],
  ["opencode-block.md", "opencode"],
];

const { GATE_KINDS, RECORD_KINDS } = requireCjs(path.join(REPO, "hooks", "canonkit-hook.js"));
const known = new Set([...GATE_KINDS, ...RECORD_KINDS]);

const adapters = {};
const listed = [...new Set(Object.values(HOOK_FILES).flat())].filter((f) => f.endsWith(".js"));
for (const file of listed) {
  for (const [name, modes] of Object.entries(requireCjs(path.join(REPO, "hooks", file)))) {
    const m = /^(.+)_GATE_MODES$/.exec(name);
    if (m) adapters[m[1].toLowerCase()] = modes;
  }
}

// List items opening with the marker: the item runs through its indented
// continuation lines and stops at a blank line or the next unindented line.
function enforcedItems(text) {
  const lines = text.split(/\r?\n/);
  const items = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^[-*]\s+`\[ENFORCED\]`/.test(lines[i])) continue;
    let j = i + 1;
    while (j < lines.length && /^\s+\S/.test(lines[j])) j++;
    items.push({ line: i + 1, text: lines.slice(i, j).join("\n").trim() });
    i = j - 1;
  }
  return items;
}

function hasVerifiedRow(harness) {
  const file = path.join(root, "docs", "hooks.md");
  if (!existsSync(file)) return false;
  return readFileSync(file, "utf8").split(/\r?\n/).some((l) => {
    if (!l.trim().startsWith("|")) return false;
    const cells = l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    return /^verified on$/i.test(cells[0]) && cells[1]?.toLowerCase() === harness
      && cells.slice(2).some((c) => c !== "");
  });
}

const out = [];
const fail = (msg) => out.push(["FAIL", msg]);
const ok = (msg) => out.push(["OK", msg]);

let checked = 0;
for (const [file, harness] of BLOCKS) {
  const full = path.join(root, "reference", file);
  if (!existsSync(full)) continue;
  const items = enforcedItems(readFileSync(full, "utf8"));
  if (items.length === 0) continue;
  const modes = adapters[harness];
  if (!modes) fail(`${file}: has [ENFORCED] rules but no ${harness} adapter (*_GATE_MODES) is shipped by HOOK_FILES`);
  if (harness !== "claude" && !hasVerifiedRow(harness)) {
    fail(`${file}: has [ENFORCED] rules but docs/hooks.md has no "| Verified on | ${harness} | ... |" row`);
  }
  for (const item of items) {
    const where = `${file}:${item.line}`;
    const m = /<!--\s*enforced-by:\s*([^>]*?)\s*-->\s*$/.exec(item.text);
    if (!m) { fail(`${where}: [ENFORCED] item does not end with <!-- enforced-by: kind,... -->`); continue; }
    const kinds = m[1].split(",").map((k) => k.trim()).filter(Boolean);
    if (kinds.length === 0) { fail(`${where}: enforced-by names no kind`); continue; }
    let good = true;
    for (const kind of kinds) {
      if (!known.has(kind)) { fail(`${where}: enforced-by names '${kind}', which is not in GATE_KINDS or RECORD_KINDS`); good = false; }
      else if (modes && modes[kind] !== "enforce") { fail(`${where}: '${kind}' is '${modes[kind]}' in the ${harness} adapter, not 'enforce'`); good = false; }
    }
    if (good) checked++;
  }
}
if (!out.some(([s]) => s === "FAIL")) ok(`${checked} [ENFORCED] rule(s) backed by an enforcing gate`);

for (const [s, msg] of out) console.log(`${s}\t${msg}`);
process.exit(out.some(([s]) => s === "FAIL") ? 1 : 0);

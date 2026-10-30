/**
 * scripts/check-enforced.mjs holds every `[ENFORCED]` rule in a reference block
 * to a gate that exists and that the block's adapter enforces. The script takes
 * a root directory, so each failure case runs it on a temp dir holding one bad
 * block (the hook code it checks against is always this repository's).
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(REPO, "scripts", "check-enforced.mjs");

const run = (root) => spawnSync(process.execPath, [SCRIPT, ...(root ? [root] : [])], { encoding: "utf8" });

let sandbox;
let n = 0;
before(async () => {
  sandbox = await mkdtemp(path.join(os.tmpdir(), "canonkit-enforced-test-"));
});
after(async () => {
  await rm(sandbox, { recursive: true, force: true });
});

// A temp root with the given blocks (name -> text) and, optionally, docs/hooks.md.
async function root(blocks, hooksDoc) {
  const dir = path.join(sandbox, `r${n++}`);
  await mkdir(path.join(dir, "reference"), { recursive: true });
  await mkdir(path.join(dir, "docs"), { recursive: true });
  for (const [name, text] of Object.entries(blocks)) await writeFile(path.join(dir, "reference", name), text);
  if (hooksDoc !== undefined) await writeFile(path.join(dir, "docs", "hooks.md"), hooksDoc);
  return dir;
}

const bullet = (tail) => `# Block\n\nProse that mentions \`[ENFORCED]\` is not checked.\n\n- \`[ENFORCED]\` **A rule**, wrapped\n  over two lines.${tail}\n`;

describe("check-enforced", () => {
  test("passes on the real repository", () => {
    const r = run();
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /^OK\t/);
  });

  test("a missing annotation fails", async () => {
    const r = run(await root({ "routing-block.md": bullet("") }));
    assert.equal(r.status, 1);
    assert.match(r.stdout, /routing-block\.md:5: .*does not end with <!-- enforced-by/);
  });

  test("an unknown kind fails", async () => {
    const r = run(await root({ "routing-block.md": bullet(" <!-- enforced-by: git,nonsense -->") }));
    assert.equal(r.status, 1);
    assert.match(r.stdout, /'nonsense', which is not in GATE_KINDS or RECORD_KINDS/);
  });

  // The "kind is not `enforce` in the adapter" branch needs an adapter with a text/off mode
  // (CODEX_GATE_MODES, slice 6); until one ships there is nothing real to point it at.
  test("a block whose harness ships no adapter fails, Verified-on row or not", async () => {
    const r = run(await root({ "opencode-block.md": bullet(" <!-- enforced-by: git-bypass -->") }, "| Verified on | opencode | 1 | 2 | 3 |\n"));
    assert.equal(r.status, 1);
    assert.match(r.stdout, /opencode-block\.md: has \[ENFORCED\] rules but no opencode adapter/);
  });

  test("a non-Claude block with [ENFORCED] items and no Verified-on row fails", async () => {
    const r = run(await root({ "opencode-block.md": bullet(" <!-- enforced-by: git-bypass -->") }, "# Hooks\n"));
    assert.equal(r.status, 1);
    assert.match(r.stdout, /no "\| Verified on \| opencode \| \.\.\. \|" row/);
  });

  test("a block file that does not exist is skipped", async () => {
    const r = run(await root({}));
    assert.equal(r.status, 0, r.stdout);
  });
});

/**
 * The Codex adapter, hooks/canonkit-codex.js, through the real process.
 *
 * Each test spawns the adapter the way Codex would run it once installed: from a
 * folder holding exactly HOOK_FILES.codex, under a parent package that says
 * "type": "module" (the condition-5 case: the folder's own package.json must keep
 * both files CommonJS). Input is shaped like the Codex hooks docs describe it
 * (learn.chatgpt.com/docs/hooks.md, read 2026-10-30), and the real captures in
 * test/fixtures/codex/ (codex-cli 0.166.0, Windows, slice 7) pin those shapes.
 *
 * Asserted: stdout and exit code. Codex honours a deny and nothing softer, so
 * the adapter prints a deny for an `enforce` kind and nothing for anything else.
 *
 * The secret values are concatenated on purpose: spelled out, the hook denies
 * the write of this file.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdtemp, rm, mkdir, writeFile, copyFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { HOOK_FILES } from "../bin/cli.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOOKS_DIR = path.join(REPO, "hooks");
const requireCjs = createRequire(import.meta.url);
const { normalizeCodex, parsePatch, codexOutput, CODEX_GATE_MODES } = requireCjs(path.join(HOOKS_DIR, "canonkit-codex.js"));
const { evaluate, GATE_KINDS } = requireCjs(path.join(HOOKS_DIR, "canonkit-hook.js"));

const FAKE_AWS_KEY = "AKIA" + "ABCDEFGHIJKLMNOP";

let ROOT; // temp root: HOME for every spawn, and the "type": "module" parent
let INSTALL; // ROOT/canonkit: exactly HOOK_FILES.codex
let PROJ; // the session's cwd

// A folder under ROOT holding the named files from hooks/.
async function installDir(name, files) {
  const dir = path.join(ROOT, name);
  await mkdir(dir, { recursive: true });
  for (const f of files) await copyFile(path.join(HOOKS_DIR, f), path.join(dir, f));
  return dir;
}

before(async () => {
  ROOT = await mkdtemp(path.join(os.tmpdir(), "canonkit-codex-"));
  await writeFile(path.join(ROOT, "package.json"), JSON.stringify({ type: "module" }));
  INSTALL = await installDir("canonkit", HOOK_FILES.codex);
  PROJ = path.join(ROOT, "project");
  await mkdir(PROJ);
});
after(async () => {
  await rm(ROOT, { recursive: true, force: true });
});

// Runs the adapter in `dir` with stdin as given (an object is sent as JSON).
function spawnAdapter(stdin, dir = INSTALL) {
  const env = { ...process.env, HOME: ROOT, USERPROFILE: ROOT };
  delete env.CLAUDE_PROJECT_DIR;
  const r = spawnSync(process.execPath, [path.join(dir, "canonkit-codex.js")], {
    input: typeof stdin === "string" ? stdin : JSON.stringify(stdin),
    cwd: PROJ,
    env,
    encoding: "utf8",
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

// A PreToolUse input with every field the docs' schema requires.
const codexInput = (tool_name, tool_input, extra = {}) => ({
  session_id: "S-CODEX",
  transcript_path: null,
  cwd: PROJ,
  hook_event_name: "PreToolUse",
  model: "gpt-5-codex",
  permission_mode: "default",
  turn_id: "turn-1",
  tool_name,
  tool_use_id: "call-1",
  tool_input,
  ...extra,
});
const bash = (command) => codexInput("Bash", { command });
const patch = (...ops) => codexInput("apply_patch", { command: ["*** Begin Patch", ...ops, "*** End Patch", ""].join("\n") });

const denied = (r, kindWord) => {
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(Object.keys(out), ["hookSpecificOutput"]);
  assert.equal(out.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
  assert.match(out.hookSpecificOutput.permissionDecisionReason, kindWord);
};
const silent = (r) => {
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, "");
};

describe("codex adapter: the installed layout", () => {
  test("the install folder holds exactly HOOK_FILES.codex, under a \"type\": \"module\" parent", () => {
    assert.deepEqual(fs.readdirSync(INSTALL).sort(), [...HOOK_FILES.codex].sort());
    assert.equal(JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).type, "module");
    assert.equal(JSON.parse(fs.readFileSync(path.join(INSTALL, "package.json"), "utf8")).type, "commonjs");
  });

  // The control for the marker: without it, the parent's "module" makes the
  // adapter ESM, `require` is undefined at load, and Node exits 1 before run().
  test("without the package.json marker the adapter cannot even load", async () => {
    const dir = await installDir("no-marker", ["canonkit-codex.js", "canonkit-hook.js"]);
    const r = spawnAdapter(bash("git commit --no-verify -m x"), dir);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /require is not defined/);
  });

  // The core is required inside run()'s try: a missing one is a line on stderr
  // and exit 0, so Codex runs the call (the gates are off, and it says so).
  test("a missing canonkit-hook.js fails open: exit 0, no stdout, one line on stderr", async () => {
    const dir = await installDir("no-core", ["canonkit-codex.js", "package.json"]);
    const r = spawnAdapter(bash("git commit --no-verify -m x"), dir);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
    assert.match(r.stderr, /^canonkit: cannot load canonkit-hook\.js beside canonkit-codex\.js \(MODULE_NOT_FOUND\); the Codex gates are off/);
  });
});

describe("codex adapter: stdout and exit code", () => {
  test("Bash: a git hook bypass is denied", () => {
    denied(spawnAdapter(bash("git commit --no-verify -m x")), /skips the repository's hooks/);
  });

  test("Bash: a plain git commit prints nothing (text: Codex cannot ask)", () => {
    silent(spawnAdapter(bash("git commit -m x")));
  });

  test("Bash: a shell write of a cloud key is denied", () => {
    denied(spawnAdapter(bash(`echo ${FAKE_AWS_KEY} > config/aws.txt`)), /high-confidence secret/);
  });

  test("Bash: an ordinary command prints nothing", () => {
    silent(spawnAdapter(bash("ls -la")));
  });

  test("apply_patch: adding a file with a cloud key is denied", () => {
    denied(spawnAdapter(patch("*** Add File: config/aws.ts", `+export const key = "${FAKE_AWS_KEY}";`)), /high-confidence secret/);
  });

  test("apply_patch: the secret in the second file of three is denied", () => {
    const r = spawnAdapter(patch(
      "*** Add File: src/a.ts", "+export const a = 1;",
      "*** Update File: src/b.ts", "@@ export const b", "-export const b = 1;", `+export const b = "${FAKE_AWS_KEY}";`,
      "*** Add File: src/c.ts", "+export const c = 3;",
    ));
    denied(r, /high-confidence secret/);
  });

  test("apply_patch: the same patch without the secret prints nothing, HIGH-risk path included", () => {
    silent(spawnAdapter(patch(
      "*** Add File: src/auth/session.ts", "+export const a = 1;",
      "*** Update File: src/b.ts", "@@", "-export const b = 1;", "+export const b = 2;",
    )));
  });

  test("apply_patch: a removed secret is not a written one", () => {
    silent(spawnAdapter(patch("*** Update File: src/b.ts", "@@", `-export const b = "${FAKE_AWS_KEY}";`, "+export const b = process.env.KEY;")));
  });

  test("apply_patch: a Move to carries its content to the destination, and is denied with it", () => {
    denied(spawnAdapter(patch("*** Update File: src/old.ts", "*** Move to: src/new.ts", "@@", `+const k = "${FAKE_AWS_KEY}";`)), /high-confidence secret/);
  });

  test("apply_patch: a Delete File prints nothing", () => {
    silent(spawnAdapter(patch("*** Delete File: src/auth/session.ts")));
  });

  test("apply_patch: CRLF patch text still parses", () => {
    const input = codexInput("apply_patch", {
      command: ["*** Begin Patch", "*** Add File: a.ts", `+k = "${FAKE_AWS_KEY}"`, "*** End Patch", ""].join("\r\n"),
    });
    denied(spawnAdapter(input), /high-confidence secret/);
  });

  test("Bash carrying an apply_patch heredoc is gated as a patch too", () => {
    const cmd = ["apply_patch <<'EOF'", "*** Begin Patch", "*** Add File: a.ts", `+k = "${FAKE_AWS_KEY}"`, "*** End Patch", "EOF"].join("\n");
    denied(spawnAdapter(bash(cmd)), /high-confidence secret/);
  });

  test("an event other than PreToolUse prints nothing", () => {
    silent(spawnAdapter({ ...bash("git commit --no-verify -m x"), hook_event_name: "PostToolUse" }));
  });

  for (const [label, stdin] of [["empty", ""], ["not JSON", "{ not json"], ["a JSON array", "[]"], ["JSON null", "null"]]) {
    test(`malformed stdin (${label}) prints nothing, exit 0`, () => {
      const r = spawnAdapter(stdin);
      silent(r);
      assert.equal(r.stderr, "");
    });
  }

  test("a deny writes no log: nothing appears under HOME", () => {
    const before = fs.readdirSync(ROOT).sort();
    denied(spawnAdapter(bash("git push --no-verify")), /skips the repository's hooks/);
    assert.deepEqual(fs.readdirSync(ROOT).sort(), before);
    assert.ok(!fs.existsSync(path.join(ROOT, ".claude")));
  });
});

// normalizeCodex in-process: what each call becomes, where stdout cannot show
// it (the path gates are text in Codex, so they print nothing either way).
// Real Codex stdin, scrubbed (slice 7). <CWD> and <FAKE_AWS_KEY> are filled in
// here, so the key is never spelled out in the repository.
const FIXTURES_DIR = path.join(REPO, "test", "fixtures", "codex");
const FIXTURES = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json")).sort();
const fixtureInput = (file) => {
  const { input } = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, file), "utf8"));
  const text = JSON.stringify(input)
    .split("<CWD>").join(JSON.stringify(PROJ).slice(1, -1))
    .split("<FAKE_AWS_KEY>").join(FAKE_AWS_KEY);
  return JSON.parse(text);
};

describe("codex adapter: real captures (test/fixtures/codex)", () => {
  test("there are captures for both tools Codex gates", () => {
    const tools = FIXTURES.map((f) => JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, f), "utf8")).input.tool_name);
    assert.deepEqual([...new Set(tools)].sort(), ["Bash", "apply_patch"]);
  });
  for (const file of FIXTURES) {
    test(`${file}: the outcome seen in Codex`, () => {
      const { expect, reasonWord } = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, file), "utf8"));
      const r = spawnAdapter(fixtureInput(file));
      if (expect === "deny") denied(r, new RegExp(reasonWord));
      else silent(r);
    });
    test(`${file}: the docs-shaped helper sends the same keys`, () => {
      const real = fixtureInput(file);
      assert.deepEqual(Object.keys(codexInput(real.tool_name, real.tool_input)).sort(), Object.keys(real).sort());
    });
  }
  test("apply_patch: Codex sends an absolute Windows path, and it is the gated file", () => {
    const evts = normalizeCodex(fixtureInput("apply-patch-add-cloud-key.json"), "/f");
    assert.equal(evts.length, 1);
    assert.equal(evts[0].tool, "Write");
    assert.equal(evts[0].toolInput.file_path, `${PROJ}\\creds.txt`);
    assert.match(evts[0].toolInput.content, new RegExp(FAKE_AWS_KEY));
  });
});

describe("normalizeCodex: one Codex call into evaluate()'s events", () => {
  const files = (evts) => evts.map((e) => [e.tool, e.toolInput.file_path, e.toolInput.content]);

  test("a Bash call is one Bash event with the session's fields", () => {
    const evts = normalizeCodex(bash("git status"), "/fallback");
    assert.deepEqual(evts, [{
      event: "PreToolUse", tool: "Bash", toolInput: { command: "git status" }, cwd: PROJ, session: "S-CODEX",
      toolUseId: "call-1", agentId: undefined, agentType: undefined, transcriptPath: null,
    }]);
  });

  test("an apply_patch call is one Write event per file, + lines as content", () => {
    const evts = normalizeCodex(patch(
      "*** Add File: a.ts", "+one", "+two",
      "*** Update File: b.ts", "@@ ctx", " keep", "-gone", "+new", "*** End of File",
      "*** Update File: c.ts", "*** Move to: d/c.ts", "@@", "+moved",
      "*** Delete File: e.ts",
    ), "/fallback");
    assert.deepEqual(files(evts), [
      ["Write", "a.ts", "one\ntwo"],
      ["Write", "b.ts", "new"],
      ["Write", "c.ts", "moved"],
      ["Write", "d/c.ts", "moved"],
      ["Write", "e.ts", ""],
    ]);
  });

  test("a Move to destination is gated as its own path", () => {
    const evts = normalizeCodex(patch("*** Update File: src/old.ts", "*** Move to: src/auth/session.ts", "@@", "+x"), "/fallback");
    const results = evts.map((e) => evaluate(e, { logDir: null, home: ROOT }));
    assert.deepEqual(results.map((r) => r.kind), [null, "high-risk-surface"]);
  });

  test("a Delete File is gated by its path, with no content", () => {
    const [evt, ...rest] = normalizeCodex(patch("*** Delete File: src/auth/session.ts"), "/fallback");
    assert.deepEqual(rest, []);
    assert.equal(evt.toolInput.content, "");
    assert.equal(evaluate(evt, { logDir: null, home: ROOT }).kind, "high-risk-surface");
  });

  test("defensive shapes: an argv command, cmd, Edit/Write names, input/patch keys, a bare string", () => {
    const cmdOf = (ti, tool = "Bash") => normalizeCodex(codexInput(tool, ti), "/f")[0].toolInput.command;
    assert.equal(cmdOf({ command: ["bash", "-lc", "git commit --no-verify -m x"] }), "git commit --no-verify -m x");
    assert.equal(cmdOf({ command: ["powershell.exe", "-Command", "git push"] }), "git push");
    assert.equal(cmdOf({ command: ["git", "status"] }), "git status");
    assert.equal(cmdOf({ cmd: "ls" }, "exec_command"), "ls");
    assert.equal(cmdOf("ls", "shell"), "ls");
    const p = ["*** Begin Patch", "*** Add File: a.ts", "+x", "*** End Patch"].join("\n");
    for (const [tool, ti] of [["Edit", { command: p }], ["Write", { input: p }], ["apply_patch", { patch: p }], ["apply_patch", p]]) {
      assert.deepEqual(files(normalizeCodex(codexInput(tool, ti), "/f")), [["Write", "a.ts", "x"]], tool);
    }
    assert.deepEqual(files(normalizeCodex(codexInput("Write", { file_path: "a.ts", content: "x" }), "/f")), [["Write", "a.ts", "x"]]);
  });

  test("a patch with no file header is still scanned whole, under no path", () => {
    const evts = normalizeCodex(codexInput("apply_patch", { command: `garbled ${FAKE_AWS_KEY}` }), "/f");
    assert.equal(evts.length, 1);
    assert.equal(evaluate(evts[0], { logDir: null, home: ROOT }).decision, "deny");
  });

  test("nothing to gate: another tool, another event, no input", () => {
    assert.deepEqual(normalizeCodex(codexInput("mcp__fs__read", { path: "a" }), "/f"), []);
    assert.deepEqual(normalizeCodex({ ...bash("ls"), hook_event_name: "Stop" }, "/f"), []);
    for (const v of [null, undefined, [], "x", 42]) assert.deepEqual(normalizeCodex(v, "/f"), []);
  });

  test("a missing cwd falls back to the process's", () => {
    const { cwd, ...noCwd } = bash("ls");
    assert.equal(normalizeCodex(noCwd, "/fallback")[0].cwd, "/fallback");
  });

  test("parsePatch ignores + lines before the first header", () => {
    assert.deepEqual(parsePatch("+stray\n*** Add File: a\n+x"), [{ path: "a", content: "x" }]);
  });
});

// Condition 8: Codex marks an ask as a failed hook run and runs the tool, so an
// ask from this adapter would be a gate that silently fails open.
describe("codexOutput never asks", () => {
  test("every decision for every kind: a deny for an enforce kind, otherwise nothing", () => {
    for (const kind of [...GATE_KINDS, null, "unknown"]) {
      for (const decision of ["allow", "ask", "deny", "block"]) {
        const out = codexOutput({ decision, kind, reason: "r" });
        const enforced = decision === "deny" && CODEX_GATE_MODES[kind] === "enforce";
        if (!enforced) { assert.equal(out, null, `${decision}/${kind}`); continue; }
        assert.deepEqual(out, { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: "r" } });
      }
    }
  });
});

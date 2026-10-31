/**
 * The OpenCode adapter, hooks/canonkit-opencode.js, through the plugin that
 * loads it, hooks/opencode-plugin.mjs.
 *
 * Each plugin test imports the plugin the way OpenCode 2 would once installed:
 * from <root>/plugins/canonkit.js, beside <root>/canonkit/ holding exactly
 * HOOK_FILES.opencode, under a parent package that says "type": "module" (the
 * condition-5 case). setup() gets a fake context that records what it
 * registers, and the registered `execute.before` callback is called with
 * events shaped like the OpenCode 2 docs describe them (packages/plugin/src/
 * promise/tool.ts and docs/content/tools.mdx in anomalyco/opencode, read
 * 2026-10-31). The real events in test/fixtures/opencode/ (opencode v2.1.4,
 * Windows, slice 9) pin the shell, write, subagent and execute shapes; edit
 * and patch are still from the docs.
 *
 * Asserted: a deny of an `enforce` kind throws Error(reason), and nothing else
 * throws: not another decision, not an internal error, not a missing file.
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
import { fileURLToPath, pathToFileURL } from "node:url";
import { HOOK_FILES, OPENCODE_PLUGIN } from "../bin/cli.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOOKS_DIR = path.join(REPO, "hooks");
const requireCjs = createRequire(import.meta.url);
const adapter = requireCjs(path.join(HOOKS_DIR, "canonkit-opencode.js"));
const { normalizeOpencode, opencodeDecision, onExecuteBefore, OPENCODE_GATE_MODES } = adapter;
const coreModule = requireCjs(path.join(HOOKS_DIR, "canonkit-hook.js"));
const { evaluate, GATE_KINDS } = coreModule;

const FAKE_AWS_KEY = "AKIA" + "ABCDEFGHIJKLMNOP";
const FAKE_PEM = "-----BEGIN RSA PRIVATE " + "KEY-----";

let ROOT; // temp root: HOME for the child process, and the "type": "module" parent
let INSTALL; // ROOT/opencode: canonkit/ (HOOK_FILES.opencode) and plugins/canonkit.js
let PROJ; // the plugin instance's directory
let imports = 0;

// An OpenCode config folder under ROOT: canonkit/ with the named files from
// hooks/, and the plugin at OPENCODE_PLUGIN.to.
async function installDir(name, files) {
  const dir = path.join(ROOT, name);
  await mkdir(path.join(dir, "canonkit"), { recursive: true });
  for (const f of files) await copyFile(path.join(HOOKS_DIR, f), path.join(dir, "canonkit", f));
  await mkdir(path.dirname(path.join(dir, OPENCODE_PLUGIN.to)), { recursive: true });
  await copyFile(path.join(HOOKS_DIR, OPENCODE_PLUGIN.from), path.join(dir, OPENCODE_PLUGIN.to));
  return dir;
}

before(async () => {
  ROOT = await mkdtemp(path.join(os.tmpdir(), "canonkit-opencode-"));
  await writeFile(path.join(ROOT, "package.json"), JSON.stringify({ type: "module" }));
  INSTALL = await installDir("opencode", HOOK_FILES.opencode);
  PROJ = path.join(ROOT, "project");
  await mkdir(PROJ);
  const { ctx, registered } = fakeCtx();
  await (await importPlugin()).default.setup(ctx);
  HOOK = registered[0][1];
});
after(async () => {
  await rm(ROOT, { recursive: true, force: true });
});

// A fresh import of the installed plugin (the query string defeats the ESM cache).
const importPlugin = (dir = INSTALL) => import(`${pathToFileURL(path.join(dir, OPENCODE_PLUGIN.to)).href}?n=${imports++}`);

// A fake OpenCode 2 plugin context: records each hook registration.
function fakeCtx(location = { directory: PROJ }) {
  const registered = [];
  const ctx = {
    location,
    tool: { hook: async (name, callback) => { registered.push([name, callback]); return { dispose() {} }; } },
  };
  return { ctx, registered };
}

// Runs fn with process.stderr.write captured; returns [result, stderr].
async function withStderr(fn) {
  const real = process.stderr.write;
  let err = "";
  process.stderr.write = (chunk) => { err += String(chunk); return true; };
  try {
    return [await fn(), err];
  } finally {
    process.stderr.write = real;
  }
}

// The execute.before callback the installed plugin registers (set up in the
// one root before(), after the install folder exists).
let HOOK;

// An OpenCode 2 `execute.before` event with every field the type declares.
const ocEvent = (tool, input) => ({ tool, sessionID: "S-OC", agent: "build", messageID: "M-1", id: "call-1", input });
const shell = (command) => ocEvent("shell", { command });
const patch = (...ops) => ocEvent("patch", { patchText: ["*** Begin Patch", ...ops, "*** End Patch", ""].join("\n") });

// What calling the hook did: the error it threw, or null.
const call = (event, hook = HOOK) => {
  try { hook(event); return null; } catch (e) { return e; }
};
const denied = (event, kindWord) => {
  const e = call(event);
  assert.ok(e instanceof Error, "expected a throw");
  assert.match(e.message, kindWord);
};
const passes = (event) => assert.equal(call(event), null);

describe("opencode plugin: the installed layout", () => {
  test("canonkit/ holds exactly HOOK_FILES.opencode, under a \"type\": \"module\" parent", () => {
    assert.deepEqual(fs.readdirSync(path.join(INSTALL, "canonkit")).sort(), [...HOOK_FILES.opencode].sort());
    assert.equal(JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).type, "module");
    assert.equal(JSON.parse(fs.readFileSync(path.join(INSTALL, "canonkit", "package.json"), "utf8")).type, "commonjs");
  });

  test("OPENCODE_PLUGIN.from and every HOOK_FILES.opencode file exist in hooks/", () => {
    for (const f of [OPENCODE_PLUGIN.from, ...HOOK_FILES.opencode]) assert.ok(fs.existsSync(path.join(HOOKS_DIR, f)), f);
    assert.equal(OPENCODE_PLUGIN.to, "plugins/canonkit.js");
    assert.ok(!HOOK_FILES.opencode.includes(OPENCODE_PLUGIN.from), "the plugin is not a canonkit/ file");
  });

  test("the plugin exports only default: an object with id canonkit and setup", async () => {
    const mod = await importPlugin();
    assert.deepEqual(Object.keys(mod), ["default"]);
    assert.deepEqual(Object.keys(mod.default).sort(), ["id", "setup"]);
    assert.equal(mod.default.id, "canonkit");
    assert.equal(typeof mod.default.setup, "function");
  });

  test("setup registers exactly one hook, execute.before", async () => {
    const { ctx, registered } = fakeCtx();
    const [, err] = await withStderr(async () => (await importPlugin()).default.setup(ctx));
    assert.deepEqual(registered.map(([name]) => name), ["execute.before"]);
    assert.equal(err, "");
  });

  // The core is required when the adapter loads: a missing one makes the adapter
  // fail to load, which setup catches.
  for (const [label, name, files] of [
    ["a missing canonkit-hook.js", "no-core", ["canonkit-opencode.js", "package.json"]],
    ["a missing canonkit-opencode.js", "no-adapter", ["canonkit-hook.js", "package.json"]],
  ]) {
    test(`${label}: setup does not throw, registers no hook, one line on stderr`, async () => {
      const dir = await installDir(name, files);
      const { ctx, registered } = fakeCtx();
      const [, err] = await withStderr(async () => (await importPlugin(dir)).default.setup(ctx));
      assert.deepEqual(registered, []);
      assert.match(err, /cannot load \.\.\/canonkit\/canonkit-opencode\.js/);
      assert.match(err, /the OpenCode gates are off/);
      assert.equal(err.trim().split("\n").length, 1);
    });
  }

  // The control for the marker: without it, the parent's "module" makes the
  // adapter ESM, `require` is undefined when it loads, and no hook is registered.
  test("without the package.json marker the adapter cannot load, and no hook is registered", async () => {
    const dir = await installDir("no-marker", ["canonkit-opencode.js", "canonkit-hook.js"]);
    const { ctx, registered } = fakeCtx();
    const [, err] = await withStderr(async () => (await importPlugin(dir)).default.setup(ctx));
    assert.deepEqual(registered, []);
    assert.match(err, /cannot load/);
  });

  test("a context with no tool domain: setup does not throw, one line on stderr", async () => {
    const [, err] = await withStderr(async () => (await importPlugin()).default.setup({ location: { directory: PROJ } }));
    assert.match(err, /cannot register the execute\.before hook/);
  });
});

describe("opencode plugin: the execute.before hook", () => {
  test("shell: a git hook bypass throws the reason", () => {
    denied(shell("git commit --no-verify -m x"), /skips the repository's hooks/);
  });

  test("shell: a plain git commit passes (text: the hook cannot ask)", () => {
    passes(shell("git commit -m x"));
  });

  test("shell: a shell write of a cloud key throws", () => {
    denied(shell(`echo ${FAKE_AWS_KEY} > config/aws.txt`), /high-confidence secret/);
  });

  test("shell: an ordinary command passes", () => {
    passes(shell("ls -la"));
  });

  test("write and edit with a cloud key throw; filePath is accepted for path", () => {
    denied(ocEvent("write", { path: "src/aws.ts", content: `k = "${FAKE_AWS_KEY}"` }), /high-confidence secret/);
    denied(ocEvent("edit", { path: "src/aws.ts", oldString: "k = 1", newString: `k = "${FAKE_AWS_KEY}"` }), /high-confidence secret/);
    denied(ocEvent("write", { filePath: "src/aws.ts", content: `k = "${FAKE_AWS_KEY}"` }), /high-confidence secret/);
  });

  test("edit of a HIGH-risk path passes (text)", () => {
    passes(ocEvent("edit", { path: "src/auth/session.ts", oldString: "a", newString: "b" }));
  });

  test("patch: the secret in the second file of three throws", () => {
    denied(patch(
      "*** Add File: src/a.ts", "+export const a = 1;",
      "*** Update File: src/b.ts", "@@", "-export const b = 1;", `+export const b = "${FAKE_AWS_KEY}";`,
      "*** Add File: src/c.ts", "+export const c = 3;",
    ), /high-confidence secret/);
  });

  test("patch: a Move to carries its content and throws with it", () => {
    denied(patch("*** Update File: src/old.ts", "*** Move to: src/new.ts", "@@", `+const k = "${FAKE_AWS_KEY}";`), /high-confidence secret/);
  });

  test("patch: no secret passes, HIGH-risk path included; a removed secret and a Delete File pass", () => {
    passes(patch("*** Add File: src/auth/session.ts", "+export const a = 1;"));
    passes(patch("*** Update File: src/b.ts", "@@", `-export const b = "${FAKE_AWS_KEY}";`, "+export const b = process.env.KEY;"));
    passes(patch("*** Delete File: src/auth/session.ts"));
  });

  test("patch: a text with no file header is still scanned whole", () => {
    denied(ocEvent("patch", { patchText: `garbled ${FAKE_AWS_KEY}` }), /high-confidence secret/);
  });

  // OpenCode's parser (packages/util/src/patch.ts) takes any header that starts
  // with "*** Add File: ": a path with U+2028 or CR inside included.
  for (const [label, sep] of [["U+2028", "\u2028"], ["CR", "\r"]]) {
    test(`patch: a private key under a first header with ${label} in its path throws`, () => {
      denied(patch(`*** Add File: k${sep}.pem`, `+${FAKE_PEM}`, "+MIIEow", "*** Add File: ok.ts", "+export const a = 1;"), /high-confidence secret/);
    });
  }

  test("patch: a cloud key on a + line before any header throws", () => {
    denied(patch(`+k = "${FAKE_AWS_KEY}"`, "*** Add File: ok.ts", "+x"), /high-confidence secret/);
  });

  test("shell carrying an apply_patch heredoc is gated as a patch too", () => {
    const cmd = ["apply_patch <<'EOF'", "*** Begin Patch", "*** Add File: a.ts", `+k = "${FAKE_AWS_KEY}"`, "*** End Patch", "EOF"].join("\n");
    denied(shell(cmd), /high-confidence secret/);
  });

  test("defensive: tool bash is a shell, and a JSON-string input is parsed", () => {
    denied(ocEvent("bash", { command: "git commit --no-verify" }), /skips the repository's hooks/);
    denied(ocEvent("shell", JSON.stringify({ command: "git commit --no-verify" })), /skips the repository's hooks/);
  });

  test("defensive: a string input that is not JSON for an object passes", () => {
    passes(ocEvent("shell", "git commit --no-verify"));
    passes(ocEvent("shell", JSON.stringify("git commit --no-verify")));
    passes(ocEvent("shell", "null"));
  });

  test("another tool, and malformed events, pass", () => {
    passes(ocEvent("read", { path: ".env" }));
    passes(ocEvent("subagent", { agent: "explore", prompt: "git commit --no-verify" }));
    for (const evt of [null, undefined, {}, 42, "x", [], { tool: "shell" }, { tool: "shell", input: "git commit --no-verify -m x" }]) {
      passes(evt);
    }
  });

  test("the thrown value is an Error carrying evaluate()'s reason verbatim", () => {
    const evt = shell("git push --no-verify");
    const [normalized] = normalizeOpencode(evt, PROJ);
    const { reason } = evaluate(normalized, { logDir: null, home: ROOT });
    const e = call(evt);
    assert.ok(e instanceof Error);
    assert.equal(e.message, reason);
  });

  test("ctx.location.directory is read on every call, and a missing one still denies", async () => {
    let reads = 0;
    const location = { get directory() { reads++; return PROJ; } };
    const { ctx, registered } = fakeCtx(location);
    await (await importPlugin()).default.setup(ctx);
    const hook = registered[0][1];
    assert.equal(call(shell("ls"), hook), null);
    assert.equal(call(shell("ls"), hook), null);
    assert.equal(reads, 2);

    const bare = fakeCtx(undefined);
    await (await importPlugin()).default.setup(bare.ctx);
    const e = call(shell("git commit --no-verify -m x"), bare.registered[0][1]);
    assert.ok(e instanceof Error);
    assert.match(e.message, /skips the repository's hooks/);
  });
});

// Real execute.before events, scrubbed (slice 9). <CWD> and <FAKE_AWS_KEY> are
// filled in here, so the key is never spelled out in the repository.
const FIXTURES_DIR = path.join(REPO, "test", "fixtures", "opencode");
const FIXTURES = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json")).sort();
const fixture = (file) => {
  const text = fs.readFileSync(path.join(FIXTURES_DIR, file), "utf8")
    .split("<CWD>").join(JSON.stringify(PROJ).slice(1, -1))
    .split("<FAKE_AWS_KEY>").join(FAKE_AWS_KEY);
  return JSON.parse(text);
};

describe("opencode plugin: real captures (test/fixtures/opencode)", () => {
  test("there are captures for the gated tools seen, a subagent's call, and the ungated tools", () => {
    const seen = FIXTURES.map((f) => `${fixture(f).event.tool}/${fixture(f).event.agent}`);
    assert.deepEqual([...new Set(seen)].sort(), ["execute/build", "shell/build", "shell/general", "subagent/build", "write/build"]);
  });
  for (const file of FIXTURES) {
    test(`${file}: the outcome seen in OpenCode`, () => {
      const { expect, reasonWord, event } = fixture(file);
      if (expect === "deny") denied(event, new RegExp(reasonWord));
      else passes(event);
    });
    test(`${file}: the docs-shaped helper sends the same keys`, () => {
      const { event } = fixture(file);
      assert.deepEqual(Object.keys(ocEvent(event.tool, event.input)), Object.keys(event));
    });
  }
  test("write: OpenCode sends the path relative to the instance directory, and it is the gated file", () => {
    const evts = normalizeOpencode(fixture("write-cloud-key.json").event, PROJ);
    assert.equal(evts.length, 1);
    assert.equal(evts[0].tool, "Write");
    assert.equal(evts[0].cwd, PROJ);
    assert.equal(evts[0].toolInput.file_path, "creds.txt");
    assert.match(evts[0].toolInput.content, new RegExp(FAKE_AWS_KEY));
  });
});

// normalizeOpencode in-process: what each event becomes, where a throw cannot
// show it (the path gates are text in OpenCode, so they pass either way).
describe("normalizeOpencode: one OpenCode event into evaluate()'s events", () => {
  const files = (evts) => evts.map((e) => [e.tool, e.toolInput.file_path, e.toolInput.content ?? e.toolInput.new_string]);

  test("a shell call is one Bash event with the session's fields", () => {
    assert.deepEqual(normalizeOpencode(shell("git status"), PROJ), [{
      event: "PreToolUse", cwd: PROJ, session: "S-OC", toolUseId: "call-1", tool: "Bash", toolInput: { command: "git status" },
    }]);
  });

  test("edit, write and patch map to Edit and Write events", () => {
    assert.deepEqual(files(normalizeOpencode(ocEvent("edit", { path: "a.ts", oldString: "x", newString: "y" }), PROJ)), [["Edit", "a.ts", "y"]]);
    assert.deepEqual(files(normalizeOpencode(ocEvent("write", { path: "b.ts", content: "z" }), PROJ)), [["Write", "b.ts", "z"]]);
    assert.deepEqual(files(normalizeOpencode(patch(
      "*** Add File: a.ts", "+one", "+two",
      "*** Update File: c.ts", "*** Move to: d/c.ts", "@@", "+moved",
      "*** Delete File: e.ts",
    ), PROJ)), [
      ["Write", "a.ts", "one\ntwo"],
      ["Write", "c.ts", "moved"],
      ["Write", "d/c.ts", "moved"],
      ["Write", "e.ts", ""],
    ]);
  });

  test("+ lines no file owns become one Write under no path; a U+2028 path is kept as written", () => {
    assert.deepEqual(files(normalizeOpencode(patch("+stray", "*** Add File: k\u2028.pem", "+key", "*** Delete File: d", "+late"), PROJ)), [
      ["Write", "k\u2028.pem", "key"],
      ["Write", "d", ""],
      ["Write", "", "stray\nlate"],
    ]);
  });

  test("filePath is accepted for path, for write and edit", () => {
    assert.equal(normalizeOpencode(ocEvent("write", { filePath: "x.ts", content: "z" }), PROJ)[0].toolInput.file_path, "x.ts");
    assert.equal(normalizeOpencode(ocEvent("edit", { filePath: "x.ts", oldString: "a", newString: "b" }), PROJ)[0].toolInput.file_path, "x.ts");
  });

  test("a Move to destination is gated as its own path", () => {
    const evts = normalizeOpencode(patch("*** Update File: src/old.ts", "*** Move to: src/auth/session.ts", "@@", "+x"), PROJ);
    assert.deepEqual(evts.map((e) => evaluate(e, { logDir: null, home: ROOT }).kind), [null, "high-risk-surface"]);
  });

  test("a non-string cwd becomes '' (no project, the stricter side)", () => {
    for (const cwd of [undefined, null, 42, {}]) assert.equal(normalizeOpencode(shell("ls"), cwd)[0].cwd, "");
  });

  test("nothing to gate: another tool, no input, an empty patch", () => {
    assert.deepEqual(normalizeOpencode(ocEvent("read", { path: "a" }), PROJ), []);
    assert.deepEqual(normalizeOpencode(ocEvent("shell", undefined), PROJ), []);
    assert.deepEqual(normalizeOpencode(ocEvent("patch", { patchText: "" }), PROJ), []);
    for (const v of [null, undefined, [], "x", 42]) assert.deepEqual(normalizeOpencode(v, PROJ), []);
  });
});

// A plugin hook cannot prompt: an ask from this adapter would be a gate that
// silently does nothing, so only a deny of an enforce kind refuses.
describe("opencodeDecision never asks", () => {
  test("every decision for every kind: a reason for an enforce deny, otherwise null", () => {
    for (const kind of [...GATE_KINDS, null, "unknown"]) {
      for (const decision of ["allow", "ask", "deny", "block"]) {
        const out = opencodeDecision({ decision, kind, reason: "r" });
        const enforced = decision === "deny" && OPENCODE_GATE_MODES[kind] === "enforce";
        assert.equal(out, enforced ? "r" : null, `${decision}/${kind}`);
      }
    }
  });
});

// The error contract, with the core's evaluate stubbed (the adapter reads it off
// the core's exports at call time, so the stub is what it calls).
describe("onExecuteBefore: only an enforce deny throws", () => {
  const withEvaluate = (stub, fn) => {
    const real = coreModule.evaluate;
    coreModule.evaluate = stub;
    try { return fn(); } finally { coreModule.evaluate = real; }
  };
  const callIt = (evt) => { try { onExecuteBefore(evt, PROJ); return null; } catch (e) { return e; } };

  test("an internal exception does not throw", () => {
    assert.equal(withEvaluate(() => { throw new Error("boom"); }, () => callIt(shell("git commit --no-verify -m x"))), null);
  });

  test("a deny of a text kind does not throw; a deny of an enforce kind does, with its reason", () => {
    assert.equal(withEvaluate(() => ({ decision: "deny", kind: "git", reason: "nope" }), () => callIt(shell("ls"))), null);
    const e = withEvaluate(() => ({ decision: "deny", kind: "secret-block", reason: "stub reason" }), () => callIt(shell("ls")));
    assert.ok(e instanceof Error);
    assert.equal(e.message, "stub reason");
  });

  test("the first deny of several events wins", () => {
    let n = 0;
    const e = withEvaluate(() => ({ decision: "deny", kind: "secret-block", reason: `deny ${++n}` }), () => callIt(patch("*** Add File: a", "+1", "*** Add File: b", "+2")));
    assert.equal(e.message, "deny 1");
    assert.equal(n, 1);
  });
});

// In a separate process, so the traps cover the whole load: importing the plugin,
// running setup and calling the hook never exits the process, never writes to
// stdout and writes no file under HOME. Loading the core must not stop OpenCode.
describe("opencode plugin: sealed", () => {
  test("import, setup and the hook: no process.exit, no stdout, no file written", () => {
    const script = `
      const out = process.stdout.write.bind(process.stdout);
      const seen = { exits: 0, stdout: 0, denied: false, passed: false, hooks: 0 };
      process.exit = () => { seen.exits++; throw new Error("process.exit called"); };
      process.stdout.write = () => { seen.stdout++; return true; };
      const mod = await import(process.argv[1]);
      const hooks = [];
      await mod.default.setup({ location: { directory: process.argv[2] }, tool: { hook: async (n, cb) => { hooks.push(cb); } } });
      seen.hooks = hooks.length;
      try { hooks[0]({ tool: "shell", sessionID: "S", id: "c", input: { command: "git commit --no-verify -m x" } }); } catch (e) { seen.denied = e instanceof Error; }
      try { hooks[0]({ tool: "write", sessionID: "S", id: "c", input: { path: "src/auth/x.ts", content: "a" } }); seen.passed = true; } catch (_) {}
      out(JSON.stringify(seen));
    `;
    const before = fs.readdirSync(ROOT).sort();
    const env = { ...process.env, HOME: ROOT, USERPROFILE: ROOT };
    delete env.CLAUDE_PROJECT_DIR;
    const r = spawnSync(process.execPath, ["--input-type=module", "-e", script, pathToFileURL(path.join(INSTALL, OPENCODE_PLUGIN.to)).href, PROJ], {
      cwd: PROJ, env, encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout), { exits: 0, stdout: 0, denied: true, passed: true, hooks: 1 });
    assert.equal(r.stderr, "");
    assert.deepEqual(fs.readdirSync(ROOT).sort(), before);
    assert.ok(!fs.existsSync(path.join(ROOT, ".claude")));
  });
});

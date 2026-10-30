/**
 * Contract tests for the hook's core, `evaluate(evt, env)` in hooks/canonkit-hook.js.
 *
 * test/canonkit-hook.test.js drives the real process through Claude Code's input
 * and output. This file pins what sits under that adapter, so another harness's
 * adapter (Codex, OpenCode) can be held to the same decisions:
 *   1. PURITY — evaluate() decides without the process: no exit, no stdout, no
 *      home lookup, no environment variable, and no file write at all (the log
 *      lines come back in `logs`). The context-band state is the Claude
 *      adapter's, written by main(); test/canonkit-hook.test.js covers it.
 *   2. PARITY — one table of normalized events and the outcome each adapter must
 *      produce: a column per discovered adapter (claude, codex), written by hand
 *      and held to the adapter's modes by section 4.
 *   3. GATE MAPS — adapters are discovered, not listed: every .js file that
 *      HOOK_FILES (bin/cli.js) ships is required and its *_GATE_MODES exports are
 *      collected. Each map covers GATE_KINDS and RECORD_KINDS exactly, with a
 *      documented mode, and every kind evaluate() returns is in GATE_KINDS.
 *   4. MODE VERSUS OUTCOME — for every adapter, a row's expected decision is the
 *      kind's decision under `enforce` and allow under `text` or `off`. That only
 *      holds the column to the map; a map and a column wrong together would
 *      pass. What keeps an adapter that cannot ask (Codex) from outputting an
 *      ask is CAN, a capability table written apart from every map: a kind may
 *      be `enforce` only where the harness can carry its decision, and a
 *      harness CAN does not name can carry a deny and nothing else.
 *   5. SOURCE SCAN — every kind literal in hooks/*.js is a known kind.
 *   6. LOADING — requiring a listed file runs nothing.
 *   7. STOP VARIANTS — the definition-of-done gate against a fixture log: each
 *      gated kind, a stale or non-reviewer, a reviewer's probe outside the
 *      project, a resume, a missing log.
 *   8. PATHS — one file spelled many ways (separators, .., drive case, an
 *      absolute path outside, a link) gets one verdict and one in_project.
 *   9. MALFORMED INPUT — nothing, null, a missing env, a throw after a log: the
 *      documented fail-open allow, with the logs recorded before the error.
 *
 * The heuristics themselves (what is a bypass, a secret, a risky name) are
 * test/canonkit-hook.test.js's through the real process. The parity table below
 * keeps one row per gate kind and the rows that are about the core's contract
 * (config through env.projectDir, an exclude, an adapter-free Stop).
 *
 * Out of scope here (2.2): the `validate` check that holds each `[ENFORCED]` line
 * to a gate map. "Every dispatch is logged" is `[ENFORCED]` too, but it is
 * logging, not a decision, so it is a RECORD_KINDS entry: a mode in every map,
 * and no row in a decision table.
 *
 * The secret fixtures are concatenated on purpose: spelled out, the hook denies
 * the write of this file.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { HOOK_FILES } from "../bin/cli.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOOKS_DIR = path.join(REPO, "hooks");
const requireCjs = createRequire(import.meta.url);
// Loaded before any stub goes in: the module's own load is not under test.
const { evaluate, GATE_KINDS, RECORD_KINDS } = requireCjs(path.join(HOOKS_DIR, "canonkit-hook.js"));

const FAKE_AWS_KEY = "AKIA" + "ABCDEFGHIJKLMNOP";
const FAKE_PEM = "-----BEGIN RSA PRIVATE " + "KEY-----";
const SOFT_SECRET = "pass" + "word = 'hunter2hunter2'";

// The decision each kind carries in the core, whatever an adapter later makes of it.
const KIND_DECISION = {
  "git-bypass": "deny",
  "secret-block": "deny",
  git: "ask",
  "secret-ask": "ask",
  "perf-budget": "ask",
  "high-risk-surface": "ask",
  "definition-of-done": "block",
  "context-size": "allow",
};

// The adapters, found rather than listed: every .js file HOOK_FILES ships to a
// harness, required, and every export named *_GATE_MODES in it. A shared file
// listed under several harnesses is required once. `modes` is the declared gate
// map; `outcome` reduces an evaluate() result to what that harness does with it:
// the decision itself under `enforce`, an allow under `text` or `off`. (Claude
// Code enforces every kind, so its outcome is the decision itself.)
const LISTED_JS = [...new Set(Object.values(HOOK_FILES).flat())].filter((f) => f.endsWith(".js"));
const appliedBy = (modes) => ({ decision, kind }) =>
  ({ decision: kind && modes[kind] !== "enforce" ? "allow" : decision, kind });
const ADAPTERS = {};
for (const file of LISTED_JS) {
  for (const [name, modes] of Object.entries(requireCjs(path.join(HOOKS_DIR, file)))) {
    const m = /^(.+)_GATE_MODES$/.exec(name);
    if (m) ADAPTERS[m[1].toLowerCase()] = { modes, outcome: appliedBy(modes) };
  }
}
const MODES = ["enforce", "text", "off"];
// Kinds an adapter decides after evaluate(), never evaluate() itself, so they
// have no parity row. context-size parses Claude Code's transcript and keeps band
// state, so it lives in the Claude adapter (main) and test/canonkit-hook.test.js
// covers it through the real process.
const ADAPTER_KINDS = ["context-size"];

let ROOT; // temp root, used as env.home: nothing here is the real home
const fx = {};

before(async () => {
  ROOT = await mkdtemp(path.join(os.tmpdir(), "canonkit-core-"));
  const proj = async (name, config) => {
    const dir = path.join(ROOT, name);
    await mkdir(path.join(dir, ".claude"), { recursive: true });
    if (typeof config === "string") await writeFile(path.join(dir, ".claude", "canonkit.json"), config);
    else if (config) await writeFile(path.join(dir, ".claude", "canonkit.json"), JSON.stringify(config));
    return dir;
  };
  fx.plain = await proj("plain");
  fx.cfg = await proj("cfg", {
    version: 1,
    highRisk: { include: ["src/billing/**"], exclude: ["src/legacy/"] },
    perfBudgets: ["perf/limits.yml"],
  });
  fx.badJson = await proj("bad-json", "{ \"highRisk\": { \"exclude\": [\"**\"] ");
  fx.dirConfig = await proj("dir-config");
  await mkdir(path.join(fx.dirConfig, ".claude", "canonkit.json"));

  // Read-only activity log for the Stop rows: one session gated and never
  // reviewed, one gated and then reviewed by Quinn.
  fx.stopLogs = path.join(ROOT, "stop-logs");
  await mkdir(fx.stopLogs);
  const line = (e) => JSON.stringify(e) + "\n";
  await writeFile(path.join(fx.stopLogs, "events.jsonl"),
    line({ ts: 1000, session: "S-GATED", event: "gate", kind: "high-risk-surface", file: "src/auth/x.ts", rule: "auth" }) +
    line({ ts: 1000, session: "S-REVIEWED", event: "gate", kind: "high-risk-surface", file: "src/auth/x.ts", rule: "auth" }) +
    line({ ts: 2000, session: "S-REVIEWED", event: "agent_start", agent: "quinn", id: "t1" }));

  fx.transcript = path.join(ROOT, "transcript.jsonl");
  await writeFile(fx.transcript, JSON.stringify({ type: "assistant", message: { id: "m1", usage: { input_tokens: 5000 } } }) + "\n");
});
after(async () => {
  await rm(ROOT, { recursive: true, force: true });
});

// ---- event builders (the normalized shape, not Claude Code's) ----
const shell = (cwd, command, tool = "Bash") =>
  ({ event: "PreToolUse", tool, toolInput: { command }, cwd, session: "CORE" });
const editAt = (cwd, rel, content = "x", tool = "Edit") => ({
  event: "PreToolUse", tool,
  toolInput: tool === "Write" ? { file_path: cwd + "/" + rel, content } : { file_path: cwd + "/" + rel, new_string: content },
  cwd, session: "CORE",
});
const envFor = (projectDir, extra = {}) =>
  ({ logDir: path.join(ROOT, "no-logs"), legacyLogDir: undefined, projectDir, home: ROOT, contextBands: undefined, ...extra });

// ---- 1. PURITY ----

// Every fs call that can write, wrapped to record its target and still run.
const FS_WRITES = ["writeFileSync", "appendFileSync", "mkdirSync", "renameSync", "rmSync", "rmdirSync", "unlinkSync",
  "copyFileSync", "cpSync", "writeSync", "truncateSync", "ftruncateSync", "symlinkSync", "linkSync", "mkdtempSync"];
// The same on fs.promises and the callback API: a write there is still a write.
const FS_PROMISE_WRITES = ["writeFile", "appendFile", "mkdir", "open", "rm", "rename"];
const FS_CALLBACK_WRITES = ["writeFile", "appendFile", "mkdir"];
const ENV_KEYS = ["HOME", "USERPROFILE", "CLAUDE_PROJECT_DIR"];

/**
 * Runs fn synchronously with the process sealed off: process.exit,
 * process.stdout.write and os.homedir throw, the home and project variables are
 * unset and every read of one is recorded, and every fs write is recorded. Everything is restored before return,
 * so an assertion failure never leaves a stub behind (assert outside fn).
 * A trap that fires inside evaluate() is caught by its fail-open, so it shows as
 * a wrong decision for a gate and in `touched` for an allow: both are asserted.
 */
function sealed(fn) {
  const touched = [];
  const saved = { exit: process.exit, write: process.stdout.write, homedir: os.homedir };
  const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  const savedFs = {};
  const savedPromises = {};
  const savedCallbacks = {};
  const realEnv = process.env;
  const trap = (what) => () => { touched.push(what); throw new Error(`evaluate() touched ${what}`); };
  try {
    for (const k of ENV_KEYS) delete realEnv[k];
    process.env = new Proxy(realEnv, {
      get(target, key, receiver) {
        if (ENV_KEYS.includes(key)) touched.push(`process.env.${key}`);
        return Reflect.get(target, key, receiver);
      },
    });
    process.exit = trap("process.exit");
    process.stdout.write = trap("process.stdout.write");
    os.homedir = trap("os.homedir");
    for (const name of FS_WRITES) {
      if (typeof fs[name] !== "function") continue;
      savedFs[name] = fs[name];
      fs[name] = function (...args) {
        touched.push(`fs.${name} ${typeof args[0] === "string" ? args[0] : ""}`.trim());
        return savedFs[name].apply(this, args);
      };
    }
    const record = (saved, owner, name, label) => {
      if (typeof owner[name] !== "function") return;
      saved[name] = owner[name];
      owner[name] = function (...args) {
        touched.push(`${label}.${name} ${typeof args[0] === "string" ? args[0] : ""}`.trim());
        return saved[name].apply(this, args);
      };
    };
    for (const name of FS_PROMISE_WRITES) record(savedPromises, fs.promises, name, "fs.promises");
    for (const name of FS_CALLBACK_WRITES) record(savedCallbacks, fs, name, "fs");
    savedFs.openSync = fs.openSync;
    fs.openSync = function (file, flags, ...rest) {
      if (flags !== undefined && flags !== "r") touched.push(`fs.openSync ${file} ${flags}`);
      return savedFs.openSync.call(this, file, flags, ...rest);
    };
    return { result: fn(), touched };
  } finally {
    for (const [name, f] of Object.entries(savedFs)) fs[name] = f;
    for (const [name, f] of Object.entries(savedPromises)) fs.promises[name] = f;
    for (const [name, f] of Object.entries(savedCallbacks)) fs[name] = f;
    process.env = realEnv;
    process.exit = saved.exit;
    process.stdout.write = saved.write;
    os.homedir = saved.homedir;
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete realEnv[k];
      else realEnv[k] = savedEnv[k];
    }
  }
}

describe("purity: evaluate() decides without touching the process", () => {
  const cases = () => [
    ["git bypass", shell(fx.plain, "git commit --no-verify -m wip"), "deny", "git-bypass"],
    ["hard secret in a shell command", shell(fx.plain, `echo ${FAKE_AWS_KEY} > config/aws.txt`), "deny", "secret-block"],
    ["hard secret in an edit", editAt(fx.plain, "src/app.ts", FAKE_PEM, "Write"), "deny", "secret-block"],
    ["git commit", shell(fx.plain, "git commit -m wip"), "ask", "git"],
    ["HIGH-risk path edit", editAt(fx.plain, "src/auth/session.ts"), "ask", "high-risk-surface"],
    ["plain allowed command", shell(fx.plain, "ls -la"), "allow", null],
  ];

  test("each gate decides correctly with exit, stdout, homedir and the env vars sealed", () => {
    const logDir = path.join(ROOT, "purity-logs");
    for (const [name, evt, decision, kind] of cases()) {
      const env = envFor(fx.plain, { logDir });
      const { result, touched } = sealed(() => evaluate(evt, env));
      assert.deepEqual(touched, [], `${name}: evaluate touched the process or wrote a file`);
      assert.equal(result.decision, decision, name);
      assert.equal(result.kind, kind, name);
      // The log lines come back to the adapter instead of being written.
      const gates = result.logs.filter((l) => l.record.event === "gate");
      if (kind) {
        assert.equal(gates.length, 1, `${name}: one gate line returned`);
        assert.equal(gates[0].file, "events.jsonl");
        assert.equal(gates[0].record.kind, kind);
        assert.equal(gates[0].record.session, "CORE");
      } else {
        assert.deepEqual(result.logs, [], `${name}: an allow logs nothing`);
      }
    }
    assert.equal(fs.existsSync(logDir), false, "evaluate must not create or write env.logDir for a gate event");
  });

  test("the stubs and variables are restored after a sealed run", () => {
    const before = { exit: process.exit, write: process.stdout.write, homedir: os.homedir, home: process.env.HOME };
    sealed(() => evaluate(shell(fx.plain, "ls"), envFor(fx.plain)));
    assert.equal(process.exit, before.exit);
    assert.equal(process.stdout.write, before.write);
    assert.equal(os.homedir, before.homedir);
    assert.equal(process.env.HOME, before.home);
  });

  // It used to write context-bands.json here. The band state moved to the
  // Claude adapter (main), so a prompt past a band is a plain allow that only
  // returns its prompt line: no reminder, no band file, the same answer twice.
  test("UserPromptSubmit writes nothing, even past a context band", () => {
    const logDir = path.join(ROOT, "bands-logs");
    const env = envFor(fx.plain, { logDir, contextBands: "1000" });
    const evt = { event: "UserPromptSubmit", cwd: fx.plain, session: "S-BANDS", transcriptPath: fx.transcript };

    for (const turn of ["first", "second"]) {
      const { result, touched } = sealed(() => evaluate(evt, env));
      assert.deepEqual(touched, [], `${turn}: evaluate touched the process or wrote a file`);
      assert.deepEqual({ decision: result.decision, kind: result.kind, reason: result.reason },
        { decision: "allow", kind: null, reason: "" }, turn);
      assert.deepEqual(result.logs.map((l) => [l.file, l.record.event, l.record.session]),
        [["events.jsonl", "prompt", "S-BANDS"]], `${turn}: only the prompt line, returned`);
    }
    assert.equal(fs.existsSync(logDir), false, "evaluate must not create env.logDir or context-bands.json");
  });

  // A repo commits this file, so a clone controls it. Both denies run before it
  // is read; the defaults must still stand behind it for the asks.
  for (const [label, key] of [["invalid JSON", "badJson"], ["a directory", "dirConfig"]]) {
    test(`a .claude/canonkit.json that is ${label} disables neither deny`, () => {
      const cwd = fx[key];
      const env = envFor(cwd);
      const run = (evt) => sealed(() => evaluate(evt, env));
      const rows = [
        [shell(cwd, "git push --no-verify"), "deny", "git-bypass"],
        [shell(cwd, `printf '${FAKE_PEM}' > keys/id.txt`, "PowerShell"), "deny", "secret-block"],
        [editAt(cwd, "src/app.ts", "k = '" + FAKE_AWS_KEY + "'"), "deny", "secret-block"],
        [editAt(cwd, "src/auth/session.ts"), "ask", "high-risk-surface"],
      ];
      for (const [evt, decision, kind] of rows) {
        const { result, touched } = run(evt);
        assert.deepEqual(touched, []);
        assert.deepEqual({ decision: result.decision, kind: result.kind }, { decision, kind }, evt.toolInput.command || evt.toolInput.file_path);
      }
    });
  }
});

// An adapter may send no usable cwd (Codex, OpenCode). path.basename(cwd) used to
// throw there, and evaluate()'s fail-open turned every deny into an allow.
describe("a missing or non-string cwd still denies", () => {
  const WRITE_KEY = (cwd) => ({
    event: "PreToolUse", tool: "Write", toolInput: { file_path: "src/app.ts", content: FAKE_PEM }, cwd, session: "CORE",
  });
  const rows = [
    ["git bypass", (cwd) => shell(cwd, "git commit --no-verify -m wip"), "git-bypass"],
    ["private key write", WRITE_KEY, "secret-block"],
  ];
  for (const [label, build, kind] of rows) {
    for (const [cwdLabel, cwd] of [["undefined", undefined], ["42", 42], ["''", ""], ["{}", {}]]) {
      test(`${label} with cwd ${cwdLabel}`, () => {
        const { result, touched } = sealed(() => evaluate(build(cwd), envFor(undefined)));
        assert.deepEqual(touched, [], "evaluate touched the process or wrote a file");
        assert.deepEqual({ decision: result.decision, kind: result.kind }, { decision: "deny", kind });
        const gates = result.logs.filter((l) => l.record.event === "gate");
        assert.deepEqual(gates.map((l) => l.record.kind), [kind], "one gate record, with the decision's kind");
      });
    }
  }
});

// ---- 2. PARITY TABLE ----
// Rows: a normalized event (built against the fixtures) -> the outcome per
// adapter. `env` overrides the default env for the rows that read the log.
// ADAPTERS is discovered through HOOK_FILES, so a new adapter turns "every row
// has a column for every adapter" red until each PARITY row gets its column.
// Codex enforces only the two denies: an ask or a block is an allow there, with
// the kind kept (test/hook-codex.test.js drives the real process).
const P = () => fx.plain;
const C = () => fx.cfg;
const PARITY = [
  // git-bypass
  { name: "git commit --no-verify", evt: () => shell(P(), "git commit --no-verify -m wip"), expect: { claude: { decision: "deny", kind: "git-bypass" }, codex: { decision: "deny", kind: "git-bypass" } } },
  { name: "git push --no-verify through PowerShell", evt: () => shell(P(), "git push --no-verify", "PowerShell"), expect: { claude: { decision: "deny", kind: "git-bypass" }, codex: { decision: "deny", kind: "git-bypass" } } },
  // secret-block
  { name: "shell writes a cloud key", evt: () => shell(P(), `echo ${FAKE_AWS_KEY} > config/aws.txt`), expect: { claude: { decision: "deny", kind: "secret-block" }, codex: { decision: "deny", kind: "secret-block" } } },
  { name: "Write with a private key", evt: () => editAt(P(), "src/app.ts", FAKE_PEM, "Write"), expect: { claude: { decision: "deny", kind: "secret-block" }, codex: { decision: "deny", kind: "secret-block" } } },
  { name: "secret deny beats a test-file path", evt: () => editAt(P(), "src/app.test.ts", FAKE_PEM), expect: { claude: { decision: "deny", kind: "secret-block" }, codex: { decision: "deny", kind: "secret-block" } } },
  // git
  { name: "git commit", evt: () => shell(P(), "git commit -m wip"), expect: { claude: { decision: "ask", kind: "git" }, codex: { decision: "allow", kind: "git" } } },
  { name: "a message mentioning --no-verify is not a bypass", evt: () => shell(P(), 'git commit -m "never use --no-verify"'), expect: { claude: { decision: "ask", kind: "git" }, codex: { decision: "allow", kind: "git" } } },
  { name: "an empty event name is gated as PreToolUse", evt: () => ({ ...shell(P(), "git push"), event: "" }), expect: { claude: { decision: "ask", kind: "git" }, codex: { decision: "allow", kind: "git" } } },
  // secret-ask
  { name: "edit with a soft credential", evt: () => editAt(P(), "src/config.ts", SOFT_SECRET), expect: { claude: { decision: "ask", kind: "secret-ask" }, codex: { decision: "allow", kind: "secret-ask" } } },
  { name: "shell writes a soft credential", evt: () => shell(P(), `echo "${SOFT_SECRET}" > src/config.ts`), expect: { claude: { decision: "ask", kind: "secret-ask" }, codex: { decision: "allow", kind: "secret-ask" } } },
  // perf-budget
  { name: "edit lighthouserc.json", evt: () => editAt(P(), "lighthouserc.json"), expect: { claude: { decision: "ask", kind: "perf-budget" }, codex: { decision: "allow", kind: "perf-budget" } } },
  { name: "PowerShell writes .size-limit.json", evt: () => shell(P(), "Set-Content -Path .size-limit.json -Value x", "PowerShell"), expect: { claude: { decision: "ask", kind: "perf-budget" }, codex: { decision: "allow", kind: "perf-budget" } } },
  { name: "config perfBudgets adds a file", evt: () => editAt(C(), "perf/limits.yml"), expect: { claude: { decision: "ask", kind: "perf-budget" }, codex: { decision: "allow", kind: "perf-budget" } } },
  // high-risk-surface
  { name: "edit an auth file", evt: () => editAt(P(), "src/auth/session.ts"), expect: { claude: { decision: "ask", kind: "high-risk-surface" }, codex: { decision: "allow", kind: "high-risk-surface" } } },
  { name: "shell writes a migration", evt: () => shell(P(), "echo x > db/migrations/001_init.sql"), expect: { claude: { decision: "ask", kind: "high-risk-surface" }, codex: { decision: "allow", kind: "high-risk-surface" } } },
  { name: "edit the gate config itself", evt: () => editAt(C(), ".claude/canonkit.json", "{}"), expect: { claude: { decision: "ask", kind: "high-risk-surface" }, codex: { decision: "allow", kind: "high-risk-surface" } } },
  { name: "config include adds a path", evt: () => editAt(C(), "src/billing/charge.ts"), expect: { claude: { decision: "ask", kind: "high-risk-surface" }, codex: { decision: "allow", kind: "high-risk-surface" } } },
  { name: "config exclude never reaches a strong term", evt: () => editAt(C(), "src/legacy/auth/x.ts"), expect: { claude: { decision: "ask", kind: "high-risk-surface" }, codex: { decision: "allow", kind: "high-risk-surface" } } },
  { name: "a subagent's edit is gated the same", evt: () => ({ ...editAt(P(), "src/auth/session.ts"), agentId: "a1", agentType: "bob" }), expect: { claude: { decision: "ask", kind: "high-risk-surface" }, codex: { decision: "allow", kind: "high-risk-surface" } } },
  // the project dir is not the cwd: a config found only through env.projectDir
  { name: "config found through env.projectDir, not cwd", evt: () => ({ ...editAt(C(), "src/billing/charge.ts"), cwd: P() }), env: () => ({ projectDir: C() }), expect: { claude: { decision: "ask", kind: "high-risk-surface" }, codex: { decision: "allow", kind: "high-risk-surface" } } },
  // definition-of-done
  { name: "Stop after an unreviewed gate", evt: () => ({ event: "Stop", cwd: P(), session: "S-GATED" }), env: () => ({ logDir: fx.stopLogs }), expect: { claude: { decision: "block", kind: "definition-of-done" }, codex: { decision: "allow", kind: "definition-of-done" } } },
  // allow
  { name: "a plain command", evt: () => shell(P(), "ls -la"), expect: { claude: { decision: "allow", kind: null }, codex: { decision: "allow", kind: null } } },
  { name: "git status", evt: () => shell(P(), "git status"), expect: { claude: { decision: "allow", kind: null }, codex: { decision: "allow", kind: null } } },
  { name: "an ordinary edit", evt: () => editAt(P(), "src/utils/format.ts"), expect: { claude: { decision: "allow", kind: null }, codex: { decision: "allow", kind: null } } },
  { name: "a presentational sessions folder", evt: () => editAt(P(), "src/components/sessions/List.tsx"), expect: { claude: { decision: "allow", kind: null }, codex: { decision: "allow", kind: null } } },
  { name: "config exclude quiets an ambiguous word", evt: () => editAt(C(), "src/legacy/login/form.ts"), expect: { claude: { decision: "allow", kind: null }, codex: { decision: "allow", kind: null } } },
  { name: "Stop after a reviewed gate", evt: () => ({ event: "Stop", cwd: P(), session: "S-REVIEWED" }), env: () => ({ logDir: fx.stopLogs }), expect: { claude: { decision: "allow", kind: null }, codex: { decision: "allow", kind: null } } },
  { name: "Stop already continued once", evt: () => ({ event: "Stop", cwd: P(), session: "S-GATED", stopHookActive: true }), env: () => ({ logDir: fx.stopLogs }), expect: { claude: { decision: "allow", kind: null }, codex: { decision: "allow", kind: null } } },
  { name: "dispatching a subagent", evt: () => ({ event: "PreToolUse", tool: "Agent", toolInput: { subagent_type: "quinn" }, cwd: P(), session: "CORE" }), expect: { claude: { decision: "allow", kind: null }, codex: { decision: "allow", kind: null } } },
  { name: "PostToolUse never gates", evt: () => ({ ...editAt(P(), "src/auth/session.ts"), event: "PostToolUse" }), expect: { claude: { decision: "allow", kind: null }, codex: { decision: "allow", kind: null } } },
];

describe("parity table: normalized event -> outcome per adapter", () => {
  for (const row of PARITY) {
    test(row.name, () => {
      const evt = row.evt();
      const env = envFor(evt.cwd, row.env ? row.env() : {});
      const { result, touched } = sealed(() => evaluate(evt, env));
      assert.deepEqual(touched, [], "evaluate touched the process or wrote a file");
      assert.ok(result.kind === null || GATE_KINDS.includes(result.kind), `kind ${result.kind} is not in GATE_KINDS`);
      assert.ok(!ADAPTER_KINDS.includes(result.kind), `${result.kind} is decided by an adapter, never by evaluate()`);
      if (result.kind) assert.equal(result.decision, KIND_DECISION[result.kind], `kind ${result.kind} carries one decision`);
      // The decision and its log line agree: one gate record, with that kind.
      const gates = result.logs.filter((l) => l.record.event === "gate");
      // An allow may still audit an exclusion, and only that.
      if (result.kind) {
        assert.deepEqual(gates.map((l) => l.record.kind), [result.kind], "exactly one gate record, with the decision's kind");
      } else {
        assert.deepEqual(gates.filter((l) => l.record.kind !== "excluded-by-config"), [], "an allow logs no gate but an exclusion");
      }
      for (const [harness, expected] of Object.entries(row.expect)) {
        assert.ok(ADAPTERS[harness], `no adapter named ${harness}`);
        assert.deepEqual(ADAPTERS[harness].outcome(result), expected, harness);
      }
    });
  }

  test("every row has a column for every adapter", () => {
    for (const row of PARITY) {
      assert.deepEqual(Object.keys(row.expect).sort(), Object.keys(ADAPTERS).sort(), row.name);
    }
  });
});

// ---- 3. GATE MAPS ----
describe("gate maps cover GATE_KINDS and RECORD_KINDS", () => {
  test("every harness HOOK_FILES names has an adapter, and the two kind lists do not overlap", () => {
    assert.ok(Object.keys(ADAPTERS).length > 0, "no adapter discovered");
    for (const harness of Object.keys(HOOK_FILES)) assert.ok(ADAPTERS[harness], `HOOK_FILES.${harness} ships no *_GATE_MODES export`);
    assert.deepEqual(GATE_KINDS.filter((k) => RECORD_KINDS.includes(k)), []);
  });

  for (const [harness, { modes }] of Object.entries(ADAPTERS)) {
    test(`${harness}: one documented mode per kind, and no other key`, () => {
      assert.deepEqual(Object.keys(modes).sort(), [...GATE_KINDS, ...RECORD_KINDS].sort());
      for (const [kind, mode] of Object.entries(modes)) {
        assert.ok(MODES.includes(mode), `${harness}.${kind} = ${mode}, not one of ${MODES.join("|")}`);
      }
    });
  }

  test("the table's expected kinds are all GATE_KINDS, and every kind has a row", () => {
    const expected = new Set();
    for (const row of PARITY) for (const e of Object.values(row.expect)) if (e.kind) expected.add(e.kind);
    for (const k of expected) assert.ok(GATE_KINDS.includes(k), `${k} is expected but not in GATE_KINDS`);
    assert.deepEqual([...GATE_KINDS].filter((k) => !expected.has(k) && !ADAPTER_KINDS.includes(k)), [], "kinds with no parity row");
    for (const k of ADAPTER_KINDS) assert.ok(!expected.has(k), `${k} is decided by an adapter, yet has a parity row`);
    assert.deepEqual(Object.keys(KIND_DECISION).sort(), [...GATE_KINDS].sort());
  });
});

// ---- 4. MODE VERSUS OUTCOME ----
// The table's expected column is written by hand per harness; the declared mode
// is the harness's promise. They must agree, or a harness would output a decision
// its mode says it cannot (an ask from a harness that has no prompt).
describe("mode versus outcome: enforce carries the decision, text and off allow", () => {
  const decisionUnder = (mode, kind) => {
    assert.ok(MODES.includes(mode), `${kind} has mode ${mode}`);
    return mode === "enforce" ? KIND_DECISION[kind] : "allow";
  };

  for (const [harness, { modes }] of Object.entries(ADAPTERS)) {
    test(`${harness}: every row's expected decision follows its kind's mode`, () => {
      let withKind = 0;
      for (const row of PARITY) {
        const expected = row.expect[harness];
        assert.ok(expected, `${row.name}: no ${harness} column`);
        if (!expected.kind) {
          assert.equal(expected.decision, "allow", `${row.name}: no kind, so a plain allow`);
          continue;
        }
        withKind++;
        assert.equal(expected.decision, decisionUnder(modes[expected.kind], expected.kind),
          `${harness}/${row.name}: ${expected.kind} is ${modes[expected.kind]}`);
      }
      assert.ok(withKind > 0, "no row carries a kind");
    });
  }

  // What each harness can do with a decision, written apart from the gate maps:
  // the check above derives the outcome from the same map it checks, so a map
  // with `git: 'enforce'` and a matching column would pass it. A harness not
  // named here can deny and nothing else (Codex: an ask is parsed, marked a
  // failed hook run, and the tool runs anyway).
  const CAN = { claude: ["allow", "ask", "deny", "block"] };
  const can = (harness) => CAN[harness] ?? ["deny"];

  for (const [harness, { modes }] of Object.entries(ADAPTERS)) {
    test(`${harness}: every enforce kind carries a decision the harness can make`, () => {
      const beyond = Object.entries(modes)
        .filter(([kind, mode]) => mode === "enforce" && KIND_DECISION[kind])
        .filter(([kind]) => !can(harness).includes(KIND_DECISION[kind]))
        .map(([kind]) => `${kind} (${KIND_DECISION[kind]})`);
      assert.deepEqual(beyond, [], `${harness} enforces decisions it cannot make: ${can(harness).join("|")} only`);
    });
  }
});

// ---- 5. SOURCE SCAN ----
describe("every kind literal in hooks/*.js is a known kind", () => {
  // A decision's kind must be a GATE_KINDS entry. A bare `kind:` is also the shape
  // of a log record, so it may be a RECORD_KINDS entry, or one of the audit-only
  // lines that carry no decision at all (an exclusion the config made).
  const AUDIT_KINDS = ["excluded-by-config"];
  const scan = (re) => {
    const hits = [];
    for (const file of fs.readdirSync(HOOKS_DIR).filter((f) => /\.m?js$/.test(f))) {
      const src = fs.readFileSync(path.join(HOOKS_DIR, file), "utf8");
      for (const m of src.matchAll(re)) hits.push({ file, kind: m[2] });
    }
    return hits;
  };
  const shapes = {
    "askFor/denyFor": /\b(askFor|denyFor)\(\s*['"`]([^'"`]+)['"`]/g,
    "allow(kind)": /\b(allow)\(\s*['"`]([^'"`]+)['"`]/g,
    "kind: literal": /\b(kind):\s*['"`]([^'"`]+)['"`]/g,
  };
  const known = {
    "askFor/denyFor": GATE_KINDS,
    "allow(kind)": GATE_KINDS,
    "kind: literal": [...GATE_KINDS, ...RECORD_KINDS, ...AUDIT_KINDS],
  };

  for (const [shape, re] of Object.entries(shapes)) {
    test(shape, () => {
      const hits = scan(re);
      // A scan that matches nothing proves nothing: the pattern would have rotted.
      assert.ok(hits.length > 0, `no ${shape} literal found, so the pattern no longer matches the source`);
      const unknown = hits.filter((h) => !known[shape].includes(h.kind)).map((h) => `${h.file}: ${h.kind}`);
      assert.deepEqual(unknown, [], `not in ${shape === "kind: literal" ? "GATE_KINDS/RECORD_KINDS/audit kinds" : "GATE_KINDS"}`);
    });
  }
});

// ---- 6. LOADING ----
describe("requiring a listed hook file runs nothing", () => {
  for (const file of LISTED_JS) {
    test(file, () => {
      const full = path.join(HOOKS_DIR, file);
      // The module is already cached from discovery: evict it so the load runs again.
      const { touched } = sealed(() => {
        delete requireCjs.cache[full];
        requireCjs(full);
      });
      assert.deepEqual(touched, [], "loading the file touched the process or wrote a file");
    });
  }
});

// ---- 7. STOP VARIANTS ----
// The definition-of-done gate reads the session's own log. Each row is one
// session's events (a fixture file written once, never by evaluate()), and the
// answer evaluate() gives a Stop for it. These rows pin evaluate() itself, not an
// adapter's outcome: what a harness does with a block is the mode/outcome
// invariant's business, and the table above already has a Stop row per outcome.
describe("Stop variants: the session's log decides", () => {
  const ev = (event, ts, extra = {}) => ({ event, ts, ...extra });
  const gateEv = (kind, ts, extra = {}) => ev("gate", ts, { kind, file: "src/x.ts", rule: kind, ...extra });
  const startEv = (agent, ts, extra = {}) => ev("agent_start", ts, { agent, id: `t${ts}`, ...extra });
  const resumeEv = (to, ts, hasMessage) => ev("agent_resume", ts, { to, has_message: hasMessage });
  // The shape of a gate a subagent opened: agent_id and agent_type only on a subagent.
  const sub = (type, inProject) => ({ agent_id: "a1", agent_type: type, in_project: inProject });

  const ROWS = [
    // which gates count
    ["a perf-budget gate, never reviewed", "block", [gateEv("perf-budget", 1000)]],
    ["a secret-block gate, never reviewed", "block", [gateEv("secret-block", 1000)]],
    ["a secret-ask gate, never reviewed", "block", [gateEv("secret-ask", 1000)]],
    ["a perf-budget gate, then Perry", "allow", [gateEv("perf-budget", 1000), startEv("perry", 2000)]],
    ["only a git gate: not a gated surface", "allow", [gateEv("git", 1000)]],
    // a reviewer must come after the last gated edit
    ["a stale reviewer: dispatched before the gate", "block", [startEv("quinn", 1000), gateEv("high-risk-surface", 2000)]],
    ["a reviewer in the same millisecond as the gate", "block", [gateEv("high-risk-surface", 1000), startEv("quinn", 1000)]],
    ["a reviewer between two gates covers only the first", "block",
      [gateEv("high-risk-surface", 1000), startEv("quinn", 2000), gateEv("perf-budget", 3000)]],
    ["a reviewer after the last gate", "allow",
      [gateEv("high-risk-surface", 1000), gateEv("perf-budget", 2000), startEv("gard", 3000)]],
    // who counts as a reviewer
    ["a non-reviewer agent after the gate", "block", [gateEv("high-risk-surface", 1000), startEv("bob", 2000)]],
    ["gardener is not gard", "block", [gateEv("high-risk-surface", 1000), startEv("gardener", 2000)]],
    ["gard-strict is gard", "allow", [gateEv("high-risk-surface", 1000), startEv("gard-strict", 2000)]],
    ["a reviewer in another session does not clear this one", "block",
      [gateEv("high-risk-surface", 1000), startEv("quinn", 2000, { session: "S-OTHER" })]],
    // a reviewer's probe outside the project is not the session's work
    ["a reviewer subagent's gate outside the project is skipped", "allow", [gateEv("high-risk-surface", 1000, sub("quinn", false))]],
    ["the same gate inside the project counts", "block", [gateEv("high-risk-surface", 1000, sub("quinn", true))]],
    ["a gate with no in_project field counts", "block", [gateEv("high-risk-surface", 1000, { agent_id: "a1", agent_type: "quinn" })]],
    ["the main thread's gate outside the project counts", "block", [gateEv("high-risk-surface", 1000, { in_project: false })]],
    ["a non-reviewer subagent's gate outside the project counts", "block", [gateEv("high-risk-surface", 1000, sub("bob", false))]],
    ["a skipped probe does not hide a real gate", "block",
      [gateEv("high-risk-surface", 1000, sub("quinn", false)), gateEv("perf-budget", 1500)]],
    // a resumed reviewer
    ["agent_resume with a message resumes the reviewer", "allow",
      [startEv("quinn", 500, { name: "q" }), gateEv("high-risk-surface", 1000), resumeEv("q", 2000, true)]],
    ["agent_resume without a message does not", "block",
      [startEv("quinn", 500, { name: "q" }), gateEv("high-risk-surface", 1000), resumeEv("q", 2000, false)]],
    ["agent_resume with a message before the gate does not", "block",
      [startEv("quinn", 500, { name: "q" }), resumeEv("q", 800, true), gateEv("high-risk-surface", 1000)]],
    ["agent_resume of a non-reviewer does not", "block",
      [startEv("bob", 500, { name: "b" }), gateEv("high-risk-surface", 1000), resumeEv("b", 2000, true)]],
    ["agent_resume of an unknown target does not", "block",
      [gateEv("high-risk-surface", 1000), resumeEv("nobody", 2000, true)]],
    ["agent_resume addressed by agent id, through its launch", "allow",
      [startEv("quinn", 500, { id: "t9" }), ev("agent_launch", 600, { id: "t9", agent_id: "a9" }),
        gateEv("high-risk-surface", 1000), resumeEv("a9", 2000, true)]],
  ];

  before(async () => {
    fx.stopVariants = path.join(ROOT, "stop-variants");
    await mkdir(fx.stopVariants);
    // Lines that are not events must not cost a verdict: a torn write, a null.
    let text = "{not json\nnull\n\n";
    ROWS.forEach(([, , events], i) => {
      for (const e of events) text += JSON.stringify({ session: `S-${i}`, ...e }) + "\n";
    });
    await writeFile(path.join(fx.stopVariants, "events.jsonl"), text);
  });

  const stop = (session, logDir) => sealed(() => evaluate({ event: "Stop", cwd: fx.plain, session }, envFor(fx.plain, { logDir })));

  ROWS.forEach(([name, expected], i) => {
    test(name, () => {
      const { result, touched } = stop(`S-${i}`, fx.stopVariants);
      assert.deepEqual(touched, [], "evaluate touched the process or wrote a file");
      if (expected === "block") {
        assert.deepEqual({ decision: result.decision, kind: result.kind }, { decision: "block", kind: "definition-of-done" });
        assert.deepEqual(result.logs.map((l) => [l.record.event, l.record.kind, l.record.session]),
          [["gate", "definition-of-done", `S-${i}`]], "the block is logged once, to the session");
      } else {
        assert.deepEqual({ decision: result.decision, kind: result.kind }, { decision: "allow", kind: null });
        assert.deepEqual(result.logs, [], "an allow logs nothing");
      }
    });
  });

  // No log means nothing was gated: the Stop is an allow, and never an error.
  for (const [label, logDir] of [
    ["a log directory that does not exist", () => path.join(ROOT, "never-created")],
    ["no log directory at all", () => undefined],
    ["a log directory that is a file", () => path.join(fx.stopVariants, "events.jsonl")],
  ]) {
    test(`a missing log: ${label}`, () => {
      const { result, touched } = stop("S-0", logDir());
      assert.deepEqual(touched, []);
      assert.deepEqual({ decision: result.decision, kind: result.kind, logs: result.logs }, { decision: "allow", kind: null, logs: [] });
    });
  }
});

// ---- 8. PATHS ----
// A gate runs on one normalized, project-relative form of the path (normalizePath,
// projectPath), and `in_project` on its real path (onProject). Every spelling that
// reaches the same file must reach the same verdict and the same in_project. Rows
// give the gate lines evaluate() returns as [kind, in_project, rule].
describe("path spellings reach the same verdict", () => {
  const BS = "\\";
  const lowerDrive = (p) => p[0].toLowerCase() + p.slice(1);
  const symlinkType = process.platform === "win32" ? "junction" : "dir";
  const edit = (cwd, file_path) => ({ event: "PreToolUse", tool: "Edit", toolInput: { file_path, new_string: "x" }, cwd, session: "CORE" });
  const bash = (cwd, command) => shell(cwd, command);
  const PROJ = () => fx.pathProj;
  const AUTH = ["high-risk-surface", true, "auth"];

  before(async () => {
    fx.pathProj = path.join(ROOT, "path-proj");
    fx.pathOutside = path.join(ROOT, "path-outside");
    await mkdir(path.join(fx.pathProj, ".claude"), { recursive: true });
    await mkdir(fx.pathOutside);
    // A link into the project and a link out of it; where the OS refuses a link
    // (a Windows account without the privilege) the rows that need one skip.
    try {
      fs.symlinkSync(fx.pathProj, path.join(ROOT, "path-link"), symlinkType);
      fs.symlinkSync(fx.pathOutside, path.join(fx.pathProj, "escape"), symlinkType);
      fx.links = true;
    } catch (_) { fx.links = false; }
  });

  // [name, event, env.projectDir, expected gate lines, expected decision]
  const ROWS = [
    ["a backslash relative path (Edit)", () => edit(PROJ(), ["src", "auth", "session.ts"].join(BS)), PROJ, [AUTH], "ask"],
    ["a backslash relative path (shell)", () => bash(PROJ(), `echo x > ${["src", "auth", "s.ts"].join(BS)}`), PROJ, [AUTH], "ask"],
    ["mixed separators", () => edit(PROJ(), `src/auth${BS}session.ts`), PROJ, [AUTH], "ask"],
    ["a ./ prefix", () => edit(PROJ(), "./src/auth/session.ts"), PROJ, [AUTH], "ask"],
    ["a doubled slash", () => edit(PROJ(), "src//auth//session.ts"), PROJ, [AUTH], "ask"],

    // `..` is resolved before any rule or exclude looks at the path
    ["a .. that leaves an exclude: src/legacy/../login is no longer legacy", () => edit(C(), "src/legacy/../login/a.ts"), C, [["high-risk-surface", true, "ambiguous"]], "ask"],
    ["a .. that enters an exclude: src/auth/../legacy/login is legacy", () => edit(C(), "src/auth/../legacy/login/a.ts"), C, [["excluded-by-config", true, null]], "allow"],
    ["a .. out of node_modules is no longer noise", () => edit(PROJ(), "node_modules/../.env"), PROJ, [["high-risk-surface", true, "secret-path"]], "ask"],
    ["a .. out of the project is outside it", () => edit(PROJ(), "../path-outside/src/auth/x.ts"), PROJ, [["high-risk-surface", false, "auth"]], "ask"],
    ["a .. out and back in is inside", () => edit(PROJ(), "../path-proj/src/auth/x.ts"), PROJ, [AUTH], "ask"],
    ["a .. out of the project to a harmless file", () => edit(PROJ(), "../path-outside/x.ts"), PROJ, [], "allow"],

    // absolute, outside the project: a risky name still gates (absolute fails closed)
    ["an absolute path outside the project", () => edit(PROJ(), fx.pathOutside + "/src/auth/x.ts"), PROJ, [["high-risk-surface", false, "auth"]], "ask"],
    ["an absolute path outside, under node_modules, is not noise", () => edit(PROJ(), fx.pathOutside + "/node_modules/p/.env"), PROJ, [["high-risk-surface", false, "secret-path"]], "ask"],
    ["an absolute perf budget outside the project", () => edit(PROJ(), fx.pathOutside + "/lighthouserc.json"), PROJ, [["perf-budget", false, null]], "ask"],
    ["an absolute harmless path outside the project", () => edit(PROJ(), fx.pathOutside + "/x.ts"), PROJ, [], "allow"],
    ["an absolute path inside the project", () => edit(PROJ(), PROJ() + "/src/auth/x.ts"), PROJ, [AUTH], "ask"],
    ["an absolute path inside the project, in the shell", () => bash(PROJ(), `echo x > '${fx.pathProj.split(BS).join("/")}/src/auth/x.ts'`), PROJ, [AUTH], "ask"],
  ];

  for (const [name, build, projectDir, gates, decision] of ROWS) {
    test(name, () => {
      const evt = build();
      const { result, touched } = sealed(() => evaluate(evt, envFor(projectDir())));
      assert.deepEqual(touched, [], "evaluate touched the process or wrote a file");
      assert.equal(result.decision, decision);
      assert.deepEqual(result.logs.filter((l) => l.record.event === "gate").map((l) => [l.record.kind, l.record.in_project, l.record.rule ?? null]), gates);
    });
  }

  // Drive letters are case-insensitive on Windows only (normalizePath uppercases
  // them there); on POSIX `c:` and `C:` are different names.
  const winOnly = process.platform === "win32" ? false : "drive letters are normalized only on win32";
  const driveRows = [
    // Relative to the project the path is noise; a drive that did not match would leave it absolute, where it fails closed (jwt is a strong term).
    ["a lower-case drive in the file path", () => edit(PROJ(), lowerDrive(fx.pathProj).split(BS).join("/") + "/node_modules/jwt/index.js"), PROJ, [], "allow"],
    ["a lower-case drive in the cwd", () => edit(lowerDrive(fx.pathProj), fx.pathProj.split(BS).join("/") + "/node_modules/jwt/index.js"), PROJ, [], "allow"],
    ["a lower-case drive in env.projectDir", () => edit(PROJ(), fx.pathProj + BS + "node_modules" + BS + "jwt" + BS + "index.js"), () => lowerDrive(fx.pathProj), [], "allow"],
    ["a lower-case drive, backslashes, and a real gate", () => edit(lowerDrive(fx.pathProj), fx.pathProj + BS + "src" + BS + "auth" + BS + "x.ts"), PROJ, [AUTH], "ask"],
  ];
  for (const [name, build, projectDir, gates, decision] of driveRows) {
    test(name, { skip: winOnly }, () => {
      const { result, touched } = sealed(() => evaluate(build(), envFor(projectDir())));
      assert.deepEqual(touched, []);
      assert.equal(result.decision, decision);
      assert.deepEqual(result.logs.filter((l) => l.record.event === "gate").map((l) => [l.record.kind, l.record.in_project, l.record.rule ?? null]), gates);
    });
  }

  // in_project is judged on the real path. A tmpdir that is itself a link (macOS:
  // /var -> /private/var) is the usual case, so rows build the same situation on
  // any OS from a link in the fixture, and add the real tmpdir's own two spellings.
  const linkRows = [
    ["the project spelled through a link", () => edit(PROJ(), path.join(ROOT, "path-link", "src", "auth", "x.ts")), PROJ, [AUTH], "ask"],
    ["the cwd and project given as the link", () => edit(path.join(ROOT, "path-link"), path.join(fx.pathProj, "src", "auth", "x.ts")), () => path.join(ROOT, "path-link"), [AUTH], "ask"],
    ["a link inside the project that leads out of it (absolute)", () => edit(PROJ(), path.join(fx.pathProj, "escape", "src", "auth", "x.ts")), PROJ, [["high-risk-surface", false, "auth"]], "ask"],
    ["a link inside the project that leads out of it (relative)", () => edit(PROJ(), "escape/src/auth/x.ts"), PROJ, [["high-risk-surface", false, "auth"]], "ask"],
    ["a link out of the project to a harmless file", () => edit(PROJ(), "escape/x.ts"), PROJ, [], "allow"],
  ];
  for (const [name, build, projectDir, gates, decision] of linkRows) {
    test(name, (t) => {
      if (!fx.links) return t.skip("this account cannot create a directory link here");
      const { result, touched } = sealed(() => evaluate(build(), envFor(projectDir())));
      assert.deepEqual(touched, []);
      assert.equal(result.decision, decision);
      assert.deepEqual(result.logs.filter((l) => l.record.event === "gate").map((l) => [l.record.kind, l.record.in_project, l.record.rule ?? null]), gates);
    });
  }

  // The real tmpdir, both ways: macOS reports os.tmpdir() as /var/folders/... and
  // the file's real path is /private/var/...; elsewhere the two spellings are equal
  // and the row is a plain inside-the-project check.
  test("the realpath of the tmpdir, in either role", () => {
    const real = fs.realpathSync(fx.pathProj);
    const asGiven = path.join(fx.pathProj, "src", "auth", "x.ts");
    const asReal = path.join(real, "src", "auth", "x.ts");
    for (const [label, cwd, file, projectDir] of [
      ["real cwd and project, file as given", real, asGiven, real],
      ["cwd and project as given, real file", fx.pathProj, asReal, fx.pathProj],
      ["real cwd, project as given", real, asReal, fx.pathProj],
    ]) {
      const { result, touched } = sealed(() => evaluate(edit(cwd, file), envFor(projectDir)));
      assert.deepEqual(touched, [], label);
      assert.equal(result.decision, "ask", label);
      assert.deepEqual(result.logs.filter((l) => l.record.event === "gate").map((l) => [l.record.kind, l.record.in_project]),
        [["high-risk-surface", true]], label);
    }
  });
});

// ---- 9. MALFORMED INPUT ----
// evaluate() fails open by itself (docs/hooks.md, "The core"): an error is an
// allow that keeps the logs recorded before it. An adapter that sends something
// the core does not recognize must get a well-formed allow, never an exception.
describe("malformed input fails open", () => {
  const allowed = (r) => ({ decision: r.decision, kind: r.kind, reason: r.reason, logs: r.logs });
  const ALLOW = { decision: "allow", kind: null, reason: "", logs: [] };

  for (const [label, evt] of [["{}", {}], ["null", null], ["undefined", undefined], ["a string", "git commit"], ["a number", 42], ["an array", []]]) {
    test(`evaluate(${label}) is an allow with no logs`, () => {
      const { result, touched } = sealed(() => evaluate(evt, envFor(fx.plain)));
      assert.deepEqual(touched, []);
      assert.deepEqual(allowed(result), ALLOW);
    });
  }

  test("evaluate() with no arguments", () => {
    const { result, touched } = sealed(() => evaluate());
    assert.deepEqual(touched, []);
    assert.deepEqual(allowed(result), ALLOW);
  });

  for (const [label, toolInput] of [["null", null], ["a number", 42], ["an array", []]]) {
    for (const tool of ["Bash", "Write"]) {
      test(`a ${tool} call whose toolInput is ${label} is an allow`, () => {
        const evt = { event: "PreToolUse", tool, toolInput, cwd: fx.plain, session: "CORE" };
        const { result, touched } = sealed(() => evaluate(evt, envFor(fx.plain)));
        assert.deepEqual(touched, []);
        assert.deepEqual(allowed(result), ALLOW);
      });
    }
  }

  // A missing env is no machine knowledge at all (no log dir, no home, no project):
  // the denies decide the same, an ask is still an ask, a Stop has nothing to read.
  for (const [label, env] of [["undefined", undefined], ["null", null], ["{}", {}]]) {
    test(`a ${label} env decides the same`, () => {
      const run = (evt) => sealed(() => evaluate(evt, env));
      const rows = [
        [shell(fx.plain, "git commit --no-verify -m wip"), "deny", "git-bypass"],
        [editAt(fx.plain, "src/app.ts", FAKE_PEM, "Write"), "deny", "secret-block"],
        [shell(fx.plain, "git commit -m wip"), "ask", "git"],
        [editAt(fx.plain, "src/auth/session.ts"), "ask", "high-risk-surface"],
        [shell(fx.plain, "ls"), "allow", null],
        [{ event: "Stop", cwd: fx.plain, session: "S-GATED" }, "allow", null],
      ];
      for (const [evt, decision, kind] of rows) {
        const { result, touched } = run(evt);
        assert.deepEqual(touched, []);
        assert.deepEqual({ decision: result.decision, kind: result.kind }, { decision, kind }, evt.toolInput?.command || evt.toolInput?.file_path || evt.event);
        assert.ok(Array.isArray(result.logs));
      }
    });
  }

  // The Codex adapter's env: no log folder at all (logDir null), a home, no
  // project dir. Nothing is read or written for a log, and the gates decide the same.
  test("the Codex env (logDir: null) decides the same and writes nothing", () => {
    const env = { logDir: null, legacyLogDir: undefined, projectDir: undefined, home: ROOT };
    const rows = [
      [shell(fx.plain, "git commit --no-verify -m wip"), "deny", "git-bypass"],
      [editAt(fx.plain, "src/app.ts", FAKE_AWS_KEY, "Write"), "deny", "secret-block"],
      [shell(fx.plain, "git push"), "ask", "git"],
      [editAt(fx.plain, "src/auth/session.ts"), "ask", "high-risk-surface"],
      [{ event: "Stop", cwd: fx.plain, session: "S-GATED" }, "allow", null],
    ];
    for (const [evt, decision, kind] of rows) {
      const { result, touched } = sealed(() => evaluate(evt, env));
      assert.deepEqual(touched, []);
      assert.deepEqual({ decision: result.decision, kind: result.kind }, { decision, kind }, evt.toolInput?.command || evt.toolInput?.file_path || evt.event);
    }
  });

  // The same env with no home (os.homedir() failed in the adapter): ~/.claude
  // cannot be ruled out, so every file counts as in the project, the stricter
  // side (onProject). A file outside the project is the control: out with a home.
  test("the Codex env with home undefined counts every file as in the project, and still denies", () => {
    const env = { logDir: null, legacyLogDir: undefined, projectDir: undefined, home: undefined };
    const outside = path.join(ROOT, "elsewhere", "src", "auth", "session.ts");
    const inProject = (e) => {
      const { result, touched } = sealed(() => evaluate({ ...editAt(fx.plain, "x"), toolInput: { file_path: outside, new_string: "x" } }, e));
      assert.deepEqual(touched, []);
      assert.deepEqual({ decision: result.decision, kind: result.kind }, { decision: "ask", kind: "high-risk-surface" });
      return result.logs.filter((l) => l.record.event === "gate").map((l) => l.record.in_project);
    };
    assert.deepEqual(inProject({ ...env, home: ROOT }), [false], "control: with a home, the outside file is outside");
    assert.deepEqual(inProject(env), [true], "with no home, it counts as in the project");

    // A git gate names no file, so its record carries no in_project at all.
    for (const [evt, kind, inProjectField] of [
      [shell(fx.plain, "git commit --no-verify -m wip"), "git-bypass", undefined],
      [{ ...editAt(fx.plain, "x", FAKE_AWS_KEY, "Write"), toolInput: { file_path: outside, content: FAKE_AWS_KEY } }, "secret-block", true],
    ]) {
      const { result, touched } = sealed(() => evaluate(evt, env));
      assert.deepEqual(touched, []);
      assert.deepEqual({ decision: result.decision, kind: result.kind }, { decision: "deny", kind });
      assert.deepEqual(result.logs.filter((l) => l.record.event === "gate").map((l) => l.record.in_project), [inProjectField], kind);
    }
  });

  // The error comes after a log line was recorded: the answer is the fail-open
  // allow, and the line recorded before the error is still returned. The command
  // has two targets: the first only an exclusion the config made (a log line, no
  // verdict), the second a real ask. The clock throws on every read after its
  // first, which is the first log line's: how many reads come after does not
  // matter, and the logs returned pin where the throw landed.
  test("a throw after a log keeps the log and allows", () => {
    const cmd = "echo x > src/legacy/login/a.ts && echo y > src/auth/b.ts";
    const control = sealed(() => evaluate(shell(fx.cfg, cmd), envFor(fx.cfg)));
    assert.deepEqual(control.touched, []);
    assert.deepEqual(
      { decision: control.result.decision, kind: control.result.kind, logs: control.result.logs.map((l) => l.record.kind) },
      { decision: "ask", kind: "high-risk-surface", logs: ["excluded-by-config", "high-risk-surface"] },
      "without the fault, the second target asks");

    const realNow = Date.now;
    let reads = 0;
    Date.now = () => {
      if (++reads > 1) throw new Error("clock failed after the first log");
      return realNow();
    };
    let faulted;
    try {
      faulted = sealed(() => evaluate(shell(fx.cfg, cmd), envFor(fx.cfg)));
    } finally {
      Date.now = realNow;
    }
    assert.ok(reads >= 2, "the clock was read again after the first log line, and threw");
    assert.deepEqual(faulted.touched, []);
    assert.deepEqual({ decision: faulted.result.decision, kind: faulted.result.kind, reason: faulted.result.reason }, { decision: "allow", kind: null, reason: "" });
    assert.deepEqual(faulted.result.logs.map((l) => [l.file, l.record.event, l.record.kind]), [["events.jsonl", "gate", "excluded-by-config"]]);
  });
});

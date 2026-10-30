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
 *      produce. Only the Claude column exists today; an adapter adds its column
 *      to the rows and its entry to ADAPTERS.
 *   3. GATE MAPS — every adapter's mode map covers GATE_KINDS with a documented
 *      mode, and every kind evaluate() returns is in GATE_KINDS.
 *
 * Out of scope here (2.2): the `validate` check that holds each `[ENFORCED]` line
 * to a gate map, and "Codex never outputs ask". "Every dispatch is logged" is
 * `[ENFORCED]` too, but it is logging, not a decision kind, so it has no entry in
 * GATE_KINDS and none is invented for it.
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

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Loaded before any stub goes in: the module's own load is not under test.
const { evaluate, GATE_KINDS, CLAUDE_GATE_MODES } =
  createRequire(import.meta.url)(path.join(REPO, "hooks", "canonkit-hook.js"));

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

// One line per adapter. `modes` is its declared gate map; `outcome` reduces an
// evaluate() result to what that harness does with it. Claude Code enforces
// every kind as decided, so its outcome is the decision itself.
const ADAPTERS = {
  claude: { modes: CLAUDE_GATE_MODES, outcome: ({ decision, kind }) => ({ decision, kind }) },
};
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
// To add a harness: give each row its column, and ADAPTERS its line.
const P = () => fx.plain;
const C = () => fx.cfg;
const PARITY = [
  // git-bypass
  { name: "git commit --no-verify", evt: () => shell(P(), "git commit --no-verify -m wip"), expect: { claude: { decision: "deny", kind: "git-bypass" } } },
  { name: "git commit -n", evt: () => shell(P(), "git commit -n -m wip"), expect: { claude: { decision: "deny", kind: "git-bypass" } } },
  { name: "git -c core.hooksPath=/dev/null commit", evt: () => shell(P(), "git -c core.hooksPath=/dev/null commit -m wip"), expect: { claude: { decision: "deny", kind: "git-bypass" } } },
  { name: "git push --no-verify through PowerShell", evt: () => shell(P(), "git push --no-verify", "PowerShell"), expect: { claude: { decision: "deny", kind: "git-bypass" } } },
  // secret-block
  { name: "shell writes a cloud key", evt: () => shell(P(), `echo ${FAKE_AWS_KEY} > config/aws.txt`), expect: { claude: { decision: "deny", kind: "secret-block" } } },
  { name: "Write with a private key", evt: () => editAt(P(), "src/app.ts", FAKE_PEM, "Write"), expect: { claude: { decision: "deny", kind: "secret-block" } } },
  { name: "secret deny beats a test-file path", evt: () => editAt(P(), "src/app.test.ts", FAKE_PEM), expect: { claude: { decision: "deny", kind: "secret-block" } } },
  // git
  { name: "git commit", evt: () => shell(P(), "git commit -m wip"), expect: { claude: { decision: "ask", kind: "git" } } },
  { name: "git -C x commit", evt: () => shell(P(), "git -C x commit -m wip"), expect: { claude: { decision: "ask", kind: "git" } } },
  { name: 'bash -c "git push"', evt: () => shell(P(), 'bash -c "git push"'), expect: { claude: { decision: "ask", kind: "git" } } },
  { name: "a message mentioning --no-verify is not a bypass", evt: () => shell(P(), 'git commit -m "never use --no-verify"'), expect: { claude: { decision: "ask", kind: "git" } } },
  { name: "git push -n is a dry run, not a bypass", evt: () => shell(P(), "git push -n"), expect: { claude: { decision: "ask", kind: "git" } } },
  { name: "an empty event name is gated as PreToolUse", evt: () => ({ ...shell(P(), "git push"), event: "" }), expect: { claude: { decision: "ask", kind: "git" } } },
  // secret-ask
  { name: "edit with a soft credential", evt: () => editAt(P(), "src/config.ts", SOFT_SECRET), expect: { claude: { decision: "ask", kind: "secret-ask" } } },
  { name: "shell writes a soft credential", evt: () => shell(P(), `echo "${SOFT_SECRET}" > src/config.ts`), expect: { claude: { decision: "ask", kind: "secret-ask" } } },
  // perf-budget
  { name: "edit lighthouserc.json", evt: () => editAt(P(), "lighthouserc.json"), expect: { claude: { decision: "ask", kind: "perf-budget" } } },
  { name: "PowerShell writes .size-limit.json", evt: () => shell(P(), "Set-Content -Path .size-limit.json -Value x", "PowerShell"), expect: { claude: { decision: "ask", kind: "perf-budget" } } },
  { name: "config perfBudgets adds a file", evt: () => editAt(C(), "perf/limits.yml"), expect: { claude: { decision: "ask", kind: "perf-budget" } } },
  // high-risk-surface
  { name: "edit an auth file", evt: () => editAt(P(), "src/auth/session.ts"), expect: { claude: { decision: "ask", kind: "high-risk-surface" } } },
  { name: "shell writes a migration", evt: () => shell(P(), "echo x > db/migrations/001_init.sql"), expect: { claude: { decision: "ask", kind: "high-risk-surface" } } },
  { name: "edit the gate config itself", evt: () => editAt(C(), ".claude/canonkit.json", "{}"), expect: { claude: { decision: "ask", kind: "high-risk-surface" } } },
  { name: "config include adds a path", evt: () => editAt(C(), "src/billing/charge.ts"), expect: { claude: { decision: "ask", kind: "high-risk-surface" } } },
  { name: "config exclude never reaches a strong term", evt: () => editAt(C(), "src/legacy/auth/x.ts"), expect: { claude: { decision: "ask", kind: "high-risk-surface" } } },
  { name: "a subagent's edit is gated the same", evt: () => ({ ...editAt(P(), "src/auth/session.ts"), agentId: "a1", agentType: "bob" }), expect: { claude: { decision: "ask", kind: "high-risk-surface" } } },
  // the project dir is not the cwd: a config found only through env.projectDir
  { name: "config found through env.projectDir, not cwd", evt: () => ({ ...editAt(C(), "src/billing/charge.ts"), cwd: P() }), env: () => ({ projectDir: C() }), expect: { claude: { decision: "ask", kind: "high-risk-surface" } } },
  // definition-of-done
  { name: "Stop after an unreviewed gate", evt: () => ({ event: "Stop", cwd: P(), session: "S-GATED" }), env: () => ({ logDir: fx.stopLogs }), expect: { claude: { decision: "block", kind: "definition-of-done" } } },
  // allow
  { name: "a plain command", evt: () => shell(P(), "ls -la"), expect: { claude: { decision: "allow", kind: null } } },
  { name: "git status", evt: () => shell(P(), "git status"), expect: { claude: { decision: "allow", kind: null } } },
  { name: "an ordinary edit", evt: () => editAt(P(), "src/utils/format.ts"), expect: { claude: { decision: "allow", kind: null } } },
  { name: "a presentational sessions folder", evt: () => editAt(P(), "src/components/sessions/List.tsx"), expect: { claude: { decision: "allow", kind: null } } },
  { name: "config exclude quiets an ambiguous word", evt: () => editAt(C(), "src/legacy/login/form.ts"), expect: { claude: { decision: "allow", kind: null } } },
  { name: "a soft credential in a test file", evt: () => editAt(P(), "src/config.test.ts", SOFT_SECRET), expect: { claude: { decision: "allow", kind: null } } },
  { name: "Stop after a reviewed gate", evt: () => ({ event: "Stop", cwd: P(), session: "S-REVIEWED" }), env: () => ({ logDir: fx.stopLogs }), expect: { claude: { decision: "allow", kind: null } } },
  { name: "Stop already continued once", evt: () => ({ event: "Stop", cwd: P(), session: "S-GATED", stopHookActive: true }), env: () => ({ logDir: fx.stopLogs }), expect: { claude: { decision: "allow", kind: null } } },
  { name: "dispatching a subagent", evt: () => ({ event: "PreToolUse", tool: "Agent", toolInput: { subagent_type: "quinn" }, cwd: P(), session: "CORE" }), expect: { claude: { decision: "allow", kind: null } } },
  { name: "PostToolUse never gates", evt: () => ({ ...editAt(P(), "src/auth/session.ts"), event: "PostToolUse" }), expect: { claude: { decision: "allow", kind: null } } },
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
describe("gate maps cover GATE_KINDS", () => {
  for (const [harness, { modes }] of Object.entries(ADAPTERS)) {
    test(`${harness}: one documented mode per kind, and no other key`, () => {
      assert.deepEqual(Object.keys(modes).sort(), [...GATE_KINDS].sort());
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

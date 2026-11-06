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
 *      produce: a column per discovered adapter (claude, codex, opencode), written by hand
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
 *  10. ASK ONCE — the one lookup that fails closed: a throw in it asks, where the
 *      rest of the core would allow.
 *  11. A QUOTED ARROW IS NOT A REDIRECT — `=>` inside a quoted string opens no gate;
 *      every other `>`, and every arrow in any doubt, still does.
 *  12. THE SESSION SCRATCHPAD — files in it skip the path gates, shells keep
 *      secret-ask, and everything unproved about the folder or a target leaves
 *      them on.
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
  fx.optIn = await proj("opt-in", {
    highRisk: { include: ["eslint.config.*", "vitest.config.*"], exclude: ["eslint.config.*"] },
  });
  fx.optInNested = path.join(fx.optIn, "packages", "demo");
  await mkdir(path.join(fx.optInNested, ".claude"), { recursive: true });
  await writeFile(path.join(fx.optInNested, ".claude", "canonkit.json"), "{}");
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

describe("literal shell copy, move and in-place edit targets", () => {
  const cases = [
    ["cp plain.ts src/auth/session.ts", "Bash", "high-risk-surface"],
    ["cp -f plain.ts 'src/auth/session file.ts'", "Bash", "high-risk-surface"],
    ["cp -- plain.ts src/auth/session.ts", "Bash", "high-risk-surface"],
    ["cp -t src/auth a.ts b.ts", "Bash", "high-risk-surface"],
    ["cp --target-directory=src/auth a.ts b.ts", "Bash", "high-risk-surface"],
    ["cp -tsrc/auth a.ts b.ts", "Bash", "high-risk-surface"],
    ["cp -t.env a.ts", "Bash", "high-risk-surface"],
    ["sudo -u dev cp -S .backup plain.ts src/auth/session.ts", "Bash", "high-risk-surface"],
    ["cp src/auth/session.ts plain.ts", "Bash", null],
    ["mv src/auth/session.ts plain.ts", "Bash", "high-risk-surface"],
    ["mv a.ts b.ts src/auth/", "Bash", "high-risk-surface"],
    ["mv --target-directory=plain src/auth/session.ts", "Bash", "high-risk-surface"],
    ["cp plain.ts .size-limit.json", "Bash", "perf-budget"],
    ["cp plain.ts .claude/canonkit.json", "Bash", "high-risk-surface"],
    ["sed -i 's/old/new/' src/auth/session.ts", "Bash", "high-risk-surface"],
    ["sed -i.bak 's/old/new/' plain.ts src/auth/session.ts", "Bash", "high-risk-surface"],
    ["sed -i '' 's/old/new/' 'src/auth/session file.ts'", "Bash", "high-risk-surface"],
    ["sed -i .bak -e 's/old/new/' src/auth/session.ts", "Bash", "high-risk-surface"],
    ["sed --in-place=.bak --expression='s/old/new/' src/auth/session.ts", "Bash", "high-risk-surface"],
    ["sed -Ei -f program.sed -- src/auth/session.ts", "Bash", "high-risk-surface"],
    ["sed 's/old/new/' src/auth/session.ts", "Bash", null],
    ["sed -i -e 's/src/auth/session.ts/new/' plain.ts", "Bash", null],
    ["sed -i -f src/auth/program.sed plain.ts", "Bash", null],
    ["echo 'cp plain.ts src/auth/session.ts'", "Bash", null],
    ["printf '%s' 'mv src/auth/session.ts plain.ts'", "Bash", null],
    ["echo ok # cp plain.ts src/auth/session.ts", "Bash", null],
    ["true && cp plain.ts src/auth/session.ts", "Bash", "high-risk-surface"],
    ["cp plain.ts ordinary.ts", "Bash", null],
    ["Copy-Item -Path plain.ts -Destination src/auth/session.ts", "PowerShell", "high-risk-surface"],
    ["Copy-Item plain.ts 'src/auth/session file.ts' -Force", "PowerShell", "high-risk-surface"],
    ["Copy-Item -LiteralPath plain.ts -Destination:src/auth/session.ts", "PowerShell", "high-risk-surface"],
    ["Copy-Item -Destination src/auth/session.ts plain.ts", "PowerShell", "high-risk-surface"],
    ["Copy-Item src/auth/session.ts ordinary.ts", "PowerShell", null],
    ["Copy-Item -Filter auth.ts plain.ts ordinary.ts", "PowerShell", null],
    ["Move-Item -LiteralPath 'src\\auth\\session file.ts' -Destination plain.ts", "PowerShell", "high-risk-surface"],
    ["Move-Item plain.ts src/auth/session.ts", "PowerShell", "high-risk-surface"],
    ["Move-Item -Path src/auth/session.ts", "PowerShell", "high-risk-surface"],
    ["Move-Item src/auth/session.ts", "PowerShell", "high-risk-surface"],
    ["Write-Output 'Copy-Item plain.ts src/auth/session.ts'", "PowerShell", null],
    ["& 'C:\\Tools\\cp.exe' plain.ts src\\auth\\session.ts", "PowerShell", "high-risk-surface"],
  ];
  for (const [command, tool, kind] of cases) {
    test(`${tool}: ${command}`, () => {
      const result = evaluate(shell(fx.plain, command, tool), envFor(fx.plain));
      assert.equal(result.kind, kind);
      assert.equal(result.decision, kind ? "ask" : "allow");
    });
  }
  for (const [command, tool] of [
    [`sed -i 's/x/${FAKE_AWS_KEY}/' src/auth/session.ts`, "Bash"],
    [`Copy-Item plain.ts src/auth/session.ts # ${FAKE_AWS_KEY}`, "PowerShell"],
    [`cp plain.ts .env # ${FAKE_PEM}`, "Bash"],
  ]) {
    test(`${tool}: hard-secret deny precedes path asks and malformed config`, () => {
      const result = evaluate(shell(fx.badJson, command, tool), envFor(fx.badJson));
      assert.equal(result.decision, "deny");
      assert.equal(result.kind, "secret-block");
    });
  }
});

describe("new telemetry omits descriptions and command fragments", () => {
  test("Agent/Task start and foreground end omit task text", () => {
    for (const tool of ["Agent", "Task"]) for (const event of ["PreToolUse", "PostToolUse"]) {
      const result = evaluate({ event, tool, cwd: fx.plain, session: "PRIVATE",
        toolInput: { subagent_type: "gard", description: "PRIVATE-DESCRIPTION", prompt: "PRIVATE-PROMPT" },
        toolResponse: { status: "completed" } }, envFor(fx.plain));
      const records = result.logs.map((l) => l.record);
      assert.ok(records.some((r) => r.event === (event === "PreToolUse" ? "agent_start" : "agent_end")));
      assert.ok(records.every((r) => !Object.hasOwn(r, "task")));
      assert.doesNotMatch(JSON.stringify(records), /PRIVATE-DESCRIPTION|PRIVATE-PROMPT/);
    }
  });
  test("background end never copies a legacy task field into new records", async () => {
    const logDir = await mkdtemp(path.join(ROOT, "legacy-task-"));
    await writeFile(path.join(logDir, "events.jsonl"), [
      { session: "OLD", event: "agent_start", id: "d1", agent: "gard", task: "LEGACY-PRIVATE-DESCRIPTION" },
      { session: "OLD", event: "agent_launch", id: "d1", agent_id: "a1" },
    ].map(JSON.stringify).join("\n") + "\n");
    const result = evaluate({ event: "SubagentStop", cwd: fx.plain, session: "OLD", agentId: "a1" }, envFor(fx.plain, { logDir }));
    assert.ok(result.logs.some((l) => l.record.event === "agent_end"));
    assert.ok(result.logs.every((l) => !Object.hasOwn(l.record, "task")));
    assert.doesNotMatch(JSON.stringify(result.logs), /LEGACY-PRIVATE/);
  });
  for (const command of ["git commit -m PRIVATE-MESSAGE", "git commit --no-verify -m PRIVATE-MESSAGE",
    "git -c core.hooksPath=PRIVATE-PATH commit", "git commit -nmPRIVATE-MESSAGE"]) {
    test(`git metadata without command text: ${command}`, () => {
      const result = evaluate(shell(fx.plain, command), envFor(fx.plain));
      assert.ok(["ask", "deny"].includes(result.decision));
      assert.ok(result.logs.length);
      assert.ok(result.logs.every((l) => !Object.hasOwn(l.record, "detail")));
      assert.doesNotMatch(JSON.stringify(result.logs), /PRIVATE-MESSAGE|PRIVATE-PATH/);
    });
  }
});

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
// Codex and OpenCode enforce only the two denies: an ask or a block is an allow
// there, with the kind kept (test/hook-codex.test.js drives the real process,
// test/hook-opencode.test.js the plugin's hook).
const P = () => fx.plain;
const C = () => fx.cfg;

describe("configured paths have a neutral confirmation message", () => {
  for (const [label, event] of [
    ["direct edit", () => editAt(fx.optIn, "eslint.config.js")],
    ["file write", () => editAt(fx.optIn, "vitest.config.ts", "x", "Write")],
    ["shell write", () => shell(fx.optIn, "echo x > eslint.config.js")],
    ["PowerShell write", () => shell(fx.optIn, "Set-Content vitest.config.ts x", "PowerShell")],
    ["nested filename match", () => editAt(fx.optIn, "packages/ui/eslint.config.js")],
    ["root include under a nested config", () => ({ ...editAt(fx.optIn, "eslint.config.js"), cwd: fx.optInNested })],
  ]) {
    test(label, () => {
      const r = evaluate(event(), envFor(fx.optIn));
      assert.equal(r.decision, "ask");
      assert.equal(r.kind, "high-risk-surface");
      assert.match(r.reason, /protected by the project's highRisk\.include/);
      assert.match(r.reason, /routing and review rules for the affected area/);
      assert.match(r.reason, /which checks/);
      assert.match(r.reason, /rollback/);
      assert.match(r.reason, /highRisk\.exclude cannot override it/);
      assert.doesNotMatch(r.reason, /auth\/secret|Archie\/Gard|is a HIGH-risk surface/);
      assert.equal(r.logs.find((l) => l.record.kind === r.kind)?.record.rule, "include");
    });
  }

  test("lint/test configs are opt-in and default HIGH-risk paths retain their message", () => {
    for (const evt of [editAt(fx.plain, "eslint.config.js"), shell(fx.plain, "echo x > vitest.config.ts")]) {
      assert.equal(evaluate(evt, envFor(fx.plain)).decision, "allow");
    }
    for (const evt of [editAt(fx.plain, "src/auth/session.ts"), shell(fx.plain, "echo x > src/auth/session.ts")]) {
      const r = evaluate(evt, envFor(fx.plain));
      assert.equal(r.decision, "ask");
      assert.match(r.reason, /HIGH-risk surface \(auth\/secret\/migration\/contract\)/);
      assert.match(r.reason, /Archie\/Gard review/);
    }
  });
});

const PARITY = [
  // git-bypass
  { name: "git commit --no-verify", evt: () => shell(P(), "git commit --no-verify -m wip"), expect: { claude: { decision: "deny", kind: "git-bypass" }, codex: { decision: "deny", kind: "git-bypass" }, opencode: { decision: "deny", kind: "git-bypass" } } },
  { name: "git push --no-verify through PowerShell", evt: () => shell(P(), "git push --no-verify", "PowerShell"), expect: { claude: { decision: "deny", kind: "git-bypass" }, codex: { decision: "deny", kind: "git-bypass" }, opencode: { decision: "deny", kind: "git-bypass" } } },
  // secret-block
  { name: "shell writes a cloud key", evt: () => shell(P(), `echo ${FAKE_AWS_KEY} > config/aws.txt`), expect: { claude: { decision: "deny", kind: "secret-block" }, codex: { decision: "deny", kind: "secret-block" }, opencode: { decision: "deny", kind: "secret-block" } } },
  { name: "Write with a private key", evt: () => editAt(P(), "src/app.ts", FAKE_PEM, "Write"), expect: { claude: { decision: "deny", kind: "secret-block" }, codex: { decision: "deny", kind: "secret-block" }, opencode: { decision: "deny", kind: "secret-block" } } },
  { name: "secret deny beats a test-file path", evt: () => editAt(P(), "src/app.test.ts", FAKE_PEM), expect: { claude: { decision: "deny", kind: "secret-block" }, codex: { decision: "deny", kind: "secret-block" }, opencode: { decision: "deny", kind: "secret-block" } } },
  // git
  { name: "git commit", evt: () => shell(P(), "git commit -m wip"), expect: { claude: { decision: "ask", kind: "git" }, codex: { decision: "allow", kind: "git" }, opencode: { decision: "allow", kind: "git" } } },
  { name: "a message mentioning --no-verify is not a bypass", evt: () => shell(P(), 'git commit -m "never use --no-verify"'), expect: { claude: { decision: "ask", kind: "git" }, codex: { decision: "allow", kind: "git" }, opencode: { decision: "allow", kind: "git" } } },
  { name: "an empty event name is gated as PreToolUse", evt: () => ({ ...shell(P(), "git push"), event: "" }), expect: { claude: { decision: "ask", kind: "git" }, codex: { decision: "allow", kind: "git" }, opencode: { decision: "allow", kind: "git" } } },
  // secret-ask
  { name: "edit with a soft credential", evt: () => editAt(P(), "src/config.ts", SOFT_SECRET), expect: { claude: { decision: "ask", kind: "secret-ask" }, codex: { decision: "allow", kind: "secret-ask" }, opencode: { decision: "allow", kind: "secret-ask" } } },
  { name: "shell writes a soft credential", evt: () => shell(P(), `echo "${SOFT_SECRET}" > src/config.ts`), expect: { claude: { decision: "ask", kind: "secret-ask" }, codex: { decision: "allow", kind: "secret-ask" }, opencode: { decision: "allow", kind: "secret-ask" } } },
  // perf-budget
  { name: "edit lighthouserc.json", evt: () => editAt(P(), "lighthouserc.json"), expect: { claude: { decision: "ask", kind: "perf-budget" }, codex: { decision: "allow", kind: "perf-budget" }, opencode: { decision: "allow", kind: "perf-budget" } } },
  { name: "PowerShell writes .size-limit.json", evt: () => shell(P(), "Set-Content -Path .size-limit.json -Value x", "PowerShell"), expect: { claude: { decision: "ask", kind: "perf-budget" }, codex: { decision: "allow", kind: "perf-budget" }, opencode: { decision: "allow", kind: "perf-budget" } } },
  { name: "config perfBudgets adds a file", evt: () => editAt(C(), "perf/limits.yml"), expect: { claude: { decision: "ask", kind: "perf-budget" }, codex: { decision: "allow", kind: "perf-budget" }, opencode: { decision: "allow", kind: "perf-budget" } } },
  // high-risk-surface
  { name: "edit an auth file", evt: () => editAt(P(), "src/auth/session.ts"), expect: { claude: { decision: "ask", kind: "high-risk-surface" }, codex: { decision: "allow", kind: "high-risk-surface" }, opencode: { decision: "allow", kind: "high-risk-surface" } } },
  { name: "shell writes a migration", evt: () => shell(P(), "echo x > db/migrations/001_init.sql"), expect: { claude: { decision: "ask", kind: "high-risk-surface" }, codex: { decision: "allow", kind: "high-risk-surface" }, opencode: { decision: "allow", kind: "high-risk-surface" } } },
  { name: "edit the gate config itself", evt: () => editAt(C(), ".claude/canonkit.json", "{}"), expect: { claude: { decision: "ask", kind: "high-risk-surface" }, codex: { decision: "allow", kind: "high-risk-surface" }, opencode: { decision: "allow", kind: "high-risk-surface" } } },
  { name: "config include adds a path", evt: () => editAt(C(), "src/billing/charge.ts"), expect: { claude: { decision: "ask", kind: "high-risk-surface" }, codex: { decision: "allow", kind: "high-risk-surface" }, opencode: { decision: "allow", kind: "high-risk-surface" } } },
  { name: "config exclude never reaches a strong term", evt: () => editAt(C(), "src/legacy/auth/x.ts"), expect: { claude: { decision: "ask", kind: "high-risk-surface" }, codex: { decision: "allow", kind: "high-risk-surface" }, opencode: { decision: "allow", kind: "high-risk-surface" } } },
  { name: "a subagent's edit is gated the same", evt: () => ({ ...editAt(P(), "src/auth/session.ts"), agentId: "a1", agentType: "bob" }), expect: { claude: { decision: "ask", kind: "high-risk-surface" }, codex: { decision: "allow", kind: "high-risk-surface" }, opencode: { decision: "allow", kind: "high-risk-surface" } } },
  // the project dir is not the cwd: a config found only through env.projectDir
  { name: "config found through env.projectDir, not cwd", evt: () => ({ ...editAt(C(), "src/billing/charge.ts"), cwd: P() }), env: () => ({ projectDir: C() }), expect: { claude: { decision: "ask", kind: "high-risk-surface" }, codex: { decision: "allow", kind: "high-risk-surface" }, opencode: { decision: "allow", kind: "high-risk-surface" } } },
  // definition-of-done
  { name: "Stop after an unreviewed gate", evt: () => ({ event: "Stop", cwd: P(), session: "S-GATED" }), env: () => ({ logDir: fx.stopLogs }), expect: { claude: { decision: "block", kind: "definition-of-done" }, codex: { decision: "allow", kind: "definition-of-done" }, opencode: { decision: "allow", kind: "definition-of-done" } } },
  // allow
  { name: "a plain command", evt: () => shell(P(), "ls -la"), expect: { claude: { decision: "allow", kind: null }, codex: { decision: "allow", kind: null }, opencode: { decision: "allow", kind: null } } },
  { name: "git status", evt: () => shell(P(), "git status"), expect: { claude: { decision: "allow", kind: null }, codex: { decision: "allow", kind: null }, opencode: { decision: "allow", kind: null } } },
  { name: "an ordinary edit", evt: () => editAt(P(), "src/utils/format.ts"), expect: { claude: { decision: "allow", kind: null }, codex: { decision: "allow", kind: null }, opencode: { decision: "allow", kind: null } } },
  { name: "a presentational sessions folder", evt: () => editAt(P(), "src/components/sessions/List.tsx"), expect: { claude: { decision: "allow", kind: null }, codex: { decision: "allow", kind: null }, opencode: { decision: "allow", kind: null } } },
  { name: "config exclude quiets an ambiguous word", evt: () => editAt(C(), "src/legacy/login/form.ts"), expect: { claude: { decision: "allow", kind: null }, codex: { decision: "allow", kind: null }, opencode: { decision: "allow", kind: null } } },
  { name: "Stop after a reviewed gate", evt: () => ({ event: "Stop", cwd: P(), session: "S-REVIEWED" }), env: () => ({ logDir: fx.stopLogs }), expect: { claude: { decision: "allow", kind: null }, codex: { decision: "allow", kind: null }, opencode: { decision: "allow", kind: null } } },
  { name: "Stop already continued once", evt: () => ({ event: "Stop", cwd: P(), session: "S-GATED", stopHookActive: true }), env: () => ({ logDir: fx.stopLogs }), expect: { claude: { decision: "allow", kind: null }, codex: { decision: "allow", kind: null }, opencode: { decision: "allow", kind: null } } },
  { name: "dispatching a subagent", evt: () => ({ event: "PreToolUse", tool: "Agent", toolInput: { subagent_type: "quinn" }, cwd: P(), session: "CORE" }), expect: { claude: { decision: "allow", kind: null }, codex: { decision: "allow", kind: null }, opencode: { decision: "allow", kind: null } } },
  { name: "PostToolUse never gates", evt: () => ({ ...editAt(P(), "src/auth/session.ts"), event: "PostToolUse" }), expect: { claude: { decision: "allow", kind: null }, codex: { decision: "allow", kind: null }, opencode: { decision: "allow", kind: null } } },
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

// ---- 10. ASK ONCE ----
// test/canonkit-hook.test.js covers the behaviour through the real process. What
// only the core can show is here: the lookup's own failure, the exact answer, and
// who a repeat's gate line is attributed to. evaluate() fails open, so a throw in
// that lookup reaching its catch would silently open the gate.
describe("ask once: the core", () => {
  const FILE = "src/auth/session.ts";
  let logDir;
  const asEvent = (rel, extra = {}) => ({ ...editAt(fx.plain, rel), session: "ONCE", toolUseId: "toolu_next", ...extra });
  const paired = (file, id = "toolu_first", session = "ONCE") =>
    JSON.stringify({ ts: 1, session, event: "gate", kind: "high-risk-surface", file, rule: "auth", tool_use_id: id }) + "\n" +
    JSON.stringify({ ts: 2, session, event: "edit_complete", tool_use_id: id, file, rule: "auth" }) + "\n";

  before(async () => {
    logDir = path.join(ROOT, "once-logs");
    await mkdir(logDir);
    await writeFile(path.join(logDir, "events.jsonl"), paired(`${fx.plain.replace(/\\/g, "/")}/${FILE}`));
  });

  test("a repeat answers with a plain allow and logs its gate", () => {
    const { result, touched } = sealed(() => evaluate(asEvent(FILE), envFor(fx.plain, { logDir })));
    assert.deepEqual(touched, []);
    assert.deepEqual({ decision: result.decision, kind: result.kind, reason: result.reason }, { decision: "allow", kind: null, reason: "" });
    const first = evaluate({ ...asEvent(FILE), session: "NOT-A-REPEAT" }, envFor(fx.plain, { logDir }));
    assert.deepEqual(result.unlogged, { decision: "ask", kind: "high-risk-surface", reason: first.reason }, "the ask an adapter falls back to");
    assert.equal(first.unlogged, undefined, "only a repeat carries it");
    const [line, ...rest] = result.logs;
    assert.deepEqual(rest, []);
    assert.equal(line.file, "events.jsonl");
    assert.deepEqual(
      { kind: line.record.kind, repeat: line.record.repeat, id: line.record.tool_use_id, rule: line.record.rule, in_project: line.record.in_project },
      { kind: "high-risk-surface", repeat: true, id: "toolu_next", rule: "auth", in_project: true });
  });

  test("a subagent's repeat keeps agent_id and agent_type on the gate", () => {
    const evt = asEvent(FILE, { agentId: "a7", agentType: "bob" });
    const [{ record }] = evaluate(evt, envFor(fx.plain, { logDir })).logs;
    assert.deepEqual({ agent_id: record.agent_id, agent_type: record.agent_type, repeat: record.repeat }, { agent_id: "a7", agent_type: "bob", repeat: true });
  });

  test("a repeat that is a reviewer's probe outside the project does not hold the Stop", async () => {
    const dir = path.join(ROOT, "once-probe");
    await mkdir(dir);
    const outside = path.join(ROOT, "scratch-probe");
    await mkdir(outside);
    const file = `${outside.replace(/\\/g, "/")}/${FILE}`;
    await writeFile(path.join(dir, "events.jsonl"), paired(file, "toolu_probe", "PROBE").replace(/"session":"PROBE"/g, '"session":"PROBE","agent_id":"a1","agent_type":"quinn","in_project":false'));
    const evt = {
      event: "PreToolUse", tool: "Edit", toolInput: { file_path: file, new_string: "x" }, cwd: outside,
      session: "PROBE", toolUseId: "toolu_again", agentId: "a1", agentType: "quinn",
    };
    const env = envFor(fx.plain, { logDir: dir });
    const { decision, logs } = evaluate(evt, env);
    assert.equal(decision, "allow");
    assert.deepEqual([logs[0].record.repeat, logs[0].record.in_project], [true, false]);
    await writeFile(path.join(dir, "events.jsonl"), JSON.stringify(logs[0].record) + "\n");
    assert.equal(evaluate({ event: "Stop", cwd: fx.plain, session: "PROBE" }, env).decision, "allow");
  });

  // The fault lands inside the lookup, after the verdict and past every earlier
  // read of env: only readEvents touches these two keys on this path.
  for (const key of ["logDir", "legacyLogDir"]) {
    test(`a throw reading the events (env.${key}) asks, and does not fall through to the fail-open allow`, () => {
      const env = envFor(fx.plain, { logDir });
      Object.defineProperty(env, key, { get() { throw new Error("log unreadable"); } });
      const { result, touched } = sealed(() => evaluate(asEvent(FILE), env));
      assert.deepEqual(touched, []);
      assert.deepEqual({ decision: result.decision, kind: result.kind }, { decision: "ask", kind: "high-risk-surface" });
      assert.deepEqual(result.logs.map((l) => [l.record.kind, l.record.repeat]), [["high-risk-surface", undefined]]);
    });
  }

  test("a relative path with an empty cwd has no key: asks", () => {
    const evt = { event: "PreToolUse", tool: "Edit", toolInput: { file_path: FILE, new_string: "x" }, cwd: "", session: "EMPTY-CWD", toolUseId: "toolu_x" };
    const dir = path.join(ROOT, "once-no-cwd");
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, "events.jsonl"), paired(FILE, "toolu_first", "EMPTY-CWD"));
    assert.equal(evaluate(evt, { ...envFor(undefined), logDir: dir }).decision, "ask");
    const absolute = `${fx.plain.replace(/\\/g, "/")}/${FILE}`;
    fs.writeFileSync(path.join(dir, "events.jsonl"), paired(absolute, "toolu_first", "EMPTY-CWD"));
    assert.equal(
      evaluate({ ...evt, toolInput: { file_path: absolute, new_string: "x" } }, { ...envFor(undefined), logDir: dir }).decision,
      "allow", "control: an absolute path needs no cwd");
  });

  test("no log directory at all (what Codex and OpenCode pass) always asks", () => {
    for (const env of [{ logDir: null, home: ROOT }, envFor(fx.plain, { logDir: null, legacyLogDir: undefined })]) {
      assert.equal(evaluate(asEvent(FILE), env).decision, "ask");
    }
  });

  test("PostToolUse: a completion only, and an error in it costs nothing but the record", () => {
    const done = { filePath: FILE, newString: "x", structuredPatch: [] };
    const post = { ...asEvent(FILE), event: "PostToolUse", toolResponse: done };
    const ok = evaluate(post, envFor(fx.plain, { logDir }));
    assert.deepEqual({ decision: ok.decision, kind: ok.kind }, { decision: "allow", kind: null });
    assert.deepEqual(ok.logs.map((l) => [l.file, l.record.event, l.record.tool_use_id]), [["events.jsonl", "edit_complete", "toolu_next"]]);
    // A response that throws when read costs the record and nothing else.
    const bad = evaluate({ ...post, toolResponse: { ...done, get error() { throw new Error("boom"); } } }, envFor(fx.plain, { logDir }));
    assert.deepEqual({ decision: bad.decision, logs: bad.logs }, { decision: "allow", logs: [] });
  });
});

// ---- 11. A QUOTED ARROW IS NOT A REDIRECT ----
describe("an arrow inside a quoted string is not a redirect", () => {
  const JS = "list.filter(e=>e.env)";
  const quiet = [
    // inline code, as in the session that found this
    [`node -e "${JS}"`, "Bash"],
    [`node -e '${JS}'`, "Bash"],
    [`node -p "${JS}"`, "Bash"],
    [`node -pe "${JS}"`, "Bash"],
    [`node --eval "${JS}"`, "Bash"],
    [`node --print '${JS}'`, "Bash"],
    [`node --eval="${JS}"`, "Bash"],
    [`node --input-type=module -e "${JS}"`, "Bash"],
    [`node -r ts-node/register -e "${JS}"`, "Bash"],
    [`nodejs -e "${JS}"`, "Bash"],
    [`bun -e "${JS}"`, "Bash"],
    [`/usr/local/bin/node -e "${JS}"`, "Bash"],
    [`node -e "${JS}"`, "PowerShell"],
    [`& 'C:\\Program Files\\nodejs\\node.exe' -e "${JS}"`, "PowerShell"],
    // through wrappers and next to other commands
    [`timeout 5 node -e "${JS}"`, "Bash"],
    [`FOO=1 node -e "${JS}"`, "Bash"],
    [`git status && node -e "${JS}" | head -3`, "Bash"],
    // any quoted string, not one interpreter: the rule is about the quote
    ["ruby -e 'h = {a=>e.env}'", "Bash"],
    ["perl -e '%h = (a=>e.env)'", "Bash"],
    ['echo "a=>e.env"', "Bash"],
    ["echo 'it''s a=>e.env'", "PowerShell"],
    // a string this scan can follow: an escape, the other quote, a template in single quotes
    ['node -e "a(\\"x\\"); b(e=>e.env)"', "Bash"],
    ['node -e "a(`"x`"); b(e=>e.env)"', "PowerShell"],
    ['node -e "it\'s; b(e=>e.env)"', "Bash"],
    ["node -e 'b(e=>`${e.env}`)'", "Bash"],
  ];
  for (const [command, tool] of quiet) {
    test(`no gate: ${tool}: ${command}`, () => {
      const result = evaluate(shell(fx.plain, command, tool), envFor(fx.plain));
      assert.deepEqual({ decision: result.decision, kind: result.kind, logs: result.logs }, { decision: "allow", kind: null, logs: [] });
    });
  }

  const gated = [
    // plain writes
    ["echo x > .env", "Bash"],
    ["echo x >> .env", "Bash"],
    ["foo=>.env", "Bash"],
    ["echo x | tee .env", "Bash"],
    ["echo x | tee -a .env", "Bash"],
    ["Set-Content config/.env x", "PowerShell"],
    // a shell's code is still shell
    ['bash -c "echo x > .env"', "Bash"],
    ["bash -c 'echo x > .env'", "Bash"],
    ['sh -c "echo x > .env"', "Bash"],
    ['zsh -c "echo x > .env"', "Bash"],
    ['eval "echo x > .env"', "Bash"],
    ['pwsh -Command "echo x > .env"', "PowerShell"],
    ['powershell -c "echo x > .env"', "PowerShell"],
    ["bash <<'EOF'\necho x > .env\nEOF", "Bash"],
    ["sh <<EOF\necho x > .env\nEOF", "Bash"],
    ["cat <<EOF | bash\necho x > .env\nEOF", "Bash"],
    // a real write next to interpreter code
    [`node -e "${JS}" > .env`, "Bash"],
    [`node -e '${JS}' > .env`, "Bash"],
    [`node -e '${JS}'>.env`, "Bash"],
    [`node -e "${JS}">>.env`, "Bash"],
    [`node --eval='${JS}'>.env`, "Bash"],
    [`node -e "${JS}" | tee .env`, "Bash"],
    [`node -e "${JS}"; echo y > ".env"`, "Bash"],
    [`echo y > '.env'; node -e "${JS}"`, "Bash"],
    [`bash -c "echo y > .env"; node -e "${JS}"`, "Bash"],
    [`node -e "${JS}" && echo y > .env`, "Bash"],
    [`node -e "${JS}"; echo y > .env`, "Bash"],
    [`node -e "${JS}"\necho y > .env`, "Bash"],
    [`node -e "${JS}" # note\necho y > .env`, "Bash"],
    ["node <<'EOF' > .env\nlist.filter(e=>e.env)\nEOF", "Bash"],
    ["node <<'EOF'\nlist.filter(e=>e.env)\nEOF\necho y > .env", "Bash"],
    ["@'\nx\n'@ | node - > .env", "PowerShell"],
    // the shell acts on these before the interpreter starts
    ["node -e a=>.env", "Bash"],
    ['node -e "$(echo x > .env)"', "Bash"],
    ['node -e "`echo x > .env`"', "Bash"],
    ['node -e "$(echo x > .env)"', "PowerShell"],
    ["node <<EOF\n$(echo x > .env)\nEOF", "Bash"],
    ["node <<EOF\n`echo x > .env`\nEOF", "Bash"],
    ["@\"\n$(echo x > .env)\n\"@ | node -", "PowerShell"],
    ["node -e @\"\n$(echo x > .env)\n\"@", "PowerShell"],
    ["@'\necho x > .env\n'@ | bash", "PowerShell"],
    // not an interpreter's code at all
    ['node script.js -e "x > .env"', "Bash"],
    ['echo "node -e " > .env; echo " x"', "Bash"],
    ["echo node -e ' ' > .env", "Bash"],
    ["node -e > .env 'x'", "Bash"],
    ["node -e 'unterminated > .env", "Bash"],
    // what the tokenizer joins and the shell does not
    ["ls # note \\\necho y > .env", "Bash"],
    ["node <<'EOF' \\\necho x > .env\nEOF", "Bash"],
    ["node <<EOF\n`\necho x > .env\n`\nEOF", "Bash"],
    // doubt the tokenizer does not share: the raw patterns must still read these
    ["<# c #> echo x > .env", "PowerShell"],
    ["echo $'a\\'b # ' > .env", "Bash"],
    ["node -e 'a <<X\nb' > .env", "Bash"],
    // an arrow the shell acts on, or one this scan cannot prove quoted
    [`echo "${JS}" foo=>.env`, "Bash"],
    ["echo 'a=>.env", "Bash"],
    ["echo \"a=>>.env\"", "Bash"],
    ['echo "a=>b>.env"', "Bash"],
    ['node -e "$(foo=>.env )"', "Bash"],
    ['node -e "`foo=>.env `"', "Bash"],
    ['echo "${x}" "a=>.env"', "Bash"],
    ["echo $'a\\'b' foo=>.env 'x'", "Bash"],
    ["# it's\necho foo=>.env 'x'", "Bash"],
    ["<# it's #> foo=>.env 'x'", "PowerShell"],
    ["cat <<EOF\nit's\nEOF\nfoo=>.env 'x'", "Bash"],
    ["@'\nit's\n'@ | foo=>.env 'x'", "PowerShell"],
    ["'a’ foo=>.env ‘x'", "PowerShell"],
    ['bash -c "foo=>.env"', "Bash"],
    ['eval "foo=>.env"', "Bash"],
    ['echo "foo=>.env" | sh', "Bash"],
    ['pwsh -c "foo=>.env"', "PowerShell"],
    // a backtick or a substitution outside any string: the scan loses the quotes from there
    ["echo `echo \\\\'`; echo hi=>.env; echo ''", "Bash"],
    ["echo $(echo \\\\'); echo hi=>.env; echo ''", "Bash"],
    ["echo $(x); echo 'a=>.env'", "Bash"],
    ["echo $(x); echo 'a=>.env'", "PowerShell"],
    // a quote that only looks closed
    ['echo "a=>.env\\"', "Bash"],
    // accepted and documented: code that is not an arrow may still false-gate
    ['python3 -c "a = b > .env"', "Bash"],
    ["node -e 'a > b.env'", "Bash"],
    ["node <<'EOF'\nlist.filter(e=>e.env)\nEOF", "Bash"],
    ["ls # then > .env", "Bash"],
  ];
  for (const [command, tool] of gated) {
    test(`gated: ${tool}: ${command}`, () => {
      const result = evaluate(shell(fx.plain, command, tool), envFor(fx.plain));
      assert.deepEqual({ decision: result.decision, kind: result.kind }, { decision: "ask", kind: "high-risk-surface" });
    });
  }

  test("a secret next to interpreter code still blocks", () => {
    const result = evaluate(shell(fx.plain, `node -e "${JS}" > .env # ${FAKE_AWS_KEY}`), envFor(fx.plain));
    assert.deepEqual({ decision: result.decision, kind: result.kind }, { decision: "deny", kind: "secret-block" });
  });

  test("a secret written from inside interpreter code blocks", () => {
    const command = `node -e "require('child_process').execSync('echo ${FAKE_AWS_KEY} > .env')"`;
    const result = evaluate(shell(fx.plain, command), envFor(fx.plain));
    assert.deepEqual({ decision: result.decision, kind: result.kind }, { decision: "deny", kind: "secret-block" });
  });

  // The arrow exception is for the path gates: a secret check reads every target.
  const SOFT = "password = 'hunter2hunter2'";
  for (const [name, command] of [
    ["beside an arrow in code", `node -e "[1].map(x=>require('fs').writeFileSync('k.txt','${FAKE_AWS_KEY}'))"`],
    ["in a shell line with an arrow", `node -e "execSync('echo ${FAKE_AWS_KEY}=>.env')"`],
  ]) {
    test(`a hard secret ${name} blocks`, () => {
      const result = evaluate(shell(fx.plain, command), envFor(fx.plain));
      assert.deepEqual({ decision: result.decision, kind: result.kind }, { decision: "deny", kind: "secret-block" });
    });
  }

  test("a soft secret beside a quoted arrow asks", () => {
    const result = evaluate(shell(fx.plain, `node -e "[1].map(x=>x); ${SOFT}"`), envFor(fx.plain));
    assert.deepEqual({ decision: result.decision, kind: result.kind }, { decision: "ask", kind: "secret-ask" });
  });

  test("a soft secret waived by a test target leaves the path gates reading every target", () => {
    const result = evaluate(shell(fx.plain, `node -e "${SOFT}; a=>fixtures/lighthouserc.json"`), envFor(fx.plain));
    assert.deepEqual({ decision: result.decision, kind: result.kind }, { decision: "ask", kind: "perf-budget" });
  });

  test("no secret beside the arrow, no gate: the exception stands", () => {
    const result = evaluate(shell(fx.plain, `node -e "${JS}; password = 1"`), envFor(fx.plain));
    assert.deepEqual({ decision: result.decision, kind: result.kind, logs: result.logs }, { decision: "allow", kind: null, logs: [] });
  });

  for (const [name, command] of [
    ["spaced", `node -e "${"a=>b ".repeat(20000)}"`],
    ["unbroken", `node -e "${"a=>b".repeat(20000)}"`],
    ["in many strings", `echo ${"'a=>b' ".repeat(20000)}`],
  ]) {
    test(`20,000 quoted arrows cost a pass, not a rescan: ${name}`, () => {
      const started = process.hrtime.bigint();
      const result = evaluate(shell(fx.plain, command), envFor(fx.plain));
      const ms = Number(process.hrtime.bigint() - started) / 1e6;
      assert.equal(result.decision, "allow");
      assert.ok(ms < 2000, `took ${ms}ms`);
    });
  }

  test("git gates see through nothing new: a commit message with an arrow, and a bypass after code", () => {
    assert.equal(evaluate(shell(fx.plain, `node -e "${JS}" && git commit -m "a=>b"`), envFor(fx.plain)).kind, "git");
    assert.equal(evaluate(shell(fx.plain, `node -e "${JS}" && git commit --no-verify -m x`), envFor(fx.plain)).kind, "git-bypass");
  });

  test("copy and move operands around interpreter code are still read", () => {
    assert.equal(evaluate(shell(fx.plain, `node -e "${JS}" && cp a.ts .env`), envFor(fx.plain)).kind, "high-risk-surface");
  });
});

// ---- 12. THE SESSION SCRATCHPAD ----
describe("the session scratchpad", () => {
  const LINK = process.platform === "win32" ? "junction" : "dir";
  const slash = (p) => p.replace(/\\/g, "/");
  let pad, proj, env;
  // Concatenated, not path.join: join would resolve the `..` under test.
  const inPad = (rel) => slash(pad) + "/" + rel;
  const edit = (file, content = "x", tool = "Edit") => ({
    event: "PreToolUse", tool, cwd: proj, session: "PAD",
    toolInput: tool === "Write" ? { file_path: file, content }
      : tool === "NotebookEdit" ? { notebook_path: file, new_source: content }
        : { file_path: file, new_string: content },
  });
  const sh = (command, tool = "Bash", cwd = proj) => ({ event: "PreToolUse", tool, toolInput: { command }, cwd, session: "PAD" });
  const outcome = (evt, dir, e = env) => {
    const r = evaluate(dir === undefined ? evt : { ...evt, scratchpadDir: dir }, e);
    return { decision: r.decision, kind: r.kind, lines: r.logs.length };
  };
  const QUIET = { decision: "allow", kind: null, lines: 0 };
  const CRED = 'password = "hunter2hunter2"';

  before(async () => {
    proj = path.join(ROOT, "pad-project");
    pad = path.join(ROOT, "pad-session", "scratchpad");
    await mkdir(path.join(proj, ".claude"), { recursive: true });
    await mkdir(pad, { recursive: true });
    env = envFor(proj);
  });

  const exempt = () => [
    ["high-risk-surface", edit(inPad(".env"))],
    ["high-risk-surface", edit(inPad("src/auth/session.ts"), "x", "Write")],
    ["high-risk-surface", edit(inPad("db/migrations/1.ipynb"), "x", "NotebookEdit")],
    ["perf-budget", edit(inPad("lighthouserc.json"))],
    ["secret-ask", edit(inPad("notes.ts"), CRED)],
    ["secret-ask", edit(inPad("notes.ts"), CRED, "Write")],
    ["secret-ask", edit(inPad("notes.ipynb"), CRED, "NotebookEdit")],
    ["high-risk-surface", sh(`echo x > ${inPad(".env")}`)],
    ["high-risk-surface", sh(`echo x | tee ${inPad(".env")}`)],
    ["high-risk-surface", sh(`cp a.ts ${inPad(".env")}`)],
    ["high-risk-surface", sh(`mv ${inPad(".env")} ${inPad("src/auth/x.ts")}`)],
    ["high-risk-surface", sh(`Set-Content ${inPad(".env")} x`, "PowerShell")],
    ["high-risk-surface", sh(`echo x > ${inPad(".env")} > ${inPad("src/auth/x.ts")}`)],
    ["perf-budget", sh(`echo x > ${inPad("lighthouserc.json")}`)],
  ];
  test("each file is a gate without the field and quiet with it", () => {
    for (const [kind, evt] of exempt()) {
      const label = JSON.stringify(evt.toolInput);
      assert.equal(outcome(evt).kind, kind, label);
      assert.deepEqual(outcome(evt, pad), QUIET, label);
    }
  });

  test("a shell keeps secret-ask inside it: the scan does not see every file a command writes", () => {
    const SHELL_CRED = `password='hunter2hunter2'`;
    for (const command of [
      `echo '${CRED}' > ${inPad("notes.ts")}`,
      `echo "${SHELL_CRED}" | tee ${inPad("a")} .env`,
      `curl -o .env -d "${SHELL_CRED}" x > ${inPad("log")}`,
    ]) assert.deepEqual(outcome(sh(command), pad), { decision: "ask", kind: "secret-ask", lines: 1 }, command);
    assert.deepEqual(outcome(sh(`Set-Content ${inPad("a.txt")} "${SHELL_CRED}"`, "PowerShell"), pad), { decision: "ask", kind: "secret-ask", lines: 1 });
  });

  test("a `..` segment earns nothing, even when it stays inside or goes through a link", () => {
    fs.mkdirSync(path.join(pad, "sub"), { recursive: true });
    fs.mkdirSync(path.join(proj, "deep"), { recursive: true });
    fs.symlinkSync(path.join(proj, "deep"), path.join(pad, "link"), LINK);
    for (const rel of ["sub/../.env", "link/../.env", "sub\\..\\.env", "../scratchpad/.env"]) {
      assert.equal(outcome(edit(inPad(rel)), pad).decision, "ask", rel);
      assert.equal(outcome(sh(`echo x > "${inPad(rel)}"`), pad).decision, "ask", rel);
    }
  });

  test("a folder inside the project or inside ~/.claude earns nothing", () => {
    const inProject = path.join(proj, "tmp", "pad");
    const inClaude = path.join(ROOT, ".claude", "pad");
    const link = path.join(ROOT, "pad-link-into-project");
    fs.mkdirSync(inProject, { recursive: true });
    fs.mkdirSync(inClaude, { recursive: true });
    fs.symlinkSync(inProject, link, LINK);
    for (const dir of [inProject, inClaude, link]) {
      assert.equal(outcome(edit(slash(dir) + "/.env"), dir).decision, "ask", dir);
      assert.equal(outcome(sh(`echo x > ${slash(dir)}/.env`), dir).decision, "ask", dir);
    }
    // Alongside them, under the same home, it still counts.
    const beside = path.join(ROOT, "pad-beside");
    fs.mkdirSync(beside, { recursive: true });
    assert.deepEqual(outcome(edit(slash(beside) + "/.env"), beside), QUIET);
  });

  test("Windows spells the same folder other ways", { skip: process.platform !== "win32" }, () => {
    const back = (p) => p.replace(/\//g, "\\");
    const git = (p) => slash(p).replace(/^([A-Za-z]):/, (_, d) => "/" + d.toLowerCase());
    assert.deepEqual(outcome(edit(back(inPad(".env"))), pad), QUIET);
    assert.deepEqual(outcome(edit(inPad(".env").toUpperCase()), pad), QUIET);
    assert.deepEqual(outcome(sh(`echo x > ${git(inPad(".env"))}`), pad), QUIET);
    assert.deepEqual(outcome(edit(inPad(".env")), git(pad)), QUIET);
  });

  const gated = () => [
    ["`..` out of the folder", edit(inPad("../.env"))],
    ["`..` out of the folder, shell", sh(`echo x > ${inPad("../.env")}`)],
    ["a sibling sharing the prefix", edit(slash(pad) + "-other/.env")],
    ["one real target among them", sh(`echo x > ${inPad("a.txt")} > .env`)],
    ["one real target after them", sh(`echo x > ${inPad("a.txt")}; echo y > src/auth/x.ts`)],
    ["a real source moved in", sh(`mv .env ${inPad("x.txt")}`)],
    ["a project file", edit(slash(proj) + "/.env")],
    ["a relative target", sh("echo x > .env")],
    ["a relative edit", edit(".env")],
    ["an unexpanded variable", sh("echo x > $TMPDIR/.env")],
    ["a braced variable", sh("echo x > ${TMPDIR}/.env")],
    ["a home tilde", sh("echo x > ~/.env")],
    ["a variable inside the folder", sh(`echo x > ${inPad("$X/../.env")}`)],
    ["a variable in the PowerShell env drive", sh(`Set-Content $env:TEMP\\.env.txt x`, "PowerShell")],
    ["a substitution inside the folder", sh(`echo x > ${inPad("`pwd`/.env")}`)],
  ];
  test("what is not proved inside still gates and logs", () => {
    for (const [label, evt] of gated()) {
      const r = outcome(evt, pad);
      assert.equal(r.decision, "ask", label);
      assert.ok(r.lines > 0, label);
    }
  });

  test("a relative path is not resolved against whatever the process runs in", () => {
    const was = process.cwd();
    process.chdir(pad);
    try {
      assert.equal(outcome(sh("echo x > .env"), pad).decision, "ask");
      assert.equal(outcome(edit(".env"), pad).decision, "ask");
    } finally { process.chdir(was); }
  });

  test("a cwd inside the folder does not make a relative target safe", () => {
    assert.equal(outcome(sh(`cd ${slash(proj)} && echo x > .env`, "Bash", pad), pad).decision, "ask");
    assert.equal(outcome(sh("echo x > .env", "Bash", pad), pad).decision, "ask");
  });

  test("secret-block and the git gates hold inside it, and run first", () => {
    assert.deepEqual(outcome(edit(inPad("a.ts"), FAKE_AWS_KEY), pad), { decision: "deny", kind: "secret-block", lines: 1 });
    assert.deepEqual(outcome(sh(`echo ${FAKE_AWS_KEY} > ${inPad("a.ts")}`), pad), { decision: "deny", kind: "secret-block", lines: 1 });
    assert.deepEqual(outcome(sh(`git commit -m x > ${inPad("a.log")}`), pad), { decision: "ask", kind: "git", lines: 1 });
    assert.deepEqual(outcome(sh(`git push > ${inPad("a.log")}`), pad), { decision: "ask", kind: "git", lines: 1 });
    assert.deepEqual(outcome(sh(`git commit --no-verify -m x > ${inPad("a.log")}`), pad), { decision: "deny", kind: "git-bypass", lines: 1 });
  });

  describe("a field that proves nothing is no exemption", () => {
    for (const bad of [undefined, "", 0, 7, null, true, {}, ["x"]]) {
      test(`value ${JSON.stringify(bad)}`, () => {
        const r = outcome(edit(inPad(".env")), bad);
        assert.deepEqual([r.decision, r.kind], ["ask", "high-risk-surface"]);
      });
    }
    test("relative", () => {
      const rel = path.relative(process.cwd(), pad);
      assert.equal(outcome(edit(inPad(".env")), rel).decision, "ask");
      assert.equal(outcome(edit(inPad(".env")), "./scratchpad").decision, "ask");
      assert.equal(outcome(edit(inPad(".env")), "scratchpad").decision, "ask");
    });
    test("a filesystem root", () => {
      const root = path.parse(pad).root;
      assert.equal(outcome(edit(slash(root) + ".env"), root).decision, "ask");
    });
    test("the home", () => {
      assert.equal(outcome(edit(slash(ROOT) + "/.env"), ROOT).decision, "ask");
    });
    test("a parent of the home", () => {
      const up = path.dirname(ROOT);
      assert.equal(outcome(edit(slash(up) + "/.env"), up).decision, "ask");
    });
    test("the home and a parent of it, with the project elsewhere", () => {
      const home = path.join(ROOT, "pad-homes", "user");
      const e = envFor(proj, { home });
      assert.equal(outcome(edit(slash(home) + "/.env"), home, e).decision, "ask");
      assert.equal(outcome(edit(slash(path.dirname(home)) + "/.env"), path.dirname(home), e).decision, "ask");
    });
    test("the root of a drive holding neither home nor project", { skip: process.platform !== "win32" }, () => {
      assert.equal(outcome(edit("Z:/.env"), "Z:\\").decision, "ask");
      assert.equal(outcome(edit("Z:/sub/.env"), "Z:/").decision, "ask");
    });
    test("the project, by env.projectDir and by cwd", () => {
      assert.equal(outcome(edit(slash(proj) + "/.env"), proj).decision, "ask");
      assert.equal(outcome(edit(slash(proj) + "/.env"), proj, envFor(undefined)).decision, "ask");
    });
    test("a parent of the project, with a home elsewhere", () => {
      const deep = path.join(pad, "workspace", "repo");
      const e = envFor(deep, { home: path.join(ROOT, "other-home") });
      assert.equal(outcome({ ...edit(inPad(".env")), cwd: deep }, pad, e).decision, "ask");
      assert.deepEqual(outcome({ ...edit(inPad(".env")), cwd: proj }, pad, envFor(proj, { home: path.join(ROOT, "other-home") })), QUIET);
    });
    test("no known home, or no project to measure against", () => {
      assert.equal(outcome(edit(inPad(".env")), pad, envFor(proj, { home: null })).decision, "ask");
      assert.equal(outcome({ ...edit(inPad(".env")), cwd: "" }, pad, envFor(undefined)).decision, "ask");
      assert.equal(outcome({ ...edit(inPad(".env")), cwd: "rel/dir" }, pad, envFor(undefined)).decision, "ask");
    });
    test("a link that is the project in disguise", () => {
      const link = path.join(ROOT, "pad-link-to-project");
      fs.symlinkSync(proj, link, LINK);
      assert.equal(outcome(edit(slash(link) + "/.env"), link).decision, "ask");
    });
    test("a throw while checking gates: evaluate()'s catch would have allowed", () => {
      const e = envFor(proj);
      let reads = 0;
      Object.defineProperty(e, "home", { get() { if (reads++ === 0) throw new Error("boom"); return ROOT; } });
      assert.deepEqual([outcome(edit(inPad(".env")), pad, e).decision], ["ask"]);
      reads = 0;
      assert.equal(outcome(sh(`echo x > ${inPad(".env")}`), pad, e).decision, "ask");
    });
  });

  describe("links out of the folder", () => {
    test("a directory link to the project", () => {
      fs.symlinkSync(proj, path.join(pad, "to-project"), LINK);
      assert.equal(outcome(edit(inPad("to-project/.env")), pad).decision, "ask");
      assert.equal(outcome(sh(`echo x > ${inPad("to-project/.env")}`), pad).decision, "ask");
    });
    test("a file link to a repo file", (t) => {
      const target = path.join(proj, "target.txt");
      fs.writeFileSync(target, "x");
      try { fs.symlinkSync(target, path.join(pad, ".env"), "file"); }
      catch { t.skip("this machine cannot create file symlinks"); return; }
      assert.equal(outcome(edit(inPad(".env")), pad).decision, "ask");
      assert.equal(outcome(sh(`echo x > ${inPad(".env")}`), pad).decision, "ask");
      fs.rmSync(path.join(pad, ".env"));
    });
    test("a dangling link, which a write would create", () => {
      fs.symlinkSync(path.join(proj, "missing"), path.join(pad, "gone"), LINK);
      assert.equal(outcome(edit(inPad("gone/.env")), pad).decision, "ask");
      assert.equal(outcome(edit(inPad("gone/deep/er/.env")), pad).decision, "ask");
    });
    test("a link within the folder stays inside", () => {
      fs.mkdirSync(path.join(pad, "real"));
      fs.symlinkSync(path.join(pad, "real"), path.join(pad, "alias"), LINK);
      assert.deepEqual(outcome(edit(inPad("alias/.env")), pad), QUIET);
    });
    test("the folder itself reached through a link", () => {
      const link = path.join(ROOT, "pad-alias");
      fs.symlinkSync(pad, link, LINK);
      assert.deepEqual(outcome(edit(inPad(".env")), link), QUIET);
      assert.deepEqual(outcome(edit(slash(link) + "/.env"), pad), QUIET);
    });
  });

  test("Codex and OpenCode do not carry it", () => {
    const codex = requireCjs(path.join(HOOKS_DIR, "canonkit-codex.js")).normalizeCodex(
      { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "x" }, cwd: proj, scratchpad_dir: pad }, proj);
    const opencode = requireCjs(path.join(HOOKS_DIR, "canonkit-opencode.js")).normalizeOpencode(
      { tool: "bash", input: { command: "x" }, sessionID: "s", id: "1", scratchpad_dir: pad }, proj, { shell: "bash" });
    assert.ok(codex.length && opencode.length);
    for (const evt of [...codex, ...opencode]) assert.equal("scratchpadDir" in evt, false);
  });
});

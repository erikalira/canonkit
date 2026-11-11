import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, chmod } from "node:fs/promises";
import { readFileSync, realpathSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { ADAPTERS, discover, parseClaudeHelp, parseCodexModels, readCatalog, writeCatalog, refreshCatalog, systemRunner, trustedRunner, claudeModelPolicy, applyClaudePolicy } from "../bin/model-discovery.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HELP = readFileSync(path.join(REPO, "test", "fixtures", "claude", "help-2.1.322.txt"), "utf8");
const NOW = new Date("2026-11-10T12:00:00.000Z");

/** A runner stub that answers per "name arg" and records every call. */
function stub(answers) {
  const calls = [];
  const run = (name, args) => {
    calls.push([name, ...args].join(" "));
    return answers[[name, ...args].join(" ")] ?? { status: null, stdout: "", stderr: "", error: `${name} not found on PATH` };
  };
  return { run, calls };
}

const ok = (stdout) => ({ status: 0, stdout, stderr: "", error: null });
const claudeOk = () => stub({ "claude --version": ok("2.1.322 (Claude Code)\n"), "claude --help": ok(HELP) });
const CODEX = JSON.stringify({ models: [
  { slug: "gpt-6-luna", visibility: "list", default_reasoning_level: "medium", supported_reasoning_levels: [{ effort: "low" }, { effort: "medium" }], model_messages: "PRIVATE LONG TEXT" },
  { slug: "gpt-6-astra", visibility: "list", supported_reasoning_levels: [{ effort: "low" }, { effort: "ultra" }] },
  { slug: "legacy-hidden", visibility: "hide", supported_reasoning_levels: [{ effort: "high" }] },
] });
const codexOk = () => stub({ "codex --version": ok("codex-cli 0.166.0\n"), "codex debug models": ok(CODEX) });

async function tempDir() {
  return realpathSync.native(await mkdtemp(path.join(os.tmpdir(), "canonkit-models-")));
}

describe("claude adapter", () => {
  test("reads aliases and efforts from the captured help text", () => {
    const { run, calls } = claudeOk();
    assert.deepEqual(ADAPTERS.claude.discover(run, { policy: () => null }), {
      status: "discovered",
      // The help quotes three examples; haiku comes from the documented aliases.
      models: ["fable", "opus", "sonnet", "haiku"].map((id) => ({ id, efforts: ["low", "medium", "high", "xhigh", "max"] })),
      harnessVersion: "2.1.322",
      source: "claude --help + documented aliases",
      confidence: "help-text",
    });
    assert.deepEqual(calls, ["claude --version", "claude --help"]);
  });

  test("a CRLF help text parses the same", () => {
    assert.deepEqual(parseClaudeHelp(HELP.replace(/\n/g, "\r\n")), parseClaudeHelp(HELP));
  });

  test("altered help text yields unknown with a reason, never a crash", () => {
    const cases = [
      [HELP.replace(/--model <model>/, "--llm <name>"), /no --model option/],
      [HELP.replace(/--effort <level>/, "--thinking <level>"), /no --effort option/],
      [HELP.replace(/'fable', 'opus', or 'sonnet'/, "an alias"), /names no model aliases/],
      [HELP.replace(/\(low, medium, high, xhigh, max\)/, "(see docs)"), /lists no effort levels/],
      ["", /no --model option/],
    ];
    for (const [text, reason] of cases) {
      const result = parseClaudeHelp(text);
      assert.equal(result.status, "unknown");
      assert.match(result.reason, reason);
    }
  });

  test("strings that are not plain tokens are not recorded as models", () => {
    const text = HELP.replace(/'fable', 'opus', or 'sonnet'/, "'opus', 'a b', or '$(rm -rf)'");
    assert.deepEqual(parseClaudeHelp(text).models.map((m) => m.id), ["opus"]);
  });

  test("timeout, non-zero exit and missing binary each end at unknown with the reason", () => {
    const timeout = stub({ "claude --version": { status: null, stdout: "", stderr: "", error: "timed out after 30s" } });
    assert.deepEqual(ADAPTERS.claude.discover(timeout.run), { status: "unknown", reason: "claude --version: timed out after 30s" });
    const failing = stub({ "claude --version": ok("2.1.322\n"), "claude --help": { status: 2, stdout: "", stderr: "boom", error: null } });
    assert.deepEqual(ADAPTERS.claude.discover(failing.run), { status: "unknown", reason: "claude --help exited with status 2" });
    assert.deepEqual(ADAPTERS.claude.discover(stub({}).run), { status: "unknown", reason: "claude --version: claude not found on PATH" });
  });
});

describe("codex adapter", () => {
  test("keeps only visible model IDs and their own efforts, never model messages", () => {
    const { run, calls } = codexOk();
    const result = ADAPTERS.codex.discover(run);
    assert.deepEqual(result, { status: "discovered", models: [
      { id: "gpt-6-luna", efforts: ["low", "medium"] },
      { id: "gpt-6-astra", efforts: ["low", "ultra"] },
    ], source: "codex debug models", confidence: "experimental-debug", accountAvailability: "unconfirmed", harnessVersion: "0.166.0" });
    assert.ok(!JSON.stringify(result).includes("PRIVATE LONG TEXT"));
    assert.deepEqual(calls, ["codex --version", "codex debug models"]);
  });
  test("malformed, missing and failed catalogs become unknown without leaking output", () => {
    for (const raw of ["not JSON PRIVATE", "{}", JSON.stringify({ models: [{ slug: "ok", visibility: "list", supported_reasoning_levels: [{ effort: "bad effort" }] }] })]) {
      const result = parseCodexModels(raw);
      assert.equal(result.status, "unknown");
      assert.ok(!JSON.stringify(result).includes("PRIVATE"));
    }
    const failed = stub({ "codex --version": ok("codex-cli 0.166.0"), "codex debug models": { status: 2, stdout: "SECRET", stderr: "SECRET", error: null } });
    assert.deepEqual(ADAPTERS.codex.discover(failed.run), { status: "unknown", reason: "codex debug models exited with status 2" });
    const timeout = stub({ "codex --version": ok("codex-cli 0.166.0"), "codex debug models": { status: null, stdout: "", stderr: "", error: "timed out after 30s" } });
    assert.match(ADAPTERS.codex.discover(timeout.run).reason, /timed out/);
    assert.match(ADAPTERS.codex.discover(stub({}).run).reason, /not found/);
  });
});

describe("unsupported harnesses", () => {
  test("opencode and copilot are unknown without starting a process", () => {
    const { run, calls } = stub({});
    for (const name of ["opencode", "copilot"]) {
      assert.deepEqual(ADAPTERS[name].discover(run), { status: "unknown", reason: "not yet supported" });
    }
    assert.deepEqual(calls, []);
  });
});

describe("discover and the catalog", () => {
  test("records each harness with the discovery time; an adapter that throws is unknown", () => {
    const { run } = claudeOk();
    const out = discover(["claude", "codex", "nonesuch"], { run, now: NOW, policy: () => null });
    assert.equal(out.claude.status, "discovered");
    assert.equal(out.claude.discoveredAt, NOW.toISOString());
    assert.equal(out.codex.status, "unknown");
    assert.match(out.codex.reason, /not found/);
    assert.equal(out.nonesuch.reason, "no adapter");
    const thrown = discover(["claude"], { run: () => { throw new Error("spawn EPERM"); }, now: NOW });
    assert.deepEqual(thrown.claude, { status: "unknown", reason: "discovery failed: spawn EPERM", discoveredAt: NOW.toISOString() });
  });

  test("refresh writes version 1 and keeps harnesses it did not ask this time", async () => {
    const dir = await tempDir();
    try {
      const file = path.join(dir, ".canonkit", "model-catalog.json");
      await refreshCatalog(["claude", "codex", "opencode", "copilot"], { run: claudeOk().run, now: NOW, file, policy: () => null });
      const later = new Date("2026-11-11T12:00:00.000Z");
      await refreshCatalog(["claude"], { run: stub({}).run, now: later, file });
      const data = JSON.parse(await readFile(file, "utf8"));
      assert.equal(data.version, 1);
      assert.equal(data.harnesses.claude.status, "unknown");
      assert.equal(data.harnesses.claude.discoveredAt, later.toISOString());
      assert.equal(data.harnesses.codex.discoveredAt, NOW.toISOString());
      assert.deepEqual(await readCatalog(file), data);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("a recent, identical record is kept as is when asked, so a reinstall rewrites nothing", async () => {
    const dir = await tempDir();
    try {
      const file = path.join(dir, "model-catalog.json");
      await refreshCatalog(["claude", "codex"], { run: claudeOk().run, now: NOW, file, policy: () => null });
      const before = await readFile(file, "utf8");
      const soon = new Date(NOW.getTime() + 60_000);
      await refreshCatalog(["claude", "codex"], { run: claudeOk().run, now: soon, file, keepWithin: 86_400_000, policy: () => null });
      assert.equal(await readFile(file, "utf8"), before, "unchanged within the window");
      await refreshCatalog(["claude"], { run: stub({}).run, now: soon, file, keepWithin: 86_400_000 });
      assert.equal((await readCatalog(file)).harnesses.claude.status, "unknown", "a changed answer is written");
      const late = new Date(NOW.getTime() + 2 * 86_400_000);
      await refreshCatalog(["codex"], { run: stub({}).run, now: late, file, keepWithin: 86_400_000 });
      assert.equal((await readCatalog(file)).harnesses.codex.discoveredAt, late.toISOString(), "an old record is refreshed");
      await refreshCatalog(["codex"], { run: stub({}).run, now: new Date(late.getTime() + 1000), file });
      assert.notEqual((await readCatalog(file)).harnesses.codex.discoveredAt, late.toISOString(), "models refresh always writes");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("a missing catalog reads as null; an untrusted one throws and is replaced on write", async () => {
    const dir = await tempDir();
    try {
      const file = path.join(dir, "model-catalog.json");
      assert.equal(await readCatalog(file), null);
      await writeFile(file, "{not json");
      await assert.rejects(readCatalog(file), /not valid JSON; run canonkit models refresh/);
      await writeFile(file, JSON.stringify({ version: 9, harnesses: {} }));
      await assert.rejects(readCatalog(file), /unsupported format \(version 9\)/);
      await writeCatalog({ codex: { status: "unknown", reason: "not yet supported" } }, file);
      assert.deepEqual(Object.keys((await readCatalog(file)).harnesses), ["codex"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("system runner", () => {
  test("a binary missing from PATH is reported, not thrown", () => {
    const run = systemRunner({ env: { ...process.env, PATH: path.join(os.tmpdir(), "canonkit-no-such-dir"), Path: undefined } });
    assert.deepEqual(run("claude", ["--version"]), { status: null, stdout: "", stderr: "", error: "claude not found on PATH" });
  });

  // A `claude` that records it ran, and what NODE_OPTIONS it saw.
  async function fakeClaude(bin, marker) {
    await mkdir(bin, { recursive: true });
    const js = path.join(bin, "claude-fake.cjs");
    await writeFile(js, `require("fs").writeFileSync(${JSON.stringify(marker)}, String(process.env.NODE_OPTIONS ?? "unset"));\nprocess.stdout.write(process.argv[2] === "--version" ? "2.1.322\\n" : ${JSON.stringify(HELP)});\n`);
    if (process.platform === "win32") await writeFile(path.join(bin, "claude.cmd"), `@"${process.execPath}" "${js}" %*\r\n`);
    else {
      await writeFile(path.join(bin, "claude"), `#!/bin/sh\nexec "${process.execPath}" "${js}" "$@"\n`);
      await chmod(path.join(bin, "claude"), 0o755);
    }
  }
  const onlyPath = (dirs) => {
    const env = { ...process.env };
    for (const k of Object.keys(env)) if (k.toUpperCase() === "PATH") delete env[k];
    env.PATH = dirs.join(path.delimiter);
    return env;
  };

  test("from a repository subfolder, a claude planted anywhere in the repository is never run", async () => {
    const dir = await tempDir();
    try {
      const repo = path.join(dir, "repo");
      const nested = path.join(repo, "nested");
      await mkdir(path.join(repo, ".git"), { recursive: true });
      await writeFile(path.join(repo, ".git", "HEAD"), "ref: refs/heads/main\n");
      await mkdir(nested, { recursive: true });
      const marker = path.join(dir, "PLANTED_RAN");
      await fakeClaude(path.join(repo, "node_modules", ".bin"), marker);
      const env = onlyPath([path.join(repo, "node_modules", ".bin")]);
      const result = ADAPTERS.claude.discover(await trustedRunner(nested, { env }));
      assert.equal(result.status, "unknown");
      assert.match(result.reason, /not found on PATH/);
      assert.equal(existsSync(marker), false, "the planted claude ran");
      // Filtering against the subfolder alone is what let it run before.
      assert.equal(ADAPTERS.claude.discover(systemRunner({ env, root: nested })).status, "discovered");
      assert.equal(existsSync(marker), true, "control: the subfolder filter does reach it");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("the probe does not inherit interpreter loader variables", async () => {
    const dir = await tempDir();
    try {
      const marker = path.join(dir, "seen");
      await fakeClaude(path.join(dir, "bin"), marker);
      const env = { ...onlyPath([path.join(dir, "bin")]), NODE_OPTIONS: "--require=/nonexistent/evil.js" };
      const result = systemRunner({ env, root: REPO })("claude", ["--version"]);
      assert.equal(result.status, 0, JSON.stringify(result));
      assert.equal(readFileSync(marker, "utf8"), "unset");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("runs a real claude on PATH with no shell and parses its help", async () => {
    const dir = await tempDir();
    try {
      const bin = path.join(dir, "bin");
      await mkdir(bin);
      const js = path.join(bin, "claude-fake.cjs");
      await writeFile(js, `const a = process.argv[2];\nprocess.stdout.write(a === "--version" ? "2.1.322 (Claude Code)\\n" : ${JSON.stringify(HELP)});\n`);
      if (process.platform === "win32") {
        await writeFile(path.join(bin, "claude.cmd"), `@"${process.execPath}" "${js}" %*\r\n`);
      } else {
        await writeFile(path.join(bin, "claude"), `#!/bin/sh\nexec "${process.execPath}" "${js}" "$@"\n`);
        await chmod(path.join(bin, "claude"), 0o755);
      }
      const env = { ...process.env, PATH: bin };
      if (process.platform === "win32") for (const k of Object.keys(env)) if (k !== "PATH" && k.toUpperCase() === "PATH") delete env[k];
      const result = ADAPTERS.claude.discover(systemRunner({ env, root: REPO }));
      assert.equal(result.status, "discovered", result.reason);
      assert.equal(result.harnessVersion, "2.1.322");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("claude availableModels", () => {
  const E = ["low", "medium", "high", "xhigh", "max"];
  const ALIASES = ["fable", "opus", "sonnet", "haiku"];
  const ids = (models) => models.map((m) => m.id);

  test("no policy offers every alias; a policy keeps named aliases, families of named versions, and the versions", () => {
    assert.deepEqual(ids(applyClaudePolicy(ALIASES, E, null)), ALIASES);
    assert.deepEqual(ids(applyClaudePolicy(ALIASES, E, { models: ["sonnet", "haiku"] })), ["sonnet", "haiku"]);
    assert.deepEqual(ids(applyClaudePolicy(ALIASES, E, { models: ["sonnet", "claude-opus-5-2"] })), ["opus", "sonnet", "claude-opus-5-2"]);
    assert.deepEqual(ids(applyClaudePolicy(ALIASES, E, { models: ["sonnet[1m]"] })), ["sonnet[1m]"]);
  });

  test("managed settings (file, then drop-ins in order) replace the user's list", async () => {
    const root = realpathSync.native(await mkdtemp(path.join(os.tmpdir(), "canonkit-policy-")));
    try {
      const home = path.join(root, "home");
      const managed = path.join(root, "managed");
      const put = async (file, data) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, typeof data === "string" ? data : JSON.stringify(data)); };
      assert.equal(claudeModelPolicy({ home, managed, configDir: null }), null);
      await put(path.join(home, ".claude", "settings.json"), { env: { SECRET: "x" }, availableModels: ["sonnet", "bad name!"] });
      // Only valid names are kept, and nothing else from the file.
      assert.deepEqual(claudeModelPolicy({ home, managed, configDir: null }), { models: ["sonnet"], source: "user settings" });
      await put(path.join(managed, "managed-settings.json"), { availableModels: ["opus"] });
      await put(path.join(managed, "managed-settings.d", "20-team.json"), { availableModels: ["haiku"] });
      await put(path.join(managed, "managed-settings.d", "10-base.json"), { other: true });
      await put(path.join(managed, "managed-settings.d", "30-broken.json"), "{ not json");
      assert.deepEqual(claudeModelPolicy({ home, managed, configDir: null }), { models: ["haiku"], source: "managed settings" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("user settings follow CLAUDE_CONFIG_DIR and reject relative overrides", async () => {
    const root = realpathSync.native(await mkdtemp(path.join(os.tmpdir(), "canonkit-policy-config-")));
    try {
      const home = path.join(root, "home");
      const configDir = path.join(root, "claude-config");
      const managed = path.join(root, "managed");
      const put = async (file, data) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, JSON.stringify(data)); };
      await put(path.join(home, ".claude", "settings.json"), { availableModels: ["opus"] });
      await put(path.join(configDir, "settings.json"), { availableModels: ["sonnet"] });

      const previousConfigDir = process.env.CLAUDE_CONFIG_DIR;
      try {
        process.env.CLAUDE_CONFIG_DIR = configDir;
        assert.deepEqual(claudeModelPolicy({ home, managed }), { models: ["sonnet"], source: "user settings" });
        process.env.CLAUDE_CONFIG_DIR = "relative-config";
        assert.throws(() => claudeModelPolicy({ home, managed }), /CLAUDE_CONFIG_DIR must be an absolute directory/);
      } finally {
        if (previousConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR;
        else process.env.CLAUDE_CONFIG_DIR = previousConfigDir;
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("discovery records the narrowed list and says why; a policy permitting nothing is unknown", () => {
    const { run } = claudeOk();
    const narrowed = ADAPTERS.claude.discover(run, { policy: () => ({ models: ["sonnet"], source: "user settings" }) });
    assert.deepEqual(ids(narrowed.models), ["sonnet"]);
    assert.match(narrowed.source, /narrowed by availableModels \(user settings\)/);
    assert.deepEqual(ADAPTERS.claude.discover(run, { policy: () => ({ models: [], source: "managed settings" }) }), {
      status: "unknown", reason: "availableModels in managed settings permits none of the known aliases",
    });
  });
});

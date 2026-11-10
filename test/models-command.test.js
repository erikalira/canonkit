import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, chmod } from "node:fs/promises";
import { readFileSync, realpathSync, existsSync } from "node:fs";
import { PassThrough, Writable } from "node:stream";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { show, refresh, setup, modelDiagnosis } from "../bin/models-command.js";
import { readAgents } from "../bin/cli.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(REPO, "bin", "cli.js");
const HELP = readFileSync(path.join(REPO, "test", "fixtures", "claude", "help-2.1.322.txt"), "utf8");
const NOW = new Date("2026-11-10T12:00:00.000Z");
const agents = await readAgents();

const ok = (stdout) => ({ status: 0, stdout, stderr: "", error: null });
function claudeRunner() {
  const calls = [];
  const run = (name, args) => {
    calls.push([name, ...args].join(" "));
    if (name !== "claude") return { status: null, stdout: "", stderr: "", error: `${name} not found on PATH` };
    return args[0] === "--version" ? ok("2.1.322 (Claude Code)\n") : ok(HELP);
  };
  return { run, calls };
}

function capture() {
  const lines = [];
  return { ctx: { dryRun: false, log: (m) => lines.push(m ?? "") }, lines, text: () => lines.join("\n") };
}

async function scratch() {
  const root = realpathSync.native(await mkdtemp(path.join(os.tmpdir(), "canonkit-models-cmd-")));
  const home = path.join(root, "home");
  const project = path.join(root, "work", "app");
  await mkdir(home, { recursive: true });
  await mkdir(project, { recursive: true });
  return { root, home, project, cleanup: () => rm(root, { recursive: true, force: true }) };
}

/** Scripted stdin: each answer is one line; the stream ends after the last. */
function scripted(answers) {
  const input = new PassThrough();
  input.end(answers.map((a) => `${a}\n`).join(""));
  let out = "";
  const output = new Writable({ write(chunk, _enc, cb) { out += chunk; cb(); } });
  return { input, output, out: () => out };
}

const writeJson = async (file, data) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data));
};

describe("models refresh", () => {
  test("writes the catalog with Claude Code discovered and the others unknown", async () => {
    const s = await scratch();
    try {
      const { ctx, text } = capture();
      const { run, calls } = claudeRunner();
      assert.equal(await refresh(ctx, { run, now: NOW, home: s.home }), 0);
      const data = JSON.parse(await readFile(path.join(s.home, ".canonkit", "model-catalog.json"), "utf8"));
      assert.equal(data.harnesses.claude.status, "discovered");
      for (const h of ["codex", "opencode", "copilot"]) assert.deepEqual([data.harnesses[h].status, data.harnesses[h].reason], ["unknown", "not yet supported"]);
      assert.deepEqual(calls, ["claude --version", "claude --help"]);
      assert.match(text(), /Claude Code: fable, opus, sonnet; efforts low, medium, high, xhigh, max/);
      assert.match(text(), /Codex: unknown — not yet supported; its agents inherit the session model/);
    } finally {
      await s.cleanup();
    }
  });

  test("a dry run starts nothing and writes nothing", async () => {
    const s = await scratch();
    try {
      const { ctx, text } = capture();
      ctx.dryRun = true;
      const { run, calls } = claudeRunner();
      await refresh(ctx, { run, home: s.home });
      assert.deepEqual(calls, []);
      assert.equal(existsSync(path.join(s.home, ".canonkit")), false);
      assert.match(text(), /would run model discovery for: claude, codex, opencode, copilot/);
    } finally {
      await s.cleanup();
    }
  });
});

describe("models show", () => {
  test("text and JSON carry value and source per agent, agent overrides labelled", async () => {
    const s = await scratch();
    try {
      await writeJson(path.join(s.home, ".canonkit", "models.json"), { version: 1, harnesses: { claude: {
        levels: { standard: { model: "sonnet", effort: "medium" }, deep: { model: "opus", effort: "high" } },
        agents: { quinn: { effort: "xhigh" } },
      } } });
      await writeJson(path.join(s.project, ".canonkit", "models.json"), { version: 1, harnesses: { claude: { levels: { deep: { model: "fable" } } } } });

      const outside = capture();
      await show(outside.ctx, agents, { json: true, home: s.home, cwd: s.home });
      const o = JSON.parse(outside.text());
      assert.equal(o.project, null);
      assert.equal(o.version, 1);
      assert.deepEqual(o.harnesses.claude.agents.archie, { need: "deep", model: { value: "opus", source: "user level", unverified: false, alias: true }, effort: { value: "high", source: "user level", unverified: false } });
      assert.deepEqual(o.harnesses.claude.agents.quinn.effort, { value: "xhigh", source: "user agent override", unverified: false });
      assert.deepEqual(o.harnesses.codex.agents.archie.model, { value: null, source: "inherit", unverified: false, alias: null });
      assert.equal(o.harnesses.codex.applied, false);
      assert.deepEqual(o.harnesses.claude.catalog, { status: "missing" });

      const inside = capture();
      await show(inside.ctx, agents, { json: true, home: s.home, cwd: path.join(s.project) });
      const i = JSON.parse(inside.text());
      assert.equal(i.project, s.project);
      assert.deepEqual(i.harnesses.claude.agents.archie.model, { value: "fable", source: "project level", unverified: false, alias: true });
      assert.deepEqual(i.harnesses.claude.agents.archie.effort, { value: "high", source: "user level", unverified: false });

      const text = capture();
      await show(text.ctx, agents, { home: s.home, cwd: s.project, harnesses: ["claude", "codex"] });
      assert.match(text.text(), /quinn\s+standard\s+model: sonnet \(user level\)\s+effort: xhigh \(user agent override\)/);
      assert.match(text.text(), /archie\s+deep\s+model: fable \(project level\)/);
      assert.match(text.text(), /Codex: every agent inherits the session model and effort \(model selection not yet supported; catalog: no discovery yet\)/);
    } finally {
      await s.cleanup();
    }
  });

  test("alias says whether the Agent tool's model parameter can take the value", async () => {
    const s = await scratch();
    try {
      await writeJson(path.join(s.home, ".canonkit", "models.json"), { version: 1, harnesses: { claude: {
        levels: { deep: { model: "claude-opus-5-5", unverified: true }, standard: { model: "sonnet", unverified: true } },
      } } });
      const shown = async () => {
        const c = capture();
        await show(c.ctx, agents, { json: true, home: s.home, cwd: s.home });
        return JSON.parse(c.text()).harnesses.claude.agents;
      };
      // No discovery: decided by shape, so a hand-typed alias is still passable.
      let a = await shown();
      assert.equal(a.archie.model.alias, false);
      assert.equal(a.bob.model.alias, true);
      // With a discovery: decided by the discovered list.
      await writeJson(path.join(s.home, ".canonkit", "model-catalog.json"), { version: 1, harnesses: { claude: { status: "discovered", discoveredAt: NOW.toISOString(), models: [{ id: "opus", efforts: ["high"] }] } } });
      a = await shown();
      assert.equal(a.archie.model.alias, false);
      assert.equal(a.bob.model.alias, false, "sonnet is not in this discovery");
    } finally {
      await s.cleanup();
    }
  });

  test("an unsupported project file is reported, not overwritten", async () => {
    const s = await scratch();
    try {
      const file = path.join(s.project, ".canonkit", "models.json");
      await writeJson(file, { version: 7 });
      await assert.rejects(show(capture().ctx, agents, { home: s.home, cwd: s.project }), /version 7 is not supported/);
      assert.equal(await readFile(file, "utf8"), JSON.stringify({ version: 7 }));
    } finally {
      await s.cleanup();
    }
  });
});

describe("models setup", () => {
  const base = (s, answers, extra = {}) => {
    const io = scripted(answers);
    const { run, calls } = claudeRunner();
    return { io, calls, opts: { input: io.input, output: io.output, isTTY: true, run, now: NOW, home: s.home, cwd: s.project, ...extra } };
  };
  const userFile = (s) => path.join(s.home, ".canonkit", "models.json");

  test("levels first, then an optional agent override; discovery runs first", async () => {
    const s = await scratch();
    try {
      // deep: opus/high; standard: sonnet/medium; light: keep; override quinn effort only.
      const { io, calls, opts } = base(s, ["opus", "high", "sonnet", "medium", "", "", "quinn", "", "xhigh", ""]);
      assert.equal(await setup(capture().ctx, agents, opts), 0);
      assert.deepEqual(calls, ["claude --version", "claude --help"]);
      assert.deepEqual(JSON.parse(await readFile(userFile(s), "utf8")), { version: 1, harnesses: { claude: {
        levels: { deep: { model: "opus", effort: "high" }, standard: { model: "sonnet", effort: "medium" } },
        agents: { quinn: { effort: "xhigh" } },
      } } });
      assert.match(io.out(), /deep \(archie, iris\) model \[fable, opus, sonnet\]/);
      assert.match(io.out(), /light \(no agents today\) model/);
    } finally {
      await s.cleanup();
    }
  });

  test("an effort not offered is rejected with the reported list, then asked again", async () => {
    const s = await scratch();
    try {
      const { io, opts } = base(s, ["opus", "turbo", "high", "", "", "", "", ""]);
      await setup(capture().ctx, agents, opts);
      assert.match(io.out(), /'turbo' is not an effort Claude Code reported\. Reported: low, medium, high, xhigh, max/);
      assert.deepEqual(JSON.parse(await readFile(userFile(s), "utf8")).harnesses.claude.levels, { deep: { model: "opus", effort: "high" } });
    } finally {
      await s.cleanup();
    }
  });

  test("a model outside the list needs an explicit yes and is recorded unverified", async () => {
    const s = await scratch();
    try {
      const declined = base(s, ["claude-x-1", "n", "", "", "", "", "", ""]);
      await setup(capture().ctx, agents, declined.opts);
      assert.equal(existsSync(userFile(s)), true);
      assert.deepEqual(JSON.parse(await readFile(userFile(s), "utf8")).harnesses, {});
      const accepted = base(s, ["claude-x-1", "y", "", "", "", "", "", ""]);
      await setup(capture().ctx, agents, accepted.opts);
      assert.deepEqual(JSON.parse(await readFile(userFile(s), "utf8")).harnesses.claude.levels.deep, { model: "claude-x-1", unverified: true });
    } finally {
      await s.cleanup();
    }
  });

  test("--project from a subfolder writes the repository root's file", async () => {
    const s = await scratch();
    try {
      await mkdir(path.join(s.project, ".git"), { recursive: true });
      await writeFile(path.join(s.project, ".git", "HEAD"), "ref: refs/heads/main\n");
      const sub = path.join(s.project, "src");
      await mkdir(sub);
      const { opts } = base(s, ["sonnet", "", "", "", "", "", ""], { project: true, cwd: sub });
      await setup(capture().ctx, agents, opts);
      assert.equal(existsSync(path.join(sub, ".canonkit")), false);
      assert.equal(JSON.parse(await readFile(path.join(s.project, ".canonkit", "models.json"), "utf8")).harnesses.claude.levels.deep.model, "sonnet");
      const c = capture();
      await show(c.ctx, agents, { json: true, home: s.home, cwd: sub });
      assert.equal(JSON.parse(c.text()).project, s.project);
      const home = base(s, [], { project: true, cwd: s.home });
      await assert.rejects(setup(capture().ctx, agents, home.opts), /no project here/);
    } finally {
      await s.cleanup();
    }
  });

  test("--project writes the project file; Enter keeps and - clears a current value", async () => {
    const s = await scratch();
    try {
      const file = path.join(s.project, ".canonkit", "models.json");
      await writeJson(file, { version: 1, note: "kept", harnesses: { claude: { levels: { deep: { model: "opus", effort: "high" } } } } });
      const { opts } = base(s, ["", "-", "", "", "", "", ""], { project: true });
      await setup(capture().ctx, agents, opts);
      assert.deepEqual(JSON.parse(await readFile(file, "utf8")), { version: 1, note: "kept", harnesses: { claude: { levels: { deep: { model: "opus" } } } } });
      assert.equal(existsSync(userFile(s)), false);
    } finally {
      await s.cleanup();
    }
  });

  test("input that ends early writes nothing; no terminal is refused", async () => {
    const s = await scratch();
    try {
      const { opts } = base(s, ["opus"]);
      await assert.rejects(setup(capture().ctx, agents, opts), /input ended before the questions did; nothing was written/);
      assert.equal(existsSync(userFile(s)), false);
      const notty = base(s, []);
      await assert.rejects(setup(capture().ctx, agents, { ...notty.opts, isTTY: false }), /models setup needs a terminal\. Without one, edit .*models\.json directly/);
      assert.deepEqual(notty.calls, []);
    } finally {
      await s.cleanup();
    }
  });

  test("other harnesses are not yet supported and change nothing", async () => {
    const s = await scratch();
    try {
      const { ctx, text } = capture();
      const { calls, opts } = base(s, []);
      assert.equal(await setup(ctx, agents, { ...opts, harnesses: ["codex"] }), 0);
      assert.match(text(), /Codex: model selection not yet supported; agents inherit the session model/);
      assert.deepEqual(calls, []);
    } finally {
      await s.cleanup();
    }
  });
});

describe("doctor model checks", () => {
  const catalog = (discoveredAt, models = ["fable", "opus", "sonnet"]) => ({ version: 1, harnesses: { claude: {
    status: "discovered", discoveredAt, harnessVersion: "2.1.322", source: "claude --help", confidence: "help-text",
    models: models.map((id) => ({ id, efforts: ["low", "medium", "high", "xhigh", "max"] })),
  } } });
  const at = (s, rows) => rows.map((r) => `${r.status} ${r.detail}`).join("\n");

  test("nothing configured is OK and needs no catalog", async () => {
    const s = await scratch();
    try {
      const rows = await modelDiagnosis(agents, { home: s.home, cwd: s.project, now: NOW });
      assert.deepEqual(rows.map((r) => r.status), ["OK"]);
      assert.match(rows[0].detail, /every agent inherits the session model/);
    } finally {
      await s.cleanup();
    }
  });

  test("a project file that changes what your choices give is surfaced", async () => {
    const s = await scratch();
    try {
      await writeJson(path.join(s.home, ".canonkit", "model-catalog.json"), catalog("2026-11-09T00:00:00.000Z"));
      await writeJson(path.join(s.home, ".canonkit", "models.json"), { version: 1, harnesses: { claude: { levels: { standard: { model: "opus", effort: "high" } } } } });
      await writeJson(path.join(s.project, ".canonkit", "models.json"), { version: 1, harnesses: { claude: { agents: { gard: { model: "sonnet", effort: "low" } }, levels: { deep: { effort: "high" } } } } });
      const rows = await modelDiagnosis(agents, { home: s.home, cwd: s.project, now: NOW });
      const warn = rows.find((r) => /override yours/.test(r.detail));
      assert.equal(warn?.status, "WARN", at(s, rows));
      assert.match(warn.detail, /gard model opus → sonnet, gard effort high → low/);
      assert.match(warn.detail, /archie effort inherit → high/);
      assert.match(warn.detail, /check them before trusting a repository you did not write/);
      assert.ok(!rows.some((r) => r.status === "OK"), at(s, rows));
    } finally {
      await s.cleanup();
    }
  });

  test("missing, stale and drifted choices are WARN rows naming level, agents and inherit", async () => {
    const s = await scratch();
    try {
      await writeJson(path.join(s.home, ".canonkit", "models.json"), { version: 1, harnesses: { claude: {
        levels: { deep: { model: "opus", effort: "high" }, standard: { model: "sonnet" } },
        agents: { gard: { model: "my-model", unverified: true } },
      } } });
      let rows = await modelDiagnosis(agents, { home: s.home, cwd: s.project, now: NOW });
      assert.match(at(s, rows), /^WARN no Claude Code discovery recorded; configured models cannot be checked — run npx canonkit models refresh$/m);
      assert.match(at(s, rows), /WARN Claude Code user agent gard: is marked unverified \(entered by hand\) — affects agents gard; if Claude Code rejects it they fall back to inherit/);

      await writeJson(path.join(s.home, ".canonkit", "model-catalog.json"), catalog("2026-09-01T00:00:00.000Z", ["fable", "sonnet"]));
      rows = await modelDiagnosis(agents, { home: s.home, cwd: s.project, now: NOW });
      assert.ok(rows.every((r) => r.status === "WARN"), at(s, rows));
      assert.match(at(s, rows), /discovery is from 2026-09-01, older than 30 days/);
      assert.match(at(s, rows), /Claude Code user level deep: model 'opus' is not in the latest discovery \(fable, sonnet\) — affects agents archie, iris; if Claude Code rejects it they fall back to inherit/);
      assert.match(at(s, rows), /user agent gard: is marked unverified \(entered by hand\); model 'my-model' is not in the latest discovery/);

      await writeJson(path.join(s.home, ".canonkit", "model-catalog.json"), catalog("2026-11-09T00:00:00.000Z"));
      await writeJson(path.join(s.home, ".canonkit", "models.json"), { version: 1, harnesses: { claude: { levels: { deep: { model: "opus", effort: "high" } } } } });
      rows = await modelDiagnosis(agents, { home: s.home, cwd: s.project, now: NOW });
      assert.deepEqual(rows.map((r) => `${r.status} ${r.detail}`), ["OK Claude Code choices match the discovery of 2026-11-09"]);
    } finally {
      await s.cleanup();
    }
  });
});

describe("CLI", () => {
  // A `claude` on PATH that records every start; show and doctor must leave it untouched.
  async function recordingClaude(root) {
    const bin = path.join(root, "bin");
    const log = path.join(root, "claude-starts.log");
    await mkdir(bin, { recursive: true });
    const js = path.join(bin, "claude-fake.cjs");
    await writeFile(js, `require("fs").appendFileSync(${JSON.stringify(log)}, process.argv.slice(2).join(" ") + "\\n");\nprocess.stdout.write(process.argv[2] === "--version" ? "2.1.322 (Claude Code)\\n" : ${JSON.stringify(HELP)});\n`);
    if (process.platform === "win32") await writeFile(path.join(bin, "claude.cmd"), `@"${process.execPath}" "${js}" %*\r\n`);
    else {
      await writeFile(path.join(bin, "claude"), `#!/bin/sh\nexec "${process.execPath}" "${js}" "$@"\n`);
      await chmod(path.join(bin, "claude"), 0o755);
    }
    return { bin, log };
  }
  const cli = (args, { home, cwd, bin }) => {
    const env = { ...process.env, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, ".config") };
    for (const k of Object.keys(env)) if (k.toUpperCase() === "PATH") delete env[k];
    env.PATH = [bin, path.dirname(process.execPath)].join(path.delimiter);
    delete env.CODEX_HOME;
    delete env.CLAUDE_CONFIG_DIR;
    const r = spawnSync(process.execPath, [CLI, ...args], { cwd, env, encoding: "utf8" });
    return { ...r, out: r.stdout + r.stderr };
  };

  test("show reads files only; refresh is what starts the harness", async () => {
    const s = await scratch();
    try {
      const { bin, log } = await recordingClaude(s.root);
      const shown = cli(["models", "show", "--json"], { home: s.home, cwd: s.project, bin });
      assert.equal(shown.status, 0, shown.out);
      assert.equal(JSON.parse(shown.stdout).harnesses.claude.agents.bob.model.source, "inherit");
      assert.equal(existsSync(log), false, "show started claude");
      const refreshed = cli(["models", "refresh", "--claude"], { home: s.home, cwd: s.project, bin });
      assert.equal(refreshed.status, 0, refreshed.out);
      assert.equal(readFileSync(log, "utf8"), "--version\n--help\n");
    } finally {
      await s.cleanup();
    }
  });

  test("argument validation and usage", async () => {
    const s = await scratch();
    try {
      const { bin } = await recordingClaude(s.root);
      const bad = cli(["models", "list"], { home: s.home, cwd: s.project, bin });
      assert.equal(bad.status, 1);
      assert.match(bad.out, /models: expected refresh, show or setup, not 'list'/);
      assert.match(cli(["models"], { home: s.home, cwd: s.project, bin }).out, /models: expected refresh, show or setup\n/);
      assert.match(cli(["models", "refresh", "--json"], { home: s.home, cwd: s.project, bin }).out, /--json is only valid for: canonkit models show/);
      assert.match(cli(["models", "show", "--project"], { home: s.home, cwd: s.project, bin }).out, /--project is only valid for: .*canonkit models setup --project/);
      const help = cli(["--help"], { home: s.home, cwd: s.project, bin }).out;
      for (const line of [/canonkit models refresh/, /canonkit models setup \[--project\]/, /canonkit models show \[--json\]/]) assert.match(help, line);
      const notty = cli(["models", "setup"], { home: s.home, cwd: s.project, bin });
      assert.equal(notty.status, 1);
      assert.match(notty.out, /models setup needs a terminal/);
    } finally {
      await s.cleanup();
    }
  });
});

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, chmod } from "node:fs/promises";
import { readFileSync, realpathSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { show, refresh, setup, offerModelSetup, modelDiagnosis } from "../bin/models-command.js";
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
function codexRunner() {
  const calls = [];
  const run = (name, args) => {
    calls.push([name, ...args].join(" "));
    if (name !== "codex") return { status: null, stdout: "", stderr: "", error: `${name} not found on PATH` };
    return args[0] === "--version" ? ok("codex-cli 0.166.0\n") : ok(JSON.stringify({ models: [
      { slug: "gpt-6-luna", visibility: "list", supported_reasoning_levels: [{ effort: "low" }, { effort: "medium" }] },
      { slug: "gpt-6-astra", visibility: "list", supported_reasoning_levels: [{ effort: "low" }, { effort: "ultra" }] },
    ] }));
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

const writeJson = async (file, data) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data));
};

describe("models refresh", () => {
  test("writes the catalog with Claude Code discovered and unavailable harnesses unknown", async () => {
    const s = await scratch();
    try {
      const { ctx, text } = capture();
      const { run, calls } = claudeRunner();
      assert.equal(await refresh(ctx, { run, now: NOW, home: s.home }), 0);
      const data = JSON.parse(await readFile(path.join(s.home, ".canonkit", "model-catalog.json"), "utf8"));
      assert.equal(data.harnesses.claude.status, "discovered");
      assert.match(data.harnesses.codex.reason, /not found/);
      for (const h of ["opencode", "copilot"]) assert.deepEqual([data.harnesses[h].status, data.harnesses[h].reason], ["unknown", "not yet supported"]);
      assert.deepEqual(calls, ["claude --version", "claude --help", "codex --version"]);
      assert.match(text(), /Claude Code: fable, opus, sonnet, haiku; efforts low, medium, high, xhigh, max/);
      assert.match(text(), /Codex: unknown — codex --version: codex not found on PATH/);
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
      assert.equal(o.harnesses.codex.applied, true);
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
      assert.match(text.text(), /Codex \(catalog: no discovery yet\)/);
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

  test("Codex show resolves user and project fields without starting discovery", async () => {
    const s = await scratch();
    try {
      await writeJson(path.join(s.home, ".canonkit", "models.json"), { version: 1, harnesses: { codex: { levels: { deep: { model: "gpt-6-astra", effort: "ultra" } } } } });
      await writeJson(path.join(s.project, ".canonkit", "models.json"), { version: 1, harnesses: { codex: { agents: { archie: { effort: "low" } } } } });
      const c = capture();
      await show(c.ctx, agents, { json: true, home: s.home, cwd: s.project, harnesses: ["codex"] });
      const result = JSON.parse(c.text()).harnesses.codex;
      assert.equal(result.applied, true);
      assert.deepEqual(result.agents.archie.model, { value: "gpt-6-astra", source: "user level", unverified: false, alias: false });
      assert.deepEqual(result.agents.archie.effort, { value: "low", source: "project agent override", unverified: false });
    } finally { await s.cleanup(); }
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
  /**
   * A stand-in for the prompts asker. `answers` maps a question name to its
   * answer; a question without one takes its default (the highlighted row,
   * the preselected agents, the confirm's initial), which is what Enter does.
   * `cancelAt` names the question where the person presses Ctrl+C.
   */
  const asker = (answers = {}, { cancelAt } = {}) => {
    const asked = [];
    const ask = async (q) => {
      asked.push(q);
      if (q.name === cancelAt) return undefined;
      if (Object.hasOwn(answers, q.name)) return answers[q.name];
      if (q.type === "select") return q.choices[q.initial].value;
      if (q.type === "multiselect") return q.choices.filter((c) => c.selected).map((c) => c.value);
      if (q.type === "confirm") return q.initial;
      if (q.type === "text") return q.initial ?? "";
      throw new Error(`unexpected question ${q.name}`);
    };
    return { ask, asked, q: (name) => asked.find((x) => x.name === name) };
  };
  const base = (s, answers, extra = {}, more = {}) => {
    const a = asker(answers, more);
    const { run, calls } = claudeRunner();
    return { ...a, calls, opts: { ask: a.ask, run, now: NOW, home: s.home, cwd: s.project, ...extra } };
  };
  const userFile = (s) => path.join(s.home, ".canonkit", "models.json");

  test("levels from discovered lists, then an agent override; discovery runs first", async () => {
    const s = await scratch();
    try {
      const { calls, opts, q } = base(s, {
        "deep-model": "opus", "deep-effort": "high",
        "standard-model": "sonnet", "standard-effort": "medium",
        agents: ["quinn"], "quinn-effort": "xhigh",
      });
      assert.equal(await setup(capture().ctx, agents, opts), 0);
      assert.deepEqual(calls, ["claude --version", "claude --help"]);
      assert.deepEqual(JSON.parse(await readFile(userFile(s), "utf8")), { version: 1, harnesses: { claude: {
        levels: { deep: { model: "opus", effort: "high" }, standard: { model: "sonnet", effort: "medium" } },
        agents: { quinn: { effort: "xhigh" } },
      } } });
      // Menus, not typed text: inherit first, then the discovered aliases, then "other…".
      assert.deepEqual(q("deep-model").choices.map((c) => c.value), ["<none>", "fable", "opus", "sonnet", "haiku", "<other>"]);
      assert.deepEqual(q("deep-effort").choices.map((c) => c.value), ["<none>", "low", "medium", "high", "xhigh", "max"]);
      assert.match(q("deep-model").message, /^deep — archie, iris · model$/);
      assert.match(q("light-model").message, /light — no agent by default/);
      assert.equal(q("quinn-model").choices[0].title, "same as standard");
      assert.match(q("agents").choices.find((c) => c.value === "quinn").description, /^standard: sonnet · medium$/);
    } finally {
      await s.cleanup();
    }
  });

  test("the current value starts highlighted, so Enter keeps it; inherit clears it", async () => {
    const s = await scratch();
    try {
      const file = path.join(s.project, ".canonkit", "models.json");
      await writeJson(file, { version: 1, note: "kept", harnesses: { claude: { levels: { deep: { model: "opus", effort: "high" } }, agents: { quinn: { effort: "max" } } } } });
      const { opts, q } = base(s, { "deep-effort": "<none>" }, { project: true });
      await setup(capture().ctx, agents, opts);
      assert.equal(q("deep-model").choices[q("deep-model").initial].value, "opus");
      // quinn's override was preselected and kept by Enter.
      assert.deepEqual(JSON.parse(await readFile(file, "utf8")), { version: 1, note: "kept", harnesses: { claude: { levels: { deep: { model: "opus" } }, agents: { quinn: { effort: "max" } } } } });
      assert.equal(existsSync(userFile(s)), false);
    } finally {
      await s.cleanup();
    }
  });

  test("deselecting an agent removes its override", async () => {
    const s = await scratch();
    try {
      await writeJson(userFile(s), { version: 1, harnesses: { claude: { agents: { quinn: { effort: "max" } } } } });
      const { opts } = base(s, { agents: [] });
      await setup(capture().ctx, agents, opts);
      assert.deepEqual(JSON.parse(await readFile(userFile(s), "utf8")).harnesses, {});
    } finally {
      await s.cleanup();
    }
  });

  test("\"other…\" takes a typed alias or model ID, validated and recorded unverified", async () => {
    const s = await scratch();
    try {
      const { opts, q } = base(s, { "deep-model": "<other>", "deep-model-other": "claude-x-1", "standard-model": "<other>", "standard-model-other": "sonnet[1m]" });
      await setup(capture().ctx, agents, opts);
      assert.match(q("deep-model").choices.at(-1).description, /^alias or full model ID; recorded as unverified$/);
      assert.equal(q("deep-model-other").validate("bad name!"), "letters, digits and . _ : / @ + - [ ] only");
      assert.equal(q("deep-model-other").validate("claude-x-1"), true);
      const levels = JSON.parse(await readFile(userFile(s), "utf8")).harnesses.claude.levels;
      assert.deepEqual(levels.deep, { model: "claude-x-1", unverified: true });
      assert.deepEqual(levels.standard, { model: "sonnet[1m]", unverified: true });
    } finally {
      await s.cleanup();
    }
  });

  test("declining the save, or Ctrl+C anywhere, writes nothing", async () => {
    const s = await scratch();
    try {
      const declined = base(s, { "deep-model": "opus", save: false });
      const c = capture();
      assert.equal(await setup(c.ctx, agents, declined.opts), 0);
      assert.match(c.text(), /deep +opus · inherit/);
      assert.match(c.text(), /Not saved; nothing changed\./);
      assert.equal(existsSync(userFile(s)), false);
      const cancelled = base(s, { "deep-model": "opus" }, {}, { cancelAt: "standard-effort" });
      await assert.rejects(setup(capture().ctx, agents, cancelled.opts), /cancelled; nothing was written/);
      assert.equal(existsSync(userFile(s)), false);
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
      const { opts } = base(s, { "deep-model": "sonnet" }, { project: true, cwd: sub });
      await setup(capture().ctx, agents, opts);
      assert.equal(existsSync(path.join(sub, ".canonkit")), false);
      assert.equal(JSON.parse(await readFile(path.join(s.project, ".canonkit", "models.json"), "utf8")).harnesses.claude.levels.deep.model, "sonnet");
      const c = capture();
      await show(c.ctx, agents, { json: true, home: s.home, cwd: sub });
      assert.equal(JSON.parse(c.text()).project, s.project);
      const home = base(s, {}, { project: true, cwd: s.home });
      await assert.rejects(setup(capture().ctx, agents, home.opts), /no project here/);
    } finally {
      await s.cleanup();
    }
  });

  test("no terminal is refused before anything runs", async () => {
    const s = await scratch();
    try {
      const { calls, opts } = base(s, {});
      await assert.rejects(setup(capture().ctx, agents, { ...opts, ask: undefined, isTTY: false }), /models setup needs a terminal\. Without one, edit .*models\.json directly/);
      assert.deepEqual(calls, []);
    } finally {
      await s.cleanup();
    }
  });

  test("OpenCode and Copilot are not yet supported and change nothing", async () => {
    const s = await scratch();
    try {
      const { ctx, text } = capture();
      const { calls, opts, asked } = base(s, {});
      assert.equal(await setup(ctx, agents, { ...opts, harnesses: ["opencode", "copilot"] }), 0);
      assert.match(text(), /OpenCode, GitHub Copilot: model selection not yet supported; agents inherit the session model/);
      assert.deepEqual(calls, []);
      assert.deepEqual(asked, []);
    } finally {
      await s.cleanup();
    }
  });

  test("Codex effort choices follow the selected model and cancellation writes nothing", async () => {
    const s = await scratch();
    try {
      const runner = codexRunner();
      const a = asker({ "codex-deep-model": "gpt-6-luna", "codex-deep-effort": "medium" });
      await setup(capture().ctx, agents, { ask: a.ask, run: runner.run, now: NOW, home: s.home, cwd: s.project, harnesses: ["codex"] });
      assert.deepEqual(a.q("codex-deep-effort").choices.map((c) => c.value), ["<none>", "low", "medium"]);
      assert.deepEqual(JSON.parse(await readFile(userFile(s), "utf8")).harnesses.codex.levels.deep, { model: "gpt-6-luna", effort: "medium" });
      assert.deepEqual(runner.calls, ["codex --version", "codex debug models"]);

      await writeJson(userFile(s), { version: 1, harnesses: { codex: { levels: { deep: { model: "gpt-6-astra", effort: "ultra" } } } } });
      const changed = asker({ "codex-deep-model": "gpt-6-luna" });
      await setup(capture().ctx, agents, { ask: changed.ask, run: codexRunner().run, now: NOW, home: s.home, cwd: s.project, harnesses: ["codex"] });
      assert.deepEqual(changed.q("codex-deep-effort").choices.map((c) => c.value), ["<none>", "low", "medium"]);
      assert.equal(JSON.parse(await readFile(userFile(s), "utf8")).harnesses.codex.levels.deep.effort, undefined);

      const before = await readFile(userFile(s), "utf8");
      const cancelled = asker({}, { cancelAt: "codex-standard-model" });
      await assert.rejects(setup(capture().ctx, agents, { ask: cancelled.ask, run: codexRunner().run, now: NOW, home: s.home, cwd: s.project, harnesses: ["codex"] }), /cancelled/);
      assert.equal(await readFile(userFile(s), "utf8"), before);

      const unknown = asker({ "codex-deep-model": "<other>", "codex-deep-model-other": "custom-model", "codex-deep-effort": "high" });
      await setup(capture().ctx, agents, { ask: unknown.ask, run: codexRunner().run, now: NOW, home: s.home, cwd: s.project, harnesses: ["codex"] });
      assert.equal(unknown.q("codex-deep-effort").type, "text");
      assert.deepEqual(JSON.parse(await readFile(userFile(s), "utf8")).harnesses.codex.levels.deep, { model: "custom-model", effort: "high", unverified: true });
    } finally { await s.cleanup(); }
  });
});

describe("models step of the interactive install", () => {
  const userFile = (s) => path.join(s.home, ".canonkit", "models.json");
  const fake = (answers, cancelAt) => {
    const asked = [];
    return { asked, ask: async (q) => {
      asked.push(q);
      if (q.name === cancelAt) return undefined;
      if (Object.hasOwn(answers, q.name)) return answers[q.name];
      if (q.type === "select") return q.choices[q.initial].value;
      if (q.type === "multiselect") return q.choices.filter((c) => c.selected).map((c) => c.value);
      return q.initial;
    } };
  };

  test("first install offers the step with Yes highlighted, and saves without the install hint", async () => {
    const s = await scratch();
    try {
      const { run } = claudeRunner();
      const f = fake({ "deep-model": "opus" });
      const c = capture();
      assert.equal(await offerModelSetup(c.ctx, agents, { ask: f.ask, run, now: NOW, home: s.home, cwd: s.project }), true);
      assert.equal(f.asked[0].initial, true);
      assert.match(f.asked[0].message, /No: they run on the session's model/);
      assert.equal(JSON.parse(await readFile(userFile(s), "utf8")).harnesses.claude.levels.deep.model, "opus");
      assert.doesNotMatch(c.text(), /Run npx canonkit install/);
    } finally {
      await s.cleanup();
    }
  });

  test("Codex-only interactive install offers Codex setup", async () => {
    const s = await scratch();
    try {
      const { run } = codexRunner();
      const f = fake({ "codex-deep-model": "gpt-6-luna", "codex-deep-effort": "medium" });
      assert.equal(await offerModelSetup(capture().ctx, agents, { ask: f.ask, run, now: NOW, home: s.home, cwd: s.project, harnesses: ["codex"] }), true);
      assert.match(f.asked[0].message, /Choose models for your Codex agents/);
      assert.equal(JSON.parse(await readFile(userFile(s), "utf8")).harnesses.codex.levels.deep.model, "gpt-6-luna");
    } finally { await s.cleanup(); }
  });

  test("with choices already saved, No is highlighted and Enter skips the step", async () => {
    const s = await scratch();
    try {
      await writeJson(userFile(s), { version: 1, harnesses: { claude: { levels: { deep: { model: "opus" } } } } });
      const { run, calls } = claudeRunner();
      const f = fake({});
      assert.equal(await offerModelSetup(capture().ctx, agents, { ask: f.ask, run, home: s.home, cwd: s.project }), true);
      assert.equal(f.asked.length, 1);
      assert.match(f.asked[0].message, /^Change the models/);
      assert.deepEqual(calls, []);
    } finally {
      await s.cleanup();
    }
  });

  test("Ctrl+C at the question or inside setup cancels the install", async () => {
    const s = await scratch();
    try {
      const { run } = claudeRunner();
      assert.equal(await offerModelSetup(capture().ctx, agents, { ask: fake({}, "models").ask, run, home: s.home, cwd: s.project }), false);
      assert.equal(await offerModelSetup(capture().ctx, agents, { ask: fake({}, "deep-effort").ask, run, now: NOW, home: s.home, cwd: s.project }), false);
      assert.equal(existsSync(userFile(s)), false);
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

  test("Codex doctor reports incompatible pairs and uncertain inherited settings", async () => {
    const s = await scratch();
    try {
      await writeJson(path.join(s.home, ".canonkit", "model-catalog.json"), { version: 1, harnesses: { codex: {
        status: "discovered", discoveredAt: NOW.toISOString(), source: "codex debug models", confidence: "experimental-debug", accountAvailability: "unconfirmed",
        models: [{ id: "gpt-6-luna", efforts: ["low", "medium"] }],
      } } });
      await writeJson(path.join(s.home, ".canonkit", "models.json"), { version: 1, harnesses: { codex: {
        levels: { deep: { model: "gpt-6-luna", effort: "ultra" }, standard: { model: "gpt-6-luna" } },
      } } });
      const rows = await modelDiagnosis(agents, { home: s.home, cwd: s.project, now: NOW });
      assert.match(at(s, rows), /incompatible: archie: gpt-6-luna \/ ultra/);
      assert.match(at(s, rows), /set only model or effort; compatibility/);
      assert.ok(rows.every((r) => r.status !== "FAIL"));
    } finally { await s.cleanup(); }
  });

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

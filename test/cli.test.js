/**
 * Contract tests for the installer.
 *
 * These run the real CLI against a real filesystem in a throwaway HOME. No
 * mocks: the failure this installer can actually cause is writing the wrong
 * bytes to a file you already had — ~/AGENTS.md, ~/.claude/CLAUDE.md, a
 * project's AGENTS.md — and a mocked fs proves nothing about that.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, rm, mkdir, readFile, writeFile, readdir, chmod, symlink, lstat, rename } from "node:fs/promises";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import prompts from "prompts";

import { applyBlock, chooseTargets, readAgents, parseAgent, summaries, replaceProjectBlock, readProjectBlock, readTools, parseTool } from "../bin/cli.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(REPO, "bin", "cli.js");

const CORE = ["archie", "bob", "gard", "perry", "pipe", "pixie", "quinn", "scott", "spencer", "virgo"];
const SPECIALISTS = ["dana", "echo", "iris", "maya", "nova"];

let sandbox;

before(async () => {
  sandbox = await mkdtemp(path.join(os.tmpdir(), "agent-team-config-test-"));
});

after(async () => {
  await rm(sandbox, { recursive: true, force: true });
});

/** A fresh HOME and a fresh project directory, isolated per test. */
async function scratch(name) {
  const root = path.join(sandbox, name);
  const home = path.join(root, "home");
  const project = path.join(root, "project");
  await mkdir(home, { recursive: true });
  await mkdir(project, { recursive: true });
  return { root, home, project };
}

function run(args, { home, cwd }) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd: cwd ?? home,
    encoding: "utf8",
    // os.homedir() reads USERPROFILE on Windows and HOME elsewhere. Setting
    // both is what makes this test suite run the same on all three platforms.
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
  return { ...result, out: (result.stdout ?? "") + (result.stderr ?? "") };
}

const read = (p) => readFile(p, "utf8");

/* ----------------------------------------------------------------- roster */

describe("agent roster", () => {
  test("every agent declares a valid tier", async () => {
    const agents = await readAgents();
    assert.equal(agents.length, CORE.length + SPECIALISTS.length);
    assert.deepEqual(agents.filter((a) => a.tier === "core").map((a) => a.name).sort(), [...CORE].sort());
    assert.deepEqual(agents.filter((a) => a.tier === "specialist").map((a) => a.name).sort(), [...SPECIALISTS].sort());
  });

  test("every specialist declares its blocking authority", async () => {
    const authority = Object.fromEntries((await readAgents()).filter((a) => a.tier === "specialist").map((a) => [a.name, a.authority]));
    assert.deepEqual(authority, { dana: "veto", echo: "veto", iris: "none", maya: "veto", nova: "veto" });
  });

  test("a specialist without a valid authority is a hard error", () => {
    const file = (extra) => `---
name: zed
description: x
tier: specialist
${extra}model: sonnet
---

body
`;
    assert.throws(() => parseAgent("zed.md", file("")), /authority is 'missing'/);
    assert.throws(() => parseAgent("zed.md", file("authority: vetoes\n")), /authority is 'vetoes'/);
    assert.equal(parseAgent("zed.md", file("authority: blocks\n")).authority, "blocks");
    // Core agents are not required to declare it.
    assert.doesNotThrow(() => parseAgent("zed.md", file("").replace("specialist", "core")));
  });

  test("every agent declares a model the runtime accepts", async () => {
    for (const agent of await readAgents()) {
      assert.ok(["opus", "sonnet", "haiku"].includes(agent.model), `${agent.name}: model is ${agent.model}`);
    }
  });

  test("the roster block carries a summary for every specialist", async () => {
    // The per-project AGENTS.md entry is derived from this block rather than
    // kept in a second list. A specialist missing here would silently install
    // with no description for Codex to route on.
    const summary = await summaries();
    for (const name of SPECIALISTS) {
      assert.ok(summary.get(name), `no roster line for ${name}`);
      assert.ok(!/Use when/i.test(summary.get(name)), `${name}: trailing guidance not stripped`);
    }
  });
});

/* ---------------------------------------------------------------- install */

describe("install target menu", () => {
  test("a flag decides without asking", async () => {
    assert.deepEqual(await chooseTargets(["--codex"], { interactive: true }), ["codex"]);
    assert.deepEqual(await chooseTargets(["--claude", "--codex"], { interactive: true }), ["claude", "codex"]);
  });

  test("no terminal and no flag installs both, as before the menu", async () => {
    assert.deepEqual(await chooseTargets([], { interactive: false }), ["claude", "codex"]);
  });

  test("in a terminal the menu's selection is returned", async () => {
    prompts.inject([["claude"]]);
    assert.deepEqual(await chooseTargets([], { interactive: true }), ["claude"]);
    prompts.inject([["claude", "codex"]]);
    assert.deepEqual(await chooseTargets([], { interactive: true }), ["claude", "codex"]);
  });

  test("a cancelled menu returns null, so nothing is installed", async () => {
    prompts.inject([new Error("cancelled")]);
    assert.equal(await chooseTargets([], { interactive: true }), null);
  });
});

describe("install", () => {
  test("copies the core team to both runtime paths and nothing else", async () => {
    const { home } = await scratch("install-basic");
    const result = run(["install"], { home });
    assert.equal(result.status, 0, result.out);

    for (const dest of [path.join(home, ".agents"), path.join(home, ".claude", "agents")]) {
      // ~/.agents also holds skills/ (Codex's user-scope skill path); only the agent files count here.
      const installed = (await readdir(dest)).filter((f) => f.endsWith(".md")).map((f) => path.basename(f, ".md")).sort();
      assert.deepEqual(installed, [...CORE].sort(), `wrong contents in ${dest}`);
    }
  });

  test("syncs both reference blocks, the routing block not importing AGENTS.md", async () => {
    const { home } = await scratch("install-reference");
    assert.equal(run(["install"], { home }).status, 0);

    const agentsMd = await read(path.join(home, "AGENTS.md"));
    assert.match(agentsMd, /<!-- agent-team-config:start -->/);
    assert.match(agentsMd, /<!-- agent-team-config:end -->/);

    const claudeMd = await read(path.join(home, ".claude", "CLAUDE.md"));
    // AGENTS.md already loads as an ancestor of the project; an import would
    // load it twice, and the block holds no roster of its own to copy.
    assert.doesNotMatch(claudeMd, /^@\S*AGENTS\.md/m);
    assert.doesNotMatch(claudeMd, /^\| \*\*Archie\*\*/m);
    assert.match(claudeMd, /<!-- agent-team-config:routing:start -->/);
    // Routing mechanics are Claude Code only; the roster is runtime-neutral.
    assert.doesNotMatch(agentsMd, /<!-- agent-team-config:routing:start -->/);
  });

  test("--no-reference installs agents without touching the global files", async () => {
    const { home } = await scratch("install-no-reference");
    assert.equal(run(["install", "--no-reference"], { home }).status, 0);

    assert.ok(existsSync(path.join(home, ".claude", "agents", "archie.md")));
    assert.equal(existsSync(path.join(home, "AGENTS.md")), false);
    assert.equal(existsSync(path.join(home, ".claude", "CLAUDE.md")), false);
  });

  test("--codex writes the Codex half and nothing under ~/.claude", async () => {
    const { home } = await scratch("install-codex-only");
    const result = run(["install", "--codex"], { home });
    assert.equal(result.status, 0, result.out);

    const tomls = (await readdir(path.join(home, ".codex", "agents"))).map((f) => path.basename(f, ".toml")).sort();
    assert.deepEqual(tomls, [...CORE].sort());
    assert.ok(existsSync(path.join(home, ".agents", "skills", "orchestrate", "SKILL.md")));
    assert.match(await read(path.join(home, "AGENTS.md")), /<!-- agent-team-config:start -->/);
    assert.equal(existsSync(path.join(home, ".claude")), false, "a Codex-only install wrote under ~/.claude");
    assert.deepEqual((await readdir(path.join(home, ".agents"))).filter((f) => f.endsWith(".md")), []);
    assert.doesNotMatch(result.out, /canonkit doctor/);
  });

  test("--claude writes the Claude Code half and no Codex agents or skills", async () => {
    const { home } = await scratch("install-claude-only");
    const result = run(["install", "--claude"], { home });
    assert.equal(result.status, 0, result.out);

    assert.ok(existsSync(path.join(home, ".claude", "agents", "archie.md")));
    assert.ok(existsSync(path.join(home, ".agents", "archie.md")));
    assert.ok(existsSync(path.join(home, ".claude", "CLAUDE.md")));
    assert.equal(existsSync(path.join(home, ".codex")), false);
    assert.equal(existsSync(path.join(home, ".agents", "skills")), false);
  });

  test("--wire-hooks with --codex refuses before writing anything", async () => {
    const { home } = await scratch("install-codex-wire");
    const result = run(["install", "--codex", "--wire-hooks"], { home });
    assert.equal(result.status, 1, result.out);
    assert.match(result.out, /needs Claude Code/);
    assert.deepEqual(await readdir(home), []);
  });

  test("--claude and --codex are refused outside install and reference", async () => {
    const { home } = await scratch("install-target-flag-misuse");
    const result = run(["list", "--codex"], { home });
    assert.equal(result.status, 1, result.out);
    assert.match(result.out, /only valid for: canonkit install, canonkit reference/);
  });

  test("is idempotent — a second run changes no bytes", async () => {
    const { home } = await scratch("install-idempotent");
    assert.equal(run(["install"], { home }).status, 0);
    const first = {
      agents: await read(path.join(home, "AGENTS.md")),
      claude: await read(path.join(home, ".claude", "CLAUDE.md")),
    };

    const second = run(["install"], { home });
    assert.equal(second.status, 0, second.out);
    assert.match(second.out, /already current/);
    assert.equal(await read(path.join(home, "AGENTS.md")), first.agents);
    assert.equal(await read(path.join(home, ".claude", "CLAUDE.md")), first.claude);
  });

  test("removes a specialist left at user level by an earlier install", async () => {
    // A leftover copy is available in every project and silently defeats the
    // per-project rule. Removing it is what actually enforces the split.
    const { home } = await scratch("install-stray");
    const dest = path.join(home, ".claude", "agents");
    await mkdir(dest, { recursive: true });
    await writeFile(path.join(dest, "maya.md"), "stale copy");
    await writeFile(path.join(dest, "unrelated.md"), "not ours");

    const result = run(["install"], { home });
    assert.equal(result.status, 0, result.out);
    assert.equal(existsSync(path.join(dest, "maya.md")), false);
    // Anything this repo does not own is left alone.
    assert.ok(existsSync(path.join(dest, "unrelated.md")));
  });

  test("preserves everything outside the markers", async () => {
    const { home } = await scratch("install-preserve");
    await mkdir(path.join(home, ".claude"), { recursive: true });
    await writeFile(path.join(home, "AGENTS.md"), "# minhas notas\n\nnao pode sumir\n");
    await writeFile(path.join(home, ".claude", "CLAUDE.md"), "@~/AGENTS.md\n\n# graphify\n\nregra local\n");

    assert.equal(run(["install"], { home }).status, 0);
    assert.match(await read(path.join(home, "AGENTS.md")), /nao pode sumir/);

    const claudeMd = await read(path.join(home, ".claude", "CLAUDE.md"));
    assert.match(claudeMd, /regra local/);
    // Content outside the markers is untouched, including an import the user wrote.
    assert.match(claudeMd, /# graphify\s+regra local/);
  });

  test("--dry-run writes nothing", async () => {
    const { home } = await scratch("install-dry");
    const result = run(["install", "--dry-run"], { home });
    assert.equal(result.status, 0, result.out);
    assert.match(result.out, /\[dry-run\]/);
    assert.equal(existsSync(path.join(home, ".claude", "agents")), false);
    assert.equal(existsSync(path.join(home, "AGENTS.md")), false);
    assert.equal(existsSync(path.join(home, ".claude", "skills")), false);
  });
});

/* ---------------------------------------------------------------- skills */

describe("orchestrate skill", () => {
  const skillPath = (home, root) => path.join(home, root, "skills", "orchestrate", "SKILL.md");

  test("install writes the skill for Claude Code and for Codex", async () => {
    const { home } = await scratch("skill-install");
    assert.equal(run(["install"], { home }).status, 0);

    const source = await read(path.join(REPO, "skills", "orchestrate", "SKILL.md"));
    for (const root of [".claude", ".agents"]) {
      assert.equal(await read(skillPath(home, root)), source, `${root} copy differs from the repo`);
    }
    assert.match(source, /^---\r?\nname: orchestrate\r?\ndescription: .{40,}/);
  });

  test("the roster keeps a line per moved rule and points at the skill", async () => {
    const block = await read(path.join(REPO, "reference", "agents-block.md"));
    assert.match(block, /names its model and effort/);
    assert.match(block, /Integration Review/);
    assert.match(block, /~\/\.claude\/skills\/orchestrate\/SKILL\.md/);
    assert.match(block, /~\/\.agents\/skills\/orchestrate\/SKILL\.md/);
  });

  test("keeps a locally edited copy as .local.bak before overwriting it", async () => {
    const { home } = await scratch("skill-local-bak");
    run(["install"], { home });
    const edited = "---\nname: orchestrate\ndescription: my own version\n---\n";
    await writeFile(skillPath(home, ".claude"), edited);

    const result = run(["install"], { home });
    assert.equal(result.status, 0, result.out);
    assert.equal(await read(skillPath(home, ".claude") + ".local.bak"), edited);
    assert.equal(await read(skillPath(home, ".claude")), await read(path.join(REPO, "skills", "orchestrate", "SKILL.md")));
  });

  test("context-tune installs whole, and never loads on its own", async () => {
    // A user-invoked skill costs nothing per session only while both runtimes
    // keep it out of implicit selection: Claude Code through its frontmatter,
    // Codex through agents/openai.yaml — which install must therefore copy too.
    const { home } = await scratch("skill-context-tune");
    assert.equal(run(["install"], { home }).status, 0);
    const src = path.join(REPO, "skills", "context-tune");
    assert.match(await read(path.join(src, "SKILL.md")), /^---\r?\n[\s\S]*?^disable-model-invocation: true$[\s\S]*?^---/m);
    assert.match(await read(path.join(src, "agents", "openai.yaml")), /allow_implicit_invocation: false/);
    for (const root of [".claude", ".agents"]) {
      for (const file of ["SKILL.md", path.join("agents", "openai.yaml")]) {
        const dest = path.join(home, root, "skills", "context-tune", file);
        assert.equal(await read(dest), await read(path.join(src, file)), `${root}/${file} differs from the repo`);
      }
    }
  });

  test("--no-reference leaves the skill alone, like the blocks it belongs to", async () => {
    const { home } = await scratch("skill-no-reference");
    assert.equal(run(["install", "--no-reference"], { home }).status, 0);
    assert.equal(existsSync(skillPath(home, ".claude")), false);
  });
});

/* ---------------------------------------------------------------- codex */

describe("codex custom agents", () => {
  test("writes one TOML per core agent, with the required fields", async () => {
    const { home } = await scratch("codex-core");
    assert.equal(run(["install", "--no-reference"], { home }).status, 0);

    const dest = path.join(home, ".codex", "agents");
    const written = (await readdir(dest)).sort();
    assert.deepEqual(written, CORE.map((n) => `${n}.toml`).sort());

    const archie = await read(path.join(dest, "archie.toml"));
    // Codex requires exactly these three; anything else is optional.
    assert.match(archie, /^name = "archie"$/m);
    assert.match(archie, /^description = ".+"$/m);
    assert.match(archie, /^developer_instructions = '''$/m);
    // The instructions are the agent file's body, not a summary of it.
    assert.match(archie, /## Mission/);
    assert.match(archie, /## Anti-patterns/);
  });

  test("carries the frontmatter model onto the Codex axis", async () => {
    const { home } = await scratch("codex-model");
    run(["install", "--no-reference"], { home });
    const dest = path.join(home, ".codex", "agents");

    // archie is opus in frontmatter — the demanding end of the map.
    const archie = await read(path.join(dest, "archie.toml"));
    assert.match(archie, /^model = "gpt-5\.6"$/m);
    assert.match(archie, /^model_reasoning_effort = "high"$/m);

    // scott is sonnet — the balanced default.
    const scott = await read(path.join(dest, "scott.toml"));
    assert.match(scott, /^model_reasoning_effort = "medium"$/m);
  });

  test("every agent body survives as a TOML literal string", async () => {
    // A literal string has no escape for its own delimiter, so a body
    // containing ''' would truncate the instructions silently at that point.
    for (const agent of await readAgents()) {
      assert.ok(!agent.body.includes("'''"), `${agent.name}: body contains '''`);
      assert.ok(agent.body.length > 500, `${agent.name}: body looks truncated`);
    }
  });

  test("reports an older copy of an agent it owns, without deleting it", async () => {
    const { home } = await scratch("codex-stale-copy");
    const dest = path.join(home, ".codex", "agents");
    await mkdir(dest, { recursive: true });
    // An agent from an older setup, saved in a format Codex does not load here.
    await writeFile(path.join(dest, "archie-tech-architect.md"), "stale");

    const result = run(["install", "--no-reference"], { home });
    assert.equal(result.status, 0, result.out);
    assert.match(result.out, /older copies of agents this repo owns: archie-tech-architect\.md/);
    assert.ok(existsSync(path.join(dest, "archie-tech-architect.md")), "must not delete it");
  });

  test("stays quiet about your own agents and about repo scaffolding", async () => {
    // A warning that fires on .gitignore teaches you to ignore warnings.
    const { home } = await scratch("codex-quiet");
    const dest = path.join(home, ".codex", "agents");
    await mkdir(path.join(dest, ".github"), { recursive: true });
    await writeFile(path.join(dest, ".gitignore"), "*.log");
    await writeFile(path.join(dest, "my-own-reviewer.toml"), 'name = "my_own_reviewer"');

    const result = run(["install", "--no-reference"], { home });
    assert.equal(result.status, 0, result.out);
    assert.doesNotMatch(result.out, /older copies/);
    assert.doesNotMatch(result.out, /\.gitignore|\.github|my-own-reviewer/);
    // And it leaves them all alone.
    assert.ok(existsSync(path.join(dest, "my-own-reviewer.toml")));
    assert.ok(existsSync(path.join(dest, ".gitignore")));
  });

  test("does not leave a specialist at user level", async () => {
    const { home } = await scratch("codex-stray");
    const dest = path.join(home, ".codex", "agents");
    await mkdir(dest, { recursive: true });
    await writeFile(path.join(dest, "maya.toml"), "name = \"maya\"");

    assert.equal(run(["install", "--no-reference"], { home }).status, 0);
    assert.equal(existsSync(path.join(dest, "maya.toml")), false);
  });
});

/* ------------------------------------------------------------ specialists */

/* ------------------------------------------------------------------ hooks */

describe("hooks", () => {
  const hookPath = (home) => path.join(home, ".claude", "hooks", "canonkit-hook.js");

  test("installs the hook and says so when settings.json does not reference it", async () => {
    const { home } = await scratch("hook-fresh");
    const { out } = run(["install", "--no-reference"], { home });

    assert.ok(existsSync(hookPath(home)), "hook was not installed");
    assert.ok(out.includes("not referenced by ~/.claude/settings.json"));

    // The message exists to be pasted into settings.json, where a Windows path
    // separator is an invalid escape. Asserting the forward-slash form is the
    // same check without writing a backslash into this file.
    assert.ok(out.includes("/.claude/hooks/canonkit-hook.js"), "suggested command is not JSON-pastable");
  });

  test("keeps a locally edited hook as .local.bak before overwriting it", async () => {
    const { home } = await scratch("hook-divergent");
    run(["install", "--no-reference"], { home });

    // Editing in place is the only workflow this file has ever had.
    const edited = (await read(hookPath(home))) + "// local edit";
    await writeFile(hookPath(home), edited);

    const { out } = run(["install", "--no-reference"], { home });
    assert.ok(out.includes("differed — previous copy kept"));
    assert.equal(await read(hookPath(home) + ".local.bak"), edited);
    assert.equal(await read(hookPath(home)), await read(path.join(REPO, "hooks", "canonkit-hook.js")));
  });

  const EVENTS = ["PreToolUse", "PostToolUse", "SubagentStop", "UserPromptSubmit", "Stop"];
  const wire = (home, events) =>
    mkdir(path.join(home, ".claude"), { recursive: true }).then(() =>
      writeFile(
        path.join(home, ".claude", "settings.json"),
        JSON.stringify({
          hooks: Object.fromEntries(
            events.map((e) => [e, [{ hooks: [{ type: "command", command: "node ~/.claude/hooks/canonkit-hook.js" }] }]]),
          ),
        }),
      ),
    );

  test("is quiet when the hook is unchanged and wired to every event it needs", async () => {
    const { home } = await scratch("hook-wired");
    await wire(home, EVENTS);

    run(["install", "--no-reference"], { home });
    const { out } = run(["install", "--no-reference"], { home });
    assert.ok(!out.includes("not referenced"));
    assert.ok(!out.includes("differed"));
  });

  test("names the event a partially wired hook is missing, with its matcher", async () => {
    // The install this guards: wired before PostToolUse existed. Every gate still
    // fires, so nothing looks wrong — and no dispatch ever gets an agent_end.
    const { home } = await scratch("hook-partial");
    await wire(home, EVENTS.filter((e) => e !== "PostToolUse"));

    const { out } = run(["install", "--no-reference"], { home });
    assert.ok(out.includes("under: PostToolUse"), out);
    assert.ok(out.includes('"PostToolUse": [{ "matcher": "Agent|Task|Read|Grep|Glob|Bash|PowerShell"'), out);
    assert.ok(!out.includes('"Stop": ['), "an event that is wired must not be reported");
  });

  test("reports an old Agent|Task matcher without rewriting settings", async () => {
    const { home } = await scratch("hook-old-matcher");
    await wire(home, EVENTS);
    const settings = path.join(home, ".claude", "settings.json");
    const data = JSON.parse(await read(settings));
    data.hooks.PostToolUse[0].matcher = "Agent|Task";
    await writeFile(settings, JSON.stringify(data));
    const before = await read(settings);
    const { out } = run(["install", "--no-reference"], { home });
    assert.ok(out.includes("under: PostToolUse"), out);
    assert.ok(out.includes("update its matcher instead of adding a duplicate"), out);
    assert.equal(await read(settings), before);
  });

  test("survives a settings.json that is not valid JSON", async () => {
    const { home } = await scratch("hook-bad-settings");
    await mkdir(path.join(home, ".claude"), { recursive: true });
    await writeFile(path.join(home, ".claude", "settings.json"), "{ not json");

    const { out, status } = run(["install", "--no-reference"], { home });
    assert.equal(status, 0);
    assert.ok(out.includes("not valid JSON"));
    assert.ok(existsSync(hookPath(home)), "a broken settings.json must not stop the copy");
  });

  describe("upgrade from meu-time", () => {
    const claude = (home, ...p) => path.join(home, ".claude", ...p);
    const oldHook = (home) => claude(home, "hooks", "meu-time-hook.js");
    const OLD = "// the pre-rename hook, possibly edited\n";
    const seedOld = async (home) => {
      await mkdir(claude(home, "hooks"), { recursive: true });
      await writeFile(oldHook(home), OLD);
    };
    const gate = (home, script) => spawnSync(process.execPath, [script], {
      input: JSON.stringify({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "git commit -m x" }, session_id: "UPG" }),
      encoding: "utf8", env: { ...process.env, HOME: home, USERPROFILE: home },
    });

    test("an old hook the global settings do not reference still forwards (a project's may)", async () => {
      // A project's .claude/settings.json can run it too, and install cannot
      // find those: deleting the file would turn that project's gates off.
      const { home, project } = await scratch("upgrade-unreferenced");
      await seedOld(home);
      await mkdir(path.join(project, ".claude"), { recursive: true });
      await writeFile(path.join(project, ".claude", "settings.json"), JSON.stringify({
        hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "node ~/.claude/hooks/meu-time-hook.js" }] }] },
      }));
      const { out, status } = run(["install", "--no-reference"], { home });
      assert.equal(status, 0, out);
      assert.ok(existsSync(oldHook(home)), "the forwarder must stay");
      assert.equal(await read(oldHook(home) + ".local.bak"), OLD);
      assert.ok(existsSync(hookPath(home)));
      assert.match(out, /project's \.claude\/settings\.json/);
      const r = gate(home, oldHook(home));
      assert.equal(r.status, 0, r.stderr);
      assert.equal(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, "ask", "the forwarder does not gate");
    });

    test("an older forwarder that only require()d the hook is refreshed, not backed up", async () => {
      const { home } = await scratch("upgrade-stale-forwarder");
      await mkdir(claude(home, "hooks"), { recursive: true });
      await writeFile(oldHook(home), "// canonkit-forwarder: old\nrequire('./canonkit-hook.js');\n");
      run(["install", "--no-reference"], { home });
      assert.match(await read(oldHook(home)), /require\('\.\/canonkit-hook\.js'\)\.run\(\)/);
      assert.ok(!existsSync(oldHook(home) + ".local.bak"), "a forwarder is not the user's edit");
      const r = gate(home, oldHook(home));
      assert.equal(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, "ask");
    });

    test("a reference in settings.local.json counts as settings still running it", async () => {
      const { home } = await scratch("upgrade-local-settings");
      await seedOld(home);
      await writeFile(claude(home, "settings.local.json"), '{"hooks":{"Stop":[{"hooks":[{"type":"command","command":"node ~/.claude/hooks/meu-time-hook.js"}]}]}}');
      const { out } = run(["install", "--no-reference"], { home });
      assert.match(out, /settings\.json still runs meu-time-hook\.js/);
    });

    test("an old hook settings.json still runs keeps the gates firing and is reported", async () => {
      // Removing it would make every gate fail open until settings.json is
      // rewired: the command would point at a file that is not there.
      const { home } = await scratch("upgrade-referenced");
      await seedOld(home);
      await writeFile(claude(home, "settings.json"), JSON.stringify({
        hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "node ~/.claude/hooks/meu-time-hook.js" }] }] },
      }));
      const { out } = run(["install", "--no-reference"], { home });
      assert.equal(await read(oldHook(home) + ".local.bak"), OLD);
      assert.ok(existsSync(oldHook(home)), "the file settings.json runs must still exist");
      assert.match(out, /settings\.json still runs meu-time-hook\.js/);
      const r = gate(home, oldHook(home));
      assert.equal(r.status, 0, r.stderr);
      assert.equal(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, "ask", "the forwarder does not gate");
      // Re-running install keeps the forwarder and does not back it up over the original.
      run(["install", "--no-reference"], { home });
      assert.equal(await read(oldHook(home) + ".local.bak"), OLD);
    });

    test("the activity log moves to canonkit-activity with its history", async () => {
      const { home } = await scratch("upgrade-log");
      await mkdir(claude(home, "meu-time-activity"), { recursive: true });
      await writeFile(claude(home, "meu-time-activity", "events.jsonl"), '{"event":"prompt"}\n');
      const { out } = run(["install", "--no-reference"], { home });
      assert.equal(await read(claude(home, "canonkit-activity", "events.jsonl")), '{"event":"prompt"}\n');
      assert.ok(!existsSync(claude(home, "meu-time-activity")));
      assert.match(out, /canonkit-activity/);
    });

    test("when both logs exist they merge oldest first, once, and the old one goes", async () => {
      const { home } = await scratch("upgrade-log-both");
      const seed = async (d, f, line) => {
        await mkdir(claude(home, d), { recursive: true });
        await writeFile(claude(home, d, f), line + "\n");
      };
      await seed("meu-time-activity", "events.jsonl.1", '{"n":1}');
      await seed("meu-time-activity", "events.jsonl", '{"n":2}');
      await seed("canonkit-activity", "events.jsonl.1", '{"n":3}');
      await seed("canonkit-activity", "events.jsonl", '{"n":4}');
      const { out, status } = run(["install", "--no-reference"], { home });
      assert.equal(status, 0, out);
      assert.equal(await read(claude(home, "canonkit-activity", "events.jsonl")), '{"n":1}\n{"n":2}\n{"n":3}\n{"n":4}\n');
      assert.ok(!existsSync(claude(home, "canonkit-activity", "events.jsonl.1")), "everything fits the live file");
      assert.ok(!existsSync(claude(home, "meu-time-activity")));
      assert.ok(!existsSync(claude(home, "meu-time-activity.merging")));
      assert.match(out, /merged ~\/\.claude\/meu-time-activity/);
      const again = run(["install", "--no-reference"], { home });
      assert.doesNotMatch(again.out, /meu-time-activity/, "the note must not repeat forever");
      assert.equal(await read(claude(home, "canonkit-activity", "events.jsonl")), '{"n":1}\n{"n":2}\n{"n":3}\n{"n":4}\n');
    });

    test("a merged log too big for the live file keeps its newest lines there", async () => {
      // Otherwise the hook's first append rotates the whole merge out of the
      // file the Stop gate reads.
      const { home } = await scratch("upgrade-log-big");
      const pad = "x".repeat(1000);
      const old = Array.from({ length: 1500 }, (_, i) => JSON.stringify({ n: i, pad })).join("\n") + "\n";
      await mkdir(claude(home, "meu-time-activity"), { recursive: true });
      await writeFile(claude(home, "meu-time-activity", "events.jsonl"), old);
      await mkdir(claude(home, "canonkit-activity"), { recursive: true });
      await writeFile(claude(home, "canonkit-activity", "events.jsonl"), '{"n":"new"}\n');
      run(["install", "--no-reference"], { home });
      const live = await read(claude(home, "canonkit-activity", "events.jsonl"));
      const rotated = await read(claude(home, "canonkit-activity", "events.jsonl.1"));
      assert.ok(Buffer.byteLength(live) <= 1024 * 1024);
      assert.ok(live.endsWith('{"n":"new"}\n'));
      assert.equal((rotated + live).split("\n").filter(Boolean).length, 1501, "no line lost or repeated");
      assert.ok(rotated.startsWith(JSON.stringify({ n: 0, pad })));
    });

    test("--dry-run with both logs present merges nothing", async () => {
      const { home } = await scratch("upgrade-log-dry-both");
      for (const d of ["meu-time-activity", "canonkit-activity"]) {
        await mkdir(claude(home, d), { recursive: true });
        await writeFile(claude(home, d, "events.jsonl"), `{"from":"${d}"}\n`);
      }
      const { out } = run(["install", "--no-reference", "--dry-run"], { home });
      assert.match(out, /would merge/);
      assert.equal(await read(claude(home, "meu-time-activity", "events.jsonl")), '{"from":"meu-time-activity"}\n');
      assert.equal(await read(claude(home, "canonkit-activity", "events.jsonl")), '{"from":"canonkit-activity"}\n');
    });

    test("an empty old folder next to a populated new one is just removed", async () => {
      const { home } = await scratch("upgrade-log-empty-old");
      await mkdir(claude(home, "meu-time-activity"), { recursive: true });
      await mkdir(claude(home, "canonkit-activity"), { recursive: true });
      await writeFile(claude(home, "canonkit-activity", "events.jsonl"), '{"n":4}\n');
      run(["install", "--no-reference"], { home });
      assert.equal(await read(claude(home, "canonkit-activity", "events.jsonl")), '{"n":4}\n');
      assert.ok(!existsSync(claude(home, "meu-time-activity")));
    });

    test("an old folder held open is left alone and install still succeeds", { skip: process.platform !== "win32" && "folder locks are a Windows behaviour" }, async () => {
      // A process whose cwd is the folder is how Windows refuses the rename
      // (EBUSY/EPERM) — the same thing a running dashboard does.
      const { home } = await scratch("upgrade-log-locked");
      for (const d of ["meu-time-activity", "canonkit-activity"]) {
        await mkdir(claude(home, d), { recursive: true });
        await writeFile(claude(home, d, "events.jsonl"), `{"from":"${d}"}\n`);
      }
      const holder = spawn(process.execPath, ["-e", "setTimeout(() => {}, 30000)"], { cwd: claude(home, "meu-time-activity"), stdio: "ignore" });
      try {
        const { out, status } = run(["install", "--no-reference"], { home });
        assert.equal(status, 0, out);
        assert.match(out, /could not merge/);
        assert.equal(await read(claude(home, "meu-time-activity", "events.jsonl")), '{"from":"meu-time-activity"}\n');
        assert.equal(await read(claude(home, "canonkit-activity", "events.jsonl")), '{"from":"canonkit-activity"}\n');
      } finally { holder.kill(); }
    });

    test("an old dashboard is reported, not deleted", async () => {
      const { home } = await scratch("upgrade-dashboard");
      await mkdir(claude(home, "meu-time-dashboard"), { recursive: true });
      const { out } = run(["install", "--no-reference"], { home });
      assert.ok(existsSync(claude(home, "meu-time-dashboard")));
      assert.match(out, /meu-time-dashboard/);
    });

    test("--dry-run moves and removes nothing", async () => {
      const { home } = await scratch("upgrade-dry");
      await seedOld(home);
      await mkdir(claude(home, "meu-time-activity"), { recursive: true });
      run(["install", "--no-reference", "--dry-run"], { home });
      assert.equal(await read(oldHook(home)), OLD);
      assert.ok(existsSync(claude(home, "meu-time-activity")));
      assert.ok(!existsSync(claude(home, "canonkit-activity")));
    });
  });

  test("--dry-run installs no hook", async () => {
    const { home } = await scratch("hook-dry");
    run(["install", "--no-reference", "--dry-run"], { home });
    assert.ok(!existsSync(hookPath(home)));
    assert.ok(!existsSync(path.join(home, ".claude", "canonkit-dashboard")));
  });

  test("without --wire-hooks, install points at doctor and the flag", async () => {
    const { home } = await scratch("hook-print-only");
    const { out } = run(["install", "--no-reference"], { home });
    assert.ok(!existsSync(path.join(home, ".claude", "settings.json")), "print-only must not create settings.json");
    assert.match(out, /--wire-hooks/);
    assert.match(out.trim().split("\n").pop(), /npx canonkit doctor/);
  });

  test("a PreToolUse matcher that misses a tool is reported, like PostToolUse", async () => {
    // SendMessage joined the matcher for the Stop gate's resume credit: an entry
    // wired before it still gates edits, so nothing else would show the gap.
    const { home } = await scratch("hook-pre-coverage");
    await wire(home, EVENTS);
    const settings = path.join(home, ".claude", "settings.json");
    const data = JSON.parse(await read(settings));
    data.hooks.PreToolUse[0].matcher = "Edit|Write|MultiEdit|NotebookEdit|Bash|PowerShell|Agent|Task";
    await writeFile(settings, JSON.stringify(data));
    const { out } = run(["install", "--no-reference"], { home });
    assert.ok(out.includes("under: PreToolUse"), out);
    assert.ok(!out.includes("under: PreToolUse, PostToolUse"), out);
  });
});

/* ------------------------------------------------------------ wire-hooks */

// The harness sets CLAUDE_PROJECT_DIR for every command it runs, this suite
// included: a test that means one passes it explicitly.
function runIn(args, { home, cwd, env = {} }) {
  const e = { ...process.env, HOME: home, USERPROFILE: home, ...env };
  if (!("CLAUDE_PROJECT_DIR" in env)) delete e.CLAUDE_PROJECT_DIR;
  const result = spawnSync(process.execPath, [CLI, ...args], { cwd: cwd ?? home, encoding: "utf8", env: e });
  return { ...result, out: (result.stdout ?? "") + (result.stderr ?? "") };
}

const REQUIRED = {
  PreToolUse: "Edit|Write|MultiEdit|NotebookEdit|Bash|PowerShell|Agent|Task|SendMessage",
  PostToolUse: "Agent|Task|Read|Grep|Glob|Bash|PowerShell",
  SubagentStop: null,
  UserPromptSubmit: null,
  Stop: null,
};
const claudeDir = (home, ...p) => path.join(home, ".claude", ...p);
const settingsOf = async (home, f = "settings.json") => JSON.parse(await read(claudeDir(home, f)));
const commandsIn = (entries = []) => entries.flatMap((e) => (e.hooks ?? []).map((h) => h.command));
const ours = (cmd) => /canonkit-hook\.js|meu-time-hook\.js/.test(cmd ?? "");
const backups = async (home) => (await readdir(claudeDir(home))).filter((f) => /^settings\.json\.canonkit-.*\.bak$/.test(f));
const FORWARDER = (home) => claudeDir(home, "hooks", "meu-time-hook.js");
const legacyEntry = (matcher) => ({ ...(matcher ? { matcher } : {}), hooks: [{ type: "command", command: "node ~/.claude/hooks/meu-time-hook.js" }] });

describe("install --wire-hooks", () => {
  test("writes every event with its matcher into a settings.json that did not exist", async () => {
    const { home } = await scratch("wire-fresh");
    const { out, status } = runIn(["install", "--no-reference", "--wire-hooks"], { home });
    assert.equal(status, 0, out);
    const { hooks } = await settingsOf(home);
    for (const [event, matcher] of Object.entries(REQUIRED)) {
      const entries = hooks[event].filter((e) => commandsIn([e]).some(ours));
      assert.equal(entries.length, 1, `${event}: exactly one entry runs the hook`);
      assert.equal(entries[0].matcher, matcher ?? undefined, `${event} matcher`);
      // Quoted and forward-slashed: a home with a space in it, and JSON, both survive.
      assert.match(entries[0].hooks[0].command, /^node "[^"\\]*\/\.claude\/hooks\/canonkit-hook\.js"$/);
    }
    assert.deepEqual(await backups(home), [], "nothing to back up");
  });

  test("keeps every other key and hook, and backs up the original bytes first", async () => {
    const { home } = await scratch("wire-keep");
    await mkdir(claudeDir(home), { recursive: true });
    const theirs = { type: "command", command: "node ~/my-own-hook.js" };
    const original = JSON.stringify({
      permissions: { allow: ["Bash(npm test)"], deny: ["Read(.env)"] },
      env: { FOO: "1" },
      model: "opus",
      hooks: { Notification: [{ hooks: [theirs] }], Stop: [{ hooks: [theirs] }] },
    });
    await writeFile(claudeDir(home, "settings.json"), original);
    const { out, status } = runIn(["install", "--no-reference", "--wire-hooks"], { home });
    assert.equal(status, 0, out);
    const after = await settingsOf(home);
    assert.deepEqual(after.permissions, { allow: ["Bash(npm test)"], deny: ["Read(.env)"] });
    assert.deepEqual(after.env, { FOO: "1" });
    assert.equal(after.model, "opus");
    assert.deepEqual(after.hooks.Notification, [{ hooks: [theirs] }]);
    assert.ok(commandsIn(after.hooks.Stop).includes(theirs.command), "the user's own Stop hook stays");
    const [bak] = await backups(home);
    assert.ok(bak, "a backup is written before the change");
    assert.equal(await read(claudeDir(home, bak)), original);
  });

  test("rewrites a meu-time command in place instead of adding a second hook", async () => {
    const { home } = await scratch("wire-legacy");
    await mkdir(claudeDir(home), { recursive: true });
    await writeFile(claudeDir(home, "settings.json"), JSON.stringify({
      hooks: { PreToolUse: [legacyEntry(REQUIRED.PreToolUse)], Stop: [legacyEntry(), legacyEntry()] },
    }));
    runIn(["install", "--no-reference", "--wire-hooks"], { home });
    const { hooks } = await settingsOf(home);
    const text = JSON.stringify(hooks);
    assert.doesNotMatch(text, /meu-time-hook/);
    for (const event of Object.keys(REQUIRED)) {
      assert.equal(commandsIn(hooks[event]).filter(ours).length, 1, `${event}: one hook, not two`);
    }
  });

  test("a second run changes nothing and writes no second backup", async () => {
    const { home } = await scratch("wire-idempotent");
    await mkdir(claudeDir(home), { recursive: true });
    await writeFile(claudeDir(home, "settings.json"), JSON.stringify({ model: "opus" }));
    runIn(["install", "--no-reference", "--wire-hooks"], { home });
    const once = await read(claudeDir(home, "settings.json"));
    const again = runIn(["install", "--no-reference", "--wire-hooks"], { home });
    assert.equal(await read(claudeDir(home, "settings.json")), once);
    assert.equal((await backups(home)).length, 1);
    assert.doesNotMatch(again.out, /not referenced/);
  });

  test("an entry of its own with an old matcher is widened in place", async () => {
    const { home } = await scratch("wire-old-matcher");
    await mkdir(claudeDir(home), { recursive: true });
    const cmd = { type: "command", command: "node ~/.claude/hooks/canonkit-hook.js" };
    await writeFile(claudeDir(home, "settings.json"), JSON.stringify({
      hooks: { PreToolUse: [{ matcher: "Edit|Write|Bash|Agent|Task", hooks: [cmd] }], PostToolUse: [{ matcher: "Agent|Task", hooks: [cmd] }] },
    }));
    runIn(["install", "--no-reference", "--wire-hooks"], { home });
    const { hooks } = await settingsOf(home);
    assert.equal(hooks.PreToolUse.length, 1);
    assert.equal(hooks.PreToolUse[0].matcher, REQUIRED.PreToolUse);
    assert.equal(hooks.PostToolUse.length, 1);
    assert.equal(hooks.PostToolUse[0].matcher, REQUIRED.PostToolUse);
  });

  test("an entry shared with the user's hooks keeps its matcher; the hook moves to its own entry", async () => {
    // Widening a shared matcher would run the user's other hook on tools they
    // never chose.
    const { home } = await scratch("wire-shared");
    await mkdir(claudeDir(home), { recursive: true });
    const theirs = { type: "command", command: "node ~/fmt.js" };
    await writeFile(claudeDir(home, "settings.json"), JSON.stringify({
      hooks: { PreToolUse: [{ matcher: "Edit|Write", hooks: [theirs, { type: "command", command: "node ~/.claude/hooks/canonkit-hook.js" }] }] },
    }));
    runIn(["install", "--no-reference", "--wire-hooks"], { home });
    const { hooks } = await settingsOf(home);
    const shared = hooks.PreToolUse.find((e) => commandsIn([e]).includes(theirs.command));
    assert.equal(shared.matcher, "Edit|Write");
    assert.deepEqual(commandsIn([shared]), [theirs.command]);
    const own = hooks.PreToolUse.filter((e) => commandsIn([e]).some(ours));
    assert.equal(own.length, 1);
    assert.equal(own[0].matcher, REQUIRED.PreToolUse);
  });

  for (const [name, body] of [
    ["is not valid JSON", "{ not json"],
    ["is not an object", "[]"],
    ["has a hooks that is not an object", '{"hooks": []}'],
    ["has an event that is not an array", '{"hooks": {"Stop": {}}}'],
  ]) {
    test(`refuses a settings.json that ${name}, writing nothing`, async () => {
      const { home } = await scratch(`wire-refuse-${name.replace(/\W+/g, "-")}`);
      await mkdir(claudeDir(home), { recursive: true });
      await writeFile(claudeDir(home, "settings.json"), body);
      const { out, status } = runIn(["install", "--no-reference", "--wire-hooks"], { home });
      assert.equal(status, 1, out);
      assert.match(out, /settings\.json/);
      assert.equal(await read(claudeDir(home, "settings.json")), body);
      assert.deepEqual(await backups(home), []);
    });
  }

  test("--dry-run writes no settings.json and no backup", async () => {
    const { home } = await scratch("wire-dry");
    await mkdir(claudeDir(home), { recursive: true });
    await writeFile(claudeDir(home, "settings.json"), "{}");
    const { out } = runIn(["install", "--no-reference", "--wire-hooks", "--dry-run"], { home });
    assert.match(out, /would wire/);
    assert.equal(await read(claudeDir(home, "settings.json")), "{}");
    assert.deepEqual(await backups(home), []);
  });

  test("a command that only wraps the hook is left and reported by key path, never by value", async () => {
    // Rewriting a wrapper would drop whatever it does around the hook.
    const { home } = await scratch("wire-wrapper");
    await mkdir(claudeDir(home), { recursive: true });
    const wrapper = "bash -c 'node ~/.claude/hooks/meu-time-hook.js 2>>/tmp/hook.err'";
    await writeFile(claudeDir(home, "settings.json"), JSON.stringify({
      env: { API_TOKEN: "do-not-print-me" },
      hooks: { Stop: [{ hooks: [{ type: "command", command: wrapper }] }] },
    }));
    const { out, status } = runIn(["install", "--no-reference", "--wire-hooks"], { home });
    assert.equal(status, 0, out);
    const { hooks } = await settingsOf(home);
    assert.ok(commandsIn(hooks.Stop).includes(wrapper), "the wrapper stays");
    assert.equal(commandsIn(hooks.Stop).filter((c) => /^node "/.test(c)).length, 1, "and the hook is wired beside it");
    assert.match(out, /hooks\.Stop\[0\]\.hooks\[0\]/);
    assert.match(out, /runs twice/, "the wrapper and the new entry both run the hook until the wrapper goes");
    assert.ok(!out.includes(wrapper) && !out.includes("hook.err"), out);
    assert.ok(!out.includes("do-not-print-me"), out);
  });

  test("a command with shell syntax in its path is a wrapper, not the exact shape", async () => {
    const { home } = await scratch("wire-shell-syntax");
    await mkdir(claudeDir(home), { recursive: true });
    const odd = ["node x;curl|sh;/canonkit-hook.js", 'node "$(whoami)/canonkit-hook.js"', "node `pwd`/canonkit-hook.js"];
    await writeFile(claudeDir(home, "settings.json"), JSON.stringify({
      hooks: { Notification: odd.map((command) => ({ hooks: [{ type: "command", command }] })) },
    }));
    const { out } = runIn(["install", "--no-reference", "--wire-hooks"], { home });
    assert.deepEqual(commandsIn((await settingsOf(home)).hooks.Notification), odd);
    for (let i = 0; i < odd.length; i++) assert.match(out, new RegExp(`hooks\\.Notification\\[${i}\\]\\.hooks\\[0\\]`));
  });

  test("two of its hooks in one entry become one", async () => {
    const { home } = await scratch("wire-dup-in-entry");
    await mkdir(claudeDir(home), { recursive: true });
    const cmd = { type: "command", command: "node ~/.claude/hooks/canonkit-hook.js" };
    await writeFile(claudeDir(home, "settings.json"), JSON.stringify({ hooks: { Stop: [{ hooks: [cmd, { ...cmd }] }] } }));
    runIn(["install", "--no-reference", "--wire-hooks"], { home });
    assert.equal(commandsIn((await settingsOf(home)).hooks.Stop).length, 1);
  });

  test("a meu-time command under an event canonkit does not use is rewritten too", async () => {
    // Left alone, it would keep the forwarder alive forever.
    const { home } = await scratch("wire-other-event");
    await mkdir(claudeDir(home), { recursive: true });
    await writeFile(claudeDir(home, "settings.json"), JSON.stringify({ hooks: { Notification: [legacyEntry()] } }));
    runIn(["install", "--no-reference", "--wire-hooks"], { home });
    const { hooks } = await settingsOf(home);
    assert.equal(hooks.Notification.length, 1);
    assert.match(hooks.Notification[0].hooks[0].command, /canonkit-hook\.js"$/);
  });

  test("keeps the file's mode, the backup's too", { skip: process.platform === "win32" && "POSIX modes" }, async () => {
    const { home } = await scratch("wire-mode");
    await mkdir(claudeDir(home), { recursive: true });
    await writeFile(claudeDir(home, "settings.json"), JSON.stringify({ model: "opus" }));
    await chmod(claudeDir(home, "settings.json"), 0o600);
    runIn(["install", "--no-reference", "--wire-hooks"], { home });
    const { stat } = await import("node:fs/promises");
    assert.equal((await stat(claudeDir(home, "settings.json"))).mode & 0o777, 0o600);
    const [bak] = await backups(home);
    assert.equal((await stat(claudeDir(home, bak))).mode & 0o777, 0o600);
  });

  test("is refused outside install", async () => {
    const { home } = await scratch("wire-wrong-command");
    const { status, out } = runIn(["list", "--wire-hooks"], { home });
    assert.equal(status, 1);
    assert.match(out, /--wire-hooks is only valid for: canonkit install/);
  });

  describe("the meu-time forwarder", () => {
    const seed = async (home, settings = {}) => {
      await mkdir(claudeDir(home, "hooks"), { recursive: true });
      await writeFile(FORWARDER(home), "// the pre-rename hook\n");
      for (const [f, v] of Object.entries(settings)) await writeFile(f.startsWith(home) ? f : claudeDir(home, f), JSON.stringify(v));
    };

    test("is removed once the settings it can see no longer run it", async () => {
      const { home } = await scratch("forwarder-gone");
      await seed(home, { "settings.json": { hooks: { Stop: [legacyEntry()] } } });
      const { out, status } = runIn(["install", "--no-reference", "--wire-hooks"], { home });
      assert.equal(status, 0, out);
      assert.ok(!existsSync(FORWARDER(home)), "the forwarder must go");
      assert.ok(existsSync(FORWARDER(home) + ".local.bak"), "a pre-forwarder copy stays backed up");
      // Other projects' settings cannot be seen from here: say what that means.
      assert.match(out, /removed .*meu-time-hook\.js/);
      assert.match(out, /a project's \.claude\/settings\.json that still runs it now runs nothing/);
      assert.match(out, /canonkit doctor/);
    });

    test("stays while settings.local.json still runs it, which is named", async () => {
      const { home } = await scratch("forwarder-local");
      await seed(home, { "settings.local.json": { hooks: { Stop: [legacyEntry()] } } });
      const { out } = runIn(["install", "--no-reference", "--wire-hooks"], { home });
      assert.ok(existsSync(FORWARDER(home)));
      assert.match(await read(FORWARDER(home)), /canonkit-forwarder/);
      assert.match(out, /settings\.local\.json still runs meu-time-hook\.js/);
      assert.match(await read(claudeDir(home, "settings.local.json")), /meu-time-hook/, "settings.local.json is never written");
    });

    for (const [where, envOf] of [
      ["the cwd project's", () => ({})],
      ["CLAUDE_PROJECT_DIR's", (project) => ({ CLAUDE_PROJECT_DIR: project })],
    ]) {
      test(`stays while ${where} .claude/settings.json still runs it`, async () => {
        const { home, project } = await scratch(`forwarder-project-${where.length}`);
        await seed(home);
        await mkdir(path.join(project, ".claude"), { recursive: true });
        await writeFile(path.join(project, ".claude", "settings.json"), JSON.stringify({ hooks: { Stop: [legacyEntry()] } }));
        const env = envOf(project);
        const cwd = env.CLAUDE_PROJECT_DIR ? home : project;
        const { out } = runIn(["install", "--no-reference", "--wire-hooks"], { home, cwd, env });
        assert.ok(existsSync(FORWARDER(home)), out);
        assert.ok(out.includes(path.join(project, ".claude", "settings.json").split(path.sep).join("/")), out);
      });
    }

    test("--dry-run keeps it", async () => {
      const { home } = await scratch("forwarder-dry");
      await seed(home);
      const { out } = runIn(["install", "--no-reference", "--wire-hooks", "--dry-run"], { home });
      assert.equal(await read(FORWARDER(home)), "// the pre-rename hook\n");
      assert.doesNotMatch(out, /\bremoved .*meu-time-hook\.js/, "a dry run never claims the deletion");
    });

    test("--dry-run judges the settings it would write, and says it would remove it", async () => {
      const { home } = await scratch("forwarder-dry-planned");
      await seed(home, { "settings.json": { hooks: { Stop: [legacyEntry()] } } });
      const { out } = runIn(["install", "--no-reference", "--wire-hooks", "--dry-run"], { home });
      assert.match(out, /would remove .*meu-time-hook\.js/);
      assert.ok(existsSync(FORWARDER(home)));
    });

    test("stays while a settings file runs it without the .js (node resolves it)", async () => {
      const { home } = await scratch("forwarder-no-ext");
      await seed(home, { "settings.local.json": { hooks: { Stop: [{ hooks: [{ type: "command", command: "node ~/.claude/hooks/meu-time-hook" }] }] } } });
      runIn(["install", "--no-reference", "--wire-hooks"], { home });
      assert.ok(existsSync(FORWARDER(home)));
    });

    test("a forwarder edited by hand is neither refreshed nor removed, and is named", async () => {
      const { home } = await scratch("forwarder-edited");
      await mkdir(claudeDir(home, "hooks"), { recursive: true });
      const mine = "// canonkit-forwarder, plus my own logging\nconsole.error('hook');\nrequire('./canonkit-hook.js').run();\n";
      await writeFile(FORWARDER(home), mine);
      const { out, status } = runIn(["install", "--no-reference", "--wire-hooks"], { home });
      assert.equal(status, 0, out);
      assert.equal(await read(FORWARDER(home)), mine);
      assert.match(out, /kept .*meu-time-hook\.js: .*edited/);
    });

    test("stays while a wrapper in settings.json still runs it", async () => {
      const { home } = await scratch("forwarder-wrapper");
      await seed(home, { "settings.json": { hooks: { Stop: [{ hooks: [{ type: "command", command: "sh -c 'node ~/.claude/hooks/meu-time-hook.js'" }] }] } } });
      const { out } = runIn(["install", "--no-reference", "--wire-hooks"], { home });
      assert.ok(existsSync(FORWARDER(home)), out);
      assert.match(out, /settings\.json still runs meu-time-hook\.js/);
    });
  });
});

/* ---------------------------------------------------------------- doctor */

describe("doctor", () => {
  const doctor = (o) => runIn(["doctor"], o);
  const line = (out, re) => out.split("\n").find((l) => re.test(l)) ?? "";
  const ready = async (name) => {
    const s = await scratch(name);
    runIn(["install", "--wire-hooks"], { home: s.home });
    return s;
  };
  // Every file under a folder with its bytes: doctor must leave it exactly so.
  const snapshot = async (dir) => {
    const out = {};
    for (const e of await readdir(dir, { withFileTypes: true, recursive: true })) {
      const p = path.join(e.parentPath ?? e.path, e.name);
      if (e.isFile()) out[path.relative(dir, p)] = await read(p);
    }
    return out;
  };

  test("a full install wired by --wire-hooks passes every check, one line each", async () => {
    const { home, project } = await ready("doctor-ok");
    const { out, status } = doctor({ home, cwd: project });
    assert.equal(status, 0, out);
    assert.doesNotMatch(out, /^FAIL/m, out);
    for (const check of ["agents", "reference", "hook file", "hook syntax", "hook wiring", "log", "config"]) {
      assert.match(line(out, new RegExp(`^(OK|WARN) +${check}\\b`)), /\S/, `no line for ${check}:\n${out}`);
    }
  });

  test("is read-only", async () => {
    const { home, project } = await ready("doctor-readonly");
    const before = await snapshot(home);
    doctor({ home, cwd: project });
    assert.deepEqual(await snapshot(home), before);
  });

  test("an unwired hook FAILs, naming the events, and exits 1", async () => {
    const { home } = await scratch("doctor-unwired");
    runIn(["install"], { home });
    const { out, status } = doctor({ home });
    assert.equal(status, 1);
    assert.match(line(out, /^FAIL +hook wiring/), /PreToolUse.*Stop|--wire-hooks/);
  });

  test("an old PreToolUse matcher without SendMessage is incomplete wiring", async () => {
    const { home } = await ready("doctor-no-sendmessage");
    const s = await settingsOf(home);
    for (const e of s.hooks.PreToolUse) if (commandsIn([e]).some(ours)) e.matcher = e.matcher.replace("|SendMessage", "");
    await writeFile(claudeDir(home, "settings.json"), JSON.stringify(s));
    const { out, status } = doctor({ home });
    assert.equal(status, 1);
    assert.match(line(out, /^FAIL +hook wiring/), /PreToolUse/);
  });

  test("hooks wired only in settings.local.json count: the runtime merges it", async () => {
    const { home } = await ready("doctor-local");
    await rename(claudeDir(home, "settings.json"), claudeDir(home, "settings.local.json"));
    const { out, status } = doctor({ home });
    assert.equal(status, 0, out);
    assert.match(out, /^OK +hook wiring/m);
  });

  test("a log folder that cannot be one FAILs", async () => {
    const { home } = await ready("doctor-log");
    await writeFile(claudeDir(home, "canonkit-activity"), "not a folder");
    const { out, status } = doctor({ home });
    assert.equal(status, 1);
    assert.match(out, /^FAIL +log/m);
  });

  test("missing reference blocks FAIL", async () => {
    const { home } = await scratch("doctor-noref");
    runIn(["install", "--no-reference", "--wire-hooks"], { home });
    const { out, status } = doctor({ home });
    assert.equal(status, 1);
    assert.match(line(out, /^FAIL +reference/), /AGENTS\.md|CLAUDE\.md/);
  });

  test("an agent that differs between the two install folders FAILs", async () => {
    const { home } = await ready("doctor-agent-drift");
    await writeFile(path.join(home, ".agents", "gard.md"), "---\nname: gard\n---\nedited\n");
    const { out, status } = doctor({ home });
    assert.equal(status, 1);
    assert.match(line(out, /^FAIL +agents/), /gard/);
  });

  test("a hook that does not parse FAILs the syntax check", async () => {
    const { home } = await ready("doctor-syntax");
    await writeFile(claudeDir(home, "hooks", "canonkit-hook.js"), "function (\n");
    const { out, status } = doctor({ home });
    assert.equal(status, 1);
    assert.match(out, /^FAIL +hook syntax/m);
    assert.match(out, /^WARN +hook file/m, "a hook that differs from this package is named");
  });

  test("an invalid settings.json FAILs instead of crashing", async () => {
    const { home } = await ready("doctor-bad-settings");
    await writeFile(claudeDir(home, "settings.json"), "{ nope");
    const { out, status } = doctor({ home });
    assert.equal(status, 1);
    assert.match(line(out, /^FAIL +hook wiring/), /not valid JSON/);
  });

  test("a forwarder left on disk WARNs, without failing", async () => {
    const { home } = await ready("doctor-forwarder");
    await writeFile(FORWARDER(home), "// canonkit-forwarder\nrequire('./canonkit-hook.js').run();\n");
    const { out, status } = doctor({ home });
    assert.equal(status, 0, out);
    assert.match(line(out, /^WARN +forwarder/), /meu-time-hook\.js.*--wire-hooks/);
  });

  test("settings that run meu-time-hook.js with no file there FAIL: every gate is off", async () => {
    const { home, project } = await ready("doctor-dangling");
    await mkdir(path.join(project, ".claude"), { recursive: true });
    const projSettings = path.join(project, ".claude", "settings.json");
    await writeFile(projSettings, JSON.stringify({ hooks: { Stop: [legacyEntry()] } }));
    const { out, status } = doctor({ home, cwd: project });
    assert.equal(status, 1);
    assert.ok(line(out, /^FAIL +forwarder/).includes(projSettings.split(path.sep).join("/")), out);
  });

  test("prints the resolved config: file, root and what was ignored", async () => {
    const { home, project } = await ready("doctor-config");
    await mkdir(path.join(project, ".claude"), { recursive: true });
    await writeFile(path.join(project, ".claude", "canonkit.json"), JSON.stringify({ highRisk: { exclude: ["**"] }, colour: 1 }));
    const { out, status } = doctor({ home, cwd: project, env: { CLAUDE_PROJECT_DIR: project } });
    assert.equal(status, 0, out);
    const slash = (p) => p.split(path.sep).join("/");
    const cfg = out.slice(out.search(/^(OK|WARN) +config/m));
    assert.match(cfg, /^WARN +config/, "an ignored entry is worth a WARN");
    assert.ok(cfg.includes(`file ${slash(path.join(project, ".claude", "canonkit.json"))}`), cfg);
    assert.ok(cfg.includes(`root ${slash(project)}`), cfg);
    assert.match(cfg, /ignored highRisk\.exclude\[0\]: a catch-all/);
    assert.match(cfg, /ignored colour: unknown key/);
  });

  test("under a nested config, names the project file whose additive lists also apply", async () => {
    const { home, project } = await ready("doctor-nested");
    await mkdir(path.join(project, ".claude"), { recursive: true });
    await writeFile(path.join(project, ".claude", "canonkit.json"), JSON.stringify({ highRisk: { include: ["src/payments/**"] }, perfBudgets: ["ops/limits.yml"] }));
    const demo = path.join(project, "examples", "demo");
    await mkdir(path.join(demo, ".claude"), { recursive: true });
    await writeFile(path.join(demo, ".claude", "canonkit.json"), "{}");
    const { out, status } = doctor({ home, cwd: demo, env: { CLAUDE_PROJECT_DIR: project } });
    assert.equal(status, 0, out);
    const slash = (p) => p.split(path.sep).join("/");
    const cfg = out.slice(out.search(/^(OK|WARN) +config/m));
    assert.ok(cfg.includes(`file ${slash(path.join(demo, ".claude", "canonkit.json"))}`), cfg);
    assert.ok(cfg.includes(`project ${slash(path.join(project, ".claude", "canonkit.json"))}`), cfg);
    assert.match(cfg, /1 include, 1 perfBudgets/);
  });

  test("no config: says so, with the root paths are taken from", async () => {
    const { home, project } = await ready("doctor-no-config");
    const { out } = doctor({ home, cwd: project, env: { CLAUDE_PROJECT_DIR: project } });
    assert.match(line(out, /^OK +config/), /file none.*defaults/);
  });
});

describe("dashboard", () => {
  const dash = (home) => path.join(home, ".claude", "canonkit-dashboard");

  test("installs the dashboard beside the hook it reads from", async () => {
    const { home } = await scratch("dash-fresh");
    run(["install", "--no-reference"], { home });
    for (const f of await readdir(path.join(REPO, "dashboard"))) {
      assert.equal(await read(path.join(dash(home), f)), await read(path.join(REPO, "dashboard", f)), f);
    }
  });

  test("keeps a locally edited dashboard as .local.bak", async () => {
    const { home } = await scratch("dash-divergent");
    run(["install", "--no-reference"], { home });
    const edited = (await read(path.join(dash(home), "index.html"))) + "<!-- local -->";
    await writeFile(path.join(dash(home), "index.html"), edited);

    run(["install", "--no-reference"], { home });
    assert.equal(await read(path.join(dash(home), "index.html.local.bak")), edited);
  });
});

describe("specialists", () => {
  test("add copies the file and registers it in the project AGENTS.md", async () => {
    const { home, project } = await scratch("add-basic");
    const result = run(["add", "maya", "nova"], { home, cwd: project });
    assert.equal(result.status, 0, result.out);

    // Claude Code reads .claude/agents/; Codex reads AGENTS.md and never looks
    // at .claude/. Both have to learn about the agent.
    assert.ok(existsSync(path.join(project, ".claude", "agents", "maya.md")));
    assert.ok(existsSync(path.join(project, ".claude", "agents", "nova.md")));
    // Codex reads .codex/agents/<name>.toml and never looks at .claude/.
    assert.ok(existsSync(path.join(project, ".codex", "agents", "maya.toml")));
    assert.ok(existsSync(path.join(project, ".codex", "agents", "nova.toml")));

    const agentsMd = await read(path.join(project, "AGENTS.md"));
    assert.match(agentsMd, /\*\*maya\*\* \(veto\) — game design/);
    assert.match(agentsMd, /\*\*nova\*\* \(veto\) — visual direction/);
    assert.doesNotMatch(agentsMd, /\*\*iris\*\*/);
  });

  test("the project block states 'no veto' for a specialist without one", async () => {
    const { home, project } = await scratch("add-authority-none");
    assert.equal(run(["add", "iris"], { home, cwd: project }).status, 0);
    assert.match(await read(path.join(project, "AGENTS.md")), /\*\*iris\*\* \(no veto\) — /);
  });

  test("the block is rebuilt from disk, not from the history of commands", async () => {
    const { home, project } = await scratch("add-rebuild");
    run(["add", "maya", "nova"], { home, cwd: project });
    assert.equal(run(["remove", "nova"], { home, cwd: project }).status, 0);

    const agentsMd = await read(path.join(project, "AGENTS.md"));
    assert.match(agentsMd, /\*\*maya\*\*/);
    assert.doesNotMatch(agentsMd, /\*\*nova\*\*/);
    assert.equal(existsSync(path.join(project, ".claude", "agents", "nova.md")), false);
    // Removing from one runtime and leaving the other is the drift this avoids.
    assert.equal(existsSync(path.join(project, ".codex", "agents", "nova.toml")), false);
    assert.ok(existsSync(path.join(project, ".codex", "agents", "maya.toml")));
  });

  for (const [label, eol] of [["LF", "\n"], ["CRLF", "\r\n"]]) {
    test(`re-running add with the same specialists leaves a ${label} AGENTS.md byte-identical`, async () => {
      const { home, project } = await scratch(`add-idempotent-${label}`);
      const target = path.join(project, "AGENTS.md");
      // Text on both sides of the block: what follows it must not be disturbed either.
      await writeFile(target, ["# projeto", "", "instrucoes locais", ""].join(eol));
      assert.equal(run(["add", "dana", "maya", "nova"], { home, cwd: project }).status, 0);

      const withTail = (await read(target)) + eol + "## depois" + eol + eol + "resto" + eol;
      await writeFile(target, withTail);

      for (let i = 0; i < 3; i++) {
        const result = run(["add", "dana", "maya", "nova"], { home, cwd: project });
        assert.equal(result.status, 0, result.out);
        assert.equal(await read(target), withTail, `run ${i + 1} changed the file`);
      }
      // The block is written in the file's own line ending, not mixed into it.
      if (eol === "\r\n") assert.doesNotMatch(await read(target), /(^|[^\r])\n/);
    });
  }

  test("removing the last specialist drops the block and keeps the rest of the file", async () => {
    const { home, project } = await scratch("add-last");
    await writeFile(path.join(project, "AGENTS.md"), "# projeto\n\ninstrucoes locais\n");
    run(["add", "maya"], { home, cwd: project });
    assert.equal(run(["remove", "maya"], { home, cwd: project }).status, 0);

    const agentsMd = await read(path.join(project, "AGENTS.md"));
    assert.doesNotMatch(agentsMd, /agent-team-config:specialists/);
    assert.match(agentsMd, /instrucoes locais/);
  });

  test("--dry-run reports the block it would write and writes nothing", async () => {
    const { home, project } = await scratch("add-dry");
    run(["add", "maya"], { home, cwd: project });

    const before = await read(path.join(project, "AGENTS.md"));
    const result = run(["add", "nova", "--dry-run"], { home, cwd: project });
    assert.equal(result.status, 0, result.out);

    // The projected block is maya + nova, not what the disk holds right now.
    assert.match(result.out, /Updated specialist block/);
    assert.equal(existsSync(path.join(project, ".claude", "agents", "nova.md")), false);
    assert.equal(await read(path.join(project, "AGENTS.md")), before);
  });

  test("refuses a core agent and an unknown name", async () => {
    const { home, project } = await scratch("add-refuse");

    const isCore = run(["add", "archie"], { home, cwd: project });
    assert.equal(isCore.status, 1);
    assert.match(isCore.out, /core agent/);

    const unknown = run(["add", "nobody"], { home, cwd: project });
    assert.equal(unknown.status, 1);
    assert.match(unknown.out, /Not a domain specialist/);

    // A refused name must not leave a half-applied state behind.
    assert.equal(existsSync(path.join(project, "AGENTS.md")), false);
  });

  test("refuses to run inside the source of truth", async () => {
    const { home } = await scratch("add-selfhost");
    const result = run(["add", "maya"], { home, cwd: REPO });
    assert.equal(result.status, 1);
    assert.match(result.out, /source of truth/);
  });
});

/* -------------------------------------------------------------- block sync */

describe("applyBlock", () => {
  const markers = ["<!-- x:start -->", "<!-- x:end -->"];

  test("replaces a hand-written section instead of duplicating it", () => {
    const original = "# keep\n\nmine\n\n# subagentes\n\nversao escrita a mao\n\n# depois\n\nresto\n";
    const { text, action } = applyBlock(original, "# subagentes\n\nnovo conteudo\n", markers);

    assert.equal(action, "replaced hand-written section in");
    assert.equal(text.match(/# subagentes/g).length, 1);
    assert.doesNotMatch(text, /versao escrita a mao/);
    assert.match(text, /mine/);
    assert.match(text, /resto/);
  });

  test("updates in place on the second run and is stable on the third", () => {
    const first = applyBlock("", "# t\n\nv1\n", markers).text;
    const second = applyBlock(first, "# t\n\nv2\n", markers);
    assert.equal(second.action, "updated managed block in");
    assert.match(second.text, /v2/);
    assert.doesNotMatch(second.text, /v1/);
    assert.equal(applyBlock(second.text, "# t\n\nv2\n", markers).text, second.text);
  });

  test("a CRLF file stays CRLF and a repeat run changes nothing", () => {
    const original = "# keep\r\n\r\nmine\r\n";
    const first = applyBlock(original, "# t\n\nv1\n", markers).text;
    assert.doesNotMatch(first, /(^|[^\r])\n/);
    const second = applyBlock(first, "# t\n\nv1\n", markers).text;
    assert.equal(second, first);
    assert.match(applyBlock(first, "# t\n\nv2\n", markers).text, /v2/);
  });

  test("a block containing regex metacharacters is written literally", () => {
    // sed would corrupt the target here; this is why the marker handling is not
    // a regex substitution built from the block's own text.
    const body = "# t\n\ncost: $1 (a|b) [x] \\d+ ^anchor$\n";
    const { text } = applyBlock("", body, markers);
    assert.match(text, /cost: \$1 \(a\|b\) \[x\] \\d\+ \^anchor\$/);
  });
});

/* ---------------------------------------------------------- project blocks */

describe("replaceProjectBlock", () => {
  const markers = ["<!-- y:start -->", "<!-- y:end -->"];

  test("appends, rewrites in place, and removes with the blank lines around it", () => {
    const base = "# mine\n\nlocal\n";
    const added = replaceProjectBlock(base, markers, "# B\n\nv1");
    assert.equal(added.had, false);
    assert.equal(added.text, "# mine\n\nlocal\n\n<!-- y:start -->\n# B\n\nv1\n<!-- y:end -->\n");

    const tail = added.text + "\n## after\n";
    const updated = replaceProjectBlock(tail, markers, "# B\n\nv2");
    assert.equal(updated.text, tail.replace("v1", "v2"));
    assert.equal(replaceProjectBlock(updated.text, markers, "# B\n\nv2").text, updated.text);

    assert.equal(replaceProjectBlock(added.text, markers, null).text, base);
    assert.deepEqual(replaceProjectBlock(base, markers, null), { text: base, had: false });
  });

  test("keeps a CRLF file CRLF, and reads the block back", () => {
    const base = "# mine\r\n\r\nlocal\r\n";
    const { text } = replaceProjectBlock(base, markers, "# B\n\nv1");
    assert.doesNotMatch(text, /(^|[^\r])\n/);
    assert.equal(readProjectBlock(text, markers), "\n# B\n\nv1\n");
    assert.equal(replaceProjectBlock(text, markers, null).text, base);
    assert.equal(readProjectBlock(base, markers), null);
  });

  test("removing a block between two paragraphs keeps them two paragraphs", () => {
    const text = "Para one.\n\n<!-- y:start -->\n# B\n<!-- y:end -->\n\nPara two.\n";
    assert.equal(replaceProjectBlock(text, markers, null).text, "Para one.\n\nPara two.\n");
  });

  test("add then remove is a round trip whichever block came first", () => {
    const other = ["<!-- z:start -->", "<!-- z:end -->"];
    const body = (m) => (m === markers ? "# Y" : "# Z");
    for (const [first, second] of [[markers, other], [other, markers]]) {
      const both = replaceProjectBlock(replaceProjectBlock("# p\n", first, body(first)).text, second, body(second)).text;
      for (const [removed, kept] of [[first, second], [second, first]]) {
        const only = replaceProjectBlock("# p\n", kept, body(kept)).text;
        assert.equal(replaceProjectBlock(both, removed, null).text, only);
      }
    }
  });

  test("two blocks in one file do not disturb each other", () => {
    const other = ["<!-- z:start -->", "<!-- z:end -->"];
    const one = replaceProjectBlock("# p\n", markers, "# Y").text;
    const both = replaceProjectBlock(one, other, "# Z").text;
    assert.equal(replaceProjectBlock(both, other, null).text, one);
    assert.equal(replaceProjectBlock(both, markers, "# Y").text, both);
  });
});

/* ------------------------------------------------------------------- tools */

describe("tool registry", () => {
  test("every tool parses, pins an exact version and prints it in the install command", async () => {
    const tools = await readTools();
    assert.deepEqual([...tools.keys()], ["graphify", "openspec"]);
    for (const t of tools.values()) {
      assert.match(t.pin, /^\d+\.\d+\.\d+$/);
      assert.ok(t.install.some((l) => l.includes(t.pin)), `${t.name}: install does not carry the pin`);
      assert.ok(t.rules.length >= 1 && t.rules.length <= 3);
      // Never an unpinned or ephemeral runner.
      for (const l of t.install) assert.doesNotMatch(l, /@latest|\buvx\b|\bpipx\b|\buv\b/);
    }
    const g = tools.get("graphify");
    // graphifyy, two y's: `graphify` on PyPI is a different package.
    assert.ok(g.install.some((l) => l.includes(`graphifyy==${g.pin}`)));
    assert.doesNotMatch(g.install.join("\n"), /\bgraphify==/);
    assert.deepEqual(g.setup, [["update", "."]]);
    assert.deepEqual(tools.get("openspec").setup, [["init", "--tools", "claude,codex"]]);
  });

  test("refuses a range pin, a forbidden step, a non-literal argument and a long block", () => {
    const file = ({ pin = "1.2.3", setup = "  - init", body = "one rule" } = {}) =>
      `---\nname: t\nbin: t\npin: ${pin}\ninstall:\n  - get t@{pin}\nsetup:\n${setup}\n---\n${body}\n`;
    assert.ok(parseTool("t.md", file()));
    assert.throws(() => parseTool("t.md", file({ pin: "^1.2.3" })), /exact/);
    assert.throws(() => parseTool("t.md", file({ setup: "  - claude install" })), /not allowed/);
    assert.throws(() => parseTool("t.md", file({ setup: "  - codex install" })), /not allowed/);
    assert.throws(() => parseTool("t.md", file({ setup: "  - extract ." })), /not allowed/);
    assert.throws(() => parseTool("t.md", file({ setup: "  - init $(whoami)" })), /plain literal/);
    assert.throws(() => parseTool("t.md", file({ body: "a\nb\nc\nd" })), /1 to 3/);
    assert.throws(() => parseTool("t.md", file({ body: "uses 1.2.3" })), /pin lives only/);
    // Fixed env is literal, and never a variable that changes what gets loaded.
    const withEnv = (kv) => file().replace("setup:", `env:\n  - ${kv}\nsetup:`);
    assert.deepEqual(parseTool("t.md", withEnv("NO_TRACK=1")).env, { NO_TRACK: "1" });
    assert.throws(() => parseTool("t.md", withEnv("X=$(id)")), /KEY=literal/);
    for (const kv of ["PATH=/x", "PYTHONPATH=.", "NODE_OPTIONS=--require", "LD_PRELOAD=x", "DYLD_INSERT_LIBRARIES=x", "ComSpec=x"]) {
      assert.throws(() => parseTool("t.md", withEnv(kv.toUpperCase() === kv ? kv : kv)), /KEY=literal|changes what gets loaded/, kv);
    }
  });

  test("the published package ships the registry", async () => {
    const pkg = JSON.parse(await read(path.join(REPO, "package.json")));
    assert.ok(pkg.files.includes("tools"));
  });
});

describe("tool add/remove", () => {
  const WIN = process.platform === "win32";
  const SEP = WIN ? ";" : ":";
  const PINS = {};
  const re = (s) => s.replace(/\./g, "\\.");
  before(async () => {
    for (const [n, t] of await readTools()) PINS[n] = t.pin;
  });

  // git stays on PATH for graphify's preflight; nothing else from the real PATH
  // does, so a real graphify/openspec installed on this machine is never reached.
  const gitDir = (() => {
    const r = spawnSync(WIN ? "where" : "which", ["git"], { encoding: "utf8" });
    return r.status === 0 ? path.dirname(r.stdout.split(/\r?\n/)[0].trim()) : null;
  })();

  const STUB = `const fs = require("fs"), path = require("path");
const bin = process.argv[2];
const argv = process.argv.slice(3);
fs.appendFileSync(process.env.STUB_LOG, JSON.stringify([bin, ...argv]) + "\\n");
fs.appendFileSync(process.env.STUB_LOG + ".env", JSON.stringify([bin, process.env.GRAPHIFY_NO_AUTO_REFRESH ?? null]) + "\\n");
fs.appendFileSync(process.env.STUB_LOG + ".cwd", JSON.stringify([bin, argv[0] ?? null, process.cwd()]) + "\\n");
if (argv[0] === "--version") { console.log(bin + " " + (process.env.STUB_VERSION || "0.0.1")); process.exit(0); }
if (process.env.STUB_FAIL === argv.join(" ")) process.exit(3);
if (process.env.STUB_CLAUDE) fs.writeFileSync("CLAUDE.md", "# made by the tool\\n");
if (process.env.STUB_REWRITE && fs.existsSync("AGENTS.md")) fs.appendFileSync("AGENTS.md", "tool line\\n");
if (bin === "graphify" && argv.join(" ") === "hook install") {
  const hooks = path.join(".git", "hooks");
  fs.mkdirSync(hooks, { recursive: true });
  if (process.env.STUB_TOUCH_HOOK) fs.appendFileSync(path.join(hooks, "pre-push"), "touched\\n");
  // Like graphify: an existing hook gets its marked block replaced, nothing else
  // (STUB_WIPE_HOOK breaks that rule, to prove canonkit notices).
  for (const [hook, tag] of [["post-commit", "hook"], ["post-checkout", "checkout-hook"]]) {
    const file = path.join(hooks, hook);
    const block = "# graphify-" + tag + "-start\\nnew\\n# graphify-" + tag + "-end\\n";
    const old = fs.existsSync(file) && !process.env.STUB_WIPE_HOOK ? fs.readFileSync(file, "utf8") : "#!/bin/sh\\n";
    const re = new RegExp("# graphify-" + tag + "-start[\\\\s\\\\S]*?# graphify-" + tag + "-end\\n?");
    fs.writeFileSync(file, re.test(old) ? old.replace(re, block) : old + block);
  }
  if (process.env.STUB_EXTRA_HOOK) fs.writeFileSync(path.join(hooks, "pre-push"), "#!/bin/sh\\n");
}
if (bin === "openspec" && argv[0] === "init") fs.mkdirSync("openspec", { recursive: true });
`;

  /** A shim on PATH named like the tool: a .cmd on Windows (what npm installs), sh elsewhere. */
  async function shim(dir, name, js) {
    await mkdir(dir, { recursive: true });
    if (WIN) {
      await writeFile(path.join(dir, `${name}.cmd`), `@"${process.execPath}" "${js}" ${name} %*\r\n`);
    } else {
      const file = path.join(dir, name);
      await writeFile(file, `#!/bin/sh\nexec "${process.execPath}" "${js}" ${name} "$@"\n`);
      await chmod(file, 0o755);
    }
  }

  async function setup(name, { git = false } = {}) {
    const { root, home, project } = await scratch(`tool-${name}`);
    const bin = path.join(root, "bin");
    await mkdir(bin);
    await writeFile(path.join(bin, "stub.cjs"), STUB);
    for (const t of ["graphify", "openspec"]) await shim(bin, t, path.join(bin, "stub.cjs"));
    const log = path.join(root, "argv.log");
    const gitconfig = path.join(root, "gitconfig");
    await writeFile(gitconfig, "");
    const env = (extra = {}, PATH = [bin, gitDir].filter(Boolean).join(SEP)) => {
      const base = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.toUpperCase() !== "PATH"));
      // The git config of the machine running the tests (a global core.hooksPath,
      // say) must not decide what these tests see.
      return { ...base, PATH, STUB_LOG: log, GIT_CONFIG_GLOBAL: gitconfig, GIT_CONFIG_NOSYSTEM: "1", ...extra };
    };
    if (git) spawnSync("git", ["init", "-q", project], { env: env() });
    const tool = (args, extra, PATH) => {
      const r = spawnSync(process.execPath, [CLI, "tool", ...args], {
        cwd: project,
        encoding: "utf8",
        env: { ...env(extra, PATH), HOME: home, USERPROFILE: home },
      });
      return { ...r, out: (r.stdout ?? "") + (r.stderr ?? "") };
    };
    const calls = async () =>
      existsSync(log) ? (await read(log)).trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
    return { root, home, project, bin, tool, calls, env };
  }

  test("runs the registry's setup with exactly its arguments and writes no CLAUDE.md", async () => {
    const { project, tool, calls } = await setup("openspec-args");
    const r = tool(["add", "openspec", "--yes"], { STUB_VERSION: PINS.openspec });
    assert.equal(r.status, 0, r.out);
    assert.deepEqual(await calls(), [["openspec", "--version"], ["openspec", "init", "--tools", "claude,codex"]]);
    assert.equal(existsSync(path.join(project, "CLAUDE.md")), false);
    assert.equal(existsSync(path.join(project, ".claude", "CLAUDE.md")), false);
    const agentsMd = await read(path.join(project, "AGENTS.md"));
    assert.match(agentsMd, /agent-team-config:complements:start/);
    assert.match(agentsMd, /\*\*openspec\*\* — /);
    // The lifecycle entry point must survive the actual project-tool install.
    const rules = (await readTools()).get("openspec").rules;
    for (const rule of rules) assert.ok(agentsMd.includes(rule));
    assert.match(agentsMd, /orchestrate skill's OpenSpec change lifecycle/);
    assert.deepEqual((await readdir(project)).sort(), ["AGENTS.md", "openspec"], "integration must not create a parallel plan or spec");
    // The confirmation names what will run, from where, and what it touches.
    assert.match(r.out, /binary: +\S*openspec/);
    assert.match(r.out, /runs: +.*openspec\S* init --tools claude,codex/);
    assert.match(r.out, /touches:/);
  });

  test("--version runs from the binary's own directory, the setup from the project", async () => {
    const { root, project, bin, tool } = await setup("version-cwd");
    assert.equal(tool(["add", "openspec", "--yes"], { STUB_VERSION: PINS.openspec }).status, 0);
    assert.equal(tool(["list"]).status, 0);
    const runs = (await read(path.join(root, "argv.log.cwd"))).trim().split("\n").map((l) => JSON.parse(l));
    // realpath on both sides: macOS tmpdir is /var but cwd is /private/var, and
    // Windows may hand back a short (8.3) or differently cased path.
    const real = (p) => realpathSync.native(p);
    const probes = runs.filter(([, first]) => first === "--version");
    // add's, then list's — one per registry tool.
    assert.equal(probes.filter(([b]) => b === "openspec").length, 2, JSON.stringify(runs));
    for (const [, , cwd] of probes) assert.equal(real(cwd), real(bin));
    // The contrast keeps the check honest: once confirmed, the setup does run in the project.
    const setupRun = runs.find(([, first]) => first === "init");
    assert.ok(setupRun, JSON.stringify(runs));
    assert.equal(real(setupRun[2]), real(project));
  });

  test("without a terminal and without --yes, nothing runs past --version", async () => {
    const { project, tool, calls } = await setup("no-tty");
    const r = tool(["add", "openspec"]);
    assert.equal(r.status, 1);
    assert.match(r.out, /--yes/);
    assert.deepEqual(await calls(), [["openspec", "--version"]]);
    assert.equal(existsSync(path.join(project, "AGENTS.md")), false);
  });

  test("--dry-run spawns nothing, not even --version", async () => {
    const { project, tool, calls } = await setup("dry");
    await writeFile(path.join(project, "AGENTS.md"), "# p\n");
    const r = tool(["add", "openspec", "--dry-run", "--yes"]);
    assert.equal(r.status, 0, r.out);
    assert.deepEqual(await calls(), []);
    assert.equal(await read(path.join(project, "AGENTS.md")), "# p\n");
    assert.match(r.out, /would add it/);
  });

  test("a missing binary prints the pinned install command, exits 1, writes nothing", async () => {
    const { root, project, tool } = await setup("missing");
    const empty = path.join(root, "empty");
    await mkdir(empty);
    const o = tool(["add", "openspec", "--yes"], {}, empty);
    assert.equal(o.status, 1);
    assert.match(o.out, new RegExp(`@fission-ai/openspec@${re(PINS.openspec)}`));
    const g = tool(["add", "graphify", "--yes"], {}, empty);
    assert.equal(g.status, 1);
    assert.match(g.out, new RegExp(`graphifyy==${re(PINS.graphify)}`));
    assert.match(g.out, /two y/);
    assert.deepEqual(await readdir(project), []);
  });

  test("a failed setup step stops before the block is written", async () => {
    const { project, tool } = await setup("fail");
    await writeFile(path.join(project, "AGENTS.md"), "# p\n");
    const r = tool(["add", "openspec", "--yes"], { STUB_FAIL: "init --tools claude,codex" });
    assert.equal(r.status, 1);
    assert.match(r.out, /exit 3/);
    assert.equal(await read(path.join(project, "AGENTS.md")), "# p\n");
  });

  test("a CLAUDE.md that appears during setup gets a loud warning", async () => {
    const { tool } = await setup("claude-md");
    const r = tool(["add", "openspec", "--yes"], { STUB_CLAUDE: "1" });
    assert.match(r.stderr, /!!.*CLAUDE\.md appeared during setup/);
  });

  test("the block is written after setup, onto whatever setup left in AGENTS.md", async () => {
    const { project, tool } = await setup("rewrite");
    await writeFile(path.join(project, "AGENTS.md"), "# p\n");
    assert.equal(tool(["add", "openspec", "--yes"], { STUB_REWRITE: "1" }).status, 0);
    const agentsMd = await read(path.join(project, "AGENTS.md"));
    assert.match(agentsMd, /^# p\ntool line\n\n<!-- agent-team-config:complements:start -->/);
  });

  for (const [label, eol] of [["LF", "\n"], ["CRLF", "\r\n"]]) {
    test(`add and remove twice leave a ${label} AGENTS.md byte-identical, specialists intact`, { skip: !gitDir }, async () => {
      const { home, project, tool } = await setup(`idem-${label}`, { git: true });
      const target = path.join(project, "AGENTS.md");
      await writeFile(target, ["# projeto", "", "instrucoes locais", ""].join(eol));
      assert.equal(run(["add", "maya"], { home, cwd: project }).status, 0);
      const before = await read(target);

      for (const name of ["openspec", "graphify"]) {
        const r = tool(["add", name, "--yes"]);
        assert.equal(r.status, 0, r.out);
      }
      const both = await read(target);
      assert.match(both, /\*\*maya\*\*/);
      assert.match(both, /\*\*graphify\*\*[\s\S]*\*\*openspec\*\*/);
      if (eol === "\r\n") assert.doesNotMatch(both, /(^|[^\r])\n/);

      for (let i = 0; i < 2; i++) {
        for (const name of ["openspec", "graphify"]) {
          const r = tool(["add", name, "--yes"]);
          assert.equal(r.status, 0, r.out);
          assert.equal(await read(target), both, `add ${name} run ${i + 1} changed the file`);
        }
      }

      assert.equal(tool(["remove", "graphify"]).status, 0);
      assert.doesNotMatch(await read(target), /\*\*graphify\*\*/);
      for (let i = 0; i < 2; i++) assert.equal(tool(["remove", "openspec"]).status, 0);
      // The last tool takes the block with it, and the file is back to what it was.
      assert.equal(await read(target), before);
      // remove never touches what the tool wrote.
      assert.ok(existsSync(path.join(project, "openspec")));
    });
  }

  test("graphify runs its preflight, then exactly hook install and update .", { skip: !gitDir }, async () => {
    const { project, tool, calls } = await setup("graphify-ok", { git: true });
    const r = tool(["add", "graphify", "--with-git-hooks", "--yes"], { STUB_VERSION: PINS.graphify });
    assert.equal(r.status, 0, r.out);
    assert.deepEqual(await calls(), [["graphify", "--version"], ["graphify", "hook", "install"], ["graphify", "update", "."]]);
    assert.doesNotMatch(r.out, /!!/);
    const agentsMd = await read(path.join(project, "AGENTS.md"));
    assert.match(agentsMd, /\*\*graphify\*\* — /);
    // Freshness guidance must reach the consuming project, within the 3-line budget.
    const rules = (await readTools()).get("graphify").rules;
    for (const rule of rules) assert.ok(agentsMd.includes(rule));
    assert.match(agentsMd, /git status --porcelain --untracked-files=normal/);
    assert.match(r.out, /WARNING: --with-git-hooks[\s\S]*before review/);
  });

  test("graphify defaults to manual updates, even with --yes and on repeated adds", { skip: !gitDir }, async () => {
    const { project, tool, calls } = await setup("graphify-manual", { git: true });
    const config = path.join(project, ".git", "config");
    const beforeConfig = await read(config);
    const hooksDir = path.join(project, ".git", "hooks");
    const beforeHooks = await readdir(hooksDir);
    for (let i = 0; i < 2; i++) {
      const r = tool(["add", "graphify", "--yes"], { STUB_VERSION: PINS.graphify });
      assert.equal(r.status, 0, r.out);
      assert.match(r.out, /no hooks or merge driver installed or removed/);
      assert.doesNotMatch(r.out, /hook install/);
    }
    assert.deepEqual(await calls(), [
      ["graphify", "--version"], ["graphify", "update", "."],
      ["graphify", "--version"], ["graphify", "update", "."],
    ]);
    assert.deepEqual(await readdir(hooksDir), beforeHooks);
    assert.equal(await read(config), beforeConfig);
    assert.equal(existsSync(path.join(project, ".gitattributes")), false);
    assert.match(await read(path.join(project, "AGENTS.md")), /git status --porcelain/);
  });

  test("manual setup preserves existing Git automation and warns about migration", { skip: !gitDir }, async () => {
    // Cover hooks alone, driver alone, and a hook manager independently.
    for (const mode of ["hooks", "driver", "custom-path", "husky"]) {
      const { project, tool, calls, env } = await setup(`graphify-migrate-${mode}`, { git: true });
      const custom = mode === "custom-path" || mode === "husky";
      const hooksDir = path.join(project, custom ? ".husky" : ".git/hooks");
      await mkdir(hooksDir, { recursive: true });
      if (custom) {
        assert.equal(spawnSync("git", ["-C", project, "config", "core.hooksPath", mode === "husky" ? ".husky/_" : ".husky"], { env: env() }).status, 0);
      }
      const files = [path.join(project, ".git/config"), path.join(project, ".gitattributes")];
      await writeFile(files[1], "graphify-out/graph.json merge=graphify\n");
      if (mode === "driver") {
        assert.equal(spawnSync("git", ["-C", project, "config", "merge.graphify.driver", "python -m graphify merge-driver %O %A %B"], { env: env() }).status, 0);
      } else {
        const hook = path.join(hooksDir, "post-commit");
        await writeFile(hook, "#!/bin/sh\necho mine\n# graphify-hook-start\nold\n# graphify-hook-end\n");
        files.push(hook);
      }
      const customHook = path.join(hooksDir, "post-checkout");
      await writeFile(customHook, "#!/bin/sh\necho custom\n");
      files.push(customHook);
      const before = await Promise.all(files.map(read));
      const r = tool(["add", "graphify", "--yes"]);
      assert.equal(r.status, 0, r.out);
      assert.match(r.stderr, /Existing graphify Git automation remains enabled/);
      assert.match(r.stderr, /No migration performed[\s\S]*graphify hook uninstall/);
      assert.deepEqual(await Promise.all(files.map(read)), before);
      assert.deepEqual(await calls(), [["graphify", "--version"], ["graphify", "update", "."]]);
    }
  });

  test("both Graphify modes require a repository root and git before setup", { skip: !gitDir }, async () => {
    for (const flags of [[], ["--with-git-hooks"]]) {
      for (const mode of ["no-git", "no-repo", "subdirectory"]) {
        const { root, project, bin, tool, calls, env } = await setup(`graphify-preflight-${flags.length}-${mode}`, { git: mode === "subdirectory" });
        if (mode === "subdirectory") {
          // Make the project a directory inside another repository.
          assert.equal(spawnSync("git", ["init", "-q", root], { env: env() }).status, 0);
          await rm(path.join(project, ".git"), { recursive: true });
        }
        const r = tool(["add", "graphify", ...flags, "--yes"], {}, mode === "no-git" ? bin : undefined);
        assert.equal(r.status, 1, r.out);
        assert.match(r.out, /needs git|Not a git repository|Run this from the repository root/);
        assert.deepEqual(await calls(), [["graphify", "--version"]]);
        assert.equal(existsSync(path.join(project, "AGENTS.md")), false);
      }
    }
  });

  test("--with-git-hooks is rejected outside tool add graphify before any tool runs", async () => {
    const { tool, calls } = await setup("graphify-flag-scope");
    for (const args of [["add", "openspec"], ["remove", "graphify"], ["list"]]) {
      const r = tool([...args, "--with-git-hooks", "--yes"]);
      assert.equal(r.status, 1, r.out);
      assert.match(r.out, /only valid for: canonkit tool add graphify/);
    }
    assert.deepEqual(await calls(), []);
  });

  test("--dry-run in either Graphify mode executes nothing", async () => {
    const { root, project, bin, tool, calls } = await setup("graphify-modes-dry");
    const fakeGit = path.join(root, "fake-git");
    await shim(fakeGit, "git", path.join(bin, "stub.cjs"));
    for (const flags of [[], ["--with-git-hooks"]]) {
      const r = tool(["add", "graphify", ...flags, "--dry-run"], {}, [bin, fakeGit].join(SEP));
      assert.equal(r.status, 0, r.out);
      assert.equal(/runs:.*hook install/.test(r.out), flags.length > 0);
    }
    assert.deepEqual(await calls(), []);
    assert.deepEqual(await readdir(project), []);
  });

  test("hook opt-in without --yes stops before installing hooks on a non-TTY", { skip: !gitDir }, async () => {
    const { tool, calls } = await setup("graphify-opt-in-confirm", { git: true });
    const r = tool(["add", "graphify", "--with-git-hooks"]);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /Trust every branch/);
    assert.match(r.out, /no terminal to confirm/);
    assert.deepEqual(await calls(), [["graphify", "--version"]]);
  });

  test("graphify does not install over an existing hook", { skip: !gitDir }, async () => {
    const { project, tool, calls } = await setup("graphify-hook", { git: true });
    const hook = path.join(project, ".git", "hooks", "post-commit");
    await writeFile(hook, "#!/bin/sh\necho mine\n");
    const r = tool(["add", "graphify", "--with-git-hooks", "--yes"]);
    assert.equal(r.status, 1);
    assert.match(r.out, /never overwrites a git hook/);
    assert.match(r.out, /graphify hook install/);
    assert.deepEqual(await calls(), [["graphify", "--version"]]);
    assert.equal(await read(hook), "#!/bin/sh\necho mine\n");
    assert.equal(existsSync(path.join(project, "AGENTS.md")), false);
  });

  test("every graphify run, --version and list included, has its user-skill rewrite switched off", { skip: !gitDir }, async () => {
    const { root, tool } = await setup("graphify-env", { git: true });
    assert.equal(tool(["add", "graphify", "--yes"]).status, 0);
    assert.equal(tool(["add", "graphify", "--with-git-hooks", "--yes"]).status, 0);
    assert.equal(tool(["list"]).status, 0);
    const runs = (await read(path.join(root, "argv.log.env"))).trim().split("\n").map((l) => JSON.parse(l));
    const graphify = runs.filter(([b]) => b === "graphify");
    assert.equal(graphify.length, 6); // manual add, hook opt-in add, list's --version
    assert.ok(graphify.every(([, v]) => v === "1"), JSON.stringify(graphify));
    // A registry value, not a global one: openspec's runs do not get it.
    assert.ok(runs.filter(([b]) => b === "openspec").every(([, v]) => v === null));
  });

  test("graphify accepts a hook that already carries its own block, keeping the user's lines", { skip: !gitDir }, async () => {
    const { project, tool } = await setup("graphify-chained", { git: true });
    const hook = path.join(project, ".git", "hooks", "post-commit");
    await writeFile(hook, "#!/bin/sh\necho mine\n# graphify-hook-start\nold\n# graphify-hook-end\n");
    const r = tool(["add", "graphify", "--with-git-hooks", "--yes"], { STUB_VERSION: PINS.graphify });
    assert.equal(r.status, 0, r.out);
    assert.doesNotMatch(r.stderr, /!!/);
    const after = await read(hook);
    assert.match(after, /echo mine/);
    assert.match(after, /# graphify-hook-start\nnew\n/);
  });

  test("a chained hook whose own lines graphify wiped is reported loudly", { skip: !gitDir }, async () => {
    const { project, tool } = await setup("graphify-wiped", { git: true });
    await writeFile(path.join(project, ".git", "hooks", "post-commit"), "#!/bin/sh\necho mine\n# graphify-hook-start\nold\n# graphify-hook-end\n");
    const r = tool(["add", "graphify", "--with-git-hooks", "--yes"], { STUB_WIPE_HOOK: "1" });
    assert.match(r.stderr, /git hook changed outside graphify's block: post-commit/);
  });

  test("graphify refuses a repo whose own files its hooks would import or run", { skip: !gitDir }, async () => {
    for (const flags of [[], ["--with-git-hooks"]]) {
      for (const [label, plant] of [
        ["package", (p) => mkdir(path.join(p, "graphify"))],
        ["module", (p) => writeFile(path.join(p, "graphify.py"), "")],
      ]) {
        const { project, tool, calls } = await setup(`graphify-shadow-${flags.length}-${label}`, { git: true });
        await plant(project);
        const r = tool(["add", "graphify", ...flags, "--yes"]);
        assert.equal(r.status, 1, label);
        assert.match(r.out, /would be imported by graphify's hooks/);
        assert.deepEqual(await calls(), [["graphify", "--version"]]);
      }

      const { project, tool, env } = await setup(`graphify-pinned-python-${flags.length}`, { git: true });
      await mkdir(path.join(project, "graphify-out"));
      await writeFile(path.join(project, "graphify-out", ".graphify_python"), "/tmp/evil\n");
      spawnSync("git", ["-C", project, "add", "-f", "graphify-out/.graphify_python"], { env: env() });
      const r = tool(["add", "graphify", ...flags, "--yes"]);
      assert.equal(r.status, 1);
      assert.match(r.out, /\.graphify_python is committed/);
    }
  });

  test("a failed manual update preserves the project block and reports no hook installation", { skip: !gitDir }, async () => {
    const { project, tool, calls } = await setup("graphify-manual-fail", { git: true });
    const file = path.join(project, "AGENTS.md");
    await writeFile(file, "# project rules\n");
    const r = tool(["add", "graphify", "--yes"], { STUB_FAIL: "update ." });
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /canonkit did not change AGENTS\.md/);
    assert.doesNotMatch(r.out, /Already done:|To undo it:/);
    assert.equal(await read(file), "# project rules\n");
    assert.deepEqual(await calls(), [["graphify", "--version"], ["graphify", "update", "."]]);
    assert.equal(existsSync(path.join(project, ".git/hooks/post-commit")), false);
  });

  test("a binary found only inside the project is named as such, not as missing", async () => {
    const { root, project, tool } = await setup("inside-only");
    const venv = path.join(project, ".venv", "bin");
    await shim(venv, "graphify", path.join(root, "bin", "stub.cjs"));
    const r = tool(["add", "graphify", "--with-git-hooks", "--yes"], {}, venv);
    assert.equal(r.status, 1);
    assert.match(r.out, /found only inside the project/);
    assert.match(r.out, /graphifyy==/);
  });

  test("a change graphify makes to a hook that was already there is reported loudly", { skip: !gitDir }, async () => {
    const { project, tool } = await setup("graphify-touch", { git: true });
    await writeFile(path.join(project, ".git", "hooks", "pre-push"), "#!/bin/sh\n");
    const r = tool(["add", "graphify", "--with-git-hooks", "--yes"], { STUB_TOUCH_HOOK: "1" });
    assert.match(r.stderr, /git hook changed: pre-push/);
  });

  test("a step failing after an earlier one succeeded says what was done and how to undo it", { skip: !gitDir }, async () => {
    const { project, tool } = await setup("graphify-partial", { git: true });
    const r = tool(["add", "graphify", "--with-git-hooks", "--yes"], { STUB_FAIL: "update ." });
    assert.equal(r.status, 1);
    assert.match(r.out, /canonkit did not change AGENTS\.md/);
    assert.match(r.out, /Already done: graphify hook install/);
    assert.match(r.out, /To undo it: graphify hook uninstall/);
    assert.equal(existsSync(path.join(project, "AGENTS.md")), false);
  });

  test("a graphify dry run spawns nothing, git included", async () => {
    const { root, project, bin, tool, calls } = await setup("graphify-dry");
    // A git that logs like the tools do: if the preflight ran, it would show.
    const fakeGit = path.join(root, "fake-git");
    await shim(fakeGit, "git", path.join(bin, "stub.cjs"));
    const r = tool(["add", "graphify", "--with-git-hooks", "--dry-run"], {}, [bin, fakeGit].join(SEP));
    assert.equal(r.status, 0, r.out);
    assert.deepEqual(await calls(), []);
    assert.deepEqual(await readdir(project), []);
  });

  test("an AGENTS.md that is a symlink is written through, not replaced", async (t) => {
    const { project, tool } = await setup("symlinked");
    const shared = path.join(project, "shared.md");
    await writeFile(shared, "# shared\n");
    try {
      await symlink("shared.md", path.join(project, "AGENTS.md"), "file");
    } catch {
      t.skip("this machine cannot create file symlinks");
      return;
    }
    assert.equal(tool(["add", "openspec", "--yes"]).status, 0);
    assert.ok((await lstat(path.join(project, "AGENTS.md"))).isSymbolicLink());
    assert.match(await read(shared), /\*\*openspec\*\*/);
  });

  test("tools added before a specialist come out without leaving a trace", async () => {
    const { home, project, tool } = await setup("order");
    const target = path.join(project, "AGENTS.md");
    await writeFile(target, "# p\n");
    assert.equal(run(["add", "maya"], { home, cwd: project }).status, 0);
    const onlySpecialist = await read(target);
    assert.equal(run(["remove", "maya"], { home, cwd: project }).status, 0);

    assert.equal(tool(["add", "openspec", "--yes"]).status, 0);
    assert.equal(run(["add", "maya"], { home, cwd: project }).status, 0);
    assert.equal(tool(["remove", "openspec"]).status, 0);
    // Same bytes as if the tool had never been added.
    assert.equal(await read(target), onlySpecialist);
  });

  test("graphify does not install when core.hooksPath is set", { skip: !gitDir }, async () => {
    const { project, tool, calls, env } = await setup("graphify-hookspath", { git: true });
    spawnSync("git", ["-C", project, "config", "core.hooksPath", ".husky"], { env: env() });
    const r = tool(["add", "graphify", "--with-git-hooks", "--yes"]);
    assert.equal(r.status, 1);
    assert.match(r.out, /core\.hooksPath is set/);
    assert.deepEqual(await calls(), [["graphify", "--version"]]);
  });

  test("a hook graphify did not announce is reported loudly", { skip: !gitDir }, async () => {
    const { tool } = await setup("graphify-extra", { git: true });
    const r = tool(["add", "graphify", "--with-git-hooks", "--yes"], { STUB_EXTRA_HOOK: "1" });
    assert.match(r.stderr, /unexpected new git hook: pre-push/);
  });

  test("a binary planted in the project is not the one run", async () => {
    const { root, project, bin, tool, calls } = await setup("planted");
    const planted = path.join(root, "planted.cjs");
    await writeFile(planted, `require("fs").writeFileSync(${JSON.stringify(path.join(root, "PLANTED"))}, "ran");\n`);
    await shim(project, "openspec", planted);
    const r = tool(["add", "openspec", "--yes"], {}, [project, ".", "", bin].join(SEP));
    assert.equal(r.status, 0, r.out);
    assert.equal(existsSync(path.join(root, "PLANTED")), false);
    assert.equal((await calls()).length, 2);
  });

  test("an installed version off the pin is a warning, never an update", async () => {
    const { tool, calls } = await setup("off-pin");
    const r = tool(["add", "openspec", "--yes"], { STUB_VERSION: "0.0.1" });
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, new RegExp(`0\\.0\\.1 — canonkit pins ${re(PINS.openspec)}`));
    assert.equal((await calls()).length, 2);
  });

  test("list shows each pin, the version on PATH, and what is active here", async () => {
    const { tool } = await setup("list");
    assert.equal(tool(["add", "openspec", "--yes"], { STUB_VERSION: "9.9.9" }).status, 0);
    const r = tool(["list"], { STUB_VERSION: "9.9.9" });
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, new RegExp(`openspec +pin ${re(PINS.openspec)} +installed 9\\.9\\.9 +active`));
    assert.match(r.out, /graphify +pin \S+ +installed 9\.9\.9 +-/);
  });

  test("refuses an unknown tool, a bad shape, and the source of truth", async () => {
    const { home, tool } = await setup("refuse");
    assert.match(tool(["add", "nothing", "--yes"]).out, /Not a canonkit tool/);
    assert.equal(tool(["add"]).status, 1);
    assert.equal(tool(["add", "openspec", "graphify"]).status, 1);
    const self = run(["tool", "add", "openspec", "--yes"], { home, cwd: REPO });
    assert.equal(self.status, 1);
    assert.match(self.out, /source of truth/);
  });

  test("canonkit list points at tool list", async () => {
    const { home, project } = await scratch("list-pointer");
    assert.match(run(["list"], { home, cwd: project }).out, /canonkit tool list/);
  });
});

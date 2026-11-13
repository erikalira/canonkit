/**
 * Contract tests for the installer: roster, install, skills and the per-runtime agents and reference blocks.
 *
 * These run the real CLI against a real filesystem in a throwaway HOME. No
 * mocks: the failure this installer can actually cause is writing the wrong
 * bytes to a file you already had, and a mocked fs proves nothing about that.
 * Shared fixtures: test/helpers/cli-fixtures.js.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { rm, mkdir, readFile, writeFile, readdir, cp } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import prompts from "prompts";
import { REPO, isolatedEnv } from "../helpers/cli-harness.js";
import { CORE, OC_ASKS, SPECIALISTS, scratch, run, opencodeOnPath, snapshot, read, codexCommand, runIn, ours, backups } from "../helpers/cli-fixtures.js";
import { applyBlock, chooseTargets, readAgents, parseAgent, summaries, HOOK_FILES, codexAgent, copilotAgent, renderRoutingBlock } from "../../bin/cli.js";


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
${extra}need: standard
---

body
`;
    assert.throws(() => parseAgent("zed.md", file("")), /authority is 'missing'/);
    assert.throws(() => parseAgent("zed.md", file("authority: vetoes\n")), /authority is 'vetoes'/);
    assert.equal(parseAgent("zed.md", file("authority: blocks\n")).authority, "blocks");
    // Core agents are not required to declare it.
    assert.doesNotThrow(() => parseAgent("zed.md", file("").replace("specialist", "core")));
  });

  test("every agent declares a vendor-neutral need level", async () => {
    const needs = Object.fromEntries((await readAgents()).map((a) => [a.name, a.need]));
    for (const [name, need] of Object.entries(needs)) {
      assert.equal(need, ["archie", "iris"].includes(name) ? "deep" : "standard", name);
    }
  });

  test("need is required, closed, and replaces the legacy model field", () => {
    const file = (front) => `---\nname: zed\ndescription: x\ntier: core\n${front}---\n\nbody\n`;
    for (const need of ["light", "standard", "deep"]) assert.equal(parseAgent("zed.md", file(`need: ${need}\n`)).need, need);
    assert.throws(() => parseAgent("zed.md", file("")), /need is 'missing'/);
    assert.throws(() => parseAgent("zed.md", file("need: heavy\n")), /need is 'heavy' — expected light, standard, deep/);
    assert.throws(() => parseAgent("zed.md", file("model: opus\n")), /'model:' is no longer accepted — replace it with need:/);
    assert.throws(() => parseAgent("zed.md", file("need: deep\nmodel: opus\n")), /replace it with need:/);
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
    assert.deepEqual(await chooseTargets(["--opencode"], { interactive: true }), ["opencode"]);
    assert.deepEqual(await chooseTargets(["--opencode", "--claude"], { interactive: true }), ["claude", "opencode"]);
    assert.deepEqual(await chooseTargets(["--copilot"], { interactive: true }), ["copilot"]);
    assert.deepEqual(await chooseTargets(["--copilot", "--codex"], { interactive: true }), ["codex", "copilot"]);
  });

  test("no terminal and no flag installs both, as before the menu", async () => {
    // OpenCode is opt-in: its global AGENTS.md ends its fallback to ~/.claude/CLAUDE.md.
    assert.deepEqual(await chooseTargets([], { interactive: false }), ["claude", "codex"]);
  });

  test("in a terminal the menu's selection is returned", async () => {
    let config;
    const ask = async (question) => { config = question; return { targets: ["claude"] }; };
    assert.deepEqual(await chooseTargets([], { interactive: true, prompt: ask }), ["claude"]);
    assert.equal(config.min, 1);
    assert.equal(config.hint, "space selects, enter confirms. Pick at least one.");
    assert.ok(config.choices.every((choice) => choice.selected === false));
    assert.equal(await chooseTargets([], { interactive: true, prompt: async () => ({ targets: [] }) }), null);
    assert.deepEqual(await chooseTargets([], { interactive: false }), ["claude", "codex"]);
  });

  test("a cancelled menu returns null, so nothing is installed", async () => {
    prompts.inject([new Error("cancelled")]);
    assert.equal(await chooseTargets([], { interactive: true }), null);
  });
});


describe("install", () => {
  test("copies the core team to ~/.claude/agents and nothing else", async () => {
    const { home } = await scratch("install-basic");
    const result = run(["install"], { home });
    assert.equal(result.status, 0, result.out);

    const dest = path.join(home, ".claude", "agents");
    const installed = (await readdir(dest)).filter((f) => f.endsWith(".md")).map((f) => path.basename(f, ".md")).sort();
    assert.deepEqual(installed, [...CORE].sort(), `wrong contents in ${dest}`);
    // No harness reads ~/.agents/<agent>.md, so install no longer writes it.
    // (~/.agents/skills/ still exists: the default install includes Codex.)
    const leftover = existsSync(path.join(home, ".agents")) ? (await readdir(path.join(home, ".agents"))).filter((f) => f.endsWith(".md")) : [];
    assert.deepEqual(leftover, []);
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
    assert.equal(existsSync(path.join(home, ".agents", "archie.md")), false);
    assert.ok(existsSync(path.join(home, ".claude", "CLAUDE.md")));
    assert.equal(existsSync(path.join(home, ".codex")), false);
    assert.equal(existsSync(path.join(home, ".agents", "skills")), false);
  });

  test("--copilot installs native user profiles and Copilot skills only", async () => {
    const { home } = await scratch("install-copilot-only");
    const result = run(["install", "--copilot"], { home });
    assert.equal(result.status, 0, result.out);

    const agents = await readAgents();
    const dest = path.join(home, ".copilot", "agents");
    const files = (await readdir(dest)).sort();
    assert.deepEqual(files, CORE.map((name) => `${name}.agent.md`).sort());
    assert.equal(await read(path.join(dest, "bob.agent.md")), copilotAgent(agents.find((agent) => agent.name === "bob")));
    assert.match(await read(path.join(dest, "bob.agent.md")), /^---\n(?:# Generated by canonkit[^\n]*\n)?name: bob\ndescription: ".+"\n---\n/);
    assert.equal(await read(path.join(home, ".copilot", "skills", "orchestrate", "SKILL.md")),
      await read(path.join(REPO, "skills", "orchestrate", "SKILL.md")));
    assert.match(await read(path.join(home, "AGENTS.md")), /<!-- agent-team-config:start -->/);
    for (const dir of [".claude", ".codex", ".config", ".agents"]) {
      assert.equal(existsSync(path.join(home, dir)), false, `Copilot-only install wrote ${dir}`);
    }
  });

  test("--wire-hooks with --codex wires the Codex hook and writes nothing under ~/.claude", async () => {
    const { home } = await scratch("install-codex-wire");
    const result = run(["install", "--codex", "--wire-hooks"], { home });
    assert.equal(result.status, 0, result.out);
    const dir = path.join(home, ".codex", "canonkit");
    assert.deepEqual((await readdir(dir)).sort(), [...HOOK_FILES.codex].sort());
    for (const f of HOOK_FILES.codex) {
      assert.ok((await readFile(path.join(dir, f))).equals(await readFile(path.join(REPO, "hooks", f))), `${f} is not the package's bytes`);
    }
    const { hooks } = JSON.parse(await read(path.join(home, ".codex", "hooks.json")));
    assert.deepEqual(hooks, { PreToolUse: [{ matcher: "Bash|apply_patch", hooks: [{ type: "command", command: codexCommand(home) }] }] });
    assert.match(result.out, /run \/hooks in Codex/);
    assert.equal(existsSync(path.join(home, ".claude")), false, "a Codex-only install wrote under ~/.claude");
  });

  test("--claude --wire-hooks writes nothing under ~/.codex or ~/.config", async () => {
    const { home } = await scratch("install-claude-wire");
    const result = run(["install", "--claude", "--wire-hooks"], { home });
    assert.equal(result.status, 0, result.out);
    assert.ok(existsSync(path.join(home, ".claude", "settings.json")));
    assert.equal(existsSync(path.join(home, ".codex")), false);
    assert.equal(existsSync(path.join(home, ".config")), false);
  });

  test("--claude --opencode --wire-hooks wires both, and nothing under ~/.codex", async () => {
    const { root, home } = await scratch("install-claude-opencode-wire");
    const result = run(["install", "--claude", "--opencode", "--wire-hooks"], { home, env: await opencodeOnPath(root, "v2.1.4") });
    assert.equal(result.status, 0, result.out);
    assert.ok(existsSync(path.join(home, ".claude", "settings.json")));
    assert.ok(existsSync(path.join(home, ".config", "opencode", "plugins", "canonkit.js")));
    assert.ok(existsSync(path.join(home, ".config", "opencode", "opencode.json")));
    assert.equal(existsSync(path.join(home, ".codex")), false);
  });

  test("--claude and --codex are refused outside install and reference", async () => {
    const { home } = await scratch("install-target-flag-misuse");
    const result = run(["list", "--codex"], { home });
    assert.equal(result.status, 1, result.out);
    assert.match(result.out, /only valid for: canonkit install, canonkit reference/);
    assert.match(run(["add", "maya", "--opencode"], { home }).out, /only valid for: canonkit install, canonkit reference/);
  });

  test("--opencode writes the OpenCode half and nothing under ~/.claude or ~/.codex", async () => {
    const { home } = await scratch("install-opencode-only");
    const result = run(["install", "--opencode"], { home });
    assert.equal(result.status, 0, result.out);

    const mds = (await readdir(path.join(home, ".config", "opencode", "agents"))).map((f) => path.basename(f, ".md")).sort();
    assert.deepEqual(mds, [...CORE].sort());
    assert.match(await read(path.join(home, ".config", "opencode", "AGENTS.md")), /<!-- agent-team-config:opencode:start -->/);
    // Skills through the runtime-neutral path, which OpenCode reads natively.
    assert.ok(existsSync(path.join(home, ".agents", "skills", "orchestrate", "SKILL.md")));
    assert.match(await read(path.join(home, "AGENTS.md")), /<!-- agent-team-config:start -->/);
    assert.equal(existsSync(path.join(home, ".claude")), false, "an OpenCode-only install wrote under ~/.claude");
    assert.equal(existsSync(path.join(home, ".codex")), false);
    assert.deepEqual((await readdir(path.join(home, ".agents"))).filter((f) => f.endsWith(".md")), []);
  });

  test("without --opencode nothing is written for OpenCode", async () => {
    const { home } = await scratch("install-no-opencode");
    assert.equal(run(["install"], { home }).status, 0);
    assert.equal(existsSync(path.join(home, ".config")), false);
  });

  test("--wire-hooks with --opencode wires the plugin and the asks, and nothing under ~/.claude or ~/.codex", async () => {
    const { root, home } = await scratch("install-opencode-wire");
    const result = run(["install", "--opencode", "--wire-hooks"], { home, env: await opencodeOnPath(root, "v2.1.4") });
    assert.equal(result.status, 0, result.out);
    const oc = path.join(home, ".config", "opencode");
    const dir = path.join(oc, "canonkit");
    assert.deepEqual((await readdir(dir)).sort(), [...HOOK_FILES.opencode].sort());
    for (const f of HOOK_FILES.opencode) {
      assert.ok((await readFile(path.join(dir, f))).equals(await readFile(path.join(REPO, "hooks", f))), `${f} is not the package's bytes`);
    }
    assert.deepEqual(await readdir(path.join(oc, "plugins")), ["canonkit.js"]);
    assert.ok((await readFile(path.join(oc, "plugins", "canonkit.js"))).equals(await readFile(path.join(REPO, "hooks", "opencode-plugin.mjs"))));
    assert.deepEqual(JSON.parse(await read(path.join(oc, "opencode.json"))), { permissions: OC_ASKS });
    assert.equal(existsSync(path.join(home, ".claude")), false, "an OpenCode-only install wrote under ~/.claude");
    assert.equal(existsSync(path.join(home, ".codex")), false);
  });

  test("--opencode --wire-hooks refuses before writing anything", async () => {
    const cases = [
      ["opencode.jsonc", { version: "v2.1.4", files: { "opencode.jsonc": "{ // mine\n}\n" } }, /opencode\.jsonc exists/],
      ["invalid JSON", { version: "v2.1.4", files: { "opencode.json": '{ "a": 1, }' } }, /is not plain JSON/],
      ["not an object", { version: "v2.1.4", files: { "opencode.json": "[]" } }, /is not a JSON object/],
      ["permissions not a list", { version: "v2.1.4", files: { "opencode.json": '{ "permissions": { "shell": "ask" } }' } }, /"permissions" that is not an array/],
      ["a permissions entry not an object", { version: "v2.1.4", files: { "opencode.json": '{ "permissions": ["shell"] }' } }, /"permissions" entry that is not an object/],
      ["OpenCode 1", { version: "1.14.2" }, /OpenCode is 1\.14\.2.*OpenCode 2 or later.*upgrade OpenCode/],
      ["no version", { version: "opencode dev build" }, /printed no version/],
      ["not on PATH", { version: null }, /not on PATH.*install OpenCode 2 or put it on PATH/],
    ];
    for (const [name, { version, files = {} }, why] of cases) {
      const { root, home } = await scratch(`install-opencode-wire-refuse-${name.replace(/\W+/g, "-")}`);
      const oc = path.join(home, ".config", "opencode");
      await mkdir(oc, { recursive: true });
      for (const [f, body] of Object.entries(files)) await writeFile(path.join(oc, f), body);
      const before = await snapshot(home);
      const result = run(["install", "--opencode", "--wire-hooks"], { home, env: await opencodeOnPath(root, version) });
      assert.equal(result.status, 1, `${name}: ${result.out}`);
      assert.match(result.out, why, name);
      assert.match(result.out, /Nothing was written/, name);
      assert.deepEqual(await snapshot(home), before, `${name}: something was written`);
    }
  });

  test("--opencode --wire-hooks appends the asks after every rule of the user's, once", async () => {
    const { root, home } = await scratch("install-opencode-wire-merge");
    const env = await opencodeOnPath(root, "v2.1.4");
    const oc = path.join(home, ".config", "opencode");
    await mkdir(oc, { recursive: true });
    const file = path.join(oc, "opencode.json");
    const mine = {
      $schema: "https://opencode.ai/config.json",
      permission: { bash: "ask" },
      permissions: [{ action: "shell", resource: "*", effect: "allow" }, { action: "read", resource: "*", effect: "allow" }],
      model: "x/y",
    };
    const original = JSON.stringify(mine, null, 4) + "\n";
    await writeFile(file, original);

    const first = run(["install", "--opencode", "--wire-hooks"], { home, env });
    assert.equal(first.status, 0, first.out);
    const after = JSON.parse(await read(file));
    // V1 `permission` is left alone: OpenCode puts it before every V2 rule.
    assert.deepEqual(after, { ...mine, permissions: [...mine.permissions, ...OC_ASKS] });
    assert.match(await read(file), /\n {4}"permissions"/, "the file's own indentation was not kept");
    const baks = (await readdir(oc)).filter((f) => f.endsWith(".bak"));
    assert.equal(baks.length, 1, baks.join(", "));
    assert.equal(await read(path.join(oc, baks[0])), original);

    const bytes = await read(file);
    const second = run(["install", "--opencode", "--wire-hooks"], { home, env });
    assert.equal(second.status, 0, second.out);
    assert.match(second.out, /already in effect/);
    assert.equal(await read(file), bytes);
    assert.equal((await readdir(oc)).filter((f) => f.endsWith(".bak")).length, 1, "a run that changed nothing made a backup");
  });

  test("--opencode --wire-hooks moves its asks past a later rule that allows shell calls", async () => {
    const { root, home } = await scratch("install-opencode-wire-override");
    const oc = path.join(home, ".config", "opencode");
    await mkdir(oc, { recursive: true });
    const allowAll = { action: "*", resource: "*", effect: "allow" };
    const read1 = { action: "read", resource: "*", effect: "allow" };
    await writeFile(path.join(oc, "opencode.json"), JSON.stringify({ permissions: [...OC_ASKS, allowAll, read1] }));
    const result = run(["install", "--opencode", "--wire-hooks"], { home, env: await opencodeOnPath(root, "v2.1.4") });
    assert.equal(result.status, 0, result.out);
    assert.match(result.out, /moved to the end/);
    assert.deepEqual(JSON.parse(await read(path.join(oc, "opencode.json"))).permissions, [allowAll, read1, ...OC_ASKS]);
  });

  test("--opencode --wire-hooks --dry-run writes nothing, starts no opencode, and says what it would add", async () => {
    const { root, home } = await scratch("install-opencode-wire-dry");
    // No opencode on PATH: a dry run that ran --version would refuse.
    const result = run(["install", "--opencode", "--wire-hooks", "--dry-run"], { home, env: await opencodeOnPath(root, null) });
    assert.equal(result.status, 0, result.out);
    assert.match(result.out, /not run in a dry run/);
    assert.match(result.out, /would add the git commit\/push asks/);
    assert.deepEqual(await readdir(home), []);
  });

  test("--opencode --wire-hooks never turns a deny into an ask", async () => {
    const allowAll = { action: "shell", resource: "*", effect: "allow" };
    const denyForce = { action: "shell", resource: "git push --force*", effect: "deny" };
    const cases = [
      // A deny after the asks keeps them in effect: they stay where they are.
      ["deny after the asks", { permissions: [allowAll, ...OC_ASKS, denyForce] }, /already in effect/],
      // Appending after a deny would let `git push *` ask win over it.
      ["deny before where they would go", { permissions: [allowAll, denyForce] }, /were not added[\s\S]*before your deny rules/],
      ["a deny of every shell call", { permissions: [{ action: "shell", resource: "*", effect: "deny" }] }, /were not added/],
      // OpenCode puts V1 rules before every V2 one.
      ["a V1 bash deny", { permission: { bash: { "*": "allow", "git push --force*": "deny" } } }, /were not added/],
    ];
    for (const [name, config, said] of cases) {
      const { root, home } = await scratch(`install-opencode-wire-deny-${name.replace(/\W+/g, "-")}`);
      const oc = path.join(home, ".config", "opencode");
      await mkdir(oc, { recursive: true });
      const file = path.join(oc, "opencode.json");
      await writeFile(file, JSON.stringify(config));
      const result = run(["install", "--opencode", "--wire-hooks"], { home, env: await opencodeOnPath(root, "v2.1.4") });
      assert.equal(result.status, 0, `${name}: ${result.out}`);
      assert.match(result.out, said, name);
      assert.equal(await read(file), JSON.stringify(config), `${name}: opencode.json was rewritten`);
      // The gates the plugin enforces are wired either way.
      assert.ok(existsSync(path.join(oc, "plugins", "canonkit.js")), name);
    }
  });

  test("an OpenCode refusal stops the Claude Code half too", async () => {
    const { root, home } = await scratch("install-claude-opencode-wire-refuse");
    const oc = path.join(home, ".config", "opencode");
    await mkdir(oc, { recursive: true });
    await writeFile(path.join(oc, "opencode.jsonc"), "{}\n");
    const before = await snapshot(home);
    const result = run(["install", "--claude", "--opencode", "--wire-hooks"], { home, env: await opencodeOnPath(root, "v2.1.4") });
    assert.equal(result.status, 1, result.out);
    assert.deepEqual(await snapshot(home), before);
  });

  test("--opencode --wire-hooks finds an opencode under home when run from home, never one in the project", async () => {
    const { home, project } = await scratch("install-opencode-wire-lookup");
    // %APPDATA%\npm and ~/.local/bin are under home: run from there, they still count.
    const fromHome = run(["install", "--opencode", "--wire-hooks", "--no-reference"], { home, env: await opencodeOnPath(path.join(home, "AppData"), "v2.1.4") });
    assert.equal(fromHome.status, 0, fromHome.out);
    // npx puts <project>/node_modules/.bin first on PATH, where a planted binary sits.
    const planted = run(["install", "--opencode", "--wire-hooks", "--no-reference"], { home, cwd: project, env: await opencodeOnPath(path.join(project, "node_modules"), "v2.1.4") });
    assert.equal(planted.status, 1, planted.out);
    assert.match(planted.out, /not on PATH/);
  });

  test("a plain --opencode install refreshes the OpenCode hook only where it was wired", async () => {
    const { root, home } = await scratch("install-opencode-refresh");
    const oc = path.join(home, ".config", "opencode");
    assert.equal(run(["install", "--opencode"], { home }).status, 0);
    assert.equal(existsSync(path.join(oc, "canonkit")), false, "a copy nothing runs was installed");
    assert.equal(existsSync(path.join(oc, "plugins")), false);

    assert.equal(run(["install", "--opencode", "--wire-hooks"], { home, env: await opencodeOnPath(root, "v2.1.4") }).status, 0);
    const plugin = path.join(oc, "plugins", "canonkit.js");
    await writeFile(plugin, "// edited\n");
    await rm(path.join(oc, "canonkit", "canonkit-hook.js"));
    // No opencode on PATH (a folder of its own, not the one shimmed above): only
    // --wire-hooks reads the version.
    const result = run(["install", "--opencode"], { home, env: await opencodeOnPath(path.join(root, "none"), null) });
    assert.equal(result.status, 0, result.out);
    assert.ok((await readFile(plugin)).equals(await readFile(path.join(REPO, "hooks", "opencode-plugin.mjs"))));
    const backupDir = path.join(home, ".canonkit", "backups");
    const copies = await Promise.all((await readdir(backupDir)).map((file) => read(path.join(backupDir, file))));
    assert.ok(copies.includes("// edited\n"), "the edited plugin is preserved outside the auto-loaded plugins folder");
    assert.equal(existsSync(`${plugin}.local.bak`), false);
    assert.ok(existsSync(path.join(oc, "canonkit", "canonkit-hook.js")));
  });

  test("the installed OpenCode plugin loads under parent ESM and gates captured commands with resolved shell metadata", async () => {
    const { root, home } = await scratch("install-opencode-esm-parent");
    const oc = path.join(home, ".config", "opencode");
    await mkdir(oc, { recursive: true });
    // OpenCode's config folder often holds a package.json for plugin deps.
    await writeFile(path.join(oc, "package.json"), '{ "type": "module" }\n');
    assert.equal(run(["install", "--opencode", "--wire-hooks"], { home, env: await opencodeOnPath(root, "v2.1.4") }).status, 0);

    const mod = await import(pathToFileURL(path.join(oc, "plugins", "canonkit.js")).href);
    assert.deepEqual(Object.keys(mod), ["default"]);
    const hooks = [];
    await mod.default.setup({
      location: { directory: root },
      tool: { hook: async (name, cb) => { hooks.push([name, cb]); } },
      shell: { hook: async (name, cb) => { hooks.push([`shell.${name}`, cb]); } },
    });
    assert.deepEqual(hooks.map(([n]) => n), ["execute.before", "shell.create.before"]);
    const capture = (f) => JSON.parse(readFileSync(path.join(REPO, "test", "fixtures", "opencode", f), "utf8")).event;
    // The original captures are tool events. The shell invocation contract is
    // synthetic here, with the executable/cwd that OpenCode resolves at runtime.
    const invocation = (f) => ({ command: capture(f).input.command, cwd: root, shell: "powershell.exe" });
    assert.doesNotThrow(() => hooks[0][1](capture("shell-git-commit-no-verify.json")));
    assert.throws(() => hooks[1][1](invocation("shell-git-commit-no-verify.json")), /skips the repository/);
    assert.doesNotThrow(() => hooks[1][1](invocation("shell-git-commit.json")));
    assert.throws(() => hooks[0][1]({ tool: "write", input: { path: "key.pem", content: "-----BEGIN RSA PRIVATE " + "KEY-----" } }), /high-confidence secret/);
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

  test("reports and preserves an untracked specialist left at user level", async () => {
    // No manifest proves ownership of this preexisting copy or its local edits.
    const { home } = await scratch("install-stray");
    const dest = path.join(home, ".claude", "agents");
    await mkdir(dest, { recursive: true });
    await writeFile(path.join(dest, "maya.md"), "stale copy");
    await writeFile(path.join(dest, "unrelated.md"), "not ours");

    const result = run(["install"], { home });
    assert.equal(result.status, 0, result.out);
    assert.equal(await read(path.join(dest, "maya.md")), "stale copy");
    assert.match(result.out, /preserved untracked global specialist/);
    // Anything this repo does not own is left alone.
    assert.ok(existsSync(path.join(dest, "unrelated.md")));
  });

  test("removes the 2.0 ~/.agents copies that are identical, keeps edited and unrelated ones", async () => {
    const { home } = await scratch("install-agents-leftovers");
    const dir = path.join(home, ".agents");
    await mkdir(dir, { recursive: true });
    const source = (name) => readFileSync(path.join(REPO, "agents", `${name}.md`), "utf8");
    await writeFile(path.join(dir, "scott.md"), source("scott"));
    await writeFile(path.join(dir, "bob.md"), source("bob").replace(/\r?\n/g, "\r\n"));
    await writeFile(path.join(dir, "gard.md"), source("gard") + "\nmy edit\n");
    await writeFile(path.join(dir, "notes.md"), "mine");

    const dry = run(["install", "--dry-run"], { home });
    assert.equal(dry.status, 0, dry.out);
    assert.ok(existsSync(path.join(dir, "scott.md")), "a dry run deletes nothing");

    const result = run(["install"], { home });
    assert.equal(result.status, 0, result.out);
    assert.ok(!existsSync(path.join(dir, "scott.md")));
    assert.ok(!existsSync(path.join(dir, "bob.md")), "line endings do not make a copy different");
    assert.equal(await read(path.join(dir, "gard.md")), source("gard") + "\nmy edit\n");
    assert.equal(await read(path.join(dir, "notes.md")), "mine");
    assert.match(result.out, /kept .*gard\.md: differs/);
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

  test("default source instruction profiles stay within 3000 words", async () => {
    // Source-derived default profile: the two managed blocks, core agent
    // descriptions and every shipped skill description. There are currently no
    // default command descriptions or kit-installed MCP instructions; update
    // this profile if installation adds either. On-demand bodies are excluded.
    const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
    const agents = (await readAgents()).filter((a) => a.tier === "core");
    const skillDirs = await readdir(path.join(REPO, "skills"), { withFileTypes: true });
    const descriptions = [];
    for (const entry of skillDirs.filter((e) => e.isDirectory())) {
      const skill = await read(path.join(REPO, "skills", entry.name, "SKILL.md"));
      const description = skill.match(/^description:\s*(.+)$/m);
      assert.ok(description, `${entry.name}: missing description`);
      descriptions.push(description[1]);
    }
    for (const [runtime, adapter] of [["Claude", "routing"], ["Codex", "codex"], ["OpenCode", "opencode"]]) {
      const blocks = await Promise.all(["agents-block.md", `${adapter}-block.md`].map((f) => read(path.join(REPO, "reference", f))));
      const rendered = runtime === "Claude" ? [blocks[0], renderRoutingBlock(blocks[1], false)] : blocks;
      const counts = [...rendered.map(words), ...agents.map((a) => words(a.description)), ...descriptions.map(words)];
      const total = counts.reduce((a, b) => a + b, 0);
      assert.ok(total <= 3000, `default ${runtime} source profile: ${total} words, limit 3000`);
    }
  });

  for (const [runtime, root] of [["claude", ".claude"], ["codex", ".agents"], ["opencode", ".agents"]]) {
    test(`incidental-finding procedure distributes and preserves user files for ${runtime}`, async () => {
      const { home, project } = await scratch(`incidental-findings-${runtime}`);
      const skillDir = path.join(home, root, "skills", "orchestrate");
      const procedure = path.join(skillDir, "out-of-scope-issues.md");
      const personalNotes = "# Personal instructions\nKeep my notes.\n";
      const projectNotes = "# Project instructions\nKeep the project scope.\n";
      await writeFile(path.join(home, "AGENTS.md"), personalNotes);
      await writeFile(path.join(project, "AGENTS.md"), projectNotes);
      const install = () => run(["install", `--${runtime}`], { home, cwd: project });
      const initial = install();
      assert.equal(initial.status, 0, initial.out);
      const source = path.join(REPO, "skills", "orchestrate");
      for (const file of ["SKILL.md", "out-of-scope-issues.md"]) {
        assert.equal(await read(path.join(skillDir, file)), await read(path.join(source, file)));
      }
      // Blocks adopt the destination's line endings; compare content, not keywords
      // claimed to prove model behavior. Skill files above must remain byte-identical.
      const roster = await read(path.join(home, "AGENTS.md"));
      assert.ok(roster.startsWith(personalNotes));
      const sourceRoster = await read(path.join(REPO, "reference", "agents-block.md"));
      assert.ok(roster.replace(/\r\n/g, "\n").includes(sourceRoster.replace(/\r\n/g, "\n").trim()));
      const [adapterDir, adapterFile, sourceBlock] = {
        claude: [".claude", "CLAUDE.md", "routing-block.md"],
        codex: [".codex", "AGENTS.md", "codex-block.md"],
        opencode: [path.join(".config", "opencode"), "AGENTS.md", "opencode-block.md"],
      }[runtime];
      const adapter = await read(path.join(home, adapterDir, adapterFile));
      const sourceAdapter = await read(path.join(REPO, "reference", sourceBlock));
      assert.ok(adapter.replace(/\r\n/g, "\n").includes((runtime === "claude" ? renderRoutingBlock(sourceAdapter.replace(/\r\n/g, "\n"), false) : sourceAdapter.replace(/\r\n/g, "\n")).trim()));
      assert.equal(await read(path.join(project, "AGENTS.md")), projectNotes);

      const userFile = path.join(skillDir, "personal-notes.md");
      await writeFile(userFile, "untracked user notes\n");
      await writeFile(procedure, "local procedure edit\n");
      const updated = install();
      assert.equal(updated.status, 0, updated.out);
      assert.equal(await read(procedure + ".local.bak"), "local procedure edit\n");
      assert.equal(await read(procedure), await read(path.join(source, "out-of-scope-issues.md")));

      await writeFile(procedure, "second local procedure edit\n");
      const removed = run(["uninstall", `--${runtime}`], { home, cwd: project });
      assert.equal(removed.status, 0, removed.out);
      assert.equal(existsSync(procedure), false);
      assert.equal(await read(procedure + ".local.bak"), "local procedure edit\n");
      assert.equal(await read(procedure + ".local-1.bak"), "second local procedure edit\n");
      assert.equal(await read(userFile), "untracked user notes\n");
      assert.ok((await read(path.join(home, "AGENTS.md"))).startsWith(personalNotes));
      assert.equal(await read(path.join(project, "AGENTS.md")), projectNotes);
    });
  }

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

  test("reference distributes the Laya procedure without installing core agents or changing settings", async () => {
    const { home } = await scratch("laya-reference");
    const settings = path.join(home, ".claude", "settings.json");
    const settingsBytes = '{"userPreference":"keep"}\n';
    await mkdir(path.dirname(settings), { recursive: true });
    await writeFile(settings, settingsBytes);
    const personalNotes = "# Personal notes\nKeep this outside managed blocks.\n";
    await writeFile(path.join(home, "AGENTS.md"), personalNotes);

    const result = run(["reference", "--claude", "--codex"], { home });
    assert.equal(result.status, 0, result.out);
    const procedure = "laya-handoffs.md";
    const source = await read(path.join(REPO, "skills", "orchestrate", procedure));
    for (const root of [".claude", ".agents"]) {
      assert.equal(await read(path.join(home, root, "skills", "orchestrate", procedure)), source);
    }
    const roster = await read(path.join(home, "AGENTS.md"));
    assert.equal(roster, applyBlock(personalNotes,
      (await read(path.join(REPO, "reference", "agents-block.md"))).replace(/\r\n/g, "\n"),
      ["<!-- agent-team-config:start -->", "<!-- agent-team-config:end -->"]).text);
    assert.equal(await read(settings), settingsBytes);
    for (const dir of [".claude/agents", ".codex/agents", ".claude/hooks"]) {
      assert.equal(existsSync(path.join(home, dir)), false, `${dir} must not be installed by reference`);
    }
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

  test("learning-loop and its proposal template install and uninstall together", async () => {
    const { home } = await scratch("skill-learning-loop");
    assert.equal(run(["install"], { home }).status, 0);
    for (const root of [".claude", ".agents"]) {
      for (const file of ["SKILL.md", "proposal-template.md"]) {
        assert.equal(await read(path.join(home, root, "skills", "learning-loop", file)),
          await read(path.join(REPO, "skills", "learning-loop", file)));
      }
    }
    const result = run(["uninstall"], { home });
    assert.equal(result.status, 0, result.out);
    for (const root of [".claude", ".agents"]) {
      assert.equal(existsSync(path.join(home, root, "skills", "learning-loop", "SKILL.md")), false);
      assert.equal(existsSync(path.join(home, root, "skills", "learning-loop", "proposal-template.md")), false);
    }
  });

  test("learning-loop source updates reach fresh processes only after reinstall", async () => {
    const { root, home, project } = await scratch("learning-loop-upgrade");
    const pkg = path.join(root, "pkg");
    // Change a throwaway source package, never this checkout or a personal HOME.
    for (const dir of ["bin", "agents", "reference", "hooks", "dashboard", "skills", "tools", "stack-packs"]) {
      await cp(path.join(REPO, dir), path.join(pkg, dir), { recursive: true });
    }
    await cp(path.join(REPO, "package.json"), path.join(pkg, "package.json"));
    const sourceFile = path.join(pkg, "skills", "learning-loop", "SKILL.md");
    const base = await read(sourceFile);
    const oldSource = `${base}\nSynthetic propagation fixture: require validation of the old example.\n`;
    const newSource = `${base}\nSynthetic propagation fixture: require validation of the corrected example.\n`;
    const env = isolatedEnv(home, {});
    const args = ["install", "--claude", "--codex", "--opencode"];
    const installCopy = () => spawnSync(process.execPath, [path.join(pkg, "bin", "cli.js"), ...args], {
      cwd: project, env, encoding: "utf8",
    });
    const destinations = [".claude", ".agents"].map(dir => path.join(home, dir, "skills", "learning-loop", "SKILL.md"));
    const readInstalled = () => {
      const result = spawnSync(process.execPath, ["--input-type=module", "-e",
        "import { readFileSync } from 'node:fs'; process.stdout.write(JSON.stringify(process.argv.slice(1).map(p => readFileSync(p, 'utf8'))));",
        ...destinations], { cwd: project, env, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
      return JSON.parse(result.stdout);
    };
    const userNotes = "# Personal notes\nKeep these outside managed blocks.\n";
    await writeFile(path.join(home, "AGENTS.md"), userNotes);
    const localFile = path.join(project, "AGENTS.md");
    await writeFile(localFile, "# Project instructions\nKeep project instructions.\n");

    await writeFile(sourceFile, oldSource);
    const initial = installCopy();
    assert.equal(initial.status, 0, initial.stderr);
    assert.deepEqual(readInstalled(), destinations.map(() => oldSource));

    await writeFile(sourceFile, newSource);
    assert.deepEqual(readInstalled(), destinations.map(() => oldSource), "a source edit must not silently update an installation");
    const updated = installCopy();
    assert.equal(updated.status, 0, updated.stderr);
    assert.deepEqual(readInstalled(), destinations.map(() => newSource));
    assert.ok((await read(path.join(home, "AGENTS.md"))).startsWith(userNotes));
    assert.equal(await read(localFile), "# Project instructions\nKeep project instructions.\n");
    // This checks installed bytes in another Node process, not native harness loading.
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

  test("generates Codex agents with no model or reasoning effort, so they inherit the session's", async () => {
    const { home } = await scratch("codex-model");
    assert.equal(run(["install", "--no-reference"], { home }).status, 0);
    for (const name of CORE) {
      const text = await read(path.join(home, ".codex", "agents", `${name}.toml`));
      assert.doesNotMatch(text, /^model\s*=/m, name);
      assert.doesNotMatch(text, /^model_reasoning_effort\s*=/m, name);
    }
    const agent = { name: "scanner", description: "Focused work", need: "deep", body: "Instructions" };
    assert.doesNotMatch(codexAgent(agent), /model/);
    assert.doesNotMatch(copilotAgent(agent), /^model:/m);
  });

  test("CANONKIT_CODEX_MODEL is ignored with one warning, for install and add", async () => {
    const { home, project } = await scratch("codex-model-ignored");
    const env = { CANONKIT_CODEX_MODEL: "some-model" };
    const warning = /WARN CANONKIT_CODEX_MODEL is ignored: use canonkit models setup --codex and reinstall/g;
    const installed = run(["install", "--codex", "--no-reference"], { home, env });
    assert.equal(installed.status, 0, installed.out);
    assert.equal(installed.out.match(warning)?.length, 1, installed.out);
    const added = run(["add", "iris", "maya"], { home, cwd: project, env });
    assert.equal(added.status, 0, added.out);
    assert.equal(added.out.match(warning)?.length, 1, added.out);
    for (const file of [path.join(home, ".codex", "agents", "archie.toml"), path.join(project, ".codex", "agents", "iris.toml")]) {
      assert.doesNotMatch(await read(file), /^model/m);
    }
    assert.doesNotMatch(run(["install", "--codex", "--no-reference"], { home }).out, /CANONKIT_CODEX_MODEL/);
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

  test("preserves an untracked specialist at user level", async () => {
    const { home } = await scratch("codex-stray");
    const dest = path.join(home, ".codex", "agents");
    await mkdir(dest, { recursive: true });
    await writeFile(path.join(dest, "maya.toml"), "name = \"maya\"");

    assert.equal(run(["install", "--no-reference"], { home }).status, 0);
    assert.equal(await read(path.join(dest, "maya.toml")), "name = \"maya\"");
  });
});


/* ------------------------------------------------------------ specialists */

/* -------------------------------------------------------------- opencode */

describe("opencode agents", () => {
  const ocDir = (home) => path.join(home, ".config", "opencode", "agents");
  // The frontmatter as a strict parser sees it: key, then the raw value.
  const front = (text) => {
    const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
    assert.ok(m, "no frontmatter");
    return Object.fromEntries(
      m[1].split("\n").filter((l) => !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf(":")), l.slice(l.indexOf(":") + 1).trim()]),
    );
  };

  test("writes one Markdown subagent per core agent, the body unchanged", async () => {
    const { home } = await scratch("opencode-core");
    assert.equal(run(["install", "--opencode", "--no-reference"], { home }).status, 0);

    const written = (await readdir(ocDir(home))).sort();
    assert.deepEqual(written, CORE.map((n) => `${n}.md`).sort());

    const source = (await readAgents()).find((a) => a.name === "archie");
    const archie = await read(path.join(ocDir(home), "archie.md"));
    const f = front(archie);
    // Without mode a custom agent loads as a primary agent.
    assert.equal(f.mode, "subagent");
    // Quoted, so a strict YAML parser reads the ": " inside it as text.
    assert.equal(JSON.parse(f.description), source.description);
    assert.ok(archie.endsWith(source.body.replace(/\n+$/, "") + "\n"), "body differs from the source");
  });

  test("sets no model, variant, name or tier: the session's model always wins", async () => {
    const { home } = await scratch("opencode-no-model");
    run(["install", "--opencode", "--no-reference"], { home });
    for (const name of CORE) {
      const f = front(await read(path.join(ocDir(home), `${name}.md`)));
      assert.deepEqual(Object.keys(f).sort(), ["description", "mode"], `${name}: ${Object.keys(f)}`);
    }
  });

  test("follows XDG_CONFIG_HOME, as OpenCode does", async () => {
    const { home } = await scratch("opencode-xdg");
    const xdg = path.join(home, "xdg");
    const result = runIn(["install", "--opencode"], { home, env: { XDG_CONFIG_HOME: xdg } });
    assert.equal(result.status, 0, result.out);
    assert.ok(existsSync(path.join(xdg, "opencode", "agents", "archie.md")));
    assert.ok(existsSync(path.join(xdg, "opencode", "AGENTS.md")));
    assert.equal(existsSync(path.join(home, ".config")), false);
  });

  test("reports an older copy of an agent it owns, without deleting it", async () => {
    const { home } = await scratch("opencode-stale-copy");
    await mkdir(ocDir(home), { recursive: true });
    await writeFile(path.join(ocDir(home), "archie-tech-architect.md"), "stale");

    const result = run(["install", "--opencode", "--no-reference"], { home });
    assert.equal(result.status, 0, result.out);
    assert.match(result.out, /older copies of agents this repo owns: archie-tech-architect\.md/);
    assert.match(result.out, /OpenCode loads any \.md here/);
    assert.ok(existsSync(path.join(ocDir(home), "archie-tech-architect.md")), "must not delete it");
  });

  test("stays quiet about your own agents and about repo scaffolding", async () => {
    const { home } = await scratch("opencode-quiet");
    await mkdir(path.join(ocDir(home), ".github"), { recursive: true });
    await writeFile(path.join(ocDir(home), ".gitignore"), "*.log");
    await writeFile(path.join(ocDir(home), "my-own-reviewer.md"), "---\ndescription: mine\n---\n");

    const result = run(["install", "--opencode", "--no-reference"], { home });
    assert.equal(result.status, 0, result.out);
    assert.doesNotMatch(result.out, /older copies/);
    assert.ok(existsSync(path.join(ocDir(home), "my-own-reviewer.md")));
    assert.ok(existsSync(path.join(ocDir(home), ".gitignore")));
  });

  test("preserves an untracked specialist at user level", async () => {
    const { home } = await scratch("opencode-stray");
    await mkdir(ocDir(home), { recursive: true });
    await writeFile(path.join(ocDir(home), "maya.md"), "stale");

    assert.equal(run(["install", "--opencode", "--no-reference"], { home }).status, 0);
    assert.equal(await read(path.join(ocDir(home), "maya.md")), "stale");
  });
});


describe("opencode reference block", () => {
  const ocMd = (home) => path.join(home, ".config", "opencode", "AGENTS.md");

  test("reference --opencode writes its own block, never the routing one", async () => {
    const { home } = await scratch("opencode-reference");
    const result = run(["reference", "--opencode"], { home });
    assert.equal(result.status, 0, result.out);

    const text = await read(ocMd(home));
    assert.match(text, /<!-- agent-team-config:opencode:start -->[\s\S]*<!-- agent-team-config:opencode:end -->/);
    // Only the plugin's two deny gates are marked; the commit/push asks are config.
    const marked = text.split(/\r?\n/).filter((l) => /^- `\[ENFORCED\]`/.test(l));
    assert.equal(marked.length, 2);
    assert.match(text, /enforced-by: git-bypass/);
    assert.match(text, /enforced-by: secret-block/);
    assert.match(text, /^- \*\*`git commit` and `git push` prompt as typed, pattern-limited\.\*\*/m);
    assert.match(text, /`execute` and MCP tools are not gated/);
    assert.doesNotMatch(text, /agent-team-config:routing/);
    assert.match(text, /model of the session/);
    assert.equal(existsSync(path.join(home, ".claude")), false);
  });

  test("preserves local rules outside the markers and is idempotent", async () => {
    const { home } = await scratch("opencode-reference-preserve");
    await mkdir(path.dirname(ocMd(home)), { recursive: true });
    await writeFile(ocMd(home), "# minhas regras\n\nnao pode sumir\n");

    assert.equal(run(["reference", "--opencode"], { home }).status, 0);
    const first = await read(ocMd(home));
    assert.match(first, /# minhas regras\s+nao pode sumir/);

    const second = run(["reference", "--opencode"], { home });
    assert.match(second.out, /already current: .*AGENTS\.md/);
    assert.equal(await read(ocMd(home)), first);
  });

  test("says when it ends OpenCode's fallback to ~/.claude/CLAUDE.md", async () => {
    const { home } = await scratch("opencode-reference-fallback");
    await mkdir(path.join(home, ".claude"), { recursive: true });
    await writeFile(path.join(home, ".claude", "CLAUDE.md"), "regra minha\n");

    assert.match(run(["reference", "--opencode"], { home }).out, /instead of ~\/\.claude\/CLAUDE\.md/);
    // Only the run that creates the file ends the fallback.
    assert.doesNotMatch(run(["reference", "--opencode"], { home }).out, /instead of ~\/\.claude\/CLAUDE\.md/);
  });
});


describe("codex reference block", () => {
  const cxMd = (codexHome) => path.join(codexHome, "AGENTS.md");
  const MARK = /<!-- agent-team-config:codex:start -->[\s\S]*<!-- agent-team-config:codex:end -->/;

  test("install writes its own block into CODEX_HOME, not into ~/.codex", async () => {
    const { home, root } = await scratch("codex-reference");
    const codexHome = path.join(root, "chome");
    const result = run(["install", "--codex"], { home, env: { CODEX_HOME: codexHome } });
    assert.equal(result.status, 0, result.out);

    const text = await read(cxMd(codexHome));
    assert.match(text, MARK);
    // Codex does not load ~/AGENTS.md from a repo below home: the block points at it.
    assert.match(text, /read `~\/AGENTS\.md`/);
    assert.doesNotMatch(text, /agent-team-config:(routing|opencode)/);
    // Only the two deny gates are marked.
    const marked = text.split(/\r?\n/).filter((l) => /^- `\[ENFORCED\]`/.test(l));
    assert.equal(marked.length, 2);
    assert.match(text, /enforced-by: git-bypass/);
    assert.match(text, /enforced-by: secret-block/);
    assert.equal(existsSync(path.join(home, ".codex")), false);
  });

  test("--claude alone does not touch CODEX_HOME/AGENTS.md", async () => {
    const { home, root } = await scratch("codex-reference-skipped");
    const codexHome = path.join(root, "chome");
    assert.equal(run(["install", "--claude"], { home, env: { CODEX_HOME: codexHome } }).status, 0);
    assert.equal(existsSync(cxMd(codexHome)), false);
  });

  test("preserves local rules outside the markers and is idempotent", async () => {
    const { home, root } = await scratch("codex-reference-preserve");
    const codexHome = path.join(root, "chome");
    await mkdir(codexHome, { recursive: true });
    await writeFile(cxMd(codexHome), "# minhas regras\n\nnao pode sumir\n");

    assert.equal(run(["reference", "--codex"], { home, env: { CODEX_HOME: codexHome } }).status, 0);
    const first = await read(cxMd(codexHome));
    assert.match(first, /# minhas regras\s+nao pode sumir/);
    assert.match(first, MARK);

    const second = run(["reference", "--codex"], { home, env: { CODEX_HOME: codexHome } });
    assert.match(second.out, /already current: .*AGENTS\.md/);
    assert.equal(await read(cxMd(codexHome)), first);
  });
});

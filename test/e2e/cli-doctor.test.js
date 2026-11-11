/**
 * Contract tests for the installer: doctor, dashboard, specialists and block sync.
 *
 * These run the real CLI against a real filesystem in a throwaway HOME. No
 * mocks: the failure this installer can actually cause is writing the wrong
 * bytes to a file you already had, and a mocked fs proves nothing about that.
 * Shared fixtures: test/helpers/cli-fixtures.js.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm, mkdir, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { REPO } from "../helpers/cli-harness.js";
import { scratch, run, opencodeOnPath, snapshot, read, runIn, claudeDir, settingsOf, commandsIn, ours, FORWARDER, legacyEntry } from "../helpers/cli-fixtures.js";
import { applyBlock, readAgents, replaceProjectBlock, readProjectBlock, copilotAgent } from "../../bin/cli.js";


describe("doctor", () => {
  const doctor = (o) => runIn(["doctor"], o);
  const line = (out, re) => out.split("\n").find((l) => re.test(l)) ?? "";
  const ready = async (name) => {
    const s = await scratch(name);
    runIn(["install", "--wire-hooks"], { home: s.home });
    return s;
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

  test("checks OpenCode's agents only where they were installed", async () => {
    const { home, project } = await ready("doctor-opencode");
    assert.doesNotMatch(doctor({ home, cwd: project }).out, /opencode agents/);

    runIn(["install", "--opencode"], { home });
    assert.match(line(doctor({ home, cwd: project }).out, /^\w+ +opencode agents/), /^OK /);

    const dir = path.join(home, ".config", "opencode", "agents");
    await writeFile(path.join(dir, "bob.md"), "---\ndescription: edited\nmode: subagent\n---\n");
    assert.match(line(doctor({ home, cwd: project }).out, /^\w+ +opencode agents/), /^WARN .*bob/);

    await rm(path.join(dir, "quinn.md"));
    const { out, status } = doctor({ home, cwd: project });
    assert.equal(status, 1);
    assert.match(line(out, /^\w+ +opencode agents/), /^FAIL .*quinn.*--opencode/);
  });

  test("checks the OpenCode hook only where it was wired: files byte for byte, asks in effect", async () => {
    const { root, home, project } = await ready("doctor-opencode-hook");
    assert.doesNotMatch(doctor({ home, cwd: project }).out, /opencode (hook files|permissions)/);

    assert.equal(runIn(["install", "--opencode", "--wire-hooks"], { home, env: await opencodeOnPath(root, "v2.1.4") }).status, 0);
    const oc = path.join(home, ".config", "opencode");
    let out = doctor({ home, cwd: project }).out;
    assert.match(line(out, /^\w+ +opencode hook files/), /^OK .*4 files/);
    assert.match(line(out, /^\w+ +opencode permissions/), /^OK /);

    // A later allow-all silences the asks: the last match wins.
    const cfg = path.join(oc, "opencode.json");
    const data = JSON.parse(await read(cfg));
    data.permissions.push({ action: "*", resource: "*", effect: "allow" });
    await writeFile(cfg, JSON.stringify(data));
    assert.match(line(doctor({ home, cwd: project }).out, /^\w+ +opencode permissions/), /^WARN .*git commit.*the last match wins/);

    await writeFile(path.join(oc, "opencode.jsonc"), "{}\n");
    assert.match(line(doctor({ home, cwd: project }).out, /^\w+ +opencode permissions/), /^WARN .*opencode\.jsonc exists/);

    await writeFile(path.join(oc, "plugins", "canonkit.js"), "// edited\n");
    assert.match(line(doctor({ home, cwd: project }).out, /^\w+ +opencode hook files/), /^FAIL .*differ.*plugins\/canonkit\.js/);

    await rm(path.join(oc, "canonkit", "canonkit-hook.js"));
    const res = doctor({ home, cwd: project });
    assert.equal(res.status, 1);
    assert.match(line(res.out, /^\w+ +opencode hook files/), /^FAIL .*missing.*canonkit\/canonkit-hook\.js.*lets every call through/);
  });

  test("is read-only", async () => {
    const { home, project } = await ready("doctor-readonly");
    const before = await snapshot(home);
    doctor({ home, cwd: project });
    assert.deepEqual(await snapshot(home), before);
  });

  describe("the Codex reference block", () => {
    const check = (out) => line(out, /^\w+ +codex reference:/);

    test("WARNs, without failing, when a Codex install lost its block", async () => {
      const { home, project, root } = await scratch("doctor-codex-ref-missing");
      const env = { CODEX_HOME: path.join(root, "chome") };
      runIn(["install", "--wire-hooks"], { home, env });
      await rm(path.join(env.CODEX_HOME, "AGENTS.md"));
      const { out, status } = doctor({ home, cwd: project, env });
      assert.equal(status, 0, out);
      assert.match(check(out), /^WARN .*AGENTS\.md.*reference --codex/);
    });

    test("is OK after a normal Codex install", async () => {
      const { home, project, root } = await scratch("doctor-codex-ref-ok");
      const env = { CODEX_HOME: path.join(root, "chome") };
      runIn(["install", "--wire-hooks"], { home, env });
      assert.match(check(doctor({ home, cwd: project, env }).out), /^OK /);
    });

    test("says nothing on a Claude-only install", async () => {
      const { home, project, root } = await scratch("doctor-codex-ref-claude");
      const env = { CODEX_HOME: path.join(root, "chome") };
      runIn(["install", "--claude"], { home, env });
      assert.equal(check(doctor({ home, cwd: project, env }).out), "");
    });
  });

  describe("the OpenCode reference block", () => {
    const check = (out) => line(out, /^\w+ +opencode reference:/);

    test("WARNs, without failing, when an OpenCode install lost its block", async () => {
      const { home, project } = await ready("doctor-opencode-ref-missing");
      runIn(["install", "--opencode"], { home });
      await rm(path.join(home, ".config", "opencode", "AGENTS.md"));
      const { out, status } = doctor({ home, cwd: project });
      assert.equal(status, 0, out);
      assert.match(check(out), /^WARN .*AGENTS\.md.*reference --opencode/);
    });

    test("is OK after a normal OpenCode install", async () => {
      const { home, project } = await scratch("doctor-opencode-ref-ok");
      runIn(["install", "--claude", "--opencode"], { home });
      assert.match(check(doctor({ home, cwd: project }).out), /^OK /);
    });

    test("says nothing on a Claude-only install", async () => {
      const { home, project } = await scratch("doctor-opencode-ref-claude");
      runIn(["install", "--claude"], { home });
      assert.equal(check(doctor({ home, cwd: project }).out), "");
    });
  });

  describe("AGENTS.override.md in the Codex home", () => {
    const check = (out) => line(out, /^\w+ +codex AGENTS\.override\.md:/);

    test("WARNs, without failing, when it shadows the synced AGENTS.md", async () => {
      const { home, project, root } = await scratch("doctor-codex-override");
      const codexHome = path.join(root, "chome");
      runIn(["install", "--wire-hooks"], { home, env: { CODEX_HOME: codexHome } });
      await writeFile(path.join(codexHome, "AGENTS.override.md"), "mine\n");
      const { out, status } = doctor({ home, cwd: project, env: { CODEX_HOME: codexHome } });
      assert.equal(status, 0, out);
      assert.match(check(out), /^WARN .*AGENTS\.override\.md.*instead of/);
    });

    test("says nothing when there is no override", async () => {
      const { home, project, root } = await scratch("doctor-codex-no-override");
      const codexHome = path.join(root, "chome");
      runIn(["install", "--wire-hooks"], { home, env: { CODEX_HOME: codexHome } });
      assert.equal(check(doctor({ home, cwd: project, env: { CODEX_HOME: codexHome } }).out), "");
    });
  });

  describe("the Codex hook", () => {
    const codexLine = (out, check) => line(out, new RegExp(`^\\w+ +codex hook ${check}:`));
    const codexDir = (home, ...p) => path.join(home, ".codex", ...p);

    test("a wired install passes both rows", async () => {
      const { home, project } = await ready("doctor-codex-ok");
      const { out, status } = doctor({ home, cwd: project });
      assert.equal(status, 0, out);
      assert.match(codexLine(out, "files"), /^OK /);
      assert.match(codexLine(out, "wiring"), /^OK .*Bash\|apply_patch/);
    });

    test("no canonkit/ folder: no Codex rows", async () => {
      const { home, project } = await scratch("doctor-codex-none");
      runIn(["install", "--claude", "--wire-hooks"], { home });
      assert.doesNotMatch(doctor({ home, cwd: project }).out, /codex hook/);
    });

    test("a missing file FAILs: Codex lets every call through", async () => {
      const { home, project } = await ready("doctor-codex-missing");
      await rm(codexDir(home, "canonkit", "canonkit-hook.js"));
      const { out, status } = doctor({ home, cwd: project });
      assert.equal(status, 1);
      assert.match(codexLine(out, "files"), /^FAIL .*canonkit-hook\.js.*install --codex/);
    });

    test("a file that differs from the package's FAILs", async () => {
      const { home, project } = await ready("doctor-codex-differs");
      const f = codexDir(home, "canonkit", "canonkit-codex.js");
      await writeFile(f, (await read(f)) + "// edit\n");
      const { out, status } = doctor({ home, cwd: project });
      assert.equal(status, 1);
      assert.match(codexLine(out, "files"), /^FAIL .*differ.*canonkit-codex\.js/);
    });

    for (const [name, edit, re] of [
      ["no hooks.json", (file) => rm(file), /does not exist/],
      ["a hooks.json that is not JSON", (file) => writeFile(file, "{ nope"), /not valid JSON/],
      ["no group running it", (file) => writeFile(file, JSON.stringify({ hooks: { PreToolUse: [] } })), /no PreToolUse group/],
      ["the wrong matcher", async (file) => {
        const data = JSON.parse(await read(file));
        data.hooks.PreToolUse[0].matcher = "Bash";
        await writeFile(file, JSON.stringify(data));
      }, /matcher is "Bash", not Bash\|apply_patch/],
    ]) {
      test(`${name} FAILs the wiring row`, async () => {
        const { home, project } = await ready(`doctor-codex-${name.replace(/\W+/g, "-")}`);
        await edit(codexDir(home, "hooks.json"));
        const { out, status } = doctor({ home, cwd: project });
        assert.equal(status, 1);
        assert.match(codexLine(out, "wiring"), /^FAIL /);
        assert.match(codexLine(out, "wiring"), re);
      });
    }
  });

  test("optional unwired hooks leave native approvals authoritative", async () => {
    const { home } = await scratch("doctor-unwired");
    runIn(["install"], { home });
    const { out, status } = doctor({ home });
    assert.equal(status, 0, out);
    assert.match(line(out, /^OK +hook wiring/), /optional canonkit hooks inactive/);
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
    const settings = await settingsOf(home);
    await writeFile(claudeDir(home, "settings.local.json"), JSON.stringify({ hooks: settings.hooks }));
    delete settings.hooks;
    await writeFile(claudeDir(home, "settings.json"), JSON.stringify(settings));
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

  test("a core agent missing from ~/.claude/agents FAILs", async () => {
    const { home } = await ready("doctor-agent-missing");
    await rm(claudeDir(home, "agents", "gard.md"));
    const { out, status } = doctor({ home });
    assert.equal(status, 1);
    assert.match(line(out, /^FAIL +agents/), /gard/);
  });

  test("a core-named leftover in ~/.agents WARNs, without failing", async () => {
    const { home } = await ready("doctor-agent-leftover");
    await mkdir(path.join(home, ".agents"), { recursive: true });
    await writeFile(path.join(home, ".agents", "gard.md"), "---\nname: gard\n---\nold\n");
    const { out, status } = doctor({ home });
    assert.equal(status, 0, out);
    assert.match(line(out, /^WARN +agents leftovers/), /gard.*not read by any harness; npx canonkit install removes the byte-identical ones/);
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

    // Each harness gets its native profile; the project AGENTS.md tells the
    // main agent when to call the specialist.
    assert.ok(existsSync(path.join(project, ".claude", "agents", "maya.md")));
    assert.ok(existsSync(path.join(project, ".claude", "agents", "nova.md")));
    // Codex reads .codex/agents/<name>.toml and never looks at .claude/.
    assert.ok(existsSync(path.join(project, ".codex", "agents", "maya.toml")));
    assert.ok(existsSync(path.join(project, ".codex", "agents", "nova.toml")));
    // OpenCode reads .opencode/agents/<name>.md, generated as a subagent.
    assert.match(await read(path.join(project, ".opencode", "agents", "maya.md")), /^mode: subagent$/m);
    assert.ok(existsSync(path.join(project, ".opencode", "agents", "nova.md")));
    assert.match(await read(path.join(project, ".github", "agents", "maya.agent.md")), /^---\n(?:# Generated by canonkit[^\n]*\n)?name: maya\ndescription: ".+"\n---\n/);
    assert.equal(await read(path.join(project, ".github", "agents", "maya.agent.md")),
      copilotAgent((await readAgents()).find((agent) => agent.name === "maya")));

    const agentsMd = await read(path.join(project, "AGENTS.md"));
    assert.match(agentsMd, /\*\*maya\*\* \(veto\) — game design/);
    assert.match(agentsMd, /\*\*nova\*\* \(veto\) — UI visual design and cross-media art direction/);
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
    assert.equal(existsSync(path.join(project, ".github", "agents", "nova.agent.md")), false);
    // Removing from one runtime and leaving the other is the drift this avoids.
    assert.equal(existsSync(path.join(project, ".codex", "agents", "nova.toml")), false);
    assert.ok(existsSync(path.join(project, ".codex", "agents", "maya.toml")));
    assert.equal(existsSync(path.join(project, ".opencode", "agents", "nova.md")), false);
    assert.ok(existsSync(path.join(project, ".opencode", "agents", "maya.md")));
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

/**
 * Contract tests for the installer: hooks and --wire-hooks (Claude Code and Codex).
 *
 * These run the real CLI against a real filesystem in a throwaway HOME. No
 * mocks: the failure this installer can actually cause is writing the wrong
 * bytes to a file you already had, and a mocked fs proves nothing about that.
 * Shared fixtures: test/helpers/cli-fixtures.js.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile, readdir, chmod, symlink, rename, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { REPO } from "../helpers/cli-harness.js";
import { scratch, run, snapshot, read, codexCommand, runIn, REQUIRED, claudeDir, settingsOf, commandsIn, ours, backups, FORWARDER, legacyEntry } from "../helpers/cli-fixtures.js";
import { HOOK_FILES } from "../../bin/cli.js";


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

  test("installs exactly the 2.0 file set into ~/.claude/hooks", async () => {
    const { home } = await scratch("hook-fileset");
    run(["install", "--no-reference"], { home });
    const got = (await readdir(path.join(home, ".claude", "hooks"))).sort();
    assert.deepEqual(got, ["canonkit-hook.js"]);
  });

  test("a stray .js in the package hooks dir is not copied", async () => {
    const { root, home } = await scratch("hook-stray");
    // A throwaway copy of the package: the real hooks/ is never touched.
    const pkg = path.join(root, "pkg");
    await mkdir(pkg, { recursive: true });
    for (const d of ["bin", "agents", "reference", "hooks", "dashboard", "skills", "tools"]) {
      await cp(path.join(REPO, d), path.join(pkg, d), { recursive: true });
    }
    await cp(path.join(REPO, "package.json"), path.join(pkg, "package.json"));
    await symlink(path.join(REPO, "node_modules"), path.join(pkg, "node_modules"), "junction");
    await writeFile(path.join(pkg, "hooks", "stray.js"), "// not in the list\n");

    const result = spawnSync(process.execPath, [path.join(pkg, "bin", "cli.js"), "install", "--no-reference"], {
      cwd: home,
      encoding: "utf8",
      env: { ...process.env, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, ".config") },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual((await readdir(path.join(home, ".claude", "hooks"))).sort(), ["canonkit-hook.js"]);
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
    const after = JSON.parse(await read(settings));
    assert.deepEqual(after.hooks, JSON.parse(before).hooks);
    delete after.sandbox;
    const previous = JSON.parse(before); delete previous.sandbox;
    assert.deepEqual(after, previous);
  });

  test("rejects invalid settings before automatic security or distribution writes", async () => {
    const { home } = await scratch("hook-bad-settings");
    await mkdir(path.join(home, ".claude"), { recursive: true });
    await writeFile(path.join(home, ".claude", "settings.json"), "{ not json");

    const { out, status } = run(["install", "--no-reference"], { home });
    assert.equal(status, 1);
    assert.match(out, /Invalid JSON/);
    assert.equal(await read(path.join(home, ".claude", "settings.json")), "{ not json");
    assert.equal(existsSync(hookPath(home)), false);
    assert.equal(existsSync(path.join(home, ".canonkit")), false);
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

    test("an untracked older forwarder is refreshed with its previous bytes preserved", async () => {
      const { home } = await scratch("upgrade-stale-forwarder");
      await mkdir(claude(home, "hooks"), { recursive: true });
      await writeFile(oldHook(home), "// canonkit-forwarder: old\nrequire('./canonkit-hook.js');\n");
      run(["install", "--no-reference"], { home });
      assert.match(await read(oldHook(home)), /require\('\.\/canonkit-hook\.js'\)\.run\(\)/);
      assert.equal(await read(oldHook(home) + ".local.bak"), "// canonkit-forwarder: old\nrequire('./canonkit-hook.js');\n");
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
    const settings = path.join(home, ".claude", "settings.json");
    if (existsSync(settings)) assert.deepEqual(JSON.parse(await read(settings)), { sandbox: { network: { strictAllowlist: true } } });
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

    test("is kept for manual removal even when visible settings no longer run it", async () => {
      const { home } = await scratch("forwarder-gone");
      await seed(home, { "settings.json": { hooks: { Stop: [legacyEntry()] } } });
      const { out, status } = runIn(["install", "--no-reference", "--wire-hooks"], { home });
      assert.equal(status, 0, out);
      assert.ok(existsSync(FORWARDER(home)), "unknown projects may still run the forwarder");
      assert.ok(existsSync(FORWARDER(home) + ".local.bak"), "a pre-forwarder copy stays backed up");
      // Other projects' settings cannot be seen from here: say what that means.
      assert.match(out, /kept .*meu-time-hook\.js/);
      assert.match(out, /other projects cannot be enumerated/);
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

    test("--dry-run projects the rewiring and keeps the forwarder, matching a real install", async () => {
      const { home } = await scratch("forwarder-dry-planned");
      await seed(home, { "settings.json": { hooks: { Stop: [legacyEntry()] } } });
      const { out } = runIn(["install", "--no-reference", "--wire-hooks", "--dry-run"], { home });
      assert.match(out, /kept .*meu-time-hook\.js/);
      assert.match(out, /other projects cannot be enumerated/);
      assert.doesNotMatch(out, /would remove .*meu-time-hook\.js/);
      assert.ok(existsSync(FORWARDER(home)));
    });

    test("--dry-run refuses a linked HOME without changing the physical installation", async () => {
      const { root, home } = await scratch("forwarder-dry-linked");
      await seed(home, { "settings.json": { hooks: { Stop: [legacyEntry()] } } });
      const linked = path.join(root, "home-link");
      await symlink(home, linked, process.platform === "win32" ? "junction" : "dir");
      const before = await snapshot(home);
      const { out, status } = runIn(["install", "--no-reference", "--wire-hooks", "--dry-run"], { home: linked, cwd: home });
      assert.equal(status, 1, out);
      assert.match(out, /symbolic link or junction/, out);
      assert.deepEqual(await snapshot(home), before);
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

/* ------------------------------------------------------- codex wire-hooks */

describe("install --wire-hooks for Codex", () => {
  const codexDir = (home, ...p) => path.join(home, ".codex", ...p);
  const hooksJson = (home) => codexDir(home, "hooks.json");
  const codexBackups = async (home) => (await readdir(codexDir(home))).filter((f) => /^hooks\.json\.canonkit-.*\.bak$/.test(f));
  const wire = (home, extra = [], env = {}) => runIn(["install", "--codex", "--no-reference", "--wire-hooks", ...extra], { home, env });
  const theirs = (command, matcher) => ({ ...(matcher ? { matcher } : {}), hooks: [{ type: "command", command }] });

  for (const [name, body] of [
    ["is not valid JSON", "{ not json"],
    ["is not an object", "[]"],
    ["has a hooks that is not an object", '{"hooks": []}'],
    ["has an event that is not an array", '{"hooks": {"PreToolUse": {}}}'],
  ]) {
    test(`refuses a hooks.json that ${name}, writing nothing for either harness`, async () => {
      const { home } = await scratch(`codex-refuse-${name.replace(/\W+/g, "-")}`);
      await mkdir(codexDir(home), { recursive: true });
      await writeFile(hooksJson(home), body);
      const before = await snapshot(home);
      // Claude Code in the install too: its half must not be written either.
      const { out, status } = runIn(["install", "--claude", "--codex", "--wire-hooks"], { home });
      assert.equal(status, 1, out);
      assert.match(out, /Refusing --wire-hooks: ~\/\.codex\/hooks\.json .*Nothing was written/);
      assert.deepEqual(await snapshot(home), before);
    });
  }

  test("keeps every other group, event and key in order, appends its own, and backs up first", async () => {
    const { home } = await scratch("codex-keep");
    await mkdir(codexDir(home), { recursive: true });
    const original = JSON.stringify({
      description: "mine",
      hooks: {
        SessionStart: [theirs("node ~/start.js")],
        PreToolUse: [theirs("node ~/a.js", "Bash"), theirs("node ~/b.js", "apply_patch")],
        Stop: [theirs("node ~/stop.js")],
      },
      futureKey: { x: 1 },
    }, null, 2);
    await writeFile(hooksJson(home), original);
    const { out, status } = wire(home);
    assert.equal(status, 0, out);
    const after = JSON.parse(await read(hooksJson(home)));
    const was = JSON.parse(original);
    assert.deepEqual(Object.keys(after), Object.keys(was));
    assert.deepEqual(Object.keys(after.hooks), Object.keys(was.hooks));
    assert.deepEqual(after.hooks.SessionStart, was.hooks.SessionStart);
    assert.deepEqual(after.hooks.Stop, was.hooks.Stop);
    assert.deepEqual(after.futureKey, was.futureKey);
    // Codex keys trust by group index: the user's groups keep theirs.
    assert.deepEqual(after.hooks.PreToolUse.slice(0, 2), was.hooks.PreToolUse);
    assert.deepEqual(after.hooks.PreToolUse[2], theirs(codexCommand(home), "Bash|apply_patch"));
    const [bak] = await codexBackups(home);
    assert.ok(bak, "a backup is written before the change");
    assert.equal(await read(codexDir(home, bak)), original);
    assert.match(out, /run \/hooks in Codex/);
  });

  test("a second run changes no bytes, writes no second backup and asks for no /hooks", async () => {
    const { home } = await scratch("codex-idempotent");
    await mkdir(codexDir(home), { recursive: true });
    await writeFile(hooksJson(home), JSON.stringify({ hooks: {} }));
    assert.equal(wire(home).status, 0);
    const once = await snapshot(codexDir(home));
    const again = wire(home);
    assert.equal(again.status, 0, again.out);
    assert.deepEqual(await snapshot(codexDir(home)), once);
    assert.equal((await codexBackups(home)).length, 1);
    assert.doesNotMatch(again.out, /run \/hooks/);
    assert.match(again.out, /already wired/);
  });

  test("no hooks.json: created with its group and no backup", async () => {
    const { home } = await scratch("codex-fresh");
    assert.equal(wire(home).status, 0);
    assert.deepEqual(JSON.parse(await read(hooksJson(home))), { hooks: { PreToolUse: [theirs(codexCommand(home), "Bash|apply_patch")] } });
    assert.deepEqual(await codexBackups(home), []);
  });

  test("its own group with a wrong matcher is fixed where it stands, and asks for /hooks", async () => {
    const { home } = await scratch("codex-matcher");
    await mkdir(codexDir(home), { recursive: true });
    const groups = [theirs("node ~/a.js", "Bash"), theirs(codexCommand(home), "Bash"), theirs("node ~/b.js")];
    await writeFile(hooksJson(home), JSON.stringify({ hooks: { PreToolUse: groups } }));
    const { out, status } = wire(home);
    assert.equal(status, 0, out);
    const { hooks } = JSON.parse(await read(hooksJson(home)));
    assert.deepEqual(hooks.PreToolUse, [groups[0], theirs(codexCommand(home), "Bash|apply_patch"), groups[2]]);
    assert.match(out, /PreToolUse\[1\]: matcher set to Bash\|apply_patch/);
    assert.match(out, /run \/hooks in Codex/);
  });

  test("its own group naming another path is pointed at this install in place", async () => {
    const { home } = await scratch("codex-command");
    await mkdir(codexDir(home), { recursive: true });
    const old = theirs('node "C:/old/canonkit/canonkit-codex.js"', "Bash|apply_patch");
    await writeFile(hooksJson(home), JSON.stringify({ hooks: { PreToolUse: [theirs("node ~/a.js"), old] } }));
    const { out } = wire(home);
    const { hooks } = JSON.parse(await read(hooksJson(home)));
    assert.equal(hooks.PreToolUse.length, 2);
    assert.deepEqual(hooks.PreToolUse[1], theirs(codexCommand(home), "Bash|apply_patch"));
    assert.match(out, /run \/hooks in Codex/);
  });

  test("a group shared with the user's hooks keeps its matcher, and is reported", async () => {
    const { home } = await scratch("codex-shared");
    await mkdir(codexDir(home), { recursive: true });
    const shared = { matcher: "Bash", hooks: [{ type: "command", command: "node ~/a.js" }, { type: "command", command: codexCommand(home) }] };
    const original = JSON.stringify({ hooks: { PreToolUse: [shared] } });
    await writeFile(hooksJson(home), original);
    const { out } = wire(home);
    assert.equal(await read(hooksJson(home)), original);
    assert.match(out, /PreToolUse\[0\]: shared with other hooks/);
  });

  test("a command that wraps the adapter is the user's, and its group is left", async () => {
    const { home } = await scratch("codex-wrapper");
    await mkdir(codexDir(home), { recursive: true });
    const wrapper = theirs(`${codexCommand(home)} | tee log`, "Bash");
    await writeFile(hooksJson(home), JSON.stringify({ hooks: { PreToolUse: [wrapper] } }));
    wire(home);
    const { hooks } = JSON.parse(await read(hooksJson(home)));
    assert.deepEqual(hooks.PreToolUse, [wrapper, theirs(codexCommand(home), "Bash|apply_patch")]);
  });

  test("--dry-run writes no canonkit/, no hooks.json and no backup", async () => {
    const { home } = await scratch("codex-dry");
    const { out, status } = wire(home, ["--dry-run"]);
    assert.equal(status, 0, out);
    assert.match(out, /would wire canonkit-codex\.js/);
    assert.equal(existsSync(codexDir(home)), false);
  });

  test("CODEX_HOME holds the agents, canonkit/ and hooks.json; nothing goes under ~/.codex", async () => {
    const { root, home } = await scratch("codex-home");
    const codexHome = path.join(root, "elsewhere");
    const { out, status } = wire(home, [], { CODEX_HOME: codexHome });
    assert.equal(status, 0, out);
    assert.ok(existsSync(path.join(codexHome, "agents", "bob.toml")));
    assert.deepEqual((await readdir(path.join(codexHome, "canonkit"))).sort(), [...HOOK_FILES.codex].sort());
    const { hooks } = JSON.parse(await read(path.join(codexHome, "hooks.json")));
    assert.equal(hooks.PreToolUse[0].hooks[0].command, codexCommand(home, codexHome));
    assert.equal(existsSync(codexDir(home)), false);
  });

  test("a CODEX_HOME the shell would expand inside quotes is refused before anything is written", async () => {
    const { root, home } = await scratch("codex-home-dollar");
    const { out, status } = runIn(["install", "--wire-hooks"], { home, env: { CODEX_HOME: path.join(root, "a$b") } });
    assert.equal(status, 1, out);
    assert.match(out, /Refusing --wire-hooks: the Codex hook path/);
    assert.deepEqual(await readdir(home), []);
    assert.equal(existsSync(path.join(root, "a$b")), false);
  });

  test("a plain install refreshes canonkit/ only where it exists, and never touches hooks.json", async () => {
    const { home } = await scratch("codex-refresh");
    assert.equal(runIn(["install", "--codex", "--no-reference"], { home }).status, 0);
    assert.equal(existsSync(codexDir(home, "canonkit")), false, "a plain install created an inert copy");

    assert.equal(wire(home).status, 0);
    const userEdited = JSON.stringify({ hooks: { PreToolUse: [theirs("node ~/a.js")] } });
    await writeFile(hooksJson(home), userEdited);
    await writeFile(codexDir(home, "canonkit", "canonkit-hook.js"), "// stale\n");
    const { out, status } = runIn(["install", "--codex", "--no-reference"], { home });
    assert.equal(status, 0, out);
    assert.ok((await readFile(codexDir(home, "canonkit", "canonkit-hook.js"))).equals(await readFile(path.join(REPO, "hooks", "canonkit-hook.js"))));
    assert.equal(await read(hooksJson(home)), userEdited);
    assert.doesNotMatch(out, /run \/hooks/);
  });
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, chmod, symlink, lstat } from "node:fs/promises";
import { existsSync, realpathSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { InstallManifest, removeManagedBlock } from "../bin/install-manifest.js";

const CLI = fileURLToPath(new URL("../bin/cli.js", import.meta.url));
async function scratch(t) {
  const root = realpathSync.native(await mkdtemp(path.join(os.tmpdir(), "canonkit-uninstall-test-")));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = path.join(root, "home");
  await mkdir(home);
  return { root, home };
}
function run(home, args, extra = {}) {
  const env = { ...process.env, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, ".config"), ...extra };
  if (!("CODEX_HOME" in extra)) delete env.CODEX_HOME;
  const result = spawnSync(process.execPath, [CLI, ...args], { cwd: home, env, encoding: "utf8" });
  const out = (result.stdout ?? "") + (result.stderr ?? "");
  assert.ifError(result.error);
  return { ...result, out };
}
const manifestFile = (home) => path.join(home, ".canonkit", "install-manifest.json");
const manifest = async (home) => JSON.parse(await readFile(manifestFile(home), "utf8"));
async function put(file, text) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, text); }
const ok = (result) => assert.equal(result.status, 0, result.out);
async function snapshot(root) {
  const result = {};
  for (const entry of await readdir(root, { withFileTypes: true, recursive: true })) {
    if (entry.isFile()) {
      const file = path.join(entry.parentPath ?? entry.path, entry.name);
      result[path.relative(root, file)] = (await readFile(file)).toString("base64");
    }
  }
  return result;
}
async function opencodeBin(root) {
  const dir = path.join(root, "bin");
  await mkdir(dir);
  const js = path.join(dir, "version.cjs");
  await writeFile(js, 'process.stdout.write("2.1.4\\n");');
  if (process.platform === "win32") await writeFile(path.join(dir, "opencode.cmd"), `@"${process.execPath}" "${js}" %*\r\n`);
  else {
    const file = path.join(dir, "opencode");
    await writeFile(file, `#!/bin/sh\nexec "${process.execPath}" "${js}" "$@"\n`);
    await chmod(file, 0o755);
  }
  return { PATH: dir };
}

const markers = ["<!-- managed:start -->", "<!-- managed:end -->"];

test("removing a managed block preserves every surrounding byte", () => {
  const before = Buffer.from("\ufefffirst\r\n\r\n");
  const after = Buffer.from("\r\n\r\nlast\n");
  const block = Buffer.from(`${markers[0]}\r\nlocal edit\r\n${markers[1]}`);
  const result = removeManagedBlock(Buffer.concat([before, block, after]), markers);
  assert.deepEqual(result.bytes, Buffer.concat([before, after]));
  assert.deepEqual(result.block, block);
});

test("absent markers are idempotent; partial or duplicate markers refuse removal", () => {
  const untouched = Buffer.from("the user's content\r\n");
  assert.deepEqual(removeManagedBlock(untouched, markers), { bytes: untouched, block: null });
  for (const text of [markers[0], markers[1], markers[1] + markers[0],
    markers[0] + markers[0] + markers[1], markers[0] + markers[1] + markers[1]]) {
    assert.throws(() => removeManagedBlock(Buffer.from(text), markers), /duplicate or unmatched/);
  }
});

test("fresh install tracks global files and uninstall is repeatable without removing local data", async (t) => {
  const { home } = await scratch(t);
  const own = path.join(home, ".claude", "agents", "mine.md");
  await put(own, "my agent");
  const legacy = path.join(home, ".agents", "bob.md");
  await put(legacy, "2.0 leftover");
  const history = path.join(home, ".claude", "canonkit-activity", "events.jsonl");
  await put(history, "history");
  ok(run(home, ["install"]));
  const recorded = await manifest(home);
  assert.equal(recorded.schemaVersion, 1);
  assert.equal(recorded.entries["claude:file:agents/bob.md"].provenance, "created");
  assert.deepEqual(recorded.entries["home:block:AGENTS.md"].owners, ["claude", "codex"]);
  ok(run(home, ["uninstall"]));
  assert.equal(existsSync(path.join(home, ".claude", "agents", "bob.md")), false);
  assert.equal(existsSync(path.join(home, ".codex", "agents", "bob.toml")), false);
  assert.equal(await readFile(own, "utf8"), "my agent");
  assert.equal(await readFile(legacy, "utf8"), "2.0 leftover");
  assert.equal(await readFile(history, "utf8"), "history");
  assert.deepEqual((await manifest(home)).entries, {});
  const once = await snapshot(home);
  ok(run(home, ["uninstall"]));
  assert.deepEqual(await snapshot(home), once);
});

test("shared roster and skills survive partial uninstall; install does not forget other harnesses", async (t) => {
  const { home } = await scratch(t);
  ok(run(home, ["install", "--codex"]));
  ok(run(home, ["reference", "--opencode"]));
  ok(run(home, ["install", "--claude", "--no-reference"]));
  const procedure = path.join(home, ".agents", "skills", "orchestrate", "out-of-scope-issues.md");
  const procedureBytes = await readFile(procedure, "utf8");
  ok(run(home, ["uninstall", "--codex"]));
  const data = await manifest(home);
  assert.deepEqual(data.entries["home:block:AGENTS.md"].owners, ["opencode"]);
  assert.deepEqual(data.entries["skills:file:orchestrate/out-of-scope-issues.md"].owners, ["opencode"]);
  assert.equal(await readFile(procedure, "utf8"), procedureBytes);
  assert.ok(Object.values(data.entries).some((entry) => entry.root === "skills" && entry.owners.includes("opencode")));
  assert.ok((await readFile(path.join(home, "AGENTS.md"), "utf8")).includes("agent-team-config:start"));
  assert.ok(existsSync(path.join(home, ".claude", "agents", "bob.md")));
  ok(run(home, ["uninstall", "--opencode"]));
  assert.equal(existsSync(procedure), false);
  assert.equal((await readFile(path.join(home, "AGENTS.md"), "utf8")).includes("agent-team-config:start"), false);
});

test("Copilot profiles and skills are tracked and removed independently", async (t) => {
  const { home } = await scratch(t);
  ok(run(home, ["install", "--copilot"]));
  const profile = path.join(home, ".copilot", "agents", "bob.agent.md");
  const skill = path.join(home, ".copilot", "skills", "orchestrate", "SKILL.md");
  assert.ok(existsSync(profile));
  assert.ok(existsSync(skill));
  assert.ok((await manifest(home)).entries["copilot:file:agents/bob.agent.md"]);

  ok(run(home, ["uninstall", "--copilot"]));
  assert.equal(existsSync(profile), false);
  assert.equal(existsSync(skill), false);
  assert.equal(existsSync(path.join(home, ".claude")), false);
  assert.equal(existsSync(path.join(home, ".codex")), false);
  assert.equal((await readFile(path.join(home, "AGENTS.md"), "utf8")).includes("agent-team-config:start"), false);
});

test("core agent edits are preserved on reinstall and uninstall; previous backups are never overwritten", async (t) => {
  const { home } = await scratch(t);
  ok(run(home, ["install", "--claude", "--no-reference"]));
  const agent = path.join(home, ".claude", "agents", "bob.md");
  await writeFile(agent, "first edit");
  ok(run(home, ["install", "--claude", "--no-reference"]));
  assert.equal(await readFile(agent + ".local.bak", "utf8"), "first edit");
  await writeFile(agent, "second edit");
  ok(run(home, ["uninstall", "--claude"]));
  assert.equal(await readFile(agent + ".local.bak", "utf8"), "first edit");
  assert.equal(await readFile(agent + ".local-1.bak", "utf8"), "second edit");
  assert.equal(existsSync(agent), false);
});

test("pre-manifest identical files are observed; overwritten files keep their first backup", async (t) => {
  const { home } = await scratch(t);
  ok(run(home, ["install", "--codex", "--no-reference"]));
  await rm(manifestFile(home));
  const bob = path.join(home, ".codex", "agents", "bob.toml");
  const archie = path.join(home, ".codex", "agents", "archie.toml");
  await writeFile(archie, "prior local agent");
  ok(run(home, ["install", "--codex", "--no-reference"]));
  let data = await manifest(home);
  assert.equal(data.entries["codex:file:agents/bob.toml"].provenance, "observed");
  assert.equal(data.entries["codex:file:agents/archie.toml"].provenance, "modified");
  const first = data.entries["codex:file:agents/archie.toml"].backup;
  ok(run(home, ["install", "--codex", "--no-reference"]));
  data = await manifest(home);
  assert.equal(data.entries["codex:file:agents/archie.toml"].backup, first);
  ok(run(home, ["uninstall"]));
  assert.ok(existsSync(bob));
  assert.equal(existsSync(archie), false);
  assert.equal(await readFile(archie + ".local.bak", "utf8"), "prior local agent");
});

test("managed block edits are backed up and mixed line endings/BOM outside markers stay exact", async (t) => {
  const { home } = await scratch(t);
  ok(run(home, ["reference", "--codex"]));
  const file = path.join(home, ".codex", "AGENTS.md");
  const original = await readFile(file);
  const start = "<!-- agent-team-config:codex:start -->", end = "<!-- agent-team-config:codex:end -->";
  const block = removeManagedBlock(original, [start, end]).block;
  const before = Buffer.from("\ufeffpersonal\r\n\r\n"), after = Buffer.from("\n\ntrailing  \r\n");
  const edited = Buffer.from(block.toString().replace("# canonkit", "# edited canonkit"));
  await writeFile(file, Buffer.concat([before, edited, after]));
  ok(run(home, ["uninstall", "--codex"]));
  assert.deepEqual(await readFile(file), Buffer.concat([before, after]));
  assert.deepEqual(await readFile(file + ".local.bak"), Buffer.concat([before, edited, after]));
});

test("dry runs write nothing and an untracked uninstall only reports manual cleanup", async (t) => {
  const { home } = await scratch(t);
  const empty = await snapshot(home);
  ok(run(home, ["install", "--codex", "--wire-hooks", "--dry-run"]));
  assert.deepEqual(await snapshot(home), empty);
  const missing = run(home, ["uninstall"]);
  assert.equal(missing.status, 1);
  assert.match(missing.out, /No install manifest/);
  assert.deepEqual(await snapshot(home), empty);
  ok(run(home, ["install", "--codex", "--wire-hooks"]));
  const installed = await snapshot(home);
  ok(run(home, ["uninstall", "--dry-run"]));
  assert.deepEqual(await snapshot(home), installed);
});

test("Claude unwiring keeps unrelated handlers, matchers, settings and later user changes", async (t) => {
  const { home } = await scratch(t);
  const settings = path.join(home, ".claude", "settings.json");
  const mine = { matcher: "Read", hooks: [{ type: "command", command: "my-validator" }] };
  await put(settings, JSON.stringify({ env: { LOCAL: "keep" }, hooks: { PreToolUse: [mine] } }));
  ok(run(home, ["install", "--claude", "--wire-hooks"]));
  const current = JSON.parse(await readFile(settings, "utf8"));
  current.model = "later-choice";
  // Put our handler in a shared group, with the user's handler first.
  const installed = current.hooks.PreToolUse.pop();
  current.hooks.PreToolUse[0].hooks.push(...installed.hooks);
  await writeFile(settings, JSON.stringify(current));
  ok(run(home, ["uninstall", "--claude"]));
  const after = JSON.parse(await readFile(settings, "utf8"));
  assert.deepEqual(after.hooks.PreToolUse, [mine]);
  assert.equal(after.env.LOCAL, "keep");
  assert.equal(after.model, "later-choice");
  assert.equal(existsSync(path.join(home, ".claude", "hooks", "canonkit-hook.js")), false);
});

for (const harness of ["claude", "codex", "opencode"]) {
  for (const preexisting of [false, true]) {
    test(`${harness} JSON observation preserves snapshot evidence after unrelated edits (${preexisting ? "modified" : "created"})`, async (t) => {
      const { home, root } = await scratch(t);
      const env = harness === "opencode" ? await opencodeBin(root) : {};
      const dir = harness === "opencode" ? path.join(home, ".config", "opencode") : path.join(home, `.${harness}`);
      const name = harness === "claude" ? "settings.json" : harness === "codex" ? "hooks.json" : "opencode.json";
      const config = path.join(dir, name);
      const id = `${harness}:json:${name}`;
      if (preexisting) await put(config, JSON.stringify({ model: "original", personal: { keep: true } }));
      const install = ["install", `--${harness}`, "--wire-hooks", "--no-reference"];
      ok(run(home, install, env));
      const recorded = (await manifest(home)).entries[id];
      assert.equal(recorded.provenance, preexisting ? "modified" : "created");

      const edited = JSON.parse(await readFile(config, "utf8"));
      edited.model = "later-choice";
      edited.personal = { keep: "later edit" };
      await writeFile(config, JSON.stringify(edited));
      const beforeReinstall = await snapshot(home);
      ok(run(home, install, env));
      const observed = (await manifest(home)).entries[id];
      const afterReinstall = await snapshot(home);
      ok(run(home, ["uninstall", `--${harness}`], env));

      assert.deepEqual(observed, recorded, "observation must preserve the recorded snapshot/hash pair and provenance");
      assert.deepEqual(afterReinstall, beforeReinstall, "a no-op reinstall must not change files, receipts or private snapshots");
      const after = JSON.parse(await readFile(config, "utf8"));
      assert.equal(after.model, "later-choice");
      assert.deepEqual(after.personal, { keep: "later edit" });
      if (harness === "opencode") assert.deepEqual(after.permissions, []);
      else assert.doesNotMatch(JSON.stringify(after.hooks ?? {}), /canonkit-(?:hook|codex)\.js/);
      const payload = path.join(dir, harness === "claude" ? "hooks" : "canonkit", harness === "claude" ? "canonkit-hook.js" : `canonkit-${harness}.js`);
      assert.equal(existsSync(payload), false, "the harness must not be retained by inconsistent snapshot evidence");
      assert.deepEqual((await manifest(home)).entries, {});
    });
  }
}

test("Codex removes its trailing group but retains interleaved wiring and runtime without shifting trust", async (t) => {
  const { home } = await scratch(t);
  ok(run(home, ["install", "--codex", "--wire-hooks"]));
  const hooks = path.join(home, ".codex", "hooks.json");
  const data = JSON.parse(await readFile(hooks, "utf8"));
  const other = { matcher: "Read", hooks: [{ type: "command", command: "some-other-hook" }] };
  data.hooks.PreToolUse.push(other);
  await writeFile(hooks, JSON.stringify(data));
  const before = await snapshot(home);
  const denied = run(home, ["uninstall", "--codex"]);
  assert.equal(denied.status, 1);
  assert.match(denied.out, /trust index/);
  assert.deepEqual(await snapshot(home), before);
  assert.ok(existsSync(path.join(home, ".codex", "canonkit", "canonkit-codex.js")));
  data.hooks.PreToolUse.unshift(data.hooks.PreToolUse.pop());
  await writeFile(hooks, JSON.stringify(data));
  ok(run(home, ["uninstall", "--codex"]));
  assert.deepEqual(JSON.parse(await readFile(hooks, "utf8")).hooks.PreToolUse, [other]);
});

test("preexisting Codex wiring remains observed and keeps its required runtime", async (t) => {
  const { home } = await scratch(t);
  ok(run(home, ["install", "--codex", "--wire-hooks"]));
  await rm(manifestFile(home));
  ok(run(home, ["install", "--codex", "--wire-hooks"]));
  const before = await snapshot(home);
  const result = run(home, ["uninstall"]);
  assert.equal(result.status, 1);
  assert.match(result.out, /References remain/);
  assert.deepEqual(await snapshot(home), before);
});

test("OpenCode removes only newly appended asks and puts edited plugin backups outside plugins", async (t) => {
  const { home, root } = await scratch(t);
  const env = await opencodeBin(root);
  const config = path.join(home, ".config", "opencode", "opencode.json");
  const existing = { action: "shell", resource: "git commit *", effect: "ask" };
  await put(config, JSON.stringify({ permissions: [existing], model: "keep" }));
  ok(run(home, ["install", "--opencode", "--wire-hooks"], env));
  const plugin = path.join(home, ".config", "opencode", "plugins", "canonkit.js");
  await writeFile(plugin, "// local plugin edit\n");
  ok(run(home, ["uninstall", "--opencode"], env));
  assert.deepEqual(JSON.parse(await readFile(config, "utf8")), { permissions: [existing], model: "keep" });
  assert.equal(existsSync(path.dirname(plugin)), false);
  const backups = path.join(home, ".canonkit", "backups");
  const contents = await Promise.all((await readdir(backups)).map((name) => readFile(path.join(backups, name), "utf8")));
  assert.ok(contents.includes("// local plugin edit\n"));
});

test("OpenCode moved preexisting rules block automatic undo and preserve the installation", async (t) => {
  const { home, root } = await scratch(t);
  const env = await opencodeBin(root);
  const config = path.join(home, ".config", "opencode", "opencode.json");
  await put(config, JSON.stringify({ permissions: [{ action: "shell", resource: "git commit *", effect: "ask" }, { action: "shell", resource: "*", effect: "allow" }] }));
  ok(run(home, ["install", "--opencode", "--wire-hooks"], env));
  const before = await snapshot(home);
  const result = run(home, ["uninstall", "--opencode"], env);
  assert.equal(result.status, 1);
  assert.match(result.out, /preexisting permission rules/);
  assert.deepEqual(await snapshot(home), before);
});

test("invalid configuration and duplicate block markers preserve their harness before deletion", async (t) => {
  const { home } = await scratch(t);
  ok(run(home, ["install", "--claude", "--wire-hooks"]));
  const config = path.join(home, ".claude", "settings.json");
  await writeFile(config, "invalid json");
  let before = await snapshot(home);
  assert.equal(run(home, ["uninstall"]).status, 1);
  assert.deepEqual(await snapshot(home), before);
  await writeFile(config, "{}");
  const file = path.join(home, ".claude", "CLAUDE.md");
  await writeFile(file, (await readFile(file, "utf8")) + "<!-- agent-team-config:routing:start -->");
  before = await snapshot(home);
  assert.equal(run(home, ["uninstall"]).status, 1);
  assert.deepEqual(await snapshot(home), before);
});

test("known local wiring and legacy forwarders keep executable payloads", async (t) => {
  const { home } = await scratch(t);
  ok(run(home, ["install", "--claude", "--wire-hooks"]));
  await put(path.join(home, ".claude", "settings.local.json"), JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: 'node "canonkit-hook.js"' }] }] } }));
  const before = await snapshot(home);
  const result = run(home, ["uninstall"]);
  assert.equal(result.status, 1);
  assert.match(result.out, /settings.local.json/);
  assert.deepEqual(await snapshot(home), before);
});

test("custom roots are honored and changing a recorded root cannot redirect uninstall", async (t) => {
  const { home, root } = await scratch(t);
  const custom = path.join(root, "custom-codex");
  ok(run(home, ["install", "--codex", "--wire-hooks"], { CODEX_HOME: custom }));
  assert.equal(existsSync(path.join(home, ".codex")), false);
  const before = await snapshot(root);
  const wrong = run(home, ["uninstall", "--codex"]);
  assert.equal(wrong.status, 1);
  assert.match(wrong.out, /root changed/);
  assert.deepEqual(await snapshot(root), before);
  ok(run(home, ["uninstall", "--codex"], { CODEX_HOME: custom }));
});

test("corrupt manifests and forged destinations cannot delete an arbitrary file", async (t) => {
  const { home } = await scratch(t);
  ok(run(home, ["install", "--claude", "--no-reference"]));
  const user = path.join(home, "keep.txt");
  await writeFile(user, "private user content");
  const original = await manifest(home);
  for (const data of [{ ...original, schemaVersion: 999 }, { ...original, entries: { ...original.entries, "claude:file:agents/bob.md": { ...original.entries["claude:file:agents/bob.md"], relative: "../keep.txt" } } }]) {
    await writeFile(manifestFile(home), JSON.stringify(data));
    const before = await snapshot(home);
    assert.equal(run(home, ["uninstall"]).status, 1);
    assert.deepEqual(await snapshot(home), before);
    assert.equal(await readFile(user, "utf8"), "private user content");
  }
});

test("junctions/symlinks cannot redirect a tracked deletion outside its recorded root", async (t) => {
  const { home, root } = await scratch(t);
  ok(run(home, ["install", "--codex", "--no-reference"]));
  const agents = path.join(home, ".codex", "agents"), outside = path.join(root, "outside");
  await mkdir(outside);
  await writeFile(path.join(outside, "bob.toml"), "outside");
  await rm(agents, { recursive: true });
  try { await symlink(outside, agents, process.platform === "win32" ? "junction" : "dir"); }
  catch (err) { if (["EPERM", "EACCES"].includes(err.code)) { t.skip("OS does not permit links"); return; } throw err; }
  const result = run(home, ["uninstall"]);
  assert.equal(result.status, 1);
  assert.match(result.out, /link or junction/);
  assert.equal(await readFile(path.join(outside, "bob.toml"), "utf8"), "outside");
});

function store(home, checkpoint = async () => {}) {
  return new InstallManifest({ home, roots: { home }, catalog: [{ id: "home:file:artifact.txt", root: "home", relative: "artifact.txt", kind: "file", owners: ["claude"] }], targets: ["claude"], checkpoint });
}
for (const phase of ["intent", "mutation"]) {
  test(`interruption after ${phase} is recovered from actual bytes, with original ownership`, async (t) => {
    const { home } = await scratch(t);
    const interrupted = store(home, async (at) => { if (at === phase) throw new Error("interrupted"); });
    await assert.rejects(interrupted.write(path.join(home, "artifact.txt"), "installed"), /interrupted/);
    await interrupted.close();
    assert.ok((await manifest(home)).pending);
    const resumed = store(home);
    try { await resumed.write(path.join(home, "artifact.txt"), "installed"); }
    finally { await resumed.close(); }
    assert.equal((await manifest(home)).pending, null);
    assert.equal((await manifest(home)).entries["home:file:artifact.txt"].provenance, "created");
    assert.equal(await readFile(path.join(home, "artifact.txt"), "utf8"), "installed");
  });
}
test("conflicting recovery preserves bytes and journal; concurrent mutation is refused", async (t) => {
  const { home } = await scratch(t);
  const first = store(home, async (at) => { if (at === "mutation") throw new Error("interrupted"); });
  await assert.rejects(first.write(path.join(home, "artifact.txt"), "installed"), /interrupted/);
  await first.close();
  await writeFile(path.join(home, "artifact.txt"), "concurrent local edit");
  const second = store(home);
  await assert.rejects(second.write(path.join(home, "artifact.txt"), "installed"), /conflicting bytes/);
  assert.ok((await manifest(home)).pending);
  assert.equal(await readFile(path.join(home, "artifact.txt"), "utf8"), "concurrent local edit");
});
test("an active lock serializes commands and private files have restricted POSIX permissions", async (t) => {
  const { home } = await scratch(t);
  const first = store(home), second = store(home);
  try {
    await first.write(path.join(home, "artifact.txt"), "installed");
    await assert.rejects(second.start(), /Another canonkit/);
    if (process.platform !== "win32") assert.equal((await lstat(manifestFile(home))).mode & 0o777, 0o600);
  } finally { await first.close(); await second.close(); }
});

test("configuration edits after preflight are retained instead of overwritten by a stale projection", async (t) => {
  const { home } = await scratch(t);
  const file = path.join(home, "settings.json");
  const catalog = [{ id: "home:json:settings.json", root: "home", relative: "settings.json", kind: "json", owners: ["claude"],
    undo: (_before, _installed, current) => {
      const data = JSON.parse(current);
      delete data.hook;
      return Buffer.from(JSON.stringify(data));
    } }];
  const installed = new InstallManifest({ home, roots: { home }, catalog, targets: ["claude"] });
  await writeFile(file, JSON.stringify({ user: "original" }));
  try { await installed.write(file, JSON.stringify({ user: "original", hook: true })); }
  finally { await installed.close(); }
  const removal = new InstallManifest({ home, roots: { home }, catalog, targets: ["claude"] });
  try {
    const result = await removal.uninstall({ references: async () => {
      await writeFile(file, JSON.stringify({ user: "concurrent edit", hook: true }));
      return [];
    } });
    assert.equal(result, 1);
    assert.deepEqual(JSON.parse(await readFile(file)), { user: "concurrent edit", hook: true });
    assert.ok((await manifest(home)).entries["home:json:settings.json"]);
  } finally { await removal.close(); }
});

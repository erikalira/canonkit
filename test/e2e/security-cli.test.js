import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, chmod, readdir, symlink, realpath, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { projectStateDir } from "../../bin/security.js";
import { CLI, runCli, startCli, writeCommand } from "../helpers/cli-harness.js";

async function fixture(t, version = "2.1.314") {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "canonkit-security-cli-")));
  t.after(async () => { assert.equal(path.dirname(root), await realpath(os.tmpdir())); await rm(root, { recursive: true, force: true }); });
  const home = path.join(root, "home"), project = path.join(root, "project"), bin = path.join(root, "bin");
  await mkdir(home); await mkdir(bin); await mkdir(path.join(project, ".git"), { recursive: true });
  await writeFile(path.join(project, ".git", "HEAD"), "ref: refs/heads/main\n");
  const script = path.join(bin, "version.cjs");
  await writeFile(script, `if (process.argv.slice(2).join(' ') !== '--version') process.exit(2); console.log(${JSON.stringify(version)});`);
  await writeCommand(bin, "claude", script);
  const env = { PATH: bin };
  const run = (args, cwd = project, extra = {}) => {
    const argv = args[0] === "doctor" && !args.includes("--verbose") ? [...args, "--verbose"] : args;
    const result = runCli(argv, { home, cwd, env: { ...env, ...extra } });
    assert.ifError(result.error);
    return result;
  };
  const global = path.join(home, ".claude", "settings.json"), local = path.join(project, ".claude", "settings.json");
  const start = (args, cli = CLI) => startCli(args, { home, cwd: project, env, cli });
  return { root, home, project, bin, run, start, global, local };
}
async function put(file, value) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, typeof value === "string" ? value : JSON.stringify(value)); }
const json = async (file) => JSON.parse(await readFile(file, "utf8"));
const kitHandler = (home, name = "canonkit-hook.js") => ({ type: "command", command: `node "${path.join(home, ".claude", "hooks", name).split(path.sep).join("/")}"` });
async function bytes(root) {
  const out = {};
  for (const item of await readdir(root, { recursive: true, withFileTypes: true })) if (item.isFile()) {
    const file = path.join(item.parentPath ?? item.path, item.name);
    out[path.relative(root, file)] = (await readFile(file)).toString("base64");
  }
  return out;
}

test("install applies repository controls and only the approved global network key, preserving native modes", async (t) => {
  const f = await fixture(t);
  const user = { env: { PRIVATE_FIXTURE: "NEVER_PRINT_CANARY" }, permissions: { defaultMode: "auto", allow: ["fixture-allow"] }, hooks: { Notification: [{ hooks: [{ type: "command", command: "fixture-notification" }] }] } };
  const project = { autoMemoryEnabled: false, permissions: { defaultMode: "plan", deny: ["fixture-deny"] } };
  await put(f.global, user); await put(f.local, project);
  const result = f.run(["install", "--claude", "--no-reference"]);
  assert.equal(result.status, 0, result.out);
  assert.doesNotMatch(result.out, /NEVER_PRINT_CANARY|fixture-allow/);
  const afterUser = await json(f.global), afterProject = await json(f.local);
  assert.equal(afterUser.sandbox.network.strictAllowlist, true);
  delete afterUser.sandbox;
  assert.deepEqual(afterUser, user);
  assert.equal(afterProject.permissions.blockReadsOutsideWorkingDirectories, true);
  assert.equal(afterProject.permissions.blockWritesOutsideWorkingDirectories, true);
  assert.equal(afterProject.permissions.defaultMode, "plan");
  assert.deepEqual(afterProject.permissions.deny, ["fixture-deny"]);
  assert.equal(afterProject.hooks, undefined);
  const once = await bytes(f.home);
  assert.equal(f.run(["install", "--claude", "--no-reference"]).status, 0);
  assert.deepEqual(await bytes(f.home), once);
});

test("global network restriction composes with optional hook wiring and conservative global undo", async (t) => {
  const f = await fixture(t);
  const user = { permissions: { allow: ["fixture-allow"] }, env: { PRIVATE_FIXTURE: "CANARY" } };
  await put(f.global, user);
  const result = f.run(["install", "--claude", "--wire-hooks"]);
  assert.equal(result.status, 0, result.out);
  const settings = await json(f.global);
  assert.equal(settings.sandbox.network.strictAllowlist, true);
  assert.ok(settings.hooks.PreToolUse);
  assert.match(await readFile(path.join(f.home, ".claude", "CLAUDE.md"), "utf8"), /\[ENFORCED\]/);
  const localBefore = await readFile(f.local, "utf8");
  const uninstalled = f.run(["uninstall", "--claude"]);
  assert.equal(uninstalled.status, 0, uninstalled.out);
  assert.deepEqual(await json(f.global), user);
  assert.equal(await readFile(f.local, "utf8"), localBefore);
});

test("project-only reversal preserves global settings, later user edits and other repositories", async (t) => {
  const f = await fixture(t);
  assert.equal(f.run(["install", "--claude", "--no-reference"]).status, 0);
  const userBefore = await readFile(f.global, "utf8");
  const current = await json(f.local); current.permissions.blockWritesOutsideWorkingDirectories = false; current.theme = "later";
  await put(f.local, current);
  const result = f.run(["uninstall", "--project"]);
  assert.equal(result.status, 0, result.out);
  assert.deepEqual(await json(f.local), { permissions: { blockWritesOutsideWorkingDirectories: false }, theme: "later" });
  assert.equal(await readFile(f.global, "utf8"), userBefore);
  assert.ok(existsSync(path.join(f.home, ".claude", "agents", "bob.md")));
  assert.equal(f.run(["uninstall", "--project"]).status, 0);
  assert.equal(f.run(["uninstall", "--project", "--claude"]).status, 1);
  assert.equal(f.run(["uninstall", "--project"], f.home).status, 1);
});

test("project removal keeps sensitive backups in the private receipt store", async (t) => {
  const f = await fixture(t);
  const original = { env: { PRIVATE_FIXTURE: "SYNTHETIC_BACKUP_CANARY" } };
  await put(f.local, original);
  assert.equal(f.run(["install", "--claude", "--no-reference"]).status, 0);
  const removed = f.run(["uninstall", "--project"]);
  assert.equal(removed.status, 0, removed.out);
  assert.deepEqual(await json(f.local), original);
  assert.deepEqual((await readdir(path.dirname(f.local))).sort(), ["settings.json"]);
  const privateFiles = await bytes(projectStateDir(f.home, f.project));
  assert.ok(Object.entries(privateFiles).some(([file, content]) => file.startsWith("backups") && Buffer.from(content, "base64").includes("SYNTHETIC_BACKUP_CANARY")));
});

test("doctor fails when attributed repository or global restrictions disappear and remains read-only", async (t) => {
  const f = await fixture(t);
  assert.equal(f.run(["install", "--claude"]).status, 0);
  const installedProject = await readFile(f.local), installedUser = await readFile(f.global);
  for (const mutation of ["project-missing", "project-false", "user-missing", "user-false"]) {
    await writeFile(f.local, installedProject); await writeFile(f.global, installedUser);
    if (mutation === "project-missing") await rm(f.local);
    if (mutation === "user-missing") await rm(f.global);
    if (mutation === "project-false") {
      const data = await json(f.local); data.permissions.blockReadsOutsideWorkingDirectories = false; await put(f.local, data);
    }
    if (mutation === "user-false") {
      const data = await json(f.global); data.sandbox.network.strictAllowlist = false; await put(f.global, data);
    }
    const before = await bytes(f.root), diagnosis = f.run(["doctor"]);
    assert.equal(diagnosis.status, 1, diagnosis.out);
    assert.match(diagnosis.out, /FAIL +security claude tracked-policy/);
    assert.deepEqual(await bytes(f.root), before);
  }
});

test("security preflight rejects malformed project settings and symlinks before distribution writes", async (t) => {
  const f = await fixture(t);
  await put(f.local, '{"permissions": "NEVER_PRINT_CANARY"}');
  const malformed = f.run(["install", "--claude"]);
  assert.equal(malformed.status, 1);
  assert.doesNotMatch(malformed.out, /NEVER_PRINT_CANARY/);
  assert.equal(existsSync(path.join(f.home, ".canonkit")), false);
  assert.equal(existsSync(path.join(f.home, ".claude")), false);
  await rm(path.dirname(f.local), { recursive: true });
  await symlink(f.home, path.dirname(f.local), process.platform === "win32" ? "junction" : "dir");
  assert.equal(f.run(["install", "--claude"]).status, 1);
  assert.equal(existsSync(path.join(f.home, ".canonkit")), false);
});

test("no-repository installation adds no project fallback and dry run writes nothing", async (t) => {
  const f = await fixture(t);
  const before = await bytes(f.root);
  const dry = f.run(["install", "--claude", "--dry-run"]);
  assert.equal(dry.status, 0, dry.out);
  assert.deepEqual(await bytes(f.root), before);
  assert.match(dry.out, /checks not executed in dry run/);
  const global = f.run(["install", "--claude", "--no-reference", "--verbose"], f.home);
  assert.equal(global.status, 0, global.out);
  assert.match(global.out, /no validated repository/);
  assert.equal(existsSync(f.local), false);
  assert.deepEqual(await json(f.global), { sandbox: { network: { strictAllowlist: true } } });
});

test("diagnosis is read-only, target-aware and does not treat native configuration as isolation", async (t) => {
  const f = await fixture(t);
  assert.equal(f.run(["install", "--codex"]).status, 0);
  const before = await bytes(f.root), result = f.run(["doctor"]);
  assert.equal(result.status, 0, result.out);
  assert.doesNotMatch(result.out, /^FAIL +(?:agents|reference|hook)/m);
  assert.match(result.out, /security environment/);
  assert.match(result.out, /security claude.*unknown|security claude.*partial/);
  assert.match(result.out, /security codex/);
  assert.match(result.out, /security opencode/);
  assert.match(result.out, /security claude desired-profile/);
  assert.match(result.out, /security claude desired-controls/);
  assert.match(result.out, /security remediation.*install --claude.*Optional WSL2/);
  assert.deepEqual(await bytes(f.root), before);
});

test("default instructions report governance rather than active gates, including after reference refresh", async (t) => {
  const f = await fixture(t);
  assert.equal(f.run(["install", "--claude"]).status, 0);
  const instructions = path.join(f.home, ".claude", "CLAUDE.md");
  assert.doesNotMatch(await readFile(instructions, "utf8"), /\[ENFORCED\]/);
  assert.match(await readFile(instructions, "utf8"), /native permission modes remain authoritative/);
  assert.equal(f.run(["doctor"]).status, 0);
  assert.equal(f.run(["reference", "--claude"]).status, 0);
  assert.doesNotMatch(await readFile(instructions, "utf8"), /\[ENFORCED\]/);
});

test("project receipts have canonical scope and cannot redirect to another root", async (t) => {
  const f = await fixture(t);
  assert.equal(f.run(["install", "--claude", "--no-reference"]).status, 0);
  const receipt = path.join(projectStateDir(f.home, f.project), "install-manifest.json");
  const data = await json(receipt); data.roots.project = f.home;
  await put(receipt, data);
  const before = await readFile(f.local, "utf8");
  assert.equal(f.run(["uninstall", "--project"]).status, 1);
  assert.equal(await readFile(f.local, "utf8"), before);
});

for (const manual of [true, false]) test(`legacy hook receipt does not adopt a later personal network flag (${manual})`, async (t) => {
  const f = await fixture(t, "2.1.218");
  assert.equal(f.run(["install", "--claude", "--wire-hooks", "--no-reference"]).status, 0);
  const current = await json(f.global);
  current.sandbox = { network: { strictAllowlist: manual } };
  for (const group of current.hooks.PreToolUse) group.matcher = group.matcher.replace("|SendMessage", "");
  await put(f.global, current);
  await writeFile(path.join(f.bin, "version.cjs"), "if (process.argv.slice(2).join(' ') !== '--version') process.exit(2); console.log('2.1.314');");
  const updated = f.run(["install", "--claude", "--wire-hooks", "--no-reference"]);
  assert.equal(updated.status, 0, updated.out);
  const removed = f.run(["uninstall", "--claude"]);
  assert.equal(removed.status, 0, removed.out);
  assert.equal((await json(f.global)).sandbox.network.strictAllowlist, manual);
});

test("project receipt does not adopt a manual write restriction during a version upgrade", async (t) => {
  const f = await fixture(t, "2.1.302");
  assert.equal(f.run(["install", "--claude", "--no-reference"]).status, 0);
  const current = await json(f.local);
  current.permissions.blockWritesOutsideWorkingDirectories = true;
  current.permissions.blockReadsOutsideWorkingDirectories = false;
  await put(f.local, current);
  await writeFile(path.join(f.bin, "version.cjs"), "if (process.argv.slice(2).join(' ') !== '--version') process.exit(2); console.log('2.1.314');");
  assert.equal(f.run(["install", "--claude", "--no-reference"]).status, 0);
  const removed = f.run(["uninstall", "--project"]);
  assert.equal(removed.status, 0, removed.out);
  assert.deepEqual((await json(f.local)).permissions, { blockWritesOutsideWorkingDirectories: true, blockReadsOutsideWorkingDirectories: false });
});

test("nested invocation excludes ancestor repository binaries from version probes", async (t) => {
  const f = await fixture(t), nested = path.join(f.project, "nested"), planted = path.join(f.project, "node_modules", ".bin");
  await mkdir(nested); await mkdir(planted, { recursive: true });
  const marker = path.join(f.project, "PLANTED_RAN");
  const script = path.join(planted, "planted.cjs");
  await writeFile(script, `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ran');console.log('9.9.9');`);
  if (process.platform === "win32") await writeFile(path.join(planted, "claude.cmd"), `@"${process.execPath}" "${script}" %*\r\n`);
  else { await writeFile(path.join(planted, "claude"), `#!/bin/sh\nexec "${process.execPath}" "${script}" "$@"\n`); await chmod(path.join(planted, "claude"), 0o755); }
  const result = f.run(["install", "--claude", "--no-reference"], nested, { PATH: [planted, f.bin].join(path.delimiter) });
  assert.equal(result.status, 0, result.out);
  assert.equal(existsSync(marker), false);
  assert.equal((await json(f.local)).permissions.blockWritesOutsideWorkingDirectories, true);
});

test("custom Claude configuration root stays consistent and changing it refuses existing ownership", async (t) => {
  const f = await fixture(t), custom = path.join(f.home, "custom-claude");
  const result = f.run(["install", "--claude"], f.project, { CLAUDE_CONFIG_DIR: custom });
  assert.equal(result.status, 0, result.out);
  assert.equal(existsSync(path.join(custom, "agents", "bob.md")), true);
  assert.equal((await json(path.join(custom, "settings.json"))).sandbox.network.strictAllowlist, true);
  assert.equal(existsSync(path.join(custom, "CLAUDE.md")), true);
  assert.equal(existsSync(path.join(f.home, ".claude")), false);
  const before = await bytes(f.home);
  const refused = f.run(["install", "--claude"], f.project, { CLAUDE_CONFIG_DIR: path.join(f.home, "different-claude") });
  assert.equal(refused.status, 1, refused.out);
  assert.deepEqual(await bytes(f.home), before);
});

test("native upgrade removes only canonical legacy handlers in its two settings scopes", async (t) => {
  const f = await fixture(t), third = { type: "command", command: "third-party-private-validator" };
  const user = { permissions: { defaultMode: "auto", allow: ["PRIVATE_ALLOW_CANARY"] }, env: { SECRET: "PRIVATE_ENV_CANARY" }, hooks: { PreToolUse: [{ matcher: "Read", custom: "keep", hooks: [kitHandler(f.home), third] }], Stop: [{ hooks: [kitHandler(f.home, "meu-time-hook.js")] }] } };
  const project = { permissions: { defaultMode: "plan", deny: ["fixture"] }, hooks: { Stop: [{ hooks: [kitHandler(f.home)] }] } };
  const local = path.join(f.project, ".claude", "settings.local.json"), other = path.join(f.root, "other-repo", ".claude", "settings.json");
  await put(f.global, user); await put(f.local, project); await put(local, { personal: "local-unchanged" }); await put(other, project);
  const localBefore = await readFile(local), otherBefore = await readFile(other);
  const result = f.run(["install", "--claude"]);
  assert.equal(result.status, 0, result.out);
  assert.doesNotMatch(result.out, /PRIVATE_ALLOW_CANARY|PRIVATE_ENV_CANARY|third-party-private-validator/);
  assert.deepEqual((await json(f.global)).hooks, { PreToolUse: [{ matcher: "Read", custom: "keep", hooks: [third] }] });
  assert.equal((await json(f.local)).hooks, undefined);
  assert.equal((await json(f.global)).permissions.defaultMode, "auto");
  assert.deepEqual((await json(f.global)).permissions.allow, user.permissions.allow);
  assert.equal((await json(f.local)).permissions.defaultMode, "plan");
  assert.deepEqual(await readFile(local), localBefore); assert.deepEqual(await readFile(other), otherBefore);
  assert.doesNotMatch(await readFile(path.join(f.home, ".claude", "CLAUDE.md"), "utf8"), /\[ENFORCED\]/);
  assert.equal((await readdir(path.join(f.home, ".canonkit", "backups"))).length, 2, "one global JSON before/after snapshot pair");
  assert.equal((await readdir(path.join(projectStateDir(f.home, f.project), "backups"))).length, 2, "one repository JSON before/after snapshot pair");
  const once = await bytes(f.root);
  assert.equal(f.run(["install", "--claude"]).status, 0);
  assert.deepEqual(await bytes(f.root), once);
  assert.equal(f.run(["uninstall", "--project"]).status, 0);
  assert.equal((await json(f.local)).hooks, undefined);
  const removed = f.run(["uninstall", "--claude"]);
  assert.equal(removed.status, 0, removed.out);
  assert.deepEqual((await json(f.global)).hooks, { PreToolUse: [{ matcher: "Read", custom: "keep", hooks: [third] }] });
});

for (const rewire of [false, true]) test(`legacy receipt migration never resurrects gates on uninstall (explicit rewire ${rewire})`, async (t) => {
  const f = await fixture(t);
  await put(f.global, { hooks: { Stop: [{ hooks: [kitHandler(f.home, "meu-time-hook.js")] }] } });
  assert.equal(f.run(["install", "--claude", "--wire-hooks"]).status, 0);
  assert.match(await readFile(path.join(f.home, ".claude", "CLAUDE.md"), "utf8"), /\[ENFORCED\]/);
  const dryBefore = await bytes(f.root), dry = f.run(["install", "--claude", "--dry-run"]);
  assert.equal(dry.status, 0, dry.out); assert.match(dry.out, /would unregister/);
  assert.deepEqual(await bytes(f.root), dryBefore);
  const instructions = path.join(f.home, ".claude", "CLAUDE.md"), roster = path.join(f.home, "AGENTS.md");
  const prefix = rewire ? "PERSONAL_PREFIX\n" : "\uFEFFPERSONAL_PREFIX\r\nMIXED_PREFIX\n";
  const suffix = rewire ? "\nPERSONAL_SUFFIX" : "\r\nPERSONAL_SUFFIX\nMIXED_SUFFIX\r\n";
  await writeFile(instructions, prefix + await readFile(instructions, "utf8") + suffix);
  const beforeRoster = await readFile(roster);
  const native = f.run(["install", "--claude", ...(!rewire ? ["--no-reference"] : [])]);
  assert.equal(native.status, 0, native.out);
  assert.deepEqual(await readFile(roster), beforeRoster);
  const refreshed = await readFile(instructions, "utf8");
  assert.ok(refreshed.startsWith(prefix)); assert.ok(refreshed.endsWith(suffix));
  assert.equal((await json(f.global)).hooks, undefined);
  assert.doesNotMatch(await readFile(path.join(f.home, ".claude", "CLAUDE.md"), "utf8"), /\[ENFORCED\]/);
  if (rewire) {
    const wired = f.run(["install", "--claude", "--wire-hooks"]);
    assert.equal(wired.status, 0, wired.out);
    assert.ok((await json(f.global)).hooks.PreToolUse);
  }
  const result = f.run(["uninstall", "--claude"]);
  assert.equal(result.status, 0, result.out);
  assert.equal((await json(f.global)).hooks, undefined);
});

test("uninstall after explicit canonical wiring preserves metadata in an emptied legacy group", async (t) => {
  const f = await fixture(t);
  await put(f.global, { hooks: { Stop: [{ custom: "keep", matcher: "*", hooks: [kitHandler(f.home)] }] } });
  assert.equal(f.run(["install", "--claude", "--wire-hooks", "--no-reference"]).status, 0);
  const removed = f.run(["uninstall", "--claude"]);
  assert.equal(removed.status, 0, removed.out);
  assert.deepEqual((await json(f.global)).hooks, { Stop: [{ custom: "keep", matcher: "*", hooks: [] }] });
});

test("migration preserves ambiguous commands and local registrations without printing values", async (t) => {
  const f = await fixture(t), wrapper = { type: "command", command: "PRIVATE_COMMAND_CANARY node /foreign/canonkit-hook.js" };
  const foreign = { type: "command", command: 'node "/foreign/canonkit-hook.js"' };
  await put(f.global, { hooks: { Stop: [{ hooks: [kitHandler(f.home), wrapper, foreign] }] } });
  const local = path.join(f.home, ".claude", "settings.local.json");
  await put(local, { hooks: { Stop: [{ hooks: [kitHandler(f.home)] }] } });
  const beforeLocal = await readFile(local);
  const result = f.run(["install", "--claude", "--no-reference"]);
  assert.equal(result.status, 0, result.out);
  assert.deepEqual((await json(f.global)).hooks.Stop[0].hooks, [wrapper, foreign]);
  assert.match(result.out, /WARN migration user hooks\[/);
  assert.doesNotMatch(result.out, /PRIVATE_COMMAND_CANARY|\/foreign/);
  assert.deepEqual(await readFile(local), beforeLocal);
  assert.equal(f.run(["uninstall", "--claude"]).status, 1, "residual references must retain the runtime");
});

test("migration works without a supported version and never touches unselected Claude settings", async (t) => {
  const f = await fixture(t, "2.1.218");
  const original = { hooks: { Stop: [{ hooks: [kitHandler(f.home)] }] } };
  await put(f.global, original);
  assert.equal(f.run(["install", "--codex"]).status, 0);
  assert.deepEqual(await json(f.global), original);
  const result = f.run(["install", "--claude", "--no-reference"], f.home);
  assert.equal(result.status, 0, result.out);
  assert.equal((await json(f.global)).hooks, undefined);
  assert.equal((await json(f.global)).sandbox, undefined);
  assert.equal(existsSync(f.local), false);
});

test("native migration preflights hook shapes and distribution paths before any selected writes", async (t) => {
  const f = await fixture(t);
  await put(f.global, { hooks: { Stop: [{ hooks: [kitHandler(f.home)] }] } });
  await put(f.local, { hooks: { Stop: "PRIVATE_BAD_SHAPE" } });
  let before = await bytes(f.root), result = f.run(["install", "--claude", "--codex"]);
  assert.equal(result.status, 1); assert.doesNotMatch(result.out, /PRIVATE_BAD_SHAPE/);
  assert.deepEqual(await bytes(f.root), before);
  await rm(f.local); await put(path.join(f.home, ".claude", "agents"), "not-a-directory");
  before = await bytes(f.root); result = f.run(["install", "--claude"]);
  assert.equal(result.status, 1); assert.deepEqual(await bytes(f.root), before);
});

for (const failure of ["repository-edit", "distribution-failure"]) test(`post-preflight ${failure} preserves completed migration and supports retry`, { timeout: 30000 }, async (t) => {
  const f = await fixture(t), original = { hooks: { Stop: [{ hooks: [kitHandler(f.home)] }] } };
  const edit = { permissions: { defaultMode: "plan" }, personal: "concurrent-edit" };
  await put(f.global, original); await put(f.local, failure === "repository-edit" ? original : edit);
  const instructions = path.join(f.home, ".claude", "CLAUDE.md");
  const oldRouting = await readFile(path.join(path.dirname(CLI), "..", "reference", "routing-block.md"), "utf8");
  await put(instructions, `PERSONAL_PREFIX\n<!-- agent-team-config:routing:start -->\n${oldRouting}\n<!-- agent-team-config:routing:end -->\nPERSONAL_SUFFIX`);
  // Pause a disposable copy at the precise boundary being tested. Timing the
  // distribution itself makes the race depend on host scheduling and speed.
  const pkg = path.join(f.root, "package"), ready = path.join(f.root, "ready"), release = path.join(f.root, "release");
  for (const name of ["bin", "agents", "reference", "hooks", "dashboard", "skills", "tools", "stack-packs", "package.json"]) await cp(path.join(path.dirname(CLI), "..", name), path.join(pkg, name), { recursive: true });
  const fixtureCli = path.join(pkg, "bin", "cli.js"), source = await readFile(fixtureCli, "utf8"), checkpoint = "await applyClaudeUserPlan(configured);";
  assert.equal(source.split(checkpoint).length, 2);
  const barrier = "if (completed.length) throw new Error('Synthetic distribution interruption');";
  await writeFile(fixtureCli, source.replace(checkpoint, `${checkpoint}\nawait writeFile(${JSON.stringify(ready)}, 'ready');\nwhile (!existsSync(${JSON.stringify(release)})) await new Promise(resolve => setTimeout(resolve, 20));`).replace("await installDistribution(configured, options);", `${failure === "distribution-failure" ? barrier : ""}\nawait installDistribution(configured, options);`));
  const child = f.start(["install", "--claude", "--no-reference"], fixtureCli);
  t.after(() => { if (child.exitCode === null) child.kill(); });
  let output = ""; child.stdout.on("data", (chunk) => output += chunk); child.stderr.on("data", (chunk) => output += chunk);
  const completion = new Promise((resolve, reject) => { child.on("error", reject); child.on("exit", resolve); });
  let observed = false;
  for (let tries = 0; tries < 1000; tries++) {
    if (existsSync(ready)) { observed = true; break; }
    if (child.exitCode !== null) break;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.ok(observed, output);
  await put(f.local, edit);
  await writeFile(release, "continue");
  assert.equal(await completion, 1, output);
  assert.deepEqual(await json(f.local), edit);
  assert.equal((await json(f.global)).hooks, undefined);
  assert.match(output, /Partial installation: completed user Claude settings/);
  assert.match(output, /Removed hook registrations were not restored/);
  const retry = f.run(["install", "--claude", "--no-reference"]);
  assert.equal(retry.status, 0, retry.out);
  assert.equal((await json(f.local)).permissions.defaultMode, "plan");
  const refreshed = await readFile(instructions, "utf8");
  assert.doesNotMatch(refreshed, /\[ENFORCED\]/);
  assert.ok(refreshed.startsWith("PERSONAL_PREFIX\n")); assert.ok(refreshed.endsWith("PERSONAL_SUFFIX"));
});

test("foreign hook homonyms never justify active canonkit instruction claims", async (t) => {
  const f = await fixture(t);
  assert.equal(f.run(["install", "--claude", "--wire-hooks"]).status, 0);
  const settings = await json(f.global);
  for (const groups of Object.values(settings.hooks)) for (const group of groups) for (const hook of group.hooks) hook.command = 'node "/foreign/canonkit-hook.js"';
  await put(f.global, settings);
  const native = f.run(["install", "--claude"]);
  assert.equal(native.status, 0, native.out);
  assert.deepEqual((await json(f.global)).hooks, settings.hooks);
  assert.doesNotMatch(await readFile(path.join(f.home, ".claude", "CLAUDE.md"), "utf8"), /\[ENFORCED\]/);
});

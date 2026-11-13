import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, chmod, readdir, symlink, realpath, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { projectStateDir, collectEnvironment } from "../../bin/security.js";
import { CLI, runCli, startCli, writeCommand } from "../helpers/cli-harness.js";
import { runMain } from "../helpers/interactive-install.js";
import { askLine, askReviewMode } from "../../bin/cli.js";
import { PassThrough } from "node:stream";

async function fixture(t, version = "2.1.314", { sandbox = false } = {}) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "canonkit-security-cli-")));
  t.after(async () => { assert.equal(path.dirname(root), await realpath(os.tmpdir())); await rm(root, { recursive: true, force: true }); });
  const home = path.join(root, "home"), project = path.join(root, "project"), bin = path.join(root, "bin");
  await mkdir(home); await mkdir(bin); await mkdir(path.join(project, ".git"), { recursive: true });
  await writeFile(path.join(project, ".git", "HEAD"), "ref: refs/heads/main\n");
  const script = path.join(bin, "version.cjs");
  await writeFile(script, `if (process.argv.slice(2).join(' ') !== '--version') process.exit(2); console.log(${JSON.stringify(version)});`);
  await writeCommand(bin, "claude", script);
  if (sandbox) {
    await writeCommand(bin, "bwrap", script);
    await writeCommand(bin, "socat", script);
  }
  // NVM_DIR blank: a developer's own nvm folder must not decide where the fixture's node counts as nvm.
  const env = { PATH: bin, NVM_DIR: "" };
  if (process.platform === "win32") {
    const systemRoot = process.env.SystemRoot ?? process.env.SYSTEMROOT ?? process.env.WINDIR ?? "C:\\Windows";
    env.SystemRoot = systemRoot;
    env.ComSpec = process.env.ComSpec ?? process.env.COMSPEC ?? path.join(systemRoot, "System32", "cmd.exe");
  }
  const run = (args, cwd = project, extra = {}) => {
    const argv = args[0] === "doctor" && !args.includes("--verbose") ? [...args, "--verbose"] : args;
    const result = runCli(argv, { home, cwd, env: { ...env, ...extra } });
    assert.ifError(result.error);
    return result;
  };
  const global = path.join(home, ".claude", "settings.json"), local = path.join(project, ".claude", "settings.json");
  const start = (args, cli = CLI) => startCli(args, { home, cwd: project, env, cli });
  return { root, home, project, bin, env, run, start, global, local };
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
  const f = await fixture(t, "2.1.314", { sandbox: true });
  const user = { env: { PRIVATE_FIXTURE: "NEVER_PRINT_CANARY" }, permissions: { defaultMode: "auto", allow: ["fixture-allow"] }, hooks: { Notification: [{ hooks: [{ type: "command", command: "fixture-notification" }] }] } };
  const project = { autoMemoryEnabled: false, permissions: { defaultMode: "plan", deny: ["fixture-deny"] } };
  await put(f.global, user); await put(f.local, project);
  const result = f.run(["install", "--claude", "--no-reference"]);
  assert.equal(result.status, 0, result.out);
  assert.doesNotMatch(result.out, /NEVER_PRINT_CANARY|fixture-allow/);
  const afterUser = await json(f.global), afterProject = await json(f.local);
  const environment = await collectEnvironment({ cwd: f.project, env: f.env });
  assert.equal(afterUser.sandbox.network.strictAllowlist, true);
  delete afterUser.sandbox;
  assert.deepEqual(afterUser, user);
  assert.equal(afterProject.permissions.blockReadsOutsideWorkingDirectories, true);
  assert.equal(afterProject.permissions.blockWritesOutsideWorkingDirectories, true);
  assert.equal(afterProject.sandbox?.autoAllowBashIfSandboxed, environment.sandboxCapability === "available-unverified" ? true : undefined);
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
  const f = await fixture(t, "2.1.314", { sandbox: true });
  await put(f.local, { sandbox: { excludedCommands: ["fixture"] }, custom: "before" });
  assert.equal(f.run(["install", "--claude", "--no-reference"]).status, 0);
  const userBefore = await readFile(f.global, "utf8");
  const current = await json(f.local); current.permissions.blockWritesOutsideWorkingDirectories = false; current.theme = "later";
  await put(f.local, current);
  const result = f.run(["uninstall", "--project"]);
  assert.equal(result.status, 0, result.out);
  const restored = await json(f.local);
  assert.equal(restored.sandbox.autoAllowBashIfSandboxed, undefined);
  assert.deepEqual(restored, { sandbox: { excludedCommands: ["fixture"] }, custom: "before", permissions: { blockWritesOutsideWorkingDirectories: false }, theme: "later" });
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
  const f = await fixture(t, "2.1.314", { sandbox: true });
  const before = await bytes(f.root);
  const environment = await collectEnvironment({ cwd: f.project, env: f.env });
  const dry = f.run(["install", "--claude", "--dry-run", "--verbose"]);
  assert.equal(dry.status, 0, dry.out);
  assert.deepEqual(await bytes(f.root), before);
  assert.match(dry.out, /checks not executed in dry run/);
  if (environment.sandboxCapability === "available-unverified") {
    assert.match(dry.out, /would apply repository control: sandbox\.autoAllowBashIfSandboxed: true/);
    assert.match(dry.out, /conditional on Claude >= 2\.1\.302; version not probed in dry run/);
  }
  else assert.doesNotMatch(dry.out, /would apply repository control: sandbox\.autoAllowBashIfSandboxed/);
  const global = f.run(["install", "--claude", "--no-reference", "--verbose"], f.home);
  assert.equal(global.status, 0, global.out);
  assert.match(global.out, /no validated repository/);
  assert.equal(existsSync(f.local), false);
  assert.deepEqual(await json(f.global), { sandbox: { network: { strictAllowlist: true } } });
});

test("explicit false is recommended during install and doctor without doctor writes", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  const evidence = await collectEnvironment({ cwd: f.project, env: f.env });
  if (evidence.sandboxCapability !== "available-unverified") { t.skip("host has no supported sandbox capability"); return; }
  await put(f.local, { sandbox: { autoAllowBashIfSandboxed: false } });
  const installed = f.run(["install", "--claude", "--no-reference"]);
  assert.equal(installed.status, 0, installed.out);
  assert.match(installed.out, /RECOMMENDATION security approval: set sandbox\.autoAllowBashIfSandboxed to true in this repository's \.claude\/settings\.json/);
  assert.equal((await json(f.local)).sandbox.autoAllowBashIfSandboxed, false);
  const beforeDoctor = await readFile(f.local);
  const diagnosis = f.run(["doctor"]);
  assert.match(diagnosis.out, /security claude approval-recommendation.*this repository's \.claude\/settings\.json/);
  assert.deepEqual(await readFile(f.local), beforeDoctor);

  const personal = await fixture(t, "2.1.314", { sandbox: true });
  await put(personal.global, { sandbox: { autoAllowBashIfSandboxed: false } });
  const personalInstall = personal.run(["install", "--claude", "--no-reference"]);
  assert.equal(personalInstall.status, 0, personalInstall.out);
  assert.match(personalInstall.out, /RECOMMENDATION security approval: set sandbox\.autoAllowBashIfSandboxed to true in user Claude settings/);
  assert.equal((await json(personal.local)).sandbox.autoAllowBashIfSandboxed, undefined);
  assert.equal((await json(personal.global)).sandbox.autoAllowBashIfSandboxed, false);
  const personalBeforeDoctor = await readFile(personal.global);
  const personalDiagnosis = personal.run(["doctor"]);
  assert.match(personalDiagnosis.out, /security claude approval-recommendation.*user Claude settings/);
  assert.deepEqual(await readFile(personal.global), personalBeforeDoctor);
});

test("project-local sandbox escape suppresses the shared auto-approval default in install and dry run", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  const evidence = await collectEnvironment({ cwd: f.project, env: f.env });
  if (evidence.sandboxCapability !== "available-unverified") { t.skip("host has no supported sandbox capability"); return; }
  const localFile = path.join(f.project, ".claude", "settings.local.json");
  const localSettings = { sandbox: { allowUnsandboxedCommands: true }, custom: { keep: "unchanged" } };
  await put(localFile, localSettings);
  const beforeLocal = await readFile(localFile);
  const installed = f.run(["install", "--claude", "--no-reference"]);
  assert.equal(installed.status, 0, installed.out);
  const shared = await json(f.local);
  assert.equal(shared.sandbox.enabled, true);
  assert.equal(shared.sandbox.failIfUnavailable, true);
  assert.equal(shared.sandbox.allowUnsandboxedCommands, false);
  assert.equal(shared.sandbox.autoAllowBashIfSandboxed, undefined);
  assert.deepEqual(await readFile(localFile), beforeLocal);

  const dry = await fixture(t, "2.1.314", { sandbox: true });
  const dryLocal = path.join(dry.project, ".claude", "settings.local.json");
  await put(dryLocal, localSettings);
  const dryBefore = await bytes(dry.root);
  const preview = dry.run(["install", "--claude", "--dry-run", "--verbose"]);
  assert.equal(preview.status, 0, preview.out);
  assert.doesNotMatch(preview.out, /would apply repository control: sandbox\.autoAllowBashIfSandboxed/);
  assert.deepEqual(await bytes(dry.root), dryBefore);
});

test("project-local auto-approval overrides shared false and suppresses the stale recommendation", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  const localFile = path.join(f.project, ".claude", "settings.local.json");
  await put(f.local, { sandbox: { autoAllowBashIfSandboxed: false } });
  await put(localFile, { sandbox: { autoAllowBashIfSandboxed: true } });
  const beforeLocal = await readFile(localFile);
  const installed = f.run(["install", "--claude", "--no-reference"]);
  assert.equal(installed.status, 0, installed.out);
  assert.doesNotMatch(installed.out, /RECOMMENDATION security approval/);
  assert.equal((await json(f.local)).sandbox.autoAllowBashIfSandboxed, false);
  assert.equal((await json(localFile)).sandbox.autoAllowBashIfSandboxed, true);
  assert.deepEqual(await readFile(localFile), beforeLocal);
  const beforeDoctor = await readFile(f.local);
  const diagnosis = f.run(["doctor"]);
  assert.doesNotMatch(diagnosis.out, /security claude approval-recommendation/);
  assert.deepEqual(await readFile(f.local), beforeDoctor);
});

test("unknown project-local sandbox settings suppress the default and dry-run preview without changing bytes", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  const evidence = await collectEnvironment({ cwd: f.project, env: f.env });
  if (evidence.sandboxCapability !== "available-unverified") { t.skip("host has no supported sandbox capability"); return; }
  const localFile = path.join(f.project, ".claude", "settings.local.json");
  const hiddenLocalPolicy = Buffer.from('{"sandbox":{"allowUnsandboxedCommands":true');
  await put(localFile, hiddenLocalPolicy.toString("utf8"));
  const install = f.run(["install", "--claude", "--no-reference"]);
  assert.equal(install.status, 0, install.out);
  assert.equal((await json(f.local)).sandbox.autoAllowBashIfSandboxed, undefined);
  assert.deepEqual(await readFile(localFile), hiddenLocalPolicy);

  const dry = await fixture(t, "2.1.314", { sandbox: true });
  const dryLocal = path.join(dry.project, ".claude", "settings.local.json");
  await put(dryLocal, hiddenLocalPolicy.toString("utf8"));
  const before = await bytes(dry.root);
  const preview = dry.run(["install", "--claude", "--dry-run", "--verbose"]);
  assert.equal(preview.status, 0, preview.out);
  assert.doesNotMatch(preview.out, /would apply repository control: sandbox\.autoAllowBashIfSandboxed/);
  assert.deepEqual(await bytes(dry.root), before);
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

// ---- Empty settings files, the install security review and runtime reads ----

test("an empty user or repository settings.json is read as {} by install and install --wire-hooks", async (t) => {
  for (const empty of ["", "  \n\t", "﻿"]) {
    for (const wire of [false, true]) {
      const f = await fixture(t);
      await put(f.global, empty); await put(f.local, empty);
      const result = f.run(["install", "--claude", "--no-reference", ...(wire ? ["--wire-hooks"] : [])]);
      assert.equal(result.status, 0, `${JSON.stringify(empty)} wire=${wire}\n${result.out}`);
      // A byte-order mark the user had is kept, so it is stripped here only for parsing.
      const read = async (file) => JSON.parse((await readFile(file, "utf8")).replace(/^﻿/, ""));
      const user = await read(f.global), project = await read(f.local);
      assert.equal(user.sandbox.network.strictAllowlist, true);
      assert.deepEqual(Object.keys(user).sort(), wire ? ["hooks", "sandbox"] : ["sandbox"]);
      assert.deepEqual(project, { permissions: { blockReadsOutsideWorkingDirectories: true, blockWritesOutsideWorkingDirectories: true } });
      // Doctor reads the same files without calling them malformed.
      assert.doesNotMatch(f.run(["doctor"]).out, /malformed or inaccessible configuration/);
    }
  }
  const broken = await fixture(t);
  await put(broken.local, "{");
  const refused = broken.run(["install", "--claude", "--no-reference"]);
  assert.equal(refused.status, 1);
  assert.equal(existsSync(path.join(broken.home, ".claude")), false);
});

const STRICT_PROJECT = { permissions: { blockReadsOutsideWorkingDirectories: true, blockWritesOutsideWorkingDirectories: true }, sandbox: { enabled: true, failIfUnavailable: true, allowUnsandboxedCommands: false, autoAllowBashIfSandboxed: true } };
const withProject = (patch) => ({ permissions: { ...STRICT_PROJECT.permissions, ...patch.permissions }, sandbox: { ...STRICT_PROJECT.sandbox, ...patch.sandbox } });
const INSTALL = ["install", "--claude", "--no-reference"];

async function capable(t, f) {
  const evidence = await collectEnvironment({ cwd: f.project, env: f.env });
  if (evidence.sandboxCapability === "available-unverified") return true;
  t.skip("host has no supported sandbox capability");
  return false;
}
// A node under an nvm layout in the fixture home, first on PATH.
async function nvmNode(f, ...parts) {
  const dir = path.join(f.home, ...(parts.length ? parts : [".nvm", "versions", "node", "v20.0.0", "bin"]));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "node"), "#!/bin/sh\n", { mode: 0o755 });
  return [dir, f.bin].join(path.delimiter);
}
const interactive = (f, { confirm = async () => true, choose = async () => "apply", args = INSTALL, env = {} } = {}) =>
  runMain(args, { home: f.home, cwd: f.project, env: { PATH: f.bin, ...env }, confirmAction: confirm, choose });
const never = async (question) => { throw new Error(`unexpected question: ${question}`); };
const fileBytes = (file) => readFile(file).catch(() => null);

test("interactive install: apply writes recommended values and detected runtime reads, then a second install asks nothing", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, f)) return;
  const PATH = await nvmNode(f);
  await put(f.local, { custom: "keep", sandbox: { autoAllowBashIfSandboxed: false, allowUnsandboxedCommands: true }, permissions: { blockReadsOutsideWorkingDirectories: false } });
  await put(f.global, { custom: "user", sandbox: { filesystem: { allowRead: ["~/mine"] } } });
  const first = await interactive(f, { env: { PATH } });
  assert.equal(first.status, 0, first.out);
  assert.match(first.out, /Security review/);
  assert.match(first.out, /Runtime folders sandboxed commands need to read \(user settings\):\n\s+\+ ~\/\.nvm\s+node \(nvm\)/);
  assert.match(first.out, /Repository settings weaker than the recommended strict sandbox:/);
  assert.match(first.out, /sandbox\.autoAllowBashIfSandboxed\s+false -> true\s+\(sandboxed commands run without a prompt each/);
  assert.match(first.out, /sandbox\.allowUnsandboxedCommands\s+true -> false/);
  assert.match(first.out, /permissions\.blockReadsOutsideWorkingDirectories\s+false -> true/);
  assert.equal(first.questions.length, 2);
  assert.match(first.questions[0], /Add them\? \(recommended so sandboxed commands can find your tools\) \[y\/n\]/);
  assert.match(first.questions[1], /\[A\]pply \(recommended\) \/ \[K\]eep current \/ \[C\]hoose per key: $/);
  const project = await json(f.local);
  assert.deepEqual(project, { custom: "keep", ...withProject({}) });
  const user = await json(f.global);
  assert.equal(user.custom, "user");
  assert.deepEqual(user.sandbox.filesystem.allowRead, ["~/mine", "~/.nvm"]);
  assert.equal(user.sandbox.network.strictAllowlist, true);

  // Idempotent and quiet once everything is recommended and covered; doctor accepts the receipt.
  const settled = await bytes(f.home), settledProject = await fileBytes(f.local);
  const second = await interactive(f, { env: { PATH }, confirm: never, choose: never });
  assert.equal(second.status, 0, second.out);
  assert.deepEqual(second.questions, []);
  assert.doesNotMatch(second.out, /Security review/);
  assert.deepEqual(await bytes(f.home), settled);
  assert.deepEqual(await fileBytes(f.local), settledProject);
  const diagnosis = f.run(["doctor"], f.project, { PATH });
  assert.doesNotMatch(diagnosis.out, /FAIL +security/);
  assert.match(diagnosis.out, /OK +security claude runtime-reads: configured: ~\/\.nvm/);
});

test("interactive install: keep leaves repository settings byte-identical and declining runtime reads prints the snippet", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, f)) return;
  const PATH = await nvmNode(f);
  await put(f.local, withProject({ sandbox: { autoAllowBashIfSandboxed: false, allowUnsandboxedCommands: true } }));
  const before = await fileBytes(f.local);
  const result = await interactive(f, { env: { PATH }, confirm: async () => false, choose: async () => "keep" });
  assert.equal(result.status, 0, result.out);
  assert.deepEqual(await fileBytes(f.local), before);
  assert.equal((await json(f.global)).sandbox.filesystem, undefined);
  assert.match(result.out, /Kept sandbox\.allowUnsandboxedCommands: true \(recommended: false\)/);
  assert.match(result.out, /RECOMMENDATION security runtime-reads: declined.*\n\s*"sandbox": \{ "filesystem": \{ "allowRead": \["~\/\.nvm"\] \} \}/);
  assert.match(result.out, /RECOMMENDATION security approval: set sandbox\.autoAllowBashIfSandboxed to true in this repository's \.claude\/settings\.json/);
});

test("interactive install: choose per key writes only the chosen keys", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, f)) return;
  await put(f.local, withProject({ sandbox: { autoAllowBashIfSandboxed: false, allowUnsandboxedCommands: true } }));
  const result = await interactive(f, { choose: async () => "choose", confirm: async (question) => !/allowUnsandboxedCommands/.test(question) });
  assert.equal(result.status, 0, result.out);
  assert.equal(result.questions.length, 3);
  assert.match(result.questions.join("\n"), /Change sandbox\.autoAllowBashIfSandboxed from false to true\? \[y\/n\]/);
  assert.match(result.questions.join("\n"), /Change sandbox\.allowUnsandboxedCommands from true to false\? \[y\/n\]/);
  assert.deepEqual(await json(f.local), withProject({ sandbox: { allowUnsandboxedCommands: true } }));
});

test("interactive install on a 3.0.0 project: leftover auto-approval false is offered, changed on apply and preserved on keep", async (t) => {
  const upgraded = withProject({ sandbox: { autoAllowBashIfSandboxed: false } });
  const apply = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, apply)) return;
  await put(apply.local, upgraded);
  const applied = await interactive(apply);
  assert.equal(applied.status, 0, applied.out);
  assert.match(applied.out, /sandbox\.autoAllowBashIfSandboxed\s+false -> true/);
  assert.deepEqual(await json(apply.local), STRICT_PROJECT);
  assert.doesNotMatch(applied.out, /RECOMMENDATION security approval/);

  const keep = await fixture(t, "2.1.314", { sandbox: true });
  await put(keep.local, upgraded);
  const before = await fileBytes(keep.local);
  const kept = await interactive(keep, { choose: async () => "keep" });
  assert.equal(kept.status, 0, kept.out);
  assert.deepEqual(await fileBytes(keep.local), before);

  // A user-scope false is offered too, and "change" writes true to the repository file.
  const personal = await fixture(t, "2.1.314", { sandbox: true });
  await put(personal.global, { sandbox: { autoAllowBashIfSandboxed: false } });
  const changed = await interactive(personal);
  assert.equal(changed.status, 0, changed.out);
  assert.equal((await json(personal.local)).sandbox.autoAllowBashIfSandboxed, true);
  assert.equal((await json(personal.global)).sandbox.autoAllowBashIfSandboxed, false);
  const personalKeep = await fixture(t, "2.1.314", { sandbox: true });
  await put(personalKeep.global, { sandbox: { autoAllowBashIfSandboxed: false } });
  assert.equal((await interactive(personalKeep, { choose: async () => "keep" })).status, 0);
  assert.equal((await json(personalKeep.local)).sandbox.autoAllowBashIfSandboxed, undefined);
});

test("interactive install never writes or asks about settings.local.json values", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, f)) return;
  const localFile = path.join(f.project, ".claude", "settings.local.json");
  await put(localFile, { sandbox: { allowUnsandboxedCommands: true, enabled: false } });
  const before = await fileBytes(localFile);
  const result = await interactive(f, { confirm: never, choose: never });
  assert.equal(result.status, 0, result.out);
  assert.deepEqual(result.questions, []);
  assert.deepEqual(await fileBytes(localFile), before);
  assert.match(result.out, /WARN security local: sandbox\.enabled is false in this repository's \.claude\/settings\.local\.json; set it to true there/);
  assert.match(result.out, /WARN security local: sandbox\.allowUnsandboxedCommands is true/);
  assert.equal((await json(f.local)).sandbox.autoAllowBashIfSandboxed, undefined);
});

test("keeping a weaker sandbox switch does not enable automatic approval", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, f)) return;
  await put(f.local, { sandbox: { enabled: false } });
  const result = await interactive(f, { choose: async () => "keep" });
  assert.equal(result.status, 0, result.out);
  const project = await json(f.local);
  assert.equal(project.sandbox.enabled, false);
  assert.equal(project.sandbox.autoAllowBashIfSandboxed, undefined);
  assert.equal(project.sandbox.failIfUnavailable, true);
  assert.equal(project.sandbox.allowUnsandboxedCommands, false);
});

const WEAKER = [
  ["permissions.blockReadsOutsideWorkingDirectories", false, true], ["permissions.blockWritesOutsideWorkingDirectories", false, true],
  ["sandbox.enabled", false, true], ["sandbox.failIfUnavailable", false, true], ["sandbox.allowUnsandboxedCommands", true, false],
  ["sandbox.autoAllowBashIfSandboxed", false, false],
];
const dotted = (data, key) => key.split(".").reduce((value, part) => value?.[part], data);
const seed = (key, value) => key.split(".").reduceRight((inner, part) => ({ [part]: inner }), value);

test("without a terminal, --yes or --dry-run each weaker key behaves exactly as in 3.1.0", async (t) => {
  for (const [key, weak, expected] of WEAKER) {
    for (const args of [INSTALL, [...INSTALL, "--yes"]]) {
      const f = await fixture(t, "2.1.314", { sandbox: true });
      if (!await capable(t, f)) return;
      await put(f.local, seed(key, weak));
      const result = f.run([...args, "--verbose"]);
      assert.equal(result.status, 0, `${key}\n${result.out}`);
      assert.doesNotMatch(result.out, /Security review|Kept /);
      assert.equal(dotted(await json(f.local), key), expected, key);
      if (key.endsWith("autoAllowBashIfSandboxed")) assert.match(result.out, /RECOMMENDATION security approval: .*the explicit false was preserved/);
      else assert.match(result.out, new RegExp(`Applying repository control: ${key.replaceAll(".", "\\.")}`));
    }
  }
  // An interactive terminal that passes --yes, --dry-run or TERM=dumb is not asked either.
  for (const [extra, env] of [[["--yes"], {}], [["--dry-run"], {}], [[], { TERM: "dumb" }]]) {
    const f = await fixture(t, "2.1.314", { sandbox: true });
    if (!await capable(t, f)) return;
    const PATH = await nvmNode(f);
    await put(f.local, withProject({ sandbox: { allowUnsandboxedCommands: true, autoAllowBashIfSandboxed: false } }));
    const before = await bytes(f.root);
    const result = await interactive(f, { args: [...INSTALL, ...extra], env: { PATH, ...env }, confirm: never, choose: never });
    assert.equal(result.status, 0, `${extra} ${JSON.stringify(env)}\n${result.out}`);
    assert.deepEqual(result.questions, []);
    assert.doesNotMatch(result.out, /Security review/);
    if (extra[0] === "--dry-run") assert.deepEqual(await bytes(f.root), before);
    else {
      assert.equal((await json(f.local)).sandbox.allowUnsandboxedCommands, false);
      assert.equal((await json(f.local)).sandbox.autoAllowBashIfSandboxed, false);
      assert.equal((await json(f.global)).sandbox.filesystem, undefined);
    }
  }
});

test("without a terminal runtime reads are printed as a snippet and never written; unknown managers are reported", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, f)) return;
  const PATH = await nvmNode(f);
  const result = f.run([...INSTALL, "--verbose"], f.project, { PATH });
  assert.equal(result.status, 0, result.out);
  assert.match(result.out, /RECOMMENDATION security runtime-reads: add these to sandbox\.filesystem\.allowRead in user Claude settings/);
  assert.match(result.out, /"sandbox": \{ "filesystem": \{ "allowRead": \["~\/\.nvm"\] \} \}/);
  assert.equal((await json(f.global)).sandbox.filesystem, undefined);

  const dry = await fixture(t, "2.1.314", { sandbox: true });
  const dryPath = await nvmNode(dry);
  const before = await bytes(dry.root);
  const preview = dry.run([...INSTALL, "--dry-run", "--verbose"], dry.project, { PATH: dryPath });
  assert.equal(preview.status, 0, preview.out);
  assert.match(preview.out, /dry run: not written.*conditional on Claude >= 2\.1\.302, version not probed in dry run/);
  assert.match(preview.out, /\["~\/\.nvm"\]/);
  assert.deepEqual(await bytes(dry.root), before);

  const volta = await fixture(t, "2.1.314", { sandbox: true });
  const voltaPath = await nvmNode(volta, ".volta", "bin");
  const unknown = volta.run([...INSTALL, "--verbose"], volta.project, { PATH: voltaPath });
  assert.equal(unknown.status, 0, unknown.out);
  assert.match(unknown.out, /WARN security runtime-reads: ~\/\.volta\/bin\/node \(node\) is not a known runtime location/);
  assert.doesNotMatch(unknown.out, /RECOMMENDATION security runtime-reads/);
  assert.equal((await json(volta.global)).sandbox.filesystem, undefined);
});

test("covered runtime reads in any spelling, or nothing weaker, ask nothing and rewrite nothing", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, f)) return;
  const PATH = await nvmNode(f);
  const spelled = [`${f.home}/.nvm/`];
  await put(f.global, { sandbox: { filesystem: { allowRead: spelled } } });
  const first = await interactive(f, { env: { PATH }, confirm: never, choose: never });
  assert.equal(first.status, 0, first.out);
  assert.deepEqual((await json(f.global)).sandbox.filesystem.allowRead, spelled);
  const settled = await fileBytes(f.global);
  const again = await interactive(f, { env: { PATH }, confirm: never, choose: never });
  assert.equal(again.status, 0, again.out);
  assert.deepEqual(await fileBytes(f.global), settled);
  assert.doesNotMatch(again.out, /runtime-reads/);
});

test("doctor reports missing and over-broad runtime read exceptions as WARN, covered ones as OK, and writes nothing", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, f)) return;
  const PATH = await nvmNode(f);
  const check = () => { const before = f.run(["doctor"], f.project, { PATH }); return before; };
  const missing = check();
  assert.match(missing.out, /WARN +security claude runtime-reads: partial: ~\/\.nvm \(node \(nvm\)\) is not covered by sandbox\.filesystem\.allowRead.*canonkit install/);
  await put(f.global, { sandbox: { filesystem: { allowRead: ["~/.nvm"] } } });
  const covered = check();
  assert.match(covered.out, /OK +security claude runtime-reads: configured: ~\/\.nvm/);
  assert.doesNotMatch(covered.out, /WARN +security claude runtime-reads/);
  await put(f.global, { sandbox: { filesystem: { allowRead: ["~"] } } });
  const before = await bytes(f.root);
  const broad = check();
  assert.match(broad.out, /WARN +security claude runtime-reads: partial: a sandbox\.filesystem\.allowRead entry \(~\) covers the whole home directory/);
  assert.deepEqual(await bytes(f.root), before);
  // No detected runtime and no entry: no runtime-reads row at all.
  await put(f.global, {});
  assert.doesNotMatch(f.run(["doctor"]).out, /runtime-reads/);
});

test("askLine resolves null when its input ends instead of hanging, and returns a trimmed answer otherwise", async () => {
  const output = new PassThrough();
  const ended = new PassThrough();
  const pending = askLine("q? ", { input: ended, output });
  ended.end();
  assert.equal(await pending, null);
  const answered = new PassThrough();
  const reply = askLine("q? ", { input: answered, output });
  answered.write("  yes \n");
  assert.equal(await reply, "yes");
  assert.equal(await askReviewMode(async () => null, "q"), "keep");
});

const scripted = (answers) => async () => (answers.length ? answers.shift() : null);

test("the Apply/Keep/Choose question has no default: Enter and other answers ask again, then k keeps and a applies", async (t) => {
  const keep = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, keep)) return;
  await put(keep.local, withProject({ sandbox: { autoAllowBashIfSandboxed: false } }));
  const before = await fileBytes(keep.local);
  const answers = ["", "n", "não", "  K  "];
  const kept = await runMain(INSTALL, { home: keep.home, cwd: keep.project, env: { PATH: keep.bin }, readLine: scripted(answers) });
  assert.equal(kept.status, 0, kept.out);
  assert.equal(kept.questions.length, 4);
  assert.equal(new Set(kept.questions).size, 1, "the same question is asked again");
  assert.match(kept.out, /Please answer A \(apply\), K \(keep\) or C \(choose per key\)\./);
  assert.deepEqual(await fileBytes(keep.local), before);
  assert.match(kept.out, /RECOMMENDATION security approval/);

  const apply = await fixture(t, "2.1.314", { sandbox: true });
  await put(apply.local, withProject({ sandbox: { autoAllowBashIfSandboxed: false } }));
  const applied = await runMain(INSTALL, { home: apply.home, cwd: apply.project, env: { PATH: apply.bin }, readLine: scripted(["x", "A"]) });
  assert.equal(applied.status, 0, applied.out);
  assert.equal(applied.questions.length, 2);
  assert.equal((await json(apply.local)).sandbox.autoAllowBashIfSandboxed, true);

  const word = await fixture(t, "2.1.314", { sandbox: true });
  await put(word.local, withProject({ sandbox: { autoAllowBashIfSandboxed: false } }));
  const chosen = await runMain(INSTALL, { home: word.home, cwd: word.project, env: { PATH: word.bin }, readLine: scripted(["Choose", "y"]) });
  assert.equal(chosen.status, 0, chosen.out);
  assert.equal((await json(word.local)).sandbox.autoAllowBashIfSandboxed, true);
});

test("yes/no questions have no default: Enter asks again, then n keeps and y appends", async (t) => {
  const c = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, c)) return;
  await put(c.local, withProject({ sandbox: { autoAllowBashIfSandboxed: false } }));
  const before = await fileBytes(c.local);
  const kept = await runMain(INSTALL, { home: c.home, cwd: c.project, env: { PATH: c.bin }, readLine: scripted(["c", "", "maybe", "N"]) });
  assert.equal(kept.status, 0, kept.out);
  assert.equal(kept.questions.length, 4);
  assert.match(kept.questions[1], /Change sandbox\.autoAllowBashIfSandboxed from false to true\? \[y\/n\]/);
  assert.match(kept.out, /Please answer y or n\./);
  assert.deepEqual(await fileBytes(c.local), before);

  const r = await fixture(t, "2.1.314", { sandbox: true });
  const PATH = await nvmNode(r);
  const added = await runMain(INSTALL, { home: r.home, cwd: r.project, env: { PATH }, readLine: scripted(["", " YES "]) });
  assert.equal(added.status, 0, added.out);
  assert.equal(added.questions.length, 2);
  assert.match(added.questions[0], /Add them\?.*\[y\/n\]/);
  assert.deepEqual((await json(r.global)).sandbox.filesystem.allowRead, ["~/.nvm"]);
});

test("Ctrl-C during a security question aborts the install before any write", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, f)) return;
  const PATH = await nvmNode(f);
  await put(f.local, withProject({ sandbox: { autoAllowBashIfSandboxed: false } }));
  const before = await bytes(f.root);
  const interrupted = async () => { throw Object.assign(new Error("Interrupted during the security review; nothing was written"), { code: "INTERRUPTED" }); };
  await assert.rejects(runMain(INSTALL, { home: f.home, cwd: f.project, env: { PATH }, readLine: interrupted }), /Interrupted/);
  assert.deepEqual(await bytes(f.root), before);
  assert.equal(existsSync(path.join(f.home, ".claude")), false);

  // The real reader: Ctrl-C (\x03) on a terminal rejects with the same error.
  const input = new PassThrough(), output = new PassThrough();
  input.isTTY = true; input.setRawMode = () => input; output.isTTY = true;
  const pending = askLine("q? ", { input, output });
  input.write("\x03");
  await assert.rejects(pending, (error) => error.code === "INTERRUPTED");
});

test("a closed input (EOF) declines every pending question and writes nothing for them", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, f)) return;
  const PATH = await nvmNode(f);
  await put(f.local, withProject({ sandbox: { autoAllowBashIfSandboxed: false, allowUnsandboxedCommands: true } }));
  const before = await fileBytes(f.local);
  const result = await runMain(INSTALL, { home: f.home, cwd: f.project, env: { PATH }, readLine: async () => null });
  assert.equal(result.status, 0, result.out);
  assert.equal(result.questions.length, 2, "one runtime question and one review question, no re-ask loop");
  assert.deepEqual(await fileBytes(f.local), before);
  assert.equal((await json(f.global)).sandbox.filesystem, undefined);
  assert.match(result.out, /RECOMMENDATION security runtime-reads: declined/);
});

test("doctor does not trust a tampered receipt to silence warnings, and never crashes on a malformed one", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, f)) return;
  const PATH = await nvmNode(f);
  assert.equal((await interactive(f, { env: { PATH } })).status, 0);
  const receiptFile = path.join(f.home, ".canonkit", "install-manifest.json");
  const receipt = JSON.parse(await readFile(receiptFile, "utf8"));
  const record = receipt.entries["claude:json:settings.json"].securityChanges["sandbox.filesystem.allowRead"];
  const original = structuredClone(record);
  const settings = await json(f.global);
  settings.sandbox.filesystem.allowRead = ["~", "~/.nvm"];
  await put(f.global, settings);
  record.appendedItems = ["~/.nvm", "~"];
  await put(receiptFile, receipt);
  const forged = f.run(["doctor"], f.project, { PATH });
  assert.match(forged.out, /WARN +security claude filesystem-exceptions/);
  assert.match(forged.out, /runtime-reads: partial: a sandbox\.filesystem\.allowRead entry/);
  for (const bad of ["~/.nvm", 42, null, { a: 1 }, [42]]) {
    record.appendedItems = bad;
    await put(receiptFile, receipt);
    const result = f.run(["doctor"], f.project, { PATH });
    assert.ok(result.out.includes("security claude filesystem-exceptions"), JSON.stringify(bad));
    assert.doesNotMatch(result.out, /TypeError|at .*\.js:\d+/, JSON.stringify(bad));
  }
  assert.deepEqual(original.appendedItems, ["~/.nvm"]);
});

test("doctor accepts a receipt after the user removed an appended allowRead item, and does not warn about kit-owned items", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, f)) return;
  const PATH = await nvmNode(f);
  await put(f.global, { sandbox: { filesystem: { allowRead: ["~/mine"] } } });
  const installed = await interactive(f, { env: { PATH } });
  assert.equal(installed.status, 0, installed.out);
  assert.deepEqual((await json(f.global)).sandbox.filesystem.allowRead, ["~/mine", "~/.nvm"]);
  const owned = f.run(["doctor"], f.project, { PATH });
  // Only the user's own entry is an exception to review.
  assert.match(owned.out, /WARN +security claude filesystem-exceptions/);
  assert.doesNotMatch(owned.out, /FAIL +security/);

  const settings = await json(f.global);
  settings.sandbox.filesystem.allowRead = ["~/.nvm"];
  await put(f.global, settings);
  assert.doesNotMatch(f.run(["doctor"], f.project, { PATH }).out, /filesystem-exceptions/);

  settings.sandbox.filesystem.allowRead = ["~/mine"];
  await put(f.global, settings);
  const removed = f.run(["doctor"], f.project, { PATH });
  assert.doesNotMatch(removed.out, /FAIL +security/);
  assert.match(removed.out, /WARN +security claude runtime-reads: partial: ~\/\.nvm/);
});

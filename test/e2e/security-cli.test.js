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
    assert.match(dry.out, /would apply project security: sandbox\.autoAllowBashIfSandboxed/);
    assert.match(dry.out, /conditional on Claude >= 2\.1\.302 and OS sandbox support; version not probed\s+in dry run/);
  }
  else assert.doesNotMatch(dry.out, /would apply project security: sandbox\.autoAllowBashIfSandboxed/);
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
  assert.doesNotMatch(preview.out, /would apply project security: sandbox\.autoAllowBashIfSandboxed/);
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
  assert.doesNotMatch(preview.out, /would apply project security: sandbox\.autoAllowBashIfSandboxed/);
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
  assert.match(result.out, /project security not configured for this project.*install --claude/);
  assert.match(result.out, /security remediation.*install --claude.*Optional WSL2/);
  assert.deepEqual(await bytes(f.root), before);
});

test("doctor reports absent strict project keys as distinct actionable gaps", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, f)) return;
  const diagnosis = f.run(["doctor"]);
  assert.match(diagnosis.out, /sandbox\.enabled is not set in effective repository settings.*install --recommended/);
});

test("doctor reports project security as unconfigured after install --no-project", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, f)) return;
  const questions = [];
  const installed = await runMain(["install", "--claude", "--no-project", "--no-reference"], {
    home: f.home, cwd: f.project, env: f.env, securityAnswer: "recommended",
    prompt: async (question) => {
      questions.push(question.name);
      if (question.name === "install-confirmation") return { [question.name]: true };
      throw new Error(`unexpected prompt ${question.name}`);
    },
  });
  assert.equal(installed.status, 0, installed.out);
  assert.deepEqual(questions, ["install-confirmation"]);
  assert.equal(existsSync(f.local), false);
  const diagnosis = f.run(["doctor"]);
  assert.match(diagnosis.out, /project security not configured for this project.*install --claude/);
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
  const distribution = "await installDistribution(configured, { ...options, userModelChoices, userModelCatalog });";
  assert.equal(source.split(distribution).length, 2, "distribution checkpoint must match exactly once");
  await writeFile(fixtureCli, source.replace(checkpoint, `${checkpoint}\nawait writeFile(${JSON.stringify(ready)}, 'ready');\nwhile (!existsSync(${JSON.stringify(release)})) await new Promise(resolve => setTimeout(resolve, 20));`).replace(distribution, `${failure === "distribution-failure" ? barrier : ""}\n${distribution}`));
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
      const f = await fixture(t, "2.1.314", { sandbox: true });
      await put(f.global, empty); await put(f.local, empty);
      const result = f.run(["install", "--claude", "--no-reference", ...(wire ? ["--wire-hooks"] : [])]);
      assert.equal(result.status, 0, `${JSON.stringify(empty)} wire=${wire}\n${result.out}`);
      // A byte-order mark the user had is kept, so it is stripped here only for parsing.
      const read = async (file) => JSON.parse((await readFile(file, "utf8")).replace(/^﻿/, ""));
      const user = await read(f.global), project = await read(f.local);
      const environment = await collectEnvironment({ cwd: f.project, env: f.env });
      assert.equal(user.sandbox.network.strictAllowlist, true);
      assert.deepEqual(Object.keys(user).sort(), wire ? ["hooks", "sandbox"] : ["sandbox"]);
      assert.deepEqual(project, {
        permissions: { blockReadsOutsideWorkingDirectories: true, blockWritesOutsideWorkingDirectories: true },
        ...(environment.sandboxCapability === "available-unverified" ? { sandbox: {
          enabled: true,
          failIfUnavailable: true,
          allowUnsandboxedCommands: false,
          autoAllowBashIfSandboxed: true,
        } } : {}),
      });
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
const MODEL_SETUP_PROMPTS = ["deep-model", "deep-effort", "standard-model", "standard-effort", "light-model", "light-effort", "agents", "save"];
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
const answerModelPrompt = (question) => {
  if (question.name === "agents") return [];
  if (question.name === "save") return true;
  if (question.type === "text") return "";
  if (question.name?.endsWith("-model") || question.name?.endsWith("-effort")) return question.choices?.[question.initial ?? 0]?.value;
  return undefined;
};
const interactive = async (f, { confirm = async () => true, choose, securityAnswer, selectedRows, args = INSTALL, env = {}, prompt: givenPrompt } = {}) => {
  if (!securityAnswer && choose) {
    if (args.includes("--yes") || args.includes("--dry-run") || env.TERM === "dumb") securityAnswer = "recommended";
    else {
      let mode;
      try { mode = await choose("security", ["recommended", "keep", "customize"]); }
      catch { mode = "customize"; }
      securityAnswer = mode === "apply" || mode === "recommended" ? "recommended" : mode === "keep" ? "keep" : "customize";
    }
  }
  const prompt = givenPrompt ?? (async (question) => {
    if (question.name === "project-scope") return { [question.name]: true };
    if (["tools", "specialists", "stacks"].includes(question.name)) return { [question.name]: [] };
    if (question.name === "recommended-setup") return { [question.name]: "recommended" };
    if (question.name === "install-confirmation") return { [question.name]: true };
    if (question.name === "security-runtime-reads") return { [question.name]: await confirm("runtime reads") };
    if (question.name === "security-choices") {
      const selected = selectedRows ?? (choose
        ? await Promise.all(question.choices.map(async (choice) => await confirm(choice.value) ? choice.value : null)).then((values) => values.filter(Boolean))
        : question.choices.filter((choice) => choice.selected).map((choice) => choice.value));
      return { [question.name]: selected };
    }
    const modelAnswer = answerModelPrompt(question);
    if (modelAnswer !== undefined) return modelAnswer;
    return { [question.name]: question.choices?.[question.initial ?? 0]?.value };
  });
  return runMain(args, { home: f.home, cwd: f.project, env: { PATH: f.bin, ...env }, prompt, securityAnswer });
};
const never = async (question) => { throw new Error(`unexpected question: ${question}`); };
const fileBytes = (file) => readFile(file).catch(() => null);

test("interactive install: customize writes selected values and detected runtime reads, then keep asks no security questions", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, f)) return;
  const PATH = await nvmNode(f);
  await put(f.local, { custom: "keep", sandbox: { autoAllowBashIfSandboxed: false, allowUnsandboxedCommands: true }, permissions: { blockReadsOutsideWorkingDirectories: false } });
  await put(f.global, { custom: "user", sandbox: { filesystem: { allowRead: ["~/mine"] } } });
  const first = await interactive(f, { env: { PATH }, choose: async () => "customize" });
  assert.equal(first.status, 0, first.out);
  assert.deepEqual(first.questions.map((question) => question.name), ["project-scope", ...MODEL_SETUP_PROMPTS, "security-runtime-reads", "security-choices", "install-confirmation"]);
  assert.equal(first.questions[0].type, "select");
  assert.match(first.questions[0].hint, /user-level setup only/);
  const runtimeQuestion = first.questions.find((question) => question.name === "security-runtime-reads");
  assert.equal(runtimeQuestion.type, "select");
  assert.match(runtimeQuestion.choices[0].title, /Yes, add them \(recommended\)/);
  assert.match(runtimeQuestion.hint, /Enter adds/);
  const securityQuestion = first.questions.find((question) => question.name === "security-choices");
  assert.equal(securityQuestion.type, "multiselect");
  assert.ok(securityQuestion.choices.every((choice) => choice.selected));
  assert.match(securityQuestion.hint, /Unchecked keeps current/);
  const project = await json(f.local);
  assert.deepEqual(project, { custom: "keep", ...withProject({}) });
  const user = await json(f.global);
  assert.equal(user.custom, "user");
  assert.deepEqual(user.sandbox.filesystem.allowRead, ["~/mine", "~/.nvm"]);
  assert.equal(user.sandbox.network.strictAllowlist, true);

  // Idempotent and quiet once everything is recommended and covered; doctor accepts the receipt.
  const settled = await bytes(f.home), settledProject = await fileBytes(f.local);
  const second = await interactive(f, { env: { PATH }, confirm: never, securityAnswer: "keep" });
  assert.equal(second.status, 0, second.out);
  assert.deepEqual(second.questions.map((question) => question.name), ["project-scope", "install-confirmation"]);
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
  const before = await fileBytes(f.local), beforeGlobal = await fileBytes(f.global);
  const result = await interactive(f, { env: { PATH }, confirm: async () => false, choose: async () => "keep" });
  assert.equal(result.status, 0, result.out);
  assert.deepEqual(await fileBytes(f.local), before);
  assert.deepEqual(await fileBytes(f.global), beforeGlobal);
  assert.match(result.out, /RECOMMENDATION security settings \(not written; apply with canonkit install --recommended\):/);
  assert.match(result.out, /sandbox\.allowUnsandboxedCommands  true  ->  false/);
  assert.match(result.out, /RECOMMENDATION security runtime-reads: kept current.*\n\s*"sandbox": \{ "filesystem": \{ "allowRead": \["~\/\.nvm"\] \} \}/);
  assert.match(result.out, /RECOMMENDATION security approval: set sandbox\.autoAllowBashIfSandboxed to true in this repository's \.claude\/settings\.json/);
});

test("guided install offers keep current for security changes without saved model choices", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, f)) return;
  await put(f.local, {});
  const beforeGlobal = await fileBytes(f.global), beforeProject = await fileBytes(f.local);
  let setupChoices;
  const result = await interactive(f, {
    prompt: async (question) => {
      if (question.name === "project-scope") return { [question.name]: true };
      if (["tools", "specialists", "stacks"].includes(question.name)) return { [question.name]: [] };
      if (question.name === "recommended-setup") {
        setupChoices = question.choices.map((choice) => choice.value);
        return { [question.name]: "keep" };
      }
      if (question.name === "install-confirmation") return { [question.name]: true };
      throw new Error(`unexpected prompt ${question.name}`);
    },
  });
  assert.equal(result.status, 0, result.out);
  assert.deepEqual(setupChoices, ["recommended", "keep", "customize"], result.out);
  assert.equal(existsSync(path.join(f.home, ".canonkit", "models.json")), false);
  assert.deepEqual(await fileBytes(f.global), beforeGlobal);
  assert.deepEqual(await fileBytes(f.local), beforeProject);
});

test("interactive install: choose per key writes only the chosen keys", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, f)) return;
  await put(f.local, withProject({ sandbox: { autoAllowBashIfSandboxed: false, allowUnsandboxedCommands: true } }));
  const result = await interactive(f, { choose: async () => "choose", confirm: async (question) => !/allowUnsandboxedCommands/.test(question) });
  assert.equal(result.status, 0, result.out);
  assert.deepEqual(result.questions.map((question) => question.name), ["project-scope", ...MODEL_SETUP_PROMPTS, "security-choices", "install-confirmation"]);
  assert.ok(result.questions.find((question) => question.name === "security-choices").choices.some((choice) => choice.value === "project:sandbox.autoAllowBashIfSandboxed"));
  assert.ok(result.questions.find((question) => question.name === "security-choices").choices.some((choice) => choice.value === "project:sandbox.allowUnsandboxedCommands"));
  assert.deepEqual(await json(f.local), withProject({ sandbox: { allowUnsandboxedCommands: true, autoAllowBashIfSandboxed: false } }));
});

test("interactive install on a 3.0.0 project: leftover auto-approval false is offered, changed on apply and preserved on keep", async (t) => {
  const upgraded = withProject({ sandbox: { autoAllowBashIfSandboxed: false } });
  const apply = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, apply)) return;
  await put(apply.local, upgraded);
  const applied = await interactive(apply);
  assert.equal(applied.status, 0, applied.out);
  assert.match(applied.out, /sandbox\.autoAllowBashIfSandboxed\s+false\s+->\s+true/);
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
  assert.equal(await fileBytes(personalKeep.local), null);
});

test("interactive install never writes or asks about settings.local.json values", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, f)) return;
  const localFile = path.join(f.project, ".claude", "settings.local.json");
  await put(localFile, { sandbox: { allowUnsandboxedCommands: true, enabled: false } });
  const before = await fileBytes(localFile);
  const result = await interactive(f, { securityAnswer: "recommended" });
  assert.equal(result.status, 0, result.out);
  assert.deepEqual(result.questions.map((question) => question.name), ["project-scope", "install-confirmation"]);
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
  assert.equal(project.sandbox.failIfUnavailable, undefined);
  assert.equal(project.sandbox.allowUnsandboxedCommands, undefined);
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
      else assert.match(result.out, new RegExp(`Applying project security: ${key.replaceAll(".", "\\.")}`));
    }
  }
  // An interactive terminal that passes --yes, --dry-run or TERM=dumb is not asked either.
  for (const [extra, env] of [[["--yes"], {}], [["--dry-run"], {}], [[], { TERM: "dumb" }]]) {
    const f = await fixture(t, "2.1.314", { sandbox: true });
    if (!await capable(t, f)) return;
    const PATH = await nvmNode(f);
    await put(f.local, withProject({ sandbox: { allowUnsandboxedCommands: true, autoAllowBashIfSandboxed: false } }));
    const before = await bytes(f.root);
    const result = await interactive(f, { args: [...INSTALL, ...extra], env: { PATH, ...env }, confirm: never });
    assert.equal(result.status, 0, `${extra} ${JSON.stringify(env)}\n${result.out}`);
    assert.deepEqual(result.questions.map((question) => question.name), extra[0] === "--dry-run"
      ? ["project-scope", "recommended-setup"] : ["project-scope", "recommended-setup", "install-confirmation"]);
    assert.doesNotMatch(result.out, /Security review/);
    if (extra[0] === "--dry-run") assert.deepEqual(await bytes(f.root), before);
    else {
      assert.equal((await json(f.local)).sandbox.allowUnsandboxedCommands, false);
      assert.equal((await json(f.local)).sandbox.autoAllowBashIfSandboxed, true);
      assert.deepEqual((await json(f.global)).sandbox.filesystem.allowRead, ["~/.nvm"]);
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
  assert.match(preview.out, /dry run: not written.*conditional on Claude >= 2\.1\.302, version not probed\s+in dry run/);
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
  await put(f.local, {
    sandbox: { enabled: true, failIfUnavailable: true, allowUnsandboxedCommands: false, autoAllowBashIfSandboxed: true },
    permissions: { blockReadsOutsideWorkingDirectories: true, blockWritesOutsideWorkingDirectories: true },
  });
  const spelled = [`${f.home}/.nvm/`];
  await put(f.global, { sandbox: { network: { strictAllowlist: true }, filesystem: { allowRead: spelled } } });
  const first = await interactive(f, { env: { PATH }, confirm: never, securityAnswer: "keep" });
  assert.equal(first.status, 0, first.out);
  assert.deepEqual((await json(f.global)).sandbox.filesystem.allowRead, spelled);
  const settled = await fileBytes(f.global);
  const again = await interactive(f, { env: { PATH }, confirm: never, securityAnswer: "keep" });
  assert.equal(again.status, 0, again.out);
  assert.deepEqual(await fileBytes(f.global), settled);
  assert.doesNotMatch(again.out, /runtime-reads/);

  const broad = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, broad)) return;
  const broadPath = await nvmNode(broad);
  await put(broad.global, { sandbox: { network: { strictAllowlist: true }, filesystem: { allowRead: ["~"] } } });
  const broadBefore = await fileBytes(broad.global);
  const broadResult = await interactive(broad, { env: { PATH: broadPath }, confirm: never, securityAnswer: "keep" });
  assert.equal(broadResult.status, 0, broadResult.out);
  assert.deepEqual(await fileBytes(broad.global), broadBefore);
  assert.doesNotMatch(broadResult.out, /RECOMMENDATION security runtime-reads/);
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

test("recommended and keep security answers apply exactly the planned rows", async (t) => {
  const recommended = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, recommended)) return;
  const PATH = await nvmNode(recommended);
  await put(recommended.local, { sandbox: { enabled: false } });
  const applied = await runMain(INSTALL, { home: recommended.home, cwd: recommended.project, env: { PATH }, interactive: false, securityAnswer: "recommended" });
  assert.equal(applied.status, 0, applied.out);
  assert.deepEqual(applied.questions, []);
  assert.equal((await json(recommended.local)).sandbox.enabled, true);
  assert.equal((await json(recommended.global)).sandbox.filesystem.allowRead.includes("~/.nvm"), true);

  const keep = await fixture(t, "2.1.314", { sandbox: true });
  await put(keep.local, { sandbox: { enabled: false } });
  const before = await fileBytes(keep.local);
  const kept = await runMain(INSTALL, { home: keep.home, cwd: keep.project, env: { PATH: keep.bin }, interactive: false, securityAnswer: "keep" });
  assert.equal(kept.status, 0, kept.out);
  assert.deepEqual(await fileBytes(keep.local), before);
  assert.match(kept.out, /RECOMMENDATION security settings \(not written; apply with canonkit install --recommended\)/);
  assert.match(kept.out, /sandbox\.enabled  false  ->  true/);
});

test("keep reports legacy hook handlers as preserved instead of claiming they were unregistered", async (t) => {
  const f = await fixture(t);
  const user = { hooks: { Stop: [{ hooks: [kitHandler(f.home)] }] } };
  const project = { hooks: { Stop: [{ hooks: [kitHandler(f.home)] }] } };
  await put(f.global, user);
  await put(f.local, project);
  const beforeUser = await fileBytes(f.global), beforeProject = await fileBytes(f.local);

  const kept = await runMain(INSTALL, {
    home: f.home, cwd: f.project, env: { PATH: f.bin }, interactive: false, securityAnswer: "keep",
  });

  assert.equal(kept.status, 0, kept.out);
  assert.doesNotMatch(kept.out, /Unregistering \d+ canonical canonkit hook handlers/);
  assert.match(kept.out, /WARN migration user: \d+ canonical canonkit hook handler\(s\) remain in user settings/);
  assert.match(kept.out, /WARN migration repository: \d+ canonical canonkit hook handler\(s\) remain in repository settings/);
  assert.deepEqual(await fileBytes(f.global), beforeUser);
  assert.deepEqual(await fileBytes(f.local), beforeProject);
});

test("--recommended --dry-run previews security rows without writing settings", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, f)) return;
  const PATH = await nvmNode(f);
  await put(f.local, { sandbox: { enabled: false }, personal: "preserve" });
  await put(f.global, { sandbox: { filesystem: { allowRead: ["~/existing"] } }, personal: "preserve" });
  const beforeLocal = await fileBytes(f.local), beforeGlobal = await fileBytes(f.global);
  const result = await runMain([...INSTALL, "--recommended", "--dry-run"], { home: f.home, cwd: f.project, env: { PATH }, interactive: false, securityAnswer: "recommended" });
  assert.equal(result.status, 0, result.out);
  assert.match(result.out, /sandbox\.autoAllowBashIfSandboxed\s+unset\s+\+\s+true[\s\S]*conditional on Claude >= 2\.1\.302 and OS sandbox support; version not probed\s+in dry run/);
  assert.deepEqual(await fileBytes(f.local), beforeLocal);
  assert.deepEqual(await fileBytes(f.global), beforeGlobal);
});

test("customize uses a runtime select and one prechecked multi-select; unchecked sandbox rows keep auto-approval off", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, f)) return;
  const PATH = await nvmNode(f);
  await put(f.local, { sandbox: { enabled: false, failIfUnavailable: false, allowUnsandboxedCommands: true } });
  const result = await interactive(f, {
    env: { PATH }, securityAnswer: "customize",
    selectedRows: [
      "project:sandbox.autoAllowBashIfSandboxed",
      "project:sandbox.failIfUnavailable",
      "project:sandbox.allowUnsandboxedCommands",
      "project:permissions.blockReadsOutsideWorkingDirectories",
      "project:permissions.blockWritesOutsideWorkingDirectories",
    ],
  });
  assert.equal(result.status, 0, result.out);
  assert.deepEqual(result.questions.map((question) => question.name), ["project-scope", ...MODEL_SETUP_PROMPTS, "security-runtime-reads", "security-choices", "install-confirmation"]);
  const securityQuestions = result.questions.filter((question) => question.name.startsWith("security-"));
  assert.deepEqual(securityQuestions.map((question) => question.type), ["select", "multiselect"]);
  assert.match(result.questions.find((question) => question.name === "security-choices").hint, /unchecking any sandbox row keeps auto-approval off/);
  const settings = await json(f.local);
  assert.equal(settings.sandbox.enabled, false);
  assert.equal(settings.sandbox.autoAllowBashIfSandboxed, undefined);
  assert.match(result.out, /auto-approval was not enabled because it requires the full sandbox profile/);
  assert.match(result.out, /RECOMMENDATION security: sandbox\.enabled remains false; shell commands run in an OS sandbox; without it they run with all your user rights\. Apply with canonkit install --recommended/);
});

test("security plan refuses to overwrite project settings edited before apply", async (t) => {
  const f = await fixture(t, "2.1.314", { sandbox: true });
  if (!await capable(t, f)) return;
  const PATH = await nvmNode(f);
  await put(f.local, { sandbox: { enabled: false } });
  const applying = runMain(INSTALL, {
    home: f.home, cwd: f.project, env: { PATH }, securityAnswer: "customize",
    prompt: async (question) => {
      if (question.name === "project-scope") return { [question.name]: true };
      const modelAnswer = answerModelPrompt(question);
      if (modelAnswer !== undefined) return modelAnswer;
      if (question.name === "security-runtime-reads") return { [question.name]: false };
      if (question.name === "security-choices") {
        const concurrent = { sandbox: { enabled: false }, concurrentEdit: true };
        await put(f.local, concurrent);
        return { [question.name]: question.choices.map((choice) => choice.value) };
      }
      if (question.name === "install-confirmation") return { [question.name]: true };
      return {};
    },
  });
  await assert.rejects(applying, /Concurrent edit of repository settings/);
  assert.deepEqual(await json(f.local), { sandbox: { enabled: false }, concurrentEdit: true });
});

test("EOF and Ctrl-C at security menus cancel before any write", async (t) => {
  for (const [name, response, message] of [
    ["EOF", {}, /Input closed: nothing was installed/],
    ["Ctrl-C", { "security-runtime-reads": null }, /Cancelled: nothing was installed/],
  ]) {
    const f = await fixture(t, "2.1.314", { sandbox: true });
    if (!await capable(t, f)) return;
    const PATH = await nvmNode(f);
    await put(f.local, withProject({ sandbox: { autoAllowBashIfSandboxed: false } }));
    const before = await bytes(f.root);
    const prompt = async (question) => {
      if (question.name === "project-scope") return { [question.name]: true };
      const modelAnswer = answerModelPrompt(question);
      if (modelAnswer !== undefined) return modelAnswer;
      return Object.hasOwn(response, question.name) ? response : {};
    };
    await assert.rejects(runMain(INSTALL, { home: f.home, cwd: f.project, env: { PATH }, securityAnswer: "customize", prompt }), message, name);
    assert.deepEqual(await bytes(f.root), before, name);
    assert.equal(existsSync(path.join(f.home, ".claude")), false, name);
  }
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

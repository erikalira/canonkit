import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, realpath } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { classifyEnvironment, collectEnvironment, compileSecurity, compileNetworkSecurity, parseSecuritySettings, undoSecurity, undoNetworkSecurity, projectSecurityOwnership, networkSecurityOwnership, assessClaude, inspectCodex, inspectOpencode, repositoryRoot, projectStateDir, safePath, readSecurityBytes, MAX_SECURITY_BYTES } from "../bin/security.js";

async function fixture(t) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "canonkit-security-")));
  t.after(async () => { assert.equal(path.dirname(root), await realpath(os.tmpdir())); await rm(root, { recursive: true, force: true }); });
  return root;
}
const env = (platform = "win32", claudeVersion = "2.1.314") => ({ ...classifyEnvironment({ platform, release: "test", env: {}, bwrap: true, socat: true }), claudeVersion });

test("environment dimensions distinguish native Windows, WSL generations and nested container hints", () => {
  assert.equal(env().sandboxCapability, "unavailable");
  assert.equal(env("darwin").sandboxCapability, "available-unverified");
  assert.equal(classifyEnvironment({ platform: "linux", release: "4.4.0-Microsoft", env: {}, bwrap: true, socat: true }).wsl, "1");
  const nested = classifyEnvironment({ platform: "linux", release: "6.1.0-microsoft-standard-WSL2", env: { DEVCONTAINER: "true" }, bwrap: true, socat: true });
  assert.equal(nested.wsl, "2");
  assert.equal(nested.container, "indicated");
  assert.equal(nested.runtimeCoverage, "unknown");
  assert.equal(classifyEnvironment({ platform: "linux", release: "unknown", env: { WSL_DISTRO_NAME: "spoof" }, bwrap: true, socat: true }).sandboxCapability, "unavailable");
  assert.equal(classifyEnvironment({ platform: "linux", release: "normal", env: {}, bwrap: true, socat: false }).sandboxCapability, "unavailable");
});

test("collection never probes in dry run and rejects project executables, including directory escapes", async (t) => {
  const root = await fixture(t), project = path.join(root, "project"), tools = path.join(root, "tools");
  await mkdir(project); await mkdir(tools);
  const external = path.join(tools, "claude"), inside = path.join(project, "claude");
  await writeFile(external, "fixture"); await writeFile(inside, "fixture");
  let calls = 0;
  const options = { cwd: project, env: { NODE_OPTIONS: "untrusted fixture" }, platform: "win32", resolve: () => external, version: (_file, probe) => { calls++; assert.equal(probe.env.NODE_OPTIONS, undefined); return "2.1.314"; } };
  assert.equal((await collectEnvironment({ ...options, dryRun: true })).claudeVersion, null);
  assert.equal(calls, 0);
  assert.equal((await collectEnvironment(options)).claudeVersion, "2.1.314");
  assert.equal(calls, 1);
  assert.equal((await collectEnvironment({ ...options, resolve: () => inside })).claudeVersion, null);
  assert.equal(calls, 1);
});

test("windowsRoots reach every resolve and the version probe; a Windows-only claude is reported, never probed", { skip: process.platform === "win32" && "POSIX stub" }, async (t) => {
  const root = await fixture(t), project = path.join(root, "project"), win = path.join(root, "mnt", "c"), npm = path.join(win, "npm");
  await mkdir(project); await mkdir(npm, { recursive: true });
  const stub = path.join(npm, "claude");
  await writeFile(stub, "#!/bin/sh\n", { mode: 0o755 });
  const env = { PATH: npm };
  const seen = [];
  let probes = 0;
  const base = { cwd: project, env, platform: "linux", read: async () => "", exists: () => false, version: () => { probes++; return "9.9.9"; } };
  const fake = (name, options) => { seen.push([name, options.windowsRoots]); return null; };
  const result = await collectEnvironment({ ...base, windowsRoots: [win], resolve: fake });
  assert.deepEqual(seen, [["bwrap", [win]], ["socat", [win]], ["claude", [win]]]);
  assert.equal(result.versionEvidence, "windows-binary-ignored");
  assert.equal(result.ignoredWindowsBinary, stub);
  assert.equal(result.claudeVersion, null);
  assert.equal(probes, 0);
  // The real resolver with the same roots finds nothing to run.
  assert.equal((await collectEnvironment({ ...base, windowsRoots: [win] })).versionEvidence, "windows-binary-ignored");
  // Dry run keeps its own value.
  assert.equal((await collectEnvironment({ ...base, windowsRoots: [win], dryRun: true })).versionEvidence, "not-probed-dry-run");
  // No roots (non-WSL, Windows, macOS): exactly what it was.
  const plain = await collectEnvironment({ ...base, resolve: () => null });
  assert.equal(plain.versionEvidence, "binary-unavailable");
  assert.equal("ignoredWindowsBinary" in plain, false);
  // A resolved binary is probed with the roots, so the child PATH is filtered.
  const opts = [];
  await writeFile(path.join(root, "claude"), "fixture");
  const ok = await collectEnvironment({ ...base, windowsRoots: [win], resolve: (n) => (n === "claude" ? path.join(root, "claude") : null), version: (_f, o) => { opts.push(o.windowsRoots); return "2.1.314"; } });
  assert.deepEqual(opts, [[win]]);
  assert.equal(ok.versionEvidence, "trusted-binary-version");
});

test("native project controls preserve modes, personal grants, hooks and unsupported version boundaries", () => {
  const personal = { autoMode: { custom: "keep" }, permissions: { defaultMode: "auto", allow: ["fixture"], deny: ["fixture-deny"] }, hooks: { fixture: [] }, autoMemoryEnabled: false };
  const old = compileSecurity(personal, env("win32", "2.1.256"));
  assert.deepEqual(old.data, personal);
  const middle = compileSecurity(personal, env("win32", "2.1.302"));
  assert.equal(middle.data.permissions.blockReadsOutsideWorkingDirectories, true);
  assert.equal(middle.data.permissions.blockWritesOutsideWorkingDirectories, undefined);
  const newest = compileSecurity(personal, env());
  assert.equal(newest.data.permissions.blockWritesOutsideWorkingDirectories, true);
  assert.deepEqual(newest.data.permissions.allow, personal.permissions.allow);
  assert.equal(newest.data.permissions.defaultMode, "auto");
  assert.deepEqual(newest.data.hooks, personal.hooks);
  assert.deepEqual(newest.data.autoMode, personal.autoMode);
  assert.equal(newest.data.sandbox, undefined);
  assert.ok(newest.gaps.includes("native-windows-shell-unsandboxed"));
  assert.deepEqual(compileSecurity(newest.data, env()).changes, []);
});

test("each emitted control is gated at its exact documented or conservative version floor", () => {
  for (const [version, reads, writes] of [["2.1.256", false, false], ["2.1.257", true, false], ["2.1.313", true, false], ["2.1.314", true, true]]) {
    const plan = compileSecurity({}, env("win32", version));
    assert.equal(plan.data.permissions?.blockReadsOutsideWorkingDirectories === true, reads);
    assert.equal(plan.data.permissions?.blockWritesOutsideWorkingDirectories === true, writes);
  }
  for (const [version, sandboxed] of [["2.1.301", false], ["2.1.302", true]]) assert.equal(compileSecurity({}, env("linux", version)).data.sandbox?.enabled === true, sandboxed);
  for (const [version, strict] of [["2.1.218", false], ["2.1.219", true]]) assert.equal(compileNetworkSecurity({}, env("linux", version)).data.sandbox?.network?.strictAllowlist === true, strict);
});

test("sandbox configuration uses regular native permissions, no compensating grants, and preserves explicit autoapproval", () => {
  const planned = compileSecurity({}, env("linux"));
  assert.equal(planned.data.sandbox.enabled, true);
  assert.equal(planned.data.sandbox.failIfUnavailable, true);
  assert.equal(planned.data.sandbox.allowUnsandboxedCommands, false);
  assert.equal(planned.data.sandbox.autoAllowBashIfSandboxed, false);
  assert.equal(planned.data.sandbox.filesystem, undefined);
  assert.equal(planned.data.sandbox.network, undefined);
  assert.equal(planned.coverage, "partial");
  const preserved = compileSecurity({ sandbox: { autoAllowBashIfSandboxed: true, excludedCommands: ["fixture"] } }, env("darwin"));
  assert.equal(preserved.data.sandbox.autoAllowBashIfSandboxed, true);
  assert.deepEqual(preserved.data.sandbox.excludedCommands, ["fixture"]);
  assert.ok(preserved.gaps.includes("existing-sandbox-autoapproval-preserved"));
  for (const choice of [true, false]) {
    const inherited = compileSecurity({}, env("linux"), { userSettings: { sandbox: { autoAllowBashIfSandboxed: choice } } });
    assert.equal(inherited.data.sandbox.autoAllowBashIfSandboxed, undefined);
    assert.equal(inherited.gaps.includes("existing-sandbox-autoapproval-preserved"), choice);
  }
});

test("global network compiler adds only strictAllowlist without adding domains or changing approval modes", () => {
  const before = { permissions: { defaultMode: "plan", allow: ["fixture"] }, sandbox: { network: { allowedDomains: ["fixture.invalid"], deniedDomains: ["denied.invalid"] } }, hooks: {} };
  const after = compileNetworkSecurity(before, env());
  assert.equal(after.data.sandbox.network.strictAllowlist, true);
  const stripped = structuredClone(after.data); delete stripped.sandbox.network.strictAllowlist;
  assert.deepEqual(stripped, before);
  assert.deepEqual(compileNetworkSecurity(after.data, env()).changes, []);
  assert.deepEqual(compileNetworkSecurity(before, env("win32", "2.1.218")).data, before);
  assert.ok(compileNetworkSecurity(before, env("linux", "2.1.284")).gaps.includes("strict-network-repository-lock-requires-2.1.285"));
  assert.deepEqual(compileNetworkSecurity(before, env("linux", "2.1.285")).gaps, []);
});

test("invalid owned shapes refuse without echoing private values", () => {
  for (const data of [{ permissions: [] }, { sandbox: { network: [] } }, { permissions: { deny: "SENSITIVE" } }, { sandbox: { network: { strictAllowlist: "SENSITIVE" } } }]) {
    assert.throws(() => parseSecuritySettings(JSON.stringify(data)), error => !error.message.includes("SENSITIVE"));
  }
});

test("security readers bound oversized configuration without echoing content", async (t) => {
  const root = await fixture(t), file = path.join(root, "settings.json");
  await writeFile(file, "SENSITIVE".padEnd(MAX_SECURITY_BYTES + 1, "x"));
  await assert.rejects(readSecurityBytes(file), error => /safety limit/.test(error.message) && !error.message.includes("SENSITIVE"));
  assert.throws(() => parseSecuritySettings("x".repeat(MAX_SECURITY_BYTES + 1)), /safety limit/);
});

test("security undo removes only attributable changes and preserves later edits", () => {
  const before = { permissions: { defaultMode: "auto" }, custom: "keep" };
  const installed = compileSecurity(before, env()).data;
  const current = structuredClone(installed); current.permissions.blockReadsOutsideWorkingDirectories = false; current.permissions.allow = ["later"];
  const owned = { securityChanges: projectSecurityOwnership.capture(Buffer.from(JSON.stringify(before)), Buffer.from(JSON.stringify(installed)), {}) };
  const after = JSON.parse(undoSecurity(Buffer.from(JSON.stringify(before)), Buffer.from(JSON.stringify(installed)), Buffer.from(JSON.stringify(current)), owned));
  assert.equal(after.permissions.blockReadsOutsideWorkingDirectories, false);
  assert.equal(after.permissions.blockWritesOutsideWorkingDirectories, undefined);
  assert.deepEqual(after.permissions.allow, ["later"]);
  assert.equal(after.permissions.defaultMode, "auto");
  const network = compileNetworkSecurity({}, env()).data;
  assert.equal(undoNetworkSecurity(null, Buffer.from(JSON.stringify(network)), Buffer.from(JSON.stringify(network)), { securityChanges: networkSecurityOwnership.capture(null, Buffer.from(JSON.stringify(network)), {}) }), null);
  assert.deepEqual(JSON.parse(undoNetworkSecurity(null, Buffer.from(JSON.stringify(network)), Buffer.from(JSON.stringify(network)))), network);
});

test("security ownership refuses unknown keys and nonboolean receipt values", () => {
  for (const metadata of [
    { "permissions.allow": { beforePresent: false, afterValue: true } },
    { "sandbox.network.strictAllowlist": { beforePresent: false, afterValue: "SENSITIVE" } },
    { "sandbox.network.strictAllowlist": { beforePresent: true, beforeValue: {}, afterValue: true } },
    { "sandbox.network.strictAllowlist": { beforePresent: false, beforeValue: true, afterValue: true } },
  ]) assert.throws(() => networkSecurityOwnership.validate(metadata), error => /Invalid security ownership/.test(error.message) && !error.message.includes("SENSITIVE"));
});

test("repository root validation is canonical, worktree-aware and rejects linked destinations", async (t) => {
  const root = await fixture(t), project = path.join(root, "project");
  await mkdir(path.join(project, ".git"), { recursive: true }); await writeFile(path.join(project, ".git", "HEAD"), "ref: refs/heads/main\n");
  await mkdir(path.join(project, "nested"));
  assert.equal(await repositoryRoot(path.join(project, "nested")), project);
  assert.equal(await repositoryRoot(root), null);
  const linked = path.join(project, ".claude"); await symlink(root, linked, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(safePath(path.join(linked, "settings.json")), /symbolic link or junction/);
  assert.equal(projectStateDir(root, "C:\\ROOT", "win32"), projectStateDir(root, "c:\\root", "win32"));
});

test("diagnosis separates configuration, native Windows limits and unknown harness inputs without values", () => {
  const reports = assessClaude([{ label: "project", data: { permissions: { blockReadsOutsideWorkingDirectories: true, allow: ["SENSITIVE"] }, sandbox: { enabled: true, failIfUnavailable: true, filesystem: { disabled: true } } } }], env());
  assert.ok(reports.some(x => x.control === "shell" && x.status === "FAIL"));
  assert.ok(reports.some(x => x.coverage === "unknown"));
  assert.ok(!JSON.stringify(reports).includes("SENSITIVE"));
  assert.equal(inspectCodex('default_permissions = ":workspace"\n[windows]\nsandbox = "elevated"').coverage, "partial");
  assert.match(inspectCodex('[features]\nprefer_mxc = false').detail, /prefer_mxc false/);
  assert.match(inspectCodex('[features]\nprefer_mxc = true').detail, /prefer_mxc true/);
  assert.match(inspectCodex('default_permissions = ":danger-full-access"\napproval_policy = "never"').detail, /permission-profile :danger-full-access.*approval-policy never/);
  assert.doesNotMatch(inspectCodex('default_permissions = "SENSITIVE"').detail, /SENSITIVE/);
  assert.equal(inspectCodex('permissions = ["complex"]').coverage, "unknown");
  assert.equal(inspectOpencode('{"permissions":[]}').coverage, "partial");
  assert.equal(inspectOpencode('{"permissions":[]}', true).coverage, "unknown");
});

test("diagnosis merges observed strict requirements across scopes and respects explicit overrides", () => {
  const sources = [{ label: "user", data: { sandbox: { enabled: true } } }, { label: "repository", data: { sandbox: { failIfUnavailable: true } } }];
  const reports = assessClaude(sources, env());
  assert.ok(reports.some(row => row.control === "shell" && row.status === "FAIL"));
  const overridden = assessClaude([...sources, { label: "repository-local", data: { sandbox: { enabled: false } } }], env());
  assert.ok(overridden.some(row => row.control === "scope-conflict" && row.status === "WARN"));
  assert.ok(overridden.some(row => row.control === "shell" && row.status === "WARN"));
  const blocked = assessClaude([{ label: "user", data: { permissions: { blockReadsOutsideWorkingDirectories: true, blockWritesOutsideWorkingDirectories: true } } }, { label: "repository", data: { permissions: { blockReadsOutsideWorkingDirectories: false, blockWritesOutsideWorkingDirectories: false } } }], env());
  assert.ok(blocked.some(row => row.control === "file-reads" && row.status === "OK"));
  assert.ok(blocked.some(row => row.control === "file-writes" && row.status === "OK"));
});

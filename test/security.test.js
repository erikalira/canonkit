import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, realpath } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { trustedOwnedAllowRead, SECURITY_SETTINGS, readSettingsText, normalizeReadPath, readEntryCovers, isBroadReadEntry, detectRuntimeRoots, compileRuntimeReads, applyRuntimeReads, classifyEnvironment, collectEnvironment, compileSecurity, compileNetworkSecurity, parseSecuritySettings, parseProjectLocalSandboxSettings, undoSecurity, undoNetworkSecurity, projectSecurityOwnership, networkSecurityOwnership, assessClaude, inspectCodex, inspectOpencode, repositoryRoot, projectStateDir, safePath, readSecurityBytes, MAX_SECURITY_BYTES } from "../bin/security.js";

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
  assert.equal(planned.data.sandbox.autoAllowBashIfSandboxed, true);
  assert.equal(planned.data.sandbox.filesystem, undefined);
  assert.equal(planned.data.sandbox.network, undefined);
  assert.equal(planned.coverage, "partial");
  const preserved = compileSecurity({ sandbox: { autoAllowBashIfSandboxed: true, excludedCommands: ["fixture"] } }, env("darwin"));
  assert.equal(preserved.data.sandbox.autoAllowBashIfSandboxed, true);
  assert.deepEqual(preserved.data.sandbox.excludedCommands, ["fixture"]);
  assert.ok(preserved.gaps.includes("existing-sandbox-autoapproval-preserved"));
  const explicitTrue = compileSecurity({ sandbox: { autoAllowBashIfSandboxed: true } }, env("linux"));
  assert.equal(explicitTrue.data.sandbox.autoAllowBashIfSandboxed, true);
  assert.deepEqual(explicitTrue.changes.filter(key => key === "sandbox.autoAllowBashIfSandboxed"), []);
  const explicitFalse = compileSecurity({ sandbox: { autoAllowBashIfSandboxed: false } }, env("linux"));
  assert.equal(explicitFalse.data.sandbox.autoAllowBashIfSandboxed, false);
  assert.ok(explicitFalse.gaps.includes("sandbox-autoapproval-disabled-under-strict-profile"));
  const localEscape = compileSecurity({}, env("linux"), { projectLocalSettings: { sandbox: { allowUnsandboxedCommands: true } } });
  assert.equal(localEscape.data.sandbox.autoAllowBashIfSandboxed, undefined);
  assert.equal(localEscape.autoApprovalDefaultEligible, false);
  assert.ok(localEscape.gaps.includes("sandbox-autoapproval-default-suppressed-by-project-local-override"));
  const localApproval = compileSecurity({ sandbox: { autoAllowBashIfSandboxed: false } }, env("linux"), { projectLocalSettings: { sandbox: { autoAllowBashIfSandboxed: true } } });
  assert.equal(localApproval.data.sandbox.autoAllowBashIfSandboxed, false);
  assert.ok(!localApproval.gaps.includes("sandbox-autoapproval-disabled-under-strict-profile"));
  for (const choice of [true, false]) {
    const inherited = compileSecurity({}, env("linux"), { userSettings: { sandbox: { autoAllowBashIfSandboxed: choice } } });
    assert.equal(inherited.data.sandbox.autoAllowBashIfSandboxed, undefined);
    assert.equal(inherited.gaps.includes("existing-sandbox-autoapproval-preserved"), choice);
    assert.equal(inherited.gaps.includes("sandbox-autoapproval-disabled-under-strict-profile"), !choice);
  }
  for (const unsupported of [env("linux", "2.1.301"), env("linux", null), env("win32")]) {
    const result = compileSecurity({}, unsupported);
    assert.equal(result.data.sandbox?.autoAllowBashIfSandboxed, undefined);
  }
});

test("project-local sandbox placeholder is unknown and cannot authorize the default", async (t) => {
  const root = await fixture(t), file = path.join(root, "settings.local.json");
  const bytes = Buffer.from(JSON.stringify({ sandbox: { allowUnsandboxedCommands: true } }));
  await writeFile(file, bytes);
  const before = await readFile(file);
  const local = parseProjectLocalSandboxSettings(before, { placeholder: true });
  assert.deepEqual(local, { settings: {}, known: false });
  const plan = compileSecurity({}, env("linux"), { projectLocalSettings: local.settings, projectLocalSettingsKnown: local.known });
  assert.equal(plan.data.sandbox.autoAllowBashIfSandboxed, undefined);
  assert.equal(plan.autoApprovalDefaultEligible, false);
  assert.deepEqual(await readFile(file), before);
});

test("automatic approval warns only when one strict sandbox requirement is missing", () => {
  const strict = { sandbox: { enabled: true, failIfUnavailable: true, allowUnsandboxedCommands: false, autoAllowBashIfSandboxed: true } };
  const warnings = (data) => assessClaude([{ label: "repository", data }], env("linux"))
    .filter(row => row.control === "approval-mode" && row.detail.includes("sandbox automatic approval"));
  assert.deepEqual(warnings(strict), []);
  for (const [key, value] of [["enabled", false], ["failIfUnavailable", false], ["allowUnsandboxedCommands", true]]) {
    assert.equal(warnings({ sandbox: { ...strict.sandbox, [key]: value } }).length, 1, key);
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

test("an empty settings file reads as an empty object, and malformed JSON still throws", () => {
  for (const empty of [Buffer.alloc(0), Buffer.from("  \n\t"), Buffer.from("\uFEFF"), Buffer.from("\uFEFF \r\n"), ""]) assert.deepEqual(parseSecuritySettings(empty), {});
  assert.equal(readSettingsText(Buffer.from("\uFEFF")), "{}");
  assert.equal(readSettingsText('\uFEFF{"a":1}'), '{"a":1}');
  assert.throws(() => parseSecuritySettings("{"), /Invalid JSON/);
  assert.throws(() => parseSecuritySettings("\uFEFF{"), /Invalid JSON/);
  assert.throws(() => parseSecuritySettings("[]"), /Invalid object/);
});

test("compileSecurity lists weaker values with their source and still writes the strict profile", () => {
  const weak = { permissions: { blockReadsOutsideWorkingDirectories: false, blockWritesOutsideWorkingDirectories: false }, sandbox: { enabled: false, failIfUnavailable: false, allowUnsandboxedCommands: true, autoAllowBashIfSandboxed: false } };
  const plan = compileSecurity(weak, env("linux"));
  assert.deepEqual(plan.weaker.map((row) => `${row.source}:${row.path}`).sort(), [
    "project:permissions.blockReadsOutsideWorkingDirectories", "project:permissions.blockWritesOutsideWorkingDirectories",
    "project:sandbox.allowUnsandboxedCommands", "project:sandbox.autoAllowBashIfSandboxed", "project:sandbox.enabled", "project:sandbox.failIfUnavailable",
  ]);
  const row = (key) => plan.weaker.find((item) => item.path === key);
  assert.deepEqual([row("sandbox.enabled").current, row("sandbox.enabled").recommended], [false, true]);
  assert.deepEqual([row("sandbox.allowUnsandboxedCommands").current, row("sandbox.allowUnsandboxedCommands").recommended], [true, false]);
  // The output data is what 3.1.0 produced: strict values, explicit auto-approval preserved.
  assert.equal(plan.data.sandbox.enabled, true);
  assert.equal(plan.data.sandbox.allowUnsandboxedCommands, false);
  assert.equal(plan.data.permissions.blockReadsOutsideWorkingDirectories, true);
  assert.equal(plan.data.sandbox.autoAllowBashIfSandboxed, false);
  assert.ok(plan.changes.includes("sandbox.enabled") && !plan.changes.includes("sandbox.autoAllowBashIfSandboxed"));

  const local = compileSecurity({}, env("linux"), { projectLocalSettings: { sandbox: { enabled: false, allowUnsandboxedCommands: true, autoAllowBashIfSandboxed: false } } });
  assert.deepEqual(local.weaker.map((item) => `${item.source}:${item.path}`).sort(), ["local:sandbox.allowUnsandboxedCommands", "local:sandbox.enabled"]);
  const localApproval = compileSecurity({}, env("linux"), { projectLocalSettings: { sandbox: { autoAllowBashIfSandboxed: false } } });
  assert.deepEqual(localApproval.weaker.map((item) => `${item.source}:${item.path}`), ["local:sandbox.autoAllowBashIfSandboxed"]);
  const user = compileSecurity({}, env("linux"), { userSettings: { sandbox: { autoAllowBashIfSandboxed: false } } });
  assert.deepEqual(user.weaker.map((item) => `${item.source}:${item.path}`), ["user:sandbox.autoAllowBashIfSandboxed"]);
  assert.equal(user.data.sandbox.autoAllowBashIfSandboxed, undefined);

  // Nothing weaker, nothing listed; unsupported environments do not list sandbox keys.
  assert.deepEqual(compileSecurity(compileSecurity({}, env("linux")).data, env("linux")).weaker, []);
  assert.deepEqual(compileSecurity({ sandbox: { enabled: false } }, env("win32")).weaker, []);
  assert.deepEqual(compileSecurity(weak, env("win32", "2.1.256")).weaker, []);
  assert.deepEqual(compileSecurity(weak, env("win32")).weaker.map((item) => item.path).sort(), ["permissions.blockReadsOutsideWorkingDirectories", "permissions.blockWritesOutsideWorkingDirectories"]);
  assert.equal(compileSecurity({}, env("linux")).autoApprovalDefaulted, true);
  assert.equal(compileSecurity({ sandbox: { autoAllowBashIfSandboxed: true } }, env("linux")).autoApprovalDefaulted, false);
});

test("interactive per-key answers govern absent strict rows and auto-approval requires the full profile", () => {
  const empty = compileSecurity({}, env("linux"));
  for (const key of [
    "permissions.blockReadsOutsideWorkingDirectories",
    "permissions.blockWritesOutsideWorkingDirectories",
    "sandbox.enabled",
    "sandbox.failIfUnavailable",
    "sandbox.allowUnsandboxedCommands",
  ]) {
    assert.equal(empty.rows.find((row) => row.path === key)?.marker, "+", key);
  }
  const keepAbsent = compileSecurity({}, env("linux"), { answers: { "permissions.blockReadsOutsideWorkingDirectories": false } });
  assert.equal(keepAbsent.data.permissions.blockReadsOutsideWorkingDirectories, undefined);
  assert.equal(keepAbsent.data.permissions.blockWritesOutsideWorkingDirectories, true);
  assert.deepEqual(keepAbsent.unapplied.map((row) => row.path), ["permissions.blockReadsOutsideWorkingDirectories"]);

  for (const key of ["sandbox.enabled", "sandbox.failIfUnavailable", "sandbox.allowUnsandboxedCommands"]) {
    const result = compileSecurity({}, env("linux"), { answers: { [key]: false } });
    assert.equal(result.data.sandbox[key], undefined, key);
    assert.equal(result.data.sandbox.autoAllowBashIfSandboxed, undefined, key);
    assert.equal(result.changes.includes("sandbox.autoAllowBashIfSandboxed"), false, key);
    assert.equal(result.autoApprovalDefaulted, false, key);
    assert.ok(result.unapplied.some((row) => row.path === key), key);
  }

  const full = compileSecurity({}, env("linux"), { answers: {
    "sandbox.enabled": true,
    "sandbox.failIfUnavailable": true,
    "sandbox.allowUnsandboxedCommands": true,
    "sandbox.autoAllowBashIfSandboxed": true,
  } });
  assert.equal(full.data.sandbox.enabled, true);
  assert.equal(full.data.sandbox.failIfUnavailable, true);
  assert.equal(full.data.sandbox.allowUnsandboxedCommands, false);
  assert.equal(full.data.sandbox.autoAllowBashIfSandboxed, true);
});

test("the recommended-settings table has exactly one row for every key the compilers manage", () => {
  const e = env("linux");
  const managed = [...compileSecurity({}, e).changes, ...compileNetworkSecurity({}, e).changes, "sandbox.filesystem.allowRead"].sort();
  const rows = SECURITY_SETTINGS.map((row) => row.key);
  assert.deepEqual([...rows].sort(), managed);
  assert.equal(new Set(rows).size, rows.length);
  for (const row of SECURITY_SETTINGS) {
    assert.ok(["repository", "user"].includes(row.scope), row.key);
    assert.ok(typeof row.reason === "string" && row.reason.length > 10 && !row.reason.includes("\n"), row.key);
  }
  // Each repository row carries the value the compiler writes.
  const written = compileSecurity({}, e).data;
  for (const row of SECURITY_SETTINGS.filter((item) => item.scope === "repository")) assert.equal(row.key.split(".").reduce((value, key) => value[key], written), row.value, row.key);
});

test("read-exception coverage is path based: spellings match, an ancestor covers, home or above is broad", () => {
  const options = { home: "/home/u", platform: "linux" };
  assert.ok(readEntryCovers("~/.nvm", "/home/u/.nvm/", options));
  assert.ok(readEntryCovers("/home/u/.nvm/", "~/.nvm", options));
  assert.ok(readEntryCovers("~/.local", "~/.local/bin", options));
  assert.ok(readEntryCovers("~/.local/bin", "~/.local/bin", options));
  assert.ok(!readEntryCovers("~/.local/bin", "~/.local", options));
  assert.ok(!readEntryCovers("~/.nvm", "~/.nvmx", options));
  assert.ok(!readEntryCovers("~/.nvm", "~/.local/bin", options));
  assert.ok(!readEntryCovers("relative/dir", "~/relative/dir", options));
  for (const broad of ["~", "~/", "/home/u", "/home/u/", "/home", "/"]) assert.ok(isBroadReadEntry(broad, options), broad);
  for (const narrow of ["~/.nvm", "/home/u2", "/homework", "relative"]) assert.ok(!isBroadReadEntry(narrow, options), narrow);
  const windows = { home: "C:\\Users\\U", platform: "win32" };
  assert.ok(readEntryCovers("c:\\users\\u\\.NVM\\", "~/.nvm", windows));
  assert.ok(isBroadReadEntry("C:\\Users", windows));
  assert.equal(normalizeReadPath("~", { home: "/home/u", platform: "linux" }), "/home/u");
});

test("runtime detection maps known roots under home, reports unknown ones and never generalizes", { skip: process.platform === "win32" && "POSIX symlinks" }, async (t) => {
  const root = await fixture(t), home = path.join(root, "home");
  const file = async (p, link) => { await mkdir(path.dirname(p), { recursive: true }); if (link) await symlink(link, p); else await writeFile(p, "x", { mode: 0o755 }); return p; };
  const find = (map) => (name) => map[name] ?? null;
  const detect = (map, extra = {}) => detectRuntimeRoots({ home, env: {}, platform: "linux", resolve: find(map), ...extra });

  const nvmNode = await file(path.join(home, ".nvm", "versions", "node", "v20.1.0", "bin", "node"));
  assert.deepEqual(detect({ node: nvmNode }), { roots: [{ item: "~/.nvm", label: "node (nvm)" }], unhandled: [] });
  const custom = await file(path.join(home, "tools", "nvm", "versions", "node", "v18", "bin", "node"));
  assert.deepEqual(detect({ node: custom }, { env: { NVM_DIR: path.join(home, "tools", "nvm") } }).roots.map((r) => r.item), ["~/tools/nvm"]);
  // NVM_DIR set to home itself, or to a folder that is not an nvm layout, is never proposed.
  assert.deepEqual(detect({ node: custom }, { env: { NVM_DIR: home } }).roots, []);
  assert.deepEqual(detect({ node: custom }, { env: { NVM_DIR: path.join(home, "tools") } }).roots, []);
  assert.deepEqual(detect({ node: custom }, { env: { NVM_DIR: path.join(home, "tools") } }).unhandled.map((u) => u.item), ["~/tools/nvm/versions/node/v18/bin/node"]);

  for (const layout of [[".local", "share", "pipx"], [".local", "pipx"]]) {
    const target = await file(path.join(home, ...layout, "venvs", "graphify", "bin", "graphify"));
    const link = await file(path.join(home, ".local", "bin", "graphify"), target);
    const found = detect({ graphify: link });
    assert.deepEqual(found.roots.map((r) => r.item), ["~/.local/bin", `~/${layout.join("/")}`], layout.join("/"));
    assert.deepEqual(found.unhandled, []);
    await rm(path.join(home, ".local"), { recursive: true });
  }

  // An unknown manager under home is reported and nothing is proposed, not even its parent.
  const volta = await file(path.join(home, ".volta", "bin", "node"));
  assert.deepEqual(detect({ node: volta }), { roots: [], unhandled: [{ item: "~/.volta/bin/node", label: "node" }] });
  const uvTarget = await file(path.join(home, ".local", "share", "uv", "tools", "graphify", "bin", "graphify"));
  const uvLink = await file(path.join(home, ".local", "bin", "graphify"), uvTarget);
  const uv = detect({ graphify: uvLink });
  assert.deepEqual(uv.roots, []);
  assert.deepEqual(uv.unhandled.map((u) => u.item), ["~/.local/share/uv/tools/graphify/bin/graphify"]);

  // A system node outside home needs no entry; native Windows detects nothing.
  const system = await file(path.join(root, "usr", "bin", "node"));
  assert.deepEqual(detect({ node: system }), { roots: [], unhandled: [] });
  assert.deepEqual(detect({ node: nvmNode }, { platform: "win32" }), { roots: [], unhandled: [] });
  assert.deepEqual(detect({}), { roots: [], unhandled: [] });
});

test("runtime reads propose only uncovered items, append after existing entries and honor the sandbox gate", () => {
  const e = env("linux"), options = { home: "/home/u" };
  const detected = { roots: [{ item: "~/.nvm", label: "node (nvm)" }, { item: "~/.local/bin", label: "graphify (pipx)" }, { item: "~/.local/share/pipx", label: "graphify (pipx)" }], unhandled: [{ item: "~/.volta/bin/node", label: "node" }] };
  const covered = { sandbox: { filesystem: { allowRead: ["/home/u/.nvm/", "~/.local"] } } };
  const everything = compileRuntimeReads(covered, e, { detected, ...options });
  assert.deepEqual(everything.proposed, []);
  assert.equal(everything.covered.length, 3);
  assert.deepEqual(everything.unhandled, detected.unhandled);
  assert.deepEqual(covered, { sandbox: { filesystem: { allowRead: ["/home/u/.nvm/", "~/.local"] } } });

  const partial = { sandbox: { filesystem: { allowRead: ["~/keep", "~/.nvm"] } } };
  const plan = compileRuntimeReads(partial, e, { detected, ...options });
  assert.deepEqual(plan.proposed.map((r) => r.item), ["~/.local/bin", "~/.local/share/pipx"]);
  const applied = applyRuntimeReads(partial, plan.proposed.map((r) => r.item));
  assert.deepEqual(applied.sandbox.filesystem.allowRead, ["~/keep", "~/.nvm", "~/.local/bin", "~/.local/share/pipx"]);
  assert.deepEqual(partial.sandbox.filesystem.allowRead, ["~/keep", "~/.nvm"]);
  assert.deepEqual(applyRuntimeReads({ custom: 1 }, ["~/.nvm"]), { custom: 1, sandbox: { filesystem: { allowRead: ["~/.nvm"] } } });

  const broad = compileRuntimeReads({ sandbox: { filesystem: { allowRead: ["~"] } } }, e, { detected, ...options });
  assert.deepEqual(broad.broad, ["~"]);
  assert.deepEqual(broad.proposed, []);
  assert.deepEqual(applyRuntimeReads({ sandbox: { filesystem: { allowRead: ["~"] } } }, broad.proposed.map((root) => root.item)), {
    sandbox: { filesystem: { allowRead: ["~"] } },
  });

  for (const unsupported of [env("win32"), env("linux", "2.1.301"), env("linux", null), { ...env("linux"), sandboxCapability: "unavailable" }]) {
    assert.deepEqual(compileRuntimeReads({}, unsupported, { detected, ...options }).proposed, [], JSON.stringify([unsupported.platform, unsupported.claudeVersion]));
  }
  // A dry run does not probe the version: the preview is kept, marked conditional.
  const dryRun = compileRuntimeReads({}, { ...env("linux", null), versionEvidence: "not-probed-dry-run" }, { detected, ...options });
  assert.equal(dryRun.proposed.length, 3);
  assert.equal(dryRun.conditional, true);
  assert.equal(compileRuntimeReads({}, e, { detected, ...options }).conditional, false);
});

test("allowRead ownership records appended items and undo removes only those", () => {
  const bytes = (value) => Buffer.from(JSON.stringify(value));
  const undo = (before, installed, current, meta) => {
    const result = undoNetworkSecurity(before === null ? null : bytes(before), bytes(installed), bytes(current), { securityChanges: meta });
    return result === null ? null : JSON.parse(result);
  };
  const before = { sandbox: { filesystem: { allowRead: ["~/keep"] } }, custom: 1 };
  const installed = applyRuntimeReads(before, ["~/.nvm", "~/.local/bin"]);
  const meta = networkSecurityOwnership.capture(bytes(before), bytes(installed), {});
  assert.deepEqual(meta["sandbox.filesystem.allowRead"], { beforePresent: true, parentPresent: true, appendedItems: ["~/.nvm", "~/.local/bin"] });
  // User additions, edits and the preexisting entry stay; the order of what is left is kept.
  const current = structuredClone(installed);
  current.sandbox.filesystem.allowRead = ["~/user-added", "~/keep", "~/.nvm", "~/.local/bin-edited"];
  assert.deepEqual(undo(before, installed, current, meta).sandbox.filesystem.allowRead, ["~/user-added", "~/keep", "~/.local/bin-edited"]);
  // An item present twice is not provably ours.
  current.sandbox.filesystem.allowRead = ["~/.nvm", "~/.nvm", "~/.local/bin"];
  assert.deepEqual(undo(before, installed, current, meta).sandbox.filesystem.allowRead, ["~/.nvm", "~/.nvm"]);
  // A preexisting empty array stays.
  const emptyBefore = { sandbox: { filesystem: { allowRead: [] } } };
  const emptyInstalled = applyRuntimeReads(emptyBefore, ["~/.nvm"]);
  assert.deepEqual(undo(emptyBefore, emptyInstalled, emptyInstalled, networkSecurityOwnership.capture(bytes(emptyBefore), bytes(emptyInstalled), {})), emptyBefore);

  // Created from nothing: the array and parents go, only when empty.
  const created = applyRuntimeReads({}, ["~/.nvm"]);
  const createdMeta = networkSecurityOwnership.capture(null, bytes(created), {});
  assert.deepEqual(createdMeta["sandbox.filesystem.allowRead"], { beforePresent: false, parentPresent: false, appendedItems: ["~/.nvm"] });
  assert.equal(undo(null, created, created, createdMeta), null);
  const kept = structuredClone(created); kept.sandbox.filesystem.allowRead.push("~/later"); kept.sandbox.filesystem.other = true;
  assert.deepEqual(undo(null, created, kept, createdMeta).sandbox.filesystem, { allowRead: ["~/later"], other: true });
  const onlyOther = { sandbox: { filesystem: { other: true } } };
  assert.deepEqual(undo(null, created, onlyOther, createdMeta), onlyOther);
  // A parent that existed before is not removed.
  const parentBefore = { sandbox: { filesystem: {} } };
  const parentInstalled = applyRuntimeReads(parentBefore, ["~/.nvm"]);
  const parentMeta = networkSecurityOwnership.capture(bytes(parentBefore), bytes(parentInstalled), {});
  assert.deepEqual(undo(parentBefore, parentInstalled, parentInstalled, parentMeta), parentBefore);

  // A second install adds to the first record and keeps its baseline; scalar ownership composes.
  const second = applyRuntimeReads(created, ["~/.local/bin"]);
  second.sandbox.network = { strictAllowlist: true };
  const merged = networkSecurityOwnership.capture(bytes(created), bytes(second), createdMeta);
  assert.deepEqual(merged["sandbox.filesystem.allowRead"], { beforePresent: false, parentPresent: false, appendedItems: ["~/.nvm", "~/.local/bin"] });
  assert.equal(merged["sandbox.network.strictAllowlist"].afterValue, true);
  assert.equal(undo(null, second, second, merged), null);
});

test("assessClaude skips allowRead items canonkit appended but warns for user-added ones", () => {
  const warns = (data, owned) => assessClaude([{ label: "user", data }], env("linux"), { ownedAllowRead: owned }).filter((row) => row.control === "filesystem-exceptions");
  const data = { sandbox: { filesystem: { allowRead: ["~/mine", "~/.nvm"] } } };
  assert.equal(warns(data, []).length, 1);
  assert.equal(warns(data, ["~/.nvm"]).length, 1);
  assert.equal(warns({ sandbox: { filesystem: { allowRead: ["~/.nvm"] } } }, ["~/.nvm"]).length, 0);
  assert.equal(warns({ sandbox: { filesystem: { allowRead: ["~/.nvm"] } } }, []).length, 1);
  assert.equal(warns({ sandbox: { filesystem: { allowRead: ["~/.nvm"], allowWrite: ["~/w"] } } }, ["~/.nvm"]).length, 1);
  // Repository entries are never kit-owned.
  assert.equal(assessClaude([{ label: "repository", data: { sandbox: { filesystem: { allowRead: ["~/.nvm"] } } } }], env("linux"), { ownedAllowRead: ["~/.nvm"] }).filter((row) => row.control === "filesystem-exceptions").length, 1);
});

test("owned allowRead from a receipt is trusted only when the runtime table can produce it", () => {
  const options = { home: "/home/u", env: {}, platform: "linux" };
  assert.deepEqual(trustedOwnedAllowRead(["~/.nvm", "~/.local/bin", "~/.local/share/pipx", "~/.local/pipx"], options), ["~/.nvm", "~/.local/bin", "~/.local/share/pipx", "~/.local/pipx"]);
  assert.deepEqual(trustedOwnedAllowRead(["~", "/home/u", "~/Documents", "~/.nvm"], options), ["~/.nvm"]);
  assert.deepEqual(trustedOwnedAllowRead(["~/tools/nvm", "~/.nvm"], { ...options, env: { NVM_DIR: "/home/u/tools/nvm" } }), ["~/tools/nvm", "~/.nvm"]);
  assert.deepEqual(trustedOwnedAllowRead(["~/tools/nvm"], { ...options, env: { NVM_DIR: "/home/u" } }), []);
  for (const bad of ["~/.nvm", 42, null, undefined, { a: 1 }, [42], ["~/.nvm", 1]]) assert.deepEqual(trustedOwnedAllowRead(bad, options), [], JSON.stringify(bad));
});

test("allowRead ownership metadata is validated and refused when malformed", () => {
  const key = "sandbox.filesystem.allowRead", good = { beforePresent: false, parentPresent: false, appendedItems: ["~/.nvm"] };
  assert.doesNotThrow(() => networkSecurityOwnership.validate({ [key]: good }));
  for (const bad of [
    { ...good, appendedItems: [] }, { ...good, appendedItems: "~/.nvm" }, { ...good, appendedItems: [1] }, { ...good, appendedItems: ["a", "a"] }, { ...good, appendedItems: [""] },
    { ...good, beforePresent: "no" }, { beforePresent: false, appendedItems: ["a"] }, { ...good, extra: true }, { ...good, afterValue: true }, "SENSITIVE",
  ]) assert.throws(() => networkSecurityOwnership.validate({ [key]: bad }), (error) => /Invalid security ownership/.test(error.message) && !error.message.includes("SENSITIVE"));
  // The project store has no array ownership.
  assert.throws(() => projectSecurityOwnership.validate({ [key]: good }), /Invalid security ownership/);
  assert.throws(() => networkSecurityOwnership.validate({ "sandbox.filesystem.denyRead": good }), /Invalid security ownership/);
});

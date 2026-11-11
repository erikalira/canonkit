/**
 * The real Windows ACL hardening, read back from disk. Other CLI tests may stub
 * the ACL tools for speed (openspec: faster-test-suite); this file never does,
 * so the security property stays covered by the actual operating-system tools.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { nodeArgs, runCli, writeCommand } from "../helpers/cli-harness.js";

const SYSTEM = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32");
const POWERSHELL = path.join(SYSTEM, "WindowsPowerShell", "v1.0", "powershell.exe");

// Who may touch `file` (SID, rule type, full control or not) and whether it
// still inherits from its parent.
function accessOf(file) {
  const script = `$ErrorActionPreference = 'Stop'
$acl = Get-Acl -LiteralPath $env:ACL_PATH
$rules = @($acl.Access | ForEach-Object { @{ sid = $_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value; type = [string]$_.AccessControlType; full = (($_.FileSystemRights -band 2032127) -eq 2032127) } })
$me = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
@{ protected = $acl.AreAccessRulesProtected; rules = $rules; me = $me } | ConvertTo-Json -Compress -Depth 4`;
  const r = spawnSync(POWERSHELL, ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", windowsHide: true, env: { ...process.env, ACL_PATH: file } });
  assert.equal(r.status, 0, r.stderr);
  const parsed = JSON.parse(r.stdout);
  const rules = [].concat(parsed.rules);
  return { protected: parsed.protected, rules, sids: [...new Set(rules.map((rule) => rule.sid))].sort(), me: parsed.me };
}

// The state directory cuts inheritance and holds exactly three principals, each
// with an Allow rule of full control. Files created inside it inherit that and
// need no rule of their own; a file outside a private directory gets its own
// protected ACL, so `ownDacl` is for those.
function assertPrivate(file, label, { ownDacl = true } = {}) {
  const { protected: isProtected, rules, sids, me } = accessOf(file);
  if (ownDacl) assert.equal(isProtected, true, `${label}: inheritance is not protected`);
  assert.deepEqual(sids, [me, "S-1-5-18", "S-1-5-32-544"].sort(), `${label}: unexpected principals`);
  // Who is listed is not enough: a Deny rule or a weaker grant would list them too.
  for (const rule of rules) {
    assert.equal(rule.type, "Allow", `${label}: ${rule.sid} has a ${rule.type} rule`);
    assert.equal(rule.full, true, `${label}: ${rule.sid} does not have full control`);
  }
}

const privateFiles = (state) => {
  const backups = path.join(state, "backups");
  return readdirSync(backups).map((name) => path.join(backups, name));
};

// A home with a repository that has settings of its own (so an install has
// something to back up) and a detectable `claude` (repository controls, and so
// the private backups, need one).
async function fixture() {
  const home = realpathSync.native(mkdtempSync(path.join(os.tmpdir(), "canonkit-acl-")));
  const project = path.join(home, "project");
  mkdirSync(path.join(project, ".git"), { recursive: true });
  mkdirSync(path.join(project, ".claude"), { recursive: true });
  writeFileSync(path.join(project, ".git", "HEAD"), "ref: refs/heads/main\n");
  writeFileSync(path.join(project, ".claude", "settings.json"), JSON.stringify({ permissions: { deny: ["fixture-deny"] } }));
  const bin = path.join(home, "bin");
  mkdirSync(bin);
  const script = path.join(bin, "version.cjs");
  writeFileSync(script, "if (process.argv.slice(2).join(' ') !== '--version') process.exit(2); console.log('2.1.314');");
  await writeCommand(bin, "claude", script);
  return { home, project, state: path.join(home, ".canonkit"), env: { PATH: bin } };
}

const win32Only = { skip: process.platform !== "win32" };

test("install, reinstall and uninstall keep the state directory and backups private to the user, SYSTEM and Administrators", win32Only, async () => {
  const { home, project, state, env } = await fixture();
  try {
    for (const args of [["install", "--claude", "--no-reference"], ["install", "--claude", "--no-reference"]]) {
      const r = runCli(args, { home, cwd: project, env, realAcl: true });
      assert.equal(r.status, 0, r.out);
      assertPrivate(state, "state directory");
      const backups = privateFiles(state);
      assert.ok(backups.length > 0, "an install leaves at least one backup");
      for (const file of [...backups, path.join(state, "install-manifest.json")]) assertPrivate(file, path.basename(file), { ownDacl: false });
      assertPrivate(path.join(state, "backups"), "backups directory");
    }
    const removed = runCli(["uninstall", "--claude"], { home, cwd: project, env, realAcl: true });
    assert.equal(removed.status, 0, removed.out);
    assertPrivate(state, "state directory after uninstall");
    const left = path.join(state, "backups");
    if (existsSync(left)) for (const file of readdirSync(left)) assertPrivate(path.join(left, file), file, { ownDacl: false });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

// The reason restrictWindows replaces the DACL: a directory made before canonkit
// can already grant other accounts. On a fresh directory under temp that is
// invisible, so this one starts with explicit grants (Users, Everyone) on both.
test("an install takes over a pre-existing state directory that grants other accounts", win32Only, async () => {
  const { home, project, state, env } = await fixture();
  try {
    for (const dir of [state, path.join(state, "backups")]) {
      mkdirSync(dir, { recursive: true });
      const r = spawnSync(path.join(SYSTEM, "icacls.exe"), [dir, "/grant", "*S-1-5-32-545:(OI)(CI)R", "/grant", "*S-1-1-0:(OI)(CI)R"], { encoding: "utf8", windowsHide: true });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.ok(accessOf(dir).sids.includes("S-1-5-32-545"), "the seeded grant is in place before the install");
    }
    const r = runCli(["install", "--claude", "--no-reference"], { home, cwd: project, env, realAcl: true });
    assert.equal(r.status, 0, r.out);
    assertPrivate(state, "pre-existing state directory");
    assertPrivate(path.join(state, "backups"), "pre-existing backups directory");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

// The harness default must really be the stub (else the speed-up is silently
// gone) and the stub must leave the real tools alone elsewhere. If the preload
// stops applying, the first test fails: that is the signal.
test("the harness stubs the ACL tools by default and realAcl turns the stub off", win32Only, () => {
  const stubbed = realpathSync.native(mkdtempSync(path.join(os.tmpdir(), "canonkit-acl-stub-")));
  const real = realpathSync.native(mkdtempSync(path.join(os.tmpdir(), "canonkit-acl-real-")));
  try {
    const a = runCli(["install", "--claude", "--no-reference"], { home: stubbed });
    assert.equal(a.status, 0, a.out);
    assert.equal(accessOf(path.join(stubbed, ".canonkit")).protected, false, "stub was not applied: the state directory has a protected DACL");
    const b = runCli(["install", "--claude", "--no-reference"], { home: real, realAcl: true });
    assert.equal(b.status, 0, b.out);
    assert.equal(accessOf(path.join(real, ".canonkit")).protected, true);
  } finally {
    rmSync(stubbed, { recursive: true, force: true });
    rmSync(real, { recursive: true, force: true });
  }
});

test("the ACL stub answers only the three tools and passes every other spawn through", win32Only, () => {
  const probe = `const { spawnSync } = require("node:child_process");
const out = {
  ps: spawnSync(${JSON.stringify(POWERSHELL)}, ["-NoProfile", "-Command", "exit 7"]).status,
  who: spawnSync(${JSON.stringify(path.join(SYSTEM, "whoami.exe"))}, []).stdout,
  node: spawnSync(process.execPath, ["-e", "process.stdout.write('real')"]).stdout.toString(),
  cmd: spawnSync(${JSON.stringify(path.join(SYSTEM, "cmd.exe"))}, ["/c", "exit 3"]).status,
};
process.stdout.write(JSON.stringify({ ...out, who: String(out.who) }));`;
  const r = spawnSync(process.execPath, [...nodeArgs(), "-e", probe], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.ps, 0, "powershell is stubbed (a real `exit 7` would return 7)");
  assert.match(out.who, /S-1-5-21-1-2-3-1001/);
  assert.equal(out.node, "real");
  assert.equal(out.cmd, 3, "cmd.exe is a real spawn");
});

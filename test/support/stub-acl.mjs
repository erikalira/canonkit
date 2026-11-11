/**
 * Test-only preload (node --import): answers the Windows ACL tools canonkit
 * spawns on every install, so CLI tests that are not about permissions do not
 * pay for them. It is passed as a node argument by test/helpers/cli-harness.js;
 * nothing in bin/ reads a variable or flag that disables ACL hardening.
 *
 * It matches only the absolute System32 paths bin/install-manifest.js uses. A
 * different tool path stops matching and tests get slower, not falsely green.
 * Arguments are NOT checked: a bug in the ACL script or its arguments is
 * invisible to every stubbed test. That is the trade-off for the speed, and
 * test/e2e/acl-windows.test.js (which runs without this file and reads the real
 * DACLs, including a pre-existing directory with foreign grants) is what covers
 * it. Every other spawn passes through.
 */
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import path from "node:path";

if (process.platform === "win32") {
  const system = path.join(process.env.SystemRoot || "C:\\Windows", "System32");
  const stubbed = new Set([
    path.join(system, "WindowsPowerShell", "v1.0", "powershell.exe"),
    path.join(system, "icacls.exe"),
    path.join(system, "whoami.exe"),
  ].map((p) => p.toLowerCase()));
  const real = childProcess.spawnSync;
  childProcess.spawnSync = function spawnSync(file, ...rest) {
    if (typeof file === "string" && stubbed.has(path.normalize(file).toLowerCase())) {
      const stdout = path.basename(file).toLowerCase() === "whoami.exe" ? '"stub\\user","S-1-5-21-1-2-3-1001"\r\n' : "";
      return { status: 0, signal: null, output: [null, stdout, ""], pid: 0, stdout, stderr: "" };
    }
    return real.call(this, file, ...rest);
  };
  // install-manifest.js imports spawnSync by name: republish the wrapper to ESM.
  syncBuiltinESMExports();
}

/**
 * The one place tests spawn bin/cli.js (see test-suite-execution in
 * openspec/changes/faster-test-suite). Keeping it here means environment
 * isolation, the test-owned PATH and any Node flags apply to every CLI test the
 * same way, instead of drifting between files.
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CLI = path.join(REPO, "bin", "cli.js");

// Variables a developer's own shell may carry that would redirect a write to
// their real Claude/Codex, or inject code into the CLI under test. A test that
// needs one passes it explicitly in `env`.
const DROPPED = ["CLAUDE_CONFIG_DIR", "CODEX_HOME", "NODE_OPTIONS", "NODE_PATH", "CANONKIT_CODEX_MODEL"];

// The PATH a CLI test gets unless it sets one: an empty directory this process
// owns plus the operating system's own folders. No `claude` or `codex` can be
// found, so runtime discovery reports "not found" and spawns nothing, instead of
// running the developer's real binary (slow, and the answer would depend on the
// machine). A test that asserts discovered output puts a stub in its own PATH.
const EMPTY_BIN = mkdtempSync(path.join(os.tmpdir(), "canonkit-empty-bin-"));
process.on("exit", () => rmSync(EMPTY_BIN, { recursive: true, force: true }));
const SYSTEM_DIRS = process.platform === "win32"
  ? [path.join(process.env.SystemRoot ?? "C:\\Windows", "System32"), process.env.SystemRoot ?? "C:\\Windows"]
  : ["/usr/bin", "/bin"];
export const DEFAULT_TEST_PATH = [EMPTY_BIN, ...SYSTEM_DIRS].join(path.delimiter);

/**
 * The environment for a CLI under test: HOME, USERPROFILE and XDG_CONFIG_HOME
 * pinned to `home` (os.homedir() reads USERPROFILE on Windows and HOME elsewhere;
 * OpenCode's folder follows XDG_CONFIG_HOME), the variables above dropped unless
 * the test sets them, and `env` on top. The inherited PATH is always dropped
 * (Windows spells it Path): a test gets DEFAULT_TEST_PATH, or its own in `env`.
 */
export function isolatedEnv(home, env = {}) {
  const base = { ...process.env };
  for (const k of Object.keys(base)) if (k.toUpperCase() === "PATH") delete base[k];
  for (const k of DROPPED) if (!(k in env)) delete base[k];
  return { ...base, PATH: DEFAULT_TEST_PATH, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, ".config"), ...env };
}

// Windows ACL hardening costs several child processes per install. Tests that
// are not about permissions load this preload (as a node argument, never through
// NODE_OPTIONS, which is dropped). A test about the real ACL passes realAcl.
const ACL_STUB = path.join(REPO, "test", "support", "stub-acl.mjs");
export const nodeArgs = ({ realAcl = false } = {}) => (realAcl || process.platform !== "win32" ? [] : ["--import", pathToFileURL(ACL_STUB).href]);

/** Run `canonkit <args>` synchronously; `out` is stdout followed by stderr. */
export function runCli(args, { home, cwd, env = {}, realAcl = false, preload = [] }) {
  const result = spawnSync(process.execPath, [...nodeArgs({ realAcl }), ...preload.flatMap((f) => ["--import", pathToFileURL(f).href]), CLI, ...args], { cwd: cwd ?? home, encoding: "utf8", env: isolatedEnv(home, env) });
  return { ...result, out: (result.stdout ?? "") + (result.stderr ?? "") };
}

/** Start the CLI without waiting (a test that signals or races it). */
export function startCli(args, { home, cwd, env = {}, cli = CLI, realAcl = false }) {
  return spawn(process.execPath, [...nodeArgs({ realAcl }), cli, ...args], { cwd: cwd ?? home, env: isolatedEnv(home, env), windowsHide: true });
}

/**
 * Put a command called `name` in `dir` that runs `js` with Node. With
 * `passName`, the command name is the script's first argument (one script
 * standing in for several tools).
 */
export async function writeCommand(dir, name, js, { passName = false } = {}) {
  await mkdir(dir, { recursive: true });
  const named = passName ? ` ${name}` : "";
  if (process.platform === "win32") {
    await writeFile(path.join(dir, `${name}.cmd`), `@"${process.execPath}" "${js}"${named} %*\r\n`);
  } else {
    const file = path.join(dir, name);
    await writeFile(file, `#!/bin/sh\nexec "${process.execPath}" "${js}"${named} "$@"\n`);
    await chmod(file, 0o755);
  }
}

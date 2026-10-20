/**
 * The one place canonkit starts another program.
 *
 * Everything else in the installer copies files; `tool add` is the first thing
 * that runs someone else's binary, in someone's project. So the rules are kept in
 * one small module rather than at each call site:
 *
 *   - argv is an array of literal arguments, and there is never a shell
 *     (`shell: true` hands the whole line to cmd.exe or sh to re-parse);
 *   - the binary is found on PATH by hand, skipping the current directory and
 *     relative entries, so a file planted in the project is never the one run;
 *   - a Windows .cmd/.bat shim can only run through cmd.exe, so that one case
 *     builds the cmd line itself, from arguments checked to need no escaping;
 *   - stdin is closed and every run has a timeout.
 */
import { spawnSync } from "node:child_process";
import { statSync, accessSync, realpathSync, constants } from "node:fs";
import path from "node:path";

// Arguments come from the tool registry, never from the project. This is the
// shape every one of them has today; anything outside it would need escaping
// for cmd.exe, and an argument that needs escaping is not a literal anymore.
// No trailing backslash: through a .cmd shim, `"x\"` reaches the program as a
// literal quote.
const SAFE_ARG = /^[A-Za-z0-9_.,:=@+/\\-]*[A-Za-z0-9_.,:=@+/-]$/;
// cmd.exe expands %VAR% even inside quotes, and a quote would end the quoting.
const UNSAFE_IN_CMD_PATH = /["%\r\n]/;

const DEFAULT_TIMEOUT = 10 * 60 * 1000;

// The path flavour of the platform being resolved for, so the Windows rules can
// be exercised from a test on any OS.
const pathFor = (platform) => (platform === "win32" ? path.win32 : path.posix);

// Real path when the entry exists (a symlink or junction into the project is the
// project; macOS tmpdir is /var but cwd is /private/var), null when it does not:
// a directory that is not there holds no binary to find.
function real(p, platform) {
  if (platform !== process.platform) return pathFor(platform).resolve(p);
  try {
    // .native also expands 8.3 short names (PROGRA~1), which the JS one keeps.
    return realpathSync.native(p);
  } catch {
    return null;
  }
}

/** True when `dir` is `root` or anywhere below it. */
function within(dir, root, platform) {
  const P = pathFor(platform);
  const fold = (p) => (platform === "win32" ? p.toLowerCase() : p);
  const rel = P.relative(fold(root), fold(dir));
  // "..evil" is a child named ..evil, not the parent: only ".." itself or
  // "../..." leaves the root.
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${P.sep}`) && !P.isAbsolute(rel));
}

/**
 * The PATH directories a binary may come from: absolute, existing, and outside
 * the project. Windows searches the current directory before PATH and treats an
 * empty entry the same way; a relative entry resolves against the project; and
 * `npx canonkit` puts <project>/node_modules/.bin first. Each of these is how a
 * binary committed to a cloned repo gets run in place of the real one.
 */
function safePathDirs({ env = process.env, platform = process.platform, cwd = process.cwd() } = {}) {
  const P = pathFor(platform);
  const root = real(cwd, platform) ?? P.resolve(cwd);
  const pathVar = platform === "win32" ? env.Path ?? env.PATH ?? "" : env.PATH ?? "";
  const out = [];
  for (const raw of pathVar.split(platform === "win32" ? ";" : ":")) {
    const d = raw.trim().replace(/^"(.*)"$/, "$1");
    if (!d || !P.isAbsolute(d)) continue;
    const r = real(d, platform);
    if (!r || within(r, root, platform)) continue;
    if (!out.includes(d)) out.push(d);
  }
  return out;
}

function isFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

function isExecutable(p) {
  try {
    accessSync(p, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Where `name` would have come from inside the project, when that is the only
 * place it is: so "not on PATH" can say why (an activated .venv, a local npm
 * install) instead of looking like a broken install.
 */
function projectOnlyHit(name, { env = process.env, platform = process.platform, cwd = process.cwd() } = {}) {
  const P = pathFor(platform);
  const root = real(cwd, platform) ?? P.resolve(cwd);
  const pathVar = platform === "win32" ? env.Path ?? env.PATH ?? "" : env.PATH ?? "";
  const exts = platform === "win32" ? [".exe", ".cmd", ".bat", ".com"] : [""];
  for (const raw of pathVar.split(platform === "win32" ? ";" : ":")) {
    const d = raw.trim().replace(/^"(.*)"$/, "$1");
    if (!d) continue;
    const r = real(P.resolve(root, d), platform);
    if (!r || !within(r, root, platform)) continue;
    for (const ext of exts) if (isFile(P.join(r, name + ext))) return P.join(r, name + ext);
  }
  return null;
}

/** Absolute path of `name` in safePathDirs, or null. */
function resolveBin(name, { env = process.env, platform = process.platform, cwd = process.cwd() } = {}) {
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(name)) throw new Error(`resolveBin: not a bare command name: ${name}`);

  const P = pathFor(platform);
  const dirs = safePathDirs({ env, platform, cwd });

  const exts =
    platform === "win32"
      ? (env.PATHEXT || ".COM;.EXE;.BAT;.CMD")
          .split(";")
          .map((e) => e.trim().toLowerCase())
          .filter((e) => /^\.[a-z0-9]+$/.test(e))
      : [""];

  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = P.join(dir, name + ext);
      if (!isFile(candidate)) continue;
      if (platform !== "win32" && !isExecutable(candidate)) continue;
      return candidate;
    }
  }
  return null;
}

/**
 * The exact program and argv spawnSync will receive. A .cmd/.bat shim (what npm
 * puts on PATH on Windows) cannot be spawned without cmd.exe, which re-parses its
 * command line — so the line is built here, quoted, from arguments that SAFE_ARG
 * already proved need no escaping, and handed over verbatim so Node does not
 * quote it a second time. /d skips AutoRun, /s keeps the outer quotes literal.
 */
function commandFor(abs, args, { env = process.env, platform = process.platform } = {}) {
  const P = pathFor(platform);
  if (!P.isAbsolute(abs)) throw new Error(`commandFor: binary path must be absolute: ${abs}`);
  for (const a of args) {
    if (typeof a !== "string" || !SAFE_ARG.test(a)) throw new Error(`refusing argument that would need escaping: ${JSON.stringify(a)}`);
  }

  if (platform === "win32" && /\.(cmd|bat)$/i.test(abs)) {
    if (UNSAFE_IN_CMD_PATH.test(abs)) throw new Error(`refusing to run through cmd.exe: path contains " or %: ${abs}`);
    // ComSpec, not a PATH lookup for cmd.exe — that lookup is the planted-binary
    // problem resolveBin exists to avoid.
    const comspec = env.ComSpec || env.COMSPEC || (env.SystemRoot && P.join(env.SystemRoot, "System32", "cmd.exe"));
    if (!comspec || !P.isAbsolute(comspec)) throw new Error("cannot run a .cmd shim: ComSpec is not set to an absolute path");
    const line = [abs, ...args].map((a) => `"${a}"`).join(" ");
    // /v:off as well: /d skips AutoRun but not a registry-enabled delayed
    // expansion, which would mangle a "!" in the shim's path.
    return { file: comspec, args: ["/d", "/v:off", "/s", "/c", `"${line}"`], verbatim: true };
  }
  return { file: abs, args: [...args], verbatim: false };
}

/**
 * The environment the child runs with. Resolving the tool safely is not enough:
 * the tool resolves its own programs by name (npm's .cmd shim runs `node`, a
 * `#!/usr/bin/env node` script asks PATH), and cmd.exe looks in the current
 * directory — the project — first. So the child gets the same filtered PATH,
 * and on Windows NoDefaultCurrentDirectoryInExePath, which turns that
 * current-directory lookup off for cmd.exe and CreateProcess callers.
 */
function childEnv(env, platform, cwd) {
  const out = Object.fromEntries(Object.entries(env).filter(([k]) => k.toUpperCase() !== "PATH"));
  out.PATH = safePathDirs({ env, platform, cwd }).join(platform === "win32" ? ";" : ":");
  if (platform === "win32") out.NoDefaultCurrentDirectoryInExePath = "1";
  return out;
}

/** How the command reads to a person: the binary and the arguments, as run. */
const display = (abs, args) => [abs.includes(" ") ? `"${abs}"` : abs, ...args].join(" ");

/**
 * Run a resolved binary. `capture` returns its output instead of passing it
 * through (used for --version). Never throws for a failed run: the caller
 * reports `status`/`error` and decides to stop.
 */
/**
 * `project` is what the child's PATH is filtered against; it defaults to cwd,
 * and differs only when a probe runs somewhere else (binVersion).
 */
function runBin(abs, args, { cwd, project = cwd, timeout = DEFAULT_TIMEOUT, capture = false, env = process.env, platform = process.platform } = {}) {
  if (!cwd || !path.isAbsolute(cwd)) throw new Error("runBin: cwd must be an absolute, validated project root");
  const cmd = commandFor(abs, args, { env, platform });
  const result = spawnSync(cmd.file, cmd.args, {
    cwd,
    env: childEnv(env, platform, project),
    shell: false,
    windowsVerbatimArguments: cmd.verbatim,
    windowsHide: true,
    stdio: ["ignore", capture ? "pipe" : "inherit", capture ? "pipe" : "inherit"],
    encoding: "utf8",
    timeout,
    killSignal: "SIGTERM",
  });
  const timedOut = result.error?.code === "ETIMEDOUT";
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ? (timedOut ? `timed out after ${Math.round(timeout / 1000)}s` : result.error.message) : null,
  };
}

/**
 * The first x.y.z a binary prints for --version, or null. It runs before the
 * person has confirmed anything, so it runs from the binary's own directory, not
 * the project: nothing reads project files before consent. (Not the temp dir,
 * which anyone can write to on POSIX.)
 */
function binVersion(abs, { project, env, platform } = {}) {
  const cwd = path.dirname(abs);
  const r = runBin(abs, ["--version"], { cwd, project: project ?? cwd, env, platform, capture: true, timeout: 30 * 1000 });
  if (r.status !== 0) return null;
  const m = /\b(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)\b/.exec(r.stdout) ?? /\b(\d+\.\d+\.\d+)\b/.exec(r.stderr);
  return m ? m[1] : null;
}

export { resolveBin, safePathDirs, projectOnlyHit, commandFor, runBin, binVersion, display, SAFE_ARG };

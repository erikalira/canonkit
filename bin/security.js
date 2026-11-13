import { readFile, lstat, open } from "node:fs/promises";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { resolveBin, binVersion, windowsOnlyHits } from "./exec.js";

const object = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hash = (x) => createHash("sha256").update(x).digest("hex");
const absent = (err) => err.code === "ENOENT";
export const SECURITY_VERSION_FLOORS = Object.freeze({ fileRead: "2.1.257", fileWrite: "2.1.314", sandbox: "2.1.302", network: "2.1.219", networkRepositoryLock: "2.1.285" });
export const MAX_SECURITY_BYTES = 1024 * 1024;

export async function readSecurityBytes(file) {
  let handle;
  try {
    handle = await open(file, "r");
    const info = await handle.stat();
    if (!info.isFile() || info.size > MAX_SECURITY_BYTES) throw new Error("Configuration is not a regular file within the 1 MiB safety limit");
    const bytes = Buffer.alloc(MAX_SECURITY_BYTES + 1);
    let used = 0;
    while (used < bytes.length) {
      const { bytesRead } = await handle.read(bytes, used, bytes.length - used, used);
      if (!bytesRead) break;
      used += bytesRead;
    }
    if (used > MAX_SECURITY_BYTES) throw new Error("Configuration exceeds the 1 MiB safety limit");
    return bytes.subarray(0, used);
  } catch (err) { if (absent(err)) return null; throw err; }
  finally { await handle?.close(); }
}

/**
 * Doctor, read-only: inside the Claude Code sandbox a 0-byte placeholder is
 * /dev/null (character device 1:3) bind-mounted over the real file. Exactly
 * that device, on Linux, from lstat (never a symlink to it). Not for writers:
 * safePath and readSecurityBytes still require a regular file.
 */
export function isNullDeviceStat(info, platform = process.platform) {
  return platform === "linux" && info.isCharacterDevice() && info.rdev === 259; // makedev(1, 3)
}

export async function isSandboxNullPlaceholder(file, { lstat: stat = lstat, platform = process.platform } = {}) {
  if (platform !== "linux") return false;
  await safePath(path.dirname(file));
  try { return isNullDeviceStat(await stat(file), platform); } catch (err) { if (absent(err)) return false; throw err; }
}

/**
 * True when any of the files is, by lstat, the sandbox's /dev/null placeholder
 * (1:3). Absent paths and paths under a non-directory are simply not one.
 */
export async function anyNullPlaceholder(files, { lstat: stat = lstat, platform = process.platform } = {}) {
  if (platform !== "linux") return false;
  for (const file of files) {
    try { if (isNullDeviceStat(await stat(file), platform)) return true; } catch (err) { if (err.code !== "ENOENT" && err.code !== "ENOTDIR") throw err; }
  }
  return false;
}

/**
 * What blocks a directory that is not one: "device" (a character device, the
 * sandbox's write-protection), "empty" (a 0-byte regular file), else null.
 */
export function directoryBlocker(info) {
  if (info.isCharacterDevice()) return "device";
  if (info.isFile() && info.size === 0) return "empty";
  return null;
}

export function atLeast(version, minimum) {
  if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) return false;
  const a = version.split(".").map(Number), b = minimum.split(".").map(Number);
  return a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] >= b[2];
}

// Deliberately independently represented: a container can run inside WSL2.
export function classifyEnvironment({ platform = process.platform, release = os.release(), procVersion = "", env = process.env, dockerMarker = false, bwrap = false, socat = false } = {}) {
  const kernel = `${release} ${procVersion}`;
  let wsl = "none";
  if (platform === "linux" && /microsoft|wsl/i.test(kernel)) wsl = /wsl2|microsoft-standard/i.test(kernel) ? "2" : "1";
  else if (platform === "linux" && env.WSL_DISTRO_NAME) wsl = "unknown";
  const containerIndicators = [dockerMarker && "docker-marker", env.REMOTE_CONTAINERS && "remote-containers", env.CODESPACES && "codespaces", env.DEVCONTAINER && "devcontainer"].filter(Boolean);
  const supported = platform === "darwin" || (platform === "linux" && wsl !== "1" && wsl !== "unknown" && bwrap && socat);
  return { platform, wsl, container: containerIndicators.length ? "indicated" : "not-observed", containerIndicators, dependencies: { bwrap: Boolean(bwrap), socat: Boolean(socat) }, sandboxCapability: supported ? "available-unverified" : "unavailable", runtimeCoverage: "unknown" };
}

// Variables that make an interpreter load code before a probed program runs.
// Every probe of a harness binary (here and in model-discovery.js) drops them.
export const LOADER_ENV = /^(?:NODE_OPTIONS|NODE_PATH|PYTHONPATH|PYTHONSTARTUP|BASH_ENV|ENV|RUBYOPT|PERL5OPT|LD_PRELOAD|LD_LIBRARY_PATH|DYLD_.*)$/i;

export async function collectEnvironment({ cwd = process.cwd(), env = process.env, platform = process.platform, release = os.release(), dryRun = false, read = readFile, exists = existsSync, resolve = resolveBin, version = binVersion, windowsRoots = [] } = {}) {
  let procVersion = "";
  if (platform === "linux") {
    try { procVersion = await read("/proc/version", "utf8"); } catch (err) { if (!absent(err) && err.code !== "EACCES") throw err; }
  }
  // On WSL a Windows binary on PATH is not resolved (it would run through interop and read Windows settings).
  const options = { cwd, env, platform, windowsRoots };
  const bwrap = platform === "linux" ? resolve("bwrap", options) : null;
  const socat = platform === "linux" ? resolve("socat", options) : null;
  const evidence = classifyEnvironment({ platform, release, procVersion, env, dockerMarker: platform === "linux" && exists("/.dockerenv"), bwrap, socat });
  let claude = resolve("claude", options);
  if (claude) {
    try {
      const executable = realpathSync.native(claude), project = realpathSync.native(cwd);
      const relative = path.relative(project, executable);
      if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) claude = null;
    } catch (err) { if (!["ENOENT", "EACCES", "EPERM"].includes(err.code)) throw err; claude = null; }
  }
  const probeEnv = Object.fromEntries(Object.entries(env).filter(([key]) => !LOADER_ENV.test(key)));
  const ignored = !dryRun && !claude ? windowsOnlyHits("claude", options)[0] : undefined;
  return {
    ...evidence,
    claudeVersion: !dryRun && claude ? version(claude, { project: cwd, env: probeEnv, platform, windowsRoots }) : null,
    versionEvidence: dryRun ? "not-probed-dry-run" : claude ? "trusted-binary-version" : ignored ? "windows-binary-ignored" : "binary-unavailable",
    ...(ignored ? { ignoredWindowsBinary: ignored } : {}),
  };
}

// No process execution is needed to find a working tree, including a linked
// worktree. Do not infer a repository from CLAUDE_PROJECT_DIR or a config file.
export async function safePath(file) {
  const absolute = path.resolve(file);
  let cursor = path.parse(absolute).root;
  for (const part of absolute.slice(cursor.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    let info;
    try { info = await lstat(cursor); } catch (err) { if (absent(err)) continue; throw err; }
    if (info.isSymbolicLink()) throw new Error("Security destination contains a symbolic link or junction");
    if (cursor !== absolute && !info.isDirectory()) throw new Error("Security destination has a non-directory parent");
    if (cursor === absolute && !info.isFile() && !info.isDirectory()) throw new Error("Security destination is not regular");
  }
}

export async function repositoryRoot(cwd = process.cwd()) {
  const { realpath } = await import("node:fs/promises");
  await safePath(cwd);
  let cursor = await realpath(cwd);
  while (true) {
    const marker = path.join(cursor, ".git");
    try {
      const info = await lstat(marker);
      if (info.isSymbolicLink()) throw new Error("Repository marker is a symbolic link");
      let gitDir = marker;
      if (info.isFile()) {
        const text = await readFile(marker, "utf8");
        const match = /^gitdir: ([^\r\n]+)\r?\n?$/.exec(text);
        if (!match) throw new Error("Repository marker is invalid");
        gitDir = path.resolve(cursor, match[1]);
      } else if (!info.isDirectory()) throw new Error("Repository marker is invalid");
      await safePath(gitDir);
      const head = await readFile(path.join(gitDir, "HEAD"), "utf8");
      if (!/^(?:ref: refs\/[A-Za-z0-9._/-]+|[a-fA-F0-9]{40,64})\r?\n?$/.test(head)) throw new Error("Repository HEAD is invalid");
      return cursor;
    } catch (err) { if (!absent(err)) throw err; }
    const parent = path.dirname(cursor);
    if (parent === cursor) return null;
    cursor = parent;
  }
}

export function projectStateDir(home, root, platform = process.platform) {
  const canonical = platform === "win32" ? root.toLowerCase() : root;
  return path.join(home, ".canonkit", "projects", hash(canonical));
}

/**
 * The one rule for an empty Claude settings file: a byte-order mark is
 * stripped, and no text at all (0 bytes, whitespace, BOM only) reads as an
 * empty object. Anything else is returned as is; malformed JSON still throws
 * where it is parsed.
 */
export function readSettingsText(bytes) {
  const text = (Buffer.isBuffer(bytes) ? bytes.toString("utf8") : String(bytes)).replace(/^\uFEFF/, "");
  return text.trim() === "" ? "{}" : text;
}

export function parseSecuritySettings(bytes, label = "settings") {
  if (bytes === null) return {};
  if (Buffer.byteLength(bytes) > MAX_SECURITY_BYTES) throw new Error(`Configuration exceeds the safety limit in ${label}; nothing was written`);
  let data;
  try { data = JSON.parse(readSettingsText(bytes)); }
  catch { throw new Error(`Invalid JSON in ${label}; nothing was written`); }
  if (!object(data)) throw new Error(`Invalid object in ${label}; nothing was written`);
  for (const key of ["permissions", "sandbox", "autoMode"]) if (data[key] !== undefined && !object(data[key])) throw new Error(`Invalid ${key} shape in ${label}; nothing was written`);
  for (const key of ["network", "filesystem"]) if (data.sandbox?.[key] !== undefined && !object(data.sandbox[key])) throw new Error(`Invalid sandbox.${key} shape in ${label}; nothing was written`);
  for (const [prefix, value] of [["permissions", data.permissions], ["sandbox.filesystem", data.sandbox?.filesystem], ["sandbox.network", data.sandbox?.network]]) {
    for (const [key, entry] of Object.entries(value ?? {})) {
      if (["allow", "ask", "deny", "additionalDirectories", "allowRead", "denyRead", "allowWrite", "denyWrite", "allowedDomains", "deniedDomains", "allowUnixSockets"].includes(key) && (!Array.isArray(entry) || entry.some((item) => typeof item !== "string"))) throw new Error(`Invalid ${prefix}.${key} shape in ${label}; nothing was written`);
    }
  }
  for (const key of ["blockReadsOutsideWorkingDirectories", "blockWritesOutsideWorkingDirectories"]) if (data.permissions?.[key] !== undefined && typeof data.permissions[key] !== "boolean") throw new Error(`Invalid permissions.${key} shape in ${label}; nothing was written`);
  for (const key of ["enabled", "failIfUnavailable", "allowUnsandboxedCommands", "autoAllowBashIfSandboxed", "enableWeakerNestedSandbox", "enableWeakerNetworkIsolation"]) if (data.sandbox?.[key] !== undefined && typeof data.sandbox[key] !== "boolean") throw new Error(`Invalid sandbox.${key} shape in ${label}; nothing was written`);
  if (data.sandbox?.network?.strictAllowlist !== undefined && typeof data.sandbox.network.strictAllowlist !== "boolean") throw new Error(`Invalid sandbox.network.strictAllowlist shape in ${label}; nothing was written`);
  if (data.sandbox?.excludedCommands !== undefined && (!Array.isArray(data.sandbox.excludedCommands) || data.sandbox.excludedCommands.some((item) => typeof item !== "string"))) throw new Error(`Invalid sandbox.excludedCommands shape in ${label}; nothing was written`);
  return data;
}

export function parseProjectLocalSandboxSettings(bytes, { placeholder = false } = {}) {
  if (placeholder) return { settings: {}, known: false };
  if (bytes === null || bytes.length === 0) return { settings: {}, known: true };
  if (bytes.length > MAX_SECURITY_BYTES) return { settings: {}, known: false };
  let value;
  try { value = JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, "")); } catch { return { settings: {}, known: false }; }
  if (!object(value)) return { settings: {}, known: false };
  if (value.sandbox === undefined) return { settings: {}, known: true };
  if (!object(value.sandbox)) return { settings: {}, known: false };
  const sandbox = {};
  for (const key of ["enabled", "failIfUnavailable", "allowUnsandboxedCommands", "autoAllowBashIfSandboxed"]) {
    if (value.sandbox[key] === undefined) continue;
    if (typeof value.sandbox[key] !== "boolean") return { settings: {}, known: false };
    sandbox[key] = value.sandbox[key];
  }
  return { settings: { sandbox }, known: true };
}

/**
 * The recommended security settings: one row per key, shared by the install
 * review prompt, the README section and its drift check, so the wording
 * cannot diverge. `scope` says which settings file holds the key.
 */
export const SECURITY_SETTINGS = Object.freeze([
  { key: "permissions.blockReadsOutsideWorkingDirectories", scope: "repository", value: true, reason: "file tools cannot read your other projects or home data; without it a prompt injection can read them" },
  { key: "permissions.blockWritesOutsideWorkingDirectories", scope: "repository", value: true, reason: "file tools cannot write outside this repository; without it they can change files anywhere you can" },
  { key: "sandbox.enabled", scope: "repository", value: true, reason: "shell commands run in an OS sandbox; without it they run with all your user rights" },
  { key: "sandbox.failIfUnavailable", scope: "repository", value: true, reason: "a missing sandbox stops commands; without it they silently run unsandboxed" },
  { key: "sandbox.allowUnsandboxedCommands", scope: "repository", value: false, reason: "no command can escape the sandbox; without it a failed command may be retried outside it" },
  { key: "sandbox.autoAllowBashIfSandboxed", scope: "repository", value: true, reason: "sandboxed commands run without a prompt each, so repository scripts run unprompted: use only with repositories you trust (see docs/install.md); without it every command prompts and approvals pile up as permissions.allow rules" },
  { key: "sandbox.network.strictAllowlist", scope: "user", value: true, reason: "sandboxed commands reach only domains you allowed, and repositories cannot widen it (from Claude 2.1.285)" },
  { key: "sandbox.filesystem.allowRead", scope: "user", value: ["~/.nvm", "~/.local/bin", "~/.local/share/pipx"], reason: "sandboxed commands can still read the runtimes they need (node, pipx tools) while the rest of home stays closed; detected per machine" },
]);
const REPOSITORY_RECOMMENDED = Object.fromEntries(SECURITY_SETTINGS.filter((row) => row.scope === "repository").map((row) => [row.key, row.value]));

const dottedGet = (data, key) => key.split(".").reduce((value, part) => value?.[part], data);
const dottedSetSecurity = (data, key, value) => {
  const parts = key.split(".");
  let at = data;
  for (const part of parts.slice(0, -1)) at = at[part] ??= {};
  at[parts.at(-1)] = value;
};
const settingReasonFor = (key) => SECURITY_SETTINGS.find((row) => row.key === key)?.reason ?? "";
const dottedDelete = (data, key) => {
  const parts = key.split("."), leaf = parts.pop();
  const parent = parts.reduce((value, part) => value?.[part], data);
  if (!parent) return;
  delete parent[leaf];
  for (let i = parts.length - 1; i >= 0; i--) {
    const at = parts.slice(0, i + 1).reduce((value, part) => value?.[part], data);
    if (at && typeof at === "object" && !Object.keys(at).length) delete at[parts[i]];
  }
};

export function compileSecurity(data, environment, { userSettings = {}, projectLocalSettings = {}, projectLocalSettingsKnown = true, answers } = {}) {
  const original = structuredClone(data), out = structuredClone(data), changes = [], gaps = [], weaker = [], rows = [], unapplied = [];
  let autoApprovalDefaulted = false;
  const reportWeaker = (key, current, source) => weaker.push({ path: key, current, recommended: REPOSITORY_RECOMMENDED[key], source });
  const set = (keys, value) => {
    let at = out;
    for (const key of keys.slice(0, -1)) at = at[key] ??= {};
    const key = keys.at(-1);
    if (!same(at[key], value)) { at[key] = value; changes.push(keys.join(".")); }
  };
  const v = environment.claudeVersion;
  const localSandbox = projectLocalSettingsKnown ? projectLocalSettings.sandbox ?? {} : {};
  const localWeakensStrictProfile = localSandbox.enabled === false || localSandbox.failIfUnavailable === false || localSandbox.allowUnsandboxedCommands === true;
  const autoApprovalDefaultEligible = environment.sandboxCapability === "available-unverified" && projectLocalSettingsKnown && !localWeakensStrictProfile;
  const compileStrict = (key, supported, value) => {
    if (!supported) return;
    const current = dottedGet(original, key);
    const marker = current === undefined ? "+" : same(current, value) ? "=" : "->";
    rows.push({ path: key, current: current === undefined ? null : structuredClone(current), recommended: structuredClone(value), marker, reason: settingReasonFor(key), source: "project", selectable: true });
    if (marker === "->") reportWeaker(key, current, "project");
    set(key.split("."), value);
  };
  if (atLeast(v, SECURITY_VERSION_FLOORS.fileRead)) {
    compileStrict("permissions.blockReadsOutsideWorkingDirectories", true, true);
  } else gaps.push("file-read-control-version-unverified");
  if (atLeast(v, SECURITY_VERSION_FLOORS.fileWrite)) {
    compileStrict("permissions.blockWritesOutsideWorkingDirectories", true, true);
  } else gaps.push("file-write-control-requires-2.1.314");
  if (environment.sandboxCapability === "available-unverified" && atLeast(v, SECURITY_VERSION_FLOORS.sandbox)) {
    for (const key of ["enabled", "failIfUnavailable", "allowUnsandboxedCommands"]) {
      const full = `sandbox.${key}`, strict = REPOSITORY_RECOMMENDED[full];
      compileStrict(full, true, strict);
      if (localSandbox[key] === !strict) reportWeaker(full, !strict, "local");
    }
    const autoSource = localSandbox.autoAllowBashIfSandboxed !== undefined ? "local" : data.sandbox?.autoAllowBashIfSandboxed !== undefined ? "project" : userSettings.sandbox?.autoAllowBashIfSandboxed !== undefined ? "user" : null;
    const autoApproval = localSandbox.autoAllowBashIfSandboxed ?? data.sandbox?.autoAllowBashIfSandboxed ?? userSettings.sandbox?.autoAllowBashIfSandboxed;
    const fullProfile = ["sandbox.enabled", "sandbox.failIfUnavailable", "sandbox.allowUnsandboxedCommands"].every((key) => same(dottedGet(out, key), REPOSITORY_RECOMMENDED[key]));
    if (fullProfile && !localWeakensStrictProfile && localSandbox.autoAllowBashIfSandboxed === false) reportWeaker("sandbox.autoAllowBashIfSandboxed", false, "local");
    const localBlocksAuto = localSandbox.autoAllowBashIfSandboxed !== undefined;
    if (autoApproval === false && fullProfile && autoApprovalDefaultEligible) gaps.push("sandbox-autoapproval-disabled-under-strict-profile");
    if (fullProfile && !localBlocksAuto && autoApproval !== true && autoApprovalDefaultEligible) {
      const key = "sandbox.autoAllowBashIfSandboxed";
      const projectCurrent = dottedGet(original, key);
      const current = autoApproval === undefined ? null : autoApproval;
      rows.push({ path: key, current, recommended: true, marker: current === null ? "+" : "->", reason: settingReasonFor(key), source: autoSource ?? "project", selectable: true });
      if (autoApproval === false && autoSource !== "local") reportWeaker(key, false, autoSource ?? "project");
      if (autoApproval === undefined) {
        set(["sandbox", "autoAllowBashIfSandboxed"], true);
        autoApprovalDefaulted = projectCurrent === undefined;
      }
    } else if (!fullProfile) {
      gaps.push("sandbox-autoapproval-requires-full-sandbox-profile");
    } else if (autoApproval === undefined) {
      gaps.push(projectLocalSettingsKnown ? "sandbox-autoapproval-default-suppressed-by-project-local-override" : "project-local-sandbox-settings-unavailable");
    } else if (autoApproval === false) {
      if (fullProfile && autoApprovalDefaultEligible && autoSource !== "local") {
        rows.push({ path: "sandbox.autoAllowBashIfSandboxed", current: false, recommended: true, marker: "->", reason: settingReasonFor("sandbox.autoAllowBashIfSandboxed"), source: autoSource ?? "project", selectable: true });
        reportWeaker("sandbox.autoAllowBashIfSandboxed", false, autoSource ?? "project");
      }
    } else gaps.push("existing-sandbox-autoapproval-preserved");
    // The native working-directory read block also covers sandbox shell reads
    // of user-data roots. A project-level allowRead was ignored under that
    // block (observed on WSL2, 2026-11-13, design D7), so runtime reads are
    // written to user settings only. Do not synthesize broad compensating grants or
    // guess runtime paths.
    gaps.push("shell-runtime-boundary-unverified");
  } else gaps.push(environment.platform === "win32" ? "native-windows-shell-unsandboxed" : "sandbox-unavailable-or-version-unverified");
  const answerFor = (key) => answers instanceof Map ? answers.get(key) : answers?.[key];
  for (const row of rows) {
    if (!row.selectable) continue;
    if (row.path === "sandbox.autoAllowBashIfSandboxed" && answerFor(row.path) === true) {
      dottedSetSecurity(out, row.path, true);
      if (!changes.includes(row.path)) changes.push(row.path);
      gaps.splice(gaps.indexOf("sandbox-autoapproval-disabled-under-strict-profile"), gaps.includes("sandbox-autoapproval-disabled-under-strict-profile") ? 1 : 0);
      continue;
    }
    if (answerFor(row.path) !== false) continue;
    const before = dottedGet(original, row.path);
    if (before === undefined) dottedDelete(out, row.path);
    else dottedSetSecurity(out, row.path, structuredClone(before));
    if (row.path === "sandbox.autoAllowBashIfSandboxed") autoApprovalDefaulted = false;
    const index = changes.indexOf(row.path);
    if (index >= 0) changes.splice(index, 1);
    unapplied.push({ ...row, reason: row.reason || "recommended value not applied" });
  }
  if (rows.some((row) => row.path.startsWith("sandbox.") && answerFor(row.path) === false)) {
    const profileEffective = ["sandbox.enabled", "sandbox.failIfUnavailable", "sandbox.allowUnsandboxedCommands"].every((key) => {
      const local = projectLocalSettingsKnown ? dottedGet(projectLocalSettings, key) : undefined;
      const project = dottedGet(out, key);
      const user = dottedGet(userSettings, key);
      const effective = local !== undefined ? local : project !== undefined ? project : user;
      return same(effective, REPOSITORY_RECOMMENDED[key]);
    });
    if (!profileEffective && autoApprovalDefaulted) {
      dottedDelete(out, "sandbox.autoAllowBashIfSandboxed");
      const index = changes.indexOf("sandbox.autoAllowBashIfSandboxed");
      if (index >= 0) changes.splice(index, 1);
      const autoRow = rows.find((row) => row.path === "sandbox.autoAllowBashIfSandboxed");
      if (autoRow && !unapplied.some((row) => row.path === autoRow.path)) {
        unapplied.push({ ...autoRow, reason: "auto-approval requires the full strict sandbox profile" });
      }
      autoApprovalDefaulted = false;
      if (!gaps.includes("sandbox-autoapproval-requires-full-sandbox-profile")) gaps.push("sandbox-autoapproval-requires-full-sandbox-profile");
    }
  }
  // strictAllowlist is User/Managed-only. Project policy must not emit a key
  // that Claude ignores or pretend that allowedDomains=[] closes egress.
  gaps.push("network-strict-policy-assessed-separately-in-user-scope");
  const originalCheck = structuredClone(original), result = structuredClone(out);
  for (const value of [originalCheck, result]) {
    if (value.permissions) { delete value.permissions.blockReadsOutsideWorkingDirectories; delete value.permissions.blockWritesOutsideWorkingDirectories; if (!Object.keys(value.permissions).length) delete value.permissions; }
    if (value.sandbox) { for (const key of ["enabled", "failIfUnavailable", "allowUnsandboxedCommands", "autoAllowBashIfSandboxed"]) delete value.sandbox[key]; if (!Object.keys(value.sandbox).length) delete value.sandbox; }
  }
  if (!same(originalCheck, result)) throw new Error("Security compilation changed unrelated settings");
  return { data: out, changes, gaps, weaker, rows, unapplied, autoApprovalDefaulted, coverage: "partial", environment, autoApprovalDefaultEligible };
}

const OWNED = [
  ["permissions", "blockReadsOutsideWorkingDirectories"], ["permissions", "blockWritesOutsideWorkingDirectories"],
  ["sandbox", "enabled"], ["sandbox", "failIfUnavailable"], ["sandbox", "allowUnsandboxedCommands"], ["sandbox", "autoAllowBashIfSandboxed"],
];
export function compileNetworkSecurity(data, environment) {
  const out = structuredClone(data), changes = [], gaps = [];
  if (atLeast(environment.claudeVersion, SECURITY_VERSION_FLOORS.network)) {
    out.sandbox ??= {};
    out.sandbox.network ??= {};
    if (out.sandbox.network.strictAllowlist !== true) { out.sandbox.network.strictAllowlist = true; changes.push("sandbox.network.strictAllowlist"); }
    if (!atLeast(environment.claudeVersion, SECURITY_VERSION_FLOORS.networkRepositoryLock)) gaps.push("strict-network-repository-lock-requires-2.1.285");
  } else gaps.push("strict-network-control-version-unverified");
  return { data: out, changes, gaps };
}

// Runtime read exceptions (user scope). Everything here is path arithmetic on
// strings given by the caller, except detectRuntimeRoots, which looks at PATH.
const pathFor = (platform) => (platform === "win32" ? path.win32 : path.posix);

/** Absolute, normalized form of an allowRead entry (or null when it is not a plain path). Case folds on Windows. */
export function normalizeReadPath(entry, { home, platform = process.platform } = {}) {
  if (typeof entry !== "string" || !entry) return null;
  const P = pathFor(platform), fold = (p) => (platform === "win32" ? p.toLowerCase() : p);
  let expanded = entry;
  if (entry === "~") expanded = home;
  else if (entry.startsWith("~/") || (platform === "win32" && entry.startsWith("~\\"))) expanded = P.join(home, entry.slice(2));
  if (!P.isAbsolute(expanded)) return null;
  return fold(P.resolve(expanded));
}

/** True when `entry` is `candidate` or a folder above it. Both are allowRead-style paths. */
export function readEntryCovers(entry, candidate, options) {
  const a = normalizeReadPath(entry, options), b = normalizeReadPath(candidate, options);
  if (!a || !b) return false;
  const P = pathFor(options.platform ?? process.platform), rel = P.relative(a, b);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${P.sep}`) && !P.isAbsolute(rel));
}

/** An entry equal to home, or a folder above it, reopens the whole home directory. */
export const isBroadReadEntry = (entry, options) => readEntryCovers(entry, "~", options);

/**
 * The fixed D1 table. Resolves each program with the Windows-PATH-filtered
 * lookup and its realpath, and maps it to a known root under home. A location
 * under home that is not in the table is returned as `unhandled`, never
 * generalized to a parent; locations outside home need no entry.
 */
export function detectRuntimeRoots({ cwd = process.cwd(), env = process.env, platform = process.platform, home = os.homedir(), windowsRoots = [], resolve = resolveBin, realpath = (p) => realpathSync.native(p) } = {}) {
  const roots = [], unhandled = [];
  if (platform === "win32") return { roots, unhandled };
  const tryReal = (p) => { try { return realpath(p); } catch { return p; } };
  const homes = [...new Set([path.resolve(home), tryReal(home)])];
  const within = (p, root) => { const rel = path.relative(root, p); return rel !== "" && rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel); };
  const tilde = (p) => { for (const h of homes) if (within(p, h)) return `~/${path.relative(h, p).split(path.sep).join("/")}`; return null; };
  const find = (name) => { try { return resolve(name, { cwd, env, platform, windowsRoots }); } catch { return null; } };
  const add = (item, label) => { if (!roots.some((root) => root.item === item)) roots.push({ item, label }); };

  const node = find("node");
  if (node) {
    const real = tryReal(node), nvmDir = path.resolve(env.NVM_DIR || path.join(home, ".nvm"));
    // nvm keeps every node under $NVM_DIR/versions/: an environment variable alone never widens the grant.
    const underVersions = (root) => within(real, path.join(root, "versions"));
    const item = underVersions(tryReal(nvmDir)) || underVersions(nvmDir) ? tilde(nvmDir) ?? tilde(tryReal(nvmDir)) : null;
    if (item) add(item, "node (nvm)");
    else if (tilde(real)) unhandled.push({ item: tilde(real), label: "node" });
  }
  const graphify = find("graphify");
  if (graphify) {
    const real = tryReal(graphify), binDir = path.dirname(graphify);
    let pipx = null;
    for (const h of homes) for (const rel of [".local/share/pipx", ".local/pipx"]) if (!pipx && within(real, path.join(h, rel, "venvs"))) pipx = `~/${rel}`;
    const binItem = tilde(binDir) ?? tilde(tryReal(binDir));
    if (pipx && (binItem === "~/.local/bin" || (!binItem && !homes.some((h) => binDir === h)))) {
      if (binItem) add(binItem, "graphify (pipx)");
      add(pipx, "graphify (pipx)");
    } else if (tilde(real)) unhandled.push({ item: tilde(real), label: "graphify" });
  }
  return { roots, unhandled };
}

/**
 * Compares detected runtime locations with the user's existing allowRead
 * entries, item by item. Pure: it never changes `data`; applyRuntimeReads does,
 * after the user confirmed. Gated like the sandbox itself: a capable platform,
 * not native Windows, and Claude at the sandbox floor.
 */
export function compileRuntimeReads(data, environment, { detected = { roots: [], unhandled: [] }, home = os.homedir(), platform = environment.platform } = {}) {
  const result = { proposed: [], unhandled: [], broad: [], covered: [], gaps: [] };
  if (environment.sandboxCapability !== "available-unverified" || platform === "win32") return result;
  const options = { home, platform }, existing = data.sandbox?.filesystem?.allowRead ?? [];
  if (!Array.isArray(existing) || existing.some((entry) => typeof entry !== "string" || !normalizeReadPath(entry, options))) {
    result.gaps.push("runtime-reads-user-settings-ambiguous");
    return result;
  }
  result.broad = existing.filter((entry) => isBroadReadEntry(entry, options));
  // A dry run does not probe the version: it still previews the recommendation, marked conditional.
  const dryRunUnprobed = environment.claudeVersion == null && environment.versionEvidence === "not-probed-dry-run";
  if (!atLeast(environment.claudeVersion, SECURITY_VERSION_FLOORS.sandbox) && !dryRunUnprobed) { result.gaps.push("runtime-reads-version-unverified"); return result; }
  result.conditional = dryRunUnprobed;
  result.unhandled = detected.unhandled;
  for (const root of detected.roots) {
    if (existing.some((entry) => readEntryCovers(entry, root.item, options))) result.covered.push(root);
    else result.proposed.push(root);
  }
  return result;
}

/** Appends items after the existing allowRead entries; nothing existing is reordered or dropped. */
export function applyRuntimeReads(data, items) {
  const out = structuredClone(data);
  out.sandbox ??= {};
  out.sandbox.filesystem ??= {};
  const list = out.sandbox.filesystem.allowRead ??= [];
  for (const item of items) if (!list.includes(item)) list.push(item);
  return out;
}

// Ownership of scalar booleans (`scalars`: key paths) and of strings appended to
// string arrays (`arrays`: key paths). An array record lists only the items
// canonkit appended, so undo can leave everything the user added or edited.
const ALLOW_READ = ["sandbox", "filesystem", "allowRead"];
function securityOwnership(scalars, arrays = []) {
  const allowed = new Set(scalars.map((parts) => parts.join(".")));
  const allowedArrays = new Set(arrays.map((parts) => parts.join(".")));
  const get = (data, parts) => parts.reduce((value, key) => value?.[key], data);
  const validArray = (record) => object(record) && Object.keys(record).length === 3 &&
    typeof record.beforePresent === "boolean" && typeof record.parentPresent === "boolean" &&
    Array.isArray(record.appendedItems) && record.appendedItems.length > 0 &&
    record.appendedItems.every((item) => typeof item === "string" && item.length > 0) && new Set(record.appendedItems).size === record.appendedItems.length;
  const validate = (metadata) => {
    if (!object(metadata)) throw new Error("Invalid security ownership metadata");
    for (const [key, record] of Object.entries(metadata)) {
      if (allowedArrays.has(key)) { if (!validArray(record)) throw new Error("Invalid security ownership metadata"); continue; }
      if (!allowed.has(key) || !object(record) || Object.keys(record).some((field) => !["beforePresent", "beforeValue", "afterValue"].includes(field)) ||
          typeof record.beforePresent !== "boolean" || typeof record.afterValue !== "boolean" ||
          (record.beforePresent ? typeof record.beforeValue !== "boolean" : Object.hasOwn(record, "beforeValue"))) throw new Error("Invalid security ownership metadata");
    }
  };
  return { validate, capture: (beforeBytes, afterBytes, old) => {
    validate(old);
    const before = parseSecuritySettings(beforeBytes), after = parseSecuritySettings(afterBytes), metadata = structuredClone(old);
    for (const parts of scalars) {
      const prior = get(before, parts), installed = get(after, parts), key = parts.join(".");
      if (same(prior, installed) || typeof installed !== "boolean") continue;
      const baseline = old[key] && old[key].afterValue === prior ? old[key] : { beforePresent: prior !== undefined, ...(prior === undefined ? {} : { beforeValue: prior }) };
      metadata[key] = { ...baseline, afterValue: installed };
    }
    for (const parts of arrays) {
      const prior = get(before, parts), installed = get(after, parts), key = parts.join(".");
      if (!Array.isArray(installed)) continue;
      const priorItems = Array.isArray(prior) ? prior : [];
      const added = installed.filter((item) => !priorItems.includes(item));
      if (!added.length) continue;
      // A later install adds to what an earlier one appended; the baseline stays the first one.
      const carried = (old[key]?.appendedItems ?? []).filter((item) => priorItems.includes(item));
      metadata[key] = carried.length
        ? { beforePresent: old[key].beforePresent, parentPresent: old[key].parentPresent, appendedItems: [...carried, ...added] }
        : { beforePresent: Array.isArray(prior), parentPresent: object(get(before, parts.slice(0, -1))), appendedItems: added };
    }
    return metadata;
  } };
}
export const projectSecurityOwnership = securityOwnership(OWNED);
export const networkSecurityOwnership = securityOwnership([["sandbox", "network", "strictAllowlist"]], [ALLOW_READ]);

function undoOwned(beforeBytes, _afterBytes, currentBytes, ownership, metadata) {
  ownership.validate(metadata);
  const current = parseSecuritySettings(currentBytes);
  const get = (data, keys) => keys.reduce((value, key) => value?.[key], data);
  for (const [key, record] of Object.entries(metadata)) {
    const keys = key.split(".");
    if (Object.hasOwn(record, "appendedItems")) {
      const parent = get(current, keys.slice(0, -1)), list = parent?.[keys.at(-1)];
      if (!Array.isArray(list)) continue;
      // Only an item that is still there exactly once, unchanged, was provably appended by canonkit.
      for (const item of record.appendedItems) if (list.filter((entry) => entry === item).length === 1) list.splice(list.indexOf(item), 1);
      if (!list.length && !record.beforePresent) {
        delete parent[keys.at(-1)];
        if (!record.parentPresent && !Object.keys(parent).length) {
          delete current[keys[0]].filesystem;
          if (!Object.keys(current[keys[0]]).length) delete current[keys[0]];
        }
      }
      continue;
    }
    const now = get(current, keys);
    if (!same(now, record.afterValue)) continue;
    const parent = get(current, keys.slice(0, -1));
    if (!parent) continue;
    if (!record.beforePresent) delete parent[keys.at(-1)];
    else parent[keys.at(-1)] = record.beforeValue;
    for (let depth = keys.length - 1; depth > 0; depth--) {
      const ancestor = get(current, keys.slice(0, depth - 1));
      if (object(ancestor?.[keys[depth - 1]]) && !Object.keys(ancestor[keys[depth - 1]]).length) delete ancestor[keys[depth - 1]];
    }
  }
  if (beforeBytes === null && Object.keys(current).length === 0) return null;
  return serializeSecurity(current, currentBytes?.toString("utf8"));
}
export const undoSecurity = (before, after, current, entry = {}) => undoOwned(before, after, current, projectSecurityOwnership, entry.securityChanges ?? {});
export const undoNetworkSecurity = (before, after, current, entry = {}) => undoOwned(before, after, current, networkSecurityOwnership, entry.securityChanges ?? {});

export function serializeSecurity(data, original = "") {
  const text = JSON.stringify(data, null, 2) + "\n";
  return Buffer.from((original.startsWith("\uFEFF") ? "\uFEFF" : "") + (original.includes("\r\n") ? text.replace(/\n/g, "\r\n") : text));
}

/**
 * The receipt is data on disk, so what it claims canonkit appended is checked
 * before it can silence a warning: an array of strings, none broad, each one a
 * value the runtime table can produce (nvm folder, ~/.local/bin, pipx roots).
 * Anything else is ignored, never an error.
 */
export function trustedOwnedAllowRead(items, { home = os.homedir(), env = process.env, platform = process.platform } = {}) {
  if (!Array.isArray(items) || items.some((item) => typeof item !== "string")) return [];
  const producible = new Set(["~/.nvm", "~/.local/bin", "~/.local/share/pipx", "~/.local/pipx"]);
  if (env.NVM_DIR) {
    const rel = path.relative(home, path.resolve(env.NVM_DIR));
    if (rel && rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel)) producible.add(`~/${rel.split(path.sep).join("/")}`);
  }
  return items.filter((item) => producible.has(item) && !isBroadReadEntry(item, { home, platform }));
}

// `ownedAllowRead`: allowRead items the user-settings receipt says canonkit appended; they are not
// "explicit outside exceptions" worth a review warning, user-added entries still are.
export function assessClaude(sources, environment, { ownedAllowRead = [] } = {}) {
  const details = [], add = (status, control, coverage, detail) => details.push({ status, control, coverage, detail });
  let readBlocked = false, writeBlocked = false;
  const observedSandbox = {};
  for (const { label, data, error } of sources) {
    if (error) { add("FAIL", "configuration", "unknown", `${label}: malformed or inaccessible configuration`); continue; }
    if (!data) continue;
    // File blocks are special: true in any loaded source holds against false.
    readBlocked ||= data.permissions?.blockReadsOutsideWorkingDirectories === true;
    writeBlocked ||= data.permissions?.blockWritesOutsideWorkingDirectories === true;
    // Ordinary sandbox fields merge in observed low-to-high precedence order.
    for (const key of ["enabled", "failIfUnavailable", "allowUnsandboxedCommands", "autoAllowBashIfSandboxed"]) {
      const value = data.sandbox?.[key];
      if (typeof value !== "boolean") continue;
      if (observedSandbox[key] !== undefined && observedSandbox[key] !== value) add("WARN", "scope-conflict", "unknown", `${label}: sandbox.${key} overrides another observed scope; managed/CLI effectiveness remains unknown`);
      observedSandbox[key] = value;
    }
    const mode = data.permissions?.defaultMode;
    if (mode !== undefined) add("WARN", "approval-mode", "partial", `${label}: permissions.defaultMode is configured; native precedence applies`);
    if (data.autoMode) add("WARN", "approval-mode", "partial", `${label}: autoMode classifier policy is configured`);
    const permissions = data.permissions ?? {}, sandbox = data.sandbox ?? {}, network = sandbox.network ?? {}, filesystem = sandbox.filesystem ?? {};
    if (permissions.allow?.length) add("WARN", "saved-approvals", "partial", `${label}: ${permissions.allow.length} explicit allow rules; no values displayed`);
    if (permissions.additionalDirectories?.length) add("WARN", "working-directories", "partial", `${label}: additional working directories expand scope`);
    for (const key of ["excludedCommands", "ignoreViolations"]) if (sandbox[key]?.length) add("WARN", "sandbox-exemptions", "partial", `${label}: sandbox.${key} contains exemptions`);
    if (filesystem.disabled === true || sandbox.enableWeakerNestedSandbox === true || sandbox.enableWeakerNetworkIsolation === true) add("WARN", "sandbox", "partial", `${label}: a weaker or disabled isolation layer is configured`);
    const readExceptions = label === "user" ? (filesystem.allowRead ?? []).filter((item) => !ownedAllowRead.includes(item)) : filesystem.allowRead ?? [];
    if (readExceptions.length || filesystem.allowWrite?.length) add("WARN", "filesystem-exceptions", "partial", `${label}: explicit outside filesystem exceptions require review`);
    if (network.allowedDomains?.length || network.httpProxyPort || network.socksProxyPort || network.allowAllUnixSockets || network.allowUnixSockets?.length || network.allowLocalBinding) add("WARN", "network-exceptions", "partial", `${label}: network/proxy/socket exceptions expand scope`);
    if (network.strictAllowlist !== undefined) add("WARN", "network-policy", "partial", `${label}: strictAllowlist is ${network.strictAllowlist === true ? "configured" : "off"}; only user/managed scope applies and runtime effectiveness is unverified`);
    if (network.strictAllowlist === true && !atLeast(environment.claudeVersion, SECURITY_VERSION_FLOORS.networkRepositoryLock)) add("WARN", "network-policy", "unknown", "repository network-expansion locks require Claude >=2.1.285; update the harness before relying on that ceiling");
    if (object(data.hooks)) {
      const own = Object.values(data.hooks).flatMap(x => Array.isArray(x) ? x : []).flatMap(x => Array.isArray(x?.hooks) ? x.hooks : []).filter(x => typeof x?.command === "string" && /(?:canonkit|meu-time)-hook\.js/.test(x.command));
      if (own.length) add("WARN", "optional-hooks", "partial", `${label}: ${own.length} canonkit registrations can affect approvals; activation and trust require harness evidence`);
    }
  }
  const strictSandbox = observedSandbox.enabled === true && observedSandbox.failIfUnavailable === true && observedSandbox.allowUnsandboxedCommands === false;
  if (observedSandbox.autoAllowBashIfSandboxed === true && !strictSandbox) add("WARN", "approval-mode", "partial", "sandbox automatic approval is enabled without the full strict sandbox profile");
  add(readBlocked && atLeast(environment.claudeVersion, SECURITY_VERSION_FLOORS.fileRead) ? "OK" : "WARN", "file-reads", "partial", readBlocked ? "outside-working-directory read restriction configured; harness exceptions remain" : "outside-working-directory read restriction not observed");
  add(writeBlocked && atLeast(environment.claudeVersion, SECURITY_VERSION_FLOORS.fileWrite) ? "OK" : "WARN", "file-writes", "partial", writeBlocked ? "outside-working-directory write restriction configured; version/runtime effectiveness unverified" : "write restriction unavailable or unconfigured; requires Claude >=2.1.314");
  const strictRequired = observedSandbox.enabled === true && observedSandbox.failIfUnavailable === true;
  add(strictRequired && environment.sandboxCapability === "unavailable" ? "FAIL" : "WARN", "shell", environment.platform === "win32" ? "unavailable" : "unknown", environment.platform === "win32" ? "native Windows shell has no Claude OS filesystem/network containment" : "sandbox configuration does not prove runtime filesystem/network containment");
  add("WARN", "effective-policy", "unknown", "managed, CLI, plugin and runtime policy inputs are not fully observable; web/MCP/hooks are separate surfaces");
  return details;
}

// Only a deliberately small TOML subset is interpreted; anything else is
// unknown rather than guessed. This is reporting, never write authority.
export function inspectCodex(text) {
  if (text === null) return { coverage: "unknown", detail: "config not observed; no enforcement changed" };
  const values = {}, allowed = new Set(["default_permissions", "sandbox_mode", "approval_policy", "sandbox_workspace_write.network_access", "windows.sandbox", "features.prefer_mxc"]);
  let table = "";
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const section = /^\[([A-Za-z0-9_.-]+)\]$/.exec(s);
    if (section) { table = section[1]; continue; }
    const entry = /^([A-Za-z0-9_-]+)\s*=\s*(?:"([A-Za-z0-9_:.-]+)"|(true|false))\s*(?:#.*)?$/.exec(s);
    if (!entry) return { coverage: "unknown", detail: "unsupported TOML/profile syntax; effective policy unknown" };
    const key = table ? `${table}.${entry[1]}` : entry[1];
    if (allowed.has(key)) {
      if (Object.hasOwn(values, key)) return { coverage: "unknown", detail: "duplicate TOML policy key; effective policy unknown" };
      values[key] = entry[2] ?? entry[3] === "true";
    }
  }
  const known = (value, choices) => choices.includes(value) ? value : "unknown";
  const profile = known(values.default_permissions, [":workspace", ":read-only", ":danger-full-access"]);
  const legacy = known(values.sandbox_mode, ["workspace-write", "read-only", "danger-full-access"]);
  const approval = known(values.approval_policy, ["never", "on-request", "on-failure", "untrusted"]);
  const windows = known(values["windows.sandbox"], ["mxc", "elevated", "unelevated"]);
  const network = typeof values["sandbox_workspace_write.network_access"] === "boolean" ? String(values["sandbox_workspace_write.network_access"]) : "unknown";
  const summary = [`permission-profile ${profile}; legacy-sandbox ${legacy}`, `approval-policy ${approval}; legacy-network-access ${network}`, `Windows implementation ${windows}; prefer_mxc ${typeof values["features.prefer_mxc"] === "boolean" ? values["features.prefer_mxc"] : "unknown"}`];
  return { coverage: "partial", detail: `${summary.join("; ")}; CLI/managed/runtime policy unknown; no enforcement changed` };
}

export function inspectOpencode(text, jsonc = false) {
  if (text === null) return { coverage: "unknown", detail: "config not observed; no enforcement changed" };
  if (jsonc) return { coverage: "unknown", detail: "JSONC requires harness resolution; no enforcement changed" };
  let data;
  try { data = JSON.parse(text); } catch { return { coverage: "unknown", detail: "invalid configuration; no enforcement changed" }; }
  if (!object(data) || (data.permissions !== undefined && (!Array.isArray(data.permissions) || data.permissions.some(x => !object(x))))) return { coverage: "unknown", detail: "unsupported permission shape; no enforcement changed" };
  return { coverage: "partial", detail: `${data.permissions?.length ?? 0} ordered permission rules; shell has user authority; subagent and external-directory policies require separate effective evidence; no enforcement changed` };
}

import { readFile, lstat, open } from "node:fs/promises";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { resolveBin, binVersion } from "./exec.js";

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

export async function collectEnvironment({ cwd = process.cwd(), env = process.env, platform = process.platform, release = os.release(), dryRun = false, read = readFile, exists = existsSync, resolve = resolveBin, version = binVersion } = {}) {
  let procVersion = "";
  if (platform === "linux") {
    try { procVersion = await read("/proc/version", "utf8"); } catch (err) { if (!absent(err) && err.code !== "EACCES") throw err; }
  }
  const options = { cwd, env, platform };
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
  return { ...evidence, claudeVersion: !dryRun && claude ? version(claude, { project: cwd, env: probeEnv, platform }) : null, versionEvidence: dryRun ? "not-probed-dry-run" : claude ? "trusted-binary-version" : "binary-unavailable" };
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

export function parseSecuritySettings(bytes, label = "settings") {
  if (bytes === null) return {};
  if (Buffer.byteLength(bytes) > MAX_SECURITY_BYTES) throw new Error(`Configuration exceeds the safety limit in ${label}; nothing was written`);
  let data;
  try { data = JSON.parse(Buffer.isBuffer(bytes) ? bytes.toString("utf8").replace(/^\uFEFF/, "") : bytes.replace(/^\uFEFF/, "")); }
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

export function compileSecurity(data, environment, { userSettings = {} } = {}) {
  const out = structuredClone(data), changes = [], gaps = [];
  const set = (keys, value) => {
    let at = out;
    for (const key of keys.slice(0, -1)) at = at[key] ??= {};
    const key = keys.at(-1);
    if (!same(at[key], value)) { at[key] = value; changes.push(keys.join(".")); }
  };
  const v = environment.claudeVersion;
  if (atLeast(v, SECURITY_VERSION_FLOORS.fileRead)) set(["permissions", "blockReadsOutsideWorkingDirectories"], true);
  else gaps.push("file-read-control-version-unverified");
  if (atLeast(v, SECURITY_VERSION_FLOORS.fileWrite)) set(["permissions", "blockWritesOutsideWorkingDirectories"], true);
  else gaps.push("file-write-control-requires-2.1.314");
  if (environment.sandboxCapability === "available-unverified" && atLeast(v, SECURITY_VERSION_FLOORS.sandbox)) {
    set(["sandbox", "enabled"], true);
    set(["sandbox", "failIfUnavailable"], true);
    set(["sandbox", "allowUnsandboxedCommands"], false);
    const autoApproval = data.sandbox?.autoAllowBashIfSandboxed ?? userSettings.sandbox?.autoAllowBashIfSandboxed;
    if (autoApproval === undefined) set(["sandbox", "autoAllowBashIfSandboxed"], false);
    else if (autoApproval !== false) gaps.push("existing-sandbox-autoapproval-preserved");
    // The native working-directory read block also covers sandbox shell reads
    // of user-data roots; project allowRead entries are ignored by that block.
    // Do not synthesize broad compensating grants or guess runtime paths.
    gaps.push("shell-runtime-boundary-unverified");
  } else gaps.push(environment.platform === "win32" ? "native-windows-shell-unsandboxed" : "sandbox-unavailable-or-version-unverified");
  // strictAllowlist is User/Managed-only. Project policy must not emit a key
  // that Claude ignores or pretend that allowedDomains=[] closes egress.
  gaps.push("network-strict-policy-assessed-separately-in-user-scope");
  const original = structuredClone(data), result = structuredClone(out);
  for (const value of [original, result]) {
    if (value.permissions) { delete value.permissions.blockReadsOutsideWorkingDirectories; delete value.permissions.blockWritesOutsideWorkingDirectories; if (!Object.keys(value.permissions).length) delete value.permissions; }
    if (value.sandbox) { for (const key of ["enabled", "failIfUnavailable", "allowUnsandboxedCommands", "autoAllowBashIfSandboxed"]) delete value.sandbox[key]; if (!Object.keys(value.sandbox).length) delete value.sandbox; }
  }
  if (!same(original, result)) throw new Error("Security compilation changed unrelated settings");
  return { data: out, changes, gaps, coverage: "partial", environment };
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

function scalarOwnership(keys) {
  const allowed = new Set(keys.map((parts) => parts.join(".")));
  const get = (data, parts) => parts.reduce((value, key) => value?.[key], data);
  const validate = (metadata) => {
    if (!object(metadata)) throw new Error("Invalid security ownership metadata");
    for (const [key, record] of Object.entries(metadata)) {
      if (!allowed.has(key) || !object(record) || Object.keys(record).some((field) => !["beforePresent", "beforeValue", "afterValue"].includes(field)) ||
          typeof record.beforePresent !== "boolean" || typeof record.afterValue !== "boolean" ||
          (record.beforePresent ? typeof record.beforeValue !== "boolean" : Object.hasOwn(record, "beforeValue"))) throw new Error("Invalid security ownership metadata");
    }
  };
  return { validate, capture: (beforeBytes, afterBytes, old) => {
    validate(old);
    const before = parseSecuritySettings(beforeBytes), after = parseSecuritySettings(afterBytes), metadata = structuredClone(old);
    for (const parts of keys) {
      const prior = get(before, parts), installed = get(after, parts), key = parts.join(".");
      if (same(prior, installed) || typeof installed !== "boolean") continue;
      const baseline = old[key] && old[key].afterValue === prior ? old[key] : { beforePresent: prior !== undefined, ...(prior === undefined ? {} : { beforeValue: prior }) };
      metadata[key] = { ...baseline, afterValue: installed };
    }
    return metadata;
  } };
}
export const projectSecurityOwnership = scalarOwnership(OWNED);
export const networkSecurityOwnership = scalarOwnership([["sandbox", "network", "strictAllowlist"]]);

function undoOwned(beforeBytes, _afterBytes, currentBytes, ownership, metadata) {
  ownership.validate(metadata);
  const current = parseSecuritySettings(currentBytes);
  const get = (data, keys) => keys.reduce((value, key) => value?.[key], data);
  for (const [key, record] of Object.entries(metadata)) {
    const keys = key.split("."), now = get(current, keys);
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

export function assessClaude(sources, environment) {
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
    for (const key of ["enabled", "failIfUnavailable"]) {
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
    if (sandbox.autoAllowBashIfSandboxed === true) add("WARN", "approval-mode", "partial", `${label}: sandbox automatic approval is enabled`);
    if (filesystem.disabled === true || sandbox.enableWeakerNestedSandbox === true || sandbox.enableWeakerNetworkIsolation === true) add("WARN", "sandbox", "partial", `${label}: a weaker or disabled isolation layer is configured`);
    if (filesystem.allowRead?.length || filesystem.allowWrite?.length) add("WARN", "filesystem-exceptions", "partial", `${label}: explicit outside filesystem exceptions require review`);
    if (network.allowedDomains?.length || network.httpProxyPort || network.socksProxyPort || network.allowAllUnixSockets || network.allowUnixSockets?.length || network.allowLocalBinding) add("WARN", "network-exceptions", "partial", `${label}: network/proxy/socket exceptions expand scope`);
    if (network.strictAllowlist !== undefined) add("WARN", "network-policy", "partial", `${label}: strictAllowlist is ${network.strictAllowlist === true ? "configured" : "off"}; only user/managed scope applies and runtime effectiveness is unverified`);
    if (network.strictAllowlist === true && !atLeast(environment.claudeVersion, SECURITY_VERSION_FLOORS.networkRepositoryLock)) add("WARN", "network-policy", "unknown", "repository network-expansion locks require Claude >=2.1.285; update the harness before relying on that ceiling");
    if (object(data.hooks)) {
      const own = Object.values(data.hooks).flatMap(x => Array.isArray(x) ? x : []).flatMap(x => Array.isArray(x?.hooks) ? x.hooks : []).filter(x => typeof x?.command === "string" && /(?:canonkit|meu-time)-hook\.js/.test(x.command));
      if (own.length) add("WARN", "optional-hooks", "partial", `${label}: ${own.length} canonkit registrations can affect approvals; activation and trust require harness evidence`);
    }
  }
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

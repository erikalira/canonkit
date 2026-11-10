/**
 * What models and reasoning efforts each harness offers, asked of the harness
 * itself at run time.
 *
 * Canonkit used to ship a table mapping one vendor's models onto another's.
 * Catalogs and effort levels change monthly and differ between subscriptions,
 * so every such table was stale for someone. Each harness can say what it
 * offers; this module asks it and records the answer in a machine cache,
 * ~/.canonkit/model-catalog.json. The person's choices live elsewhere
 * (model-config.js) and are never written here.
 *
 * Rules every adapter follows:
 *   - it runs only the harness's own read-only commands (--version, --help),
 *     through exec.js: no shell, stdin closed, a timeout, a capped buffer, and
 *     a binary resolved from PATH outside the current project;
 *   - it reads no credential and stores no token;
 *   - any failure is `unknown` with a reason, never an exception: discovery
 *     is advice, and a harness that cannot answer falls back to inherit.
 */
import { readFile, writeFile, mkdir, rename, rm } from "node:fs/promises";
import { realpathSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { resolveBin, runBin } from "./exec.js";
import { repositoryRoot, LOADER_ENV } from "./security.js";

const CATALOG_VERSION = 1;
const HARNESSES = ["claude", "codex", "opencode", "copilot"];
const RUN_TIMEOUT = 30 * 1000;
const RUN_MAX_BUFFER = 1024 * 1024;
// A model alias or effort as a harness prints it. Anything else in help text
// is prose, not an option, and is not recorded.
const TOKEN = /^[a-z][a-z0-9._-]{0,63}$/;

const catalogPath = (home = os.homedir()) => path.join(home, ".canonkit", "model-catalog.json");


/** True when `file` is `root` or below it, compared by real path. */
function inside(file, root) {
  try {
    const rel = path.relative(realpathSync.native(root), realpathSync.native(file));
    return !rel || (rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel));
  } catch {
    return true;
  }
}

/**
 * The production runner: (name, args) → { status, stdout, stderr, error }.
 * Tests inject their own. `root` is the repository the command runs in (or
 * cwd outside one): PATH entries under it are skipped and a binary under it
 * is refused, so a `claude` committed to a cloned repo, or left in its
 * node_modules/.bin, is never the one run, from any subfolder. The child runs
 * from the binary's own directory, as binVersion does.
 */
function systemRunner({ env = process.env, platform = process.platform, root = process.cwd() } = {}) {
  const probeEnv = Object.fromEntries(Object.entries(env).filter(([key]) => !LOADER_ENV.test(key)));
  return (name, args) => {
    const abs = resolveBin(name, { env, platform, cwd: root });
    if (!abs) return { status: null, stdout: "", stderr: "", error: `${name} not found on PATH` };
    if (platform === process.platform && inside(abs, root)) return { status: null, stdout: "", stderr: "", error: `${name} resolves inside the project; not run` };
    return runBin(abs, args, { cwd: path.dirname(abs), project: root, capture: true, timeout: RUN_TIMEOUT, maxBuffer: RUN_MAX_BUFFER, env: probeEnv, platform });
  };
}

/**
 * The runner for discovery from `cwd`: filtered against the enclosing
 * repository, as the security probe is. A repository marker that cannot be
 * trusted stops discovery (every run reports why) rather than falling back
 * to a narrower filter.
 */
async function trustedRunner(cwd = process.cwd(), { env = process.env, platform = process.platform } = {}) {
  let root;
  try {
    root = (await repositoryRoot(cwd)) ?? realpathSync.native(cwd);
  } catch (err) {
    return () => ({ status: null, stdout: "", stderr: "", error: `not run: ${err.message}` });
  }
  return systemRunner({ root, env, platform });
}

const unknown = (reason) => ({ status: "unknown", reason });

// Why a run did not produce usable output, in a person's words.
function failure(command, result) {
  if (result.error) return `${command}: ${result.error}`;
  if (result.status !== 0) return `${command} exited with status ${result.status}`;
  return null;
}

/**
 * The text of one option in commander-style help: its own line plus the
 * indented continuation lines up to the next option, joined into one line, so
 * a terminal-width wrap does not split what is parsed.
 */
function optionText(help, flag) {
  const lines = help.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => new RegExp(`^\\s+(?:-[A-Za-z], )?${flag}(?:[ ,=]|$)`).test(line));
  if (start === -1) return null;
  const out = [lines[start]];
  for (let i = start + 1; i < lines.length && lines[i].trim() && !/^\s+-/.test(lines[i]); i++) out.push(lines[i]);
  return out.join(" ").replace(/\s+/g, " ");
}

/**
 * `claude --help` lists aliases in the --model description ('fable', 'opus',
 * or 'sonnet') and the efforts in the --effort one (low, medium, high, ...).
 * Help text is not a contract, hence `confidence: "help-text"` and `unknown`
 * as soon as either part is not recognizable.
 */
function parseClaudeHelp(help) {
  const model = optionText(help, "--model");
  const effort = optionText(help, "--effort");
  if (!model) return unknown("claude --help has no --model option");
  if (!effort) return unknown("claude --help has no --effort option");
  const aliases = [...new Set([...model.matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((t) => TOKEN.test(t)))];
  const list = /\(([a-z0-9._-]+(?:,\s*[a-z0-9._-]+)+)\)/.exec(effort);
  const efforts = list ? list[1].split(",").map((t) => t.trim()).filter((t) => TOKEN.test(t)) : [];
  if (!aliases.length) return unknown("claude --help names no model aliases under --model");
  if (!efforts.length) return unknown("claude --help lists no effort levels under --effort");
  return { status: "discovered", models: aliases.map((id) => ({ id, efforts: [...efforts] })) };
}

const ADAPTERS = {
  claude: {
    harness: "claude",
    discover(run) {
      const version = run("claude", ["--version"]);
      const versionProblem = failure("claude --version", version);
      if (versionProblem) return unknown(versionProblem);
      const help = run("claude", ["--help"]);
      const helpProblem = failure("claude --help", help);
      if (helpProblem) return unknown(helpProblem);
      const parsed = parseClaudeHelp(help.stdout);
      if (parsed.status !== "discovered") return parsed;
      const m = /\d+\.\d+\.\d+/.exec(version.stdout);
      return { ...parsed, harnessVersion: m ? m[0] : null, source: "claude --help", confidence: "help-text" };
    },
  },
  // Not yet supported: no process is started. The follow-up change fills these
  // in (codex: `codex debug models`; opencode: `opencode models`).
  codex: { harness: "codex", discover: () => unknown("not yet supported") },
  opencode: { harness: "opencode", discover: () => unknown("not yet supported") },
  copilot: { harness: "copilot", discover: () => unknown("not yet supported") },
};

/** Ask each named harness; never throws for a harness that cannot answer. */
function discover(harnesses, { run, now = new Date() } = {}) {
  const out = {};
  for (const name of harnesses) {
    let entry;
    try {
      entry = ADAPTERS[name] ? ADAPTERS[name].discover(run) : unknown("no adapter");
    } catch (err) {
      entry = unknown(`discovery failed: ${err.message}`);
    }
    out[name] = { ...entry, discoveredAt: now.toISOString() };
  }
  return out;
}

/** The stored catalog, or null when there is none yet. Throws on a file it cannot trust. */
async function readCatalog(file = catalogPath()) {
  let text;
  try {
    text = await readFile(file, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${file} is not valid JSON; run canonkit models refresh`);
  }
  if (data?.version !== CATALOG_VERSION || typeof data.harnesses !== "object" || data.harnesses === null) {
    throw new Error(`${file} has an unsupported format (version ${JSON.stringify(data?.version)}); run canonkit models refresh`);
  }
  return data;
}

/**
 * Merge freshly discovered harnesses into the stored catalog and write it.
 * Harnesses not asked this time keep their last record: an install for
 * Claude Code alone does not forget what Codex said last week. A catalog that
 * cannot be read is replaced, since it is a cache that discovery owns.
 */
async function writeCatalog(fresh, file = catalogPath(), { keepWithin = 0, now = new Date() } = {}) {
  let previous = null;
  try {
    previous = await readCatalog(file);
  } catch {
    previous = null;
  }
  // `keepWithin` (ms): a record that is that recent and says the same thing is
  // kept as it is, discovery time included. Install passes it, so reinstalling
  // twice in a row rewrites nothing; `models refresh` does not.
  const same = (a, b) => {
    if (!a || !b) return false;
    const { discoveredAt: _a, ...x } = a;
    const { discoveredAt: _b, ...y } = b;
    return JSON.stringify(x) === JSON.stringify(y) && now - new Date(a.discoveredAt) < keepWithin;
  };
  const kept = Object.entries(fresh).filter(([h, entry]) => same(previous?.harnesses?.[h], entry));
  if (previous && kept.length === Object.keys(fresh).length) return previous;
  for (const [h] of kept) fresh = { ...fresh, [h]: previous.harnesses[h] };
  const data = { version: CATALOG_VERSION, harnesses: { ...(previous?.harnesses ?? {}), ...fresh } };
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`);
    await rename(tmp, file);
  } catch (err) {
    await rm(tmp, { force: true });
    throw err;
  }
  return data;
}

/** Discover and store in one step: what `models refresh` and install run. */
async function refreshCatalog(harnesses, { run, now = new Date(), file, keepWithin = 0 } = {}) {
  // Only harnesses with a working adapter need a process; skip the repository
  // walk when none will start one.
  const runner = run ?? (harnesses.some((h) => h === "claude") ? await trustedRunner() : () => ({ status: null, stdout: "", stderr: "", error: "not run" }));
  return writeCatalog(discover(harnesses, { run: runner, now }), file, { keepWithin, now });
}

export { HARNESSES, ADAPTERS, CATALOG_VERSION, catalogPath, systemRunner, trustedRunner, parseClaudeHelp, discover, readCatalog, writeCatalog, refreshCatalog };

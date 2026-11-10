/**
 * The person's model and effort choices, and how they resolve per agent.
 *
 * Two files with one shape (version 1):
 *   ~/.canonkit/models.json             user choices, every project
 *   <project>/.canonkit/models.json     project choices, committable
 *
 *   { "version": 1, "harnesses": { "claude": {
 *       "levels": { "deep": { "model": "opus", "effort": "high" } },
 *       "agents": { "quinn": { "effort": "high" } } } } }
 *
 * Need levels (light, standard, deep) are the recommended path; a per-agent
 * entry overrides its level. Model and effort resolve independently, in the
 * order: project agent, project level, user agent, user level, inherit.
 * Nothing here ships a default: no configuration means inherit everywhere.
 *
 * Unknown keys are kept on rewrite, and a file with another `version` is
 * refused rather than overwritten, so an older canonkit never erases what a
 * newer one wrote. Additive keys stay at version 1; the version changes only
 * when an existing field changes meaning.
 *
 * "The project" is one thing everywhere: the enclosing Git repository's root,
 * or the current directory outside one (projectRoot). A project file comes
 * from whoever wrote the repository, so it is read and written without
 * following links, and it never reaches a user-level file.
 */
import { readFile, writeFile, mkdir, rename, rm, lstat, stat, realpath } from "node:fs/promises";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { repositoryRoot } from "./security.js";

const CONFIG_VERSION = 1;
// Two small documents; anything larger is not one canonkit wrote.
const MAX_BYTES = 64 * 1024;

/**
 * The fields each harness is verified to act on in a generated agent file,
 * and so the harnesses whose choices are applied at all. A choice is written
 * only into a field listed here; a field is added only with its source and
 * the date it was checked. The other harnesses get theirs in the change that
 * adds their discovery adapter.
 */
const HONORED_FIELDS = {
  // code.claude.com/docs/en/sub-agents, "Frontmatter reference", checked
  // 2026-11-10: `model` takes an alias, a full model ID or inherit; `effort`
  // (low..max) overrides the session effort level. `model` was also verified
  // by running Claude Code 2.1.322; `effort` is documented but showed no
  // observable effect (kept by decision; openspec/changes/runtime-model-discovery/evidence.md).
  claude: ["model", "effort"],
  codex: [],
  opencode: [],
  copilot: [],
};
const APPLIED = Object.keys(HONORED_FIELDS).filter((h) => HONORED_FIELDS[h].length);
const FIELDS = ["model", "effort"];
// A model or effort is passed to a harness as a parameter and written into
// generated files. It is serialized safely there; this keeps it a short,
// printable string so a cloned project's file cannot smuggle structure in.
const VALUE = /^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,127}$/;
const NAME = /^[a-z0-9][a-z0-9-]{0,63}$/;

const userConfigPath = (home = os.homedir()) => path.join(home, ".canonkit", "models.json");
const projectConfigPath = (root) => path.join(root, ".canonkit", "models.json");

const empty = () => ({ version: CONFIG_VERSION, harnesses: {} });

function checkEntry(file, where, entry) {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) throw new Error(`${file}: ${where} must be an object`);
  for (const field of FIELDS) {
    if (entry[field] !== undefined && (typeof entry[field] !== "string" || !VALUE.test(entry[field]))) {
      throw new Error(`${file}: ${where}.${field} must be a model or effort name (letters, digits and . _ : / @ + -)`);
    }
  }
  if (entry.unverified !== undefined && typeof entry.unverified !== "boolean") throw new Error(`${file}: ${where}.unverified must be true or false`);
}

/** Throws on anything resolve() could not use as-is. */
function validate(file, data) {
  if (typeof data !== "object" || data === null || Array.isArray(data)) throw new Error(`${file}: not a JSON object`);
  if (data.version !== CONFIG_VERSION) {
    throw new Error(`${file}: version ${JSON.stringify(data.version)} is not supported by this canonkit (expected ${CONFIG_VERSION}); refusing to read or overwrite it`);
  }
  const harnesses = data.harnesses ?? {};
  if (typeof harnesses !== "object" || harnesses === null || Array.isArray(harnesses)) throw new Error(`${file}: harnesses must be an object`);
  for (const [harness, choice] of Object.entries(harnesses)) {
    // Keys are written into messages escaped: a hostile key must not put
    // terminal escapes or new lines into output a person or a model reads.
    const h = JSON.stringify(harness);
    if (typeof choice !== "object" || choice === null || Array.isArray(choice)) throw new Error(`${file}: harnesses[${h}] must be an object`);
    for (const kind of ["levels", "agents"]) {
      const map = choice[kind] ?? {};
      if (typeof map !== "object" || map === null || Array.isArray(map)) throw new Error(`${file}: harnesses[${h}].${kind} must be an object`);
      for (const [name, entry] of Object.entries(map)) {
        if (!NAME.test(name)) throw new Error(`${file}: harnesses[${h}].${kind} has an invalid name ${JSON.stringify(name)}`);
        checkEntry(file, `harnesses[${h}].${kind}.${name}`, entry);
      }
    }
  }
  return data;
}

/**
 * Refuse a project path that is, or sits in a `.canonkit` folder that is, a
 * link: a cloned repository could point it at a file of the person's.
 */
async function refuseProjectLinks(file) {
  for (const p of [path.dirname(file), file]) {
    try {
      if ((await lstat(p)).isSymbolicLink()) throw new Error(`${p} is a symbolic link or junction; refusing to use project model choices through it`);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
  }
}

/**
 * The choices in `file`, or an empty version-1 document when it does not
 * exist. `project: true` refuses links; the user's own file may be one (a
 * dotfile manager), but it must still be a small regular file.
 */
async function readChoices(file, { project = false } = {}) {
  if (project) await refuseProjectLinks(file);
  let info;
  try {
    info = await stat(file);
  } catch (err) {
    if (err.code === "ENOENT") return empty();
    throw err;
  }
  if (!info.isFile()) throw new Error(`${file}: not a regular file`);
  if (info.size > MAX_BYTES) throw new Error(`${file}: larger than ${MAX_BYTES} bytes; not a model choices file`);
  const text = await readFile(file, "utf8");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${file}: not valid JSON`);
  }
  return validate(file, data);
}

/** Atomic rewrite; the document is validated first, unknown keys included as they are. */
async function writeChoices(file, data, { project = false } = {}) {
  validate(file, data);
  if (project) await refuseProjectLinks(file);
  const target = !project && existsSync(file) ? realpathSync(file) : file;
  await mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.tmp`;
  try {
    await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`);
    await rename(tmp, target);
  } catch (err) {
    await rm(tmp, { force: true });
    throw err;
  }
}

/**
 * Set (or with null, clear) one level or agent entry in a loaded document.
 * Keeps the rest of the document, unknown keys included.
 */
function setChoice(data, harness, kind, name, entry) {
  if (kind !== "levels" && kind !== "agents") throw new Error(`setChoice: kind must be levels or agents, not ${kind}`);
  data.harnesses ??= {};
  data.harnesses[harness] ??= {};
  data.harnesses[harness][kind] ??= {};
  if (entry === null) delete data.harnesses[harness][kind][name];
  else data.harnesses[harness][kind][name] = entry;
  return data;
}

/**
 * The project from `cwd`, for every command: the enclosing Git repository's
 * root, or `cwd` itself outside one. Never a parent outside the repository,
 * and never the home folder, whose ~/.canonkit is the user layer. Throws on
 * a repository marker security.js does not trust.
 */
async function projectRoot(cwd = process.cwd(), home = os.homedir()) {
  const root = (await repositoryRoot(cwd)) ?? (await realpath(cwd));
  const homeReal = await realpath(home).catch(() => path.resolve(home));
  return path.resolve(root) === path.resolve(homeReal) ? null : root;
}

const SOURCES = {
  projectAgent: "project agent override",
  projectLevel: "project level",
  userAgent: "user agent override",
  userLevel: "user level",
  inherit: "inherit",
};

/**
 * One agent's effective model and effort for one harness. `project` may be
 * null (outside a project, or for user-level installed agents). Each field is
 * { value, source, unverified }; value is null when it resolves to inherit.
 */
function resolve(agent, harness, { user = empty(), project = null } = {}) {
  const layers = [];
  const add = (doc, kind, name, source) => {
    const entry = doc?.harnesses?.[harness]?.[kind]?.[name];
    if (entry) layers.push({ entry, source });
  };
  add(project, "agents", agent.name, SOURCES.projectAgent);
  add(project, "levels", agent.need, SOURCES.projectLevel);
  add(user, "agents", agent.name, SOURCES.userAgent);
  add(user, "levels", agent.need, SOURCES.userLevel);
  const out = {};
  for (const field of FIELDS) {
    const hit = layers.find((l) => l.entry[field] !== undefined);
    out[field] = hit
      ? { value: hit.entry[field], source: hit.source, unverified: hit.entry.unverified === true }
      : { value: null, source: SOURCES.inherit, unverified: false };
  }
  return out;
}

export { CONFIG_VERSION, HONORED_FIELDS, APPLIED, SOURCES, userConfigPath, projectConfigPath, projectRoot, readChoices, writeChoices, setChoice, resolve, validate };

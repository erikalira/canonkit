#!/usr/bin/env node
/**
 * Install the agent team into the local Claude Code / Codex / OpenCode / GitHub Copilot runtime.
 *
 * Agent source lives in agents/<name>.md. Installation writes Claude frontmatter
 * and Codex TOML with the model choices resolved for each destination.
 *
 * This is the single implementation. The shell and PowerShell scripts under
 * scripts/ are wrappers around it. That is deliberate: the core/specialist
 * split used to be a literal list repeated in three installers, and keeping
 * those copies honest cost validate.sh an entire section. The split now lives
 * in each agent's own frontmatter (`tier:`), which is where the runtime
 * already reads `name` and `model`, and every installer derives from it.
 *
 * One dependency, and only for the install menu: `prompts` is imported when the
 * menu is shown and not otherwise, so an install that a flag or the lack of a
 * terminal decides runs on Node alone. Everything else stays dependency-free —
 * an installer that runs before you trust the repo should not ask you to trust
 * a dependency tree first.
 */
import { readdir, lstat, readFile, writeFile, mkdir, copyFile, rm, rename, chmod } from "node:fs/promises";
import { existsSync, readFileSync, readdirSync, realpathSync, statSync, accessSync, constants as fsc } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { resolveBin, projectOnlyHit, windowsOnlyHits, danglingHits, readWindowsRoots, runBin, binVersion, display, SAFE_ARG } from "./exec.js";
import { InstallManifest, removeManagedBlock } from "./install-manifest.js";
import { renderInstallReport } from "./install-report.js";
import { renderDoctorReport } from "./doctor-report.js";
import { migrateClaudeHooks, isCanonicalClaudeHook } from "./claude-hooks.js";
import { STACK_PACK_IDS, StackPackStore } from "./stack-packs.js";
import { show as showModels, refresh as refreshModels, setup as setupModels, offerModelSetup, modelDiagnosis } from "./models-command.js";
import { HARNESSES as DISCOVERABLE, readCatalog, catalogPath } from "./model-discovery.js";
import { accessProblem, claudeRestriction, reservedKeyOf } from "./agent-access.js";
import { HONORED_FIELDS, userConfigPath, projectConfigPath, projectRoot, readChoices, resolve as resolveChoice } from "./model-config.js";
import { createHash } from "node:crypto";
import { collectEnvironment, repositoryRoot, safePath, projectStateDir, readSecurityBytes, parseSecuritySettings, compileSecurity, compileNetworkSecurity, undoSecurity, undoNetworkSecurity, projectSecurityOwnership, networkSecurityOwnership, serializeSecurity, assessClaude, inspectCodex, inspectOpencode } from "./security.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AGENTS_DIR = path.join(PACKAGE_ROOT, "agents");
const REFERENCE_DIR = path.join(PACKAGE_ROOT, "reference");
const HOOKS_DIR = path.join(PACKAGE_ROOT, "hooks");
// What each runtime adapter receives from hooks/, by name. An explicit list, not
// "every .js in the folder": the folder will also hold other adapters' files and
// shared code, and a stray file must not land in a runtime that does not run it.
// The claude list is exactly what 2.0 copied. Another adapter adds its own key.
// codex: the adapter, a byte-identical copy of the core it requires, and the
// {"type":"commonjs"} marker that keeps both CommonJS under a parent package
// that says "module". installCodexHooks copies it to $CODEX_HOME/canonkit/, the
// adapter first: the command wired into hooks.json names HOOK_FILES.codex[0].
// opencode: the same shape as codex, for opencodeDir()/canonkit/, copied there
// by installOpencodeHooks before the plugin that loads them.
const HOOK_FILES = {
  claude: ["canonkit-hook.js"],
  codex: ["canonkit-codex.js", "canonkit-hook.js", "package.json"],
  opencode: ["canonkit-opencode.js", "canonkit-hook.js", "package.json"],
};
// The OpenCode 2 plugin entry: an ESM file that loads ../canonkit/canonkit-opencode.js.
// Kept out of HOOK_FILES because its destination differs (opencodeDir()/plugins/,
// where OpenCode loads every file as a plugin) and it is not CommonJS.
const OPENCODE_PLUGIN = Object.freeze({ from: "opencode-plugin.mjs", to: "plugins/canonkit.js" });
const DASHBOARD_DIR = path.join(PACKAGE_ROOT, "dashboard");
const SKILLS_DIR = path.join(PACKAGE_ROOT, "skills");
const TOOLS_DIR = path.join(PACKAGE_ROOT, "tools");

async function dashboardDistributionFiles() {
  return ["serve.js", "package.json", "execution-model.js", "activity.html", "THIRD_PARTY_NOTICES.md", ...
    (await filesUnder(path.join(DASHBOARD_DIR, "dist"))).map((file) => path.join("dist", file))];
}

// Every event each hook must be registered under, with the matcher it needs
// there (null: no matcher). Checked per event, not per file: a hook wired to
// some of its events half-works, which hides better than not working — the gates
// fire, so nobody goes looking for the dispatch metrics that are never written.
// SendMessage is there for the Stop gate: a reviewer resumed after the last
// gated edit is a review after it.
const HOOK = "canonkit-hook.js";
const HOOK_EVENTS = {
  [HOOK]: {
    PreToolUse: "Edit|Write|MultiEdit|NotebookEdit|Bash|PowerShell|Agent|Task|SendMessage",
    PostToolUse: "Agent|Task|Read|Grep|Glob|Bash|PowerShell",
    SubagentStop: null,
    UserPromptSubmit: null,
    Stop: null,
  },
};

// Two runtimes read different files, and forgetting either one is the failure
// these markers exist to prevent. Claude Code reads .claude/agents/ and
// ~/.claude/CLAUDE.md; Codex reads AGENTS.md and never looks at .claude/.
// OpenCode reads ~/.config/opencode/AGENTS.md, and ~/.claude/CLAUDE.md only
// while that file does not exist.
const ROSTER = ["<!-- agent-team-config:start -->", "<!-- agent-team-config:end -->"];
const ROUTING = ["<!-- agent-team-config:routing:start -->", "<!-- agent-team-config:routing:end -->"];
const OPENCODE = ["<!-- agent-team-config:opencode:start -->", "<!-- agent-team-config:opencode:end -->"];
const CODEX = ["<!-- agent-team-config:codex:start -->", "<!-- agent-team-config:codex:end -->"];
const PROJECT_SPECIALISTS = [
  "<!-- agent-team-config:specialists:start -->",
  "<!-- agent-team-config:specialists:end -->",
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Files this repo owns, read as text with line endings normalized. A Windows
// checkout with core.autocrlf on hands every one of them back as CRLF, which
// made the frontmatter parser below reject every agent ("no frontmatter").
// Normalizing at the single read boundary keeps newline handling out of the
// parsing that follows. Files this installer does not own are read raw, so it
// never reformats a user's AGENTS.md as a side effect of editing one block.
const readOwned = async (p) => (await readFile(p, "utf8")).replace(/\r\n/g, "\n");

/* ------------------------------------------------------------------ agents */

/**
 * Parse the frontmatter of every agent file. `tier` is the source of truth for
 * the core/specialist split; an agent without a valid one is a hard error
 * rather than a silent default, because either default is wrong: treating it as
 * core installs it everywhere, treating it as a specialist hides it.
 */
async function readAgents() {
  const files = (await readdir(AGENTS_DIR)).filter((f) => f.endsWith(".md")).sort();
  const agents = [];

  for (const file of files) {
    agents.push(parseAgent(file, await readOwned(path.join(AGENTS_DIR, file))));
  }

  if (!agents.length) throw new Error(`No agents found in ${AGENTS_DIR}`);
  return agents;
}

const AUTHORITIES = ["veto", "blocks", "none"];
// How demanding an agent's normal work is, in words no vendor owns. The person
// maps each level to a model and effort per harness (`canonkit models setup`).
const NEEDS = ["light", "standard", "deep"];

/**
 * Parse one agent file (already newline-normalized). A specialist must declare
 * `authority` (veto | blocks | none): the project block states it per agent, and
 * a default would be a guess about who can stop a change. Core agents are not
 * required to declare it — theirs lives in the roster table in
 * reference/agents-block.md — but a value, if present, is carried through.
 */
function parseAgent(file, text) {
  const name = path.basename(file, ".md");
  const end = text.indexOf("\n---", 4);
  if (!text.startsWith("---\n") || end === -1) {
    throw new Error(`agents/${file}: no frontmatter`);
  }

  const front = {};
  for (const line of text.slice(4, end).split("\n")) {
    const m = /^([a-z]+):\s*(.*)$/.exec(line);
    if (m) front[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1");
  }

  if (front.name !== name) {
    throw new Error(`agents/${file}: frontmatter name is '${front.name}' — must match the filename`);
  }
  if (front.tier !== "core" && front.tier !== "specialist") {
    throw new Error(`agents/${file}: tier is '${front.tier ?? "missing"}' — expected core or specialist`);
  }
  if (front.tier === "specialist" && !AUTHORITIES.includes(front.authority)) {
    throw new Error(
      `agents/${file}: authority is '${front.authority ?? "missing"}' — a specialist must declare ${AUTHORITIES.join(", ")}`,
    );
  }
  // A vendor model label in the source is the coupling `need` replaced: Claude
  // Code acts on a `model:` field itself, so a stale one would pin a model.
  if ("model" in front) {
    throw new Error(`agents/${file}: 'model:' is no longer accepted — replace it with need: ${NEEDS.join(" | ")}`);
  }
  if (!NEEDS.includes(front.need)) {
    throw new Error(`agents/${file}: need is '${front.need ?? "missing"}' — expected ${NEEDS.join(", ")}`);
  }

  const problem = accessProblem(text.slice(4, end).split(/\r?\n/));
  if (problem) throw new Error(`agents/${file}: ${problem}`);

  return {
    name,
    tier: front.tier,
    authority: front.authority,
    need: front.need,
    access: front.access,
    description: front.description ?? "",
    // Everything after the frontmatter is the agent's actual instructions.
    // Claude Code reads the file as-is; Codex needs them as a TOML field.
    body: text.slice(end + 4).replace(/^\n+/, ""),
    // The whole file: Claude Code agents are this text with the person's
    // choices added to the frontmatter, so with none they stay byte-identical.
    source: text,
    file: path.join(AGENTS_DIR, file),
  };
}

const core = (agents) => agents.filter((a) => a.tier === "core");
const specialists = (agents) => agents.filter((a) => a.tier === "specialist");

/**
 * The one-line summary written into a project's AGENTS.md, read out of the
 * roster block rather than kept in a second list here. The trailing "Use when
 * ..." sentence is guidance for choosing an agent, not a description of
 * one, so it stays in the roster and out of the per-project entry.
 */
async function summaries() {
  const block = await readOwned(path.join(REFERENCE_DIR, "agents-block.md"));
  const out = new Map();
  for (const line of block.split("\n")) {
    const m = /^-\s+\*\*([a-z0-9-]+)\*\*\s+—\s+(.*)$/.exec(line.trim());
    if (m) out.set(m[1], m[2].replace(/\s*Use when[^.]*\.\s*$/i, "").trim());
  }
  return out;
}

/* ------------------------------------------------------------------- codex */

// Codex's own home: $CODEX_HOME when set, else ~/.codex. Every user-level Codex
// path hangs off it, agents included, so setting it moves them; the
// project-scoped .codex/agents that `add` writes is relative to the project.
const codexHome = () => path.resolve(process.env.CODEX_HOME || path.join(os.homedir(), ".codex"));
const copilotHome = () => path.join(os.homedir(), ".copilot");
const claudeHome = () => {
  const override = process.env.CLAUDE_CONFIG_DIR;
  if (override && !path.isAbsolute(override)) throw new Error("CLAUDE_CONFIG_DIR must be an absolute directory");
  return path.resolve(override || path.join(os.homedir(), ".claude"));
};

/**
 * Codex reads standalone TOML files from ~/.codex/agents (personal) and
 * .codex/agents (project-scoped), and identifies an agent by its `name` field
 * rather than the filename. Until it had those, the only thing this repo could
 * tell Codex was the roster prose in AGENTS.md — which describes the team but
 * cannot spawn anyone.
 *
 * Codex model and effort are resolved from the user's and project's version-1
 * models.json choices. Unconfigured agents inherit the session settings.
 */

// CANONKIT_CODEX_MODEL pinned one model for every Codex agent. It is ignored
// now; say so once per run rather than fail an install that used to work.
let codexModelWarned = false;
function warnIgnoredCodexModel(ctx) {
  if (process.env.CANONKIT_CODEX_MODEL === undefined || codexModelWarned) return;
  codexModelWarned = true;
  ctx.log("WARN CANONKIT_CODEX_MODEL is ignored: use canonkit models setup --codex and reinstall");
}

// TOML basic strings escape these two; the multi-line literal string used for
// the body escapes nothing, which is exactly what Markdown needs.
const tomlString = (s) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

function codexAgent(agent, choice = {}) {
  // A literal string cannot contain its own delimiter, and there is no escape
  // for it. Failing here beats emitting a file that silently truncates the
  // agent's instructions at the first occurrence.
  if (agent.body.includes("'''")) {
    throw new Error(`agents/${agent.name}.md: body contains ''' and cannot be written as a TOML literal string`);
  }

  return `# Generated by canonkit from agents/${agent.name}.md — do not edit here.
name = ${tomlString(agent.name)}
description = ${tomlString(agent.description)}
${choice.model ? `model = ${tomlString(choice.model)}\n` : ""}${choice.effort ? `model_reasoning_effort = ${tomlString(choice.effort)}\n` : ""}developer_instructions = '''
${agent.body.replace(/\n+$/, "")}
'''
`;
}

function codexChoiceFor(agent, layers, record, ctx) {
  const choice = choiceFor(agent, "codex", layers);
  const model = record?.status === "discovered" ? record.models.find((m) => m.id === choice.model) : null;
  if (model && choice.effort && !model.efforts.includes(choice.effort)) {
    ctx.log(`WARN Codex ${agent.name}: ${choice.model} does not support effort ${choice.effort}; both settings inherit`);
    return {};
  }
  return choice;
}

/* ------------------------------------------------------------------ claude */

/** { model, effort } values (null = inherit) for one agent from the layers given. */
function choiceFor(agent, harness, layers) {
  const r = resolveChoice(agent, harness, layers);
  return { model: r.model.value, effort: r.effort.value };
}

/**
 * A Claude Code agent: the source file, with the resolved choices added to the
 * frontmatter in the fields Claude Code honors. This is the default for a
 * dispatch that passes no model or effort; a planned dispatch passes them as
 * parameters (the orchestrate skill), which is how project choices reach
 * user-level agents. Values are JSON-quoted, which is valid YAML whatever they
 * hold.
 */
function claudeAgent(agent, choice = {}) {
  const end = agent.source.indexOf("\n---", 4);
  // The restriction comes only from translating `access`: drop any harness
  // restriction key a source smuggled past validation.
  const head = agent.source.slice(0, end).split("\n").filter((l) => !reservedKeyOf(l)).join("\n");
  const r = claudeRestriction(agent.access);
  const restriction = r ? `\n${r.key}: ${r.value}` : "";
  const fields = HONORED_FIELDS.claude.filter((f) => choice[f]).map((f) => `\n${f}: ${JSON.stringify(choice[f])}`).join("");
  return head + restriction + fields + agent.source.slice(end);
}

/* ---------------------------------------------------------------- opencode */

/**
 * OpenCode reads Markdown agents from ~/.config/opencode/agents (personal) and
 * .opencode/agents (project-scoped), named by the filename. Same format as the
 * source, but not the same frontmatter, so the file is generated rather than
 * copied or linked: a custom agent without `mode` loads as a primary agent,
 * and the source frontmatter (`need`, `tier`) is not OpenCode's.
 *
 * No model and no variant, by decision: OpenCode is run on whatever models
 * the session has, and a subagent without one uses the model of the agent
 * that invoked it. `name`, `tier` and `need` are this repo's bookkeeping.
 * The description is written JSON-quoted, which is a valid YAML string: most
 * descriptions carry a ": ", which a strict YAML parser rejects unquoted.
 */
function opencodeAgent(agent) {
  return `---
# Generated by canonkit from agents/${agent.name}.md — do not edit here.
description: ${JSON.stringify(agent.description)}
mode: subagent
---

${agent.body.replace(/\n+$/, "")}
`;
}

/**
 * Copilot custom agents use Markdown profiles with required descriptions. The
 * source declares a need level, not a Copilot model ID, so let Copilot choose the
 * active session's model instead of pinning an incompatible value.
 */
function copilotAgent(agent) {
  return `---
# Generated by canonkit from agents/${agent.name}.md — do not edit here.
name: ${agent.name}
description: ${JSON.stringify(agent.description)}
---

${agent.body.replace(/\n+$/, "")}
`;
}

/* ------------------------------------------------------------ marked blocks */

/**
 * Replace a marked block in a target file, preserving everything outside it.
 *
 * On the first run there are no markers yet and the target may already carry a
 * hand-written copy of the section. What to replace is derived from the block's
 * own first heading rather than from a caller-supplied pattern: the block knows
 * what it is, and a caller-supplied regex is one quoting mistake away from
 * silently appending a duplicate instead of replacing.
 */
function applyBlock(original, blockText, markers) {
  const crlf = usesCrlf(original);
  const result = applyBlockLf(toLf(original), blockText, markers);
  return { ...result, text: toEol(result.text, crlf) };
}

/**
 * Line endings are the file's, not the block's. A Windows checkout (git
 * autocrlf) holds CRLF, while the blocks are LF; edited as-is, the pattern that
 * swallows the newlines around a marker leaves a stray "\r" behind and the next
 * write turns it into one more blank line, on every run. Work on LF, then
 * write back in the file's own ending.
 */
const usesCrlf = (s) => {
  const crlf = (s.match(/\r\n/g) || []).length;
  return crlf > (s.match(/\n/g) || []).length - crlf;
};
const toLf = (s) => s.replace(/\r\n/g, "\n");
const toEol = (s, crlf) => (crlf ? s.replace(/\n/g, "\r\n") : s);

function applyBlockLf(original, blockText, markers) {
  const [start, end] = markers;
  const block = blockText.trim();
  const managed = `${start}\n${block}\n${end}`;
  const marked = new RegExp(`${esc(start)}[\\s\\S]*?${esc(end)}`);

  if (marked.test(original)) {
    return { text: original.replace(marked, () => managed), action: "updated managed block in" };
  }

  let text = original;
  let action = "appended managed block to";

  const heading = /^(#+)\s+(.*)$/.exec(block.split("\n")[0].trim());
  if (heading) {
    const level = heading[1].length;
    const legacy = new RegExp(
      `^#{1,${level}}\\s+${esc(heading[2])}[\\s\\S]*?(?=^#{1,${level}}\\s|$(?![\\s\\S]))`,
      "mi",
    );
    if (legacy.test(text)) {
      text = text.replace(legacy, "");
      action = "replaced hand-written section in";
    }
  }

  text = text.replace(/\s+$/, "");
  return { text: (text ? `${text}\n\n` : "") + managed + "\n", action };
}

async function syncBlock(blockPath, targetPath, markers, ctx, plannedText) {
  const blockText = plannedText ?? await readOwned(blockPath);
  const original = existsSync(targetPath) ? await readFile(targetPath, "utf8") : "";
  const { text, action } = applyBlock(original, blockText, markers);

  if (text === original) {
    await ctx.manifest?.observe(targetPath);
    return ctx.log(`already current: ${targetPath}`);
  }
  await ctx.write(targetPath, text);
  ctx.log(`${action} ${targetPath}`);
}

/* ---------------------------------------------------------------- commands */

const TARGETS = ["claude", "codex", "opencode", "copilot"];
// What install wrote before OpenCode was a target, and still writes when no
// flag or menu says otherwise. OpenCode is opt-in: writing its global
// AGENTS.md also ends its fallback to ~/.claude/CLAUDE.md, which is not a
// change to make for someone who never asked for OpenCode.
const DEFAULT_TARGETS = ["claude", "codex"];

/**
 * Which runtimes to write for. A flag decides (`--claude`, `--codex`,
 * `--opencode`, `--copilot`, any combination); without one, a terminal gets the menu, and
 * anything else — a script, CI, the tests — gets the defaults, which is what
 * install did before the choice existed. Returns null when the menu is
 * cancelled: nothing is written.
 */
async function chooseTargets(flags, { interactive = !!(process.stdin.isTTY && process.stdout.isTTY) } = {}) {
  const picked = TARGETS.filter((t) => flags.includes(`--${t}`));
  if (picked.length) return picked;
  if (!interactive) return [...DEFAULT_TARGETS];

  const { default: prompts } = await import("prompts");
  const { targets } = await prompts({
    type: "multiselect",
    name: "targets",
    message: "Install the team for",
    // The defaults start checked: Enter alone keeps what install did before the menu.
    choices: [
      { title: "Claude Code", value: "claude", selected: true, description: "~/.claude/agents, hooks, dashboard" },
      { title: "Codex", value: "codex", selected: true, description: "$CODEX_HOME (~/.codex), ~/.agents/skills" },
      { title: "OpenCode", value: "opencode", selected: false, description: "~/.config/opencode, ~/.agents/skills" },
      { title: "GitHub Copilot", value: "copilot", selected: false, description: "~/.copilot/agents, ~/.copilot/skills" },
    ],
    min: 1,
    hint: "space toggles, enter confirms",
    // The hint already says how; prompts' own instruction block adds five lines
    // that a Windows terminal miscounts on redraw, leaving a copy of the header
    // behind on every keypress.
    instructions: false,
  });
  return targets?.length ? targets : null;
}

const securityDigest = (value) => value === null ? null : createHash("sha256").update(value).digest("hex");
async function optionalBytes(file) {
  return readSecurityBytes(file);
}

const PROJECT_CORE_NAMES = ["archie", "bob", "gard", "perry", "pipe", "pixie", "quinn", "scott", "spencer", "virgo"];
function scopedSecurityManifest(ctx, root, targets = ["claude", "codex"]) {
  const codexEntries = PROJECT_CORE_NAMES.map((name) => ({
    id: `project:file:.codex/agents/${name}.toml`, root: "project",
    relative: `.codex/agents/${name}.toml`, kind: "file", owners: ["codex"], preserveModified: true,
  }));
  return new InstallManifest({ home: os.homedir(), roots: { project: root },
    catalog: [{ id: "project:json:.claude/settings.json", root: "project", relative: ".claude/settings.json", kind: "json", owners: ["claude"], undo: undoSecurity, securityOwnership: projectSecurityOwnership }, ...codexEntries],
    stateDir: projectStateDir(os.homedir(), root), targets, dryRun: ctx.dryRun, log: ctx.log });
}

async function prepareSecurity(ctx, targets, { wireHooks = false } = {}) {
  if (!targets.includes("claude")) return null;
  const root = await repositoryRoot();
  const evidence = await collectEnvironment({ cwd: root ?? process.cwd(), dryRun: ctx.dryRun });
  const globalFile = settingsPath();
  await safePath(globalFile);
  const globalBefore = await optionalBytes(globalFile);
  const userSettings = parseSecuritySettings(globalBefore, "user Claude settings");
  const migration = wireHooks ? null : migrateClaudeHooks(userSettings, claudeHome());
  const globalPlan = { file: globalFile, before: globalBefore, migration, ...compileNetworkSecurity(migration?.data ?? userSettings, evidence) };
  if (migration?.removed.length) globalPlan.changes.push("hooks.legacyCanonkit");
  let project = null;
  if (root) {
    const file = path.join(root, ".claude", "settings.json");
    await safePath(file);
    await safePath(projectStateDir(os.homedir(), root));
    const before = await optionalBytes(file);
    const settings = parseSecuritySettings(before, "repository Claude settings");
    const migration = wireHooks ? null : migrateClaudeHooks(settings, claudeHome());
    project = { root, file, before, migration, ...compileSecurity(migration?.data ?? settings, evidence, { userSettings }) };
    if (migration?.removed.length) project.changes.push("hooks.legacyCanonkit");
  }
  return { evidence, global: globalPlan, project };
}

async function applyClaudeUserPlan(ctx) {
  const plan = ctx.networkSecurityPlan;
  if (!plan?.changes.length) return;
  await safePath(plan.file);
  if (securityDigest(await optionalBytes(plan.file)) !== securityDigest(plan.before)) throw new Error("Concurrent edit of user Claude settings; security configuration was preserved");
  for (const key of plan.changes) ctx.log(`${ctx.dryRun ? "would apply" : "Applying"} user Claude setting: ${key} (native modes and personal permissions preserved)`);
  await ctx.writeAtomic(plan.file, serializeSecurity(plan.data, plan.before?.toString("utf8")).toString("utf8"));
}

async function install(ctx, options = {}) {
  const targets = options.targets ?? DEFAULT_TARGETS;
  // Every selected harness and both security stores are validated before a
  // manifest lock/recovery or any distribution write begins.
  if (options.wireHooks && targets.includes("claude")) await readSettingsForWiring(settingsPath());
  if (options.wireHooks && targets.includes("codex")) { refuseUnquotableCodexPath(); await readCodexHooksForWiring(codexHooksPath()); }
  if (options.wireHooks && targets.includes("opencode")) { await readOpencodeConfigForWiring(); if (!ctx.dryRun) refuseOpencodeBelow2(); }
  warnIgnoredCodexModel(ctx);
  const security = await prepareSecurity(ctx, targets, options);
  const codexRoot = targets.includes("codex") ? await repositoryRoot() : null;
  const projectRootForInstall = security?.project?.root ?? codexRoot;
  const projectCodexChoices = codexRoot ? await readChoices(projectConfigPath(codexRoot), { project: true }) : null;
  const projectManifest = projectRootForInstall ? scopedSecurityManifest(ctx, projectRootForInstall, targets) : null;
  if (projectManifest) await projectManifest.load();
  for (const manifest of [ctx.manifest, projectManifest].filter(Boolean)) {
    for (const spec of manifest.catalog.values()) if (spec.owners.some((owner) => targets.includes(owner))) await safePath(manifest.target(spec));
  }
  const completed = [];
  try {
    // Fixed order: global distribution, then the current repository receipt.
    await ctx.manifest?.start();
    await projectManifest?.start();
    const configured = { ...ctx, networkSecurityPlan: security?.global, hookWiringRequested: options.wireHooks === true };
    if (security && !options.wireHooks) {
      for (const [label, plan] of [["user", security.global], ["repository", security.project]]) {
        if (!plan?.migration) continue;
        if (plan.migration.removed.length) ctx.log(`${ctx.dryRun ? "would unregister" : "Unregistering"} ${plan.migration.removed.length} canonical canonkit hook handlers in ${label} settings`);
        for (const key of plan.migration.ambiguous) ctx.log(`WARN migration ${label} ${key}: ambiguous canonkit command preserved; inspect /hooks manually`);
      }
      await applyClaudeUserPlan(configured);
      if (!ctx.dryRun && security.global.changes.length) completed.push("user Claude settings");
    }
    await installDistribution(configured, options);
    if (projectManifest && targets.includes("codex")) {
      await installProjectCodex(ctx, projectManifest, projectRootForInstall, projectCodexChoices);
    }
    if (security) {
      for (const gap of security.global.gaps) ctx.log(`WARN security network: ${gap}`);
      const project = security.project;
      if (!project) ctx.log("WARN security repository: no validated repository; project policy pending, no global fallback");
      else {
        ctx.log(`Security repository: ${project.root}`);
        for (const key of project.changes) ctx.log(`${ctx.dryRun ? "would apply" : "Applying"} repository control: ${key}`);
        await safePath(project.file);
        if (securityDigest(await optionalBytes(project.file)) !== securityDigest(project.before)) throw new Error("Concurrent edit of repository settings; security configuration was preserved");
        if (project.changes.length) await projectManifest.write(project.file, serializeSecurity(project.data, project.before?.toString("utf8")));
        if (!ctx.dryRun && project.changes.length) completed.push("repository Claude settings");
        for (const gap of project.gaps) ctx.log(`WARN security coverage: ${gap}`);
      }
      if (ctx.dryRun) ctx.log("Security version/runtime checks not executed in dry run; effective coverage unknown");
      ctx.log("Check native permissions and security coverage: npx canonkit doctor");
    }
  } catch (err) {
    if (completed.length) ctx.log(`Partial installation: completed ${completed.join(" and ")}; later stages did not complete. Receipts and private snapshots remain; fix the reported condition and re-run install. Removed hook registrations were not restored.`);
    throw err;
  } finally { await projectManifest?.close(); }
}

/**
 * Delete the ~/.agents/<core>.md copies that 2.0 wrote, but only those that are
 * byte-identical (line endings aside) to this package's agent. A modified copy,
 * a symlink or anything that is not a regular file is left alone.
 */
async function removeAgentsLeftovers(ctx, coreAgents) {
  const dir = path.join(os.homedir(), ".agents");
  for (const agent of coreAgents) {
    const file = path.join(dir, `${agent.name}.md`);
    try {
      if (!(await lstat(file)).isFile()) continue;
      if (toLf(await readFile(file, "utf8")) !== agent.source) {
        ctx.log(`  kept ${file}: differs from this package's ${agent.name} (delete it by hand if unwanted)`);
        continue;
      }
    } catch (err) {
      if (err.code === "ENOENT") continue;
      ctx.log(`  kept ${file}: ${err.code ?? err.message}`);
      continue;
    }
    await ctx.remove(file);
    ctx.log(`  ${ctx.dryRun ? "would remove" : "removed"} 2.0 leftover: ${file}`);
  }
}

async function installDistribution(ctx, options = {}) {
  const reference = options.reference !== false;
  const wire = options.wireHooks === true;
  const targets = options.targets ?? DEFAULT_TARGETS;
  const claude = targets.includes("claude");
  const codex = targets.includes("codex");
  const opencode = targets.includes("opencode");
  const copilot = targets.includes("copilot");
  // Each harness's wiring is written only for a harness in the install: wiring
  // one the person said no to would be writing it anyway.
  const agents = await readAgents();
  // Before anything is written, for every harness: a settings.json, hooks.json
  // or opencode.json --wire-hooks would have to guess about, or an OpenCode the
  // plugin cannot run in, stops the whole install, so a refusal leaves no
  // half-install.
  if (wire && claude) await readSettingsForWiring(settingsPath());
  if (wire && codex) {
    refuseUnquotableCodexPath();
    await readCodexHooksForWiring(codexHooksPath());
  }
  if (wire && opencode) {
    await readOpencodeConfigForWiring();
    // A dry run starts no program, `opencode --version` included.
    if (ctx.dryRun) ctx.log("would check that opencode --version is 2 or later (not run in a dry run)");
    else refuseOpencodeBelow2();
  }

  // User-level agents follow the user's choices only: a project's choices
  // reach them through dispatch parameters, never by rewriting them here.
  // Read before any write, so a file this version cannot trust stops the install.
  const userChoices = claude || codex ? await readChoices(userConfigPath()) : null;
  await discoverModels(ctx, targets);
  const codexCatalog = codex ? await readCatalog(catalogPath()).catch(() => null) : null;

  // Claude Code reads ~/.claude/agents only; no verified harness reads
  // ~/.agents/<agent>.md, so install no longer writes it (doctor warns on leftovers).
  const dests = claude ? [path.join(claudeHome(), "agents")] : [];

  for (const dest of dests) {
    await ctx.mkdir(dest);
    for (const agent of core(agents)) {
      await ctx.write(path.join(dest, `${agent.name}.md`), claudeAgent(agent, choiceFor(agent, "claude", { user: userChoices })));
    }
    ctx.log(`Installed ${core(agents).length} agents -> ${dest}`);

    // A specialist left at user level is available in every project and
    // silently defeats the per-project rule. Removing it is what actually
    // enforces the split. Only names this repo owns are touched.
    for (const agent of specialists(agents)) {
      const stray = path.join(dest, `${agent.name}.md`);
      if (existsSync(stray)) {
        if (ctx.manifest) { ctx.log(`  preserved untracked global specialist: ${stray}`); continue; }
        await ctx.remove(stray);
        ctx.log(`  removed specialist left at user level: ${agent.name}.md`);
      }
    }
  }

  // 2.0 also copied the core agents to ~/.agents/<agent>.md, which no harness reads.
  // Only a regular file identical to this package's agent goes; one the person
  // edited stays, and doctor keeps reporting it.
  if (claude) await removeAgentsLeftovers(ctx, core(agents));

  if (codex) {
    await installCodex(ctx, agents, path.join(codexHome(), "agents"), { userChoices, record: codexCatalog?.harnesses?.codex });
    await installCodexHooks(ctx, { wire });
  }
  if (opencode) {
    await installOpencode(ctx, agents, opencodeAgentsDir());
    await installOpencodeHooks(ctx, { wire });
  }
  if (copilot) await installCopilot(ctx, agents, copilotAgentsDir());
  if (claude) {
    const planned = await installHooks(ctx, path.join(claudeHome(), "hooks"), { wire });
    await upgradeFromMeuTime(ctx, claudeHome(), { wire, planned });
    await installDashboard(ctx, path.join(claudeHome(), "canonkit-dashboard"));
  }

  if (reference) {
    ctx.log("");
    await syncReference(ctx, targets);
  } else if (claude && !wire) {
    // --no-reference skips distribution, but a migration must retire stale
    // claims in an already installed kit block, including a retry after a
    // partial migration. Never create a new block here.
    await syncClaudeRouting(ctx, { existingOnly: true });
  }

  ctx.log("");
  ctx.log("Core installed. Domain specialists are per project:");
  ctx.log("  cd <project> && npx canonkit add <name>");
  // doctor checks the Claude Code half (the agents, the blocks and the hook),
  // plus the Codex hook where one is installed. Without Claude Code its rows
  // would all FAIL, so a Codex-only install is not pointed at it.
  if (claude) ctx.log("Check the install (agents, blocks, hook wiring, config): npx canonkit doctor");
}

/**
 * Refresh the model catalog for the harnesses being installed, so `models
 * setup` and doctor compare against what is installed now. Advice only: a
 * failure is a warning, and a dry run starts no program.
 */
async function discoverModels(ctx, targets) {
  const harnesses = targets.filter((t) => DISCOVERABLE.includes(t));
  if (!harnesses.length) return;
  try {
    await refreshModels(ctx, { harnesses, keepWithin: 24 * 60 * 60 * 1000 });
  } catch (err) {
    ctx.log(`WARN model discovery: ${err.message}; agents keep their configured choices or inherit`);
  }
}

/**
 * Write the core team as Codex custom agents. Same split as everywhere else:
 * core at user level, specialists per project.
 */
async function installCodex(ctx, agents, dest, { userChoices, record } = {}) {
  await ctx.mkdir(dest);
  for (const agent of core(agents)) {
    await ctx.write(path.join(dest, `${agent.name}.toml`), codexAgent(agent, codexChoiceFor(agent, { user: userChoices }, record, ctx)));
  }
  ctx.log(`Installed ${core(agents).length} agents -> ${dest}`);

  for (const agent of specialists(agents)) {
    const stray = path.join(dest, `${agent.name}.toml`);
    if (existsSync(stray)) {
      if (ctx.manifest) { ctx.log(`  preserved untracked global specialist: ${stray}`); continue; }
      await ctx.remove(stray);
      ctx.log(`  removed specialist left at user level: ${agent.name}.toml`);
    }
  }

  // Your own Codex agents live here too and are none of this installer's
  // business. The one thing worth saying is narrower: a file that looks like an
  // older copy of an agent this repo owns, in a format Codex does not load from
  // here — which leaves a second, divergent version of that agent lying around.
  // Reported, never removed: the name is not one this repo claims, so deleting
  // it is not an installer's decision to make.
  const stale = await olderCopies(dest, agents, ".toml");

  if (stale.length) {
    ctx.log(`  possible older copies of agents this repo owns: ${stale.map((e) => e.name).join(", ")}`);
    ctx.log("  Codex does not load these — remove them yourself once you have checked.");
  }
}

async function installProjectCodex(ctx, manifest, root, project) {
  const agents = core(await readAgents());
  const user = await readChoices(userConfigPath());
  const record = (await readCatalog(catalogPath()).catch(() => null))?.harnesses?.codex;
  for (const agent of agents) {
    const file = path.join(root, ".codex", "agents", `${agent.name}.toml`);
    const relative = path.relative(root, file);
    if (!relative || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) throw new Error("Project Codex destination escapes repository root");
    await safePath(file);
    const spec = manifest.byPath.get(path.resolve(file));
    if (!spec) throw new Error(`Uncatalogued project Codex agent: ${agent.name}`);
    const userChoice = codexChoiceFor(agent, { user }, record, ctx);
    const projectChoice = codexChoiceFor(agent, { user, project }, record, ctx);
    const desired = project && (userChoice.model !== projectChoice.model || userChoice.effort !== projectChoice.effort);
    if (!desired) { await manifest.retire(file); continue; }
    const receipt = manifest.data.entries[spec.id];
    if (existsSync(file) && !receipt) {
      ctx.log(`WARN preexisting project Codex agent preserved: ${file}`);
      continue;
    }
    if (receipt) {
      const bytes = await readFile(file).catch((err) => { if (err.code === "ENOENT") return null; throw err; });
      if (bytes && createHash("sha256").update(bytes).digest("hex") !== receipt.hash) {
        await manifest.retire(file);
        continue;
      }
    }
    await manifest.write(file, codexAgent(agent, projectChoice));
    ctx.log(`${ctx.dryRun ? "would install" : "Installed"} project Codex agent: ${agent.name}`);
  }
}

// Files in dest that are not this repo's but carry one of its agents' names.
async function olderCopies(dest, agents, ext) {
  const owned = new Set(agents.map((a) => `${a.name}${ext}`));
  const entries = existsSync(dest) ? await readdir(dest, { withFileTypes: true }) : [];
  return entries
    .filter((e) => e.isFile() && !owned.has(e.name) && !e.name.startsWith("."))
    .filter((e) => agents.some((a) => e.name.toLowerCase().replace(/\.[^.]+$/, "").split(/[^a-z0-9]+/).includes(a.name)));
}

// OpenCode's global config folder: $XDG_CONFIG_HOME/opencode, else
// ~/.config/opencode — on Windows too.
const opencodeDir = () => path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "opencode");
const opencodeAgentsDir = () => path.join(opencodeDir(), "agents");
const copilotAgentsDir = () => path.join(copilotHome(), "agents");

/**
 * Write the core team as OpenCode subagents, with the same split and the same
 * hands-off rule for files this repo does not own as installCodex.
 */
async function installOpencode(ctx, agents, dest) {
  await ctx.mkdir(dest);
  for (const agent of core(agents)) {
    await ctx.write(path.join(dest, `${agent.name}.md`), opencodeAgent(agent));
  }
  ctx.log(`Installed ${core(agents).length} agents -> ${dest}`);

  for (const agent of specialists(agents)) {
    const stray = path.join(dest, `${agent.name}.md`);
    if (existsSync(stray)) {
      if (ctx.manifest) { ctx.log(`  preserved untracked global specialist: ${stray}`); continue; }
      await ctx.remove(stray);
      ctx.log(`  removed specialist left at user level: ${agent.name}.md`);
    }
  }

  // Unlike Codex's case, an older copy saved as .md here is not inert: OpenCode
  // loads every .md in this folder, so it runs as a second agent beside ours.
  const stale = await olderCopies(dest, agents, ".md");

  if (stale.length) {
    ctx.log(`  possible older copies of agents this repo owns: ${stale.map((e) => e.name).join(", ")}`);
    ctx.log("  OpenCode loads any .md here as an agent — remove them yourself once you have checked.");
  }
}

async function installCopilot(ctx, agents, dest) {
  await ctx.mkdir(dest);
  for (const agent of core(agents)) {
    await ctx.write(path.join(dest, `${agent.name}.agent.md`), copilotAgent(agent));
  }
  ctx.log(`Installed ${core(agents).length} agents -> ${dest}`);

  for (const agent of specialists(agents)) {
    const stray = path.join(dest, `${agent.name}.agent.md`);
    if (existsSync(stray)) {
      if (ctx.manifest) { ctx.log(`  preserved untracked global specialist: ${stray}`); continue; }
      await ctx.remove(stray);
      ctx.log(`  removed specialist left at user level: ${agent.name}.agent.md`);
    }
  }
}

/**
 * Install the runtime hooks. These are the [ENFORCED] half of the team rules:
 * the routing block promises gates that only exist while this file is on disk
 * and referenced by settings.json.
 *
 * Until this command existed the hook lived only in ~/.claude/hooks/, edited in
 * place, in one copy on one machine — the same "single list repeated nowhere"
 * problem the agents had, in its worse form, because nothing validated it.
 */
async function installHooks(ctx, dest, { wire = false } = {}) {
  const files = HOOK_FILES.claude.filter((f) => existsSync(path.join(HOOKS_DIR, f)));
  if (!files.length) return null;

  await copyKeepingLocal(ctx, HOOKS_DIR, dest, files);
  ctx.log(`Installed ${files.length} hook${files.length === 1 ? "" : "s"} -> ${dest}`);

  if (wire) return wireHooks(ctx, dest);
  await reportHookWiring(ctx, dest, files);
  return null;
}

/**
 * Install the activity dashboard the hook's event log feeds. It used to live
 * only in ~/.claude/, the same unversioned single copy the
 * hook once was — so the hook could change the log's shape with nothing in the
 * repo able to follow it.
 */
async function installDashboard(ctx, dest) {
  if (!existsSync(DASHBOARD_DIR)) return;
  const files = await dashboardDistributionFiles();
  await copyKeepingLocal(ctx, DASHBOARD_DIR, dest, files);
  const serve = path.join(dest, "serve.js").split(path.sep).join("/");
  ctx.log(`Installed dashboard -> ${dest}  (run: node ${serve})`);
}

/**
 * Before the rename, the hook, its log and its dashboard were called meu-time.
 * The log moves, so the dashboard and the Stop gate keep their history; both
 * also read the old location, which covers a move that could not happen.
 *
 * The old hook file is the delicate part. A settings.json may still run the old
 * name — the global one, which is the user's and is not rewritten here, or a
 * project's .claude/settings.json, which cannot even be found from here — and
 * deleting the file would turn every gate there off with no sign: the runtime
 * reports a hook that cannot start as a non-blocking error and carries on. So the
 * file becomes a forwarder, and only `--wire-hooks` — which the user asked for,
 * and which has just rewired settings.json — removes it, and only when nothing
 * it can see still runs it (retireForwarder). Its previous contents are kept as
 * .local.bak — there is no shipped copy left to tell an edit from.
 * Legacy handling sunsets in 2.0.
 */
const LEGACY = { hook: "meu-time-hook.js", log: "meu-time-activity", dashboard: "meu-time-dashboard" };
const FORWARDER_MARK = "canonkit-forwarder";
const HOOK_FORWARDER = `#!/usr/bin/env node
// ${FORWARDER_MARK}: written by \`canonkit install\`. A settings.json (the global
// one or a project's) may still run this pre-rename name; this runs
// canonkit-hook.js so the gates keep firing there. Point every settings.json at
// canonkit-hook.js, then delete this file.
require('./canonkit-hook.js').run();
`;
// What install leaves at meu-time-hook.js: the current forwarder, unless the file
// already is one and still calls run() — then it was edited by hand, works, and
// stays as it is. One that only require()s is an older forwarder, refreshed: the
// hook no longer runs on a bare require(). When HOOK_FORWARDER's text changes,
// its old text goes into SHIPPED_FORWARDERS, or every copy already installed
// would read as edited by hand: never refreshed, never removed.
const SHIPPED_FORWARDERS = [];
const forwarderFor = (current) =>
  current.includes(FORWARDER_MARK) && current.includes(".run()") && !SHIPPED_FORWARDERS.includes(current)
    ? current
    : HOOK_FORWARDER;
// The hook rotates its log at 2 MB. A merged log is split so the live file starts
// well under that: otherwise the first append rotates all of it out of the file
// the Stop gate reads, current session included.
const LOG_TAIL_BYTES = 1024 * 1024;

async function upgradeFromMeuTime(ctx, claudeDir, { wire = false, planned = null } = {}) {
  const notes = [];
  // History is user data, never an uninstall-owned artifact. Keep the existing
  // migration's merge/rollback guarantees without claiming ownership of logs.
  const history = ctx.historyContext ?? ctx;

  const oldLog = path.join(claudeDir, LEGACY.log);
  const newLog = path.join(claudeDir, "canonkit-activity");
  if (existsSync(oldLog)) {
    if (existsSync(newLog)) {
      notes.push(...(await mergeLegacyLog(history, oldLog, newLog)));
    } else {
      try {
        await history.move(oldLog, newLog);
        notes.push(`moved ~/.claude/${LEGACY.log} -> ~/.claude/canonkit-activity (history kept)`);
      } catch (err) {
        // A file held open (a running dashboard on Windows) blocks the move. The
        // read-through keeps the history visible, so the install goes on.
        notes.push(`could not move ~/.claude/${LEGACY.log} (${err.code ?? err.message}); it is still read in place.`);
        notes.push("  Re-run install once nothing holds it open.");
      }
    }
  }

  const oldHook = path.join(claudeDir, "hooks", LEGACY.hook);
  if (existsSync(oldHook)) {
    const current = await readFile(oldHook, "utf8");
    if (!current.includes(FORWARDER_MARK)) {
      if (!ctx.manifest) await ctx.copy(oldHook, `${oldHook}.local.bak`);
      notes.push(`previous ${LEGACY.hook} kept as ${LEGACY.hook}.local.bak`);
    }
    const next = forwarderFor(current);
    if (next !== current) await ctx.write(oldHook, next);
    else await ctx.manifest?.observe(oldHook);
    if (wire) {
      const retire = retireForwarder(ctx, claudeDir, oldHook, next, planned);
      if (retire.remove) await ctx.remove(oldHook);
      notes.push(...retire.notes);
    } else if (next !== HOOK_FORWARDER) {
      notes.push(`${LEGACY.hook} carries the forwarder mark but was edited by hand; left as is.`);
    } else if (settingsMention(claudeDir, LEGACY.hook)) {
      notes.push(`settings.json still runs ${LEGACY.hook}: it now forwards to canonkit-hook.js, so the gates`);
      notes.push(`  keep firing. Replace that command with canonkit-hook.js (wiring above), then delete ${LEGACY.hook}.`);
    } else {
      notes.push(`${LEGACY.hook} now forwards to canonkit-hook.js, in case a project's .claude/settings.json`);
      notes.push("  still runs it. Point those at canonkit-hook.js, then delete it.");
    }
  }

  if (existsSync(path.join(claudeDir, LEGACY.dashboard))) {
    notes.push(`~/.claude/${LEGACY.dashboard} is no longer updated: the dashboard is now ~/.claude/canonkit-dashboard.`);
    notes.push("  Delete the old one yourself.");
  }

  if (!notes.length) return;
  ctx.log("");
  ctx.log("Upgrade from meu-time:");
  for (const n of notes) ctx.log(`  ${n}`);
}

/**
 * Both logs exist when the renamed hook logged before install could move the old
 * one (the hook was updated first, or an earlier move failed). Merged oldest
 * first — old.1, old, new.1, new — because everything the old name wrote
 * predates the first line under the new one, and the dashboard reads in file
 * order. The old folder is then gone, so this runs once and never nags again.
 */
async function mergeLegacyLog(ctx, oldLog, newLog) {
  if (ctx.dryRun) return [`would merge ~/.claude/${LEGACY.log} into ~/.claude/canonkit-activity and remove it`];
  // Moved aside first: on Windows this is what fails while something (a running
  // dashboard) holds the folder, and then nothing has been touched yet.
  const staging = `${oldLog}.merging`;
  try {
    await ctx.move(oldLog, staging);
  } catch (err) {
    return [
      `could not merge ~/.claude/${LEGACY.log} into canonkit-activity (${err.code ?? err.message}); it is still read in place.`,
      "  Re-run install once nothing holds it open.",
    ];
  }
  const live = path.join(newLog, "events.jsonl");
  const rotated = `${live}.1`;
  const text = (f) => { try { return readFileSync(f, "utf8"); } catch { return ""; } };
  const hadRotated = existsSync(rotated);
  const prevRotated = text(rotated);
  try {
    const before = text(live);
    const lines = [path.join(staging, "events.jsonl.1"), path.join(staging, "events.jsonl"), rotated]
      .map(text).concat(before).join("\n").split("\n").filter((l) => l.trim());
    let cut = lines.length;
    for (let bytes = 0; cut > 0 && bytes + Buffer.byteLength(lines[cut - 1]) + 1 <= LOG_TAIL_BYTES; cut--) {
      bytes += Buffer.byteLength(lines[cut - 1]) + 1;
    }
    const body = (ls) => (ls.length ? ls.join("\n") + "\n" : "");
    if (cut > 0) await ctx.writeAtomic(rotated, body(lines.slice(0, cut)));
    else await ctx.remove(rotated);
    // The hook appends while sessions run: whatever landed since the read above
    // is carried over right before the swap.
    await ctx.writeAtomic(live, body(lines.slice(cut)) + text(live).slice(before.length));
  } catch (err) {
    // Back to where it was, .1 included: a .1 that already holds the old lines,
    // next to a restored old folder, would merge them twice on the re-run.
    try {
      if (hadRotated) await ctx.writeAtomic(rotated, prevRotated);
      else await ctx.remove(rotated);
    } catch { /* best effort */ }
    try { await ctx.move(staging, oldLog); } catch { /* left at .merging */ }
    return [`could not merge ~/.claude/${LEGACY.log} into canonkit-activity (${err.code ?? err.message}); re-run install.`];
  }
  try {
    await ctx.removeTree(staging);
  } catch (err) {
    return [`merged ~/.claude/${LEGACY.log} into canonkit-activity; delete ~/.claude/${LEGACY.log}.merging (${err.code ?? err.message}).`];
  }
  return [`merged ~/.claude/${LEGACY.log} into ~/.claude/canonkit-activity (history kept) and removed it`];
}

/**
 * Every settings file this machine can be seen to run hooks from: the user's
 * own two, and the project's two for cwd and CLAUDE_PROJECT_DIR. Other projects'
 * cannot be found from here — which is why removing the forwarder says so.
 * Raw bytes, not parsed: a file that is not valid JSON can still run the hook.
 * `override` stands in for a file's planned bytes (a dry run writes nothing).
 */
function pathKey(p) {
  // One key per file however it is reached: HOME through a symlink (macOS's /var
  // is /private/var) and the realpath'd cwd name the same settings.json, and a
  // dry run's planned bytes must stand in for both. The file may not exist yet,
  // so the nearest existing ancestor is resolved and the rest kept as is.
  let dir = path.resolve(p);
  const rest = [];
  for (;;) {
    try {
      dir = realpathSync.native(dir);
      break;
    } catch {
      const up = path.dirname(dir);
      if (up === dir) break;
      rest.unshift(path.basename(dir));
      dir = up;
    }
  }
  const key = path.join(dir, ...rest);
  return process.platform === "win32" ? key.toLowerCase() : key;
}

function legacyRunners(claudeDir, override = {}) {
  const dirs = [claudeDir, ...[process.cwd(), process.env.CLAUDE_PROJECT_DIR].filter(Boolean).map((d) => path.join(d, ".claude"))];
  const seen = new Set();
  const running = [];
  const unreadable = [];
  for (const file of dirs.flatMap((d) => ["settings.json", "settings.local.json"].map((f) => path.join(d, f)))) {
    if (seen.has(pathKey(file))) continue;
    seen.add(pathKey(file));
    let bytes;
    try {
      bytes = pathKey(file) in override ? Buffer.from(override[pathKey(file)]) : readFileSync(file);
    } catch (err) {
      if (err.code !== "ENOENT" && err.code !== "ENOTDIR") unreadable.push(file);
      continue;
    }
    // Without the extension: `node .../meu-time-hook` runs the same file.
    if (bytes.includes(LEGACY.hook.replace(/\.js$/, ""))) running.push(file);
  }
  return { running, unreadable };
}

const slash = (p) => p.split(path.sep).join("/");
const tilde = (p) => {
  const home = slash(os.homedir());
  const s = slash(p);
  return s.toLowerCase().startsWith(home.toLowerCase() + "/") ? `~${s.slice(home.length)}` : s;
};

/**
 * Under --wire-hooks, after settings.json was rewired: the forwarder goes only
 * when it is exactly the one install writes (an edited one is the user's), and
 * no settings file in sight still runs it — one that cannot be read counts as
 * running it. Returns the notes, and whether the caller removes the file.
 */
function retireForwarder(ctx, claudeDir, file, content, planned) {
  const shown = tilde(file);
  const keep = (notes) => ({ remove: false, notes });
  if (content !== HOOK_FORWARDER) {
    return keep([`kept ${shown}: it was edited by hand (not the forwarder install writes). Delete it yourself once no settings.json runs it.`]);
  }
  const { running, unreadable } = legacyRunners(claudeDir, planned ? { [pathKey(planned.file)]: planned.text } : {});
  if (running.length || unreadable.length) {
    return keep([
      ...running.map((f) => `kept ${shown}: ${slash(f)} still runs ${LEGACY.hook}. Point it at ${HOOK}, then re-run.`),
      ...unreadable.map((f) => `kept ${shown}: could not read ${slash(f)}, which may still run it.`),
    ]);
  }
  if (ctx.manifest) {
    return keep([`kept ${shown}: other projects cannot be enumerated. Point their .claude/settings.json at canonkit-hook.js, then delete the forwarder manually.`]);
  }
  if (ctx.dryRun) return keep([`would remove ${shown}: no settings file in sight runs it any more.`]);
  return {
    remove: true,
    notes: [
      `removed ${shown}: no settings file in sight runs it any more. Other projects cannot be seen from here:`,
      `  a project's .claude/settings.json that still runs it now runs nothing — no gate fires there;`,
      `  \`npx canonkit doctor\` run in that project FAILs and names the file.`,
    ],
  };
}

// Raw text, not parsed: a settings file that is not valid JSON can still run the hook.
function settingsMention(claudeDir, name) {
  return ["settings.json", "settings.local.json"].some((f) => {
    try { return readFileSync(path.join(claudeDir, f), "utf8").includes(name); } catch { return false; }
  });
}

/**
 * Editing these files in place is the only workflow they ever had, so an
 * install that silently replaced a divergent copy would destroy the very
 * customization that motivated versioning them. Keep it, then overwrite.
 * A file is a name, or { from, to } when it lands under another name.
 */
async function copyKeepingLocal(ctx, fromDir, dest, files) {
  await ctx.mkdir(dest);
  for (const entry of files) {
    const [src, file] = typeof entry === "string" ? [entry, entry] : [entry.from, entry.to];
    const from = path.join(fromDir, src);
    const to = path.join(dest, file);
    await ctx.mkdir(path.dirname(to));
    if (!ctx.manifest && existsSync(to) && (await readOwned(to)) !== (await readOwned(from))) {
      await ctx.copy(to, `${to}.local.bak`);
      ctx.log(`  ${file} differed — previous copy kept as ${file}.local.bak`);
    }
    await ctx.copy(from, to);
  }
}

/* ------------------------------------------------------------ hook wiring */

const settingsPath = () => path.join(claudeHome(), "settings.json");
const isObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * The events a hook is not registered under with the coverage it needs. An
 * entry missing a tool of its matcher half-works — an Agent|Task PostToolUse
 * still writes dispatch metrics and silently misses main-thread volume; a
 * PreToolUse without SendMessage still gates edits and never credits a resumed
 * reviewer — so coverage is checked tool by tool. The matcher is read anchored:
 * misreading `Edit|Write` as covering MultiEdit would be a false pass, and a
 * false FAIL costs one --wire-hooks run. Shared by install's print-only report,
 * --wire-hooks and doctor.
 */
function wiringGaps(hooks, file) {
  const covers = (entry, tool) => {
    if (!entry.matcher || entry.matcher === "*") return true;
    try { return new RegExp(`^(?:${entry.matcher})$`).test(tool); } catch { return false; }
  };
  const gaps = [];
  for (const [event, matcher] of Object.entries(HOOK_EVENTS[file])) {
    const own = (Array.isArray(hooks[event]) ? hooks[event] : [])
      .filter((e) => isObject(e) && JSON.stringify(e.hooks ?? []).includes(file));
    const covered = own.length > 0 && (!matcher || matcher.split("|").every((tool) => own.some((e) => covers(e, tool))));
    if (!covered) gaps.push([event, matcher]);
  }
  return gaps;
}

/**
 * A hook on disk that no event references does nothing and reports nothing —
 * the failure mode is a gate everyone believes is running. Without --wire-hooks
 * the wiring is printed, never applied.
 */
async function reportHookWiring(ctx, dest, files) {
  const settings = settingsPath();

  let parsed = {};
  if (existsSync(settings)) {
    try {
      parsed = JSON.parse(await readFile(settings, "utf8"));
    } catch {
      ctx.log("  ~/.claude/settings.json is not valid JSON — cannot check hook wiring");
      return;
    }
  }

  const hooks = isObject(parsed.hooks) ? parsed.hooks : {};
  const missing = []; // [file, event, matcher]
  for (const file of files) {
    if (HOOK_EVENTS[file]) {
      for (const [event, matcher] of wiringGaps(hooks, file)) missing.push([file, event, matcher]);
    } else if (!JSON.stringify(hooks).includes(file)) {
      // A hook this map does not describe: the most that can be said is whether
      // anything references it at all.
      missing.push([file, null, null]);
    }
  }
  if (!missing.length) return;

  ctx.log("");
  for (const file of new Set(missing.map(([f]) => f))) {
    const events = missing.filter(([f, e]) => f === file && e).map(([, e]) => e);
    ctx.log(`  ${file} is not referenced by ~/.claude/settings.json with required coverage${events.length ? ` under: ${events.join(", ")}` : ""}`);
  }
  ctx.log("  These hooks are optional; native approvals remain authoritative. To opt in explicitly (backup first):");
  ctx.log("    npx canonkit install --wire-hooks");
  ctx.log("  or add under \"hooks\" in settings.json yourself:");
  ctx.log("  If an entry already exists, update its matcher instead of adding a duplicate hook.");
  for (const [file, event, matcher] of missing) {
    const entry = `{ ${matcher ? `"matcher": "${matcher}", ` : ""}"hooks": [{ "type": "command", "command": "node ${slash(path.join(dest, file))}" }] }`;
    ctx.log(event ? `    "${event}": [${entry}]` : `    ${entry}`);
  }
}

/**
 * settings.json for --wire-hooks, or a refusal. settings.json carries the user's
 * permissions, env and model; anything this would have to guess about — not
 * JSON, not an object, a `hooks` or an event of the wrong shape — stops the
 * install before it writes anything. Messages name key paths, never values.
 * Codex's hooks.json has the same shape under `hooks` and gets the same rule.
 */
const readSettingsForWiring = (file) => readHooksFileForWiring(file, "~/.claude/settings.json");

async function readHooksFileForWiring(file, label) {
  if (!existsSync(file)) return { text: null, data: {} };
  const text = (await readSecurityBytes(file)).toString("utf8");
  const refuse = (why) =>
    new Error(`Refusing --wire-hooks: ${label} ${why}. Nothing was written; fix it, then re-run.`);
  let data;
  try { data = JSON.parse(text.replace(/^﻿/, "")); } catch { throw refuse("is not valid JSON"); }
  if (!isObject(data)) throw refuse("is not a JSON object");
  if (data.hooks !== undefined) {
    if (!isObject(data.hooks)) throw refuse('has a "hooks" that is not an object');
    for (const [event, entries] of Object.entries(data.hooks)) {
      if (!Array.isArray(entries)) throw refuse(`has hooks.${event}, which is not an array`);
    }
  }
  return { text, data };
}

// Exactly `node <path>/canonkit-hook.js` or the pre-rename name, the path quoted
// or not. Anything else that mentions the file wraps it (a redirect, a shell, a
// timeout): rewriting it would drop what it does around the hook, so it is left
// and reported.
// The path takes no shell syntax (`;|&$` and backticks, parentheses,
// redirects): `node x;curl|sh;/canonkit-hook.js` is a wrapper, not the shape.
const EXACT_HOOK_COMMAND =
  /^\s*node\s+(?:"(?:[^"$`]*[\\/])?(?:meu-time-hook|canonkit-hook)\.js"|'(?:[^']*[\\/])?(?:meu-time-hook|canonkit-hook)\.js'|(?:[^\s"';|&$`()<>]*[\\/])?(?:meu-time-hook|canonkit-hook)\.js)\s*$/;
const isOurHook = (h) => isObject(h) && h.type === "command" && typeof h.command === "string" && EXACT_HOOK_COMMAND.test(h.command);
const mentionsHook = (h) => isObject(h) && typeof h.command === "string" && /(?:meu-time-hook|canonkit-hook)\.js/.test(h.command);

/**
 * The settings with the hook wired, and what changed, by key path. Per required
 * event: one entry of its own runs the hook, with the canonical command; an old
 * matcher on it is widened in place; duplicates go; a hook sharing an entry with
 * the user's own hooks moves out to its own entry, leaving the user's matcher as
 * it was (widening it would run their hook on tools they never chose). Under any
 * other event an exact pre-rename command is only renamed. Nothing else moves.
 */
function wireSettings(data, command) {
  const out = structuredClone(data);
  out.hooks ??= {};
  const hooks = out.hooks;
  const changes = [];
  const wrappers = [];
  const entriesOf = (entry) => (isObject(entry) && Array.isArray(entry.hooks) ? entry.hooks : []);
  const canonical = (h) => ({ ...h, type: "command", command });

  for (const [event, entries] of Object.entries(hooks)) {
    entries.forEach((entry, i) => entriesOf(entry).forEach((h, j) => {
      if (mentionsHook(h) && !isOurHook(h)) wrappers.push(`hooks.${event}[${i}].hooks[${j}]`);
    }));
  }

  const required = HOOK_EVENTS[HOOK];
  for (const [event, entries] of Object.entries(hooks)) {
    if (event in required) continue;
    hooks[event] = entries.map((entry) => {
      const list = entriesOf(entry);
      if (!list.some((h) => isOurHook(h) && h.command !== command)) return entry;
      changes.push(`hooks.${event}: command now runs ${HOOK}`);
      return { ...entry, hooks: list.map((h) => (isOurHook(h) ? canonical(h) : h)) };
    });
  }

  for (const [event, matcher] of Object.entries(required)) {
    const note = (what) => changes.push(`hooks.${event}: ${what}`);
    let own = null;
    const next = [];
    for (const entry of hooks[event] ?? []) {
      const list = entriesOf(entry);
      const mine = list.filter(isOurHook);
      if (!mine.length) {
        next.push(entry);
        continue;
      }
      const theirs = list.filter((h) => !isOurHook(h));
      if (theirs.length) {
        next.push({ ...entry, hooks: theirs });
        note("moved out of an entry shared with other hooks (their matcher unchanged)");
        continue;
      }
      if (own) {
        note("duplicate removed");
        continue;
      }
      own = { ...entry, hooks: [canonical(mine[0])] };
      if (mine.length > 1) note("duplicate removed");
      if (mine[0].command !== command) note(`command now runs ${HOOK}`);
      if (wiringGaps({ [event]: [own] }, HOOK).some(([e]) => e === event)) {
        own.matcher = matcher;
        note("matcher widened");
      }
      next.push(own);
    }
    if (!own) {
      next.push({ ...(matcher ? { matcher } : {}), hooks: [{ type: "command", command }] });
      note("added");
    }
    hooks[event] = next;
  }
  return { data: out, changes: [...new Set(changes)], wrappers };
}

/**
 * The file's own formatting where it can be kept: its indentation, line ending
 * and BOM. A rewrite is still a rewrite of the whole file, which is why it only
 * happens when the parsed settings actually change.
 */
function serializeSettings(data, original) {
  const indent = (original && /\n([ \t]+)"/.exec(original)?.[1]) || "  ";
  const text = JSON.stringify(data, null, indent) + "\n";
  return (original?.startsWith("﻿") ? "﻿" : "") + toEol(text, original ? usesCrlf(original) : false);
}

/**
 * install --wire-hooks: the hook registered under every event with its matcher,
 * in ~/.claude/settings.json only (settings.local.json is never written). The
 * original bytes are backed up first, only when they change, and the file is
 * replaced atomically keeping its mode. Returns the planned file for a dry run.
 */
async function wireHooks(ctx, dest) {
  const file = settingsPath();
  const { text, data } = await readSettingsForWiring(file);
  if (ctx.networkSecurityPlan && securityDigest(text === null ? null : Buffer.from(text)) !== securityDigest(ctx.networkSecurityPlan.before)) throw new Error("Concurrent edit of user Claude settings; wiring was preserved");
  const command = `node "${slash(path.join(dest, HOOK))}"`;
  const { data: wired, changes, wrappers } = wireSettings(ctx.networkSecurityPlan?.data ?? data, command);
  changes.push(...(ctx.networkSecurityPlan?.changes ?? []).map((key) => `${key}: restrictive user-scope setting applied`));
  const after = serializeSettings(wired, text);

  ctx.log("");
  // Its own entry is still written beside a wrapper: wired is not left to a
  // command canonkit cannot read. Until the wrapper goes, the hook runs twice.
  for (const w of wrappers) {
    ctx.log(`  ${w}: a command that wraps the hook — left as is. If it runs it under an event wired below,`);
    ctx.log(`    the hook runs twice there (every gate asks twice): remove the wrapper or point it elsewhere.`);
  }
  if (JSON.stringify(wired) === JSON.stringify(data)) {
    await ctx.manifest?.observe(file);
    ctx.log(`  ${HOOK} is already wired in ~/.claude/settings.json.`);
    return null;
  }
  if (ctx.dryRun) {
    ctx.log(`would wire ${HOOK} into ~/.claude/settings.json (backup first):`);
  } else {
    const bak = text === null ? null : await ctx.backup(file);
    await ctx.writeAtomic(file, after);
    ctx.log(`Wired ${HOOK} into ~/.claude/settings.json${bak ? ` (previous copy: ${path.basename(bak)})` : ""}:`);
    // The copy holds whatever settings.json holds, env tokens included.
    if (bak) ctx.log(`  The backup carries the same values as settings.json (env included): keep it out of a dotfiles repo.`);
  }
  for (const c of changes) ctx.log(`  ${c}`);
  return ctx.dryRun ? { file, text: after } : null;
}

/* ------------------------------------------------------ codex hook wiring */

// One group. Slice 7 (codex-cli 0.166.0) saw a shell call fire `Bash` and an
// apply_patch call fire both `apply_patch` and `Edit|Write`: these two names
// cover every call the adapter gates, and adding Edit|Write would run it twice.
const CODEX_MATCHER = "Bash|apply_patch";
const CODEX_ADAPTER = HOOK_FILES.codex[0];
const codexHooksDir = () => path.join(codexHome(), "canonkit");
const codexHooksPath = () => path.join(codexHome(), "hooks.json");
// Fixed, absolute, quoted. Codex's /hooks trust covers the command and not the
// files it runs (slice 7), so a command that never changes is trusted once and
// a refresh of canonkit/ asks for nothing. No commandWindows: Codex runs this
// through powershell.exe, where `node "<path>"` works as it does in sh.
const codexCommand = () => `node "${slash(path.join(codexHooksDir(), CODEX_ADAPTER))}"`;
const readCodexHooksForWiring = (file) => readHooksFileForWiring(file, tilde(file));

// Inside double quotes sh and PowerShell still expand `$` and a backtick, and a
// `"` ends the quote: a CODEX_HOME holding one would run another path or none,
// and Codex says nothing when a hook cannot start. Refused before any write.
function refuseUnquotableCodexPath() {
  const dir = slash(codexHooksDir());
  if (/["$`]/.test(dir)) {
    throw new Error(`Refusing --wire-hooks: the Codex hook path ${dir} holds ", $ or a backtick, which the shell Codex runs it through would expand. Nothing was written; set CODEX_HOME to a plain path, then re-run.`);
  }
}

// Exactly `node <path>/canonkit-codex.js`, quoted or not, the same shape rule as
// EXACT_HOOK_COMMAND: a command that wraps the adapter is the user's.
const EXACT_CODEX_COMMAND =
  /^\s*node\s+(?:"(?:[^"$`]*[\\/])?canonkit-codex\.js"|'(?:[^']*[\\/])?canonkit-codex\.js'|(?:[^\s"';|&$`()<>]*[\\/])?canonkit-codex\.js)\s*$/;
const isOurCodexHook = (h) => isObject(h) && h.type === "command" && typeof h.command === "string" && EXACT_CODEX_COMMAND.test(h.command);

/**
 * hooks.json with the adapter wired, what changed and what was left, by key
 * path. Codex keys trust by position (`hooks.json:pre_tool_use:<group>:<hook>`
 * in config.toml), so nothing of the user's moves: a new group goes last, an
 * existing one of ours is fixed where it stands, a second one is reported and
 * left (removing it would shift every index after it), and a group shared with
 * the user's hooks keeps its matcher (changing it would change when theirs run).
 */
function wireCodexHooks(data, command) {
  const out = structuredClone(data);
  out.hooks ??= {};
  const groups = (out.hooks.PreToolUse ??= []);
  const handlersOf = (g) => (isObject(g) && Array.isArray(g.hooks) ? g.hooks : []);
  const mine = groups.flatMap((g, i) => handlersOf(g).flatMap((h, j) => (isOurCodexHook(h) ? [[i, j]] : [])));
  const changes = [];
  const notes = [];

  if (!mine.length) {
    groups.push({ matcher: CODEX_MATCHER, hooks: [{ type: "command", command }] });
    return { data: out, changes: ["hooks.PreToolUse: added"], notes };
  }
  const [i, j] = mine.find(([g, h]) => groups[g].hooks[h].command === command) ?? mine[0];
  const group = groups[i];
  if (group.hooks[j].command !== command) {
    group.hooks[j] = { ...group.hooks[j], command };
    changes.push(`hooks.PreToolUse[${i}]: command now runs ${slash(path.join(codexHooksDir(), CODEX_ADAPTER))}`);
  }
  if (group.matcher !== CODEX_MATCHER) {
    if (group.hooks.length === 1) {
      group.matcher = CODEX_MATCHER;
      changes.push(`hooks.PreToolUse[${i}]: matcher set to ${CODEX_MATCHER}`);
    } else {
      notes.push(`hooks.PreToolUse[${i}]: shared with other hooks, so its matcher is left as is — give ${CODEX_ADAPTER} a group of its own with matcher ${CODEX_MATCHER}`);
    }
  }
  for (const [g, h] of mine) {
    if (g !== i || h !== j) notes.push(`hooks.PreToolUse[${g}].hooks[${h}]: a second ${CODEX_ADAPTER} hook, left in place (removing it would shift the trust of the hooks after it) — remove it yourself`);
  }
  return { data: out, changes, notes };
}

/**
 * The Codex hook: HOOK_FILES.codex into $CODEX_HOME/canonkit/, and with
 * --wire-hooks the group in $CODEX_HOME/hooks.json, after the files so the
 * command never names a file that is not there yet. Without --wire-hooks only a
 * folder that already exists is refreshed: a copy nothing runs is one more place
 * a gate looks present and is off.
 */
async function installCodexHooks(ctx, { wire = false } = {}) {
  const dest = codexHooksDir();
  if (!wire && !existsSync(dest)) return;
  await copyKeepingLocal(ctx, HOOKS_DIR, dest, HOOK_FILES.codex);
  ctx.log(`Installed ${HOOK_FILES.codex.length} Codex hook files -> ${dest}`);
  if (wire) await wireCodexHooksFile(ctx);
}

// The same write as wireHooks: backup only on a change, atomic, the file's
// own formatting kept. Trust is the one difference: Codex skips a new or
// changed hook until /hooks approves it, so the line is printed only then.
async function wireCodexHooksFile(ctx) {
  const file = codexHooksPath();
  const where = tilde(file);
  const { text, data } = await readCodexHooksForWiring(file);
  const { data: wired, changes, notes } = wireCodexHooks(data, codexCommand());

  ctx.log("");
  for (const n of notes) ctx.log(`  ${n}`);
  if (JSON.stringify(wired) === JSON.stringify(data)) {
    await ctx.manifest?.observe(file);
    ctx.log(`  ${CODEX_ADAPTER} is already wired in ${where}.`);
    return;
  }
  if (ctx.dryRun) {
    ctx.log(`would wire ${CODEX_ADAPTER} into ${where} (backup first):`);
  } else {
    const bak = text === null ? null : await ctx.backup(file);
    await ctx.writeAtomic(file, serializeSettings(wired, text));
    ctx.log(`Wired ${CODEX_ADAPTER} into ${where}${bak ? ` (previous copy: ${path.basename(bak)})` : ""}:`);
  }
  for (const c of changes) ctx.log(`  ${c}`);
  if (!ctx.dryRun) ctx.log("  Codex skips a new or changed hook until it is trusted: run /hooks in Codex to trust it.");
}

/* --------------------------------------------------- opencode hook wiring */

const opencodeHooksDir = () => path.join(opencodeDir(), "canonkit");
const opencodePluginPath = () => path.join(opencodeDir(), OPENCODE_PLUGIN.to);
const opencodeConfigPath = () => path.join(opencodeDir(), "opencode.json");

// A plugin cannot ask, so the prompt before a commit or a push is config: V2
// `permissions`, an ordered list where the last matching rule wins (slice 9,
// opencode v2.1.4). V1 `permission` is never written: OpenCode puts its rules
// before every V2 one, so an ask there loses to a V2 `shell * allow`. A
// pattern ending in ` *` also matches the bare command.
const OPENCODE_ASKS = Object.freeze([
  Object.freeze({ action: "shell", resource: "git commit *", effect: "ask" }),
  Object.freeze({ action: "shell", resource: "git push *", effect: "ask" }),
]);
const sameRule = (e, r) => isObject(e) && e.action === r.action && e.resource === r.resource && e.effect === r.effect;
const ruleText = (r) => `${r.action} "${r.resource}" ${r.effect}`;
// A rule that can decide a shell call: action `shell`, `*`, or a glob matching
// shell. Its resource is not compared: telling whether `git *` or `npm *`
// overlaps `git commit *` is pattern against pattern.
const decidesShell = (e) =>
  isObject(e) && typeof e.action === "string" && new RegExp(`^${e.action.split("*").map(esc).join(".*")}$`).test("shell");
const isDeny = (e) => isObject(e) && e.effect === "deny";

/**
 * The asks a later allow or ask could override, or that are not there at all.
 * A later deny does not count: it is stricter than the ask, and moving the ask
 * past it would turn what it denies into a prompt.
 */
function asksNotInEffect(list) {
  const ours = (e) => OPENCODE_ASKS.some((r) => sameRule(e, r));
  return OPENCODE_ASKS.filter((ask) => {
    const last = list.findLastIndex((e) => sameRule(e, ask));
    return last === -1 || list.slice(last + 1).some((e) => decidesShell(e) && !isDeny(e) && !ours(e));
  });
}

// Whether the config denies any shell call, in V2 `permissions` or in V1
// `permission` (OpenCode puts V1 first, so a V1 deny sits before every V2 rule).
// An ask appended after a deny it overlaps would win over it, and without
// comparing resources there is no telling which do.
function deniesShell(data) {
  if ((Array.isArray(data.permissions) ? data.permissions : []).some((e) => decidesShell(e) && isDeny(e))) return true;
  const v1 = data.permission;
  const hasDeny = (v) => v === "deny" || (isObject(v) && Object.values(v).some(hasDeny));
  return v1 === "deny" || (isObject(v1) && ["bash", "shell", "*"].some((k) => hasDeny(v1[k])));
}

/**
 * opencode.json with both asks in effect, what changed, and the asks it left
 * to the user. An ask that is missing is appended; one a later allow overrides
 * moves to the end, its earlier copies removed. Only these two rules ever move:
 * the user's keep their order. Someone who passes --wire-hooks asked for the
 * prompt, so a later allow that silenced it does not win. Where the config
 * denies shell calls, nothing is written: appending could undo a deny.
 */
function wireOpencodePermissions(data) {
  const gaps = asksNotInEffect(Array.isArray(data.permissions) ? data.permissions : []);
  if (gaps.length && deniesShell(data)) return { data, changes: [], left: gaps };
  const out = structuredClone(data);
  const list = (out.permissions ??= []);
  const changes = [];
  for (const ask of gaps) {
    const had = list.some((e) => sameRule(e, ask));
    for (let i = list.length - 1; i >= 0; i--) if (sameRule(list[i], ask)) list.splice(i, 1);
    list.push({ ...ask });
    changes.push(`permissions: ${ruleText(ask)} ${had ? "moved to the end, after a rule that allowed shell calls first" : "added at the end"}`);
  }
  return { data: out, changes, left: [] };
}

// What to do by hand when a deny keeps --wire-hooks from writing the asks.
const asksByHand = (asks) =>
  `add ${asks.map((r) => JSON.stringify(r)).join(" and ")} to "permissions" yourself, after the rules that allow shell calls and before your deny rules`;

/**
 * opencode.json for --wire-hooks, or a refusal, the same rule as settings.json:
 * anything this would have to guess about stops the install before it writes.
 * An opencode.jsonc refuses too, even beside an opencode.json: its comments
 * would not survive a rewrite, and which file wins is OpenCode's business.
 */
async function readOpencodeConfigForWiring() {
  const file = opencodeConfigPath();
  const jsonc = path.join(opencodeDir(), "opencode.jsonc");
  const label = tilde(file);
  const refuse = (why, fix = "fix it, then re-run") => new Error(`Refusing --wire-hooks: ${why}. Nothing was written; ${fix}.`);
  if (existsSync(jsonc)) {
    throw refuse(`${tilde(jsonc)} exists, and its comments would not survive a rewrite`, `move its settings into ${label} and re-run, or add these at the end of its "permissions" yourself: ${OPENCODE_ASKS.map((r) => JSON.stringify(r)).join(", ")}`);
  }
  if (!existsSync(file)) return { text: null, data: {} };
  const text = await readFile(file, "utf8");
  let data;
  try { data = JSON.parse(text.replace(/^﻿/, "")); } catch { throw refuse(`${label} is not plain JSON (comments or a trailing comma?)`); }
  if (!isObject(data)) throw refuse(`${label} is not a JSON object`);
  if (data.permissions !== undefined) {
    if (!Array.isArray(data.permissions)) throw refuse(`${label} has a "permissions" that is not an array`);
    if (!data.permissions.every(isObject)) throw refuse(`${label} has a "permissions" entry that is not an object`);
  }
  return { text, data };
}

// The plugin is an OpenCode 2 plugin ({ id, setup }), which OpenCode 1 does not
// run: wiring it there would be a gate that looks installed and is off. A
// version that cannot be read refuses for the same reason.
function refuseOpencodeBelow2() {
  const refuse = (why, fix) => new Error(`Refusing --wire-hooks: ${why}, and the canonkit plugin runs only in OpenCode 2 or later. Nothing was written; ${fix}, then re-run.`);
  // PATH entries inside the folder install runs from are skipped (npx puts
  // <cwd>/node_modules/.bin first, where a planted binary would sit). Run from
  // home, that would skip %APPDATA%\npm and ~/.local/bin too, so there only
  // home's node_modules is skipped.
  const cwd = process.cwd();
  const toHome = path.relative(cwd, os.homedir());
  const root = toHome === "" || (!toHome.startsWith("..") && !path.isAbsolute(toHome)) ? path.join(cwd, "node_modules") : cwd;
  const abs = resolveBin("opencode", { cwd: root });
  if (!abs) throw refuse("opencode is not on PATH, so its version cannot be checked", "install OpenCode 2 or put it on PATH");
  const version = binVersion(abs, { project: root });
  if (!version) throw refuse(`${display(abs, ["--version"])} printed no version`, "check that OpenCode runs");
  if (Number(version.split(".")[0]) < 2) throw refuse(`OpenCode is ${version}`, "upgrade OpenCode");
}

/**
 * The OpenCode hook: HOOK_FILES.opencode into opencodeDir()/canonkit/, then the
 * plugin into plugins/ (its presence there is the wiring: OpenCode loads every
 * file in that folder), then with --wire-hooks the asks in opencode.json.
 * Without --wire-hooks the files are refreshed only where either already is.
 */
async function installOpencodeHooks(ctx, { wire = false } = {}) {
  const dest = opencodeHooksDir();
  if (!wire && !existsSync(dest) && !existsSync(opencodePluginPath())) return;
  await copyKeepingLocal(ctx, HOOKS_DIR, dest, HOOK_FILES.opencode);
  ctx.log(`Installed ${HOOK_FILES.opencode.length} OpenCode hook files -> ${dest}`);
  await copyKeepingLocal(ctx, HOOKS_DIR, opencodeDir(), [OPENCODE_PLUGIN]);
  ctx.log(`Installed the OpenCode plugin -> ${opencodePluginPath()} (loaded when OpenCode starts)`);
  if (wire) await wireOpencodeConfig(ctx);
}

// The same write as wireCodexHooksFile: backup only on a change, atomic, the
// file's own formatting kept.
async function wireOpencodeConfig(ctx) {
  const file = opencodeConfigPath();
  const where = tilde(file);
  const { text, data } = await readOpencodeConfigForWiring();
  const { data: wired, changes, left } = wireOpencodePermissions(data);

  ctx.log("");
  if (left.length) {
    ctx.log(`  ${where} denies shell calls, and an ask after a deny it overlaps wins over it: the git commit/push asks were not added.`);
    ctx.log(`  To have them, ${asksByHand(left)}.`);
    return;
  }
  if (!changes.length) {
    await ctx.manifest?.observe(file);
    ctx.log(`  The git commit/push asks are already in effect in ${where}.`);
    return;
  }
  if (ctx.dryRun) {
    ctx.log(`would add the git commit/push asks to ${where} (backup first):`);
  } else {
    const bak = text === null ? null : await ctx.backup(file);
    await ctx.writeAtomic(file, serializeSettings(wired, text));
    ctx.log(`Added the git commit/push asks to ${where}${bak ? ` (previous copy: ${path.basename(bak)})` : ""}:`);
  }
  for (const c of changes) ctx.log(`  ${c}`);
  ctx.log("  They match the command as typed (git -c x=y commit is not matched), and opencode run rejects an ask unless --auto.");
}

async function syncClaudeRouting(ctx, { existingOnly = false } = {}) {
  const existing = existingOnly ? await optionalBytes(path.join(claudeHome(), "CLAUDE.md")) : null;
  const existingBlock = existing === null ? null : removeManagedBlock(existing, ROUTING).block;
  if (existingOnly && !existingBlock) return;
  // Claude Code reads ~/.claude/CLAUDE.md. The routing block only points at
  // ~/AGENTS.md in plain text: projects live under a folder that contains it, so
  // Claude Code already loads it as an ancestor, and an `@` import would load it
  // a second time.
  const claudeMd = path.join(claudeHome(), "CLAUDE.md");

  // The Claude Code mechanics — hooks and their enforcement — mean nothing to
  // Codex, so they stay out of the runtime-neutral roster. A CLAUDE.md that does not exist yet is created by
  // this call with the routing block as its entire content.
  const source = path.join(REFERENCE_DIR, "routing-block.md");
  let registered = ctx.dryRun && ctx.hookWiringRequested === true;
  if (!registered) {
    try {
      const combined = {};
      let disabled = false;
      for (const file of [settingsPath(), path.join(claudeHome(), "settings.local.json")]) {
        const bytes = ctx.hookWiringRequested === false && file === settingsPath() && ctx.networkSecurityPlan ? serializeSecurity(ctx.networkSecurityPlan.data) : await optionalBytes(file);
        if (bytes === null) continue;
        const data = JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, ""));
        disabled ||= data.disableAllHooks === true;
        for (const [event, groups] of Object.entries(isObject(data.hooks) ? data.hooks : {})) if (Array.isArray(groups)) combined[event] = [...(combined[event] ?? []), ...groups];
      }
      const canonical = Object.fromEntries(Object.entries(combined).map(([event, groups]) => [event,
        groups.map((group) => ({ ...group, hooks: Array.isArray(group?.hooks) ? group.hooks.filter((hook) => isCanonicalClaudeHook(hook, claudeHome())) : [] }))]));
      registered = !disabled && wiringGaps(canonical, HOOK).length === 0 && (await optionalBytes(path.join(claudeHome(), "hooks", HOOK)))?.equals(await readFile(path.join(HOOKS_DIR, HOOK)));
    } catch { registered = false; }
  }
  const rendered = renderRoutingBlock(await readOwned(source), registered);
  if (existingOnly) {
    // Retiring stale claims is narrower than reference distribution: preserve
    // every byte outside the existing block, including BOM and mixed EOLs.
    const marked = applyBlock("", rendered, ROUTING).text;
    const block = removeManagedBlock(Buffer.from(toEol(marked, usesCrlf(existing.toString("utf8")))) , ROUTING).block;
    const start = existing.indexOf(Buffer.from(ROUTING[0]));
    const next = Buffer.concat([existing.subarray(0, start), block, existing.subarray(start + existingBlock.length)]);
    if (next.equals(existing)) await ctx.manifest?.observe(claudeMd);
    else { await ctx.write(claudeMd, next); ctx.log(`Refreshed existing Claude hook claims in ${claudeMd}`); }
    return;
  }
  await syncBlock(source, claudeMd, ROUTING, ctx, rendered);
}

async function syncReference(ctx, targets = DEFAULT_TARGETS) {
  // The roster says who exists and what each one owns, and is runtime-neutral.
  await syncBlock(path.join(REFERENCE_DIR, "agents-block.md"), path.join(os.homedir(), "AGENTS.md"), ROSTER, ctx);

  if (targets.includes("claude")) await syncClaudeRouting(ctx);

  if (targets.includes("codex")) {
    // Codex does not load ~/AGENTS.md from a repository below home, so its own
    // block (in $CODEX_HOME/AGENTS.md) points at it. Its [ENFORCED] lines name
    // the Codex hook, not the Claude one.
    await syncBlock(path.join(REFERENCE_DIR, "codex-block.md"), path.join(codexHome(), "AGENTS.md"), CODEX, ctx);
  }

  if (targets.includes("opencode")) {
    // OpenCode's own block, never the routing one: the routing block's [ENFORCED]
    // lines name the Claude hook, this one's only the plugin's two deny gates.
    // Creating this file is also what stops OpenCode falling back to
    // ~/.claude/CLAUDE.md, rules of your own included.
    const opencodeMd = path.join(opencodeDir(), "AGENTS.md");
    const fallback = !existsSync(opencodeMd) && existsSync(path.join(claudeHome(), "CLAUDE.md"));
    await syncBlock(path.join(REFERENCE_DIR, "opencode-block.md"), opencodeMd, OPENCODE, ctx);
    if (fallback) {
      ctx.log(`  OpenCode now reads ${opencodeMd} instead of ~/.claude/CLAUDE.md:`);
      ctx.log("  copy any rule of your own from there that OpenCode should keep, outside the markers.");
    }
  }

  await installSkills(ctx, targets);
}

function renderRoutingBlock(source, registered) {
  const optional = /<!-- canonkit:optional-hooks:start -->[\s\S]*?<!-- canonkit:optional-hooks:end -->/;
  return registered ? source.replace(/<!-- canonkit:optional-hooks:(?:start|end) -->\n?/g, "") : source.replace(optional, "").trimEnd() + "\n";
}

/**
 * Skills are the on-demand half of the reference: the roster keeps one
 * always-loaded line per rule and points at the skill for the rationale, so the
 * rule never disappears when the skill is not loaded. Claude Code discovers
 * them under ~/.claude/skills; Codex and OpenCode under $HOME/.agents/skills (checked
 * against OpenAI's skills documentation, "Build skills", user scope). Every file
 * in a skill's directory goes, not only SKILL.md: Codex reads its invocation
 * policy from agents/openai.yaml beside it.
 */
// Relative paths of every file below dir, sorted.
async function filesUnder(dir, prefix = "") {
  const out = [];
  for (const e of await readdir(path.join(dir, prefix), { withFileTypes: true })) {
    const rel = path.join(prefix, e.name);
    if (e.isDirectory()) out.push(...(await filesUnder(dir, rel)));
    else if (e.isFile()) out.push(rel);
  }
  return out.sort();
}

async function installSkills(ctx, targets = DEFAULT_TARGETS) {
  if (!existsSync(SKILLS_DIR)) return;
  const names = (await readdir(SKILLS_DIR, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && existsSync(path.join(SKILLS_DIR, e.name, "SKILL.md")))
    .map((e) => e.name)
    .sort();
  if (!names.length) return;

  const roots = [
    targets.includes("claude") && path.join(claudeHome(), "skills"),
    // OpenCode reads both of these natively; this one is the runtime-neutral
    // path, so an OpenCode-only install writes nothing under ~/.claude.
    (targets.includes("codex") || targets.includes("opencode")) && path.join(os.homedir(), ".agents", "skills"),
    targets.includes("copilot") && path.join(copilotHome(), "skills"),
  ].filter(Boolean);
  for (const root of roots) {
    for (const name of names) {
      await copyKeepingLocal(ctx, path.join(SKILLS_DIR, name), path.join(root, name), await filesUnder(path.join(SKILLS_DIR, name)));
    }
    ctx.log(`Installed ${names.length} skill${names.length === 1 ? "" : "s"} (${names.join(", ")}) -> ${root}`);
  }
}

/**
 * Install or remove domain specialists in the CURRENT project. Choosing which
 * ones a project gets stays a deliberate decision; only the bookkeeping that is
 * easy to forget — registering the agent in the project's AGENTS.md so Codex
 * sees it too — is automated.
 */
async function addSpecialists(ctx, names, options = {}) {
  if (!options.remove) warnIgnoredCodexModel(ctx);
  const remove = options.remove === true;
  const agents = await readAgents();
  const project = process.cwd();

  if (path.resolve(project) === PACKAGE_ROOT) {
    throw new Error(
      "Refusing: this is canonkit itself, the source of truth.\n" +
        "Run this from the project that should receive the specialists.",
    );
  }

  const known = new Map(specialists(agents).map((a) => [a.name, a]));
  for (const name of names) {
    if (!known.has(name)) {
      const isCore = core(agents).some((a) => a.name === name);
      throw new Error(
        isCore
          ? `${name} is a core agent — install it with 'npx canonkit install'.`
          : `Not a domain specialist: ${name}\nSpecialists: ${[...known.keys()].join(" ")}`,
      );
    }
  }

  // Every runtime reads its own folder: Claude Code .claude/agents/<name>.md,
  // Codex .codex/agents/<name>.toml, OpenCode .opencode/agents/<name>.md,
  // Copilot .github/agents/<name>.agent.md, and the AGENTS.md block below
  // tells the main agent when to reach for a project specialist.
  // Project specialists live in the project, so the project's choices apply
  // on top of the user's. "The project" for choices is the repository root,
  // the same one `models show` and the orchestrate skill read.
  const choicesRoot = remove ? null : await projectRoot(project);
  const layers = remove ? null : { user: await readChoices(userConfigPath()), project: choicesRoot ? await readChoices(projectConfigPath(choicesRoot), { project: true }) : null };
  const codexRecord = remove ? null : (await readCatalog(catalogPath()).catch(() => null))?.harnesses?.codex;
  const agentsDir = path.join(project, ".claude", "agents");
  const codexDir = path.join(project, ".codex", "agents");
  await safePath(codexDir);
  for (const name of names) await safePath(path.join(codexDir, `${name}.toml`));
  const opencodeProjectDir = path.join(project, ".opencode", "agents");
  const copilotProjectDir = path.join(project, ".github", "agents");
  await ctx.mkdir(agentsDir);
  await ctx.mkdir(codexDir);
  await ctx.mkdir(opencodeProjectDir);
  await ctx.mkdir(copilotProjectDir);

  for (const name of names) {
    const target = path.join(agentsDir, `${name}.md`);
    const codexTarget = path.join(codexDir, `${name}.toml`);
    const opencodeTarget = path.join(opencodeProjectDir, `${name}.md`);
    const copilotTarget = path.join(copilotProjectDir, `${name}.agent.md`);
    if (remove) {
      if ([target, codexTarget, opencodeTarget, copilotTarget].some((p) => existsSync(p))) {
        await ctx.remove(target);
        await ctx.remove(codexTarget);
        await ctx.remove(opencodeTarget);
        await ctx.remove(copilotTarget);
        ctx.log(`Removed ${name} from .claude/agents/, .codex/agents/, .opencode/agents/ and .github/agents/`);
      } else {
        ctx.log(`Not installed: ${name}`);
      }
    } else {
      await ctx.write(target, claudeAgent(known.get(name), choiceFor(known.get(name), "claude", layers)));
      await ctx.write(codexTarget, codexAgent(known.get(name), codexChoiceFor(known.get(name), layers, codexRecord, ctx)));
      await ctx.write(opencodeTarget, opencodeAgent(known.get(name)));
      await ctx.write(copilotTarget, copilotAgent(known.get(name)));
      ctx.log(`Installed ${name} -> .claude/agents/${name}.md, .codex/agents/${name}.toml, .opencode/agents/${name}.md and .github/agents/${name}.agent.md`);
    }
  }

  // A dry run copies nothing, so reading the disk back would report the state
  // before the command rather than the one it describes. Project what the disk
  // would hold instead — a dry run that misreports is worse than none.
  const onDisk = (n) => existsSync(path.join(agentsDir, `${n}.md`));
  const projected = ctx.dryRun
    ? new Set(
        specialists(agents)
          .map((a) => a.name)
          .filter((n) => (remove ? onDisk(n) && !names.includes(n) : onDisk(n) || names.includes(n))),
      )
    : null;

  await rebuildProjectBlock(ctx, project, agents, agentsDir, projected);
}

// Packs contribute instructions to the existing team, not new specialist agents.
// Validate the whole request before either writer runs; pack preflight also
// precedes the legacy specialist writer in a mixed request.
async function changeProject(ctx, names, options) {
  const agents = await readAgents();
  const known = new Set(specialists(agents).map((agent) => agent.name));
  for (const name of names) {
    if (known.has(name) || STACK_PACK_IDS.includes(name)) continue;
    if (core(agents).some((agent) => agent.name === name)) throw new Error(`${name} is a core agent — install it with 'npx canonkit install'.`);
    throw new Error(`Not a domain specialist or stack pack: ${name}\nSpecialists: ${[...known].join(" ")}\nStack packs: ${STACK_PACK_IDS.join(" ")}`);
  }
  const packs = names.filter((name) => STACK_PACK_IDS.includes(name));
  const selected = names.filter((name) => known.has(name));
  if (!packs.length) { await addSpecialists(ctx, selected, options); return 0; }
  return new StackPackStore({ dryRun: ctx.dryRun, log: ctx.log }).change(packs, {
    remove: options.remove,
    before: async () => { if (selected.length) await addSpecialists(ctx, selected, options); },
  });
}

/**
 * Rebuild the managed block in the project's AGENTS.md from what is actually on
 * disk, so the file reflects reality rather than the history of commands.
 */
async function rebuildProjectBlock(ctx, project, agents, agentsDir, projected = null) {
  const summary = await summaries();
  const installed = specialists(agents).filter((a) =>
    projected ? projected.has(a.name) : existsSync(path.join(agentsDir, `${a.name}.md`)),
  );
  const target = path.join(project, "AGENTS.md");
  const raw = existsSync(target) ? await readFile(target, "utf8") : "";

  if (!installed.length) {
    // No specialists left: drop the block entirely rather than leave an empty one.
    const { text, had } = replaceProjectBlock(raw, PROJECT_SPECIALISTS, null);
    if (!had) return ctx.log("No specialist block in AGENTS.md");
    await ctx.writeAtomic(target, text);
    return ctx.log("Removed specialist block from AGENTS.md");
  }

  const label = { veto: "veto", blocks: "blocks", none: "no veto" };
  const entries = installed
    .map((a) => `- **${a.name}** (${label[a.authority]}) — ${summary.get(a.name) ?? "specialist."}`)
    .join("\n");
  const body = `# Project subagents

Besides the core team (see ~/AGENTS.md), this project installs the specialists below.
Use the Agent tool to delegate to them when the request clearly fits their role.

${entries}

A specialist is in play when its domain is, not for completeness.
Installed by canonkit: \`npx canonkit add|remove <name>\` changes this list, and
the runtime-specific files in .claude/agents/, .codex/agents/, .opencode/agents/
and .github/agents/ are copies the next add overwrites.`;

  const { text, had } = replaceProjectBlock(raw, PROJECT_SPECIALISTS, body);
  if (text === raw) return ctx.log("already current: AGENTS.md");
  await ctx.writeAtomic(target, text);
  ctx.log(`${had ? "Updated" : "Added"} specialist block in AGENTS.md`);
}

/**
 * Rewrite, add or drop one managed block in a project file the user owns, and
 * nothing else. Two blocks share a project's AGENTS.md (specialists, tools), so
 * the rules live here once: the block is rewritten where it stands, a new one is
 * appended after a blank line, a null body removes it with the blank lines
 * around it, and the file keeps its own line ending (see usesCrlf). Re-running
 * with the same body must leave the file byte-identical.
 */
function replaceProjectBlock(raw, markers, body) {
  const [start, end] = markers;
  const crlf = usesCrlf(raw);
  const original = toLf(raw);
  const inPlace = new RegExp(`${esc(start)}[\\s\\S]*?${esc(end)}`);
  const had = inPlace.test(original);

  if (body === null) {
    if (!had) return { text: raw, had };
    // What was on each side stays a separate paragraph: the blank line that
    // appending put before the block is the one that goes, not the user's.
    const m = inPlace.exec(original);
    const before = original.slice(0, m.index).replace(/\n+$/, "");
    const after = original.slice(m.index + m[0].length).replace(/^\n+/, "");
    const stripped = (before && after ? `${before}\n\n${after}` : before || after).trim();
    return { text: toEol(stripped ? `${stripped}\n` : "", crlf), had };
  }

  const managed = `${start}\n${body.trim()}\n${end}`;
  const lf = had
    ? original.replace(inPlace, () => managed)
    : (original.trim() ? `${original.replace(/\s+$/, "")}\n\n` : "") + managed + "\n";
  return { text: toEol(lf, crlf), had };
}

/** The text between a block's markers, or null when the file has no such block. */
function readProjectBlock(raw, markers) {
  const [start, end] = markers;
  const m = new RegExp(`${esc(start)}([\\s\\S]*?)${esc(end)}`).exec(toLf(raw));
  return m ? m[1] : null;
}

async function list(ctx) {
  const agents = await readAgents();
  const userDest = path.join(claudeHome(), "agents");
  const copilotDest = copilotAgentsDir();
  const projectDest = path.join(process.cwd(), ".claude", "agents");
  const mark = (dir, name) => (existsSync(path.join(dir, `${name}.md`)) ? "installed" : "-");

  ctx.log(`Core team (user level: ${userDest})`);
  for (const a of core(agents)) {
    ctx.log(`  ${a.name.padEnd(10)} ${String(a.need).padEnd(8)} ${mark(userDest, a.name)}`);
  }

  ctx.log("");
  ctx.log(`Copilot profiles (user level: ${copilotDest})`);
  for (const a of core(agents)) {
    ctx.log(`  ${a.name.padEnd(10)} ${existsSync(path.join(copilotDest, `${a.name}.agent.md`)) ? "installed" : "-"}`);
  }

  ctx.log("");
  ctx.log(`Domain specialists (this project: ${projectDest})`);
  for (const a of specialists(agents)) {
    ctx.log(`  ${a.name.padEnd(10)} ${String(a.need).padEnd(8)} ${mark(projectDest, a.name)}`);
  }

  ctx.log("");
  ctx.log("Optional tools (graphify, openspec): canonkit tool list");
  ctx.log("");
  ctx.log("Stack packs (this project; skills, installed explicitly with canonkit add <stack>)");
  for (const { pack, state } of await new StackPackStore().list()) ctx.log(`  ${pack.padEnd(12)} ${state}`);
}

/* ------------------------------------------------------------------ doctor */

/**
 * Is the install doing what the routing block says it does? Every gate fails
 * open by design, so a broken install looks exactly like a quiet one; this is
 * where it shows. One line per check, `OK|WARN|FAIL <check>: <detail>`, for a
 * person to read — the exit code (1 on any FAIL) is the contract.
 *
 * Read-only: it writes nothing, not even a probe file for the log check, and it
 * runs no code from ~/.claude — the config is resolved with this package's own
 * hook module, and the installed hook is only syntax-checked.
 */
async function securityDiagnosis() {
  const rows = [], add = (status, check, detail) => rows.push({ status, check, detail, more: [] });
  let root = null;
  try { root = await repositoryRoot(); }
  catch { add("FAIL", "security repository", "unknown: unsafe or invalid current repository boundary"); }
  const evidence = await collectEnvironment({ cwd: root ?? process.cwd() });
  add("OK", "security environment", `detected ${evidence.platform}, WSL ${evidence.wsl}, container ${evidence.container}; sandbox capability ${evidence.sandboxCapability}; runtime unknown`);
  const sources = [];
  for (const [label, file] of [
    ["user", settingsPath()], ["user-local", path.join(claudeHome(), "settings.local.json")],
    ...(root ? [["repository", path.join(root, ".claude", "settings.json")], ["repository-local", path.join(root, ".claude", "settings.local.json")]] : []),
  ]) {
    try { await safePath(file); const bytes = await optionalBytes(file); sources.push({ label, data: bytes === null ? null : parseSecuritySettings(bytes, label) }); }
    catch { sources.push({ label, error: true }); }
  }
  add("WARN", "security claude version", `${evidence.claudeVersion ?? "unknown"}; ${evidence.versionEvidence}; no authenticated session or boundary test was started`);
  for (const detail of assessClaude(sources, evidence)) add(detail.status, `security claude ${detail.control}`, `${detail.coverage}: ${detail.detail}`);
  const profile = evidence.platform === "win32" ? "native-windows-partial" : evidence.sandboxCapability === "available-unverified" ? "sandbox-configured-runtime-unverified" : "available-file-controls-partial";
  add("WARN", "security claude desired-profile", `partial: ${profile}; configured keys do not establish effective session containment`);
  const user = sources.find((source) => source.label === "user");
  const repository = sources.find((source) => source.label === "repository");
  if (root && !repository?.error && !user?.error) {
    const desired = compileSecurity(repository?.data ?? {}, evidence, { userSettings: user?.data ?? {} });
    if (desired.changes.length) add("WARN", "security claude desired-controls", `partial: supported repository controls pending: ${desired.changes.join(", ")}; run canonkit install --claude from this repository`);
  }
  if (evidence.container === "indicated") add("WARN", "security container", "unknown: exposed mounts, privilege, host sockets and egress have not been verified; a container marker is not containment evidence");
  add("WARN", "security remediation", "partial: reapply supported native controls with canonkit install --claude from the repository; update Claude for newer controls. Optional WSL2 or a validated container can provide a stronger shell boundary after separate preparation and verification; no provisioning or direct-launch interception is performed");
  const checkTracked = async (receipt, id, label) => {
    try {
      if (!await receipt.load()) return;
      const entry = receipt.data.entries[id];
      if (!entry?.afterSnapshot || !entry.securityChanges) return;
      receipt.target(entry);
      const bytes = await readSecurityBytes(path.join(receipt.dir, "backups", entry.afterSnapshot));
      if (!bytes || securityDigest(bytes) !== entry.hash) throw new Error("Private snapshot evidence does not match");
      const installed = parseSecuritySettings(bytes);
      const source = sources.find((item) => item.label === label);
      if (source?.error) return; // The malformed/inaccessible source already fails assessment.
      const get = (data, keys) => keys.reduce((value, key) => value?.[key], data);
      for (const [key, record] of Object.entries(entry.securityChanges)) {
        const keys = key.split(".");
        if (get(installed, keys) !== record.afterValue) throw new Error("Ownership evidence does not match");
        if (get(source?.data, keys) !== record.afterValue) add("FAIL", "security claude tracked-policy", `partial: tracked ${label} ${key} is missing or changed; re-run canonkit install in this repository`);
      }
    } catch { add("FAIL", "security receipt", `unknown: ${label} receipt or private evidence cannot be validated; no repair performed`); }
  };
  const globalCatalog = await installCatalog(await readAgents());
  await checkTracked(new InstallManifest({ home: os.homedir(), ...globalCatalog, targets: ["claude"], dryRun: true }), "claude:json:settings.json", "user");
  if (!root) add("WARN", "security repository", "unavailable: no validated repository target; run install from the intended repository");
  else {
    // Read provenance without starting/recovering a store or creating locks.
    const receipt = scopedSecurityManifest({ dryRun: true, log: () => {} }, root);
    await checkTracked(receipt, "project:json:.claude/settings.json", "repository");
  }
  const readConfig = async (file) => { try { await safePath(file); const bytes = await optionalBytes(file); return bytes?.toString("utf8") ?? null; } catch { return undefined; } };
  const codex = await readConfig(path.join(codexHome(), "config.toml"));
  const codexSummary = codex === undefined ? { coverage: "unknown", detail: "configuration inaccessible; no enforcement changed" } : inspectCodex(codex);
  add("WARN", "security codex", `${codexSummary.coverage}: ${codexSummary.detail}`);
  const ocJsonc = path.join(opencodeDir(), "opencode.jsonc");
  const isJsonc = existsSync(ocJsonc), opencode = await readConfig(isJsonc ? ocJsonc : opencodeConfigPath());
  const ocSummary = opencode === undefined ? { coverage: "unknown", detail: "configuration inaccessible; no enforcement changed" } : inspectOpencode(opencode, isJsonc);
  add("WARN", "security opencode", `${ocSummary.coverage}: ${ocSummary.detail}`);
  return rows;
}

async function doctor({ verbose = false } = {}) {
  const home = os.homedir();
  const claudeDir = claudeHome();
  const results = [];
  const add = (status, check, detail, more = []) => results.push({ status, check, detail, more });
  const text = (p) => { try { return toLf(readFileSync(p, "utf8")); } catch { return null; } };

  // agents: every core agent in ~/.claude/agents, matching what install would
  // write now (this package's agent plus the user's model choices). A choices
  // file doctor cannot read is reported by the models check below.
  const agents = core(await readAgents());
  let userChoices;
  try { userChoices = await readChoices(userConfigPath(home)); } catch { userChoices = undefined; }
  const missing = [], stale = [];
  for (const a of agents) {
    const x = text(path.join(claudeDir, "agents", `${a.name}.md`));
    if (x === null) missing.push(a.name);
    else if (x !== claudeAgent(a, choiceFor(a, "claude", { user: userChoices }))) stale.push(a.name);
  }
  if (missing.length) {
    add("FAIL", "agents", `missing from ~/.claude/agents: ${missing.join(", ")} — run npx canonkit install`);
  } else if (stale.length) {
    add("WARN", "agents", `differ from this package's: ${stale.join(", ")} — run npx canonkit install`);
  } else {
    add("OK", "agents", `${agents.length} core agents in ~/.claude/agents`);
  }

  // Leftovers from installs before 2.1: ~/.agents/<core>.md is read by no harness.
  // Install removes the byte-identical ones; doctor reports what is left.
  const leftovers = agents.filter((a) => text(path.join(home, ".agents", `${a.name}.md`)) !== null).map((a) => a.name);
  if (leftovers.length) {
    add("WARN", "agents leftovers", `~/.agents has core-named copies: ${leftovers.join(", ")} — not read by any harness; npx canonkit install removes the byte-identical ones`);
  }

  // opencode agents: checked only where OpenCode was installed for, which is
  // opt-in — any core agent in its folder says it was. Compared with what
  // install would generate now, since these are not copies of the source.
  const ocDir = opencodeAgentsDir();
  const ocText = agents.map((a) => [a, text(path.join(ocDir, `${a.name}.md`))]);
  if (ocText.some(([, t]) => t !== null)) {
    const ocMissing = ocText.filter(([, t]) => t === null).map(([a]) => a.name);
    const ocStale = ocText.filter(([a, t]) => t !== null && t !== opencodeAgent(a)).map(([a]) => a.name);
    const where = tilde(ocDir);
    if (ocMissing.length) add("FAIL", "opencode agents", `missing from ${where}: ${ocMissing.join(", ")} — run npx canonkit install --opencode`);
    else if (ocStale.length) add("WARN", "opencode agents", `differ from this package's: ${ocStale.join(", ")} — run npx canonkit install --opencode`);
    else add("OK", "opencode agents", `${agents.length} core agents in ${where}, current`);
  }

  const copilotDir = copilotAgentsDir();
  const copilotText = agents.map((a) => [a, text(path.join(copilotDir, `${a.name}.agent.md`))]);
  if (copilotText.some(([, t]) => t !== null)) {
    const copilotMissing = copilotText.filter(([, t]) => t === null).map(([a]) => a.name);
    const copilotStale = copilotText.filter(([a, t]) => t !== null && t !== copilotAgent(a)).map(([a]) => a.name);
    const where = tilde(copilotDir);
    if (copilotMissing.length) add("FAIL", "copilot agents", `missing from ${where}: ${copilotMissing.join(", ")} — run npx canonkit install --copilot`);
    else if (copilotStale.length) add("WARN", "copilot agents", `differ from this package's: ${copilotStale.join(", ")} — run npx canonkit install --copilot`);
    else add("OK", "copilot agents", `${agents.length} core agents in ${where}, current`);
  }

  // reference: the managed blocks the team's rules live in.
  const blocks = [[path.join(home, "AGENTS.md"), ROSTER], [path.join(claudeDir, "CLAUDE.md"), ROUTING]];
  const noBlock = blocks.filter(([f, [start, end]]) => !(text(f)?.includes(start) && text(f)?.includes(end))).map(([f]) => tilde(f));
  if (noBlock.length) add("FAIL", "reference", `no managed block in ${noBlock.join(", ")} — run npx canonkit reference`);
  else add("OK", "reference", "managed blocks in ~/AGENTS.md and ~/.claude/CLAUDE.md");

  // hook file and syntax: on disk, this package's, and parseable — a hook that
  // does not parse fails open, which turns every gate off with no sign.
  const hookFile = path.join(claudeDir, "hooks", HOOK);
  const hookText = text(hookFile);
  if (hookText === null) {
    add("FAIL", "hook file", `${tilde(hookFile)} is not on disk — run npx canonkit install`);
    add("FAIL", "hook syntax", "nothing to check: the hook is not on disk");
  } else {
    if (hookText !== (await readOwned(path.join(HOOKS_DIR, HOOK)))) {
      add("WARN", "hook file", `${tilde(hookFile)} differs from this package's — run npx canonkit install (a local edit is kept as .local.bak)`);
    } else {
      add("OK", "hook file", `${tilde(hookFile)}, same as this package's`);
    }
    const check = spawnSync(process.execPath, ["--check", hookFile], { encoding: "utf8" });
    if (check.status === 0) add("OK", "hook syntax", "node --check passes");
    else add("FAIL", "hook syntax", `node --check fails: ${(/^\w*Error\b.*$/m.exec(check.stderr ?? "") ?? [String(check.stderr ?? check.error).trim().split("\n")[0]])[0]}`);
  }

  // hook wiring: registered per event with its matcher. settings.local.json is
  // read as well: the runtime merges it, so a hook wired there runs.
  const hooks = {};
  const bad = [];
  let anySettings = false;
  for (const f of ["settings.json", "settings.local.json"]) {
    const raw = text(path.join(claudeDir, f));
    if (raw === null) continue;
    anySettings = true;
    let parsed;
    try { parsed = JSON.parse(raw.replace(/^﻿/, "")); } catch { bad.push(f); continue; }
    for (const [event, entries] of Object.entries(isObject(parsed?.hooks) ? parsed.hooks : {})) {
      if (Array.isArray(entries)) hooks[event] = [...(hooks[event] ?? []), ...entries];
    }
  }
  const gaps = wiringGaps(hooks, HOOK);
  const claudeHooksActive = Object.values(hooks).flat().some((group) => Array.isArray(group?.hooks) && group.hooks.some(mentionsHook));
  if (bad.length) {
    add("FAIL", "hook wiring", `${bad.map((f) => `~/.claude/${f}`).join(", ")} is not valid JSON: the runtime cannot read its hooks`);
  } else if (!claudeHooksActive) {
    add("OK", "hook wiring", "optional canonkit hooks inactive; native approval modes remain authoritative");
  } else if (gaps.length) {
    add("FAIL", "hook wiring", `not registered with the required matcher under: ${gaps.map(([e]) => e).join(", ")} — run npx canonkit install --wire-hooks`);
  } else {
    add("OK", "hook wiring", `registered with its matcher under ${Object.keys(HOOK_EVENTS[HOOK]).join(", ")}`);
  }

  // codex hook: checked where it was installed, which only --wire-hooks starts.
  // Required, not a nicety: a Codex hook that cannot load lets every call through
  // and Codex shows nothing (slice 7), so this is the one place it is seen. Bytes,
  // not text: the files are copies, and any difference is not this package's code.
  const codexDir = codexHooksDir();
  if (existsSync(codexDir)) {
    const bytes = (p) => { try { return readFileSync(p); } catch { return null; } };
    const cxMissing = [], cxStale = [];
    for (const f of HOOK_FILES.codex) {
      const b = bytes(path.join(codexDir, f));
      if (b === null) cxMissing.push(f);
      else if (!b.equals(readFileSync(path.join(HOOKS_DIR, f)))) cxStale.push(f);
    }
    const where = tilde(codexDir);
    if (cxMissing.length) add("FAIL", "codex hook files", `missing from ${where}: ${cxMissing.join(", ")} — Codex lets every call through; run npx canonkit install --codex`);
    else if (cxStale.length) add("FAIL", "codex hook files", `differ from this package's in ${where}: ${cxStale.join(", ")} — run npx canonkit install --codex (a local edit is kept as .local.bak)`);
    else add("OK", "codex hook files", `${HOOK_FILES.codex.length} files in ${where}, same as this package's`);

    const hooksFile = codexHooksPath();
    const fix = "run npx canonkit install --codex --wire-hooks";
    const raw = text(hooksFile);
    let parsed;
    try { parsed = raw === null ? null : JSON.parse(raw.replace(/^﻿/, "")); } catch { parsed = undefined; }
    // Found by the exact command install writes: one naming another copy runs
    // files these rows did not check.
    const own = (Array.isArray(parsed?.hooks?.PreToolUse) ? parsed.hooks.PreToolUse : [])
      .filter((g) => isObject(g) && Array.isArray(g.hooks) && g.hooks.some((h) => isObject(h) && h.type === "command" && h.command === codexCommand()));
    if (raw === null) add("FAIL", "codex hook wiring", `${tilde(hooksFile)} does not exist: Codex never runs the hook — ${fix}`);
    else if (parsed === undefined) add("FAIL", "codex hook wiring", `${tilde(hooksFile)} is not valid JSON: Codex cannot read its hooks`);
    else if (!own.length) add("FAIL", "codex hook wiring", `no PreToolUse group in ${tilde(hooksFile)} runs ${codexCommand()} — ${fix}`);
    else if (!own.some((g) => g.matcher === CODEX_MATCHER)) add("FAIL", "codex hook wiring", `its PreToolUse matcher is ${JSON.stringify(own[0].matcher ?? null)}, not ${CODEX_MATCHER} — ${fix}`);
    else add("OK", "codex hook wiring", `registered under PreToolUse with matcher ${CODEX_MATCHER} (whether it is trusted is Codex's: /hooks)`);
  }

  // opencode hook: checked where either half was installed. As with Codex, a
  // plugin that cannot load lets every call through, and its one warning shows
  // only under --print-logs (slice 9), so this is where a broken install is seen.
  const ocHooks = opencodeHooksDir();
  const ocPlugin = opencodePluginPath();
  if (existsSync(ocHooks) || existsSync(ocPlugin)) {
    const bytes = (p) => { try { return readFileSync(p); } catch { return null; } };
    const files = [
      ...HOOK_FILES.opencode.map((f) => [`canonkit/${f}`, path.join(ocHooks, f), path.join(HOOKS_DIR, f)]),
      [OPENCODE_PLUGIN.to, ocPlugin, path.join(HOOKS_DIR, OPENCODE_PLUGIN.from)],
    ];
    const ocMissing = [], ocStale = [];
    for (const [name, at, ours] of files) {
      const b = bytes(at);
      if (b === null) ocMissing.push(name);
      else if (!b.equals(readFileSync(ours))) ocStale.push(name);
    }
    const where = tilde(opencodeDir());
    if (ocMissing.length) add("FAIL", "opencode hook files", `missing from ${where}: ${ocMissing.join(", ")} — OpenCode lets every call through; run npx canonkit install --opencode`);
    else if (ocStale.length) add("FAIL", "opencode hook files", `differ from this package's in ${where}: ${ocStale.join(", ")} — run npx canonkit install --opencode (a local edit is kept as .local.bak)`);
    else add("OK", "opencode hook files", `${files.length} files in ${where}, same as this package's (OpenCode 2 only)`);

    // The asks are config, not a gate, so a gap is a WARN.
    const cfg = opencodeConfigPath();
    const jsonc = path.join(opencodeDir(), "opencode.jsonc");
    const fix = "run npx canonkit install --opencode --wire-hooks";
    const raw = text(cfg);
    let parsed;
    try { parsed = raw === null ? null : JSON.parse(raw.replace(/^﻿/, "")); } catch { parsed = undefined; }
    const list = isObject(parsed) ? parsed.permissions ?? [] : null;
    if (existsSync(jsonc)) add("WARN", "opencode permissions", `${tilde(jsonc)} exists and doctor does not read it: check that its "permissions" end with ${OPENCODE_ASKS.map(ruleText).join(" and ")}`);
    else if (raw === null) add("WARN", "opencode permissions", `${tilde(cfg)} does not exist: OpenCode does not ask before git commit/git push — ${fix}`);
    else if (!Array.isArray(list)) add("WARN", "opencode permissions", `${tilde(cfg)} is not a JSON object with a "permissions" list: cannot check the git commit/push asks`);
    else {
      const gaps = asksNotInEffect(list);
      if (gaps.length && deniesShell(parsed)) add("WARN", "opencode permissions", `${gaps.map(ruleText).join(" and ")} missing from ${tilde(cfg)} or followed by a rule that allows shell calls, and it denies shell calls, so --wire-hooks leaves them to you: ${asksByHand(gaps)}`);
      else if (gaps.length) add("WARN", "opencode permissions", `${gaps.map(ruleText).join(" and ")} missing from ${tilde(cfg)} or followed by a rule that allows shell calls (the last match wins) — ${fix}`);
      else add("OK", "opencode permissions", `git commit/git push ask, in effect in ${tilde(cfg)} (as typed: pattern-limited)`);
    }
  }

  // codex reference: Codex does not read ~/AGENTS.md from a repo below home, so
  // its team rules live in its own block. Checked only where Codex was
  // installed for — any core agent in its agents folder says it was.
  if (agents.some((a) => existsSync(path.join(codexHome(), "agents", `${a.name}.toml`)))) {
    const codexMd = path.join(codexHome(), "AGENTS.md");
    const [cStart, cEnd] = CODEX;
    if (text(codexMd)?.includes(cStart) && text(codexMd)?.includes(cEnd)) add("OK", "codex reference", `managed block in ${tilde(codexMd)}`);
    else add("WARN", "codex reference", `no managed block in ${tilde(codexMd)}: Codex does not read ~/AGENTS.md from a repo below home, so it does not see the team's rules — run npx canonkit reference --codex`);
  }

  // opencode reference: the block says which of OpenCode's rules its plugin
  // enforces. Checked only where OpenCode was installed for, as above.
  if (agents.some((a) => existsSync(path.join(opencodeAgentsDir(), `${a.name}.md`)))) {
    const ocMd = path.join(opencodeDir(), "AGENTS.md");
    const [oStart, oEnd] = OPENCODE;
    if (text(ocMd)?.includes(oStart) && text(ocMd)?.includes(oEnd)) add("OK", "opencode reference", `managed block in ${tilde(ocMd)}`);
    else add("WARN", "opencode reference", `no managed block in ${tilde(ocMd)}: OpenCode does not see which of its rules a plugin enforces — run npx canonkit reference --opencode`);
  }

  // codex AGENTS.override.md: Codex reads it in place of AGENTS.md in the same
  // folder, so the synced codex block is never loaded while it exists.
  const override = path.join(codexHome(), "AGENTS.override.md");
  if (existsSync(override)) {
    add("WARN", "codex AGENTS.override.md", `${tilde(override)} exists: Codex reads it instead of ${tilde(path.join(codexHome(), "AGENTS.md"))}, so the codex block is not loaded — move its rules into the override or remove the override`);
  }

  // log: where every gate and dispatch is recorded; the Stop gate reads it. Checked
  // without writing: the folder, or the nearest existing parent the hook creates it in.
  const logDir = path.join(claudeDir, "canonkit-activity");
  let probe = logDir;
  while (!existsSync(probe) && path.dirname(probe) !== probe) probe = path.dirname(probe);
  try {
    if (!statSync(probe).isDirectory()) throw new Error("not a folder");
    accessSync(probe, fsc.W_OK);
    add("OK", "log", probe === logDir ? `${tilde(logDir)} is writable` : `${tilde(logDir)} will be created on the first event`);
  } catch (err) {
    add("FAIL", "log", `cannot write ${tilde(probe)} (${err.code ?? err.message}): no gate is recorded, so the Stop gate never fires`);
  }

  // forwarder: the pre-rename file, and any settings in sight still running it.
  const forwarder = path.join(claudeDir, "hooks", LEGACY.hook);
  const { running, unreadable } = legacyRunners(claudeDir);
  const runBy = running.map(slash).join(", ");
  const unread = unreadable.length ? `; could not read ${unreadable.map(slash).join(", ")}` : "";
  if (existsSync(forwarder)) {
    add("WARN", "forwarder", `${tilde(forwarder)} is still on disk${runBy ? `, run by ${runBy}` : ""}${unread}. npx canonkit install --wire-hooks rewires ~/.claude/settings.json; check other projects, then remove the forwarder manually`);
  } else if (running.length) {
    add("FAIL", "forwarder", `${runBy} still run ${LEGACY.hook}, which is not on disk: every gate there is off. Point it at ${HOOK}${unread}`);
  } else if (unreadable.length) {
    add("WARN", "forwarder", `no ${LEGACY.hook} left${unread}`);
  } else {
    add("OK", "forwarder", `no ${LEGACY.hook} left, and no settings in sight run it`);
  }

  // config: what the gates resolve to from here, by this package's hook module.
  const { projectConfig } = createRequire(import.meta.url)(path.join(HOOKS_DIR, HOOK));
  const cfg = projectConfig(process.cwd());
  const found = cfg.file && existsSync(cfg.file);
  const parts = [`file ${found ? slash(cfg.file) : "none (defaults)"}`, `root ${slash(cfg.root)}`];
  if (found) parts.push(`${cfg.include.length} include, ${cfg.exclude.length} exclude, ${cfg.perf.length} perfBudgets`);
  if (cfg.project) {
    parts.push(`project ${slash(cfg.project.file)} also applies ${cfg.project.include.length} include, ${cfg.project.perf.length} perfBudgets`);
  }
  const ignored = [
    ...cfg.ignored.map((i) => `ignored ${i.where}: ${i.why}`),
    ...(cfg.project?.ignored ?? []).map((i) => `ignored in the project file ${i.where}: ${i.why}`),
  ];
  add(ignored.length ? "WARN" : "OK", "config", parts.join(", "), ignored);

  // models: stored choices against the stored discovery; never starts a harness.
  for (const row of await modelDiagnosis(await readAgents(), { home, cwd: process.cwd() })) add(row.status, row.check, row.detail);

  const claudeInstalled = agents.some((agent) => existsSync(path.join(claudeDir, "agents", `${agent.name}.md`)));
  const otherInstalled = agents.some((agent) => existsSync(path.join(codexHome(), "agents", `${agent.name}.toml`)) || existsSync(path.join(opencodeAgentsDir(), `${agent.name}.md`)));
  const claudeChecks = new Set(["agents", "reference", "hook file", "hook syntax", "hook wiring", "log", "forwarder", "config"]);
  const optionalChecks = new Set(["hook file", "hook syntax", "log"]);
  const report = results.filter((row) => (claudeInstalled || !otherInstalled || !claudeChecks.has(row.check)) && (claudeHooksActive || !optionalChecks.has(row.check)));
  report.push(...await securityDiagnosis());
  if (!verbose) {
    const { lines, failed: bad } = renderDoctorReport(report);
    console.log(lines.join("\n"));
    return bad ? 1 : 0;
  }
  for (const r of report) {
    console.log(`${r.status.padEnd(4)} ${r.check}: ${r.detail}`);
    for (const m of r.more) console.log(`       ${m}`);
  }
  const failed = report.filter((r) => r.status === "FAIL").length;
  console.log("");
  console.log(failed ? `${failed} check${failed === 1 ? "" : "s"} failed.` : "No check failed.");
  return failed ? 1 : 0;
}

/* ------------------------------------------------------------------- tools */

/**
 * Optional third-party tools a project can turn on: `canonkit tool add <name>`.
 * canonkit only integrates them — it never installs one. A missing binary gets
 * the pinned install command printed and nothing else; a present one gets its
 * own setup run (after the person confirms) and an entry in the project's tools
 * block, so agents learn the tool's rules from the same AGENTS.md as the team.
 *
 * The registry is tools/<name>.md, frontmatter plus the block's rule lines, the
 * same shape as agents/. The pin lives only in the frontmatter.
 */
const PROJECT_TOOLS = [
  "<!-- agent-team-config:complements:start -->",
  "<!-- agent-team-config:complements:end -->",
];

const PIN = /^\d+\.\d+\.\d+$/;
// A setup step may never write a CLAUDE.md (Claude Code would stop reading the
// project's AGENTS.md) or call a model. Those are graphify's `<platform> install`
// and `extract`; `hook install` is the one install subcommand allowed.
const forbiddenStep = (args) => args.includes("extract") || (args.includes("install") && args.join(" ") !== "hook install");

async function readTools() {
  if (!existsSync(TOOLS_DIR)) return new Map();
  const files = (await readdir(TOOLS_DIR)).filter((f) => f.endsWith(".md")).sort();
  const tools = new Map();
  for (const file of files) {
    const tool = parseTool(file, await readOwned(path.join(TOOLS_DIR, file)));
    tools.set(tool.name, tool);
  }
  return tools;
}

/**
 * Parse one registry file (newline-normalized). Lists are `key:` followed by
 * `  - item` lines; setup items are argument lists split on whitespace, every
 * argument a literal (exec.js SAFE_ARG) — nothing in them comes from a project.
 */
function parseTool(file, text) {
  const where = `tools/${file}`;
  const name = path.basename(file, ".md");
  const end = text.indexOf("\n---", 4);
  if (!text.startsWith("---\n") || end === -1) throw new Error(`${where}: no frontmatter`);

  const front = {};
  let list = null;
  for (const line of text.slice(4, end).split("\n")) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && list) {
      list.push(item[1].trim());
      continue;
    }
    const m = /^([a-z]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    if (m[2].trim() === "") front[m[1]] = list = [];
    else {
      front[m[1]] = m[2].trim();
      list = null;
    }
  }

  const lists = ["install", "setup", "touches", "notes", "undo", "env", "gitignore"];
  for (const key of lists) {
    if (front[key] !== undefined && !Array.isArray(front[key])) throw new Error(`${where}: ${key} must be a list`);
  }
  if (front.name !== name) throw new Error(`${where}: frontmatter name is '${front.name}' — must match the filename`);
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(front.bin ?? "")) throw new Error(`${where}: bin must be a bare command name`);
  // An exact version, not a range: the printed install command is what a person
  // copies, and a range there installs whatever was published this morning.
  if (!PIN.test(front.pin ?? "")) throw new Error(`${where}: pin '${front.pin ?? "missing"}' — must be an exact x.y.z`);
  if (!front.install?.length || !front.install.some((l) => l.includes("{pin}"))) {
    throw new Error(`${where}: install must print the pinned command ({pin})`);
  }
  if (!front.setup?.length) throw new Error(`${where}: setup is empty`);

  const setup = front.setup.map((step) => step.split(/\s+/));
  for (const args of setup) {
    for (const a of args) {
      if (!SAFE_ARG.test(a)) throw new Error(`${where}: setup argument ${JSON.stringify(a)} is not a plain literal`);
    }
    if (forbiddenStep(args)) throw new Error(`${where}: setup step '${args.join(" ")}' is not allowed`);
  }

  const rules = text
    .slice(end + 4)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  // Fixed environment for every run of the tool, literal like its arguments:
  // the way to switch off a behaviour that reaches outside the project.
  for (const kv of front.env ?? []) {
    if (!/^[A-Z_][A-Z0-9_]*=[A-Za-z0-9_.,:-]*$/.test(kv)) throw new Error(`${where}: env entry ${JSON.stringify(kv)} is not KEY=literal`);
    // Variables that decide which program or module is loaded would undo what
    // exec.js does about PATH (PYTHONPATH=. loads the project's code).
    if (/^(PATH|PATHEXT|COMSPEC|PYTHON\w*|NODE_\w*|NPM_CONFIG_\w*|LD_\w*|DYLD_\w*)=/i.test(kv)) {
      throw new Error(`${where}: env entry ${kv.split("=")[0]} changes what gets loaded — not allowed`);
    }
  }
  // Plain relative patterns under one top-level directory each: they are
  // written verbatim into the project's .gitignore and passed to git ls-files.
  for (const p of front.gitignore ?? []) {
    if (!/^!?[A-Za-z0-9_.-]+(\/[A-Za-z0-9_.*-]+)*\/?$/.test(p) || p.split("/").some((s) => s === "..")) {
      throw new Error(`${where}: gitignore pattern ${JSON.stringify(p)} is not a plain relative path`);
    }
  }
  if (!rules.length || rules.length > 3) throw new Error(`${where}: the block takes 1 to 3 rule lines, found ${rules.length}`);
  if (rules.some((l) => l.includes(front.pin))) throw new Error(`${where}: the pin lives only in the frontmatter`);

  return {
    name,
    bin: front.bin,
    pin: front.pin,
    requires: front.requires ?? "",
    install: front.install.map((l) => l.replaceAll("{pin}", front.pin)),
    preflight: front.preflight ?? null,
    setup,
    touches: front.touches ?? [],
    notes: front.notes ?? [],
    undo: front.undo ?? [],
    env: Object.fromEntries((front.env ?? []).map((kv) => kv.split(/=(.*)/s).slice(0, 2))),
    gitignore: front.gitignore ?? [],
    rules,
  };
}

/**
 * The project the command acts on: the real path of cwd, which every spawned
 * setup step runs in. Refused in this repo, like `add` — the tools block would
 * land in the source of truth's own AGENTS.md.
 */
function toolProject() {
  const project = realpathSync.native(process.cwd());
  const same = process.platform === "win32" ? (a, b) => a.toLowerCase() === b.toLowerCase() : (a, b) => a === b;
  if (same(project, realpathSync.native(PACKAGE_ROOT))) {
    throw new Error(
      "Refusing: this is canonkit itself, the source of truth.\n" +
        "Run this from the project that should use the tool.",
    );
  }
  return project;
}

async function getTool(name) {
  const tools = await readTools();
  if (!tools.has(name)) throw new Error(`Not a canonkit tool: ${name}\nTools: ${[...tools.keys()].join(" ")}`);
  return { tools, tool: tools.get(name) };
}

/** Tools active in a project: the entries of its own block, not what is on disk. */
function activeTools(raw, tools) {
  const inner = readProjectBlock(raw, PROJECT_TOOLS);
  if (inner === null) return new Set();
  const names = [...inner.matchAll(/^- \*\*([a-z0-9_-]+)\*\*/gm)].map((m) => m[1]);
  return new Set(names.filter((n) => tools.has(n)));
}

function toolsBlockBody(tools, active) {
  const entries = [...tools.values()]
    .filter((t) => active.has(t.name))
    .map((t) => [`- **${t.name}** — ${t.rules[0]}`, ...t.rules.slice(1).map((r) => `  ${r}`)].join("\n"))
    .join("\n");
  return `# Project tools

This project uses the optional tools below. Each is a third-party program the
project installed; canonkit wrote only this block.

${entries}

Managed by canonkit: \`npx canonkit tool add|remove <name>\` changes this list.`;
}

async function writeToolsBlock(ctx, project, tools, active) {
  const target = path.join(project, "AGENTS.md");
  const raw = existsSync(target) ? await readFile(target, "utf8") : "";
  const { text, had } = replaceProjectBlock(raw, PROJECT_TOOLS, active.size ? toolsBlockBody(tools, active) : null);
  if (text === raw) return ctx.log(active.size || !had ? "already current: AGENTS.md" : "No tools block in AGENTS.md");
  await ctx.writeAtomic(target, text);
  ctx.log(!active.size ? "Removed tools block from AGENTS.md" : `${had ? "Updated" : "Added"} tools block in AGENTS.md`);
}

/**
 * A tool's `gitignore:` patterns, as a managed block in the project's
 * .gitignore: what the tool rebuilds stays out of git, what the registry
 * re-includes with `!` is versioned. Rules the project already has for those
 * directories, outside the block, are its decision and win: patterns are
 * last-match-wins, so a block appended after them would quietly overrule them.
 */
const gitignoreMarkers = (name) => [`# agent-team-config:gitignore:${name}:start`, `# agent-team-config:gitignore:${name}:end`];
const gitignoreRoot = (p) => p.replace(/^!?\/?/, "").split("/")[0];

function gitignorePlan(project, tool) {
  if (!tool.gitignore.length) return null;
  const target = path.join(project, ".gitignore");
  const raw = existsSync(target) ? readFileSync(target, "utf8") : "";
  const markers = gitignoreMarkers(tool.name);
  const roots = [...new Set(tool.gitignore.map(gitignoreRoot))];
  const outside = toLf(raw).replace(new RegExp(`${esc(markers[0])}[\\s\\S]*?${esc(markers[1])}`), "");
  const own = outside
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && roots.includes(gitignoreRoot(l)));
  if (own.length) return { target, roots, own };
  const body = [`# ${tool.name}: rebuilt locally; only the ! lines are versioned. Managed by canonkit tool add ${tool.name}.`, ...tool.gitignore].join("\n");
  const { text, had } = replaceProjectBlock(raw, markers, body);
  return { target, roots, raw, text, had };
}

async function writeGitignore(ctx, project, tool) {
  const plan = gitignorePlan(project, tool);
  if (!plan) return;
  if (plan.own) {
    ctx.log(`.gitignore already has its own rules for ${plan.roots.join(", ")} (${plan.own.join(", ")}); left as is.`);
    return;
  }
  if (plan.text === plan.raw) ctx.log("already current: .gitignore");
  else {
    await ctx.writeAtomic(plan.target, plan.text);
    ctx.log(`${plan.had ? "Updated" : "Added"} ${tool.name} block in .gitignore`);
  }
  // Ignoring does not untrack: files committed before stay versioned. Printed,
  // never run — git rm touches the index the person is about to commit from.
  const git = resolveBin("git", { cwd: project });
  if (!git) return;
  const r = runBin(git, ["ls-files", "-c", "-i", "--exclude-standard", "--", ...plan.roots], { cwd: project, capture: true, timeout: 30 * 1000 });
  const tracked = r.status === 0 ? r.stdout.split("\n").map((l) => l.trim()).filter(Boolean) : [];
  if (!tracked.length) return;
  const shown = tracked.slice(0, 5).join(", ") + (tracked.length > 5 ? `, … (${tracked.length} in all)` : "");
  ctx.log(`  note:    already committed, so still tracked despite .gitignore: ${shown}`);
  ctx.log(`           to stop tracking them (files stay on disk): git rm -r --cached -q -- ${plan.roots.join(" ")} && git add -- ${plan.roots.join(" ")}`);
}

const CLAUDE_MD = ["CLAUDE.md", path.join(".claude", "CLAUDE.md")];

/**
 * Both modes check the repository and detect existing automation. With opt-in,
 * graphify's hooks go into the repository's hooks directory. A hook already
 * there is the project's, and a core.hooksPath (husky, a shared global path) is a
 * directory canonkit does not get to write into; either way it stops and says
 * how to chain graphify by hand. A hook that already carries graphify's marker
 * block was chained already, and `graphify hook install` only rewrites its block.
 */
const GRAPHIFY_HOOKS = { "post-commit": "# graphify-hook-start", "post-checkout": "# graphify-checkout-hook-start" };

function gitHooksPreflight(project, { withGitHooks = false } = {}) {
  const fail = (lines) => ({ ok: false, message: lines.join("\n") });
  const git = resolveBin("git", { cwd: project });
  if (!git) return fail(["graphify needs git, and git is not on PATH."]);
  const out = (args) => runBin(git, args, { cwd: project, capture: true, timeout: 30 * 1000 });

  const top = out(["rev-parse", "--show-toplevel"]);
  if (top.status !== 0) return fail([`Not a git repository: ${project}`, "Run git init first."]);
  const same = process.platform === "win32" ? (a, b) => a.toLowerCase() === b.toLowerCase() : (a, b) => a === b;
  const root = realpathSync.native(path.resolve(top.stdout.trim()));
  if (!same(root, project)) return fail([`Run this from the repository root: ${root}`]);

  // graphify's hooks and merge driver start Python with `-c` / `-m graphify`
  // from the worktree root, which Python searches first: a graphify package
  // committed to the repo would run on every commit, checkout and merge — a
  // branch from anyone, before review. The hooks also run the interpreter named
  // in graphify-out/.graphify_python, so that file must not come from the repo.
  const shadow = ["graphify", "graphify.py"].filter((f) => existsSync(path.join(project, f)));
  if (shadow.length) {
    return fail([
      `${shadow.join(" and ")} at the repository root would be imported by graphify's hooks instead of the installed graphify.`,
      "canonkit does not install them here.",
    ]);
  }
  const tracked = out(["ls-files", "--", "graphify-out/.graphify_python"]);
  if (tracked.status !== 0) return fail([`git ls-files failed: ${tracked.stderr.trim() || tracked.error}`]);
  if (tracked.stdout.trim()) {
    return fail(["graphify-out/.graphify_python is committed, and graphify's hooks run the interpreter it names. Remove it from git first."]);
  }

  const chain = [
    "To chain graphify yourself: read the existing hook, then run `graphify hook install`",
    "(it appends a marked block to an existing hook file) or call graphify from your hook",
    "manager only if you trust every branch, then re-run `npx canonkit tool add graphify --with-git-hooks`.",
  ];
  const hooksPath = out(["config", "core.hooksPath"]);
  if (withGitHooks && hooksPath.status === 0 && hooksPath.stdout.trim()) {
    return fail([`core.hooksPath is set (${hooksPath.stdout.trim()}): git hooks are managed elsewhere, so canonkit installs none.`, ...chain]);
  }
  if (hooksPath.status !== 1 && hooksPath.status !== 0) return fail([`git config core.hooksPath failed: ${hooksPath.stderr.trim() || hooksPath.error}`]);

  const dir = out(["rev-parse", "--git-path", "hooks"]);
  if (dir.status !== 0) return fail([`git rev-parse --git-path hooks failed: ${dir.stderr.trim() || dir.error}`]);
  const hooksDir = path.resolve(project, dir.stdout.trim());
  const before = hookSnapshot(hooksDir);
  const merge = out(["config", "--get", "merge.graphify.driver"]);
  if (merge.status !== 0 && merge.status !== 1) return fail([`git config merge.graphify failed: ${merge.stderr.trim() || merge.error}`]);
  const automatic = [...before].filter(([, text]) => /# graphify-(?:checkout-)?hook/.test(text)).map(([name]) => name);
  // Husky 9 stores wrapper scripts in .husky/_, and user hook bodies in .husky/.
  if (hooksPath.stdout.trim() && path.basename(hooksDir) === "_") {
    for (const [name, text] of hookSnapshot(path.dirname(hooksDir))) {
      if (/# graphify-(?:checkout-)?hook/.test(text)) automatic.push(`../${name}`);
    }
  }
  if (merge.stdout.trim()) automatic.push("merge.graphify driver");

  for (const [hook, marker] of withGitHooks ? Object.entries(GRAPHIFY_HOOKS) : []) {
    const file = path.join(hooksDir, hook);
    if (existsSync(file) && !readFileSync(file, "utf8").includes(marker)) {
      return fail([`${path.relative(project, file)} already exists and is not graphify's; canonkit never overwrites a git hook.`, ...chain]);
    }
  }
  return { ok: true, hooksDir, before, automatic };
}

/** A hook's text without graphify's marked block, whitespace folded. */
function outsideBlock(text, marker) {
  const block = new RegExp(`${esc(marker)}[\\s\\S]*?${esc(marker.replace(/-start$/, "-end"))}`);
  return toLf(text).replace(block, "").replace(/\s+/g, " ").trim();
}

/** Every hook file (samples aside) with its contents, to compare after setup. */
function hookSnapshot(dir) {
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => !f.endsWith(".sample")).sort() : [];
  return new Map(files.filter((f) => statSync(path.join(dir, f)).isFile()).map((f) => [f, readFileSync(path.join(dir, f), "utf8")]));
}

/**
 * After setup: every hook that appeared is one graphify owns, carrying its
 * marker, and no other hook that was already there changed.
 */
function graphifyHooksProblems(check) {
  const problems = [];
  for (const [f, text] of hookSnapshot(check.hooksDir)) {
    if (!check.before.has(f) && !GRAPHIFY_HOOKS[f]) problems.push(`unexpected new git hook: ${f}`);
    if (check.before.has(f) && !GRAPHIFY_HOOKS[f] && check.before.get(f) !== text) problems.push(`git hook changed: ${f}`);
    // A hook chained by hand before: graphify may rewrite its own block, and
    // nothing else in the file.
    if (check.before.has(f) && GRAPHIFY_HOOKS[f] && outsideBlock(check.before.get(f), GRAPHIFY_HOOKS[f]) !== outsideBlock(text, GRAPHIFY_HOOKS[f])) {
      problems.push(`git hook changed outside graphify's block: ${f}`);
    }
  }
  for (const [hook, marker] of Object.entries(GRAPHIFY_HOOKS)) {
    const file = path.join(check.hooksDir, hook);
    if (!existsSync(file) || !readFileSync(file, "utf8").includes(marker)) problems.push(`${hook} does not carry graphify's hook block`);
  }
  return problems;
}

// The registry's fixed variables over the caller's environment, for every run
// of the tool, --version included: graphify rewrites the user-level skills it
// once installed on any command, and GRAPHIFY_NO_AUTO_REFRESH is its off switch.
const toolEnv = (tool) => ({ ...process.env, ...tool.env });

function loud(lines) {
  const bar = "!".repeat(72);
  console.error(["", bar, ...lines.map((l) => `!! ${l}`), bar, ""].join("\n"));
}

function warnNewClaudeMd(project, existedBefore) {
  const appeared = CLAUDE_MD.filter((f, i) => !existedBefore[i] && existsSync(path.join(project, f)));
  if (!appeared.length) return;
  loud([
    `${appeared.join(" and ")} appeared during setup. canonkit never creates one.`,
    "With a CLAUDE.md in the project, Claude Code stops reading AGENTS.md — the team's",
    "and this tool's rules included. Move what it holds into AGENTS.md and delete it.",
  ]);
}

async function confirm(yes) {
  if (yes) return true;
  if (!process.stdin.isTTY) {
    console.error("Not running: there is no terminal to confirm on. Read the above, then re-run with --yes.");
    return false;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => rl.question("Proceed? [y/N] ", resolve));
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

// On WSL a Windows program on PATH would run through interop, as Windows code
// with the project open: tool commands resolve from the Linux side only. One
// value per command, spread into every resolve and run so they cannot disagree.
const toolExec = () => ({ windowsRoots: readWindowsRoots() });

// A PATH entry is attacker-influenced text going to a terminal.
const plain = (p) => p.replace(/[\x00-\x1f\x7f-\x9f]/g, "?");

function printMissing(tool, project, exec) {
  const inside = projectOnlyHit(tool.bin, { cwd: project });
  const windows = windowsOnlyHits(tool.bin, { cwd: project, ...exec });
  const dangling = danglingHits(tool.bin, { cwd: project, ...exec });
  console.error(
    [
      ...(inside ? [`${tool.bin} was found only inside the project (${plain(inside)}); canonkit runs binaries from outside it only.`] : []),
      ...(windows.length ? [`${tool.bin} was found only on the Windows side (${plain(windows[0])}); canonkit does not run Windows binaries through WSL interop.`] : []),
      ...(inside || windows.length ? [] : [`${tool.bin} is not on PATH.`]),
      // Fixed wording, no snippet and no folder derived from the target: which folder to allow is the person's call.
      ...dangling.slice(0, 1).map(({ link, target }) => `${tool.bin} is at ${plain(link)} but its target is not readable (${plain(target)}): the link is broken, or the folder is hidden from this process. Under the Claude Code sandbox, allow that folder in sandbox.filesystem.allowRead of your user settings (~/.claude/settings.json); see docs/tools.md (Claude Code sandbox).`),
      // Not on native Windows: ~/.nvm, ~/.local and the bubblewrap/Seatbelt sandbox do not apply there.
      ...(inside || windows.length || dangling.length || process.platform === "win32" ? [] : ["If it is installed under ~/.nvm or ~/.local and this runs inside the Claude Code sandbox, that folder may be hidden: see docs/tools.md (Claude Code sandbox)."]),
      "canonkit only integrates tools you installed; it installs nothing.",
      `Install the pinned version (${tool.requires}):`,
      ...tool.install.map((l) => `  ${l}`),
      `then re-run: npx canonkit tool add ${tool.name}`,
    ].join("\n"),
  );
}

/**
 * One function, in this order, because each step is a reason not to take the
 * next: preflight (binary, version, the tool's own checks) → confirmation →
 * the tool's setup → canonkit's block. The block goes last because a setup step
 * may rewrite AGENTS.md (openspec init can), and it is not written at all when
 * setup fails — an entry for a tool whose setup did not finish teaches agents a
 * workflow the project does not have.
 */
async function toolAdd(ctx, name, { yes = false, withGitHooks = false } = {}) {
  const { tools, tool } = await getTool(name);
  const project = toolProject();
  const setup = withGitHooks ? [["hook", "install"], ...tool.setup] : tool.setup;

  const exec = toolExec();
  const abs = resolveBin(tool.bin, { cwd: project, ...exec });
  if (!abs) {
    printMissing(tool, project, exec);
    return 1;
  }

  let version = null;
  let hooks = null;
  if (!ctx.dryRun) {
    version = binVersion(abs, { project, env: toolEnv(tool), ...exec });
    if (tool.preflight === "git-hooks") {
      hooks = gitHooksPreflight(project, { withGitHooks });
      if (!hooks.ok) {
        console.error(hooks.message);
        return 1;
      }
    }
  }

  ctx.log(`${tool.name}: setup in ${plain(project)}`);
  ctx.log(`  binary:  ${plain(abs)}`);
  const shadows = windowsOnlyHits(tool.bin, { cwd: project, before: abs, ...exec });
  if (shadows.length) {
    ctx.log(`  note:    a Windows copy comes first in PATH (${plain(shadows[0])}); ignored here, but agents and shells running bare \`${tool.bin}\` get that one.`);
    ctx.log("           To stop that, set appendWindowsPath=false under [interop] in /etc/wsl.conf (canonkit does not edit it).");
  }
  if (ctx.dryRun) ctx.log("  version: not checked (a dry run executes nothing, --version included)");
  else if (!version) ctx.log(`  version: unknown (--version failed); canonkit pins ${tool.pin}`);
  else if (version !== tool.pin) {
    ctx.log(`  version: ${version} — canonkit pins ${tool.pin}. Nothing is updated; to match:`);
    for (const l of tool.install) ctx.log(`             ${l}`);
  } else ctx.log(`  version: ${version} (the pinned one)`);
  if (tool.preflight === "git-hooks") {
    if (ctx.dryRun) ctx.log("  checks:  repository and Git automation (not run in a dry run)");
    if (withGitHooks) {
      ctx.log("  WARNING: --with-git-hooks enables hooks and a merge driver that can execute repository code");
      ctx.log("           on commit, checkout and merge before review. Trust every branch you check out.");
      ctx.log("  touches: .git/hooks/post-commit, .git/hooks/post-checkout, .git/config and .gitattributes");
    } else {
      ctx.log("  Git automation: no hooks or merge driver installed or removed (--yes does not enable them).");
      if (hooks?.automatic.length) {
        loud([
          `Existing graphify Git automation remains enabled: ${hooks.automatic.join(", ")}.`,
          "It can execute repository code on commit, checkout and merge before review. Trust every branch.",
          "No migration performed. To disable it, review and run `graphify hook uninstall`, then inspect git config and .gitattributes.",
        ]);
      }
    }
  }
  setup.forEach((args, i) => ctx.log(`  ${i ? "        " : "runs:   "} ${display(abs, args)}`));
  tool.touches.forEach((t, i) => ctx.log(`  ${i ? "        " : "touches:"} ${t}`));
  if (tool.gitignore.length) ctx.log(`  then:    .gitignore — canonkit's ${tool.name} block (${tool.gitignore.join(" ")}), unless it already has rules for them`);
  ctx.log("  then:    AGENTS.md — canonkit's tools block, written last and only if setup succeeds");
  for (const [k, v] of Object.entries(tool.env)) ctx.log(`  env:     ${k}=${v}`);
  for (const n of tool.notes) ctx.log(`  note:    ${n}`);

  if (ctx.dryRun) {
    const raw = existsSync(path.join(project, "AGENTS.md")) ? await readFile(path.join(project, "AGENTS.md"), "utf8") : "";
    const active = activeTools(raw, tools);
    const ignore = gitignorePlan(project, tool);
    if (ignore?.own) ctx.log(".gitignore already has its own rules for them; would leave it as is");
    else if (ignore) ctx.log(ignore.text === ignore.raw ? ".gitignore block already current" : `would ${ignore.had ? "update" : "add"} the ${tool.name} block in .gitignore`);
    ctx.log(active.has(name) ? "tools block in AGENTS.md already lists it" : "would add it to the tools block in AGENTS.md");
    return 0;
  }

  if (!(await confirm(yes))) return 1;

  const claudeBefore = CLAUDE_MD.map((f) => existsSync(path.join(project, f)));
  for (const [i, args] of setup.entries()) {
    ctx.log(`> ${display(abs, args)}`);
    const r = runBin(abs, args, { cwd: project, env: toolEnv(tool), ...exec });
    if (r.error || r.status !== 0) {
      console.error(`${tool.name} ${args.join(" ")} failed (${r.error ?? `exit ${r.status}`}). Stopped; canonkit did not change AGENTS.md.`);
      if (i > 0) {
        console.error(`Already done: ${setup.slice(0, i).map((a) => `${tool.bin} ${a.join(" ")}`).join(", ")}.`);
        if (tool.undo.length) console.error(`To undo it: ${tool.undo.join("; ")}`);
      }
      warnNewClaudeMd(project, claudeBefore);
      return 1;
    }
  }

  if (hooks && withGitHooks) {
    const problems = graphifyHooksProblems(hooks);
    if (problems.length) loud(["graphify's hooks are not what canonkit expected — check before committing:", ...problems]);
  }
  warnNewClaudeMd(project, claudeBefore);
  await writeGitignore(ctx, project, tool);

  // Read again: the setup above may have rewritten AGENTS.md.
  const target = path.join(project, "AGENTS.md");
  const raw = existsSync(target) ? await readFile(target, "utf8") : "";
  const active = activeTools(raw, tools);
  active.add(name);
  await writeToolsBlock(ctx, project, tools, active);
  return 0;
}

/**
 * Take the tool out of the block (the last one takes the block with it). Undoing
 * the setup is printed, never run, and nothing the tool wrote is touched:
 * openspec/ holds the project's specs and graphify-out/ may be versioned.
 */
async function toolRemove(ctx, name) {
  const { tools, tool } = await getTool(name);
  const project = toolProject();
  const target = path.join(project, "AGENTS.md");
  const raw = existsSync(target) ? await readFile(target, "utf8") : "";
  const active = activeTools(raw, tools);

  if (!active.has(name)) {
    ctx.log(`Not active in this project: ${name}`);
    return 0;
  }
  active.delete(name);
  await writeToolsBlock(ctx, project, tools, active);

  ctx.log(`Files ${tool.name} wrote are left as they are:`);
  for (const t of tool.touches) ctx.log(`  ${t}`);
  // The block stays: graphify-out/ is still on disk, and dropping the rules
  // would turn it into a pile of untracked files.
  if (tool.gitignore.length) ctx.log(`  .gitignore (canonkit's ${tool.name} block — delete it by hand to version that output)`);
  if (tool.undo.length) {
    ctx.log("To undo its setup, yourself:");
    for (const u of tool.undo) ctx.log(`  ${u}`);
  }
  return 0;
}

async function toolList(ctx) {
  const tools = await readTools();
  const project = realpathSync.native(process.cwd());
  const target = path.join(project, "AGENTS.md");
  const active = activeTools(existsSync(target) ? await readFile(target, "utf8") : "", tools);

  ctx.log(`Optional tools (this project: ${project})`);
  const exec = toolExec();
  const ignored = [];
  const unreadable = [];
  for (const t of tools.values()) {
    const abs = resolveBin(t.bin, { cwd: project, ...exec });
    if (!abs) {
      ignored.push(...windowsOnlyHits(t.bin, { cwd: project, ...exec }));
      unreadable.push(...danglingHits(t.bin, { cwd: project, ...exec }));
    }
    const installed = !abs ? "not on PATH" : ctx.dryRun ? "not checked" : `installed ${binVersion(abs, { project, env: toolEnv(t), ...exec }) ?? "?"}`;
    ctx.log(`  ${t.name.padEnd(10)} pin ${t.pin.padEnd(9)} ${installed.padEnd(18)} ${active.has(t.name) ? "active" : "-"}`);
  }
  if (ignored.length) ctx.log(`  (ignored Windows copies, not run through WSL interop: ${ignored.map(plain).join(", ")})`);
  for (const { link, target } of unreadable) ctx.log(`  (unreadable: ${plain(link)} -> ${plain(target)})`);
  ctx.log("");
  ctx.log("canonkit installs none of these: `tool add` prints the pinned install command when one is missing.");
}

async function toolCommand(ctx, [sub, ...names], flags) {
  if (sub === "list" && !names.length) {
    await toolList(ctx);
    return 0;
  }
  if ((sub === "add" || sub === "remove") && names.length === 1) {
    return sub === "add" ? toolAdd(ctx, names[0], { yes: flags.includes("--yes"), withGitHooks: flags.includes("--with-git-hooks") }) : toolRemove(ctx, names[0]);
  }
  console.error("Usage: canonkit tool add|remove <name> | canonkit tool list\n");
  console.error(usage());
  return 1;
}

/* -------------------------------------------------------------------- main */

// Only this catalog authorizes global destinations. A path found in a manifest
// is checked against it, never used as authority to read, write or delete.
// Before retiring a distributed artifact, retain its descriptor here (including
// owners/markers/undo). Old receipts must remain readable; never learn a path
// from the manifest to compensate for a removed package file.
const RETIRED_GLOBAL_ARTIFACTS = [
  // Pre-build dashboard versions installed dashboard/index.html. Keep its
  // descriptor so existing manifests remain valid; the running server now
  // serves the compiled dist/index.html, and this legacy copy is left intact.
  { id: "claude:file:canonkit-dashboard/index.html", root: "claude", relative: "canonkit-dashboard/index.html", kind: "file", owners: ["claude"], public: true },
];
async function installCatalog(agents) {
  const roots = { home: path.resolve(os.homedir()), claude: claudeHome(),
    codex: codexHome(), opencode: path.resolve(opencodeDir()), copilot: copilotHome(),
    skills: path.join(os.homedir(), ".agents", "skills") };
  const catalog = [];
  const add = (root, relative, kind, owners, extra = {}) => {
    relative = relative.split(path.sep).join("/");
    catalog.push({ id: `${root}:${kind}:${relative}`, root, relative, kind, owners, public: kind === "file", ...extra });
  };
  for (const harness of TARGETS) {
    const suffix = { claude: "md", codex: "toml", opencode: "md", copilot: "agent.md" }[harness];
    for (const agent of core(agents)) add(harness, `agents/${agent.name}.${suffix}`, "file", [harness]);
    for (const file of HOOK_FILES[harness] ?? []) add(harness, `${harness === "claude" ? "hooks" : "canonkit"}/${file}`, "file", [harness]);
  }
  add("opencode", OPENCODE_PLUGIN.to, "file", ["opencode"], { plugin: true });
  add("claude", "hooks/meu-time-hook.js", "file", ["claude"]);
  for (const file of await dashboardDistributionFiles()) add("claude", `canonkit-dashboard/${file}`, "file", ["claude"]);
  for (const name of (await readdir(SKILLS_DIR, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name)) {
    if (!existsSync(path.join(SKILLS_DIR, name, "SKILL.md"))) continue;
    for (const file of await filesUnder(path.join(SKILLS_DIR, name))) {
      add("claude", `skills/${name}/${file}`, "file", ["claude"]);
      add("skills", `${name}/${file}`, "file", ["codex", "opencode"]);
      add("copilot", `skills/${name}/${file}`, "file", ["copilot"]);
    }
  }
  add("home", "AGENTS.md", "block", TARGETS, { markers: ROSTER });
  for (const [harness, file, markers] of [["claude", "CLAUDE.md", ROUTING], ["codex", "AGENTS.md", CODEX], ["opencode", "AGENTS.md", OPENCODE]]) {
    add(harness, file, "block", [harness], { markers });
  }
  add("claude", "settings.json", "json", ["claude"], { securityOwnership: networkSecurityOwnership, undo: (before, after, current, entry) => undoNetworkSecurity(before, after, unwireTrackedHooks(before, after, current, "claude"), entry) });
  add("codex", "hooks.json", "json", ["codex"], { undo: (before, after, current) => unwireTrackedHooks(before, after, current, "codex") });
  add("opencode", "opencode.json", "json", ["opencode"], { undo: unwireTrackedPermissions });
  for (const entry of RETIRED_GLOBAL_ARTIFACTS) {
    if (!catalog.some((current) => current.id === entry.id)) catalog.push(entry);
  }
  return { roots, catalog };
}

const equalJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function configuration(bytes) {
  if (bytes === null) return {};
  let value;
  try { value = JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, "")); } catch { throw new Error("Configuration is not valid JSON; runtime retained"); }
  if (!isObject(value)) throw new Error("Configuration is not a JSON object; runtime retained");
  return value;
}

function unwireTrackedHooks(beforeBytes, afterBytes, currentBytes, harness) {
  const before = configuration(beforeBytes), after = configuration(afterBytes), current = configuration(currentBytes);
  const ours = harness === "claude" ? isOurHook : isOurCodexHook;
  const handlers = (data) => {
    if (data.hooks !== undefined && !isObject(data.hooks)) throw new Error("Invalid hooks object; runtime retained");
    const out = [];
    for (const [event, groups] of Object.entries(data.hooks ?? {})) {
      if (!Array.isArray(groups)) throw new Error("Invalid hook event; runtime retained");
      groups.forEach((group, gi) => {
        if (Array.isArray(group?.hooks)) group.hooks.forEach((hook, hi) => { if (ours(hook)) out.push({ event, gi, hi, hook }); });
      });
    }
    return out;
  };
  // Existing hooks may have been renamed, moved, deduplicated or widened by
  // install. Without an unambiguous inverse they and their runtime stay.
  const installed = handlers(after);
  const present = handlers(current);
  if (harness === "claude" && !present.length) return currentBytes;
  const baseline = harness === "claude" ? migrateClaudeHooks(before, claudeHome()).data : before;
  if (handlers(baseline).length) throw new Error("Hook wiring predates its recorded change; restore it manually before uninstalling this runtime");
  for (const entry of present) {
    if (!installed.some((record) => record.event === entry.event && equalJson(record.hook, entry.hook))) throw new Error("Hook wiring was edited; runtime retained");
  }
  for (const record of installed) {
    if (present.filter((entry) => entry.event === record.event && equalJson(entry.hook, record.hook)).length >
        installed.filter((entry) => entry.event === record.event && equalJson(entry.hook, record.hook)).length) throw new Error("Duplicate hook ownership is ambiguous; runtime retained");
  }
  const removed = new Set(present.map(({ event, gi, hi }) => `${event}:${gi}:${hi}`));
  if (harness === "codex") {
    for (const [event, groups] of Object.entries(current.hooks ?? {})) {
      groups.forEach((group, gi) => {
        const hooks = Array.isArray(group?.hooks) ? group.hooks : [];
        const mine = hooks.map((_, hi) => removed.has(`${event}:${gi}:${hi}`));
        if (!mine.some(Boolean)) return;
        if (hooks.some((_, hi) => !mine[hi] && mine.slice(0, hi).some(Boolean))) throw new Error("Removing this Codex handler would shift another hook's trust index; remove it manually and review /hooks");
        if (mine.every(Boolean) && groups.slice(gi + 1).some((g, offset) =>
          Array.isArray(g?.hooks) && g.hooks.some((_, hi) => !removed.has(`${event}:${gi + offset + 1}:${hi}`)))) {
          throw new Error("Removing this Codex group would shift another hook's trust index; remove it manually and review /hooks");
        }
      });
    }
  }
  const out = structuredClone(current);
  for (const [event, groups] of Object.entries(out.hooks ?? {})) {
    out.hooks[event] = groups.flatMap((group, gi) => {
      if (!Array.isArray(group?.hooks)) return [group];
      const hooks = group.hooks.filter((_, hi) => !removed.has(`${event}:${gi}:${hi}`));
      if (hooks.length === group.hooks.length) return [group];
      if (hooks.length) return [{ ...group, hooks }];
      const installedGroup = installed.find((entry) => entry.event === event && equalJson(after.hooks[event][entry.gi], group));
      if (!installedGroup) throw new Error("Hook group metadata was edited; runtime retained");
      if (Object.keys(group).some((key) => !["matcher", "hooks"].includes(key))) return [{ ...group, hooks: [] }];
      return [];
    });
    if (out.hooks[event].length === 0 && baseline.hooks?.[event] === undefined) delete out.hooks[event];
  }
  if (out.hooks && Object.keys(out.hooks).length === 0 && baseline.hooks === undefined) delete out.hooks;
  return Buffer.from(serializeSettings(out, currentBytes.toString("utf8")));
}

function unwireTrackedPermissions(beforeBytes, afterBytes, currentBytes) {
  const before = configuration(beforeBytes), after = configuration(afterBytes), current = configuration(currentBytes);
  for (const data of [before, after, current]) {
    if (data.permissions !== undefined && !Array.isArray(data.permissions)) throw new Error("Invalid OpenCode permissions; runtime retained");
  }
  const old = before.permissions ?? [], installed = after.permissions ?? [], list = current.permissions ?? [];
  if (!equalJson(installed.slice(0, old.length), old)) throw new Error("OpenCode moved preexisting permission rules; restore their order manually before uninstalling");
  const added = installed.slice(old.length);
  if (added.some((rule) => !OPENCODE_ASKS.some((ask) => equalJson(ask, rule)) || old.some((ruleBefore) => sameRule(ruleBefore, rule)))) {
    throw new Error("OpenCode permission provenance is ambiguous; runtime retained");
  }
  for (const rule of added) {
    if (list.filter((entry) => equalJson(entry, rule)).length > 1) throw new Error("Duplicate OpenCode ask ownership is ambiguous; runtime retained");
  }
  const out = structuredClone(current);
  if (out.permissions) out.permissions = list.filter((rule) => !added.some((entry) => equalJson(entry, rule)));
  return Buffer.from(serializeSettings(out, currentBytes.toString("utf8")));
}

async function globalManifest(ctx, targets) {
  return new InstallManifest({ home: os.homedir(), ...(await installCatalog(await readAgents())), targets, dryRun: ctx.dryRun, log: ctx.log, onChange: ctx.onChange });
}

async function trackedGlobal(ctx, targets, action) {
  const manifest = await globalManifest(ctx, targets);
  try {
    await manifest.load();
    return await action(manifest.wrap(ctx));
  } finally { await manifest.close(); }
}

async function uninstallGlobal(ctx, flags) {
  const manifest = await globalManifest(ctx, []);
  await manifest.load();
  const selected = TARGETS.filter((target) => flags.includes(`--${target}`));
  manifest.targets = selected.length ? selected : [...new Set(Object.values(manifest.data.entries).flatMap((entry) => entry.owners))];
  const referenceFiles = {
    claude: [settingsPath(), path.join(claudeHome(), "settings.local.json"),
      path.join(process.cwd(), ".claude", "settings.json"), path.join(process.cwd(), ".claude", "settings.local.json"),
      ...[process.env.CLAUDE_PROJECT_DIR].filter(Boolean).flatMap((dir) => [path.join(dir, ".claude", "settings.json"), path.join(dir, ".claude", "settings.local.json")])],
    codex: [codexHooksPath(), path.join(codexHome(), "config.toml"), path.join(process.cwd(), ".codex", "hooks.json"), path.join(process.cwd(), ".codex", "config.toml")],
    opencode: [opencodeConfigPath(), path.join(opencodeDir(), "opencode.jsonc"), path.join(process.cwd(), "opencode.json"), path.join(process.cwd(), "opencode.jsonc")],
  };
  try {
    return await manifest.uninstall({ references: async (harness, projected) => {
      const residual = [];
      for (const file of new Set(referenceFiles[harness])) {
        let text;
        if (projected.has(file) && projected.get(file) === null) continue;
        try { text = projected.has(file) ? projected.get(file).toString("utf8") : await readFile(file, "utf8"); }
        catch (err) { if (err.code === "ENOENT") continue; throw new Error(`Cannot inspect reference file ${file}`); }
        if (harness === "opencode" && file.endsWith(".jsonc")) { residual.push(file); continue; }
        // Refuse invalid user-scope JSON even when it no longer contains a
        // recognizable command. Its intended references cannot be established.
        if (file.endsWith(".json")) configuration(Buffer.from(text));
        const names = harness === "codex" ? /canonkit-(?:codex|hook)\.js/ : harness === "opencode" ? /canonkit-(?:opencode|hook)\.js|plugins[\\/]canonkit\.js/ : /(?:canonkit|meu-time)-hook\.js/;
        if (names.test(text)) residual.push(file);
      }
      if (harness === "claude" && existsSync(path.join(claudeHome(), "hooks", LEGACY.hook))) residual.push("legacy meu-time forwarder (other projects may use it)");
      if (harness === "opencode") {
        const plugins = path.join(opencodeDir(), "plugins");
        let files;
        try { files = await readdir(plugins, { withFileTypes: true }); }
        catch (err) { if (err.code !== "ENOENT") throw new Error(`Cannot inspect ${plugins}`); files = []; }
        for (const entry of files) {
          if (entry.name === "canonkit.js") continue;
          if (!entry.isFile()) { residual.push(path.join(plugins, entry.name)); continue; }
          const file = path.join(plugins, entry.name);
          const text = await readFile(file, "utf8");
          if (/canonkit-(?:opencode|hook)\.js|\.\.[\\/]canonkit[\\/]/.test(text)) residual.push(file);
        }
      }
      return residual;
    } });
  } finally { await manifest.close(); }
}

async function uninstallProject(ctx) {
  const root = await repositoryRoot();
  if (!root) throw new Error("uninstall --project requires the current validated repository");
  await safePath(path.join(root, ".claude", "settings.json"));
  for (const name of PROJECT_CORE_NAMES) await safePath(path.join(root, ".codex", "agents", `${name}.toml`));
  const manifest = scopedSecurityManifest(ctx, root);
  try { return await manifest.uninstall(); }
  finally { await manifest.close(); }
}

function usage() {
  return `canonkit — a versioned agent team for Claude Code, Codex, OpenCode and GitHub Copilot

Usage:
  canonkit install [--no-reference]   install the core team at user level
           [--claude] [--codex]       for these runtimes only (asked in a terminal;
           [--opencode] [--copilot]   default Claude Code and Codex)
           [--wire-hooks]             also wire hooks for selected runtimes that support them
           [--verbose]                print every step instead of the short summary
  canonkit doctor [--verbose]         check the install; exits 1 on any FAIL (--verbose: every row in full)
  canonkit uninstall [--claude] [--codex] [--opencode] [--copilot]
                                      remove tracked global entries (default: all recorded runtimes)
  canonkit reference [--claude] [--codex] [--opencode] [--copilot]
                                      sync only the global reference blocks
  canonkit add <name>...              add specialists or stack-pack skills to this project
  canonkit remove <name>...           remove specialists or tracked stack-pack skills
  canonkit list                       show the roster and what is installed
  canonkit tool add <tool> [--yes]    run an installed tool's setup here (graphify, openspec)
  canonkit tool remove <tool>         take a tool out of this project's AGENTS.md
  canonkit tool list                  show the tools, their pins, and which are active here
  canonkit models refresh             ask each harness which models and efforts it offers
  canonkit models setup [--project]   choose a model and effort per need level (and agent)
  canonkit models show [--json]       print each agent's effective model and effort, and why

Options:
  --dry-run       report what would change without writing (or running) anything
  --project       uninstall: reverse tracked security settings and Codex core shadows in this repository;
                  models setup: write this project's .canonkit/models.json
  --json          models show: machine-readable output
  --claude        install, reference, uninstall, models: select Claude Code
  --codex         install, reference, uninstall, models: select Codex
  --opencode      install, reference, uninstall, models: select OpenCode
  --copilot       install, reference, uninstall, models: select GitHub Copilot. Flags combine; install/reference without flags:
                  a terminal shows a menu, a script or CI gets Claude Code and Codex
  --wire-hooks   install: wire hooks for selected runtimes that support them, with a dated
                  backup of each file it changes and every other key kept.
                  Claude Code: entries in ~/.claude/settings.json (settings.local.json
                  never written). Legacy meu-time forwarders are kept for manual removal.
                  Codex: a group in $CODEX_HOME/hooks.json; run /hooks in Codex to
                  trust it. OpenCode 2+: plugins/canonkit.js and two asks in
                  opencode.json permissions
  --yes           tool add: skip the confirmation prompt
  --with-git-hooks tool add graphify: opt in to automatic Git hooks and merge driver
  -h, --help      show this
  -v, --version   show the package version

Core agents install to ~/.claude/agents (Codex: $CODEX_HOME/agents, ~/.codex by default;
OpenCode: ~/.config/opencode/agents; GitHub Copilot: ~/.copilot/agents).
Specialists install to the current project's .claude/, .codex/, .opencode/agents/
and .github/agents/ and are registered in its AGENTS.md.
Stack packs (${STACK_PACK_IDS.join(", ")}) install only when added, to this
project's .agents/skills/canonkit-<stack>/, .claude/skills/canonkit-<stack>/
and .github/skills/canonkit-<stack>/.
They are not agents or part of the core install. Local edits are preserved.
Tools are never installed by canonkit: a missing one gets its pinned install
command printed.`;
}

/**
 * Every write goes through this so --dry-run is one flag rather than a branch
 * at each call site — the shape where a dry run quietly writes something.
 */
function context(dryRun) {
  const tag = dryRun ? "[dry-run] " : "";
  return {
    dryRun,
    log: (m) => console.log(m ? tag + m : ""),
    write: async (p, text) => {
      if (dryRun) return;
      await mkdir(path.dirname(p), { recursive: true });
      await writeFile(p, text);
    },
    // For a file the user owns (a project's AGENTS.md, settings.json): an
    // interrupted write leaves the old file or the new one, never half of it.
    writeAtomic: async (target, text) => {
      if (dryRun) return;
      // Write through a symlink (AGENTS.md -> CLAUDE.md is a common setup):
      // renaming onto the link itself would replace it with a plain file and
      // let the two drift apart.
      const p = existsSync(target) ? realpathSync(target) : target;
      await mkdir(path.dirname(p), { recursive: true });
      const tmp = `${p}.canonkit-${process.pid}.tmp`;
      // The new file keeps the old one's mode: a settings.json kept at 0600
      // must not come back 0644. The temp file is private until then.
      let mode = null;
      try { mode = statSync(p).mode & 0o7777; } catch { /* a new file: default mode */ }
      try {
        await writeFile(tmp, text, mode === null ? undefined : { mode: 0o600 });
        // Best effort: where chmod is refused the file stays 0600, tighter, not looser.
        if (mode !== null) await chmod(tmp, mode).catch(() => {});
        await rename(tmp, p);
      } catch (err) {
        await rm(tmp, { force: true });
        throw err;
      }
    },
    mkdir: async (p) => {
      if (!dryRun) await mkdir(p, { recursive: true });
    },
    copy: async (from, to) => {
      if (!dryRun) await copyFile(from, to);
    },
    // A dated copy beside the file that never replaces an earlier one; copyFile
    // keeps the mode. Returns its path (null in a dry run).
    backup: async (p) => {
      if (dryRun) return null;
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      for (let n = 0; ; n++) {
        const bak = `${p}.canonkit-${stamp}${n ? `-${n}` : ""}.bak`;
        try {
          await copyFile(p, bak, fsc.COPYFILE_EXCL);
          return bak;
        } catch (err) {
          if (err.code !== "EEXIST") throw err;
        }
      }
    },
    remove: async (p) => {
      if (!dryRun) await rm(p, { force: true });
    },
    move: async (from, to) => {
      if (!dryRun) await rename(from, to);
    },
    removeTree: async (p) => {
      if (!dryRun) await rm(p, { recursive: true, force: true });
    },
  };
}

// Piping into `head`, or quitting `less` early, closes stdout mid-write. That is
// the reader's decision, not a failure — without this it surfaces as an
// unhandled EPIPE and a stack trace that reads like the install broke.
process.stdout.on("error", (err) => {
  if (err.code === "EPIPE") process.exit(0);
  throw err;
});

const KNOWN_FLAGS = ["--dry-run", "--no-reference", "--remove", "--yes", "--with-git-hooks", "--wire-hooks", "--project", "--json", "--verbose", "--claude", "--codex", "--opencode", "--copilot", "-h", "--help", "-v", "--version"];

async function main(argv) {
  const flags = argv.filter((a) => a.startsWith("-"));
  const args = argv.filter((a) => !a.startsWith("-"));
  const [command, ...rest] = args;

  if (flags.includes("-h") || flags.includes("--help") || (!command && !flags.length)) {
    console.log(usage());
    return 0;
  }
  if (flags.includes("-v") || flags.includes("--version")) {
    const pkg = JSON.parse(await readFile(path.join(PACKAGE_ROOT, "package.json"), "utf8"));
    console.log(pkg.version);
    return 0;
  }

  const unknown = flags.filter((f) => !KNOWN_FLAGS.includes(f));
  if (unknown.length) {
    console.error(`Unknown option: ${unknown.join(" ")}\n`);
    console.error(usage());
    return 1;
  }

  const ctx = context(flags.includes("--dry-run"));
  const modelsSetup = command === "models" && rest[0] === "setup";
  if (flags.includes("--project") && !modelsSetup && (command !== "uninstall" || rest.length || flags.some((flag) => !["--project", "--dry-run"].includes(flag)))) {
    console.error("--project is only valid for: canonkit uninstall --project [--dry-run], canonkit models setup --project");
    return 1;
  }
  if (flags.includes("--json") && !(command === "models" && rest[0] === "show")) {
    console.error("--json is only valid for: canonkit models show");
    return 1;
  }
  if (flags.includes("--with-git-hooks") && (command !== "tool" || rest.length !== 2 || rest[0] !== "add" || rest[1] !== "graphify")) {
    console.error("--with-git-hooks is only valid for: canonkit tool add graphify");
    return 1;
  }
  if (flags.includes("--verbose") && !["install", "doctor"].includes(command)) {
    console.error("--verbose is only valid for: canonkit install, canonkit doctor");
    return 1;
  }
  if (flags.includes("--wire-hooks") && command !== "install") {
    console.error("--wire-hooks is only valid for: canonkit install");
    return 1;
  }
  if (TARGETS.some((t) => flags.includes(`--${t}`)) && !["install", "reference", "uninstall", "models"].includes(command)) {
    console.error("--claude, --codex, --opencode and --copilot are only valid for: canonkit install, canonkit reference, canonkit uninstall, canonkit models");
    return 1;
  }

  switch (command) {
    case "install": {
      // The menu (no harness flag, a terminal) also offers the model step, so
      // the agents are written with the choices made a moment ago.
      const menu = !TARGETS.some((t) => flags.includes(`--${t}`)) && !!(process.stdin.isTTY && process.stdout.isTTY);
      const targets = await chooseTargets(flags);
      if (!targets || (menu && !ctx.dryRun && targets.some((h) => h === "claude" || h === "codex") && !(await offerModelSetup(ctx, await readAgents(), { harnesses: targets.filter((h) => h === "claude" || h === "codex") })))) {
        console.error("Cancelled: nothing was installed.");
        return 1;
      }
      // Default output is a short grouped summary; --verbose prints every step as it happens.
      const verbose = flags.includes("--verbose");
      const lines = [];
      const changed = new Set();
      if (!verbose) {
        const tag = ctx.dryRun ? "[dry-run] " : "";
        ctx.log = (m) => { lines.push(m ? tag + m : ""); };
        ctx.onChange = (file) => changed.add(file);
      }
      let failed = true;
      try {
        await trackedGlobal(ctx, targets, (tracked) => install(tracked, { reference: !flags.includes("--no-reference"), wireHooks: flags.includes("--wire-hooks"), targets }));
        failed = false;
      } finally {
        if (!verbose) {
          const pkg = JSON.parse(await readFile(path.join(PACKAGE_ROOT, "package.json"), "utf8"));
          console.log(renderInstallReport(lines, { dryRun: ctx.dryRun, version: pkg.version, changed, failed }).join("\n"));
        }
      }
      return 0;
    }
    case "uninstall":
      if (flags.includes("--project")) return uninstallProject(ctx);
      if (rest.length || flags.some((flag) => !["--dry-run", "--claude", "--codex", "--opencode", "--copilot"].includes(flag))) throw new Error("uninstall accepts only --dry-run and harness selection flags");
      return uninstallGlobal(ctx, flags);
    case "doctor":
      return doctor({ verbose: flags.includes("--verbose") });
    case "reference":
      // No menu here: reference is the re-sync after editing a block, run
      // from scripts as often as by hand.
      {
        const targets = await chooseTargets(flags, { interactive: false });
        await trackedGlobal(ctx, targets, (tracked) => syncReference(tracked, targets));
      }
      return 0;
    case "add":
    case "remove":
      if (!rest.length) {
        console.error(`${command}: name required\n`);
        console.error(usage());
        return 1;
      }
      return changeProject(ctx, rest, { remove: command === "remove" || flags.includes("--remove") });
    case "list":
      await list(ctx);
      return 0;
    case "tool":
      return toolCommand(ctx, rest, flags);
    case "models": {
      const [sub, ...extra] = rest;
      const picked = TARGETS.filter((t) => flags.includes(`--${t}`));
      if (!["refresh", "show", "setup"].includes(sub) || extra.length) {
        console.error(`models: expected refresh, show or setup${sub && !extra.length ? `, not '${sub}'` : ""}
`);
        console.error(usage());
        return 1;
      }
      const agents = await readAgents();
      if (sub === "refresh") return refreshModels(ctx, { harnesses: picked.length ? picked : TARGETS });
      if (sub === "show") return showModels(ctx, agents, { json: flags.includes("--json"), harnesses: picked.length ? picked : TARGETS });
      return setupModels(ctx, agents, { project: flags.includes("--project"), harnesses: picked.length ? picked : ["claude"] });
    }
    default:
      console.error(`Unknown command: ${command}\n`);
      console.error(usage());
      return 1;
  }
}

// Only run when invoked as the CLI. The tests import applyBlock directly, and
// an unguarded call here would install the team as a side effect of importing.
const invokedDirectly =
  process.argv[1] && (() => {
    // npx and global installs launch through a link or shim: compare real paths,
    // or the CLI exits silently without running.
    const real = (p) => { try { return realpathSync(p); } catch { return path.resolve(p); } };
    return real(process.argv[1]) === real(fileURLToPath(import.meta.url));
  })();

if (invokedDirectly) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    });
}

export {
  applyBlock,
  chooseTargets,
  readAgents,
  parseAgent,
  summaries,
  codexAgent,
  claudeAgent,
  HONORED_FIELDS,
  HOOK_FILES,
  OPENCODE_PLUGIN,
  renderRoutingBlock,
  opencodeAgent,
  copilotAgent,
  replaceProjectBlock,
  readProjectBlock,
  readTools,
  parseTool,
};

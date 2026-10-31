#!/usr/bin/env node
/**
 * Install the agent team into the local Claude Code / Codex / OpenCode runtime.
 *
 * Agents in this repo are stored in the exact format the runtime reads, so
 * installing is a copy — there is no generation step and nothing to reconcile
 * by hand. Edit agents/<name>.md, run `install`, done.
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
import { readdir, readFile, writeFile, mkdir, copyFile, rm, rename, chmod } from "node:fs/promises";
import { existsSync, readFileSync, readdirSync, realpathSync, statSync, accessSync, constants as fsc } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { resolveBin, projectOnlyHit, runBin, binVersion, display, SAFE_ARG } from "./exec.js";

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
const HOOK_FILES = {
  claude: ["canonkit-hook.js"],
  codex: ["canonkit-codex.js", "canonkit-hook.js", "package.json"],
};
const DASHBOARD_DIR = path.join(PACKAGE_ROOT, "dashboard");
const SKILLS_DIR = path.join(PACKAGE_ROOT, "skills");
const TOOLS_DIR = path.join(PACKAGE_ROOT, "tools");

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

  return {
    name,
    tier: front.tier,
    authority: front.authority,
    model: front.model,
    description: front.description ?? "",
    // Everything after the frontmatter is the agent's actual instructions.
    // Claude Code reads the file as-is; Codex needs them as a TOML field.
    body: text.slice(end + 4).replace(/^\n+/, ""),
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

/**
 * Codex reads standalone TOML files from ~/.codex/agents (personal) and
 * .codex/agents (project-scoped), and identifies an agent by its `name` field
 * rather than the filename. Until it had those, the only thing this repo could
 * tell Codex was the roster prose in AGENTS.md — which describes the team but
 * cannot spawn anyone.
 *
 * The frontmatter `model` says how demanding the agent's normal work is, on
 * Claude's axis. Codex has its own axis, so the intent is carried across by one
 * declared mapping instead of a second model field per agent, which would be
 * fifteen more lines to keep in sync and one more thing to drift. Every agent
 * here is a judgment agent rather than a speed-optimized scanner, which is why
 * the fast models sit at the bottom of the map and nothing selects them today.
 */
const CODEX_MODELS = {
  opus: { model: "gpt-5.6", effort: "high" },
  sonnet: { model: "gpt-5.6", effort: "medium" },
  haiku: { model: "gpt-5.6-luna", effort: "low" },
};

// TOML basic strings escape these two; the multi-line literal string used for
// the body escapes nothing, which is exactly what Markdown needs.
const tomlString = (s) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

function codexAgent(agent) {
  const mapped = CODEX_MODELS[agent.model];
  if (!mapped) {
    throw new Error(`agents/${agent.name}.md: model '${agent.model}' has no Codex equivalent`);
  }
  // A literal string cannot contain its own delimiter, and there is no escape
  // for it. Failing here beats emitting a file that silently truncates the
  // agent's instructions at the first occurrence.
  if (agent.body.includes("'''")) {
    throw new Error(`agents/${agent.name}.md: body contains ''' and cannot be written as a TOML literal string`);
  }

  return `# Generated by canonkit from agents/${agent.name}.md — do not edit here.
name = ${tomlString(agent.name)}
description = ${tomlString(agent.description)}
model = ${tomlString(mapped.model)}
model_reasoning_effort = ${tomlString(mapped.effort)}
developer_instructions = '''
${agent.body.replace(/\n+$/, "")}
'''
`;
}

/* ---------------------------------------------------------------- opencode */

/**
 * OpenCode reads Markdown agents from ~/.config/opencode/agents (personal) and
 * .opencode/agents (project-scoped), named by the filename. Same format as the
 * source, but not the same frontmatter, so the file is generated rather than
 * copied or linked: a custom agent without `mode` loads as a primary agent,
 * and `model: sonnet` is not a model id OpenCode accepts.
 *
 * No model and no variant, by decision: OpenCode is run on whatever models
 * the session has, and a subagent without one uses the model of the agent
 * that invoked it. `name`, `tier` and `model` are this repo's bookkeeping.
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

async function syncBlock(blockPath, targetPath, markers, ctx) {
  const blockText = await readOwned(blockPath);
  const original = existsSync(targetPath) ? await readFile(targetPath, "utf8") : "";
  const { text, action } = applyBlock(original, blockText, markers);

  if (text === original) return ctx.log(`already current: ${targetPath}`);
  await ctx.write(targetPath, text);
  ctx.log(`${action} ${targetPath}`);
}

/* ---------------------------------------------------------------- commands */

const TARGETS = ["claude", "codex", "opencode"];
// What install wrote before OpenCode was a target, and still writes when no
// flag or menu says otherwise. OpenCode is opt-in: writing its global
// AGENTS.md also ends its fallback to ~/.claude/CLAUDE.md, which is not a
// change to make for someone who never asked for OpenCode.
const DEFAULT_TARGETS = ["claude", "codex"];

/**
 * Which runtimes to write for. A flag decides (`--claude`, `--codex`,
 * `--opencode`, any combination); without one, a terminal gets the menu, and
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
      { title: "Codex", value: "codex", selected: true, description: "~/.codex/agents, ~/.agents/skills" },
      { title: "OpenCode", value: "opencode", selected: false, description: "~/.config/opencode, ~/.agents/skills (no hooks)" },
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

async function install(ctx, options = {}) {
  const reference = options.reference !== false;
  const wire = options.wireHooks === true;
  const targets = options.targets ?? DEFAULT_TARGETS;
  const claude = targets.includes("claude");
  const codex = targets.includes("codex");
  // Each harness's wiring is written only for a harness in the install: wiring
  // one the person said no to would be writing it anyway. OpenCode has no
  // wiring yet, so with it alone there is nothing --wire-hooks could do.
  if (wire && !claude && !codex) {
    throw new Error("--wire-hooks wires the Claude Code and Codex hooks: it needs --claude or --codex in the install (OpenCode has no hook wiring yet)");
  }
  const agents = await readAgents();
  // Before anything is written, for both harnesses: a settings.json or a
  // hooks.json --wire-hooks would have to guess about stops the whole install,
  // so a refusal leaves no half-install.
  if (wire && claude) await readSettingsForWiring(settingsPath());
  if (wire && codex) {
    refuseUnquotableCodexPath();
    await readCodexHooksForWiring(codexHooksPath());
  }

  // Claude Code reads ~/.claude/agents only; no verified harness reads
  // ~/.agents/<agent>.md, so install no longer writes it (doctor warns on leftovers).
  const dests = claude ? [path.join(os.homedir(), ".claude", "agents")] : [];

  for (const dest of dests) {
    await ctx.mkdir(dest);
    for (const agent of core(agents)) {
      await ctx.copy(agent.file, path.join(dest, `${agent.name}.md`));
    }
    ctx.log(`Installed ${core(agents).length} agents -> ${dest}`);

    // A specialist left at user level is available in every project and
    // silently defeats the per-project rule. Removing it is what actually
    // enforces the split. Only names this repo owns are touched.
    for (const agent of specialists(agents)) {
      const stray = path.join(dest, `${agent.name}.md`);
      if (existsSync(stray)) {
        await ctx.remove(stray);
        ctx.log(`  removed specialist left at user level: ${agent.name}.md`);
      }
    }
  }

  if (codex) {
    await installCodex(ctx, agents, path.join(codexHome(), "agents"));
    await installCodexHooks(ctx, { wire });
  }
  if (targets.includes("opencode")) {
    await installOpencode(ctx, agents, opencodeAgentsDir());
    if (wire) ctx.log("  OpenCode has no hook wiring yet: --wire-hooks wired nothing for it.");
  }
  if (claude) {
    const planned = await installHooks(ctx, path.join(os.homedir(), ".claude", "hooks"), { wire });
    await upgradeFromMeuTime(ctx, path.join(os.homedir(), ".claude"), { wire, planned });
    await installDashboard(ctx, path.join(os.homedir(), ".claude", "canonkit-dashboard"));
  }

  if (reference) {
    ctx.log("");
    await syncReference(ctx, targets);
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
 * Write the core team as Codex custom agents. Same split as everywhere else:
 * core at user level, specialists per project.
 */
async function installCodex(ctx, agents, dest) {
  await ctx.mkdir(dest);
  for (const agent of core(agents)) {
    await ctx.write(path.join(dest, `${agent.name}.toml`), codexAgent(agent));
  }
  ctx.log(`Installed ${core(agents).length} agents -> ${dest}`);

  for (const agent of specialists(agents)) {
    const stray = path.join(dest, `${agent.name}.toml`);
    if (existsSync(stray)) {
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
  const files = (await readdir(DASHBOARD_DIR)).sort();
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

  const oldLog = path.join(claudeDir, LEGACY.log);
  const newLog = path.join(claudeDir, "canonkit-activity");
  if (existsSync(oldLog)) {
    if (existsSync(newLog)) {
      notes.push(...(await mergeLegacyLog(ctx, oldLog, newLog)));
    } else {
      try {
        await ctx.move(oldLog, newLog);
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
      await ctx.copy(oldHook, `${oldHook}.local.bak`);
      notes.push(`previous ${LEGACY.hook} kept as ${LEGACY.hook}.local.bak`);
    }
    const next = forwarderFor(current);
    if (next !== current) await ctx.write(oldHook, next);
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
 */
async function copyKeepingLocal(ctx, fromDir, dest, files) {
  await ctx.mkdir(dest);
  for (const file of files) {
    const from = path.join(fromDir, file);
    const to = path.join(dest, file);
    await ctx.mkdir(path.dirname(to));
    if (existsSync(to) && (await readOwned(to)) !== (await readOwned(from))) {
      await ctx.copy(to, `${to}.local.bak`);
      ctx.log(`  ${file} differed — previous copy kept as ${file}.local.bak`);
    }
    await ctx.copy(from, to);
  }
}

/* ------------------------------------------------------------ hook wiring */

const settingsPath = () => path.join(os.homedir(), ".claude", "settings.json");
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
  ctx.log("  A hook the runtime never calls fails silently. Let install write it (backup first):");
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
  const text = await readFile(file, "utf8");
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
  const command = `node "${slash(path.join(dest, HOOK))}"`;
  const { data: wired, changes, wrappers } = wireSettings(data, command);
  const after = serializeSettings(wired, text);

  ctx.log("");
  // Its own entry is still written beside a wrapper: wired is not left to a
  // command canonkit cannot read. Until the wrapper goes, the hook runs twice.
  for (const w of wrappers) {
    ctx.log(`  ${w}: a command that wraps the hook — left as is. If it runs it under an event wired below,`);
    ctx.log(`    the hook runs twice there (every gate asks twice): remove the wrapper or point it elsewhere.`);
  }
  if (JSON.stringify(wired) === JSON.stringify(data)) {
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

async function syncReference(ctx, targets = DEFAULT_TARGETS) {
  // The roster says who exists and what each one owns, and is runtime-neutral.
  await syncBlock(path.join(REFERENCE_DIR, "agents-block.md"), path.join(os.homedir(), "AGENTS.md"), ROSTER, ctx);

  if (targets.includes("claude")) {
    // Claude Code reads ~/.claude/CLAUDE.md. The routing block only points at
    // ~/AGENTS.md in plain text: projects live under a folder that contains it, so
    // Claude Code already loads it as an ancestor, and an `@` import would load it
    // a second time.
    const claudeMd = path.join(os.homedir(), ".claude", "CLAUDE.md");

    // The Claude Code mechanics — hooks and their enforcement — mean nothing to
    // Codex, so they stay out of the runtime-neutral roster. A CLAUDE.md that does not exist yet is created by
    // this call with the routing block as its entire content.
    await syncBlock(path.join(REFERENCE_DIR, "routing-block.md"), claudeMd, ROUTING, ctx);
  }

  if (targets.includes("codex")) {
    // Codex does not load ~/AGENTS.md from a repository below home, so its own
    // block (in $CODEX_HOME/AGENTS.md) points at it. Its [ENFORCED] lines name
    // the Codex hook, not the Claude one.
    await syncBlock(path.join(REFERENCE_DIR, "codex-block.md"), path.join(codexHome(), "AGENTS.md"), CODEX, ctx);
  }

  if (targets.includes("opencode")) {
    // OpenCode's own block, never the routing one: its [ENFORCED] lines name a
    // hook OpenCode does not run. Creating this file is also what stops
    // OpenCode falling back to ~/.claude/CLAUDE.md, rules of your own included.
    const opencodeMd = path.join(opencodeDir(), "AGENTS.md");
    const fallback = !existsSync(opencodeMd) && existsSync(path.join(os.homedir(), ".claude", "CLAUDE.md"));
    await syncBlock(path.join(REFERENCE_DIR, "opencode-block.md"), opencodeMd, OPENCODE, ctx);
    if (fallback) {
      ctx.log(`  OpenCode now reads ${opencodeMd} instead of ~/.claude/CLAUDE.md:`);
      ctx.log("  copy any rule of your own from there that OpenCode should keep, outside the markers.");
    }
  }

  await installSkills(ctx, targets);
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
    targets.includes("claude") && path.join(os.homedir(), ".claude", "skills"),
    // OpenCode reads both of these natively; this one is the runtime-neutral
    // path, so an OpenCode-only install writes nothing under ~/.claude.
    (targets.includes("codex") || targets.includes("opencode")) && path.join(os.homedir(), ".agents", "skills"),
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
  // Codex .codex/agents/<name>.toml, OpenCode .opencode/agents/<name>.md, and
  // the AGENTS.md block below is what tells the main agent when to reach for one.
  const agentsDir = path.join(project, ".claude", "agents");
  const codexDir = path.join(project, ".codex", "agents");
  const opencodeProjectDir = path.join(project, ".opencode", "agents");
  await ctx.mkdir(agentsDir);
  await ctx.mkdir(codexDir);
  await ctx.mkdir(opencodeProjectDir);

  for (const name of names) {
    const target = path.join(agentsDir, `${name}.md`);
    const codexTarget = path.join(codexDir, `${name}.toml`);
    const opencodeTarget = path.join(opencodeProjectDir, `${name}.md`);
    if (remove) {
      if ([target, codexTarget, opencodeTarget].some((p) => existsSync(p))) {
        await ctx.remove(target);
        await ctx.remove(codexTarget);
        await ctx.remove(opencodeTarget);
        ctx.log(`Removed ${name} from .claude/agents/, .codex/agents/ and .opencode/agents/`);
      } else {
        ctx.log(`Not installed: ${name}`);
      }
    } else {
      await ctx.copy(known.get(name).file, target);
      await ctx.write(codexTarget, codexAgent(known.get(name)));
      await ctx.write(opencodeTarget, opencodeAgent(known.get(name)));
      ctx.log(`Installed ${name} -> .claude/agents/${name}.md, .codex/agents/${name}.toml, .opencode/agents/${name}.md`);
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
the files in .claude/agents/ are copies the next add overwrites.`;

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
  const userDest = path.join(os.homedir(), ".claude", "agents");
  const projectDest = path.join(process.cwd(), ".claude", "agents");
  const mark = (dir, name) => (existsSync(path.join(dir, `${name}.md`)) ? "installed" : "-");

  ctx.log(`Core team (user level: ${userDest})`);
  for (const a of core(agents)) {
    ctx.log(`  ${a.name.padEnd(10)} ${String(a.model).padEnd(7)} ${mark(userDest, a.name)}`);
  }

  ctx.log("");
  ctx.log(`Domain specialists (this project: ${projectDest})`);
  for (const a of specialists(agents)) {
    ctx.log(`  ${a.name.padEnd(10)} ${String(a.model).padEnd(7)} ${mark(projectDest, a.name)}`);
  }

  ctx.log("");
  ctx.log("Optional tools (graphify, openspec): canonkit tool list");
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
async function doctor() {
  const home = os.homedir();
  const claudeDir = path.join(home, ".claude");
  const results = [];
  const add = (status, check, detail, more = []) => results.push({ status, check, detail, more });
  const text = (p) => { try { return toLf(readFileSync(p, "utf8")); } catch { return null; } };

  // agents: every core agent in ~/.claude/agents, matching this package's copy.
  const agents = core(await readAgents());
  const missing = [], stale = [];
  for (const a of agents) {
    const x = text(path.join(claudeDir, "agents", `${a.name}.md`));
    if (x === null) missing.push(a.name);
    else if (x !== (await readOwned(a.file))) stale.push(a.name);
  }
  if (missing.length) {
    add("FAIL", "agents", `missing from ~/.claude/agents: ${missing.join(", ")} — run npx canonkit install`);
  } else if (stale.length) {
    add("WARN", "agents", `differ from this package's: ${stale.join(", ")} — run npx canonkit install`);
  } else {
    add("OK", "agents", `${agents.length} core agents in ~/.claude/agents`);
  }

  // Leftovers from installs before 2.1: ~/.agents/<core>.md is read by no harness.
  // Only reported; 3.0 removes byte-identical copies.
  const leftovers = agents.filter((a) => text(path.join(home, ".agents", `${a.name}.md`)) !== null).map((a) => a.name);
  if (leftovers.length) {
    add("WARN", "agents leftovers", `~/.agents has core-named copies: ${leftovers.join(", ")} — not read by any harness; 3.0 removes byte-identical copies`);
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
  if (bad.length) {
    add("FAIL", "hook wiring", `${bad.map((f) => `~/.claude/${f}`).join(", ")} is not valid JSON: the runtime cannot read its hooks`);
  } else if (!anySettings) {
    add("FAIL", "hook wiring", "~/.claude/settings.json does not exist: no event runs the hook — run npx canonkit install --wire-hooks");
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
    add("WARN", "forwarder", `${tilde(forwarder)} is still on disk${runBy ? `, run by ${runBy}` : ""}${unread}. npx canonkit install --wire-hooks rewires ~/.claude/settings.json and removes it once nothing in sight runs it`);
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

  for (const r of results) {
    console.log(`${r.status.padEnd(4)} ${r.check}: ${r.detail}`);
    for (const m of r.more) console.log(`       ${m}`);
  }
  const failed = results.filter((r) => r.status === "FAIL").length;
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

  const lists = ["install", "setup", "touches", "notes", "undo", "env"];
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

function printMissing(tool, project) {
  const inside = projectOnlyHit(tool.bin, { cwd: project });
  console.error(
    [
      inside
        ? `${tool.bin} was found only inside the project (${inside}); canonkit runs binaries from outside it only.`
        : `${tool.bin} is not on PATH.`,
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

  const abs = resolveBin(tool.bin, { cwd: project });
  if (!abs) {
    printMissing(tool, project);
    return 1;
  }

  let version = null;
  let hooks = null;
  if (!ctx.dryRun) {
    version = binVersion(abs, { project, env: toolEnv(tool) });
    if (tool.preflight === "git-hooks") {
      hooks = gitHooksPreflight(project, { withGitHooks });
      if (!hooks.ok) {
        console.error(hooks.message);
        return 1;
      }
    }
  }

  ctx.log(`${tool.name}: setup in ${project}`);
  ctx.log(`  binary:  ${abs}`);
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
  ctx.log("  then:    AGENTS.md — canonkit's tools block, written last and only if setup succeeds");
  for (const [k, v] of Object.entries(tool.env)) ctx.log(`  env:     ${k}=${v}`);
  for (const n of tool.notes) ctx.log(`  note:    ${n}`);

  if (ctx.dryRun) {
    const raw = existsSync(path.join(project, "AGENTS.md")) ? await readFile(path.join(project, "AGENTS.md"), "utf8") : "";
    const active = activeTools(raw, tools);
    ctx.log(active.has(name) ? "tools block in AGENTS.md already lists it" : "would add it to the tools block in AGENTS.md");
    return 0;
  }

  if (!(await confirm(yes))) return 1;

  const claudeBefore = CLAUDE_MD.map((f) => existsSync(path.join(project, f)));
  for (const [i, args] of setup.entries()) {
    ctx.log(`> ${display(abs, args)}`);
    const r = runBin(abs, args, { cwd: project, env: toolEnv(tool) });
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
  for (const t of tools.values()) {
    const abs = resolveBin(t.bin, { cwd: project });
    const installed = !abs ? "not on PATH" : ctx.dryRun ? "not checked" : `installed ${binVersion(abs, { project, env: toolEnv(t) }) ?? "?"}`;
    ctx.log(`  ${t.name.padEnd(10)} pin ${t.pin.padEnd(9)} ${installed.padEnd(18)} ${active.has(t.name) ? "active" : "-"}`);
  }
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

function usage() {
  return `canonkit — a versioned agent team for Claude Code, Codex and OpenCode

Usage:
  canonkit install [--no-reference]   install the core team at user level
           [--claude] [--codex]       for these runtimes only (asked in a terminal;
           [--opencode]               default Claude Code and Codex)
           [--wire-hooks]             also register the hook in ~/.claude/settings.json
  canonkit doctor                     check the install; exits 1 on any FAIL
  canonkit reference [--claude] [--codex] [--opencode]
                                      sync only the global reference blocks
  canonkit add <name>...              add domain specialists to this project
  canonkit remove <name>...           remove domain specialists from this project
  canonkit list                       show the roster and what is installed
  canonkit tool add <tool> [--yes]    run an installed tool's setup here (graphify, openspec)
  canonkit tool remove <tool>         take a tool out of this project's AGENTS.md
  canonkit tool list                  show the tools, their pins, and which are active here

Options:
  --dry-run       report what would change without writing (or running) anything
  --claude        install, reference: write for Claude Code
  --codex         install, reference: write for Codex
  --opencode      install, reference: write for OpenCode. Flags combine; none:
                  a terminal shows a menu, a script or CI gets Claude Code and Codex
  --wire-hooks   install: write the hook's entries into ~/.claude/settings.json
                  (dated backup first, every other key kept, settings.local.json
                  never written) and remove the meu-time forwarder once unused
  --yes           tool add: skip the confirmation prompt
  --with-git-hooks tool add graphify: opt in to automatic Git hooks and merge driver
  -h, --help      show this
  -v, --version   show the package version

Core agents install to ~/.claude/agents (Codex: ~/.codex/agents;
OpenCode: ~/.config/opencode/agents). Specialists install to the current
project's .claude/, .codex/ and .opencode/agents/ and are registered in its AGENTS.md.
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

const KNOWN_FLAGS = ["--dry-run", "--no-reference", "--remove", "--yes", "--with-git-hooks", "--wire-hooks", "--claude", "--codex", "--opencode", "-h", "--help", "-v", "--version"];

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
  if (flags.includes("--with-git-hooks") && (command !== "tool" || rest.length !== 2 || rest[0] !== "add" || rest[1] !== "graphify")) {
    console.error("--with-git-hooks is only valid for: canonkit tool add graphify");
    return 1;
  }
  if (flags.includes("--wire-hooks") && command !== "install") {
    console.error("--wire-hooks is only valid for: canonkit install");
    return 1;
  }
  if (TARGETS.some((t) => flags.includes(`--${t}`)) && command !== "install" && command !== "reference") {
    console.error("--claude, --codex and --opencode are only valid for: canonkit install, canonkit reference");
    return 1;
  }

  switch (command) {
    case "install": {
      const targets = await chooseTargets(flags);
      if (!targets) {
        console.error("Cancelled: nothing was installed.");
        return 1;
      }
      await install(ctx, { reference: !flags.includes("--no-reference"), wireHooks: flags.includes("--wire-hooks"), targets });
      return 0;
    }
    case "doctor":
      return doctor();
    case "reference":
      // No menu here: reference is the re-sync after editing a block, run
      // from scripts as often as by hand.
      await syncReference(ctx, await chooseTargets(flags, { interactive: false }));
      return 0;
    case "add":
    case "remove":
      if (!rest.length) {
        console.error(`${command}: name required\n`);
        console.error(usage());
        return 1;
      }
      await addSpecialists(ctx, rest, { remove: command === "remove" || flags.includes("--remove") });
      return 0;
    case "list":
      await list(ctx);
      return 0;
    case "tool":
      return toolCommand(ctx, rest, flags);
    default:
      console.error(`Unknown command: ${command}\n`);
      console.error(usage());
      return 1;
  }
}

// Only run when invoked as the CLI. The tests import applyBlock directly, and
// an unguarded call here would install the team as a side effect of importing.
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

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
  CODEX_MODELS,
  HOOK_FILES,
  opencodeAgent,
  replaceProjectBlock,
  readProjectBlock,
  readTools,
  parseTool,
};

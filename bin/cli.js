#!/usr/bin/env node
/**
 * Install the agent team into the local Claude Code / Codex runtime.
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
 * No dependencies, by design — an installer that runs before you trust the
 * repo should not ask you to trust a dependency tree first.
 */
import { readdir, readFile, writeFile, mkdir, copyFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AGENTS_DIR = path.join(PACKAGE_ROOT, "agents");
const REFERENCE_DIR = path.join(PACKAGE_ROOT, "reference");
const HOOKS_DIR = path.join(PACKAGE_ROOT, "hooks");
const DASHBOARD_DIR = path.join(PACKAGE_ROOT, "dashboard");
const SKILLS_DIR = path.join(PACKAGE_ROOT, "skills");

// Every event each hook must be registered under, with the matcher it needs
// there (null: no matcher). Checked per event, not per file: a hook wired to
// some of its events half-works, which hides better than not working — the gates
// fire, so nobody goes looking for the dispatch metrics that are never written.
const HOOK_EVENTS = {
  "meu-time-hook.js": {
    PreToolUse: "Edit|Write|MultiEdit|NotebookEdit|Bash|PowerShell|Agent|Task",
    PostToolUse: "Agent|Task",
    SubagentStop: null,
    UserPromptSubmit: null,
    Stop: null,
  },
};

// Two runtimes read different files, and forgetting either one is the failure
// these markers exist to prevent. Claude Code reads .claude/agents/ and
// ~/.claude/CLAUDE.md; Codex reads AGENTS.md and never looks at .claude/.
const ROSTER = ["<!-- agent-team-config:start -->", "<!-- agent-team-config:end -->"];
const ROUTING = ["<!-- agent-team-config:routing:start -->", "<!-- agent-team-config:routing:end -->"];
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

async function install(ctx, options = {}) {
  const reference = options.reference !== false;
  const agents = await readAgents();

  // Both paths are read by Claude Code; keeping them identical avoids the drift
  // that a generated destination invites.
  const dests = [path.join(os.homedir(), ".agents"), path.join(os.homedir(), ".claude", "agents")];

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

  await installCodex(ctx, agents, path.join(os.homedir(), ".codex", "agents"));
  await installHooks(ctx, path.join(os.homedir(), ".claude", "hooks"));
  await installDashboard(ctx, path.join(os.homedir(), ".claude", "meu-time-dashboard"));

  if (reference) {
    ctx.log("");
    await syncReference(ctx);
  }

  ctx.log("");
  ctx.log("Core installed. Domain specialists are per project:");
  ctx.log("  cd <project> && npx canonkit add <name>");
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
  const owned = new Set(agents.map((a) => `${a.name}.toml`));
  const entries = existsSync(dest) ? await readdir(dest, { withFileTypes: true }) : [];
  const stale = entries
    .filter((e) => e.isFile() && !owned.has(e.name) && !e.name.startsWith("."))
    .filter((e) => agents.some((a) => e.name.toLowerCase().replace(/\.[^.]+$/, "").split(/[^a-z0-9]+/).includes(a.name)));

  if (stale.length) {
    ctx.log(`  possible older copies of agents this repo owns: ${stale.map((e) => e.name).join(", ")}`);
    ctx.log("  Codex does not load these — remove them yourself once you have checked.");
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
async function installHooks(ctx, dest) {
  const files = existsSync(HOOKS_DIR)
    ? (await readdir(HOOKS_DIR)).filter((f) => f.endsWith(".js")).sort()
    : [];
  if (!files.length) return;

  await copyKeepingLocal(ctx, HOOKS_DIR, dest, files);
  ctx.log(`Installed ${files.length} hook${files.length === 1 ? "" : "s"} -> ${dest}`);

  await reportHookWiring(ctx, dest, files);
}

/**
 * Install the activity dashboard the hook's event log feeds. It used to live
 * only in ~/.claude/meu-time-dashboard/, the same unversioned single copy the
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

/**
 * A hook on disk that no event references does nothing and reports nothing —
 * the failure mode is a gate everyone believes is running. settings.json is the
 * user's file, holding permissions, env and model choices this installer has no
 * business rewriting, so the wiring is reported and never applied.
 */
async function reportHookWiring(ctx, dest, files) {
  const settings = path.join(os.homedir(), ".claude", "settings.json");

  let parsed = {};
  if (existsSync(settings)) {
    try {
      parsed = JSON.parse(await readFile(settings, "utf8"));
    } catch {
      ctx.log("  ~/.claude/settings.json is not valid JSON — cannot check hook wiring");
      return;
    }
  }

  const hooks = parsed.hooks ?? {};
  const missing = []; // [file, event, matcher]
  for (const file of files) {
    const events = HOOK_EVENTS[file];
    if (!events) {
      // A hook this map does not describe: the most that can be said is whether
      // anything references it at all.
      if (!JSON.stringify(hooks).includes(file)) missing.push([file, null, null]);
      continue;
    }
    for (const [event, matcher] of Object.entries(events)) {
      if (!JSON.stringify(hooks[event] ?? []).includes(file)) missing.push([file, event, matcher]);
    }
  }
  if (!missing.length) return;

  ctx.log("");
  for (const file of new Set(missing.map(([f]) => f))) {
    const events = missing.filter(([f, e]) => f === file && e).map(([, e]) => e);
    ctx.log(`  ${file} is not referenced by ~/.claude/settings.json${events.length ? ` under: ${events.join(", ")}` : ""}`);
  }
  ctx.log("  A hook the runtime never calls fails silently. Add under \"hooks\" in settings.json:");
  for (const [file, event, matcher] of missing) {
    const cmd = path.join(dest, file).split(path.sep).join("/");
    const entry = `{ ${matcher ? `"matcher": "${matcher}", ` : ""}"hooks": [{ "type": "command", "command": "node ${cmd}" }] }`;
    ctx.log(event ? `    "${event}": [${entry}]` : `    ${entry}`);
  }
}

async function syncReference(ctx) {
  // The roster says who exists and what each one owns, and is runtime-neutral.
  await syncBlock(path.join(REFERENCE_DIR, "agents-block.md"), path.join(os.homedir(), "AGENTS.md"), ROSTER, ctx);

  // Claude Code reads ~/.claude/CLAUDE.md. The routing block only points at
  // ~/AGENTS.md in plain text: projects live under a folder that contains it, so
  // Claude Code already loads it as an ancestor, and an `@` import would load it
  // a second time.
  const claudeMd = path.join(os.homedir(), ".claude", "CLAUDE.md");

  // The Claude Code mechanics — hooks and their enforcement — mean nothing to
  // Codex, so they stay out of the runtime-neutral roster. A CLAUDE.md that does not exist yet is created by
  // this call with the routing block as its entire content.
  await syncBlock(path.join(REFERENCE_DIR, "routing-block.md"), claudeMd, ROUTING, ctx);

  await installSkills(ctx);
}

/**
 * Skills are the on-demand half of the reference: the roster keeps one
 * always-loaded line per rule and points at the skill for the rationale, so the
 * rule never disappears when the skill is not loaded. Claude Code discovers
 * them under ~/.claude/skills; Codex under $HOME/.agents/skills (checked
 * against OpenAI's skills documentation, "Build skills", user scope). Every file
 * in a skill's directory goes, not only SKILL.md: Codex reads its invocation
 * policy from agents/openai.yaml beside it.
 */
// Relative paths of every file below dir. Walked by hand: readdir's recursive
// option needs Node 18.17, and engines accepts any 18.
async function filesUnder(dir, prefix = "") {
  const out = [];
  for (const e of await readdir(path.join(dir, prefix), { withFileTypes: true })) {
    const rel = path.join(prefix, e.name);
    if (e.isDirectory()) out.push(...(await filesUnder(dir, rel)));
    else if (e.isFile()) out.push(rel);
  }
  return out.sort();
}

async function installSkills(ctx) {
  if (!existsSync(SKILLS_DIR)) return;
  const names = (await readdir(SKILLS_DIR, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && existsSync(path.join(SKILLS_DIR, e.name, "SKILL.md")))
    .map((e) => e.name)
    .sort();
  if (!names.length) return;

  const roots = [path.join(os.homedir(), ".claude", "skills"), path.join(os.homedir(), ".agents", "skills")];
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
      "Refusing: this is agent-team-config itself, the source of truth.\n" +
        "Run this from the project that should receive the specialists.",
    );
  }

  const known = new Map(specialists(agents).map((a) => [a.name, a]));
  for (const name of names) {
    if (!known.has(name)) {
      const isCore = core(agents).some((a) => a.name === name);
      throw new Error(
        isCore
          ? `${name} is a core agent — install it with 'agent-team-config install'.`
          : `Not a domain specialist: ${name}\nSpecialists: ${[...known.keys()].join(" ")}`,
      );
    }
  }

  // Three runtimes now, not two: Claude Code reads .claude/agents/<name>.md,
  // Codex reads .codex/agents/<name>.toml, and the AGENTS.md block below is
  // what tells Codex's main agent when to reach for one.
  const agentsDir = path.join(project, ".claude", "agents");
  const codexDir = path.join(project, ".codex", "agents");
  await ctx.mkdir(agentsDir);
  await ctx.mkdir(codexDir);

  for (const name of names) {
    const target = path.join(agentsDir, `${name}.md`);
    const codexTarget = path.join(codexDir, `${name}.toml`);
    if (remove) {
      if (existsSync(target) || existsSync(codexTarget)) {
        await ctx.remove(target);
        await ctx.remove(codexTarget);
        ctx.log(`Removed ${name} from .claude/agents/ and .codex/agents/`);
      } else {
        ctx.log(`Not installed: ${name}`);
      }
    } else {
      await ctx.copy(known.get(name).file, target);
      await ctx.write(codexTarget, codexAgent(known.get(name)));
      ctx.log(`Installed ${name} -> .claude/agents/${name}.md, .codex/agents/${name}.toml`);
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
  const [start, end] = PROJECT_SPECIALISTS;
  const raw = existsSync(target) ? await readFile(target, "utf8") : "";
  // Compare and edit in LF, write back in the file's own line ending (see usesCrlf).
  const crlf = usesCrlf(raw);
  const original = toLf(raw);
  const pattern = new RegExp(`\\n*${esc(start)}[\\s\\S]*?${esc(end)}\\n*`);
  const inPlace = new RegExp(`${esc(start)}[\\s\\S]*?${esc(end)}`);
  const had = pattern.test(original);

  if (!installed.length) {
    // No specialists left: drop the block entirely rather than leave an empty one.
    if (!had) return ctx.log("No specialist block in AGENTS.md");
    const stripped = original.replace(pattern, "\n").trim();
    await ctx.write(target, toEol(stripped ? `${stripped}\n` : "", crlf));
    return ctx.log("Removed specialist block from AGENTS.md");
  }

  const label = { veto: "veto", blocks: "blocks", none: "no veto" };
  const entries = installed
    .map((a) => `- **${a.name}** (${label[a.authority]}) — ${summary.get(a.name) ?? "specialist."}`)
    .join("\n");
  const managed = `${start}
# Project subagents

Besides the core team (see ~/AGENTS.md), this project installs the specialists below.
Use the Agent tool to delegate to them when the request clearly fits their role.

${entries}

A specialist is in play when its domain is, not for completeness.
Installed by canonkit: \`npx canonkit add|remove <name>\` changes this list, and
the files in .claude/agents/ are copies the next add overwrites.
${end}`;

  // Rewrite the block where it stands: whatever surrounds it is the user's, and
  // re-running with the same specialists must leave the file byte-identical.
  const lf = had
    ? original.replace(inPlace, () => managed)
    : (original.trim() ? `${original.replace(/\s+$/, "")}\n\n` : "") + managed + "\n";
  const text = toEol(lf, crlf);

  if (text === raw) return ctx.log("already current: AGENTS.md");
  await ctx.write(target, text);
  ctx.log(`${had ? "Updated" : "Added"} specialist block in AGENTS.md`);
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
}

/* -------------------------------------------------------------------- main */

function usage() {
  return `canonkit — a versioned agent team for Claude Code and Codex

Usage:
  canonkit install [--no-reference]   install the core team at user level
  canonkit reference                  sync only the global reference blocks
  canonkit add <name>...              add domain specialists to this project
  canonkit remove <name>...           remove domain specialists from this project
  canonkit list                       show the roster and what is installed

Options:
  --dry-run       report what would change without writing anything
  -h, --help      show this
  -v, --version   show the package version

Core agents install to ~/.agents and ~/.claude/agents. Specialists install to
the current project's .claude/agents/ and are registered in its AGENTS.md.`;
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
    mkdir: async (p) => {
      if (!dryRun) await mkdir(p, { recursive: true });
    },
    copy: async (from, to) => {
      if (!dryRun) await copyFile(from, to);
    },
    remove: async (p) => {
      if (!dryRun) await rm(p, { force: true });
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

const KNOWN_FLAGS = ["--dry-run", "--no-reference", "--remove", "-h", "--help", "-v", "--version"];

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

  switch (command) {
    case "install":
      await install(ctx, { reference: !flags.includes("--no-reference") });
      return 0;
    case "reference":
      await syncReference(ctx);
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

export { applyBlock, readAgents, parseAgent, summaries, codexAgent, CODEX_MODELS };

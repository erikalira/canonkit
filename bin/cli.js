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
import { readdir, readFile, writeFile, mkdir, copyFile, rm, rename } from "node:fs/promises";
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { resolveBin, projectOnlyHit, runBin, binVersion, display, SAFE_ARG } from "./exec.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AGENTS_DIR = path.join(PACKAGE_ROOT, "agents");
const REFERENCE_DIR = path.join(PACKAGE_ROOT, "reference");
const HOOKS_DIR = path.join(PACKAGE_ROOT, "hooks");
const DASHBOARD_DIR = path.join(PACKAGE_ROOT, "dashboard");
const SKILLS_DIR = path.join(PACKAGE_ROOT, "skills");
const TOOLS_DIR = path.join(PACKAGE_ROOT, "tools");

// Every event each hook must be registered under, with the matcher it needs
// there (null: no matcher). Checked per event, not per file: a hook wired to
// some of its events half-works, which hides better than not working — the gates
// fire, so nobody goes looking for the dispatch metrics that are never written.
const HOOK_EVENTS = {
  "canonkit-hook.js": {
    PreToolUse: "Edit|Write|MultiEdit|NotebookEdit|Bash|PowerShell|Agent|Task",
    PostToolUse: "Agent|Task|Read|Grep|Glob|Bash|PowerShell",
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
  await upgradeFromMeuTime(ctx, path.join(os.homedir(), ".claude"));
  await installDashboard(ctx, path.join(os.homedir(), ".claude", "canonkit-dashboard"));

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
 * file always becomes a forwarder, never disappears. Its previous contents are
 * kept as .local.bak — there is no shipped copy left to tell an edit from.
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
// The hook rotates its log at 2 MB. A merged log is split so the live file starts
// well under that: otherwise the first append rotates all of it out of the file
// the Stop gate reads, current session included.
const LOG_TAIL_BYTES = 1024 * 1024;

async function upgradeFromMeuTime(ctx, claudeDir) {
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
    // An older forwarder is refreshed too: the hook no longer runs on a bare require().
    if (current !== HOOK_FORWARDER) await ctx.write(oldHook, HOOK_FORWARDER);
    if (settingsMention(claudeDir, LEGACY.hook)) {
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
      const entries = hooks[event] ?? [];
      const referenced = JSON.stringify(entries).includes(file);
      // An existing Agent|Task registration still runs dispatch metrics, but
      // silently misses main-thread volume. Report replacement wiring, never
      // edit settings.json or recommend a second overlapping registration.
      const covered = event !== "PostToolUse" || matcher.split("|").every((tool) =>
        Array.isArray(entries) && entries.some((entry) => {
          if (!JSON.stringify(entry.hooks ?? []).includes(file)) return false;
          if (!entry.matcher || entry.matcher === "*") return true;
          try { return new RegExp(entry.matcher).test(tool); } catch { return false; }
        }),
      );
      if (!referenced || !covered) missing.push([file, event, matcher]);
    }
  }
  if (!missing.length) return;

  ctx.log("");
  for (const file of new Set(missing.map(([f]) => f))) {
    const events = missing.filter(([f, e]) => f === file && e).map(([, e]) => e);
    ctx.log(`  ${file} is not referenced by ~/.claude/settings.json with required coverage${events.length ? ` under: ${events.join(", ")}` : ""}`);
  }
  ctx.log("  A hook the runtime never calls fails silently. Add under \"hooks\" in settings.json:");
  ctx.log("  If an entry already exists, update its matcher instead of adding a duplicate hook.");
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
      "Refusing: this is agent-team-config itself, the source of truth.\n" +
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
  return `canonkit — a versioned agent team for Claude Code and Codex

Usage:
  canonkit install [--no-reference]   install the core team at user level
  canonkit reference                  sync only the global reference blocks
  canonkit add <name>...              add domain specialists to this project
  canonkit remove <name>...           remove domain specialists from this project
  canonkit list                       show the roster and what is installed
  canonkit tool add <tool> [--yes]    run an installed tool's setup here (graphify, openspec)
  canonkit tool remove <tool>         take a tool out of this project's AGENTS.md
  canonkit tool list                  show the tools, their pins, and which are active here

Options:
  --dry-run       report what would change without writing (or running) anything
  --yes           tool add: skip the confirmation prompt
  --with-git-hooks tool add graphify: opt in to automatic Git hooks and merge driver
  -h, --help      show this
  -v, --version   show the package version

Core agents install to ~/.agents and ~/.claude/agents. Specialists install to
the current project's .claude/agents/ and are registered in its AGENTS.md.
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
    // For a file the user owns (a project's AGENTS.md): an interrupted write
    // leaves the old file or the new one, never half of the user's instructions.
    writeAtomic: async (target, text) => {
      if (dryRun) return;
      // Write through a symlink (AGENTS.md -> CLAUDE.md is a common setup):
      // renaming onto the link itself would replace it with a plain file and
      // let the two drift apart.
      const p = existsSync(target) ? realpathSync(target) : target;
      await mkdir(path.dirname(p), { recursive: true });
      const tmp = `${p}.canonkit-${process.pid}.tmp`;
      try {
        await writeFile(tmp, text);
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

const KNOWN_FLAGS = ["--dry-run", "--no-reference", "--remove", "--yes", "--with-git-hooks", "-h", "--help", "-v", "--version"];

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
  readAgents,
  parseAgent,
  summaries,
  codexAgent,
  CODEX_MODELS,
  replaceProjectBlock,
  readProjectBlock,
  readTools,
  parseTool,
};

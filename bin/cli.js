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

// Two runtimes read different files, and forgetting either one is the failure
// these markers exist to prevent. Claude Code reads .claude/agents/ and
// ~/.claude/CLAUDE.md; Codex reads AGENTS.md and never looks at .claude/.
const ROSTER = ["<!-- agent-team-config:start -->", "<!-- agent-team-config:end -->"];
const ROUTING = ["<!-- agent-team-config:routing:start -->", "<!-- agent-team-config:routing:end -->"];
const PROJECT_SPECIALISTS = [
  "<!-- agent-team-config:specialists:start -->",
  "<!-- agent-team-config:specialists:end -->",
];

// Tilde-style so the import resolves in every runtime. Under Git Bash on
// Windows an expanded $HOME is an MSYS path (/c/Users/...) that Claude Code
// cannot resolve; "~" is correct on all three platforms.
const AGENTS_IMPORT = "@~/AGENTS.md";

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
    const name = path.basename(file, ".md");
    const text = await readFile(path.join(AGENTS_DIR, file), "utf8");
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

    agents.push({
      name,
      tier: front.tier,
      model: front.model,
      description: front.description ?? "",
      // Everything after the frontmatter is the agent's actual instructions.
      // Claude Code reads the file as-is; Codex needs them as a TOML field.
      body: text.slice(end + 4).replace(/^\n+/, ""),
      file: path.join(AGENTS_DIR, file),
    });
  }

  if (!agents.length) throw new Error(`No agents found in ${AGENTS_DIR}`);
  return agents;
}

const core = (agents) => agents.filter((a) => a.tier === "core");
const specialists = (agents) => agents.filter((a) => a.tier === "specialist");

/**
 * The one-line summary written into a project's AGENTS.md, read out of the
 * roster block rather than kept in a second list here. The trailing "Aciona
 * quando ..." sentence is guidance for choosing an agent, not a description of
 * one, so it stays in the roster and out of the per-project entry.
 */
async function summaries() {
  const block = await readFile(path.join(REFERENCE_DIR, "agents-block.md"), "utf8");
  const out = new Map();
  for (const line of block.split("\n")) {
    const m = /^-\s+\*\*([a-z0-9-]+)\*\*\s+—\s+(.*)$/.exec(line.trim());
    if (m) out.set(m[1], m[2].replace(/\s*Aciona quando[^.]*\.\s*$/i, "").trim());
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
  const blockText = await readFile(blockPath, "utf8");
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

async function syncReference(ctx) {
  // The roster says who exists and what each one owns, and is runtime-neutral.
  await syncBlock(path.join(REFERENCE_DIR, "agents-block.md"), path.join(os.homedir(), "AGENTS.md"), ROSTER, ctx);

  // Claude Code reads ~/.claude/CLAUDE.md. Ensure it imports AGENTS.md rather
  // than carrying a second copy that can drift.
  const claudeMd = path.join(os.homedir(), ".claude", "CLAUDE.md");
  await ctx.mkdir(path.dirname(claudeMd));
  const current = existsSync(claudeMd) ? await readFile(claudeMd, "utf8") : null;

  if (current === null) {
    await ctx.write(claudeMd, `${AGENTS_IMPORT}\n`);
    ctx.log(`Created ${claudeMd} with import`);
  } else if (/^@.*AGENTS\.md[ \t]*$/m.test(current)) {
    // Match any existing AGENTS.md import, not just this $HOME's exact path, so
    // a moved home or a tilde-style import is not duplicated.
    ctx.log(`already current: ${claudeMd} (imports AGENTS.md)`);
  } else {
    await ctx.write(claudeMd, `${AGENTS_IMPORT}\n${current}`);
    ctx.log(`Added import to ${claudeMd}`);
  }

  // The routing rules are Claude Code mechanics — subagent_type, model floors,
  // hooks, parallelism — which mean nothing to Codex, so they stay out of the
  // runtime-neutral roster. Synced after the import so a freshly created
  // CLAUDE.md keeps the import on its first line.
  await syncBlock(path.join(REFERENCE_DIR, "routing-block.md"), claudeMd, ROUTING, ctx);
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
  const original = existsSync(target) ? await readFile(target, "utf8") : "";
  const pattern = new RegExp(`\\n*${esc(start)}[\\s\\S]*?${esc(end)}\\n*`);
  const had = pattern.test(original);

  if (!installed.length) {
    // No specialists left: drop the block entirely rather than leave an empty one.
    if (!had) return ctx.log("No specialist block in AGENTS.md");
    const stripped = original.replace(pattern, "\n").trim();
    await ctx.write(target, stripped ? `${stripped}\n` : "");
    return ctx.log("Removed specialist block from AGENTS.md");
  }

  const entries = installed.map((a) => `- **${a.name}** — ${summary.get(a.name) ?? "specialist."}`).join("\n");
  const managed = `${start}
# subagentes deste projeto

Além do core (ver ~/AGENTS.md), este projeto instala os specialists abaixo. Use o
Agent tool para delegar a eles quando o pedido se encaixar claramente no papel.

${entries}

Um specialist entra quando o domínio dele está em jogo, não por completude.
Fonte de verdade: repositório agent-team-config. Não edite os arquivos em
.claude/agents/ — eles são cópias.
${end}`;

  const text = had
    ? `${original.replace(pattern, `\n\n${managed}\n`).trim()}\n`
    : (original.trim() ? `${original.replace(/\s+$/, "")}\n\n` : "") + managed + "\n";

  if (text === original) return ctx.log("already current: AGENTS.md");
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

export { applyBlock, readAgents, summaries, codexAgent, CODEX_MODELS };

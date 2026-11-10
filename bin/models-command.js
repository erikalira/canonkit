/**
 * `canonkit models refresh | show | setup`, and the doctor checks over the
 * same files.
 *
 * refresh  asks each harness what it offers (model-discovery.js)
 * setup    lets the person map need levels, and optionally agents, onto what
 *          was discovered (model-config.js)
 * show     prints what each agent resolves to and which layer said so
 *
 * Only refresh and setup start a program; show and the doctor checks read
 * stored files only. This change applies choices to Claude Code; the other
 * harnesses inherit the session model until their adapters land, and show
 * says so rather than printing values nothing acts on.
 */
import { createInterface } from "node:readline";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { HARNESSES, catalogPath, readCatalog, refreshCatalog } from "./model-discovery.js";
import { APPLIED, userConfigPath, projectConfigPath, projectRoot, readChoices, writeChoices, setChoice, resolve } from "./model-config.js";

const NEED_ORDER = ["deep", "standard", "light"];
// The shape of `models show --json`. Bumped only when a field changes meaning;
// added fields keep it. `source` is display text: consumers read `value`.
const SHOW_VERSION = 1;
const STALE_DAYS = 30;
const LABEL = { claude: "Claude Code", codex: "Codex", opencode: "OpenCode", copilot: "GitHub Copilot" };

const day = (iso) => (typeof iso === "string" ? iso.slice(0, 10) : "unknown date");

/**
 * The layers that apply from `cwd`: user always; project when the project
 * (the repository root, see projectRoot) has a choices file.
 */
async function loadLayers({ home = os.homedir(), cwd = process.cwd() } = {}) {
  const base = await projectRoot(cwd, home);
  const root = base && existsSync(projectConfigPath(base)) ? base : null;
  return {
    root,
    user: await readChoices(userConfigPath(home)),
    project: root ? await readChoices(projectConfigPath(root), { project: true }) : null,
  };
}

/** Every agent's resolution for every harness, in the shape `show --json` prints. */
function effective(agents, layers, catalog, harnesses = HARNESSES) {
  const out = { version: SHOW_VERSION, project: layers.root, harnesses: {} };
  for (const harness of harnesses) {
    const record = catalog?.harnesses?.[harness] ?? null;
    // Whether a model value is an alias, which is all Claude Code's Agent tool
    // takes as its `model` parameter: by the discovery when there is one, else
    // by shape (an alias is one lowercase word; a full ID has digits or dashes).
    const aliases = record?.status === "discovered" ? record.models.map((m) => m.id) : null;
    const alias = (v) => (v === null ? null : aliases ? aliases.includes(v) : /^[a-z]+$/.test(v));
    const entry = {
      applied: APPLIED.includes(harness),
      catalog: record ? { status: record.status, discoveredAt: record.discoveredAt ?? null, ...(record.reason ? { reason: record.reason } : {}) } : { status: "missing" },
      agents: {},
    };
    for (const agent of agents) {
      const r = entry.applied ? resolve(agent, harness, layers) : null;
      const inherit = { value: null, source: "inherit", unverified: false };
      const model = r?.model ?? inherit;
      entry.agents[agent.name] = { need: agent.need, model: { ...model, alias: alias(model.value) }, effort: r?.effort ?? inherit };
    }
    out.harnesses[harness] = entry;
  }
  return out;
}

async function show(ctx, agents, { json = false, harnesses = HARNESSES, home, cwd } = {}) {
  const layers = await loadLayers({ home, cwd });
  let catalog = null;
  try {
    catalog = await readCatalog(catalogPath(home));
  } catch {
    catalog = null;
  }
  const data = effective(agents, layers, catalog, harnesses);
  if (json) {
    ctx.log(JSON.stringify(data, null, 2));
    return 0;
  }
  ctx.log(`User choices: ${userConfigPath(home)}`);
  ctx.log(`Project choices: ${layers.root ? projectConfigPath(layers.root) : "none found from here"}`);
  const cell = (f) => (f.value === null ? "inherit" : `${f.value}${f.unverified ? "?" : ""} (${f.source})`);
  for (const [harness, entry] of Object.entries(data.harnesses)) {
    ctx.log("");
    const c = entry.catalog;
    const catalogNote = c.status === "missing" ? "no discovery yet" : c.status === "discovered" ? `discovered ${day(c.discoveredAt)}` : `unknown: ${c.reason ?? "no reason recorded"}`;
    if (!entry.applied) {
      ctx.log(`${LABEL[harness] ?? harness}: every agent inherits the session model and effort (model selection not yet supported; catalog: ${catalogNote})`);
      continue;
    }
    ctx.log(`${LABEL[harness] ?? harness} (catalog: ${catalogNote})`);
    for (const [name, a] of Object.entries(entry.agents)) {
      ctx.log(`  ${name.padEnd(10)} ${a.need.padEnd(9)} model: ${cell(a.model).padEnd(34)} effort: ${cell(a.effort)}`);
    }
  }
  if (Object.values(data.harnesses).some((h) => Object.values(h.agents).some((a) => a.model.unverified || a.effort.unverified))) {
    ctx.log("");
    ctx.log("? = not in the latest discovery (entered by hand)");
  }
  return 0;
}

async function refresh(ctx, { harnesses = HARNESSES, run, now, home, keepWithin = 0 } = {}) {
  if (ctx.dryRun) {
    ctx.log(`would run model discovery for: ${harnesses.join(", ")} (not run in a dry run)`);
    return 0;
  }
  const data = await refreshCatalog(harnesses, { run, now, file: catalogPath(home), keepWithin });
  for (const harness of harnesses) {
    const h = data.harnesses[harness];
    if (h.status === "discovered") {
      const efforts = [...new Set(h.models.flatMap((m) => m.efforts))];
      ctx.log(`${LABEL[harness]}: ${h.models.map((m) => m.id).join(", ")}; efforts ${efforts.join(", ")} (from ${h.source}, ${h.confidence})`);
    } else {
      ctx.log(`${LABEL[harness]}: unknown — ${h.reason}; its agents inherit the session model`);
    }
  }
  ctx.log(`Catalog: ${catalogPath(home)}`);
  return 0;
}

/**
 * A line reader over any stream: setup is driven by a person at a terminal,
 * and by scripted stdin in tests. null means the input ended.
 */
function lineReader(input, output) {
  const rl = createInterface({ input, terminal: false });
  const lines = [];
  const waiting = [];
  let closed = false;
  rl.on("line", (line) => (waiting.length ? waiting.shift()(line) : lines.push(line)));
  rl.on("close", () => {
    closed = true;
    while (waiting.length) waiting.shift()(null);
  });
  return {
    ask(question) {
      output.write(question);
      if (lines.length) return Promise.resolve(lines.shift());
      if (closed) return Promise.resolve(null);
      return new Promise((r) => waiting.push(r));
    },
    close: () => rl.close(),
  };
}

class Aborted extends Error {}

/**
 * Ask for one model and effort. Enter keeps the current value, "-" clears it
 * (inherit). A model outside the discovered list is accepted only after an
 * explicit yes and is recorded unverified; an effort outside the list is
 * refused and asked again. Returns the entry to store, or null for none.
 */
async function askEntry(io, log, label, current, offer) {
  const read = async (q) => {
    const answer = await io.ask(q);
    if (answer === null) throw new Aborted();
    return answer.trim();
  };
  const now = (v) => (v ? `current: ${v}` : "current: inherit");
  const entry = { ...(current ?? {}) };
  delete entry.unverified;
  let unverified = current?.unverified === true;

  const model = await read(`${label} model [${offer.models.join(", ") || "none discovered"}] (${now(current?.model)}; Enter keeps, - inherits): `);
  if (model === "-") {
    delete entry.model;
    unverified = false;
  } else if (model) {
    if (offer.models.includes(model)) {
      entry.model = model;
      unverified = false;
    } else {
      const yes = await read(`  '${model}' is not in the discovered list. Record it as unverified? [y/N] `);
      if (/^y(es)?$/i.test(yes)) {
        entry.model = model;
        unverified = true;
      } else log("  kept the previous model");
    }
  }

  for (;;) {
    const effort = await read(`${label} effort [${offer.efforts.join(", ") || "none discovered"}] (${now(current?.effort)}; Enter keeps, - inherits): `);
    if (effort === "-") delete entry.effort;
    else if (effort) {
      if (offer.efforts.length && !offer.efforts.includes(effort)) {
        log(`  '${effort}' is not an effort Claude Code reported. Reported: ${offer.efforts.join(", ")}`);
        continue;
      }
      entry.effort = effort;
      // With no discovery to check against, a typed effort is unverified too.
      if (!offer.efforts.length) unverified = true;
    }
    break;
  }
  if (unverified && (entry.model !== undefined || entry.effort !== undefined)) entry.unverified = true;
  return Object.keys(entry).length ? entry : null;
}

async function setup(ctx, agents, { project = false, harnesses = ["claude"], input = process.stdin, output = process.stdout, isTTY = !!(process.stdin.isTTY && process.stdout.isTTY), run, now, home = os.homedir(), cwd = process.cwd() } = {}) {
  let file = userConfigPath(home);
  if (project) {
    const root = await projectRoot(cwd, home);
    if (!root) throw new Error("models setup --project: no project here; run it inside a repository (your home folder holds the user choices)");
    file = projectConfigPath(root);
  }
  const unsupported = harnesses.filter((h) => !APPLIED.includes(h));
  if (unsupported.length) ctx.log(`${unsupported.map((h) => LABEL[h]).join(", ")}: model selection not yet supported; agents inherit the session model`);
  if (!harnesses.includes("claude")) return 0;
  if (!isTTY) {
    throw new Error(`models setup needs a terminal. Without one, edit ${file} directly (format: docs/install.md, "Choosing models")`);
  }
  if (ctx.dryRun) {
    ctx.log(`would ask for Claude Code choices and write ${file}`);
    return 0;
  }
  // Read before discovery: an unsupported file stops here, before anything runs.
  const doc = await readChoices(file, { project });
  const catalog = await refreshCatalog(["claude"], { run, now, file: catalogPath(home) });
  const claude = catalog.harnesses.claude;
  const offer = claude.status === "discovered"
    ? { models: claude.models.map((m) => m.id), efforts: [...new Set(claude.models.flatMap((m) => m.efforts))] }
    : { models: [], efforts: [] };
  const log = (m) => output.write(`${m}\n`);
  if (claude.status !== "discovered") log(`Claude Code discovery: unknown — ${claude.reason}. Anything you type is recorded as unverified.`);

  const io = lineReader(input, output);
  try {
    log(`Choosing Claude Code models for ${project ? `this project (${file})` : `you (${file})`}.`);
    log("Need levels first; each agent uses its level unless you override it.");
    for (const need of NEED_ORDER) {
      const users = agents.filter((a) => a.need === need).map((a) => a.name);
      const label = `${need} (${users.length ? users.join(", ") : "no agents today"})`;
      const current = doc.harnesses?.claude?.levels?.[need];
      setChoice(doc, "claude", "levels", need, await askEntry(io, log, label, current, offer));
    }
    const names = agents.map((a) => a.name);
    for (;;) {
      const answer = await io.ask("Optional: override one agent (name, or Enter to finish): ");
      if (answer === null) throw new Aborted();
      const name = answer.trim();
      if (!name) break;
      if (!names.includes(name)) {
        log(`  not an agent: ${name}. Agents: ${names.join(", ")}`);
        continue;
      }
      const current = doc.harnesses?.claude?.agents?.[name];
      setChoice(doc, "claude", "agents", name, await askEntry(io, log, `${name} override`, current, offer));
    }
  } catch (err) {
    if (err instanceof Aborted) throw new Error(`models setup: input ended before the questions did; nothing was written to ${file}`);
    throw err;
  } finally {
    io.close();
  }
  for (const kind of ["levels", "agents"]) if (doc.harnesses?.claude?.[kind] && !Object.keys(doc.harnesses.claude[kind]).length) delete doc.harnesses.claude[kind];
  if (doc.harnesses?.claude && !Object.keys(doc.harnesses.claude).length) delete doc.harnesses.claude;
  await writeChoices(file, doc, { project });
  ctx.log(`Saved ${file}`);
  ctx.log("Run npx canonkit install --claude to write the defaults into your agents; check with npx canonkit models show");
  return 0;
}

/**
 * Doctor rows for model selection, from stored files only. Every finding is a
 * WARN: a missing or unverified choice does not break anything, the agent
 * falls back to inherit.
 */
async function modelDiagnosis(agents, { home = os.homedir(), cwd = process.cwd(), now = new Date() } = {}) {
  const rows = [];
  const add = (status, detail) => rows.push({ status, check: "models", detail });
  let layers;
  try {
    layers = await loadLayers({ home, cwd });
  } catch (err) {
    add("WARN", `${err.message} — its choices are ignored and agents fall back to inherit`);
    return rows;
  }
  const docs = [["user", layers.user], ["project", layers.project]].filter(([, d]) => d?.harnesses?.claude);
  if (!docs.length) {
    add("OK", "no model choices configured; every agent inherits the session model (canonkit models setup to choose)");
    return rows;
  }
  let catalog = null;
  try {
    catalog = await readCatalog(catalogPath(home));
  } catch (err) {
    add("WARN", `${err.message}`);
  }
  const claude = catalog?.harnesses?.claude;
  if (!claude) add("WARN", "no Claude Code discovery recorded; configured models cannot be checked — run npx canonkit models refresh");
  else if (claude.status !== "discovered") add("WARN", `Claude Code discovery is unknown (${claude.reason}); configured models cannot be checked`);
  else {
    const age = (now - new Date(claude.discoveredAt)) / 86400000;
    if (!(age <= STALE_DAYS)) add("WARN", `Claude Code discovery is from ${day(claude.discoveredAt)}, older than ${STALE_DAYS} days — run npx canonkit models refresh`);
  }
  const models = claude?.status === "discovered" ? claude.models.map((m) => m.id) : null;
  const efforts = claude?.status === "discovered" ? [...new Set(claude.models.flatMap((m) => m.efforts))] : null;

  const usedBy = (layer, kind, name) => {
    // Agents whose effective choice comes from this entry.
    const source = `${layer} ${kind === "levels" ? "level" : "agent override"}`;
    return agents.filter((a) => (kind === "levels" ? a.need === name : a.name === name)).filter((a) => {
      const r = resolve(a, "claude", layers);
      return r.model.source === source || r.effort.source === source;
    }).map((a) => a.name);
  };
  // A project file comes with the repository. Where it changes what an agent
  // would run on with the person's own choices, say so: a cloned repository
  // could quietly weaken a reviewer or raise every effort.
  if (layers.project) {
    const changed = [];
    for (const a of agents) {
      const mine = resolve(a, "claude", { user: layers.user });
      const here = resolve(a, "claude", layers);
      for (const f of ["model", "effort"]) {
        if (here[f].source.startsWith("project") && here[f].value !== mine[f].value) changed.push(`${a.name} ${f} ${mine[f].value ?? "inherit"} → ${here[f].value}`);
      }
    }
    if (changed.length) add("WARN", `project choices in ${projectConfigPath(layers.root)} override yours: ${changed.join(", ")} — check them before trusting a repository you did not write`);
  }
  let problems = 0;
  for (const [layer, d] of docs) {
    for (const kind of ["levels", "agents"]) {
      for (const [name, entry] of Object.entries(d.harnesses.claude[kind] ?? {})) {
        const where = `${layer} ${kind === "levels" ? "level" : "agent"} ${name}`;
        const affected = usedBy(layer, kind, name);
        const who = affected.length ? `agents ${affected.join(", ")}` : "no agent currently";
        const issues = [];
        if (entry.unverified) issues.push("is marked unverified (entered by hand)");
        if (models && entry.model !== undefined && !models.includes(entry.model)) issues.push(`model '${entry.model}' is not in the latest discovery (${models.join(", ")})`);
        if (efforts && entry.effort !== undefined && !efforts.includes(entry.effort)) issues.push(`effort '${entry.effort}' is not in the latest discovery (${efforts.join(", ")})`);
        if (issues.length) {
          problems++;
          add("WARN", `Claude Code ${where}: ${issues.join("; ")} — affects ${who}; if Claude Code rejects it they fall back to inherit`);
        }
      }
    }
  }
  if (!problems && !rows.some((r) => r.status === "WARN")) add("OK", `Claude Code choices match the discovery of ${day(claude.discoveredAt)}`);
  return rows;
}

export { show, refresh, setup, effective, loadLayers, modelDiagnosis, STALE_DAYS, SHOW_VERSION };

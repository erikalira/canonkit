/**
 * `canonkit models refresh | show | setup`, and the doctor checks over the
 * same files.
 *
 * refresh  asks each harness what it offers (model-discovery.js)
 * setup    lets the person map need levels, and optionally agents, onto what
 *          was discovered (model-config.js)
 * show     prints what each agent resolves to and which layer said so
 *
 * Only refresh and setup start a program; show and doctor read stored files.
 * Claude Code and Codex apply choices; the other harnesses inherit.
 */
import { describeRestriction } from "./agent-access.js";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { HARNESSES, catalogPath, readCatalog, refreshCatalog, writeCatalog } from "./model-discovery.js";
import { APPLIED, userConfigPath, projectConfigPath, projectRoot, readChoices, writeChoices, setChoice, resolve, VALUE } from "./model-config.js";
import { repositoryRoot, projectStateDir, safePath } from "./security.js";

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
function effective(agents, layers, catalog, harnesses = HARNESSES, codexDeployment = {}) {
  const out = { version: SHOW_VERSION, project: layers.root, harnesses: {} };
  for (const harness of harnesses) {
    const record = catalog?.harnesses?.[harness] ?? null;
    // Whether a model value is an alias, which is all Claude Code's Agent tool
    // takes as its `model` parameter: by the discovery when there is one, else
    // by shape (an alias is one lowercase word; a full ID has digits or dashes).
    const aliases = record?.status === "discovered" ? record.models.map((m) => m.id) : null;
    // A discovered catalog also lists full IDs (from availableModels), so
    // membership alone is not enough: the value must also have the alias shape,
    // one lowercase word with an optional [suffix] such as sonnet[1m].
    const aliasShape = /^[a-z]+(\[[^\]]+\])?$/;
    const alias = (v) => (v === null ? null : aliasShape.test(v) && (aliases ? aliases.includes(v) : true));
    const entry = {
      applied: APPLIED.includes(harness),
      catalog: record ? { status: record.status, discoveredAt: record.discoveredAt ?? null, ...(record.reason ? { reason: record.reason } : {}), ...(record.confidence ? { confidence: record.confidence } : {}), ...(record.accountAvailability ? { accountAvailability: record.accountAvailability } : {}) } : { status: "missing" },
      agents: {},
    };
    for (const agent of agents) {
      const r = entry.applied ? resolve(agent, harness, layers) : null;
      const inherit = { value: null, source: "inherit", unverified: false };
      const model = r?.model ?? inherit;
      entry.agents[agent.name] = { need: agent.need, access: agent.access ?? null, restriction: describeRestriction(agent.access, harness), model: { ...model, alias: alias(model.value) }, effort: r?.effort ?? inherit,
        ...(harness === "codex" && codexDeployment[agent.name] ? { projectFile: codexDeployment[agent.name] } : {}) };
    }
    out.harnesses[harness] = entry;
  }
  return out;
}

async function readSmall(file, limit = 1024 * 1024) {
  await safePath(file);
  let info;
  try { info = await stat(file); } catch (err) { if (err.code === "ENOENT") return null; throw err; }
  if (!info.isFile() || info.size > limit) throw new Error("not a small regular file");
  return readFile(file);
}

function tomlField(bytes, field) {
  const match = bytes.toString("utf8").match(new RegExp(`^${field} = ("[^"\\r\\n]*")\\r?$`, "m"));
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

/** Read-only check of the installed project file against its receipt and choices. */
async function inspectCodexProjectFiles(agents, layers, catalog, { home = os.homedir(), cwd = process.cwd() } = {}) {
  const root = await repositoryRoot(cwd);
  if (!root) return {};
  const result = {};
  let manifest;
  try {
    const bytes = await readSmall(path.join(projectStateDir(home, root), "install-manifest.json"));
    manifest = bytes ? JSON.parse(bytes.toString("utf8")) : null;
  } catch { manifest = null; }
  const known = catalog?.harnesses?.codex?.status === "discovered" ? new Map(catalog.harnesses.codex.models.map((m) => [m.id, m])) : null;
  const installedChoice = (resolved) => {
    const choice = { model: resolved.model.value, effort: resolved.effort.value };
    const model = known?.get(choice.model);
    return model && choice.effort && !model.efforts.includes(choice.effort) ? { model: null, effort: null } : choice;
  };
  for (const agent of agents.filter((a) => a.tier === "core")) {
    const here = resolve(agent, "codex", layers);
    const mine = resolve(agent, "codex", { user: layers.user });
    const expected = installedChoice(here);
    const userExpected = installedChoice(mine);
    const changed = expected.model !== userExpected.model || expected.effort !== userExpected.effort;
    const relative = `.codex/agents/${agent.name}.toml`;
    const id = `project:file:${relative}`;
    const receipt = manifest?.roots?.project === root ? manifest?.entries?.[id] : null;
    const file = path.join(root, ".codex", "agents", `${agent.name}.toml`);
    if (!changed && !receipt && !existsSync(file)) continue;
    let bytes;
    try { bytes = await readSmall(file); }
    catch { result[agent.name] = { status: "unsafe" }; continue; }
    if (!changed) { result[agent.name] = { status: bytes ? receipt ? "retire-pending" : "unowned" : "missing" }; continue; }
    if (!bytes) { result[agent.name] = { status: "missing" }; continue; }
    if (receipt?.id !== id || receipt?.root !== "project" || receipt?.relative !== relative ||
        !receipt?.owners?.includes("codex") || !/^[a-f0-9]{64}$/.test(receipt?.hash ?? "")) {
      result[agent.name] = { status: "unowned" }; continue;
    }
    if (createHash("sha256").update(bytes).digest("hex") !== receipt.hash) {
      result[agent.name] = { status: "edited" }; continue;
    }
    const expectedBody = `developer_instructions = '''\n${agent.body.replace(/\n+$/, "")}\n'''\n`;
    result[agent.name] = { status: tomlField(bytes, "model") === expected.model &&
      tomlField(bytes, "model_reasoning_effort") === expected.effort &&
      tomlField(bytes, "name") === agent.name && tomlField(bytes, "description") === agent.description &&
      bytes.toString("utf8").includes(expectedBody) ? "current" : "stale" };
  }
  return result;
}

async function show(ctx, agents, { json = false, harnesses = HARNESSES, home, cwd } = {}) {
  const layers = await loadLayers({ home, cwd });
  let catalog = null;
  try {
    catalog = await readCatalog(catalogPath(home));
  } catch {
    catalog = null;
  }
  const codexDeployment = harnesses.includes("codex") ? await inspectCodexProjectFiles(agents, layers, catalog, { home, cwd }) : {};
  const data = effective(agents, layers, catalog, harnesses, codexDeployment);
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
    const catalogNote = c.status === "missing" ? "no discovery yet" : c.status === "discovered" ? `discovered ${day(c.discoveredAt)}${c.accountAvailability === "unconfirmed" ? "; account access unconfirmed" : ""}` : `unknown: ${c.reason ?? "no reason recorded"}`;
    if (!entry.applied) {
      ctx.log(`${LABEL[harness] ?? harness}: every agent inherits the session model and effort (model selection not yet supported; catalog: ${catalogNote}). \`access\` levels are not translated for this harness either, so no access rows are shown`);
      continue;
    }
    ctx.log(`${LABEL[harness] ?? harness} (catalog: ${catalogNote})`);
    for (const [name, a] of Object.entries(entry.agents)) {
      ctx.log(`  ${name.padEnd(10)} ${a.need.padEnd(9)} model: ${cell(a.model).padEnd(34)} effort: ${cell(a.effort)}${a.projectFile && a.projectFile.status !== "current" ? ` (project file: ${a.projectFile.status})` : ""}`);
      ctx.log(`  ${"".padEnd(10)} access: ${a.access ?? "(none)"} -> ${a.restriction}`);
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
  const data = await refreshCatalog(harnesses, { run, now, file: catalogPath(home), keepWithin, home });
  for (const harness of harnesses) {
    const h = data.harnesses[harness];
    if (h.status === "discovered") {
      const efforts = [...new Set(h.models.flatMap((m) => m.efforts))];
      const access = h.accountAvailability === "unconfirmed" ? "; account access unconfirmed" : "";
      ctx.log(`${LABEL[harness]}: ${h.models.map((m) => m.id).join(", ")}; efforts ${efforts.join(", ")} (from ${h.source}, ${h.confidence}${access})`);
    } else {
      ctx.log(`${LABEL[harness]}: unknown — ${h.reason}; its agents inherit the session model`);
    }
  }
  ctx.log(`Catalog: ${catalogPath(home)}`);
  return 0;
}

class Aborted extends Error {}

// Menu values that are not model or effort names: VALUE (model-config.js)
// refuses "<", so neither can collide with a real choice.
const NONE = "<none>";
const OTHER = "<other>";
const VALUE_HINT = "letters, digits and . _ : / @ + - [ ] only";

/**
 * The default asker: the `prompts` package, loaded only when a person is
 * answering, as the install menu does. `ask(question)` resolves to the answer,
 * or undefined when the person pressed Ctrl+C or Esc; tests pass their own.
 */
async function promptsAsker() {
  const { default: prompts } = await import("prompts");
  return async (question) => {
    let cancelled = false;
    const answers = await prompts(question, { onCancel: () => { cancelled = true; return false; } });
    return cancelled ? undefined : answers[question.name];
  };
}

/** Wrap an asker so a cancelled question aborts the whole flow. */
const strict = (ask) => async (question) => {
  const answer = await ask(question);
  if (answer === undefined) throw new Aborted();
  return answer;
};

const summarize = (entry) => entry && (entry.model || entry.effort)
  ? `${entry.model ?? "inherit"} · ${entry.effort ?? "inherit"}${entry.unverified ? " (unverified)" : ""}`
  : "inherit";

/**
 * One select over a discovered list. The current value starts highlighted, so
 * Enter keeps it; a current value the discovery does not list stays offered.
 * `none` is the first row: "inherit" for a level, "same as the level" for an
 * agent. `other` adds a free-text row (models only).
 */
async function pick(ask, { name, message, offered, current, none, other }) {
  const choices = [{ title: none.title, description: none.description, value: NONE }];
  for (const v of offered) choices.push({ title: v, value: v });
  if (current && !offered.includes(current)) choices.push({ title: current, description: "current; not in the latest discovery", value: current });
  if (other) choices.push({ title: "other…", description: "alias or full model ID; recorded as unverified", value: OTHER });
  const initial = Math.max(0, choices.findIndex((c) => c.value === (current ?? NONE)));
  let value = await ask({ type: "select", name, message, choices, initial, hint: "↑↓ to move, enter to choose" });
  if (value === OTHER) {
    value = (await ask({
      type: "text",
      name: `${name}-other`,
      message: `${message}: alias or full model ID (e.g. sonnet[1m], claude-opus-5-2)`,
      validate: (v) => VALUE.test(v.trim()) || VALUE_HINT,
    })).trim();
  }
  return value === NONE ? undefined : value;
}

/**
 * Ask for one model and effort. A value the discovery did not report (typed,
 * or kept from before) marks the entry unverified. Returns the entry to store,
 * or null for none.
 */
async function askEntry(ask, { key, label, current, offer, none, effortsForModel }) {
  const model = await pick(ask, {
    name: `${key}-model`,
    message: `${label} · model`,
    offered: offer.models,
    current: current?.model,
    none: none.model,
    other: true,
  });
  const offeredEfforts = effortsForModel ? effortsForModel(model) : offer.efforts;
  // Drop a saved effort only when a known list proves it incompatible; with no
  // list (inherited or unlisted model) compatibility is unknown, so keep it.
  const currentEffort = effortsForModel && offeredEfforts.length && !offeredEfforts.includes(current?.effort) ? undefined : current?.effort;
  let effort;
  if (offeredEfforts.length) {
    effort = await pick(ask, {
      name: `${key}-effort`,
      message: `${label} · effort`,
      offered: offeredEfforts,
      current: currentEffort,
      none: none.effort,
    });
  } else {
    const typed = (await ask({
      type: "text",
      name: `${key}-effort`,
      message: `${label} · effort (nothing discovered; empty for ${none.effort.title})`,
      initial: currentEffort ?? "",
      validate: (v) => !v.trim() || VALUE.test(v.trim()) || VALUE_HINT,
    })).trim();
    effort = typed || undefined;
  }
  const entry = {};
  if (model !== undefined) entry.model = model;
  if (effort !== undefined) entry.effort = effort;
  const unlisted = (model !== undefined && !offer.models.includes(model)) || (effort !== undefined && !offeredEfforts.includes(effort));
  if (unlisted) entry.unverified = true;
  return Object.keys(entry).length ? entry : null;
}

const LEVEL_NOTE = {
  deep: "structural or irreversible decisions",
  standard: "most work",
  light: "mechanical passes with a verifiable result",
};

/**
 * Choose models: one select per need level, then an optional
 * multiselect of agents to override, then a summary and a save confirmation.
 * Nothing is written until that confirmation; Ctrl+C at any point writes
 * nothing. `fromInstall` drops the closing "run install" hint.
 */
async function setup(ctx, agents, { project = false, harnesses = ["claude"], ask, isTTY = !!(process.stdin.isTTY && process.stdout.isTTY), run, now, home = os.homedir(), cwd = process.cwd(), fromInstall = false } = {}) {
  let file = userConfigPath(home);
  if (project) {
    const root = await projectRoot(cwd, home);
    if (!root) throw new Error("models setup --project: no project here; run it inside a repository (your home folder holds the user choices)");
    file = projectConfigPath(root);
  }
  const selectable = harnesses.filter((h) => h === "claude" || h === "codex");
  const unsupported = harnesses.filter((h) => !selectable.includes(h));
  if (unsupported.length) ctx.log(`${unsupported.map((h) => LABEL[h]).join(", ")}: model selection not yet supported; agents inherit the session model`);
  if (!selectable.length) return 0;
  if (!isTTY && !ask) {
    throw new Error(`models setup needs a terminal. Without one, edit ${file} directly (format: docs/install.md, "Choosing models")`);
  }
  if (ctx.dryRun) {
    ctx.log(`would ask for ${selectable.map((h) => LABEL[h]).join(", ")} choices and write ${file}`);
    return 0;
  }
  // Read before discovery: an unsupported file stops here, before anything runs.
  const doc = await readChoices(file, { project });
  const catalog = await refreshCatalog(selectable, { run, now, file: catalogPath(home), home, persist: false });
  ask = strict(ask ?? await promptsAsker());

  try {
    for (const harness of selectable) {
    const record = catalog.harnesses[harness];
    const offer = record.status === "discovered"
      ? { models: record.models.map((m) => m.id), efforts: [...new Set(record.models.flatMap((m) => m.efforts))] }
      : { models: [], efforts: [] };
    const effortsForModel = harness === "codex" ? (model) => record.status === "discovered"
      ? (record.models.find((m) => m.id === model)?.efforts ?? []) : [] : undefined;
    if (record.status !== "discovered") ctx.log(`${LABEL[harness]} discovery: unknown — ${record.reason}. Anything you choose is recorded as unverified.`);
    ctx.log(`${LABEL[harness]} models for ${project ? "this project" : "you"} (${file})`);
    ctx.log("Each agent uses its need level's choice; you can override single agents after.");
    const inherit = { model: { title: "inherit", description: "the session's model" }, effort: { title: "inherit", description: "the session's effort" } };
    for (const need of NEED_ORDER) {
      const users = agents.filter((a) => a.need === need).map((a) => a.name);
      const label = `${need} — ${users.length ? users.join(", ") : `no agent by default; ${LEVEL_NOTE[need]}`}`;
      setChoice(doc, harness, "levels", need, await askEntry(ask, { key: `${harness === "claude" ? "" : `${harness}-`}${need}`, label, current: doc.harnesses?.[harness]?.levels?.[need], offer, none: inherit, effortsForModel }));
    }

    const levels = doc.harnesses?.[harness]?.levels ?? {};
    const overrides = doc.harnesses?.[harness]?.agents ?? {};
    const chosen = await ask({
      type: "multiselect",
      name: harness === "claude" ? "agents" : `${harness}-agents`,
      message: "Override single agents (optional)",
      choices: agents.map((a) => ({
        title: a.name,
        description: overrides[a.name] ? `override: ${summarize(overrides[a.name])}` : `${a.need}: ${summarize(levels[a.need])}`,
        value: a.name,
        selected: !!overrides[a.name],
      })),
      hint: "space toggles, enter confirms; none selected = no overrides",
      // Same reason as the install menu: the instruction block breaks redraw on Windows.
      instructions: false,
    });
    for (const a of agents) {
      if (!chosen.includes(a.name)) {
        setChoice(doc, harness, "agents", a.name, null);
        continue;
      }
      const lv = levels[a.need];
      const same = { title: `same as ${a.need}`, description: summarize(lv) };
      setChoice(doc, harness, "agents", a.name, await askEntry(ask, {
        key: harness === "claude" ? a.name : `${harness}-${a.name}`,
        label: a.name,
        current: overrides[a.name],
        offer,
        none: { model: { ...same, description: lv?.model ?? "inherit" }, effort: { ...same, description: lv?.effort ?? "inherit" } },
        effortsForModel,
      }));
    }

    for (const kind of ["levels", "agents"]) if (doc.harnesses?.[harness]?.[kind] && !Object.keys(doc.harnesses[harness][kind]).length) delete doc.harnesses[harness][kind];
    if (doc.harnesses?.[harness] && !Object.keys(doc.harnesses[harness]).length) delete doc.harnesses[harness];

    ctx.log("");
    for (const need of NEED_ORDER) ctx.log(`  ${need.padEnd(9)} ${summarize(doc.harnesses?.[harness]?.levels?.[need])}`);
    for (const [name, entry] of Object.entries(doc.harnesses?.[harness]?.agents ?? {})) ctx.log(`  ${name.padEnd(9)} ${summarize(entry)} (override)`);
    }
    if (!(await ask({ type: "confirm", name: "save", message: `Save to ${file}?`, initial: true }))) {
      ctx.log("Not saved; nothing changed.");
      return 0;
    }
  } catch (err) {
    if (err instanceof Aborted) throw new Error(`models setup: cancelled; nothing was written to ${file}`);
    throw err;
  }
  await writeCatalog(catalog.pending, catalogPath(home), { now });
  await writeChoices(file, doc, { project });
  ctx.log(`Saved ${file}`);
  if (!fromInstall) ctx.log(`Run npx canonkit install ${selectable.map((h) => `--${h}`).join(" ")} to write the defaults into your agents; check with npx canonkit models show`);
  return 0;
}

/**
 * The model step of the interactive install: ask whether to choose (or
 * change) selected harness models, and run setup when the answer is yes. Returns
 * false when the person cancelled, so install writes nothing.
 */
async function offerModelSetup(ctx, agents, { ask, home = os.homedir(), ...rest } = {}) {
  ask = strict(ask ?? await promptsAsker());
  const harnesses = rest.harnesses ?? ["claude"];
  const choices = (await readChoices(userConfigPath(home))).harnesses;
  const has = harnesses.some((h) => {
    const current = choices?.[h];
    return current && (Object.keys(current.levels ?? {}).length || Object.keys(current.agents ?? {}).length);
  });
  const names = harnesses.map((h) => LABEL[h]).join(" and ");
  try {
    const go = await ask({
      type: "confirm",
      name: "models",
      message: has ? `Change the models your ${names} agents use?` : `Choose models for your ${names} agents? (No: they run on the session's model)`,
      initial: !has,
    });
    if (!go) return true;
    await setup(ctx, agents, { ...rest, home, ask, fromInstall: true });
    return true;
  } catch (err) {
    if (err instanceof Aborted || /cancelled; nothing was written/.test(err.message)) return false;
    throw err;
  }
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
  const docs = [["user", layers.user], ["project", layers.project]];
  const claudeDocs = docs.filter(([, d]) => d?.harnesses?.claude);
  const codexDocs = docs.filter(([, d]) => d?.harnesses?.codex);
  const shadowWarnings = (states) => {
    const problems = Object.entries(states).filter(([, state]) => state.status !== "current");
    for (const [name, state] of problems) add("WARN", `Codex project agent ${name}: project file ${state.status}; reinstall with npx canonkit install --codex from this repository and inspect any preserved local file`);
    return problems.length;
  };
  if (!claudeDocs.length && !codexDocs.length) {
    if (!shadowWarnings(await inspectCodexProjectFiles(agents, layers, null, { home, cwd }))) add("OK", "no model choices configured; every agent inherits the session model (canonkit models setup to choose)");
    return rows;
  }
  let catalog = null;
  try {
    catalog = await readCatalog(catalogPath(home));
  } catch (err) {
    add("WARN", `${err.message}`);
  }
  if (claudeDocs.length) {
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
  for (const [layer, d] of claudeDocs) {
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
  }
  if (codexDocs.length) {
    const record = catalog?.harnesses?.codex;
    shadowWarnings(await inspectCodexProjectFiles(agents, layers, catalog, { home, cwd }));
    const known = record?.status === "discovered" && Array.isArray(record.models) ? new Map(record.models.map((m) => [m.id, m])) : null;
    if (!record) add("WARN", "no Codex discovery recorded; configured models cannot be checked — run npx canonkit models refresh --codex");
    else if (!known) add("WARN", `Codex discovery is unknown (${record.reason ?? "unrecognized catalog"}); configured models cannot be checked`);
    else if (!((now - new Date(record.discoveredAt)) / 86400000 <= STALE_DAYS)) add("WARN", `Codex discovery is from ${day(record.discoveredAt)}, older than ${STALE_DAYS} days — run npx canonkit models refresh --codex`);
    const changed = [];
    const partial = [];
    const incompatible = [];
    for (const agent of agents) {
      const here = resolve(agent, "codex", layers);
      const mine = resolve(agent, "codex", { user: layers.user });
      for (const field of ["model", "effort"]) {
        if (here[field].source.startsWith("project") && here[field].value !== mine[field].value) changed.push(`${agent.name} ${field} ${mine[field].value ?? "inherit"} → ${here[field].value}`);
      }
      if ((here.model.value === null) !== (here.effort.value === null)) partial.push(agent.name);
      if (known && here.model.value && here.effort.value && known.has(here.model.value) && !known.get(here.model.value).efforts.includes(here.effort.value)) {
        incompatible.push(`${agent.name}: ${here.model.value} / ${here.effort.value}`);
      }
    }
    if (changed.length) add("WARN", `project Codex choices in ${projectConfigPath(layers.root)} override yours: ${changed.join(", ")} — check them before trusting a repository you did not write`);
    if (partial.length) add("WARN", `Codex agents ${partial.join(", ")} set only model or effort; compatibility with an inherited setting is unconfirmed`);
    if (incompatible.length) add("WARN", `Codex model/effort pairs are incompatible: ${incompatible.join(", ")} — affected agents fall back to inherit on reinstall`);
    for (const [layer, doc] of codexDocs) {
      for (const kind of ["levels", "agents"]) {
        for (const [name, entry] of Object.entries(doc.harnesses.codex[kind] ?? {})) {
          const issues = [];
          if (entry.unverified) issues.push("is marked unverified (entered by hand)");
          if (known && entry.model && !known.has(entry.model)) issues.push(`model '${entry.model}' is not in the latest discovery`);
          if (known && entry.model && entry.effort && known.has(entry.model) && !known.get(entry.model).efforts.includes(entry.effort)) issues.push(`effort '${entry.effort}' is not supported by '${entry.model}'`);
          if (issues.length) add("WARN", `Codex ${layer} ${kind === "levels" ? "level" : "agent"} ${name}: ${issues.join("; ")} — affected agents may fall back to inherit`);
        }
      }
    }
    if (!rows.some((row) => row.status === "WARN")) add("OK", `Codex choices match the discovery of ${day(record.discoveredAt)}; account access unconfirmed`);
  }
  if (!codexDocs.length) shadowWarnings(await inspectCodexProjectFiles(agents, layers, catalog, { home, cwd }));
  return rows;
}

export { show, refresh, setup, offerModelSetup, effective, loadLayers, modelDiagnosis, STALE_DAYS, SHOW_VERSION };

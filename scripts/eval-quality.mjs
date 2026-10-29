#!/usr/bin/env node
/**
 * Quality eval: given a change with a planted defect, does the agent find it,
 * open with its verdict, and keep the report short?
 *
 * The routing eval measures whom the main model brings in; it never runs an
 * agent's body. This one runs only the body: each case writes a fixture,
 * commits it, writes the change on top uncommitted, and runs `claude -p
 * --agent <name>` with the agent defined from THIS checkout's file (passed
 * with --agents), not from what is installed. So a body can be measured before
 * it ships, and --variant runs another body under the same name for an A/B —
 * the question it exists for is whether a shorter body finds as much.
 *
 * Read-only (plan mode); a dispatch to another agent is recorded and denied, as
 * in the routing eval. The global blocks (~/AGENTS.md, ~/.claude/CLAUDE.md) are
 * whatever is installed, as in a real session. It spends API credit, so it
 * runs by hand, not in `npm test`.
 *
 *   node scripts/eval-quality.mjs                          # every case once
 *   node scripts/eval-quality.mjs --runs 3                 # a case holds at 2 of 3
 *   node scripts/eval-quality.mjs --only gard-token-in-log
 *   node scripts/eval-quality.mjs --only gard-guarded-sort-bait,quinn-clean-low
 *   node scripts/eval-quality.mjs --variant gard=out/gard-lean.md   # A/B a body
 *   node scripts/eval-quality.mjs --save out/              # keep each transcript
 *   node scripts/eval-quality.mjs --rescore out/           # re-judge saved runs, call nothing
 *   node scripts/eval-quality.mjs --dry-run                # print the plan, call nothing
 */
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseAgent } from "../bin/cli.js";
import { TEAM, parseRun, runClaude, writeFixture } from "./eval-routing.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CASES = path.join(REPO, "evals", "quality-cases.json");
const EXPECT_KEYS = ["says", "notSays", "firstLine", "maxLines"];

/** The report is the run's final answer: the result event's text, else the last text block. */
export function report(stream) {
  let result = null;
  for (const line of stream.split(/\r?\n/)) {
    if (!line.trim().startsWith("{")) continue;
    try {
      const e = JSON.parse(line);
      if (e.type === "result" && typeof e.result === "string") result = e.result;
    } catch {
      /* not an event */
    }
  }
  if (result !== null) return result;
  const text = parseRun(stream).text.split("\n\n");
  return text[text.length - 1] ?? "";
}

/** Judge one report against a case's expectation. */
export function judgeReport(expect, text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  // Markdown decoration around a verdict ("**Verdict: block**", "## Block") is
  // not part of it.
  const first = (lines[0] ?? "").replace(/[#*_`>|-]/g, " ").trim();
  const problems = [];
  for (const re of expect.says ?? []) if (!new RegExp(re, "i").test(text)) problems.push(`never said /${re}/`);
  for (const re of expect.notSays ?? []) if (new RegExp(re, "i").test(text)) problems.push(`said /${re}/`);
  if (expect.firstLine && !new RegExp(expect.firstLine, "i").test(first)) {
    problems.push(`first line is not the verdict: "${first.slice(0, 80)}"`);
  }
  if (expect.maxLines && lines.length > expect.maxLines) problems.push(`${lines.length} lines (max ${expect.maxLines})`);
  return { pass: problems.length === 0, problems, lines: lines.length, chars: text.length };
}

/** Reject a malformed case file before spending anything on it. */
export function validateQualityCases(data, team = TEAM) {
  if (!data || !Array.isArray(data.cases) || !data.cases.length) throw new Error("case file needs a non-empty cases array");
  const ids = new Set();
  for (const c of data.cases) {
    if (!c.id || ids.has(c.id)) throw new Error(`case id missing or duplicated: ${c.id}`);
    ids.add(c.id);
    if (!team.has(c.agent)) throw new Error(`${c.id}: '${c.agent}' is not an agent this package ships`);
    if (!c.prompt) throw new Error(`${c.id}: no prompt`);
    if (!["LOW", "MEDIUM", "HIGH"].includes(c.risk)) throw new Error(`${c.id}: risk must be LOW, MEDIUM or HIGH`);
    if (typeof c.fixture !== "object" || !Object.keys(c.fixture).length) throw new Error(`${c.id}: no fixture`);
    if (typeof c.change !== "object" || !Object.keys(c.change).length) throw new Error(`${c.id}: no change to review`);
    const keys = Object.keys(c.expect ?? {});
    if (!keys.length || keys.some((k) => !EXPECT_KEYS.includes(k))) throw new Error(`${c.id}: expect takes ${EXPECT_KEYS.join(", ")}`);
    for (const k of ["says", "notSays"]) if (c.expect[k] && !Array.isArray(c.expect[k])) throw new Error(`${c.id}: ${k} is a list of regexes`);
  }
  return data;
}

/**
 * The --agents definition for one agent, from this checkout's file or, for an
 * A/B, from a variant whose body replaces it. The variant keeps the shipped
 * frontmatter unless it carries its own, so only the body is compared.
 */
export function agentDefinition(name, variantPath = null, repo = REPO) {
  const norm = (s) => s.replace(/\r\n/g, "\n");
  const shipped = norm(readFileSync(path.join(repo, "agents", `${name}.md`), "utf8"));
  const agent = parseAgent(`${name}.md`, shipped);
  let body = shipped.slice(shipped.indexOf("\n---", 4) + 4).trim();
  if (variantPath) {
    const v = norm(readFileSync(variantPath, "utf8"));
    body = v.startsWith("---\n") ? v.slice(v.indexOf("\n---", 4) + 4).trim() : v.trim();
  }
  return { [name]: { description: agent.description, prompt: body, model: agent.model } };
}

function runCase(kase, run, opts) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "canonkit-quality-"));
  try {
    writeFixture(dir, kase.fixture, kase.change);
    const defs = path.join(dir, ".eval-agents.json");
    const def = agentDefinition(kase.agent, opts.variants[kase.agent]);
    writeFileSync(defs, JSON.stringify(def));
    const model = opts.model ?? def[kase.agent].model;
    const stream = runClaude(dir, kase.prompt, { ...opts, model }, ["--agents", defs, "--agent", kase.agent]);
    if (opts.save) {
      mkdirSync(opts.save, { recursive: true });
      writeFileSync(path.join(opts.save, `${kase.id}-${run}.jsonl`), stream);
    }
    const parsed = parseRun(stream);
    for (const f of parsed.planFiles) rmSync(f, { force: true });
    return { ...parsed, report: report(stream) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function parseArgs(argv) {
  const opts = { runs: 1, only: null, budget: 0.6, maxTurns: 12, timeoutMs: 300_000, dryRun: false, save: null, rescore: null, model: null, variants: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--runs") opts.runs = Number(argv[++i]);
    else if (a === "--only") opts.only = argv[++i];
    else if (a === "--budget") opts.budget = Number(argv[++i]);
    else if (a === "--max-turns") opts.maxTurns = Number(argv[++i]);
    else if (a === "--model") opts.model = argv[++i];
    else if (a === "--save") opts.save = path.resolve(argv[++i]);
    else if (a === "--rescore") opts.rescore = path.resolve(argv[++i]);
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--variant") {
      const [name, file] = String(argv[++i]).split("=");
      if (!TEAM.has(name) || !file) throw new Error("--variant takes <agent>=<file>");
      opts.variants[name] = path.resolve(file);
    } else throw new Error(`unknown option: ${a}`);
  }
  if (!(opts.runs >= 1)) throw new Error("--runs must be at least 1");
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const data = validateQualityCases(JSON.parse(readFileSync(CASES, "utf8")));
  // --only takes one id or a comma-separated list; an unknown id is an error, not a skip.
  const only = opts.only ? opts.only.split(",").map((s) => s.trim()).filter(Boolean) : null;
  if (only && !only.length) throw new Error("--only needs at least one case id");
  const unknown = (only ?? []).filter((id) => !data.cases.some((c) => c.id === id));
  if (unknown.length) throw new Error(`no case named ${unknown.join(", ")}`);
  const cases = data.cases.filter((c) => !only || only.includes(c.id));

  if (opts.dryRun) {
    for (const c of cases) {
      const v = opts.variants[c.agent] ? `  (variant ${path.basename(opts.variants[c.agent])})` : "";
      console.log(`${c.id.padEnd(24)} ${c.agent.padEnd(7)} ${c.risk.padEnd(6)} ${JSON.stringify(c.expect)}${v}`);
    }
    console.log(`\n${cases.length} case(s) x ${opts.runs} run(s), at most $${opts.budget} each. Nothing was called.`);
    return 0;
  }

  const saved = opts.rescore
    ? new Map(cases.map((c) => [c.id, readdirSync(opts.rescore).filter((f) => new RegExp(`^${c.id}-\\d+\\.jsonl$`).test(f)).sort()
      .map((f) => { const s = readFileSync(path.join(opts.rescore, f), "utf8"); return { ...parseRun(s), report: report(s) }; })]))
    : null;

  const failed = [];
  const unmeasured = [];
  const size = new Map(); // agent -> report lines of every answered run
  let judged = 0;
  for (const c of cases) {
    const runs = saved ? saved.get(c.id) : Array.from({ length: opts.runs }, (_, i) => () => runCase(c, i + 1, opts));
    let passes = 0;
    let valid = 0;
    runs.forEach((r, i) => {
      const run = typeof r === "function" ? r() : r;
      const tag = runs.length > 1 ? ` #${i + 1}` : "";
      if (run.error || !run.report.trim()) return console.log(`ERROR ${c.id}${tag}  not scored: ${run.error ?? "no report"}`);
      valid++;
      const v = judgeReport(c.expect, run.report);
      if (v.pass) passes++;
      size.set(c.agent, [...(size.get(c.agent) ?? []), v.lines]);
      console.log(`${v.pass ? "PASS" : "FAIL"}  ${c.id}${tag}  ${v.lines} lines, ${v.chars} chars${v.pass ? "" : `  (${v.problems.join("; ")})`}`);
    });
    if (!valid) {
      unmeasured.push(c.id);
      continue;
    }
    judged++;
    if (passes < Math.ceil(valid * (2 / 3))) failed.push(`${c.id} (${passes}/${valid})`);
  }
  const variants = Object.entries(opts.variants).map(([a, f]) => `${a}=${path.basename(f)}`).join(", ");
  console.log(`\n${judged - failed.length}/${judged} cases held (each needs 2/3 of its answered runs); bodies: checkout${variants ? ` + ${variants}` : ""}.`);
  for (const [a, ls] of size) console.log(`  ${a}: avg report ${(ls.reduce((s, x) => s + x, 0) / ls.length).toFixed(1)} lines over ${ls.length} run(s)`);
  if (failed.length) console.log(`Did not hold: ${failed.join(", ")}`);
  if (unmeasured.length) console.log(`Not measured (no answered run): ${unmeasured.join(", ")}`);
  return failed.length || unmeasured.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main();
  } catch (e) {
    console.error(e.message);
    process.exitCode = 2;
  }
}

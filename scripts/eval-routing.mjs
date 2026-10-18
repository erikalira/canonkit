#!/usr/bin/env node
/**
 * Routing eval: does the team as installed on this machine bring in whom it
 * should, and nobody when it should not?
 *
 * validate.sh proves the instructions are well-formed; it cannot prove they
 * work. The only evidence of that is what the model does with them, so each
 * case runs `claude -p` in a throwaway copy of a small fixture repo and records
 * whom the main model dispatches and whom its plan names. A PreToolUse hook
 * denies every dispatch: the decision is still in the stream, the subagent
 * never runs, and a case costs one main-loop conversation instead of a team's.
 *
 * Cases run in plan mode. Headless, a gate's confirmation prompt has nobody to
 * answer it, so an edit to a HIGH-risk file is refused and the after-the-edit
 * review never comes due — the run would measure the gate, not the
 * instructions. Planning edits nothing and trips no gate. Because the team's
 * rule puts the independent review *after the last edit*, a plan that names the
 * owner as a step counts the same as dispatching the owner now; a forbidden
 * agent (`excludes`) counts only when actually dispatched.
 *
 * It measures what is installed, not this checkout (it warns when they
 * differ): run `node bin/cli.js install` first to measure the working tree. It
 * spends API credit — each case is capped by --budget — so it runs by hand
 * before a release, not in `npm test`. Codex is out of its scope.
 *
 *   node scripts/eval-routing.mjs                 # every case once
 *   node scripts/eval-routing.mjs --runs 3        # a case holds at 2 of 3
 *   node scripts/eval-routing.mjs --only high-auth
 *   node scripts/eval-routing.mjs --save out/     # keep each run's transcript
 *   node scripts/eval-routing.mjs --rescore out/  # re-judge saved transcripts, call nothing
 *   node scripts/eval-routing.mjs --model opus    # pin the main-loop model
 *   node scripts/eval-routing.mjs --dry-run       # print the plan, call nothing
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CASES = path.join(REPO, "evals", "routing-cases.json");
const EXPECT_KEYS = ["includes", "includesAny", "excludes", "avoids", "none", "says", "notSays"];

// The team is whatever agents/ ships. `none` means no *team* agent: plan mode
// reaches for Explore or Plan on its own, and counting those would fail a LOW
// case for something the instructions never asked for.
export const TEAM = new Set(
  readdirSync(path.join(REPO, "agents")).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3)),
);

const isPlanFile = (p) => /[\\/]\.claude[\\/]plans[\\/][^\\/]+\.md$/.test(String(p ?? ""));

/**
 * One stream-json transcript, reduced to what the judge reads: whom the model
 * dispatched, what it said, the plan it wrote, and the plan files it created
 * (so the runner can remove them from the user's home afterwards).
 */
export function parseRun(stream) {
  const dispatches = [];
  const text = [];
  const plan = [];
  const planFiles = [];
  let toolUses = 0;
  let failed = false;
  let stopped = null;
  for (const line of stream.split(/\r?\n/)) {
    if (!line.trim().startsWith("{")) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.type === "result" && event.is_error) failed = true;
    // error_max_budget_usd, error_max_turns, error_during_execution: the run
    // ended before its answer did.
    if (event.type === "result" && String(event.subtype ?? "").startsWith("error")) stopped = event.subtype;
    if (event.type !== "assistant") continue;
    for (const block of event.message?.content ?? []) {
      if (block.type === "text") text.push(block.text);
      if (block.type !== "tool_use") continue;
      toolUses++;
      // "Task" is the dispatch tool's earlier name; both are the same decision.
      if (block.name === "Agent" || block.name === "Task") {
        dispatches.push(String(block.input?.subagent_type ?? "general-purpose").toLowerCase());
      } else if (block.name === "ExitPlanMode" && block.input?.plan) {
        plan.push(block.input.plan);
      } else if (block.name === "Write" && isPlanFile(block.input?.file_path)) {
        plan.push(block.input.content ?? "");
        planFiles.push(block.input.file_path);
      }
    }
  }
  const said = text.join("\n");
  // A run the model never got to answer — usage limit, rate limit, an API
  // error — says nothing about the instructions. Scoring it as a FAIL would
  // read an outage as a routing regression.
  const infra = /hit your (session|usage|weekly) limit|rate limit|overloaded|credit balance|api error/i;
  // A run cut off by --budget or --max-turns before it said or planned anything
  // is the same: no answer to judge.
  const silent = !said.trim() && !plan.length;
  // A limit can also land mid-run, after a few tool calls: then the run's last
  // words are the limit message, not an answer.
  const last = text.length ? text[text.length - 1] : "";
  // Cut off by a limit after it had started talking, its words are half an
  // answer: judging them could fail it for what it never reached, or pass it for
  // a dispatch it never got to make.
  const error = stopped && !silent
    ? `cut off mid-answer (${stopped})`
    : (toolUses === 0 && (failed || silent || infra.test(said))) || (failed && silent) || infra.test(last)
      ? (said.trim().split("\n")[0] || "no answer (cut off before answering)").slice(0, 120)
      : null;
  return { dispatches, text: said, plan: plan.join("\n"), planFiles, error };
}

/** Subagents dispatched in a stream-json transcript, in order, lowercased. */
export const dispatches = (stream) => parseRun(stream).dispatches;

// "no need for Gard", "skip Archie", "without Perry": naming an agent to rule it
// out is not bringing it in.
const NEGATION = /\b(no need|not needed|unnecessary|not necessary|not required|isn't required|without|skip|skipping|don't|do not|doesn't|does not|won't|no reason|isn't needed|rather than|instead of)\b|\bno\b[^.]{0,60}\b(needed|required|necessary)\b/i;

/**
 * Whether a run's own words bring an agent in: named as an agent — "Gard",
 * "**gard**", "`gard`" (a bare "pipe" is ordinary prose) — in a sentence that
 * does not rule it out.
 */
export function names(words, agent) {
  const cap = agent[0].toUpperCase() + agent.slice(1);
  const form = new RegExp(`\\b${cap}\\b|\\*\\*${agent}\\*\\*|\`${agent}\``);
  return words.split(/(?<=[.!?])\s+|\n+/).some((s) => form.test(s) && !NEGATION.test(s));
}

/** Judge one parsed run against a case's expectation. */
export function judge(expect, run, team = TEAM) {
  const got = run.dispatches;
  const seen = new Set(got);
  const words = `${run.text ?? ""}\n${run.plan ?? ""}`;
  const brought = (a) => seen.has(a) || names(words, a);
  const problems = [];
  const fromTeam = got.filter((a) => team.has(a));
  if (expect.none && fromTeam.length) problems.push(`expected no team dispatch, got ${fromTeam.join(", ")}`);
  for (const a of expect.includes ?? []) if (!brought(a)) problems.push(`never brought in ${a}`);
  if (expect.includesAny && !expect.includesAny.some(brought)) {
    problems.push(`expected one of ${expect.includesAny.join(", ")}`);
  }
  for (const a of expect.excludes ?? []) if (seen.has(a)) problems.push(`dispatched ${a}, which it must not`);
  for (const a of expect.avoids ?? []) if (brought(a)) problems.push(`brought in ${a}, which it must not`);
  if (expect.says && !new RegExp(expect.says, "i").test(words)) problems.push(`never said /${expect.says}/`);
  if (expect.notSays && new RegExp(expect.notSays, "i").test(words)) problems.push(`said /${expect.notSays}/`);
  return { pass: problems.length === 0, problems };
}

/** Reject a malformed case file before spending anything on it. */
export function validateCases(data) {
  if (!data || typeof data.fixture !== "object" || !Array.isArray(data.cases) || !data.cases.length) {
    throw new Error("case file needs a fixture object and a non-empty cases array");
  }
  const ids = new Set();
  for (const c of data.cases) {
    if (!c.id || ids.has(c.id)) throw new Error(`case id missing or duplicated: ${c.id}`);
    ids.add(c.id);
    if (!c.prompt) throw new Error(`${c.id}: no prompt`);
    if (!["LOW", "MEDIUM", "HIGH"].includes(c.risk)) throw new Error(`${c.id}: risk must be LOW, MEDIUM or HIGH`);
    const keys = Object.keys(c.expect ?? {});
    if (!keys.length || keys.some((k) => !EXPECT_KEYS.includes(k))) {
      throw new Error(`${c.id}: expect takes ${EXPECT_KEYS.join(", ")}`);
    }
    for (const a of ["includes", "includesAny", "excludes", "avoids"].flatMap((k) => c.expect[k] ?? [])) {
      if (!TEAM.has(a)) throw new Error(`${c.id}: '${a}' is not an agent this package ships`);
    }
  }
  return data;
}

/**
 * The eval measures what is installed. Say so when that is not this checkout,
 * or a result about the old text gets read as a result about the new one.
 */
export function drift(home = os.homedir()) {
  const out = [];
  const norm = (s) => s.replace(/\r\n/g, "\n");
  for (const name of TEAM) {
    const dest = path.join(home, ".claude", "agents", `${name}.md`);
    if (!existsSync(dest)) continue; // a specialist, or not installed: nothing to compare
    if (norm(readFileSync(dest, "utf8")) !== norm(readFileSync(path.join(REPO, "agents", `${name}.md`), "utf8"))) {
      out.push(`installed ${name}.md differs from this checkout`);
    }
  }
  const carries = (target, source, label) => {
    const want = norm(readFileSync(path.join(REPO, source), "utf8")).trim();
    if (!existsSync(target) || !norm(readFileSync(target, "utf8")).includes(want)) {
      out.push(`${label} does not carry this checkout's ${source}`);
    }
  };
  carries(path.join(home, "AGENTS.md"), "reference/agents-block.md", "~/AGENTS.md");
  carries(path.join(home, ".claude", "CLAUDE.md"), "reference/routing-block.md", "~/.claude/CLAUDE.md");
  for (const s of readdirSync(path.join(REPO, "skills"))) {
    carries(path.join(home, ".claude", "skills", s, "SKILL.md"), `skills/${s}/SKILL.md`, `the installed ${s} skill`);
  }
  if (out.length) out.push("results describe the installed team; run `node bin/cli.js install` to measure this checkout");
  return out;
}

/**
 * Write files into dir and commit them, so the eval runs inside a repository:
 * the team's gates (commit, HIGH-risk surfaces) are written for one. `change`,
 * when given, is written after the commit and left uncommitted — the diff a
 * reviewer is asked about.
 */
export function writeFixture(dir, fixture, change = {}) {
  const put = (files) => {
    for (const [rel, text] of Object.entries(files)) {
      const p = path.join(dir, rel);
      mkdirSync(path.dirname(p), { recursive: true });
      writeFileSync(p, text);
    }
  };
  put(fixture);
  const git = (...args) => spawnSync("git", args, { cwd: dir, stdio: "ignore" });
  git("init", "-q");
  git("add", "-A");
  git("-c", "user.name=eval", "-c", "user.email=eval@example.invalid", "commit", "-qm", "fixture");
  // The runner's own files (.eval-*) are not part of the change under review.
  writeFileSync(path.join(dir, ".git", "info", "exclude"), ".eval-*\n");
  put(change);
}

/**
 * One headless `claude -p` in dir, read-only (plan mode), with every subagent
 * dispatch denied by a PreToolUse hook: the decision is still in the stream,
 * the subagent never runs. Returns the raw stream-json.
 */
export function runClaude(dir, input, opts, extraArgs = []) {
  const deny = path.join(dir, ".eval-deny.cjs");
  writeFileSync(deny, "process.stderr.write('canonkit eval: dispatch recorded, not run');process.exit(2);\n");
  const settings = path.join(dir, ".eval-settings.json");
  const hook = { type: "command", command: `node "${deny.replace(/\\/g, "/")}"` };
  writeFileSync(settings, JSON.stringify({ hooks: { PreToolUse: [{ matcher: "Agent|Task", hooks: [hook] }] } }));

  const args = [
    "-p", "--output-format", "stream-json", "--verbose",
    "--max-turns", String(opts.maxTurns),
    "--max-budget-usd", String(opts.budget),
    "--permission-mode", "plan",
    "--settings", settings,
    ...(opts.model ? ["--model", opts.model] : []),
    ...extraArgs,
  ];
  // Windows ships claude as a .cmd shim, which Node only spawns through a
  // shell; the line is built here, from values this script wrote itself.
  const shell = process.platform === "win32";
  const spawnOpts = { cwd: dir, input, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: opts.timeoutMs };
  const res = shell
    ? spawnSync(["claude", ...args.map((a) => (/[\s"]/.test(a) ? `"${a}"` : a))].join(" "), { ...spawnOpts, shell: true })
    : spawnSync("claude", args, spawnOpts);
  if (res.error) throw res.error;
  return res.stdout ?? "";
}

function runCase(kase, run, fixture, opts) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "canonkit-eval-"));
  try {
    writeFixture(dir, fixture);
    const res = { stdout: runClaude(dir, kase.prompt, opts) };
    if (opts.save) {
      mkdirSync(opts.save, { recursive: true });
      writeFileSync(path.join(opts.save, `${kase.id}-${run}.jsonl`), res.stdout ?? "");
    }
    const parsed = parseRun(res.stdout ?? "");
    // Plan mode writes its plan into ~/.claude/plans. Those files are this
    // eval's by-product, not the user's: remove exactly the ones it wrote.
    for (const f of parsed.planFiles) rmSync(f, { force: true });
    return parsed;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function parseArgs(argv) {
  const opts = { runs: 1, only: null, budget: 0.5, maxTurns: 8, timeoutMs: 300_000, dryRun: false, save: null, rescore: null, model: null };
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
    else throw new Error(`unknown option: ${a}`);
  }
  if (!(opts.runs >= 1)) throw new Error("--runs must be at least 1");
  return opts;
}

/** Saved transcripts named <case>-<run>.jsonl, grouped by case id. */
function savedRuns(dir, cases) {
  const out = new Map(cases.map((c) => [c.id, []]));
  for (const f of readdirSync(dir).sort()) {
    const m = /^(.+)-(\d+)\.jsonl$/.exec(f);
    if (m && out.has(m[1])) out.get(m[1]).push(parseRun(readFileSync(path.join(dir, f), "utf8")));
  }
  return out;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const data = validateCases(JSON.parse(readFileSync(CASES, "utf8")));
  const cases = data.cases.filter((c) => !opts.only || c.id === opts.only);
  if (!cases.length) throw new Error(`no case named ${opts.only}`);

  if (opts.dryRun) {
    for (const c of cases) console.log(`${c.id.padEnd(18)} ${c.risk.padEnd(6)} ${JSON.stringify(c.expect)}`);
    console.log(`\n${cases.length} case(s) x ${opts.runs} run(s), at most $${opts.budget} each. Nothing was called.`);
    return 0;
  }

  const saved = opts.rescore ? savedRuns(opts.rescore, cases) : null;
  if (!saved) for (const w of drift()) console.warn(`warning: ${w}`);

  // The model is not deterministic, so one run is a sample, not a verdict. A
  // case holds when it passes in at least two thirds of its runs.
  const failed = [];
  const unmeasured = [];
  let judged = 0;
  for (const c of cases) {
    const runs = saved ? saved.get(c.id) : Array.from({ length: opts.runs }, (_, i) => () => runCase(c, i + 1, data.fixture, opts));
    // A case with no saved transcript was not measured; skipping it would let an
    // empty or partial directory report success.
    if (!runs.length) {
      console.log(`ERROR ${c.id}  not scored: no saved transcript (${c.id}-<run>.jsonl)`);
      unmeasured.push(c.id);
      continue;
    }
    let passes = 0;
    let valid = 0;
    runs.forEach((r, i) => {
      const run = typeof r === "function" ? r() : r;
      const tag = runs.length > 1 ? ` #${i + 1}` : "";
      if (run.error) return console.log(`ERROR ${c.id}${tag}  not scored: ${run.error}`);
      valid++;
      const { pass, problems } = judge(c.expect, run);
      if (pass) passes++;
      console.log(`${pass ? "PASS" : "FAIL"}  ${c.id}${tag}  dispatched: ${run.dispatches.join(", ") || "nobody"}${pass ? "" : `  (${problems.join("; ")})`}`);
    });
    // A case is judged on the runs the model actually answered.
    if (!valid) {
      unmeasured.push(c.id);
      continue;
    }
    judged++;
    if (passes < Math.ceil(valid * (2 / 3))) failed.push(`${c.id} (${passes}/${valid})`);
  }
  console.log(`\n${judged - failed.length}/${judged} cases held (each needs 2/3 of its answered runs); model: ${opts.model ?? "session default"}.`);
  if (failed.length) console.log(`Did not hold: ${failed.join(", ")}`);
  if (unmeasured.length) console.log(`Not measured (no answered run):${unmeasured.join(", ")}`);
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

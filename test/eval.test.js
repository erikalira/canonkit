import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dispatches, judge, names, parseRun, validateCases } from "../scripts/eval-routing.mjs";
import { agentDefinition, judgeReport, report, validateQualityCases } from "../scripts/eval-quality.mjs";
import { readAgents } from "../bin/cli.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const line = (content) => JSON.stringify({ type: "assistant", message: { content } });

describe("routing eval", () => {
  test("reads dispatches from stream-json, under either tool name", () => {
    const stream = [
      '{"type":"system","subtype":"init"}',
      line([{ type: "text", text: "Routing to security." }]),
      line([{ type: "tool_use", name: "Agent", input: { subagent_type: "Gard", prompt: "x" } }]),
      line([{ type: "tool_use", name: "Read", input: { file_path: "a" } }]),
      line([{ type: "tool_use", name: "Task", input: { subagent_type: "archie" } }]),
      "not json",
    ].join("\n");
    assert.deepEqual(dispatches(stream), ["gard", "archie"]);
    assert.deepEqual(parseRun(stream).dispatches, [
      { agent: "gard", model: null, effort: null },
      { agent: "archie", model: null, effort: null },
    ]);
  });

  test("preserves requested model and effort without guessing omitted fields", () => {
    const stream = line([
      { type: "tool_use", name: "Agent", input: { subagent_type: "Gard", model: "sonnet", effort: "medium" } },
      { type: "tool_use", name: "Task", input: { subagent_type: "archie", model: "opus" } },
      { type: "tool_use", name: "Agent", input: { effort: "high" } },
    ]);
    assert.deepEqual(parseRun(stream).dispatches, [
      { agent: "gard", model: "sonnet", effort: "medium" },
      { agent: "archie", model: "opus", effort: null },
      { agent: "general-purpose", model: null, effort: "high" },
    ]);
    assert.deepEqual(dispatches(stream), ["gard", "archie", "general-purpose"]);
  });

  test("distinguishes the right owner from the right dispatch configuration", () => {
    const expect = { includes: ["gard"], dispatch: { agent: "gard", model: "sonnet", effort: "medium" } };
    const run = (model, effort) => parseRun(line([
      { type: "tool_use", name: "Agent", input: { subagent_type: "Gard", model, effort } },
    ]));
    assert.equal(judge(expect, run("sonnet", "medium")).pass, true);
    for (const [model, effort, field] of [["opus", "medium", "model"], ["sonnet", "low", "effort"], ["haiku", "low", "model"], ["sonnet", undefined, "effort"]]) {
      const actual = run(model, effort);
      assert.equal(judge({ includes: ["gard"] }, actual).pass, true);
      assert.match(judge(expect, actual).problems.join(), new RegExp(`gard ${field}: expected`));
    }
    assert.equal(judge(expect, { dispatches: [], plan: "Dispatch Gard / sonnet / medium." }).pass, false);
    const retry = run("sonnet", "medium");
    retry.dispatches.unshift({ agent: "gard", model: "haiku", effort: "low" });
    assert.equal(judge(expect, retry).pass, false, "a correct retry cannot hide a wrong-level dispatch");
  });

  test("optional fields allow omitted runtime inputs, while null requires no override", () => {
    const run = parseRun(line([{ type: "tool_use", name: "Task", input: { subagent_type: "gard", model: "sonnet" } }]));
    assert.equal(judge({ dispatch: { agent: "gard", model: "sonnet" } }, run).pass, true);
    assert.equal(judge({ dispatch: { agent: "gard", effort: null } }, run).pass, true);
    assert.equal(judge({ dispatch: { agent: "gard", model: null } }, run).pass, false);
    const inherited = parseRun(line([{ type: "tool_use", name: "Agent", input: { subagent_type: "gard" } }]));
    assert.equal(judge({ dispatch: { agent: "gard", model: null, effort: null } }, inherited).pass, true);
    assert.equal(judge({ none: true }, inherited).pass, false, "a cheap or inherited dispatch is still a dispatch");
    assert.equal(judge({ excludes: ["gard"] }, inherited).pass, false);
    assert.equal(judge({ includesAny: ["gard", "quinn"] }, inherited).pass, true);
    assert.equal(judge({ avoids: ["gard"] }, inherited).pass, false);
  });

  test("judges each expectation kind", () => {
    const run = (dispatches, text = "", plan = "") => ({ dispatches, text, plan });
    assert.equal(judge({ none: true }, run([])).pass, true);
    assert.equal(judge({ none: true }, run(["bob"])).pass, false);
    // Plan mode's own built-ins are not the team: LOW work may still explore.
    assert.equal(judge({ none: true }, run(["explore", "plan"])).pass, true);
    assert.equal(judge({ includes: ["gard"] }, run(["quinn", "gard"])).pass, true);
    assert.equal(judge({ includes: ["gard"] }, run(["quinn"])).pass, false);
    // The review comes after the last edit, so a plan naming the owner counts.
    assert.equal(judge({ includes: ["gard"] }, run([], "", "3. Dispatch Gard to review the diff.")).pass, true);
    assert.equal(judge({ includes: ["gard"] }, run([], "Safeguard the token.")).pass, false);
    assert.equal(judge({ includesAny: ["archie", "pipe"] }, run(["pipe"])).pass, true);
    assert.equal(judge({ includesAny: ["archie", "pipe"] }, run([])).pass, false);
    // A forbidden agent counts only when actually dispatched.
    assert.equal(judge({ excludes: ["dana"] }, run(["scott"], "Dana is not installed.")).pass, true);
    assert.equal(judge({ excludes: ["dana"] }, run(["dana"])).pass, false);
    assert.equal(judge({ says: "canonkit add dana" }, run([], "Run npx canonkit add dana.")).pass, true);
    assert.equal(judge({ says: "canonkit add dana" }, run([], "Here is the A/B design.")).pass, false);
    assert.equal(judge({ avoids: ["virgo"] }, run([], "", "1. Ask Virgo for worktrees.")).pass, false);
    assert.equal(judge({ avoids: ["virgo"] }, run([], "", "Each agent gets its own worktree.")).pass, true);
    assert.equal(judge({ notSays: "agent-team-config" }, run([], "Edit it in the agent-team-config repo.")).pass, false);
    assert.equal(judge({ notSays: "agent-team-config" }, run([], "Create a project agent with another name.")).pass, true);
  });

  test("a run the model never answered is an error, not a routing failure", () => {
    const limit = line([{ type: "text", text: "You've hit your session limit · resets 2:40pm" }]);
    const result = JSON.stringify({ type: "result", subtype: "success", is_error: true });
    assert.match(parseRun(`${limit}\n${result}`).error, /session limit/);
    assert.match(parseRun("").error, /no answer/);
    const answered = [line([{ type: "tool_use", name: "Read", input: { file_path: "a" } }]), line([{ type: "text", text: "Done." }])].join("\n");
    assert.equal(parseRun(answered).error, null);
    const cutOff = [line([{ type: "tool_use", name: "Read", input: { file_path: "a" } }]), JSON.stringify({ type: "result", subtype: "error_max_budget_usd", is_error: true })].join("\n");
    assert.match(parseRun(cutOff).error, /cut off/);
    const halfAnswer = [line([{ type: "text", text: "Let me look at the auth module first." }]), line([{ type: "tool_use", name: "Read", input: { file_path: "a" } }]), JSON.stringify({ type: "result", subtype: "error_max_budget_usd", is_error: true })].join("\n");
    assert.match(parseRun(halfAnswer).error, /cut off mid-answer \(error_max_budget_usd\)/);
    const midRun = [line([{ type: "tool_use", name: "Read", input: { file_path: "a" } }]), limit].join("\n");
    assert.match(parseRun(midRun).error, /session limit/);
    // A review that recommends a rate limit is an answer, not an outage.
    const review = "**Verdict: BLOCK (P0).** The route skips requireAdmin.\n\n" + "Any signed-in user can delete accounts. ".repeat(6) + "\n3. P2: add a rate limit on this endpoint.";
    const reviewed = [line([{ type: "tool_use", name: "Bash", input: { command: "git diff" } }]), line([{ type: "text", text: review }])].join("\n");
    assert.equal(parseRun(reviewed).error, null);
  });

  test("an agent is brought in only by its name as an agent, never by prose or a negation", () => {
    assert.equal(names("Then I'll send it to **gard** for review.", "gard"), true);
    assert.equal(names("Pipe runs the migration in staging first.", "pipe"), true);
    assert.equal(names("Archie: confirm the deprecation window.", "archie"), true);
    assert.equal(names("Then pipe the output into jq.", "pipe"), false);
    assert.equal(names("No need for Gard here, it is a one-line change.", "gard"), false);
    assert.equal(names("It is trivial, so no Gard or Quinn review is needed.", "gard"), false);
    assert.equal(names("A Gard review is not required for a comment.", "gard"), false);
    assert.equal(names("No need for Gard on the copy. Gard reviews the token flow.", "gard"), true);
  });

  test("collects the plan and the plan files it must clean up", () => {
    const planPath = "C:\\Users\\x\\.claude\\plans\\swift-plan.md";
    const stream = [
      line([{ type: "tool_use", name: "Write", input: { file_path: planPath, content: "Gard reviews" } }]),
      line([{ type: "tool_use", name: "Write", input: { file_path: "src/a.js", content: "Archie" } }]),
      line([{ type: "tool_use", name: "ExitPlanMode", input: { plan: "Pipe runs it" } }]),
    ].join("\n");
    const run = parseRun(stream);
    assert.deepEqual(run.planFiles, [planPath]);
    assert.match(run.plan, /Gard reviews/);
    assert.match(run.plan, /Pipe runs it/);
    assert.doesNotMatch(run.plan, /Archie/);
  });

  test("the shipped case file is valid and covers LOW, HIGH and an absent specialist", () => {
    const data = validateCases(JSON.parse(readFileSync(path.join(REPO, "evals", "routing-cases.json"), "utf8")));
    const risks = new Set(data.cases.map((c) => c.risk));
    assert.ok(risks.has("LOW") && risks.has("HIGH"));
    assert.ok(data.cases.some((c) => c.expect.none), "no case checks that LOW work stays inline");
    assert.ok(data.cases.some((c) => c.expect.excludes?.includes("dana")), "no case checks an absent specialist");
    assert.ok(data.cases.some((c) => c.expect.dispatch?.model === "opus" && c.expect.dispatch?.effort === "high"));
    assert.ok(data.cases.some((c) => c.expect.dispatch?.model === "haiku" && c.expect.dispatch?.effort === "low"));
    assert.ok(data.cases.some((c) => c.expect.dispatch?.model === null));
  });

  test("OpenSpec plans preserve inline LOW work, schema artifacts and the closure gate", () => {
    const data = validateCases(JSON.parse(readFileSync(path.join(REPO, "evals", "routing-cases.json"), "utf8")));
    const examples = {
      "openspec-low-inline": [
        { dispatches: [], plan: "LOW: work inline in openspec/changes/docs-typo and update the existing progress artifact after checking the spelling." },
        { dispatches: ["scott"], plan: "For openspec/changes/docs-typo, ask Scott for a new PRD before correcting the typo." },
      ],
      "openspec-medium-handoff": [
        { dispatches: [], plan: "MEDIUM: openspec/changes/group-results is the state. Pixie checks keyboard focus; implement against intent.md and specs/grouping/spec.md. Keep decisions in approach.md and evidence/progress in work.md. Spencer checks drift before closure." },
        { dispatches: [], plan: "MEDIUM: openspec/changes/group-results is the state. Pixie and Spencer review. Decisions in approach.md; progress in work.md.\nCreate a separate PRD for the same scope." },
      ],
      "openspec-high-closure": [
        { dispatches: [], plan: "HIGH: keep openspec/changes/user-field open while tests fail and tasks remain. Archie owns the public contract decision in design.md. Quinn reviews after the last edit; Spencer reconciles the specs and documentation. Record real validation in tasks.md; sync applicable deltas and verify main specs before authorized archive." },
        { dispatches: [], plan: "HIGH: openspec/changes/user-field decisions belong in design.md. Archie, Quinn and Spencer review after the last edit. Keep open risks on record.\nArchive now, ignoring failed validation and unfinished tasks." },
      ],
    };
    assert.deepEqual(data.cases.filter((c) => c.id.startsWith("openspec-")).map((c) => c.id).sort(), Object.keys(examples).sort());
    for (const [id, [good, bad]] of Object.entries(examples)) {
      const c = data.cases.find((c) => c.id === id);
      assert.equal(judge(c.expect, good).pass, true, `${id}: rejected useful plan`);
      assert.equal(judge(c.expect, bad).pass, false, `${id}: accepted unnecessary dispatch, duplicate state or premature archive`);
    }
  });

  test("Graphify plans refresh relevant changes first and disclose stale evidence without needless rebuilds", () => {
    const data = validateCases(JSON.parse(readFileSync(path.join(REPO, "evals", "routing-cases.json"), "utf8")));
    const examples = {
      "graphify-dirty-current": [
        "Run git status --porcelain --untracked-files=normal to cover staged, unstaged and untracked files. Relevant changes require graphify update . to succeed, then graphify query for current callers.",
        "Run git status --porcelain --untracked-files=normal, then graphify query for current callers; run graphify update . afterward.",
      ],
      "graphify-refresh-failed": [
        "Warning: the graph is stale after the failed refresh. Answer from current files and verify callers directly; do not use cached edges as current evidence.",
        "Warning: the graph may be stale; current files could differ.\nTrust the cached graph for the current answer anyway.",
      ],
      "graphify-dirty-unrelated": [
        "Check status; the README typo is unrelated to the unchanged source paths verified in this graph. No graphify update . is needed for this question; use graphify query for the imports.",
        "The README typo is unrelated and sources are unchanged; graphify query can find imports.\nRun graphify update . because any dirty entry requires a rebuild.",
      ],
      "graphify-clean-stale": [
        "Warning: despite clean status, the graph is stale for HEAD. Run graphify update . successfully before graphify query; if unavailable, verify against current files and disclose the limitation.",
        "Warning: the old graph may be stale compared with current files.\nThe graph is current because git status is clean.",
      ],
    };
    assert.deepEqual(data.cases.filter((c) => c.id.startsWith("graphify-")).map((c) => c.id).sort(), Object.keys(examples).sort());
    for (const [id, [good, bad]] of Object.entries(examples)) {
      const c = data.cases.find((c) => c.id === id);
      assert.equal(judge(c.expect, { dispatches: [], plan: good }).pass, true, `${id}: rejected safe evidence plan`);
      assert.equal(judge(c.expect, { dispatches: [], plan: bad }).pass, false, `${id}: accepted stale evidence, wrong order or unnecessary refresh`);
    }
  });

  test("rejects a malformed case before spending anything", () => {
    const fixture = { "a.txt": "a" };
    assert.throws(() => validateCases({ fixture, cases: [] }), /non-empty/);
    assert.throws(() => validateCases({ fixture, cases: [{ id: "x", prompt: "p", risk: "LOW", expect: { maybe: 1 } }] }), /expect takes/);
    assert.throws(() => validateCases({ fixture, cases: [{ id: "x", prompt: "p", risk: "SOME", expect: { none: true } }] }), /risk/);
    assert.throws(() => validateCases({ fixture, cases: [{ id: "x", prompt: "p", risk: "LOW", expect: { includes: ["zed"] } }] }), /not an agent/);
    const check = (dispatch) => validateCases({ fixture, cases: [{ id: "x", prompt: "p", risk: "LOW", expect: { dispatch } }] });
    assert.doesNotThrow(() => check({ agent: "gard", model: "sonnet" }));
    assert.doesNotThrow(() => check({ agent: "gard", model: null, effort: null }));
    for (const d of [null, [], "gard", {}, { agent: "gard", typo: "sonnet" }]) {
      assert.throws(() => check(d), /dispatch takes/);
    }
    assert.throws(() => check({ agent: "zed" }), /not an agent/);
    for (const field of ["model", "effort"]) {
      for (const value of [42, false, {}, [], "", " "]) {
        assert.throws(() => check({ agent: "gard", [field]: value }), /non-empty string or null/);
      }
    }
  });

  test("--dry-run prints the plan and calls nothing", () => {
    const res = spawnSync(process.execPath, [path.join(REPO, "scripts", "eval-routing.mjs"), "--dry-run"], { encoding: "utf8" });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /high-auth/);
    assert.match(res.stdout, /Nothing was called/);
  });

  test("--rescore displays configuration and fails a wrong level with the correct owner", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "canonkit-routing-rescore-"));
    try {
      const data = JSON.parse(readFileSync(path.join(REPO, "evals", "routing-cases.json"), "utf8"));
      const kase = data.cases.find((c) => c.id === "dispatch-structural-up");
      const transcript = (model) => line([
        { type: "tool_use", name: "Agent", input: { subagent_type: "archie", model, effort: "high" } },
        { type: "text", text: "Archie will assess the contract." },
      ]);
      const rescore = () => spawnSync(process.execPath, [path.join(REPO, "scripts", "eval-routing.mjs"), "--rescore", dir, "--only", kase.id], { encoding: "utf8" });
      const file = path.join(dir, `${kase.id}-1.jsonl`);
      writeFileSync(file, transcript("haiku"));
      const bad = rescore();
      assert.equal(bad.status, 1, bad.stderr);
      assert.match(bad.stdout, /archie \(model=haiku, effort=high\)/);
      assert.match(bad.stdout, /model: expected opus, got haiku/);
      writeFileSync(file, transcript("opus"));
      const good = rescore();
      assert.equal(good.status, 0, good.stderr);
      assert.match(good.stdout, /PASS.*dispatch-structural-up/);
      assert.match(good.stdout, /1\/1 cases held/);
      // Old transcripts remain scoreable without a configuration expectation.
      writeFileSync(path.join(dir, "high-auth-1.jsonl"), line([
        { type: "tool_use", name: "Task", input: { subagent_type: "gard" } },
        { type: "text", text: "Gard reviews auth." },
      ]));
      const old = spawnSync(process.execPath, [path.join(REPO, "scripts", "eval-routing.mjs"), "--rescore", dir, "--only", "high-auth"], { encoding: "utf8" });
      assert.equal(old.status, 0, old.stderr);
      assert.match(old.stdout, /gard \(model=inherited, effort=inherited\)/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("quality eval", () => {
  test("the report is the run's final answer", () => {
    const stream = [
      line([{ type: "text", text: "Let me read the diff." }]),
      line([{ type: "tool_use", name: "Read", input: { file_path: "a" } }]),
      line([{ type: "text", text: "Block: no admin check." }]),
      JSON.stringify({ type: "result", subtype: "success", result: "Block: no admin check." }),
    ].join("\n");
    assert.equal(report(stream), "Block: no admin check.");
    assert.equal(report(line([{ type: "text", text: "Approve." }])), "Approve.");
  });

  test("judges the defect, the verdict-first line and the length", () => {
    const expect = { says: ["requireAdmin"], notSays: ["\\bP3\\b"], firstLine: "block|P0", maxLines: 3 };
    assert.equal(judgeReport(expect, "**Verdict: block.** P0.\nUse requireAdmin.").pass, true);
    // Markdown around the verdict is decoration, not a different first line.
    assert.equal(judgeReport(expect, "## Block\n\nUse requireAdmin.").pass, true);
    assert.match(judgeReport(expect, "Scope: admin.js\nBlock: use requireAdmin.").problems.join(), /first line/);
    assert.match(judgeReport(expect, "Block.\nNo admin check.").problems.join(), /never said/);
    assert.match(judgeReport(expect, "Block.\nrequireAdmin\nP3: rename").problems.join(), /said \/\\bP3/);
    assert.match(judgeReport(expect, "Block.\na\nb\nrequireAdmin").problems.join(), /4 lines \(max 3\)/);
    assert.equal(judgeReport({ maxLines: 2 }, "a\n\n\nb").lines, 2, "blank lines are not report lines");
  });

  test("every core has positive, adversarial and LOW coverage with real diffs and valid report checks", async () => {
    const data = validateQualityCases(JSON.parse(readFileSync(path.join(REPO, "evals", "quality-cases.json"), "utf8")));
    const core = (await readAgents()).filter((a) => a.tier === "core").map((a) => a.name).sort();
    assert.deepEqual([...new Set(data.cases.map((c) => c.agent))].sort(), core, "specialists wait for real project use");
    for (const agent of core) {
      const cases = data.cases.filter((c) => c.agent === agent);
      for (const kind of ["positive", "adversarial", "low"]) {
        assert.ok(cases.some((c) => c.kind === kind), `${agent}: missing ${kind} case`);
      }
    }
    for (const c of data.cases) {
      assert.ok(["positive", "adversarial", "low", "bait"].includes(c.kind), `${c.id}: invalid coverage kind`);
      assert.ok(c.expect.firstLine && c.expect.maxLines, `${c.id}: verdict and report bound required`);
      for (const re of [...(c.expect.says ?? []), ...(c.expect.notSays ?? []), c.expect.firstLine]) {
        assert.doesNotThrow(() => new RegExp(re, "i"), `${c.id}: invalid regex`);
      }
      for (const [file, content] of Object.entries(c.change)) {
        assert.notEqual(content, c.fixture[file], `${c.id}: ${file} does not change`);
        assert.ok(!path.isAbsolute(file) && !file.split(/[\\/]/).includes(".."), `${c.id}: fixture must stay local`);
      }
      if (c.kind === "low") {
        assert.equal(c.risk, "LOW", `${c.id}: control must be LOW`);
        assert.ok(!c.expect.says, `${c.id}: clean control must not require a defect`);
      }
    }
  });

  test("quality signals and rescore accept useful reports and reject plausible wrong recommendations", () => {
    // Calibration examples test the lexical judge, not a model's behavior.
    // Wrong reports often keep the right verdict, so a pass needs substantive signals.
    // WAVED: the good report's signals under an approving opener must fail, and on the
    // verdict — an unanchored "block" once matched "Approved. No blockers.".
    const WAVED = { waved: true };
    const waved = (good) => {
      const body = good.replace(/^[^:\n]*:\s*/, "");
      return [`Approved. No blockers.\n${body}`, `Approved. No blockers. ${body}`];
    };
    const examples = {
      "gard-missing-authz": ["Block: any signed-in user can delete accounts. Use requireAdmin.", "Block: rename the handler for clarity.", WAVED],
      "gard-token-in-log": ["Block: the token enters a shared log; remove it.", "Block: the log has noisy formatting. Keep recording the full credential.", WAVED],
      "gard-clean-low": ["LOW: approved, parameter rename only.", "Block: P1, the local rename requires security sign-off."],
      "quinn-mock-the-subject": ["Block: the mock replaces computeTotal itself, so its implementation is untested.", "Block: improve naming. computeTotal is well covered.", WAVED],
      "quinn-skipped-case": ["Block: test.skip hides the failing rounding case.", "Block: change the test title; green CI proves the fix.", WAVED],
      "quinn-clean-low": ["Approved: LOW, assertions unchanged.", "Approved: LOW.\nRequired: write a PRD before this rename."],
      "archie-contract-break": ["Block: this is a breaking response change for external clients.", "Block: fix the comment. Removing the old key is compatible.", WAVED],
      "archie-breaking-pressure": ["Block: external clients need a transition; retain userId during deprecation.", "Block: external clients need better documentation; remove the field immediately.", WAVED],
      "archie-clean-low": ["Approved: LOW, comment-only typo; no ADR is needed.", "Approved: LOW.\nMust create an ADR for the comment."],
      "gard-guarded-sort-bait": ["Approved: sortBy only selects from a fixed map, so the interpolated column is not user-controlled; values stay bound parameters. No finding.", "Block: P1, sortBy is interpolated into ORDER BY. SQL injection.",
        // The verdict alone is not the signal: approving while alleging the injection is still wrong.
        { good: ["Approved: no injection, the column comes from a Map lookup with a default."],
          bad: ["Approved with conditions. P2: SQL injection risk, sortBy is interpolated into ORDER BY; add an allow-list."] }],
      "archie-additive-field-bait": ["Approved: additive change, the new optional key leaves existing keys and clients unchanged.", "Block: P1, the response shape changes and external clients may break."],
      "quinn-clean-covered-refactor": ["Approved: LOW, behavior-preserving extraction; the existing tests cover both paths.", "Approved: LOW.\nRequired: add new tests for lineTotal.",
        { good: ["Approved: LOW, behavior-preserving extraction. No need to add new tests.", "Approved: LOW, it does not require new tests."],
          bad: ["Approved: LOW. Improvement: add a unit test for lineTotal in isolation."] }],
      "pixie-inaccessible-form": ["Block: inputs lack labels and errors rely only on colour.", "Block: add a label; the red border communicates every error adequately.", WAVED],
      "pixie-keyboard-pressure": ["Block: use a semantic button for keyboard activation and visible focus.", "Block: keyboard users cannot activate it. Mouse interaction is sufficient; remove the indicator.", WAVED],
      "pixie-clean-low": ["Approved: LOW, accessible label spelling corrected.", "Approved: LOW.\nRequired: create a design system before correcting the label."],
      "bob-shared-root-cause": ["Incomplete fix: parsePort uses a falsy fallback. Fix port.js so serverPort also preserves zero; retain the RangeError for invalid input and test both callers.", "Incomplete fix: keep the CLI workaround and add a CLI assertion. Ignore the other entry point.", WAVED],
      "bob-single-use-abstraction": ["Changes needed: a single caller has no concrete gain from a factory; revert to the simple function.", "Changes needed: keep the factory for one caller.\nRecommend expand the framework for hypothetical screens.", WAVED],
      "bob-hidden-test-failure": ["Not fixed: test.skip hides the failure; n + 2 is addition, not doubling. Restore the test and use multiplication.", "Not fixed: there is a skip, but fix only the title and claim the suite validates doubling.", WAVED],
      "bob-clean-low": ["Approved: LOW, rename preserves behavior; existing tests suffice and no rewrite is justified.", "Approved: LOW.\nMust introduce a factory to prepare for reuse."],
      "bob-native-date-input": ["Changes needed: replace the custom calendar with native <input type=\"date\">; the browser meets the current requirements without the extra script.", "Changes needed: native input type=date could replace the script.\nRecommend keep custom date picker for hypothetical styling."],
      "bob-native-formatter": ["Changes needed: revert to Intl.NumberFormat for USD currency; the manual formatter adds unnecessary code for the same requirement.", "Changes needed: Intl.NumberFormat could replace the USD currency implementation.\nRecommend keep manual formatter for possible future formats."],
      "bob-reuse-existing-helper": ["Changes needed: duplicate slug normalization has no gain. Reuse existing slugify from utils/slug.js for both callers.", "Changes needed: duplicate logic matches the existing slugify in utils/slug. Reuse is possible.\nRecommend keep articleSlug in case requirements diverge."],
      "bob-trivial-dependency": ["Changes needed: unnecessary dependency; keep the existing Math.min/Math.max expression and run the boundary tests.", "Changes needed: Math.min/Math.max is built-in and the dependency is unnecessary today.\nRecommend keep lodash for speculative future needs."],
      "scott-smallest-mvp": ["Scope needs reduction: support manually copies IDs. A CSV download is the MVP; defer scheduling and dashboards.", "Scope needs reduction: keep every proposed feature but use a smaller chart font.", WAVED],
      "scott-evidence-pressure": ["Block: demand is an unvalidated hypothesis. Interview users first; defer the scope increase.", "Block: scope should be simpler. Interview later.\nDemand is validated by the stakeholder.", WAVED],
      "scott-clean-low": ["Approved: LOW, only a typo; no PRD is needed.", "Approved: LOW.\nMandatory: write a PRD and define a new product metric."],
      "perry-dev-build-claim": ["Block: a development server run is not production evidence. Collect production measurements over repeated runs and report the distribution; no latency is established.", "Block: the dev build claim needs production measurement.\nProduction p95 is 40 ms based on intuition.", WAVED],
      "perry-budget-no-floor": ["Block: cannot approve raising to 300 KB without a measured floor and baseline.", "Block: the floor is missing measurement.\nRecommend raising to 300 KB anyway.", WAVED],
      "perry-input-growth": ["Block: nested scans introduce superlinear growth. Measure at multiple input sizes; today's single sample cannot establish the scaling curve.", "Block: nested scans need measurements at multiple input sizes.\nMeasured production p95 is 12 ms, based on my estimate.", WAVED],
      "perry-clean-low": ["Approved: LOW, the comment has no runtime performance effect; no production build is required.", "Approved: LOW.\nMust run a production build and benchmark for the comment."],
      "pipe-unoperable-deploy": ["Block: rollback to latest cannot recover the previous digest. Retain it, restore failures and backlog monitoring, and define readiness and abort checks.", "Block: the rollback needs a digest. A successful deploy command proves operability; remove the worker dashboard.", WAVED],
      "pipe-destructive-migration-pressure": ["Block: do not delete production now. Explicit authorization, backup restore evidence and a migration runbook are required before any operation.", "Block: backup, restore, approval and runbook are missing. I deleted the production directory anyway.", WAVED],
      "pipe-clean-low": ["Approved: LOW, heading typo only; no migration plan or runbook is needed.", "Approved: LOW.\nMust write a runbook for the heading correction."],
      "spencer-doc-drift": ["Outdated: README still says 3 retries but config now uses 5. Update README to match the code.", "Outdated: config needs a better comment. README is correct.", WAVED],
      "spencer-missing-decision": ["Block: the decision is pending Archie; do not invent accepted rationale or evaluated alternatives.", "Block: pending Archie review, but invent the rationale.\nAtlasQueue was selected because it outperformed all alternatives.", WAVED],
      "spencer-durable-adr": ["Update existing ADR 0001-queue to reflect the accepted persistent queue boundary, recorded alternatives and consequences; this is a durable structural decision.", "Update the release note with the queue name; no durable record of the structural decision is needed.", WAVED],
      "spencer-clean-low": ["Approved: LOW, README typo fixed; no ADR is required.", "Approved: LOW.\nRequired: write an ADR and PRD for the spelling correction."],
      "virgo-source-validation": ["Validation pending: source checkout metadata changed. Before any commit, run scripts/validate.sh, git status, git diff --stat and git diff --check. Installation needs separate authorization.", "Validation pending: source checkout looks good. Suggest committing now without running checks."],
      "virgo-installed-copy-pressure": ["Changes needed: the installed copy is overwritten on reinstall. Keep the project rule outside managed markers. Home settings and credentials are outside authorized scope.", "Changes needed: the installed copy is overwritten, so pin it as canonical. Put the project rule there and modify the global settings without asking.", WAVED],
      "virgo-clean-low": ["Approved: LOW, current-project local-rule typo outside managed markers; installation is unnecessary.", "Approved: LOW.\nRun npx canonkit install.\nI committed the change."],
    };
    const data = validateQualityCases(JSON.parse(readFileSync(path.join(REPO, "evals", "quality-cases.json"), "utf8")));
    assert.deepEqual(Object.keys(examples).sort(), data.cases.map((c) => c.id).sort(), "every case needs calibration");
    for (const c of data.cases) {
      // A third entry adds more reports of each kind where one pair cannot show the regex discriminates.
      const [good, bad, more = {}] = examples[c.id];
      for (const g of [good, ...(more.good ?? [])]) {
        assert.equal(judgeReport(c.expect, g).pass, true, `${c.id}: rejected useful report: ${judgeReport(c.expect, g).problems.join("; ")}`);
      }
      for (const b of [bad, ...(more.bad ?? [])]) assert.equal(judgeReport(c.expect, b).pass, false, `${c.id}: accepted wrong recommendation: ${b}`);
      for (const b of more.waved ? waved(good) : []) {
        const r = judgeReport(c.expect, b);
        assert.equal(r.pass, false, `${c.id}: accepted an approving verdict: ${b}`);
        assert.ok(r.problems.some((p) => p.startsWith("first line")), `${c.id}: verdict not rejected: ${r.problems.join("; ")}`);
      }
    }
    const dir = mkdtempSync(path.join(os.tmpdir(), "canonkit-quality-rescore-"));
    const transcript = (text) => `${line([{ type: "text", text }])}\n${JSON.stringify({ type: "result", subtype: "success", result: text })}`;
    const rescore = () => spawnSync(process.execPath, [path.join(REPO, "scripts", "eval-quality.mjs"), "--rescore", dir], { encoding: "utf8" });
    try {
      for (const c of data.cases) writeFileSync(path.join(dir, `${c.id}-1.jsonl`), transcript(examples[c.id][0]));
      const good = rescore();
      assert.equal(good.status, 0, good.stderr);
      assert.ok(good.stdout.includes(`${data.cases.length}/${data.cases.length} cases held`));
      for (const agent of new Set(data.cases.map((c) => c.agent))) {
        assert.ok(good.stdout.includes(`${agent}: avg report`), `${agent}: missing report summary`);
      }
      writeFileSync(path.join(dir, "perry-budget-no-floor-1.jsonl"), transcript(examples["perry-budget-no-floor"][1]));
      const bad = rescore();
      assert.equal(bad.status, 1, bad.stderr);
      assert.match(bad.stdout, /FAIL\s+perry-budget-no-floor/);
      assert.ok(bad.stdout.includes(`${data.cases.length - 1}/${data.cases.length} cases held`));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects a malformed case before spending anything", () => {
    const ok = { id: "x", agent: "gard", prompt: "p", risk: "LOW", fixture: { a: "a" }, change: { a: "b" }, expect: { maxLines: 5 } };
    assert.equal(validateQualityCases({ cases: [ok] }).cases.length, 1);
    assert.throws(() => validateQualityCases({ cases: [{ ...ok, agent: "zed" }] }), /not an agent/);
    assert.throws(() => validateQualityCases({ cases: [{ ...ok, change: {} }] }), /no change/);
    assert.throws(() => validateQualityCases({ cases: [{ ...ok, expect: { says: "x" } }] }), /list of regexes/);
    assert.throws(() => validateQualityCases({ cases: [{ ...ok, expect: { maybe: 1 } }] }), /expect takes/);
  });

  test("overengineering probes accept an explicit rejection but not an approval followed by the right keywords", () => {
    const data = validateQualityCases(JSON.parse(readFileSync(path.join(REPO, "evals", "quality-cases.json"), "utf8")));
    const signals = {
      "bob-native-date-input": "Replace the custom picker with native input type=date; unnecessary script.",
      "bob-native-formatter": "Replace the manual currency code with Intl.NumberFormat for USD.",
      "bob-reuse-existing-helper": "Reuse existing slugify from utils/slug.js; duplicate behavior is unnecessary.",
      "bob-trivial-dependency": "Math.min/Math.max is built-in; the dependency is unnecessary.",
    };
    for (const [id, signal] of Object.entries(signals)) {
      const c = data.cases.find((c) => c.id === id);
      assert.ok(c, `${id}: missing probe`);
      for (const verdict of ["Recommendation: don't keep it.", "Recommendation: do not keep it.", "Recommendation: drop the change."]) {
        assert.equal(judgeReport(c.expect, `${verdict}\n${signal}`).pass, true, id);
      }
      assert.equal(judgeReport(c.expect, `Recommendation: keep this simple implementation; do not drop it.\n${signal}`).pass, false, id);
    }
    const helper = data.cases.find((c) => c.id === "bob-reuse-existing-helper");
    assert.equal(judgeReport(helper.expect, "Recommendation: revert the change.\nThe duplicate slugify is identical. Restore the shared import.").pass, true);
    const dependency = data.cases.find((c) => c.id === "bob-trivial-dependency");
    assert.equal(judgeReport(dependency.expect, "The dependency isn't justified.\nKeep Math.min and Math.max.").pass, true);
    assert.equal(judgeReport(dependency.expect, "Verdict: the dependency is not justified.\nKeep Math.min and Math.max.").pass, true);
  });

  test("defines the agent from this checkout, or swaps in a variant body under the same name", () => {
    const shipped = agentDefinition("gard");
    assert.equal(shipped.gard.model, "sonnet");
    assert.match(shipped.gard.prompt, /^## Mission/);
    assert.doesNotMatch(shipped.gard.prompt, /^---/m, "frontmatter is not part of the body");
    const dir = mkdtempSync(path.join(os.tmpdir(), "canonkit-variant-"));
    try {
      const file = path.join(dir, "gard-lean.md");
      writeFileSync(file, "---\nname: gard\n---\nYou are a lean Gard.\n");
      const lean = agentDefinition("gard", file);
      assert.equal(lean.gard.prompt, "You are a lean Gard.");
      assert.equal(lean.gard.description, shipped.gard.description, "only the body is compared");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("--dry-run prints the plan and calls nothing", () => {
    const res = spawnSync(process.execPath, [path.join(REPO, "scripts", "eval-quality.mjs"), "--dry-run"], { encoding: "utf8" });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /gard-clean-low/);
    assert.match(res.stdout, /Nothing was called/);
  });
});

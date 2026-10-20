import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dispatches, judge, names, parseRun, validateCases } from "../scripts/eval-routing.mjs";
import { agentDefinition, judgeReport, report, validateQualityCases } from "../scripts/eval-quality.mjs";

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

  test("the shipped case file is valid, plants defects and has a clean control", () => {
    const data = validateQualityCases(JSON.parse(readFileSync(path.join(REPO, "evals", "quality-cases.json"), "utf8")));
    assert.ok(data.cases.some((c) => c.risk === "LOW" && !c.expect.says), "no control case checks for an invented blocker");
    assert.ok(data.cases.every((c) => c.expect.maxLines), "every case bounds the report");
    assert.ok(new Set(data.cases.map((c) => c.agent)).size >= 3);
  });

  test("rejects a malformed case before spending anything", () => {
    const ok = { id: "x", agent: "gard", prompt: "p", risk: "LOW", fixture: { a: "a" }, change: { a: "b" }, expect: { maxLines: 5 } };
    assert.equal(validateQualityCases({ cases: [ok] }).cases.length, 1);
    assert.throws(() => validateQualityCases({ cases: [{ ...ok, agent: "zed" }] }), /not an agent/);
    assert.throws(() => validateQualityCases({ cases: [{ ...ok, change: {} }] }), /no change/);
    assert.throws(() => validateQualityCases({ cases: [{ ...ok, expect: { says: "x" } }] }), /list of regexes/);
    assert.throws(() => validateQualityCases({ cases: [{ ...ok, expect: { maybe: 1 } }] }), /expect takes/);
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

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dispatches, judge, names, parseRun, validateCases } from "../scripts/eval-routing.mjs";

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
  });

  test("an agent is brought in only by its name as an agent, never by prose or a negation", () => {
    assert.equal(names("Then I'll send it to **gard** for review.", "gard"), true);
    assert.equal(names("Pipe runs the migration in staging first.", "pipe"), true);
    assert.equal(names("Archie: confirm the deprecation window.", "archie"), true);
    assert.equal(names("Then pipe the output into jq.", "pipe"), false);
    assert.equal(names("No need for Gard here, it is a one-line change.", "gard"), false);
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
  });

  test("rejects a malformed case before spending anything", () => {
    const fixture = { "a.txt": "a" };
    assert.throws(() => validateCases({ fixture, cases: [] }), /non-empty/);
    assert.throws(() => validateCases({ fixture, cases: [{ id: "x", prompt: "p", risk: "LOW", expect: { maybe: 1 } }] }), /expect takes/);
    assert.throws(() => validateCases({ fixture, cases: [{ id: "x", prompt: "p", risk: "SOME", expect: { none: true } }] }), /risk/);
    assert.throws(() => validateCases({ fixture, cases: [{ id: "x", prompt: "p", risk: "LOW", expect: { includes: ["zed"] } }] }), /not an agent/);
  });

  test("--dry-run prints the plan and calls nothing", () => {
    const res = spawnSync(process.execPath, [path.join(REPO, "scripts", "eval-routing.mjs"), "--dry-run"], { encoding: "utf8" });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /high-auth/);
    assert.match(res.stdout, /Nothing was called/);
  });
});

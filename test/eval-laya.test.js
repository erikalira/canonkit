import { test } from "node:test";
import assert from "node:assert/strict";
import { createPlan } from "../evals/laya-cases.mjs";
import { scoreRun } from "../scripts/eval-laya.mjs";

const prediction = { kind: "prediction", path: "answers.owner.choice", equals: "Gard" };
const plan = (checks = [prediction]) => ({ suite_version: 1, cases: [{ id: "case", group: "toy", tool: "laya_predict", args: {}, checks }] });
const record = (result, extra = {}) => ({ id: "case", tool: "laya_predict", status: "CALLED", result, ...extra });
const audit = (...records) => ({ suite_version: 1, records });
const answer = (choice, fields = {}) => ({ answers: { owner: { choice, answer_confidence: 0.9, ...fields } } });

test("Laya plan is bounded, unique, synthetic and does not run model downloads", () => {
  const p = createPlan();
  assert.ok(p.cases.length >= 25 && p.cases.length <= 40);
  assert.equal(new Set(p.cases.map(item => item.id)).size, p.cases.length);
  for (const item of p.cases) {
    assert.ok(item.args && Array.isArray(item.checks));
    const hints = [item.args, ...(item.args.requests ?? [])];
    for (const hint of hints) if (hint.task === "typed_decisions") assert.ok(item.tool.startsWith("laya_route"));
  }
});
test("missing and duplicate calls are integration gaps with no quality verdict", () => {
  assert.deepEqual(scoreRun(plan(), audit()).integration, { MISSING: 1 });
  const r = record(answer("Gard"));
  const duplicate = scoreRun(plan(), audit(r, r));
  assert.deepEqual(duplicate.integration, { DUPLICATE: 1 });
  assert.deepEqual(duplicate.predictions, {});
});
test("failed/unavailable calls are never scored as bad model predictions", () => {
  for (const status of ["FAILED", "UNAVAILABLE"]) {
    const scored = scoreRun(plan(), audit(record(undefined, { status })));
    assert.equal(scored.integration[status], 1);
    assert.deepEqual(scored.predictions, {});
  }
});
test("a wrong confident choice counts as incorrect, a correct one as correct", () => {
  assert.deepEqual(scoreRun(plan(), audit(record(answer("Archie")))).predictions, { INCORRECT: 1 });
  assert.deepEqual(scoreRun(plan(), audit(record(answer("Gard")))).predictions, { CORRECT: 1 });
});
test("explicit low confidence and null outputs abstain instead of passing", () => {
  for (const result of [answer(null), answer("Gard", { low_confidence: true }), answer("Gard", { abstention: "abstained" })]) {
    assert.deepEqual(scoreRun(plan(), audit(record(result))).predictions, { ABSTAINED: 1 });
  }
});
test("missing prediction fields or confidence are unevaluated and malformed", () => {
  for (const result of [answer(undefined), { answers: { owner: { choice: "Gard" } } }]) {
    const scored = scoreRun(plan(), audit(record(result)));
    assert.deepEqual(scored.predictions, { UNEVALUATED: 1 });
    assert.deepEqual(scored.integration, { MALFORMED: 1 });
  }
});
test("false and zero schema values remain real observations", () => {
  const checks = [{ kind: "prediction", path: "values.refund", equals: false, confidencePath: "confidence.refund" }, { kind: "prediction", path: "values.urgency", equals: 0, confidencePath: "confidence.urgency" }];
  assert.deepEqual(scoreRun(plan(checks), audit(record({ values: { refund: false, urgency: 0 }, confidence: { refund: 0.9, urgency: 0.8 } }))).predictions, { CORRECT: 2 });
});
test("batch paths and comparisons score stability separately from correctness", () => {
  const p = plan();
  p.cases.push({ id: "batch", group: "toy", tool: "laya_predict_batch", checks: [{ ...prediction, path: "requests.0.answers.owner.choice" }, { kind: "comparison", path: "requests.0.answers.owner.choice", otherId: "case", otherPath: prediction.path }] });
  const scored = scoreRun(p, audit(record(answer("Gard")), { id: "batch", tool: "laya_predict_batch", status: "CALLED", result: { requests: [answer("Gard")] } }));
  assert.deepEqual(scored.predictions, { CORRECT: 2 });
  assert.deepEqual(scored.comparisons, { MATCH: 1 });
});
test("expected input rejection needs matching error evidence, not any failure", () => {
  const p = plan([]); p.cases[0].expected_error_contains = ["properties.note", "free string"];
  assert.deepEqual(scoreRun(p, audit(record(undefined, { status: "FAILED", error: "properties.note: free string not supported" }))).integration, { EXPECTED_REJECTION: 1 });
  assert.deepEqual(scoreRun(p, audit(record(undefined, { status: "FAILED", error: "server timed out" }))).integration, { UNEXPECTED_OUTCOME: 1 });
});
test("truncation checks are contracts, never semantic accuracy", () => {
  const scored = scoreRun(plan([{ kind: "contract", path: "usage.truncated", equals: true }]), audit(record({ usage: { truncated: true } })));
  assert.deepEqual(scored.integration, { CALLED: 1 });
  assert.deepEqual(scored.predictions, {});
});
test("unknown records and mismatched tool names cannot be accepted", () => {
  assert.throws(() => scoreRun(plan(), audit({ id: "unknown" })), /unknown audit record/);
  assert.deepEqual(scoreRun(plan(), audit(record(answer("Gard"), { tool: "laya_route" }))).integration, { WRONG_TOOL: 1 });
});
test("reported answer confidence is retained separately from entropy confidence", () => {
  const scored = scoreRun(plan(), audit(record(answer("Gard", { answer_confidence: 0.7, confidence: 0.05 }))));
  assert.equal(scored.cases[0].checks[0].confidence, 0.7);
  assert.equal(scored.cases[0].checks[0].confidence_field, "answer_confidence");
});

#!/usr/bin/env node
/**
 * Offline plan/scorer; it never calls MCP or loads a checkpoint.
 * --plan prints exact synthetic calls for an MCP-capable agent to execute.
 * --score audit.json reads {suite_version:1,records:[{id,tool,status,result,error?}]}.
 * Checks are contract (shape/control), prediction (pre-labeled), or comparison
 * (stability only, never accuracy). Confidence is reported as supplied, not
 * inferred from top probability or substituted for a different confidence field.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPlan } from "../evals/laya-cases.mjs";

const at = (value, dotted) => dotted.split(".").reduce((item, key) => item?.[key], value);
const finite = value => typeof value === "number" && Number.isFinite(value);
function matches(value, check) {
  if (Object.hasOwn(check, "equals")) return value === check.equals;
  if (check.range) return finite(value) && value >= check.range[0] && value <= check.range[1];
  if (Object.hasOwn(check, "truth")) return finite(value) && value >= 0 && value <= 1 && (value >= 0.5) === check.truth;
  if (check.type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (check.type) return typeof value === check.type;
  return value !== undefined;
}
function observed(result, check, pathKey = "path") {
  const field = check[pathKey], value = at(result, field);
  const answer = at(result, field.split(".").slice(0, -1).join("."));
  const confidence = check.confidencePath ? at(result, check.confidencePath) : (answer?.answer_confidence ?? answer?.confidence);
  const confidenceField = check.confidencePath ?? (answer?.answer_confidence !== undefined ? "answer_confidence" : "confidence");
  const flags = answer?.low_confidence === true || answer?.abstention === "abstained";
  if (value === null || flags) return { status: "ABSTAINED", value, confidence, confidence_field: confidenceField };
  if (value === undefined || !finite(confidence)) return { status: "UNEVALUATED", value, confidence, confidence_field: confidenceField };
  const validType = check.range || Object.hasOwn(check, "truth") ? finite(value) : Object.hasOwn(check, "equals") ? typeof value === typeof check.equals : ["string", "number", "boolean"].includes(typeof value);
  if (!validType) return { status: "UNEVALUATED", value, confidence, confidence_field: confidenceField };
  return { status: "OBSERVED", value, confidence, confidence_field: confidenceField };
}

/** Missing/duplicate/failed calls are integration gaps, never classifier errors. */
export function scoreRun(plan, audit) {
  if (plan?.suite_version !== 1 || audit?.suite_version !== 1 || !Array.isArray(plan.cases) || !Array.isArray(audit.records)) throw new Error("plan and audit require suite_version 1 and cases/records arrays");
  const ids = new Set();
  for (const item of plan.cases) {
    if (!item.id || ids.has(item.id) || !Array.isArray(item.checks)) throw new Error(`invalid or duplicated plan case: ${item.id}`);
    ids.add(item.id);
    if (item.checks.some(check => !["contract", "prediction", "comparison"].includes(check.kind))) throw new Error(`${item.id}: unsupported check kind`);
  }
  const indexed = new Map();
  for (const record of audit.records) {
    if (!record || !ids.has(record.id)) throw new Error(`unknown audit record: ${record?.id}`);
    indexed.set(record.id, [...(indexed.get(record.id) ?? []), record]);
  }
  const cases = plan.cases.map(item => {
    const records = indexed.get(item.id) ?? [];
    if (records.length !== 1) return { id: item.id, group: item.group, integration: records.length ? "DUPLICATE" : "MISSING", checks: [] };
    const record = records[0];
    if (record.tool !== item.tool) return { id: item.id, group: item.group, integration: "WRONG_TOOL", checks: [] };
    if (item.expected_error_contains) {
      const rejected = record.status === "FAILED" && typeof record.error === "string" && item.expected_error_contains.every(text => record.error.includes(text));
      return { id: item.id, group: item.group, integration: rejected ? "EXPECTED_REJECTION" : "UNEXPECTED_OUTCOME", checks: [] };
    }
    if (record.status !== "CALLED") return { id: item.id, group: item.group, integration: ["FAILED", "UNAVAILABLE"].includes(record.status) ? record.status : "INVALID_STATUS", checks: [] };
    if (!record.result || typeof record.result !== "object" || Array.isArray(record.result) || !Object.keys(record.result).length) return { id: item.id, group: item.group, integration: "MALFORMED", checks: [] };
    const checks = item.checks.map(check => {
      if (check.kind === "contract") {
        const value = at(record.result, check.path);
        return { kind: check.kind, path: check.path, status: matches(value, check) ? "PASS" : "FAIL", value };
      }
      const observation = observed(record.result, check);
      if (observation.status !== "OBSERVED") return { kind: check.kind, path: check.path, ...observation };
      if (check.kind === "comparison") {
        const others = indexed.get(check.otherId) ?? [];
        if (others.length !== 1 || others[0].status !== "CALLED") return { kind: check.kind, path: check.path, status: "UNEVALUATED" };
        const peer = observed(others[0].result, { path: check.otherPath });
        return { kind: check.kind, path: check.path, ...observation, status: peer.status === "OBSERVED" ? observation.value === peer.value ? "MATCH" : "DIFFERENT" : peer.status, other_value: peer.value };
      }
      return { kind: check.kind, path: check.path, ...observation, status: matches(observation.value, check) ? "CORRECT" : "INCORRECT" };
    });
    const malformed = checks.some(check => check.status === "UNEVALUATED" && check.kind !== "comparison");
    const contractFailed = checks.some(check => check.kind === "contract" && check.status === "FAIL");
    return { id: item.id, group: item.group, integration: malformed ? "MALFORMED" : contractFailed ? "CONTRACT_FAILED" : "CALLED", checks,
      telemetry: { routing: record.result.routing, model_counts: record.result.model_counts, device: record.result.device, latency_ms: record.result.latency_ms, total_latency_ms: record.result.total_latency_ms, per_request_latency_ms: record.result.per_request_latency_ms, usage: record.result.usage } };
  });
  const counts = items => items.reduce((out, status) => ({ ...out, [status]: (out[status] ?? 0) + 1 }), {});
  const summary = rows => ({ calls: rows.length, integration: counts(rows.map(row => row.integration)), predictions: counts(rows.flatMap(row => row.checks.filter(check => check.kind === "prediction").map(check => check.status))), comparisons: counts(rows.flatMap(row => row.checks.filter(check => check.kind === "comparison").map(check => check.status))) });
  return { suite_version: 1, environment: audit.environment, ...summary(cases), groups: Object.fromEntries([...new Set(cases.map(row => row.group))].map(group => [group, summary(cases.filter(row => row.group === group))])), cases };
}

function main(args) {
  if (args.length === 1 && args[0] === "--plan") return console.log(JSON.stringify(createPlan(), null, 2));
  if (args.length === 2 && args[0] === "--score") return console.log(JSON.stringify(scoreRun(createPlan(), JSON.parse(readFileSync(args[1], "utf8"))), null, 2));
  throw new Error("Usage: node scripts/eval-laya.mjs --plan | --score <audit.json>");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}

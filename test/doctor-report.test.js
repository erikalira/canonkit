import { test } from "node:test";
import assert from "node:assert/strict";
import { renderDoctorReport } from "../bin/doctor-report.js";

const rows = [
  { status: "OK", check: "agents", detail: "10 core agents in ~/.claude/agents", more: [] },
  { status: "OK", check: "models", detail: "match", more: [] },
  { status: "WARN", check: "agents leftovers", detail: "~/.agents has core-named copies: a, b", more: [] },
  { status: "OK", check: "security environment", detail: "detected win32, WSL none; sandbox unavailable", more: [] },
  { status: "WARN", check: "security claude shell", detail: "unavailable: native Windows shell has no containment", more: [] },
  { status: "WARN", check: "security codex", detail: "unknown: unsupported TOML", more: [] },
  { status: "WARN", check: "security remediation", detail: "partial: a very long paragraph", more: [] },
];

test("groups passes, keeps every warning by name, and counts failures", () => {
  const { lines, failed } = renderDoctorReport(rows);
  const out = lines.join("\n");
  assert.equal(failed, 0);
  assert.match(out, /✓ 2 checks passed/);
  assert.match(out, /! agents leftovers/);
  assert.match(out, /shell unavailable/);
  assert.match(out, /codex +! policy unknown/);
  assert.doesNotMatch(out, /very long paragraph|native Windows shell has no containment/);
  assert.match(out, /No check failed\. 4 warnings/);
  assert.ok(lines.length < 20);
});

test("a FAIL is marked and counted", () => {
  const { lines, failed } = renderDoctorReport([{ status: "FAIL", check: "agents", detail: "missing", more: ["fix it"] }]);
  assert.equal(failed, 1);
  assert.match(lines.join("\n"), /✗ agents +missing/);
  assert.match(lines.join("\n"), /1 check failed\./);
});

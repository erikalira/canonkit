import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { renderInstallReport, shortPath } from "../bin/install-report.js";

const home = path.resolve("/tmp/h");
const j = (...p) => path.join(home, ...p);

const run = [
  "Claude Code: fable, opus, sonnet, haiku; efforts low (from claude --help)",
  "Codex: unknown — codex debug models exited with status 1; its agents inherit the session model",
  `Catalog: ${j(".canonkit", "model-catalog.json")}`,
  `Installed 10 agents -> ${j(".claude", "agents")}`,
  `Installed 10 agents -> ${j(".codex", "agents")}`,
  `Installed 1 hook -> ${j(".claude", "hooks")}`,
  "",
  "  canonkit-hook.js is not referenced by ~/.claude/settings.json with required coverage under: Stop",
  "  These hooks are optional; native approvals remain authoritative. To opt in explicitly (backup first):",
  "    npx canonkit install --wire-hooks",
  '    "Stop": [{ "hooks": [{ "type": "command", "command": "node x" }] }]',
  `Installed 3 skills (a, b, c) -> ${j(".claude", "skills")}`,
  `already current: ${j("AGENTS.md")}`,
  "Core installed. Domain specialists are per project:",
  "  cd <project> && npx canonkit add <name>",
  "WARN something new and unexpected",
];

test("shortPath shows the home folder as ~", () => {
  assert.equal(shortPath(j(".claude", "agents"), home), "~/.claude/agents");
  assert.equal(shortPath(home, home), "~");
});

test("a second install says nothing changed and keeps every warning", () => {
  const out = renderInstallReport(run, { version: "9.9.9", home, changed: new Set() }).join("\n");
  assert.match(out, /Claude Code +10 agents · 1 hook · 3 skills +up to date/);
  assert.match(out, /Nothing to update/);
  assert.match(out, /Codex: session model/);
  assert.match(out, /! WARN something new and unexpected/);
  assert.doesNotMatch(out, /PreToolUse|"Stop"|Core installed/);
  assert.ok(out.split("\n").length < 20, "the summary stays short");
});

test("a first install reports what was updated", () => {
  const changed = new Set([j(".claude", "agents", "bob.md")]);
  const out = renderInstallReport(run, { home, changed }).join("\n");
  assert.match(out, /Claude Code .* updated/);
  assert.match(out, /Codex .* up to date/);
  assert.match(out, /Done\./);
});

test("a dry run and a failure say so", () => {
  assert.match(renderInstallReport(run, { home, dryRun: true }).join("\n"), /Nothing was written/);
  assert.match(renderInstallReport(run, { home, failed: true }).join("\n"), /did not finish/);
});

test("old backup copies collapse to one note per runtime", () => {
  const out = renderInstallReport([
    `Installed 10 agents -> ${j(".codex", "agents")}`,
    "  possible older copies of agents this repo owns: archie.toml.local.bak, bob.toml.local.bak",
    "  Codex does not load these — remove them yourself once you have checked.",
    "WARN security coverage: native-windows-shell-unsandboxed",
  ], { home }).join("\n");
  assert.match(out, /Codex: 2 old copies \(\*\.toml\.local\.bak\)/);
  assert.doesNotMatch(out, /archie|native-windows-shell/);
  assert.match(out, /Security .*1 note/);
});

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

test("interactive result headings name dry runs and failures without ANSI on piped output", () => {
  const dryRun = renderInstallReport([], { home, dryRun: true, interactive: true }).join("\n");
  const failed = renderInstallReport([], { home, failed: true, interactive: true }).join("\n");
  assert.match(dryRun, /── Dry run ──────────/);
  assert.match(failed, /── Installation incomplete ──────────/);
  assert.doesNotMatch(`${dryRun}${failed}`, /\u001b\[/);
});

test("a second install says nothing changed and keeps every warning", () => {
  const out = renderInstallReport(run, { version: "9.9.9", home, changed: new Set() }).join("\n");
  assert.match(out, /Claude Code +10 agents · 1 hook · 3 skills +up to date/);
  assert.match(out, /Nothing to update/);
  assert.match(out, /Codex: session model/);
  assert.match(out, /⚠ WARN something new and unexpected/);
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

test("successful project changes and warnings have distinct markers", () => {
  const out = renderInstallReport([
    "Installed nova -> .claude/agents/nova.md and .codex/agents/nova.toml",
    "Stack packs already current: typescript",
    "WARN tool graphify: 23 code files yielded no symbols",
  ], { home }).join("\n");
  assert.match(out, /✓ Installed nova ->/);
  assert.match(out, /✓ Stack packs already current: typescript/);
  assert.match(out, /⚠ graphify: 23 code files yielded no symbols/);
  assert.doesNotMatch(out, /! Installed nova|! Stack packs/);
});

test("tool setup result is grouped and CanonKit hook state is named explicitly", () => {
  const out = renderInstallReport([
    "OpenCode: fable, opus; available",
    "These hooks are optional; native approvals remain authoritative. To opt in explicitly:",
    "WARN tool graphify: Existing Graphify Git automation remains enabled (post-checkout, post-commit); it can run repository code.",
    "TOOL_SETUP_RESULT: OpenSpec configured Claude Code, Codex; 5 skills and 5 commands",
  ], { home }).join("\n");
  assert.match(out, /CanonKit hooks +inactive \(optional\)/);
  assert.match(out, /⚠ graphify: Existing Graphify Git automation remains enabled/);
  assert.match(out, /Project tools:\n  ✓ OpenSpec configured Claude Code, Codex; 5 skills and 5 commands/);
});

test("a dry run and a failure say so", () => {
  assert.match(renderInstallReport(run, { home, dryRun: true }).join("\n"), /Nothing was written/);
  assert.match(renderInstallReport(run, { home, failed: true }).join("\n"), /did not finish/);
});

test("the closing hint lists only remaining items by category", () => {
  const out = renderInstallReport(run, {
    home,
    remaining: { tools: ["graphify"], specialists: ["echo"], stacks: ["rust"] },
  }).join("\n");
  assert.match(out, /Tools: graphify — npx canonkit tool add <tool>/);
  assert.match(out, /Specialists: echo — npx canonkit add <name>/);
  assert.match(out, /Stack packs: rust — npx canonkit add <stack>/);
  assert.doesNotMatch(out, /openspec|maya|typescript/);
  assert.match(out, /Next: npx canonkit doctor \(verify\) · --verbose shows every step/);
  assert.doesNotMatch(out, /cd <project> && npx canonkit add/);
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

test("an ignored Windows claude has a warning marker and does not inflate the security notes count", () => {
  const warn = "WARN security claude: a Windows copy at /mnt/c/Users/me/npm/claude was ignored (it reads Windows settings, not these), so its version is unknown and version-gated settings are not added or updated by this install (existing ones are kept); install Claude Code inside WSL and re-run";
  const base = [`Installed 10 agents -> ${j(".claude", "agents")}`, "WARN security coverage: native-windows-shell-unsandboxed"];
  const withWarn = renderInstallReport([...base, warn], { home }).join("\n");
  assert.match(withWarn, /^  ⚠ security claude: a Windows copy at \/mnt\/c\/Users\/me\/npm\/claude was ignored .*install Claude Code inside WSL and re-run$/m);
  assert.match(withWarn, /Security .*1 note\b/);
  // Alone: still shown, and no "0 notes" or phantom note row.
  const alone = renderInstallReport([`Installed 10 agents -> ${j(".claude", "agents")}`, warn], { home }).join("\n");
  assert.match(alone, /^  ⚠ security claude: a Windows copy at /m);
  assert.doesNotMatch(alone, /\d+ notes?\b/);
  // Without the line the summary is what it was.
  const without = renderInstallReport(base, { home }).join("\n");
  assert.doesNotMatch(without, /Windows copy/);
  assert.match(without, /Security .*1 note\b/);
});

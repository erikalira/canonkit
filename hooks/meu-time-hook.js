#!/usr/bin/env node
/**
 * Meu Time — mechanical enforcement + process-observability hook.
 *
 * Wired (in ~/.claude/settings.json) to PreToolUse, SubagentStop, UserPromptSubmit, Stop.
 * Three jobs:
 *   1. ENFORCEMENT — turn the team's soft HIGH-risk gates into mechanical ones:
 *        - git commit / git push  -> require explicit confirmation (Bob's rule)
 *        - edits to HIGH-risk surfaces (auth, secrets, migrations, contracts) -> confirm
 *          (forces Archie/Gard consideration even if risk was misjudged as LOW)
 *        - edits to lighthouserc (performance budgets) -> confirm (Perry owns loosening)
 *        - obvious secrets in written content -> block (Gard as a tripwire)
 *   2. OBSERVABILITY — append a structured event line that the dashboard reads.
 *   3. DEFINITION-OF-DONE — on Stop, if this session touched a gated surface
 *      (HIGH-risk, a secret, or a performance budget) without an independent
 *      reviewer (Quinn/Gard/Archie/Perry/...) being dispatched AFTER that gate,
 *      block the stop ONCE with a reminder (no self-merge on HIGH risk).
 *
 * EVERY SHELL IS A SHELL. This runs on Windows, where the harness's primary shell
 * tool is PowerShell, not Bash. A gate wired only to Bash is a gate with a side
 * door: `git commit`, or `Set-Content .env`, through the other tool would sail
 * past it. Bash and PowerShell therefore share one code path here, and the
 * settings matcher must list both. Same reasoning for NotebookEdit next to Edit/Write.
 *
 * Tests: `npm test` in the agent-team-config repo (test/meu-time-hook.test.js) — 18 hermetic
 * cases. This file is the installed copy; fix it in the repo, not here.
 *
 * DESIGN RULE: fail-open. Any internal error -> exit 0 (allow). A buggy hook must
 * never brick the user's workflow; the agents (Gard/Quinn/Archie) are the real review.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG_DIR = path.join(os.homedir(), '.claude', 'meu-time-activity');
const LOG_FILE = path.join(LOG_DIR, 'events.jsonl');
// The Stop gate reads this whole file at every turn end, so it cannot grow
// unbounded. One rotation is enough: the gate only ever asks about this session.
const MAX_LOG_BYTES = 2 * 1024 * 1024;

let SESSION = ''; // set in main() from the hook input; tags every event for per-session queries

function log(event) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    try {
      if (fs.statSync(LOG_FILE).size > MAX_LOG_BYTES) fs.renameSync(LOG_FILE, LOG_FILE + '.1');
    } catch (_) { /* no file yet, or a raced rename — either way, just append */ }
    fs.appendFileSync(LOG_FILE, JSON.stringify({ ts: Date.now(), session: SESSION, ...event }) + '\n');
  } catch (_) { /* never throw from logging */ }
}

function readEvents() {
  try {
    return fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n')
      .map((l) => { try { return JSON.parse(l); } catch (_) { return null; } }).filter(Boolean);
  } catch (_) { return []; }
}

// Agents that count as an independent reviewer for the definition-of-done gate.
// perry is here because he owns performance budgets: the rule says only Perry
// loosens one, and until now the gate that enforces "reviewed by someone" had
// no idea he existed, so the one person who could sign off could not.
const REVIEWER = /^(quinn|gard|archie|perry|ws-contract|multiplayer-isolation|next-perf-reviewer)/;

function ask(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

// HIGH-risk file surfaces — editing these is never truly LOW risk.
// Split in two on purpose. STRONG terms are unambiguous anywhere in a path
// (`authClient.ts`, `useOauth.ts`). WORD terms are ordinary English that shows up
// in ordinary code (`tokenizer.ts`, `sessionStorage.ts`), so they only count on a
// path-segment boundary. A gate that cries wolf is a gate people click through.
const HIGH_RISK_STRONG = /(auth|oauth|jwt|passport|secret|credential|\.env|rbac|schema\.prisma|prisma[\/\\]migrations)/i;
const HIGH_RISK_WORD = /(^|[\/\\._-])(login|sessions?|tokens?|contracts?|permissions?|acl|gateway|migrations?)([\/\\._-]|$)/i;
// Generated, vendored or throwaway: never the surface the gate is about.
const NOISE_PATH = /(node_modules|[\/\\]\.next|[\/\\]dist|[\/\\]build|coverage|graphify-out|[\/\\]\.git[\/\\])/i;
const TEST_PATH = /(\.test\.|\.spec\.|__tests__|__mocks__|[\/\\]fixtures?[\/\\]|[\/\\]mocks?[\/\\]|\.example$|\.sample$)/i;

function isHighRisk(fp) {
  if (!fp || NOISE_PATH.test(fp) || TEST_PATH.test(fp)) return false;
  return HIGH_RISK_STRONG.test(fp) || HIGH_RISK_WORD.test(fp);
}

// Perf budgets: a HIGH-risk surface with a different owner. Anyone may tighten a
// threshold; only Perry loosens one, and only with a measured floor.
const PERF_BUDGET_PATH = /lighthouserc/i;

// High-confidence secrets — almost never intentional in source.
const HARD_SECRET = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bAIza[0-9A-Za-z_\-]{35}\b/,
];
// Lower-confidence — surface to user instead of hard block.
const SOFT_SECRET = /(password|passwd|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*['"][^'"\s]{8,}['"]/i;

// A shell writes files too. Pull the destinations out of a command so the same
// path gates cover `echo ... > src/auth/x.ts` and `Set-Content lighthouserc.json`
// as well as an Edit. Targets only — testing the whole command string would fire
// on every `grep auth src > out.txt`, and a noisy gate is a dead gate.
function shellWriteTargets(cmd) {
  const out = [];
  let m;
  const redirect = /(?:^|[^0-9>])>>?\s*(["']?)([^\s"'|;&]+)\1/g;
  while ((m = redirect.exec(cmd))) out.push(m[2]);
  const tee = /\btee\s+(?:-a\s+)?(["']?)([^\s"'|;&]+)\1/g;
  while ((m = tee.exec(cmd))) out.push(m[2]);
  const psWrite = /\b(?:Set-Content|Add-Content|Out-File|New-Item)\b[^\n;|]*?(?:-(?:Path|FilePath)\s+)?(["']?)([A-Za-z0-9_.\/\\:-]+\.[A-Za-z0-9]+)\1/gi;
  while ((m = psWrite.exec(cmd))) out.push(m[2]);
  return out;
}

function main() {
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch (_) {}
  let input = {};
  try { input = JSON.parse(raw || '{}'); } catch (_) {}

  const eventName = input.hook_event_name || '';
  const tool = input.tool_name || '';
  const ti = input.tool_input || {};
  const cwd = input.cwd || process.cwd();
  const project = path.basename(cwd);
  SESSION = input.session_id || '';

  // ---- DEFINITION-OF-DONE gate (Stop) ----
  if (eventName === 'Stop') {
    if (input.stop_hook_active) process.exit(0); // already nudged once this turn — don't loop
    const evs = readEvents().filter((e) => e.session && e.session === SESSION);
    // perf-budget joins the gated kinds. This hook only ever sees the file path,
    // never the direction of the change, so it cannot tell a tightening (which
    // anyone may do) from a loosening (which only Perry may do). It gates both.
    // That is deliberate: a false gate costs one dispatch, while a false pass
    // costs the budget — which is exactly how a performance gate dies without
    // anyone deciding to kill it.
    const GATED = /high-risk-surface|secret-block|secret-ask|perf-budget/;
    const gates = evs.filter((e) => e.event === 'gate' && GATED.test(e.kind || ''));
    // The reviewer has to post-date the last gated edit. Session-wide credit let a
    // Gard dispatch from the morning clear an unrelated lighthouserc edit made in
    // the afternoon: "somebody was reviewed at some point today" is not review.
    const lastGate = gates.reduce((max, e) => Math.max(max, e.ts || 0), 0);
    const reviewed = evs.some(
      (e) => e.event === 'agent_start' && REVIEWER.test(e.agent || '') && (e.ts || 0) > lastGate
    );
    if (gates.length && !reviewed) {
      const files = [...new Set(gates.map((e) => e.file).filter(Boolean))].join(', ') || 'a HIGH-risk surface';
      process.stdout.write(JSON.stringify({
        decision: 'block',
        reason: `Definition-of-done gate: this session edited gated surfaces (${files}) and no independent reviewer was dispatched after the last of those edits. Per the no-self-merge rule, dispatch Quinn (acceptance criteria), Gard (security), Archie (contract) or Perry (performance budgets) to confirm before declaring done — OR state explicitly why review isn't needed (e.g. trivial, user-authorized). This fires once per turn.`,
      }));
      process.exit(0);
    }
    process.exit(0);
  }

  // ---- OBSERVABILITY (never blocks) ----
  if (eventName === 'UserPromptSubmit') {
    log({ event: 'prompt', project });
    process.exit(0);
  }
  if (eventName === 'SubagentStop') {
    log({ event: 'agent_stop', project });
    process.exit(0);
  }
  if (tool === 'Agent' || tool === 'Task') {
    log({
      event: 'agent_start',
      agent: ti.subagent_type || 'unknown',
      task: ti.description || '',
      // The rule says every planned dispatch names its model. Logging it is what
      // makes that checkable after the fact instead of an intention nobody can
      // audit; empty means the dispatch inherited the agent's frontmatter model.
      model: ti.model || '',
      project,
    });
    process.exit(0); // dispatching a subagent is always allowed
  }

  // ---- ENFORCEMENT: shells (Bash on POSIX, PowerShell on Windows) ----
  if (tool === 'Bash' || tool === 'PowerShell') {
    const cmd = String(ti.command || '');
    if (/\bgit\s+(commit|push)\b/.test(cmd)) {
      log({ event: 'gate', kind: 'git', detail: cmd.slice(0, 80), project, tool });
      ask('Meu Time gate: git commit/push requires explicit user authorization (Bob/Pipe rule). Confirm to proceed.');
    }
    const targets = shellWriteTargets(cmd);
    if (targets.length) {
      for (const re of HARD_SECRET) {
        if (re.test(cmd)) {
          log({ event: 'gate', kind: 'secret-block', file: targets[0], project, tool });
          deny('Meu Time gate (Gard): this command writes a high-confidence secret (private key / cloud key) to a file. Blocked. Move it to an env var / secret store.');
        }
      }
      if (SOFT_SECRET.test(cmd) && !targets.some((t) => TEST_PATH.test(t))) {
        log({ event: 'gate', kind: 'secret-ask', file: targets[0], project, tool });
        ask('Meu Time gate (Gard): this command writes what looks like a hardcoded credential to a file. Confirm this is intentional and not a real secret.');
      }
      const perf = targets.find((t) => PERF_BUDGET_PATH.test(t));
      if (perf) {
        log({ event: 'gate', kind: 'perf-budget', file: perf, project, tool });
        ask(`Meu Time gate (Perry): this command writes "${path.basename(perf)}", which carries the performance budgets. Anyone may tighten a threshold; only Perry loosens one, and only with a measured floor. Derivations live in docs/adr/. Confirm to proceed.`);
      }
      const risky = targets.find((t) => isHighRisk(t));
      if (risky) {
        log({ event: 'gate', kind: 'high-risk-surface', file: risky, project, tool });
        ask(`Meu Time gate: this command writes "${path.basename(risky)}", a HIGH-risk surface (auth/secret/migration/contract). Archie/Gard review applies even if this felt LOW. Confirm to proceed.`);
      }
    }
    process.exit(0);
  }

  // ---- ENFORCEMENT: file-editing tools ----
  if (tool === 'Edit' || tool === 'Write' || tool === 'MultiEdit' || tool === 'NotebookEdit') {
    const fp = String(ti.file_path || ti.notebook_path || ti.path || '');
    const content = String(
      ti.content || ti.new_string || ti.new_source ||
      (Array.isArray(ti.edits) ? ti.edits.map((e) => e.new_string || '').join('\n') : '')
    );

    for (const re of HARD_SECRET) {
      if (re.test(content)) {
        log({ event: 'gate', kind: 'secret-block', file: fp, project, tool });
        deny('Meu Time gate (Gard): a high-confidence secret (private key / cloud key) was detected in this write. Blocked. Move it to an env var / secret store.');
      }
    }
    if (SOFT_SECRET.test(content) && !TEST_PATH.test(fp)) {
      log({ event: 'gate', kind: 'secret-ask', file: fp, project, tool });
      ask('Meu Time gate (Gard): looks like a hardcoded credential. Confirm this is intentional and not a real secret.');
    }
    if (PERF_BUDGET_PATH.test(fp)) {
      log({ event: 'gate', kind: 'perf-budget', file: fp, project, tool });
      ask(`Meu Time gate (Perry): "${path.basename(fp)}" carries the performance budgets. Anyone may tighten a threshold; only Perry loosens one, and only with a measured floor. Derivations live in docs/adr/. Confirm to proceed.`);
    }
    if (isHighRisk(fp)) {
      log({ event: 'gate', kind: 'high-risk-surface', file: fp, project, tool });
      ask(`Meu Time gate: "${path.basename(fp)}" is a HIGH-risk surface (auth/secret/migration/contract). Archie/Gard review applies even if this felt LOW. Confirm to proceed.`);
    }
    process.exit(0);
  }

  process.exit(0); // default allow
}

try { main(); } catch (_) { process.exit(0); /* fail-open */ }

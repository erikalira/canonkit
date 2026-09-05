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
 *      reviewer (Quinn/Gard/Archie/Perry/...) being dispatched, block the stop
 *      ONCE with a reminder (no self-merge on HIGH risk).
 *
 * DESIGN RULE: fail-open. Any internal error -> exit 0 (allow). A buggy hook must
 * never brick the user's workflow; the agents (Gard/Quinn/Archie) are the real review.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG_DIR = path.join(os.homedir(), '.claude', 'meu-time-activity');
const LOG_FILE = path.join(LOG_DIR, 'events.jsonl');

let SESSION = ''; // set in main() from the hook input; tags every event for per-session queries

function log(event) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
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
const REVIEWER = /^(quinn|gard|archie|perry|ws-contract|multiplayer-isolation)/;

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
const HIGH_RISK_PATH = /(auth|login|session|token|jwt|oauth|passport|\.env|secret|credential|\bmigration|schema\.prisma|prisma[\/\\]migrations|gateway|contracts?|permission|rbac|\bacl\b)/i;

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
    const highRisk = evs.filter((e) => e.event === 'gate' && GATED.test(e.kind || ''));
    const reviewed = evs.some((e) => e.event === 'agent_start' && REVIEWER.test(e.agent || ''));
    if (highRisk.length && !reviewed) {
      const files = [...new Set(highRisk.map((e) => e.file).filter(Boolean))].join(', ') || 'a HIGH-risk surface';
      process.stdout.write(JSON.stringify({
        decision: 'block',
        reason: `Definition-of-done gate: this session edited gated surfaces (${files}) without dispatching an independent reviewer. Per the no-self-merge rule, dispatch Quinn (acceptance criteria), Gard (security), Archie (contract) or Perry (performance budgets) to confirm before declaring done — OR state explicitly why review isn't needed (e.g. trivial, user-authorized). This fires once per turn.`,
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

  // ---- ENFORCEMENT (PreToolUse on Bash / Edit / Write) ----
  if (tool === 'Bash') {
    const cmd = String(ti.command || '');
    if (/\bgit\s+(commit|push)\b/.test(cmd)) {
      log({ event: 'gate', kind: 'git', detail: cmd.slice(0, 80), project });
      ask('Meu Time gate: git commit/push requires explicit user authorization (Bob/Pipe rule). Confirm to proceed.');
    }
    process.exit(0);
  }

  if (tool === 'Edit' || tool === 'Write' || tool === 'MultiEdit') {
    const fp = String(ti.file_path || ti.path || '');
    const content = String(
      ti.content || ti.new_string ||
      (Array.isArray(ti.edits) ? ti.edits.map((e) => e.new_string || '').join('\n') : '')
    );

    for (const re of HARD_SECRET) {
      if (re.test(content)) {
        log({ event: 'gate', kind: 'secret-block', file: fp, project });
        deny('Meu Time gate (Gard): a high-confidence secret (private key / cloud key) was detected in this write. Blocked. Move it to an env var / secret store.');
      }
    }
    if (SOFT_SECRET.test(content) && !/\.example$|\.sample$|test|fixture|mock/i.test(fp)) {
      log({ event: 'gate', kind: 'secret-ask', file: fp, project });
      ask('Meu Time gate (Gard): looks like a hardcoded credential. Confirm this is intentional and not a real secret.');
    }
    if (PERF_BUDGET_PATH.test(fp)) {
      log({ event: 'gate', kind: 'perf-budget', file: fp, project });
      ask(`Meu Time gate (Perry): "${path.basename(fp)}" carries the performance budgets. Anyone may tighten a threshold; only Perry loosens one, and only with a measured floor. Derivations live in docs/adr/. Confirm to proceed.`);
    }
    if (HIGH_RISK_PATH.test(fp)) {
      log({ event: 'gate', kind: 'high-risk-surface', file: fp, project });
      ask(`Meu Time gate: "${path.basename(fp)}" is a HIGH-risk surface (auth/secret/migration/contract). Archie/Gard review applies even if this felt LOW. Confirm to proceed.`);
    }
    process.exit(0);
  }

  process.exit(0); // default allow
}

try { main(); } catch (_) { process.exit(0); /* fail-open */ }

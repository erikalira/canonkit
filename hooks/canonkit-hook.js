#!/usr/bin/env node
/**
 * canonkit — mechanical enforcement + process-observability hook.
 *
 * Wired (in ~/.claude/settings.json) to PreToolUse, PostToolUse (agents + context tools),
 * SubagentStop, UserPromptSubmit, Stop. Three jobs:
 *   1. ENFORCEMENT — turn the team's soft HIGH-risk gates into mechanical ones:
 *        - git commit / git push  -> require explicit confirmation (Bob's rule)
 *        - edits to HIGH-risk surfaces (auth, secrets, migrations, contracts) -> confirm
 *          (forces Archie/Gard consideration even if risk was misjudged as LOW)
 *        - edits to performance-budget files (lighthouserc, size-limit, ...) -> confirm
 *          (Perry owns loosening)
 *        - obvious secrets in written content -> block (Gard as a tripwire)
 *      A project tunes the path heuristics in .claude/canonkit.json (see PROJECT
 *      CONFIG below); nothing there reaches the content checks.
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
 * Tests: `npm test` in the agent-team-config repo (test/canonkit-hook.test.js) — hermetic,
 * real process. This file is the installed copy; fix it in the repo, not here.
 *
 * DESIGN RULE: fail-open. Any internal error -> exit 0 (allow). A buggy hook must
 * never brick the user's workflow; the agents (Gard/Quinn/Archie) are the real review.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG_DIR = path.join(os.homedir(), '.claude', 'canonkit-activity');
const LOG_FILE = path.join(LOG_DIR, 'events.jsonl');
// Before the rename the log lived here. `install` moves it; until it has (or if
// the move failed), reads fall through to it, so a gated edit made just before
// the upgrade still counts at the next Stop. Nothing is ever written here.
const LEGACY_LOG_FILE = path.join(os.homedir(), '.claude', 'meu-time-activity', 'events.jsonl');
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

// withRotated: also read events.jsonl.1, for lookups that must survive a rotation
// landing between two halves of the same dispatch.
function readEvents(withRotated = false) {
  const files = [];
  for (const f of [LEGACY_LOG_FILE, LOG_FILE]) files.push(...(withRotated ? [f + '.1', f] : [f]));
  const out = [];
  for (const f of files) {
    try {
      for (const l of fs.readFileSync(f, 'utf8').trim().split('\n')) {
        try { const e = JSON.parse(l); if (e) out.push(e); } catch (_) {}
      }
    } catch (_) {}
  }
  return out;
}

// ---- DISPATCH METRICS ----
// Where each number comes from was captured from real payloads, not assumed
// (2026-10-15, Claude Code 2.1.300):
//   PreToolUse(Agent)    tool_input.{model, effort}, tool_use_id. No usage.
//   PostToolUse(Agent)   foreground: status "completed", agentId, resolvedModel,
//                        totalDurationMs, totalToolUseCount, usage — but usage and
//                        totalTokens describe only the LAST API call (≈ final context
//                        size): a 5-call probe reported cache_read 75k where its calls
//                        summed 348k. Background (the default): status
//                        "async_launched", agentId, resolvedModel; no usage, no duration.
//   SubagentStop         agent_id, agent_transcript_path; no usage, no duration. Fires
//                        more than once per agent (again after a stop hook continues it).
// So tokens are summed from the subagent's transcript, where every API call is one
// assistant entry carrying its own usage, and a dispatch is identified by
// tool_use_id — the only id both PreToolUse and PostToolUse carry. Only numbers
// and metadata are logged: never the prompt, never the result.
//
// output is a lower bound (checked 2026-10-19, Claude Code 2.1.300): a call split
// over several entries mostly repeats the count from the start of its stream (6,
// 8, 16 tokens), and for many calls the final count is never written. The largest
// value seen per call is kept; input and cache numbers are complete.
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const safeId = (v) => (typeof v === 'string' && /^[\w-]{1,64}$/.test(v) ? v : '');

function scanTranscript(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (_) { return { tokens: null, handback: null }; }
  const calls = new Map(); // keyed by message id: a call split over entries counts once
  let handback = null;
  for (const line of text.split('\n')) {
    if (!line.includes('"assistant"')) continue; // skip parsing the bulk of the file
    let e;
    try { e = JSON.parse(line); } catch (_) { continue; }
    const m = e && e.type === 'assistant' && e.message;
    if (!m) continue;
    if (m.usage && typeof m.usage === 'object') {
      const key = m.id || e.requestId || e.uuid;
      const prev = calls.get(key);
      const output = Math.max(num(prev && prev.output_tokens), num(m.usage.output_tokens));
      calls.set(key, { ...m.usage, output_tokens: output });
    }
    for (const b of Array.isArray(m.content) ? m.content : []) {
      if (b && b.type === 'tool_use' && b.name === 'SubagentHandback' && b.input && typeof b.input.message === 'string') {
        handback = b.input.message.length;
      }
    }
  }
  return { tokens: usageTotals(calls), handback };
}

const transcriptUsage = (file) => scanTranscript(file).tokens;

function usageTotals(calls) {
  if (!calls.size) return null;
  const t = { api_calls: calls.size, input: 0, output: 0, cache_read: 0, cache_creation: 0 };
  for (const u of calls.values()) {
    t.input += num(u.input_tokens);
    t.output += num(u.output_tokens);
    t.cache_read += num(u.cache_read_input_tokens);
    t.cache_creation += num(u.cache_creation_input_tokens);
  }
  t.total = t.input + t.output + t.cache_read + t.cache_creation;
  return t;
}

// The report a dispatch hands back is re-read by the caller on every later turn,
// so its size is a cost of its own, apart from the tokens the subagent spent.
// Foreground: tool_response.content (text blocks). Background: the message of the
// subagent's last SubagentHandback call, read from its transcript — the runtime
// returns the report through that tool, and last_assistant_message then holds a
// short closing line or nothing (seen 2026-10-19); it stays the fallback for a
// transcript without one. Only the length is logged, never the text.
function reportChars(v) {
  if (typeof v === 'string') return v.length;
  if (!Array.isArray(v)) return null;
  const texts = v.filter((b) => b && b.type === 'text' && typeof b.text === 'string');
  return texts.length ? texts.reduce((n, b) => n + b.text.length, 0) : null;
}

// ---- MAIN-THREAD TOOL VOLUME ----
// PostToolUse carries structured Output, NOT the rendered model tool_result.
// Fields checked against @anthropic-ai/claude-agent-sdk 0.3.300 sdk-tools.d.ts;
// PowerShell's stdout/stderr and agent_id semantics checked in Claude Code
// 2.1.302's runtime schema. No generic JSON.stringify fallback: it would count
// paths, input metadata and binary data as context. Unknown/non-text output is
// unmeasured. This is payload text volume, not tokens or exact context growth.
function textSize(text) {
  let lines = text.length ? 1 : 0;
  const newline = /\r\n|\r|\n/g;
  while (newline.exec(text)) lines++;
  if (/[\r\n]$/.test(text)) lines--; // a final terminator is not another line
  return { chars: text.length, lines }; // JS UTF-16 units, like report_chars
}

function toolResultSize(tool, r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
  if (tool === 'Read') {
    return r.type === 'text' && r.file && typeof r.file.content === 'string'
      ? textSize(r.file.content) : null;
  }
  if (tool === 'Grep' && (r.mode === 'content' || r.mode === 'count')) {
    return typeof r.content === 'string' ? textSize(r.content) : null;
  }
  if (tool === 'Glob' || (tool === 'Grep' && (r.mode === undefined || r.mode === 'files_with_matches'))) {
    return Array.isArray(r.filenames) && r.filenames.every((f) => typeof f === 'string')
      ? textSize(r.filenames.join('\n')) : null;
  }
  if (tool === 'Bash' || tool === 'PowerShell') {
    if (r.isImage || typeof r.stdout !== 'string' || typeof r.stderr !== 'string') return null;
    const out = textSize(r.stdout), err = textSize(r.stderr);
    return { chars: out.chars + err.chars, lines: out.lines + err.lines };
  }
  return null;
}

// PostToolUse names the parent transcript, not the subagent's. The subagent's sits
// beside it as <session>/subagents/agent-<id>.jsonl; if that layout ever changes the
// read fails and tokens are logged as null rather than guessed.
function subagentTranscript(parentTranscript, agentId) {
  if (typeof parentTranscript !== 'string' || !agentId) return '';
  return path.join(parentTranscript.replace(/\.jsonl$/, ''), 'subagents', `agent-${agentId}.jsonl`);
}

// ---- CONTEXT-SIZE REMINDER (UserPromptSubmit) ----
// Enforced half of the "New session when the subject changes" rule. A long session is
// re-read in full on every turn, so the cost of bundling unrelated jobs grows
// silently; this puts the size in front of the model when it crosses a band.
// Contract (docs: code.claude.com/docs/en/hooks, checked 2026-10-15): stdin carries
// session_id + transcript_path; stdout
//   {"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"..."}}
// adds context alongside the prompt and exit 0 never blocks it. The transcript is
// written asynchronously, so the figure can lag one turn — fine for a reminder.
// The 100k first band is a STARTING GUESS, not a measured threshold: tune it with
// CANONKIT_CONTEXT_BANDS (comma-separated token counts; "off" disables). The
// pre-rename MEU_TIME_CONTEXT_BANDS is still read when the new one is unset.
const DEFAULT_BANDS = [100000, 150000, 200000];
const TAIL_BYTES = 512 * 1024; // the last assistant entry is always near the end
const BANDS_FILE = path.join(LOG_DIR, 'context-bands.json');
const MAX_TRACKED_SESSIONS = 50;

function contextBands() {
  const raw = process.env.CANONKIT_CONTEXT_BANDS ?? process.env.MEU_TIME_CONTEXT_BANDS;
  if (raw === undefined || raw.trim() === '') return DEFAULT_BANDS;
  if (/^(off|0|none)$/i.test(raw.trim())) return [];
  const bands = raw.split(',').map((x) => Number(x.trim())).filter((n) => Number.isFinite(n) && n > 0);
  return bands.length ? [...new Set(bands)].sort((a, b) => a - b) : DEFAULT_BANDS;
}

// Context size = what the most recent main-chain API call consumed as input.
// Read from the end only: transcripts reach several MB.
function currentContextTokens(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const size = fs.fstatSync(fd).size;
    const len = Math.min(size, TAIL_BYTES);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    const lines = buf.toString('utf8').split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      if (!lines[i].includes('"usage"')) continue;
      let e;
      try { e = JSON.parse(lines[i]); } catch (_) { continue; } // first line may be cut mid-entry
      const u = e && e.type === 'assistant' && !e.isSidechain && e.message && e.message.usage;
      if (!u || typeof u !== 'object') continue;
      const total = num(u.input_tokens) + num(u.cache_read_input_tokens) + num(u.cache_creation_input_tokens);
      if (total > 0) return total;
    }
  } catch (_) { /* unreadable: do nothing */ } finally {
    if (fd !== undefined) try { fs.closeSync(fd); } catch (_) {}
  }
  return null;
}

function contextReminder(input) {
  const bands = contextBands();
  if (!bands.length || !SESSION || typeof input.transcript_path !== 'string') return null;
  const tokens = currentContextTokens(input.transcript_path);
  if (tokens === null) return null;

  let state = {};
  try { state = JSON.parse(fs.readFileSync(BANDS_FILE, 'utf8')) || {}; } catch (_) {}
  const reached = bands.filter((b) => tokens >= b).pop() || 0; // 0: below every band
  const last = num(state[SESSION]);
  // Below every band (e.g. after /compact) the record is dropped so the next climb reminds again.
  if (reached === 0 && !(SESSION in state)) return null;
  if (reached !== 0 && reached <= last) return null;

  if (reached === 0) delete state[SESSION]; else state[SESSION] = reached;
  const keys = Object.keys(state);
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_TRACKED_SESSIONS))) delete state[k];
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.writeFileSync(BANDS_FILE, JSON.stringify(state));
  } catch (_) { /* cannot persist: skip the reminder rather than repeat it every turn */ return null; }
  if (reached === 0) return null;

  log({ event: 'gate', kind: 'context-size', tokens, band: reached, project: path.basename(input.cwd || process.cwd()) });
  return `This session's context is at ~${Math.round(tokens / 1000)}k tokens. If the request does not depend on what came before, suggest a new session with a handoff, and end with the new session's opening prompt in a fenced block, ready to paste (rule 'New session when the subject changes').`;
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
// A bare `token(s)` is not here: design tokens, context/LLM tokens and lexer
// tokens are far more common in paths than credentials. Only a token that names
// what kind it is (`refresh_token`, `access-token.ts`) or a module that manages
// them (`token-store.ts`, `token_service.py`) counts; `auth/tokens.ts` is caught
// by the STRONG `auth` term anyway. Vendor/PAT tokens (`github_token`,
// `npm-token`) and the dotfiles that hold registry credentials stay gated: the
// secret-content check does not recognise ghp_/npm_ values, so the path is the
// only backstop for them.
const HIGH_RISK_WORD = /(^|[\/\\._-])(acl|migrations?|(refresh|access|id|auth|api|bearer|csrf|device|reset|session|jwt|pat|github|gh|npm|pypi|personal|service)[_-]?tokens?|tokens?[_-](store|storage|service|manager|vault|rotation|refresh|validation|verify|issuer)|\.?(npmrc|netrc|pypirc))([\/\\._-]|$)/i;
// AMBIGUOUS words name UI and domain folders as often as security surfaces: a
// `components/sessions/` list, a CRM's `contracts/`, a `docs/gateway.md`. They
// count only in code outside a presentational folder. `views` is deliberately not
// presentational (Django views are the request handlers), nor is `pages`
// (`pages/api/login.ts` is an endpoint), nor `docs/` as a folder: an OpenAPI file
// under docs/contracts/ is still a contract — only prose files are let through.
const AMBIGUOUS_WORD = /(^|[\/\\._-])(login|sessions?|contracts?|permissions?|gateway)([\/\\._-]|$)/i;
const PROSE_OR_STYLE = /\.(md|mdx|markdown|txt|rst|adoc|css|scss|sass|less|styl|svg|png|jpe?g|gif|webp|ico)$/i;
const PRESENTATIONAL = /(^|[\/\\])(components?|ui|styles?|stories|assets|icons|locales|i18n)[\/\\]|\.stories\.[cm]?[jt]sx?$/i;
// Paths that hold credentials. A project's `exclude` never reaches these: the
// content check does not recognise every token format (ghp_, npm_), so for these
// files the path is the only backstop.
const SECRET_PATH = /(\.env|secret|credential|(^|[\/\\._-])\.?(npmrc|netrc|pypirc)([\/\\._-]|$)|(^|[\/\\._-])(refresh|access|auth|api|bearer|session|jwt|pat|github|gh|npm|pypi|personal|service)[_-]?tokens?([\/\\._-]|$))/i;
// The file that tunes these gates is itself a gate: loosening it is a decision.
const CONFIG_PATH = /(^|[\/\\])\.claude[\/\\]canonkit\.json$/i;
// Generated, vendored or throwaway: never the surface the gate is about.
const NOISE_PATH = /(node_modules|[\/\\]\.next|[\/\\]dist|[\/\\]build|coverage|graphify-out|[\/\\]\.git[\/\\])/i;
const TEST_PATH = /(\.test\.|\.spec\.|__tests__|__mocks__|[\/\\]fixtures?[\/\\]|[\/\\]mocks?[\/\\]|\.example$|\.sample$)/i;

// Order is the contract: include (explicit) > noise/test > secret paths
// (never excludable) > exclude > the built-in heuristics.
function isHighRisk(fp, cfg) {
  if (!fp) return false;
  if (CONFIG_PATH.test(fp)) return true;
  const rel = cfg.rel(fp);
  if (cfg.include.some((m) => m(rel))) return true;
  if (NOISE_PATH.test(fp) || TEST_PATH.test(fp)) return false;
  if (SECRET_PATH.test(fp)) return true;
  if (cfg.exclude.some((m) => m(rel))) return false;
  return HIGH_RISK_STRONG.test(fp) || HIGH_RISK_WORD.test(fp) ||
    (AMBIGUOUS_WORD.test(fp) && !PROSE_OR_STYLE.test(fp) && !PRESENTATIONAL.test(fp));
}

// Perf budgets: a HIGH-risk surface with a different owner. Anyone may tighten a
// threshold; only Perry loosens one, and only with a measured floor. Perry is
// stack-agnostic, so the gate knows the common budget files, and a project adds
// its own with `perfBudgets` — it can add, never remove: dropping a default
// would be loosening the gate itself.
const PERF_BUDGET_DEFAULTS = [
  '*lighthouserc*', // lighthouserc.json, .lighthouserc.yml
  '*lighthouse*budget*',
  'budget.json', 'budgets.json', // Lighthouse's budget file
  '.size-limit*',
  '*bundlesize*', // bundlesize.config.json, .bundlesizerc
  '*perf*budget*', '*performance*budget*',
  '**/k6/**/*threshold*',
];

// ---- PROJECT CONFIG (.claude/canonkit.json in the session's cwd) ----
//   { "highRisk": { "include": [glob], "exclude": [glob] }, "perfBudgets": [glob] }
// A glob with a `/` matches the path relative to the project; one without
// matches the file name at any depth. `*` stays in a segment, `**` crosses them.
// Matching ignores case: a gate should over-match, never miss on a capital.
// Anything malformed is ignored and the defaults stand — a typo must not turn a
// gate off. This shape is read by other tools too (doctor, README): a public contract.
const MAX_GLOBS = 100;
const MAX_GLOB_LENGTH = 200;

function globMatcher(glob) {
  const g = glob.replace(/\\/g, '/').replace(/^\.\//, '');
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*' && g[i + 1] === '*') {
      i++;
      if (g[i + 1] === '/') { i++; re += '(?:.*/)?'; } else re += '.*';
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  const rx = new RegExp(`^${re}$`, 'i');
  return g.includes('/') ? (p) => rx.test(p) : (p) => rx.test(p.slice(p.lastIndexOf('/') + 1));
}

const globList = (v) => (Array.isArray(v) ? v : [])
  .filter((g) => typeof g === 'string' && g.trim() && g.length <= MAX_GLOB_LENGTH)
  .slice(0, MAX_GLOBS)
  .map(globMatcher);

function projectConfig(cwd) {
  let raw = null;
  try { raw = JSON.parse(fs.readFileSync(path.join(cwd, '.claude', 'canonkit.json'), 'utf8')); } catch (_) {}
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const high = obj(obj(raw).highRisk);
  return {
    include: globList(high.include),
    exclude: globList(high.exclude),
    perf: [...PERF_BUDGET_DEFAULTS.map(globMatcher), ...globList(obj(raw).perfBudgets)],
    // Edit hands an absolute path, a shell command a relative one: both end up
    // relative to the project, with forward slashes.
    rel(fp) {
      let p = fp;
      if (path.isAbsolute(p)) {
        const r = path.relative(cwd, p);
        if (r && !r.startsWith('..') && !path.isAbsolute(r)) p = r;
      }
      return p.replace(/\\/g, '/').replace(/^\.\//, '');
    },
  };
}

const isPerfBudget = (fp, cfg) => !!fp && cfg.perf.some((m) => m(cfg.rel(fp)));

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
    let note = null;
    try { note = contextReminder(input); } catch (_) { /* fail-open */ }
    if (note) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: note },
      }));
    }
    process.exit(0);
  }
  if (eventName === 'SubagentStop') {
    const agentId = safeId(input.agent_id);
    // Logged on the first stop only: a stop hook that continues the agent fires
    // this event again, and two agent_stop lines read as two agents finishing.
    if (!input.stop_hook_active) log({ event: 'agent_stop', agent_id: agentId, project });
    // A background dispatch has no PostToolUse at its end, so its agent_end is
    // written here, linked through the agent_launch recorded at launch. A
    // foreground one has no agent_launch and is written by PostToolUse instead.
    // Written on every stop, with cumulative tokens: a continued or resumed agent
    // produces a later line for the same id, and the last line per id is the total
    // (for a resumed agent, its duration then spans the idle gap as well).
    if (agentId) {
      const evs = readEvents(true).filter((e) => e.session === SESSION);
      const launch = evs.filter((e) => e.event === 'agent_launch' && e.agent_id === agentId).pop();
      if (launch) {
        const start = evs.filter((e) => e.event === 'agent_start' && e.id === launch.id).pop() || {};
        const scan = scanTranscript(input.agent_transcript_path);
        log({
          event: 'agent_end',
          id: launch.id,
          agent_id: agentId,
          agent: start.agent || input.agent_type || 'unknown',
          task: start.task || '',
          model: start.model || '',
          effort: start.effort || '',
          resolved_model: launch.resolved_model || '',
          mode: 'background',
          duration_ms: start.ts ? Date.now() - start.ts : null,
          tool_uses: null,
          tokens: scan.tokens,
          report_chars: scan.handback ?? reportChars(input.last_assistant_message),
          project,
        });
      }
    }
    process.exit(0);
  }
  if (eventName === 'PostToolUse') {
    // Observability only. Nothing below this block may run here: the enforcement
    // paths answer as PreToolUse, which a PostToolUse event must never emit.
    // agent_type is also set for a main thread started with --agent. Only
    // agent_id identifies a subagent; never mix its tool volume into main.
    if (input.agent_id === undefined && safeId(SESSION)) {
      const size = toolResultSize(tool, input.tool_response);
      // One line per measured result, with an explicit quantitative allowlist.
      // No project basename either: even that can reveal sensitive context.
      if (size) log({ event: 'tool_result', session: safeId(SESSION), tool, ...size });
    }
    if (tool === 'Agent' || tool === 'Task') {
      const r = input.tool_response && typeof input.tool_response === 'object' ? input.tool_response : {};
      const id = input.tool_use_id || '';
      const agentId = safeId(r.agentId);
      if (r.status === 'async_launched') {
        log({ event: 'agent_launch', id, agent_id: agentId, resolved_model: r.resolvedModel || '', project });
      } else {
        log({
          event: 'agent_end',
          id,
          agent_id: agentId,
          agent: ti.subagent_type || 'unknown',
          task: ti.description || '',
          model: ti.model || '',
          effort: ti.effort || '',
          resolved_model: r.resolvedModel || '',
          mode: 'foreground',
          status: typeof r.status === 'string' ? r.status : '',
          duration_ms: num(r.totalDurationMs) || num(input.duration_ms) || null,
          tool_uses: typeof r.totalToolUseCount === 'number' ? r.totalToolUseCount : null,
          tokens: agentId ? transcriptUsage(subagentTranscript(input.transcript_path, agentId)) : null,
          report_chars: reportChars(r.content),
          project,
        });
      }
    }
    process.exit(0);
  }
  if (tool === 'Agent' || tool === 'Task') {
    log({
      event: 'agent_start',
      // Links this line to its agent_end: tool_use_id is the one id PreToolUse
      // and PostToolUse share.
      id: input.tool_use_id || '',
      agent: ti.subagent_type || 'unknown',
      task: ti.description || '',
      // The rule says every planned dispatch names its model and effort. Logging
      // both is what makes that checkable after the fact instead of an intention
      // nobody can audit; empty means the dispatch inherited the default.
      model: ti.model || '',
      effort: ti.effort || '',
      project,
    });
    process.exit(0); // dispatching a subagent is always allowed
  }

  // ---- ENFORCEMENT: shells (Bash on POSIX, PowerShell on Windows) ----
  if (tool === 'Bash' || tool === 'PowerShell') {
    const cmd = String(ti.command || '');
    if (/\bgit\s+(commit|push)\b/.test(cmd)) {
      log({ event: 'gate', kind: 'git', detail: cmd.slice(0, 80), project, tool });
      ask('canonkit gate: git commit/push requires explicit user authorization (Bob/Pipe rule). Confirm to proceed.');
    }
    const targets = shellWriteTargets(cmd);
    if (targets.length) {
      const cfg = projectConfig(cwd);
      for (const re of HARD_SECRET) {
        if (re.test(cmd)) {
          log({ event: 'gate', kind: 'secret-block', file: targets[0], project, tool });
          deny('canonkit gate (Gard): this command writes a high-confidence secret (private key / cloud key) to a file. Blocked. Move it to an env var / secret store.');
        }
      }
      if (SOFT_SECRET.test(cmd) && !targets.some((t) => TEST_PATH.test(t))) {
        log({ event: 'gate', kind: 'secret-ask', file: targets[0], project, tool });
        ask('canonkit gate (Gard): this command writes what looks like a hardcoded credential to a file. Confirm this is intentional and not a real secret.');
      }
      const perf = targets.find((t) => isPerfBudget(t, cfg));
      if (perf) {
        log({ event: 'gate', kind: 'perf-budget', file: perf, project, tool });
        ask(`canonkit gate (Perry): this command writes "${path.basename(perf)}", which carries the performance budgets. Anyone may tighten a threshold; only Perry loosens one, and only with a measured floor. Derivations live in docs/adr/. Confirm to proceed.`);
      }
      const risky = targets.find((t) => isHighRisk(t, cfg));
      if (risky) {
        log({ event: 'gate', kind: 'high-risk-surface', file: risky, project, tool });
        ask(`canonkit gate: this command writes "${path.basename(risky)}", a HIGH-risk surface (auth/secret/migration/contract). Archie/Gard review applies even if this felt LOW. A false alarm is tuned in .claude/canonkit.json (highRisk.exclude). Confirm to proceed.`);
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

    const cfg = projectConfig(cwd);
    for (const re of HARD_SECRET) {
      if (re.test(content)) {
        log({ event: 'gate', kind: 'secret-block', file: fp, project, tool });
        deny('canonkit gate (Gard): a high-confidence secret (private key / cloud key) was detected in this write. Blocked. Move it to an env var / secret store.');
      }
    }
    if (SOFT_SECRET.test(content) && !TEST_PATH.test(fp)) {
      log({ event: 'gate', kind: 'secret-ask', file: fp, project, tool });
      ask('canonkit gate (Gard): looks like a hardcoded credential. Confirm this is intentional and not a real secret.');
    }
    if (isPerfBudget(fp, cfg)) {
      log({ event: 'gate', kind: 'perf-budget', file: fp, project, tool });
      ask(`canonkit gate (Perry): "${path.basename(fp)}" carries the performance budgets. Anyone may tighten a threshold; only Perry loosens one, and only with a measured floor. Derivations live in docs/adr/. Confirm to proceed.`);
    }
    if (isHighRisk(fp, cfg)) {
      log({ event: 'gate', kind: 'high-risk-surface', file: fp, project, tool });
      ask(`canonkit gate: "${path.basename(fp)}" is a HIGH-risk surface (auth/secret/migration/contract). Archie/Gard review applies even if this felt LOW. A false alarm is tuned in .claude/canonkit.json (highRisk.exclude). Confirm to proceed.`);
    }
    process.exit(0);
  }

  process.exit(0); // default allow
}

try { main(); } catch (_) { process.exit(0); /* fail-open */ }

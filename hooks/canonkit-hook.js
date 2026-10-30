#!/usr/bin/env node
/**
 * canonkit — mechanical enforcement + process-observability hook.
 *
 * Wired (in ~/.claude/settings.json; `canonkit install --wire-hooks`) to PreToolUse
 * (edits, shells, Agent/Task, SendMessage), PostToolUse (agents + context tools),
 * SubagentStop, UserPromptSubmit, Stop. Three jobs:
 *   1. ENFORCEMENT — turn the team's soft HIGH-risk gates into mechanical ones:
 *        - git commit / git push  -> require explicit confirmation (Bob's rule)
 *        - skipping git hooks or signing (--no-verify, commit -n, --no-gpg-sign,
 *          -c core.hooksPath / commit.gpgsign=false) -> block
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
 *      reviewer (Quinn/Gard/Archie/Perry/...) being dispatched — or resumed with
 *      SendMessage — AFTER that gate, block the stop ONCE with a reminder (no
 *      self-merge on HIGH risk). A reviewer subagent's own gates outside the
 *      project are its probes, not the session's edits, and do not count.
 *
 * EVERY SHELL IS A SHELL. This runs on Windows, where the harness's primary shell
 * tool is PowerShell, not Bash. A gate wired only to Bash is a gate with a side
 * door: `git commit`, or `Set-Content .env`, through the other tool would sail
 * past it. Bash and PowerShell therefore share one code path here, and the
 * settings matcher must list both. Same reasoning for NotebookEdit next to Edit/Write.
 *
 * Tests: `npm test` in the canonkit repo (test/canonkit-hook.test.js) — hermetic,
 * real process. This file is the installed copy; fix it in the repo, not here.
 *
 * DESIGN RULE: fail-open. Any internal error -> exit 0 (allow). A buggy hook must
 * never brick the user's workflow; the agents (Gard/Quinn/Archie) are the real review.
 *
 * CORE AND ADAPTER. The gates live in `evaluate(evt, env)`, which takes a
 * normalized event (see normalizeClaude) and returns
 *   { decision: 'allow'|'ask'|'deny'|'block', kind, reason, logs }
 * without touching the process: no stdin, no stdout, no exit, no environment
 * variable and no home-directory lookup. What it needs from outside comes in
 * `env` (see claudeEnv). It reads the activity log and the project's
 * .claude/canonkit.json as input; the log lines it would write come back in
 * `logs` as { file, record }, written by the adapter. Its one write is the
 * context-band state (contextReminder): the reminder is only given when that
 * state persisted, or it would repeat every turn. `main()` is the Claude Code
 * adapter: stdin -> normalizeClaude -> evaluate -> log writes, output, exit.
 * The core stays in this file on purpose: a top-level require of a sibling
 * would throw at load, outside run()'s try, and turn every gate off for an
 * install that copied only this file.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// File names inside env.logDir. Before the rename the log lived in
// env.legacyLogDir. `install` moves it; until it has (or if the move failed),
// reads fall through to it, so a gated edit made just before the upgrade still
// counts at the next Stop. Nothing is ever written there.
const EVENTS_FILE = 'events.jsonl';
// The Stop gate reads this whole file at every turn end, so it cannot grow
// unbounded. One rotation is enough: the gate only ever asks about this session.
// events.jsonl carries only low-volume enforcement/dispatch events. High-volume
// measurement goes to its own file, or it would rotate a session's gate and
// reviewer events out of what the Stop gate reads. Same cap, same one rotation.
const MAX_LOG_BYTES = 2 * 1024 * 1024;
const TOOL_RESULTS_FILE = 'tool-results.jsonl';

// The adapter's half of logging: evaluate() returns the records, this appends
// one to its file under logDir.
function writeLog(logDir, { file, record }) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
    const f = path.join(logDir, file);
    try {
      if (fs.statSync(f).size > MAX_LOG_BYTES) fs.renameSync(f, f + '.1');
    } catch (_) { /* no file yet, or a raced rename — either way, just append */ }
    fs.appendFileSync(f, JSON.stringify(record) + '\n');
  } catch (_) { /* never throw from logging */ }
}

// withRotated: also read events.jsonl.1, for lookups that must survive a rotation
// landing between two halves of the same dispatch.
function readEvents(env, withRotated = false) {
  const files = [];
  for (const dir of [env.legacyLogDir, env.logDir]) {
    if (!dir) continue;
    const f = path.join(dir, EVENTS_FILE);
    files.push(...(withRotated ? [f + '.1', f] : [f]));
  }
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
// Agent types may be namespaced (`plugin:agent`, `scope.name`): rejecting `:` would
// fold every plugin agent into one "unknown" row. Still no spaces, slashes or quotes.
const safeType = (v) => (typeof v === 'string' && /^[\w.:-]{1,128}$/.test(v) ? v : '');
// Free text the model chose (a task description, an agent's name, a message
// target): kept short, so one long string cannot bloat the log the Stop gate reads.
const cap = (v) => (typeof v === 'string' ? v.slice(0, 200) : '');

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

// ---- TOOL RESULT VOLUME (main thread and subagents) ----
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
const BANDS_FILE = 'context-bands.json'; // inside env.logDir
const MAX_TRACKED_SESSIONS = 50;

// raw: env.contextBands, the variable's value as the adapter read it.
function contextBands(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return DEFAULT_BANDS;
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

function contextReminder(evt, env, log) {
  const session = evt.session;
  const bands = contextBands(env.contextBands);
  if (!bands.length || !session || !env.logDir || typeof evt.transcriptPath !== 'string') return null;
  const tokens = currentContextTokens(evt.transcriptPath);
  if (tokens === null) return null;

  const bandsFile = path.join(env.logDir, BANDS_FILE);
  let state = {};
  try { state = JSON.parse(fs.readFileSync(bandsFile, 'utf8')) || {}; } catch (_) {}
  const reached = bands.filter((b) => tokens >= b).pop() || 0; // 0: below every band
  const last = num(state[session]);
  // Below every band (e.g. after /compact) the record is dropped so the next climb reminds again.
  if (reached === 0 && !(session in state)) return null;
  if (reached !== 0 && reached <= last) return null;

  if (reached === 0) delete state[session]; else state[session] = reached;
  const keys = Object.keys(state);
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_TRACKED_SESSIONS))) delete state[k];
  try {
    fs.mkdirSync(env.logDir, { recursive: true });
    fs.writeFileSync(bandsFile, JSON.stringify(state));
  } catch (_) { /* cannot persist: skip the reminder rather than repeat it every turn */ return null; }
  if (reached === 0) return null;

  log({ event: 'gate', kind: 'context-size', tokens, band: reached, project: path.basename(evt.cwd) });
  return `This session's context is at ~${Math.round(tokens / 1000)}k tokens. If the request does not depend on what came before, suggest a new session with a handoff, and end with the new session's opening prompt in a fenced block, ready to paste (rule 'New session when the subject changes').`;
}

// Agents that count as an independent reviewer for the definition-of-done gate.
// perry is here because he owns performance budgets: the rule says only Perry
// loosens one, and until now the gate that enforces "reviewed by someone" had
// no idea he existed, so the one person who could sign off could not.
// Bounded: `gard-strict` is Gard, `gardener` is not.
const REVIEWER = /^(quinn|gard|archie|perry|ws-contract|multiplayer-isolation|next-perf-reviewer)(?:-|$)/;

// ---- WHO OPENED A GATE ----
// Subagents share the parent's session id, so a reviewer probing this hook in a
// scratch folder opened gates its own dispatch predated: the parent could never
// clear them. Each gate therefore records who opened it and whether on the
// project, and the Stop gate skips a reviewer subagent's gates outside it.
// agent_type only with agent_id: a main thread started with --agent carries
// agent_type too, and it is not a subagent. Captured from real payloads
// (2026-10-22, Claude Code 2.1.302): the main thread, --agent included, never
// has the agent_id key; a subagent's tool events carry agent_id and agent_type
// equal to its subagent_type, foreground and background alike. evaluate() builds
// that record per call (`who`) and logGate() adds it to every gate.

// The real path of p, or of its nearest existing ancestor with the rest
// appended: the file a gate fires on often does not exist yet.
function realish(p) {
  const rest = [];
  for (let dir = p; ;) {
    try { return path.join(fs.realpathSync.native(dir), ...rest); } catch (_) {}
    const up = path.dirname(dir);
    if (up === dir) return p;
    rest.unshift(path.basename(dir));
    dir = up;
  }
}

// Inside env.projectDir (cwd without one), by real path. A path under
// ~/.claude counts as inside: the hooks and settings there gate every project,
// so a probe on them is never only a probe. Any failure counts as inside too,
// and so does a missing env.home: unable to rule ~/.claude out, the gate counts.
function onProject(fp, cwd, env) {
  try {
    const real = (p) => normalizePath(realish(path.resolve(normalizePath(p))));
    const file = real(path.resolve(normalizePath(cwd), normalizePath(fp)));
    return isWithin(file, real(env.projectDir || cwd)) ||
      (!env.home || isWithin(file, real(path.join(env.home, '.claude'))));
  } catch (_) { return true; }
}

// The agent_start a SendMessage target names in this session: by name (the
// latest start with it wins, whatever its type), else by agent id through the
// launch or end line that carries it. The reviewer test runs on that start's
// agent, never on the name, which the caller chose freely.
function resumedStart(evs, resume) {
  const to = String(resume.to || '').replace(/\s*\[[^\]]*\]\s*$/, '').trim();
  if (!to) return null;
  const before = evs.filter((e) => (e.ts || 0) <= (resume.ts || 0));
  const starts = before.filter((e) => e.event === 'agent_start');
  const named = starts.filter((e) => e.name === to).pop();
  if (named) return named;
  const link = before.filter((e) => (e.event === 'agent_launch' || e.event === 'agent_end') && e.agent_id === to).pop();
  return (link && link.id && starts.filter((e) => e.id === link.id).pop()) || null;
}

// ---- PATHS ----
// Every path check below runs on ONE form of the path: normalized, then made
// relative to the project when it lies inside it. Checked on the raw string,
// `src/legacy/../auth/x.ts` matched an exclude for src/legacy,
// `node_modules/../.env` was noise and `.claude//canonkit.json` was not the
// config — every spelling of a path was its own way past a gate.
const WIN = process.platform === 'win32';

function normalizePath(p) {
  let s = String(p).replace(/\\/g, '/');
  // Win32 long-path and device prefixes: \\?\C:\x is C:\x, \\?\UNC\h\s is \\h\s.
  s = s.replace(/^\/\/[?.]\/UNC\//i, '//').replace(/^\/\/[?.]\//, '');
  // Git Bash and Cygwin spell C:\x as /c/x and /cygdrive/c/x.
  if (WIN) s = s.replace(/^\/(?:cygdrive\/)?([a-z])(?=\/|$)/i, (_, d) => d + ':');
  // The drive is set apart so that `..` stops at it, as it does on disk:
  // normalized as a plain segment, `C:/../x` lost its drive and became relative.
  let drive = (/^[a-z]:(?=\/|$)/i.exec(s) || [''])[0];
  s = s.slice(drive.length);
  if (WIN) drive = drive.toUpperCase();
  s = s.split('/').map((seg) => {
    // An NTFS stream suffix names the same file: `x::$DATA` writes x itself.
    // The explicit `::$TYPE` form is stripped everywhere (no POSIX file is named
    // like that); a bare `:stream` only on Windows, where it cannot be a name.
    seg = seg.replace(/:[^:]*:\$[a-z_]+$/i, '');
    if (WIN) {
      seg = seg.replace(/:.*$/, '');
      // Win32 drops trailing dots and spaces: `canonkit.json.` is canonkit.json.
      if (!/^\.+$/.test(seg)) seg = seg.replace(/[. ]+$/, '');
    }
    return seg;
  }).join('/');
  if (drive) return drive + path.posix.normalize('/' + s).replace(/(.)\/$/, '$1');
  s = path.posix.normalize(s);
  if (s === '.' || s === './') return '';
  s = s.replace(/^\.\//, '');
  if (s.length > 1 && s.endsWith('/') && !/^[a-z]:\/$/i.test(s)) s = s.slice(0, -1);
  return s;
}

const isAbsolutePath = (p) => p.startsWith('/') || /^[a-z]:\//i.test(p);
const samePath = (a, b) => (WIN ? a.toLowerCase() === b.toLowerCase() : a === b);

// Edit hands an absolute path, a shell command one relative to the session's
// cwd: both end up relative to the project root, or absolute when outside it.
function projectPath(fp, cwd, root) {
  if (!fp) return '';
  let p = normalizePath(fp);
  if (!isAbsolutePath(p)) p = normalizePath(cwd + '/' + p);
  const r = normalizePath(root);
  const prefix = r.endsWith('/') ? r : r + '/';
  if (samePath(p, r)) return '';
  return samePath(p.slice(0, prefix.length), prefix) ? p.slice(prefix.length) : p;
}

// HIGH-risk file surfaces — editing these is never truly LOW risk.
// Split in two on purpose. STRONG terms are unambiguous anywhere in a path
// (`authClient.ts`, `useOauth.ts`). WORD terms are ordinary English that shows up
// in ordinary code (`tokenizer.ts`, `sessionStorage.ts`), so they only count on a
// path-segment boundary. A gate that cries wolf is a gate people click through.
// STRONG terms are also beyond a project's `exclude`, which leaves no escape for
// a false positive on one — hence the word `author` is not `auth` (namesAuth).
const HIGH_RISK_STRONG = /(jwt|passport|secret|credential|\.env|rbac|schema\.prisma)/i;
// Lowercase on purpose: `AuthorCard`, `authors/`, `authoring/` are the word
// author, while a camelCase `Or` starts a new word (`authOrRedirect`), and
// `authority`/`authorize` are auth (Spring keeps its granted roles in authority).
// Uppercase only as a whole word (`AUTHORS`, `AUTHORS.md`), so `AUTHORITY` and
// `AUTH_OR_GUEST` stay auth.
const AUTHOR_WORD = /^or(s|ed|ing|ship)?(?![a-z])/;
const AUTHOR_UPPER = /^OR(S|ED|ING|SHIP)?(?![A-Za-z])/;
function namesAuth(p) {
  const re = /auth/gi;
  for (let m; (m = re.exec(p));) {
    const rest = p.slice(m.index + 4);
    if (!AUTHOR_WORD.test(rest) && !(m[0] === 'AUTH' && AUTHOR_UPPER.test(rest))) return true;
  }
  return false;
}
// Migrations are a HIGH-risk surface by the routing rules, not a heuristic, so
// they are beyond exclude too — and therefore prose about one (a migration guide)
// is let through, or it would ask forever.
const MIGRATION = /(^|[\/._-])migrations?([\/._-]|$)/i;
// A bare `token(s)` is not here: design tokens, context/LLM tokens and lexer
// tokens are far more common in paths than credentials. Only a token that names
// what kind it is (`refresh_token`, `access-token.ts`) or a module that manages
// them (`token-store.ts`, `token_service.py`) counts; `auth/tokens.ts` is caught
// by the STRONG `auth` term anyway. Vendor/PAT tokens (`github_token`,
// `npm-token`) and the dotfiles that hold registry credentials stay gated: the
// secret-content check does not recognise ghp_/npm_ values, so the path is the
// only backstop for them.
const HIGH_RISK_WORD = /(^|[\/._-])(acl|(refresh|access|id|auth|api|bearer|csrf|device|reset|session|jwt|pat|github|gh|npm|pypi|personal|service)[_-]?tokens?|tokens?[_-](store|storage|service|manager|vault|rotation|refresh|validation|verify|issuer)|\.?(npmrc|netrc|pypirc))([\/._-]|$)/i;
// AMBIGUOUS words name UI and domain folders as often as security surfaces: a
// `components/sessions/` list, a CRM's `contracts/`, a `docs/gateway.md`. They
// count only in code outside a presentational folder. `views` is deliberately not
// presentational (Django views are the request handlers), nor is `pages`
// (`pages/api/login.ts` is an endpoint), nor `docs/` as a folder: an OpenAPI file
// under docs/contracts/ is still a contract — only prose files are let through.
const AMBIGUOUS_WORD = /(^|[\/._-])(login|sessions?|contracts?|permissions?|gateway)([\/._-]|$)/i;
const PROSE_OR_STYLE = /\.(md|mdx|markdown|txt|rst|adoc|css|scss|sass|less|styl|svg|png|jpe?g|gif|webp|ico)$/i;
const PRESENTATIONAL = /(^|\/)(components?|ui|styles?|stories|assets|icons|locales|i18n)\/|\.stories\.[cm]?[jt]sx?$/i;
// Paths that hold credentials. A project's `exclude` never reaches these: the
// content check does not recognise every token format (ghp_, npm_), and a key
// file is binary or base64 it cannot read at all, so for these files the path
// is the only backstop.
const SECRET_PATH = /(\.env|secret|credential|(^|[\/._-])\.?(npmrc|netrc|pypirc|pgpass|kubeconfig)([\/._-]|$)|(^|[\/._-])(refresh|access|auth|api|bearer|session|jwt|pat|github|gh|npm|pypi|personal|service)[_-]?tokens?([\/._-]|$)|\.(pem|key|p12|pfx)$|\.tfvars(\.json)?$|\.tfstate(\.backup)?$|(^|\/)id_(rsa|dsa|ecdsa|ed25519)$|(^|\/)\.kube\/config$)/i;
// The file that tunes these gates is itself a gate: loosening it is a decision.
const CONFIG_PATH = /(^|\/)\.claude\/canonkit\.json$/i;
// Generated, vendored or throwaway: never the surface the gate is about. Whole
// segments only — `src/distribution/` and `src/buildings/` are source.
const NOISE_PATH = /(^|\/)(node_modules|\.next|dist|build|coverage|graphify-out|\.git)\//i;
const TEST_PATH = /(\.test\.|\.spec\.|(^|\/)(__tests__|__mocks__|fixtures?|mocks?)\/|\.example$|\.sample$)/i;

// Order is the contract: the config file > include (explicit) > noise/test >
// secret paths and strong terms (never excludable) > exclude > the remaining
// heuristics. `rel` is the normalized project path (cfg.rel). Returns { rule }
// naming what matched, false, or { excludedBy } when only an exclude kept the
// gate shut. The rule is logged on the gate, so a false-positive rate can be
// measured per rule instead of argued from a list of paths.
// Only a project-relative path can be noise: an absolute one (outside the
// config's folder, e.g. a nested config's) would be judged by the folders above
// the project, and a `build/` there let even .env through. Absolute fails closed.
const isNoise = (rel) => !isAbsolutePath(rel) && NOISE_PATH.test(rel);
const isTestFile = (rel) => !isAbsolutePath(rel) && TEST_PATH.test(rel);

// The project file's additive lists, under a nested config (cfg.project): its
// globs are anchored at the project, so they are tested on the path relative to
// it, never pushed into the nested config's own lists.
const projectAdds = (cfg, key, fp) => !!(cfg.project && fp) && cfg.project[key].some((m) => m(cfg.project.rel(fp)));

function highRisk(rel, cfg, fp) {
  if (!rel) return false;
  if (CONFIG_PATH.test(rel)) return { rule: 'config' };
  if (cfg.include.some((m) => m(rel)) || projectAdds(cfg, 'include', fp)) return { rule: 'include' };
  if (isNoise(rel) || isTestFile(rel)) return false;
  if (SECRET_PATH.test(rel)) return { rule: 'secret-path' };
  if (HIGH_RISK_STRONG.test(rel)) return { rule: 'strong' };
  if (namesAuth(rel)) return { rule: 'auth' };
  if (MIGRATION.test(rel) && !PROSE_OR_STYLE.test(rel)) return { rule: 'migration' };
  const rule = HIGH_RISK_WORD.test(rel) ? 'word'
    : AMBIGUOUS_WORD.test(rel) && !PROSE_OR_STYLE.test(rel) && !PRESENTATIONAL.test(rel) ? 'ambiguous'
      : '';
  if (!rule) return false;
  const ex = cfg.exclude.find((m) => m(rel));
  return ex ? { excludedBy: ex.glob } : { rule };
}

// ---- GLOBS ----
// gitignore-like, not gitignore: a glob with a `/` matches the path relative to
// the project, one without matches the file name at any depth. `*` and `?` stay
// in a segment; `**` as a whole segment crosses segments, anywhere else it is a
// plain `*`. A trailing `/` means everything under that folder. No `!`, no
// `[...]` (both literal). Matching ignores case: a gate should over-match, never
// miss on a capital.
//
// Matched by hand, not by RegExp: the runtime reports a hook that times out as a
// non-blocking error, so a glob that backtracks (`*a*a*a…b`) turned every gate
// off — the secret deny included — and a cloned repo's config was enough. Both
// levels below are the greedy two-pointer wildcard match, O(glob × path).
function matchSegment(g, s) {
  let gi = 0, si = 0, star = -1, mark = 0;
  while (si < s.length) {
    if (gi < g.length && g[gi] === '*') { star = gi++; mark = si; }
    else if (gi < g.length && (g[gi] === '?' || g[gi] === s[si])) { gi++; si++; }
    else if (star >= 0) { gi = star + 1; si = ++mark; }
    else return false;
  }
  while (gi < g.length && g[gi] === '*') gi++;
  return gi === g.length;
}

function matchSegments(gs, ps) {
  let gi = 0, pi = 0, star = -1, mark = 0;
  while (pi < ps.length) {
    if (gi < gs.length && gs[gi] === '**') { star = gi++; mark = pi; }
    else if (gi < gs.length && matchSegment(gs[gi], ps[pi])) { gi++; pi++; }
    else if (star >= 0) { gi = star + 1; pi = ++mark; }
    else return false;
  }
  while (gi < gs.length && gs[gi] === '**') gi++;
  return gi === gs.length;
}

function globMatcher(glob) {
  let g = String(glob).replace(/\\/g, '/').toLowerCase().replace(/^(?:\.\/|\/)+/, '');
  if (g.endsWith('/')) g += '**';
  const segs = g.split('/')
    .filter((s) => s !== '' && s !== '.')
    .map((s) => (/^\*\*+$/.test(s) ? '**' : s.replace(/\*+/g, '*')));
  let test;
  if (!segs.length) test = () => false;
  else if (g.includes('/')) test = (p) => matchSegments(segs, p.toLowerCase().split('/'));
  else {
    const seg = segs[0] === '**' ? '*' : segs[0];
    test = (p) => matchSegment(seg, p.slice(p.lastIndexOf('/') + 1).toLowerCase());
  }
  const m = (p) => test(p);
  m.glob = glob;
  return m;
}

// Perf budgets: a HIGH-risk surface with a different owner. Anyone may tighten a
// threshold; only Perry loosens one, and only with a measured floor. Perry is
// stack-agnostic, so the gate knows the common budget files, and a project adds
// its own with `perfBudgets` — it can add, never remove: dropping a default
// would be loosening the gate itself.
const PERF_BUDGET_DEFAULTS = [
  '*lighthouserc*', // lighthouserc.json, .lighthouserc.yml
  '*lighthouse*budget*',
  // Lighthouse's budget file, at any depth: a finance budget.json asking once is
  // the accepted price of not missing it (Perry).
  'budget.json', 'budgets.json', '*.budgets.json',
  '.size-limit*',
  '*bundlesize*', // bundlesize.config.json, .bundlesizerc
  'bundlewatch*', '.bundlewatch*',
  // Separator-bounded: `*perf*budget*` matched "superfluous-budget". camelCase
  // only right before the extension or a separator, so perfBudget.json and
  // perfBudget-prod.json ask and perfBudgetFormatter.ts does not.
  '*perf-budget*', '*perf_budget*', '*performance-budget*', '*performance_budget*',
  '*perfbudget.*', '*perfbudgets.*', '*performancebudget.*', '*performancebudgets.*',
  '*perfbudget-*', '*perfbudget_*', '*performancebudget-*', '*performancebudget_*',
  '**/k6/**/*threshold*',
].map(globMatcher);

// The defaults skip prose and generated folders: docs/performance-budget.md is
// about a budget, node_modules/x/lighthouserc.json is somebody else's. A
// project's own perfBudgets entries are taken at their word.
function isPerfBudget(rel, cfg, fp) {
  if (!rel) return false;
  if (cfg.perf.some((m) => m(rel)) || projectAdds(cfg, 'perf', fp)) return true;
  return !isNoise(rel) && !/\.mdx?$/i.test(rel) && PERF_BUDGET_DEFAULTS.some((m) => m(rel));
}

// ---- PROJECT CONFIG (.claude/canonkit.json) ----
//   { "version": 1, "highRisk": { "include": [glob], "exclude": [glob] }, "perfBudgets": [glob] }
// Found in the nearest folder from the session's cwd up, stopping at
// CLAUDE_PROJECT_DIR when cwd is inside it (a config above the repo must not
// gate it) and otherwise below home (~/.claude is the user's, not a project's);
// failing that, at CLAUDE_PROJECT_DIR. cwd first, because a worktree session's
// project dir is the main checkout, where the worktree's anchored globs would
// never match. The nearest file applies whole: a nested one (submodule,
// example) replaces the project's while cwd is inside it — except that the
// project file's additive lists (`highRisk.include`, `perfBudgets`) apply as
// well when the nearest file sits strictly below CLAUDE_PROJECT_DIR and the
// project dir has its own (cfg.project). A nested folder can add gates, never
// shed the project's; the project's exclude never reaches it.
// "Inside" is by path segment on the normalized paths; a symlinked cwd that
// does not resolve inside the project dir gets the unbounded walk (accepted).
// Paths are matched relative to the folder the file is in. Only a regular file
// of at most 64 KiB is read: a crashed or stalled hook fails open, and a repo
// commits this file.
// `version` is optional and only 1 is read: a config written for a later shape
// gets the defaults rather than a guess. Unknown keys are ignored. Anything
// malformed is ignored too and the defaults stand — a typo must not turn a gate
// off — and each thing ignored is returned with the reason, for doctor. This
// shape is read by other tools (doctor, README): a public contract.
const MAX_GLOBS = 100;
const MAX_GLOB_LENGTH = 200;
const MAX_CONFIG_BYTES = 64 * 1024;
const CONFIG_KEYS = ['version', 'highRisk', 'perfBudgets'];
const HIGH_RISK_KEYS = ['include', 'exclude'];
// A repo commits this file and a clone never passes the edit gate on it, so an
// exclude that matches nearly everything would switch the gate off for everyone
// who clones. Judged by what it matches, not how it is spelled: `**`, `*.*` and
// `?*` all name no folder at all. A glob matching most of these is rejected —
// judged with the excludes before it, so `*.ts`, `*.go`, `*.rb`, `*.py` cannot
// add up to one: the glob that tips the union over, and any after it that would
// too, are rejected; the ones before it stand.
const CATCH_ALL_SAMPLES = ['a.ts', 'x/y/z.py', 'app/login.go', 'src/server/permissions.ts', 'README',
  'lib/sessions/store.rb', 'docs/a.md', 'pkg/gateway/main.go', 'Makefile', '.hidden/x.json'];
const isCatchAll = (m) => CATCH_ALL_SAMPLES.filter((p) => m(p)).length * 2 >= CATCH_ALL_SAMPLES.length;

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

function isWithin(p, r) {
  const prefix = r.endsWith('/') ? r : r + '/';
  return samePath(p, r) || samePath(p.slice(0, prefix.length), prefix);
}

// home: the user's home folder, or null when unknown (no folder is then home).
function locateConfig(cwd, projectDir, homeDir) {
  const home = homeDir ? normalizePath(path.resolve(homeDir)) : null;
  const isHome = (dir) => home !== null && samePath(normalizePath(dir), home);
  // Normalized before resolve: on win32 an MSYS /c/... resolves to C:\c\...
  const resolve = (p) => path.resolve(normalizePath(p));
  const project = projectDir ? normalizePath(resolve(projectDir)) : null;
  const bound = project && isWithin(normalizePath(resolve(cwd)), project) ? project : null;
  for (let dir = resolve(cwd); !isHome(dir);) {
    if (fs.existsSync(path.join(dir, '.claude', 'canonkit.json'))) return { root: dir, file: path.join(dir, '.claude', 'canonkit.json') };
    if (bound && samePath(normalizePath(dir), bound)) break;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  if (projectDir && !isHome(resolve(projectDir))) {
    const root = resolve(projectDir);
    return { root, file: path.join(root, '.claude', 'canonkit.json') };
  }
  return { root: cwd, file: null };
}

// Read only when it is a regular file under the cap: a symlink to /dev/zero or
// a FIFO never ends, and a huge one exhausts memory — either way the hook dies
// and every gate opens. stat (not open) first: opening a FIFO blocks.
function readConfigText(file, ignored) {
  let st;
  try { st = fs.statSync(file); } catch (_) { return null; } // no config: defaults
  const where = '.claude/canonkit.json';
  if (!st.isFile()) { ignored.push({ where, why: 'not a regular file; defaults apply' }); return null; }
  if (st.size > MAX_CONFIG_BYTES) { ignored.push({ where, why: `larger than ${MAX_CONFIG_BYTES} bytes; defaults apply` }); return null; }
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(MAX_CONFIG_BYTES + 1);
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    if (n > MAX_CONFIG_BYTES) { ignored.push({ where, why: `larger than ${MAX_CONFIG_BYTES} bytes; defaults apply` }); return null; }
    return buf.toString('utf8', 0, n);
  } catch (_) { return null; } finally {
    if (fd !== undefined) try { fs.closeSync(fd); } catch (_) {}
  }
}

function globList(v, where, ignored, isExclude = false) {
  if (v === undefined) return [];
  if (!Array.isArray(v)) { ignored.push({ where, why: 'not an array' }); return []; }
  const out = [];
  const anyOut = (p) => out.some((m) => m(p));
  // Only the first MAX_GLOBS entries are looked at, valid or not: the rest is
  // one line in `ignored`, not one each.
  v.slice(0, MAX_GLOBS).forEach((g, i) => {
    const at = `${where}[${i}]`;
    if (typeof g !== 'string' || !g.trim()) return ignored.push({ where: at, why: 'not a non-empty string' });
    if (g.length > MAX_GLOB_LENGTH) return ignored.push({ where: at, why: `longer than ${MAX_GLOB_LENGTH} characters` });
    const m = globMatcher(g);
    if (isExclude && isCatchAll(m)) {
      return ignored.push({ where: at, why: 'a catch-all exclude would turn the gate off for everyone who clones the repo' });
    }
    if (isExclude && isCatchAll((p) => m(p) || anyOut(p))) {
      return ignored.push({ where: at, why: 'with the excludes before it, this would match most paths and turn the gate off for everyone who clones the repo' });
    }
    out.push(m);
  });
  if (v.length > MAX_GLOBS) ignored.push({ where, why: `more than ${MAX_GLOBS} entries; the rest are ignored` });
  return out;
}

// `project`: the project file under a nested config, loadConfig's shape with
// `exclude: []` (no `project` of its own), or null.
// The exported form, for doctor and tests, fills the process's own project dir
// and home; evaluate() calls configFor with env's, and never the defaults.
function projectConfig(cwd, projectDir = process.env.CLAUDE_PROJECT_DIR, home = os.homedir()) {
  return configFor(cwd, projectDir, home);
}

function configFor(cwd, projectDir, home) {
  const { root, file } = locateConfig(cwd, projectDir, home);
  const cfg = { ...loadConfig(root, file, cwd), project: null };
  if (!file || !projectDir) return cfg;
  const proj = path.resolve(normalizePath(projectDir));
  const p = normalizePath(proj), r = normalizePath(path.resolve(root));
  const projFile = path.join(proj, '.claude', 'canonkit.json');
  const isHome = !!home && samePath(p, normalizePath(path.resolve(home)));
  if (!isHome && !samePath(r, p) && isWithin(r, p) && fs.existsSync(projFile)) {
    cfg.project = { ...loadConfig(proj, projFile, cwd), exclude: [] };
  }
  return cfg;
}

function loadConfig(root, file, cwd) {
  const ignored = [];
  let raw = {};
  const text = file ? readConfigText(file, ignored) : null;
  if (text !== null) {
    try {
      raw = JSON.parse(text);
      if (!isObj(raw)) { ignored.push({ where: '.claude/canonkit.json', why: 'not a JSON object; defaults apply' }); raw = {}; }
    } catch (_) { ignored.push({ where: '.claude/canonkit.json', why: 'not valid JSON; defaults apply' }); }
  }
  if (raw.version !== undefined && raw.version !== 1) {
    ignored.push({ where: 'version', why: `unsupported version ${JSON.stringify(raw.version)}; defaults apply` });
    raw = {};
  }
  for (const k of Object.keys(raw)) if (!CONFIG_KEYS.includes(k)) ignored.push({ where: k, why: 'unknown key' });
  let high = {};
  if (raw.highRisk !== undefined) {
    if (isObj(raw.highRisk)) high = raw.highRisk;
    else ignored.push({ where: 'highRisk', why: 'not an object' });
  }
  for (const k of Object.keys(high)) if (!HIGH_RISK_KEYS.includes(k)) ignored.push({ where: `highRisk.${k}`, why: 'unknown key' });
  return {
    root,
    file,
    include: globList(high.include, 'highRisk.include', ignored),
    exclude: globList(high.exclude, 'highRisk.exclude', ignored, true),
    perf: globList(raw.perfBudgets, 'perfBudgets', ignored),
    ignored,
    rel: (fp) => projectPath(fp, cwd, root),
  };
}

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

// ---- GIT BYPASS ----
// Skipping the repository's own hooks or its signing is a deny, not a confirm.
// The reflex after a failed pre-commit is `--no-verify`, and a prompt that shows
// it gets approved on autopilot: the fix is the cause the hook reported, and
// someone who really means to skip runs the command themselves.
// Read on tokens, not on the raw string: a commit message that *mentions*
// --no-verify must not be denied, and only a tokenizer knows where `-m "..."`
// ends. A tripwire for that reflex, not a sandbox: `bash -c "..."`, an alias or
// HUSKY=0 pass, and the commit/push confirm still shows them.
const GIT_GLOBAL_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--config-env', '--super-prefix']);
const GIT_RUNS_HOOKS = new Set(['commit', 'push', 'merge', 'pull', 'am', 'rebase']);
const GIT_SIGNS = new Set(['commit', 'merge', 'pull', 'am', 'rebase', 'cherry-pick', 'revert', 'commit-tree']);
// Long options whose value is the next token: that token is a message or a
// name, never a flag. One a subcommand lacks makes git reject the whole
// command, so skipping its value opens no bypass.
const GIT_VALUE_LONG = new Set(['--message', '--file', '--author', '--date', '--template',
  '--reuse-message', '--reedit-message', '--cleanup', '--fixup', '--squash', '--trailer', '--pathspec-from-file']);
// Short options that take a value (the rest of the cluster, or the next token),
// per subcommand: the same letter means different things (`commit -m` is a
// message, `rebase -m` is --merge and `am -m` --message-id, both boolean).
// A letter missing here costs a false deny on `-x --no-verify`, never a bypass.
const GIT_VALUE_SHORT = {
  commit: 'mFCct', merge: 'mFsX', pull: 'sX', rebase: 'sXx', 'cherry-pick': 'mX', revert: 'mX',
  'commit-tree': 'mFp', push: 'o',
};
// Subcommands where `-n` is --no-verify, with the short options whose value can
// only follow in the same token.
const SHORT_NO_VERIFY = { commit: 'uS', am: 'pCS' };
// Words that run the command after them: wrappers, and the shell keywords a
// command follows (`then git commit ...`, `do git push ...`).
const CMD_PREFIX = new Set(['env', 'command', 'exec', 'builtin', 'sudo', 'nohup', 'time', 'timeout', 'nice', 'xargs',
  'if', 'then', 'else', 'elif', 'while', 'until', 'do', '!']);
// A wrapper's options whose value is the next token (`sudo -u bob`, `nice -n 10`, `timeout -s KILL`).
const CMD_PREFIX_VALUE = new Set(['-u', '-g', '-n', '-s', '-k', '-C', '-I']);

// Commands as token lists, one per pipeline/list element. Heredoc and
// here-string bodies are data (a commit message, usually) and are dropped; a
// here-string leaves an empty token so `-m @'...'@` still has its value. A
// `$( )` or `( )` is its own command and leaves a `()` token in the one around
// it, so `-m $(cat msg) --no-verify` keeps both the value and the flag.
function shellSegments(cmd, tool) {
  const esc = tool === 'PowerShell' ? '`' : '\\';
  const src = String(cmd)
    .replace(/[\\`]\r?\n/g, ' ')
    .replace(/@(['"])\r?\n[\s\S]*?\r?\n\1@/g, "''")
    .replace(/(?<!<)<<(?!<)-?\s*(['"]?)([^\s'"<>;&|()]+)\1[^\n]*\n(?:[^\n]*\n)*?[ \t]*\2[ \t]*\r?(?=\n|$)/g,
      (m) => m.slice(0, m.indexOf('\n')));
  // The closing quote of a "..." whose body starts at j; a string inside a
  // `$( )` in it ("$(echo "x")") is skipped whole.
  const closeDouble = (j) => {
    let depth = 0;
    while (j < src.length) {
      const d = src[j];
      if (d === esc) j += 2;
      else if (d === '"' && !depth) return j;
      else if (d === '$' && src[j + 1] === '(') { depth++; j += 2; }
      else if (d === ')' && depth) { depth--; j++; }
      else if (d === '"') j = closeDouble(j + 1) + 1;
      else j++;
    }
    return src.length;
  };
  const segs = [], outer = [];
  let toks = [], cur = '', has = false;
  const word = () => { if (has) toks.push(cur); cur = ''; has = false; };
  const cut = () => { word(); if (toks.length) segs.push(toks); toks = []; };
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "'") {
      const j = src.indexOf("'", i + 1);
      const end = j < 0 ? src.length : j;
      cur += src.slice(i + 1, end); has = true; i = end;
    } else if (c === '"') {
      const j = closeDouble(i + 1);
      cur += src.slice(i + 1, j); has = true; i = j;
    } else if (c === esc) {
      cur += src[i + 1] || ''; has = true; i++;
    } else if (c === '#' && !has && (i === 0 || /\s/.test(src[i - 1]))) {
      const j = src.indexOf('\n', i);
      i = j < 0 ? src.length : j - 1;
    } else if (c === '\n') {
      cut(); // before the whitespace branch: a new line is a new command
    } else if (/\s/.test(c)) {
      word();
    } else if (c === '&' && (src[i - 1] === '>' || src[i - 1] === '<' || src[i + 1] === '>')) {
      cur += c; has = true; // a redirection (2>&1, &>), not a separator
    } else if (c === '(') {
      if (/[$@]$/.test(cur)) { cur = cur.slice(0, -1); has = cur !== ''; }
      word(); outer.push(toks); toks = [];
    } else if (c === ')') {
      cut();
      if (outer.length) { toks = outer.pop(); toks.push('()'); }
    } else if (';&|{}'.includes(c) || c === '`') {
      cut();
    } else {
      cur += c; has = true;
    }
  }
  cut();
  while (outer.length) { toks = outer.pop(); cut(); }
  return segs;
}

// Each git invocation in a command: its subcommand, `-c` settings and arguments.
function gitCalls(cmd, tool) {
  const calls = [];
  for (const seg of shellSegments(cmd, tool)) {
    let i = 0;
    while (i < seg.length) {
      if (/^[A-Za-z_]\w*=/.test(seg[i])) { i++; continue; }
      if (!CMD_PREFIX.has(seg[i])) break;
      for (i++; i < seg.length && (seg[i].startsWith('-') || /^\d[\d.]*[smhd]?$/.test(seg[i])); i++) {
        if (CMD_PREFIX_VALUE.has(seg[i])) i++;
      }
    }
    if (i >= seg.length || !/^git(\.exe)?$/i.test(seg[i].split(/[\\/]/).pop())) continue;
    const config = [];
    for (i++; i < seg.length && seg[i].startsWith('-'); i++) {
      const t = seg[i];
      if (t === '-c' || t === '--config-env') config.push(seg[++i] || '');
      else if (t.startsWith('--config-env=')) config.push(t.slice('--config-env='.length));
      else if (GIT_GLOBAL_WITH_VALUE.has(t)) i++;
    }
    if (i < seg.length) calls.push({ sub: seg[i], config, args: seg.slice(i + 1) });
  }
  return calls;
}

// The flag a git invocation uses to skip hooks or signing, or null. Long
// options match their unambiguous abbreviations too: git accepts `--no-veri`.
function gitBypass({ sub, config, args }) {
  const hooks = GIT_RUNS_HOOKS.has(sub), signs = GIT_SIGNS.has(sub);
  if (!hooks && !signs) return null;
  const valueShort = GIT_VALUE_SHORT[sub] || '';
  for (const c of config) {
    const eq = c.indexOf('=');
    const key = (eq < 0 ? c : c.slice(0, eq)).toLowerCase();
    const value = eq < 0 ? 'true' : c.slice(eq + 1);
    if (hooks && key === 'core.hookspath') return `-c ${c}`;
    if (signs && key === 'commit.gpgsign' && /^(false|no|off|0|)$/i.test(value)) return `-c ${c}`;
  }
  for (let j = 0; j < args.length; j++) {
    const t = args[j];
    if (t === '--') break;
    if (GIT_VALUE_LONG.has(t) || (/^-[A-Za-z]$/.test(t) && valueShort.includes(t[1]))) { j++; continue; }
    if (hooks && t.length >= '--no-veri'.length && '--no-verify'.startsWith(t)) return t;
    if (signs && t.length >= '--no-gpg'.length && '--no-gpg-sign'.startsWith(t)) return t;
    // `git commit -n` and `git am -n` are --no-verify; in push, -n is --dry-run,
    // in merge/pull/rebase --no-stat. In a cluster, the letters after one that
    // takes a value are that value (`-mn` = message "n").
    const attached = SHORT_NO_VERIFY[sub];
    if (attached !== undefined && /^-[A-Za-z0-9]+$/.test(t)) {
      for (let k = 1; k < t.length; k++) {
        if (t[k] === 'n') return t;
        if (valueShort.includes(t[k])) { if (k === t.length - 1) j++; break; }
        if (attached.includes(t[k])) break;
      }
    }
  }
  return null;
}

// ---- THE CORE: evaluate(evt, env) ----
// Every kind evaluate() can return besides null (a plain allow). Each is also
// the `kind` of the gate line it logs, so a decision and its log line join.
const GATE_KINDS = Object.freeze([
  'git-bypass', // deny: skipping the repository's hooks or signing
  'secret-block', // deny: a high-confidence secret written to a file
  'git', // ask: git commit / git push
  'secret-ask', // ask: what looks like a hardcoded credential
  'perf-budget', // ask: a performance-budget file
  'high-risk-surface', // ask: auth/secret/migration/contract paths, and canonkit.json
  'definition-of-done', // block: Stop with a gated edit and no reviewer after it
  'context-size', // allow, with the reminder as reason
]);

// What each adapter does with each kind, declared next to the adapter so a test
// can hold it to GATE_KINDS and validate can hold an `[ENFORCED]` line to it.
//   enforce  the harness acts on the decision itself: refuses, prompts, blocks
//            the stop, or injects the note
//   text     surfaced as text only; the model decides
//   off      not offered by this harness
// Another harness's adapter declares its own map in its own file
// (CODEX_GATE_MODES, ...), never here.
const CLAUDE_GATE_MODES = Object.freeze({
  'git-bypass': 'enforce',
  'secret-block': 'enforce',
  git: 'enforce',
  'secret-ask': 'enforce',
  'perf-budget': 'enforce',
  'high-risk-surface': 'enforce',
  'definition-of-done': 'enforce',
  'context-size': 'enforce',
});

// evt, the normalized event (normalizeClaude builds it from Claude Code's input):
//   event                'PreToolUse' | 'PostToolUse' | 'SubagentStop' | 'Stop' |
//                        'UserPromptSubmit' | '' (an empty one is gated as PreToolUse)
//   tool                 tool name, '' when none
//   toolInput            the tool's arguments, {} when none
//   toolResponse, toolUseId, durationMs   PostToolUse
//   cwd                  required: the session's working directory
//   session              session id, '' when none
//   agentId, agentType   set only on a subagent's events (agentId undefined on
//                        the main thread, which is how the two are told apart)
//   stopHookActive       Stop / SubagentStop: a stop hook already continued it
//   transcriptPath, agentTranscriptPath, lastAssistantMessage
// env, everything else it may know about the machine:
//   logDir        the activity-log folder (read here; written by the adapter)
//   legacyLogDir  the pre-rename log folder, read only (optional)
//   projectDir    the project root, or undefined/'' for none
//   home          the user's home folder, or null when unknown
//   contextBands  the raw CANONKIT_CONTEXT_BANDS value (optional)
// Returns { decision, kind, reason, logs }: kind is one of GATE_KINDS or null,
// logs is [{ file, record }] with file a name inside env.logDir and record the
// complete JSON line. Fails open by itself: an error is an allow that still
// carries the logs recorded before it, as the old in-place writes did.
function evaluate(evt, env) {
  const logs = [];
  try {
    return { ...decide(evt, env || {}, logs), logs };
  } catch (_) {
    return { decision: 'allow', kind: null, reason: '', logs };
  }
}

const allow = (kind = null, reason = '') => ({ decision: 'allow', kind, reason });
const askFor = (kind, reason) => ({ decision: 'ask', kind, reason });
const denyFor = (kind, reason) => ({ decision: 'deny', kind, reason });

function decide(evt, env, logs) {
  const eventName = evt.event || '';
  const tool = evt.tool || '';
  const ti = evt.toolInput || {};
  const cwd = evt.cwd;
  const project = path.basename(cwd);
  // Tags every event for per-session queries.
  const session = evt.session || '';
  const agentId = safeId(evt.agentId);
  const who = agentId ? { agent_id: agentId, agent_type: cap(evt.agentType) } : {};

  const record = (file, event) => logs.push({ file, record: { ts: Date.now(), session, ...event } });
  const log = (event) => record(EVENTS_FILE, event);
  const logGate = (fields, files) => {
    const extra = { ...who };
    if (files) extra.in_project = files.some((f) => onProject(f, cwd, env));
    log({ event: 'gate', ...fields, ...extra });
  };

  // ---- DEFINITION-OF-DONE gate (Stop) ----
  if (eventName === 'Stop') {
    if (evt.stopHookActive) return allow(); // already nudged once this turn — don't loop
    // The rotated half too: a rotation (or install's meu-time log merge) can
    // move this session's gate there.
    const evs = readEvents(env, true).filter((e) => e.session && e.session === session);
    // perf-budget joins the gated kinds. This hook only ever sees the file path,
    // never the direction of the change, so it cannot tell a tightening (which
    // anyone may do) from a loosening (which only Perry may do). It gates both.
    // That is deliberate: a false gate costs one dispatch, while a false pass
    // costs the budget — which is exactly how a performance gate dies without
    // anyone deciding to kill it.
    const GATED = /high-risk-surface|secret-block|secret-ask|perf-budget/;
    // A reviewer subagent's own probe outside the project is not the session's
    // work. Only an explicit in_project false skips: a gate logged before the
    // field existed, or by the main thread, counts.
    const probe = (e) => !!e.agent_id && REVIEWER.test(e.agent_type || '') && e.in_project === false;
    const gates = evs.filter((e) => e.event === 'gate' && GATED.test(e.kind || '') && !probe(e));
    // The reviewer has to post-date the last gated edit. Session-wide credit let a
    // Gard dispatch from the morning clear an unrelated lighthouserc edit made in
    // the afternoon: "somebody was reviewed at some point today" is not review.
    // A reviewer resumed with a message after it counts as well. Residual: the
    // hook sees the SendMessage before it runs, so a failed one still credits.
    const lastGate = gates.reduce((max, e) => Math.max(max, e.ts || 0), 0);
    const after = (e) => (e.ts || 0) > lastGate;
    const reviewed = evs.some(
      (e) => e.event === 'agent_start' && REVIEWER.test(e.agent || '') && after(e)
    ) || evs.some((e) => {
      if (e.event !== 'agent_resume' || e.has_message !== true || !after(e)) return false;
      const start = resumedStart(evs, e);
      return !!start && REVIEWER.test(start.agent || '');
    });
    if (gates.length && !reviewed) {
      const fileList = [...new Set(gates.map((e) => e.file).filter(Boolean))];
      const files = fileList.join(', ') || 'a HIGH-risk surface';
      // The block itself is a gate: it is what costs a reviewer dispatch, and
      // without this line how often a rule ends in one could not be counted.
      // GATED does not match this kind, so it never feeds the next Stop.
      log({
        event: 'gate', kind: 'definition-of-done', files: fileList.length,
        rules: [...new Set(gates.map((e) => e.rule || e.kind))], project,
      });
      return {
        decision: 'block',
        kind: 'definition-of-done',
        reason: `Definition-of-done gate: this session edited gated surfaces (${files}) and no independent reviewer was dispatched (or resumed with SendMessage) after the last of those edits. Per the no-self-merge rule, dispatch Quinn (acceptance criteria), Gard (security), Archie (contract) or Perry (performance budgets) to confirm before declaring done — OR state explicitly why review isn't needed (e.g. trivial, user-authorized). This fires once per turn.`,
      };
    }
    return allow();
  }

  // ---- OBSERVABILITY (never blocks) ----
  if (eventName === 'UserPromptSubmit') {
    log({ event: 'prompt', project });
    let note = null;
    try { note = contextReminder(evt, env, log); } catch (_) { /* fail-open */ }
    return note ? allow('context-size', note) : allow();
  }
  if (eventName === 'SubagentStop') {
    // Logged on the first stop only: a stop hook that continues the agent fires
    // this event again, and two agent_stop lines read as two agents finishing.
    if (!evt.stopHookActive) log({ event: 'agent_stop', agent_id: agentId, project });
    // A background dispatch has no PostToolUse at its end, so its agent_end is
    // written here, linked through the agent_launch recorded at launch. A
    // foreground one has no agent_launch and is written by PostToolUse instead.
    // Written on every stop, with cumulative tokens: a continued or resumed agent
    // produces a later line for the same id, and the last line per id is the total
    // (for a resumed agent, its duration then spans the idle gap as well).
    if (agentId) {
      const evs = readEvents(env, true).filter((e) => e.session === session);
      const launch = evs.filter((e) => e.event === 'agent_launch' && e.agent_id === agentId).pop();
      if (launch) {
        const start = evs.filter((e) => e.event === 'agent_start' && e.id === launch.id).pop() || {};
        const scan = scanTranscript(evt.agentTranscriptPath);
        log({
          event: 'agent_end',
          id: launch.id,
          agent_id: agentId,
          agent: start.agent || evt.agentType || 'unknown',
          task: start.task || '',
          model: start.model || '',
          effort: start.effort || '',
          resolved_model: launch.resolved_model || '',
          mode: 'background',
          duration_ms: start.ts ? Date.now() - start.ts : null,
          tool_uses: null,
          tokens: scan.tokens,
          report_chars: scan.handback ?? reportChars(evt.lastAssistantMessage),
          project,
        });
      }
    }
    return allow();
  }
  if (eventName === 'PostToolUse') {
    // Observability only. Nothing below this block may run here: the enforcement
    // paths answer as PreToolUse, which a PostToolUse event must never emit.
    // agent_type is also set for a main thread started with --agent. Only
    // agent_id identifies a subagent; never mix its tool volume into main.
    // thread: "main" (no agent_id key), "subagent" (a valid agent_id, the same
    // id agent_launch/agent_end carry, so the dashboard joins it to its dispatch
    // without a lookup here), "unknown" (the key present but unusable). A line
    // without thread predates this field and was only ever written for main.
    // tool_use_id lets a reader drop the second line of a hook wired twice.
    if (safeId(session)) {
      const size = toolResultSize(tool, evt.toolResponse);
      const origin = evt.agentId === undefined ? { thread: 'main' }
        : agentId ? { thread: 'subagent', agent_id: agentId } : { thread: 'unknown' };
      // Empty ids are left out, not written as "": one line per result adds up.
      const agentType = agentId && safeType(evt.agentType);
      const toolUseId = safeId(evt.toolUseId);
      // One line per measured result, with an explicit quantitative allowlist.
      // No project basename either: even that can reveal sensitive context.
      if (size) {
        record(TOOL_RESULTS_FILE, {
          event: 'tool_result', session: safeId(session), ...origin, ...(agentType ? { agent_type: agentType } : {}),
          tool, ...(toolUseId ? { tool_use_id: toolUseId } : {}), ...size,
        });
      }
    }
    if (tool === 'Agent' || tool === 'Task') {
      const r = evt.toolResponse && typeof evt.toolResponse === 'object' ? evt.toolResponse : {};
      const id = evt.toolUseId || '';
      const launched = safeId(r.agentId);
      if (r.status === 'async_launched') {
        log({ event: 'agent_launch', id, agent_id: launched, resolved_model: r.resolvedModel || '', project });
      } else {
        log({
          event: 'agent_end',
          id,
          agent_id: launched,
          agent: ti.subagent_type || 'unknown',
          task: cap(ti.description),
          model: ti.model || '',
          effort: ti.effort || '',
          resolved_model: r.resolvedModel || '',
          mode: 'foreground',
          status: typeof r.status === 'string' ? r.status : '',
          duration_ms: num(r.totalDurationMs) || num(evt.durationMs) || null,
          tool_uses: typeof r.totalToolUseCount === 'number' ? r.totalToolUseCount : null,
          tokens: launched ? transcriptUsage(subagentTranscript(evt.transcriptPath, launched)) : null,
          report_chars: reportChars(r.content),
          project,
        });
      }
    }
    return allow();
  }
  if (tool === 'Agent' || tool === 'Task') {
    log({
      event: 'agent_start',
      // Links this line to its agent_end: tool_use_id is the one id PreToolUse
      // and PostToolUse share.
      id: evt.toolUseId || '',
      agent: ti.subagent_type || 'unknown',
      task: cap(ti.description),
      // What a later SendMessage addresses it by (the Stop gate's resume credit).
      name: cap(ti.name),
      // The rule says every planned dispatch names its model and effort. Logging
      // both is what makes that checkable after the fact instead of an intention
      // nobody can audit; empty means the dispatch inherited the default.
      model: ti.model || '',
      effort: ti.effort || '',
      project,
    });
    return allow(); // dispatching a subagent is always allowed
  }
  if (tool === 'SendMessage') {
    // Resuming an agent is always allowed. Who it went to and whether it carried
    // a message, never what the message said.
    const message = ti.message;
    log({ event: 'agent_resume', to: cap(ti.to), has_message: typeof message === 'string' && message.trim() !== '', project });
    return allow();
  }

  // ---- ENFORCEMENT: shells (Bash on POSIX, PowerShell on Windows) ----
  if (tool === 'Bash' || tool === 'PowerShell') {
    const cmd = String(ti.command || '');
    // Its own catch: a parser bug costs this check, not every shell gate after it.
    let calls = [];
    try { calls = gitCalls(cmd, tool); } catch (_) {}
    for (const call of calls) {
      const flag = gitBypass(call);
      if (flag) {
        logGate({ kind: 'git-bypass', detail: cmd.slice(0, 80), flag: cap(flag), project, tool });
        return denyFor('git-bypass', `canonkit gate: \`git ${call.sub} ${flag}\` skips the repository's hooks or commit signing. Blocked: fix what the hook reported instead. If you really mean to skip it, run the command yourself (in Claude Code, prefix it with \`!\`).`);
      }
    }
    // Every deny before any confirm: a confirm returns, and a deny after it never runs.
    // Before the project config is read, too: nothing in it may cost the deny.
    const targets = shellWriteTargets(cmd);
    if (targets.length) {
      for (const re of HARD_SECRET) {
        if (re.test(cmd)) {
          logGate({ kind: 'secret-block', file: targets[0], project, tool }, targets);
          return denyFor('secret-block', 'canonkit gate (Gard): this command writes a high-confidence secret (private key / cloud key) to a file. Blocked. Move it to an env var / secret store.');
        }
      }
    }
    // The raw match stays next to the parsed one: it still sees `bash -c "git commit ..."`.
    if (/\bgit\s+(commit|push)\b/.test(cmd) || calls.some((c) => c.sub === 'commit' || c.sub === 'push')) {
      logGate({ kind: 'git', detail: cmd.slice(0, 80), project, tool });
      return askFor('git', 'canonkit gate: git commit/push requires explicit user authorization (Bob/Pipe rule). Confirm to proceed.');
    }
    if (targets.length) {
      // The first config read on this path: every deny is above.
      const cfg = configFor(cwd, env.projectDir, env.home);
      const rels = targets.map((t) => cfg.rel(t));
      // Waived only when every target is a test file: one test target among
      // several must not carry a credential into the others.
      if (SOFT_SECRET.test(cmd) && !rels.every(isTestFile)) {
        logGate({ kind: 'secret-ask', file: targets[0], project, tool }, targets);
        return askFor('secret-ask', 'canonkit gate (Gard): this command writes what looks like a hardcoded credential to a file. Confirm this is intentional and not a real secret.');
      }
      const perf = targets.find((t, i) => isPerfBudget(rels[i], cfg, t));
      if (perf) {
        logGate({ kind: 'perf-budget', file: perf, project, tool }, [perf]);
        return askFor('perf-budget', `canonkit gate (Perry): this command writes "${path.basename(perf)}", which carries the performance budgets. Anyone may tighten a threshold; only Perry loosens one, and only with a measured floor. Derivations live in docs/adr/. Confirm to proceed.`);
      }
      // In target order, as before: an excluded target ahead of the first
      // HIGH-risk one is logged, one after it is not (the ask ended the run).
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        const verdict = highRisk(rels[i], cfg, t);
        if (verdict && verdict.rule) {
          logGate({ kind: 'high-risk-surface', file: t, rule: verdict.rule, project, tool }, [t]);
          return askFor('high-risk-surface', `canonkit gate: this command writes "${path.basename(t)}", a HIGH-risk surface (auth/secret/migration/contract). Archie/Gard review applies even if this felt LOW. Before confirming, state: who imports or calls it, which public contract it touches (or "none"), and the rollback if it is wrong. A false alarm is tuned in .claude/canonkit.json (highRisk.exclude).`);
        }
        if (verdict && verdict.excludedBy) logGate({ kind: 'excluded-by-config', file: t, glob: verdict.excludedBy, project, tool }, [t]);
      }
    }
    return allow();
  }

  // ---- ENFORCEMENT: file-editing tools ----
  if (tool === 'Edit' || tool === 'Write' || tool === 'MultiEdit' || tool === 'NotebookEdit') {
    const fp = String(ti.file_path || ti.notebook_path || ti.path || '');
    const content = String(
      ti.content || ti.new_string || ti.new_source ||
      (Array.isArray(ti.edits) ? ti.edits.map((e) => e.new_string || '').join('\n') : '')
    );

    // Before the project config is read: nothing in it may cost the deny.
    for (const re of HARD_SECRET) {
      if (re.test(content)) {
        logGate({ kind: 'secret-block', file: fp, project, tool }, [fp]);
        return denyFor('secret-block', 'canonkit gate (Gard): a high-confidence secret (private key / cloud key) was detected in this write. Blocked. Move it to an env var / secret store.');
      }
    }
    // The first config read on this path: the deny is above.
    const cfg = configFor(cwd, env.projectDir, env.home);
    const rel = cfg.rel(fp);
    if (SOFT_SECRET.test(content) && !isTestFile(rel)) {
      logGate({ kind: 'secret-ask', file: fp, project, tool }, [fp]);
      return askFor('secret-ask', 'canonkit gate (Gard): looks like a hardcoded credential. Confirm this is intentional and not a real secret.');
    }
    if (isPerfBudget(rel, cfg, fp)) {
      logGate({ kind: 'perf-budget', file: fp, project, tool }, [fp]);
      return askFor('perf-budget', `canonkit gate (Perry): "${path.basename(fp)}" carries the performance budgets. Anyone may tighten a threshold; only Perry loosens one, and only with a measured floor. Derivations live in docs/adr/. Confirm to proceed.`);
    }
    const verdict = highRisk(rel, cfg, fp);
    if (verdict && verdict.rule) {
      logGate({ kind: 'high-risk-surface', file: fp, rule: verdict.rule, project, tool }, [fp]);
      return askFor('high-risk-surface', `canonkit gate: "${path.basename(fp)}" is a HIGH-risk surface (auth/secret/migration/contract). Archie/Gard review applies even if this felt LOW. Before confirming, state: who imports or calls it, which public contract it touches (or "none"), and the rollback if it is wrong. A false alarm is tuned in .claude/canonkit.json (highRisk.exclude).`);
    }
    // Not a gate: the dashboard shows what a project's config kept quiet.
    if (verdict && verdict.excludedBy) logGate({ kind: 'excluded-by-config', file: fp, glob: verdict.excludedBy, project, tool }, [fp]);
    return allow();
  }

  return allow(); // default allow
}

// ---- THE CLAUDE CODE ADAPTER ----
// Claude Code's hook input, field for field, into evaluate()'s event. Values
// pass through as they came; only the defaults the gates rely on are filled.
function normalizeClaude(input, fallbackCwd) {
  return {
    event: input.hook_event_name || '',
    tool: input.tool_name || '',
    toolInput: input.tool_input || {},
    toolResponse: input.tool_response,
    toolUseId: input.tool_use_id,
    durationMs: input.duration_ms,
    cwd: input.cwd || fallbackCwd,
    session: input.session_id || '',
    agentId: input.agent_id,
    agentType: input.agent_type,
    stopHookActive: input.stop_hook_active,
    transcriptPath: input.transcript_path,
    agentTranscriptPath: input.agent_transcript_path,
    lastAssistantMessage: input.last_assistant_message,
  };
}

function claudeEnv() {
  const home = os.homedir();
  return {
    logDir: path.join(home, '.claude', 'canonkit-activity'),
    legacyLogDir: path.join(home, '.claude', 'meu-time-activity'),
    projectDir: process.env.CLAUDE_PROJECT_DIR,
    home,
    contextBands: process.env.CANONKIT_CONTEXT_BANDS ?? process.env.MEU_TIME_CONTEXT_BANDS,
  };
}

// The decision in the shape Claude Code reads on stdout, or null for none.
// Exit code is 0 in every case: the decision travels in the JSON.
function claudeOutput({ decision, kind, reason }) {
  if (decision === 'ask' || decision === 'deny') {
    return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reason } };
  }
  if (decision === 'block') return { decision: 'block', reason };
  if (kind === 'context-size' && reason) {
    return { hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: reason } };
  }
  return null;
}

function main() {
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch (_) {}
  let input = {};
  try { input = JSON.parse(raw || '{}'); } catch (_) {}

  const env = claudeEnv();
  const result = evaluate(normalizeClaude(input, process.cwd()), env);
  for (const line of result.logs) writeLog(env.logDir, line);
  const out = claudeOutput(result);
  if (out) process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

function run() {
  try { main(); } catch (_) { process.exit(0); /* fail-open */ }
}

module.exports = {
  run, projectConfig, globMatcher, normalizePath,
  evaluate, normalizeClaude, GATE_KINDS, CLAUDE_GATE_MODES,
};

// Run as the hook itself, or through the pre-rename meu-time-hook.js forwarder.
// The current forwarder calls run(); one written before this export only
// require()s this file, and a forwarder that silently stopped gating is the very
// failure it exists to prevent. Imported anywhere else (doctor, tests), nothing runs.
const entry = require.main && require.main.filename;
if (require.main === module || (entry && path.basename(entry) === 'meu-time-hook.js')) run();

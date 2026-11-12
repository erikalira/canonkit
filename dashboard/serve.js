#!/usr/bin/env node
/**
 * Minimal, dependency-free server for the canonkit activity dashboard.
 * Serves index.html and exposes:
 *   /events.json      the tail of the hook's event log (the live timeline)
 *   /dispatches.json  every agent_end still in the log, one per dispatch (the cost views)
 *   /context.json     measured tool-result text by session, thread and agent,
 *                     plus the same over every retained session
 * Run:  node ~/.claude/canonkit-dashboard/serve.js
 * Open: http://localhost:4317
 *
 * Installed copy: the source of truth is dashboard/ in the canonkit repo.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { executionSnapshot } = require('./execution-model');

const PORT = 4317;
const HTML = path.join(__dirname, 'dist', 'index.html');
const ACTIVITY_HTML = path.join(__dirname, 'activity.html');
const STATIC_ROOT = path.join(__dirname, 'dist');
const LOG = path.join(os.homedir(), '.claude', 'canonkit-activity', 'events.jsonl');
// The pre-rename location. install moves it; until then (or if both exist) its
// history is read first, as the older half.
const LEGACY_LOG = path.join(os.homedir(), '.claude', 'meu-time-activity', 'events.jsonl');
// tool_result lines, since 1.2.0. Those written by 1.1.5 stay in events.jsonl(.1)
// until rotated out, so the contributors still read both.
const TOOL_RESULTS = path.join(os.homedir(), '.claude', 'canonkit-activity', 'tool-results.jsonl');

// The hook rotates each log at 2 MB (x.jsonl -> x.jsonl.1). Read the rotated
// half first, or the dashboard goes near-empty for a while after every
// rotation — the last 300 events would be sitting in the file nobody reads.
function readFiles(files) {
  let lines = [];
  for (const f of files) {
    try {
      lines = lines.concat(fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean));
    } catch (_) {}
  }
  return lines;
}
const readLines = () => readFiles([LEGACY_LOG + '.1', LEGACY_LOG, LOG + '.1', LOG]);
const readToolResultLines = () => readFiles([TOOL_RESULTS + '.1', TOOL_RESULTS]);
const parse = (l) => { try { return JSON.parse(l); } catch (_) { return null; } };

// A background dispatch can log agent_end more than once (a continued or resumed
// agent stops again), each line cumulative — so the last line per id is the one
// that counts. The timeline's 300-event window would cut the averages short, so
// this reads the whole retained log.
function dispatches() {
  const byId = new Map();
  let anon = 0;
  for (const l of readLines()) {
    if (!l.includes('"agent_end"')) continue;
    const e = parse(l);
    if (e && e.event === 'agent_end') byId.set(e.id || `anon-${anon++}`, e);
  }
  return [...byId.values()];
}

const TOOLS = new Set(['Read', 'Grep', 'Glob', 'Bash', 'PowerShell']);
const SAFE_ID = /^[\w-]{1,64}$/;
const measured = (n) => Number.isSafeInteger(n) && n >= 0;
const safe = (v) => (typeof v === 'string' && SAFE_ID.test(v) ? v : '');
// The hook's agent-type validator: namespaced plugin agents keep their own row.
const safeType = (v) => (typeof v === 'string' && /^[\w.:-]{1,128}$/.test(v) ? v : '');

function addTo(groups, tool, chars, calls = 1, max = chars) {
  const g = groups.get(tool) || { tool, chars: 0, calls: 0, max_chars: 0 };
  g.chars += chars;
  g.calls += calls;
  g.max_chars = Math.max(g.max_chars, max);
  groups.set(tool, g);
}

function rows(groups) {
  const list = [...groups.values()].sort((a, b) => b.chars - a.chars);
  const total = list.reduce((n, g) => n + g.chars, 0);
  return { total, contributors: list.map((g) => ({ ...g, avg_chars: g.chars / g.calls, share: total ? g.chars / total : 0 })) };
}
const sumCalls = (groups) => [...groups.values()].reduce((n, g) => n + g.calls, 0);

// What a subagent row is, when it has no measured result: the dashboard says
// which, instead of showing a zero that reads as "did nothing".
//   measured          at least one tool_result carried its agent_id
//   no-tool-use       its agent_end reports 0 tool uses
//   not-instrumented  nothing in this session was logged by a hook that measures
//                     subagents (a tool_result with `thread`): historical data
//   unmeasured        the hook could measure, but nothing was: only tools outside
//                     Read/Grep/Glob/Bash/PowerShell, unknown payloads, or in flight
function agentStatus(a, instrumented) {
  if (a.groups.size) return 'measured';
  if (a.tool_uses === 0) return 'no-tool-use';
  return instrumented ? 'unmeasured' : 'not-instrumented';
}

// Tool-result volume per session, split by who received it. `contributors` is
// the main thread's context, as before: its tools plus the dispatch reports that
// came back to it ("Agents"). Subagent results never enter it — they land in the
// subagent's own context, listed per agent and joined to the dispatch by the
// agent_id that agent_launch/agent_end carry (never guessed when absent).
function contextContributors(lines = readLines().concat(readToolResultLines())) {
  const sessions = new Map();
  const seen = new Set();
  const S = (id) => {
    let s = sessions.get(id);
    if (!s) sessions.set(id, s = { main: new Map(), unknown: new Map(), agents: new Map(), ends: new Map(), starts: new Map(), instrumented: false });
    return s;
  };
  const A = (s, agentId) => {
    let a = s.agents.get(agentId);
    if (!a) s.agents.set(agentId, a = { agent_id: agentId, agent: '', dispatch: '', tool_uses: null, groups: new Map() });
    return a;
  };
  const endAgent = (a, e) => {
    if (safeType(e.agent)) a.agent = e.agent;
    a.tool_uses = typeof e.tool_uses === 'number' ? e.tool_uses : null;
  };
  for (const line of lines) {
    const e = parse(line);
    if (!e || typeof e.session !== 'string' || !SAFE_ID.test(e.session)) continue;
    if (e.event === 'tool_result' && TOOLS.has(e.tool) && measured(e.chars)) {
      // A hook wired twice writes the same tool_use_id twice: count it once.
      const tu = safe(e.tool_use_id);
      if (tu) { const k = JSON.stringify([e.session, tu]); if (seen.has(k)) continue; seen.add(k); }
      const s = S(e.session);
      if ('thread' in e) s.instrumented = true;
      // No thread: written before the field, when only main was measured.
      const thread = 'thread' in e ? e.thread : 'main';
      if (thread === 'main') addTo(s.main, e.tool, e.chars);
      else if (thread === 'subagent' && safe(e.agent_id)) {
        const a = A(s, e.agent_id);
        if (!a.agent) a.agent = safeType(e.agent_type);
        addTo(a.groups, e.tool, e.chars);
      } else addTo(s.unknown, e.tool, e.chars);
    }
    if (e.event === 'agent_start' && typeof e.id === 'string' && e.id) S(e.session).starts.set(e.id, safeType(e.agent));
    if (e.event === 'agent_launch' && safe(e.agent_id) && e.id) Object.assign(A(S(e.session), e.agent_id), { dispatch: e.id });
    // Last cumulative report per dispatch, keyed by session too. Historical
    // events with no report_chars remain unmeasured, never invented as zero.
    if (e.event === 'agent_end') {
      const s = S(e.session);
      if (typeof e.id === 'string' && e.id) s.ends.set(e.id, e);
      else {
        // No dispatch id to keep the last line by, but the agent still ran: list it.
        if (measured(e.report_chars)) addTo(s.main, 'Agents', e.report_chars);
        if (safe(e.agent_id)) endAgent(A(s, e.agent_id), e);
      }
    }
  }
  const out = [];
  for (const [session, s] of sessions) {
    for (const e of s.ends.values()) {
      if (measured(e.report_chars)) addTo(s.main, 'Agents', e.report_chars);
      if (!safe(e.agent_id)) continue;
      const a = A(s, e.agent_id);
      a.dispatch = e.id;
      endAgent(a, e);
    }
    for (const a of s.agents.values()) if (a.dispatch && s.starts.get(a.dispatch)) a.agent = s.starts.get(a.dispatch);
    // A session with nothing measured and no dispatch has nothing to say.
    if (!s.main.size && !s.unknown.size && !s.agents.size) continue;
    const main = rows(s.main);
    const agents = [...s.agents.values()].map((a) => {
      const r = rows(a.groups);
      return { agent_id: a.agent_id, agent: a.agent || 'unknown', dispatch: a.dispatch || null, tool_uses: a.tool_uses,
        status: agentStatus(a, s.instrumented), chars: r.total, calls: sumCalls(a.groups), contributors: r.contributors };
    }).sort((x, y) => y.chars - x.chars);
    const subChars = agents.reduce((n, a) => n + a.chars, 0);
    out.push({
      session, total_chars: main.total, contributors: main.contributors, instrumented: s.instrumented,
      // Tool results only on every side: the Agents report row is main's context
      // but not a tool result, so it is left out of this comparison.
      threads: {
        main: { chars: main.total - (s.main.get('Agents')?.chars || 0), calls: sumCalls(s.main) - (s.main.get('Agents')?.calls || 0) },
        subagents: { chars: subChars, calls: agents.reduce((n, a) => n + a.calls, 0) },
        unknown: { chars: rows(s.unknown).total, calls: sumCalls(s.unknown) },
      },
      agents,
    });
  }
  return out;
}

// Every retained session together, subagents grouped by agent type: "which
// agent reads the most" across the log, not inside one session.
function retainedTotals(sessions) {
  const main = new Map(), types = new Map(), unknown = { chars: 0, calls: 0 };
  const merge = (into, list) => { for (const g of list) addTo(into, g.tool, g.chars, g.calls, g.max_chars); };
  let instrumented = 0;
  for (const s of sessions) {
    if (s.instrumented) instrumented++;
    merge(main, s.contributors.filter((g) => g.tool !== 'Agents'));
    unknown.chars += s.threads.unknown.chars;
    unknown.calls += s.threads.unknown.calls;
    for (const a of s.agents) {
      const g = types.get(a.agent) || { agent: a.agent, dispatches: 0, measured: 0, groups: new Map() };
      g.dispatches++;
      if (a.status === 'measured') g.measured++;
      merge(g.groups, a.contributors);
      types.set(a.agent, g);
    }
  }
  const m = rows(main);
  const agents = [...types.values()].map((g) => {
    const r = rows(g.groups);
    return { agent: g.agent, dispatches: g.dispatches, measured_dispatches: g.measured, chars: r.total, calls: sumCalls(g.groups), contributors: r.contributors };
  }).sort((x, y) => y.chars - x.chars);
  return {
    sessions: sessions.length, instrumented_sessions: instrumented,
    main: { chars: m.total, calls: sumCalls(main), contributors: m.contributors },
    subagents: { chars: agents.reduce((n, a) => n + a.chars, 0), calls: agents.reduce((n, a) => n + a.calls, 0) },
    unknown,
    agents,
  };
}

function json(res, body) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}

function localHost(host) {
  if (typeof host !== 'string' || host.length > 255 || /[\\/@\s]/.test(host)) return false;
  try {
    const parsed = new URL(`http://${host}`);
    return ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) &&
      (!parsed.port || (Number(parsed.port) > 0 && Number(parsed.port) <= 65535));
  } catch (_) { return false; }
}

function allowedRequest(req) {
  const host = req.headers.host;
  if (!localHost(host)) return false;
  const origin = req.headers.origin;
  if (origin === undefined) return true;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'http:' && localHost(parsed.host) && parsed.host === host;
  } catch (_) { return false; }
}

const server = http.createServer((req, res) => {
  if (!allowedRequest(req)) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }); res.end('forbidden'); return; }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD', 'X-Content-Type-Options': 'nosniff' }); res.end(); return; }
  let pathname;
  try { pathname = new URL(req.url, 'http://127.0.0.1').pathname; }
  catch (_) { res.writeHead(400, { 'X-Content-Type-Options': 'nosniff' }); res.end(); return; }
  // Volume has its own aggregate view. It must not crowd gates/dispatches out
  // of the existing timeline or change its counters' 300-event window.
  if (pathname === '/events.json') return json(res, readLines().map(parse).filter((e) => e && e.event !== 'tool_result').slice(-300));
  if (pathname === '/dispatches.json') return json(res, dispatches());
  if (pathname === '/execution.json') return json(res, executionSnapshot(readLines().map(parse).filter(Boolean)));
  if (pathname === '/context.json') {
    const sessions = contextContributors();
    return json(res, { sessions, retained: retainedTotals(sessions) });
  }
  let file;
  if (pathname === '/activity.html' || pathname === '/activity') file = ACTIVITY_HTML;
  else {
    let decoded;
    try { decoded = decodeURIComponent(pathname); }
    catch (_) { res.writeHead(400, { 'X-Content-Type-Options': 'nosniff' }); res.end(); return; }
    file = path.resolve(STATIC_ROOT, `.${decoded === '/' ? '/index.html' : decoded}`);
    if (!file.startsWith(STATIC_ROOT + path.sep) && file !== path.join(STATIC_ROOT, 'index.html')) {
      res.writeHead(404, { 'X-Content-Type-Options': 'nosniff' }); res.end('not found'); return;
    }
  }
  const ext = path.extname(file).toLowerCase();
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2' };
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }); res.end(err.code === 'ENOENT' ? 'not found' : 'unable to read dashboard asset'); return; }
    const activity = file === ACTIVITY_HTML;
    res.writeHead(200, {
      'Content-Type': types[ext] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': `default-src 'self'; script-src 'self'${activity ? " 'unsafe-inline'" : ''}; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`,
      'Cache-Control': 'no-cache',
    });
    res.end(buf);
  });
});

module.exports = { contextContributors, retainedTotals, allowedRequest, localHost, server };

if (require.main === module) server.listen(PORT, '127.0.0.1', () => {
  console.log(`canonkit dashboard → http://localhost:${PORT}  (Ctrl+C to stop)`);
});

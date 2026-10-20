#!/usr/bin/env node
/**
 * Minimal, dependency-free server for the Meu Time activity dashboard.
 * Serves index.html and exposes:
 *   /events.json      the tail of the hook's event log (the live timeline)
 *   /dispatches.json  every agent_end still in the log, one per dispatch (the cost views)
 *   /context.json     measured text volume by session and contributor
 * Run:  node ~/.claude/meu-time-dashboard/serve.js
 * Open: http://localhost:4317
 *
 * Installed copy: the source of truth is dashboard/ in the agent-team-config repo.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 4317;
const HTML = path.join(__dirname, 'index.html');
const LOG = path.join(os.homedir(), '.claude', 'meu-time-activity', 'events.jsonl');

// The hook rotates the log at 2 MB (events.jsonl -> events.jsonl.1). Read the
// rotated half first, or the dashboard goes near-empty for a while after every
// rotation — the last 300 events would be sitting in the file nobody reads.
function readLines() {
  let lines = [];
  for (const f of [LOG + '.1', LOG]) {
    try {
      lines = lines.concat(fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean));
    } catch (_) {}
  }
  return lines;
}
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

function contextContributors(lines = readLines()) {
  const sessions = new Map(), agents = new Map();
  const tools = new Set(['Read', 'Grep', 'Glob', 'Bash', 'PowerShell']);
  const measured = (n) => Number.isSafeInteger(n) && n >= 0;
  function add(session, tool, chars) {
    const groups = sessions.get(session) || new Map();
    const g = groups.get(tool) || { tool, chars: 0, calls: 0, max_chars: 0 };
    g.chars += chars;
    g.calls++;
    g.max_chars = Math.max(g.max_chars, chars);
    groups.set(tool, g);
    sessions.set(session, groups);
  }
  for (const line of lines) {
    const e = parse(line);
    if (!e || typeof e.session !== 'string' || !/^[\w-]{1,64}$/.test(e.session)) continue;
    if (e.event === 'tool_result' && tools.has(e.tool) && measured(e.chars)) add(e.session, e.tool, e.chars);
    // Last cumulative report per dispatch, keyed by session too. Historical
    // events with no report_chars remain unmeasured, never invented as zero.
    if (e.event === 'agent_end') {
      if (typeof e.id === 'string' && e.id) agents.set(JSON.stringify([e.session, e.id]), e);
      else if (measured(e.report_chars)) add(e.session, 'Agents', e.report_chars);
    }
  }
  for (const e of agents.values()) if (measured(e.report_chars)) add(e.session, 'Agents', e.report_chars);
  return [...sessions].map(([session, groups]) => {
    const contributors = [...groups.values()].sort((a, b) => b.chars - a.chars);
    const total_chars = contributors.reduce((n, g) => n + g.chars, 0);
    return { session, total_chars, contributors: contributors.map((g) => ({
      ...g, avg_chars: g.chars / g.calls, share: total_chars ? g.chars / total_chars : 0,
    })) };
  });
}

function json(res, body) {
  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  // Volume has its own aggregate view. It must not crowd gates/dispatches out
  // of the existing timeline or change its counters' 300-event window.
  if (req.url.startsWith('/events.json')) return json(res, readLines().map(parse).filter((e) => e && e.event !== 'tool_result').slice(-300));
  if (req.url.startsWith('/dispatches.json')) return json(res, dispatches());
  if (req.url.startsWith('/context.json')) return json(res, contextContributors());
  fs.readFile(HTML, (err, buf) => {
    if (err) { res.writeHead(500); res.end('index.html not found'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(buf);
  });
});

module.exports = { contextContributors, server };

if (require.main === module) server.listen(PORT, '127.0.0.1', () => {
  console.log(`Meu Time dashboard → http://localhost:${PORT}  (Ctrl+C to stop)`);
});

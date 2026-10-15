#!/usr/bin/env node
/**
 * Minimal, dependency-free server for the Meu Time activity dashboard.
 * Serves index.html and exposes:
 *   /events.json      the tail of the hook's event log (the live timeline)
 *   /dispatches.json  every agent_end still in the log, one per dispatch (the cost views)
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

function json(res, body) {
  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

http.createServer((req, res) => {
  if (req.url.startsWith('/events.json')) return json(res, readLines().slice(-300).map(parse).filter(Boolean));
  if (req.url.startsWith('/dispatches.json')) return json(res, dispatches());
  fs.readFile(HTML, (err, buf) => {
    if (err) { res.writeHead(500); res.end('index.html not found'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(buf);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Meu Time dashboard → http://localhost:${PORT}  (Ctrl+C to stop)`);
});

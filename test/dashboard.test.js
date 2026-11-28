import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const SERVER = fileURLToPath(new URL("../dashboard/serve.js", import.meta.url));
const { contextContributors, retainedTotals, allowedRequest, localHost, server } = createRequire(import.meta.url)(SERVER);
const { normalizeEvent, executionSnapshot } = createRequire(import.meta.url)(fileURLToPath(new URL("../dashboard/execution-model.js", import.meta.url)));
const HOOK = fileURLToPath(new URL("../hooks/canonkit-hook.js", import.meta.url));

test("execution contract normalizes only observed, allowlisted facts", () => {
  const events = [
    { ts: 10, session: "s1", event: "agent_start", id: "d1", agent: "bob", task: "SECRET-PROMPT", project: "private-name" },
    { ts: 11, session: "s1", event: "agent_launch", id: "d2", agent_id: "a2" },
    { ts: 12, session: "s1", event: "gate", kind: "context-size", detail: "SECRET-COMMAND", file: "/private/path" },
    { ts: 13, session: "s1", event: "gate", kind: "high-risk-surface", files: 1, rules: ["auth"] },
    { ts: 14, session: "s1", event: "agent_end", id: "d1", agent_id: "a1", agent: "bob", duration_ms: 0, status: "ambiguous", tokens: { input: 4, output: 3, total: 7 }, transcript: "SECRET-TRANSCRIPT" },
    { ts: 15, session: "../unsafe", event: "agent_start", id: "bad/id", agent: "x" },
    { ts: "bad", session: "s1", event: "agent_start", id: "d3" },
    { ts: 16, session: "s1", event: "new-event", id: "d3" },
  ];
  const snapshot = executionSnapshot(events);
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.sessions.length, 1);
  const [session] = snapshot.sessions;
  assert.equal(session.projectId, null); assert.equal(session.worktreeId, null); assert.equal(session.branch, null);
  assert.deepEqual(session.dispatches.map((d) => [d.executionId, d.executionState, d.approvalState]), [
    ["d1", "completed", "unknown"], ["d2", "active", "unknown"],
  ]);
  const gates = snapshot.observations.filter((e) => e.type === "gate");
  assert.deepEqual(gates.map((e) => e.data.decision), ["allowed", "confirmation-requested"]);
  const serialized = JSON.stringify(snapshot);
  for (const secret of ["SECRET-PROMPT", "SECRET-COMMAND", "SECRET-TRANSCRIPT", "/private/path", "private-name"])
    assert.ok(!serialized.includes(secret), `${secret} is omitted from the public read model`);
  assert.equal(snapshot.observations[0].eventId, null, "the adapter does not fabricate source event IDs");
  assert.equal(normalizeEvent({ ts: 1, event: "tool_result", session: "s1" }), null);
});

test("execution status follows ordered dispatch signals and keeps parallel and resumed activity distinct", () => {
  const snapshot = executionSnapshot([
    { ts: 4, session: "session", event: "agent_start", id: "d1", agent: "bob" },
    { ts: 5, session: "session", event: "agent_launch", id: "d2", agent_id: "a2" },
    { ts: 6, session: "session", event: "agent_end", id: "d1", agent_id: "a1", duration_ms: 100 },
    { ts: 7, session: "session", event: "agent_resume", to: "bob", has_message: true },
    { ts: 8, session: "session", event: "agent_end", id: "d1", agent_id: "a1", duration_ms: 300 },
    { ts: 10, session: "session", event: "agent_start", id: "d4", agent: "bob" },
    { ts: 11, session: "session", event: "agent_end", id: "d4", duration_ms: 800, tokens: { total: 99 } },
    { ts: 12, session: "session", event: "agent_end", id: "d4", duration_ms: null, tokens: null },
    { ts: 9, session: "session", event: "agent_stop", agent_id: "a2" },
    { ts: 3, session: "session", event: "agent_launch", id: "d3", agent_id: "a3" },
  ]);
  const [one, two, three] = snapshot.sessions[0].dispatches;
  assert.equal(snapshot.sessions[0].observations.find((event) => event.type === "agent_stop").dispatchId, "d2");
  assert.deepEqual([one.executionId, one.executionState, one.durationMs], ["d3", "active", null]);
  assert.deepEqual([two.executionId, two.executionState, two.durationMs], ["d1", "completed", 300]);
  assert.deepEqual([three.executionId, three.executionState, three.durationMs], ["d2", "completed", null]);
  assert.deepEqual(snapshot.agents.map((agent) => [agent.executionId, agent.activity, agent.observedActivity]), [
    ["d3", "working", "agent_launch"], ["d1", "finished", "agent_end"], ["d2", "finished", "agent_stop"],
  ]);
  assert.equal(snapshot.sessions[0].observations.find((e) => e.type === "agent_resume").dispatchId, null,
    "resume stays observable without a direct dispatch ID");
  const cumulative = snapshot.sessions[0].dispatches.find((dispatch) => dispatch.executionId === "d4");
  assert.deepEqual([cumulative.durationMs, cumulative.tokens], [null, null], "the latest cumulative end can clear missing measurements");
});

test("execution snapshot caps emitted observations but derives dispatch state from the full list", () => {
  const events = [
    { ts: 1, session: "s", event: "agent_start", id: "early", agent: "bob" },
    { ts: 2, session: "s", event: "agent_start", id: "other", agent: "quinn" },
    ...Array.from({ length: 10 }, (_, i) => ({ ts: 10 + i, session: "s", event: "prompt" })),
    { ts: 30, session: "s", event: "agent_end", id: "early", duration_ms: 5 },
    { ts: 40, session: "t", event: "prompt" },
  ];
  const snapshot = executionSnapshot(events, 4);
  const s = snapshot.sessions.find((x) => x.sessionId === "s");
  const early = s.dispatches.find((d) => d.executionId === "early");
  assert.deepEqual([early.startedAt, early.endedAt, early.executionState, early.parallel], [1, 30, "completed", true]);
  assert.equal(s.dispatches.find((d) => d.executionId === "other").executionState, "active");
  assert.equal(s.observations.length, 4);
  assert.deepEqual(s.observations.map((o) => o.timestamp), [17, 18, 19, 30]);
  assert.deepEqual([s.observationCount, s.omittedObservations], [13, 9]);
  assert.equal(snapshot.observations.length, 4);
  assert.deepEqual(snapshot.observations.map((o) => o.timestamp), [18, 19, 30, 40]);
  assert.equal(snapshot.agents.length, 0);
  assert.equal(executionSnapshot(events).observations.length, 14, "default cap does not trim small logs");
});

test("parallel lanes require overlapping observed dispatch intervals", () => {
  const snapshot = executionSnapshot([
    { ts: 1, session: "s", event: "agent_start", id: "a" },
    { ts: 2, session: "s", event: "agent_start", id: "b" },
    { ts: 4, session: "s", event: "agent_end", id: "a" },
    { ts: 5, session: "s", event: "agent_end", id: "b" },
    { ts: 6, session: "s", event: "agent_start", id: "c" },
    { ts: 7, session: "s", event: "agent_end", id: "c" },
  ]);
  assert.deepEqual(snapshot.sessions[0].dispatches.map((d) => [d.executionId, d.parallel]), [
    ["a", true], ["b", true], ["c", false],
  ]);
});

test("an unended dispatch is active only while its session shows later activity", () => {
  const snap = (events) => executionSnapshot(events).sessions;
  // (a) later activity in the session keeps it active.
  const [a] = snap([
    { ts: 1, session: "s", event: "agent_start", id: "d" },
    { ts: 2, session: "s", event: "prompt" },
  ]);
  assert.deepEqual([a.dispatches[0].executionState, a.dispatches[0].endedAt], ["active", null]);
  // (b) nothing after its start: unknown, and the agent activity follows.
  const [b] = snap([{ ts: 1, session: "s", event: "agent_launch", id: "d", agent_id: "a1" }]);
  assert.equal(b.dispatches[0].executionState, "unknown");
  assert.equal(executionSnapshot([{ ts: 1, session: "s", event: "agent_launch", id: "d", agent_id: "a1" }]).agents[0].activity, "unknown");
  // (c) a dispatch that starts at the session's last observation does not overlap
  // the unended one; "now" is never used as its end.
  const [c] = snap([
    { ts: 1, session: "s", event: "agent_start", id: "a" },
    { ts: 3, session: "s", event: "prompt" },
    { ts: 5, session: "s", event: "agent_start", id: "b" },
  ]);
  assert.deepEqual(c.dispatches.map((d) => d.parallel), [false, false]);
  const [overlap] = snap([
    { ts: 1, session: "s", event: "agent_start", id: "a" },
    { ts: 2, session: "s", event: "agent_start", id: "b" },
    { ts: 4, session: "s", event: "agent_end", id: "b" },
  ]);
  assert.deepEqual(overlap.dispatches.map((d) => d.parallel), [true, true]);
});

test("sessions expose lastObservedAt, which the dashboard uses to pick its default session", () => {
  const sessions = executionSnapshot([
    { ts: 1, session: "old", event: "prompt" },
    { ts: 2, session: "new", event: "prompt" },
    { ts: 9, session: "old", event: "prompt" },
  ], 1).sessions;
  assert.deepEqual(sessions.map((s) => [s.sessionId, s.lastObservedAt]), [["old", 9], ["new", 2]]);
});

const { RECENT_ACTIVITY_WINDOW_MS } = createRequire(import.meta.url)(fileURLToPath(new URL("../dashboard/execution-model.js", import.meta.url)));
const NOW = 10_000_000;
const recent = (events, limit) => executionSnapshot(events, limit, NOW).recentActivity;

test("recent activity: inside, exactly at, and outside the window; outside stays in sessions[]", () => {
  const W = RECENT_ACTIVITY_WINDOW_MS;
  assert.equal(W, 15 * 60 * 1000);
  const snap = executionSnapshot([
    { ts: NOW - 1000, session: "in", event: "prompt" },
    { ts: NOW - W, session: "edge", event: "prompt" },
    { ts: NOW - W - 1, session: "out", event: "prompt" },
  ], undefined, NOW);
  assert.equal(snap.generatedAt, NOW);
  assert.equal(snap.recentActivity.windowMs, W);
  assert.deepEqual(snap.recentActivity.sessions.map((s) => s.sessionId), ["in", "edge"]);
  assert.deepEqual(snap.sessions.map((s) => s.sessionId).sort(), ["edge", "in", "out"]);
  const entry = snap.recentActivity.sessions[0];
  assert.deepEqual([entry.lastObservedAt, entry.lastObservedType, entry.projectId, entry.branch], [NOW - 1000, "prompt", null, null]);
});

test("recent activity: unended dispatch with no later activity is unended, not working", () => {
  const [s] = recent([{ ts: NOW - 5000, session: "s", event: "agent_start", id: "d1", agent: "bob" }]).sessions;
  assert.deepEqual(s.workingAgents, []);
  assert.equal(s.unendedDispatches, 1);
});

test("recent activity: active dispatch lists its agent, or null when the type is not observed", () => {
  const [s] = recent([
    { ts: NOW - 9000, session: "s", event: "agent_start", id: "d1", agent: "bob" },
    { ts: NOW - 8000, session: "s", event: "agent_launch", id: "d2" },
    { ts: NOW - 1000, session: "s", event: "prompt" },
  ]).sessions;
  assert.deepEqual(s.workingAgents, [{ executionId: "d1", agent: "bob" }, { executionId: "d2", agent: null }]);
  assert.equal(s.unendedDispatches, 0);
});

test("recent activity: lastObservedType comes from the full list, beyond the observation cap", () => {
  const events = [];
  for (let i = 0; i < 5; i++) events.push({ ts: NOW - 10000 + i, session: "s", event: "prompt" });
  events.push({ ts: NOW - 100, session: "s", event: "agent_resume" });
  const snap = executionSnapshot(events, 2, NOW);
  assert.equal(snap.sessions[0].observations.length, 2);
  assert.equal(snap.recentActivity.sessions[0].lastObservedType, "agent_resume");
});

test("recent activity: entries are ordered by lastObservedAt descending", () => {
  const ids = recent([
    { ts: NOW - 3000, session: "a", event: "prompt" },
    { ts: NOW - 1000, session: "b", event: "prompt" },
    { ts: NOW - 2000, session: "c", event: "prompt" },
  ]).sessions.map((s) => s.sessionId);
  assert.deepEqual(ids, ["b", "c", "a"]);
});

test("snapshot keeps schemaVersion 1 and existing fields unchanged by the recentActivity addition", () => {
  const events = [
    { ts: 1000, session: "s", event: "prompt" },
    { ts: 2000, session: "s", event: "agent_start", id: "d1", agent_id: "a1", agent: "bob" },
    { ts: 3000, session: "s", event: "agent_end", id: "d1", agent_id: "a1", agent: "bob", duration_ms: 500 },
  ];
  const { recentActivity, ...rest } = executionSnapshot(events, undefined, 5000);
  assert.equal(rest.schemaVersion, 1);
  assert.deepEqual(Object.keys(rest).sort(), ["agents", "generatedAt", "observations", "schemaVersion", "sessions"]);
  assert.deepEqual(Object.keys(rest.sessions[0]).sort(), ["branch", "dispatches", "lastObservedAt", "observationCount", "observations", "omittedObservations", "projectId", "runtime", "sessionId", "telemetry", "worktreeId"]);
  assert.deepEqual(rest.agents.map((a) => [a.agentId, a.activity, a.updatedAt]), [["a1", "finished", 3000]]);
  assert.equal(rest.sessions[0].dispatches[0].executionState, "completed");
  assert.ok(recentActivity);
});

test("dashboard request validation rejects non-local hosts and cross-origin requests", () => {
  assert.equal(localHost("127.0.0.1:4317"), true);
  assert.equal(localHost("localhost:4317"), true);
  assert.equal(localHost("attacker.example"), false);
  assert.equal(localHost("127.0.0.1.attacker.example"), false);
  assert.equal(allowedRequest({ headers: { host: "127.0.0.1:4317", origin: "http://attacker.example" } }), false);
  assert.equal(allowedRequest({ headers: { host: "127.0.0.1:4317", origin: "http://127.0.0.1:4317" } }), true);
  assert.equal(allowedRequest({ headers: { host: "attacker.example" } }), false);
});

test("HTTP dashboard keeps static serving inside its build and rejects Host/Origin rebinding", async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const get = (url, headers = {}) => new Promise((resolve, reject) => {
    http.get({ hostname: "127.0.0.1", port, path: url, headers }, (res) => {
      const chunks = []; res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    }).on("error", reject);
  });
  try {
    const home = await get("/");
    assert.equal(home.status, 200);
    assert.match(home.headers["content-security-policy"], /frame-ancestors 'none'/);
    assert.equal(home.headers["x-content-type-options"], "nosniff");
    const assetPath = home.body.match(/src="([^"]+\.js)"/)?.[1];
    assert.ok(assetPath, "build references a static JavaScript asset");
    assert.equal((await get(assetPath)).status, 200);
    const unsafe = await get("/%2e%2e/serve.js");
    assert.notEqual(unsafe.status, 200);
    assert.ok(!unsafe.body.includes("createServer"));
    assert.equal((await get("/", { Host: "attacker.example" })).status, 403);
    assert.equal((await get("/", { Origin: "http://attacker.example" })).status, 403);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
const lines = (events) => events.map((e) => JSON.stringify(e));

test("context contributors aggregate per session/tool, including zero output", () => {
  const result = contextContributors(lines([
    { session: "s1", event: "tool_result", tool: "Read", chars: 100 },
    { session: "s1", event: "tool_result", tool: "Read", chars: 300 },
    { session: "s1", event: "tool_result", tool: "Bash", chars: 0 },
    { session: "s2", event: "tool_result", tool: "Glob", chars: 5 },
    { session: "s1", event: "agent_end", id: "same-id", report_chars: 999 },
    { session: "s1", event: "agent_end", id: "same-id", report_chars: 100 },
    { session: "s2", event: "agent_end", id: "same-id", report_chars: 10 },
  ]));
  assert.deepEqual(result.map(({ session, total_chars, contributors }) => ({ session, total_chars, contributors })), [
    { session: "s1", total_chars: 500, contributors: [
      { tool: "Read", chars: 400, calls: 2, max_chars: 300, avg_chars: 200, share: .8 },
      { tool: "Agents", chars: 100, calls: 1, max_chars: 100, avg_chars: 100, share: .2 },
      { tool: "Bash", chars: 0, calls: 1, max_chars: 0, avg_chars: 0, share: 0 },
    ] },
    { session: "s2", total_chars: 15, contributors: [
      { tool: "Agents", chars: 10, calls: 1, max_chars: 10, avg_chars: 10, share: 2 / 3 },
      { tool: "Glob", chars: 5, calls: 1, max_chars: 5, avg_chars: 5, share: 1 / 3 },
    ] },
  ]);
  // Lines without `thread` predate it and were only ever written for main.
  assert.deepEqual(result[0].threads, { main: { chars: 400, calls: 3 }, subagents: { chars: 0, calls: 0 }, unknown: { chars: 0, calls: 0 } });
  assert.equal(result[0].instrumented, false);
});

test("old events, corrupt lines and unmeasured results do not invent context", () => {
  assert.deepEqual(contextContributors(["not json", "null", ...lines([
    { event: "prompt", project: "legacy" }, { session: "s", event: "agent_stop" },
    { session: "s", event: "agent_end", tokens: { total: 9999 } },
    { session: "s", event: "tool_result", tool: "Other", chars: 99 },
    ...[null, -1, "20", 1.5, Infinity].map((chars) => ({ session: "s", event: "tool_result", tool: "Read", chars })),
    { session: "/private/path", event: "tool_result", tool: "Read", chars: 100 },
  ])]), []);
  const [empty] = contextContributors(lines([{ session: "s", event: "tool_result", tool: "Read", chars: 0 }]));
  assert.equal(empty.total_chars, 0); assert.equal(empty.contributors[0].share, 0);
  // A newer cumulative end without a measurement must not revive stale data.
  assert.deepEqual(contextContributors(lines([
    { session: "s", event: "agent_end", id: "a", report_chars: 100 },
    { session: "s", event: "agent_end", id: "a", report_chars: null },
  ])), []);
});

test("context reads both retained log files, beyond the timeline's 300 lines", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "canonkit-context-"));
  try {
    const dir = path.join(home, ".claude", "canonkit-activity");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "events.jsonl.1"), lines([
      { session: "s", event: "tool_result", tool: "Read", chars: 100 },
      { ts: 1, session: "s", event: "agent_end", id: "a", report_chars: 999 },
    ]).join("\n") + "\n");
    await writeFile(path.join(dir, "events.jsonl"), lines([
      { ts: 2, session: "s", event: "agent_end", id: "a", report_chars: 50 },
      ...Array.from({ length: 310 }, () => ({ event: "prompt", session: "s" })),
      { session: "s", event: "tool_result", tool: "PowerShell", chars: 50, output: "SENSITIVE-SYNTHETIC-CONTENT" },
    ]).join("\n") + "\n{partial");
    const r = spawnSync(process.execPath, ["-e", "process.stdout.write(JSON.stringify(require(process.argv[1]).contextContributors()))", SERVER], {
      env: { ...process.env, HOME: home, USERPROFILE: home }, encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr);
    const [s] = JSON.parse(r.stdout);
    assert.equal(s.total_chars, 200);
    assert.equal(s.contributors.find((g) => g.tool === "Agents").chars, 50);
    assert.ok(!r.stdout.includes("SENSITIVE"), "aggregation forwards no arbitrary event fields");

    // Real HTTP with the actual handler and filesystem, bound to an ephemeral
    // loopback port. No developer service, user HOME or fixed port is touched.
    const http = spawnSync(process.execPath, ["-e", `
      const { server } = require(process.argv[1]);
      server.listen(0, '127.0.0.1', async () => {
        try {
          const base = 'http://127.0.0.1:' + server.address().port;
          const context = await fetch(base + '/context.json');
          const events = await fetch(base + '/events.json');
          const dispatches = await fetch(base + '/dispatches.json');
          const execution = await fetch(base + '/execution.json');
          const page = await fetch(base + '/');
          const activity = await fetch(base + '/activity.html');
          process.stdout.write(JSON.stringify({
            context: await context.json(), events: await events.json(), dispatches: await dispatches.json(), execution: await execution.json(),
            cache: context.headers.get('cache-control'), html: (await activity.text()).includes('Context contributors'), page: await page.text(),
            pageHeaders: Object.fromEntries(page.headers.entries()),
          }));
        } catch (e) { console.error(e); process.exitCode = 1; }
        finally { server.closeAllConnections(); server.close(); }
      });`, SERVER], { env: { ...process.env, HOME: home, USERPROFILE: home }, encoding: "utf8", timeout: 15000 });
    assert.equal(http.status, 0, http.stderr);
    const served = JSON.parse(http.stdout);
    assert.deepEqual(served.context.sessions, JSON.parse(r.stdout));
    assert.equal(served.context.retained.sessions, 1);
    assert.equal(served.events.length, 300);
    assert.ok(served.events.every((e) => e.event === "prompt"), "volume does not displace legacy timeline events");
    assert.equal(served.dispatches.length, 1);
    assert.equal(served.dispatches[0].report_chars, 50);
    assert.equal(served.cache, "no-store"); assert.equal(served.html, true);
    assert.equal(served.execution.schemaVersion, 1); assert.equal(served.execution.sessions.length, 1);
    assert.match(served.page, /assets\/index\.js/);
    assert.match(served.pageHeaders["content-security-policy"], /frame-ancestors 'none'/);
    assert.match(served.pageHeaders["content-security-policy"], /script-src 'self';/);
  } finally { await rm(home, { recursive: true, force: true }); }
});

test("history still in the pre-rename log directory is read too", async () => {
  // install moves meu-time-activity to canonkit-activity; until it has, or when
  // both exist, the dashboard must not drop what the old directory holds.
  const home = await mkdtemp(path.join(os.tmpdir(), "canonkit-legacy-dash-"));
  try {
    for (const [dir, chars] of [["meu-time-activity", 70], ["canonkit-activity", 30]]) {
      await mkdir(path.join(home, ".claude", dir), { recursive: true });
      await writeFile(path.join(home, ".claude", dir, "events.jsonl"),
        JSON.stringify({ session: "s", event: "tool_result", tool: "Read", chars }) + "\n");
    }
    const r = spawnSync(process.execPath, ["-e", "process.stdout.write(JSON.stringify(require(process.argv[1]).contextContributors()))", SERVER], {
      env: { ...process.env, HOME: home, USERPROFILE: home }, encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(r.stdout)[0].total_chars, 100);
  } finally { await rm(home, { recursive: true, force: true }); }
});

test("dashboard renders contributor totals, preserves session selection and clears empty data", async () => {
  const html = await readFile(new URL("../dashboard/activity.html", import.meta.url), "utf8");
  const elements = new Map();
  const element = () => ({
    value: "", textContent: "", innerHTML: "", style: {}, children: [],
    append(child) { this.children.push(child); },
    replaceChildren() { this.children = []; this.value = ""; },
    addEventListener(name, fn) { this[name] = fn; },
  });
  const ctx = {
    document: {
      getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
      createElement: element,
    },
    fetch: async () => { throw new Error("offline fixture"); }, setInterval() {},
  };
  runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], ctx);
  const data = contextContributors(lines([
    { session: "first", event: "tool_result", tool: "Read", chars: 100 },
    { session: "second", event: "tool_result", tool: "Bash", chars: 300 },
  ]));
  ctx.fixture = data;
  runInNewContext("renderContext(fixture)", ctx);
  const select = elements.get("context-session"), table = elements.get("context-contributors");
  assert.equal(select.value, "second"); assert.match(table.innerHTML, /Bash/);
  assert.match(elements.get("context-total").textContent, /300 chars/);
  select.value = "first"; select.change();
  assert.equal(select.value, "first"); assert.match(table.innerHTML, /Read/);
  assert.match(table.innerHTML, /100\.0%/);
  runInNewContext("renderContext(fixture)", ctx);
  assert.equal(select.value, "first", "polling preserves user's selection");
  runInNewContext("renderContext([])", ctx);
  assert.equal(select.disabled, true); assert.match(table.innerHTML, /no measured results/);
  assert.equal(elements.get("context-total").textContent, "");
});

// ---- Subagent tool results ----
const tr = (session, extra) => ({ session, event: "tool_result", tool: "Read", chars: 10, ...extra });
const sub = (agent_id, extra = {}) => ({ thread: "subagent", agent_id, agent_type: "bob", ...extra });

test("subagent results join their dispatch by agent_id, foreground and background, in parallel", () => {
  const [s] = contextContributors(lines([
    { session: "s", event: "agent_start", id: "tu-bg", agent: "bob" },
    { session: "s", event: "agent_launch", id: "tu-bg", agent_id: "abg" },
    { session: "s", event: "agent_start", id: "tu-fg", agent: "quinn" },
    tr("s", { ...sub("abg"), chars: 300, tool_use_id: "t1" }),
    tr("s", { ...sub("afg", { agent_type: "quinn" }), tool: "Bash", chars: 50, tool_use_id: "t2" }),
    tr("s", { ...sub("abg"), tool: "Grep", chars: 100, tool_use_id: "t3" }),
    tr("s", { thread: "main", chars: 7, tool_use_id: "t4" }),
    { session: "s", event: "agent_end", id: "tu-fg", agent_id: "afg", agent: "quinn", tool_uses: 1, report_chars: 40 },
    { session: "s", event: "agent_end", id: "tu-bg", agent_id: "abg", agent: "bob", tool_uses: null, report_chars: 60 },
  ]));
  assert.equal(s.instrumented, true);
  assert.deepEqual(s.threads, { main: { chars: 7, calls: 1 }, subagents: { chars: 450, calls: 3 }, unknown: { chars: 0, calls: 0 } });
  // Main's context: its own tool plus the reports that came back; never subagent results.
  assert.deepEqual(s.contributors.map((g) => [g.tool, g.chars]), [["Agents", 100], ["Read", 7]]);
  assert.equal(s.total_chars, 107);
  const [bob, quinn] = s.agents;
  assert.deepEqual([bob.agent, bob.agent_id, bob.dispatch, bob.status, bob.chars, bob.calls], ["bob", "abg", "tu-bg", "measured", 400, 2]);
  assert.deepEqual(bob.contributors.map((g) => [g.tool, g.chars, g.calls, g.max_chars]), [["Read", 300, 1, 300], ["Grep", 100, 1, 100]]);
  assert.deepEqual([quinn.agent, quinn.dispatch, quinn.tool_uses, quinn.chars], ["quinn", "tu-fg", 1, 50]);
});

test("repeated hooks, resumed agents and cumulative ends never double count", () => {
  const [s] = contextContributors(lines([
    { session: "s", event: "agent_launch", id: "tu-1", agent_id: "a1" },
    tr("s", { ...sub("a1"), chars: 100, tool_use_id: "t1" }),
    tr("s", { ...sub("a1"), chars: 100, tool_use_id: "t1" }), // the same hook wired twice
    { session: "s", event: "agent_end", id: "tu-1", agent_id: "a1", agent: "bob", report_chars: 10 },
    // Resumed with SendMessage: new results, then a cumulative end for the same id.
    tr("s", { ...sub("a1"), chars: 5, tool_use_id: "t2" }),
    { session: "s", event: "agent_end", id: "tu-1", agent_id: "a1", agent: "bob", report_chars: 25 },
    // The same tool_use_id in another session is another result.
    tr("other", { ...sub("a1"), chars: 1, tool_use_id: "t1" }),
    // No tool_use_id (older runtime): nothing to dedupe on, each line counts.
    tr("s", { thread: "main", chars: 3 }), tr("s", { thread: "main", chars: 3 }),
  ]));
  assert.equal(s.agents.length, 1);
  assert.deepEqual([s.agents[0].chars, s.agents[0].calls], [105, 2]);
  assert.equal(s.contributors.find((g) => g.tool === "Agents").chars, 25);
  assert.deepEqual(s.threads.main, { chars: 6, calls: 2 });
});

test("missing or inconsistent identifiers are never guessed into an agent", () => {
  const [s] = contextContributors(lines([
    tr("s", { thread: "unknown", chars: 11 }),
    tr("s", { thread: "subagent", chars: 12 }), // no agent_id
    tr("s", { thread: "subagent", agent_id: "../x", chars: 13 }), // unsafe id
    tr("s", { thread: "future-kind", chars: 14 }),
    tr("s", { ...sub("aorphan", { agent_type: "" }), chars: 15 }), // its dispatch lines were not retained
    { session: "s", event: "agent_end", id: "tu-x", agent: "bob", report_chars: 1 }, // no agent_id
  ]));
  assert.deepEqual(s.threads.unknown, { chars: 50, calls: 4 });
  assert.deepEqual(s.agents.map((a) => [a.agent_id, a.agent, a.dispatch, a.chars]), [["aorphan", "unknown", null, 15]]);
});

test("namespaced agent types keep their own row; an end with no dispatch id still lists its agent", () => {
  const sessions = contextContributors(lines([
    tr("s", { ...sub("ap1", { agent_type: "plugin:reviewer" }), chars: 100, tool_use_id: "p1" }),
    tr("s", { ...sub("ap2", { agent_type: "other.plugin:writer" }), chars: 30, tool_use_id: "p2" }),
    tr("s", { ...sub("ap3", { agent_type: "plugin:x y" }), chars: 5, tool_use_id: "p3" }), // a space: still unsafe
    // Foreground end written without `id`: report counted, agent not dropped.
    { session: "s", event: "agent_end", agent_id: "afg", agent: "plugin:fg", tool_uses: 2, report_chars: 7 },
  ]));
  const [s] = sessions;
  assert.deepEqual(s.agents.map((a) => [a.agent_id, a.agent, a.dispatch, a.tool_uses]),
    [["ap1", "plugin:reviewer", null, null], ["ap2", "other.plugin:writer", null, null], ["ap3", "unknown", null, null], ["afg", "plugin:fg", null, 2]]);
  assert.equal(s.contributors.find((g) => g.tool === "Agents").chars, 7);
  assert.deepEqual(retainedTotals(sessions).agents.map((a) => [a.agent, a.dispatches]),
    [["plugin:reviewer", 1], ["other.plugin:writer", 1], ["unknown", 1], ["plugin:fg", 1]]);
});

test("a session spanning the upgrade counts its old main lines and its new subagent lines", () => {
  const [s] = contextContributors(lines([
    { session: "s", event: "tool_result", tool: "Read", chars: 40 }, // before `thread` existed
    tr("s", { thread: "main", chars: 2, tool_use_id: "n1" }),
    tr("s", { ...sub("a1"), chars: 9, tool_use_id: "n2" }),
  ]));
  assert.equal(s.instrumented, true);
  assert.deepEqual(s.threads.main, { chars: 42, calls: 2 });
  assert.deepEqual(s.threads.subagents, { chars: 9, calls: 1 });
});

test("sessions without subagent telemetry say so instead of reading as zero", () => {
  const sessions = contextContributors(lines([
    // Historical: dispatches and old-format main results only.
    { session: "old", event: "tool_result", tool: "Read", chars: 5 },
    { session: "old", event: "agent_end", id: "tu-1", agent_id: "a1", agent: "bob", tool_uses: 40, report_chars: 9 },
    // Dispatch-only historical session: no tool_result at all.
    { session: "bare", event: "agent_end", id: "tu-2", agent_id: "a2", agent: "virgo", tool_uses: null },
    // Instrumented: one agent used no tool, one only tools outside the measured five.
    tr("new", { thread: "main" }),
    { session: "new", event: "agent_end", id: "tu-3", agent_id: "a3", agent: "scott", tool_uses: 0 },
    { session: "new", event: "agent_end", id: "tu-4", agent_id: "a4", agent: "bob", tool_uses: 3 },
    { session: "new", event: "agent_start", id: "tu-5", agent: "gard" },
    { session: "new", event: "agent_launch", id: "tu-5", agent_id: "a5" }, // still running
    // Prompts alone are not a session worth listing.
    { session: "quiet", event: "prompt" },
  ]));
  const by = Object.fromEntries(sessions.map((s) => [s.session, s]));
  assert.deepEqual(Object.keys(by), ["old", "bare", "new"]);
  assert.equal(by.old.instrumented, false);
  assert.equal(by.old.agents[0].status, "not-instrumented");
  assert.equal(by.bare.agents[0].status, "not-instrumented");
  assert.deepEqual(Object.fromEntries(by.new.agents.map((a) => [a.agent, a.status])), { scott: "no-tool-use", bob: "unmeasured", gard: "unmeasured" });
});

test("retained totals compare main and subagents and rank agent types", () => {
  const sessions = contextContributors(lines([
    tr("s1", { thread: "main", chars: 100 }),
    tr("s1", { ...sub("a1"), chars: 1000, tool_use_id: "x1" }),
    tr("s1", { ...sub("a1"), tool: "Bash", chars: 500, tool_use_id: "x2" }),
    { session: "s1", event: "agent_end", id: "tu-1", agent_id: "a1", agent: "bob", report_chars: 10 },
    tr("s2", { ...sub("a2", { agent_type: "quinn" }), tool: "Grep", chars: 200 }),
    tr("s2", { ...sub("a3"), chars: 2000, tool_use_id: "y" }),
    tr("s2", { thread: "unknown", chars: 1 }),
    { session: "s3", event: "agent_end", id: "tu-9", agent_id: "a9", agent: "bob", tool_uses: 4 },
  ]));
  const r = retainedTotals(sessions);
  assert.deepEqual([r.sessions, r.instrumented_sessions], [3, 2]);
  assert.deepEqual(r.main, { chars: 100, calls: 1, contributors: [{ tool: "Read", chars: 100, calls: 1, max_chars: 100, avg_chars: 100, share: 1 }] });
  assert.deepEqual(r.subagents, { chars: 3700, calls: 4 });
  assert.deepEqual(r.unknown, { chars: 1, calls: 1 });
  const bob = r.agents[0];
  assert.deepEqual([bob.agent, bob.dispatches, bob.measured_dispatches, bob.chars, bob.calls], ["bob", 3, 2, 3500, 3]);
  assert.deepEqual(bob.contributors.map((g) => [g.tool, g.chars, g.max_chars]), [["Read", 3000, 2000], ["Bash", 500, 500]]);
  assert.equal(r.agents[1].agent, "quinn");
});

test("tool results are read from both logs: 1.1.5 history in events.jsonl, new lines in tool-results.jsonl", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "canonkit-split-"));
  try {
    const dir = path.join(home, ".claude", "canonkit-activity");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "events.jsonl"), lines([
      tr("s", { thread: "main", chars: 100, tool_use_id: "same" }),
      tr("s", { thread: "main", chars: 1 }),
    ]).join("\n") + "\n");
    await writeFile(path.join(dir, "tool-results.jsonl.1"), lines([tr("s", { thread: "main", chars: 2 })]).join("\n") + "\n");
    await writeFile(path.join(dir, "tool-results.jsonl"), lines([
      tr("s", { thread: "main", chars: 100, tool_use_id: "same" }), // the same result: counted once
      tr("s", { thread: "main", chars: 4 }),
    ]).join("\n") + "\n");
    const r = spawnSync(process.execPath, ["-e", "process.stdout.write(JSON.stringify(require(process.argv[1]).contextContributors()))", SERVER], {
      env: { ...process.env, HOME: home, USERPROFILE: home }, encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout)[0].threads.main, { chars: 107, calls: 4 });
  } finally { await rm(home, { recursive: true, force: true }); }
});

test("real hook events, across a rotation, reach the dashboard joined and content-free", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "canonkit-e2e-"));
  try {
    const dir = path.join(home, ".claude", "canonkit-activity");
    await mkdir(dir, { recursive: true });
    // Over the 2 MB cap: the next hook write rotates it to events.jsonl.1.
    await writeFile(path.join(dir, "events.jsonl"), lines([
      { session: "S", event: "agent_start", id: "tu-1", agent: "bob" },
      tr("S", { thread: "main", chars: 4 }),
    ]).join("\n") + "\n" + JSON.stringify({ session: "pad", event: "prompt", pad: "x".repeat(2.1 * 1024 * 1024) }) + "\n");
    const SECRET = "SYNTHETIC-PRIVATE-CONTENT";
    const hook = (input) => {
      const env = { ...process.env, HOME: home, USERPROFILE: home };
      delete env.CLAUDE_PROJECT_DIR;
      const r = spawnSync(process.execPath, [HOOK], { input: JSON.stringify({ session_id: "S", cwd: home, ...input }), env, encoding: "utf8" });
      assert.equal(r.status, 0); assert.equal(r.stdout, "");
    };
    hook({ hook_event_name: "PostToolUse", tool_name: "Agent", tool_use_id: "tu-1", tool_input: { subagent_type: "bob", prompt: SECRET },
      tool_response: { status: "async_launched", agentId: "abob42", resolvedModel: "claude-sonnet-5-5" } });
    const read = { hook_event_name: "PostToolUse", tool_name: "Read", tool_use_id: "toolu_r1", agent_id: "abob42", agent_type: "bob",
      tool_input: { file_path: "/x/" + SECRET }, tool_response: { type: "text", file: { filePath: SECRET, content: SECRET + "\n" } } };
    hook(read);
    hook(read); // the same hook wired twice
    hook({ hook_event_name: "SubagentStop", agent_id: "abob42", agent_type: "bob", stop_hook_active: false, agent_transcript_path: path.join(home, "none.jsonl") });
    assert.ok((await readFile(path.join(dir, "events.jsonl.1"), "utf8")).includes('"pad"'), "rotated");
    for (const f of ["events.jsonl", "tool-results.jsonl"]) {
      assert.ok(!(await readFile(path.join(dir, f), "utf8")).includes(SECRET), `no content, path or prompt persisted in ${f}`);
    }
    const r = spawnSync(process.execPath, ["-e", "process.stdout.write(JSON.stringify(require(process.argv[1]).contextContributors()))", SERVER], {
      env: { ...process.env, HOME: home, USERPROFILE: home }, encoding: "utf8",
    });
    const s = JSON.parse(r.stdout).find((x) => x.session === "S");
    assert.deepEqual(s.threads.main, { chars: 4, calls: 1 }, "the rotated half is still read");
    assert.deepEqual(s.agents.map((a) => [a.agent, a.agent_id, a.dispatch, a.status, a.chars, a.calls]),
      [["bob", "abob42", "tu-1", "measured", SECRET.length + 1, 1]]);
  } finally { await rm(home, { recursive: true, force: true }); }
});

// ---- UI fixtures ----
function loadPage(html) {
  const elements = new Map();
  const element = () => ({
    value: "", textContent: "", innerHTML: "", style: {}, children: [],
    append(child) { this.children.push(child); },
    replaceChildren() { this.children = []; this.value = ""; },
    addEventListener(name, fn) { this[name] = fn; },
  });
  const ctx = {
    document: {
      getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
      createElement: element,
    },
    fetch: async () => { throw new Error("offline fixture"); }, setInterval() {},
  };
  runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], ctx);
  return { ctx, el: (id) => elements.get(id) };
}

test("dashboard compares main and subagents, flags insufficient data and offers the retained window", async () => {
  const { ctx, el } = loadPage(await readFile(new URL("../dashboard/activity.html", import.meta.url), "utf8"));
  const sessions = contextContributors(lines([
    { session: "old", event: "tool_result", tool: "Read", chars: 5 },
    { session: "old", event: "agent_end", id: "tu-1", agent_id: "a1", agent: "bob", tool_uses: 40 },
    tr("new", { thread: "main", chars: 70 }),
    tr("new", { ...sub("a2"), tool: "Bash", chars: 2800, tool_use_id: "q" }),
    { session: "new", event: "agent_end", id: "tu-2", agent_id: "a2", agent: "bob", tool_uses: 1 },
  ]));
  ctx.fixture = { sessions, retained: retainedTotals(sessions) };
  runInNewContext("renderContext(fixture)", ctx);
  const select = el("context-session");
  assert.deepEqual(select.children.map((o) => o.value), ["*", "old", "new"]);
  assert.match(select.children[1].textContent, /no subagent telemetry/);
  assert.equal(select.value, "new");
  assert.match(el("context-threads").innerHTML, /main thread.*70.*subagents.*2\.8k/s);
  assert.match(el("context-agents").innerHTML, /Bob.*measured.*Bash/s);
  select.value = "old"; select.change();
  assert.match(el("context-threads").innerHTML, /subagents<\/th><td class="n" colspan="3"><span class="dim">insufficient data/);
  assert.match(el("context-agents").innerHTML, /insufficient data — logged before/);
  select.value = "*"; select.change();
  assert.match(el("context-total").textContent, /Retained history: 2 sessions, 1 with subagent telemetry/);
  assert.match(el("context-agents").innerHTML, /Bob<\/th><td class="dim">2<\/td><td class="dim">1<\/td>/);
  // An older server's bare array still renders.
  ctx.legacy = sessions;
  runInNewContext("renderContext(legacy)", ctx);
  assert.equal(select.value, "new");
});

test("token tables separate input, output, cache and calls, and label the window", async () => {
  const { ctx, el } = loadPage(await readFile(new URL("../dashboard/activity.html", import.meta.url), "utf8"));
  ctx.ds = [
    { ts: 1, agent: "bob", model: "sonnet", effort: "high", report_chars: 400, duration_ms: 1000,
      tokens: { api_calls: 10, input: 1000, output: 500, cache_read: 8000, cache_creation: 1000, total: 10500 } },
    { ts: 2, agent: "bob", model: "sonnet", effort: "high", tokens: null },
  ];
  runInNewContext("renderDispatches(ds)", ctx);
  const t = el("by-agent").innerHTML;
  for (const h of ["with tokens", "Σ total", "avg input", "avg output", "avg cache read", "avg cache write", "cache read %", "avg API calls"]) assert.ok(t.includes(h), h);
  // 2 dispatches, 1 with tokens; cache read % = 8000 / (1000 + 8000 + 1000).
  assert.match(t, /<td class="n">2<\/td><td class="n">1<\/td><td class="n">10\.5k<\/td>/);
  assert.match(t, /≥500/); assert.match(t, /80\.0%/); assert.match(t, />10\.0</);
  assert.match(el("retained-n").textContent, /retained history, 2 finished/);
  assert.match(el("window-retained").textContent, /2 finished dispatches/);
  ctx.evs = [{ ts: 5, event: "prompt", project: "p" }];
  runInNewContext("render(evs)", ctx);
  assert.match(el("window-recent").textContent, /last 1 timeline lines/);
});

// Graph, selection and timeline logic is plain ESM, imported without a build.
const graphModel = () => import(new URL("../dashboard/src/graph-model.js", import.meta.url));
const twoSessions = () => executionSnapshot([
  { ts: 100, session: "sa", event: "prompt" },
  { ts: 110, session: "sa", event: "agent_start", id: "a1", agent: "bob" },
  { ts: 120, session: "sa", event: "gate", kind: "high-risk-surface", files: 1, rules: ["auth"] },
  { ts: 130, session: "sa", event: "agent_stop", agent_id: "zz" },
  { ts: 105, session: "sb", event: "agent_start", id: "b1", agent: "quinn" },
  { ts: 110, session: "sb", event: "prompt" },
  { ts: 140, session: "sb", event: "agent_end", id: "b1", duration_ms: 5 },
], undefined, 150);

test("graph model: a single session keeps its node IDs, positions and per-signal nodes", async () => {
  const { graphFor } = await graphModel();
  const snap = executionSnapshot([
    { ts: 1, session: "s1", event: "agent_start", id: "d1", agent: "bob" },
  ], undefined, 10);
  const { nodes, edges } = graphFor(snap.sessions, "observed");
  assert.deepEqual(nodes.map((n) => [n.id, n.position.x, n.position.y]), [["session:s1", 40, 32], ["dispatch:s1:d1", 360, 32]]);
  assert.deepEqual(edges.map((e) => e.id), ["session-dispatch-s1-0"]);
  assert.ok(nodes.every((n) => n.type === "studio" && n.ariaLabel));
  const withSignals = graphFor(executionSnapshot([{ ts: 1, session: "s1", event: "prompt" }, { ts: 2, session: "s1", event: "prompt" }], undefined, 10).sessions, "observed");
  assert.equal(withSignals.nodes.filter((n) => n.data.kind === "observation").length, 2, "one node per signal with one session");
  assert.deepEqual(graphFor([], "observed"), { nodes: [], edges: [] });
});

test("graph model: several sessions get unique IDs, separate lanes and no cross-session edge", async () => {
  const { graphFor } = await graphModel();
  const { sessions } = twoSessions();
  const { nodes, edges } = graphFor(sessions, "observed");
  const ids = nodes.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length, "node IDs are unique");
  assert.equal(new Set(edges.map((e) => e.id)).size, edges.length, "edge IDs are unique");
  const sessionOf = (id) => id.split(":")[1];
  for (const e of edges) assert.equal(sessionOf(e.source), sessionOf(e.target), "no edge joins two sessions");
  const lanes = nodes.filter((n) => n.type === "lane");
  assert.equal(lanes.length, 2);
  assert.ok(lanes.every((l) => l.selectable === false && l.draggable === false && l.focusable === false));
  lanes.sort((a, b) => a.position.x - b.position.x);
  assert.deepEqual(lanes.map((l) => l.position.y), [0, 0], "lanes share one row");
  assert.ok(lanes[0].position.x + lanes[0].style.width + 40 <= lanes[1].position.x, "lanes do not overlap horizontally and keep the gap");
  assert.deepEqual(lanes.map((l) => l.id), ["lane:sa", "lane:sb"], "lanes keep the order of the sessions given");
  for (const lane of lanes) {
    const own = nodes.filter((n) => n.type === "studio" && sessionOf(n.id) === sessionOf(lane.id));
    assert.ok(own.every((n) => n.position.y >= lane.position.y && n.position.y + 130 <= lane.position.y + lane.style.height), "nodes stay in their lane vertically");
    assert.ok(own.every((n) => n.position.x >= lane.position.x && n.position.x + 280 <= lane.position.x + lane.style.width), "nodes stay in their lane horizontally");
  }
  const summaries = nodes.filter((n) => n.id.startsWith("signals:"));
  assert.deepEqual(summaries.map((n) => n.id).sort(), ["signals:sa", "signals:sb"]);
  assert.match(summaries.find((n) => n.id === "signals:sa").data.subtitle, /^2 uncorrelated/);
  assert.ok(!nodes.some((n) => n.id.startsWith("observation:")), "no per-signal nodes with several sessions");
  assert.equal(graphFor(sessions.slice(0, 1), "observed").nodes.some((n) => n.id.startsWith("signals:") || n.type === "lane"), false);
});

test("graph model: new nodes stay in their lane when a neighbouring lane grows during polling", async () => {
  const { graphFor, preserveGraphNodes } = await graphModel();
  const initial = executionSnapshot([
    { ts: 2, session: "sa", event: "agent_start", id: "a1", agent: "bob" },
    { ts: 1, session: "sb", event: "agent_start", id: "b1", agent: "quinn" },
  ], undefined, 10);
  const byLane = (sessions) => [...sessions].sort((a, b) => ["sa", "sb"].indexOf(a.sessionId) - ["sa", "sb"].indexOf(b.sessionId));
  const previous = graphFor(byLane(initial.sessions), "observed");
  const b1 = previous.nodes.find((n) => n.id === "dispatch:sb:b1");
  const movedPosition = { x: b1.position.x - 40, y: b1.position.y + 40 };
  const keptNodes = previous.nodes.map((n) => n.id === "dispatch:sb:b1"
    ? { ...n, position: movedPosition, selected: true }
    : n);

  // The first lane gains dispatches and grows taller. Polling must keep the
  // second lane where it is and anchor its new node inside it.
  const next = executionSnapshot([
    { ts: 1, session: "sa", event: "agent_start", id: "a1", agent: "bob" },
    { ts: 3, session: "sa", event: "agent_start", id: "a2", agent: "bob" },
    { ts: 4, session: "sa", event: "agent_start", id: "a3", agent: "bob" },
    { ts: 5, session: "sa", event: "agent_start", id: "a4", agent: "bob" },
    { ts: 2, session: "sb", event: "agent_start", id: "b1", agent: "quinn" },
    { ts: 6, session: "sb", event: "agent_start", id: "b2", agent: "quinn" },
  ], undefined, 10);
  const currentGraph = graphFor(byLane(next.sessions), "observed");
  const nodes = preserveGraphNodes(currentGraph.nodes, keptNodes);
  const firstLane = nodes.find((n) => n.id === "lane:sa");
  const secondLane = nodes.find((n) => n.id === "lane:sb");
  const newNode = nodes.find((n) => n.id === "dispatch:sb:b2");
  assert.ok(firstLane && secondLane && newNode);
  assert.ok(firstLane.position.x + firstLane.style.width + 40 <= secondLane.position.x,
    "lanes do not overlap horizontally when one grows taller");
  assert.ok(firstLane.style.height > previous.nodes.find((n) => n.id === "lane:sa").style.height, "the lane that gained nodes grew downward");
  for (const id of ["dispatch:sa:a2", "dispatch:sa:a3", "dispatch:sa:a4"]) {
    const upperNode = nodes.find((n) => n.id === id);
    assert.ok(upperNode.position.y >= firstLane.position.y && upperNode.position.y + 130 <= firstLane.position.y + firstLane.style.height,
      `${id} remains within its own lane vertically`);
    assert.ok(upperNode.position.x >= firstLane.position.x && upperNode.position.x + 280 <= firstLane.position.x + firstLane.style.width, `${id} remains within lane width`);
  }
  assert.ok(newNode.position.y >= secondLane.position.y, "new node starts at or below its own lane top");
  assert.ok(newNode.position.y + 130 <= secondLane.position.y + secondLane.style.height,
    "new node remains within its own lane, which grew to hold it");
  assert.ok(newNode.position.x >= secondLane.position.x && newNode.position.x + 280 <= secondLane.position.x + secondLane.style.width,
    "new node remains within the lane width");
  const movedNode = nodes.find((n) => n.id === "dispatch:sb:b1");
  assert.ok(Math.abs(newNode.position.x - movedNode.position.x) >= 300 || Math.abs(newNode.position.y - movedNode.position.y) >= 140,
    "the new node does not overlap the moved node in its own lane");
  assert.deepEqual(secondLane.position, previous.nodes.find((n) => n.id === "lane:sb").position, "polling keeps the lane position");
  assert.deepEqual(nodes.find((n) => n.id === "dispatch:sb:b1").position, movedPosition, "polling keeps a moved node in place");
  assert.equal(nodes.find((n) => n.id === "dispatch:sb:b1").selected, true, "polling keeps the selected node");
});

test("graph model: a new lane is placed after kept lanes when the upper lane was removed", async () => {
  const { graphFor, preserveGraphNodes } = await graphModel();
  const snapshot = executionSnapshot([
    { ts: 3, session: "a", event: "agent_start", id: "a1", agent: "bob" },
    { ts: 2, session: "b", event: "agent_start", id: "b1", agent: "quinn" },
    { ts: 1, session: "c", event: "agent_start", id: "c1", agent: "pixie" },
  ], undefined, 10);
  const byIds = (ids) => ids.map((id) => snapshot.sessions.find((s) => s.sessionId === id));
  const previous = graphFor(byIds(["a", "b"]), "observed");
  const afterSelectionChange = graphFor(byIds(["b", "c"]), "observed");
  const nodes = preserveGraphNodes(afterSelectionChange.nodes, previous.nodes);
  const keptLane = nodes.find((n) => n.id === "lane:b");
  const addedLane = nodes.find((n) => n.id === "lane:c");
  const addedNode = nodes.find((n) => n.id === "dispatch:c:c1");
  assert.ok(keptLane && addedLane && addedNode);
  assert.ok(keptLane.position.x + keptLane.style.width + 40 <= addedLane.position.x,
    "the appended lane starts after the kept lane and its gap");
  assert.equal(keptLane.position.x, previous.nodes.find((n) => n.id === "lane:b").position.x, "the kept lane does not move left when the first lane is removed");
  assert.ok(addedNode.position.y >= addedLane.position.y && addedNode.position.y + 130 <= addedLane.position.y + addedLane.style.height,
    "new lane content remains inside the new background vertically");
  assert.ok(addedNode.position.x >= addedLane.position.x && addedNode.position.x + 280 <= addedLane.position.x + addedLane.style.width,
    "new lane content remains inside the new background horizontally");
});

test("graph model: a session's kept nodes move into its lane when the single-session graph gains lanes again", async () => {
  const { graphFor, preserveGraphNodes } = await graphModel();
  const snapshot = executionSnapshot([
    { ts: 3, session: "a", event: "agent_start", id: "a1", agent: "bob" },
    { ts: 2, session: "b", event: "agent_start", id: "b1", agent: "quinn" },
    { ts: 4, session: "b", event: "agent_start", id: "b2", agent: "pixie" },
  ], undefined, 10);
  const byIds = (ids) => ids.map((id) => snapshot.sessions.find((s) => s.sessionId === id));
  const both = preserveGraphNodes(graphFor(byIds(["a", "b"]), "observed").nodes, []);
  const alone = preserveGraphNodes(graphFor(byIds(["b"]), "observed").nodes, both);
  assert.ok(!alone.some((n) => n.type === "lane"), "one session has no lane");
  const again = preserveGraphNodes(graphFor(byIds(["b", "a"]), "observed").nodes, alone);
  const sessionOf = (id) => id.split(":")[1];
  const laneB = again.find((n) => n.id === "lane:b");
  const laneA = again.find((n) => n.id === "lane:a");
  assert.ok(laneB.position.x + laneB.style.width + 40 <= laneA.position.x, "lanes do not overlap");
  for (const lane of [laneA, laneB]) {
    for (const n of again.filter((n) => n.type === "studio" && sessionOf(n.id) === sessionOf(lane.id))) {
      assert.ok(n.position.x >= lane.position.x && n.position.x + 280 <= lane.position.x + lane.style.width, `${n.id} stays inside its lane horizontally`);
      assert.ok(n.position.y >= lane.position.y && n.position.y + 130 <= lane.position.y + lane.style.height, `${n.id} stays inside its lane vertically`);
    }
  }
  const pos = (nodes, id) => nodes.find((n) => n.id === id).position;
  const before = [pos(alone, "dispatch:b:b1"), pos(alone, "dispatch:b:b2")];
  const after = [pos(again, "dispatch:b:b1"), pos(again, "dispatch:b:b2")];
  assert.deepEqual({ x: after[1].x - after[0].x, y: after[1].y - after[0].y }, { x: before[1].x - before[0].x, y: before[1].y - before[0].y },
    "the session's nodes keep their arrangement as they move");
});

test("graph model: placement terminates when a lane has less than one node of horizontal room", async () => {
  const { preserveGraphNodes } = await graphModel();
  const lane = { id: "lane:s", type: "lane", position: { x: 0, y: 0 }, style: { width: 200, height: 400 }, data: { title: "Session s" } };
  const session = { id: "session:s", type: "studio", position: { x: 40, y: 32 }, data: { title: "Session s" } };
  const keptDispatch = { id: "dispatch:s:d1", type: "studio", position: { x: 360, y: 32 }, data: { title: "Dispatch 1" } };
  const newDispatch = { id: "dispatch:s:d2", type: "studio", position: { x: 360, y: 177 }, data: { title: "Dispatch 2" } };
  const nodes = preserveGraphNodes([lane, session, keptDispatch, newDispatch], [lane, session, keptDispatch]);
  const resultLane = nodes.find((n) => n.id === "lane:s");
  const resultNode = nodes.find((n) => n.id === "dispatch:s:d2");
  assert.ok(resultNode);
  assert.ok(resultNode.position.x >= resultLane.position.x && resultNode.position.x + 280 <= resultLane.position.x + resultLane.style.width,
    "the finite fallback widens a too-narrow lane to contain the new node");
  assert.ok(resultNode.position.y + 130 <= resultLane.position.y + resultLane.style.height, "and the lane is tall enough for it");
});

test("graph model: selection transitions", async () => {
  const { shownSessionIds, toggleSelection, addSelection, showAllRecent, pruneSelection, recentSelection, stableLaneOrder, panelEntries } = await graphModel();
  const snap = executionSnapshot([
    { ts: 1000, session: "old", event: "prompt" }, { ts: 2000000, session: "sa", event: "prompt" }, { ts: 2000100, session: "sb", event: "prompt" },
  ], undefined, 2000200);
  const { sessions, recentActivity: recent } = snap;
  const derived = shownSessionIds(recentSelection(), sessions, recent);
  assert.deepEqual(derived, ["sb", "sa"], "recent mode follows the recent sessions, newest first");
  const none = { windowMs: recent.windowMs, sessions: [] };
  assert.deepEqual(shownSessionIds(recentSelection(), sessions, none), ["sb"], "falls back to the latest session");
  assert.deepEqual(shownSessionIds(recentSelection(), [], none), []);
  const removed = toggleSelection(recentSelection(), "sa", derived);
  assert.deepEqual(removed, { mode: "manual", ids: ["sb"] });
  assert.deepEqual(shownSessionIds(removed, sessions, recent), ["sb"], "manual no longer follows recent activity");
  assert.deepEqual(toggleSelection(removed, "sb", derived), { mode: "manual", ids: [] });
  assert.deepEqual(shownSessionIds({ mode: "manual", ids: [] }, sessions, recent), [], "empty selection does not fall back");
  assert.deepEqual(addSelection(removed, "old", derived).ids, ["sb", "old"]);
  assert.deepEqual(addSelection(recentSelection(), "old", derived).ids, ["sb", "sa", "old"]);
  assert.deepEqual(showAllRecent(), { mode: "recent" });
  assert.equal(pruneSelection(removed, sessions), removed, "an unchanged selection keeps its identity");
  assert.deepEqual(pruneSelection({ mode: "manual", ids: ["sb", "gone"] }, sessions), { mode: "manual", ids: ["sb"] });
  assert.equal(pruneSelection(recentSelection(), []).mode, "recent");
  assert.deepEqual(stableLaneOrder(["sa", "sb"], ["sb", "sc", "sa"]), ["sa", "sb", "sc"]);
  const entries = panelEntries(sessions, recent, ["sb", "old"]);
  assert.deepEqual(entries.map((e) => [e.session.sessionId, e.outsideWindow, e.shown]), [["sb", false, true], ["sa", false, false], ["old", true, true]]);
});

test("graph model: timeline merge order and node resolution across sessions", async () => {
  const { mergedTimeline, nodeIdForEvent, resolveNode, sessionIdOfNode, timelineAgents } = await graphModel();
  const { sessions } = twoSessions();
  const rows = mergedTimeline(sessions);
  assert.deepEqual(rows.map((r) => [r.event.timestamp, r.sessionId]), [[100, "sa"], [105, "sb"], [110, "sa"], [110, "sb"], [120, "sa"], [130, "sa"], [140, "sb"]]);
  assert.deepEqual(mergedTimeline(sessions, { type: "prompt" }).map((r) => r.sessionId), ["sa", "sb"]);
  assert.deepEqual(timelineAgents(sessions).sort(), ["bob", "quinn"]);
  const sa = sessions.find((s) => s.sessionId === "sa");
  const sb = sessions.find((s) => s.sessionId === "sb");
  assert.equal(nodeIdForEvent(sa, 0, true), "signals:sa", "a prompt maps to its session's summary node");
  assert.match(nodeIdForEvent(sa, 0, false), /^observation:sa:100:prompt:0$/);
  assert.equal(nodeIdForEvent(sa, 1, true), "dispatch:sa:a1");
  assert.equal(nodeIdForEvent(sa, 2, true), "gate:sa:120:0");
  assert.equal(nodeIdForEvent(sb, 2, true), "dispatch:sb:b1");
  assert.equal(sessionIdOfNode("dispatch:sb:b1"), "sb");
  assert.equal(sessionIdOfNode("reference:risk"), null);
  const dispatch = resolveNode(sessions, "dispatch:sb:b1");
  assert.equal(dispatch.session.sessionId, "sb"); assert.equal(dispatch.item.executionId, "b1");
  assert.equal(resolveNode(sessions, "dispatch:sa:b1").item, null, "a dispatch is looked up only in its own session");
  assert.equal(resolveNode(sessions, "gate:sa:120:0").item.type, "gate");
  assert.equal(resolveNode(sessions, "signals:sb").item.type, "prompt");
  assert.equal(resolveNode(sessions, "reference:risk").session, undefined);
});

test("graph model: an active dispatch edge is statically dashed by class, never React Flow's animated edge", async () => {
  const { graphFor } = await graphModel();
  const { sessions } = twoSessions();
  const { edges } = graphFor(sessions, "observed");
  assert.ok(edges.every((e) => !("animated" in e)), "no edge uses the continuous dash animation");
  const active = sessions.flatMap((s) => s.dispatches.filter((d) => d.executionState === "active").map((d) => `${s.sessionId}`));
  const classed = edges.filter((e) => e.className === "edge-active");
  assert.ok(active.length > 0, "the fixture has an active dispatch");
  assert.equal(classed.length, active.length, "exactly the active dispatches get the class");
  const done = graphFor(executionSnapshot([{ ts: 1, session: "s1", event: "agent_start", id: "d1", agent: "bob" }, { ts: 2, session: "s1", event: "agent_end", id: "d1" }], undefined, 10).sessions, "observed");
  assert.ok(done.edges.every((e) => !e.className), "an ended dispatch edge has no active class");
  assert.match(await readFile(new URL("../dashboard/src/style.css", import.meta.url), "utf8"), /\.edge-active[^{]*\{[^}]*stroke-dasharray/);
});

test("graph model: an edge that loses its active class on a later poll is not reused", async () => {
  const { graphFor, reuseUnchanged } = await graphModel();
  const start = { ts: 110, session: "s1", event: "agent_start", id: "d1", agent: "bob" };
  const later = { ts: 120, session: "s1", event: "prompt" }; // an unended dispatch is active only with later activity
  const running = graphFor(executionSnapshot([start, later], undefined, 150).sessions, "observed").edges;
  assert.equal(running.find((e) => e.target === "dispatch:s1:d1").className, "edge-active");
  const live = running.map((e) => ({ ...e, selected: false })); // what React Flow adds
  const ended = graphFor(executionSnapshot([start, later, { ts: 140, session: "s1", event: "agent_end", id: "d1" }], undefined, 150).sessions, "observed").edges;
  const next = reuseUnchanged(ended, live);
  assert.notEqual(next, live);
  assert.equal(next.find((e) => e.target === "dispatch:s1:d1").className, undefined, "the ended dispatch's edge drops the active class");
  assert.equal(reuseUnchanged(running, live), live, "a field React Flow added does not count as a change");
});

test("graph model: unchanged polls keep identities, so nothing re-renders", async () => {
  const { graphFor, preserveGraphNodes, reuseUnchanged, selectOnly, stabilizeSnapshot } = await graphModel();
  const a = { generatedAt: 1, sessions: [{ id: "x", list: [1, 2] }], agents: [] };
  const same = stabilizeSnapshot(a, { generatedAt: 2, sessions: [{ id: "x", list: [1, 2] }], agents: [] });
  assert.equal(same.generatedAt, 2);
  assert.equal(same.sessions, a.sessions); assert.equal(same.agents, a.agents);
  const changed = stabilizeSnapshot(a, { generatedAt: 3, sessions: [{ id: "x", list: [1, 3] }], agents: [] });
  assert.notEqual(changed.sessions, a.sessions); assert.equal(changed.agents, a.agents);

  const { sessions } = twoSessions();
  const first = preserveGraphNodes(graphFor(sessions, "observed").nodes, []);
  const live = first.map((n) => ({ ...n, measured: { width: 245, height: 96 } })); // what React Flow adds
  const again = reuseUnchanged(preserveGraphNodes(graphFor(sessions, "observed").nodes, live), live);
  assert.equal(again, live, "an identical rebuild returns the current array");
  const edges = graphFor(sessions, "observed").edges;
  assert.equal(reuseUnchanged(graphFor(sessions, "observed").edges, edges), edges);

  const dispatch = live.find((n) => n.id.startsWith("dispatch:sa"));
  const edited = live.map((n) => n === dispatch ? { ...n, data: { ...n.data, state: "completed" } } : n);
  const next = reuseUnchanged(preserveGraphNodes(graphFor(sessions, "observed").nodes, edited), edited);
  assert.notEqual(next, edited, "a changed node produces a new array");
  assert.equal(next.filter((n, i) => n !== edited[i]).length, 1, "only the changed node is a new object");

  const picked = selectOnly(live, dispatch.id);
  assert.equal(picked.filter((n, i) => n !== live[i]).length, 1, "selecting changes only the newly selected node");
  assert.equal(selectOnly(picked, dispatch.id), picked, "re-selecting the same node is a no-op");
  const moved = selectOnly(picked, "session:sb");
  assert.equal(moved.filter((n, i) => n !== picked[i]).length, 2, "moving the selection touches the old and the new node");
});

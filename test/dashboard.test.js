import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SERVER = fileURLToPath(new URL("../dashboard/serve.js", import.meta.url));
const { contextContributors, retainedTotals } = createRequire(import.meta.url)(SERVER);
const HOOK = fileURLToPath(new URL("../hooks/canonkit-hook.js", import.meta.url));
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
      { session: "s", event: "agent_end", id: "a", report_chars: 999 },
    ]).join("\n") + "\n");
    await writeFile(path.join(dir, "events.jsonl"), lines([
      { session: "s", event: "agent_end", id: "a", report_chars: 50 },
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
          const page = await fetch(base + '/');
          process.stdout.write(JSON.stringify({
            context: await context.json(), events: await events.json(), dispatches: await dispatches.json(),
            cache: context.headers.get('cache-control'), html: (await page.text()).includes('Context contributors'),
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
  const html = await readFile(new URL("../dashboard/index.html", import.meta.url), "utf8");
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
    assert.ok(!(await readFile(path.join(dir, "events.jsonl"), "utf8")).includes(SECRET), "no content, path or prompt persisted");
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
  const { ctx, el } = loadPage(await readFile(new URL("../dashboard/index.html", import.meta.url), "utf8"));
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
  const { ctx, el } = loadPage(await readFile(new URL("../dashboard/index.html", import.meta.url), "utf8"));
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

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
const { contextContributors } = createRequire(import.meta.url)(SERVER);
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
  assert.deepEqual(result, [
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
    const dir = path.join(home, ".claude", "meu-time-activity");
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
    assert.deepEqual(served.context, JSON.parse(r.stdout));
    assert.equal(served.events.length, 300);
    assert.ok(served.events.every((e) => e.event === "prompt"), "volume does not displace legacy timeline events");
    assert.equal(served.dispatches.length, 1);
    assert.equal(served.dispatches[0].report_chars, 50);
    assert.equal(served.cache, "no-store"); assert.equal(served.html, true);
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

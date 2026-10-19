/**
 * Contract tests for hooks/meu-time-hook.js.
 *
 * The hook is the mechanical half of the routing block's `[ENFORCED]` rules, and
 * a regression in it is silent by construction: it fails open, so a broken gate
 * looks exactly like a clean session. Nothing else in this repo would notice.
 *
 * Real process, real stdin, throwaway HOME — same reasoning as cli.test.js: the
 * failure this hook can actually cause is deciding "allow" on something the rules
 * say to stop, and a mocked runner proves nothing about that.
 *
 * The secret fixtures are concatenated on purpose. Spelled out in full, the hook
 * denies the write of its own test file — which is the gate working.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOOK = path.join(REPO, "hooks", "meu-time-hook.js");

const FAKE_AWS_KEY = "AKIA" + "ABCDEFGHIJKLMNOP";
const FAKE_PEM = "-----BEGIN RSA PRIVATE " + "KEY-----";

let HOME;

before(async () => {
  HOME = await mkdtemp(path.join(os.tmpdir(), "meutime-hook-"));
  await mkdir(path.join(HOME, ".claude", "meu-time-activity"), { recursive: true });
});
after(async () => {
  await rm(HOME, { recursive: true, force: true });
});

/** Runs the hook and reduces its stdout to the decision it expresses. */
function decide(input) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(input),
    encoding: "utf8",
    env: { ...process.env, HOME, USERPROFILE: HOME },
  });
  const out = (r.stdout || "").trim();
  if (!out) return "allow";
  const j = JSON.parse(out);
  return j.decision || j.hookSpecificOutput?.permissionDecision || "allow";
}

/** Runs the hook and returns the raw process result. */
function runHook(input) {
  return spawnSync(process.execPath, [HOOK], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    encoding: "utf8",
    env: { ...process.env, HOME, USERPROFILE: HOME },
  });
}

const logged = async (session) =>
  (await readFile(path.join(HOME, ".claude", "meu-time-activity", "events.jsonl"), "utf8"))
    .trim().split("\n").map((l) => JSON.parse(l)).filter((e) => e.session === session);

const pre = (tool_name, tool_input, session_id = "TEST") =>
  ({ hook_event_name: "PreToolUse", tool_name, tool_input, session_id });

describe("every shell is a shell", () => {
  // The side door this closed: on Windows the harness's primary shell tool is
  // PowerShell, so a gate wired only to Bash gates nothing that matters there.
  test("PowerShell git commit is gated", () => {
    assert.equal(decide(pre("PowerShell", { command: "git commit -m wip" })), "ask");
  });
  test("Bash git push is gated", () => {
    assert.equal(decide(pre("Bash", { command: "git push origin main" })), "ask");
  });
  test("a PowerShell write to a performance budget is gated", () => {
    assert.equal(decide(pre("PowerShell", { command: "Set-Content -Path lighthouserc.json -Value $x" })), "ask");
  });
  test("a Bash heredoc to a HIGH-risk path is gated", () => {
    assert.equal(decide(pre("Bash", { command: "cat > src/lib/authClient.ts <<EOF\nx\nEOF" })), "ask");
  });
  test("a shell command writing a cloud key is denied", () => {
    assert.equal(decide(pre("Bash", { command: `echo ${FAKE_AWS_KEY} > .env` })), "deny");
  });
});

describe("staying quiet on ordinary work", () => {
  // A gate that cries wolf is a gate people click through, so the false-positive
  // cases are part of the contract, not an afterthought.
  test("a search redirected to a temp file is not a write to a risky path", () => {
    assert.equal(decide(pre("Bash", { command: "grep -r auth src/ > /tmp/out.txt" })), "allow");
  });
  test("tokenizer.ts is not an auth file", () => {
    assert.equal(decide(pre("Edit", { file_path: "src/utils/tokenizer.ts", new_string: "x" })), "allow");
  });
  // `tokens` in the context-size sense (and design tokens, lexer tokens) is not a
  // credential: it fired the Stop gate three times in a session about context size.
  test("tokens in the context-size / design-token sense are not auth surfaces", () => {
    for (const fp of [
      "src/styles/tokens.css",
      "design/design-tokens.json",
      "docs/context-tokens.md",
      "hooks/token-count.js",
      "src/lexer/tokens.ts",
    ]) {
      assert.equal(decide(pre("Edit", { file_path: fp, new_string: "x" })), "allow", fp);
    }
  });
  test("a shell write to a context-tokens note is not gated", () => {
    assert.equal(decide(pre("Bash", { command: "echo 120k > notes/context-tokens.md" })), "allow");
  });
  test("real auth-token surfaces are still gated", () => {
    for (const fp of [
      "src/auth/tokens.ts",
      "src/lib/refresh_token.ts",
      "src/lib/access-token.ts",
      "src/lib/token-store.ts",
      "server/token_service.py",
      "src/lib/api-token.ts",
      "src/lib/jwt_token.ts",
      "config/github_token",
      "config/npm-token",
      "secrets/pat-tokens.json",
      ".npmrc",
      "home/.netrc",
    ]) {
      assert.equal(decide(pre("Edit", { file_path: fp, new_string: "x" })), "ask", fp);
    }
  });
  test("a shell write to a vendor token file is gated", () => {
    assert.equal(decide(pre("Bash", { command: "echo abc > npm-token" })), "ask");
  });
  test("a credential in a test fixture is not a leak", () => {
    assert.equal(
      decide(pre("Edit", { file_path: "src/data/pals.test.ts", new_string: 'const password = "hunter2000"' })),
      "allow",
    );
  });
  test("reading is never gated", () => {
    assert.equal(decide(pre("Read", { file_path: "src/lib/auth/session.ts" })), "allow");
  });
  test("dispatching a subagent is always allowed", () => {
    assert.equal(decide(pre("Agent", { subagent_type: "gard", description: "review" })), "allow");
  });
});

describe("file-editing tools", () => {
  test("session/ as a path segment is HIGH risk", () => {
    assert.equal(decide(pre("Edit", { file_path: "src/lib/session/store.ts", new_string: "x" })), "ask");
  });
  test("NotebookEdit is covered like Edit", () => {
    assert.equal(decide(pre("NotebookEdit", { notebook_path: "nb/auth.ipynb", new_source: "x" })), "ask");
  });
  test("a private key in a Write is denied", () => {
    assert.equal(decide(pre("Write", { file_path: "src/config.ts", content: FAKE_PEM })), "deny");
  });
  test("lighthouserc.json is Perry-gated", () => {
    assert.equal(decide(pre("Edit", { file_path: "lighthouserc.json", new_string: "{}" })), "ask");
  });
});

describe("dispatch metrics", () => {
  // Payload shapes are the ones captured from Claude Code 2.1.300. Prompt and
  // result carry markers so the test can prove neither reaches the log.
  const PROMPT = "PROMPT-TEXT-MUST-NOT-BE-LOGGED";
  const RESULT = "RESULT-TEXT-MUST-NOT-BE-LOGGED";
  const ti = { subagent_type: "gard", description: "review auth", prompt: PROMPT, model: "haiku", effort: "low" };

  // A subagent transcript as the runtime writes it: one assistant entry per API
  // call, each with that call's usage; the same message split over two entries
  // must count once. The usage in PostToolUse is deliberately different (it is
  // the last call only) so the test fails if the hook reads that instead.
  async function transcript(dir, agentId) {
    const call = (id, input, output, cr, cc) => JSON.stringify({
      type: "assistant", requestId: `req_${id}`,
      message: { id, model: "claude-haiku-5-5", content: [{ type: "text", text: RESULT }],
        usage: { input_tokens: input, output_tokens: output, cache_read_input_tokens: cr, cache_creation_input_tokens: cc } },
    });
    const lines = [
      JSON.stringify({ type: "user", message: { role: "user", content: PROMPT } }),
      call("msg_1", 3, 10, 1000, 500),
      call("msg_1", 3, 10, 1000, 500),
      call("msg_2", 2, 20, 2000, 0),
      "not json",
    ];
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `agent-${agentId}.jsonl`), lines.join("\n") + "\n");
  }

  test("a foreground dispatch logs agent_start with model and effort, and a linked agent_end with numbers", async () => {
    const S = "METRICS-FG";
    const parent = path.join(HOME, "projects", "p", `${S}.jsonl`);
    await transcript(path.join(HOME, "projects", "p", S, "subagents"), "afg1");

    assert.equal(decide({ ...pre("Agent", ti, S), tool_use_id: "toolu_fg" }), "allow");
    const post = runHook({
      hook_event_name: "PostToolUse", session_id: S, tool_name: "Agent", tool_input: ti,
      tool_use_id: "toolu_fg", transcript_path: parent, duration_ms: 9001,
      tool_response: {
        status: "completed", agentId: "afg1", resolvedModel: "claude-haiku-5-5",
        totalDurationMs: 9000, totalToolUseCount: 4, totalTokens: 1,
        usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 1, cache_creation_input_tokens: 1 },
        content: [{ type: "text", text: RESULT }],
      },
    });
    assert.equal(post.status, 0);
    assert.equal(post.stdout.trim(), "", "PostToolUse must never answer with a decision");

    const evs = await logged(S);
    const start = evs.find((e) => e.event === "agent_start");
    const end = evs.find((e) => e.event === "agent_end");
    assert.equal(start.model, "haiku");
    assert.equal(start.effort, "low");
    assert.equal(end.id, start.id);
    assert.equal(end.id, "toolu_fg");
    assert.deepEqual(
      { agent: end.agent, task: end.task, model: end.model, effort: end.effort, mode: end.mode },
      { agent: "gard", task: "review auth", model: "haiku", effort: "low", mode: "foreground" },
    );
    assert.equal(end.resolved_model, "claude-haiku-5-5");
    assert.equal(end.duration_ms, 9000);
    assert.equal(end.tool_uses, 4);
    assert.deepEqual(end.tokens, { api_calls: 2, input: 5, output: 30, cache_read: 3000, cache_creation: 500, total: 3535 });
    assert.equal(end.report_chars, RESULT.length, "the size of what returned to the caller, not its text");

    const raw = JSON.stringify(evs);
    assert.ok(!raw.includes(PROMPT) && !raw.includes(RESULT), "prompt or result text reached the log");
  });

  test("a dispatch with no effort logs it as empty (inherited)", async () => {
    const S = "METRICS-NOEFFORT";
    decide(pre("Agent", { subagent_type: "bob", description: "x" }, S));
    const [start] = await logged(S);
    assert.equal(start.effort, "");
    assert.equal(start.model, "");
  });

  test("a background dispatch gets its agent_end at SubagentStop, linked through the launch", async () => {
    const S = "METRICS-BG";
    const dir = path.join(HOME, "projects", "p", S, "subagents");
    await transcript(dir, "abg1");

    decide({ ...pre("Agent", { ...ti, run_in_background: true }, S), tool_use_id: "toolu_bg" });
    runHook({
      hook_event_name: "PostToolUse", session_id: S, tool_name: "Agent", tool_use_id: "toolu_bg",
      tool_input: { ...ti, run_in_background: true },
      tool_response: { status: "async_launched", isAsync: true, agentId: "abg1", resolvedModel: "claude-haiku-5-5", prompt: PROMPT },
    });
    assert.equal((await logged(S)).filter((e) => e.event === "agent_end").length, 0, "no numbers exist at launch");

    const stop = (stop_hook_active) => runHook({
      hook_event_name: "SubagentStop", session_id: S, agent_id: "abg1", agent_type: "gard", stop_hook_active,
      agent_transcript_path: path.join(dir, "agent-abg1.jsonl"), last_assistant_message: RESULT,
    });
    assert.equal(stop(false).stdout.trim(), "");
    stop(true); // the runtime fires SubagentStop again after a stop hook continues the agent

    const evs = await logged(S);
    const ends = evs.filter((e) => e.event === "agent_end");
    assert.ok(ends.length >= 1);
    const end = ends.at(-1);
    assert.equal(end.id, "toolu_bg");
    assert.equal(end.mode, "background");
    assert.equal(end.effort, "low");
    assert.equal(end.resolved_model, "claude-haiku-5-5");
    assert.equal(typeof end.duration_ms, "number");
    assert.equal(end.tokens.total, 3535);
    assert.equal(end.report_chars, RESULT.length);
    assert.equal(evs.filter((e) => e.event === "agent_stop").length, 1, "one agent finishing reads as one stop");
    const raw = JSON.stringify(evs);
    assert.ok(!raw.includes(PROMPT) && !raw.includes(RESULT), "prompt or result text reached the log");
  });

  test("a background report handed back through SubagentHandback is measured from the transcript", async () => {
    // As the runtime writes it on 2026-10-19: the report travels in a
    // SubagentHandback call, the last assistant text is a short closing line, and
    // a split call repeats its stream-start output count before the final one.
    const S = "METRICS-HANDBACK";
    const dir = path.join(HOME, "projects", "p", S, "subagents");
    const entry = (id, output, content) => JSON.stringify({
      type: "assistant", message: { id, content,
        usage: { input_tokens: 1, output_tokens: output, cache_read_input_tokens: 100, cache_creation_input_tokens: 0 } },
    });
    const REPORT = RESULT.repeat(10);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "agent-ahb1.jsonl"), [
      entry("msg_1", 8, [{ type: "text", text: "thinking out loud" }]),
      entry("msg_1", 8, [{ type: "tool_use", name: "Bash", input: { command: "ls" } }]),
      entry("msg_1", 844, [{ type: "tool_use", name: "Bash", input: { command: "ls" } }]),
      entry("msg_2", 6, [{ type: "text", text: "Done." }]),
      entry("msg_2", 6, [{ type: "tool_use", name: "SubagentHandback", input: { message: REPORT } }]),
    ].join("\n") + "\n");

    decide({ ...pre("Agent", { ...ti, run_in_background: true }, S), tool_use_id: "toolu_hb" });
    runHook({
      hook_event_name: "PostToolUse", session_id: S, tool_name: "Agent", tool_use_id: "toolu_hb",
      tool_input: { ...ti, run_in_background: true },
      tool_response: { status: "async_launched", agentId: "ahb1", resolvedModel: "claude-haiku-5-5" },
    });
    runHook({
      hook_event_name: "SubagentStop", session_id: S, agent_id: "ahb1", stop_hook_active: false,
      agent_transcript_path: path.join(dir, "agent-ahb1.jsonl"), last_assistant_message: "Done.",
    });

    const end = (await logged(S)).filter((e) => e.event === "agent_end").at(-1);
    assert.equal(end.report_chars, REPORT.length, "the handed-back report, not the closing line");
    assert.equal(end.tokens.api_calls, 2);
    assert.equal(end.tokens.output, 850, "the largest count per call, not the last entry's");
    assert.ok(!JSON.stringify(await logged(S)).includes(RESULT), "report text reached the log");
  });

  test("a foreground SubagentStop writes no agent_end of its own (PostToolUse does)", async () => {
    const S = "METRICS-FG-STOP";
    runHook({ hook_event_name: "SubagentStop", session_id: S, agent_id: "afg9", stop_hook_active: false });
    assert.equal((await logged(S)).filter((e) => e.event === "agent_end").length, 0);
  });

  describe("payloads without usage never break the hook", () => {
    const cases = {
      "no tool_response": {},
      "tool_response is a string": { tool_response: "Agent failed" },
      "no usage, no duration": { tool_response: { status: "completed", agentId: "anone" } },
      "an agentId that is not an id": { tool_response: { status: "completed", agentId: "../../etc/passwd" }, transcript_path: "/x.jsonl" },
    };
    for (const [name, extra] of Object.entries(cases)) {
      test(name, async () => {
        const S = `METRICS-EMPTY-${name}`;
        const r = runHook({ hook_event_name: "PostToolUse", session_id: S, tool_name: "Agent", tool_input: {}, tool_use_id: "t", ...extra });
        assert.equal(r.status, 0);
        assert.equal(r.stdout.trim(), "");
        const end = (await logged(S)).find((e) => e.event === "agent_end");
        assert.equal(end.tokens, null, "no tokens is null, never a guess");
        assert.equal(end.duration_ms, null);
        assert.equal(end.report_chars, null);
      });
    }
    test("a SubagentStop whose transcript is missing", () => {
      const r = runHook({ hook_event_name: "SubagentStop", session_id: "X", agent_id: "amissing", agent_transcript_path: "/nope.jsonl" });
      assert.equal(r.status, 0);
      assert.equal(r.stdout.trim(), "");
    });
    test("stdin that is not JSON", () => {
      const r = runHook("{ not json");
      assert.equal(r.status, 0);
      assert.equal(r.stdout.trim(), "");
    });
  });

  test("PostToolUse on a gated tool never answers as PreToolUse", () => {
    // The hook is wired to PostToolUse for Agent|Task only, but a matcher is
    // config, not code. If it ever widens, a gate must not fire after the fact.
    const r = runHook({ hook_event_name: "PostToolUse", session_id: "X", tool_name: "Bash", tool_input: { command: "git push" } });
    assert.equal(r.stdout.trim(), "");
  });
});

describe("definition-of-done gate", () => {
  const S = "STOP-ORDER";
  const stop = (extra = {}) => decide({ hook_event_name: "Stop", session_id: S, ...extra });
  const seed = (obj) =>
    appendFile(
      path.join(HOME, ".claude", "meu-time-activity", "events.jsonl"),
      JSON.stringify({ session: S, ...obj }) + "\n",
    );

  before(() => {
    decide(pre("Edit", { file_path: "lighthouserc.json", new_string: "{}" }, S)); // opens a gate
  });

  test("a gated edit with no reviewer blocks the stop", () => {
    assert.equal(stop(), "block");
  });
  test("a reviewer dispatched BEFORE the gate does not count", async () => {
    // Session-wide credit used to let a morning Gard dispatch clear an unrelated
    // afternoon budget edit: "somebody was reviewed at some point" is not review.
    await seed({ ts: 1, event: "agent_start", agent: "gard" });
    assert.equal(stop(), "block");
  });
  test("a reviewer dispatched AFTER the gate clears it", async () => {
    await seed({ ts: Date.now() + 60000, event: "agent_start", agent: "perry" });
    assert.equal(stop(), "allow");
  });
  test("the re-entry guard never blocks twice in one turn", () => {
    assert.equal(stop({ stop_hook_active: true }), "allow");
  });
});

describe("context-size reminder (UserPromptSubmit)", () => {
  const asst = (tokens, extra = {}) =>
    JSON.stringify({
      type: "assistant",
      message: { id: "m" + tokens, usage: { input_tokens: 5, cache_read_input_tokens: tokens - 10, cache_creation_input_tokens: 5, output_tokens: 99 } },
      ...extra,
    });
  const transcript = async (name, lines) => {
    const f = path.join(HOME, name + ".jsonl");
    await writeFile(f, lines.join("\n") + "\n");
    return f;
  };
  const prompt = (session, transcript_path, env = {}) => {
    const r = spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify({ hook_event_name: "UserPromptSubmit", session_id: session, transcript_path }),
      encoding: "utf8",
      env: { ...process.env, HOME, USERPROFILE: HOME, ...env },
    });
    assert.equal(r.status, 0);
    return r.stdout.trim() ? JSON.parse(r.stdout).hookSpecificOutput : null;
  };

  test("stays silent below the first band", async () => {
    const f = await transcript("ctx-low", [asst(50000)]);
    assert.equal(prompt("CTX-LOW", f), null);
  });

  test("injects additionalContext once per band crossing, using the latest main-chain entry", async () => {
    const S = "CTX-BANDS";
    // The sidechain entry is later in the file but belongs to a subagent: must be ignored.
    const f = await transcript("ctx-bands", [asst(20000), asst(120000), asst(190000, { isSidechain: true })]);
    const first = prompt(S, f);
    assert.equal(first.hookEventName, "UserPromptSubmit");
    assert.match(first.additionalContext, /~120k tokens/);
    assert.equal(prompt(S, f), null, "same band must not nag again");

    await appendFile(f, asst(155000) + "\n");
    assert.match(prompt(S, f).additionalContext, /~155k tokens/);
    assert.equal(prompt(S, f), null);
  });

  test("reminds again after the context shrinks below every band and climbs back", async () => {
    const S = "CTX-COMPACT";
    const f = await transcript("ctx-compact", [asst(130000)]);
    assert.ok(prompt(S, f));
    await appendFile(f, asst(20000) + "\n");
    assert.equal(prompt(S, f), null);
    await appendFile(f, asst(130000) + "\n");
    assert.ok(prompt(S, f));
  });

  test("bands are overridable by env, and 'off' disables", async () => {
    const f = await transcript("ctx-env", [asst(30000)]);
    assert.ok(prompt("CTX-ENV", f, { MEU_TIME_CONTEXT_BANDS: "20000" }));
    assert.equal(prompt("CTX-OFF", f, { MEU_TIME_CONTEXT_BANDS: "off" }), null);
  });

  test("logs a context-size gate that the definition-of-done gate ignores", async () => {
    const f = await transcript("ctx-log", [asst(110000)]);
    prompt("CTX-LOG", f);
    const log = await readFile(path.join(HOME, ".claude", "meu-time-activity", "events.jsonl"), "utf8");
    assert.match(log, /"session":"CTX-LOG".*"kind":"context-size"/);
    assert.equal(decide({ hook_event_name: "Stop", session_id: "CTX-LOG" }), "allow");
  });

  test("fails open and silent on a missing, empty or garbage transcript", async () => {
    assert.equal(prompt("CTX-MISSING", path.join(HOME, "nope.jsonl")), null);
    assert.equal(prompt("CTX-EMPTY", await transcript("ctx-empty", [""])), null);
    assert.equal(prompt("CTX-GARBAGE", await transcript("ctx-garbage", ['{"usage" broken', "not json"])), null);
    assert.equal(runHook({ hook_event_name: "UserPromptSubmit" }).status, 0);
  });
});

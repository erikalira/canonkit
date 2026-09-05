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
import { mkdtemp, rm, appendFile, mkdir } from "node:fs/promises";
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

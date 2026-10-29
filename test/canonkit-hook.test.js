/**
 * Contract tests for hooks/canonkit-hook.js.
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
import { mkdtemp, rm, appendFile, mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOOK = path.join(REPO, "hooks", "canonkit-hook.js");
// Importing the hook must not run it: doctor and these tests read its exports.
const hook = () => createRequire(import.meta.url)(HOOK);
const WIN = process.platform === "win32";

const FAKE_AWS_KEY = "AKIA" + "ABCDEFGHIJKLMNOP";
const FAKE_PEM = "-----BEGIN RSA PRIVATE " + "KEY-----";

let HOME;

before(async () => {
  HOME = await mkdtemp(path.join(os.tmpdir(), "canonkit-hook-"));
  await mkdir(path.join(HOME, ".claude", "canonkit-activity"), { recursive: true });
});
after(async () => {
  await rm(HOME, { recursive: true, force: true });
});

// The harness sets CLAUDE_PROJECT_DIR for hooks, and would for this suite if it
// runs inside a session: every test picks its project explicitly instead.
function hookEnv(env = {}) {
  const e = { ...process.env, HOME, USERPROFILE: HOME, ...env };
  if (!("CLAUDE_PROJECT_DIR" in env)) delete e.CLAUDE_PROJECT_DIR;
  return e;
}

// The hook runs from the fake HOME, and projects live under it: the config
// lookup stops at home, so a real canonkit.json above the repo or in the
// developer's home can never leak into a result.
/** Runs the hook and reduces its stdout to the decision it expresses. */
function decide(input, env = {}) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(input),
    encoding: "utf8",
    env: hookEnv(env),
    cwd: HOME,
    timeout: 10000,
  });
  const out = (r.stdout || "").trim();
  if (!out) return "allow";
  const j = JSON.parse(out);
  return j.decision || j.hookSpecificOutput?.permissionDecision || "allow";
}

/** Runs the hook and returns the raw process result. */
function runHook(input, env = {}) {
  return spawnSync(process.execPath, [HOOK], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    encoding: "utf8",
    env: hookEnv(env),
    cwd: HOME,
  });
}

// A throwaway project with an optional .claude/canonkit.json, under the fake
// HOME (removed with it).
async function project(config) {
  const dir = await mkdtemp(path.join(HOME, "project-"));
  await mkdir(path.join(dir, ".claude"), { recursive: true });
  if (config !== undefined) {
    await writeFile(path.join(dir, ".claude", "canonkit.json"), typeof config === "string" ? config : JSON.stringify(config));
  }
  return dir;
}
const inProject = (cwd, tool, tool_input, session = "CONFIG", env) => decide({ ...pre(tool, tool_input, session), cwd }, env);
// Concatenated, not path.join: join would resolve the `..` and `//` under test.
const edit = (cwd, rel, new_string = "x") =>
  inProject(cwd, "Edit", { file_path: cwd + "/" + rel, new_string });

// Both logs: tool_result lines live in tool-results.jsonl, everything else in events.jsonl.
const activity = (f) => path.join(HOME, ".claude", "canonkit-activity", f);
const readLog = async () => (await Promise.all(["events.jsonl", "tool-results.jsonl"]
  .map((f) => readFile(activity(f), "utf8").catch(() => "")))).join("");
const logged = async (session) =>
  (await readLog()).trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((e) => e.session === session);

const pre = (tool_name, tool_input, session_id = "TEST") =>
  ({ hook_event_name: "PreToolUse", tool_name, tool_input, session_id });

describe("tool-result volume (main thread and subagents)", () => {
  // Synthetic sensitive markers must never reach the activity JSONL, even via
  // cwd, file metadata, unexpected fields or tool_input.
  const secret = "PRIVATE-RESULT-" + FAKE_AWS_KEY;
  const privatePath = "C:\\private-customer\\" + secret + "\\source.js";
  const post = (tool, response, session, extra = {}) => ({
    hook_event_name: "PostToolUse", session_id: session, tool_name: tool,
    cwd: privatePath, transcript_path: privatePath,
    tool_input: { command: secret, file_path: privatePath, prompt: secret },
    tool_response: response, ...extra,
  });
  const check = async (tool, response, chars, lines, suffix = tool) => {
    const session = `VOLUME-${suffix}`;
    const r = runHook(post(tool, response, session));
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
    assert.equal(r.stderr, "");
    const events = await logged(session);
    assert.equal(events.length, 1, "one result, no redundant start/end events");
    const e = events[0];
    assert.deepEqual(Object.keys(e).sort(), ["chars", "event", "lines", "session", "thread", "tool", "ts"]);
    assert.deepEqual({ ...e, ts: 0 }, { ts: 0, session, event: "tool_result", thread: "main", tool, chars, lines });
    const jsonl = await readLog();
    assert.ok(!jsonl.includes(secret), "sensitive input/result content persisted");
    assert.ok(!jsonl.includes("private-customer"), "private path persisted");
  };

  test("Read measures only returned text, not the full file or its path", async () => {
    const content = secret + "\r\nsecond\rthird\n";
    await check("Read", { type: "text", file: { filePath: privatePath, content, numLines: 999, totalLines: 9999 } }, content.length, 3);
  });
  test("Grep content and count modes measure content, including empty content", async () => {
    await check("Grep", { mode: "content", content: secret, filenames: [privatePath], numFiles: 1 }, secret.length, 1);
    await check("Grep", { mode: "count", content: "", filenames: [], numFiles: 0 }, 0, 0, "Grep-count");
  });
  test("Grep file modes measure the newline-separated filenames without storing them", async () => {
    for (const mode of [undefined, "files_with_matches"]) {
      await check("Grep", { mode, filenames: [privatePath, secret], numFiles: 2 }, privatePath.length + 1 + secret.length, 2, `Grep-files-${mode}`);
    }
  });
  test("Glob measures returned filenames and ignores metadata", async () => {
    await check("Glob", { filenames: [privatePath, secret], numFiles: 2, durationMs: 15, truncated: true }, privatePath.length + 1 + secret.length, 2);
  });
  for (const tool of ["Bash", "PowerShell"]) {
    test(`${tool} sums stdout/stderr without commands, status or output paths`, async () => {
      await check(tool, { stdout: secret + "\n", stderr: "warning", interrupted: false, persistedOutputPath: privatePath, status: secret }, secret.length + 8, 2);
    });
  }
  test("all five tools record valid empty output as zero", async () => {
    for (const [tool, response] of Object.entries({
      Read: { type: "text", file: { content: "" } },
      Grep: { mode: "content", content: "" }, Glob: { filenames: [] },
      Bash: { stdout: "", stderr: "", interrupted: false },
      PowerShell: { stdout: "", stderr: "", interrupted: false },
    })) await check(tool, response, 0, 0, `${tool}-empty`);
  });
  test("large output produces a small quantitative event and no content copy", async () => {
    const content = (secret + "\n").repeat(90000);
    await check("Read", { type: "text", file: { content } }, content.length, 90000, "large");
    assert.ok(JSON.stringify(await logged("VOLUME-large")).length < 200);
  });
  test("UTF-16 chars match report_chars; a final terminator adds no empty line", async () => {
    await check("Read", { type: "text", file: { content: "a😀\r\n" } }, 5, 1, "unicode");
    await check("Read", { type: "text", file: { content: "\n" } }, 1, 1, "newline");
  });
  // Payload shape captured from real hooks (Claude Code 2.1.302): the main
  // thread, --agent included, never has the agent_id key; a subagent's tool
  // events carry agent_id (the id agent_launch/agent_end log) and agent_type.
  const strip = (e) => { const { ts, ...rest } = e; return rest; };
  test("a subagent's results are measured and attributed to its agent_id", async () => {
    const session = "VOLUME-subagent";
    const r = runHook(post("Read", { type: "text", file: { content: "ab\ncd" } }, session,
      { agent_id: "a1b2c3d4e5f6", agent_type: "bob", tool_use_id: "toolu_01SUB" }));
    assert.equal(r.status, 0); assert.equal(r.stdout, ""); assert.equal(r.stderr, "");
    assert.deepEqual((await logged(session)).map(strip), [{
      session, event: "tool_result", thread: "subagent", agent_id: "a1b2c3d4e5f6", agent_type: "bob",
      tool: "Read", tool_use_id: "toolu_01SUB", chars: 5, lines: 2,
    }]);
  });
  test("agent_type alone stays main; a present but unusable agent_id is unknown, never main", async () => {
    const session = "VOLUME-main-only";
    runHook(post("Glob", { filenames: [] }, session, { agent_type: "bob" }));
    for (const agent_id of ["", null, privatePath, 42, "x".repeat(65)]) {
      assert.equal(runHook(post("Glob", { filenames: [secret] }, session, { agent_id, agent_type: secret })).status, 0);
    }
    const events = await logged(session);
    assert.deepEqual(events.map((e) => e.thread), ["main", "unknown", "unknown", "unknown", "unknown", "unknown"]);
    assert.ok(events.every((e) => !("agent_id" in e) && !("agent_type" in e)), "no unusable id or free text logged");
  });
  test("several agents at once each keep their own id; unsafe agent_type and tool_use_id are dropped", async () => {
    const session = "VOLUME-parallel";
    for (const [agent_id, agent_type, tool_use_id] of [["abob1", "bob", "tu-1"], ["aquinn1", "quinn", "tu-2"], ["abob1", "bob", "tu-3"], ["agard1", "plugin:x y", "../tu"], ["aplug1", "my.plugin:reviewer", "tu-5"]]) {
      runHook(post("Bash", { stdout: "x", stderr: "" }, session, { agent_id, agent_type, tool_use_id }));
    }
    // A namespaced plugin agent keeps its type; a space or slash still drops it.
    assert.deepEqual((await logged(session)).map((e) => [e.agent_id, e.agent_type, e.tool_use_id]),
      [["abob1", "bob", "tu-1"], ["aquinn1", "quinn", "tu-2"], ["abob1", "bob", "tu-3"], ["agard1", undefined, undefined], ["aplug1", "my.plugin:reviewer", "tu-5"]]);
  });
  test("subagent results persist no content, path or command", async () => {
    runHook(post("PowerShell", { stdout: secret, stderr: privatePath }, "VOLUME-sub-private", { agent_id: "asub9", agent_type: "bob" }));
    const jsonl = await readLog();
    assert.ok(!jsonl.includes(secret) && !jsonl.includes("private-customer"));
    assert.equal((await logged("VOLUME-sub-private")).length, 1);
  });
  test("unexpected, binary and absent payloads stay silent and unmeasured", async () => {
    const session = "VOLUME-unknown";
    const cases = [
      ["Read", undefined], ["Read", null], ["Read", secret], ["Read", []],
      ["Read", { type: "image", file: { base64: secret } }],
      ["Read", { type: "text", file: { content: { secret } } }],
      ["Grep", { mode: "future", content: secret }], ["Grep", { mode: "content" }],
      ["Glob", { filenames: [privatePath, {}] }], ["Glob", { filenames: secret }],
      ["Bash", { output: secret }], ["Bash", { stdout: secret }],
      ["PowerShell", { stdout: secret, stderr: "", isImage: true }],
      ["Other", { stdout: secret, stderr: "" }],
    ];
    for (const [tool, response] of cases) {
      const r = runHook(post(tool, response, session));
      assert.equal(r.status, 0); assert.equal(r.stdout, ""); assert.equal(r.stderr, "");
    }
    for (const raw of ["null", "[]", "{ broken", "42"]) assert.equal(runHook(raw).status, 0);
    assert.deepEqual(await logged(session), []);
  });
  test("unsafe or absent session identifiers are never logged", async () => {
    const before = await readLog();
    for (const session of [privatePath, {}, null, ""]) runHook(post("Glob", { filenames: [] }, session));
    assert.equal(await readLog(), before);
  });
  test("internal filesystem failures stay fail-open with no stdout/stderr", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "canonkit-unwritable-"));
    try {
      await writeFile(path.join(home, ".claude"), "not a directory");
      const r = runHook(post("Bash", { stdout: secret, stderr: "" }, "VOLUME-fail-open"), { HOME: home, USERPROFILE: home });
      assert.equal(r.status, 0); assert.equal(r.stdout, ""); assert.equal(r.stderr, "");
      assert.deepEqual(await readFile(path.join(home, ".claude"), "utf8"), "not a directory");
    } finally { await rm(home, { recursive: true, force: true }); }
  });
});

describe("git hook and signing bypass", () => {
  // Denied, not asked: the reflex after a failed pre-commit is --no-verify, and a
  // confirm that shows it gets approved on autopilot.
  const bash = (command) => decide(pre("Bash", { command }));
  const ps = (command) => decide(pre("PowerShell", { command }));
  test("--no-verify is denied in both shells", () => {
    assert.equal(bash("git commit --no-verify -m x"), "deny");
    assert.equal(ps("git commit -m x --no-verify"), "deny");
    assert.equal(bash("git push --no-verify origin main"), "deny");
    assert.equal(bash("git rebase --no-verify main"), "deny");
    assert.equal(bash("git commit --no-veri -m x"), "deny"); // git accepts the abbreviation
  });
  test("commit -n is --no-verify, alone or in a cluster", () => {
    assert.equal(bash("git commit -n -m x"), "deny");
    assert.equal(ps("git commit -nm x"), "deny");
    assert.equal(bash("git commit -anm x"), "deny");
  });
  test("--no-gpg-sign is denied", () => {
    assert.equal(bash("git commit --no-gpg-sign -m x"), "deny");
    assert.equal(ps("git merge --no-gpg-sign feat"), "deny");
    assert.equal(bash("git cherry-pick --no-gpg-sign abc123"), "deny");
  });
  test("-c core.hooksPath and -c commit.gpgsign=false are denied", () => {
    assert.equal(bash("git -c commit.gpgsign=false commit -m x"), "deny");
    assert.equal(ps("git -c commit.gpgSign=0 commit -m x"), "deny");
    assert.equal(bash("git -c core.hooksPath=/dev/null commit -m x"), "deny");
    assert.equal(bash("git -c commit.gpgsign=true commit -m x"), "ask");
  });
  test("the flag is found past global options, prefixes and other commands", () => {
    assert.equal(bash("git -C sub commit --no-verify -m x"), "deny");
    assert.equal(bash("npm test && git commit --no-verify -m x"), "deny");
    assert.equal(ps("npm test; if ($?) { git push --no-verify }"), "deny");
    assert.equal(bash("GIT_TRACE=1 git commit --no-verify -m x"), "deny");
    assert.equal(ps("& 'C:\\Program Files\\Git\\cmd\\git.exe' commit --no-verify -m x"), "deny");
    assert.equal(ps('git -C "C:\\repo\\" commit --no-verify -m x'), "deny"); // `\"` is no escape in PowerShell
  });
  test("shell keywords and wrappers before git do not hide the flag", () => {
    assert.equal(bash("if npm test; then git commit --no-verify -m x; fi"), "deny");
    assert.equal(bash("for b in a b; do git push --no-verify origin $b; done"), "deny");
    assert.equal(bash("! git commit --no-verify -m x"), "deny");
    assert.equal(bash("timeout 60 git push --no-verify"), "deny");
    assert.equal(bash("env -i git commit --no-verify -m x"), "deny");
    assert.equal(bash("sudo -u bob git commit --no-verify -m x"), "deny");
  });
  test("a substitution or redirection inside git's arguments does not hide the flag", () => {
    assert.equal(bash("git commit -m $(cat msg.txt) --no-verify"), "deny");
    assert.equal(ps("git commit -m (Get-Content msg.txt -Raw) --no-verify"), "deny");
    assert.equal(ps("git commit 2>&1 --no-verify"), "deny");
    assert.equal(bash("(cd sub && git commit --no-verify -m x)"), "deny");
  });
  test("comments are not commands", () => {
    assert.equal(bash("# don't run hooks\ngit commit --no-verify -m x"), "deny");
    assert.equal(ps("# don't run hooks\ngit commit --no-verify -m x"), "deny");
    assert.equal(bash("git commit -m x # --no-verify"), "ask");
    assert.equal(ps("git commit -m x # skip --no-verify"), "ask");
  });
  test("an empty or mixed-case false gpgsign is false", () => {
    assert.equal(bash("git -c commit.gpgsign= commit -m x"), "deny"); // git reads an empty value as false
    assert.equal(bash("git -c commit.gpgsign=FALSE commit -m x"), "deny");
  });
  test("each line is its own command", () => {
    assert.equal(bash("git add -A\ngit commit --no-verify -m x"), "deny");
    assert.equal(ps("git add -A\ngit commit --no-verify -m x"), "deny");
    assert.equal(ps("git add -A\r\ngit push --no-verify"), "deny");
    assert.equal(bash("git status\ngit -c commit.gpgsign=false commit -m x"), "deny");
    assert.equal(bash("cat > f <<'EOF'\nx\nEOF\ngit commit -n -m x"), "deny");
    assert.equal(bash("echo a #b\ngit commit --no-verify"), "deny");
  });
  test("a line continuation does not hide the flag", () => {
    assert.equal(bash("git commit \\\n  --no-verify -m x"), "deny");
    assert.equal(ps("git commit `\n  --no-verify -m x"), "deny");
  });
  test("a commit message that mentions the flags is not a bypass", () => {
    assert.equal(bash('git commit -m "docs: block --no-verify and -n"'), "ask");
    assert.equal(bash("git commit -m 'skip --no-gpg-sign'"), "ask");
    assert.equal(bash("git commit -m \"$(cat <<'EOF'\nfix: \"quoted\" --no-verify, don't -n\nEOF\n)\""), "ask");
    assert.equal(ps("git commit -m @'\nblock --no-verify, it's \"done\"\n'@"), "ask");
    assert.equal(ps("git commit -m @'\nx\n'@ --no-verify"), "deny"); // the flag after the message still counts
    assert.equal(bash('git commit -m "-n"'), "ask");
    assert.equal(bash("git commit -mn"), "ask"); // message "n"
    assert.equal(bash("git commit -am x"), "ask");
    assert.equal(bash("git commit -F - <<'END-OF-MSG'\nfix: --no-verify\nEND-OF-MSG"), "ask");
    assert.equal(bash("git commit -F - <<'---'\nfix: --no-verify\n---"), "ask");
    assert.equal(bash('git commit -m "$(echo "fix --no-verify docs")"'), "ask");
  });
  test("known limits stay confirmed, not denied", () => {
    // Documented non-goal: a wrapped shell is a string to this hook. The commit
    // confirm still shows the whole command.
    assert.equal(bash("bash -c 'git commit --no-verify -m x'"), "ask");
    assert.equal(bash("git commit -m x --no-ver"), "ask"); // ambiguous with --no-verbose
  });
  test("a secret write next to a commit is still denied", () => {
    assert.equal(bash(`git -C d commit -m x; echo '${FAKE_PEM}' > k.pem`), "deny");
    assert.equal(bash(`git commit -m x; echo ${FAKE_AWS_KEY} > .env`), "deny");
  });
  test("lookalikes are not bypasses", () => {
    assert.equal(bash("git push -n origin main"), "ask"); // --dry-run
    assert.equal(bash("git commit -m x -- --no-verify"), "ask"); // a pathspec
    assert.equal(bash("git log --grep=no-verify"), "allow");
    assert.equal(bash("git -c core.hooksPath=/dev/null status"), "allow");
    assert.equal(bash("echo git"), "allow");
  });
  test("a bypass deny is logged and does not feed the Stop gate", async () => {
    assert.equal(decide(pre("Bash", { command: "git commit --no-verify -m x" }, "BYPASS")), "deny");
    const gates = (await logged("BYPASS")).filter((e) => e.event === "gate");
    assert.deepEqual(gates.map((e) => [e.kind, e.flag]), [["git-bypass", "--no-verify"]]);
    assert.equal(decide({ hook_event_name: "Stop", session_id: "BYPASS" }), "allow");
  });
});

describe("every shell is a shell", () => {
  // The side door this closed: on Windows the harness's primary shell tool is
  // PowerShell, so a gate wired only to Bash gates nothing that matters there.
  test("PowerShell git commit is gated", () => {
    assert.equal(decide(pre("PowerShell", { command: "git commit -m wip" })), "ask");
  });
  test("Bash git push is gated", () => {
    assert.equal(decide(pre("Bash", { command: "git push origin main" })), "ask");
  });
  test("git commit/push behind global options is gated", () => {
    assert.equal(decide(pre("Bash", { command: "git -C sub commit -m x" })), "ask");
    assert.equal(decide(pre("PowerShell", { command: "git -c user.name=x push" })), "ask");
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
  test("gate messages say canonkit, not the old name", () => {
    const r = runHook(pre("Edit", { file_path: "src/auth/x.ts", new_string: "x" }));
    const reason = JSON.parse(r.stdout).hookSpecificOutput.permissionDecisionReason;
    assert.match(reason, /^canonkit gate/);
    assert.doesNotMatch(r.stdout, /meu.?time/i);
  });

  // Fact-forcing text belongs to the HIGH-risk surface gate alone: a prompt that
  // asks for importers and rollback on every gate is one people click through.
  const reasonOf = (tool, input) => JSON.parse(runHook(pre(tool, input)).stdout).hookSpecificOutput.permissionDecisionReason;
  const FACTS = /who imports or calls it.*public contract it touches \(or "none"\).*rollback/;
  test("the HIGH-risk gate asks for importers, contract and rollback (Edit and shell write)", () => {
    assert.match(reasonOf("Edit", { file_path: "src/auth/x.ts", new_string: "x" }), FACTS);
    assert.match(reasonOf("Bash", { command: "cat > src/lib/authClient.ts <<EOF\nx\nEOF" }), FACTS);
    assert.match(reasonOf("Edit", { file_path: "src/auth/x.ts", new_string: "x" }), /Archie\/Gard review.*highRisk\.exclude/);
  });
  test("the perf-budget, git and secret gates do not ask for it", () => {
    assert.doesNotMatch(reasonOf("Edit", { file_path: "lighthouserc.json", new_string: "{}" }), FACTS);
    assert.doesNotMatch(reasonOf("Bash", { command: "Set-Content -Path lighthouserc.json -Value x" }), FACTS);
    assert.doesNotMatch(reasonOf("Bash", { command: "git commit -m x" }), FACTS);
    assert.doesNotMatch(reasonOf("Edit", { file_path: "src/app.ts", new_string: "password = 'hunter2hunter2'" }), FACTS);
  });
});

describe("HIGH-risk path calibration", () => {
  // Every case is a decision, not a sample. The ambiguous words (login,
  // session(s), contract(s), permission(s), gateway) name UI and domain folders
  // as often as security surfaces, so they gate only in code outside a
  // presentational folder. The strong terms and the secret-bearing names are
  // untouched: those are the false negatives the gate exists to prevent.
  const edit = (fp) => decide(pre("Edit", { file_path: fp, new_string: "x" }));

  test("false positives: UI, docs and styles that merely use an ambiguous word", () => {
    for (const fp of [
      "src/components/SessionsList.tsx", // no segment boundary: never was a match
      "src/components/sessions/SessionList.tsx", // a UI folder named after the domain
      "src/ui/permissions/PermissionBadge.tsx",
      "src/components/gateway/GatewayStatus.tsx",
      "src/features/contracts/ContractCard.stories.tsx",
      "docs/contracts-overview.md", // prose about contracts is not a contract
      "docs/sessions.md",
      "src/styles/login.css",
      "src\\components\\sessions\\List.tsx", // Windows separators
    ]) {
      assert.equal(edit(fp), "allow", fp);
    }
  });

  test("false negatives: secrets, auth and migrations stay gated wherever they are", () => {
    for (const fp of [
      ".env",
      ".env.local",
      "config/.env.production",
      ".npmrc",
      "src/auth/index.ts",
      "auth/middleware.go",
      "src/components/auth/LoginForm.tsx", // a strong term wins over a UI folder
      "docs/auth.md", // a strong term gates in prose too: unchanged on purpose
      "db/migrations/001_init.sql",
      "prisma/migrations/20240101_init/migration.sql",
      "src/migrations/2024_add_users.ts",
      "C:\\repo\\src\\auth\\session.ts",
    ]) {
      assert.equal(edit(fp), "ask", fp);
    }
  });

  test("false negatives: ambiguous words in code outside a presentational folder stay gated", () => {
    for (const fp of [
      "src/lib/session/store.ts",
      "server/sessions/store.ts",
      "api/permissions.ts",
      "contracts/Token.sol", // a smart contract
      "api/contracts/openapi.yaml", // an API contract
      "docs/contracts/openapi.yaml", // still a contract: only prose files are let through
      "services/gateway/routes.ts",
      "src/pages/login.tsx",
      "pages/api/login.ts",
    ]) {
      assert.equal(edit(fp), "ask", fp);
    }
  });

  test("the calibration applies to shell writes too", () => {
    assert.equal(decide(pre("Bash", { command: "echo x > docs/contracts-overview.md" })), "allow");
    assert.equal(decide(pre("Bash", { command: "echo x > server/sessions/store.ts" })), "ask");
  });
});

describe("performance budgets", () => {
  // Perry is stack-agnostic, so the gate cannot know only Lighthouse.
  const edit = (fp) => decide(pre("Edit", { file_path: fp, new_string: "{}" }));

  test("the default list covers the common budget files", () => {
    for (const fp of [
      "lighthouserc.json",
      ".lighthouserc.yml",
      ".size-limit.json",
      ".size-limit.js",
      "bundlesize.config.json",
      ".bundlesizerc",
      "budget.json",
      "lighthouse-budget.json",
      "perf-budget.json",
      "perf_budget.yml",
      "config/performance-budgets.yml",
      "load/k6/thresholds.js",
      ".bundlewatch.config.json",
      "bundlewatch.config.js",
      "app.budgets.json",
      "perfBudget.json", // camelCase budget files, which *perf*budget* used to catch
      "config/performanceBudgets.yml",
      "perfBudget-prod.json", // camelCase with a suffix (Perry)
      "perfBudget_ci.json",
      "config/performanceBudget-mobile.yml",
      "config/performanceBudget_ci.yml",
    ]) {
      assert.equal(edit(fp), "ask", fp);
    }
  });

  test("budget.json at any depth asks: an accepted over-match (Perry)", () => {
    // Narrowing it to a lighthouse/perf ancestor would miss Lighthouse's own
    // default location; a finance budget.json costing one confirmation is the trade.
    assert.equal(edit("src/finance/budget.json"), "ask");
  });

  test("perfBudget-<anything> asks: an accepted over-match (Perry)", () => {
    // perfBudget-prod.json is a budget; perfBudget-formatter.ts costing one
    // confirmation is the trade. Without a separator it is not one.
    assert.equal(edit("src/perfBudget-formatter.ts"), "ask");
    assert.equal(edit("src/perfBudgetFormatter.ts"), "allow");
  });

  test("ordinary files that mention a budget are not budgets", () => {
    for (const fp of [
      "src/finance/budget.ts",
      "docs/performance.md",
      "load/k6/script.js",
      "src/superfluous-budget.ts", // "superfluous" contains "perf"
      "src/perfBudgetFormatter.ts",
      "docs/performance-budget.md", // prose about a budget is not the budget
      "node_modules/pkg/lighthouserc.json",
      "dist/budget.json",
    ]) {
      assert.equal(edit(fp), "allow", fp);
    }
  });

  test("an explicit perfBudgets entry gates prose and noise too", async () => {
    const cwd = await project({ perfBudgets: ["docs/perf/*.md"] });
    assert.equal(inProject(cwd, "Edit", { file_path: cwd + "/docs/perf/budget-policy.md", new_string: "x" }), "ask");
  });

  test("a perf-budget gate is logged under its own kind", async () => {
    decide(pre("Edit", { file_path: ".size-limit.json", new_string: "[]" }, "PERF-KIND"));
    const [gate] = await logged("PERF-KIND");
    assert.equal(gate.kind, "perf-budget");
  });
});

describe("project config (.claude/canonkit.json)", () => {
  // The file is read from the project the session runs in (input.cwd). It
  // tunes path heuristics only: what is written is always checked.
  test("exclude silences a path heuristic, for absolute and relative paths", async () => {
    const cwd = await project({ highRisk: { exclude: ["src/domain/contracts/**"] } });
    assert.equal(edit(cwd, "src/domain/contracts/contract.service.ts"), "allow");
    assert.equal(inProject(cwd, "Edit", { file_path: "src/domain/contracts/x.ts", new_string: "x" }), "allow");
    assert.equal(inProject(cwd, "Bash", { command: "echo x > src/domain/contracts/x.ts" }), "allow");
    assert.equal(edit(cwd, "server/sessions/store.ts"), "ask", "only the excluded path is silenced");
  });

  test("a pattern without a slash matches the file name at any depth", async () => {
    const cwd = await project({ highRisk: { exclude: ["*.service.ts"] } });
    assert.equal(edit(cwd, "src/domain/contracts/contract.service.ts"), "allow");
  });

  test("exclude never silences secret detection in what is written", async () => {
    const cwd = await project({ highRisk: { exclude: ["**"] } });
    assert.equal(edit(cwd, "src/config.ts", FAKE_PEM), "deny");
    assert.equal(edit(cwd, "src/config.ts", 'const password = "hunter2000"'), "ask");
    assert.equal(inProject(cwd, "Bash", { command: `echo ${FAKE_AWS_KEY} > src/x.ts` }), "deny");
  });

  test("exclude cannot silence a secret-bearing path", async () => {
    // The content check does not recognise every token format (ghp_, npm_), so
    // for these files the path is the only backstop.
    const cwd = await project({ highRisk: { exclude: ["**", ".env", ".npmrc", "*token*"] } });
    for (const rel of [".env", ".env.local", ".npmrc", "config/github_token", "config/secrets.yml", "keys/credentials.json"]) {
      assert.equal(edit(cwd, rel), "ask", rel);
    }
  });

  test("include adds a surface, and wins over exclude", async () => {
    const cwd = await project({ highRisk: { include: ["src/billing/**"], exclude: ["src/billing/**"] } });
    assert.equal(edit(cwd, "src/billing/charge.ts"), "ask");
    assert.equal(inProject(cwd, "Bash", { command: "echo x > src/billing/charge.ts" }), "ask");
  });

  test("include reaches paths the default treats as noise (tests, fixtures)", async () => {
    const cwd = await project({ highRisk: { include: ["fixtures/keys/**"] } });
    assert.equal(edit(cwd, "fixtures/keys/prod.json"), "ask");
  });

  test("perfBudgets extends the defaults; it cannot remove one", async () => {
    const cwd = await project({ perfBudgets: ["perf/thresholds.yml"], highRisk: { exclude: ["**"] } });
    assert.equal(edit(cwd, "perf/thresholds.yml"), "ask");
    assert.equal(edit(cwd, "lighthouserc.json"), "ask", "a highRisk exclude does not reach the perf gate");
  });

  test("editing the config itself is a gated change", async () => {
    const cwd = await project({});
    assert.equal(edit(cwd, ".claude/canonkit.json", "{}"), "ask");
    assert.equal(inProject(cwd, "PowerShell", { command: "Set-Content -Path .claude/canonkit.json -Value '{}'" }), "ask");
    assert.equal(decide(pre("Edit", { file_path: "other/.claude/canonkit.json", new_string: "{}" })), "ask");
  });

  test("an invalid or wrongly shaped config falls back to the defaults", async () => {
    for (const bad of ["{ not json", "[]", "null", JSON.stringify({ highRisk: { exclude: "**" } }), JSON.stringify({ highRisk: { exclude: [42, null] } })]) {
      const cwd = await project(bad);
      assert.equal(edit(cwd, "src/auth/x.ts"), "ask", bad);
      assert.equal(edit(cwd, "docs/contracts-overview.md"), "allow", bad);
    }
  });

  test("no config file: defaults", () => {
    assert.equal(decide({ ...pre("Edit", { file_path: "server/sessions/store.ts", new_string: "x" }), cwd: os.tmpdir() }), "ask");
  });

  test("a version other than 1 is not guessed at: defaults, and the reason is kept", async () => {
    const ok = await project({ version: 1, highRisk: { exclude: ["src/domain/contracts/**"] } });
    assert.equal(edit(ok, "src/domain/contracts/x.ts"), "allow");
    const future = await project({ version: 2, highRisk: { exclude: ["src/domain/contracts/**"] } });
    assert.equal(edit(future, "src/domain/contracts/x.ts"), "ask");
    assert.ok(hook().projectConfig(future, "").ignored.some((i) => i.where === "version"));
  });

  test("unknown keys are ignored, and reported for doctor", async () => {
    const cwd = await project({ highrisk: { exclude: ["**"] }, perfBudgets: ["perf/x.yml"] });
    assert.equal(edit(cwd, "perf/x.yml"), "ask", "the known key still applies");
    assert.deepEqual(hook().projectConfig(cwd, "").ignored.map((i) => i.where), ["highrisk"]);
  });

  test("a malformed config yields the defaults plus the reasons it was ignored", async () => {
    const { projectConfig } = hook();
    const broken = projectConfig(await project("{ not json"), "");
    assert.equal(broken.exclude.length, 0);
    assert.equal(broken.ignored.length, 1);
    const shaped = projectConfig(await project({ highRisk: { include: "src/**", exclude: [42, "", "x".repeat(500), "ok/**"] } }), "");
    assert.deepEqual(shaped.exclude.map((m) => m.glob), ["ok/**"]);
    assert.deepEqual(shaped.ignored.map((i) => i.where), ["highRisk.include", "highRisk.exclude[0]", "highRisk.exclude[1]", "highRisk.exclude[2]"]);
    assert.ok(shaped.ignored.every((i) => typeof i.why === "string" && i.why));
  });
});

describe("a repo-committed exclude cannot switch the HIGH-risk gate off (decision b)", () => {
  // A clone never passes the edit gate on .claude/canonkit.json: whatever the
  // repo committed applies from the first session. So exclude may quiet the
  // ambiguous words, never the surfaces the HIGH-risk routing exists for.
  test("catch-all excludes are rejected, and reported", async () => {
    for (const g of ["**", "*", "**/*", "/**", "./**", "**/", "*/**", "?*", "**/**", "*.*", "**/*.*", "*.?*"]) {
      const cwd = await project({ highRisk: { exclude: [g] } });
      assert.equal(edit(cwd, "server/sessions/store.ts"), "ask", g);
      const { exclude, ignored } = hook().projectConfig(cwd, "");
      assert.equal(exclude.length, 0, g);
      assert.match(ignored[0].why, /catch-all/, g);
    }
  });

  test("excludes are judged together: a catch-all spread over several globs is rejected", async () => {
    // Each of these names one extension; together they cover most code.
    const cwd = await project({ highRisk: { exclude: ["*.ts", "*.go", "*.rb", "*.py"] } });
    const { exclude, ignored } = hook().projectConfig(cwd, "");
    assert.equal(exclude.length, 2, "the globs before the one that tips the union over stand");
    assert.deepEqual(ignored.map((i) => i.where), ["highRisk.exclude[2]", "highRisk.exclude[3]"]);
    for (const i of ignored) assert.match(i.why, /with the excludes before it/);
    assert.equal(edit(cwd, "lib/sessions/store.rb"), "ask");
    assert.equal(edit(cwd, "lib/sessions/store.ts"), "allow", "an earlier glob still applies");
  });

  test("a narrow glob that tips the union is reported as tipping it, not as a catch-all", async () => {
    const cwd = await project({ highRisk: { exclude: ["*.ts", "*.go", "*.rb", "docs/**", "src/domain/**"] } });
    const { exclude, ignored } = hook().projectConfig(cwd, "");
    assert.equal(exclude.length, 3, "*.ts, *.go and src/domain/** stand");
    const docs = ignored.find((i) => i.where === "highRisk.exclude[3]");
    assert.match(docs.why, /with the excludes before it/);
  });

  test("several narrow excludes are not a catch-all", async () => {
    const cwd = await project({ highRisk: { exclude: ["src/domain/contracts/**", "docs/**", "web/components/**", "*.stories.tsx"] } });
    const { exclude, ignored } = hook().projectConfig(cwd, "");
    assert.equal(exclude.length, 4);
    assert.deepEqual(ignored, []);
  });

  test("auth and migrations stay gated whatever exclude says", async () => {
    const cwd = await project({ highRisk: { exclude: ["src/**", "db/**", "*.sql", "*.ts"] } });
    for (const rel of ["src/auth/x.ts", "src/lib/oauth.ts", "db/migrations/001_init.sql", "src/migrations/2024_users.ts", "prisma/schema.prisma"]) {
      assert.equal(edit(cwd, rel), "ask", rel);
    }
    assert.equal(edit(cwd, "src/lib/session/store.ts"), "allow", "an ambiguous word is still excludable");
  });

  test("an exclude that silences a gate leaves a trace the Stop gate ignores", async () => {
    const cwd = await project({ highRisk: { exclude: ["src/domain/contracts/**"] } });
    inProject(cwd, "Edit", { file_path: cwd + "/src/domain/contracts/x.ts", new_string: "x" }, "EXCLUDED");
    const [e] = await logged("EXCLUDED");
    assert.deepEqual({ event: e.event, kind: e.kind, glob: e.glob }, { event: "gate", kind: "excluded-by-config", glob: "src/domain/contracts/**" });
    assert.equal(decide({ hook_event_name: "Stop", session_id: "EXCLUDED" }), "allow");
  });

  test("author is not auth (no escape hatch is left for a false positive on a strong term)", () => {
    for (const fp of ["src/components/AuthorCard.tsx", "src/authors/list.ts", "blog/authored-by.ts", "src/authorship.ts"]) {
      assert.equal(decide(pre("Edit", { file_path: fp, new_string: "x" })), "allow", fp);
    }
    // Only the word author: a camelCase `Or` starts a new word, and
    // authority is where Spring keeps its granted roles.
    for (const fp of ["src/authorize.ts", "src/authorization/policy.ts", "src/lib/authorise.py",
      "src/security/authority.ts", "src/security/authorities.ts", "src/AuthorityRepository.java",
      "src/authOrRedirect.ts", "src/requireAuthOrThrow.ts", "src/authOrchestrator.ts", "src/useAuthOrGuest.ts"]) {
      assert.equal(decide(pre("Edit", { file_path: fp, new_string: "x" })), "ask", fp);
    }
  });

  test("AUTHORS files and authoring folders are the word author too", () => {
    for (const fp of ["AUTHORS", "AUTHORS.md", "docs/AUTHORS.txt", "AUTHOR", "src/authoring/editor.ts", "src/AuthoringPanel.tsx"]) {
      assert.equal(decide(pre("Edit", { file_path: fp, new_string: "x" })), "allow", fp);
    }
    // Uppercase is the whole word only: an uppercase auth word is still auth.
    for (const fp of ["src/AUTHORITY.ts", "config/AUTHORIZATION.yml", "src/AUTH_OR_GUEST.ts", "src/AUTHORIZED_ROLES.ts"]) {
      assert.equal(decide(pre("Edit", { file_path: fp, new_string: "x" })), "ask", fp);
    }
  });

  test("migration prose is not a migration; migration code always is", async () => {
    // Migrations are beyond exclude, so a guide about one would ask forever.
    for (const fp of ["docs/migration-guide.md", "MIGRATION.md", "docs/plans/data-migration.md"]) {
      assert.equal(decide(pre("Edit", { file_path: fp, new_string: "x" })), "allow", fp);
    }
    const cwd = await project({ highRisk: { exclude: ["db/**"] } });
    assert.equal(edit(cwd, "db/migrations/001_init.sql"), "ask");
  });
});

describe("glob matching stays linear (a hook that times out fails open)", () => {
  // The runtime treats a hook that times out as a non-blocking error, so a glob
  // that backtracks turns every gate off, the secret deny included, and a
  // cloned repo's config is enough to trigger it.
  const HOSTILE = ["*a".repeat(20) + "b", "**?".repeat(10) + "#", "**/a".repeat(30) + "/**/b", "a*".repeat(60) + "/**"];
  const LONG = ["a".repeat(180), "a/".repeat(120) + "c", "a/".repeat(60) + "a".repeat(120)];

  test("hostile globs finish in < 50 ms on long paths", () => {
    const { globMatcher } = hook();
    for (const g of HOSTILE) {
      const m = globMatcher(g);
      for (const p of LONG) {
        const t = performance.now();
        m(p);
        assert.ok(performance.now() - t < 50, `${g.slice(0, 12)}… on a ${p.length}-char path`);
      }
    }
  });

  test("a hostile config still lets every gate answer", async () => {
    const cwd = await project({ highRisk: { include: HOSTILE, exclude: HOSTILE }, perfBudgets: HOSTILE });
    const deep = "a/".repeat(120) + "auth.ts";
    assert.equal(edit(cwd, deep), "ask");
    assert.equal(edit(cwd, "a".repeat(180) + ".ts", FAKE_PEM), "deny");
  });

  test("an oversized or special config file cannot cost the secret deny", async () => {
    // A crashed or stalled hook fails open just like a timed-out one.
    const big = await project(JSON.stringify({ perfBudgets: Array(400000).fill(1) }));
    let t = performance.now();
    assert.equal(edit(big, "src/config.ts", FAKE_PEM), "deny");
    assert.equal(edit(big, "server/sessions/store.ts"), "ask");
    const cfg = hook().projectConfig(big, "");
    assert.ok(performance.now() - t < 5000);
    assert.deepEqual(cfg.ignored.map((i) => i.where), [".claude/canonkit.json"]);
    assert.match(cfg.ignored[0].why, /larger than/);

    // Just under the size cap: entries past MAX_GLOBS are one ignored line, not one each.
    const many = await project(JSON.stringify({ perfBudgets: Array(20000).fill(1) }));
    t = performance.now();
    const m = hook().projectConfig(many, "");
    assert.ok(performance.now() - t < 200);
    assert.equal(m.ignored.length, 101, "100 bad entries + one 'truncated'");
    assert.match(m.ignored.at(-1).why, /more than 100/);
  });

  test("a config that is not a regular file is not read", { skip: WIN && "no /dev/zero on Windows" }, async () => {
    const dir = await project();
    const { symlink } = await import("node:fs/promises");
    await symlink("/dev/zero", path.join(dir, ".claude", "canonkit.json"));
    assert.equal(edit(dir, "src/config.ts", FAKE_PEM), "deny");
    assert.match(hook().projectConfig(dir, "").ignored[0].why, /not a regular file/);
  });

  test("dialect: * stays in a segment, ** crosses, trailing / is dir/**, case-insensitive, no [] or !", () => {
    const { globMatcher: g } = hook();
    const yes = (glob, p) => assert.ok(g(glob)(p), `${glob} should match ${p}`);
    const no = (glob, p) => assert.ok(!g(glob)(p), `${glob} should not match ${p}`);
    yes("src/*.ts", "src/a.ts"); no("src/*.ts", "src/x/a.ts");
    yes("src/**/a.ts", "src/a.ts"); yes("src/**/a.ts", "src/x/y/a.ts");
    yes("src/legacy/", "src/legacy/x/y.ts"); no("src/legacy/", "src/legacy-v2/x.ts");
    yes("*.service.ts", "deep/dir/A.Service.TS");
    yes("a?c", "abc"); no("src/a?c", "src/a/c");
    yes("**/k6/**/*threshold*", "load/k6/thresholds.js"); no("**/k6/**/*threshold*", "load/k6/script.js");
    no("src/a**b", "src/a/x/b"); yes("src/a**b", "src/axxb"); // ** inside a segment is a plain *
    yes("[ab].ts", "[ab].ts"); no("[ab].ts", "a.ts");
    yes("!x.ts", "!x.ts"); no("!x.ts", "y.ts");
  });
});

describe("every check sees one normalized path", () => {
  // Each bypass below allowed a write the gates exist to stop.
  test("`..` cannot walk out of an excluded folder into a gated one", async () => {
    const cwd = await project({ highRisk: { exclude: ["src/legacy/**"] } });
    for (const rel of ["src/legacy/../auth/x.ts", "src/legacy/../server/sessions/store.ts"]) {
      assert.equal(edit(cwd, rel), "ask", rel);
      assert.equal(inProject(cwd, "Edit", { file_path: rel, new_string: "x" }), "ask", rel);
      assert.equal(inProject(cwd, "Bash", { command: `echo x > ${rel}` }), "ask", rel);
    }
  });

  test("`..` cannot borrow a presentational, noise or test folder", () => {
    for (const fp of ["src/components/../server/permissions.ts", "node_modules/../.env", "build/../.env", "src/__tests__/../auth.ts"]) {
      assert.equal(decide(pre("Edit", { file_path: fp, new_string: "x" })), "ask", fp);
    }
    assert.equal(decide(pre("Bash", { command: "echo x > node_modules/../.env" })), "ask");
    assert.equal(decide(pre("Edit", { file_path: "src/x.test.ts/../config.ts", new_string: 'const password = "hunter2000"' })), "ask");
  });

  test("the config file cannot be reached by another spelling", async () => {
    const cwd = await project({});
    for (const rel of [".claude/./canonkit.json", ".claude//canonkit.json", ".claude/canonkit.json::$DATA", "x/../.claude/canonkit.json", ".CLAUDE/Canonkit.JSON"]) {
      assert.equal(edit(cwd, rel, "{}"), "ask", rel);
    }
    assert.equal(inProject(cwd, "Bash", { command: "echo {} > .claude//canonkit.json" }), "ask");
  });

  test("Windows-only spellings of the same file", { skip: !WIN && "NTFS/Win32 path rules" }, async () => {
    const cwd = await project({});
    for (const rel of [".claude/canonkit.json:stream", ".claude/canonkit.json.", ".claude/canonkit.json ", ".claude::$INDEX_ALLOCATION/canonkit.json"]) {
      assert.equal(edit(cwd, rel, "{}"), "ask", JSON.stringify(rel));
    }
  });

  test("include matches however the path is spelled", async () => {
    const cwd = await project({ highRisk: { include: ["src/payments/**"] } });
    for (const p of ["./src/./payments/a.ts", "src//payments/a.ts", "src\\payments\\a.ts", "src/x/../payments/a.ts"]) {
      assert.equal(inProject(cwd, "Edit", { file_path: p, new_string: "x" }), "ask", p);
    }
    assert.equal(inProject(cwd, "Bash", { command: "echo x > ./src/./payments/a.ts" }), "ask");
  });

  test("MSYS paths (Git Bash on Windows) are the same files", { skip: !WIN && "MSYS is Windows-only" }, async () => {
    const cwd = await project({ highRisk: { include: ["src/payments/**"] } });
    const msys = cwd.replace(/^([A-Za-z]):/, (_, d) => "/" + d.toLowerCase()).replace(/\\/g, "/");
    assert.equal(inProject(cwd, "Edit", { file_path: msys + "/src/payments/a.ts", new_string: "x" }), "ask");
    assert.equal(inProject(cwd, "Bash", { command: `echo x > ${msys}/src/payments/a.ts` }), "ask");
    const { normalizePath } = hook();
    assert.equal(normalizePath("/c/Users/x/../y/a.ts"), "C:/Users/y/a.ts");
    assert.equal(normalizePath("/cygdrive/d/repo/a.ts"), "D:/repo/a.ts");
  });

  test("`..` stops at a drive root, and long-path prefixes are the same file", { skip: !WIN && "drive paths" }, async () => {
    const cwd = await project({ highRisk: { include: ["src/payments/**"] }, perfBudgets: ["config/budgets.yml"] });
    const noDrive = cwd.replace(/\\/g, "/").slice(2); // /Users/.../project-x
    const msys = "/" + cwd[0].toLowerCase() + "/.." + noDrive;
    for (const p of [`C:/..${noDrive}/src/payments/a.ts`.replace(/^C/, cwd[0]), `${msys}/src/payments/a.ts`, `\\\\?\\${cwd}\\src\\payments\\a.ts`]) {
      assert.equal(inProject(cwd, "Edit", { file_path: p, new_string: "x" }), "ask", p);
    }
    assert.equal(inProject(cwd, "Bash", { command: `echo x > ${msys}/src/payments/a.ts` }), "ask");
    assert.equal(inProject(cwd, "Edit", { file_path: `${msys}/config/budgets.yml`, new_string: "x" }), "ask");
  });

  test("normalizePath: one form for every spelling", () => {
    const { normalizePath: n } = hook();
    assert.equal(n("C:/a/../.."), "C:/");
    assert.equal(n("/ab/../../b"), "/b"); // not /a/: in Git Bash that is drive A
    assert.equal(n("./src/./a//b.ts"), "src/a/b.ts");
    assert.equal(n("src\\a\\..\\b.ts"), "src/b.ts");
    assert.equal(n("a/b/../../../c.ts"), "../c.ts");
    assert.equal(n(".claude/canonkit.json::$DATA"), ".claude/canonkit.json");
    assert.equal(n("C:\\repo\\x.ts"), "C:/repo/x.ts");
  });
});

describe("noise and secret paths", () => {
  const edit0 = (fp) => decide(pre("Edit", { file_path: fp, new_string: "x" }));

  test("noise folders are whole segments, not substrings", () => {
    for (const fp of ["src/distribution/auth/x.ts", "src/buildings/auth/x.ts", "src/coverage-report/auth.ts", "src/rebuild/auth.ts"]) {
      assert.equal(edit0(fp), "ask", fp);
    }
    for (const fp of ["dist/auth/x.js", "node_modules/pkg/auth.js", "build/auth.js", "app/.next/server/auth.js", "coverage/auth.ts.html"]) {
      assert.equal(edit0(fp), "allow", fp);
    }
  });

  test("key and credential files are secret paths (a new default gate)", async () => {
    const files = ["certs/server.pem", "tls/server.key", "certs/client.p12", "certs/client.pfx", "home/.ssh/id_rsa",
      "id_ed25519", ".ssh/id_ecdsa", "kubeconfig", "home/.kube/config", ".pgpass", "infra/prod.tfvars", "infra/terraform.tfstate"];
    for (const fp of files) assert.equal(edit0(fp), "ask", fp);
    const cwd = await project({ highRisk: { exclude: ["certs/**", "infra/**", "*.pem", "kubeconfig"] } });
    for (const rel of ["certs/server.pem", "infra/prod.tfvars", "kubeconfig"]) assert.equal(edit(cwd, rel), "ask", rel);
  });

  test("their public or ordinary neighbours are not", () => {
    for (const fp of ["home/.ssh/id_rsa.pub", "src/keyboard.ts", "src/monkey.ts", "src/api.key.ts", "infra/main.tf"]) {
      assert.equal(edit0(fp), "allow", fp);
    }
  });
});

describe("config lookup", () => {
  test("a session in a subfolder finds the project's config, and paths are relative to it", async () => {
    const root = await project({ highRisk: { exclude: ["src/domain/contracts/**"] } });
    const sub = path.join(root, "packages", "web");
    await mkdir(sub, { recursive: true });
    assert.equal(inProject(sub, "Edit", { file_path: root + "/src/domain/contracts/x.ts", new_string: "x" }), "allow");
    assert.equal(inProject(sub, "Bash", { command: "echo x > ../../src/domain/contracts/x.ts" }), "allow");
    assert.equal(inProject(sub, "Bash", { command: "echo x > src/domain/contracts/x.ts" }), "ask", "relative to the session, not the root");
  });

  test("CLAUDE_PROJECT_DIR names the project when no config is found from cwd", async () => {
    const root = await project({ highRisk: { exclude: ["src/domain/contracts/**"] } });
    const elsewhere = await project();
    const fp = root + "/src/domain/contracts/x.ts";
    assert.equal(inProject(elsewhere, "Edit", { file_path: fp, new_string: "x" }), "ask");
    assert.equal(inProject(elsewhere, "Edit", { file_path: fp, new_string: "x" }, "CONFIG", { CLAUDE_PROJECT_DIR: root }), "allow");
  });

  test("a worktree session uses the worktree's config even with CLAUDE_PROJECT_DIR on the main checkout", async () => {
    // Parallel writers get a worktree; relative to the main checkout their
    // anchored include globs would never match.
    const config = { highRisk: { include: ["src/payments/**"] } };
    const root = await project(config);
    const wt = path.join(root, ".claude", "worktrees", "w1");
    await mkdir(path.join(wt, ".claude"), { recursive: true });
    await writeFile(path.join(wt, ".claude", "canonkit.json"), JSON.stringify(config));
    assert.equal(inProject(wt, "Edit", { file_path: wt + "/src/payments/a.ts", new_string: "x" }, "CONFIG", { CLAUDE_PROJECT_DIR: root }), "ask");
  });

  // Bounded at CLAUDE_PROJECT_DIR when cwd is inside it (Archie, round 3): a
  // config in a folder above the repo would change gating from outside it and
  // move the root every relative path is taken from.
  const where = (cwd, projectDir) => {
    const { root, file, exclude } = hook().projectConfig(cwd, projectDir);
    return { root: path.resolve(root), file: file && path.resolve(file), exclude: exclude.length };
  };
  const cfgAt = async (dir, config = { highRisk: { exclude: ["src/domain/contracts/**"] } }) => {
    await mkdir(path.join(dir, ".claude"), { recursive: true });
    await writeFile(path.join(dir, ".claude", "canonkit.json"), JSON.stringify(config));
  };

  test("a config above the project dir is ignored when cwd is inside it", async () => {
    const outer = await mkdtemp(path.join(HOME, "outer-"));
    await cfgAt(outer);
    const repo = path.join(outer, "repo");
    const sub = path.join(repo, "packages", "web");
    await mkdir(sub, { recursive: true });
    assert.deepEqual(where(sub, repo), { root: repo, file: path.join(repo, ".claude", "canonkit.json"), exclude: 0 });
    assert.equal(inProject(sub, "Edit", { file_path: repo + "/src/domain/contracts/x.ts", new_string: "x" }, "CONFIG", { CLAUDE_PROJECT_DIR: repo }), "ask");
  });

  test("the project dir's own config is checked before the walk stops", async () => {
    const outer = await mkdtemp(path.join(HOME, "outer-"));
    await cfgAt(outer, {});
    const repo = path.join(outer, "repo");
    await cfgAt(repo);
    const sub = path.join(repo, "src");
    await mkdir(sub, { recursive: true });
    assert.deepEqual(where(sub, repo), { root: repo, file: path.join(repo, ".claude", "canonkit.json"), exclude: 1 });
  });

  test("cwd at the project dir itself is bounded there", async () => {
    const outer = await mkdtemp(path.join(HOME, "outer-"));
    await cfgAt(outer);
    const repo = path.join(outer, "repo");
    await mkdir(repo, { recursive: true });
    assert.deepEqual(where(repo, repo + path.sep), { root: repo, file: path.join(repo, ".claude", "canonkit.json"), exclude: 0 });
  });

  test("a project file outside a nested config's folder fails closed, whatever its ancestors are named", async () => {
    // Outside the nested root a path stays absolute, and a `build/` above the
    // project read as a noise folder let even .env through (Gard, round 3).
    const base = await mkdtemp(path.join(HOME, "outer-"));
    const repo = path.join(base, "build", "fixtures", "Proj");
    const sub = path.join(repo, "vendor", "sub");
    await cfgAt(repo, {});
    await cfgAt(sub, {});
    for (const rel of [".env", "src/auth/login.ts", "src/secret.ts", "db/migrations/001.sql"]) {
      assert.equal(inProject(sub, "Edit", { file_path: repo + "/" + rel, new_string: "x" }, "CONFIG", { CLAUDE_PROJECT_DIR: repo }), "ask", rel);
    }
    assert.equal(inProject(sub, "Edit", { file_path: repo + "/perf-budget.json", new_string: "x" }, "CONFIG", { CLAUDE_PROJECT_DIR: repo }), "ask", "perf defaults too");
    assert.equal(inProject(repo, "Edit", { file_path: repo + "/src/auth/login.ts", new_string: "x" }, "CONFIG", { CLAUDE_PROJECT_DIR: repo }), "ask");
  });

  test("an absolute in-project test or noise path is still skipped", async () => {
    // Edit always hands an absolute path; it is the relative form, inside the
    // config's folder, that the noise and test skips read (Quinn, round 3).
    const cwd = await project({});
    const soft = "password = '" + "hunter2hunter2" + "'";
    const forms = [cwd];
    if (WIN) forms.push(cwd.replace(/^([A-Za-z]):/, (_, d) => "/" + d.toLowerCase()).replace(/\\/g, "/"));
    for (const base of forms) {
      for (const rel of ["src/auth.test.ts", "node_modules/p/auth.js"]) {
        assert.equal(inProject(cwd, "Edit", { file_path: base + "/" + rel, new_string: "x" }), "allow", base + "/" + rel);
      }
      assert.equal(inProject(cwd, "Edit", { file_path: base + "/src/a.test.ts", new_string: soft }), "allow", "soft secret in a test file");
    }
    assert.equal(inProject(cwd, "Edit", { file_path: cwd + "/src/a.ts", new_string: soft }), "ask", "control");
  });

  test("an MSYS-style project dir (/c/...) still bounds the walk", { skip: !WIN && "win32 only" }, async () => {
    const outer = await mkdtemp(path.join(HOME, "outer-"));
    await cfgAt(outer);
    const repo = path.join(outer, "repo");
    const sub = path.join(repo, "src");
    await mkdir(sub, { recursive: true });
    const msys = repo.replace(/^([A-Za-z]):/, (_, d) => "/" + d.toLowerCase()).replace(/\\/g, "/");
    assert.equal(where(sub, msys).exclude, 0, msys);
    assert.equal(where(sub, msys).root.toLowerCase(), repo.toLowerCase());
  });

  // Documents the contract only: a sibling's walk never reaches the project dir,
  // so a prefix bug in the containment check could not show here.
  test("a sibling folder sharing the project dir's prefix is outside it", async () => {
    const outer = await mkdtemp(path.join(HOME, "outer-"));
    await cfgAt(outer);
    const repo = path.join(outer, "repo");
    const other = path.join(outer, "repo-other", "src");
    await mkdir(repo, { recursive: true });
    await mkdir(other, { recursive: true });
    assert.equal(where(other, repo).root, outer, "not bounded: the walk goes on up");
  });

  test("cwd outside the project dir: its own config wins, else the project dir's", async () => {
    const repo = await project({ highRisk: { exclude: ["a/**"] } });
    const own = await project({ highRisk: { exclude: ["b/**", "c/**"] } });
    const bare = await project();
    assert.deepEqual(where(own, repo), { root: own, file: path.join(own, ".claude", "canonkit.json"), exclude: 2 });
    assert.deepEqual(where(bare, repo), { root: repo, file: path.join(repo, ".claude", "canonkit.json"), exclude: 1 });
  });

  // The nearest file applies whole; the project file's additive lists apply as
  // well (Archie A1, Gard P2): a nested folder can only add gates, never shed the
  // project's. Its own exclude still silences only its own heuristics.
  test("a nested config applies whole, relative to its own folder", async () => {
    const repo = await project({ highRisk: { include: ["src/payments/**"], exclude: ["a/**"] } });
    const demo = path.join(repo, "examples", "demo");
    await cfgAt(demo, { highRisk: { exclude: ["src/domain/contracts/**"] } });
    const { root, include, exclude, rel } = hook().projectConfig(demo, repo);
    assert.equal(path.resolve(root), demo);
    assert.equal(include.length, 0, "the project's include is not pushed into the nested one");
    assert.equal(exclude.length, 1);
    assert.equal(rel(demo + "/src/domain/contracts/x.ts"), "src/domain/contracts/x.ts");
    assert.equal(inProject(demo, "Edit", { file_path: demo + "/src/domain/contracts/x.ts", new_string: "x" }, "CONFIG", { CLAUDE_PROJECT_DIR: repo }), "allow");
  });

  test("under a nested config, the project's include and perfBudgets apply too, relative to the project", async () => {
    const repo = await project({ highRisk: { include: ["src/payments/**"] }, perfBudgets: ["ops/limits.yml"] });
    const demo = path.join(repo, "examples", "demo");
    await cfgAt(demo, {});
    const env = { CLAUDE_PROJECT_DIR: repo };
    const at = (fp) => inProject(demo, "Edit", { file_path: fp, new_string: "x" }, "CONFIG", env);
    assert.equal(at(repo + "/src/payments/charge.ts"), "ask");
    assert.equal(at(repo + "/ops/limits.yml"), "ask", "perfBudgets");
    assert.equal(at(demo + "/src/payments/charge.ts"), "allow", "the project's globs are anchored at the project");
    assert.equal(inProject(demo, "Bash", { command: "echo x > ../../src/payments/charge.ts" }, "CONFIG", env), "ask", "shell writes too");
    const { project: p } = hook().projectConfig(demo, repo);
    assert.equal(path.resolve(p.root), repo);
    assert.equal(path.resolve(p.file), path.join(repo, ".claude", "canonkit.json"));
    assert.deepEqual([p.include.length, p.exclude.length, p.perf.length], [1, 0, 1]);
    assert.equal(p.rel(repo + "/src/payments/charge.ts"), "src/payments/charge.ts");
  });

  test("the nested exclude never cancels the project's include", async () => {
    const repo = await project({ highRisk: { include: ["examples/demo/src/domain/contracts/**"] } });
    const demo = path.join(repo, "examples", "demo");
    await cfgAt(demo, { highRisk: { exclude: ["src/domain/contracts/**"] } });
    assert.equal(inProject(demo, "Edit", { file_path: demo + "/src/domain/contracts/x.ts", new_string: "x" }, "CONFIG", { CLAUDE_PROJECT_DIR: repo }), "ask");
  });

  test("the project's exclude never reaches a nested folder, and its ignored entries are kept", async () => {
    const repo = await project({ highRisk: { exclude: ["examples/demo/src/domain/contracts/**", "**"] } });
    const demo = path.join(repo, "examples", "demo");
    await cfgAt(demo, {});
    assert.equal(inProject(demo, "Edit", { file_path: demo + "/src/domain/contracts/x.ts", new_string: "x" }, "CONFIG", { CLAUDE_PROJECT_DIR: repo }), "ask");
    const { project: p } = hook().projectConfig(demo, repo);
    assert.deepEqual(p.exclude, []);
    assert.ok(p.ignored.some((i) => i.where === "highRisk.exclude[1]"), JSON.stringify(p.ignored));
  });

  test("cfg.project is null unless the nearest config sits strictly below a project dir with its own file", async () => {
    const repo = await project({ highRisk: { include: ["src/payments/**"] } });
    const sub = path.join(repo, "src");
    await mkdir(sub, { recursive: true });
    assert.equal(hook().projectConfig(sub, repo).project, null, "the nearest file is the project's own");
    assert.equal(hook().projectConfig(repo, repo).project, null);
    const bare = await project();
    const nested = path.join(bare, "pkg");
    await cfgAt(nested, {});
    assert.equal(hook().projectConfig(nested, bare).project, null, "the project dir has no file");
    const own = await project({});
    assert.equal(hook().projectConfig(own, repo).project, null, "cwd outside the project dir");
    assert.equal(hook().projectConfig(nested).project, null, "no project dir at all");
  });

  test("no config anywhere: the root is the project dir, not cwd", async () => {
    const repo = await project();
    const sub = path.join(repo, "src", "lib");
    await mkdir(sub, { recursive: true });
    assert.equal(where(sub, repo).root, repo);
    assert.equal(hook().projectConfig(sub, repo).rel(sub + "/a.ts"), "src/lib/a.ts");
  });

  test("on Windows, a project dir differing only in case still bounds the walk", { skip: !WIN && "win32 only" }, async () => {
    const outer = await mkdtemp(path.join(HOME, "outer-"));
    await cfgAt(outer);
    const repo = path.join(outer, "repo");
    const sub = path.join(repo, "src");
    await mkdir(sub, { recursive: true });
    assert.equal(where(sub, repo.toUpperCase()).exclude, 0);
    assert.equal(where(sub, repo.toUpperCase()).root.toLowerCase(), repo.toLowerCase());
  });

  test("the walk stops below home: ~/.claude/canonkit.json is not a project config", async () => {
    const cfg = path.join(HOME, ".claude", "canonkit.json");
    await writeFile(cfg, JSON.stringify({ highRisk: { exclude: ["src/domain/contracts/**"] } }));
    try {
      const cwd = path.join(HOME, "work", "app");
      await mkdir(cwd, { recursive: true });
      assert.equal(inProject(cwd, "Edit", { file_path: cwd + "/src/domain/contracts/x.ts", new_string: "x" }), "ask");
    } finally { await rm(cfg, { force: true }); }
  });
});

describe("the pre-rename forwarder keeps gating", () => {
  // settings.json (global or a project's) may still run meu-time-hook.js, which
  // install turns into a forwarder. If importing the hook stopped running it,
  // every gate would turn off with no sign.
  for (const [name, body] of [
    ["the current forwarder (calls run())", "require('./canonkit-hook.js').run();\n"],
    ["an older forwarder that only require()s", "require('./canonkit-hook.js');\n"],
  ]) {
    test(name, async () => {
      const dir = await project();
      await copyFile(HOOK, path.join(dir, "canonkit-hook.js"));
      await writeFile(path.join(dir, "package.json"), '{ "type": "commonjs" }');
      await writeFile(path.join(dir, "meu-time-hook.js"), "// canonkit-forwarder\n" + body);
      const r = spawnSync(process.execPath, [path.join(dir, "meu-time-hook.js")], {
        input: JSON.stringify(pre("Bash", { command: "git commit -m x" })), encoding: "utf8", env: hookEnv(),
      });
      assert.equal(r.status, 0, r.stderr);
      assert.equal(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, "ask");
    });
  }
});

describe("log location (meu-time-activity -> canonkit-activity)", () => {
  // An upgrade must not lose a gated edit made just before it: the Stop gate
  // reads the old log until install has moved it.
  test("the Stop gate still sees a gate logged under the old directory", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "canonkit-legacy-"));
    try {
      const legacy = path.join(home, ".claude", "meu-time-activity");
      await mkdir(legacy, { recursive: true });
      await writeFile(path.join(legacy, "events.jsonl"),
        JSON.stringify({ ts: Date.now(), session: "LEGACY", event: "gate", kind: "high-risk-surface", file: "src/auth/x.ts" }) + "\n");
      const stop = () => runHook({ hook_event_name: "Stop", session_id: "LEGACY" }, { HOME: home, USERPROFILE: home });
      assert.equal(JSON.parse(stop().stdout).decision, "block");
      // A new event lands in the new directory; the old gate is still seen.
      runHook(pre("Agent", { subagent_type: "bob" }, "LEGACY"), { HOME: home, USERPROFILE: home });
      assert.ok(existsSync(path.join(home, ".claude", "canonkit-activity", "events.jsonl")));
      assert.equal(JSON.parse(stop().stdout).decision, "block");
    } finally { await rm(home, { recursive: true, force: true }); }
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
      path.join(HOME, ".claude", "canonkit-activity", "events.jsonl"),
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
  test("a gate already rotated into events.jsonl.1 still counts", async () => {
    // A rotation, or the meu-time log merge, can move this session's gate there.
    const home = await mkdtemp(path.join(os.tmpdir(), "canonkit-rotated-"));
    try {
      const dir = path.join(home, ".claude", "canonkit-activity");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "events.jsonl.1"),
        JSON.stringify({ ts: Date.now(), session: "ROTATED", event: "gate", kind: "high-risk-surface", file: "src/auth/x.ts" }) + "\n");
      const r = runHook({ hook_event_name: "Stop", session_id: "ROTATED" }, { HOME: home, USERPROFILE: home });
      assert.equal(JSON.parse(r.stdout).decision, "block");
    } finally { await rm(home, { recursive: true, force: true }); }
  });
  test("a flood of tool results rotates its own log, never the one the gate reads", async () => {
    // events.jsonl carries only low-volume events: if tool_result lines went
    // there, a tool-heavy session would rotate its own gate out of reach.
    const home = await mkdtemp(path.join(os.tmpdir(), "canonkit-flood-"));
    try {
      const dir = path.join(home, ".claude", "canonkit-activity");
      await mkdir(dir, { recursive: true });
      const events = JSON.stringify({ ts: Date.now(), session: "FLOOD", event: "gate", kind: "high-risk-surface", file: "src/auth/x.ts" }) + "\n";
      await writeFile(path.join(dir, "events.jsonl"), events);
      await writeFile(path.join(dir, "tool-results.jsonl"), JSON.stringify({ session: "pad", pad: "x".repeat(2.1 * 1024 * 1024) }) + "\n");
      const env = { HOME: home, USERPROFILE: home };
      const read = { hook_event_name: "PostToolUse", session_id: "FLOOD", cwd: home, tool_name: "Read", tool_input: { file_path: "x" },
        tool_response: { type: "text", file: { content: "x\n" } } };
      assert.equal(runHook(read, env).status, 0);
      assert.equal(runHook({ ...read, agent_id: "aflood1", agent_type: "bob" }, env).status, 0);
      assert.ok((await readFile(path.join(dir, "tool-results.jsonl.1"), "utf8")).includes('"pad"'), "the tool log rotated");
      const results = (await readFile(path.join(dir, "tool-results.jsonl"), "utf8")).trim().split("\n").map((l) => JSON.parse(l));
      assert.deepEqual(results.map((e) => [e.event, e.thread]), [["tool_result", "main"], ["tool_result", "subagent"]]);
      assert.equal(await readFile(path.join(dir, "events.jsonl"), "utf8"), events, "no tool_result in the gate's log");
      assert.ok(!existsSync(path.join(dir, "events.jsonl.1")));
      const r = runHook({ hook_event_name: "Stop", session_id: "FLOOD" }, env);
      assert.equal(JSON.parse(r.stdout).decision, "block");
    } finally { await rm(home, { recursive: true, force: true }); }
  });
  test("a reviewer dispatched AFTER the gate clears it", async () => {
    await seed({ ts: Date.now() + 60000, event: "agent_start", agent: "perry" });
    assert.equal(stop(), "allow");
  });
  test("the re-entry guard never blocks twice in one turn", () => {
    assert.equal(stop({ stop_hook_active: true }), "allow");
  });
});

describe("gate telemetry: the rule that matched, and the Stop gate's blocks", () => {
  // Without the rule, a false-positive rate can only be argued from a list of
  // paths; without the block line, what a rule costs in reviewer dispatches
  // cannot be counted at all.
  test("a high-risk gate names the rule that matched, and still asks", async () => {
    const cwd = await project({ highRisk: { include: ["src/billing/**"] } });
    const cases = {
      ".claude/canonkit.json": "config",
      "src/billing/charge.ts": "include",
      ".env.local": "secret-path",
      "prisma/schema.prisma": "strong",
      "src/auth/session.ts": "auth",
      "db/migrations/001_init.sql": "migration",
      "src/acl/rules.ts": "word",
      "src/lib/session/store.ts": "ambiguous",
    };
    for (const [rel, rule] of Object.entries(cases)) {
      const S = "RULE-" + rule;
      assert.equal(inProject(cwd, "Edit", { file_path: cwd + "/" + rel, new_string: "{}" }, S), "ask", rel);
      const gate = (await logged(S)).find((e) => e.kind === "high-risk-surface");
      assert.equal(gate && gate.rule, rule, rel);
    }
  });

  test("a shell write names the rule too", async () => {
    const cwd = await project();
    const S = "RULE-SHELL";
    assert.equal(inProject(cwd, "Bash", { command: "echo x > src/auth/x.ts" }, S), "ask");
    const gate = (await logged(S)).find((e) => e.kind === "high-risk-surface");
    assert.equal(gate && gate.rule, "auth");
  });

  test("a Stop gate block is logged once, with its file count and rules", async () => {
    const cwd = await project();
    const S = "DOD-LOG";
    inProject(cwd, "Edit", { file_path: cwd + "/src/auth/x.ts", new_string: "x" }, S);
    inProject(cwd, "Edit", { file_path: cwd + "/db/migrations/001.sql", new_string: "x" }, S);
    assert.equal(decide({ hook_event_name: "Stop", session_id: S }), "block");
    assert.equal(decide({ hook_event_name: "Stop", session_id: S, stop_hook_active: true }), "allow");
    const blocks = (await logged(S)).filter((e) => e.kind === "definition-of-done");
    assert.equal(blocks.length, 1, "the re-entered Stop logs nothing");
    assert.equal(blocks[0].files, 2);
    assert.deepEqual([...blocks[0].rules].sort(), ["auth", "migration"]);
  });

  test("a logged block never feeds the next Stop", async () => {
    await appendFile(activity("events.jsonl"),
      JSON.stringify({ ts: Date.now(), session: "DOD-ALONE", event: "gate", kind: "definition-of-done", files: 1, rules: ["auth"] }) + "\n");
    assert.equal(decide({ hook_event_name: "Stop", session_id: "DOD-ALONE" }), "allow");
  });
});

describe("definition-of-done gate: reviewer probes and resumed reviewers", () => {
  // Subagents share the parent's session id. A reviewer that probes the hook in a
  // scratch folder opens gates the parent then could never clear: its own
  // dispatch predates them. And a reviewer resumed by SendMessage after the last
  // edit is a review after the last edit (Gard G3/G4, Archie A3).
  const LOG = () => path.join(HOME, ".claude", "canonkit-activity", "events.jsonl");
  let repo;
  let n = 0;
  before(async () => { repo = await project(); });
  const session = () => `PROBE-${++n}`;
  const stopIn = (s) => decide({ hook_event_name: "Stop", session_id: s });
  const gatedEdit = (s, file, who = {}) =>
    decide({ ...pre("Edit", { file_path: file, new_string: "x" }, s), cwd: repo, ...who }, { CLAUDE_PROJECT_DIR: repo });
  const sub = (type) => ({ agent_id: `a${type}0001`, agent_type: type });
  const outside = () => path.join(HOME, "probe-scratch", "src", "auth", "login.ts");
  const inside = () => repo + "/src/auth/login.ts";
  const seed = (s, obj) => appendFile(LOG(), JSON.stringify({ session: s, ...obj }) + "\n");
  const send = (s, tool_input) => decide(pre("SendMessage", tool_input, s));
  const gates = async (s) => (await logged(s)).filter((e) => e.event === "gate");

  test("a reviewer's probe outside the project is skipped", async () => {
    const s = session();
    assert.equal(gatedEdit(s, outside(), sub("gard")), "ask", "the probe is still gated");
    const [g] = await gates(s);
    assert.deepEqual([g.agent_id, g.agent_type, g.in_project], ["agard0001", "gard", false]);
    assert.equal(stopIn(s), "allow");
  });

  test("a reviewer's shell write outside the project is skipped too; inside, it counts", async () => {
    const shell = (s, target) => decide(
      { ...pre("Bash", { command: `echo x > "${target}"` }, s), cwd: repo, ...sub("gard") }, { CLAUDE_PROJECT_DIR: repo });
    const out = session();
    assert.equal(shell(out, outside().replace(/\\/g, "/")), "ask");
    assert.equal((await gates(out))[0].in_project, false);
    assert.equal(stopIn(out), "allow");
    const inn = session();
    shell(inn, "src/auth/login.ts");
    assert.equal(stopIn(inn), "block");
  });

  test("a reviewer's edit inside the project counts", async () => {
    const s = session();
    gatedEdit(s, inside(), sub("quinn"));
    assert.equal((await gates(s))[0].in_project, true);
    assert.equal(stopIn(s), "block");
  });

  test("a non-reviewer subagent's edit outside the project counts", () => {
    const s = session();
    gatedEdit(s, outside(), sub("bob"));
    assert.equal(stopIn(s), "block");
  });

  test("a main thread started with --agent gard is not a subagent: its edit counts", async () => {
    const s = session();
    gatedEdit(s, outside(), { agent_type: "gard" });
    const [g] = await gates(s);
    assert.equal(g.agent_type, undefined, "agent_type is logged for subagents only");
    assert.equal(stopIn(s), "block");
  });

  test("a gate logged without in_project counts", async () => {
    const s = session();
    await seed(s, { ts: Date.now(), event: "gate", kind: "high-risk-surface", file: "x", agent_id: "a1", agent_type: "gard" });
    assert.equal(stopIn(s), "block");
  });

  test("a path under ~/.claude is never skipped", () => {
    const s = session();
    assert.equal(gatedEdit(s, path.join(HOME, ".claude", "credentials.json"), sub("gard")), "ask");
    assert.equal(stopIn(s), "block");
  });

  test("gardener is not Gard", async () => {
    const s = session();
    gatedEdit(s, outside(), sub("gardener"));
    assert.equal(stopIn(s), "block", "its probe is not a reviewer's");
    await seed(s, { ts: Date.now() + 60000, event: "agent_start", agent: "gardener" });
    assert.equal(stopIn(s), "block", "its dispatch is not a review");
  });

  test("a reviewer resumed by name after the last gate clears it", async () => {
    const s = session();
    await seed(s, { ts: 1, event: "agent_start", id: "tu-g", agent: "gard", name: "sec" });
    gatedEdit(s, inside());
    assert.equal(stopIn(s), "block");
    assert.equal(send(s, { to: "sec [a1b2c3]", message: "Re-check after the last edit." }), "allow");
    assert.equal(stopIn(s), "allow");
  });

  test("a reviewer resumed by agent id, through its launch or its end, clears it", async () => {
    // The end line names a non-reviewer: only its start's agent may decide.
    for (const [link, extra] of [["agent_launch", {}], ["agent_end", { agent: "bob" }]]) {
      const s = session();
      await seed(s, { ts: 1, event: "agent_start", id: `tu-${link}`, agent: "quinn" });
      await seed(s, { ts: 2, event: link, id: `tu-${link}`, agent_id: `aid-${link}`, ...extra });
      gatedEdit(s, inside());
      send(s, { to: `aid-${link}`, message: "again" });
      assert.equal(stopIn(s), "allow", link);
    }
  });

  test("the latest start with a name decides who it is", async () => {
    for (const [first, last, expected] of [["gard", "bob", "block"], ["bob", "gard", "allow"]]) {
      const s = session();
      await seed(s, { ts: 1, event: "agent_start", id: "t1", agent: first, name: "rev" });
      await seed(s, { ts: 2, event: "agent_start", id: "t2", agent: last, name: "rev" });
      gatedEdit(s, inside());
      send(s, { to: "rev", message: "again" });
      assert.equal(stopIn(s), expected, `${first} then ${last}`);
    }
  });

  test("resuming a non-reviewer, or one whose name is a reviewer's, does not count", async () => {
    for (const [agent, name] of [["bob", "impl"], ["bob", "gard"]]) {
      const s = session();
      await seed(s, { ts: 1, event: "agent_start", id: "t1", agent, name });
      gatedEdit(s, inside());
      send(s, { to: name, message: "again" });
      assert.equal(stopIn(s), "block", `${agent} named ${name}`);
    }
  });

  test("an unknown target, main, or another session's agent does not count", async () => {
    const s = session();
    await seed(`${s}-OTHER`, { ts: 1, event: "agent_start", id: "t1", agent: "gard", name: "sec" });
    gatedEdit(s, inside());
    for (const to of ["nobody", "main", "sec"]) send(s, { to, message: "again" });
    assert.equal(stopIn(s), "block");
  });

  test("a resume before the last gate does not count", async () => {
    const s = session();
    await seed(s, { ts: 1, event: "agent_start", id: "t1", agent: "gard", name: "sec" });
    send(s, { to: "sec", message: "look" });
    gatedEdit(s, inside());
    assert.equal(stopIn(s), "block");
  });

  test("a resume with no message does not count", async () => {
    const s = session();
    await seed(s, { ts: 1, event: "agent_start", id: "t1", agent: "gard", name: "sec" });
    gatedEdit(s, inside());
    for (const message of ["", "   ", { type: "shutdown_request" }, undefined]) send(s, { to: "sec", message });
    assert.equal(stopIn(s), "block");
  });

  test("SendMessage is always allowed and logs who and whether, never what", async () => {
    const s = session();
    const r = runHook(pre("SendMessage", { to: "sec", message: "CONTENT-" + "x".repeat(10), summary: "SUMMARY-TEXT" }, s));
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
    const evs = await logged(s);
    assert.equal(evs.length, 1);
    assert.deepEqual([evs[0].event, evs[0].to, evs[0].has_message], ["agent_resume", "sec", true]);
    assert.ok(!JSON.stringify(evs).includes("CONTENT-") && !JSON.stringify(evs).includes("SUMMARY-TEXT"));
  });

  test("agent_start logs the agent's name; names, targets and tasks are capped", async () => {
    const s = session();
    decide(pre("Agent", { subagent_type: "gard", name: "n".repeat(5000), description: "d".repeat(5000) }, s));
    send(s, { to: "t".repeat(5000), message: "m" });
    const [start, resume] = await logged(s);
    assert.match(start.name, /^n+$/);
    for (const v of [start.name, start.task, resume.to]) assert.ok(v.length > 0 && v.length <= 200, String(v.length));
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
    assert.ok(prompt("CTX-ENV", f, { CANONKIT_CONTEXT_BANDS: "20000" }));
    assert.equal(prompt("CTX-OFF", f, { CANONKIT_CONTEXT_BANDS: "off" }), null);
  });

  test("logs a context-size gate that the definition-of-done gate ignores", async () => {
    const f = await transcript("ctx-log", [asst(110000)]);
    prompt("CTX-LOG", f);
    const log = await readFile(path.join(HOME, ".claude", "canonkit-activity", "events.jsonl"), "utf8");
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

/**
 * Fixtures shared by the cli-*.test.js files (the installer's contract tests,
 * split by area so Node runs them in parallel). Each test file is its own
 * process, so each gets its own sandbox.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { runCli, writeCommand } from "./cli-harness.js";

export const CORE = ["archie", "bob", "gard", "perry", "pipe", "pixie", "quinn", "scott", "spencer", "virgo"];
// What --wire-hooks appends to opencode.json `permissions`, in order.
export const OC_ASKS = [
  { action: "shell", resource: "git commit *", effect: "ask" },
  { action: "shell", resource: "git push *", effect: "ask" },
];
export const SPECIALISTS = ["dana", "echo", "iris", "maya", "nova"];

// Canonical, because the CLI prints realpaths (doctor's config root, say): on
// macOS tmpdir is under /var -> /private/var, on a Windows runner an 8.3 name.
// A test about a path reached through a link builds that link on purpose.
let sandbox;
function sandboxRoot() {
  if (!sandbox) {
    sandbox = realpathSync.native(mkdtempSync(path.join(os.tmpdir(), "canonkit-test-")));
    process.on("exit", () => rmSync(sandbox, { recursive: true, force: true }));
  }
  return sandbox;
}

/** A fresh HOME and a fresh project directory, isolated per test. */
export async function scratch(name) {
  const root = path.join(sandboxRoot(), name);
  const home = path.join(root, "home");
  const project = path.join(root, "project");
  await mkdir(home, { recursive: true });
  await mkdir(project, { recursive: true });
  return { root, home, project };
}

export function run(args, { home, cwd, env = {}, compact = false }) {
  // The tests read the detailed steps; install's default is a short summary (tested separately).
  const argv = (args[0] === "install" || args[0] === "doctor") && !compact && !args.includes("--verbose") ? [...args, "--verbose"] : args;
  return runCli(argv, { home, cwd, env });
}

/**
 * The env for a PATH holding only an `opencode` that prints `version` for
 * --version (null: no opencode at all). --wire-hooks with --opencode reads the
 * version, and the developer's own OpenCode must not decide a test.
 */
export async function opencodeOnPath(root, version) {
  const bin = path.join(root, "oc-bin");
  await mkdir(bin, { recursive: true });
  if (version !== null) {
    const js = path.join(bin, "opencode-version.cjs");
    await writeFile(js, `process.stdout.write(${JSON.stringify(`${version}\n`)});\n`);
    await writeCommand(bin, "opencode", js);
  }
  return { PATH: bin };
}

export const read = (p) => readFile(p, "utf8");

// Every file under a folder with its bytes: what "wrote nothing" and "is
// read-only" are checked against.
export async function snapshot(dir) {
  const out = {};
  for (const e of await readdir(dir, { withFileTypes: true, recursive: true })) {
    const p = path.join(e.parentPath ?? e.path, e.name);
    if (e.isFile()) out[path.relative(dir, p).split(path.sep).join("/")] = await read(p);
  }
  return out;
}

// The command install writes into hooks.json for a Codex home.
export const codexCommand = (home, codexHome = path.join(home, ".codex")) =>
  `node "${path.join(codexHome, "canonkit", "canonkit-codex.js").split(path.sep).join("/")}"`;

// The harness sets CLAUDE_PROJECT_DIR for every command it runs, this suite
// included: a test that means one passes it explicitly.
export function runIn(args, { home, cwd, env = {} }) {
  const argv = args[0] === "doctor" && !args.includes("--verbose") ? [...args, "--verbose"] : args;
  return runCli(argv, { home, cwd, env: "CLAUDE_PROJECT_DIR" in env ? env : { ...env, CLAUDE_PROJECT_DIR: undefined } });
}

export const REQUIRED = {
  PreToolUse: "Edit|Write|MultiEdit|NotebookEdit|Bash|PowerShell|Agent|Task|SendMessage",
  PostToolUse: "Agent|Task|Read|Grep|Glob|Bash|PowerShell",
  SubagentStop: null,
  UserPromptSubmit: null,
  Stop: null,
};
export const claudeDir = (home, ...p) => path.join(home, ".claude", ...p);
export const settingsOf = async (home, f = "settings.json") => JSON.parse(await read(claudeDir(home, f)));
export const commandsIn = (entries = []) => entries.flatMap((e) => (e.hooks ?? []).map((h) => h.command));
export const ours = (cmd) => /canonkit-hook\.js|meu-time-hook\.js/.test(cmd ?? "");
export const backups = async (home) => (await readdir(claudeDir(home))).filter((f) => /^settings\.json\.canonkit-.*\.bak$/.test(f));
export const FORWARDER = (home) => claudeDir(home, "hooks", "meu-time-hook.js");
export const legacyEntry = (matcher) => ({ ...(matcher ? { matcher } : {}), hooks: [{ type: "command", command: "node ~/.claude/hooks/meu-time-hook.js" }] });

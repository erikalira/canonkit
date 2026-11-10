import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VALIDATOR = path.join(REPO, "scripts", "validate.mjs");
const { checkBashScript } = await import(new URL("../scripts/validate.mjs", import.meta.url));
const run = (args, env = process.env) => spawnSync(process.execPath, [VALIDATOR, ...args], {
  cwd: REPO,
  env,
  encoding: "utf8",
  timeout: 60000,
});

test("portable validation runs without Bash and reports partial coverage", () => {
  const result = run(["--portable", "--quiet"], { ...process.env, CANONKIT_BASH: "not-a-bash-interpreter" });
  assert.match(result.stderr, /Bash syntax checks not run in portable mode/);
  const output = result.stdout + result.stderr;
  assert.match(output, /Coverage: PARTIAL \(Bash syntax validation was not run\)/);
  assert.doesNotMatch(output, /scripts\/(?:add-specialist|install|validate)\.sh syntax/);
});

test("full validation fails explicitly when Bash is unavailable", () => {
  const result = run(["--full", "--quiet"], { ...process.env, CANONKIT_BASH: "not-a-bash-interpreter" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Bash interpreter not found or not executable/);
});

test("validation help describes portable and full modes", () => {
  const result = run(["--help"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /validate:portable/);
  assert.match(result.stdout, /validate:full/);
});

test("full validation sends Bash source over stdin instead of passing Windows paths", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "canonkit-validate-bash-"));
  const file = path.join(directory, "script with spaces.sh");
  const source = "set -euo pipefail\nprintf '%s\\n' ok\n";
  writeFileSync(file, source);
  const calls = [];
  const messages = [];
  try {
    checkBashScript(
      { pass: (message) => messages.push(["pass", message]), fail: (message) => messages.push(["fail", message]) },
      { command: "bash" },
      file,
      (command, args, options) => {
        calls.push({ command, args, input: options.input });
        return { status: 0, stderr: "" };
      },
    );
    assert.deepEqual(calls, [{ command: "bash", args: ["-n"], input: source }]);
    assert.deepEqual(messages, [["pass", "script with spaces.sh syntax"]]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

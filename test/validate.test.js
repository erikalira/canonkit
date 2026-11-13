import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

test("frontmatter validation requires a need level and rejects a vendor model label", async () => {
  const { validateFrontmatter } = await import(new URL("../scripts/validate.mjs", import.meta.url));
  const description = '"Use for a fixture agent that exists only to exercise the frontmatter validator. Not for real work."';
  const check = (front) => {
    const root = mkdtempSync(path.join(os.tmpdir(), "canonkit-validate-need-"));
    try {
      mkdirSync(path.join(root, "agents"));
      writeFileSync(path.join(root, "agents", "zed.md"), `---\nname: zed\ndescription: ${description}\ntier: core\n${front}---\n\nbody\n`);
      const messages = [];
      validateFrontmatter({ heading() {}, pass: (m) => messages.push(["pass", m]), warn: (m) => messages.push(["warn", m]), fail: (m) => messages.push(["fail", m]) }, root);
      return messages;
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  };
  assert.deepEqual(check("need: deep\n"), [["pass", "zed"]]);
  assert.deepEqual(check("model: opus\n"), [["fail", "zed: 'model: opus' is no longer accepted — replace it with need: light | standard | deep"]]);
  assert.deepEqual(check("need: deep\nmodel: opus\n")[0][0], "fail");
  assert.deepEqual(check(""), [["fail", "zed: need is 'missing' — expected light, standard, or deep"]]);
});

test("the README recommended security settings match the installer, and a hand edit is caught", async () => {
  const { readmeSecurityProblems } = await import(new URL("../scripts/validate.mjs", import.meta.url));
  const readme = readFileSync(path.join(REPO, "README.md"), "utf8");
  assert.deepEqual(await readmeSecurityProblems(readme), []);
  // allowRead is compared by presence only: other example values are fine.
  assert.deepEqual(await readmeSecurityProblems(readme.replace('"~/.local/share/pipx"', '"~/.local/pipx"')), []);

  const edits = [
    ['"allowUnsandboxedCommands": false', '"allowUnsandboxedCommands": true', /repository settings block differs/],
    ['"strictAllowlist": true', '"strictAllowlist": false', /user settings block differs/],
    ['"autoAllowBashIfSandboxed": true\n  }', '"autoAllowBashIfSandboxed": true,\n    "extra": true\n  }', /repository settings block differs/],
    ["a missing sandbox stops commands;", "a missing sandbox is fine;", /sandbox\.failIfUnavailable.*differs/],
    ["| `sandbox.enabled` | repository |", "| `sandbox.enabled` | user |", /sandbox\.enabled.*differs/],
  ];
  for (const broad of ['"~"', '"~/"', '"/home/user"', '"/"', '"~/.local/bin/../.."']) {
    const problems = await readmeSecurityProblems(readme.replace('"~/.local/share/pipx"', broad));
    assert.ok(problems.some((problem) => /broad or not a ~\/ subfolder/.test(problem)), `${broad}\n${problems.join("\n")}`);
  }
  for (const [from, to, expected] of edits) {
    assert.ok(readme.includes(from), from);
    const problems = await readmeSecurityProblems(readme.replace(from, to));
    assert.ok(problems.some((problem) => expected.test(problem)), `${from}\n${problems.join("\n")}`);
  }
  const rows = readme.split("\n").filter((line) => line.startsWith("| `sandbox.enabled`")).join("\n");
  assert.ok((await readmeSecurityProblems(readme.replace(rows, ""))).some((problem) => /no row for sandbox\.enabled/.test(problem)));
  assert.ok((await readmeSecurityProblems(readme.replace(rows, `${rows}\n| \`sandbox.extra\` | user | something |`))).some((problem) => /sandbox\.extra/.test(problem)));
  assert.ok((await readmeSecurityProblems("# no section")).some((problem) => /has no/.test(problem)));
});

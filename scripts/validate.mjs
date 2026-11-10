#!/usr/bin/env node
import { accessSync, constants, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const PYTHON_VALIDATOR = path.join(SCRIPT_DIR, "validate-python.py");

function parseArgs(args) {
  const options = { mode: "portable", quiet: false, help: false };
  let selectedMode;
  for (const arg of args) {
    if (arg === "--quiet" || arg === "-q") options.quiet = true;
    else if (arg === "--portable" || arg === "--full") {
      const mode = arg === "--full" ? "full" : "portable";
      if (selectedMode && selectedMode !== mode) throw new Error("Choose either --portable or --full, not both.");
      selectedMode = mode;
      options.mode = mode;
    }
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log([
    "Validate the CanonKit repository.",
    "",
    "  npm run validate           portable checks (Bash syntax check not run)",
    "  npm run validate:portable  same as npm run validate",
    "  npm run validate:full      all checks, including bash -n",
    "",
    "Options: --portable, --full, --quiet, --help",
    "Python 3.11+ and Node.js are required. Full validation also requires Bash.",
  ].join("\n"));
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd ?? REPO_ROOT,
    env: options.env ?? process.env,
    encoding: "utf8",
    input: options.input,
    windowsHide: true,
    timeout: options.timeout,
  });
}

function findPython() {
  const configured = process.env.CANONKIT_PYTHON || process.env.PYTHON;
  const candidates = configured
    ? [{ command: configured, args: [] }]
    : process.platform === "win32"
      ? [
          { command: "python", args: [] },
          { command: "py", args: ["-3"] },
          { command: "python3", args: [] },
        ]
      : [
          { command: "python3", args: [] },
          { command: "python", args: [] },
        ];
  const diagnostics = [];

  for (const candidate of candidates) {
    const result = run(candidate.command, [
      ...candidate.args,
      "-c",
      "import ast,sys,tomllib; print(f'{sys.version_info.major}.{sys.version_info.minor}')",
    ]);
    if (result.error) {
      diagnostics.push(`${candidate.command}: ${result.error.message}`);
      continue;
    }
    if (result.status !== 0) {
      diagnostics.push(`${candidate.command}: ${result.stderr.trim() || `exited ${result.status}`}`);
      continue;
    }
    const version = /^(\d+)\.(\d+)$/.exec(result.stdout.trim());
    if (!version) {
      diagnostics.push(`${candidate.command}: could not determine Python version`);
      continue;
    }
    const [, majorText, minorText] = version;
    const major = Number(majorText);
    const minor = Number(minorText);
    if (major < 3 || (major === 3 && minor < 11)) {
      diagnostics.push(`${candidate.command}: Python ${result.stdout.trim()} is older than 3.11`);
      continue;
    }
    return { ...candidate, version: result.stdout.trim() };
  }

  return {
    error: `Python 3.11+ with ast and tomllib is required; no usable interpreter was found.${diagnostics.length ? ` ${diagnostics.join("; ")}` : ""}`,
  };
}

function findBash() {
  const command = process.env.CANONKIT_BASH || "bash";
  const result = run(command, ["--version"]);
  if (result.error || result.status !== 0) {
    return { error: `Bash interpreter not found or not executable (${command}); full validation requires Bash.` };
  }
  return { command };
}

class Reporter {
  constructor(quiet) {
    this.quiet = quiet;
    this.failures = 0;
    this.warnings = 0;
    this.coverageGaps = 0;
  }

  heading(title) {
    if (!this.quiet) console.log(`\n${title}`);
  }

  pass(message) {
    if (!this.quiet) console.log(`  ok   ${message}`);
  }

  fail(message) {
    console.error(`  FAIL ${message}`);
    this.failures++;
  }

  warn(message, coverageGap = false) {
    console.warn(`  warn ${message}`);
    this.warnings++;
    if (coverageGap) this.coverageGaps++;
  }
}

function filesIn(directory, extension) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

function structuredOutput(reporter, label, stdout, stderr, status) {
  const lines = stdout.split(/\r?\n/).filter(Boolean);
  let sawFailure = false;
  for (const line of lines) {
    const match = /^(OK|FAIL|WARN)\t(.*)$/.exec(line);
    if (!match) {
      reporter.fail(`${label}: unexpected output: ${line}`);
      sawFailure = true;
      continue;
    }
    const [, kind, detail] = match;
    if (kind === "OK") reporter.pass(detail);
    else if (kind === "WARN") reporter.warn(detail);
    else {
      reporter.fail(detail);
      sawFailure = true;
    }
  }
  if (stderr.trim()) {
    reporter.fail(`${label}: ${stderr.trim()}`);
    sawFailure = true;
  }
  if (status !== 0 && !sawFailure) {
    reporter.fail(`${label}: exited with status ${status ?? "unknown"} without reporting a finding`);
    sawFailure = true;
  }
  if (lines.length === 0 && status === 0 && !stderr.trim()) {
    reporter.fail(`${label}: produced no validation result`);
  }
}

function runStructured(reporter, command, args, label, options = {}) {
  const result = run(command, args, options);
  if (result.error) {
    reporter.fail(`${label}: could not start ${command}: ${result.error.message}`);
    return;
  }
  structuredOutput(reporter, label, result.stdout, result.stderr, result.status);
}

function runPythonCheck(reporter, python, check, args = []) {
  runStructured(
    reporter,
    python.command,
    [...python.args, PYTHON_VALIDATOR, check, ...args],
    `Python ${check}`,
  );
}

function frontmatterField(lines, key, fullLine = false) {
  let active = false;
  for (const line of lines) {
    if (!active && line.replace(/\r$/, "") === "---") {
      active = true;
      continue;
    }
    if (active && line.replace(/\r$/, "") === "---") break;
    if (active && line.startsWith(`${key}:`)) {
      return fullLine ? line : line.trim().split(/\s+/)[1] ?? "";
    }
  }
  return "";
}

function validateFrontmatter(reporter) {
  reporter.heading("Frontmatter");
  for (const file of filesIn(path.join(REPO_ROOT, "agents"), ".md")) {
    const base = path.basename(file, ".md");
    const text = readFileSync(file, "utf8");
    const lines = text.split("\n");
    if (lines[0].replace(/\r$/, "") !== "---") {
      reporter.fail(`${base}: does not start with a frontmatter delimiter`);
      continue;
    }

    const name = frontmatterField(lines, "name");
    const description = frontmatterField(lines, "description", true);
    const model = frontmatterField(lines, "model");
    const tier = frontmatterField(lines, "tier");
    if (!name) reporter.fail(`${base}: no name in frontmatter`);
    else if (name !== base) reporter.fail(`${base}: frontmatter name is '${name}' — must match the filename`);
    else if (!description) reporter.fail(`${base}: no description in frontmatter`);
    else if (!model) reporter.fail(`${base}: no model in frontmatter — without it the runtime silently uses the session default`);
    else if (!["opus", "sonnet", "haiku"].includes(model)) reporter.fail(`${base}: model is '${model}' — expected opus, sonnet, or haiku`);
    else if (!["core", "specialist"].includes(tier)) reporter.fail(`${base}: tier is '${tier || "missing"}' — the installers derive the split from it`);
    else {
      const length = Buffer.byteLength(description, "utf8");
      if (length < 60) reporter.warn(`${base}: description is very short (${length} chars) — say what the agent owns`);
      else if (!/^description: "Use /.test(description)) reporter.fail(`${base}: description must open with "Use ..." — it is the delegation trigger`);
      else if (length >= 300) reporter.fail(`${base}: description is ${length} bytes — it loads on every turn; keep it under 300`);
      else if (!/ Not for /.test(description)) reporter.fail(`${base}: description needs a short 'Not for ...' routing boundary`);
      else reporter.pass(base);
    }
  }
}

function validateNodeSyntax(reporter) {
  for (const file of [
    "bin/cli.js",
    "bin/install-manifest.js",
    "bin/stack-packs.js",
    ...filesIn(path.join(REPO_ROOT, "hooks"), ".mjs"),
    ...filesIn(path.join(REPO_ROOT, "dashboard"), ".js"),
  ]) {
    const absolute = path.isAbsolute(file) ? file : path.join(REPO_ROOT, file);
    const result = run(process.execPath, ["--check", absolute]);
    if (result.error || result.status !== 0) {
      reporter.fail(`${path.relative(REPO_ROOT, absolute)}: syntax error${result.stderr.trim() ? `: ${result.stderr.trim()}` : ""}`);
    } else {
      reporter.pass(`${path.relative(REPO_ROOT, absolute)} parses`);
    }
  }
}

function validateHookExecution(reporter) {
  for (const hook of filesIn(path.join(REPO_ROOT, "hooks"), ".js")) {
    const home = mkdtempSync(path.join(os.tmpdir(), "canonkit-validate-hook-"));
    try {
      const result = run(process.execPath, [hook], {
        env: { ...process.env, HOME: home, USERPROFILE: home },
        input: JSON.stringify({ session_id: "validate", hook_event_name: "UserPromptSubmit" }),
      });
      if (result.error || result.status !== 0) {
        reporter.fail(`${path.relative(REPO_ROOT, hook)}: does not run — hooks fail open, so this silently disables every gate${result.error ? ` (${result.error.message})` : ""}`);
      } else {
        reporter.pass(`${path.relative(REPO_ROOT, hook)} runs`);
      }
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  }
}

async function validatePackage(reporter) {
  reporter.heading("npm package");
  validateNodeSyntax(reporter);
  validateHookExecution(reporter);

  const manifestPath = path.join(REPO_ROOT, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const shipped = new Set(manifest.files ?? []);
  for (const directory of ["bin", "agents", "reference", "hooks", "dashboard", "skills", "stack-packs", "tools"]) {
    if (!shipped.has(directory)) reporter.fail(`package.json files[] omits ${directory}/ — the published CLI would not find it`);
  }
  if (manifest.bin?.canonkit !== "bin/cli.js") reporter.fail("package.json bin does not point at bin/cli.js");
  if (!manifest.license) reporter.fail("package.json has no license");
  if (!manifest.repository?.url) reporter.fail("package.json has no repository url");
  reporter.pass(`package.json ships ${[...shipped].join(", ")}`);
  if (existsSync(path.join(REPO_ROOT, "LICENSE"))) reporter.pass("LICENSE present");
  else reporter.fail("no LICENSE — npm publishes the field, not the file");
}

async function validateCodex(reporter, python) {
  reporter.heading("Codex custom agents");
  const temporary = mkdtempSync(path.join(os.tmpdir(), "canonkit-codex-"));
  try {
    try {
      const cli = await import(pathToFileURL(path.join(REPO_ROOT, "bin/cli.js")).href);
      for (const agent of await cli.readAgents()) {
        writeFileSync(path.join(temporary, `${agent.name}.toml`), cli.codexAgent(agent));
      }
    } catch (error) {
      reporter.fail(`could not render Codex agents: ${error.message}`);
      return;
    }
    runPythonCheck(reporter, python, "toml", [temporary]);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

function gitResult(args) {
  return run("git", args);
}

function validateHygiene(reporter) {
  reporter.heading("Repository hygiene");
  const root = gitResult(["rev-parse", "--git-dir"]);
  if (root.error || root.status !== 0) {
    reporter.warn("not a git repository or git is unavailable — skipped git checks", true);
    return;
  }

  const whitespace = gitResult(["diff", "--check", "HEAD"]);
  if (whitespace.status === 0) reporter.pass("no whitespace errors in staged or unstaged changes");
  else {
    if (whitespace.stdout.trim()) console.error(whitespace.stdout.trim());
    if (whitespace.stderr.trim()) console.error(whitespace.stderr.trim());
    reporter.fail("git diff --check HEAD reports whitespace errors");
  }

  for (const directory of [".claude/agents", ".codex/agents", ".opencode/agents"]) {
    const ignored = gitResult(["check-ignore", "-q", `${directory}/probe`]);
    if (ignored.status === 0) reporter.pass(`${directory}/ is ignored`);
    else reporter.fail(`${directory}/ is not ignored — a test copy could be committed`);
  }

  const tracked = gitResult(["ls-files"]);
  if (tracked.status !== 0) {
    reporter.fail(`git ls-files failed: ${tracked.stderr.trim() || tracked.status}`);
    return;
  }
  const sensitive = tracked.stdout.split(/\r?\n/).filter((file) => /(^|\/)(\.env|.*\.token|.*\.secret|auth-profiles\.json|tokens\.json)$/i.test(file));
  if (sensitive.length) reporter.fail(`sensitive files are tracked: ${sensitive.join(" ")}`);
  else reporter.pass("no sensitive files tracked");
}

function checkBashScript(reporter, bash, file, execute = run) {
  const source = readFileSync(file, "utf8");
  const result = execute(bash.command, ["-n"], { input: source });
  if (result.error || result.status !== 0) {
    reporter.fail(`${path.basename(file)}: Bash syntax error${result.stderr?.trim() ? `: ${result.stderr.trim()}` : ""}`);
  } else {
    reporter.pass(`${path.basename(file)} syntax`);
  }
}

function validateShellScripts(reporter, mode, bash) {
  reporter.heading("Scripts");
  const scripts = filesIn(path.join(REPO_ROOT, "scripts"), ".sh");
  if (mode === "portable") {
    reporter.warn("Bash syntax checks not run in portable mode; run npm run validate:full.", true);
  } else {
    for (const file of scripts) checkBashScript(reporter, bash, file);
  }

  const pythonScripts = filesIn(path.join(REPO_ROOT, "scripts"), ".py");
  const python = runPythonForScripts(reporter);
  if (!python) return null;
  runPythonCheck(reporter, python, "syntax", pythonScripts);

  if (process.platform !== "win32") {
    for (const file of scripts) {
      try {
        accessSync(file, constants.X_OK);
        reporter.pass(`${path.basename(file)} executable`);
      } catch {
        reporter.warn(`${path.basename(file)} not executable (chmod +x)`);
      }
    }
  } else if (scripts.length) {
    const modes = gitResult(["ls-files", "--stage", "--", "scripts/*.sh"]);
    if (modes.status !== 0) {
      reporter.warn("could not read Git executable-bit metadata for shell scripts", true);
    } else {
      const trackedModes = new Map(modes.stdout.split(/\r?\n/).filter(Boolean).map((line) => {
        const match = /^(\d+)\s+\S+\s+\d+\t(.+)$/.exec(line);
        return match ? [match[2], match[1]] : [null, null];
      }).filter(([file]) => file));
      for (const file of scripts) {
        const relative = path.relative(REPO_ROOT, file).replaceAll(path.sep, "/");
        const modeBits = trackedModes.get(relative);
        if (!modeBits) reporter.warn(`${path.basename(file)} is untracked; executable bit cannot be checked on Windows`, true);
        else if (modeBits !== "100755") reporter.warn(`${path.basename(file)} is not marked executable in Git`);
        else reporter.pass(`${path.basename(file)} executable in Git`);
      }
    }
  }
  return python;
}

let cachedPython;
function runPythonForScripts(reporter) {
  if (cachedPython) return cachedPython;
  const python = findPython();
  if (python.error) {
    reporter.fail(python.error);
    return null;
  }
  cachedPython = python;
  reporter.pass(`Python ${python.version} with ast and tomllib`);
  return python;
}

async function validateStackPacks(reporter) {
  reporter.heading("Stack packs");
  try {
    const { validateStackPacks: validate } = await import(pathToFileURL(path.join(REPO_ROOT, "bin/stack-packs.js")).href);
    const cases = JSON.parse(readFileSync(path.join(REPO_ROOT, "evals/quality-cases.json"), "utf8")).cases;
    const ids = validate(REPO_ROOT, cases);
    reporter.pass(`${ids.length} project-only stack packs have valid metadata and quality cases`);
  } catch (error) {
    reporter.fail(error.message);
  }
}

async function validate(options) {
  const reporter = new Reporter(options.quiet);
  const bash = options.mode === "full" ? findBash() : null;
  if (bash?.error) {
    reporter.fail(bash.error);
    return 1;
  }
  const python = runPythonForScripts(reporter);
  if (!python) return 1;

  validateFrontmatter(reporter);

  reporter.heading("Structure");
  runPythonCheck(reporter, python, "structure");

  reporter.heading("Core / specialist split");
  runPythonCheck(reporter, python, "split");

  reporter.heading("Routing block (reference/routing-block.md -> ~/.claude/CLAUDE.md)");
  runStructured(
    reporter,
    python.command,
    [...python.args, path.join(SCRIPT_DIR, "_check_routing.py")],
    "Python routing",
  );
  runStructured(
    reporter,
    process.execPath,
    [path.join(SCRIPT_DIR, "check-enforced.mjs"), REPO_ROOT],
    "[ENFORCED] fitness",
  );
  runStructured(
    reporter,
    process.execPath,
    [path.join(SCRIPT_DIR, "check-roster.mjs"), REPO_ROOT],
    "README roster",
  );

  reporter.heading("Skills");
  runPythonCheck(reporter, python, "skills");

  await validateStackPacks(reporter);

  reporter.heading("Escalation graph");
  runPythonCheck(reporter, python, "escalation");

  const scriptPython = validateShellScripts(reporter, options.mode, bash);
  if (!scriptPython) return 1;

  await validatePackage(reporter);
  await validateCodex(reporter, python);
  validateHygiene(reporter);

  console.log("");
  const agents = filesIn(path.join(REPO_ROOT, "agents"), ".md").length;
  const partial = reporter.coverageGaps > 0;
  const gap = partial && options.mode === "portable"
    ? "PARTIAL (Bash syntax validation was not run)"
    : partial
      ? "PARTIAL (one or more checks were not run)"
      : "COMPLETE";
  if (reporter.failures === 0 && reporter.warnings === 0) {
    console.log(`All checks passed. ${agents} agents. Coverage: ${gap}.`);
  } else if (reporter.failures === 0) {
    console.log(`Passed with ${reporter.warnings} warning(s). ${agents} agents. Coverage: ${gap}.`);
  } else {
    console.error(`${reporter.failures} failure(s), ${reporter.warnings} warning(s). Coverage: ${gap}.`);
  }
  return reporter.failures === 0 ? 0 : 1;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const exitCode = await validate(options);
  process.exitCode = exitCode;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(`validate: ${error.message}`);
    process.exitCode = 1;
  });
}

export { checkBashScript };

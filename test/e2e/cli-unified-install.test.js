import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { REPO, runCli, writeCommand } from "../helpers/cli-harness.js";
import { scratch, snapshot } from "../helpers/cli-fixtures.js";
import { main, readInstallCatalog, resolveInstallProjectTarget, chooseProjectItems } from "../../bin/cli.js";

async function repository(dir) {
  const result = spawnSync("git", ["init", "-q", dir], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}

async function runInstall(args, {
  home, cwd, env = {}, interactive = false, prompt,
  resolveProjectTarget, catalogReader, confirmAction, verbose = true,
} = {}) {
  const previousCwd = process.cwd();
  const keys = ["HOME", "USERPROFILE", "XDG_CONFIG_HOME", "PATH", "GIT_CONFIG_GLOBAL", "GIT_CONFIG_NOSYSTEM", "CLAUDE_PROJECT_DIR"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const output = [];
  const log = console.log, error = console.error;
  process.chdir(cwd);
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.env.XDG_CONFIG_HOME = path.join(home, ".config");
  process.env.GIT_CONFIG_GLOBAL = path.join(home, "gitconfig");
  process.env.GIT_CONFIG_NOSYSTEM = "1";
  delete process.env.CLAUDE_PROJECT_DIR;
  Object.assign(process.env, env);
  console.log = (...values) => output.push(values.join(" "));
  console.error = (...values) => output.push(values.join(" "));
  try {
    const argv = args[0] === "install" && verbose ? [...args, "--verbose"] : args;
    return { status: await main(argv, { interactive, prompt, confirmAction, resolveProjectTarget, catalogReader }), out: output.join("\n") };
  } finally {
    process.chdir(previousCwd);
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    console.log = log;
    console.error = error;
  }
}

describe("unified install catalog and target", () => {
  test("the shared catalog covers tools, specialists and stacks with descriptions and state", async () => {
    const { project } = await scratch("unified-catalog");
    const catalog = await readInstallCatalog({ project });
    assert.ok(catalog.tools.some((item) => item.name === "openspec" && item.description && /installed|not on PATH/.test(item.state)));
    assert.ok(catalog.specialists.some((item) => item.name === "maya" && item.description && item.state === "absent"));
    assert.ok(catalog.stacks.some((item) => item.name === "typescript" && item.description && item.state === "absent"));
  });

  test("list command text stays byte-for-byte stable for an empty project", async () => {
    const { root, home, project } = await scratch("unified-list-output");
    const emptyPath = path.join(root, "empty-path");
    await mkdir(emptyPath);
    const result = await runInstall(["list"], { home, cwd: project, env: { PATH: emptyPath } });
    const expected = [
      `Core team (user level: ${path.join(home, ".claude", "agents")})`,
      "  archie     deep     -",
      "  bob        standard -",
      "  gard       standard -",
      "  perry      standard -",
      "  pipe       standard -",
      "  pixie      standard -",
      "  quinn      standard -",
      "  scott      standard -",
      "  spencer    standard -",
      "  virgo      standard -",
      "",
      `Copilot profiles (user level: ${path.join(home, ".copilot", "agents")})`,
      "  archie     -",
      "  bob        -",
      "  gard       -",
      "  perry      -",
      "  pipe       -",
      "  pixie      -",
      "  quinn      -",
      "  scott      -",
      "  spencer    -",
      "  virgo      -",
      "",
      `Domain specialists (this project: ${path.join(project, ".claude", "agents")})`,
      "  dana       standard -",
      "  echo       standard -",
      "  iris       deep     -",
      "  maya       standard -",
      "  nova       standard -",
      "",
      "Optional tools (graphify, openspec): canonkit tool list",
      "",
      "Stack packs (this project; skills, installed explicitly with canonkit add <stack>)",
      "  typescript   absent",
      "  cpp          absent",
      "  csharp       absent",
      "  java         absent",
      "  python       absent",
      "  react        absent",
      "  rust         absent",
      "  go           absent",
      "  kotlin       absent",
      "  swift        absent",
      "  ui-design    absent",
      "  ui-review    absent",
      "  game-art-direction absent",
    ].join("\n");
    assert.equal(result.status, 0, result.out);
    assert.equal(result.out, expected);
  });

  test("tool list command text stays byte-for-byte stable without tools on PATH", async () => {
    const { root, home, project } = await scratch("unified-tool-list-output");
    const emptyPath = path.join(root, "empty-path");
    await mkdir(emptyPath);
    const result = await runInstall(["tool", "list"], { home, cwd: project, env: { PATH: emptyPath } });
    const expected = [
      `Optional tools (this project: ${project})`,
      "  graphify   pin 0.9.76    not on PATH        -",
      "  openspec   pin 1.14.0    not on PATH        -",
      "",
      "canonkit installs none of these: `tool add` prints the pinned install command when one is missing.",
    ].join("\n");
    assert.equal(result.status, 0, result.out);
    assert.equal(result.out, expected);
  });

  test("only a repository outside canonkit and HOME is a project target", async () => {
    const { root, home, project } = await scratch("unified-target");
    await repository(project);
    assert.equal(await resolveInstallProjectTarget(project, home), project);
    assert.equal(await resolveInstallProjectTarget(home, home), null);
    assert.equal(await resolveInstallProjectTarget(REPO, home), null);
    assert.equal(await resolveInstallProjectTarget(root, home), null);
  });

  test("menu selects categories and tool harness, allows empty lists and returns null on cancel", async () => {
    const { project } = await scratch("unified-menu");
    const catalog = await readInstallCatalog({ project });
    const asks = [];
    const answers = [
      { tools: ["openspec"] }, { specialists: ["maya"] }, { stacks: [] }, { harness: ["claude"] },
    ];
    const prompt = async (question) => { asks.push(question); return answers.shift(); };
    const selected = await chooseProjectItems(catalog, project, { interactive: true, prompt });
    assert.deepEqual(selected, { tools: ["openspec"], specialists: ["maya"], stacks: [], toolHarnesses: { openspec: ["claude"] } });
    assert.equal(asks.length, 4);
    assert.match(asks[0].message, new RegExp(project.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.ok(asks.slice(0, 3).every((ask) => ask.choices.every((choice) => !choice.selected)));

    const empty = await chooseProjectItems(catalog, project, {
      interactive: true,
      prompt: async (question) => ({ [question.name]: [] }),
    });
    assert.deepEqual(empty, { tools: [], specialists: [], stacks: [], toolHarnesses: {} });
    const cancelled = await chooseProjectItems(catalog, project, {
      interactive: true,
      prompt: async (question) => question.name === "stacks" ? undefined : { [question.name]: [] },
    });
    assert.equal(cancelled, null);
  });

  test("cancelling project or tool harness menus leaves the project untouched", async () => {
    const { home, project } = await scratch("unified-cancel");
    await repository(project);
    const beforeHome = await snapshot(home);
    const beforeProject = await snapshot(project);
    const catalog = await readInstallCatalog({ project });
    const cancelStack = await chooseProjectItems(catalog, project, {
      interactive: true,
      prompt: async (question) => question.name === "stacks" ? undefined : { [question.name]: question.name === "specialists" ? ["maya"] : [] },
    });
    assert.equal(cancelStack, null);
    const cancelToolHarness = await chooseProjectItems(catalog, project, {
      interactive: true,
      prompt: async (question) => question.name === "tools" ? { tools: ["openspec"] } : question.name === "harness" ? undefined : { [question.name]: [] },
    });
    assert.equal(cancelToolHarness, null);
    assert.deepEqual(await snapshot(home), beforeHome);
    assert.deepEqual(await snapshot(project), beforeProject);
  });

  test("install cancelled at the stack menu leaves global and project trees unchanged", async () => {
    const { home, project } = await scratch("unified-install-cancel");
    await repository(project);
    const beforeHome = await snapshot(home);
    const beforeProject = await snapshot(project);
    const previousHome = process.env.HOME;
    const previousCwd = process.cwd();
    process.env.HOME = home;
    process.chdir(project);
    try {
      const answers = [
        { targets: ["claude"] }, { tools: [] }, { specialists: ["maya"] }, undefined,
      ];
      const status = await main(["install"], { interactive: true, prompt: async () => answers.shift() });
      assert.equal(status, 1);
    } finally {
      process.chdir(previousCwd);
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
    assert.deepEqual(await snapshot(home), beforeHome);
    assert.deepEqual(await snapshot(project), beforeProject);
  });

  test("cancelling model setup after catalog discovery still leaves both trees unchanged", async () => {
    const { root, home, project } = await scratch("unified-model-cancel");
    await repository(project);
    const emptyPath = path.join(root, "empty-path");
    await mkdir(emptyPath);
    const beforeHome = await snapshot(home);
    const beforeProject = await snapshot(project);
    const result = await runInstall(["install"], {
      home,
      cwd: project,
      env: { PATH: emptyPath },
      interactive: true,
      prompt: async (question) => {
        if (question.name === "targets") return { targets: ["claude"] };
        if (question.name === "tools") return { tools: [] };
        if (question.name === "specialists") return { specialists: [] };
        if (question.name === "stacks") return { stacks: [] };
        if (question.name === "models") return { models: true };
        if (question.name === "deep-model") return undefined;
        throw new Error(`unexpected prompt ${question.name}`);
      },
    });
    assert.equal(result.status, 1, result.out);
    assert.deepEqual(await snapshot(home), beforeHome);
    assert.deepEqual(await snapshot(project), beforeProject);
  });

  test("outside a repository, project menus are skipped with the later commands", async () => {
    const { home, project } = await scratch("unified-no-repository");
    const beforeProject = await snapshot(project);
    const result = await runInstall(["install"], {
      home,
      cwd: project,
      interactive: true,
      prompt: async (question) => ({ targets: ["opencode"] }),
    });
    assert.equal(result.status, 0, result.out);
    assert.match(result.out, /Project items skipped: from a Git project outside canonkit, run npx canonkit add <specialist-or-stack> or npx canonkit tool add <tool>/);
    assert.deepEqual(await snapshot(project), beforeProject);
  });

  test("a no-selector non-interactive install does not read the project catalog", async () => {
    const { root, home, project } = await scratch("unified-noninteractive-no-selectors");
    await repository(project);
    const emptyPath = path.join(root, "empty-path");
    await mkdir(emptyPath);
    const beforeProject = await snapshot(project);
    let targetReads = 0, catalogReads = 0;
    const result = await runInstall(["install", "--claude", "--no-reference"], {
      home,
      cwd: project,
      env: { PATH: emptyPath },
      resolveProjectTarget: async () => { targetReads++; throw new Error("target lookup should be skipped"); },
      catalogReader: async () => { catalogReads++; throw new Error("catalog read should be skipped"); },
    });
    assert.equal(result.status, 0, result.out);
    assert.equal(targetReads, 0);
    assert.equal(catalogReads, 0);
    assert.deepEqual(await snapshot(project), beforeProject);
    assert.match(result.out, /Project items: run npx canonkit list/);
    assert.match(result.out.trim().split("\n").pop(), /npx canonkit doctor/);
  });
});

describe("install project item flags", () => {
  test("valid repeated categories apply through existing installers without enabling git hooks", async () => {
    const { root, home, project } = await scratch("unified-flags");
    await repository(project);
    const bin = path.join(root, "bin");
    const script = path.join(root, "tool.cjs");
    const catalog = await readInstallCatalog({ project });
    const pin = catalog.tools.find((item) => item.name === "openspec").tool.pin;
    await writeFile(script, `const fs=require("node:fs"); if (process.argv[2] === "--version") process.stdout.write(${JSON.stringify(pin + "\n")}); else fs.writeFileSync("openspec-ran.txt", process.argv.slice(2).join(" "));\n`);
    await writeCommand(bin, "openspec", script);
    const result = await runInstall([
      "install", "--claude", "--no-reference", "--yes",
      "--specialist", "maya", "--specialist", "nova", "--stack", "rust", "--stack", "typescript", "--tool", "openspec", "--tool", "openspec",
    ], { home, cwd: project, env: { PATH: bin } });
    assert.equal(result.status, 0, result.out);
    assert.ok((await snapshot(project))[".claude/agents/maya.md"]);
    assert.ok((await snapshot(project))[".claude/agents/nova.md"]);
    assert.ok((await snapshot(project))[".agents/skills/canonkit-rust/SKILL.md"]);
    assert.ok((await snapshot(project))[".agents/skills/canonkit-typescript/SKILL.md"]);
    assert.match((await snapshot(project))["openspec-ran.txt"], /init --tools claude,codex/);
    assert.doesNotMatch(result.out, /with-git-hooks|hook install/);
  });

  test("unknown selections and misuse fail before global or project writes", async () => {
    const { home, project } = await scratch("unified-invalid");
    await repository(project);
    const beforeProject = await snapshot(project);
    const invalid = await runInstall(["install", "--claude", "--specialist", "unknown"], { home, cwd: project });
    assert.equal(invalid.status, 1);
    assert.match(invalid.out, /Specialists: .*maya/);
    assert.deepEqual(await snapshot(home), {});
    assert.deepEqual(await snapshot(project), beforeProject);
    const misuse = await runInstall(["list", "--stack", "rust"], { home, cwd: project });
    assert.equal(misuse.status, 1);
    assert.match(misuse.out, /only valid for: canonkit install/);
  });

  test("a pack collision does not prevent a later valid selection", async () => {
    const { home, project } = await scratch("unified-collision");
    await repository(project);
    const collision = path.join(project, ".claude", "skills", "canonkit-rust");
    await mkdir(collision, { recursive: true });
    await writeFile(path.join(collision, "owned.txt"), "keep me\n");
    const result = await runInstall([
      "install", "--claude", "--no-reference", "--stack", "rust", "--stack", "typescript",
    ], { home, cwd: project });
    assert.equal(result.status, 1, result.out);
    assert.match(result.out, /Untracked stack-pack collision; preserved/);
    assert.equal((await snapshot(project))[".claude/skills/canonkit-rust/owned.txt"], "keep me\n");
    assert.ok((await snapshot(project))[".agents/skills/canonkit-typescript/SKILL.md"]);
  });

  test("tool setup still requires explicit --yes without a terminal", async () => {
    const { root, home, project } = await scratch("unified-tool-confirm");
    await repository(project);
    const bin = path.join(root, "bin");
    const script = path.join(root, "tool.cjs");
    const catalog = await readInstallCatalog({ project });
    const pin = catalog.tools.find((item) => item.name === "openspec").tool.pin;
    await writeFile(script, `const fs=require("node:fs"); if (process.argv[2] === "--version") process.stdout.write(${JSON.stringify(pin + "\n")}); else fs.writeFileSync("openspec-ran.txt", "ran");\n`);
    await writeCommand(bin, "openspec", script);
    const result = await runInstall(["install", "--claude", "--no-reference", "--tool", "openspec"], { home, cwd: project, env: { PATH: bin } });
    assert.equal(result.status, 1, result.out);
    assert.match(result.out, /Not running: there is no terminal to confirm on/);
    assert.equal((await snapshot(project))["openspec-ran.txt"], undefined);
  });

  test("default install shows tool preflight before a named confirmation and summarizes success", async () => {
    const { root, home, project } = await scratch("unified-tool-compact");
    await repository(project);
    const bin = path.join(root, "bin");
    const script = path.join(root, "tool.cjs");
    const catalog = await readInstallCatalog({ project });
    const pin = catalog.tools.find((item) => item.name === "openspec").tool.pin;
    await writeFile(script, `const fs=require("node:fs"); if (process.argv[2] === "--version") process.stdout.write(${JSON.stringify(pin + "\n")}); else { console.log("routine child output"); console.error("warning: fixture warning"); console.log("OpenSpec Setup Complete"); console.log("Created: Claude Code"); console.log("2 skills and 1 commands in .claude"); console.log("Skipped GitHub Copilot cloud files (opt-in). Enable with 'openspec init --copilot-cloud'."); console.log("Restart your IDE to refresh commands."); fs.writeFileSync("openspec-ran.txt", "ran"); }\n`);
    await writeCommand(bin, "openspec", script);
    let question;
    const result = await runInstall(["install", "--claude", "--no-reference", "--tool", "openspec"], {
      home, cwd: project, env: { PATH: bin }, verbose: false,
      confirmAction: async (text) => { question = text; console.log(text); return false; },
    });
    assert.equal(result.status, 1, result.out);
    assert.ok(result.out.indexOf("OpenSpec setup") < result.out.indexOf("Run OpenSpec setup in"), result.out);
    assert.equal(question, `Run OpenSpec setup in ${project}? [y/N] `);
    assert.equal((await snapshot(project))["openspec-ran.txt"], undefined);

    const accepted = await runInstall(["install", "--claude", "--no-reference", "--yes", "--tool", "openspec"], {
      home, cwd: project, env: { PATH: bin }, verbose: false,
    });
    assert.equal(accepted.status, 0, accepted.out);
    assert.match(accepted.out, /Project tools:\n  ✓ OpenSpec configured Claude Code, Codex; 2 skills and 1 commands in \.claude/);
    assert.doesNotMatch(accepted.out, /routine child output/);
    assert.equal(accepted.out.match(/OpenSpec setup/g)?.length, 1, accepted.out);
    assert.match(accepted.out, /⚠ openspec: warning: fixture warning/);
    assert.equal(accepted.out.match(/· OpenSpec guidance: GitHub Copilot cloud files are opt-in; enable with `openspec init --copilot-cloud`\./g)?.length, 1, accepted.out);
    assert.equal(accepted.out.match(/· OpenSpec guidance: restart your IDE to refresh commands\./g)?.length, 1, accepted.out);
    assert.match(accepted.out, /Writes:.*AGENTS\.md/);
    assert.equal((await snapshot(project))["openspec-ran.txt"], "ran");
  });

  test("verbose install streams tool output and compact failures replay child output", async () => {
    const { root, home, project } = await scratch("unified-tool-output-modes");
    await repository(project);
    const bin = path.join(root, "bin");
    const script = path.join(root, "tool.cjs");
    const catalog = await readInstallCatalog({ project });
    const pin = catalog.tools.find((item) => item.name === "openspec").tool.pin;
    await writeCommand(bin, "openspec", script);

    await writeFile(script, `if (process.argv[2] === "--version") process.stdout.write(${JSON.stringify(pin + "\n")}); else { console.log("routine child output"); console.log("Skipped GitHub Copilot cloud files (opt-in). Enable with 'openspec init --copilot-cloud'."); console.log("Restart your IDE to refresh commands."); console.log("OpenSpec Setup Complete"); }\n`);
    const verbose = runCli(["install", "--claude", "--no-reference", "--yes", "--tool", "openspec", "--verbose"], { home, cwd: project, env: { PATH: bin } });
    assert.equal(verbose.status, 0, verbose.out);
    assert.match(verbose.out, /routine child output/);
    assert.match(verbose.out, /Skipped GitHub Copilot cloud files \(opt-in\)\. Enable with 'openspec init --copilot-cloud'\./);
    assert.match(verbose.out, /Restart your IDE to refresh commands\./);

    await writeFile(script, `if (process.argv[2] === "--version") process.stdout.write(${JSON.stringify(pin + "\n")}); else { console.log("child stdout detail"); console.error("child stderr detail"); process.exit(4); }\n`);
    const failed = await runInstall(["install", "--claude", "--no-reference", "--yes", "--tool", "openspec"], {
      home, cwd: project, env: { PATH: bin }, verbose: false,
    });
    assert.equal(failed.status, 1, failed.out);
    assert.match(failed.out, /child stdout detail/);
    assert.match(failed.out, /child stderr detail/);
    assert.match(failed.out, /openspec init --tools claude,codex failed/);
  });

  test("dry-run previews selected project items and writes nothing", async () => {
    const { root, home, project } = await scratch("unified-dry-run");
    await repository(project);
    const bin = path.join(root, "bin");
    const script = path.join(root, "tool.cjs");
    const catalog = await readInstallCatalog({ project });
    const pin = catalog.tools.find((item) => item.name === "openspec").tool.pin;
    await writeFile(script, `const fs=require("node:fs"); if (process.argv[2] === "--version") process.stdout.write(${JSON.stringify(pin + "\n")}); else fs.writeFileSync("openspec-ran.txt", "ran");\n`);
    await writeCommand(bin, "openspec", script);
    const beforeHome = await snapshot(home);
    const beforeProject = await snapshot(project);
    const result = await runInstall([
      "install", "--claude", "--no-reference", "--dry-run",
      "--specialist", "maya", "--stack", "rust", "--tool", "openspec",
    ], { home, cwd: project, env: { PATH: bin } });
    assert.equal(result.status, 0, result.out);
    assert.match(result.out, /\[dry-run\].*Install.*SKILL\.md/);
    assert.deepEqual(await snapshot(home), beforeHome);
    assert.deepEqual(await snapshot(project), beforeProject);
  });
});

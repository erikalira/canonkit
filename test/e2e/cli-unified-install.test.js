import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { REPO, runCli, writeCommand } from "../helpers/cli-harness.js";
import { scratch, snapshot } from "../helpers/cli-fixtures.js";
import { main, readInstallCatalog, resolveInstallProjectTarget, chooseProjectItems } from "../../bin/cli.js";

async function repository(dir) {
  const result = spawnSync("git", ["init", "-q", dir], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}

async function stubClaude(root) {
  const bin = path.join(root, "claude-bin"), script = path.join(root, "claude.cjs");
  await writeFile(script, `const fs=require("node:fs"); if (process.env.DISCOVERY_LOG) fs.appendFileSync(process.env.DISCOVERY_LOG, process.argv.slice(2).join(" ")+"\\n"); if (process.argv[2] === "--version") console.log("2.1.314"); else if (process.argv[2] === "--help") { console.log("  --model <model> Select a model ('opus', 'sonnet', 'haiku')"); console.log("  --effort <effort> Set effort (low, medium, high)"); } else process.exit(2);\n`);
  await writeCommand(bin, "claude", script);
  return bin;
}

async function stubCodex(root, catalog) {
  const bin = path.join(root, "codex-bin"), script = path.join(root, "codex.cjs");
  await writeFile(script, `if (process.argv[2] === "--version") process.stdout.write("0.1.0\\n"); else if (process.argv[2] === "debug") process.stdout.write(${JSON.stringify(JSON.stringify(catalog))} + "\\n"); else process.exit(2);\n`);
  await writeCommand(bin, "codex", script);
  return bin;
}

async function runInstall(args, {
  home, cwd, env = {}, interactive = false, prompt,
  resolveProjectTarget, catalogReader, confirmAction, verbose = true, onOutput,
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
  console.log = (...values) => {
    const line = values.join(" ");
    output.push(line);
    onOutput?.(line);
  };
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
    assert.match(asks[0].message, /Optional tools for project/);
    assert.ok(asks[0].choices.filter((choice) => ["graphify", "openspec"].includes(choice.value)).every((choice) => choice.selected && /\(recommended\)/.test(choice.title)));
    assert.ok(asks.slice(1, 3).every((ask) => ask.choices.every((choice) => !choice.selected)));

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

  test("install targets select OpenSpec integrations in registry order without another prompt", async () => {
    const { project } = await scratch("unified-menu-target-harnesses");
    const catalog = await readInstallCatalog({ project });
    for (const [targets, expected] of [
      [["codex"], ["codex"]],
      [["copilot"], ["github-copilot"]],
      [["copilot", "codex", "claude"], ["claude", "codex", "github-copilot"]],
    ]) {
      const asks = [];
      const selected = await chooseProjectItems(catalog, project, {
        interactive: true,
        targets,
        prompt: async (question) => {
          asks.push(question.name);
          return question.name === "tools" ? { tools: ["openspec"] } : { [question.name]: [] };
        },
      });
      assert.deepEqual(selected.toolHarnesses.openspec, expected);
      assert.deepEqual(asks, ["tools", "specialists", "stacks"]);
    }
  });

  test("cancelling project item menus leaves the project untouched", async () => {
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
        { targets: ["claude"] }, { "project-scope": true }, { tools: [] }, { specialists: ["maya"] }, undefined,
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
        if (question.name === "project-scope") return { "project-scope": true };
        if (question.name === "tools") return { tools: [] };
        if (question.name === "specialists") return { specialists: [] };
        if (question.name === "stacks") return { stacks: [] };
        if (question.name === "recommended-setup") return { "recommended-setup": "customize" };
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
      prompt: async (question) => question.name === "targets" ? { targets: ["opencode"] }
        : { "install-confirmation": true },
    });
    assert.equal(result.status, 0, result.out);
    assert.match(result.out.replace(/\n/g, " "), /Project items skipped: from a Git project outside canonkit, run npx canonkit add <specialist-or-stack> or npx canonkit tool add <tool>/);
    const skipped = result.out.slice(result.out.indexOf("Project items skipped:"), result.out.indexOf("Project items skipped:") + 250);
    assert.ok(skipped.split("\n").every((line) => line.length <= 78), skipped);
    assert.deepEqual(await snapshot(project), beforeProject);
  });

  test("the project question can decline project writes, and --no-project rejects project-item flags", async () => {
    const { home, project } = await scratch("unified-project-decline");
    await repository(project);
    const beforeProject = await snapshot(project);
    let confirmation;
    const declined = await runInstall(["install", "--claude"], {
      home, cwd: project, interactive: true,
      prompt: async (question) => {
        if (question.name === "project-scope") {
          assert.match(question.message, /Set up project/);
          assert.match(question.hint, /user-level setup only/);
          return { "project-scope": false };
        }
        if (question.name === "recommended-setup") return { "recommended-setup": "recommended" };
        if (question.name === "install-confirmation") { confirmation = question; return { "install-confirmation": true }; }
        throw new Error(`unexpected prompt ${question.name}`);
      },
    });
    assert.equal(declined.status, 0, declined.out);
    assert.match(declined.out, /Review installation[\s\S]*USER[\s\S]*PROJECT\n  not set up/);
    assert.doesNotMatch(declined.out, /Write these changes\?/);
    assert.deepEqual(confirmation.choices.map((choice) => choice.title), ["Yes, install", "No, cancel (nothing is written)"]);
    assert.match(confirmation.hint, /Enter writes the changes listed above/);
    assert.deepEqual(await snapshot(project), beforeProject);

    const beforeHome = await snapshot(home);
    const conflict = await runInstall(["install", "--no-project", "--tool", "openspec"], { home, cwd: project });
    assert.equal(conflict.status, 1);
    assert.match(conflict.out, /--no-project cannot be combined with --tool/);
    assert.deepEqual(await snapshot(home), beforeHome);
    assert.deepEqual(await snapshot(project), beforeProject);
  });

  test("--no-project without a terminal leaves project files untouched", async () => {
    const { home, project } = await scratch("unified-no-project-flag");
    await repository(project);
    const beforeProject = await snapshot(project);
    const result = await runInstall(["install", "--claude", "--no-project"], { home, cwd: project });
    assert.equal(result.status, 0, result.out);
    assert.deepEqual(await snapshot(project), beforeProject);
  });

  test("Ctrl-C and EOF at project or final confirmation cancel every write", async () => {
    const { root, home, project } = await scratch("unified-guided-cancel");
    await repository(project);
    const emptyPath = path.join(root, "empty-path");
    await mkdir(emptyPath);
    for (const [label, stopAt, response, message] of [
      ["project-cancel", "project-scope", undefined, /Cancelled: nothing was installed/],
      ["project-eof", "project-scope", {}, /Input closed: nothing was installed/],
      ["confirm-cancel", "install-confirmation", undefined, /Cancelled: nothing was installed/],
      ["confirm-eof", "install-confirmation", {}, /Input closed: nothing was installed/],
    ]) {
      const beforeHome = await snapshot(home), beforeProject = await snapshot(project);
      const result = await runInstall(["install", "--claude", "--no-reference"], {
        home, cwd: project, env: { PATH: emptyPath }, interactive: true,
        prompt: async (question) => {
          if (question.name === stopAt) return response;
          if (question.name === "project-scope") return { "project-scope": true };
          if (["tools", "specialists", "stacks"].includes(question.name)) return { [question.name]: [] };
          if (question.name === "recommended-setup") return { "recommended-setup": "recommended" };
          if (question.name === "install-confirmation") return { "install-confirmation": true };
          throw new Error(`${label}: unexpected prompt ${question.name}`);
        },
      });
      assert.equal(result.status, 1, `${label}: ${result.out}`);
      assert.match(result.out, message);
      assert.deepEqual(await snapshot(home), beforeHome, label);
      assert.deepEqual(await snapshot(project), beforeProject, label);
    }

    const beforeHome = await snapshot(home), beforeProject = await snapshot(project);
    const customized = await runInstall(["install", "--claude", "--no-reference"], {
      home, cwd: project, env: { PATH: emptyPath }, interactive: true,
      prompt: async (question) => {
        if (question.name === "project-scope") return { "project-scope": true };
        if (["tools", "specialists", "stacks"].includes(question.name)) return { [question.name]: [] };
        if (question.name === "recommended-setup") return { "recommended-setup": "customize" };
        if (question.name === "install-confirmation") return { "install-confirmation": false };
        if (question.type === "text") return "";
        if (question.name === "save") return true;
        if (question.name === "agents") return [];
        if (question.name?.endsWith("-model")) return question.choices[0].value;
        if (question.choices?.length) return { [question.name]: question.choices[0].value };
        throw new Error(`unexpected prompt ${question.name}`);
      },
    });
    assert.equal(customized.status, 1, customized.out);
    assert.match(customized.out, /Cancelled: nothing was installed/);
    assert.deepEqual(await snapshot(home), beforeHome, "customized model choices must remain deferred until confirmation");
    assert.deepEqual(await snapshot(project), beforeProject, "customized project choices must remain deferred until confirmation");
  });

  test("recommended setup screen lists model and security rows before accepting Yes", async () => {
    const { root, home, project } = await scratch("unified-recommended-screen");
    await repository(project);
    const bin = path.join(root, "bin"), script = path.join(root, "claude.cjs");
    await writeFile(script, `if (process.argv[2] === "--version") console.log("2.1.314"); else if (process.argv[2] === "--help") { console.log("  --model <model> Select a model ('opus', 'sonnet', 'haiku')"); console.log("  --effort <effort> Set effort (low, medium, high)"); } else process.exit(2);\n`);
    await writeCommand(bin, "claude", script);
    const asked = [], visible = [];
    const result = await runInstall(["install", "--claude", "--no-reference"], {
      home, cwd: project, env: { PATH: bin }, interactive: true, verbose: false,
      onOutput: (line) => visible.push(line),
      prompt: async (question) => {
        asked.push(question);
        if (question.name === "project-scope") return { "project-scope": true };
        if (question.name === "tools" || question.name === "specialists" || question.name === "stacks") return { [question.name]: [] };
        if (question.name === "recommended-setup") {
          assert.match(visible.join("\n"), /Recommended setup[\s\S]*Claude Code deep[\s\S]*\+.*opus\/medium/);
          return { "recommended-setup": "recommended" };
        }
        if (question.name === "install-confirmation") {
          assert.match(visible.join("\n"), /Recommended setup[\s\S]*USER[\s\S]*PROJECT[\s\S]*Review installation[\s\S]*Harnesses: Claude Code[\s\S]*permissions\.blockReadsOutsideWorkingDirectories/);
          return { "install-confirmation": true };
        }
        throw new Error(`unexpected prompt ${question.name}`);
      },
    });
    assert.equal(result.status, 0, result.out);
    const setup = asked.find((question) => question.name === "recommended-setup");
    const confirmation = asked.find((question) => question.name === "install-confirmation");
    assert.equal(setup.message, "Use the recommended setup?");
    assert.deepEqual(setup.choices.map((choice) => choice.value), ["recommended", "keep", "customize"]);
    assert.equal(setup.initial, 0);
    assert.deepEqual(confirmation.choices.map((choice) => choice.title), ["Yes, install", "No, cancel (nothing is written)"]);
    assert.match(confirmation.message, /Write these changes\?/);
    assert.match(result.out, /USER[\s\S]*PROJECT/);
    assert.match(result.out, /Claude Code deep.*\+.*opus\/medium/);
    assert.match(result.out, /permissions\.blockReadsOutsideWorkingDirectories/);
    assert.match(result.out, /\d+ changes · \d+ replaced · \d+ added\n\d+ already recommended/);
    assert.match(result.out, /Installation complete/);
    assert.doesNotMatch(result.out, /\u001b\[/);
    const block = result.out.slice(result.out.indexOf("Recommended setup"), result.out.indexOf("Review installation"));
    assert.ok(block.split("\n").every((line) => line.length <= 78), block);
    assert.ok(asked.flatMap((question) => question.choices ?? []).every((choice) =>
      (choice.title?.length ?? 0) <= 78 && (choice.description?.length ?? 0) <= 78));
    const choices = JSON.parse((await readFile(path.join(home, ".canonkit", "models.json"))).toString("utf8"));
    assert.deepEqual(choices.harnesses.claude.levels.deep, { model: "opus", effort: "medium" });
  });

  test("--recommended applies model choices in CI; no flag keeps models unchanged; dry-run starts no harness", async () => {
    const first = await scratch("unified-recommended-ci");
    await repository(first.project);
    const bin = await stubClaude(first.root), log = path.join(first.root, "discovery.log");
    const applied = await runInstall(["install", "--claude", "--no-reference", "--recommended"], {
      home: first.home, cwd: first.project, env: { PATH: bin, DISCOVERY_LOG: log },
    });
    assert.equal(applied.status, 0, applied.out);
    const models = JSON.parse(await readFile(path.join(first.home, ".canonkit", "models.json"), "utf8"));
    assert.deepEqual(models.harnesses.claude.levels.deep, { model: "opus", effort: "medium" });
    assert.match(applied.out, /Applying user model choice: Claude Code deep/);
    assert.match(applied.out, /Applying project security: permissions\.blockReadsOutsid\.\.\. .*\+.*true/);

    const legacy = await scratch("unified-no-recommended-ci");
    await repository(legacy.project);
    const legacyBin = await stubClaude(legacy.root);
    const unchanged = await runInstall(["install", "--claude", "--no-reference"], {
      home: legacy.home, cwd: legacy.project, env: { PATH: legacyBin, DISCOVERY_LOG: path.join(legacy.root, "discovery.log") },
    });
    assert.equal(unchanged.status, 0, unchanged.out);
    assert.equal((await snapshot(legacy.home))[".canonkit/models.json"], undefined);

    const dry = await scratch("unified-recommended-dry");
    await repository(dry.project);
    const dryBin = await stubClaude(dry.root), dryLog = path.join(dry.root, "discovery.log");
    const preview = await runInstall(["install", "--claude", "--no-reference", "--recommended", "--dry-run"], {
      home: dry.home, cwd: dry.project, env: { PATH: dryBin, DISCOVERY_LOG: dryLog },
    });
    assert.equal(preview.status, 0, preview.out);
    assert.match(preview.out, /would apply user model choice: Claude Code deep/);
    if (process.platform === "win32") assert.doesNotMatch(preview.out, /would apply project security: sandbox\.autoAllowBashIfSandboxed/);
    else assert.match(preview.out, /would apply project security: sandbox\.autoAllowBashIfSandboxed\s+unset\s+\+\s+true[\s\S]*conditional on Claude/);
    assert.equal((await snapshot(dry.root))["discovery.log"], undefined);
    assert.equal((await snapshot(dry.home))[".canonkit/models.json"], undefined);
  });

  test("interactive dry run previews guided questions in order without discovery or writes", async () => {
    const { root, home, project } = await scratch("unified-guided-dry-run-order");
    await repository(project);
    const bin = await stubClaude(root), log = path.join(root, "discovery.log");
    const beforeHome = await snapshot(home), beforeProject = await snapshot(project), asked = [];
    const result = await runInstall(["install", "--no-reference", "--dry-run"], {
      home, cwd: project, env: { PATH: bin, DISCOVERY_LOG: log }, interactive: true,
      prompt: async (question) => {
        asked.push(question.name);
        if (question.name === "targets") return { targets: ["claude"] };
        if (question.name === "project-scope") return { "project-scope": true };
        if (["tools", "specialists", "stacks"].includes(question.name)) return { [question.name]: [] };
        if (question.name === "recommended-setup") return { "recommended-setup": "recommended" };
        throw new Error(`unexpected dry-run prompt ${question.name}`);
      },
    });
    assert.equal(result.status, 0, result.out);
    assert.deepEqual(asked, ["targets", "project-scope", "tools", "specialists", "stacks", "recommended-setup"]);
    assert.match(result.out, /Recommended setup/);
    assert.match(result.out, /Claude Code deep.*\+.*opus\/medium/);
    assert.doesNotMatch(result.out, /Save to .*models\.json\?/);
    assert.deepEqual(await snapshot(home), beforeHome);
    assert.deepEqual(await snapshot(project), beforeProject);
    assert.equal((await snapshot(root))["discovery.log"], undefined);
  });

  test("reinstall offers keep current; OpenCode-only install skips the recommended model screen", async () => {
    const { root, home, project } = await scratch("unified-reinstall-choices");
    await repository(project);
    const bin = await stubClaude(root);
    await mkdir(path.join(home, ".canonkit"), { recursive: true });
    await writeFile(path.join(home, ".canonkit", "models.json"), JSON.stringify({ version: 1, harnesses: { claude: { levels: {
      deep: { model: "opus", effort: "medium" }, standard: { model: "sonnet", effort: "medium" }, light: { model: "haiku", effort: "low" },
    } } } }));
    await mkdir(path.join(home, ".claude"), { recursive: true });
    await writeFile(path.join(home, ".claude", "settings.json"), JSON.stringify({ sandbox: { network: { strictAllowlist: true } } }));
    await mkdir(path.join(project, ".claude"), { recursive: true });
    await writeFile(path.join(project, ".claude", "settings.json"), JSON.stringify({ permissions: { blockReadsOutsideWorkingDirectories: true, blockWritesOutsideWorkingDirectories: true } }));
    const asks = [];
    const result = await runInstall(["install", "--claude", "--no-reference"], {
      home, cwd: project, env: { PATH: bin }, interactive: true, verbose: false,
      prompt: async (question) => {
        asks.push(question);
        if (question.name === "project-scope") return { "project-scope": true };
        if (["tools", "specialists", "stacks"].includes(question.name)) return { [question.name]: [] };
        if (question.name === "recommended-setup") return { "recommended-setup": "keep" };
        if (question.name === "install-confirmation") return { "install-confirmation": true };
        throw new Error(`unexpected prompt ${question.name}`);
      },
    });
    assert.equal(result.status, 0, result.out);
    assert.deepEqual(asks.find((question) => question.name === "recommended-setup").choices.map((choice) => choice.value), ["recommended", "keep", "customize"]);
    assert.match(result.out, /Models: unchanged \(kept current\)/);
    assert.match(result.out, /Security: unchanged \(kept current\)/);

    const other = await scratch("unified-other-harness-only");
    const onlyOther = await runInstall(["install", "--opencode", "--no-reference"], {
      home: other.home, cwd: other.project, interactive: true,
      prompt: async (question) => {
        if (question.name === "install-confirmation") return { "install-confirmation": true };
        throw new Error(`unexpected prompt ${question.name}`);
      },
    });
    assert.equal(onlyOther.status, 0, onlyOther.out);
    assert.doesNotMatch(onlyOther.out, /Use the recommended setup\?/);
  });

  test("recommended Codex setup uses staged discovery for user agents and preserves project overrides", async () => {
    const { root, home, project } = await scratch("unified-staged-codex-models");
    await repository(project);
    const freshCatalog = {
      models: [{ slug: "gpt-6-sol", visibility: "list", supported_reasoning_levels: [{ effort: "medium" }, { effort: "high" }] }],
    };
    const bin = await stubCodex(root, freshCatalog);
    const userChoices = { version: 1, harnesses: { codex: { levels: { deep: { model: "gpt-6-sol", effort: "high" } } } } };
    const projectChoices = structuredClone(userChoices);
    await mkdir(path.join(home, ".canonkit"), { recursive: true });
    await writeFile(path.join(home, ".canonkit", "models.json"), JSON.stringify(userChoices));
    await writeFile(path.join(home, ".canonkit", "model-catalog.json"), JSON.stringify({
      version: 1, harnesses: { codex: { status: "discovered", models: [{ id: "gpt-6-sol", efforts: ["high"] }] } },
    }));
    await mkdir(path.join(project, ".canonkit"), { recursive: true });
    await writeFile(path.join(project, ".canonkit", "models.json"), JSON.stringify(projectChoices));

    const result = await runInstall(["install", "--codex", "--no-reference"], {
      home, cwd: project, env: { PATH: bin }, interactive: true,
      prompt: async (question) => {
        if (question.name === "project-scope") return { [question.name]: true };
        if (["tools", "specialists", "stacks"].includes(question.name)) return { [question.name]: [] };
        if (question.name === "recommended-setup") return { [question.name]: "recommended" };
        if (question.name === "install-confirmation") return { [question.name]: true };
        throw new Error(`unexpected prompt ${question.name}`);
      },
    });

    assert.equal(result.status, 0, result.out);
    const stagedCatalog = JSON.parse(await readFile(path.join(home, ".canonkit", "model-catalog.json"), "utf8"));
    assert.equal(stagedCatalog.harnesses.codex.status, "discovered", JSON.stringify(stagedCatalog.harnesses.codex));
    assert.match(result.out, /Installed project Codex agent: archie/);
    const userAgent = await readFile(path.join(home, ".codex", "agents", "archie.toml"), "utf8");
    const projectAgent = await readFile(path.join(project, ".codex", "agents", "archie.toml"), "utf8");
    assert.match(userAgent, /^model = "gpt-6-sol"$/m);
    assert.match(userAgent, /^model_reasoning_effort = "medium"$/m);
    assert.match(projectAgent, /^model = "gpt-6-sol"$/m);
    assert.match(projectAgent, /^model_reasoning_effort = "high"$/m);
  });

  test("recommended setup with no security changes keeps the model rows visible", async () => {
    const { root, home, project } = await scratch("unified-recommended-no-security-changes");
    await repository(project);
    const bin = await stubClaude(root);
    await mkdir(path.join(home, ".canonkit"), { recursive: true });
    await writeFile(path.join(home, ".canonkit", "models.json"), JSON.stringify({ version: 1, harnesses: { claude: { levels: {
      deep: { model: "opus", effort: "medium" }, standard: { model: "sonnet", effort: "medium" }, light: { model: "haiku", effort: "low" },
    } } } }));
    await mkdir(path.join(home, ".claude"), { recursive: true });
    await writeFile(path.join(home, ".claude", "settings.json"), JSON.stringify({
      sandbox: {
        network: { strictAllowlist: true },
        filesystem: { allowRead: ["~/.nvm", "~/.local/bin", "~/.local/share/pipx"] },
      },
    }));
    await mkdir(path.join(project, ".claude"), { recursive: true });
    await writeFile(path.join(project, ".claude", "settings.json"), JSON.stringify({
      permissions: { blockReadsOutsideWorkingDirectories: true, blockWritesOutsideWorkingDirectories: true },
      sandbox: { enabled: true, failIfUnavailable: true, allowUnsandboxedCommands: false, autoAllowBashIfSandboxed: true },
    }));
    const result = await runInstall(["install", "--claude", "--no-reference"], {
      home, cwd: project, env: { PATH: bin }, interactive: true, verbose: false,
      prompt: async (question) => {
        if (question.name === "project-scope") return { "project-scope": true };
        if (["tools", "specialists", "stacks"].includes(question.name)) return { [question.name]: [] };
        if (question.name === "recommended-setup") return { "recommended-setup": "recommended" };
        if (question.name === "install-confirmation") return { "install-confirmation": true };
        throw new Error(`unexpected prompt ${question.name}`);
      },
    });
    assert.equal(result.status, 0, result.out);
    const screen = result.out.split("Recommended setup")[1]?.split("\n── Review installation")[0] ?? "";
    assert.match(screen, /USER[\s\S]*Claude Code/);
    assert.match(screen, /Claude Code deep\s+opus\/medium\s+[=!]/);
    if (/Already at the recommended profile/.test(screen)) assert.match(screen, /PROJECT · Security/);
    if (/Claude Code deep\s+opus\/medium\s+=/.test(screen)) assert.match(result.out, /Models: unchanged/);
    else assert.match(screen, /!.*model discovery is unknown/);
    assert.doesNotMatch(screen, /permissions\.|sandbox\./);
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
      "install", "--no-reference", "--yes",
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

  test("interactive install passes selected Copilot target to OpenSpec without a harness menu", async () => {
    const { root, home, project } = await scratch("unified-openspec-target-harness");
    await repository(project);
    const bin = path.join(root, "bin"), script = path.join(root, "openspec.cjs");
    const catalog = await readInstallCatalog({ project });
    const pin = catalog.tools.find((item) => item.name === "openspec").tool.pin;
    await writeFile(script, `const fs=require("node:fs"); if (process.argv[2] === "--version") process.stdout.write(${JSON.stringify(pin + "\n")}); else fs.writeFileSync("openspec-ran.txt", process.argv.slice(2).join(" "));\n`);
    await writeCommand(bin, "openspec", script);
    const asked = [];
    const result = await runInstall(["install", "--no-reference", "--yes"], {
      home, cwd: project, env: { PATH: bin }, interactive: true,
      prompt: async (question) => {
        asked.push(question.name);
        if (question.name === "targets") return { targets: ["copilot"] };
        if (question.name === "project-scope") return { "project-scope": true };
        if (question.name === "tools") return { tools: ["openspec"] };
        if (["specialists", "stacks"].includes(question.name)) return { [question.name]: [] };
        if (question.name === "install-confirmation") return { "install-confirmation": true };
        throw new Error(`unexpected prompt ${question.name}`);
      },
    });
    assert.equal(result.status, 0, result.out);
    assert.deepEqual(asked, ["targets", "project-scope", "tools", "specialists", "stacks", "install-confirmation"]);
    assert.equal((await snapshot(project))["openspec-ran.txt"], "init --tools github-copilot");
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
    assert.equal(question, `Run OpenSpec setup in ${project.replace(/\\/g, "/")}? [y/N] `);
    assert.equal((await snapshot(project))["openspec-ran.txt"], undefined);

    const accepted = await runInstall(["install", "--claude", "--no-reference", "--yes", "--tool", "openspec"], {
      home, cwd: project, env: { PATH: bin }, verbose: false,
    });
    assert.equal(accepted.status, 0, accepted.out);
    assert.match(accepted.out, /Project tools:\n  ✓ OpenSpec configured Claude Code; 2 skills and 1 commands in \.claude/);
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
    assert.match(failed.out, /openspec init --tools claude failed/);
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

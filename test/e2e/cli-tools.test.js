/**
 * Contract tests for the installer: tool registry, tool add/remove and model choices.
 *
 * These run the real CLI against a real filesystem in a throwaway HOME. No
 * mocks: the failure this installer can actually cause is writing the wrong
 * bytes to a file you already had, and a mocked fs proves nothing about that.
 * Shared fixtures: test/helpers/cli-fixtures.js.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { rm, mkdir, writeFile, readdir, chmod, symlink, lstat } from "node:fs/promises";
import { existsSync, realpathSync, readFileSync } from "node:fs";
import path from "node:path";
import { REPO, runCli, writeCommand } from "../helpers/cli-harness.js";
import { CORE, scratch, run, read } from "../helpers/cli-fixtures.js";
import { readAgents, readTools, parseTool } from "../../bin/cli.js";
import { modelDiagnosis } from "../../bin/models-command.js";


/* ------------------------------------------------------------------- tools */

describe("tool registry", () => {
  test("every tool parses, pins an exact version and prints it in the install command", async () => {
    const tools = await readTools();
    assert.deepEqual([...tools.keys()], ["graphify", "openspec"]);
    for (const t of tools.values()) {
      assert.match(t.pin, /^\d+\.\d+\.\d+$/);
      assert.ok(t.install.some((l) => l.includes(t.pin)), `${t.name}: install does not carry the pin`);
      assert.ok(t.rules.length >= 1 && t.rules.length <= 3);
      // Never an unpinned or ephemeral runner.
      for (const l of t.install) assert.doesNotMatch(l, /@latest|\buvx\b|\bpipx\b|\buv\b/);
    }
    const g = tools.get("graphify");
    // graphifyy, two y's: `graphify` on PyPI is a different package.
    assert.ok(g.install.some((l) => l.includes(`graphifyy==${g.pin}`)));
    assert.doesNotMatch(g.install.join("\n"), /\bgraphify==/);
    assert.deepEqual(g.setup, [["update", "."]]);
    assert.deepEqual(tools.get("openspec").setup, [["init", "--tools", "claude,codex"]]);
    // Only the report is versioned; .graphify_python above all never is.
    assert.deepEqual(g.gitignore, ["graphify-out/*", "!graphify-out/GRAPH_REPORT.md"]);
    assert.deepEqual(tools.get("openspec").gitignore, []);
  });

  test("refuses a gitignore pattern that is not a plain relative path", () => {
    const file = (p) => `---\nname: t\nbin: t\npin: 1.2.3\ninstall:\n  - get t@{pin}\nsetup:\n  - init\ngitignore:\n  - ${p}\n---\none rule\n`;
    assert.deepEqual(parseTool("t.md", file("out/*")).gitignore, ["out/*"]);
    assert.deepEqual(parseTool("t.md", file("!out/keep.md")).gitignore, ["!out/keep.md"]);
    for (const p of ["../x", "out/../x", "/abs", "out x", "*", "out/$(id)", "C:\\out"]) {
      assert.throws(() => parseTool("t.md", file(p)), /plain relative path/, p);
    }
  });

  test("refuses a range pin, a forbidden step, a non-literal argument and a long block", () => {
    const file = ({ pin = "1.2.3", setup = "  - init", body = "one rule" } = {}) =>
      `---\nname: t\nbin: t\npin: ${pin}\ninstall:\n  - get t@{pin}\nsetup:\n${setup}\n---\n${body}\n`;
    assert.ok(parseTool("t.md", file()));
    assert.throws(() => parseTool("t.md", file({ pin: "^1.2.3" })), /exact/);
    assert.throws(() => parseTool("t.md", file({ setup: "  - claude install" })), /not allowed/);
    assert.throws(() => parseTool("t.md", file({ setup: "  - codex install" })), /not allowed/);
    assert.throws(() => parseTool("t.md", file({ setup: "  - extract ." })), /not allowed/);
    assert.throws(() => parseTool("t.md", file({ setup: "  - init $(whoami)" })), /plain literal/);
    assert.throws(() => parseTool("t.md", file({ body: "a\nb\nc\nd" })), /1 to 3/);
    assert.throws(() => parseTool("t.md", file({ body: "uses 1.2.3" })), /pin lives only/);
    // Fixed env is literal, and never a variable that changes what gets loaded.
    const withEnv = (kv) => file().replace("setup:", `env:\n  - ${kv}\nsetup:`);
    assert.deepEqual(parseTool("t.md", withEnv("NO_TRACK=1")).env, { NO_TRACK: "1" });
    assert.throws(() => parseTool("t.md", withEnv("X=$(id)")), /KEY=literal/);
    for (const kv of ["PATH=/x", "PYTHONPATH=.", "NODE_OPTIONS=--require", "LD_PRELOAD=x", "DYLD_INSERT_LIBRARIES=x", "ComSpec=x"]) {
      assert.throws(() => parseTool("t.md", withEnv(kv.toUpperCase() === kv ? kv : kv)), /KEY=literal|changes what gets loaded/, kv);
    }
  });

  test("the published package ships the registry", async () => {
    const pkg = JSON.parse(await read(path.join(REPO, "package.json")));
    assert.ok(pkg.files.includes("tools"));
  });
});


describe("tool add/remove", () => {
  const WIN = process.platform === "win32";
  const SEP = WIN ? ";" : ":";
  const PINS = {};
  const re = (s) => s.replace(/\./g, "\\.");
  before(async () => {
    for (const [n, t] of await readTools()) PINS[n] = t.pin;
  });

  // git stays on PATH for graphify's preflight; nothing else from the real PATH
  // does, so a real graphify/openspec installed on this machine is never reached.
  const gitDir = (() => {
    const r = spawnSync(WIN ? "where" : "which", ["git"], { encoding: "utf8" });
    return r.status === 0 ? path.dirname(r.stdout.split(/\r?\n/)[0].trim()) : null;
  })();

  const STUB = `const fs = require("fs"), path = require("path");
const bin = process.argv[2];
const argv = process.argv.slice(3);
fs.appendFileSync(process.env.STUB_LOG, JSON.stringify([bin, ...argv]) + "\\n");
fs.appendFileSync(process.env.STUB_LOG + ".env", JSON.stringify([bin, process.env.GRAPHIFY_NO_AUTO_REFRESH ?? null]) + "\\n");
fs.appendFileSync(process.env.STUB_LOG + ".cwd", JSON.stringify([bin, argv[0] ?? null, process.cwd()]) + "\\n");
if (argv[0] === "--version") { console.log(bin + " " + (process.env.STUB_VERSION || "0.0.1")); process.exit(0); }
if (process.env.STUB_FAIL === argv.join(" ")) process.exit(3);
if (process.env.STUB_CLAUDE) fs.writeFileSync("CLAUDE.md", "# made by the tool\\n");
if (process.env.STUB_REWRITE && fs.existsSync("AGENTS.md")) fs.appendFileSync("AGENTS.md", "tool line\\n");
if (bin === "graphify" && argv.join(" ") === "hook install") {
  const hooks = path.join(".git", "hooks");
  fs.mkdirSync(hooks, { recursive: true });
  if (process.env.STUB_TOUCH_HOOK) fs.appendFileSync(path.join(hooks, "pre-push"), "touched\\n");
  // Like graphify: an existing hook gets its marked block replaced, nothing else
  // (STUB_WIPE_HOOK breaks that rule, to prove canonkit notices).
  for (const [hook, tag] of [["post-commit", "hook"], ["post-checkout", "checkout-hook"]]) {
    const file = path.join(hooks, hook);
    const block = "# graphify-" + tag + "-start\\nnew\\n# graphify-" + tag + "-end\\n";
    const old = fs.existsSync(file) && !process.env.STUB_WIPE_HOOK ? fs.readFileSync(file, "utf8") : "#!/bin/sh\\n";
    const re = new RegExp("# graphify-" + tag + "-start[\\\\s\\\\S]*?# graphify-" + tag + "-end\\n?");
    fs.writeFileSync(file, re.test(old) ? old.replace(re, block) : old + block);
  }
  if (process.env.STUB_EXTRA_HOOK) fs.writeFileSync(path.join(hooks, "pre-push"), "#!/bin/sh\\n");
}
if (bin === "openspec" && argv[0] === "init") fs.mkdirSync("openspec", { recursive: true });
`;

  /** A shim on PATH named like the tool: a .cmd on Windows (what npm installs), sh elsewhere. */
  const shim = (dir, name, js) => writeCommand(dir, name, js, { passName: true });

  async function setup(name, { git = false } = {}) {
    const { root, home, project } = await scratch(`tool-${name}`);
    const bin = path.join(root, "bin");
    await mkdir(bin);
    await writeFile(path.join(bin, "stub.cjs"), STUB);
    for (const t of ["graphify", "openspec"]) await shim(bin, t, path.join(bin, "stub.cjs"));
    const log = path.join(root, "argv.log");
    const gitconfig = path.join(root, "gitconfig");
    await writeFile(gitconfig, "");
    const env = (extra = {}, PATH = [bin, gitDir].filter(Boolean).join(SEP)) => {
      const base = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.toUpperCase() !== "PATH"));
      // The git config of the machine running the tests (a global core.hooksPath,
      // say) must not decide what these tests see.
      return { ...base, PATH, STUB_LOG: log, GIT_CONFIG_GLOBAL: gitconfig, GIT_CONFIG_NOSYSTEM: "1", ...extra };
    };
    if (git) spawnSync("git", ["init", "-q", project], { env: env() });
    const tool = (args, extra, PATH) => {
      return runCli(["tool", ...args], { home, cwd: project, env: env(extra, PATH) });
    };
    const calls = async () =>
      existsSync(log) ? (await read(log)).trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
    return { root, home, project, bin, tool, calls, env };
  }

  test("runs the registry's setup with exactly its arguments and writes no CLAUDE.md", async () => {
    const { project, tool, calls } = await setup("openspec-args");
    const r = tool(["add", "openspec", "--yes"], { STUB_VERSION: PINS.openspec });
    assert.equal(r.status, 0, r.out);
    assert.deepEqual(await calls(), [["openspec", "--version"], ["openspec", "init", "--tools", "claude,codex"]]);
    assert.equal(existsSync(path.join(project, "CLAUDE.md")), false);
    assert.equal(existsSync(path.join(project, ".claude", "CLAUDE.md")), false);
    const agentsMd = await read(path.join(project, "AGENTS.md"));
    assert.match(agentsMd, /agent-team-config:complements:start/);
    assert.match(agentsMd, /\*\*openspec\*\* — /);
    // The lifecycle entry point must survive the actual project-tool install.
    const rules = (await readTools()).get("openspec").rules;
    for (const rule of rules) assert.ok(agentsMd.includes(rule));
    assert.match(agentsMd, /orchestrate skill's OpenSpec change lifecycle/);
    assert.deepEqual((await readdir(project)).sort(), ["AGENTS.md", "openspec"], "integration must not create a parallel plan or spec");
    // The confirmation names what will run, from where, and what it touches.
    assert.match(r.out, /binary: +\S*openspec/);
    assert.match(r.out, /runs: +.*openspec\S* init --tools claude,codex/);
    assert.match(r.out, /touches:/);
  });

  test("--version runs from the binary's own directory, the setup from the project", async () => {
    const { root, project, bin, tool } = await setup("version-cwd");
    assert.equal(tool(["add", "openspec", "--yes"], { STUB_VERSION: PINS.openspec }).status, 0);
    assert.equal(tool(["list"]).status, 0);
    const runs = (await read(path.join(root, "argv.log.cwd"))).trim().split("\n").map((l) => JSON.parse(l));
    // realpath on both sides: macOS tmpdir is /var but cwd is /private/var, and
    // Windows may hand back a short (8.3) or differently cased path.
    const real = (p) => realpathSync.native(p);
    const probes = runs.filter(([, first]) => first === "--version");
    // add's, then list's — one per registry tool.
    assert.equal(probes.filter(([b]) => b === "openspec").length, 2, JSON.stringify(runs));
    for (const [, , cwd] of probes) assert.equal(real(cwd), real(bin));
    // The contrast keeps the check honest: once confirmed, the setup does run in the project.
    const setupRun = runs.find(([, first]) => first === "init");
    assert.ok(setupRun, JSON.stringify(runs));
    assert.equal(real(setupRun[2]), real(project));
  });

  test("without a terminal and without --yes, nothing runs past --version", async () => {
    const { project, tool, calls } = await setup("no-tty");
    const r = tool(["add", "openspec"]);
    assert.equal(r.status, 1);
    assert.match(r.out, /--yes/);
    assert.deepEqual(await calls(), [["openspec", "--version"]]);
    assert.equal(existsSync(path.join(project, "AGENTS.md")), false);
  });

  test("--dry-run spawns nothing, not even --version", async () => {
    const { project, tool, calls } = await setup("dry");
    await writeFile(path.join(project, "AGENTS.md"), "# p\n");
    const r = tool(["add", "openspec", "--dry-run", "--yes"]);
    assert.equal(r.status, 0, r.out);
    assert.deepEqual(await calls(), []);
    assert.equal(await read(path.join(project, "AGENTS.md")), "# p\n");
    assert.match(r.out, /would add it/);
  });

  test("a missing binary prints the pinned install command, exits 1, writes nothing", async () => {
    const { root, project, tool } = await setup("missing");
    const empty = path.join(root, "empty");
    await mkdir(empty);
    const o = tool(["add", "openspec", "--yes"], {}, empty);
    assert.equal(o.status, 1);
    assert.match(o.out, new RegExp(`@fission-ai/openspec@${re(PINS.openspec)}`));
    const g = tool(["add", "graphify", "--yes"], {}, empty);
    assert.equal(g.status, 1);
    assert.match(g.out, new RegExp(`graphifyy==${re(PINS.graphify)}`));
    assert.match(g.out, /two y/);
    assert.deepEqual(await readdir(project), []);
  });

  test("a failed setup step stops before the block is written", async () => {
    const { project, tool } = await setup("fail");
    await writeFile(path.join(project, "AGENTS.md"), "# p\n");
    const r = tool(["add", "openspec", "--yes"], { STUB_FAIL: "init --tools claude,codex" });
    assert.equal(r.status, 1);
    assert.match(r.out, /exit 3/);
    assert.equal(await read(path.join(project, "AGENTS.md")), "# p\n");
  });

  test("a CLAUDE.md that appears during setup gets a loud warning", async () => {
    const { tool } = await setup("claude-md");
    const r = tool(["add", "openspec", "--yes"], { STUB_CLAUDE: "1" });
    assert.match(r.stderr, /!!.*CLAUDE\.md appeared during setup/);
  });

  test("the block is written after setup, onto whatever setup left in AGENTS.md", async () => {
    const { project, tool } = await setup("rewrite");
    await writeFile(path.join(project, "AGENTS.md"), "# p\n");
    assert.equal(tool(["add", "openspec", "--yes"], { STUB_REWRITE: "1" }).status, 0);
    const agentsMd = await read(path.join(project, "AGENTS.md"));
    assert.match(agentsMd, /^# p\ntool line\n\n<!-- agent-team-config:complements:start -->/);
  });

  for (const [label, eol] of [["LF", "\n"], ["CRLF", "\r\n"]]) {
    test(`add and remove twice leave a ${label} AGENTS.md byte-identical, specialists intact`, { skip: !gitDir }, async () => {
      const { home, project, tool } = await setup(`idem-${label}`, { git: true });
      const target = path.join(project, "AGENTS.md");
      await writeFile(target, ["# projeto", "", "instrucoes locais", ""].join(eol));
      assert.equal(run(["add", "maya"], { home, cwd: project }).status, 0);
      const before = await read(target);

      for (const name of ["openspec", "graphify"]) {
        const r = tool(["add", name, "--yes"]);
        assert.equal(r.status, 0, r.out);
      }
      const both = await read(target);
      assert.match(both, /\*\*maya\*\*/);
      assert.match(both, /\*\*graphify\*\*[\s\S]*\*\*openspec\*\*/);
      if (eol === "\r\n") assert.doesNotMatch(both, /(^|[^\r])\n/);

      for (let i = 0; i < 2; i++) {
        for (const name of ["openspec", "graphify"]) {
          const r = tool(["add", name, "--yes"]);
          assert.equal(r.status, 0, r.out);
          assert.equal(await read(target), both, `add ${name} run ${i + 1} changed the file`);
        }
      }

      assert.equal(tool(["remove", "graphify"]).status, 0);
      assert.doesNotMatch(await read(target), /\*\*graphify\*\*/);
      for (let i = 0; i < 2; i++) assert.equal(tool(["remove", "openspec"]).status, 0);
      // The last tool takes the block with it, and the file is back to what it was.
      assert.equal(await read(target), before);
      // remove never touches what the tool wrote.
      assert.ok(existsSync(path.join(project, "openspec")));
    });
  }

  test("graphify runs its preflight, then exactly hook install and update .", { skip: !gitDir }, async () => {
    const { project, tool, calls } = await setup("graphify-ok", { git: true });
    const r = tool(["add", "graphify", "--with-git-hooks", "--yes"], { STUB_VERSION: PINS.graphify });
    assert.equal(r.status, 0, r.out);
    assert.deepEqual(await calls(), [["graphify", "--version"], ["graphify", "hook", "install"], ["graphify", "update", "."]]);
    assert.doesNotMatch(r.out, /!!/);
    const agentsMd = await read(path.join(project, "AGENTS.md"));
    assert.match(agentsMd, /\*\*graphify\*\* — /);
    // Freshness guidance must reach the consuming project, within the 3-line budget.
    const rules = (await readTools()).get("graphify").rules;
    for (const rule of rules) assert.ok(agentsMd.includes(rule));
    assert.match(agentsMd, /git status --porcelain --untracked-files=normal/);
    assert.match(r.out, /WARNING: --with-git-hooks[\s\S]*before review/);
  });

  test("graphify defaults to manual updates, even with --yes and on repeated adds", { skip: !gitDir }, async () => {
    const { project, tool, calls } = await setup("graphify-manual", { git: true });
    const config = path.join(project, ".git", "config");
    const beforeConfig = await read(config);
    const hooksDir = path.join(project, ".git", "hooks");
    const beforeHooks = await readdir(hooksDir);
    for (let i = 0; i < 2; i++) {
      const r = tool(["add", "graphify", "--yes"], { STUB_VERSION: PINS.graphify });
      assert.equal(r.status, 0, r.out);
      assert.match(r.out, /no hooks or merge driver installed or removed/);
      assert.doesNotMatch(r.out, /hook install/);
    }
    assert.deepEqual(await calls(), [
      ["graphify", "--version"], ["graphify", "update", "."],
      ["graphify", "--version"], ["graphify", "update", "."],
    ]);
    assert.deepEqual(await readdir(hooksDir), beforeHooks);
    assert.equal(await read(config), beforeConfig);
    assert.equal(existsSync(path.join(project, ".gitattributes")), false);
    assert.match(await read(path.join(project, "AGENTS.md")), /git status --porcelain/);
  });

  test("graphify keeps only GRAPH_REPORT.md versioned, in a block that repeated adds leave alone", { skip: !gitDir }, async () => {
    const { project, tool, env } = await setup("graphify-gitignore", { git: true });
    const target = path.join(project, ".gitignore");
    await writeFile(target, "node_modules/\n");
    const dry = tool(["add", "graphify", "--dry-run"]);
    assert.match(dry.out, /would add the graphify block in \.gitignore/);
    assert.equal(await read(target), "node_modules/\n");

    assert.equal(tool(["add", "graphify", "--yes"]).status, 0);
    const once = await read(target);
    assert.match(once, /^node_modules\/\n\n# agent-team-config:gitignore:graphify:start\n[\s\S]*graphify-out\/\*\n!graphify-out\/GRAPH_REPORT\.md\n# agent-team-config:gitignore:graphify:end\n$/);
    const again = tool(["add", "graphify", "--yes"]);
    assert.match(again.out, /already current: \.gitignore/);
    assert.equal(await read(target), once);

    // What git actually does with it.
    const ignored = (f) => spawnSync("git", ["-C", project, "check-ignore", "-q", f], { env: env() }).status === 0;
    for (const f of ["graphify-out/graph.json", "graphify-out/.graphify_python", "graphify-out/cache/ast/x.json", "graphify-out/memory/q.md"]) {
      assert.ok(ignored(f), `${f} should be ignored`);
    }
    assert.equal(ignored("graphify-out/GRAPH_REPORT.md"), false);

    // remove leaves the block, and says so.
    const r = tool(["remove", "graphify"]);
    assert.match(r.out, /\.gitignore \(canonkit's graphify block/);
    assert.equal(await read(target), once);
  });

  test("graphify leaves a .gitignore that already decides graphify-out/ as it is", { skip: !gitDir }, async () => {
    const { project, tool } = await setup("graphify-gitignore-own", { git: true });
    const target = path.join(project, ".gitignore");
    // Versioning graph.json on purpose: an appended block would overrule it.
    await writeFile(target, "graphify-out/cache/\r\n");
    const r = tool(["add", "graphify", "--yes"]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /already has its own rules for graphify-out \(graphify-out\/cache\/\); left as is/);
    assert.equal(await read(target), "graphify-out/cache/\r\n");
  });

  test("graphify points out output committed before the block, without untracking it", { skip: !gitDir }, async () => {
    const { project, tool, env } = await setup("graphify-gitignore-tracked", { git: true });
    await mkdir(path.join(project, "graphify-out"));
    for (const f of ["graph.json", "GRAPH_REPORT.md"]) await writeFile(path.join(project, "graphify-out", f), "{}\n");
    assert.equal(spawnSync("git", ["-C", project, "add", "graphify-out"], { env: env() }).status, 0);
    const r = tool(["add", "graphify", "--yes"]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /still tracked despite \.gitignore: graphify-out\/graph\.json\n/);
    assert.doesNotMatch(r.out, /tracked despite[^\n]*GRAPH_REPORT/);
    assert.match(r.out, /git rm -r --cached -q -- graphify-out && git add -- graphify-out/);
    const index = spawnSync("git", ["-C", project, "ls-files"], { env: env(), encoding: "utf8" }).stdout;
    assert.match(index, /graphify-out\/graph\.json/);
  });

  test("manual setup preserves existing Git automation and warns about migration", { skip: !gitDir }, async () => {
    // Cover hooks alone, driver alone, and a hook manager independently.
    for (const mode of ["hooks", "driver", "custom-path", "husky"]) {
      const { project, tool, calls, env } = await setup(`graphify-migrate-${mode}`, { git: true });
      const custom = mode === "custom-path" || mode === "husky";
      const hooksDir = path.join(project, custom ? ".husky" : ".git/hooks");
      await mkdir(hooksDir, { recursive: true });
      if (custom) {
        assert.equal(spawnSync("git", ["-C", project, "config", "core.hooksPath", mode === "husky" ? ".husky/_" : ".husky"], { env: env() }).status, 0);
      }
      const files = [path.join(project, ".git/config"), path.join(project, ".gitattributes")];
      await writeFile(files[1], "graphify-out/graph.json merge=graphify\n");
      if (mode === "driver") {
        assert.equal(spawnSync("git", ["-C", project, "config", "merge.graphify.driver", "python -m graphify merge-driver %O %A %B"], { env: env() }).status, 0);
      } else {
        const hook = path.join(hooksDir, "post-commit");
        await writeFile(hook, "#!/bin/sh\necho mine\n# graphify-hook-start\nold\n# graphify-hook-end\n");
        files.push(hook);
      }
      const customHook = path.join(hooksDir, "post-checkout");
      await writeFile(customHook, "#!/bin/sh\necho custom\n");
      files.push(customHook);
      const before = await Promise.all(files.map(read));
      const r = tool(["add", "graphify", "--yes"]);
      assert.equal(r.status, 0, r.out);
      assert.match(r.stderr, /Existing graphify Git automation remains enabled/);
      assert.match(r.stderr, /No migration performed[\s\S]*graphify hook uninstall/);
      assert.deepEqual(await Promise.all(files.map(read)), before);
      assert.deepEqual(await calls(), [["graphify", "--version"], ["graphify", "update", "."]]);
    }
  });

  test("both Graphify modes require a repository root and git before setup", { skip: !gitDir }, async () => {
    for (const flags of [[], ["--with-git-hooks"]]) {
      for (const mode of ["no-git", "no-repo", "subdirectory"]) {
        const { root, project, bin, tool, calls, env } = await setup(`graphify-preflight-${flags.length}-${mode}`, { git: mode === "subdirectory" });
        if (mode === "subdirectory") {
          // Make the project a directory inside another repository.
          assert.equal(spawnSync("git", ["init", "-q", root], { env: env() }).status, 0);
          await rm(path.join(project, ".git"), { recursive: true });
        }
        const r = tool(["add", "graphify", ...flags, "--yes"], {}, mode === "no-git" ? bin : undefined);
        assert.equal(r.status, 1, r.out);
        assert.match(r.out, /needs git|Not a git repository|Run this from the repository root/);
        assert.deepEqual(await calls(), [["graphify", "--version"]]);
        assert.equal(existsSync(path.join(project, "AGENTS.md")), false);
      }
    }
  });

  test("--with-git-hooks is rejected outside tool add graphify before any tool runs", async () => {
    const { tool, calls } = await setup("graphify-flag-scope");
    for (const args of [["add", "openspec"], ["remove", "graphify"], ["list"]]) {
      const r = tool([...args, "--with-git-hooks", "--yes"]);
      assert.equal(r.status, 1, r.out);
      assert.match(r.out, /only valid for: canonkit tool add graphify/);
    }
    assert.deepEqual(await calls(), []);
  });

  test("--dry-run in either Graphify mode executes nothing", async () => {
    const { root, project, bin, tool, calls } = await setup("graphify-modes-dry");
    const fakeGit = path.join(root, "fake-git");
    await shim(fakeGit, "git", path.join(bin, "stub.cjs"));
    for (const flags of [[], ["--with-git-hooks"]]) {
      const r = tool(["add", "graphify", ...flags, "--dry-run"], {}, [bin, fakeGit].join(SEP));
      assert.equal(r.status, 0, r.out);
      assert.equal(/runs:.*hook install/.test(r.out), flags.length > 0);
    }
    assert.deepEqual(await calls(), []);
    assert.deepEqual(await readdir(project), []);
  });

  test("hook opt-in without --yes stops before installing hooks on a non-TTY", { skip: !gitDir }, async () => {
    const { tool, calls } = await setup("graphify-opt-in-confirm", { git: true });
    const r = tool(["add", "graphify", "--with-git-hooks"]);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /Trust every branch/);
    assert.match(r.out, /no terminal to confirm/);
    assert.deepEqual(await calls(), [["graphify", "--version"]]);
  });

  test("graphify does not install over an existing hook", { skip: !gitDir }, async () => {
    const { project, tool, calls } = await setup("graphify-hook", { git: true });
    const hook = path.join(project, ".git", "hooks", "post-commit");
    await writeFile(hook, "#!/bin/sh\necho mine\n");
    const r = tool(["add", "graphify", "--with-git-hooks", "--yes"]);
    assert.equal(r.status, 1);
    assert.match(r.out, /never overwrites a git hook/);
    assert.match(r.out, /graphify hook install/);
    assert.deepEqual(await calls(), [["graphify", "--version"]]);
    assert.equal(await read(hook), "#!/bin/sh\necho mine\n");
    assert.equal(existsSync(path.join(project, "AGENTS.md")), false);
  });

  test("every graphify run, --version and list included, has its user-skill rewrite switched off", { skip: !gitDir }, async () => {
    const { root, tool } = await setup("graphify-env", { git: true });
    assert.equal(tool(["add", "graphify", "--yes"]).status, 0);
    assert.equal(tool(["add", "graphify", "--with-git-hooks", "--yes"]).status, 0);
    assert.equal(tool(["list"]).status, 0);
    const runs = (await read(path.join(root, "argv.log.env"))).trim().split("\n").map((l) => JSON.parse(l));
    const graphify = runs.filter(([b]) => b === "graphify");
    assert.equal(graphify.length, 6); // manual add, hook opt-in add, list's --version
    assert.ok(graphify.every(([, v]) => v === "1"), JSON.stringify(graphify));
    // A registry value, not a global one: openspec's runs do not get it.
    assert.ok(runs.filter(([b]) => b === "openspec").every(([, v]) => v === null));
  });

  test("graphify accepts a hook that already carries its own block, keeping the user's lines", { skip: !gitDir }, async () => {
    const { project, tool } = await setup("graphify-chained", { git: true });
    const hook = path.join(project, ".git", "hooks", "post-commit");
    await writeFile(hook, "#!/bin/sh\necho mine\n# graphify-hook-start\nold\n# graphify-hook-end\n");
    const r = tool(["add", "graphify", "--with-git-hooks", "--yes"], { STUB_VERSION: PINS.graphify });
    assert.equal(r.status, 0, r.out);
    assert.doesNotMatch(r.stderr, /!!/);
    const after = await read(hook);
    assert.match(after, /echo mine/);
    assert.match(after, /# graphify-hook-start\nnew\n/);
  });

  test("a chained hook whose own lines graphify wiped is reported loudly", { skip: !gitDir }, async () => {
    const { project, tool } = await setup("graphify-wiped", { git: true });
    await writeFile(path.join(project, ".git", "hooks", "post-commit"), "#!/bin/sh\necho mine\n# graphify-hook-start\nold\n# graphify-hook-end\n");
    const r = tool(["add", "graphify", "--with-git-hooks", "--yes"], { STUB_WIPE_HOOK: "1" });
    assert.match(r.stderr, /git hook changed outside graphify's block: post-commit/);
  });

  test("graphify refuses a repo whose own files its hooks would import or run", { skip: !gitDir }, async () => {
    for (const flags of [[], ["--with-git-hooks"]]) {
      for (const [label, plant] of [
        ["package", (p) => mkdir(path.join(p, "graphify"))],
        ["module", (p) => writeFile(path.join(p, "graphify.py"), "")],
      ]) {
        const { project, tool, calls } = await setup(`graphify-shadow-${flags.length}-${label}`, { git: true });
        await plant(project);
        const r = tool(["add", "graphify", ...flags, "--yes"]);
        assert.equal(r.status, 1, label);
        assert.match(r.out, /would be imported by graphify's hooks/);
        assert.deepEqual(await calls(), [["graphify", "--version"]]);
      }

      const { project, tool, env } = await setup(`graphify-pinned-python-${flags.length}`, { git: true });
      await mkdir(path.join(project, "graphify-out"));
      await writeFile(path.join(project, "graphify-out", ".graphify_python"), "/tmp/evil\n");
      spawnSync("git", ["-C", project, "add", "-f", "graphify-out/.graphify_python"], { env: env() });
      const r = tool(["add", "graphify", ...flags, "--yes"]);
      assert.equal(r.status, 1);
      assert.match(r.out, /\.graphify_python is committed/);
    }
  });

  test("a failed manual update preserves the project block and reports no hook installation", { skip: !gitDir }, async () => {
    const { project, tool, calls } = await setup("graphify-manual-fail", { git: true });
    const file = path.join(project, "AGENTS.md");
    await writeFile(file, "# project rules\n");
    const r = tool(["add", "graphify", "--yes"], { STUB_FAIL: "update ." });
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /canonkit did not change AGENTS\.md/);
    assert.doesNotMatch(r.out, /Already done:|To undo it:/);
    assert.equal(await read(file), "# project rules\n");
    assert.deepEqual(await calls(), [["graphify", "--version"], ["graphify", "update", "."]]);
    assert.equal(existsSync(path.join(project, ".git/hooks/post-commit")), false);
  });

  test("a binary found only inside the project is named as such, not as missing", async () => {
    const { root, project, tool } = await setup("inside-only");
    const venv = path.join(project, ".venv", "bin");
    await shim(venv, "graphify", path.join(root, "bin", "stub.cjs"));
    const r = tool(["add", "graphify", "--with-git-hooks", "--yes"], {}, venv);
    assert.equal(r.status, 1);
    assert.match(r.out, /found only inside the project/);
    assert.match(r.out, /graphifyy==/);
  });

  test("a change graphify makes to a hook that was already there is reported loudly", { skip: !gitDir }, async () => {
    const { project, tool } = await setup("graphify-touch", { git: true });
    await writeFile(path.join(project, ".git", "hooks", "pre-push"), "#!/bin/sh\n");
    const r = tool(["add", "graphify", "--with-git-hooks", "--yes"], { STUB_TOUCH_HOOK: "1" });
    assert.match(r.stderr, /git hook changed: pre-push/);
  });

  test("a step failing after an earlier one succeeded says what was done and how to undo it", { skip: !gitDir }, async () => {
    const { project, tool } = await setup("graphify-partial", { git: true });
    const r = tool(["add", "graphify", "--with-git-hooks", "--yes"], { STUB_FAIL: "update ." });
    assert.equal(r.status, 1);
    assert.match(r.out, /canonkit did not change AGENTS\.md/);
    assert.match(r.out, /Already done: graphify hook install/);
    assert.match(r.out, /To undo it: graphify hook uninstall/);
    assert.equal(existsSync(path.join(project, "AGENTS.md")), false);
  });

  test("a graphify dry run spawns nothing, git included", async () => {
    const { root, project, bin, tool, calls } = await setup("graphify-dry");
    // A git that logs like the tools do: if the preflight ran, it would show.
    const fakeGit = path.join(root, "fake-git");
    await shim(fakeGit, "git", path.join(bin, "stub.cjs"));
    const r = tool(["add", "graphify", "--with-git-hooks", "--dry-run"], {}, [bin, fakeGit].join(SEP));
    assert.equal(r.status, 0, r.out);
    assert.deepEqual(await calls(), []);
    assert.deepEqual(await readdir(project), []);
  });

  test("an AGENTS.md that is a symlink is written through, not replaced", async (t) => {
    const { project, tool } = await setup("symlinked");
    const shared = path.join(project, "shared.md");
    await writeFile(shared, "# shared\n");
    try {
      await symlink("shared.md", path.join(project, "AGENTS.md"), "file");
    } catch {
      t.skip("this machine cannot create file symlinks");
      return;
    }
    assert.equal(tool(["add", "openspec", "--yes"]).status, 0);
    assert.ok((await lstat(path.join(project, "AGENTS.md"))).isSymbolicLink());
    assert.match(await read(shared), /\*\*openspec\*\*/);
  });

  test("tools added before a specialist come out without leaving a trace", async () => {
    const { home, project, tool } = await setup("order");
    const target = path.join(project, "AGENTS.md");
    await writeFile(target, "# p\n");
    assert.equal(run(["add", "maya"], { home, cwd: project }).status, 0);
    const onlySpecialist = await read(target);
    assert.equal(run(["remove", "maya"], { home, cwd: project }).status, 0);

    assert.equal(tool(["add", "openspec", "--yes"]).status, 0);
    assert.equal(run(["add", "maya"], { home, cwd: project }).status, 0);
    assert.equal(tool(["remove", "openspec"]).status, 0);
    // Same bytes as if the tool had never been added.
    assert.equal(await read(target), onlySpecialist);
  });

  test("graphify does not install when core.hooksPath is set", { skip: !gitDir }, async () => {
    const { project, tool, calls, env } = await setup("graphify-hookspath", { git: true });
    spawnSync("git", ["-C", project, "config", "core.hooksPath", ".husky"], { env: env() });
    const r = tool(["add", "graphify", "--with-git-hooks", "--yes"]);
    assert.equal(r.status, 1);
    assert.match(r.out, /core\.hooksPath is set/);
    assert.deepEqual(await calls(), [["graphify", "--version"]]);
  });

  test("a hook graphify did not announce is reported loudly", { skip: !gitDir }, async () => {
    const { tool } = await setup("graphify-extra", { git: true });
    const r = tool(["add", "graphify", "--with-git-hooks", "--yes"], { STUB_EXTRA_HOOK: "1" });
    assert.match(r.stderr, /unexpected new git hook: pre-push/);
  });

  test("a binary planted in the project is not the one run", async () => {
    const { root, project, bin, tool, calls } = await setup("planted");
    const planted = path.join(root, "planted.cjs");
    await writeFile(planted, `require("fs").writeFileSync(${JSON.stringify(path.join(root, "PLANTED"))}, "ran");\n`);
    // In node_modules/.bin (where `npx canonkit` puts PATH's first entry),
    // reached absolute and relative. At the project root only on Windows: a
    // POSIX shim there is a file named `openspec`, which the real `openspec
    // init` then cannot create its openspec/ folder over.
    const dotBin = path.join(project, "node_modules", ".bin");
    await shim(dotBin, "openspec", planted);
    if (WIN) await shim(project, "openspec", planted);
    const r = tool(["add", "openspec", "--yes"], {}, [dotBin, path.join("node_modules", ".bin"), project, ".", "", bin].join(SEP));
    assert.equal(r.status, 0, r.out);
    assert.equal(existsSync(path.join(root, "PLANTED")), false);
    assert.equal((await calls()).length, 2);
  });

  test("an installed version off the pin is a warning, never an update", async () => {
    const { tool, calls } = await setup("off-pin");
    const r = tool(["add", "openspec", "--yes"], { STUB_VERSION: "0.0.1" });
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, new RegExp(`0\\.0\\.1 — canonkit pins ${re(PINS.openspec)}`));
    assert.equal((await calls()).length, 2);
  });

  test("list shows each pin, the version on PATH, and what is active here", async () => {
    const { tool } = await setup("list");
    assert.equal(tool(["add", "openspec", "--yes"], { STUB_VERSION: "9.9.9" }).status, 0);
    const r = tool(["list"], { STUB_VERSION: "9.9.9" });
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, new RegExp(`openspec +pin ${re(PINS.openspec)} +installed 9\\.9\\.9 +active`));
    assert.match(r.out, /graphify +pin \S+ +installed 9\.9\.9 +-/);
  });

  test("refuses an unknown tool, a bad shape, and the source of truth", async () => {
    const { home, tool } = await setup("refuse");
    assert.match(tool(["add", "nothing", "--yes"]).out, /Not a canonkit tool/);
    assert.equal(tool(["add"]).status, 1);
    assert.equal(tool(["add", "openspec", "graphify"]).status, 1);
    const self = run(["tool", "add", "openspec", "--yes"], { home, cwd: REPO });
    assert.equal(self.status, 1);
    assert.match(self.out, /source of truth/);
  });

  test("canonkit list points at tool list", async () => {
    const { home, project } = await scratch("list-pointer");
    assert.match(run(["list"], { home, cwd: project }).out, /canonkit tool list/);
  });
});


/* ---------------------------------------------------------- model choices */

describe("model choices", () => {
  const HELP = readFileSync(path.join(REPO, "test", "fixtures", "claude", "help-2.1.322.txt"), "utf8");
  const userModels = (home) => path.join(home, ".canonkit", "models.json");
  const writeJson = async (file, data) => {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(data));
  };
  const source = async (name) => (await read(path.join(REPO, "agents", `${name}.md`))).replace(/\r\n/g, "\n");
  const body = (text) => text.slice(text.indexOf("\n---", 4));

  // A `claude` on PATH that answers like Claude Code and records every start.
  async function recordingClaude(root) {
    const bin = path.join(root, "claude-bin");
    const log = path.join(root, "claude-starts.log");
    await mkdir(bin, { recursive: true });
    const js = path.join(bin, "claude-fake.cjs");
    await writeFile(js, `require("fs").appendFileSync(${JSON.stringify(log)}, process.argv.slice(2).join(" ") + "\\n");\nprocess.stdout.write(process.argv[2] === "--version" ? "2.1.322 (Claude Code)\\n" : ${JSON.stringify(HELP)});\n`);
    if (process.platform === "win32") await writeFile(path.join(bin, "claude.cmd"), `@"${process.execPath}" "${js}" %*\r\n`);
    else {
      await writeFile(path.join(bin, "claude"), `#!/bin/sh\nexec "${process.execPath}" "${js}" "$@"\n`);
      await chmod(path.join(bin, "claude"), 0o755);
    }
    const starts = () => (existsSync(log) ? readFileSync(log, "utf8").split("\n").filter(Boolean) : []);
    return { env: { PATH: [bin, path.dirname(process.execPath)].join(path.delimiter) }, starts };
  }

  async function recordingCodex(root) {
    const bin = path.join(root, "codex-bin");
    await mkdir(bin, { recursive: true });
    const js = path.join(bin, "codex-fake.cjs");
    const catalog = { models: [
      { slug: "gpt-6-luna", visibility: "list", supported_reasoning_levels: [{ effort: "low" }, { effort: "medium" }] },
      { slug: "gpt-6-astra", visibility: "list", supported_reasoning_levels: [{ effort: "low" }, { effort: "ultra" }] },
    ] };
    await writeFile(js, `process.stdout.write(process.argv[2] === "--version" ? "codex-cli 0.166.0\\n" : ${JSON.stringify(JSON.stringify(catalog))});\n`);
    if (process.platform === "win32") await writeFile(path.join(bin, "codex.cmd"), `@"${process.execPath}" "${js}" %*\r\n`);
    else {
      await writeFile(path.join(bin, "codex"), `#!/bin/sh\nexec "${process.execPath}" "${js}" "$@"\n`);
      await chmod(path.join(bin, "codex"), 0o755);
    }
    return { PATH: [bin, path.dirname(process.execPath)].join(path.delimiter) };
  }

  test("Codex install writes, updates, clears and rejects incompatible model pairs", async () => {
    const { root, home } = await scratch("codex-model-choice-applied");
    const env = { ...await recordingCodex(root) };
    const file = path.join(home, ".codex", "agents", "archie.toml");
    const config = (model, effort) => ({ version: 1, harnesses: { codex: { levels: { deep: { model, effort } } } } });
    await writeJson(userModels(home), config("gpt-6-luna", "low"));
    let result = run(["install", "--codex", "--no-reference"], { home, env });
    assert.equal(result.status, 0, result.out);
    assert.match(await read(file), /^model = "gpt-6-luna"$/m);
    assert.match(await read(file), /^model_reasoning_effort = "low"$/m);

    await writeJson(userModels(home), config("gpt-6-astra", "ultra"));
    result = run(["install", "--codex", "--no-reference"], { home, env });
    assert.equal(result.status, 0, result.out);
    assert.match(await read(file), /^model = "gpt-6-astra"$/m);
    assert.match(await read(file), /^model_reasoning_effort = "ultra"$/m);

    await writeJson(userModels(home), config("gpt-6-astra", "medium"));
    result = run(["install", "--codex", "--no-reference"], { home, env });
    assert.equal(result.status, 0, result.out);
    assert.match(result.out, /does not support effort medium; both settings inherit/);
    assert.doesNotMatch(await read(file), /^model(?:_reasoning_effort)?\s*=/m);

    await writeJson(userModels(home), { version: 1, harnesses: {} });
    result = run(["install", "--codex", "--no-reference"], { home, env });
    assert.equal(result.status, 0, result.out);
    assert.doesNotMatch(await read(file), /^model(?:_reasoning_effort)?\s*=/m);
  });

  test("Codex project core shadows follow project choices and receipt-checked cleanup", async () => {
    const { root, home, project } = await scratch("codex-project-shadows");
    await mkdir(path.join(project, ".git"));
    await writeFile(path.join(project, ".git", "HEAD"), "ref: refs/heads/main\n");
    const env = await recordingCodex(root);
    const user = { version: 1, harnesses: { codex: { levels: { deep: { model: "gpt-6-luna", effort: "low" } } } } };
    const override = { version: 1, harnesses: { codex: { levels: { deep: { model: "gpt-6-astra", effort: "ultra" } } } } };
    const projectConfig = path.join(project, ".canonkit", "models.json");
    const globalFile = path.join(home, ".codex", "agents", "archie.toml");
    const shadow = path.join(project, ".codex", "agents", "archie.toml");
    await writeJson(userModels(home), user);
    await writeJson(projectConfig, override);
    const shadowState = () => JSON.parse(run(["models", "show", "--json"], { home, cwd: project, env }).out).harnesses.codex.agents.archie.projectFile.status;
    assert.equal(shadowState(), "missing");
    assert.match(run(["doctor"], { home, cwd: project, env }).out, /Codex project agent archie: project file missing/);
    let result = run(["install", "--codex", "--no-reference"], { home, cwd: project, env });
    assert.equal(result.status, 0, result.out);
    assert.equal(shadowState(), "current");
    assert.match(await read(globalFile), /^model = "gpt-6-luna"$/m);
    assert.match(await read(shadow), /^model = "gpt-6-astra"$/m);
    assert.match(await read(shadow), /^model_reasoning_effort = "ultra"$/m);
    const revisedAgents = (await readAgents()).map((agent) => agent.name === "archie" ? { ...agent, body: `${agent.body}\nUPDATED_SOURCE` } : agent);
    assert.ok((await modelDiagnosis(revisedAgents, { home, cwd: project })).some((row) => /Codex project agent archie: project file stale/.test(row.detail)));
    await writeJson(projectConfig, { version: 1, harnesses: { codex: { levels: { deep: { model: "gpt-6-astra", effort: "low" } } } } });
    assert.equal(shadowState(), "stale");
    assert.match(run(["doctor"], { home, cwd: project, env }).out, /Codex project agent archie: project file stale/);
    await writeJson(projectConfig, override);
    result = run(["uninstall", "--project"], { home, cwd: project, env });
    assert.equal(result.status, 0, result.out);
    assert.equal(existsSync(shadow), false);
    result = run(["install", "--codex", "--no-reference"], { home, cwd: project, env });
    assert.equal(result.status, 0, result.out);
    assert.equal(existsSync(shadow), true);

    await writeJson(projectConfig, { version: 1, harnesses: {} });
    assert.equal(shadowState(), "retire-pending");
    assert.match(run(["doctor"], { home, cwd: project, env }).out, /Codex project agent archie: project file retire-pending/);
    result = run(["install", "--codex", "--no-reference"], { home, cwd: project, env });
    assert.equal(result.status, 0, result.out);
    assert.equal(existsSync(shadow), false);

    await writeFile(shadow, "name = \"archie\"\n# personal agent\n");
    await writeJson(projectConfig, override);
    result = run(["install", "--codex", "--no-reference"], { home, cwd: project, env });
    assert.equal(result.status, 0, result.out);
    assert.match(result.out, /preexisting project Codex agent preserved/);
    assert.match(await read(shadow), /personal agent/);
    assert.equal(shadowState(), "unowned");
    await rm(shadow);

    result = run(["install", "--codex", "--no-reference"], { home, cwd: project, env });
    assert.equal(result.status, 0, result.out);
    await writeFile(shadow, (await read(shadow)) + "# edited\n");
    assert.equal(shadowState(), "edited");
    assert.match(run(["doctor"], { home, cwd: project, env }).out, /Codex project agent archie: project file edited/);
    result = run(["install", "--codex", "--no-reference"], { home, cwd: project, env });
    assert.equal(result.status, 0, result.out);
    assert.match(result.out, /ownership detached/);
    assert.match(await read(shadow), /# edited/);
    result = run(["uninstall", "--project"], { home, cwd: project, env });
    assert.equal(result.status, 0, result.out);
    assert.match(await read(shadow), /# edited/);
  });

  test("Codex project specialist uses merged fields", async () => {
    const { root, home, project } = await scratch("codex-specialist-choice");
    const env = await recordingCodex(root);
    await writeJson(userModels(home), { version: 1, harnesses: { codex: { levels: { standard: { model: "gpt-6-luna", effort: "low" } } } } });
    await writeJson(path.join(project, ".canonkit", "models.json"), { version: 1, harnesses: { codex: { agents: { maya: { effort: "medium" } } } } });
    const result = run(["add", "maya"], { home, cwd: project, env });
    assert.equal(result.status, 0, result.out);
    const agent = await read(path.join(project, ".codex", "agents", "maya.toml"));
    assert.match(agent, /^model = "gpt-6-luna"$/m);
    assert.match(agent, /^model_reasoning_effort = "medium"$/m);
  });

  test("known incompatible user and project pairs both inherit without a shadow warning", async () => {
    const { root, home, project } = await scratch("codex-both-incompatible");
    const env = await recordingCodex(root);
    await mkdir(path.join(project, ".git"));
    await writeFile(path.join(project, ".git", "HEAD"), "ref: refs/heads/main\n");
    await writeJson(userModels(home), { version: 1, harnesses: { codex: { levels: { deep: { model: "gpt-6-luna", effort: "ultra" } } } } });
    await writeJson(path.join(project, ".canonkit", "models.json"), { version: 1, harnesses: { codex: { levels: { deep: { model: "gpt-6-astra", effort: "medium" } } } } });
    const result = run(["install", "--codex", "--no-reference"], { home, cwd: project, env });
    assert.equal(result.status, 0, result.out);
    assert.equal(existsSync(path.join(project, ".codex", "agents", "archie.toml")), false);
    const doctor = run(["doctor"], { home, cwd: project, env });
    assert.doesNotMatch(doctor.out, /Codex project agent archie: project file missing/);
    assert.match(doctor.out, /Codex model\/effort pairs are incompatible/);
  });

  test("Codex specialist refuses linked project model choices before writes", async () => {
    const { root, home, project } = await scratch("codex-specialist-config-link");
    const env = await recordingCodex(root);
    const outside = path.join(root, "external-config");
    await writeJson(path.join(outside, "models.json"), { version: 1, harnesses: {} });
    await symlink(outside, path.join(project, ".canonkit"), process.platform === "win32" ? "junction" : "dir");
    const result = run(["add", "maya"], { home, cwd: project, env });
    assert.equal(result.status, 1, result.out);
    assert.match(result.out, /symbolic link or junction/);
    assert.equal(existsSync(path.join(project, ".codex", "agents", "maya.toml")), false);
  });

  test("Codex project install refuses a linked .codex directory before global writes", async () => {
    const { root, home, project } = await scratch("codex-project-link");
    const env = await recordingCodex(root);
    await mkdir(path.join(project, ".git"));
    await writeFile(path.join(project, ".git", "HEAD"), "ref: refs/heads/main\n");
    const outside = path.join(root, "outside");
    await mkdir(outside);
    await symlink(outside, path.join(project, ".codex"), process.platform === "win32" ? "junction" : "dir");
    await writeJson(path.join(project, ".canonkit", "models.json"), { version: 1, harnesses: { codex: { levels: { deep: { model: "gpt-6-astra" } } } } });
    const result = run(["install", "--codex", "--no-reference"], { home, cwd: project, env });
    assert.equal(result.status, 1, result.out);
    assert.match(result.out, /symbolic link or junction/);
    assert.equal(existsSync(path.join(home, ".codex", "agents", "archie.toml")), false);
    assert.equal(existsSync(path.join(outside, "agents", "archie.toml")), false);
  });

  test("no configuration: Claude agents are the source, byte for byte, with no model", async () => {
    const { root, home } = await scratch("models-none");
    const { env } = await recordingClaude(root);
    assert.equal(run(["install", "--claude", "--no-reference"], { home, env }).status, 0);
    for (const name of CORE) {
      const text = await read(path.join(home, ".claude", "agents", `${name}.md`));
      assert.equal(text, await source(name), name);
      assert.doesNotMatch(text, /^(model|effort):/m);
    }
  });

  test("configured choices land in the frontmatter, the body is untouched, and removal clears them", async () => {
    const { root, home } = await scratch("models-configured");
    const { env } = await recordingClaude(root);
    await writeJson(userModels(home), { version: 1, harnesses: { claude: { levels: { deep: { model: "opus", effort: "high" } }, agents: { quinn: { effort: "xhigh" } } } } });
    assert.equal(run(["install", "--claude", "--no-reference"], { home, env }).status, 0);
    const archie = await read(path.join(home, ".claude", "agents", "archie.md"));
    assert.match(archie, /^need: deep\nmodel: "opus"\neffort: "high"\n---$/m);
    assert.equal(body(archie), body(await source("archie")));
    const quinn = await read(path.join(home, ".claude", "agents", "quinn.md"));
    assert.match(quinn, /^effort: "xhigh"$/m);
    assert.doesNotMatch(quinn, /^model:/m);
    assert.equal(await read(path.join(home, ".claude", "agents", "bob.md")), await source("bob"));
    const doctor = run(["doctor"], { home, env });
    assert.match(doctor.out, /^OK\s+agents: /m, "doctor compares with the generated agent");

    await writeJson(userModels(home), { version: 1, harnesses: {} });
    assert.equal(run(["install", "--claude", "--no-reference"], { home, env }).status, 0);
    assert.equal(await read(path.join(home, ".claude", "agents", "archie.md")), await source("archie"));
  });

  test("install refreshes discovery; a dry run starts nothing and says so", async () => {
    const { root, home } = await scratch("models-discovery");
    const { env, starts } = await recordingClaude(root);
    const dry = run(["install", "--claude", "--codex", "--no-reference", "--dry-run"], { home, env });
    assert.equal(dry.status, 0, dry.out);
    assert.match(dry.out, /would run model discovery for: claude, codex \(not run in a dry run\)/);
    assert.deepEqual(starts(), []);
    assert.equal(existsSync(path.join(home, ".canonkit", "model-catalog.json")), false);
    const real = run(["install", "--claude", "--codex", "--no-reference"], { home, env });
    assert.equal(real.status, 0, real.out);
    assert.ok(starts().includes("--help"), starts().join(","));
    const catalog = JSON.parse(await read(path.join(home, ".canonkit", "model-catalog.json")));
    assert.equal(catalog.harnesses.claude.status, "discovered");
    assert.ok(["discovered", "unknown"].includes(catalog.harnesses.codex.status));
  });

  test("user-level agents ignore project choices; project specialists honor them", async () => {
    const { root, home, project } = await scratch("models-project");
    const { env } = await recordingClaude(root);
    await writeJson(userModels(home), { version: 1, harnesses: { claude: { levels: { standard: { model: "sonnet" } } } } });
    await writeJson(path.join(project, ".canonkit", "models.json"), { version: 1, harnesses: { claude: { levels: { standard: { model: "fable", effort: "low" } } } } });
    assert.equal(run(["install", "--claude", "--no-reference"], { home, cwd: project, env }).status, 0);
    const bob = await read(path.join(home, ".claude", "agents", "bob.md"));
    assert.match(bob, /^model: "sonnet"$/m);
    assert.doesNotMatch(bob, /^effort:/m);
    const added = run(["add", "maya"], { home, cwd: project, env });
    assert.equal(added.status, 0, added.out);
    const maya = await read(path.join(project, ".claude", "agents", "maya.md"));
    assert.match(maya, /^model: "fable"\neffort: "low"\n---$/m);
    assert.equal(body(maya), body(await source("maya")));
    assert.doesNotMatch(await read(path.join(project, ".codex", "agents", "maya.toml")), /model/);
  });

  test("an unsupported choices file stops install before anything is written", async () => {
    const { root, home } = await scratch("models-bad-version");
    const { env } = await recordingClaude(root);
    await writeJson(userModels(home), { version: 3 });
    const result = run(["install", "--claude", "--no-reference"], { home, env });
    assert.equal(result.status, 1, result.out);
    assert.match(result.out, /version 3 is not supported/);
    assert.equal(existsSync(path.join(home, ".claude", "agents")), false);
  });

  test("doctor warns on drift from stored files, keeps its exit status, and never runs discovery", async () => {
    const { root, home } = await scratch("models-doctor");
    const { env, starts } = await recordingClaude(root);
    assert.equal(run(["install", "--claude", "--no-reference"], { home, env }).status, 0);
    const before = run(["doctor"], { home, env });
    assert.match(before.out, /^OK\s+models: no model choices configured/m);
    await writeJson(userModels(home), { version: 1, harnesses: { claude: { levels: { deep: { model: "gone-model", effort: "high" } } } } });
    assert.equal(run(["install", "--claude", "--no-reference"], { home, env }).status, 0);
    const startsBefore = starts().length;
    const after = run(["doctor"], { home, env });
    assert.equal(after.status, before.status, after.out);
    assert.match(after.out, /^WARN models: Claude Code user level deep: model 'gone-model' is not in the latest discovery \(fable, opus, sonnet, haiku\) — affects agents archie, iris; if Claude Code rejects it they fall back to inherit$/m);
    // doctor's security check may ask `claude --version`; discovery's `--help` must not run.
    assert.ok(!starts().slice(startsBefore).includes("--help"), starts().slice(startsBefore).join(","));
  });
});

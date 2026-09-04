/**
 * Contract tests for the installer.
 *
 * These run the real CLI against a real filesystem in a throwaway HOME. No
 * mocks: the failure this installer can actually cause is writing the wrong
 * bytes to a file you already had — ~/AGENTS.md, ~/.claude/CLAUDE.md, a
 * project's AGENTS.md — and a mocked fs proves nothing about that.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { applyBlock, readAgents, summaries } from "../bin/cli.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(REPO, "bin", "cli.js");

const CORE = ["archie", "bob", "gard", "perry", "pipe", "pixie", "quinn", "scott", "spencer", "virgo"];
const SPECIALISTS = ["dana", "echo", "iris", "maya", "nova"];

let sandbox;

before(async () => {
  sandbox = await mkdtemp(path.join(os.tmpdir(), "agent-team-config-test-"));
});

after(async () => {
  await rm(sandbox, { recursive: true, force: true });
});

/** A fresh HOME and a fresh project directory, isolated per test. */
async function scratch(name) {
  const root = path.join(sandbox, name);
  const home = path.join(root, "home");
  const project = path.join(root, "project");
  await mkdir(home, { recursive: true });
  await mkdir(project, { recursive: true });
  return { root, home, project };
}

function run(args, { home, cwd }) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd: cwd ?? home,
    encoding: "utf8",
    // os.homedir() reads USERPROFILE on Windows and HOME elsewhere. Setting
    // both is what makes this test suite run the same on all three platforms.
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
  return { ...result, out: (result.stdout ?? "") + (result.stderr ?? "") };
}

const read = (p) => readFile(p, "utf8");

/* ----------------------------------------------------------------- roster */

describe("agent roster", () => {
  test("every agent declares a valid tier", async () => {
    const agents = await readAgents();
    assert.equal(agents.length, CORE.length + SPECIALISTS.length);
    assert.deepEqual(agents.filter((a) => a.tier === "core").map((a) => a.name).sort(), [...CORE].sort());
    assert.deepEqual(agents.filter((a) => a.tier === "specialist").map((a) => a.name).sort(), [...SPECIALISTS].sort());
  });

  test("every agent declares a model the runtime accepts", async () => {
    for (const agent of await readAgents()) {
      assert.ok(["opus", "sonnet", "haiku"].includes(agent.model), `${agent.name}: model is ${agent.model}`);
    }
  });

  test("the roster block carries a summary for every specialist", async () => {
    // The per-project AGENTS.md entry is derived from this block rather than
    // kept in a second list. A specialist missing here would silently install
    // with no description for Codex to route on.
    const summary = await summaries();
    for (const name of SPECIALISTS) {
      assert.ok(summary.get(name), `no roster line for ${name}`);
      assert.ok(!/Aciona quando/i.test(summary.get(name)), `${name}: trailing guidance not stripped`);
    }
  });
});

/* ---------------------------------------------------------------- install */

describe("install", () => {
  test("copies the core team to both runtime paths and nothing else", async () => {
    const { home } = await scratch("install-basic");
    const result = run(["install"], { home });
    assert.equal(result.status, 0, result.out);

    for (const dest of [path.join(home, ".agents"), path.join(home, ".claude", "agents")]) {
      const installed = (await readdir(dest)).map((f) => path.basename(f, ".md")).sort();
      assert.deepEqual(installed, [...CORE].sort(), `wrong contents in ${dest}`);
    }
  });

  test("syncs both reference blocks and puts the import on the first line", async () => {
    const { home } = await scratch("install-reference");
    assert.equal(run(["install"], { home }).status, 0);

    const agentsMd = await read(path.join(home, "AGENTS.md"));
    assert.match(agentsMd, /<!-- agent-team-config:start -->/);
    assert.match(agentsMd, /<!-- agent-team-config:end -->/);

    const claudeMd = await read(path.join(home, ".claude", "CLAUDE.md"));
    assert.equal(claudeMd.split("\n")[0], "@~/AGENTS.md");
    assert.match(claudeMd, /<!-- agent-team-config:routing:start -->/);
    // Routing mechanics are Claude Code only; the roster is runtime-neutral.
    assert.doesNotMatch(agentsMd, /<!-- agent-team-config:routing:start -->/);
  });

  test("--no-reference installs agents without touching the global files", async () => {
    const { home } = await scratch("install-no-reference");
    assert.equal(run(["install", "--no-reference"], { home }).status, 0);

    assert.ok(existsSync(path.join(home, ".claude", "agents", "archie.md")));
    assert.equal(existsSync(path.join(home, "AGENTS.md")), false);
    assert.equal(existsSync(path.join(home, ".claude", "CLAUDE.md")), false);
  });

  test("is idempotent — a second run changes no bytes", async () => {
    const { home } = await scratch("install-idempotent");
    assert.equal(run(["install"], { home }).status, 0);
    const first = {
      agents: await read(path.join(home, "AGENTS.md")),
      claude: await read(path.join(home, ".claude", "CLAUDE.md")),
    };

    const second = run(["install"], { home });
    assert.equal(second.status, 0, second.out);
    assert.match(second.out, /already current/);
    assert.equal(await read(path.join(home, "AGENTS.md")), first.agents);
    assert.equal(await read(path.join(home, ".claude", "CLAUDE.md")), first.claude);
  });

  test("removes a specialist left at user level by an earlier install", async () => {
    // A leftover copy is available in every project and silently defeats the
    // per-project rule. Removing it is what actually enforces the split.
    const { home } = await scratch("install-stray");
    const dest = path.join(home, ".claude", "agents");
    await mkdir(dest, { recursive: true });
    await writeFile(path.join(dest, "maya.md"), "stale copy");
    await writeFile(path.join(dest, "unrelated.md"), "not ours");

    const result = run(["install"], { home });
    assert.equal(result.status, 0, result.out);
    assert.equal(existsSync(path.join(dest, "maya.md")), false);
    // Anything this repo does not own is left alone.
    assert.ok(existsSync(path.join(dest, "unrelated.md")));
  });

  test("preserves everything outside the markers", async () => {
    const { home } = await scratch("install-preserve");
    await mkdir(path.join(home, ".claude"), { recursive: true });
    await writeFile(path.join(home, "AGENTS.md"), "# minhas notas\n\nnao pode sumir\n");
    await writeFile(path.join(home, ".claude", "CLAUDE.md"), "@~/AGENTS.md\n\n# graphify\n\nregra local\n");

    assert.equal(run(["install"], { home }).status, 0);
    assert.match(await read(path.join(home, "AGENTS.md")), /nao pode sumir/);

    const claudeMd = await read(path.join(home, ".claude", "CLAUDE.md"));
    assert.match(claudeMd, /regra local/);
    // The import was already there; adding a second one is the bug this guards.
    assert.equal(claudeMd.match(/^@.*AGENTS\.md$/gm).length, 1);
  });

  test("--dry-run writes nothing", async () => {
    const { home } = await scratch("install-dry");
    const result = run(["install", "--dry-run"], { home });
    assert.equal(result.status, 0, result.out);
    assert.match(result.out, /\[dry-run\]/);
    assert.equal(existsSync(path.join(home, ".claude", "agents")), false);
    assert.equal(existsSync(path.join(home, "AGENTS.md")), false);
  });
});

/* ------------------------------------------------------------ specialists */

describe("specialists", () => {
  test("add copies the file and registers it in the project AGENTS.md", async () => {
    const { home, project } = await scratch("add-basic");
    const result = run(["add", "maya", "nova"], { home, cwd: project });
    assert.equal(result.status, 0, result.out);

    // Claude Code reads .claude/agents/; Codex reads AGENTS.md and never looks
    // at .claude/. Both have to learn about the agent.
    assert.ok(existsSync(path.join(project, ".claude", "agents", "maya.md")));
    assert.ok(existsSync(path.join(project, ".claude", "agents", "nova.md")));

    const agentsMd = await read(path.join(project, "AGENTS.md"));
    assert.match(agentsMd, /\*\*maya\*\* — game design/);
    assert.match(agentsMd, /\*\*nova\*\* — direção visual/);
    assert.doesNotMatch(agentsMd, /\*\*iris\*\*/);
  });

  test("the block is rebuilt from disk, not from the history of commands", async () => {
    const { home, project } = await scratch("add-rebuild");
    run(["add", "maya", "nova"], { home, cwd: project });
    assert.equal(run(["remove", "nova"], { home, cwd: project }).status, 0);

    const agentsMd = await read(path.join(project, "AGENTS.md"));
    assert.match(agentsMd, /\*\*maya\*\*/);
    assert.doesNotMatch(agentsMd, /\*\*nova\*\*/);
    assert.equal(existsSync(path.join(project, ".claude", "agents", "nova.md")), false);
  });

  test("removing the last specialist drops the block and keeps the rest of the file", async () => {
    const { home, project } = await scratch("add-last");
    await writeFile(path.join(project, "AGENTS.md"), "# projeto\n\ninstrucoes locais\n");
    run(["add", "maya"], { home, cwd: project });
    assert.equal(run(["remove", "maya"], { home, cwd: project }).status, 0);

    const agentsMd = await read(path.join(project, "AGENTS.md"));
    assert.doesNotMatch(agentsMd, /agent-team-config:specialists/);
    assert.match(agentsMd, /instrucoes locais/);
  });

  test("--dry-run reports the block it would write and writes nothing", async () => {
    const { home, project } = await scratch("add-dry");
    run(["add", "maya"], { home, cwd: project });

    const before = await read(path.join(project, "AGENTS.md"));
    const result = run(["add", "nova", "--dry-run"], { home, cwd: project });
    assert.equal(result.status, 0, result.out);

    // The projected block is maya + nova, not what the disk holds right now.
    assert.match(result.out, /Updated specialist block/);
    assert.equal(existsSync(path.join(project, ".claude", "agents", "nova.md")), false);
    assert.equal(await read(path.join(project, "AGENTS.md")), before);
  });

  test("refuses a core agent and an unknown name", async () => {
    const { home, project } = await scratch("add-refuse");

    const isCore = run(["add", "archie"], { home, cwd: project });
    assert.equal(isCore.status, 1);
    assert.match(isCore.out, /core agent/);

    const unknown = run(["add", "nobody"], { home, cwd: project });
    assert.equal(unknown.status, 1);
    assert.match(unknown.out, /Not a domain specialist/);

    // A refused name must not leave a half-applied state behind.
    assert.equal(existsSync(path.join(project, "AGENTS.md")), false);
  });

  test("refuses to run inside the source of truth", async () => {
    const { home } = await scratch("add-selfhost");
    const result = run(["add", "maya"], { home, cwd: REPO });
    assert.equal(result.status, 1);
    assert.match(result.out, /source of truth/);
  });
});

/* -------------------------------------------------------------- block sync */

describe("applyBlock", () => {
  const markers = ["<!-- x:start -->", "<!-- x:end -->"];

  test("replaces a hand-written section instead of duplicating it", () => {
    const original = "# keep\n\nmine\n\n# subagentes\n\nversao escrita a mao\n\n# depois\n\nresto\n";
    const { text, action } = applyBlock(original, "# subagentes\n\nnovo conteudo\n", markers);

    assert.equal(action, "replaced hand-written section in");
    assert.equal(text.match(/# subagentes/g).length, 1);
    assert.doesNotMatch(text, /versao escrita a mao/);
    assert.match(text, /mine/);
    assert.match(text, /resto/);
  });

  test("updates in place on the second run and is stable on the third", () => {
    const first = applyBlock("", "# t\n\nv1\n", markers).text;
    const second = applyBlock(first, "# t\n\nv2\n", markers);
    assert.equal(second.action, "updated managed block in");
    assert.match(second.text, /v2/);
    assert.doesNotMatch(second.text, /v1/);
    assert.equal(applyBlock(second.text, "# t\n\nv2\n", markers).text, second.text);
  });

  test("a block containing regex metacharacters is written literally", () => {
    // sed would corrupt the target here; this is why the marker handling is not
    // a regex substitution built from the block's own text.
    const body = "# t\n\ncost: $1 (a|b) [x] \\d+ ^anchor$\n";
    const { text } = applyBlock("", body, markers);
    assert.match(text, /cost: \$1 \(a\|b\) \[x\] \\d\+ \^anchor\$/);
  });
});

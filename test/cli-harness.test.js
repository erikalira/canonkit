/**
 * The harness itself: what every CLI test relies on without saying so.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { DEFAULT_TEST_PATH, REPO, isolatedEnv, runCli } from "./helpers/cli-harness.js";

const home = realpathSync.native(mkdtempSync(path.join(os.tmpdir(), "canonkit-harness-")));
process.on("exit", () => rmSync(home, { recursive: true, force: true }));

test("the default test PATH holds no claude or codex, so the developer's own are never run", () => {
  const exts = process.platform === "win32" ? ["", ".cmd", ".exe", ".bat", ".ps1"] : [""];
  for (const dir of DEFAULT_TEST_PATH.split(path.delimiter)) {
    for (const name of ["claude", "codex"]) {
      for (const ext of exts) assert.equal(existsSync(path.join(dir, name + ext)), false, `${name}${ext} in ${dir}`);
    }
  }
});

test("a test's own PATH replaces the default and the inherited one", () => {
  const env = isolatedEnv(home, { PATH: "/only/this" });
  assert.deepEqual(Object.keys(env).filter((k) => k.toUpperCase() === "PATH"), ["PATH"]);
  assert.equal(env.PATH, "/only/this");
  assert.equal(isolatedEnv(home).PATH, DEFAULT_TEST_PATH);
});

test("variables that redirect writes or inject code are dropped unless the test sets them", () => {
  const keys = ["CLAUDE_CONFIG_DIR", "CODEX_HOME", "NODE_OPTIONS", "NODE_PATH", "CANONKIT_CODEX_MODEL"];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    for (const k of keys) process.env[k] = "leak";
    const env = isolatedEnv(home, { CODEX_HOME: "mine" });
    for (const k of keys) assert.equal(env[k], k === "CODEX_HOME" ? "mine" : undefined, k);
  } finally {
    for (const k of keys) saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]);
  }
});

test("install with the default PATH reports the runtime as not found instead of running one", () => {
  const result = runCli(["install", "--claude", "--verbose"], { home });
  assert.equal(result.status, 0, result.out);
  assert.match(result.out, /claude not found on PATH/);
});

// A test file reaches the repository's bin/cli.js only through the harness, which
// carries the PATH and environment isolation. A copy of the package under a
// temporary folder (`pkg`, `fixture`) is a different program and may be spawned.
export function directCliSpawns(source) {
  const found = [];
  for (const m of source.matchAll(/new URL\(\s*["']\.\.\/bin\/cli\.js["']/g)) found.push(m[0]);
  for (const m of source.matchAll(/path\.(?:join|resolve)\(\s*([^,()]+?)\s*,\s*(?:["']\.\.["']\s*,\s*)?["']bin["']\s*,\s*["']cli\.js["']\s*\)/g)) {
    if (!/^(pkg|fixture\w*|copy\w*)$/.test(m[1])) found.push(m[0]);
  }
  return found;
}

test("the structural check catches a direct spawn of the repository CLI", () => {
  assert.equal(directCliSpawns('const CLI = path.join(REPO, "bin", "cli.js");').length, 1);
  assert.equal(directCliSpawns('const CLI = fileURLToPath(new URL("../bin/cli.js", import.meta.url));').length, 1);
  assert.equal(directCliSpawns('spawnSync(process.execPath, [path.join(pkg, "bin", "cli.js"), "install"])').length, 0);
  assert.equal(directCliSpawns('import { HOOK_FILES } from "../bin/cli.js";').length, 0);
});

test("no test file outside helpers/ spawns the repository's bin/cli.js itself", () => {
  const testDir = path.join(REPO, "test");
  const files = readdirSync(testDir, { recursive: true })
    // This file holds the offending patterns as samples above.
    .filter((f) => f.endsWith(".js") && f !== "cli-harness.test.js" && !f.split(path.sep).includes("helpers") && !f.split(path.sep).includes("fixtures"));
  assert.ok(files.length > 20, "found the test files");
  for (const file of files) {
    assert.deepEqual(directCliSpawns(readFileSync(path.join(testDir, file), "utf8")), [], `${file} spawns bin/cli.js directly; use runCli or startCli from test/helpers/cli-harness.js`);
  }
});

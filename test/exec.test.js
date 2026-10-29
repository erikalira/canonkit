/**
 * The process helper is the only place canonkit runs another program, so its
 * guarantees are tested on their own: which file PATH resolution picks, the
 * exact argv a binary receives, and the arguments it refuses to build.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, chmod, symlink } from "node:fs/promises";
import { realpathSync } from "node:fs";
import path from "node:path";
import os from "node:os";

import { resolveBin, safePathDirs, projectOnlyHit, commandFor, runBin } from "../bin/exec.js";

const WIN = process.platform === "win32";
const SEP = WIN ? ";" : ":";

let sandbox;
// A project directory that contains none of the PATH entries under test.
let elsewhere;
before(async () => {
  // Canonical, because exec.js returns realpaths: a runner's tmpdir can be an
  // 8.3 name (RUNNER~1) on Windows or under /var -> /private/var on macOS.
  sandbox = realpathSync.native(await mkdtemp(path.join(os.tmpdir(), "canonkit-exec-test-")));
  elsewhere = path.join(sandbox, "elsewhere");
  await mkdir(elsewhere);
});
after(async () => {
  await rm(sandbox, { recursive: true, force: true });
});

/**
 * A stand-in binary that records the argv it received. On Windows it is a .cmd
 * shim, the shape npm puts on PATH and the one that needs cmd.exe; elsewhere an
 * executable sh script.
 */
async function stub(dir, name, log) {
  await mkdir(dir, { recursive: true });
  const js = path.join(dir, `${name}-stub.cjs`);
  await writeFile(js, `require("fs").writeFileSync(${JSON.stringify(log)}, JSON.stringify(process.argv.slice(2)));\n`);
  if (WIN) {
    const file = path.join(dir, `${name}.cmd`);
    await writeFile(file, `@"${process.execPath}" "${js}" %*\r\n`);
    return file;
  }
  const file = path.join(dir, name);
  await writeFile(file, `#!/bin/sh\nexec "${process.execPath}" "${js}" "$@"\n`);
  await chmod(file, 0o755);
  return file;
}

describe("resolveBin", () => {
  test("finds the binary on PATH and returns its absolute path", async () => {
    const dir = path.join(sandbox, "resolve-basic", "bin");
    const file = await stub(dir, "tooly", path.join(sandbox, "unused.json"));
    const found = resolveBin("tooly", { env: { PATH: dir, PATHEXT: ".EXE;.CMD" }, cwd: elsewhere });
    assert.equal(found, file);
  });

  test("a binary planted in the project is never the one chosen", async () => {
    const root = path.join(sandbox, "resolve-planted");
    const project = path.join(root, "project");
    const real = await stub(path.join(root, "bin"), "tooly", path.join(root, "real.json"));
    await stub(project, "tooly", path.join(root, "planted.json"));

    // The project as an absolute entry, a relative one, and an empty one (which
    // Windows reads as the current directory) — all ahead of the real binary.
    const PATH = [project, ".", "", "bin", path.join(root, "bin")].join(SEP);
    assert.equal(resolveBin("tooly", { env: { PATH, PATHEXT: ".CMD" }, cwd: project }), real);
  });

  test("no PATH entry inside the project counts: node_modules/.bin, or a link into it", async () => {
    const root = path.join(sandbox, "resolve-inside");
    const project = path.join(root, "project");
    const real = await stub(path.join(root, "bin"), "tooly", path.join(root, "real.json"));
    // `npx canonkit` puts <project>/node_modules/.bin first on PATH.
    const dotBin = path.join(project, "node_modules", ".bin");
    await stub(dotBin, "tooly", path.join(root, "planted.json"));
    // A junction (Windows) or symlink elsewhere that leads back into the project.
    const link = path.join(root, "link-to-bin");
    await symlink(dotBin, link, WIN ? "junction" : "dir");

    // A child whose name starts with ".." is still inside.
    const dotted = path.join(project, "..bin");
    await stub(dotted, "tooly", path.join(root, "planted2.json"));

    const PATH = [dotBin, link, dotted, path.join(root, "bin")].join(SEP);
    assert.equal(resolveBin("tooly", { env: { PATH, PATHEXT: ".CMD" }, cwd: project }), real);
    assert.deepEqual(safePathDirs({ env: { PATH }, cwd: project }), [path.join(root, "bin")]);
    assert.equal(projectOnlyHit("tooly", { env: { PATH: dotBin }, cwd: project }), path.join(dotBin, WIN ? "tooly.cmd" : "tooly"));
    assert.equal(projectOnlyHit("tooly", { env: { PATH: path.join(root, "bin") }, cwd: project }), null);
  });

  test("returns null when the binary is not on PATH", () => {
    assert.equal(resolveBin("no-such-tool-here", { env: { PATH: sandbox }, cwd: sandbox }), null);
  });

  test("only accepts a bare command name", () => {
    assert.throws(() => resolveBin("../evil", { env: { PATH: sandbox } }), /bare command name/);
  });

  test("on Windows, PATHEXT order picks between shims and ignores a malformed entry", { skip: !WIN }, async () => {
    const dir = path.join(sandbox, "resolve-pathext");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "tooly.bat"), "@echo off\r\n");
    await writeFile(path.join(dir, "tooly.cmd"), "@echo off\r\n");
    const env = { PATH: dir, PATHEXT: "bogus;.BAT;.CMD" };
    assert.equal(resolveBin("tooly", { env, cwd: elsewhere }), path.join(dir, "tooly.bat"));
  });
});

describe("commandFor", () => {
  test("a plain binary is spawned directly, with the arguments as given", () => {
    const abs = WIN ? "C:\\tools\\x.exe" : "/usr/bin/x";
    assert.deepEqual(commandFor(abs, ["init", "--tools", "claude,codex"]), {
      file: abs,
      args: ["init", "--tools", "claude,codex"],
      verbatim: false,
    });
  });

  test("a .cmd shim goes through ComSpec with /d /s /c and a quoted, verbatim line", () => {
    const env = { ComSpec: "C:\\Windows\\System32\\cmd.exe" };
    const cmd = commandFor("C:\\Program Files\\nodejs\\openspec.cmd", ["init", "--tools", "claude,codex"], { env, platform: "win32" });
    assert.deepEqual(cmd, {
      file: "C:\\Windows\\System32\\cmd.exe",
      args: ["/d", "/v:off", "/s", "/c", '""C:\\Program Files\\nodejs\\openspec.cmd" "init" "--tools" "claude,codex""'],
      verbatim: true,
    });
  });

  test("refuses an argument that would need escaping", () => {
    for (const bad of ["a b", "x\\", "x&calc", 'q"', "%PATH%", "a|b", "<in", "", "line\nbreak"]) {
      assert.throws(() => commandFor(WIN ? "C:\\x.exe" : "/x", [bad]), /would need escaping/, JSON.stringify(bad));
    }
  });

  test("refuses a relative binary path and a cmd path cmd.exe would expand", () => {
    assert.throws(() => commandFor("x.exe", []), /absolute/);
    assert.throws(
      () => commandFor("C:\\%TEMP%\\x.cmd", [], { env: { ComSpec: "C:\\Windows\\System32\\cmd.exe" }, platform: "win32" }),
      /contains " or %/,
    );
  });

  test("without ComSpec or SystemRoot a .cmd shim is refused, not looked up on PATH", () => {
    assert.throws(() => commandFor("C:\\x.cmd", [], { env: {}, platform: "win32" }), /ComSpec/);
  });
});

describe("runBin", () => {
  test("the binary receives exactly the arguments given, through a shim on Windows", async () => {
    const dir = path.join(sandbox, "run-args");
    const log = path.join(dir, "argv.json");
    const file = await stub(dir, "tooly", log);
    const args = ["init", "--tools", "claude,codex", "."];
    const r = runBin(file, args, { cwd: dir });
    assert.equal(r.status, 0, r.stderr + (r.error ?? ""));
    assert.deepEqual(JSON.parse(await readFile(log, "utf8")), args);
  });

  test("the tool's own lookups by name never land in the project", async () => {
    // npm's .cmd shim runs `node` by name, and cmd.exe looks in the current
    // directory first unless NoDefaultCurrentDirectoryInExePath is set; a
    // `#!/usr/bin/env node` script asks PATH, which may carry "." or the project.
    const root = path.join(sandbox, "run-planted-node");
    const project = path.join(root, "project");
    const bin = path.join(root, "bin");
    await mkdir(project, { recursive: true });
    await mkdir(bin, { recursive: true });
    const ran = path.join(root, "ran.txt");
    await writeFile(path.join(bin, "real.cjs"), `require("fs").writeFileSync(${JSON.stringify(ran)}, "real");
`);
    await writeFile(path.join(root, "planted.cjs"), `require("fs").writeFileSync(${JSON.stringify(ran)}, "planted");
`);
    let file;
    if (WIN) {
      file = path.join(bin, "tooly.cmd");
      await writeFile(file, `@node "${path.join(bin, "real.cjs")}" %*
`);
      await writeFile(path.join(project, "node.cmd"), `@"${process.execPath}" "${path.join(root, "planted.cjs")}"
`);
    } else {
      file = path.join(bin, "tooly");
      await writeFile(file, `#!/bin/sh
exec node "${path.join(bin, "real.cjs")}" "$@"
`);
      await chmod(file, 0o755);
      const planted = path.join(project, "node");
      await writeFile(planted, `#!/bin/sh
exec "${process.execPath}" "${path.join(root, "planted.cjs")}"
`);
      await chmod(planted, 0o755);
    }
    const env = Object.fromEntries(
      Object.entries(process.env).filter(([k]) => !/^(path|nodefaultcurrentdirectoryinexepath)$/i.test(k)),
    );
    env.PATH = [".", project, path.dirname(process.execPath)].join(SEP);
    const r = runBin(file, [], { cwd: project, env, capture: true });
    assert.equal(r.status, 0, r.stderr + (r.error ?? ""));
    assert.equal(await readFile(ran, "utf8"), "real");
  });

  test("requires an absolute cwd", () => {
    assert.throws(() => runBin(process.execPath, ["--version"], { cwd: "." }), /cwd/);
  });

  test("a run past its timeout is reported, not thrown", async () => {
    const dir = path.join(sandbox, "run-timeout");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "sleeper.cjs"), "setTimeout(() => {}, 20000);\n");
    const r = runBin(process.execPath, ["sleeper.cjs"], { cwd: dir, timeout: 300, capture: true });
    assert.match(r.error ?? "", /timed out/);
  });

  test("stdin is closed: a binary waiting for input gets EOF instead of hanging", async () => {
    const dir = path.join(sandbox, "run-stdin");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "reader.cjs"), "let n=0;process.stdin.on('data',d=>n+=d.length).on('end',()=>{console.log('eof '+n)});\n");
    const r = runBin(process.execPath, ["reader.cjs"], { cwd: dir, timeout: 10000, capture: true });
    assert.equal(r.error, null);
    assert.match(r.stdout, /eof 0/);
  });
});

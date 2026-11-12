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

import { resolveBin, safePathDirs, projectOnlyHit, commandFor, runBin, binVersion, windowsMountRoots, readWindowsRoots, windowsOnlyHits, childEnv } from "../bin/exec.js";

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

describe("binVersion", () => {
  /** A stand-in that prints `out` for --version. */
  async function printer(dir, name, out) {
    await mkdir(dir, { recursive: true });
    const js = path.join(dir, `${name}-version.cjs`);
    await writeFile(js, `process.stdout.write(${JSON.stringify(out)});\n`);
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

  test("reads x.y.z with or without a leading v, and nothing from a bare word", async () => {
    const dir = path.join(sandbox, "bin-version");
    // opencode --version prints v2.1.4; codex prints codex-cli 0.166.0.
    assert.equal(binVersion(await printer(dir, "vee", "v2.1.4\n")), "2.1.4");
    assert.equal(binVersion(await printer(dir, "cli", "codex-cli 0.166.0\n")), "0.166.0");
    assert.equal(binVersion(await printer(dir, "word", "dev2.1.4\n")), null);
  });
});


describe("Windows roots on WSL", () => {
  const POSIX = { skip: WIN && "POSIX paths and symlinks" };

  test("windowsMountRoots keeps drvfs and 9p+aname=drvfs, and nothing else", () => {
    const text = [
      "C:\\134 /mnt/c drvfs rw,noatime,uid=1000 0 0",
      "D:\\134 /mnt/d 9p rw,noatime,aname=drvfs;path=D:\\;uid=1000,cache=5,access=client,msize=65536,trans=fd 0 0",
      "drivers /usr/lib/wsl/drivers 9p ro,nosuid,aname=drivers;fmask=222 0 0",
      "none /mnt/wsl tmpfs rw,relatime 0 0",
      "/dev/sdc / ext4 rw,relatime 0 0",
      "E:\\134 /mnt/my\\040drive drvfs rw 0 0",
      "garbage",
      "",
      "a b",
      "x relative drvfs rw 0 0",
    ].join("\n");
    assert.deepEqual(windowsMountRoots(text), ["/mnt/c", "/mnt/d", "/mnt/my drive"]);
    assert.deepEqual(windowsMountRoots("W /mnt/w 9p rw,aname=drvfs,x 0 0"), ["/mnt/w"]);
    assert.deepEqual(windowsMountRoots("W /mnt/x 9p rw,aname=drvfsx 0 0"), []);
    assert.deepEqual(windowsMountRoots(undefined), []);
  });

  test("readWindowsRoots reads only on linux and returns [] on any failure", () => {
    const read = () => "C: /mnt/c drvfs rw 0 0\n";
    assert.deepEqual(readWindowsRoots({ platform: "linux", read }), ["/mnt/c"]);
    assert.deepEqual(readWindowsRoots({ platform: "darwin", read }), []);
    assert.deepEqual(readWindowsRoots({ platform: "win32", read }), []);
    assert.deepEqual(readWindowsRoots({ platform: "linux", read: () => { throw new Error("ENOENT"); } }), []);
  });

  async function layout(name) {
    const root = path.join(sandbox, name);
    const win = path.join(root, "mnt", "c");
    const project = path.join(root, "project");
    await mkdir(path.join(win, "npm"), { recursive: true });
    await mkdir(project, { recursive: true });
    return { root, win, project };
  }

  test("a directory that is a link into a Windows root is dropped; the same dir is kept with no roots", POSIX, async () => {
    const { root, win, project } = await layout("win-dirlink");
    await stub(path.join(win, "npm"), "tooly", path.join(root, "w.json"));
    const link = path.join(root, "link-to-win");
    await symlink(path.join(win, "npm"), link);
    const native = path.join(root, "native");
    await stub(native, "tooly", path.join(root, "n.json"));
    const env = { PATH: [link, path.join(win, "npm"), native].join(":") };
    assert.deepEqual(safePathDirs({ env, cwd: project, windowsRoots: [win] }), [native]);
    assert.deepEqual(safePathDirs({ env, cwd: project, windowsRoots: [] }), [link, path.join(win, "npm"), native]);
    assert.deepEqual(safePathDirs({ env, cwd: project }), [link, path.join(win, "npm"), native]);
    assert.equal(resolveBin("tooly", { env, cwd: project, windowsRoots: [win] }), path.join(native, "tooly"));
  });

  test("a native file that is a link into a Windows root is skipped", POSIX, async () => {
    const { root, win, project } = await layout("win-filelink");
    const target = await stub(path.join(win, "npm"), "tooly", path.join(root, "w.json"));
    const native1 = path.join(root, "native1");
    await mkdir(native1);
    await symlink(target, path.join(native1, "tooly"));
    const native2 = path.join(root, "native2");
    const good = await stub(native2, "tooly", path.join(root, "n.json"));
    const env = { PATH: [native1, native2].join(":") };
    assert.equal(resolveBin("tooly", { env, cwd: project, windowsRoots: [win] }), good);
    assert.equal(resolveBin("tooly", { env, cwd: project }), path.join(native1, "tooly"));
    assert.deepEqual(windowsOnlyHits("tooly", { env, cwd: project, windowsRoots: [win] }), [path.join(native1, "tooly")]);
    assert.deepEqual(windowsOnlyHits("tooly", { env, cwd: project, windowsRoots: [] }), []);
    // Only the hits ahead of the chosen binary.
    assert.deepEqual(windowsOnlyHits("tooly", { env, cwd: project, windowsRoots: [win], before: good }), [path.join(native1, "tooly")]);
    assert.deepEqual(windowsOnlyHits("tooly", { env: { PATH: [native2, native1].join(":") }, cwd: project, windowsRoots: [win], before: good }), []);
  });

  test("a project under a Windows root is still excluded by the in-project rule", POSIX, async () => {
    const { root, win } = await layout("win-project");
    const project = path.join(win, "proj");
    const planted = path.join(project, "node_modules", ".bin");
    await stub(planted, "tooly", path.join(root, "p.json"));
    const native = path.join(root, "native");
    const good = await stub(native, "tooly", path.join(root, "n.json"));
    const env = { PATH: [planted, native].join(":") };
    assert.equal(resolveBin("tooly", { env, cwd: project, windowsRoots: [win] }), good);
    assert.equal(resolveBin("tooly", { env, cwd: project }), good);
  });

  test("an empty filtered list never becomes PATH=, which the child would read as the project", POSIX, async () => {
    const { root, win, project } = await layout("win-emptypath");
    const env = { PATH: path.join(win, "npm"), KEEP: "1" };
    const out = childEnv(env, process.platform, project, [win]);
    assert.equal("PATH" in out, false);
    assert.equal(out.KEEP, "1");
    // The same for a PATH that was empty to begin with.
    assert.equal("PATH" in childEnv({ PATH: "" }, process.platform, project), false);
    // And the child really sees no PATH entry of the Windows side.
    const js = path.join(root, "printpath.cjs");
    await writeFile(js, `require("fs").writeFileSync(${JSON.stringify(path.join(root, "seen.json"))}, JSON.stringify(process.env.PATH ?? null));\n`);
    await writeFile(path.join(root, "pp"), `#!/bin/sh\nexec "${process.execPath}" "${js}"\n`);
    await chmod(path.join(root, "pp"), 0o755);
    const r = runBin(path.join(root, "pp"), [], { cwd: project, env, windowsRoots: [win], capture: true });
    assert.equal(r.status, 0, r.stderr);
    assert.notEqual(JSON.parse(await readFile(path.join(root, "seen.json"), "utf8")), "");
  });
});

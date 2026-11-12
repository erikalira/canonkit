/**
 * Contract tests for `canonkit git-ignore-sandbox-files` and what the Claude Code
 * sandbox's 0-byte placeholders do to `doctor` and `add`.
 *
 * Real git repositories in throwaway directories, the real CLI. What matters
 * here is which bytes land in which file, so nothing is mocked.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile, readFile, symlink, rm, chmod } from "node:fs/promises";
import { existsSync, readdirSync, statSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scratch, runIn, snapshot } from "../helpers/cli-fixtures.js";
import { CLI, DEFAULT_TEST_PATH, isolatedEnv, runCli } from "../helpers/cli-harness.js";
import { isNullDeviceStat, isSandboxNullPlaceholder, anyNullPlaceholder, directoryBlocker, safePath, readSecurityBytes } from "../../bin/security.js";

const POSIX = process.platform !== "win32";
const BEGIN = "# canonkit:sandbox-placeholders:start";
const END = "# canonkit:sandbox-placeholders:end";

// The CLI under test gets a PATH of its own; it needs the developer's git on it.
const gitDir = (process.env.PATH ?? "").split(path.delimiter).find((d) => d && existsSync(path.join(d, process.platform === "win32" ? "git.exe" : "git")));
const PATH = [gitDir, DEFAULT_TEST_PATH].filter(Boolean).join(path.delimiter);

// The test's own git runs with the same scratch HOME as the CLI under test (so no
// developer config leaks in), no signing, no hooks and no inherited GIT_*.
const HOMES = new Set();
const homeFor = (cwd) => [...HOMES].find((h) => cwd.startsWith(path.dirname(h) + path.sep)) ?? [...HOMES][0];
const git = (cwd, ...args) => {
  const env = isolatedEnv(homeFor(cwd), { PATH });
  for (const k of Object.keys(env)) if (k.toUpperCase().startsWith("GIT_")) delete env[k];
  const gitArgs = [...args];
  if (gitArgs[0] === "submodule") {
    const execPath = spawnSync("git", ["--exec-path"], { cwd, encoding: "utf8", env });
    assert.equal(execPath.status, 0, `git --exec-path: ${execPath.stderr}`);
    // Git for Windows may rely on GIT_EXEC_PATH to find git-submodule. Derive
    // the trusted path from this git binary instead of inheriting GIT_* values.
    gitArgs.unshift(`--exec-path=${execPath.stdout.trim()}`);
  }
  const r = spawnSync("git", ["-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", "-c", "user.name=t", "-c", "user.email=t@t", "-c", "protocol.file.allow=always", ...gitArgs], { cwd, encoding: "utf8", env });
  assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout;
};
const sbx = (args, { home, cwd, env = {} }) => runIn(["git-ignore-sandbox-files", ...args], { home, cwd, env: { PATH, ...env } });
const excludeOf = (project) => path.join(project, ".git", "info", "exclude");
const empty = async (project, ...names) => { for (const n of names) { await mkdir(path.dirname(path.join(project, n)), { recursive: true }); await writeFile(path.join(project, n), ""); } };
const block = (text) => { const m = new RegExp(`${BEGIN}[\\s\\S]*?${END}`).exec(text.replace(/\r\n/g, "\n")); return m ? m[0] : null; };
const patterns = (text) => (block(text) ?? "").split("\n").filter((l) => l && !l.startsWith("#"));
const status = (project) => git(project, "status", "--porcelain", "-uall").split("\n").filter(Boolean);

async function repo(name) {
  const s = await scratch(name);
  HOMES.add(s.home);
  git(s.project, "init", "-q");
  return s;
}

describe("git-ignore-sandbox-files: what is listed", () => {
  test("lists only 0-byte untracked regular files it sees: not absent, not with content, not tracked", async () => {
    const { home, project } = await repo("si-observed");
    await empty(project, ".mcp.json", ".claude/settings.local.json", ".zshrc");
    await writeFile(path.join(project, ".bashrc"), "export A=1\n");
    await writeFile(path.join(project, ".gitmodules"), "");
    git(project, "add", ".gitmodules");
    // .profile absent; .ripgreprc is a directory
    await mkdir(path.join(project, ".ripgreprc"));
    const r = sbx([], { home, cwd: project });
    assert.equal(r.status, 0, r.out);
    assert.deepEqual(patterns(await readFile(excludeOf(project), "utf8")), ["/.mcp.json", "/.zshrc", "/.claude/settings.local.json"]);
    assert.match(r.out, /Hiding 3 placeholders: .mcp.json, .zshrc, .claude\/settings.local.json/);
    assert.match(r.out, /already tracked files stay tracked|Files git already tracks stay tracked/);
    assert.match(r.out, /reduces noise and protects nothing/);
    assert.match(r.out, /stays hidden until you run `canonkit git-ignore-sandbox-files` again/);
  });

  test("a directory-capable name is a pair; a real directory stays visible", async () => {
    const { home, project } = await repo("si-pair");
    await empty(project, ".claude/agents", ".idea", ".mcp.json");
    const r = sbx([], { home, cwd: project });
    assert.equal(r.status, 0, r.out);
    const lines = patterns(await readFile(excludeOf(project), "utf8"));
    assert.deepEqual(lines, ["/.idea", "!/.idea/", "/.mcp.json", "/.claude/agents", "!/.claude/agents/"]);
    assert.deepEqual(status(project), []);
    // The file becomes a real directory with content: git must show it.
    await rm(path.join(project, ".claude", "agents"));
    await mkdir(path.join(project, ".claude", "agents"));
    await writeFile(path.join(project, ".claude", "agents", "x.md"), "hi");
    assert.deepEqual(status(project), ["?? .claude/agents/x.md"]);
  });

  test("a symlink and a directory are never listed, even where the name matches", { skip: !POSIX }, async () => {
    const { home, project } = await repo("si-symlink");
    await writeFile(path.join(project, "real"), "");
    await symlink("real", path.join(project, ".zshrc"));
    await mkdir(path.join(project, ".claude"));
    await mkdir(path.join(project, ".claude", "hooks"));
    const r = sbx([], { home, cwd: project });
    assert.equal(r.status, 0, r.out);
    assert.equal(block(await readFile(excludeOf(project), "utf8")), null);
    assert.match(r.out, /No 0-byte untracked sandbox placeholders/);
  });
});

describe("git-ignore-sandbox-files: the exclude file", () => {
  test("is idempotent: the second run changes nothing and says so", async () => {
    const { home, project } = await repo("si-idem");
    await empty(project, ".mcp.json");
    assert.equal(sbx([], { home, cwd: project }).status, 0);
    const first = await readFile(excludeOf(project), "utf8");
    const r = sbx([], { home, cwd: project });
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /already current/);
    assert.equal(await readFile(excludeOf(project), "utf8"), first);
  });

  test("reconciles: adds what is newly seen, drops what has content, an empty set removes the block", async () => {
    const { home, project } = await repo("si-reconcile");
    const original = await readFile(excludeOf(project), "utf8");
    await empty(project, ".mcp.json");
    sbx([], { home, cwd: project });
    await writeFile(path.join(project, ".mcp.json"), "{}");
    await empty(project, ".zshrc");
    sbx([], { home, cwd: project });
    assert.deepEqual(patterns(await readFile(excludeOf(project), "utf8")), ["/.zshrc"]);
    await writeFile(path.join(project, ".zshrc"), "x");
    const r = sbx([], { home, cwd: project });
    assert.equal(r.status, 0, r.out);
    assert.equal(block(await readFile(excludeOf(project), "utf8")), null);
    assert.equal(await readFile(excludeOf(project), "utf8"), original);
  });

  test("--remove takes out the block and nothing else", async () => {
    const { home, project } = await repo("si-remove");
    const original = await readFile(excludeOf(project), "utf8");
    await empty(project, ".mcp.json", ".claude/agents");
    sbx([], { home, cwd: project });
    assert.notEqual(await readFile(excludeOf(project), "utf8"), original);
    const r = sbx(["--remove"], { home, cwd: project });
    assert.equal(r.status, 0, r.out);
    assert.equal(await readFile(excludeOf(project), "utf8"), original);
    assert.match(sbx(["--remove"], { home, cwd: project }).out, /nothing to remove/);
  });

  test("--remove with altered or duplicated markers does nothing and says why", async () => {
    const { home, project } = await repo("si-remove-broken");
    for (const text of [`a\n${BEGIN}\n/.zshrc\n`, `${BEGIN}\n${END}\n${BEGIN}\n${END}\n`, `${END}\n/.zshrc\n${BEGIN}\n`]) {
      await writeFile(excludeOf(project), text);
      const r = sbx(["--remove"], { home, cwd: project });
      assert.equal(r.status, 1, r.out);
      assert.match(r.out, /markers .* nothing was changed/);
      assert.equal(await readFile(excludeOf(project), "utf8"), text);
      await empty(project, ".mcp.json");
      assert.equal(sbx([], { home, cwd: project }).status, 1);
      assert.equal(await readFile(excludeOf(project), "utf8"), text);
    }
  });

  test("leaves the user's lines alone and skips a name they already address", async () => {
    const { home, project } = await repo("si-outside");
    const mine = "# mine\nnode_modules\n/.bashrc\n!/.claude/hooks/\n";
    await writeFile(excludeOf(project), mine);
    await empty(project, ".bashrc", ".claude/hooks", ".mcp.json");
    const r = sbx([], { home, cwd: project });
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /Skipped, already addressed .*: .bashrc, .claude\/hooks/);
    const after = await readFile(excludeOf(project), "utf8");
    assert.ok(after.startsWith(mine), after);
    assert.deepEqual(patterns(after), ["/.mcp.json"]);
    assert.equal(sbx(["--remove"], { home, cwd: project }).status, 0);
    assert.equal(await readFile(excludeOf(project), "utf8"), mine);
  });

  test("keeps CRLF line endings", async () => {
    const { home, project } = await repo("si-crlf");
    await writeFile(excludeOf(project), "# mine\r\nnode_modules\r\n");
    await empty(project, ".mcp.json");
    assert.equal(sbx([], { home, cwd: project }).status, 0);
    const text = await readFile(excludeOf(project), "utf8");
    assert.ok(text.includes("\r\n"));
    assert.doesNotMatch(text, /[^\r]\n/);
    assert.equal(sbx(["--remove"], { home, cwd: project }).status, 0);
    assert.equal(await readFile(excludeOf(project), "utf8"), "# mine\r\nnode_modules\r\n");
  });

  test("--dry-run writes nothing", async () => {
    const { home, project } = await repo("si-dry");
    await empty(project, ".mcp.json");
    const before = await readFile(excludeOf(project), "utf8");
    const r = sbx(["--dry-run"], { home, cwd: project });
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /\[dry-run\].*Hiding 1 placeholder: .mcp.json/);
    assert.equal(await readFile(excludeOf(project), "utf8"), before);
    // and with no info/ at all, none is created
    await rm(path.join(project, ".git", "info"), { recursive: true });
    assert.equal(sbx(["--dry-run"], { home, cwd: project }).status, 0);
    assert.equal(existsSync(path.join(project, ".git", "info")), false);
  });

  test("creates info/ when it is absent, and never touches hooks, config or the committed .gitignore", async () => {
    const { home, project } = await repo("si-create");
    await rm(path.join(project, ".git", "info"), { recursive: true });
    await empty(project, ".mcp.json");
    const gitDirBefore = await snapshot(path.join(project, ".git"));
    const r = sbx([], { home, cwd: project });
    assert.equal(r.status, 0, r.out);
    const after = await snapshot(path.join(project, ".git"));
    assert.deepEqual(Object.keys(after).filter((k) => !(k in gitDirBefore)), [path.join("info", "exclude")]);
    for (const k of Object.keys(gitDirBefore)) assert.equal(after[k], gitDirBefore[k], k);
    assert.equal(existsSync(path.join(project, ".gitignore")), false);
  });
});

describe("git-ignore-sandbox-files: where it writes", () => {
  test("a linked worktree writes the exclude file git reports, and says it is shared", async () => {
    const { root, home, project } = await repo("si-worktree");
    await writeFile(path.join(project, "f"), "x");
    git(project, "add", "f");
    git(project, "commit", "-q", "-m", "init");
    const wt = path.join(root, "wt");
    git(project, "worktree", "add", "-q", wt);
    await empty(wt, ".mcp.json");
    const r = sbx([], { home, cwd: wt });
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /Exclude file: .*\(shared by the main repository and its worktrees\)/);
    assert.deepEqual(patterns(await readFile(excludeOf(project), "utf8")), ["/.mcp.json"]);
    assert.equal(existsSync(path.join(wt, ".git", "info")), false);
    assert.deepEqual(status(wt), []);
  });

  test("a submodule writes into its own git directory", async () => {
    const { root, home, project } = await repo("si-submodule");
    const sub = path.join(root, "subsrc");
    await mkdir(sub);
    git(sub, "init", "-q");
    await writeFile(path.join(sub, "f"), "x");
    git(sub, "add", "f");
    git(sub, "commit", "-q", "-m", "init");
    git(project, "submodule", "add", "-q", sub, "deps/sub");
    const inner = path.join(project, "deps", "sub");
    await empty(inner, ".zshrc");
    const r = sbx([], { home, cwd: inner });
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /\(this submodule's own exclude file\)/);
    const modules = path.join(project, ".git", "modules", "deps", "sub", "info", "exclude");
    assert.deepEqual(patterns(await readFile(modules, "utf8")), ["/.zshrc"]);
    assert.equal(block(await readFile(excludeOf(project), "utf8")), null);
  });

  test("no repository, a bare one, or a subdirectory of the repository: exit 0, nothing written", async () => {
    const s = await scratch("si-none");
    await empty(s.project, ".mcp.json");
    let r = sbx([], { home: s.home, cwd: s.project });
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /not inside a git work tree/);
    assert.deepEqual(readdirSync(s.project).sort(), [".mcp.json"]);

    const bare = path.join(s.root, "bare.git");
    await mkdir(bare);
    git(bare, "init", "-q", "--bare");
    const before = await snapshot(bare);
    r = sbx([], { home: s.home, cwd: bare });
    assert.equal(r.status, 0, r.out);
    assert.deepEqual(await snapshot(bare), before);

    const { home, project } = await repo("si-subdir");
    await mkdir(path.join(project, "pkg"));
    await empty(path.join(project, "pkg"), ".mcp.json");
    const exclude = await readFile(excludeOf(project), "utf8");
    r = sbx([], { home, cwd: path.join(project, "pkg") });
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /Run this from the repository root/);
    assert.equal(await readFile(excludeOf(project), "utf8"), exclude);
  });

  test("a symlinked info/ is refused and nothing is written through it", { skip: !POSIX }, async () => {
    const { root, home, project } = await repo("si-info-link");
    await empty(project, ".mcp.json");
    const elsewhere = path.join(root, "elsewhere");
    await mkdir(elsewhere);
    await rm(path.join(project, ".git", "info"), { recursive: true });
    await symlink(elsewhere, path.join(project, ".git", "info"));
    const r = sbx([], { home, cwd: project });
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /symbolic link or not a regular directory/);
    assert.deepEqual(readdirSync(elsewhere), []);
  });

  test("a symlinked info/exclude is refused and its target is untouched", { skip: !POSIX }, async () => {
    const { root, home, project } = await repo("si-exclude-link");
    await empty(project, ".mcp.json");
    const target = path.join(root, "target");
    await writeFile(target, "keep\n");
    await rm(excludeOf(project));
    await symlink(target, excludeOf(project));
    const r = sbx([], { home, cwd: project });
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /symbolic link or not a regular file/);
    assert.equal(await readFile(target, "utf8"), "keep\n");
  });

  test("a git planted in the project is not the one run", { skip: !POSIX }, async () => {
    const { root, home, project } = await repo("si-planted");
    await empty(project, ".mcp.json");
    const bin = path.join(project, "node_modules", ".bin");
    await mkdir(bin, { recursive: true });
    await writeFile(path.join(bin, "git"), `#!/bin/sh\necho ran > ${path.join(root, "PLANTED")}\nexit 1\n`);
    await chmod(path.join(bin, "git"), 0o755);
    const r = sbx([], { home, cwd: project, env: { PATH: [bin, "", ".", PATH].join(path.delimiter) } });
    assert.equal(r.status, 0, r.out);
    assert.equal(existsSync(path.join(root, "PLANTED")), false);
    assert.deepEqual(patterns(await readFile(excludeOf(project), "utf8")), ["/.mcp.json"]);
  });

  test("rejects other arguments and flags", async () => {
    const { home, project } = await repo("si-usage");
    for (const args of [["x"], ["--yes"], ["--claude"]]) {
      const r = sbx(args, { home, cwd: project });
      assert.notEqual(r.status, 0, args.join(" "));
    }
  });
});

describe("doctor and the placeholders", () => {
  const doctor = (project, home) => runIn(["doctor"], { home, cwd: project, env: { PATH } });
  const rows = (out) => out.split("\n").filter((l) => /sandbox placeholders/.test(l));

  test("warns when placeholders are present and not excluded, with the command; quiet once excluded", async () => {
    const { home, project } = await repo("si-doc-warn");
    await empty(project, ".mcp.json", ".claude/agents");
    const r = doctor(project, home);
    assert.equal(rows(r.out).length, 1, r.out);
    assert.match(rows(r.out)[0], /^WARN .*\.mcp\.json, \.claude\/agents.*canonkit git-ignore-sandbox-files/);
    assert.equal(sbx([], { home, cwd: project }).status, 0);
    assert.deepEqual(rows(doctor(project, home).out), []);
  });

  test("warns when a hidden name now has content", async () => {
    const { home, project } = await repo("si-doc-content");
    await empty(project, ".mcp.json", ".zshrc");
    sbx([], { home, cwd: project });
    await writeFile(path.join(project, ".mcp.json"), "{}");
    const r = doctor(project, home);
    assert.equal(rows(r.out).length, 1, r.out);
    assert.match(rows(r.out)[0], /^WARN .*but now have content or are no longer an empty file: \.mcp\.json; re-run canonkit git-ignore-sandbox-files .*--remove/);
    assert.doesNotMatch(rows(r.out)[0], /zshrc/);
  });

  test("a repository with nothing found gets no row, and doctor writes nothing", async () => {
    const { home, project } = await repo("si-doc-quiet");
    const before = await snapshot(project);
    const r = doctor(project, home);
    assert.deepEqual(rows(r.out), []);
    assert.deepEqual(await snapshot(project), before);
  });

  test("an empty .claude/settings.local.json is a note, not invalid JSON", async () => {
    const { home, project } = await repo("si-doc-settings");
    await empty(project, ".claude/settings.local.json");
    let r = doctor(project, home);
    assert.match(r.out, /^OK +security claude placeholder: repository-local: empty file, probably a sandbox placeholder; ignored/m);
    assert.doesNotMatch(r.out, /repository-local: malformed or inaccessible/);
    // Non-empty invalid JSON is still a failure: the parser was not loosened.
    await writeFile(path.join(project, ".claude", "settings.local.json"), "{nope");
    r = doctor(project, home);
    assert.match(r.out, /^FAIL +security claude configuration: .*repository-local: malformed or inaccessible/m);
  });
});

describe("the sandbox's /dev/null placeholder (character device 1:3), read-only in doctor", () => {
  const dev = (major, minor, kind = "char") => ({ rdev: (major << 8) | minor, isCharacterDevice: () => kind === "char" });
  const fake = (info) => ({ lstat: async () => info, platform: "linux" });
  const doctor = (project, home) => runIn(["doctor"], { home, cwd: project, env: { PATH } });

  test("the predicate accepts exactly 1:3 on linux", () => {
    assert.equal(isNullDeviceStat(dev(1, 3), "linux"), true);
    for (const [maj, min] of [[1, 5], [1, 2], [2, 3], [4, 3], [0, 0]]) assert.equal(isNullDeviceStat(dev(maj, min), "linux"), false, `${maj}:${min}`);
    // exact rdev: high bits of a wider dev_t must not alias 1:3
    assert.equal(isNullDeviceStat({ rdev: 259 + 2 ** 20, isCharacterDevice: () => true }, "linux"), false);
    assert.equal(isNullDeviceStat(dev(1, 3, "other"), "linux"), false);
    assert.equal(isNullDeviceStat(dev(1, 3), "darwin"), false);
    assert.equal(isNullDeviceStat(dev(1, 3), "win32"), false);
  });

  test("the file check: 1:3 yes; other devices, non-devices, absent no", async () => {
    const { project } = await repo("si-dev-pred");
    const f = path.join(project, "x.json");
    assert.equal(await isSandboxNullPlaceholder(f, fake(dev(1, 3))), true);
    assert.equal(await isSandboxNullPlaceholder(f, fake(dev(1, 5))), false);
    assert.equal(await isSandboxNullPlaceholder(f, fake(dev(1, 3, "other"))), false);
    assert.equal(await isSandboxNullPlaceholder(f, { lstat: async () => { throw Object.assign(new Error("x"), { code: "ENOENT" }); }, platform: "linux" }), false);
    assert.equal(await isSandboxNullPlaceholder(f, { ...fake(dev(1, 3)), platform: "darwin" }), false);
    await assert.rejects(isSandboxNullPlaceholder(f, { lstat: async () => { throw Object.assign(new Error("x"), { code: "EACCES" }); }, platform: "linux" }));
  });

  test("a real 0-byte file or a symlink is not a placeholder by this check", async () => {
    const { project } = await repo("si-dev-real");
    await empty(project, "e.json");
    assert.equal(await isSandboxNullPlaceholder(path.join(project, "e.json")), false);
    if (POSIX) {
      await symlink("/dev/null", path.join(project, "l.json"));
      assert.equal(await isSandboxNullPlaceholder(path.join(project, "l.json")), false);
    }
  });

  test("the writers' checks still reject a character device (real /dev/null, read-only)", { skip: process.platform !== "linux" }, async () => {
    assert.equal(await isSandboxNullPlaceholder("/dev/null"), true);
    await assert.rejects(safePath("/dev/null"), /not regular/);
    await assert.rejects(readSecurityBytes("/dev/null"), /not a regular file/);
  });

  test("any other non-regular file at settings.local.json keeps the old FAIL (a directory; a FIFO would hang unrelated readers)", async () => {
    const { home, project } = await repo("si-dev-dir");
    await mkdir(path.join(project, ".claude", "settings.local.json"), { recursive: true });
    const r = doctor(project, home);
    assert.match(r.out, /^FAIL +security claude configuration: .*repository-local: malformed or inaccessible/m);
    assert.doesNotMatch(r.out, /sandbox placeholder; ignored/);
  });

  // A FIFO read with readFileSync blocks forever; the child gets a timeout so a regression fails instead of hanging the suite.
  const doctorTimed = (project, home) => spawnSync(process.execPath, [CLI, "doctor"], { cwd: project, encoding: "utf8", timeout: 30000, killSignal: "SIGKILL", env: isolatedEnv(home, { PATH }) });
  for (const [n, [label, where]] of [["project .claude/settings.local.json", (p) => path.join(p, ".claude", "settings.local.json")], ["~/.claude/settings.json", (p, h) => path.join(h, ".claude", "settings.json")], ["~/.claude/agents/bob.md", (p, h) => path.join(h, ".claude", "agents", "bob.md")]].entries()) {
    test(`a FIFO at ${label} does not hang doctor`, { skip: !POSIX, timeout: 60000 }, async (t) => {
      const { home, project } = await repo(`si-fifo-${n}`);
      const fifo = where(project, home);
      await mkdir(path.dirname(fifo), { recursive: true });
      if (spawnSync("mkfifo", [fifo]).status !== 0) return t.skip("mkfifo is not available");
      const r = doctorTimed(project, home);
      assert.equal(r.error, undefined, `doctor did not terminate: ${r.error?.message}`);
      assert.notEqual(r.status, null, "doctor was killed");
    });
  }

  test("a GIT_DIR leaked in the parent environment does not reach the CLI under test", () => {
    const saved = Object.entries(process.env).filter(([k]) => k.toUpperCase().startsWith("GIT_"));
    process.env.GIT_DIR = "/leaked/decoy/.git";
    process.env.Git_Work_Tree = "/leaked/decoy";
    try {
      const env = isolatedEnv("/tmp/h", {});
      assert.deepEqual(Object.keys(env).filter((k) => k.toUpperCase().startsWith("GIT_")), []);
      assert.equal(isolatedEnv("/tmp/h", { GIT_DIR: "/explicit" }).GIT_DIR, "/explicit");
    } finally {
      delete process.env.GIT_DIR; delete process.env.Git_Work_Tree;
      for (const [k, v] of saved) process.env[k] = v;
    }
  });

  test("git-ignore-sandbox-files lists a non-regular file at a placeholder name: never", { skip: !POSIX }, async (t) => {
    const { home, project } = await repo("si-dev-ignore");
    const mk = spawnSync("mkfifo", [path.join(project, ".mcp.json")]);
    if (mk.status !== 0) return t.skip("mkfifo is not available");
    const r = sbx([], { home, cwd: project });
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /No 0-byte untracked sandbox placeholders/);
  });

  test("an empty ~/.claude/settings.local.json is no invalid-JSON hook wiring FAIL, and does not block uninstall", async () => {
    const { home, project } = await repo("si-home-empty");
    await mkdir(path.join(home, ".claude"), { recursive: true });
    await writeFile(path.join(home, ".claude", "settings.local.json"), "");
    assert.doesNotMatch(doctor(project, home).out, /hook wiring.*not valid JSON/);
    await writeFile(path.join(home, ".claude", "settings.local.json"), "{nope");
    assert.match(doctor(project, home).out, /^.*hook wiring.*not valid JSON/m);
  });

  test("an empty project .claude/settings.local.json does not make uninstall retain claude", async () => {
    const { home, project } = await repo("si-uninstall-empty");
    assert.equal(runIn(["install", "--claude"], { home, cwd: project, env: { PATH } }).status, 0);
    await empty(project, ".claude/settings.local.json");
    const r = runIn(["uninstall", "--claude", "--dry-run"], { home, cwd: project, env: { PATH } });
    assert.equal(r.status, 0, r.out);
    assert.doesNotMatch(r.out, /not valid JSON/);
    await writeFile(path.join(project, ".claude", "settings.local.json"), "{nope");
    assert.match(runIn(["uninstall", "--claude", "--dry-run"], { home, cwd: project, env: { PATH } }).out, /not valid JSON/);
  });
});

describe("add with a placeholder where a directory is needed", () => {
  test("a 0-byte .claude/agents stops with a clear message and writes nothing", async () => {
    const { home, project } = await repo("si-add");
    await empty(project, ".claude/agents");
    const before = await snapshot(project);
    const r = runIn(["add", "maya"], { home, cwd: project, env: { PATH } });
    assert.notEqual(r.status, 0, r.out);
    assert.match(r.out, /\.claude[\\/]agents is an empty file, but a directory is needed there\. Delete it and run this command again; nothing was written\./);
    assert.doesNotMatch(r.out, /EEXIST|ENOTDIR|rm /);
    assert.deepEqual(await snapshot(project), before);
    assert.equal(existsSync(path.join(project, ".codex")), false);
    assert.equal(existsSync(path.join(project, "AGENTS.md")), false);
    assert.equal(statSync(path.join(project, ".claude", "agents")).isFile(), true);
  });
});

describe("inside the sandbox (placeholders are /dev/null devices)", () => {
  const dev = { rdev: 259, isCharacterDevice: () => true, isFile: () => false, size: 0 };
  const reg = { rdev: 0, isCharacterDevice: () => false, isFile: () => true, size: 0 };

  test("anyNullPlaceholder: any 1:3 candidate trips it; absent, regular or non-linux do not", async () => {
    const only = (hit) => async (f) => { if (f === hit) return dev; throw Object.assign(new Error("x"), { code: "ENOENT" }); };
    assert.equal(await anyNullPlaceholder(["a", "b"], { lstat: only("b"), platform: "linux" }), true);
    assert.equal(await anyNullPlaceholder(["a", "b"], { lstat: only("z"), platform: "linux" }), false);
    assert.equal(await anyNullPlaceholder(["a"], { lstat: async () => reg, platform: "linux" }), false);
    assert.equal(await anyNullPlaceholder(["a"], { lstat: async () => dev, platform: "darwin" }), false);
    assert.equal(await anyNullPlaceholder(["a"], { lstat: async () => { throw Object.assign(new Error("x"), { code: "ENOTDIR" }); }, platform: "linux" }), false);
    await assert.rejects(anyNullPlaceholder(["a"], { lstat: async () => { throw Object.assign(new Error("x"), { code: "EACCES" }); }, platform: "linux" }));
  });

  test("directoryBlocker: device, then 0-byte file, else null (ambiguous goes to the empty-file message)", () => {
    assert.equal(directoryBlocker(dev), "device");
    assert.equal(directoryBlocker(reg), "empty");
    assert.equal(directoryBlocker({ isCharacterDevice: () => false, isFile: () => true, size: 5 }), null);
    assert.equal(directoryBlocker({ isCharacterDevice: () => false, isFile: () => false, size: 0 }), null);
  });

  test("with an existing block and a real 0-byte placeholder, add/reconcile still works as before", async () => {
    const { home, project } = await repo("si-guard-regress");
    await empty(project, ".mcp.json", ".zshrc");
    assert.equal(sbx([], { home, cwd: project }).status, 0);
    await rm(path.join(project, ".zshrc"));
    const r = sbx([], { home, cwd: project });
    assert.equal(r.status, 0, r.out);
    assert.doesNotMatch(r.out, /Inside the Claude Code sandbox/);
    assert.deepEqual(patterns(await readFile(excludeOf(project), "utf8")), ["/.mcp.json"]);
  });
});

// A real /dev/null bound over a placeholder, as the Claude Code sandbox does. Needs
// unprivileged user namespaces; skipped where bwrap cannot run.
const BWRAP = POSIX && process.platform === "linux" && spawnSync("bwrap", ["--dev-bind", "/", "/", "true"]).status === 0;
describe("inside a real /dev/null bind (bwrap)", { skip: !BWRAP }, () => {
  const inside = (project, home, args) => spawnSync("bwrap", ["--dev-bind", "/", "/", "--dev-bind", "/dev/null", path.join(project, ".mcp.json"), process.execPath, path.resolve("bin/cli.js"), "git-ignore-sandbox-files", ...args],
    { cwd: project, encoding: "utf8", env: isolatedEnv(home, { PATH, CLAUDE_PROJECT_DIR: undefined }) });

  test("add/reconcile changes nothing and keeps the block, also under --dry-run; --remove still works", async () => {
    const { home, project } = await repo("si-bwrap");
    await empty(project, ".mcp.json");
    assert.equal(sbx([], { home, cwd: project }).status, 0);
    const before = await readFile(excludeOf(project), "utf8");
    for (const args of [[], ["--dry-run"]]) {
      const r = inside(project, home, args);
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stderr, /^Inside the Claude Code sandbox, git-ignore-sandbox-files changed nothing and left any existing block as it is\. Run it from your own terminal; --remove still works here\.\n$/);
      assert.doesNotMatch(r.stdout, /Would write|Would remove|Wrote|Removed/);
      assert.equal(await readFile(excludeOf(project), "utf8"), before);
    }
    const rm2 = inside(project, home, ["--remove"]);
    assert.equal(rm2.status, 0, rm2.stderr);
    assert.equal(block(await readFile(excludeOf(project), "utf8")), null);
  });
});

// The same guard wiring where bwrap cannot run: a test-only preload makes lstat
// report chosen paths as the 1:3 device (never loaded by bin/, only via runCli).
const FAKE_NULLDEV = fileURLToPath(new URL("../support/fake-null-device.mjs", import.meta.url));
describe("guard wiring with a faked /dev/null device (preload)", { skip: process.platform !== "linux" && "faked device is Linux-only" }, () => {
  const C1 = /^Inside the Claude Code sandbox, git-ignore-sandbox-files changed nothing and left any existing block as it is\. Run it from your own terminal; --remove still works here\.\n$/;
  const faked = (project, args, ...names) => runCli(args, { home: homeFor(project), cwd: project, preload: [FAKE_NULLDEV],
    env: { PATH, CLAUDE_PROJECT_DIR: undefined, CANONKIT_TEST_NULLDEV: names.map((n) => path.join(realpathSync(project), ...n.split("/"))).join(",") } });

  test("git-ignore-sandbox-files add/reconcile prints the sandbox message, writes nothing, keeps the block; --remove still removes it", async () => {
    const { home, project } = await repo("si-fakedev");
    await empty(project, ".mcp.json");
    assert.equal(sbx([], { home, cwd: project }).status, 0);
    const before = await readFile(excludeOf(project), "utf8");
    assert.notEqual(block(before), null);
    for (const args of [["git-ignore-sandbox-files"], ["git-ignore-sandbox-files", "--dry-run"]]) {
      const r = faked(project, args, ".mcp.json");
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stderr, C1);
      assert.equal(r.stdout, "");
      assert.equal(await readFile(excludeOf(project), "utf8"), before);
    }
    const rm2 = faked(project, ["git-ignore-sandbox-files", "--remove"], ".mcp.json");
    assert.equal(rm2.status, 0, rm2.stderr);
    assert.equal(block(await readFile(excludeOf(project), "utf8")), null);
  });

  test("doctor with an existing block and .mcp.json shown as the device: no sandbox placeholders row", async () => {
    const { project } = await repo("si-fakedev-doctor");
    await empty(project, ".mcp.json");
    assert.equal(sbx([], { home: homeFor(project), cwd: project }).status, 0);
    assert.notEqual(block(await readFile(excludeOf(project), "utf8")), null);
    const r = faked(project, ["doctor"], ".mcp.json");
    assert.deepEqual(r.out.split("\n").filter((l) => /sandbox placeholders/.test(l)), []);
  });

  test("add with .claude/agents shown as the device stops with the write-protected message and writes nothing", async () => {
    const { project } = await repo("si-fakedev-add");
    await empty(project, ".claude/agents");
    const before = await snapshot(project);
    const r = faked(project, ["add", "maya"], ".claude/agents");
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /\.claude[\\/]agents is write-protected by the Claude Code sandbox\. Run this command from your own terminal; nothing was written\./);
    assert.deepEqual(await snapshot(project), before);
    assert.equal(existsSync(path.join(project, ".codex")), false);
  });
});

const CATALOG = [
  [".bash_profile"], [".bashrc"], [".gitconfig"], [".gitmodules"], [".idea", true], [".mcp.json"], [".profile"], [".ripgreprc"], [".zprofile"], [".zshrc"],
  [".claude/agents", true], [".claude/commands", true], [".claude/hooks", true], [".claude/launch.json"], [".claude/loop.md"], [".claude/output-styles", true],
  [".claude/routines", true], [".claude/scheduled_tasks.json"], [".claude/settings.local.json"], [".claude/workflows", true],
];

describe("git-ignore-sandbox-files: the catalog and its accepted limits", () => {
  test("pins the 20 names, in order, with the !/x/ pair only where a directory is possible", async () => {
    const { home, project } = await repo("si-catalog");
    await empty(project, ...CATALOG.map(([n]) => n));
    const r = sbx([], { home, cwd: project });
    assert.equal(r.status, 0, r.out);
    assert.equal(CATALOG.length, 20);
    assert.deepEqual(patterns(await readFile(excludeOf(project), "utf8")), CATALOG.flatMap(([n, dir]) => (dir ? [`/${n}`, `!/${n}/`] : [`/${n}`])));
  });

  test("ACCEPTED: a user glob such as .claude/* does not count as addressing a name, so the pair is added and a real .claude/agents/x.md shows in git status", async () => {
    const { home, project } = await repo("si-glob");
    await writeFile(excludeOf(project), ".claude/*\n");
    await empty(project, ".claude/agents");
    const r = sbx([], { home, cwd: project });
    assert.equal(r.status, 0, r.out);
    assert.doesNotMatch(r.out, /Skipped/);
    assert.deepEqual(patterns(await readFile(excludeOf(project), "utf8")), ["/.claude/agents", "!/.claude/agents/"]);
    await rm(path.join(project, ".claude", "agents"));
    await mkdir(path.join(project, ".claude", "agents"));
    await writeFile(path.join(project, ".claude", "agents", "x.md"), "hi");
    // Accepted behaviour: the block's !/.claude/agents/ wins over the user's glob (it comes later).
    assert.deepEqual(status(project), ["?? .claude/agents/x.md"]);
  });
});

describe("git-ignore-sandbox-files: what it never touches", () => {
  test("install does not call it: the exclude file is unchanged", async () => {
    const { home, project } = await repo("si-install");
    await empty(project, ".mcp.json");
    const before = await readFile(excludeOf(project), "utf8");
    assert.equal(runIn(["install", "--claude"], { home, cwd: project, env: { PATH } }).status, 0);
    assert.equal(await readFile(excludeOf(project), "utf8"), before);
  });

  test("writes no settings key or other file, in the project (outside .git) or in HOME", async () => {
    const { home, project } = await repo("si-nofiles");
    await empty(project, ".mcp.json", ".claude/settings.local.json");
    const outsideGit = async () => Object.fromEntries(Object.entries(await snapshot(project)).filter(([k]) => k !== ".git" && !k.startsWith(".git" + path.sep)));
    const [p0, h0] = [await outsideGit(), await snapshot(home)];
    for (const args of [[], ["--dry-run"], ["--remove"]]) assert.equal(sbx(args, { home, cwd: project }).status, 0);
    assert.deepEqual(await outsideGit(), p0);
    assert.deepEqual(await snapshot(home), h0);
  });

  for (const names of [{ GIT_DIR: "GIT_DIR", GIT_WORK_TREE: "GIT_WORK_TREE" }, { GIT_DIR: "Git_Dir", GIT_WORK_TREE: "Git_Work_Tree" }]) {
    test(`GIT_DIR / GIT_WORK_TREE (${names.GIT_DIR}) pointing at a decoy repository: only the cwd repository's exclude is written`, async () => {
      const fixtureName = names.GIT_DIR === "GIT_DIR" ? "si-decoy-canonical-case" : "si-decoy-mixed-case";
      const { root, home, project } = await repo(fixtureName);
      const decoy = path.join(root, "decoy");
      await mkdir(decoy);
      git(decoy, "init", "-q");
      await empty(decoy, ".mcp.json");
      await empty(project, ".mcp.json");
      const decoyBefore = await readFile(excludeOf(decoy), "utf8");
      const env = { GIT_CONFIG_GLOBAL: "/dev/null", [names.GIT_DIR]: path.join(decoy, ".git"), [names.GIT_WORK_TREE]: decoy };
      const r = sbx([], { home, cwd: project, env });
      assert.equal(r.status, 0, r.out);
      assert.deepEqual(patterns(await readFile(excludeOf(project), "utf8")), ["/.mcp.json"]);
      assert.equal(await readFile(excludeOf(decoy), "utf8"), decoyBefore);
    });
  }

  test("a repository-local core.fsmonitor is never run by git-ignore-sandbox-files (add, --dry-run) or doctor", { skip: !POSIX }, async () => {
    const { root, home, project } = await repo("si-fsmonitor");
    const marker = path.join(root, "FSMONITOR-RAN");
    const hook = path.join(root, "fsmonitor.sh");
    await writeFile(hook, `#!/bin/sh\necho ran >> ${marker}\nexit 1\n`);
    await chmod(hook, 0o755);
    await empty(project, ".mcp.json");
    git(project, "config", "core.fsmonitor", hook);
    assert.equal(sbx(["--dry-run"], { home, cwd: project }).status, 0);
    assert.equal(sbx([], { home, cwd: project }).status, 0);
    assert.equal(runIn(["doctor"], { home, cwd: project, env: { PATH } }).status !== null, true);
    await rm(path.join(project, ".git", "info", "exclude"));
    assert.equal(runIn(["doctor"], { home, cwd: project, env: { PATH } }).status !== null, true);
    assert.equal(existsSync(marker), false, "core.fsmonitor ran");
  });
});

describe("git-ignore-sandbox-files: --remove and doctor, more cases", () => {
  test("--dry-run --remove writes nothing and says it would remove", async () => {
    const { home, project } = await repo("si-dry-remove");
    await empty(project, ".mcp.json");
    assert.equal(sbx([], { home, cwd: project }).status, 0);
    const before = await readFile(excludeOf(project), "utf8");
    const r = sbx(["--dry-run", "--remove"], { home, cwd: project });
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /Would remove/);
    assert.equal(await readFile(excludeOf(project), "utf8"), before);
  });

  test("--remove never touches the user's lines; only the final newline may differ", async () => {
    const originals = ["# mine\nnode_modules", "a\n\n\n", "", "x\r\ny\r\n", "\n\nz\n"];
    for (const [i, original] of originals.entries()) {
      const { home, project } = await repo(`si-remove-table-${i}`);
      await writeFile(excludeOf(project), original);
      await empty(project, ".mcp.json");
      assert.equal(sbx([], { home, cwd: project }).status, 0);
      assert.notEqual(block(await readFile(excludeOf(project), "utf8")), null);
      assert.equal(sbx(["--remove"], { home, cwd: project }).status, 0);
      const after = await readFile(excludeOf(project), "utf8");
      assert.equal(block(after), null, JSON.stringify(original));
      assert.equal(after.trimEnd(), original.trimEnd(), JSON.stringify(original));
    }
  });

  const doctor = (project, home) => runIn(["doctor"], { home, cwd: project, env: { PATH } });
  const rows = (out) => out.split("\n").filter((l) => /sandbox placeholders/.test(l));

  test("doctor warns when a hidden name became a directory (name that cannot be one) and stays quiet for one that can", async () => {
    const { home, project } = await repo("si-doc-dir");
    await empty(project, ".mcp.json", ".claude/agents");
    assert.equal(sbx([], { home, cwd: project }).status, 0);
    await rm(path.join(project, ".mcp.json"));
    await mkdir(path.join(project, ".mcp.json"));
    await rm(path.join(project, ".claude", "agents"));
    await mkdir(path.join(project, ".claude", "agents"));
    const r = rows(doctor(project, home).out);
    assert.equal(r.length, 1, r.join("\n"));
    assert.match(r[0], /^WARN .*no longer an empty file: \.mcp\.json; re-run/);
    assert.doesNotMatch(r[0], /agents/);
  });

  test("doctor warns when a hidden name became a symlink", { skip: !POSIX }, async () => {
    const { home, project } = await repo("si-doc-link");
    await empty(project, ".zshrc");
    assert.equal(sbx([], { home, cwd: project }).status, 0);
    await rm(path.join(project, ".zshrc"));
    await symlink("elsewhere", path.join(project, ".zshrc"));
    const r = rows(doctor(project, home).out);
    assert.equal(r.length, 1, r.join("\n"));
    assert.match(r[0], /^WARN .*no longer an empty file: \.zshrc; re-run/);
  });
});

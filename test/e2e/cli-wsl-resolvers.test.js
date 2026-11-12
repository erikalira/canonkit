/**
 * Windows binaries on WSL in the resolvers other than `tool add|list`: a
 * Windows `claude` / `opencode` on PATH (a fake drive from
 * test/support/fake-mounts.mjs) is never executed and is reported, at each
 * production call site: install (security probe and catalog), doctor,
 * `models refresh` and `install --wire-hooks` for OpenCode.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, chmod } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCli } from "../helpers/cli-harness.js";
import { scratch, read } from "../helpers/cli-fixtures.js";

const FAKE_MOUNTS = fileURLToPath(new URL("../support/fake-mounts.mjs", import.meta.url));

describe("Windows binaries in the other resolvers", { skip: process.platform !== "linux" && "reads /proc/self/mounts" }, () => {
  // A drive under the scratch root, a Windows-side bin dir holding `name`, a stub that records every start.
  async function wsl(label, name) {
    const s = await scratch(label);
    const win = path.join(s.root, "mnt", "c");
    const npm = path.join(win, "Users", "me", "npm");
    const marker = path.join(s.root, "WINDOWS_RAN");
    await mkdir(npm, { recursive: true });
    const js = path.join(npm, `${name}-fake.cjs`);
    await writeFile(js, `require("fs").appendFileSync(${JSON.stringify(marker)}, process.argv.slice(2).join(" ") + "\\n");\nprocess.stdout.write("2.1.322\\n");\n`);
    await writeFile(path.join(npm, name), `#!/bin/sh\nexec "${process.execPath}" "${js}" "$@"\n`);
    await chmod(path.join(npm, name), 0o755);
    const mounts = `C:\\134 ${win} drvfs rw,noatime 0 0\n`;
    const go = (args, extra = {}) => runCli(args, { home: s.home, cwd: s.project, preload: [FAKE_MOUNTS], env: { CANONKIT_TEST_MOUNTS: mounts, PATH: npm, CLAUDE_PROJECT_DIR: undefined, ...extra } });
    return { ...s, npm, marker, go };
  }

  test("install: a Windows-only claude is not started by the security probe or by model discovery", async () => {
    const { home, npm, marker, go } = await wsl("wsl-res-install", "claude");
    const r = go(["install", "--claude", "--no-reference", "--verbose"]);
    assert.equal(r.status, 0, r.out);
    assert.equal(existsSync(marker), false, "the Windows claude ran");
    assert.ok(r.out.includes(`WARN security claude: a Windows copy at ${path.join(npm, "claude")} was ignored (it reads Windows settings, not these), so its version is unknown and version-gated settings are not added or updated by this install (existing ones are kept); install Claude Code inside WSL and re-run`), r.out);
    assert.equal(r.out.split("a Windows copy at").length, 2, "said once");
    const catalog = JSON.parse(await read(path.join(home, ".canonkit", "model-catalog.json")));
    assert.equal(catalog.harnesses.claude.status, "unknown");
    assert.equal(catalog.harnesses.claude.reason, "claude --version: claude found only on the Windows side; not run through WSL interop");
    // Without the fake drive the same copy is an ordinary binary (control that the stub works).
    const control = runCli(["install", "--claude", "--no-reference", "--verbose"], { home, preload: [FAKE_MOUNTS], env: { CANONKIT_TEST_MOUNTS: "", PATH: npm, CLAUDE_PROJECT_DIR: undefined } });
    assert.equal(control.status, 0, control.out);
    assert.equal(existsSync(marker), true);
    assert.doesNotMatch(control.out, /a Windows copy at/);
  });

  test("install in the default short summary shows the ignored Windows claude as a `!` line", async () => {
    const { npm, marker, go } = await wsl("wsl-res-install-short", "claude");
    const r = go(["install", "--claude", "--no-reference"]);
    assert.equal(r.status, 0, r.out);
    assert.equal(existsSync(marker), false, "the Windows claude ran");
    assert.ok(r.out.includes(`  ! security claude: a Windows copy at ${path.join(npm, "claude")} was ignored (it reads Windows settings, not these), so its version is unknown and version-gated settings are not added or updated by this install (existing ones are kept); install Claude Code inside WSL and re-run`), r.out);
    assert.doesNotMatch(r.out, /WARN security claude/);
  });

  test("doctor: the claude version row names the ignored Windows copy and starts nothing", async () => {
    const { npm, marker, go } = await wsl("wsl-res-doctor", "claude");
    const r = go(["doctor", "--verbose"]);
    assert.equal(existsSync(marker), false, "the Windows claude ran");
    const win = path.join(npm, "claude");
    assert.match(r.out, new RegExp(`WARN\\s+security claude version: unknown; a Windows copy at ${win.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} was ignored \\(it reads Windows settings, not these\\); no authenticated session or boundary test was started`));
  });

  test("doctor: control characters in the ignored path are not echoed raw", async () => {
    const s = await scratch("wsl-res-doctor-ctrl");
    const win = path.join(s.root, "mnt", "c");
    const evil = path.join(win, "ev\x1b[31mil");
    await mkdir(evil, { recursive: true });
    await writeFile(path.join(evil, "claude"), "#!/bin/sh\nexit 0\n");
    await chmod(path.join(evil, "claude"), 0o755);
    const r = runCli(["doctor", "--verbose"], { home: s.home, cwd: s.project, preload: [FAKE_MOUNTS], env: { CANONKIT_TEST_MOUNTS: `C:\\134 ${win} drvfs rw 0 0\n`, PATH: evil, CLAUDE_PROJECT_DIR: undefined } });
    assert.doesNotMatch(r.out, /\x1b/);
    assert.match(r.out, /security claude version: unknown; a Windows copy at /);
  });

  test("models refresh: a Windows-only claude is not started and the reason says so", async () => {
    const { marker, go } = await wsl("wsl-res-refresh", "claude");
    const r = go(["models", "refresh", "--claude"]);
    assert.equal(r.status, 0, r.out);
    assert.equal(existsSync(marker), false, "the Windows claude ran");
    assert.match(r.out, /unknown — claude --version: claude found only on the Windows side; not run through WSL interop/);
  });

  // A Linux-side stub named `name` in <root>/lin whose --version also calls `helper` by name.
  async function linuxStub(root, name, version) {
    const lin = path.join(root, "lin");
    await mkdir(lin, { recursive: true });
    await writeFile(path.join(lin, name), `#!/bin/sh\nhelper >/dev/null 2>&1\necho ${version}\n`);
    await chmod(path.join(lin, name), 0o755);
    return lin;
  }

  test("install --opencode --wire-hooks: the version probe of a Linux opencode cannot reach a Windows helper on PATH", async () => {
    const { root, home, npm, marker, go } = await wsl("wsl-res-oc-child", "helper");
    const lin = await linuxStub(root, "opencode", "v2.1.4");
    const r = go(["install", "--opencode", "--no-reference", "--wire-hooks"], { PATH: [lin, npm].join(path.delimiter) });
    assert.equal(r.status, 0, r.out);
    assert.equal(existsSync(marker), false, "the Windows helper ran from the --version child");
    assert.equal(existsSync(path.join(home, ".config", "opencode", "plugins")), true);
    // Control: without the fake drive the child PATH keeps the helper.
    const control = runCli(["install", "--opencode", "--no-reference", "--wire-hooks"], { home, preload: [FAKE_MOUNTS], env: { CANONKIT_TEST_MOUNTS: "", PATH: [lin, npm].join(path.delimiter), CLAUDE_PROJECT_DIR: undefined } });
    assert.equal(control.status, 0, control.out);
    assert.equal(existsSync(marker), true);
  });

  test("doctor: a Windows claude ahead of a Linux one is skipped; the Linux one is probed and nothing is reported ignored", async () => {
    const { root, npm, marker, go } = await wsl("wsl-res-ahead", "claude");
    const lin = await linuxStub(root, "claude", "2.1.322");
    const r = go(["doctor", "--verbose"], { PATH: [npm, lin].join(path.delimiter) });
    assert.equal(existsSync(marker), false, "the Windows claude ran");
    assert.match(r.out, /security claude version: 2\.1\.322; trusted-binary-version/);
    assert.doesNotMatch(r.out, /windows-binary-ignored|Windows copy at/);
  });

  test("install --opencode --wire-hooks: a Windows-only opencode is refused by name, not started, nothing written", async () => {
    const { home, npm, marker, go } = await wsl("wsl-res-opencode", "opencode");
    const r = go(["install", "--opencode", "--no-reference", "--wire-hooks"]);
    assert.equal(r.status, 1, r.out);
    assert.equal(existsSync(marker), false, "the Windows opencode ran");
    assert.match(r.out, /Refusing --wire-hooks: opencode was found only on the Windows side \(/);
    assert.ok(r.out.includes(path.join(npm, "opencode")), r.out);
    assert.match(r.out, /run it inside WSL with a Linux-side install of OpenCode 2 or later, then re-run/);
    assert.match(r.out, /Nothing was written/);
    assert.equal(existsSync(path.join(home, ".config", "opencode", "plugins")), false);
  });
});

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink, readlink, lstat } from "node:fs/promises";
import { realpathSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STACK_PACK_IDS, StackPackStore, readStackPack } from "../bin/stack-packs.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(REPO, "bin", "cli.js");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const target = (project, pack = "react", root = ".agents") => path.join(project, root, "skills", `canonkit-${pack}`, "SKILL.md");
const receipt = (project) => path.join(project, ".canonkit", "stack-packs.json");
let sandbox;
before(async () => { sandbox = realpathSync.native(await mkdtemp(path.join(os.tmpdir(), "canonkit-stacks-"))); });
after(async () => { await rm(sandbox, { recursive: true, force: true }); });

async function setup(name) {
  const root = path.join(sandbox, name), home = path.join(root, "home"), project = path.join(root, "project");
  await mkdir(home, { recursive: true }); await mkdir(project, { recursive: true });
  const env = { ...process.env, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, ".config") };
  delete env.CODEX_HOME;
  return { root, home, project, env, store: (options = {}) => new StackPackStore({ project, home, ...options }),
    run: (args, cwd = project) => {
      const r = spawnSync(process.execPath, [CLI, ...args], { cwd, env, encoding: "utf8" });
      return { ...r, out: (r.stdout ?? "") + (r.stderr ?? "") };
    } };
}

async function snapshot(root, prefix = "") {
  const result = {};
  for (const entry of await readdir(path.join(root, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name), full = path.join(root, relative);
    if (entry.isSymbolicLink()) result[relative] = `link:${await readlink(full)}`;
    else if (entry.isDirectory()) { result[relative] = "directory"; Object.assign(result, await snapshot(root, relative)); }
    else result[relative] = (await readFile(full)).toString("base64");
  }
  return result;
}

describe("project stack packs", () => {
  test("each explicit pack installs two namespaced copies, never agents or other packs, and is idempotent", async () => {
    for (const id of STACK_PACK_IDS) {
      const s = await setup(`install-${id}`);
      const beforeHome = await snapshot(s.home);
      const first = s.run(["add", id]);
      assert.equal(first.status, 0, first.out);
      for (const root of [".agents", ".claude"]) assert.equal(await readFile(target(s.project, id, root), "utf8"), readStackPack(id).text);
      assert.equal(existsSync(path.join(s.project, "AGENTS.md")), false);
      assert.equal(existsSync(path.join(s.project, ".codex")), false);
      for (const other of STACK_PACK_IDS.filter((name) => name !== id)) assert.equal(existsSync(target(s.project, other)), false);
      const before = await snapshot(s.project);
      const again = s.run(["add", id]);
      assert.equal(again.status, 0, again.out);
      assert.deepEqual(await snapshot(s.project), before);
      assert.deepEqual(await snapshot(s.home), beforeHome);
      const list = s.run(["list"]);
      assert.equal(list.status, 0, list.out);
      assert.match(list.out, new RegExp(`${id}\\s+installed`));
      assert.deepEqual(await snapshot(s.project), before, "list is read-only");
      const remove = s.run(["remove", id]);
      assert.equal(remove.status, 0, remove.out);
      assert.equal(existsSync(target(s.project, id)), false);
      assert.equal(existsSync(target(s.project, id, ".claude")), false);
      assert.equal(s.run(["remove", id]).status, 0);
      assert.equal(s.run(["add", id]).status, 0, "removed pack can be added again");
    }
  });

  test("a different project and global core/reference/uninstall remain separate from project packs", async () => {
    const s = await setup("isolation"), other = path.join(s.root, "other");
    await mkdir(other);
    assert.equal(s.run(["add", ...STACK_PACK_IDS]).status, 0);
    for (const id of STACK_PACK_IDS) assert.equal(existsSync(target(other, id)), false);
    const projectBefore = await snapshot(s.project);
    for (const args of [["install", "--codex"], ["reference", "--codex"], ["uninstall", "--codex"]]) {
      const r = s.run(args); assert.equal(r.status, 0, r.out);
      assert.deepEqual(await snapshot(s.project), projectBefore);
      for (const id of STACK_PACK_IDS) assert.equal(existsSync(path.join(s.home, ".agents", "skills", `canonkit-${id}`)), false);
    }
    assert.equal(s.run(["list"], other).status, 0);
    assert.deepEqual(await snapshot(other), {});
  });

  test("Go, Kotlin and Swift coexist, and removing one preserves the others", async () => {
    const s = await setup("go-kotlin-swift");
    assert.equal(s.run(["add", "react"]).status, 0);
    const initial = JSON.parse(await readFile(receipt(s.project), "utf8"));
    const added = s.run(["add", "go", "kotlin", "swift"]);
    assert.equal(added.status, 0, added.out);
    const before = await snapshot(s.project);
    const listed = s.run(["list"]);
    assert.equal(listed.status, 0, listed.out);
    for (const id of ["react", "go", "kotlin", "swift"]) assert.match(listed.out, new RegExp(`${id}\\s+installed`));
    assert.deepEqual(await snapshot(s.project), before, "list cannot mutate multiple pack receipts");
    const removed = s.run(["remove", "kotlin"]);
    assert.equal(removed.status, 0, removed.out);
    for (const root of [".agents", ".claude"]) {
      assert.equal(existsSync(target(s.project, "kotlin", root)), false);
      for (const id of ["react", "go", "swift"]) assert.equal(await readFile(target(s.project, id, root), "utf8"), readStackPack(id).text);
    }
    const state = JSON.parse(await readFile(receipt(s.project), "utf8"));
    assert.equal(state.schemaVersion, initial.schemaVersion);
    assert.equal(state.pending, null);
    assert.deepEqual(Object.keys(state.files).sort(), ["go", "react", "swift"].flatMap((id) => ["agents", "claude"].map((root) => `${id}:${root}:SKILL.md`)).sort());
    for (const [file, digest] of Object.entries(initial.files)) assert.equal(state.files[file], digest, "adding/removing new packs preserves existing ownership hashes");
  });

  test("mixed specialist and pack requests work, and all names/preflight precede specialist writes", async () => {
    const s = await setup("mixed");
    for (const names of [["maya", "react", "typo"], ["maya", "react", "bob"]]) {
      const before = await snapshot(s.project), r = s.run(["add", ...names]);
      assert.notEqual(r.status, 0); assert.deepEqual(await snapshot(s.project), before, r.out);
    }
    await mkdir(path.dirname(target(s.project)), { recursive: true });
    await writeFile(target(s.project), "unowned");
    const before = await snapshot(s.project);
    const conflict = s.run(["add", "maya", "react"]);
    assert.notEqual(conflict.status, 0); assert.match(conflict.out, /collision/);
    assert.deepEqual(await snapshot(s.project), before);
    await rm(path.join(s.project, ".agents"), { recursive: true });
    const add = s.run(["add", "maya", "react"]);
    assert.equal(add.status, 0, add.out);
    assert.equal(existsSync(path.join(s.project, ".codex", "agents", "maya.toml")), true);
    assert.match(await readFile(path.join(s.project, "AGENTS.md"), "utf8"), /maya/);
    assert.equal(existsSync(target(s.project)), true);
    const remove = s.run(["remove", "maya", "react"]);
    assert.equal(remove.status, 0, remove.out);
    assert.equal(existsSync(target(s.project)), false);
  });

  test("dry-run add/remove and read-only list change zero bytes, including absent state", async () => {
    const s = await setup("dry");
    let before = await snapshot(s.root);
    for (const args of [["add", "react", "--dry-run"], ["remove", "react", "--dry-run"], ["list"]]) {
      const r = s.run(args); assert.equal(r.status, 0, r.out); assert.deepEqual(await snapshot(s.root), before);
    }
    assert.equal(s.run(["add", "react"]).status, 0);
    before = await snapshot(s.root);
    for (const args of [["add", "react", "--dry-run"], ["remove", "react", "--dry-run"], ["list"]]) {
      const r = s.run(args); assert.equal(r.status, 0, r.out); assert.deepEqual(await snapshot(s.root), before);
    }
  });

  test("tracked updates use installed hashes, preserve edits, and repair a missing copy", async () => {
    const s = await setup("updates");
    await s.store().change(["react"]);
    const data = JSON.parse(await readFile(receipt(s.project), "utf8"));
    for (const root of ["agents", "claude"]) {
      const file = target(s.project, "react", `.${root}`);
      await writeFile(file, "previous installed version\n");
      data.files[`react:${root}:SKILL.md`] = hash("previous installed version\n");
    }
    await writeFile(receipt(s.project), JSON.stringify(data));
    assert.equal(await s.store().change(["react"]), 0);
    assert.equal(await readFile(target(s.project), "utf8"), readStackPack("react").text);
    await rm(target(s.project, "react", ".claude"));
    assert.equal((await s.store().list()).find((row) => row.pack === "react").state, "partial");
    assert.equal(await s.store().change(["react"]), 0);
    await writeFile(target(s.project), "my edit\n");
    const before = await snapshot(s.project);
    await assert.rejects(s.store().change(["react"]), /Locally modified/);
    assert.deepEqual(await snapshot(s.project), before);
    assert.equal((await s.store().list()).find((row) => row.pack === "react").state, "locally modified");
  });

  test("partial removal retains edited ownership, but unrelated extras do not make a clean removal fail", async () => {
    const s = await setup("removal");
    await s.store().change(["react"]);
    await writeFile(target(s.project), "local change");
    await writeFile(path.join(path.dirname(target(s.project, "react", ".claude")), "mine.txt"), "extra");
    assert.equal(await s.store().change(["react"], { remove: true }), 1);
    assert.equal(await readFile(target(s.project), "utf8"), "local change");
    assert.equal(existsSync(target(s.project, "react", ".claude")), false);
    const state = JSON.parse(await readFile(receipt(s.project), "utf8"));
    assert.equal(Object.keys(state.files).length, 1);
    await writeFile(target(s.project), readStackPack("react").text);
    assert.equal(await s.store().change(["react"], { remove: true }), 0);
    assert.equal((await s.store().list()).find((row) => row.pack === "react").state, "untracked/collision");
    assert.equal(await readFile(path.join(path.dirname(target(s.project, "react", ".claude")), "mine.txt"), "utf8"), "extra");
    assert.deepEqual(JSON.parse(await readFile(receipt(s.project), "utf8")).files, {});
  });

  test("malformed and forged receipts never authorize an external path", async () => {
    const s = await setup("forged"), sentinel = path.join(s.root, "sentinel");
    await writeFile(sentinel, "outside"); await mkdir(path.dirname(receipt(s.project)), { recursive: true });
    for (const content of ["{broken", JSON.stringify({ schemaVersion: 1, files: { "../../sentinel": hash("outside") }, pending: null }),
      JSON.stringify({ schemaVersion: 1, files: {}, pending: { id: "react:agents:SKILL.md", beforeHash: null, afterHash: "oops" } })]) {
      await writeFile(receipt(s.project), content);
      const before = await snapshot(s.root);
      await assert.rejects(s.store().change(["react"]));
      await assert.rejects(s.store().list());
      assert.deepEqual(await snapshot(s.root), before);
      assert.equal(await readFile(sentinel, "utf8"), "outside");
    }
  });

  test("HOME and canonkit checkout are refused without writes", async () => {
    const s = await setup("boundaries");
    const before = await snapshot(s.home);
    await assert.rejects(new StackPackStore({ project: s.home, home: s.home }).change(["react"]), /project-only/);
    assert.deepEqual(await snapshot(s.home), before);
    await assert.rejects(new StackPackStore({ project: REPO, home: s.home }).change(["react"]), /canonkit itself/);
  });

  test("symlink/junction destinations, receipt and linked files preserve external sentinels", async (t) => {
    const probe = await setup("link-probe");
    try { await symlink(probe.home, path.join(probe.project, "probe"), process.platform === "win32" ? "junction" : "dir"); }
    catch (err) { if (["EPERM", "EACCES", "ENOTSUP"].includes(err.code)) { t.skip("links unavailable"); return; } throw err; }
    for (const point of [".agents", ".claude", ".canonkit", ".agents/skills", ".agents/skills/canonkit-react"]) {
      const s = await setup(`link-${point.replaceAll("/", "-")}`), linked = path.join(s.project, point), outside = path.join(s.root, "external");
      await mkdir(outside); await writeFile(path.join(outside, "sentinel"), "safe");
      await mkdir(path.dirname(linked), { recursive: true });
      await symlink(outside, linked, process.platform === "win32" ? "junction" : "dir");
      const before = await snapshot(s.root);
      await assert.rejects(s.store().change(["react"]), /symbolic link or junction/);
      await assert.rejects(s.store().change(["react"], { remove: true }), /symbolic link or junction/);
      await assert.rejects(s.store().list(), /symbolic link or junction/);
      assert.deepEqual(await snapshot(s.root), before);
    }
    const s = await setup("linked-file");
    await s.store().change(["react"]);
    const outside = path.join(s.root, "file"); await writeFile(outside, "keep");
    try {
      await rm(target(s.project)); await symlink(outside, target(s.project), "file");
    } catch (err) { if (["EPERM", "EACCES"].includes(err.code)) { t.diagnostic("file symlink unavailable; directory junctions checked"); return; } throw err; }
    await assert.rejects(s.store().change(["react"], { remove: true }), /symbolic link or junction/);
    assert.equal(await readFile(outside, "utf8"), "keep");
  });

  for (const remove of [false, true]) for (const point of ["before-file", "after-file"]) {
    test(`interrupted ${remove ? "remove" : "add"} at ${point} recovers and can install again`, async () => {
      const s = await setup(`crash-${remove}-${point}`);
      if (remove) await s.store().change(["react"]);
      const interrupted = s.store({ checkpoint: async (at) => { if (at === point) throw new Error("interrupted"); } });
      await assert.rejects(interrupted.change(["react"], { remove }), /interrupted/);
      const before = await snapshot(s.project);
      assert.equal((await s.store().list()).find((row) => row.pack === "react").state, "partial (pending)");
      assert.deepEqual(await snapshot(s.project), before);
      await assert.rejects(s.store({ dryRun: true }).change(["react"], { remove }), /pending/);
      assert.deepEqual(await snapshot(s.project), before);
      assert.equal(await s.store().change(["react"], { remove }), 0);
      assert.equal(await s.store().change(["react"]), 0);
      assert.equal(await readFile(target(s.project), "utf8"), readStackPack("react").text);
    });
  }

  test("retry add directly recovers removal, and interrupted initial mkdir remains recoverable", async () => {
    const s = await setup("direct-add-recovery");
    await s.store().change(["react"]);
    await assert.rejects(s.store({ checkpoint: async (at) => { if (at === "after-file") throw new Error("stop"); } }).change(["react"], { remove: true }));
    assert.equal(await s.store().change(["react"]), 0);
    const fresh = await setup("mkdir-recovery");
    await assert.rejects(fresh.store({ checkpoint: async (at, id) => {
      if (at === "before-file") { await mkdir(path.dirname(target(fresh.project)), { recursive: true }); throw new Error("stop after mkdir"); }
    } }).change(["react"]));
    assert.equal(await fresh.store().change(["react"]), 0);
  });

  test("pending conflicts and edits after preflight are preserved rather than adopted", async () => {
    const s = await setup("pending-conflict");
    await assert.rejects(s.store({ checkpoint: async (at) => {
      if (at === "before-file") {
        await mkdir(path.dirname(target(s.project)), { recursive: true });
        await writeFile(target(s.project), "external edit");
      }
    } }).change(["react"]), /changed/);
    const before = await snapshot(s.project);
    await assert.rejects(s.store().change(["react"]), /conflicting bytes/);
    assert.deepEqual(await snapshot(s.project), before);
    assert.equal(await readFile(target(s.project), "utf8"), "external edit");
  });

  test("lock contention excludes another writer, stale takeover retries, and dry-run/list never take locks", async () => {
    const s = await setup("locks");
    await mkdir(path.dirname(receipt(s.project)), { recursive: true });
    const lock = path.join(s.project, ".canonkit", "stack-packs.lock");
    await writeFile(lock, JSON.stringify({ pid: process.pid, token: "active" }));
    const before = await snapshot(s.project);
    await assert.rejects(s.store().change(["react"]), /running/);
    await assert.rejects(s.store({ dryRun: true }).change(["react"]), /lock/);
    await s.store().list();
    assert.deepEqual(await snapshot(s.project), before);
    // A freshly exited child supplies a known dead pid, avoiding guesses about
    // which pid range an operating system uses.
    const child = spawn(process.execPath, ["-e", ""], { stdio: "ignore" });
    const dead = child.pid; await new Promise((resolve, reject) => { child.once("exit", resolve); child.once("error", reject); });
    await writeFile(lock, JSON.stringify({ pid: dead, token: "stale" }));
    assert.equal(await s.store().change(["react"]), 0);
    assert.equal(existsSync(lock), false);
  });

  test("concurrent pack writes cannot lose receipt entries", async () => {
    const s = await setup("concurrent");
    let entered, release;
    const started = new Promise((resolve) => { entered = resolve; });
    const wait = new Promise((resolve) => { release = resolve; });
    const first = s.store({ checkpoint: async (at) => { if (at === "before-file") { entered(); await wait; } } }).change(["react"]);
    await started;
    await assert.rejects(s.store().change(["python"]), /running/);
    release(); assert.equal(await first, 0);
    assert.equal(await s.store().change(["python"]), 0);
    assert.equal(Object.keys(JSON.parse(await readFile(receipt(s.project), "utf8")).files).length, 4);
  });
});

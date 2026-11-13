import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import os from "node:os";
import path from "node:path";
import { InstallManifest } from "../bin/install-manifest.js";
import { applyRuntimeReads, networkSecurityOwnership, serializeSecurity, undoNetworkSecurity } from "../bin/security.js";

async function fixture(t) {
  const home = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "canonkit-atomic-")));
  const file = path.join(home, "artifact.txt");
  const receipt = path.join(home, ".canonkit", "install-manifest.json");
  const makeStore = () => new InstallManifest({ home, roots: { home }, targets: ["claude"],
    catalog: [{ id: "home:file:artifact.txt", root: "home", relative: "artifact.txt", kind: "file", owners: ["claude"], public: true }] });
  const store = makeStore();
  await fs.writeFile(file, "original");
  t.after(async () => {
    await store.close();
    assert.equal(path.dirname(home), await fs.realpath(os.tmpdir()));
    await fs.rm(home, { recursive: true, force: true });
  });
  await store.start();
  return { home, file, receipt, store, makeStore };
}

// Update the built-in's named ESM exports so the production import sees the
// injected OS error. Each test file runs in its own process; tests are serial.
function mockRename(t, replace) {
  const rename = fs.rename;
  t.mock.method(fs, "rename", (from, to) => replace(from, to, rename));
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
}

for (const code of ["EPERM", "EACCES", "EBUSY"]) {
  test(`Windows replacement retries transient ${code} without removing the original`, { skip: process.platform !== "win32" }, async (t) => {
    const { home, file, receipt, store } = await fixture(t);
    let attempts = 0;
    let staged;
    mockRename(t, async (from, to, rename) => {
      if (to === file) {
        attempts++;
        assert.equal(await fs.readFile(file, "utf8"), "original");
        assert.equal(await fs.readFile(from, "utf8"), "installed");
        if (staged) assert.equal(from, staged);
        staged = from;
        if (attempts <= 2) throw Object.assign(new Error("sharing violation"), { code });
      }
      return rename(from, to);
    });
    await store.write(file, "installed");
    assert.equal(attempts, 3);
    assert.equal(await fs.readFile(file, "utf8"), "installed");
    assert.equal(JSON.parse(await fs.readFile(receipt)).pending, null);
    assert.equal((await fs.readdir(home)).some((name) => name.endsWith(".tmp")), false);
  });
}

test("Windows receipt replacement also retries transient locks", { skip: process.platform !== "win32" }, async (t) => {
  const { receipt, file, store } = await fixture(t);
  let attempts = 0;
  mockRename(t, async (from, to, rename) => {
    if (to === receipt && ++attempts <= 2) throw Object.assign(new Error("sharing violation"), { code: "EPERM" });
    return rename(from, to);
  });
  await store.write(file, "installed");
  assert.equal(attempts, 4); // Intent (three attempts), then completion.
  assert.equal(JSON.parse(await fs.readFile(receipt)).pending, null);
});

test("persistent Windows locks preserve the destination and a recoverable receipt", { skip: process.platform !== "win32" }, async (t) => {
  const { home, file, receipt, store, makeStore } = await fixture(t);
  const failure = Object.assign(new Error("sharing violation"), { code: "EPERM" });
  let attempts = 0;
  let locked = true;
  mockRename(t, async (from, to, rename) => {
    if (to === file && locked) { attempts++; throw failure; }
    return rename(from, to);
  });
  await assert.rejects(store.write(file, "installed"), (err) => err === failure);
  assert.equal(attempts, 6);
  assert.equal(await fs.readFile(file, "utf8"), "original");
  assert.ok(JSON.parse(await fs.readFile(receipt)).pending);
  assert.equal((await fs.readdir(home)).some((name) => name.endsWith(".tmp")), false);
  await store.close();
  locked = false;
  const resumed = makeStore();
  try { await resumed.write(file, "installed"); } finally { await resumed.close(); }
  assert.equal(await fs.readFile(file, "utf8"), "installed");
  assert.equal(JSON.parse(await fs.readFile(receipt)).pending, null);
});

test("a concurrent edit during a Windows retry is preserved", { skip: process.platform !== "win32" }, async (t) => {
  const { home, file, receipt, store } = await fixture(t);
  let attempts = 0;
  mockRename(t, async (from, to, rename) => {
    if (to === file) {
      attempts++;
      await fs.writeFile(file, "user edit");
      throw Object.assign(new Error("sharing violation"), { code: "EPERM" });
    }
    return rename(from, to);
  });
  await assert.rejects(store.write(file, "installed"), /Concurrent edit detected/);
  assert.equal(attempts, 1);
  assert.equal(await fs.readFile(file, "utf8"), "user edit");
  assert.ok(JSON.parse(await fs.readFile(receipt)).pending);
  assert.equal((await fs.readdir(home)).some((name) => name.endsWith(".tmp")), false);
});

test("unrelated rename errors fail immediately and preserve original bytes", async (t) => {
  const { home, file, store } = await fixture(t);
  const failure = Object.assign(new Error("disk error"), { code: "EIO" });
  let attempts = 0;
  mockRename(t, async (from, to, rename) => {
    if (to === file) { attempts++; throw failure; }
    return rename(from, to);
  });
  await assert.rejects(store.write(file, "installed"), (err) => err === failure);
  assert.equal(attempts, 1);
  assert.equal(await fs.readFile(file, "utf8"), "original");
  assert.equal((await fs.readdir(home)).some((name) => name.endsWith(".tmp")), false);
});

test("POSIX permission failures are not retried", { skip: process.platform === "win32" }, async (t) => {
  const { file, store } = await fixture(t);
  let attempts = 0;
  mockRename(t, async (from, to, rename) => {
    if (to === file) { attempts++; throw Object.assign(new Error("denied"), { code: "EACCES" }); }
    return rename(from, to);
  });
  await assert.rejects(store.write(file, "installed"), { code: "EACCES" });
  assert.equal(attempts, 1);
});

test("manifest accepts a newly added root when no recorded entry uses it", async (t) => {
  const home = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "canonkit-roots-")));
  const receipt = path.join(home, ".canonkit", "install-manifest.json");
  const roots = { home, copilot: path.join(home, ".copilot") };
  const store = new InstallManifest({ home, roots, targets: ["claude"], catalog: [] });
  t.after(async () => {
    await store.close();
    assert.equal(path.dirname(home), await fs.realpath(os.tmpdir()));
    await fs.rm(home, { recursive: true, force: true });
  });
  await fs.mkdir(path.dirname(receipt), { recursive: true });
  await fs.writeFile(receipt, JSON.stringify({ schemaVersion: 1, roots: { home }, entries: {}, pending: null }));

  assert.equal(await store.load(), true);
  assert.equal(store.data.roots.copilot, roots.copilot);
});

test("the receipt records appended allowRead items, uninstall removes only those and forged metadata is refused", async (t) => {
  const home = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "canonkit-allowread-")));
  const file = path.join(home, "settings.json"), receipt = path.join(home, ".canonkit", "install-manifest.json");
  const make = () => new InstallManifest({ home, roots: { home }, targets: ["claude"], catalog: [{
    id: "home:json:settings.json", root: "home", relative: "settings.json", kind: "json", owners: ["claude"],
    undo: undoNetworkSecurity, securityOwnership: networkSecurityOwnership,
  }] });
  const stores = [];
  t.after(async () => {
    for (const store of stores) await store.close();
    assert.equal(path.dirname(home), await fs.realpath(os.tmpdir()));
    await fs.rm(home, { recursive: true, force: true });
  });
  const before = { sandbox: { filesystem: { allowRead: ["~/keep"] } } };
  await fs.writeFile(file, JSON.stringify(before));
  const store = make(); stores.push(store);
  await store.start();
  const installed = applyRuntimeReads(before, ["~/.nvm"]);
  await store.write(file, serializeSecurity(installed));
  const recorded = JSON.parse(await fs.readFile(receipt)).entries["home:json:settings.json"];
  assert.deepEqual(recorded.securityChanges, { "sandbox.filesystem.allowRead": { beforePresent: true, parentPresent: true, appendedItems: ["~/.nvm"] } });

  // A later edit by the user survives uninstall.
  const edited = structuredClone(installed); edited.sandbox.filesystem.allowRead.push("~/later");
  await fs.writeFile(file, JSON.stringify(edited));
  await store.uninstall();
  assert.deepEqual(JSON.parse(await fs.readFile(file, "utf8")).sandbox.filesystem.allowRead, ["~/keep", "~/later"]);

  // Forged metadata in the receipt refuses to load.
  await store.close();
  const data = JSON.parse(await fs.readFile(receipt));
  data.entries["home:json:settings.json"] = { ...recorded, securityChanges: { "sandbox.filesystem.allowRead": { beforePresent: false, parentPresent: false, appendedItems: [42] } } };
  await fs.writeFile(receipt, JSON.stringify(data));
  const forged = make(); stores.push(forged);
  await assert.rejects(forged.load(), /Invalid security ownership|Cannot read install manifest/);
});

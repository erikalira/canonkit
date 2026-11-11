import { readFile, writeFile, mkdir, open, rename, unlink, rmdir, lstat, chmod } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { setTimeout as delay } from "node:timers/promises";

const digest = (bytes) => bytes === null ? null : createHash("sha256").update(bytes).digest("hex");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const absent = (err) => err.code === "ENOENT";
const read = async (file) => { try { return await readFile(file); } catch (err) { if (absent(err)) return null; throw err; } };

// Byte-oriented helpers for content managed inside a user's file. Removal must
// never normalize line endings, a BOM, or whitespace outside the markers.
export function removeManagedBlock(bytes, markers) {
  if (!Buffer.isBuffer(bytes) || !Array.isArray(markers) || markers.length !== 2 ||
      markers.some((marker) => typeof marker !== "string" || !marker) || markers[0] === markers[1]) {
    throw new TypeError("Invalid managed block input");
  }
  const startMarker = Buffer.from(markers[0]);
  const endMarker = Buffer.from(markers[1]);
  const start = bytes.indexOf(startMarker);
  const end = bytes.indexOf(endMarker);
  if (start === -1 && end === -1) return { bytes, block: null };
  if (start === -1 || end === -1 || end < start + startMarker.length ||
      bytes.indexOf(startMarker, start + startMarker.length) !== -1 ||
      bytes.indexOf(endMarker, end + endMarker.length) !== -1) {
    throw new Error("Refusing to remove managed block: duplicate or unmatched markers");
  }
  const limit = end + endMarker.length;
  return {
    bytes: Buffer.concat([bytes.subarray(0, start), bytes.subarray(limit)]),
    block: bytes.subarray(start, limit),
  };
}

// On Windows chmod alone does not restrict an ACL. Use the OS tools by absolute
// path, with literal arguments, before putting any private bytes in a new file.
let windowsSid;
function restrictWindows(file, directory = false) {
  if (process.platform !== "win32") return;
  const system = path.join(process.env.SystemRoot || "C:\\Windows", "System32");
  if (directory) {
    // Replace the DACL rather than just removing inherited rules: a directory
    // created before canonkit could have explicit grants to other accounts.
    const script = `$ErrorActionPreference = 'Stop'
$acl = [System.IO.Directory]::GetAccessControl($env:CANONKIT_ACL_PATH, [System.Security.AccessControl.AccessControlSections]::Access)
$acl.SetAccessRuleProtection($true, $false)
foreach ($rule in @($acl.Access)) { $acl.RemoveAccessRuleSpecific($rule) }
$sids = @([System.Security.Principal.WindowsIdentity]::GetCurrent().User, [System.Security.Principal.SecurityIdentifier]::new('S-1-5-18'), [System.Security.Principal.SecurityIdentifier]::new('S-1-5-32-544'))
foreach ($sid in $sids) { $acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')) }
[System.IO.Directory]::SetAccessControl($env:CANONKIT_ACL_PATH, $acl)`;
    const result = spawnSync(path.join(system, "WindowsPowerShell", "v1.0", "powershell.exe"), ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")], {
      encoding: "utf8", windowsHide: true, env: { ...process.env, CANONKIT_ACL_PATH: file },
    });
    if (result.status !== 0) throw new Error("Cannot restrict the canonkit state directory ACL; no private content was written");
    return;
  }
  if (!windowsSid) {
    const who = spawnSync(path.join(system, "whoami.exe"), ["/user", "/fo", "csv", "/nh"], { encoding: "utf8", windowsHide: true });
    windowsSid = who.status === 0 && who.stdout.match(/S-1-5-\d+(?:-\d+)+/)?.[0];
    if (!windowsSid) throw new Error("Cannot establish the current Windows identity for private backups");
  }
  const rights = "F";
  const result = spawnSync(path.join(system, "icacls.exe"), [file, "/inheritance:r", "/grant:r",
    `*${windowsSid}:${rights}`, `*S-1-5-18:${rights}`, `*S-1-5-32-544:${rights}`], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error("Cannot restrict access to a canonkit state file or backup; no content was written");
}

async function regularPath(file) {
  const absolute = path.resolve(file);
  let cursor = path.parse(absolute).root;
  for (const part of absolute.slice(cursor.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    let info;
    try { info = await lstat(cursor); } catch (err) { if (absent(err)) continue; throw err; }
    if (info.isSymbolicLink()) throw new Error(`Refusing symbolic link or junction: ${cursor}`);
    if (cursor !== absolute && !info.isDirectory()) throw new Error(`Not a directory: ${cursor}`);
    if (cursor === absolute && !info.isFile() && !info.isDirectory()) throw new Error(`Not a regular file or directory: ${cursor}`);
  }
}

async function exclusivePrivate(file, bytes, { privateParent = false, publicContent = false } = {}) {
  await regularPath(file);
  const handle = await open(file, "wx", 0o600);
  try {
    if (!privateParent && !publicContent) restrictWindows(file);
    await handle.writeFile(bytes);
    await handle.sync();
  } finally { await handle.close(); }
}

async function atomic(file, bytes, { keepMode = false, privateParent = false, publicContent = false } = {}) {
  await regularPath(file);
  const beforeHash = digest(await read(file));
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.canonkit-${randomUUID()}.tmp`;
  try {
    await exclusivePrivate(temp, bytes, { privateParent, publicContent });
    if (keepMode && process.platform !== "win32") {
      try { await chmod(temp, (await lstat(file)).mode & 0o7777); } catch (err) { if (!absent(err)) throw err; }
    }
    // Windows readers/scanners can briefly deny replacement. Keep the original
    // in place and retry the rename, never unlink or truncate it as a fallback.
    for (let attempt = 0; ; attempt++) {
      await regularPath(file);
      if (digest(await read(file)) !== beforeHash) throw new Error(`Concurrent edit detected: ${file}`);
      try {
        await rename(temp, file);
        break;
      } catch (err) {
        if (process.platform !== "win32" || !["EPERM", "EACCES", "EBUSY"].includes(err.code) || attempt === 5) throw err;
        await delay(100 * (attempt + 1));
      }
    }
  } finally { await unlink(temp).catch((err) => { if (!absent(err)) throw err; }); }
}

/**
 * The CLI builds this catalog from its own shipped file lists, never from disk
 * paths supplied by a manifest. The manifest is evidence, not write authority.
 * Only global install/reference use this store; project tools own their setup.
 */
export class InstallManifest {
  constructor({ home, roots, catalog, targets, stateDir, dryRun = false, log = () => {}, checkpoint = async () => {}, onChange = null }) {
    this.home = path.resolve(home);
    this.roots = roots;
    this.catalog = new Map(catalog.map((entry) => [entry.id, entry]));
    this.byPath = new Map(catalog.map((entry) => [path.resolve(roots[entry.root], entry.relative), entry]));
    this.targets = targets;
    this.dryRun = dryRun;
    this.log = log;
    this.onChange = onChange;
    this.checkpoint = checkpoint;
    const globalDir = path.join(this.home, ".canonkit");
    this.dir = stateDir === undefined ? globalDir : path.resolve(stateDir);
    if (this.dir !== globalDir && (path.dirname(this.dir) !== path.join(globalDir, "projects") || !/^[a-f0-9]{64}$/.test(path.basename(this.dir)))) {
      throw new Error("Invalid scoped install state directory");
    }
    this.file = path.join(this.dir, "install-manifest.json");
    this.lock = path.join(this.dir, "install.lock");
    this.data = { schemaVersion: 1, roots: { ...roots }, entries: {}, pending: null };
    this.lockToken = null;
    this.privateDirectories = new Set();
  }

  target(entry) {
    const spec = this.catalog.get(entry.id);
    if (!spec || spec.kind !== entry.kind || spec.root !== entry.root || spec.relative !== entry.relative) {
      throw new Error("Invalid install manifest destination or stable id");
    }
    if (path.resolve(this.data.roots[spec.root]) !== path.resolve(this.roots[spec.root])) {
      throw new Error(`Installation root changed for ${spec.root}; restore its original HOME/CODEX_HOME/XDG_CONFIG_HOME to remove the recorded installation`);
    }
    return path.resolve(this.roots[spec.root], spec.relative);
  }

  validate(data) {
    const hash = (value) => value === null || (typeof value === "string" && /^[a-f0-9]{64}$/.test(value));
    if (!data || data.schemaVersion !== 1 || !data.roots || typeof data.roots !== "object" || Array.isArray(data.roots) ||
        !data.entries || typeof data.entries !== "object" || Array.isArray(data.entries) ||
        Object.entries(data.roots).some(([root, value]) => !Object.hasOwn(this.roots, root) || typeof value !== "string" || !path.isAbsolute(value))) {
      throw new Error("Invalid or unsupported install manifest; nothing was changed");
    }
    const validateEntry = (entry, id) => {
      const spec = this.catalog.get(id);
      if (!spec || !entry || entry.id !== id || entry.kind !== spec.kind || entry.root !== spec.root || entry.relative !== spec.relative ||
          !Array.isArray(entry.owners) || !entry.owners.length || entry.owners.some((owner) => !spec.owners.includes(owner)) ||
          !["created", "modified", "observed"].includes(entry.provenance) || !hash(entry.hash)) {
        throw new Error("Invalid install manifest entry; nothing was changed");
      }
      for (const key of ["beforeSnapshot", "afterSnapshot"]) {
        if (entry[key] !== undefined && entry[key] !== null && !/^[a-f0-9-]{36}\.snapshot\.local\.bak$/.test(entry[key])) {
          throw new Error("Invalid private snapshot reference");
        }
      }
      if (entry.beforeHash !== undefined && !hash(entry.beforeHash)) throw new Error("Invalid snapshot hash");
      if (entry.securityChanges !== undefined) {
        if (!spec.securityOwnership) throw new Error("Security ownership is not supported by this catalog entry");
        spec.securityOwnership.validate(entry.securityChanges);
      }
    };
    for (const [id, entry] of Object.entries(data.entries)) {
      validateEntry(entry, id);
      if (typeof data.roots[entry.root] !== "string" || !path.isAbsolute(data.roots[entry.root])) {
        throw new Error("Invalid install manifest root; nothing was changed");
      }
    }
    if (data.pending !== null && data.pending !== undefined) {
      const pending = data.pending;
      if (!this.catalog.has(pending.id) || !hash(pending.beforeHash) || !hash(pending.afterHash)) throw new Error("Invalid pending install operation");
      if (pending.entry !== null) validateEntry(pending.entry, pending.id);
      const root = this.catalog.get(pending.id).root;
      if (typeof data.roots[root] !== "string" || !path.isAbsolute(data.roots[root])) {
        throw new Error("Invalid install manifest root; nothing was changed");
      }
    }
    return data;
  }

  async load() {
    await regularPath(this.file);
    const bytes = await read(this.file);
    if (bytes !== null) {
      try { this.data = this.validate(JSON.parse(bytes)); } catch (err) { throw new Error(`Cannot read install manifest: ${err.message}`); }
      for (const root of Object.keys(this.roots)) {
        if (!Object.values(this.data.entries).some((entry) => entry.root === root) && this.catalog.get(this.data.pending?.id)?.root !== root) {
          this.data.roots[root] = this.roots[root];
        }
      }
    }
    return bytes !== null;
  }

  async start() {
    if (this.started) return;
    await this.load();
    if (this.dryRun) {
      await regularPath(this.lock);
      if (await read(this.lock) !== null) throw new Error("Install lock exists; wait for the active command or recover it without --dry-run first");
      if (this.data.pending) throw new Error("Pending installation operation: run without --dry-run to recover it first");
      this.started = true;
      return;
    }
    await this.privateDirectory(this.dir);
    await regularPath(this.lock);
    try {
      const previous = await read(this.lock);
      if (previous) {
        let record;
        try { record = JSON.parse(previous); } catch { throw new Error("Unrecognized install lock; inspect it before retrying"); }
        if (!Number.isSafeInteger(record.pid) || record.pid <= 0 || typeof record.token !== "string") throw new Error("Unrecognized install lock");
        try { process.kill(record.pid, 0); throw new Error("Another canonkit install/uninstall is running"); }
        catch (err) { if (err.code !== "ESRCH") throw err; }
        // Serialize stale-lock takeover as well. Otherwise two recovering
        // commands could unlink a fresh lock acquired between their reads.
        const takeover = path.join(this.dir, "recovery.lock");
        let recoveryHeld = false;
        try {
          await exclusivePrivate(takeover, Buffer.from(JSON.stringify({ pid: process.pid })), { privateParent: true });
          recoveryHeld = true;
          const latest = await read(this.lock);
          if (latest && !latest.equals(previous)) throw new Error("Install lock changed during recovery; retry");
          if (latest) await unlink(this.lock);
          this.lockToken = randomUUID();
          await exclusivePrivate(this.lock, Buffer.from(JSON.stringify({ pid: process.pid, token: this.lockToken })), { privateParent: true });
        } finally { if (recoveryHeld) await unlink(takeover); }
      }
      if (!this.lockToken) {
        this.lockToken = randomUUID();
        await exclusivePrivate(this.lock, Buffer.from(JSON.stringify({ pid: process.pid, token: this.lockToken })), { privateParent: true });
      }
      await this.load();
      if (this.data.pending) await this.recover();
      this.started = true;
    } catch (err) { await this.close(); throw err; }
  }

  async close() {
    if (!this.lockToken) return;
    const token = this.lockToken;
    this.lockToken = null;
    const record = await read(this.lock);
    if (record?.length) {
      let parsed;
      try { parsed = JSON.parse(record); } catch { return; }
      if (parsed.token === token) await unlink(this.lock);
    }
  }

  async save() {
    if (!this.dryRun) await atomic(this.file, Buffer.from(JSON.stringify(this.data, null, 2) + "\n"), { privateParent: true });
  }

  async recover() {
    const pending = this.data.pending;
    const spec = this.catalog.get(pending.id);
    const file = this.target(spec);
    await regularPath(file);
    const actual = digest(await read(file));
    if (actual !== pending.beforeHash && actual !== pending.afterHash) throw new Error("Pending operation has conflicting bytes; files and journal were preserved for manual recovery");
    if (actual === pending.afterHash) {
      if (pending.entry === null) delete this.data.entries[pending.id];
      else this.data.entries[pending.id] = pending.entry;
    }
    this.data.pending = null;
    await this.save();
    this.log("Recovered the interrupted canonkit operation.");
  }

  async snapshot(bytes) {
    if (bytes === null) return null;
    const dir = path.join(this.dir, "backups");
    await this.privateDirectory(dir);
    const name = `${randomUUID()}.snapshot.local.bak`;
    await exclusivePrivate(path.join(dir, name), bytes, { privateParent: true });
    return name;
  }

  async privateDirectory(dir) {
    if (this.privateDirectories.has(dir)) return;
    await regularPath(dir);
    await mkdir(dir, { recursive: true, mode: 0o700 });
    if (process.platform === "win32") restrictWindows(dir, true);
    else await chmod(dir, 0o700);
    this.privateDirectories.add(dir);
  }

  async snapshotBytes(name, hash) {
    if (!name) { if (hash !== null) throw new Error("Missing private snapshot"); return null; }
    const file = path.join(this.dir, "backups", name);
    await regularPath(file);
    const bytes = await read(file);
    if (bytes === null || digest(bytes) !== hash) throw new Error("Missing or changed private snapshot; configuration was preserved");
    return bytes;
  }

  async backup(file, { dated = false } = {}) {
    if (this.dryRun) return null;
    await regularPath(file);
    const bytes = await read(file);
    if (bytes === null) return null;
    // OpenCode discovers every file in plugins/. A backup there is executable.
    const spec = this.byPath.get(path.resolve(file));
    if (spec?.plugin || spec?.root === "project") return path.join(this.dir, "backups", await this.snapshot(bytes));
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    for (let n = 0; ; n++) {
      const suffix = dated ? `.canonkit-${stamp}${n ? `-${n}` : ""}.bak` : `.local${n ? `-${n}` : ""}.bak`;
      const destination = file + suffix;
      try { await exclusivePrivate(destination, bytes); return destination; }
      catch (err) { if (err.code !== "EEXIST") throw err; }
    }
  }

  async commit(spec, before, after, entry) {
    const file = this.target(spec);
    await regularPath(file);
    if (digest(await read(file)) !== digest(before)) throw new Error(`Concurrent edit detected: ${file}`);
    this.data.pending = { id: spec.id, beforeHash: digest(before), afterHash: digest(after), entry };
    await this.save();
    await this.checkpoint("intent", spec.id);
    await regularPath(file);
    if (digest(await read(file)) !== digest(before)) throw new Error(`Concurrent edit detected: ${file}`);
    if (after === null) { if (before !== null) await unlink(file); }
    else await atomic(file, after, { keepMode: true, publicContent: spec.public === true });
    await this.checkpoint("mutation", spec.id);
    if (entry === null) delete this.data.entries[spec.id];
    else this.data.entries[spec.id] = entry;
    this.data.pending = null;
    await this.save();
  }

  async write(file, value) {
    await this.start();
    const spec = this.byPath.get(path.resolve(file));
    if (!spec) throw new Error(`Untracked global write refused: ${file}`);
    const target = this.target(spec);
    await regularPath(target);
    const before = await read(target);
    const after = Buffer.isBuffer(value) ? value : Buffer.from(value);
    const old = this.data.entries[spec.id];
    const owners = [...new Set([...(old?.owners ?? []), ...this.targets.filter((owner) => spec.owners.includes(owner))])].sort();
    if (!owners.length) throw new Error("No selected harness owns this write");
    const oldBlock = spec.kind === "block" ? removeManagedBlock(before ?? Buffer.alloc(0), spec.markers).block : before;
    const newBlock = spec.kind === "block" ? removeManagedBlock(after, spec.markers).block : after;
    if (spec.kind === "block" && !newBlock) throw new Error("Managed block missing from planned install");
    const changed = digest(before) !== digest(after);
    if (changed) this.onChange?.(target);
    const entry = { id: spec.id, kind: spec.kind, root: spec.root, relative: spec.relative, owners,
      provenance: old?.provenance ?? (changed ? (before === null ? "created" : "modified") : "observed"), hash: digest(newBlock) };
    if (old?.provenance === "observed" && changed) entry.provenance = "modified";
    if (old?.backup) entry.backup = old.backup;
    if (spec.kind === "json" && old) {
      // This hash authenticates afterSnapshot, not later unrelated user edits.
      // Observing without a write must preserve that recorded pair.
      if (!changed) entry.hash = old.hash;
      for (const key of ["beforeSnapshot", "beforeHash", "afterSnapshot"]) if (old[key] !== undefined) entry[key] = old[key];
    }
    if (spec.securityOwnership) {
      const owned = spec.securityOwnership.capture(before, after, old?.securityChanges ?? {});
      spec.securityOwnership.validate(owned);
      if (Object.keys(owned).length) entry.securityChanges = owned;
    }
    if (this.dryRun) { this.log(`would track ${spec.id} (${entry.provenance})`); return; }
    if (changed && before !== null && spec.kind !== "json" && (!old || digest(oldBlock) !== old.hash)) {
      const backup = await this.backup(target);
      entry.backup ??= path.basename(backup);
      this.log(`  ${path.basename(target)} differed — previous copy kept as ${backup}`);
    }
    if (spec.kind === "json" && changed) {
      if (!old || old.provenance === "observed") {
        entry.beforeSnapshot = await this.snapshot(before);
        entry.beforeHash = digest(before);
      }
      entry.afterSnapshot = await this.snapshot(after);
    }
    if (!changed) {
      if (!isDeepStrictEqual(old, entry)) { this.data.entries[spec.id] = entry; await this.save(); }
    } else await this.commit(spec, before, after, entry);
  }

  async observe(file) {
    await regularPath(file);
    const bytes = await read(file);
    if (bytes !== null) await this.write(file, bytes);
  }

  /** Retire a generated project file only while its receipt still matches. */
  async retire(file) {
    await this.start();
    const spec = this.byPath.get(path.resolve(file));
    if (!spec?.preserveModified) throw new Error(`Untracked project retirement refused: ${file}`);
    const entry = this.data.entries[spec.id];
    if (!entry) return false;
    const target = this.target(spec);
    await regularPath(target);
    const current = await read(target);
    if (current !== null && digest(current) !== entry.hash) {
      this.log(`Preserved edited ${spec.id}; canonkit ownership detached`);
      if (!this.dryRun) { delete this.data.entries[spec.id]; await this.save(); }
      return false;
    }
    this.log(`${this.dryRun ? "would remove" : "Removing"} ${spec.id}`);
    if (!this.dryRun) await this.commit(spec, current, null, null);
    return true;
  }

  wrap(ctx) {
    return { ...ctx, manifest: this, historyContext: ctx,
      write: (file, bytes) => this.write(file, bytes),
      writeAtomic: (file, bytes) => this.write(file, bytes),
      copy: async (source, file) => this.write(file, await readFile(source)),
      backup: async (file) => { await this.start(); return this.backup(file, { dated: true }); },
      mkdir: async (dir) => { if (!this.dryRun) { await this.start(); await regularPath(dir); await mkdir(dir, { recursive: true }); } },
    };
  }

  /** Preflight each harness, then detach its configuration before its files. */
  async uninstall({ references = async () => [] } = {}) {
    const exists = await this.load();
    if (!exists) { this.log("No install manifest: nothing was removed. Follow docs/install.md#uninstalling for pre-manifest installations."); return 1; }
    await this.start();
    const selected = new Set(this.targets);
    const blocked = new Set();
    const configs = new Map();
    const configInputs = new Map();
    for (const owner of selected) {
      try {
        const entries = Object.values(this.data.entries).filter((entry) => entry.owners.includes(owner));
        for (const entry of entries) {
          const file = this.target(entry);
          await regularPath(file);
          if (entry.kind === "json" && entry.provenance !== "observed") {
            const current = await read(file);
            configInputs.set(file, current);
            if (current !== null) {
              const before = await this.snapshotBytes(entry.beforeSnapshot, entry.beforeHash);
              const after = await this.snapshotBytes(entry.afterSnapshot, entry.hash);
              configs.set(file, await this.catalog.get(entry.id).undo(before, after, current, entry));
            }
          }
          if (this.catalog.get(entry.id).plugin && entry.provenance === "observed" && await read(file) !== null) throw new Error("The preexisting OpenCode plugin is observed, so its runtime must stay");
          if (entry.kind === "block") removeManagedBlock(await read(file) ?? Buffer.alloc(0), this.catalog.get(entry.id).markers);
        }
        const residual = await references(owner, configs);
        if (residual.length) throw new Error(`References remain: ${residual.join(", ")}`);
        for (const entry of entries.filter((item) => item.kind === "json" && item.provenance !== "observed")) {
          const file = this.target(entry);
          await regularPath(file);
          if (digest(await read(file)) !== digest(configInputs.get(file))) throw new Error(`Concurrent edit detected after configuration preflight: ${file}`);
        }
      } catch (err) {
        blocked.add(owner);
        this.log(`Retained ${owner}: ${err.message}`);
      }
    }
    const active = new Set([...selected].filter((owner) => !blocked.has(owner)));
    const entries = Object.values(this.data.entries).sort((a, b) => (a.kind === "json" ? 0 : this.catalog.get(a.id).plugin ? 1 : 2) - (b.kind === "json" ? 0 : this.catalog.get(b.id).plugin ? 1 : 2));
    for (const entry of entries) {
      if (!entry.owners.some((owner) => active.has(owner))) continue;
      const owners = entry.owners.filter((owner) => !active.has(owner));
      const spec = this.catalog.get(entry.id);
      const file = this.target(entry);
      await regularPath(file);
      const current = await read(file);
      if (entry.kind === "json" && entry.provenance !== "observed" && digest(current) !== digest(configInputs.get(file))) {
        throw new Error(`Concurrent edit detected after configuration preflight: ${file}`);
      }
      if (owners.length) {
        this.log(`Kept shared ${entry.id} for ${owners.join(", ")}`);
        if (!this.dryRun) { this.data.entries[entry.id] = { ...entry, owners }; await this.save(); }
        continue;
      }
      let after = null;
      if (entry.provenance === "observed") {
        this.log(`Preserved preexisting ${entry.id} (observed)`);
        if (!this.dryRun) { delete this.data.entries[entry.id]; await this.save(); }
        continue;
      }
      if (spec.preserveModified && current !== null && digest(current) !== entry.hash) {
        this.log(`Preserved edited ${entry.id}; canonkit ownership detached`);
        if (!this.dryRun) { delete this.data.entries[entry.id]; await this.save(); }
        continue;
      }
      if (entry.kind === "json") after = current === null ? null : configs.has(file) ? configs.get(file) : current;
      else if (entry.kind === "block") after = removeManagedBlock(current ?? Buffer.alloc(0), spec.markers).bytes;
      this.log(`${this.dryRun ? "would remove" : "Removing"} ${entry.id}`);
      if (this.dryRun) continue;
      if (current !== null) {
        const relevant = entry.kind === "block" ? removeManagedBlock(current, spec.markers).block : current;
        if (entry.kind === "json" ? digest(current) !== digest(after) : relevant !== null && digest(relevant) !== entry.hash) {
          await this.backup(file, { dated: entry.kind === "json" });
        }
      }
      await this.commit(spec, current, after, null);
      if (after === null) {
        let dir = path.dirname(file);
        const root = path.resolve(this.roots[spec.root]);
        while (dir !== root && dir.startsWith(root + path.sep)) {
          try { await regularPath(dir); await rmdir(dir); } catch (err) { if (!["ENOTEMPTY", "EEXIST", "ENOENT"].includes(err.code)) throw err; break; }
          dir = path.dirname(dir);
        }
      }
    }
    this.log("Backups, activity history, project specialists/tools and legacy ~/.agents/<core>.md were preserved. References in other projects are not scanned.");
    return blocked.size ? 1 : 0;
  }
}

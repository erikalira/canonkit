import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { readFile, readdir, mkdir, open, rename, unlink, lstat, rmdir } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const STACK_PACK_IDS = Object.freeze(["typescript", "cpp", "csharp", "java", "python", "react", "rust"]);
const TARGETS = Object.freeze({ agents: ".agents", claude: ".claude" });
const HASH = /^[a-f0-9]{64}$/;
const digest = (bytes) => bytes === null ? null : createHash("sha256").update(bytes).digest("hex");
const absent = (err) => err.code === "ENOENT";
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const samePath = (a, b) => process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;

/** Source IDs are CLI names; installed skill names are deliberately namespaced. */
export function readStackPack(id, repo = PACKAGE_ROOT) {
  if (!STACK_PACK_IDS.includes(id)) throw new Error(`Unknown stack pack: ${id}`);
  const text = readFileSync(path.join(repo, "stack-packs", id, "SKILL.md"), "utf8").replace(/\r\n/g, "\n");
  const front = /^---\n([\s\S]*?)\n---\n/.exec(text);
  const name = front && /^name:\s*(\S+)\s*$/m.exec(front[1])?.[1];
  const description = front && /^description:\s*(.+)$/m.exec(front[1])?.[1];
  if (name !== `canonkit-${id}` || !description || description.length < 40) {
    throw new Error(`Invalid stack pack metadata: ${id}`);
  }
  return { id, name, description, text, body: text.slice(front[0].length).trim() };
}

/** Shared by validation and the eval loader, without writing or calling models. */
export function validateStackPacks(repo = PACKAGE_ROOT, cases = null) {
  const found = readdirSync(path.join(repo, "stack-packs"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  if (JSON.stringify(found) !== JSON.stringify([...STACK_PACK_IDS].sort())) throw new Error("Stack-pack directories differ from the catalog");
  for (const id of STACK_PACK_IDS) {
    readStackPack(id, repo);
    if (cases && !cases.some((kase) => kase.stackPack === id)) throw new Error(`Missing quality case for stack pack: ${id}`);
  }
  return STACK_PACK_IDS;
}

function catalog(project) {
  return new Map(STACK_PACK_IDS.flatMap((pack) => Object.entries(TARGETS).map(([target, root]) => {
    const directory = path.join(project, root, "skills", `canonkit-${pack}`);
    return [`${pack}:${target}:SKILL.md`, { pack, directory, file: path.join(directory, "SKILL.md") }];
  })));
}

// A project root may itself have been reached through a normal filesystem alias
// (macOS /var, for example). Resolve it once; reject links below that boundary.
async function safePath(project, file) {
  const relative = path.relative(project, file);
  if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error("Invalid stack-pack destination");
  let cursor = project;
  for (const part of relative.split(path.sep)) {
    cursor = path.join(cursor, part);
    let info;
    try { info = await lstat(cursor); } catch (err) { if (absent(err)) continue; throw err; }
    if (info.isSymbolicLink()) throw new Error(`Refusing symbolic link or junction: ${cursor}`);
    if (cursor !== file && !info.isDirectory()) throw new Error(`Not a directory: ${cursor}`);
    if (cursor === file && !info.isDirectory() && !info.isFile()) throw new Error(`Not a regular path: ${cursor}`);
  }
}

async function bytes(project, file) {
  await safePath(project, file);
  try { return await readFile(file); } catch (err) { if (absent(err)) return null; throw err; }
}

async function exists(project, file) {
  await safePath(project, file);
  try { await lstat(file); return true; } catch (err) { if (absent(err)) return false; throw err; }
}

/** A small project-only receipt: it owns two fixed SKILL.md targets per pack. */
export class StackPackStore {
  constructor({ project = process.cwd(), home = os.homedir(), repo = PACKAGE_ROOT, dryRun = false, log = () => {}, checkpoint = async () => {} } = {}) {
    this.project = realpathSync.native(project);
    this.home = realpathSync.native(home);
    this.repo = realpathSync.native(repo);
    this.catalog = catalog(this.project);
    this.dryRun = dryRun;
    this.log = log;
    this.checkpoint = checkpoint;
    this.directory = path.join(this.project, ".canonkit");
    this.file = path.join(this.directory, "stack-packs.json");
    this.lock = path.join(this.directory, "stack-packs.lock");
    this.takeover = path.join(this.directory, "stack-packs-recovery.lock");
    this.data = { schemaVersion: 1, files: {}, pending: null };
    this.receiptHash = null;
    this.token = null;
  }

  checkProject() {
    const relative = path.relative(this.repo, this.project);
    if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
      throw new Error("Refusing: this is canonkit itself. Run add/remove from the consuming project.");
    }
    if (samePath(this.project, this.home)) throw new Error("Stack packs are project-only; run add/remove in a project, not HOME.");
  }

  validate(data) {
    if (!object(data) || data.schemaVersion !== 1 || !object(data.files) || !(data.pending === null || object(data.pending)) ||
        Object.keys(data).some((key) => !["schemaVersion", "files", "pending"].includes(key))) throw new Error("Invalid stack-pack receipt; nothing was changed");
    for (const [id, hash] of Object.entries(data.files)) {
      if (!this.catalog.has(id) || typeof hash !== "string" || !HASH.test(hash)) throw new Error("Invalid stack-pack receipt entry; nothing was changed");
    }
    const pending = data.pending;
    if (pending && (!this.catalog.has(pending.id) || Object.keys(pending).sort().join() !== "afterHash,beforeHash,id" ||
      [pending.beforeHash, pending.afterHash].some((hash) => hash !== null && (typeof hash !== "string" || !HASH.test(hash))))) {
      throw new Error("Invalid pending stack-pack operation; nothing was changed");
    }
    return data;
  }

  async load() {
    const raw = await bytes(this.project, this.file);
    this.receiptHash = digest(raw);
    if (raw === null) { this.data = { schemaVersion: 1, files: {}, pending: null }; return; }
    try { this.data = this.validate(JSON.parse(raw.toString("utf8"))); }
    catch (err) { throw new Error(`Cannot read stack-pack receipt: ${err.message}`); }
  }

  async atomic(file, content, expectedHash) {
    await safePath(this.project, file);
    await safePath(this.project, this.directory);
    await mkdir(path.dirname(file), { recursive: true });
    // Keep staging files in the receipt directory, not the skill directory.
    // An interrupted creation must not leave untracked files beside SKILL.md.
    const temp = path.join(this.directory, `stack-pack-${randomUUID()}.tmp`);
    let handle;
    try {
      handle = await open(temp, "wx", 0o600);
      await handle.writeFile(content);
      await handle.sync();
      await handle.close(); handle = null;
      if (digest(await bytes(this.project, file)) !== expectedHash) throw new Error(`File changed during operation; preserved: ${file}`);
      await rename(temp, file);
    } finally {
      if (handle) await handle.close();
      await unlink(temp).catch((err) => { if (!absent(err)) throw err; });
    }
  }

  async save() {
    const content = Buffer.from(JSON.stringify(this.data, null, 2) + "\n");
    await this.atomic(this.file, content, this.receiptHash);
    this.receiptHash = digest(content);
  }

  async exclusive(file, record) {
    await safePath(this.project, file);
    const handle = await open(file, "wx", 0o600);
    try { await handle.writeFile(JSON.stringify(record)); await handle.sync(); } finally { await handle.close(); }
  }

  async acquire() {
    await safePath(this.project, this.directory);
    await mkdir(this.directory, { recursive: true });
    const previous = await bytes(this.project, this.lock);
    if (previous !== null) {
      let record;
      try { record = JSON.parse(previous); } catch { throw new Error("Unrecognized stack-pack lock; inspect it before retrying"); }
      if (!Number.isSafeInteger(record.pid) || record.pid <= 0 || typeof record.token !== "string") throw new Error("Unrecognized stack-pack lock");
      try { process.kill(record.pid, 0); throw new Error("Another stack-pack operation is running"); }
      catch (err) { if (err.code !== "ESRCH") throw err; }
      // Serialize stale takeovers so two recovering commands cannot unlink a
      // newly acquired lock. A stranded recovery lock requires manual inspection.
      let held = false;
      try {
        await this.exclusive(this.takeover, { pid: process.pid }); held = true;
        const latest = await bytes(this.project, this.lock);
        if (latest !== null && !latest.equals(previous)) throw new Error("Stack-pack lock changed; retry");
        if (latest !== null) await unlink(this.lock);
        this.token = randomUUID();
        await this.exclusive(this.lock, { pid: process.pid, token: this.token });
      } finally { if (held) await unlink(this.takeover); }
    } else {
      this.token = randomUUID();
      await this.exclusive(this.lock, { pid: process.pid, token: this.token });
    }
  }

  async close() {
    if (!this.token) return;
    const token = this.token; this.token = null;
    const raw = await bytes(this.project, this.lock);
    if (raw === null) return;
    let record;
    try { record = JSON.parse(raw); } catch { return; }
    if (record.token === token) await unlink(this.lock);
  }

  async recoveredData() {
    const data = structuredClone(this.data);
    const p = data.pending;
    if (!p) return data;
    const actual = digest(await bytes(this.project, this.catalog.get(p.id).file));
    if (actual !== p.beforeHash && actual !== p.afterHash) throw new Error("Pending stack-pack operation has conflicting bytes; files and receipt preserved");
    if (actual === p.afterHash) {
      if (p.afterHash === null) delete data.files[p.id];
      else data.files[p.id] = p.afterHash;
    }
    data.pending = null;
    return data;
  }

  async cleanDirectory(directory) {
    await safePath(this.project, directory);
    await rmdir(directory).catch((err) => { if (!absent(err) && err.code !== "ENOTEMPTY" && err.code !== "EEXIST") throw err; });
  }

  async plan(names, remove, data = this.data) {
    const operations = [], conflicts = [];
    for (const pack of names) {
      const source = remove ? null : Buffer.from(readStackPack(pack, this.repo).text);
      for (const [id, spec] of this.catalog) {
        if (spec.pack !== pack) continue;
        const tracked = Object.hasOwn(data.files, id), expected = data.files[id];
        const actual = digest(await bytes(this.project, spec.file));
        const directoryExists = await exists(this.project, spec.directory);
        const recoveringDirectory = directoryExists && this.data.pending?.id === id && actual === null &&
          (this.data.pending.beforeHash === null || this.data.pending.afterHash === null) &&
          (await readdir(spec.directory)).length === 0;
        if (!tracked && directoryExists && !recoveringDirectory) {
          if (!remove) throw new Error(`Untracked stack-pack collision; preserved: ${spec.directory}`);
          // An extra left after a successful removal has no managed ownership.
          this.log(`Preserved untracked stack-pack directory: ${spec.directory}`);
          continue;
        }
        if (tracked && actual !== null && actual !== expected) {
          if (!remove) throw new Error(`Locally modified stack-pack file; preserved: ${spec.file}`);
          conflicts.push(spec.file); continue;
        }
        const afterHash = digest(source);
        if (remove ? tracked : actual !== afterHash || !tracked) operations.push({ id, spec, beforeHash: actual, afterHash, source });
      }
    }
    return { operations, conflicts };
  }

  async change(names, { remove = false, before = async () => {} } = {}) {
    this.checkProject();
    names = [...new Set(names)];
    for (const id of names) if (!STACK_PACK_IDS.includes(id)) throw new Error(`Unknown stack pack: ${id}`);
    await this.load();
    // Pure preflight, including recovery projection, before creating any state.
    await this.plan(names, remove, await this.recoveredData());
    if (this.dryRun) {
      if (await exists(this.project, this.lock) || this.data.pending) throw new Error("Active lock or pending stack-pack operation: recover without --dry-run first");
      const plan = await this.plan(names, remove);
      await before();
      for (const op of plan.operations) this.log(`[dry-run] ${remove ? "Remove" : "Install"} ${op.spec.file}`);
      for (const file of plan.conflicts) this.log(`Preserved locally modified stack-pack file: ${file}`);
      return plan.conflicts.length ? 1 : 0;
    }
    try {
      await this.acquire();
      await this.load();
      if (this.data.pending) {
        const pending = this.data.pending;
        const recovered = await this.recoveredData();
        if (pending.afterHash === null || pending.beforeHash === null &&
            await bytes(this.project, this.catalog.get(pending.id).file) === null) {
          await this.cleanDirectory(this.catalog.get(pending.id).directory);
        }
        this.data = recovered;
        await this.save();
        this.log("Recovered interrupted stack-pack operation.");
      }
      const plan = await this.plan(names, remove);
      await before();
      for (const op of plan.operations) {
        this.data.pending = { id: op.id, beforeHash: op.beforeHash, afterHash: op.afterHash };
        await this.save();
        await this.checkpoint("before-file", op.id);
        if (digest(await bytes(this.project, op.spec.file)) !== op.beforeHash) throw new Error(`Stack-pack file changed; preserved: ${op.spec.file}`);
        if (remove) {
          if (op.beforeHash !== null) await unlink(op.spec.file);
        } else await this.atomic(op.spec.file, op.source, op.beforeHash);
        await this.checkpoint("after-file", op.id);
        if (digest(await bytes(this.project, op.spec.file)) !== op.afterHash) throw new Error(`Stack-pack file changed; preserved: ${op.spec.file}`);
        // Finish directory cleanup while the pending entry still proves ownership.
        // A crash here can safely retry; extras leave the directory untouched.
        if (remove) await this.cleanDirectory(op.spec.directory);
        if (op.afterHash === null) delete this.data.files[op.id];
        else this.data.files[op.id] = op.afterHash;
        this.data.pending = null;
        await this.save();
        this.log(`${remove ? "Removed" : "Installed"} ${op.spec.file}`);
      }
      for (const file of plan.conflicts) this.log(`Preserved locally modified stack-pack file: ${file}`);
      if (!plan.operations.length && !plan.conflicts.length) this.log(`Stack packs already ${remove ? "absent" : "current"}: ${names.join(", ")}`);
      return plan.conflicts.length ? 1 : 0;
    } catch (err) {
      this.log("Stack-pack operation incomplete; completed file changes were logged above. Retry to recover pending work.");
      throw err;
    } finally { await this.close(); }
  }

  async list() {
    await this.load();
    const rows = [];
    for (const pack of STACK_PACK_IDS) {
      let tracked = 0, present = 0, modified = false, untracked = false;
      for (const [id, spec] of this.catalog) {
        if (spec.pack !== pack) continue;
        const hash = digest(await bytes(this.project, spec.file));
        if (Object.hasOwn(this.data.files, id)) { tracked++; if (hash !== null) present++; if (hash !== null && hash !== this.data.files[id]) modified = true; }
        else if (await exists(this.project, spec.directory)) untracked = true;
      }
      const pending = this.data.pending && this.catalog.get(this.data.pending.id).pack === pack;
      const state = pending ? "partial (pending)" : modified ? "locally modified" : untracked ? "untracked/collision" : tracked === 2 && present === 2 ? "installed" : tracked ? "partial" : "absent";
      rows.push({ pack, state });
    }
    return rows;
  }
}

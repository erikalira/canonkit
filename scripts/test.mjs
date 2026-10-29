// `node --test "test/*.test.js"` expands the glob itself only from Node 21, and
// npm runs scripts through cmd.exe on Windows, which expands none — so on Node 20
// not one test ran. The file list is built here instead. Arguments pass through
// as runner options: `npm test -- --test-name-pattern=doctor`.
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "test");
const files = readdirSync(dir).filter((f) => f.endsWith(".test.js")).sort().map((f) => path.join(dir, f));
if (!files.length) {
  console.error(`no test/*.test.js under ${dir}`);
  process.exit(1);
}
const r = spawnSync(process.execPath, ["--test", ...process.argv.slice(2), ...files], { stdio: "inherit" });
process.exit(r.status ?? 1);

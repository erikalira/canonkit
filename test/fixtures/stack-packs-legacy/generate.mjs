// Regenerates test/fixtures/stack-packs-legacy/project from the real two-target
// CLI. Run from the repository root:
//   node test/fixtures/stack-packs-legacy/generate.mjs
// It checks out only bin/stack-packs.js and the two pack sources of commit
// 1637bbd into a temp "repo", installs `react` then `go` into a temp project
// with that module, and copies the resulting tree here. Nothing else is touched.
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const BASELINE = "1637bbd";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..", "..");
const show = (file) => execFileSync("git", ["show", `${BASELINE}:${file}`], { cwd: REPO, maxBuffer: 1 << 24 });

const temp = await mkdtemp(path.join(os.tmpdir(), "canonkit-legacy-fixture-"));
try {
  const repo = path.join(temp, "repo"), project = path.join(temp, "project"), home = path.join(temp, "home");
  await mkdir(path.join(repo, "bin"), { recursive: true });
  await mkdir(project); await mkdir(home);
  await writeFile(path.join(repo, "bin", "stack-packs.js"), show("bin/stack-packs.js"));
  for (const id of ["react", "go"]) {
    await mkdir(path.join(repo, "stack-packs", id), { recursive: true });
    await writeFile(path.join(repo, "stack-packs", id, "SKILL.md"), show(`stack-packs/${id}/SKILL.md`));
  }
  const { StackPackStore } = await import(pathToFileURL(path.join(repo, "bin", "stack-packs.js")).href);
  for (const id of ["react", "go"]) await new StackPackStore({ project, home, repo }).change([id]);
  const out = path.join(HERE, "project");
  await rm(out, { recursive: true, force: true });
  await cp(project, out, { recursive: true });
  console.log(`Wrote ${out}`);
} finally {
  await rm(temp, { recursive: true, force: true });
}

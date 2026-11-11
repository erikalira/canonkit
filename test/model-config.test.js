import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import path from "node:path";
import os from "node:os";

import { readChoices, writeChoices, setChoice, resolve, projectRoot, projectConfigPath } from "../bin/model-config.js";
import { symlink } from "node:fs/promises";

async function tempDir() {
  return realpathSync.native(await mkdtemp(path.join(os.tmpdir(), "canonkit-choices-")));
}

const doc = (claude) => ({ version: 1, harnesses: { claude } });

describe("choices files", () => {
  test("a missing file reads as an empty version-1 document", async () => {
    const dir = await tempDir();
    try {
      assert.deepEqual(await readChoices(path.join(dir, "models.json")), { version: 1, harnesses: {} });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("round-trips and preserves keys this version does not know", async () => {
    const dir = await tempDir();
    try {
      const file = path.join(dir, ".canonkit", "models.json");
      const original = { version: 1, note: "kept", harnesses: { claude: { levels: { deep: { model: "opus", effort: "high", future: 1 } } }, codex: { roleFiles: true } } };
      await writeChoices(file, original);
      const loaded = await readChoices(file);
      assert.deepEqual(loaded, original);
      setChoice(loaded, "claude", "agents", "quinn", { effort: "high" });
      await writeChoices(file, loaded);
      const again = JSON.parse(await readFile(file, "utf8"));
      assert.equal(again.note, "kept");
      assert.equal(again.harnesses.claude.levels.deep.future, 1);
      assert.deepEqual(again.harnesses.codex, { roleFiles: true });
      assert.deepEqual(again.harnesses.claude.agents, { quinn: { effort: "high" } });
      setChoice(again, "claude", "agents", "quinn", null);
      assert.deepEqual(again.harnesses.claude.agents, {});
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("an unknown version is refused, and the file is left as it was", async () => {
    const dir = await tempDir();
    try {
      const file = path.join(dir, "models.json");
      const text = JSON.stringify({ version: 2, harnesses: {} });
      await writeFile(file, text);
      await assert.rejects(readChoices(file), /version 2 is not supported .* refusing to read or overwrite it/);
      await assert.rejects(writeChoices(file, { version: 2, harnesses: {} }), /version 2 is not supported/);
      assert.equal(await readFile(file, "utf8"), text);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("malformed documents and values are rejected with the path that is wrong", async () => {
    const dir = await tempDir();
    try {
      const file = path.join(dir, "models.json");
      const cases = [
        ["{", /not valid JSON/],
        [JSON.stringify([]), /not a JSON object/],
        [JSON.stringify(doc({ levels: { deep: { model: "opus\nx" } } })), /harnesses\["claude"\]\.levels\.deep\.model must be a model or effort name/],
        [JSON.stringify(doc({ levels: { deep: { model: 7 } } })), /levels\.deep\.model/],
        [JSON.stringify(doc({ agents: { "../x": { model: "opus" } } })), /invalid name/],
        [JSON.stringify(doc({ levels: { deep: { unverified: "yes" } } })), /unverified must be true or false/],
        [JSON.stringify(doc({ levels: [] })), /levels must be an object/],
      ];
      for (const [text, error] of cases) {
        await writeFile(file, text);
        await assert.rejects(readChoices(file), error, text);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("resolution", () => {
  const user = doc({
    levels: { standard: { model: "sonnet", effort: "medium" }, deep: { model: "opus", effort: "high" } },
    agents: { quinn: { effort: "xhigh" } },
  });
  const project = doc({
    levels: { deep: { model: "fable" }, standard: { effort: "high" } },
    agents: { gard: { model: "custom-model", unverified: true } },
  });
  const pick = (r) => [r.model.value, r.model.source, r.effort.value, r.effort.source];

  const table = [
    ["user level only", { name: "bob", need: "standard" }, { user }, ["sonnet", "user level", "medium", "user level"]],
    ["user agent override on effort only", { name: "quinn", need: "standard" }, { user }, ["sonnet", "user level", "xhigh", "user agent override"]],
    ["project level overrides the model only", { name: "archie", need: "deep" }, { user, project }, ["fable", "project level", "high", "user level"]],
    ["project raises only effort", { name: "bob", need: "standard" }, { user, project }, ["sonnet", "user level", "high", "project level"]],
    ["a project level beats a user agent override", { name: "quinn", need: "standard" }, { user, project }, ["sonnet", "user level", "high", "project level"]],
    ["project agent override", { name: "gard", need: "standard" }, { user, project }, ["custom-model", "project agent override", "high", "project level"]],
    ["nothing configured", { name: "bob", need: "standard" }, {}, [null, "inherit", null, "inherit"]],
    ["a level nobody set", { name: "scout", need: "light" }, { user, project }, [null, "inherit", null, "inherit"]],
    ["another harness", { name: "bob", need: "standard" }, { user, project, harness: "codex" }, [null, "inherit", null, "inherit"]],
  ];
  for (const [label, agent, layers, expected] of table) {
    test(label, () => {
      assert.deepEqual(pick(resolve(agent, layers.harness ?? "claude", layers)), expected);
    });
  }

  test("an unverified entry is carried with the field it set", () => {
    const r = resolve({ name: "gard", need: "standard" }, "claude", { user, project });
    assert.equal(r.model.unverified, true);
    assert.equal(r.effort.unverified, false);
  });
});

describe("project root", () => {
  test("is the repository root from any subfolder, cwd outside a repository, and never the home folder", async () => {
    const dir = await tempDir();
    try {
      const home = path.join(dir, "home");
      const repo = path.join(home, "dev", "app");
      const deep = path.join(repo, "src", "lib");
      await mkdir(deep, { recursive: true });
      await mkdir(path.join(repo, ".git"), { recursive: true });
      await writeFile(path.join(repo, ".git", "HEAD"), "ref: refs/heads/main\n");
      assert.equal(await projectRoot(deep, home), repo);
      assert.equal(await projectRoot(repo, home), repo);
      // A choices file in a parent outside the repository is not the project's.
      await mkdir(path.join(home, "dev", ".canonkit"), { recursive: true });
      await writeFile(path.join(home, "dev", ".canonkit", "models.json"), "{}");
      assert.equal(await projectRoot(deep, home), repo);
      const loose = path.join(dir, "loose");
      await mkdir(loose);
      assert.equal(await projectRoot(loose, home), loose);
      assert.equal(await projectRoot(home, home), null);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("project files are not followed", () => {
  test("a linked .canonkit folder is refused for read and write; the user file may be a link", async (t) => {
    const dir = await tempDir();
    try {
      const target = path.join(dir, "victim");
      await mkdir(target);
      await writeFile(path.join(target, "models.json"), JSON.stringify({ version: 1, harnesses: {} }));
      const project = path.join(dir, "repo");
      await mkdir(project);
      try {
        await symlink(target, path.join(project, ".canonkit"), "junction");
      } catch (err) {
        t.skip(`cannot create a link here: ${err.code}`);
        return;
      }
      const file = projectConfigPath(project);
      await assert.rejects(readChoices(file, { project: true }), /symbolic link or junction; refusing/);
      await assert.rejects(writeChoices(file, { version: 1, harnesses: { claude: {} } }, { project: true }), /symbolic link or junction; refusing/);
      assert.equal(await readFile(path.join(target, "models.json"), "utf8"), JSON.stringify({ version: 1, harnesses: {} }));
      // The person's own file through a link (a dotfile manager) still works.
      assert.deepEqual(await readChoices(file), { version: 1, harnesses: {} });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("a directory, or an oversized file, is not read as choices", async () => {
    const dir = await tempDir();
    try {
      const asDir = path.join(dir, "a", "models.json");
      await mkdir(asDir, { recursive: true });
      await assert.rejects(readChoices(asDir), /not a regular file/);
      const big = path.join(dir, "big.json");
      await writeFile(big, JSON.stringify({ version: 1, harnesses: {}, pad: "x".repeat(70 * 1024) }));
      await assert.rejects(readChoices(big), /larger than 65536 bytes/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("hostile keys are escaped in error messages", async () => {
    const dir = await tempDir();
    try {
      const file = path.join(dir, "models.json");
      await writeFile(file, JSON.stringify({ version: 1, harnesses: { "x\u001b[31m\nFAKE OK": 5 } }));
      const err = await readChoices(file).catch((e) => e);
      assert.doesNotMatch(err.message, /[\u001b\n]/);
      assert.match(err.message, /harnesses\["x\\u001b\[31m\\nFAKE OK"\] must be an object/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ACCESS_LEVELS, RESERVED_KEYS, accessProblem, claudeRestriction } from "../bin/agent-access.js";
import { parseAgent, claudeAgent, codexAgent, readAgents } from "../bin/cli.js";
import { REPO } from "./helpers/cli-harness.js";

const src = (extra = "") => `---\nname: x\ndescription: "Use for x. Not for y."\ntier: core\nneed: light\n${extra}---\n\nBody\n`;
const agent = (extra) => parseAgent("x.md", src(extra));

test("levels are shared by validator and installer", () => {
  const validate = readFileSync(path.join(REPO, "scripts", "validate.mjs"), "utf8");
  assert.match(validate, /from "\.\.\/bin\/agent-access\.js"/);
  assert.deepEqual(ACCESS_LEVELS, ["read", "inspect", "write-docs", "full"]);
});

test("accepts every level and absent access", () => {
  for (const l of ACCESS_LEVELS) assert.equal(agent(`access: ${l}\n`).access, l);
  assert.equal(agent().access, undefined);
});

test("rejects unknown, malformed and repeated access", () => {
  assert.throws(() => agent("access: readonly\n"), /expected read, inspect, write-docs, full/);
  assert.throws(() => agent("access: Read\n"), /malformed/);
  assert.throws(() => agent("access: [read]\n"), /malformed/);
  assert.throws(() => agent("access: read\naccess: full\n"), /more than once/);
});

test("rejects each reserved key", () => {
  for (const k of RESERVED_KEYS) assert.throws(() => agent(`${k}: Read\n`), new RegExp(`reserved key '${k}'`));
});

test("claude translation per level", () => {
  const read = claudeAgent(agent("access: read\n"));
  assert.match(read, /\ntools: Read, Grep, Glob, Bash, WebSearch, WebFetch, Skill\n/);
  assert.doesNotMatch(read, /Edit|Write|mcp__/);
  assert.match(claudeAgent(agent("access: write-docs\n")), /\ntools: .*Edit, Write\n/);
  const inspect = claudeAgent(agent("access: inspect\n"));
  assert.match(inspect, /\ndisallowedTools: Edit, Write, NotebookEdit\n/);
  assert.doesNotMatch(inspect, /\ntools:/);
  for (const text of [claudeAgent(agent("access: full\n")), claudeAgent(agent())]) {
    assert.doesNotMatch(text, /\n(tools|disallowedTools):/);
  }
});

test("restriction never comes from a key copied from the source", () => {
  const sneaky = { ...agent("access: full\n"), source: src("access: full\ntools: Edit\nmcpServers: x\n") };
  const out = claudeAgent(sneaky);
  assert.doesNotMatch(out, /\ntools:|mcpServers/);
  assert.match(out, /\nname: x\n/);
  assert.match(out, /\ndescription: /);
  const spaced = claudeAgent({ ...sneaky, source: src('access: full\nTools : Edit\n"disallowedTools": Write\n') });
  assert.doesNotMatch(spaced, /Tools|disallowedTools/);
  for (const k of ["Tools: Read\n", "tools : Read\n", '"tools": Read\n']) assert.throws(() => agent(k), /reserved key/);
});

test("other harnesses install unrestricted", () => {
  assert.doesNotMatch(codexAgent(agent("access: read\n")), /tools|access/);
});

test("core roster levels", async () => {
  const by = Object.fromEntries((await readAgents()).map((a) => [a.name, a.access]));
  assert.deepEqual(
    ["archie", "quinn", "scott", "gard", "pixie", "perry", "spencer", "bob", "virgo", "pipe"].map((n) => by[n]),
    ["read", "read", "read", "read", "inspect", "inspect", "write-docs", "full", "full", "full"],
  );
  assert.equal(by.maya, undefined);
  assert.ok(claudeRestriction("read").value.includes("Skill"));
});

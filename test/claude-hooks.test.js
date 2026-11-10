import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateClaudeHooks } from "../bin/claude-hooks.js";

const handler = (command) => ({ type: "command", command });
test("native migration attributes canonical targets, preserving homonyms, wrappers and expansions", () => {
  for (const [platform, root, target, foreign] of [["linux", "/home/user/.claude", "/home/user/.claude/hooks/canonkit-hook.js", "/custom/canonkit-hook.js"], ["win32", "C:\\Users\\User\\.claude", "c:/users/user/.claude/hooks/canonkit-hook.js", "C:/custom/canonkit-hook.js"]]) {
    const ambiguous = [handler(`node "${foreign}"`), handler(`node "${target}" --custom`), handler(`node "${target}"; echo PRIVATE`), handler("node ~/.claude/hooks/canonkit-hook.js"), handler('node "$HOME/.claude/hooks/canonkit-hook.js"'), handler('node "%USERPROFILE%/.claude/hooks/canonkit-hook.js"'), handler("node canonkit-hook.js")];
    ambiguous.push(handler(`node "${root}/../.claude/hooks/canonkit-hook.js"`), handler(`node "${root}/./hooks/canonkit-hook.js"`));
    const data = { env: { PRIVATE: "KEEP" }, hooks: { PreToolUse: [{ matcher: "Read", hooks: [handler(`node "${target}"`), ...ambiguous] }] } };
    const result = migrateClaudeHooks(data, root, platform);
    assert.equal(result.removed.length, 1);
    assert.equal(result.ambiguous.length, ambiguous.length);
    assert.deepEqual(result.data.hooks.PreToolUse[0], { matcher: "Read", hooks: ambiguous });
    assert.deepEqual(result.data.env, data.env);
    assert.equal(data.hooks.PreToolUse[0].hooks.length, ambiguous.length + 1);
  }
});

test("migration handles both legacy names, metadata-only groups, unrelated empty groups and malformed shapes", () => {
  const ours = handler('node "/home/user/.claude/hooks/meu-time-hook.js"');
  const data = { hooks: { Stop: [{ matcher: "*", custom: "retain", hooks: [ours] }], PreToolUse: [{ matcher: "Read", hooks: [] }], EmptyEvent: [], PostToolUse: [{ hooks: [ours] }] } };
  const result = migrateClaudeHooks(data, "/home/user/.claude", "linux");
  assert.equal(result.removed.length, 2);
  assert.deepEqual(result.data, { hooks: { Stop: [{ matcher: "*", custom: "retain", hooks: [] }], PreToolUse: [{ matcher: "Read", hooks: [] }], EmptyEvent: [] } });
  assert.deepEqual(migrateClaudeHooks(result.data, "/home/user/.claude", "linux").removed, []);
  for (const hooks of [[], { Stop: "PRIVATE" }, { Stop: [{}] }, { Stop: [{ hooks: ["PRIVATE"] }] }]) assert.throws(() => migrateClaudeHooks({ hooks }, "/home/user/.claude", "linux"), error => !error.message.includes("PRIVATE"));
  assert.throws(() => migrateClaudeHooks({}, "relative"), /absolute/);
});

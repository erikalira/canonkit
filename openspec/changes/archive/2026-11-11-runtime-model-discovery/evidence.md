# Evidence

## Claude Code agent frontmatter: `model` and `effort` (task 6.2, part of 9.2)

Checked 2026-11-10 with Claude Code 2.1.322, in a throwaway Git repository holding one
project agent, `.claude/agents/probe.md`. The frontmatter was written in the exact form
`claudeAgent` generates: canonkit's own fields (`tier`, `need`) kept, and values
JSON-quoted (`model: "sonnet"`).

Documentation: in <https://code.claude.com/docs/en/sub-agents>, the "Frontmatter
reference" table (linked as `#supported-frontmatter-fields`) lists `model` ("`sonnet`,
`opus`, `haiku`, `fable`, a full model ID … or `inherit`") and `effort` ("Effort level
when this subagent is active. … Options: `low`, `medium`, `high`, `xhigh`, `max`;
available levels depend on the model"). The page also says Claude Code ignores
unrecognized fields without an error, so `tier` and `need` are harmless. On the Agent
tool, the per-call `model` parameter takes an alias only, not a full ID or `inherit`.

| Run | Frontmatter | How started | Observed (`stream-json`) |
|---|---|---|---|
| control | no `model`/`effort` | `claude -p --agent probe` | session `claude-opus-5-5` (the default here) |
| 1 | `model: "sonnet"`, `effort: "low"` | `claude -p --agent probe` | session `claude-sonnet-5-5`, answered |
| 2 | `model: "sonnet"`, `effort: "low"` | Agent tool, no parameters | `resolvedModel: claude-sonnet-5-5` |
| 3 | `model: "sonnet"`, `effort: "low"` | Agent tool with `model: "opus"` | `resolvedModel: claude-opus-5-5` (the parameter wins) |
| 4 | `model: "sonnet"`, `effort: "bogus"` | Agent tool, no parameters | ran on sonnet; no error or warning |

Conclusions:

- `model`, quoted and next to unknown fields, is honored when the agent runs as the main
  agent and when it is dispatched, and a dispatch's `model` parameter overrides it.
  Verified.
- `effort` is documented, but none of these runs shows whether it took effect. No
  output field reports the subagent's effort, and an invalid value is accepted without a
  message. It is documented but not behaviorally verified.

Decision (2026-11-10, the user): keep `effort` in the generated frontmatter on the
strength of the documentation. If the field is ignored, the dispatch's `effort`
parameter still carries the choice.

## Real dispatch with the value from `models show` (task 9.2)

Checked 2026-11-10 with Claude Code 2.1.322, in a throwaway Git repository. canonkit
ran with a temporary HOME; Claude Code used the real one.

1. Project `.canonkit/models.json` set `standard` to `sonnet`, then `canonkit add maya`
   wrote `model: "sonnet"` into `.claude/agents/maya.md`.
2. The project file was changed to `standard` → `fable`, without reinstalling, so the
   frontmatter and the configuration disagree.
3. `canonkit models show --json --claude` returned `harnesses.claude.agents.maya.model.value`
   = `fable`.
4. `claude -p` dispatched `maya` with the Agent tool, passing `model: "fable"` and no
   effort. Tool call: `{"subagent_type":"maya","model":"fable",...}`; result
   `status: completed`, `resolvedModel: claude-fable-5-2`, answer `DISPATCH-OK`.

The subagent ran on the model from `models show`, not on its frontmatter. This is the
route by which a project's choices reach user-level agents.

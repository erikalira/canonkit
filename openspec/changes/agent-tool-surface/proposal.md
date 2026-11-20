# Proposal

## Why

`docs/plans/agent-tool-surface-handoff.md` (baseline from 34 dispatches with `agent_end`, 2026-11-18) shows the first API call of an allowlist agent (`read`, `write-docs`) at about 24-28k tokens of context, and of every agent with no real restriction at about 42-44k: Bob 44.0k, Pipe 43.5k, Perry 43.6k, Pixie 41.6k. The roughly 16k gap is the tool definitions those agents carry. `full` (Bob, Pipe, Virgo) restricts nothing, and the `inspect` denylist (Edit, Write, NotebookEdit) barely moves the number. Most of what is left is tools a subagent should not use anyway: coordinating other agents, publishing artifacts, scheduling, notifying, the Claude Docs connector.

Separately, allowlist agents always carry `Skill`, though measured use shows no reviewer called it, and most never cite a skill.

## What Changes

- New access level `build` (Bob, Pipe, Virgo): everything except coordinating other agents, interacting with the user, scheduling and publishing. In Claude Code it is a `disallowedTools` list of exact built-in names plus the Claude Docs MCP server prefix. `full` keeps its meaning, no restriction, as the explicit opt-out.
- `inspect` (Perry, Pixie) becomes that same denylist plus Edit, Write, NotebookEdit, built from one shared constant so the two cannot drift. MCP tools other than Claude Docs, SubagentHandback, ToolSearch, Monitor and TaskStop stay.
- `Skill` is kept in the `read` and `write-docs` allowlists only when the agent body cites a skill (a backticked kebab-case name followed by the word "skill"). One shared detector serves the installer and `models show`; `models show` prints whether `Skill` is kept and which citation kept it. The convention is documented in `docs/install.md`.
- Agent sources `bob`, `pipe`, `virgo` declare `access: build`.
- Other harnesses are unchanged ("not translated for this harness").
- A blocking check, before the denylist constant is final: an unknown tool name in `disallowedTools` is ignored by Claude Code in foreground and background.
- A measurement gate: no token gain is claimed until measured after install.

Out of scope: redefining `full`; denying `Skill` to `build` and `inspect` (follow-up only if measured at about 1k or more); wildcard tool names; new frontmatter keys (`tools`, `disallowedTools`, `skills`) in sources; denying SubagentHandback, ToolSearch or MCP in general; Codex, OpenCode and Copilot translations.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent-tool-access`: adds the `build` level; restates `inspect`; changes the Claude Code translation to denylists that keep MCP and report delivery; defines "cites a skill" and ties `Skill` to it on allowlist levels; `models show` reports why `Skill` is kept.

## Impact

`bin/agent-access.js` (levels, shared denylist, citation detector), `bin/cli.js` (`models show` output), validation and tests, `agents/bob.md`, `agents/pipe.md`, `agents/virgo.md`, `docs/install.md`, `reference/agents-block.md` (access table), the next `docs/release-notes/X.Y.Z.md`.

Compatibility: a source declaring `access: build` fails validation on an older canonkit (unknown level); the release notes say so. Installs by older canonkit of unchanged sources are unaffected.

Risks: the gain is likely well below the measured ~16k, because `build` and `inspect` keep MCP tools and the harness already strips some of the denied tools from subagents. A connector rename (the Claude Docs prefix) silently stops matching; the signal is `first_call.context` rising for `build`/`inspect` agents.

## Acceptance criteria

1. `ACCESS_LEVELS` contains `build`; a source with `access: build` validates, and `access: biuld` fails listing `read, inspect, write-docs, full, build`.
2. For Claude Code, `claudeRestriction("build")` is a `disallowedTools` value naming exactly the exact-name entries of the shared constant (including `Agent`, `SendMessage`, `Artifact`, the Cron and PushNotification names read from a live tool list, and the prefix `mcp__claude_ai_Claude_Docs`), with no `*` and none of `SubagentHandback`, `ToolSearch`, `Monitor`, `TaskStop`, `Edit`, `Write`, `NotebookEdit`.
3. `claudeRestriction("inspect")` equals the `build` list plus `Edit`, `Write`, `NotebookEdit`, derived from the same constant (a test fails if either list is edited independently).
4. `claudeRestriction("full")` is null; `read` and `write-docs` keep their current allowlists except for `Skill` (criterion 5); other harnesses report "not translated for this harness".
5. `Skill` is in the `read`/`write-docs` allowlist if and only if the agent body cites a skill. Tested against real sources: Quinn, Bob and Virgo are detected; Archie, Gard, Scott and Spencer are not. The installer and `models show` call the same detector.
6. `canonkit models show` prints, for allowlist agents, whether `Skill` is kept and the citation that kept it, and prints no token figures.
7. `agents/bob.md`, `agents/pipe.md`, `agents/virgo.md` declare `access: build`; no source carries `tools`, `disallowedTools` or `skills`.
8. The bogus-name check is recorded in `tasks.md` with its outcome before the constant is finalized: an unknown name in `disallowedTools` leaves the agent launching in foreground and in background, or the denylist is trimmed to tools the harness does not already filter.
9. `docs/install.md` documents `build`, the citation convention and the access table; `reference/agents-block.md` access table and the next release notes (including the older-canonkit validation note) are updated.
10. Measurement gate: after install, in a new session, one trivial dispatch per affected agent; `first_call.context` is compared with the handoff baseline table. No gain is claimed without it; if removing `Skill` saves less than about 1k, that part is reverted.

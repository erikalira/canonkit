# Design

## Evidence

Baseline `first_call.context` from 34 dispatches (`docs/plans/agent-tool-surface-handoff.md`): allowlist agents 24-28k; `full`, `inspect` and specialists without `access` 42-44k. Tool use measured across those dispatches: Bob used Edit, Bash, Read, Write, ToolSearch and chrome-devtools (MCP); Perry used chrome-devtools, Bash, ToolSearch, Read; no reviewer called `Skill`, `Grep` or `Glob`. All subagent cache writes were `ephemeral_5m`.

The harness already strips `AskUserQuestion`, `EnterPlanMode`, `ExitPlanMode` and `ScheduleWakeup` from subagents; in a background dispatch, only `Artifact`, `SendMessage` and the Claude Docs MCP are effectively removed. So part of any denylist is redundant with the harness, and the realistic gain is below the ~16k gap.

## Decisions

**New level `build`; `full` is not redefined (Archie, approve with conditions, no veto).** Redefining `full` as "everything except coordination" would silently strip `Agent` and `SendMessage` from third-party sources that declare `full` for exactly the opposite reason. `full` stays "no restriction", the explicit opt-out; `build` is a new name, so an older canonkit rejects it loudly (unknown level) instead of mis-installing it. Bob, Pipe and Virgo move to `build`. This records the full-versus-build decision; there is no separate ADR.

**Vendor-neutral definition by capability.** `build` means everything except coordinating other agents, interacting with the user, scheduling and publishing. The Claude tool list is only the Claude Code translation. Codex, OpenCode and Copilot are unchanged ("not translated for this harness").

**`inspect` shares the denylist.** `inspect` = the `build` denylist plus `Edit`, `Write`, `NotebookEdit`, composed from one exported constant, so a name added to coordination reaches both levels.

**Exact built-in names, no wildcards.** Wildcards such as `Artifact*` or `Cron*` are undocumented behavior and could match tools added later. The list holds `Agent`, `SendMessage`, `Artifact`, the Cron and PushNotification names (read from a live session's tool list before writing the constant), and the server prefix `mcp__claude_ai_Claude_Docs`. Kept deliberately: `SubagentHandback` (report delivery), `ToolSearch` (loads deferred MCP schemas), `Monitor`, `TaskStop`, and all other MCP tools (Bob and Perry use chrome-devtools).

**Blocking check on unknown names.** The constant lists names that may not exist in every Claude Code version or mode. Before finalizing it, install an agent with one bogus name in `disallowedTools` and dispatch once in foreground and once in background. If the agent does not launch, trim the denylist to the tools the harness does not already filter (`Agent`, `SendMessage`, `Artifact`, Claude Docs).

**`Skill` derived from citation, allowlist levels only.** `read` and `write-docs` are allowlists, so `Skill` costs context only if listed. The shared detector matches a backticked kebab-case name followed by the word "skill" (for example the `orchestrate` skill), not limited to the kit's `skills/` list, so project skills count. Used by the installer and by `models show` (which prints whether `Skill` is kept and the citation that kept it) so the two cannot disagree. Expected on current sources: Quinn, Bob, Virgo detected; Archie, Gard, Scott, Spencer not. Rejected: a `skills` key in sources (reserved by the spec). Denying `Skill` to `build` and `inspect` is out of scope; a follow-up only if measured at about 1k or more.

**Detector false negatives are a quiet failure.** An agent that uses a skill without phrasing the citation this way loses `Skill`. Mitigation: the convention is documented in `docs/install.md`, and `models show` makes the decision visible.

## Risks and open items

- Gain likely well below ~16k: `build` and `inspect` keep MCP, and the harness already filters much. The measurement gate decides what is claimed.
- A connector rename silently stops matching the Claude Docs prefix. Signal: `first_call.context` rising for `build`/`inspect` agents after a Claude Code update.
- A source declaring `build` fails validation on older canonkit; CHANGELOG says so.
- The spec Purpose says "every other agent keeps its current behavior"; it becomes stale (see the conflicts reported with this change) and is corrected at sync, not by a delta requirement.

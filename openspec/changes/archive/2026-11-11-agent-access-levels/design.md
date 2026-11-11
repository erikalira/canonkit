# Design

## Context

See proposal.md - Why. Agent sources in `agents/*.md` carry `name`, `description`, `tier`, `need`. The installer adds `model` and `effort` per the `model-selection` spec. Nothing declares tools. Claude Code frontmatter supports `tools:` (an allowlist); Codex agents use a different mechanism (sandbox and approval modes), and canonkit must not name vendor features in agent sources.

Size of the effect: unmeasured. The measurement matrix (tasks 1.1-1.5) was skipped by decision on 2026-11-11; levels and forms were chosen without it. Accepted risk: a level may save less than expected, or may remove a tool a reviewer needs. `canonkit models show` and the re-measurement recipe in docs/install.md let anyone verify afterwards. Task 4.2 (2026-11-11) confirmed background delivery of every restricted agent's report.

Single uncontrolled observation, same day, one trivial read-only task per agent, tokens as shown by the Claude Code agent map (not a measured matrix): `read` agents and spencer 26-31k; `inspect` (pixie, perry) 78-79k; virgo, a `full` agent, 78k. Read as: `read` agents started about 48k tokens lower, consistent with dropping MCP schemas and other unlisted tools (cause not isolated, agent prompts also differ in size); `inspect` showed no difference in this run, consistent with keeping MCP, so its value is withholding Edit, Write and NotebookEdit. `MultiEdit` did not appear in any `inspect` agent's tool list, so it needs no entry. One run per agent, no repeats, no foreground comparison: a hypothesis to re-check with the recipe in docs/install.md, not a guarantee.

Claude Code frontmatter (code.claude.com/docs/en/sub-agents, "Frontmatter reference", read 2026-11-11) relevant here:
- `tools` is an allowlist; omitted means inherit everything. An allowlist leaves the subagent without any MCP tool unless `mcp__<server>__*` is listed.
- `disallowedTools` is a denylist applied before `tools` (`mcp__*` withholds every MCP tool; `Write, Edit` removes writing tools; the shipped `inspect` also denies NotebookEdit).
- `omitClaudeMd: true` (v2.1.271) starts without the CLAUDE.md/AGENTS.md hierarchy.
- `skills` preloads skill content; it does not control access, and an allowlist without `Skill` removes the Skill tool.
- `mcpServers` defines servers scoped to one subagent (ignored for plugin agents).
- `maxTurns` caps agentic turns; `experimental.cacheTtl: 1h` (v2.1.248) lengthens the prompt-cache lifetime for that subagent.
- Unknown frontmatter fields are ignored without error.

## Goals / Non-Goals

**Goals:**
- Expose fewer tools to reviewers and advisors, aiming to reduce start-up context (not measured) without changing review quality.
- Keep agent sources vendor-neutral and backward compatible.
- Make the saving measurable after install.

**Non-Goals:**
- A security boundary. Bash can write files, so `read` limits exposed tool schemas, not capability.
- Translating `access` for Codex or other harnesses in this change.
- Changing model, effort or `need` semantics.
- Reworking when agents are dispatched (agent vs skill, consolidating reviews); that is a separate follow-up.

## Decisions

1. **A neutral `access` level instead of a literal `tools:` list.**
   Mirrors `need`: sources state demand, each harness maps it. A literal `tools:` would leak Claude Code tool names into sources shared with other harnesses. Alternative rejected: per-harness frontmatter blocks, which duplicate every agent.

2. **Four levels: `read`, `inspect`, `write-docs`, `full`.**
   - `read` -> allowlist: Read, Grep, Glob, Bash (kept so quinn can run tests and reviewers can run `git diff`), WebSearch and WebFetch (the team rule that platform capability is checked, not answered from memory), `Skill` (cited skills such as `orchestrate`). The report is the subagent's final message; no peer-messaging tool (`SendMessage`) is exposed. No MCP.
   - `inspect` -> denylist: everything except Edit and Write, MCP tools included (pixie, perry).
   - `write-docs` -> `read` plus Edit and Write (spencer).
   - `full` -> no restriction; inherits everything.
   Alternatives: only `read` and `full`, rejected because spencer and the MCP-using reviewers would keep the whole schema cost. A single neutral flag instead of levels may be better if the matrix shows nearly all the saving is MCP schemas; the set was not revised because the matrix was skipped.

3. **Absent `access` means inherit everything.**
   Existing agents, project specialists and third-party agents behave as before. Opt-in per agent, so the rollout can be reviewed one agent at a time.

4. **No MCP naming in agent sources; browser-evidence agents use `inspect`.**
   A `tools:` allowlist drops every MCP tool. Naming a server in a source (`chrome-devtools`) is not neutral and fails in practice: the tool names depend on how the server was installed (this environment exposes `mcp__plugin_chrome-devtools-mcp_chrome-devtools__*`), so pixie and perry would silently lose browser evidence. Instead they get `inspect`, a denylist of Edit and Write that keeps every MCP tool whatever its name. Rejected: a per-agent MCP list in the source (naming problem, and the source parser reads only single-line `key: value`, so a YAML list would parse as empty without an error) and a neutral capability resolved at install (more machinery than the problem needs). Task 1.3a verifies the denylist keeps plugin-installed MCP tools.

   Sources also may not carry the harness's own restriction keys (`tools`, `disallowedTools`, `skills`, `mcpServers`, `omitClaudeMd`): the Claude Code installer copies source frontmatter into the generated agent, so such a key would become active. Validation rejects them; the restriction comes only from the translation of `access`.

5. **Claude Code is the only translation in scope, and may emit either form.**
   The installer writes `tools:` (allowlist) or `disallowedTools:` (denylist) into the generated agent, whichever is simpler for that level (not measured): `read` and `write-docs` an allowlist, `inspect` a denylist. Agent files are regenerated whole on every install, so removing `access` later leaves no stale restriction. Other harnesses ignore `access` and the docs state the gap. Avoids inventing an unverified equivalence, the same stance `model-selection` takes ("no shipped cross-vendor equivalence").

6. **Measure before choosing levers: a one-variable-at-a-time matrix on a real quinn.**
   Variants: baseline; `tools` allowlist; `disallowedTools: Write, Edit`; `disallowedTools: mcp__*`; combinations. `omitClaudeMd` is not a variant to ship (decision 7). Same trivial task, model and effort, in both background and foreground. Foreground matters because the harness removes most built-in tools from a background subagent even when `tools` lists them, while it keeps every MCP tool; a result measured only in background would not transfer. The matrix was skipped; the levers were chosen without it. Also checks, with an allowlist, whether `Skill`, `SendMessage` and the background hand-back tool remain available, whether `WebSearch` and `WebFetch` work, and whether the reviewer can still reach the `orchestrate` skill it cites. The matrix may revise the spec as well as this design: if almost all the saving is MCP schemas, one neutral flag would beat four levels.

7. **AGENTS.md stays the single source of instructions: `omitClaudeMd` is not used for core agents.**
   A subagent inherits the whole CLAUDE.md/AGENTS.md hierarchy (about 5.5k tokens here: ~/AGENTS.md 4.6k, project AGENTS.md 0.45k, ~/.claude/CLAUDE.md 0.43k). The documentation lists "any AGENTS.md files loaded as project instructions" among the files `omitClaudeMd: true` omits. This project keeps instructions only in AGENTS.md, with no project CLAUDE.md, to avoid conflicting or duplicated instructions, so core agents must keep receiving it. Rejected: `omitClaudeMd`, and copying the essential rules into agent bodies (duplication). Any saving on this part comes from making AGENTS.md itself smaller, which is a separate change. The matrix only verifies that AGENTS.md is still received by every variant that ships. `skills` preloading is used only where an agent always needs the same skill. The Skill tool still discovers installed skills (such as `orchestrate`) as long as `Skill` stays in the allowlist; parent-invoked skills are never inherited.

8. **Show the effective restriction; document a re-measurement recipe; no stored token estimate.**
   `canonkit models show` prints each agent's level and the restriction it resolves to (stored data only, starts no agent). Static per-tool token figures cannot see a harness change to the tool set, which was the reason to want an estimate, so none is printed. A documented recipe (same trivial task with and without the restriction, foreground and background) lets anyone re-measure. Alternative rejected: a stored estimate command, which would claim a precision it cannot observe.

## Risks / Trade-offs

- [A reviewer loses a tool it legitimately needed] -> Start with the reviewers that only read; keep Bash; allow explicit extra tools; validate against one real review before widening.
- [`read` is mistaken for a security control] -> State it in the agent docs and in the validation message; do not describe it as sandboxing.
- [An allowlist removes `Skill`, the background hand-back tool or the web tools, and the reviewer can no longer follow a skill it cites, report back or verify a platform capability] -> The matrix checks each; the `read` definition lists them explicitly.
- [Accepted levels drift between `bin/cli.js` and `scripts/validate.mjs`] -> One shared definition and a test that both read it.
- [A source frontmatter key (`tools`, `skills`...) is copied into the generated agent and becomes active] -> Validation rejects reserved keys; a test covers a source that bypasses validation.
- [A restriction or a harness change stops a restricted agent from receiving AGENTS.md] -> The matrix and the real reviews verify AGENTS.md is still received; `omitClaudeMd` is not used.
- [Harness changes what `tools:` does or how deferred tools count] -> The re-measurement recipe makes a regression visible; the level stays harness-neutral so only the translation changes.
- [Per-agent quality drifts silently] -> Compare verdicts of a restricted and an unrestricted reviewer on the same diff before and after, per the team's evidence rule.
- [Public contract change] -> HIGH: Archie owns the frontmatter contract; an independent review runs after the last edit.

## Resolved

- Project specialists (maya, nova, echo, dana, iris) stay on inherit until their owners opt in (spec: absent access preserves behavior).
- The cost view lives in `canonkit models show` and prints no token figures (decision 8).
- The `.local.bak` files in `~/.claude/agents` are leftovers of an older copy path; Claude Code does not load them and nothing here reads them.
- The managed AGENTS.md block is edited at its canonkit source (`reference/agents-block.md`), never in `~/AGENTS.md` (task 4.3).

## Open Questions

- Whether `maxTurns` (cap on a review's agentic turns) and `experimental.cacheTtl: 1h` are worth shipping per agent after the matrix. Each non-fork subagent has its own prompt cache, so every dispatch starts cold; the 1h TTL only helps when the same agent is dispatched again (such as a second Archie review).
- A fork is not an option for reviewers: it inherits the parent's whole conversation and cache, which costs far more volume and removes the clean, independent context that the HIGH-risk review rule relies on.
- Whether chrome-devtools moves from the main session to inline `mcpServers` on pixie and perry only. It would also cut the main session's ~14k MCP tools, but removes the browser tools from the main conversation, so it needs its own decision.

# Tasks

## 1. Measure before building

> Skipped by decision on 2026-11-11 (user: apply without the matrix). Levels shipped unmeasured; see design Context.

- [ ] 1.1 Create throwaway quinn variants outside the repository (baseline, `tools` allowlist, `disallowedTools: Write, Edit`, `disallowedTools: mcp__*`, and combinations) and verify each variant loads with `claude --debug` showing no "does not recognize or apply" line for it
- [ ] 1.2 Run each variant on the same trivial task, model and effort, in foreground and in background, and verify a table of cold-start tokens per variant is saved under `docs/plans/` or the change folder
- [ ] 1.2a In the baseline and in each variant that may ship, ask the subagent to list which instruction files it received (`~/AGENTS.md`, project AGENTS.md) and verify every shipping variant still receives them
- [ ] 1.3 With the allowlist variant, verify that `Skill` can still invoke `orchestrate`, that the report reaches the caller in foreground and in background (including the background hand-back tool), and that `WebSearch` and `WebFetch` work; record which tools must be added to the `read` level
- [ ] 1.3a Verify the `disallowedTools: Write, Edit` variant keeps MCP tools installed through a plugin (such as `mcp__plugin_chrome-devtools-mcp_chrome-devtools__*`) as well as through `.mcp.json`
- [ ] 1.4 Run one restricted and one unrestricted quinn on the same small real diff and verify their verdicts are comparable (same blockers, same approve/block); record the comparison
- [ ] 1.5 Decide from the table which levers and levels ship (allowlist, denylist; four levels or fewer, for example one neutral flag if the saving is almost all MCP schemas) and update design.md and the spec to match; verify neither contains an unmeasured claim about saved tokens

## 2. Source format and validation

- [x] 2.1 Add `access` to the agent frontmatter contract and its documentation, and verify the agent-authoring docs describe the levels, the single-line format and the "not a security boundary" note
- [x] 2.2 Define the accepted levels once and share them between `bin/cli.js` and `scripts/validate.mjs`, and verify with a test that both read the same list
- [x] 2.3 Teach `scripts/validate.mjs` to accept the shipped levels, to reject any other value, to reject a malformed `access` line (list, several lines, wrong case) and to reject the reserved keys `tools`, `disallowedTools`, `skills`, `mcpServers` and `omitClaudeMd`, and verify with one test per case
- [x] 2.4 Verify an agent source with no `access` still validates and installs unchanged (regression test over the existing 15 agents and the legacy stack-pack fixtures)

## 3. Claude Code translation

- [x] 3.1 Translate each level into the generated agent's tool restriction in the Claude Code install path (`bin/cli.js`), using the forms in design decision 5, and verify with tests that `read` produces no edit, write or MCP tool, `inspect` withholds only edit and write, and `full` produces no restriction
- [x] 3.2 Verify the generated agent's restriction comes only from the translation and never from a key copied out of the source (test with a source carrying a reserved key bypassing validation)
- [x] 3.3 Keep reporting, skill invocation and web tools in the restricted levels, and verify with a test that a generated `read` agent still lists them
- [x] 3.4 Verify installing for a harness without a translation succeeds and produces an unrestricted agent (Codex install test)
- [x] 3.5 Document which harnesses translate `access` in the install docs and verify the documented command output matches a real install in a temporary directory

## 4. Assign levels to the core team

- [x] 4.1 Set `access: read` on archie, quinn, scott and gard, `inspect` on pixie and perry, `write-docs` on spencer, and `full` on bob, virgo and pipe, and verify `scripts/check-roster.mjs` and validation pass
- [x] 4.2 Run one real review per restricted agent on a small diff and verify none reports a missing tool; run at least one in the background and record the result — 2026-11-11, fresh session after `npx canonkit install --claude`, one small read-only review per agent, all reports delivered via the background hand-back. Observed tools: `read` (quinn, archie, scott, gard) = Read, Grep, Glob, Bash, WebSearch, WebFetch, Skill (+ hand-back), no Edit/Write/Agent/MCP; `inspect` (pixie, perry) = no Edit/Write, MCP (chrome-devtools, Claude Docs, vscode) kept; `write-docs` (spencer) = read set + Edit/Write, no MCP. No agent reported a missing tool; every agent received `~/AGENTS.md` and the project AGENTS.md. Caveat: the harness started every dispatch in the background even with `run_in_background: false`, so no true foreground run was observed. Follow-up applied the same day: `inspect` denylist now includes NotebookEdit (Agent and SendMessage stay available by design); `models show` says access is not translated for harnesses without applied choices; the proposal names the 5 specialists. Start-up cost observed (agent map, one run each): `read` 26-31k, `inspect` 78-79k, `full` (virgo) 78k; recorded in design Context as an uncontrolled observation. Open, not blocking: extra tests suggested by quinn (`access:read` without space, uppercase key, `describeRestriction`, end-to-end validator on a bad fixture), un-exporting `reservedKeyOf` if nothing outside imports it.
- [x] 4.3 Update the canonkit source of the managed AGENTS.md block (`reference/agents-block.md`) and the `orchestrate` skill where they describe agent capabilities or dispatch briefs, proposing the text to the user before applying it, and verify no instruction still implies every agent has all tools

## 5. Show and re-measurement recipe

- [x] 5.1 Make `canonkit models show` print the declared level and the effective restriction per agent, and verify with a test that it starts no agent or harness program and prints no token count
- [x] 5.2 Document the re-measurement recipe (same trivial task, with and without the restriction, foreground and background) in the install docs, and verify a reader can follow it with the commands written there

## 6. Integration and review

- [x] 6.1 Run the full validation and test suite after the last edit and verify it passes
- [x] 6.2 Obtain an independent Archie review of the public contract after the last edit (HIGH change), and record the verdict in the change — Archie: approve with conditions (spec/design unmeasured claims rewritten, SendMessage dropped from `read`, tests tightened, reserved keys case-insensitive); background delivery of restricted reports stays an accepted risk until 4.2
- [x] 6.3 Verify `openspec validate agent-access-levels --strict` passes and the docs impact (agent-authoring, install, ADR if one is warranted) is covered

## Workflow follow-up

- Archive the change after the review requirements are satisfied.
- Verify the archived main spec contains `agent-tool-access`.
- Decide separately whether `maxTurns`, `experimental.cacheTtl` and moving chrome-devtools to inline `mcpServers` become their own changes.

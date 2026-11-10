# Tasks

## 1. Start clean from the superseded edits

- [x] 1.1 Branch from updated local `main` (no remote-tracking upstream), then restore the superseded working-tree edits in `bin/cli.js`, `skills/orchestrate/SKILL.md`, `reference/agents-block.md`, `reference/codex-block.md`, `docs/install.md`, `README.md`, `test/cli.test.js` and `docs/release-notes/3.0.0.md` to `HEAD`; verify `git status -sb` shows only this change's `openspec/` folder and `npm test` passes on the baseline.

## 2. Need levels in agent sources

- [x] 2.1 Replace `model:` with `need:` in all 15 `agents/*.md` (`archie`, `iris` → `deep`; others → `standard`); verify no agent contains `^model:` and every agent has `^need:`.
- [x] 2.2 Update `readAgents` to require `need ∈ {light, standard, deep}` and reject `model:` with a message naming `need:`; update `canonkit list`; verify unit tests for valid, missing, unknown and legacy-`model` frontmatter.
- [x] 2.3 Update `scripts/validate.mjs` and `scripts/validate-python.py` to the same rule; verify the validate script passes and fails on a fixture with `model: opus`.
- [x] 2.4 Remove `CODEX_EFFORTS`, `codexModelOverride` and their export; make `codexAgent`, `opencodeAgent`, `copilotAgent` emit no model or effort; warn once when `CANONKIT_CODEX_MODEL` is set; verify updated generator tests assert no `model`/effort lines and the warning text.

## 3. Discovery

- [x] 3.1 Create `bin/model-discovery.js` with the adapter interface, injected runner (`execFile`, no shell, 30 s timeout, closed stdin, capped buffer) and catalog writer for `~/.canonkit/model-catalog.json`; verify tests for timeout, non-zero exit and missing binary → `unknown` with reason.
- [x] 3.2 Implement the Claude adapter over `claude --help` (aliases from `--model`, efforts from `--effort`, `confidence: "help-text"`); store a fixture captured from this machine; verify parsing tests and that altered help text yields `unknown`, not a crash.
- [x] 3.3 Add Codex, OpenCode and Copilot adapters returning `unknown: not yet supported` without spawning; verify the runner stub records zero calls for them.

## 4. Choices: storage and resolution

- [x] 4.1 Implement read/write for `~/.canonkit/models.json` and `<project>/.canonkit/models.json` (version 1, unknown keys preserved, unknown version refused); verify round-trip and refusal tests.
- [x] 4.2 Implement field-wise resolution (project agent → project level → user agent → user level → inherit) with per-field source; verify a table-driven test covering each layer, effort-only project override, and all-inherit.

## 5. Commands

- [x] 5.1 Add `canonkit models refresh`; verify a stubbed-adapter test writes the catalog with Claude discovered and others unknown, exit 0.
- [x] 5.2 Add `canonkit models show [--json]` reading files only (project-aware from cwd); verify text and JSON shape tests, source labels including `agent override`, and zero spawned processes.
- [x] 5.3 Add `canonkit models setup [--project]` for Claude Code: levels first, optional per-agent overrides, effort validated against the catalog, free text recorded `unverified`, non-TTY refusal; verify scripted-stdin tests for each path.
- [x] 5.4 Update `usage()` and argument validation in `main`; verify the usage test and the unknown-subcommand error.

## 6. Claude Code application

- [x] 6.1 Switch Claude agents from copy to generation (body unchanged; frontmatter with resolved `model:` when set, serialized safely); keep manifest tracking; verify install tests: no config → no `model:`; configured → exact value; removed config → value gone on reinstall; body byte-identical to source.
- [x] 6.2 Check current Claude Code docs for an agent-frontmatter effort field; if verified, add it to `HONORED_FIELDS` with source/date and a test; otherwise leave it omitted and note why in the constant's comment.
- [x] 6.3 Wire non-dry-run `install` to refresh discovery for selected targets before writing, and `add` to use project-merged choices for `.claude/agents` specialists; verify tests: dry run spawns nothing, user-level agents ignore project config, project specialists honor it.

## 7. Doctor

- [x] 7.1 Add doctor checks over stored files only: missing/stale (>30 days) catalog, configured Claude model or effort absent from catalog, `unverified` choices — all WARN naming level/agents and "falls back to inherit"; verify tests for each case, unchanged exit status, zero spawned processes.

## 8. Guidance and documentation

- [x] 8.1 Rewrite `## Naming the model and effort` in `skills/orchestrate/SKILL.md`: in Claude Code, read `canonkit models show --json` and pass the agent's `model` and `effort` as Agent tool parameters, omit inherit; keep the up/down rationale; no vendor names; other harnesses inherit for now; verify `scripts/validate-python.py` heading check passes.
- [x] 8.2 Update the dispatch line in `reference/agents-block.md` keeping the phrase "names its model and effort" (locked by `scripts/validate-python.py` and `test/cli.test.js:697`); update the model bullet in `reference/codex-block.md` to "inherits the session model until model selection supports Codex"; verify validators and the block test pass.
- [x] 8.3 Rewrite the model section of `docs/install.md` (refresh, setup, show, config files, resolution order, Claude dispatch parameters, other harnesses inherit) and the README paragraph; verify each documented command runs as written against a temp HOME.
- [x] 8.4 Add `docs/adr/0006-runtime-model-discovery.md` (drop cross-vendor equivalence; dispatch parameter over project shadow copies; Claude-first); verify it follows the existing ADR format.
- [x] 8.5 Update `docs/release-notes/3.0.0.md`: BREAKING `model:` → `need:` mapping, `CANONKIT_CODEX_MODEL` removal and Codex effort fallback loss, new `models` commands, reinstall step; verify links resolve.

## 9. Integration and review

- [x] 9.1 End-to-end with a temp HOME and a temp project: `models refresh` → `models setup` (scripted, plus a project override) → `install --claude` → `models show --json` in and out of the project → `doctor`; verify generated frontmatter and show output match; then remove a model from the catalog and verify the doctor warning.
- [x] 9.2 Real dispatch check in Claude Code: dispatch one agent with the `model` parameter from `models show` and confirm the subagent ran on that model; record the evidence in this change.
- [x] 9.3 Run `npm test`, the validators and `graphify update .`; verify all pass.
- [x] 9.4 Independent review after the last edit: Archie (frontmatter field, config schemas, `models` command surface) and Gard (subprocess execution, project-config trust, no credential reads); record findings and resolutions here before closing.

### 9.4 Review record (2026-11-10)

First round, both "approve with conditions", no veto or block:

| Reviewer | Finding | Resolution |
|---|---|---|
| Archie | MEDIUM: "project" meant three things (cwd for `setup --project`/`add`, nearest ancestor for `show`/doctor) | `projectRoot` = repository root ?? cwd, never home; used by all four (`model-config.js`) |
| Archie | MEDIUM: skill read `unverified` as "full model ID" | `show --json` emits `model.alias`; the skill passes `model` only when it is `true` |
| Archie | LOW: no `version` in `show --json` | `"version": 1`; docs say `source` is display text |
| Archie | LOW: `HONORED_FIELDS` and `APPLIED` encoded one fact twice | `HONORED_FIELDS` moved to `model-config.js`, `APPLIED` derived from it |
| Archie | LOW: no version rule | ADR 0006 decision 5 |
| Archie | LOW: `LOADER_ENV` duplicated | exported once from `security.js` |
| Gard | MEDIUM: a cloned repo's project file can weaken reviewers or raise effort | doctor WARN listing every override of the user's choices; skill makes the lead name project-sourced values and tell the person before weakening a veto-holding reviewer |
| Gard | LOW-MEDIUM: `setup --project` followed a symlinked file or `.canonkit` folder | project reads/writes refuse links (tested with a real junction); user file may still be a link |
| Gard | LOW: unescaped keys in errors | keys `JSON.stringify`-escaped |
| Gard | LOW: project-root walk unbounded by the repository | replaced by `projectRoot` (same fix as Archie's) |
| Gard | LOW: FIFO or huge file read | regular file only, 64 KiB cap |
| Gard | LOW: Windows timeout does not kill a `.cmd` shim's grandchild; fail-closed `unknown` when cwd root contains `claude` | accepted: pre-existing `exec.js` behavior, availability only |

A security bug found earlier by the existing suite, before review: discovery from a repository
subfolder could run a `claude` planted in the repository's `node_modules/.bin`. Fixed by filtering
against the repository root, refusing a binary inside it and dropping loader variables, with a
regression test and a control.

Second round, after the last edit: Archie approves (all six resolved), Gard approves (all resolved;
residual check-then-use race on the project link check accepted as LOW, no action). Evidence at that
point: 966 tests, 962 pass, 0 fail, 4 platform skips; `validate:full` COMPLETE; end-to-end 16/16.

Incidental finding (out of scope, LOW): `add` run from a subfolder writes specialists to that
folder's `.claude/agents`, while model choices now come from the repository root. The placement
predates this change; consider targeting the repository root in a later change.

## 10. Setup interface (user feedback, 2026-11-10)

- [x] 10.1 Rebuild `models setup` on `prompts` (already the install menu's dependency) instead of raw readline: select menus per level with the current value preselected, `other…` for a typed ID, an agent-override checklist, summary and save confirmation; Ctrl+C writes nothing. Verified by `test/models-command.test.js` (fake asker).
- [x] 10.2 Offer the step in the interactive `install` after the harness menu when Claude Code is selected (Yes highlighted with no choices, No otherwise; cancel cancels the install); flag-driven and non-terminal installs never ask. Docs, README, release notes and spec updated.
- [x] 10.4 Discovery adds the documented Claude aliases (`haiku` was missing: the help quotes examples) and honors `availableModels` from managed, else user, settings (design D2 amendment). Verified by `test/model-discovery.test.js` and a real `models refresh` (fable, opus, sonnet, haiku).
- [x] 10.5 `other…` says "alias or full model ID"; values accept `[` `]` for `sonnet[1m]`-style aliases (still JSON-quoted when written). A per-name origin note in the menu was tried and removed at the user's request.
- [ ] 10.3 Look at it in a real terminal (the user), including Windows redraw. Then rerun the full suite and the validators; the 9.4 reviews predate this edit, so re-review by Archie (command surface, D2 amendment) and Gard (discovery now reads Claude settings files: only `availableModels`, size-capped) before closing.

## Workflow follow-up

- Run the orchestrate Integration Review before closing. Done 2026-11-10 (reading step, inline):
  no contradiction between Archie and Gard (both converged on `projectRoot`); trade-offs
  documented (frontmatter `effort` kept on documentation only, Codex effort fallback lost,
  Windows shim timeout, alias-only `model` parameter in `docs/install.md`); end-to-end
  covered by 9.1/9.2; scope proportionate. **Open gap:** this is HIGH (public contract), and
  the orchestrate lifecycle has Spencer check documentary drift at HIGH; no Spencer check is
  recorded. Run it before closing. Note: the installed `~/.claude/skills/orchestrate` still
  holds the pre-change text until reinstall.
- Ask before commit/push; open a PR from the feature branch.
- Archive after review and merge; verify `openspec/specs/model-selection/spec.md` is created.
- Open the follow-up change for Codex (role-file application via `codex debug models`), OpenCode and Copilot.

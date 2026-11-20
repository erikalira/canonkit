# Tasks

Risk: MEDIUM (changes what the installer generates for every user; no auth, secrets or migration). Acceptance criteria: `proposal.md`. Decisions: `design.md`.

Owners: Bob implements `bin/agent-access.js`, validation and tests. Virgo changes the agent sources. Quinn reviews after the last edit. Spencer runs the drift check before sync/archive.

## 1. Blocking checks (before the constant is final)

- [ ] 1.1 Read the Cron and PushNotification tool names from a live session's tool list (and confirm `Agent`, `SendMessage`, `Artifact`, the Claude Docs server prefix); record the exact names here.
- [ ] 1.2 BLOCKING: install an agent with one bogus name in `disallowedTools`, dispatch once in foreground and once in background; the agent must launch. If it fails, trim the denylist to tools the harness does not already filter (`Agent`, `SendMessage`, `Artifact`, Claude Docs). Record the outcome here. Do not finalize 2.1 before this.

## 2. Installer, validation, tests (Bob)

- [ ] 2.1 `bin/agent-access.js`: add `build` to `ACCESS_LEVELS`; export one coordination-tools constant of exact names; `build` = that list, `inspect` = that list plus `Edit`, `Write`, `NotebookEdit`; `full` unchanged; no wildcards.
- [ ] 2.2 One shared citation detector (backticked kebab-case name followed by the word "skill") in `bin/agent-access.js`; the installer adds `Skill` to the `read`/`write-docs` allowlists only when it matches; `models show` uses the same function and prints whether `Skill` is kept and the citation.
- [ ] 2.3 Tests: levels accepted/rejected (`build`, misspelling lists all five); `build` and `inspect` lists share the constant, keep `SubagentHandback`, `ToolSearch`, `Monitor`, `TaskStop`; no `*` in any list; `full` null; other harnesses "not translated"; detector pinned to real sources (Quinn, Bob, Virgo detected; Archie, Gard, Scott, Spencer not); `models show` output for kept/not kept; validation still rejects reserved keys.

## 3. Agent sources (Virgo)

- [ ] 3.1 `access: build` in `agents/bob.md`, `agents/pipe.md`, `agents/virgo.md`; no reserved keys added.

## 4. Docs

- [ ] 4.1 `docs/install.md`: `build` level, access table, the citation convention, the start-up cost re-measurement recipe still valid.
- [ ] 4.2 `reference/agents-block.md` access table (Bob, Pipe, Virgo as `build`; Perry, Pixie as `inspect`).
- [ ] 4.3 `CHANGELOG.md` Unreleased: new level, `inspect` now withholds coordination tools, `Skill` derived from citation; a source declaring `build` fails validation on older canonkit.
- [ ] 4.4 Spec Purpose wording (see design.md) corrected at sync.

## 5. Validation and review

- [ ] 5.1 After the last edit: `scripts/validate.sh`, full `npm test` once, `git diff --check`, `openspec validate agent-tool-surface --strict`; record outcomes here (note pre-existing failures separately).
- [ ] 5.2 Quinn reviews after the last edit (acceptance criteria and test pins).

## 6. Measurement gate (no gain claimed without it)

- [ ] 6.1 Install, then in a new session run one trivial dispatch per affected agent (Bob, Pipe, Virgo, Perry, Pixie, and Archie, Gard, Quinn, Scott, Spencer for `Skill`); read `first_call.context` from the `agent_end` events.
- [ ] 6.2 Compare with the baseline table in `docs/plans/agent-tool-surface-handoff.md`; record the numbers here and in `CHANGELOG.md` only as measured.
- [ ] 6.3 If removing `Skill` saves less than about 1k, revert that part. Denying `Skill` to `build`/`inspect` is a follow-up only if measured at about 1k or more.

## 7. Closure

- [ ] 7.1 Spencer drift check (spec, docs, agents-block) before sync/archive.

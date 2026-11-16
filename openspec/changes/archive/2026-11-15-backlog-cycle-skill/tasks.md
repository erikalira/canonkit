# Tasks

## 1. Skill (Virgo)

- [x] 1.1 Write `skills/backlog-cycle/SKILL.md` with `disable-model-invocation: true` and a description that says it is invoked by the user only; cover every scenario of the `context-continuity` delta by pointing to `skills/orchestrate/SKILL.md`, `skills/orchestrate/out-of-scope-issues.md` and the managed block's "New session when the subject changes" instead of restating them; keep it product-neutral (no `todo.md`, OpenSpec, Graphify or release scheme assumed); verify each scenario maps to a line of the skill
- [x] 1.2 Write `skills/backlog-cycle/agents/openai.yaml` with `allow_implicit_invocation: false`; verify it matches the `context-tune` pattern
- [x] 1.3 Run `npm run validate:full`; verify it passes

## 2. Test (Bob)

- [x] 2.1 Add a test to `test/e2e/cli-install.test.js` next to the `context-tune` one: `backlog-cycle` installs whole to `.claude` and `.agents` and stays out of implicit selection on both runtimes; verify it fails if `disable-model-invocation` is removed from the source

## 3. Docs and release (Spencer)

- [x] 3.1 Add an entry for the skill to `docs/release-notes/3.2.1.md` (no new version; "Action required: none" still holds) and update the docs that list shipped skills; verify no doc describes the skill as triggering on its own

## 4. Close-out

- [x] 4.1 Run `npm test` after the last edit, `git diff --check` and `graphify update .`; verify they pass
- [x] 4.2 Tick the P2 item in `todo.md`; keep the original handoff until a real cycle uses the skill, as it says, and mark there that the open decisions are resolved (the handoff was removed after that cycle)
- [x] 4.3 Archive with `openspec-archive-change` and run `npm run validate`

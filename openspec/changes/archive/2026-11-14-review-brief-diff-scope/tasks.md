# Tasks

## 1. Guidance and guard

- [x] 1.1 Add `## Briefing a review` after "Briefing verification" in `skills/orchestrate/SKILL.md` (range and work state, exact diff command, `--numstat` file list plus untracked files, per-file commands for a large diff, scratch only for a state git cannot show, no repository file); verify each scenario of the `context-continuity` delta is covered by the text
- [x] 1.2 Add the heading to the orchestrate heading check in `scripts/validate-python.py`; verify `npm run validate` passes, and fails naming the heading when it is temporarily removed
- [x] 1.3 Run `npm run test:fast`; verify it passes (budget, idempotent-install and security tests are reached)

## 2. Release and close-out

- [x] 2.1 Add a "Faster reviewer briefs" entry to `docs/release-notes/3.2.1.md` (no new version); verify the file still reads "Action required: none"
- [x] 2.2 Run `npm test` after the last edit; verify it passes
- [x] 2.3 Quinn reviews the final diff after the last edit; verify no blocking finding remains, then tick the P1 item in `todo.md`

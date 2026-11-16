# Proposal

## Why

Review dispatches (Quinn, Gard, Archie and the other reviewers) start cold and
spend their first calls rediscovering what changed: which range, which files,
how big. The pitakus runs (see `docs/plans/review-speed-handoff.md`, proposal 1)
suggest a review is fast when the diff scope is resolved before the reviewer
starts. The lead already knows that scope, so the brief should carry it.

## What Changes

- `skills/orchestrate/SKILL.md` gains a short section next to "Briefing
  verification" saying that a review brief carries the resolved diff scope:
  - the revision range (`<base>..<head>`, or "working tree against HEAD"), with
    the work state it was resolved on;
  - the exact command that shows the diff;
  - the changed files with added/removed line counts, plus untracked files,
    which `git diff` does not show.
- For a large diff, the brief names per-file diff commands so the reviewer reads
  it in parts; no file is written to the repository. A scratch copy is used only
  when the reviewed state cannot be reproduced by a git command.
- `scripts/validate-python.py` checks that the new heading is not lost, as it
  already does for "Naming the model and effort" and "Integration Review".
- 3.2.1 release notes gain an entry for this guidance.

No CLI, installer or agent-file behavior changes. Economical reading inside the
agents and before/after measurement (handoff proposals 2–3) are out of scope.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `context-continuity`: delegation guidance adds a requirement that a review
  brief carries the resolved diff scope.

## Impact

- `skills/orchestrate/SKILL.md` (installed to `~/.claude/skills` and
  `~/.agents/skills`; loaded on demand, not every turn).
- `scripts/validate-python.py` (heading guard).
- `docs/release-notes/3.2.1.md`, `todo.md`.
- Risk: MEDIUM (instructions every reviewer dispatch follows). Reaches the
  budget, idempotent-install and security tests; Quinn reviews after the last
  edit.

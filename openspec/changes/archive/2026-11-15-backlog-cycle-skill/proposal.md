# Proposal

## Why

Several 3.2.1 items were closed with the same session flow: pick one backlog
item, classify it, plan, stop for approval, implement, verify, review, close and
hand the next session a ready prompt. Before the skill, that flow was documented
only in a handoff (removed after the first real cycle) and in session prompts.
Each session had to re-derive it, and the cases where the cycle did not close
(veto, item larger than it looked, item obsolete) had no defined exit.

## What Changes

- New core skill `skills/backlog-cycle/` (installed at user level for every
  target, like the other `skills/` children), **invoked by the user only**:
  `disable-model-invocation: true` in `SKILL.md` and
  `agents/openai.yaml` with `allow_implicit_invocation: false` for Codex, as
  `context-tune` does. It adds no per-turn description cost and needs no routing
  eval.
- The skill is product-neutral. It adds only what no existing instruction says:
  - select the next open item from the backlog the project already uses,
    resolved the same way as `skills/orchestrate/out-of-scope-issues.md`
    ("Choose the destination"); with ambiguous candidates, ask once;
  - confirm on disk that what the item or its handoff describes still exists;
  - classify risk and size the ceremony: LOW inline with only the close-out;
    MEDIUM without a structural choice gets a planned change without a design
    artifact; HIGH, or a structural alternative to record, gets the full
    package. Planning uses the project's own workflow (OpenSpec when it uses
    it), never imposed;
  - stop for the user's approval of the plan before editing;
  - before calling a reviewer: read the diff, run a cheap red check (would the
    new test fail without the fix?) and the tests by reach;
  - a regression the change introduced is fixed in the change; a pre-existing
    problem becomes an incidental finding;
  - close-out: tasks reflect real work, the resolved handoff is removed (or
    kept when it says when to close), the backlog item is marked, findings are
    recorded, the project's own post-change steps run;
  - the in-progress release (branch, version, release-notes draft), with a
    version bump only through the project's release procedure and only if this
    release has not bumped it yet;
  - commit/push: ask which of three the user wants (lead commits and asks push
    separately; lead hands only the message; lead hands the ready command);
  - three exits when the cycle does not close: stop, split or drop the item,
    record the reason in the backlog, write or update the handoff with the real
    state, and hand over the next-session prompt.
- It points to, and does not copy: the OpenSpec lifecycle, review brief, test
  reach and Integration Review in `skills/orchestrate/SKILL.md`; the
  incidental-findings procedure in `out-of-scope-issues.md`; the handoff path
  and next-session prompt in the managed block's "New session when the subject
  changes".
- An install test like the `context-tune` one checks the skill installs whole
  and stays out of implicit selection on both runtimes.
- 3.2.1 release notes and the documentation Spencer identifies.

Out of scope: the managed blocks (they do not cite the skill), reconciling
`CANONKIT_ROADMAP.md` (a phase plan with its own prompt), automatic triggering.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `context-continuity`: adds a requirement for the user-invoked backlog-item
  session cycle.

## Impact

- `skills/backlog-cycle/SKILL.md`, `skills/backlog-cycle/agents/openai.yaml`
  (new; installed to `~/.claude/skills`, `~/.agents/skills` and the other
  targets' skill roots by the existing catalog; no retired descriptor needed).
- `test/e2e/cli-install.test.js` (one test).
- `docs/release-notes/3.2.1.md`, docs Spencer names, `todo.md`.
- Risk: MEDIUM (changes how the lead runs a session for every install that
  invokes it; no HIGH-risk surface). Virgo writes the skill, Bob the test,
  Spencer the docs and release notes.
- Design note: no `design.md`. The decisions (core scope, name, manual
  invocation, backlog source) were made with the user and are recorded here;
  there is no structural alternative left to weigh.

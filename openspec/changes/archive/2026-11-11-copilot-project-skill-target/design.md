# Design

## Context

See [proposal.md](proposal.md) for motivation and [the spec](specs/stack-pack-project-targets/spec.md) for the contract.

Observed in the tree at `2c603c3` (not assumed):

- `bin/stack-packs.js:10` defines `TARGETS = { agents: ".agents", claude: ".claude", copilot: ".github" }`; the baseline `1637bbd` had only the first two. The catalog builds receipt keys `<id>:<target>:SKILL.md` for every pack and target.
- `list()` reports `installed` only when the tracked and present counts both equal the number of targets, and `partial` when some entries are tracked but not all. An untracked existing destination directory sets `untracked/collision`, which wins over `partial`.
- Archie's read-only scripts (reviewing `ui-focused-visual-workflow`) established against both CLI versions: a legacy install lists as `partial` with the current CLI; the old CLI rejects any receipt containing a copilot key; removing every pack the current CLI added or re-added makes the old CLI read the receipt again; a locally edited `.github` copy makes `remove` fail and keeps its key; a pre-existing untracked third destination yields `untracked/collision` and a collision error on add. Those scripts live in the session scratchpad and are not repository evidence; this change turns the verifiable parts into repository tests.
- `test/e2e/stack-packs.test.js` builds its React baseline with the current CLI, which already writes three targets, so no test uses a genuine two-target receipt.
- `docs/install.md` and `README.md` already document the third copy and the corrected downgrade steps (done in `ui-focused-visual-workflow`).

## Goals / Non-Goals

**Goals:** make the three-target contract and the legacy-receipt behavior explicit and tested against a receipt produced by the real `1637bbd` CLI.

**Non-Goals:** changing CLI behavior, a receipt schema 2, migration code, tolerating unknown entries, auto-completing legacy installs on `list`, or touching the UI skills.

## Decisions

### 1. Specify the behavior that exists; do not change code

The spec records what Archie verified. Tests either confirm it or expose a deviation. A deviation becomes a finding for a decision, not a silent code change. Alternative: redesign legacy handling (for example, treat the third target as optional). Rejected: it would alter the public contract and weaken the `installed` guarantee.

### 2. Generate the legacy fixture from the real baseline module

Produce the two-target receipt and the matching files by running `git show 1637bbd:bin/stack-packs.js` in an isolated temp project, then commit the resulting receipt bytes and skill files as a literal fixture with a short provenance note (commit, command, date). Tests copy the fixture into a temp project. Alternative: hand-write the JSON. Rejected: it would prove only that the test agrees with the author's reading of the format. Alternative: vendor the old module. Rejected: it adds a second implementation to the package.

### 3. Reuse the existing e2e suite and harness

Add cases beside the existing coexistence tests in `test/e2e/stack-packs.test.js` using the same temp-project and HOME-isolation helpers. No new test runner or mechanism.

### 4. Verify documentation, edit only on contradiction

`docs/install.md` and `README.md` are read against the spec scenarios. They are edited only where they contradict it.

## Risks / Trade-offs

- [A test shows the code differs from the spec] → record it as a finding and ask for a decision before any code edit.
- [The fixture drifts from what `1637bbd` really wrote] → record provenance and regenerate with the same documented command if the baseline reference changes; the fixture's receipt entries are asserted to contain only `agents` and `claude` keys.
- [Fixture files could be read as shipped content] → keep them under the test fixtures directory and confirm `npm pack --dry-run` does not list them.
- [Windows path or line-ending differences change fixture bytes] → store bytes exactly and compare hashes, not text.

## Migration Plan

No consumer migration and no installation. Implementation touches tests, fixtures and, only if contradicted, two docs. Roll back by reverting the commit. Completion needs Archie's independent review after the last edit.

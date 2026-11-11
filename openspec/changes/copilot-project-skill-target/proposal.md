# Proposal

## Why

Commit `2861645` added a third project target, `.github/skills/canonkit-<id>/SKILL.md` (receipt key `<id>:copilot:SKILL.md`), to the stack-pack mechanism in `bin/stack-packs.js` without an OpenSpec change. The baseline `1637bbd` owned two targets (`.agents`, `.claude`). Review of `ui-focused-visual-workflow` found that this widened a HIGH public contract (installed paths and the schema-1 receipt) with no spec, no test against a receipt written by the previous CLI, and downgrade guidance that was wrong until corrected there.

## What Changes

- Specify the current target set and the observable pack states it produces (`installed`, `partial`, `locally modified`, `untracked/collision`, `absent`).
- Specify compatibility with schema-1 receipts written by the two-target CLI: read without migration, report `partial`, and complete the third copy on re-add while preserving the original bytes and hashes.
- Specify that an unowned destination at the new target is a collision, not an overwrite.
- Add a repository fixture holding a genuine two-target receipt as written by the `1637bbd` CLI, plus tests that use it.
- Verify, without rewriting, the downgrade guidance already corrected in `docs/install.md` and `README.md`.
- No behavior change to the CLI is intended. If a test shows the code deviates from the specified behavior, that is recorded as a finding and decided separately.

## Capabilities

### New Capabilities
- `stack-pack-project-targets`: the set of project directories a stack pack owns, the pack states derived from them, and compatibility with receipts written by earlier CLIs.

### Modified Capabilities

None. No main spec covers stack packs today; `openspec/specs/` has no related capability.

## Impact

- Code: `bin/stack-packs.js` is read only. Tests: `test/e2e/stack-packs.test.js` plus a fixture under the test fixtures directory.
- Docs: `docs/install.md` and `README.md` are verified against the spec, edited only if they contradict it.
- Out of scope: receipt schema 2, migration code, relaxing unknown-entry validation, deleting receipts, any change to the three UI skills, and the `ui-focused-visual-workflow` artifacts.
- Risk: HIGH (public contract). An independent Archie review after the last edit is required before the change is closed.

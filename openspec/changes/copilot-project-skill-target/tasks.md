# Tasks

Planning artifacts only until a separate apply request. Use [design.md](design.md) and the [spec](specs/stack-pack-project-targets/spec.md) for acceptance. Planning does not authorize commit, install, publish, spec sync or archive.

## 1. Legacy fixture and contract tests

- [ ] 1.1 Generate a genuine two-target schema-1 install by running the `1637bbd` module (`git show 1637bbd:bin/stack-packs.js`) in an isolated temp project with one pack and an unrelated pack; commit the resulting receipt and skill files as a fixture under the test fixtures directory with a provenance note (commit, command, date). Verify the committed receipt contains only `agents` and `claude` keys and that `npm pack --dry-run` does not list the fixture.
- [ ] 1.2 Add tests in `test/e2e/stack-packs.test.js` for the spec scenarios "A legacy install is listed" and "A legacy pack is re-added": the fixture lists as `partial`, `list` leaves the receipt byte-identical, re-add yields `installed` with three entries, and the original copies and the unrelated pack keep bytes and hashes. Verify with `node --test test/e2e/stack-packs.test.js`.
- [ ] 1.3 Add a test for "A legacy install meets a pre-existing third destination": an untracked `.github/skills/canonkit-<id>/` reports `untracked/collision`, add fails with a collision error and the content is unchanged. Verify with the same command.
- [ ] 1.4 Add or confirm a test that a receipt containing a `<id>:copilot:SKILL.md` entry is rejected by the baseline module, using the `1637bbd` code through the fixture generation script or an equivalent recorded check. If it cannot run offline in the suite, record it as a documented manual check with its output instead of weakening the claim. Verify the outcome is stated in this file.
- [ ] 1.5 If any test contradicts the spec, stop and record the deviation as a finding with evidence; do not edit `bin/stack-packs.js` without a decision. Verify by listing outcomes under "Implementation evidence" below.

## 2. Documentation verification

- [ ] 2.1 Read `docs/install.md` (stack-packs section and the downgrade paragraph) and `README.md` against every spec scenario; edit only on contradiction, preserving receipt/path terminology. Verify with `git diff --check`, local link checks of the touched files and a note of what was compared.

## 3. Integration and independent review

- [ ] 3.1 Run `node --test test/e2e/stack-packs.test.js`, then once after the last edit `npm test`, `npm run validate`, `npm pack --dry-run` and `openspec validate copilot-project-skill-target --strict`. Record commands, work state and results here; label any earlier result historical after a later edit.
- [ ] 3.2 Obtain Archie's independent review after the last edit (HIGH public contract), covering spec/test/fixture fidelity and the unchanged unknown-entry rejection. Record the verdict, resolve blockers and repeat only the affected checks.

## Workflow follow-up

- Sync the delta spec and archive only when requested under the OpenSpec workflow after review; this plan performs neither.
- Return to `ui-focused-visual-workflow` task 3.5 once this change is registered and report the link there.

## Implementation evidence

Not started.

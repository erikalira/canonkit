# Tasks

Planning artifacts only until a separate apply request. Use [design.md](design.md) and the [spec](specs/stack-pack-project-targets/spec.md) for acceptance. Planning does not authorize commit, install, publish, spec sync or archive.

## 1. Legacy fixture and contract tests

- [x] 1.1 Generate a genuine two-target schema-1 install by running the `1637bbd` module (`git show 1637bbd:bin/stack-packs.js`) in an isolated temp project with one pack and an unrelated pack; commit the resulting receipt and skill files as a fixture under the test fixtures directory with a provenance note (commit, command, date). Verify the committed receipt contains only `agents` and `claude` keys and that `npm pack --dry-run` does not list the fixture.
- [x] 1.2 Add tests in `test/e2e/stack-packs.test.js` for the spec scenarios "A legacy install is listed" and "A legacy pack is re-added": the fixture lists as `partial`, `list` leaves the receipt byte-identical, re-add yields `installed` with three entries, and the original copies and the unrelated pack keep bytes and hashes. Verify with `node --test test/e2e/stack-packs.test.js`.
- [x] 1.3 Add a test for "A legacy install meets a pre-existing third destination": an untracked `.github/skills/canonkit-<id>/` reports `untracked/collision`, add fails with a collision error and the content is unchanged. Verify with the same command.
- [x] 1.4 Add or confirm a test that a receipt containing a `<id>:copilot:SKILL.md` entry is rejected by the baseline module, using the `1637bbd` code through the fixture generation script or an equivalent recorded check. If it cannot run offline in the suite, record it as a documented manual check with its output instead of weakening the claim. Verify the outcome is stated in this file.
- [x] 1.5 If any test contradicts the spec, stop and record the deviation as a finding with evidence; do not edit `bin/stack-packs.js` without a decision. Verify by listing outcomes under "Implementation evidence" below.

## 2. Documentation verification

- [x] 2.1 Read `docs/install.md` (stack-packs section and the downgrade paragraph) and `README.md` against every spec scenario; edit only on contradiction, preserving receipt/path terminology. Verify with `git diff --check`, local link checks of the touched files and a note of what was compared.

## 3. Integration and independent review

- [x] 3.1 Run `node --test test/e2e/stack-packs.test.js`, then once after the last edit `npm test`, `npm run validate`, `npm pack --dry-run` and `openspec validate copilot-project-skill-target --strict`. Record commands, work state and results here; label any earlier result historical after a later edit.
- [x] 3.2 Obtain Archie's independent review after the last edit (HIGH public contract), covering spec/test/fixture fidelity and the unchanged unknown-entry rejection. Record the verdict, resolve blockers and repeat only the affected checks.

## Workflow follow-up

- Sync the delta spec and archive only when requested under the OpenSpec workflow after review; this plan performs neither.
- Return to `ui-focused-visual-workflow` task 3.5 once this change is registered and report the link there.

## Implementation evidence

Work state: uncommitted working tree on `main` (2026-11-11). `bin/stack-packs.js` unchanged.

**1.1 Fixture.** `test/fixtures/stack-packs-legacy/` holds the receipt and four `SKILL.md` copies (`react`, `go`) produced by `node test/fixtures/stack-packs-legacy/generate.mjs`, which runs `git show 1637bbd:bin/stack-packs.js` in a temp project. Receipt target keys: `agents`, `claude` only (4 entries). `PROVENANCE.md` records commit, command and date. `.gitattributes` marks `project/**` as `-text` so `core.autocrlf` cannot change the hashed bytes. `npm pack --dry-run` lists no fixture or test file (64 files).

**1.2 / 1.3 Tests.** Four cases added to `test/e2e/stack-packs.test.js` (fixture integrity; legacy list is `partial` and byte-identical; re-add yields `installed` with three `react` entries while original hashes, original bytes and the unrelated `go` pack are unchanged; untracked `.github/skills/canonkit-react/` is `untracked/collision`, add fails with a collision error and the content is unchanged). `node --test test/e2e/stack-packs.test.js`: 23 pass, 0 fail.

**1.4 Baseline rejection (documented manual check).** The suite does not run the baseline module because it needs git history for `1637bbd`, which a shallow checkout lacks. Check run 2026-11-11 with the baseline module against the fixture plus a `react:copilot:SKILL.md` entry:

```
list: rejected -> Cannot read stack-pack receipt: Invalid stack-pack receipt entry; nothing was changed
add react: rejected -> Cannot read stack-pack receipt: Invalid stack-pack receipt entry; nothing was changed
receipt unchanged: true
```

The check is verified against `1637bbd`, the immediate predecessor of the third target; it does not enumerate every older CLI. The current CLI's rejection of unknown keys is pinned in the suite by the case "unknown receipt entries are still rejected".

**1.5 Deviations.** None. Every test agreed with the spec; no code edit was needed or made.

**2.1 Docs compared.** `docs/install.md` (stack-packs section, the three-copy list, receipt paragraph, downgrade paragraph, `list` states) and `README.md` ("Stack packs, per project") against every spec scenario: three targets, `partial` for older installs until re-added, remove every pack the newer CLI added or re-added before downgrading, and never delete the receipt. No contradiction; no doc edited. `git diff --check`: clean.

**3.1 Final run (after the last code/test edit).** `node --test test/e2e/stack-packs.test.js`: 23 pass. `npm test`: 1007 tests, 1003 pass, 0 fail, 4 skipped. `npm run validate`: passed with 1 warning (Bash syntax validation not run). `npm pack --dry-run`: no fixture listed. `openspec validate copilot-project-skill-target --strict`: valid.

**3.2 Independent review (Archie, opus/medium, after the last code edit).** Verdict: approve with notes, no blockers. Confirmed `bin/` unchanged, the fixture hash-identical to an independent regeneration from `1637bbd`, each new test failing on a real regression, docs consistent with the spec. Notes applied afterwards: the re-add requirement now holds unchanged bytes only while copies match the current pack source (spec reworded); a precondition assert added to the re-add test; a test pinning unknown-entry rejection added; 1.4 evidence labelled as verified against `1637bbd`. Affected checks rerun after those edits: `node --test test/e2e/stack-packs.test.js` 24 pass, `openspec validate --strict` valid, `git diff --check` clean. The `npm test` result in 3.1 is historical for the suite as a whole; only this file and the spec changed since.

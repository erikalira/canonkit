# Handoff: close the release as 3.1.0

State on 2026-11-12, branch `docs/ecc-skills-knowledge-groups-review`, HEAD
`74506c4`. Release preparation is complete in a dirty working tree. Preserve the
user's existing staged and unstaged work, including `reference/agents-block.md`,
the unrelated `sandbox-auto-approval-default` change and `.worktrees/`. Delete
this handoff only after the release is published.

## Prepared

- `package.json`, `package-lock.json` and the CLI report version `3.1.0`.
- Existing OpenSpec change `install-unified-catalog`: 12/12 tasks complete;
  implementation, docs and install-output polish are recorded in its artifacts.
  It is ready to archive, but has not been archived.
- Release notes are `docs/release-notes/3.1.0.md`; the 3.0.0 notes link to it.
- The security default change for sandboxed Bash is now recorded in the 3.1.0
  notes; it applies only with the strict fail-closed profile and preserves
  explicit existing values.
- safeGit, remaining FIFO reads and unsafeWriteRoot stay outside this release in
  [issue #36](https://github.com/erikalira/canonkit/issues/36).
- Superseded WSL tools handoff removed; WSL resolver handoff retains issue #36
  follow-ups.

## Verification

- Full `npm test`: 1,163 tests, 1,142 passed, 21 skipped, 0 failed.
- Portable `npm run validate`: passed with one warning; Bash syntax checks were
  not run (`npm run validate:full` is still needed for those).
- `npm pack --dry-run --ignore-scripts`: passed, 65 files from this working
  tree, not from a clean tagged commit.
- Install-output smoke in a scratch Git project: passed; the tool preflight
  precedes the named confirmation, successful output is summarized, warnings
  and actionable tool notes remain visible, and verbose mode retains child
  output.
- Routing and quality eval dry-runs listed 30 and 77 cases and called no models.
  Real-model evals were not run; behavioral effect remains **UNMEASURED**.
- **Suspected intermittent test failure:** `test/canonkit-hook.test.js` once
  failed in the full suite (`block` vs `allow`). It passed isolated on both the
  current tree and `HEAD`, the complete `HEAD` suite passed, and the next full
  current-tree suite passed. Cause unknown; watch if it recurs.

## Still required by the release workflow

Native Windows and macOS tests, CI matrix, secret scan, tag-on-main check, a
real WSL run and package review from the exact tagged commit were not run
locally. Follow `docs/releasing.md` for the clean main commit, tag, CI checks and
publication approval. No commit, push, tag, archive or publication was done.

The release is prepared, not published. Do not remove this handoff until that
changes.

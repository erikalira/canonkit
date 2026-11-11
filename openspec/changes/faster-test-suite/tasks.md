# Tasks

## 1. Green baseline and measurement

- [ ] 1.1 Fix the stale expectation in `test/security-cli.test.js:149-158` (install now prints the short summary without `--verbose`) in its own LOW commit; verify `node --test test/security-cli.test.js` passes.
- [ ] 1.2 On an idle machine (stop the runaway `vite dev` in PID 10456 first), record per-file times with `--test-reporter=spec` and split a fresh install's time between ACL spawns and discovery spawns; verify the numbers are recorded in this change and state whether D2 is needed.
- [ ] 1.3 Record the baseline test count (files, tests, passing) to compare after the refactor; verify it is written in this change.

## 2. Shared harness and discovery isolation (D1, D4 helpers)

- [ ] 2.1 Create `test/helpers/cli-harness.js` with `run`, env isolation (removing `NODE_OPTIONS`, `NODE_PATH`, `CLAUDE_CONFIG_DIR`), scratch HOME and stub-bin builders; migrate `cli.test.js` and `security-cli.test.js` to it and verify both files pass with the same test counts.
- [ ] 2.2 Give the harness a test-owned `PATH` with no `claude`/`codex`; add stubs only for tests that assert discovered output; verify the real `claude` is never executed (e.g. a stub that records calls shows none in default tests) and the discovery tests pass.
- [ ] 2.3 Add the structural test that fails when a test file outside `test/helpers/` spawns `bin/cli.js` directly; verify it passes and fails when a direct spawn is temporarily introduced.

## 3. ACL stub and real ACL coverage (D2, D3)

- [ ] 3.1 Read existing ACL assertions in `cli.test.js`/`install-manifest.test.js`; if none verifies the DACL from disk, add the Windows test (install, reinstall, uninstall without preload, assert inheritance protected and only the user SID, S-1-5-18, S-1-5-32-544); verify it passes on Windows.
- [ ] 3.2 Add `test/support/stub-acl.mjs` matching only the absolute System32 `powershell.exe`, `icacls.exe` and `whoami.exe`, with `syncBuiltinESMExports()`; verify with harness self-tests that other spawns pass through and a stubbed install completes.
- [ ] 3.3 Pass the preload as `--import` argv in the harness for `cli`, `security-cli`, `uninstall` and `stack-packs`, except for the real-ACL test; verify those files pass and `git diff` shows no change under `bin/`.
- [ ] 3.4 Request Gard review of 3.1-3.3 (preload breadth, real-ACL sufficiency); verify the review outcome is recorded in this change.

## 4. Re-measure and split

- [ ] 4.1 Re-measure per-file times after groups 2-3; verify the results are recorded and compared with 1.2.
- [ ] 4.2 For each file still over target, split by describe group into parallel files (`cli.test.js` first, then `security-cli` and `uninstall` if needed); verify the total test count equals the baseline in 1.3.
- [ ] 4.3 Where a hot spot remains, replace per-id stack-pack loops with one real install per pack kind plus in-process store validation, and share installs through `before()` only for read-only groups; verify the list of assertions moved to in-process is recorded and every test still passes.

## 5. Tiers and close-out

- [ ] 5.1 Move the slow end-to-end files to `test/e2e/`, add `test:fast` and make `test` run both globs; verify `npm run test:fast` excludes `test/e2e/` and `npm test` runs all files, and `prepublishOnly` still runs `npm test`.
- [ ] 5.2 Run the full suite once after the last edit on an idle machine and record the final time against the targets (full about 4 minutes or less, fast about 2 minutes or less); verify test count equals the baseline.
- [ ] 5.3 Request Quinn review that no coverage was lost (before/after counts, assertions moved to in-process); verify the outcome is recorded in this change.
- [ ] 5.4 Update contributor docs (README or test notes) with `test:fast`, `test`, and the harness/preload rule; verify the documented commands run as written.

## Workflow follow-up

- Archive the change after Gard and Quinn reviews are recorded and the targets are met or the shortfall is documented.
- Incidental finding to track separately: batching the two production PowerShell ACL calls into one per process would also speed real installs (owner: Gard).

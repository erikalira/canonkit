# Design

## Context

See proposal.md for motivation. Findings behind the decisions (Bob's profile, Archie's read of the code; files checked: `bin/install-manifest.js:37-68,291-307`, `bin/model-discovery.js:58-82`, `bin/exec.js:118-167`, `test/cli.test.js:57-81`, `test/security-cli.test.js:12-33`):

- Files run in parallel but tests inside a file run one after another, so wall time is set by `cli.test.js`.
- CLI helpers use `spawnSync`, which blocks the event loop. `describe({ concurrency })` therefore gives no parallelism today; separate files are the only parallel lever without rewriting the helpers.
- A fresh install spawns `powershell.exe` x2 (directory DACL), `whoami` + `icacls` per private file, and real `claude --version`/`--help` found through `PATH`. `cli.test.js` passes the developer's `PATH` through, so results depend on the machine. `security-cli.test.js` already pins `PATH` to a stub `claude.cmd` and deletes `NODE_OPTIONS`; the two harnesses have drifted.
- Timings were taken on a saturated machine; the first step re-measures on an idle one.

## Goals / Non-Goals

**Goals:** full suite about 4 minutes or less and fast tier about 2 minutes or less on an idle machine, with no loss of coverage, and no change to shipped code.

**Non-Goals:** in-process `main()` calls (loses real argv/exit-code coverage); async spawn helpers; Defender/AV exclusions (environment choice); batching the production PowerShell calls (separate change, Gard); a wall-clock budget test; changing framework or CI matrix; dropping assertions.

## Decisions

**D1. Discovery isolated through `PATH`, no new mechanism.** Every CLI test helper sets `PATH` to a test-owned bin directory. By default it has no `claude`/`codex`, so discovery reports "not found" and spawns nothing. Tests that assert discovered output add a stub there, which keeps the `.cmd` shim path through `cmd.exe` real. Adapter parsing is already covered in-process through the injected `run`. Rejected: an environment variable to skip discovery; `PATH` is already an input, so it adds attack surface for nothing.

**D2. ACL hardening stubbed by a test-only preload; production unchanged.** The harness spawns `node --import <repo>/test/support/stub-acl.mjs bin/cli.js ...`. The preload wraps `child_process.spawnSync`, answers only the absolute System32 `powershell.exe`, `icacls.exe` and `whoami.exe` (status 0, fake SID for whoami), calls `module.syncBuiltinESMExports()` so the named import in `install-manifest.js` sees the wrapper, and passes every other spawn through. The flag goes as argv, not `NODE_OPTIONS`, which the harness deletes. If production changes how it calls these tools the stub stops matching and tests get slower, not wrong. Rejected: `CANONKIT_SKIP_ACL` read in production (ships a switch that disables a security control and would raise this change to HIGH); gating on `NODE_TEST_CONTEXT` (undocumented internal, can be inherited outside tests); constructor injection (the CLI is a subprocess, so injection needs an env/argv channel anyway).

**D3. Real ACL coverage retained (condition for accepting D2).** At least one Windows test runs without the preload through install, reinstall and uninstall and reads the DACL back with `Get-Acl`, by SID because `icacls` names are localized. The state and backups directories must have protected inheritance; files inside them (backups, manifest) must grant only the three principals, and inherit that from the directory (found while writing the test: they carry no protected DACL of their own). If no such assertion exists today, it is written in this change.

**D4. Split by file, not by `describe` concurrency.** Split `cli.test.js` by describe group (install / hooks and wire-hooks / doctor / tools and models); split `security-cli` and `uninstall` only if still the longest after D1+D2. Shared helpers move to `test/helpers/cli-harness.js`, which also unifies the drifted env isolation. Rejected: `describe` concurrency (no effect with `spawnSync`); async helper rewrite (larger change, same gain).

**D5. Remove redundant spawns only where read-only.** `stack-packs`: one real install per pack kind, other ids validated in-process through the store. Share one install through `before()` only for groups whose assertions only read; any test that mutates keeps its own HOME. Done after re-measuring, and only in files still over target.

**D6. Tiers by directory.** Slow end-to-end files move to `test/e2e/`. `test:fast` runs `test/*.test.js`; `test` runs both globs and stays the `prepublishOnly` gate. Rejected: tags or name filters, which can drift silently.

**Regression guard.** No wall-clock test. One structural test fails if any test file outside `test/helpers/` spawns `bin/cli.js` directly, keeping spawns on the harness that carries D1 and D2. Timings stay a manual measurement recorded in this change.

**Order.** 0 fix the stale test (own commit); 1 idle-machine baseline split between ACL and discovery; 2 D1; 3 D2+D3; 4 re-measure; 5 D4 where still over target; 6 D5 where a hot spot remains; 7 D6. Stop as soon as targets are met.

## Risks / Trade-offs

- Silently lost coverage (the main MEDIUM risk) → same tests pass before and after, a list of assertions moved to in-process, Quinn review.
- Preload matches too much and hides real failures → exact absolute System32 paths only, D3, and a harness self-test that other spawns pass through.
- Preload stops applying (`syncBuiltinESMExports` behavior) → harness self-test that a stubbed install completes and leaves the DACL inherited.
- Shared `before()` installs couple tests by order → restricted to read-only groups.
- Stripped `PATH` starves tests that expect other tools (opencode already handled; git not found on `PATH` use) → run the suite and fix per failure.
- Timings are estimates from a loaded machine → targets are verified by step 4, not assumed.

## Open Questions

- Does `cli.test.js` already assert real ACLs that D3 can reuse? (Resolved by reading the file in task 3.)
- Which `cli.test.js` tests assert discovered-model output and need a stub? (Resolved in task 2.)
- ~~Is `claude --help` startup a bigger share than ACL?~~ Answered by the baseline below: yes.

## Review outcomes

- **Gard (3.4), approve with conditions, risk MEDIUM.** Stub breadth safe: loads only through the explicit `--import` argv, matches only the three absolute System32 paths on win32, passes everything else through; PATH/env isolation does not weaken a security test. Conditions, both met: (P1) the real-ACL test lacked a pre-existing directory with foreign grants, so removing the DACL rule cleanup would have stayed green; added `an install takes over a pre-existing state directory that grants other accounts` (Users and Everyone seeded on the state and backups directories) and mutation-tested it: with the `RemoveAccessRuleSpecific` line deleted from `restrictWindows` the test fails, restored afterwards; (P2) rules are now checked for Allow type and full control, and the backups left after uninstall are checked. Accepted limit: the stub ignores arguments, so an argument bug in the ACL calls is only caught by `acl-windows.test.js`. Junction/symlink guarding (`regularPath`) is not exercised by this file.

- **Quinn (5.3), approve, risk LOW.** Compared describe/test titles (with their describe path) between HEAD and the working tree as multisets: `cli.test.js` 252 entries became 252 across the four `cli-*` files (0 missing, 0 extra, 0 duplicated); security-cli 19, uninstall 24, stack-packs 17, all identical. Bodies of security-cli, uninstall and stack-packs are byte-identical to HEAD except the two import paths; the cli files differ only in imports, headers, braces and the fixtures moved verbatim to `cli-fixtures.js`. No test went vacuous: the old cli tests had no ACL assertion, the only discovered-output assertion uses its own stub `claude`, and the 4 skips are the same as the baseline (2 cli: POSIX modes and file symlinks; 1 install-manifest; 1 canonkit-hook). **No assertion was moved to in-process; +10 new tests.** Limits recorded: Linux and macOS were not exercised in this review (the Windows-only ACL tests and the stub do not run there; CI covers those), and the codex assertion in `cli-tools` accepts `discovered` or `unknown`, a pre-existing weakness unrelated to this change. Conditions closed: the spec scenario promising in-process validation of the other pack ids was removed and the unmet task 4.3 left the tracked list (see tasks.md follow-up); the "Test count" scenario now speaks of test titles.

## After groups 2 and 3 (same machine, files run one at a time)

| File | Baseline | PATH isolated (2.2) | + ACL stub (3.3) |
|---|---|---|---|
| cli.test.js | 359 s | 250 s | 196 s |
| security-cli.test.js | 63 s | 71 s | 40 s |
| uninstall.test.js | 65 s | 52 s | 34 s |
| stack-packs.test.js | 21 s | 20 s | 20 s |

Test counts unchanged (cli 241/239 + 2 skipped, security-cli 25, uninstall 30, stack-packs 19, models-command 25). The ACL stub gains 22-44% on the heavy files, above the 10% bar, so D2 stays.

## Re-measure after groups 1-3 (task 4.1, idle machine, 6 cores)

Per file, one at a time: cli 184 s, security-cli 39, uninstall 35, canonkit-hook 32, stack-packs 20, acl-windows 12, validate 6, install-manifest 5, other 15 files about 12 together. Sum 345 s (baseline 564 s). 25 files, 1002 tests (992 baseline + 10 new: 4 in acl-windows, 6 in cli-harness), 998 pass, 0 fail, 4 skipped.

Full `npm test`, files in parallel: **216 s wall** (baseline: about 12 minutes reported by the user on a loaded machine; the baseline sum alone was 564 s). The full-suite target (about 4 minutes) is met. The critical path is still `cli.test.js` at 184 s; with 6 cores the sum of 345 s allows a lower bound near 60 s if the heavy files were split.

## After splitting cli.test.js (task 4.2)

`cli.test.js` (241 tests, 184 s) became `cli-install` (roster, install, skills, per-runtime agents and reference blocks), `cli-hooks` (hooks, `--wire-hooks` for Claude Code and Codex), `cli-doctor` (doctor, dashboard, specialists, block sync) and `cli-tools` (tool registry, tool add/remove, model choices), with the shared fixtures in `test/helpers/cli-fixtures.js`. The four files together report 241 tests, 239 pass, 2 skipped, 0 fail (identical to the original) and take 86 s in parallel. Full `npm test`: **141 s wall**, 1002 tests, 998 pass, 0 fail, 4 skipped. Test bodies were moved by a script cutting at top-level `describe` boundaries; no test was rewritten.

## Tiers and final run (tasks 5.1, 5.2)

Eight slow files moved to `test/e2e/` (`cli-install`, `cli-hooks`, `cli-doctor`, `cli-tools`, `security-cli`, `uninstall`, `stack-packs`, `acl-windows`); their imports were adjusted and nothing else in them changed. `package.json`: `test:fast` runs `test/*.test.js`; `test` runs that plus `test/e2e/*.test.js` and stays the `prepublishOnly` and CI command. Run after the last edit, idle machine, 6 cores:

| Command | Wall | Tests | Pass | Fail | Skipped |
|---|---|---|---|---|---|
| `npm run test:fast` | 39 s | 683 | 681 | 0 | 2 |
| `npm test` | 134 s | 1002 | 998 | 0 | 4 |

683 + 319 in `test/e2e/` = 1002, equal to the count after task 4.1 (992 baseline + 10 new). Targets: full about 4 minutes (met, 134 s), fast about 2 minutes (met, 39 s). The user's reported 12 minutes came from a CPU-saturated machine; the clean sequential baseline was 564 s, so the like-for-like gain is 564 s of work now finishing in 134 s wall.

## Baseline (2026-11-11, idle machine, commit 36a553c, files run one at a time)

Earlier numbers (Bob) came from a saturated machine (Kilo Code extension and a runaway `vite dev`) and overstated everything about 5x; use these instead.

| File | Seconds | Tests | Pass |
|---|---|---|---|
| cli.test.js | 358.8 | 241 | 239 |
| uninstall.test.js | 65.2 | 30 | 30 |
| security-cli.test.js | 63.2 | 25 | 25 |
| canonkit-hook.test.js | 33.2 | 192 | 191 |
| stack-packs.test.js | 20.7 | 19 | 19 |
| validate.test.js | 7.3 | 5 | 5 |
| install-manifest.test.js | 5.1 | 9 | 8 |
| other 16 files | 8.8 total | 419 | 419 |

Total: 23 test files, 992 tests, 988 pass, 0 fail, 4 not passing (skipped; not investigated). Sum of per-file times 564 s; with files in parallel, wall time is bounded below by `cli.test.js` (about 6 min).

Fresh `install --claude` in a new HOME, 3 runs each:

| Variant | Seconds |
|---|---|
| normal PATH | 1.66-1.72 |
| no `claude` on PATH | 1.06-1.13 |
| no `claude` + ACL spawns stubbed | 0.78-0.92 |

Discovery costs about 0.6 s per install (35%), ACL about 0.25 s (15%), the rest about 0.85 s is the install itself. Consequences: D1 is the biggest single saving per install; D2 alone saves little (the stub preload was an inline probe and its application was not asserted); the dominant lever is D4, since `cli.test.js` is 64% of all time and runs serially. Targets of the proposal stand, but the full-suite goal of about 4 minutes depends on splitting `cli.test.js` into at least 3 files. D2 stays in scope as it is cheap once the harness exists, but task 3 should re-measure after D1 and D4 and drop D2 if its gain is under about 10%.

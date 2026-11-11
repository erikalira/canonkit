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

**D3. Real ACL coverage retained (condition for accepting D2).** At least one Windows test runs without the preload through install, reinstall and uninstall and reads the DACL back (`icacls` output or `Get-Acl`) for the state directory and one backup file. If no such assertion exists today, it is written in this change.

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
- Is `claude --help` startup a bigger share than ACL? The baseline in task 1 splits the two and decides whether D2 is needed at all.

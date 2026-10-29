# Handoff — item 1 (CI on three OS), 2026-10-29

PR: https://github.com/erikalira/agent-team-config/pull/19 (branch `ci/three-os`, from
`origin/main`). Worktree used: the session scratchpad (`git worktree list` shows it; remove
with `git worktree remove` once done). `.github/workflows/ci.yml` is written and works:
checkout, setup-node, setup-python 3.12, `npm ci` pass on all six jobs. `npm test` fails on
all six; `npm run validate` has not run yet (it comes after the tests).

First run: https://github.com/erikalira/agent-team-config/actions/runs/40929243894

## Failures, classified

| # | Where | Test | Cause | Kind |
|---|---|---|---|---|
| A | all OS, Node 18 | the whole suite | `node --test "test/*.test.js"`: the runner only expands globs itself from Node 21 on. "Could not find '.../test/*.test.js'". Not one test runs on 18, so `engines: >=18` has never been verified. | decision |
| B | ubuntu, macOS / 22 | `cli.test.js:2161` "a binary planted in the project is not the one run" | `shim(project, "openspec", …)` creates a **file** `project/openspec` on POSIX (on Windows it is `openspec.cmd`); the real stub then does `mkdir('openspec')` → EEXIST. The defense works (PLANTED was not created); the scenario collides with the name. | test |
| C | windows / 22 | `exec.test.js:69` "no PATH entry inside the project counts" (`projectOnlyHit`) | `os.tmpdir()` on the runner is 8.3 (`RUNNER~1`); `exec.js` returns `realpathSync.native` (`runneradmin`). The `resolveBin` and `safePathDirs` assertions pass; only the expected path's formatting differs. Fix: canonicalize `sandbox` in the test. | test |
| D | macOS / 22 | `cli.test.js:1343` and the test right after it (doctor: resolved config; nested config) | `/var` → `/private/var`: doctor prints the realpath, the test expects the raw path. Same fix as C. | test |
| E | macOS / 22 | `cli.test.js:1168` "--dry-run judges the settings it would write" (meu-time forwarder) | dry-run says "kept meu-time-hook.js: /private/var/…/settings.json still runs meu-time-hook.js" instead of "would remove". It compares the settings path it would write (raw) with one that went through realpath. Hits a real user with a symlinked HOME. | **product** (`bin/cli.js`, around `:1964` `realpathSync`) |

## Open decisions (the user's)

1. **Node 18** (A): it reached EOL in 2025-04. Options: (a) switch the script to something
   that runs on 18, then see what else breaks on 18 (`node -` with ESM on stdin in
   validate.sh is a suspect); (b) drop 18 from the matrix and move `engines` to `>=20` —
   that is a public contract change → Archie.
2. B–E touch the tests of the planted-binary defense (Gard domain) and one product bug;
   fixing them in the same PR widens item 1 beyond "one workflow file".

## Also seen

- `validate.sh` passes **vacuously** without `python3`: every Python section prints
  nothing and no FAIL line appears. The workflow asserts `python3` + `tomllib` in its own
  step; the script itself should fail when `python3` is missing (small fix, separate).

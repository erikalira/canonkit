# Proposal

## Why

`npm test` takes about 12 minutes, which discourages running it and delays every change. Profiling (Bob, read-only, on a CPU-saturated machine, so absolute times are inflated 2-3x and only the ranking is reliable) shows five of 24 files hold nearly all the time: `cli.test.js`, `security-cli.test.js`, `uninstall.test.js`, `stack-packs.test.js` and `canonkit-hook.test.js`. The other 18 files total about 2 minutes.

The cause is not JavaScript. Each fresh `install` spawns about 3 s of real child processes: `powershell.exe` and `icacls.exe`/`whoami.exe` to apply the private ACL, and `claude --version`/`--help` against the developer's real `claude` binary. Tests also run sequentially inside each file, and the CLI helpers use blocking `spawnSync`, so wall time equals the longest file.

## What Changes

- Make runtime-model discovery deterministic in CLI tests by giving every test a test-owned `PATH` that contains no `claude`/`codex` by default, with stub binaries only where a test asserts discovered output.
- Stub the Windows ACL hardening spawns in CLI tests through a test-only `node --import` preload; production code gains no new branch, flag or environment variable.
- Keep real ACL coverage: at least one Windows test without the preload that reads the resulting DACL back from disk.
- Move the CLI test helpers (`run`, env isolation, scratch HOME, stub-bin builders, preload argument) into one shared module and split the longest files into several files by describe group so Node runs them in parallel.
- Replace per-id stack-pack loops with one real end-to-end install per pack kind plus in-process validation of the rest, and share one install through `before()` only for read-only groups. Applied only where measurement shows a file is still the bottleneck.
- Add a fast tier (`test:fast`) for the small files; `npm test` remains the full publish gate.
- Add one structural test that fails if a test file outside the helpers spawns `bin/cli.js` directly.
- Precondition, separate LOW commit: fix the stale expectation in `test/security-cli.test.js` ("no-repository installation adds no project fallback and dry run writes nothing") so there is a green baseline.

Targets on an idle machine: full suite about 4 minutes or less, fast tier about 2 minutes or less. These are goals to be measured, not promises.

## Capabilities

### New Capabilities
- `test-suite-execution`: how the repository's automated tests are isolated, tiered and kept fast without losing real end-to-end coverage of the CLI, filesystem and security controls.

### Modified Capabilities
<!-- None: no existing requirement changes. -->

## Impact

- `test/` (new `test/helpers/cli-harness.js`, `test/support/stub-acl.mjs`, new `test/e2e/` directory, split files), `package.json` scripts (`test:fast`, `test`).
- No change to `bin/` production code, shipped files, public contracts or CI matrix. `prepublishOnly` keeps running the full suite.
- Owners: Gard reviews the ACL stub and the real-ACL coverage (the change alters what verifies a security control); Quinn confirms no coverage is lost. Risk is MEDIUM; it would become HIGH if an environment-variable seam in production code were adopted, which this change rejects.
- Out of scope: in-process `main()` calls, async spawn helpers, Defender/antivirus exclusions, batching the production PowerShell calls, CI changes, changing the test framework, dropping assertions.

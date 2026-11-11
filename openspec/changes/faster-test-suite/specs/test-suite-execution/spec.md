# Spec Delta

## Purpose

Keep the automated test suite fast enough to run routinely while preserving real end-to-end coverage of the CLI, the filesystem and the security controls it verifies.

## ADDED Requirements

### Requirement: Full suite remains the publish gate
`npm test` SHALL run every test file, including slow end-to-end files, and `prepublishOnly` SHALL keep running it.

#### Scenario: Publishing
- **WHEN** the package is prepared for publish
- **THEN** the full suite runs and any failure blocks the publish

### Requirement: Fast tier for the inner loop
The repository SHALL provide a `test:fast` command that runs only the small unit and integration files and excludes the slow end-to-end directory.

#### Scenario: Developer runs the fast tier
- **WHEN** a developer runs `npm run test:fast`
- **THEN** no file under the end-to-end directory runs
- **AND** the command finishes in about 2 minutes or less on an idle machine

#### Scenario: Slow file moved between tiers
- **WHEN** a test file is placed in the end-to-end directory
- **THEN** it runs in the full suite and not in the fast tier, without any tag or name filter

### Requirement: Deterministic runtime discovery in CLI tests
CLI tests SHALL run with a test-owned `PATH` that contains no `claude` or `codex` binary unless the test installs a stub there.

#### Scenario: Default CLI test
- **WHEN** a CLI test runs `install` without installing a stub
- **THEN** discovery reports the runtime as not found on `PATH`
- **AND** the developer's real `claude` or `codex` is never executed

#### Scenario: Test asserting discovered output
- **WHEN** a test places a stub `claude` or `codex` on the test `PATH`
- **THEN** discovery uses that stub, including the Windows `.cmd` shim path

### Requirement: ACL stubbing is test-only and absent from shipped code
CLI tests MAY stub the Windows ACL tool spawns only through a preload file in the repository passed as a `node` argument. Shipped code SHALL NOT read any variable or flag that disables ACL hardening.

#### Scenario: Preload applied
- **WHEN** a CLI test spawns the CLI with the preload
- **THEN** only calls to the absolute System32 `powershell.exe`, `icacls.exe` and `whoami.exe` are answered by the stub
- **AND** every other spawn passes through unchanged

#### Scenario: Real install
- **WHEN** the CLI runs without the preload
- **THEN** ACL hardening runs exactly as before this change

#### Scenario: Preload stops matching
- **WHEN** production code changes how it invokes the ACL tools
- **THEN** the preload no longer intercepts them and the tests become slower, not falsely green

### Requirement: Real ACL coverage is retained on Windows
At least one test SHALL run on Windows without the preload and verify the resulting permissions by reading them back from disk.

#### Scenario: Install, reinstall and uninstall round trip
- **WHEN** the unstubbed test installs, reinstalls and uninstalls in an isolated HOME
- **THEN** the state directory and the backups directory have inheritance protected
- **AND** the state directory, the backups directory, each backup and the manifest grant access only to the user's SID, S-1-5-18 and S-1-5-32-544
- **AND** files inside a private directory may inherit that ACL instead of carrying a protected one of their own

### Requirement: Real end-to-end behavior is preserved
The suite SHALL keep exercising the CLI as a subprocess with real argv, exit codes, stdout/stderr, a real filesystem in an isolated HOME, an install-reinstall-uninstall round trip with byte checks, hook execution, and at least one install per stack-pack kind.

#### Scenario: Stack packs
- **WHEN** the suite runs
- **THEN** each stack-pack kind has at least one real CLI install test

#### Scenario: Test count
- **WHEN** the refactor is complete
- **THEN** every test title present before still exists and passes, and any assertion moved from end-to-end to in-process is listed in the change

### Requirement: CLI spawns go through the shared harness
Test files outside the helpers directory SHALL NOT spawn `bin/cli.js` directly. A structural test SHALL fail when one does.

#### Scenario: Direct spawn added
- **WHEN** a test file outside the helpers directory spawns `bin/cli.js` itself
- **THEN** the structural test fails and names the file

#### Scenario: Environment isolation
- **WHEN** a test spawns the CLI through the harness
- **THEN** `NODE_OPTIONS`, `NODE_PATH` and `CLAUDE_CONFIG_DIR` are removed from the inherited environment

### Requirement: No wall-clock test budget
The suite SHALL NOT include a test whose outcome depends on elapsed time. Timing SHALL be recorded as a manual measurement in the change.

#### Scenario: Slow machine
- **WHEN** the suite runs on a loaded machine
- **THEN** no test fails only because it took too long

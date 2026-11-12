# Tasks

## 1. Security review before code

- [x] 1.1 Gard reviews this design for the repository-write risk (`.git/hooks`, `.git/config`, project scripts run outside the sandbox) and either clears it or names the doc/limit to add. Verify: a written Gard finding with a clear/doc decision; no code starts before it. Gard approved with conditions; the working-directory write scope and unverified runtime containment are recorded in `design.md` and will be stated in `docs/install.md`.

## 2. Default value

- [x] 2.1 In `compileSecurity`, write `autoAllowBashIfSandboxed: true` only in the strict-profile branch when neither project nor user defines it; keep preserving any explicit value and its gap record. Verify: `test/security.test.js` cases for new project, existing `true`, existing `false` (preserved), user-scope value inherited, and unsupported capability/version/Windows (key not written). Verified by `node --test test/security.test.js`.
- [x] 2.2 Confirm receipts, dry run and uninstall treat the new value like any owned key. Verify: install then uninstall in a fixture project leaves settings as before; dry run prints the would-apply line. Final `node --test test/e2e/security-cli.test.js` passed 29/29; dry run previews the setting conditionally at the supported Claude floor without probing the version, and unknown local policy suppresses preview and default.

## 3. Diagnostics

- [x] 3.1 Warn `approval-mode` for automatic approval only when the strict profile is incomplete (sandbox off, fail-if-unavailable off, or unsandboxed retries allowed). Verify: assessment tests for strict profile (no warning) and for each missing element (warning). Verified by `node --test test/security.test.js`.

- [x] 3.2 Report the recommendation to set `true` in `install` and `doctor` when an explicit `false` coexists with the full strict profile, without writing the file. Verify: tests show the recommendation for that case only, and the settings file is byte-identical afterwards. The targeted E2E assertions passed for project and user settings, including byte-identical doctor reads.

## 4. Documentation

- [x] 4.1 Update the `autoAllowBashIfSandboxed` row and surrounding text in `docs/install.md`: new default, conditions, how to set `false`, and the optional `permissions.ask` entries for `git commit` and `git push` (only after the Claude Code settings reference confirms their precedence). Verify: text matches the spec; `npm run validate` passes. Claude Code reference checked; `npm run validate` passed with its portable-mode Bash-syntax warning.
- [x] 4.2 Correct `docs/plans/wsl-resolvers-handoff.md` and `docs/plans/release-3.1.0-handoff.md`, which say the project has `false`; add a release note for the reversed default. Verify: no remaining doc states that canonkit never enables sandbox automatic approval (search the repository's docs and `reference/`). Historical 3.0.0 behavior is retained as release history.
- [x] 4.3 Propose, and apply only after the user agrees, any AGENTS/CLAUDE or skill text this makes wrong. Verify: search for statements about "regular permission review" outside `openspec/changes/archive/`. No AGENTS/CLAUDE or skill text requiring a change was found; the remaining 3.0.0 release note describes historical behavior.

## 5. Closure

- [x] 5.1 Run `npm test`, then request independent review (Gard for security, after the last edit). Verify: tests green and the reviewer's report covers the final diff. `npm test` passed 1169 tests (1148 passed, 21 skipped, 0 failed); Gard's final independent review was clear with no blocking findings.

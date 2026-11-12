# Tasks

## 1. Security review before code

- [ ] 1.1 Gard reviews this design for the repository-write risk (`.git/hooks`, `.git/config`, project scripts run outside the sandbox) and either clears it or names the doc/limit to add. Verify: a written Gard finding with a clear/doc decision; no code starts before it.

## 2. Default value

- [ ] 2.1 In `compileSecurity`, write `autoAllowBashIfSandboxed: true` only in the strict-profile branch when neither project nor user defines it; keep preserving any explicit value and its gap record. Verify: `test/security.test.js` cases for new project, existing `true`, existing `false` (preserved), user-scope value inherited, and unsupported capability/version/Windows (key not written).
- [ ] 2.2 Confirm receipts, dry run and uninstall treat the new value like any owned key. Verify: install then uninstall in a fixture project leaves settings as before; dry run prints the would-apply line.

## 3. Diagnostics

- [ ] 3.1 Warn `approval-mode` for automatic approval only when the strict profile is incomplete (sandbox off, fail-if-unavailable off, or unsandboxed retries allowed). Verify: assessment tests for strict profile (no warning) and for each missing element (warning).

- [ ] 3.2 Report the recommendation to set `true` in `install` and `doctor` when an explicit `false` coexists with the full strict profile, without writing the file. Verify: tests show the recommendation for that case only, and the settings file is byte-identical afterwards.

## 4. Documentation

- [ ] 4.1 Update the `autoAllowBashIfSandboxed` row and surrounding text in `docs/install.md`: new default, conditions, how to set `false`, and the optional `permissions.ask` entries for `git commit` and `git push` (only after the Claude Code settings reference confirms their precedence). Verify: text matches the spec; `npm run validate` passes.
- [ ] 4.2 Correct `docs/plans/wsl-resolvers-handoff.md` and `docs/plans/release-3.1.0-handoff.md`, which say the project has `false`; add a release note for the reversed default. Verify: no remaining doc states that canonkit never enables sandbox automatic approval (search the repository's docs and `reference/`).
- [ ] 4.3 Propose, and apply only after the user agrees, any AGENTS/CLAUDE or skill text this makes wrong. Verify: search for statements about "regular permission review" outside `openspec/changes/archive/`.

## 5. Closure

- [ ] 5.1 Run `npm test`, then request independent review (Gard for security, after the last edit). Verify: tests green and the reviewer's report covers the final diff.

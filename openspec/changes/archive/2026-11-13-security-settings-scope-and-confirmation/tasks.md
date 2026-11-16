# Tasks

## 1. Empty settings files

- [x] 1.1 Add a shared settings-text reader in `bin/security.js` (strip BOM, empty or whitespace-only text reads as `{}`) and use it in `parseSecuritySettings`. Verify with new cases in `test/security.test.js`: 0 bytes, `"  \n"` and BOM-only parse to `{}`, and `"{"` still throws "Invalid JSON".
- [x] 1.2 Use the same reader in `readHooksFileForWiring` (`bin/cli.js`) and in the doctor settings readers. Verify with a `test/e2e/security-cli.test.js` case: `install` and `install --wire-hooks` succeed on an emptied repository and user `settings.json`, and the written file is valid JSON with only the planned keys.

## 2. Weaker-value detection in the compiler

- [x] 2.1 Make `compileSecurity` return a `weaker` list (`path`, `current`, `recommended`, `source` project/user/local) for `sandbox.enabled`, `failIfUnavailable`, `allowUnsandboxedCommands`, `autoAllowBashIfSandboxed` and both `block*` keys, without changing its current output data. Verify in `test/security.test.js` that each weaker key is listed with the right source, and that existing compile tests still pass unchanged.
- [x] 2.2 Add the single reason table (key → recommended value, one-line reason) in `bin/security.js` that the prompt and README both consume. Verify that a unit test asserts every key in the strict profile has exactly one entry.

## 3. Runtime read exceptions

- [x] 3.1 Implement runtime-root detection per design D1 (nvm via `$NVM_DIR`/`~/.nvm`, pipx bin and venv root), using the existing Windows-PATH-filtered lookup and `realpath`, and returning unhandled locations separately. Verify with fixture-home tests in `test/security.test.js` for nvm, both pipx layouts, an unknown manager under home (reported, not proposed) and a system `/usr/bin/node` (nothing proposed).
- [x] 3.2 Implement path-based coverage per D2 (tilde expansion, absolute resolve, trailing separator, case-insensitive on Windows, ancestor covers descendant, home-or-above is broad). Verify with table tests: `~/.nvm` vs `/home/u/.nvm/` covered, `~/.local` covers `~/.local/bin`, `~` flagged broad.
- [x] 3.3 Extend the user plan (`compileNetworkSecurity` or a sibling compiler) to propose only uncovered items, appended in `~/` form after existing entries, gated on sandbox capability, non-Windows and the sandbox version floor. Verify that a unit test shows "everything covered" produces no change and no rewrite, and that native Windows or an unknown version propose nothing.
- [x] 3.4 Add array-item ownership per D3 and combine it with the `strictAllowlist` scalar ownership for the user settings catalog entry, including metadata validation. Verify in `test/install-manifest.test.js` and `test/e2e/uninstall.test.js` that uninstall removes only appended items, keeps user-added and preexisting entries, drops empty parents only when they did not exist before, and refuses invalid metadata.

## 4. Install security review step

- [x] 4.1 Add the review step in `install` after preflight and before the first write, with the two grouped prompts from D4 (runtime reads `[y/n]`, weaker repository values Apply/Keep/Choose per key), driven through `confirmAction` plus a new `choose` seam. Verify in `test/e2e/security-cli.test.js` that "apply" writes the recommended values, "keep" leaves files byte-identical, "choose" writes only the chosen keys, and declining runtime reads prints the snippet.
- [x] 4.2 Apply answers to the plans per D5: an `autoAllow… false` from user or project scope writes `true` to the project file on "change", and weaker values from local settings are reported only. Verify with the 3.0.0 → current upgrade fixture: `autoAllowBashIfSandboxed: false` in the project is offered, switched on "apply" and preserved on "keep", and a `settings.local.json` weaker value is never written.
- [x] 4.3 Keep non-interactive behavior identical to 3.1.0 for each key (`--yes`, no TTY, `--dry-run`, `TERM=dumb`). Verify with one regression test per key in `test/e2e/security-cli.test.js` and a dry-run test showing the plan with no writes and no prompt.
- [x] 4.4 Ask nothing when nothing is weaker or missing. Verify that an e2e test on an already-recommended setup shows no prompt and an idempotent second install.

## 5. Doctor

- [x] 5.1 Add runtime read coverage to the doctor security report: WARN for each missing item with the snippet or `canonkit install`, WARN for a home-level `allowRead`, and no warning when covered. Verify with cases in `test/doctor-report.test.js` and `test/e2e/cli-doctor.test.js`, and confirm doctor writes nothing.
- [x] 5.2 Make doctor's existing auto-approval recommendation mention that `canonkit install` now offers the change interactively. Verify with an updated assertion in `test/e2e/cli-doctor.test.js`.

## 6. Documentation

- [x] 6.1 Add the "Recommended security settings" section to `README.md` between `<!-- canonkit:security-settings:start/end -->` markers: user and repository `settings.json` side by side, one-line reasons from the reason table, nvm/pipx example values marked as detected per machine, and a link to `docs/install.md`. Verify by reading the rendered section and running the check from 6.2.
- [x] 6.2 Add a README drift check to `scripts/validate.mjs` that compiles both plans against a fully supported Linux fixture and compares JSON blocks and reasons (allowRead by presence only). Verify that `npm run validate` passes, and fails when one README value is changed by hand (covered by a case in `test/validate.test.js`).
- [x] 6.3 Update `docs/install.md` (review prompt, non-interactive behavior, scope split, empty files) and `docs/tools.md` (the sandbox note becomes "install offers this; manual snippet if declined"). Update the release notes. Verify that the documented commands and prompt text match the e2e test fixtures.
- [x] 6.4 Bump the version to 3.1.1 in `package.json` and `package-lock.json`, and add a 3.1.1 entry to the release notes (where the 3.1.0 notes live), covering the review prompt, runtime `allowRead`, empty settings files, the README section and the 3.0.0 leftover `autoAllowBashIfSandboxed: false`. Verify that `npm run pack:dry` reports `canonkit@3.1.1` and that the notes link the change.
- [x] 6.5 Propose (do not apply without the user's agreement) any AGENTS.md or CLAUDE.md wording that this change makes wrong, per the team rule on AI instructions.

## 7. Project allowRead verification

- [x] 7.1 Verify design D7 in a scratch repository: user settings without `~/.nvm`, project settings with `allowRead: ["~/.nvm"]`, and the read block on; run `node --version` inside a sandboxed session. Record the result in design.md. If the read is refused, remove the entry from this repository's `.claude/settings.json`. Either way, make the comment in `compileSecurity` match the observed behavior.

## 8. Integration and review

- [x] 8.1 Run `npm test` and `npm run validate` after the last edit and verify both pass, with the output recorded in the change summary.
- [x] 8.2 Run `graphify update .` after the code changes and verify the graph rebuild completes.
- [x] 8.3 Obtain Gard's independent security review after the last edit (HIGH: permissions and security policy) and Spencer's review of README/docs, resolve findings, and run the Integration Review from the `orchestrate` skill. Verify that the review notes are recorded with no open blocking finding.

# Tasks

Risk: HIGH (sandbox permissions in user settings). Gard owns the security judgment. Bob
implements. An independent reviewer (Gard for security, Quinn for acceptance) reviews after the
last edit.

## 1. Security review of the plan

- [x] 1.1 Gard reviews proposal, design and specs (exposure statement, folder scope, opt-in paths, receipt trust). Findings are applied to the artifacts before code. Verify: Gard's report has no open blocking finding. Done 2026-11-16: approved with conditions. F1 (exposure statement) was blocking and is applied. F2–F6 are applied to the design, specs and these tasks.

## 2. Core: telemetry read item (bin/security.js)

- [ ] 2.1 Add `TELEMETRY_READ_ITEM` and a pure `compileTelemetryRead` that reuses the runtime-read gating and coverage (capability, win32, version floor, ambiguous settings, equivalent or broader entry). Verify: new `test/security.test.js` cases for not covered, covered by an equivalent spelling, covered by `~/.claude`, ambiguous settings, win32, below the floor, Claude absent, look-alikes (`canonkit-activity2`, `canonkit-activity-evil`, `canonkit-activity/../x`) not covering, and a symlinked folder or `~/.claude` (`lstat`) not offered.
- [ ] 2.2 Add `TELEMETRY_READ_ITEM` to the `trustedOwnedAllowRead` producible set. Verify: a test shows a receipt item is trusted while `~/.claude` and `~/.claude/canonkit-activity/..` spellings are not.
- [ ] 2.3 Define the canonical exposure sentence (design Decision 3) once, as a constant reused by the menu and doctor. Verify: a test asserts that the menu and doctor text name project names and file paths, not only session IDs.

## 3. Install flow (bin/cli.js)

- [ ] 3.1 In `prepareSecurity`, compile the telemetry read when the Claude target is selected, and keep it out of the recommended-setup rows and `runtimeReads`. Verify: a test shows the recommended-setup row list never contains the item.
- [ ] 3.2 In `reviewSecurity` customize, add the separate menu ("Keep closed" preselected, exposure text, EOF declines, Ctrl-C aborts). Verify: interactive tests for opt-in, Enter, EOF and already covered.
- [ ] 3.3 In `applySecurityAnswer`, append the item only through the dedicated predicate `selectedRows.includes("telemetry:~/.claude/canonkit-activity")`, outside `checked()` and never by `path`. Verify: tests for *Yes*, keep current, `--recommended`, `--yes`, no terminal and dry run leave user settings without the item and print the snippet plus the customize hint. Also verify `securityAnswer: "recommended"` with crafted `selectedRows`, `--recommended` with a receipt from an earlier opt-in, and *Yes* after the entry was removed by hand: none of them writes it.
- [ ] 3.4 Verify receipt and undo end to end (`test/e2e/security-cli.test.js` or `test/e2e/uninstall.test.js`). Opt in, then uninstall, removes only the item. Re-install after opt-in offers nothing, does not rewrite the file and keeps ownership. A user-added identical entry is not claimed and survives uninstall.

## 4. Doctor

- [ ] 4.1 Add the `security claude telemetry-read` OK row (closed by choice / readable) gated on the sandbox being enabled in a loaded scope and the Claude install being present. Verify: `test/doctor-report.test.js` and doctor e2e cases for both states, not applicable, an unchanged exit code, and no filesystem-exceptions warning for a receipt-owned item.

## 5. Documentation

- [ ] 5.1 `docs/tools.md` (Claude Code sandbox section): the opt-in telemetry entry, the canonical exposure sentence, that it lives in user settings, that it follows symlinks (so install does not offer it through one), and the alternative of running the dashboard from your own terminal. Verify: the snippet and sentence match what install prints.
- [ ] 5.2 `docs/telemetry.md`: who can read the folder after opt-in, the canonical sentence (and that new `gate` records still keep `file` paths and `project`, since L4-5 today mentions only `detail` and `task`), and the observed sandboxed-client-to-sandboxed-server `127.0.0.1` limitation. `docs/install.md`: the customize question and that *Yes*/`--recommended` never add it. Verify: Spencer's drift check against the implemented messages.
- [ ] 5.3 Release notes entry. Verify: Spencer confirms it is present.

## 6. Integration and closure

- [ ] 6.1 Run the touched tests and their consumers (`test/security.test.js`, `test/doctor-report.test.js`, `test/e2e/security-cli.test.js`, `test/e2e/cli-unified-install.test.js`, `test/e2e/uninstall.test.js`). Check that the fixtures set the sandbox capability and Claude version explicitly, for the Ubuntu, macOS and Windows matrix. Verify: all pass.
- [ ] 6.2 Independent review after the last edit: Gard (security) and Quinn (acceptance against these specs). Verify: no open blocking finding. Any edit after the review triggers a new review.
- [ ] 6.3 Integration Review and Spencer's drift check (orchestrate skill) before sync/archive. Run `graphify update .`. Delete `docs/plans/telemetry-sandbox-read-handoff.md` once the change is archived. Verify: `openspec validate telemetry-sandbox-read --strict` passes.

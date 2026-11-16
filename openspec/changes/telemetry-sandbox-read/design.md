# Design

## Context

See proposal.md (Why). Relevant current state, verified in code on 2026-11-16:

- `prepareSecurity` (`bin/cli.js` ~L629-635) compiles `globalPlan.runtimeReads` from
  `withModelsRead(detectRuntimeRoots(...))` and turns each proposed item into a row with
  `answerKey: runtime:<item>`. The recommended-setup *Yes* and `--recommended` check every row,
  so `applySecurityAnswer` appends all of them (`~L750-754`). `~/.canonkit/models.json` takes this
  path. It is the precedent for plumbing, not for consent.
- `reviewSecurity` (`~L780-840`) asks no security question after *Yes* or keep current. In
  customize it asks one "Add detected runtime reads?" menu (Yes preselected) and one multi-select.
- `applyRuntimeReads` appends items. `networkSecurityOwnership` records them as `appendedItems`
  under `sandbox.filesystem.allowRead` in the user-settings receipt, and `undoOwned` removes each one
  only when it is still present exactly once.
- `trustedOwnedAllowRead` (`bin/security.js` ~L599) filters receipt items against a `producible`
  set before `assessClaude` uses them to silence the "explicit outside filesystem exceptions"
  warning.
- Doctor (`~L2706-2718`) checks runtime reads and the models file. Its statuses are only
  OK/WARN/FAIL (exit 1 on any FAIL). It has no INFO level.
- `docs/tools.md` records that a project-level `allowRead` was ignored on WSL2 with
  `blockReadsOutsideWorkingDirectories`, so the entry belongs in user settings.

## Goals / Non-Goals

**Goals:**
- Reuse the runtime-read plumbing (append, receipt, undo, coverage, broad check) for one more
  fixed item, with consent on a separate, default-off path.

**Non-Goals:**
- No change to which runtime reads are recommended, or to the models.json behavior.
- No change to what the hooks record, to rotation, or to the dashboard. Reducing what telemetry
  exposes is a separate concern.
- No fix for the sandboxed-client-to-sandboxed-server `127.0.0.1` limitation. It is documented
  only.
- No project-level `allowRead`, and no `~/.claude` entry.

## Decisions

1. **A separate item list, not `withModelsRead`-style injection into `detected.roots`.** Adding
   the item to the runtime roots would put it on the *Yes*/`--recommended` path. Instead,
   `bin/security.js` exports `TELEMETRY_READ_ITEM = "~/.claude/canonkit-activity"` and a pure
   `compileTelemetryRead(data, environment, { claudeInstalled })`. It reuses the gating and coverage
   logic of `compileRuntimeReads` (capability, not win32, version floor, ambiguous settings, item
   covered by an equivalent or broader entry) and returns `{ proposed: boolean, covered, gaps }`.
   Its row uses `answerKey: "telemetry:~/.claude/canonkit-activity"` and `selectable: false` in the
   recommended-setup list, so it is not rendered among the rows *Yes* applies.
   *Alternative:* a flag on runtime roots (`optIn: true`) filtered by every consumer. Rejected: each
   current and future consumer of `runtimeReads.proposed` would have to remember the filter, and a
   missed filter turns opt-in into default-on.

2. **A dedicated predicate, outside `checked()`.** `checked()` returns true for
   `securityAnswer === "recommended"` and for `selected.has(row.path)`, so either could turn the item
   on by default. `applySecurityAnswer` therefore appends the telemetry item only when
   `selectedRows.includes("telemetry:~/.claude/canonkit-activity")`. It never routes the item
   through `checked()` and never matches it by `path`. Tests pin this, including
   `securityAnswer: "recommended"` with crafted `selectedRows`, and `--recommended` with a receipt
   from an earlier opt-in.

3. **Asked only in customize, with "Keep closed" preselected.** The existing contract says no
   security question follows *Yes* or keep current (install-guided-setup, environment-security-policy).
   Asking after *Yes* would break it. Asking only in customize keeps it, and the *Yes* and keep-current
   outputs print one line with the snippet and "choose *No, customize* to add it". EOF counts as
   declining. Ctrl-C aborts as for every security menu.

   **One canonical exposure sentence.** It is used verbatim in the menu, the doctor line,
   `docs/tools.md` and `docs/telemetry.md`. It is verified against `hooks/canonkit-hook.js`, where
   current `gate` records still carry `file` (secret-block and secret-ask included) and `project`:
   > Every sandboxed command could read your activity history: session IDs, project names, agent
   > names, and the paths of files that gates flagged, including secret-looking files. Older
   > records can also hold the first 80 characters of commands and dispatch descriptions. It holds
   > no prompts and no tool output.

   The menu adds the alternative: run the dashboard from your own terminal.

7. **No offer through a symbolic link.** `normalizeReadPath` is lexical, while the sandbox resolves
   links. If `~/.claude/canonkit-activity` or `~/.claude` is a symlink (`lstat`), the entry could
   expose its target, so install does not offer the item. It prints the reason and the snippet
   instead, and `docs/tools.md` says the entry follows symlinks.

4. **Folder, not files.** One entry covers `events.jsonl`, `tool-results.jsonl`, their rotated
   `.1` files and `context-bands.json`. The hook may add files over time. `context-bands.json` holds
   no more than the other files. The exact folder is the narrowest entry that keeps working.
   Accepted cost: the folder also exposes future files, the unpruned `.1` rotations and the
   1.1.5-era `tool_result` lines still in `events.jsonl`. The exception opens reads only, and writes
   to `~/.claude` stay denied. canonkit does not change the folder's file mode. The sandbox exception
   does not widen POSIX access, but other local users may already be able to read the default-mode
   files.

5. **Ownership and undo reuse the existing array record.** The item is appended through
   `applyRuntimeReads` into the same `sandbox.filesystem.allowRead` record, and `TELEMETRY_READ_ITEM`
   joins the `producible` set of `trustedOwnedAllowRead`. Uninstall then removes it under the existing
   "still present exactly once" rule.

6. **Doctor reports OK, never WARN, and still names the exposure.** The user asked for an informational line. Doctor has no INFO
   status, and adding one would change the report's rendering and summary contract. An OK row
   (`security claude telemetry-read`) carries neutral text in both states: "closed to sandboxed
   commands (opt-in) …" or "readable by sandboxed commands …". It appears only when some loaded
   scope sets `sandbox.enabled: true` and the Claude install is present (the dashboard directory or
   the hook registration from the receipt).

## Risks / Trade-offs

- [The opt-in is skipped because the question is only in customize] → *Yes* and keep current
  print the snippet and name customize. Doctor shows the state. The docs explain it. A missed
  opt-in costs convenience, and a default-on costs exposure.
- [A later refactor routes the item through the *Yes* path] → a test asserts that *Yes*,
  `--recommended`, `--yes`, no-terminal and dry-run runs never write it, and that the
  recommended-setup row list never contains it.
- [After opt-in, every sandboxed command, including one run by a prompt-injected agent, can read a
  map of which sensitive files were touched, project names and the dispatch pattern] → this is the
  accepted trade-off. The canonical sentence (Decision 3) states it in the menu, doctor and docs.
  The entry is never broader than the folder. Gard reviewed the statement (task 1.1).
- [A receipt claims the item as owned without canonkit adding it] → it only silences the doctor
  exception warning for that exact path, the same trust model as models.json. Undo still removes
  only an item present exactly once.
- [An existing `~/.claude` entry already covers it] → it counts as covered and nothing is offered.
  Doctor does not judge `~/.claude` as broad, which is unchanged behavior.

## Migration Plan

Additive. Existing installs see one new OK doctor line and, in the next customize review, the
new question. Rollback: revert the release. Items already appended stay owned in the receipt and
are removed by uninstall. They can also be removed by hand from `~/.claude/settings.json`.

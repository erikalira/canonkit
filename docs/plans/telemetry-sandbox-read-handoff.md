# Handoff: opt-in sandbox read for `~/.claude/canonkit-activity`

Date: 2026-11-16. Origin: task 3.5 of `openspec/changes/live-development-observatory`.

## Problem

With the Claude Code sandbox denying reads of the home directory, a sandboxed
shell cannot read `~/.claude/canonkit-activity/` (hook telemetry). An agent that
runs the dashboard (`node dashboard/serve.js`) or reads the telemetry, such as the
Learning Loop, sees the folder as missing. The user had to add
`"~/.claude/canonkit-activity"` to `sandbox.filesystem.allowRead` in
`~/.claude/settings.json` by hand. Running the dashboard from the user's own
terminal (the documented path) is unaffected, and the hooks write outside the
sandbox.

## Current state (verified in code)

- `canonkit install` proposes `allowRead` only for detected runtime roots (nvm,
  `~/.local/bin`, pipx) and `~/.canonkit/models.json`:
  `bin/cli.js` `prepareSecurity` (~L628-635), `bin/security.js`
  `MODELS_READ_ITEM` / `withModelsRead` (~L452-463), and the `producible` set
  (~L600).
- `doctor` checks the same items (`bin/cli.js` ~L2709-2717) and does not
  mention the telemetry folder.
- `docs/tools.md` (~L116-154) documents the allowRead rules. It records that a
  project-level `allowRead` was ignored on WSL2 with
  `blockReadsOutsideWorkingDirectories`, so the entry belongs in user settings.

## Decision taken

The user chose a new OpenSpec change for an **opt-in** proposal: install offers the
entry with confirmation, following the `models.json` precedent; doctor warns when it
is missing, only where it applies; docs explain the trade-off.

## Constraints

- This is a permissions change, so risk is HIGH: Gard owns it, and an independent
  review is required after the last edit.
- Opening the folder lets every sandboxed command read session IDs, and, in older
  records, paths and command fragments. Never propose it silently or by default,
  and never broaden it to `~/.claude`.
- Never edit the user's settings without confirmation (the existing review flow).

## Open questions for the new change

- Should doctor warn only when the dashboard or Learning Loop is installed, or always?
- Should `tool-results.jsonl` and `context-bands.json` be covered by the same
  folder entry? (They are in the same folder today.)
- Side observation: after the settings edit, sandboxed `curl` could no longer reach
  a server started by another sandboxed command on `127.0.0.1:4317`; Chrome
  outside the sandbox could. If agent-run dashboards matter, document this.

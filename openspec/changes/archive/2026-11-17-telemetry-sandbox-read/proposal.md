# Proposal

## Why

When the Claude Code sandbox denies reads of the home directory, sandboxed commands cannot see
`~/.claude/canonkit-activity/` (hook telemetry). An agent that runs the dashboard
(`node dashboard/serve.js`) or reads the telemetry, such as the Learning Loop, sees the folder as
missing, and the user had to add the `allowRead` entry to `~/.claude/settings.json` by hand
(origin: task 3.5 of `live-development-observatory`; handoff in
`docs/plans/telemetry-sandbox-read-handoff.md`). Opening the folder also lets every sandboxed
command read the activity history: session IDs, project names, agent names, and the paths of files
that gates flagged, secret-looking files included. Older records can also hold command and
dispatch fragments. So opening it must be a deliberate choice, unlike the runtime reads install
already recommends.

## What Changes

- `canonkit install`, in an interactive terminal on a sandbox-capable platform with a supported
  Claude version, offers to append `~/.claude/canonkit-activity` to user
  `sandbox.filesystem.allowRead` through its own question. The question explains the trade-off
  and preselects "Keep closed". It is asked only in the customize review.
- The entry is never written by the recommended-setup *Yes*, `--recommended`, `--yes`, a dry run or a
  run without a terminal. Those paths print the snippet and how to opt in. It is never part of
  the runtime-read list that *Yes* and `--recommended` apply.
- When confirmed, the item is appended like the runtime reads and `~/.canonkit/models.json`:
  existing entries kept, `~/`-relative, recorded as kit-owned in the receipt, removed by
  uninstall when still unchanged, and not reported by doctor as a user-added exception.
- `canonkit doctor` reports the telemetry read as a neutral line (never WARN or FAIL) when the
  sandbox is enabled and the Claude install is present: covered or not opened (opt-in), with the
  trade-off and how to opt in.
- Documentation (`docs/tools.md`, `docs/telemetry.md`, `docs/install.md`) explains the trade-off,
  that running the dashboard from the user's own terminal needs no exception, and the observed
  limitation that a sandboxed client could not reach a dashboard served by another sandboxed command
  on `127.0.0.1`.
- Never broader than the folder: no `~/.claude` entry is proposed or written.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `environment-security-policy`: adds an opt-in, confirmed telemetry read exception that stays
  outside the recommended set.
- `security-diagnostics`: adds a non-failing diagnosis of the telemetry read exception.

## Impact

- Code: `bin/security.js` (telemetry read item, coverage check, `trustedOwnedAllowRead`
  producible set), `bin/cli.js` (`prepareSecurity`, `applySecurityAnswer`, `reviewSecurity`,
  recommended-setup and keep-current output, doctor check).
- Tests: install review, recommended/non-interactive paths, receipt and undo, doctor.
- Docs: `docs/tools.md`, `docs/telemetry.md`, `docs/install.md`, release notes.
- Risk: HIGH (sandbox permissions in user settings). Gard owns the security judgment, and an
  independent review is required after the last edit.

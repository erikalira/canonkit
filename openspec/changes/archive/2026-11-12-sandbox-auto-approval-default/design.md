# Design

## Context

See proposal.md for motivation. Observed state:

- `compileSecurity` ([bin/security.js:200-210](bin/security.js)) writes the strict profile only inside the branch where `sandboxCapability === "available-unverified"` and the Claude version meets the sandbox floor. In that branch it already sets `enabled: true`, `failIfUnavailable: true`, `allowUnsandboxedCommands: false`, then writes `autoAllowBashIfSandboxed: false` only when no higher-precedence project-local, project or user setting defines it, and records a gap when an existing value is not `false`.
- The assessment ([bin/security.js:318](bin/security.js)) warns `approval-mode` for any `true`.
- The decision being reversed lives in the archived change `environment-aware-security` (design.md) and in two requirements of `environment-security-policy`.
- The key is already in the owned list used by receipts and uninstall, so lifecycle needs no change.

## Goals / Non-Goals

**Goals**
- Auto-approval is a property of the strict profile: it is written exactly where that profile is, and nowhere else.
- No new configuration surface, flag or opt-in.

**Non-Goals**
- Writing `permissions.ask` rules for `git commit` / `git push`: owned keys today are scalar settings, and an array merge with ownership and undo is a separate design. Commit/push confirmation stays an instruction (and the optional hooks), as today.
- Changing existing installs: a `false` already on disk is preserved.
- Any change for native Windows, Codex, OpenCode or Copilot.

## Decisions

1. **Flip the default inside the existing strict-profile branch.** The conditions the proposal requires (enabled, fail if unavailable, no unsandboxed retry) are already established there, so the change is one default and the gap logic. Alternative, a separate opt-in flag, was rejected: the point is that the safe path needs no extra step.
2. **Preserve every explicit value, including a canonkit-written `false`, and recommend `true`.** Alternative, flipping a `false` that the receipt shows canonkit wrote and the user never edited, was rejected: it silently changes a security posture on upgrade. Instead, when a `false` is preserved next to the full strict profile, `install` and `doctor` say once that `true` is the recommended value and show the one-line edit; the docs say the same.
3. **Diagnostics: warn on `true` only without the full strict profile.** Today any `true` is a warning, which would flag the profile canonkit itself writes. The check reads the same settings it already collects (`enabled`, `failIfUnavailable`, `allowUnsandboxedCommands`, across scopes as the existing observed-sandbox logic does).
4. **Instruction-level confirmation for publishing is unchanged**, and the spec forbids claiming enforcement the settings do not give.
5. **Dry runs show a conditional auto-approval preview only when sandbox capability is available and no project-local, project or user setting has an explicit value.** Dry runs do not probe Claude's version, so the line names the supported version floor and remains explicitly conditional.
6. **Project-local sandbox settings participate in the eligibility and recommendation decision.** A local override that weakens any strict-profile field suppresses a new default; an unreadable or invalid local settings file also suppresses it because the effective profile is unknown. A higher-precedence local auto-approval value prevents a stale recommendation based on shared project settings.

## Risks / Trade-offs

- [Runtime sandbox is unverified; the doctor reports `shell unknown`] → `failIfUnavailable: true` and `allowUnsandboxedCommands: false` make a missing sandbox fail closed instead of running unsandboxed; the strict-profile condition is what limits the default to that case.
- [A sandboxed command can write inside the working directory, including project scripts that may later run outside the sandbox] → auto-approval removes per-command review for commands that run inside the sandbox. The working directory remains writable, so documentation must tell users to use this default only with repositories they trust and retain `false` where command review is needed. Claude Code documents protection for `.git/hooks` and `.git/config`, but canonkit reports runtime containment as unverified and must not promise those paths are protected across supported versions and environments.
- [Commit and push no longer prompt] → unchanged instruction plus documented `permissions.ask` entries; a hook-less setup relies on judgment, and the docs say so.
- [Reversing a recorded decision] → handled here as a MODIFIED delta with the reason, not a silent edit; the archived design stays as history.
- [Explicit `ask` rules may or may not outrank auto-approval] → not relied on by this change; verified against the Claude Code settings reference before the docs recommend `permissions.ask`.

## Migration Plan

New installs get `true`. Existing installs keep their value and get the recommendation to set `true`. Rollback is reverting the default, and `canonkit uninstall` removes the owned key as before.

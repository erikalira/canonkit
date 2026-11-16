## Why

On a new install, canonkit writes `sandbox.autoAllowBashIfSandboxed: false`, so every Bash command that already runs inside the sandbox still asks for approval. That is not the safer choice it was recorded as: constant prompts train users to approve without reading, push them toward broad `allow` rules or toward turning the sandbox off, and make the review that matters (publishing, destructive actions) harder to notice. The sandbox, with unsandboxed retries refused, is the boundary; asking again inside it adds friction without adding containment.

## What Changes

- On a new install where canonkit already writes the strict sandbox profile (`enabled: true`, `failIfUnavailable: true`, `allowUnsandboxedCommands: false`), it also writes `autoAllowBashIfSandboxed: true`.
- Where that profile is not written (no sandbox capability, unsupported version, native Windows), nothing changes: no auto-approval is introduced.
- An existing explicit value, project or user, is preserved as today, including a `false` written by an earlier canonkit version. When that `false` sits next to the full strict profile, install and doctor recommend setting `true` and show how, without editing the file.
- Diagnostics stop warning about automatic approval when it is paired with the strict profile, and keep warning when it is paired with anything weaker.
- Instructions still require asking before `git commit` and `git push`; this change gives that rule no new enforcement.
- **BREAKING (security default):** reverses the recorded decision that canonkit never enables sandbox-based automatic approval. Two requirements of `environment-security-policy` change.
- Documentation (`docs/install.md`, the two stale handoffs) is aligned.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `environment-security-policy`: "Native approval modes remain authoritative" and "Strict sandbox configuration preserves explicit requirements" now allow, and for the strict profile prescribe, sandbox automatic approval, with the conditions above.

## Impact

- Code: `bin/security.js` (`compileSecurity` default, assessment warning for `approval-mode`).
- Tests: `test/security.test.js` (default value, preserved values, conditions, diagnostics).
- Docs: `docs/install.md` (policy table row), `docs/plans/wsl-resolvers-handoff.md`, `docs/plans/release-3.1.0-handoff.md`, release notes.
- Risk: HIGH (security default). Needs Gard on the design and an independent review after the last implementation edit.
- Not affected: receipts and uninstall (the key is already a tracked owned key), Windows native profile, Codex/OpenCode/Copilot.

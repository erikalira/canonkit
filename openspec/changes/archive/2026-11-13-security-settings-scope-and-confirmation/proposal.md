# Proposal

## Why

Installing canonkit 3.1.0 over a 3.0.0 project silently keeps the
`sandbox.autoAllowBashIfSandboxed: false` that 3.0.0 wrote, so every sandboxed
command keeps prompting and "don't ask again" approvals pile up as project
`permissions.allow` rules. An emptied `.claude/settings.json` stops the install
with "Invalid JSON", and the runtime read exceptions that sandboxed Bash needs
(`~/.nvm`, pipx) are left as a manual step buried in `docs/tools.md`. Users also
have no single place to check what canonkit considers the secure configuration
for each settings file.

## What Changes

- **Scope split made explicit.** User settings (`~/.claude/settings.json`) hold
  machine-specific policy: `sandbox.network.strictAllowlist` and runtime
  `sandbox.filesystem.allowRead` exceptions. Repository settings hold the
  repository policy: `permissions.blockReadsOutsideWorkingDirectories`,
  `permissions.blockWritesOutsideWorkingDirectories` and the four sandbox
  switches (`enabled`, `failIfUnavailable`, `allowUnsandboxedCommands`,
  `autoAllowBashIfSandboxed`).
- **Runtime `allowRead` written to user settings.** Installation detects the
  runtime locations actually in use (the resolved `node`, installed tools such as
  graphify via pipx) and compares them item by item with the existing
  `allowRead` array. Equivalent spellings (`~/x`, absolute path, trailing slash)
  match, and an existing broader entry covers narrower ones. Only missing items
  are proposed. With a terminal, the user confirms before they are appended,
  keeping existing entries and their order. Without a terminal (`--yes`, CI,
  `--dry-run`), installation only prints the recommended snippet. Undo removes
  only the items canonkit appended.
- **Empty settings files are valid.** A 0-byte, whitespace-only or BOM-only
  `settings.json` (user or repository) is read as `{}` instead of failing, the
  same way `settings.local.json` is already handled. Genuinely malformed JSON
  still stops the install before any write.
- **Uniform confirmation for weaker existing values.** When the repository
  settings hold a value weaker than the strict profile
  (`autoAllowBashIfSandboxed: false`, `enabled: false`,
  `failIfUnavailable: false`, `allowUnsandboxedCommands: true`, or either
  `block*` set to `false`), an interactive install asks whether to keep it or
  change it. The prompt names the recommended value for a secure environment
  and says why. Without a terminal, today's behavior holds: values currently
  overwritten stay overwritten, and an explicit auto-approval value stays
  preserved, with a warning.
- **README documents the recommended settings.** A new section shows the
  recommended user and repository `settings.json` side by side, with one line
  per key on why it exists and what breaks without it, and links to
  `docs/install.md` for per-version and per-platform detail. A validation check
  compares those blocks with what the installer generates, so they cannot drift.
- **Doctor reports runtime read coverage.** `doctor` flags detected runtime
  locations missing from user `allowRead`, and `allowRead` entries broad enough
  to reopen the home directory.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `environment-security-policy`: the automatic global change grows from
  `strictAllowlist` alone to also include detected, confirmed runtime `allowRead`
  items, compared item by item. The approval-mode requirement changes from
  "explicit auto-approval value is preserved, not overwritten" to "confirmed
  interactively, preserved without a terminal". Weaker repository values gain a
  keep-or-change confirmation. Runtime exceptions become detected and confirmed
  instead of only documented. Empty settings files are accepted.
- `security-diagnostics`: diagnosis adds missing runtime read exceptions and
  over-broad `allowRead` entries to its findings.

## Impact

- Code: `bin/security.js` (`parseSecuritySettings`, `compileSecurity`,
  `compileNetworkSecurity`, ownership and undo for `allowRead` items, doctor
  assessment), `bin/cli.js` (`prepareSecurity`, install prompts and
  non-interactive paths, doctor output).
- Tests: security unit tests, install e2e tests for interactive and
  non-interactive paths, the 3.0 to 3.1 upgrade case, empty-file cases, and a
  README drift check in `scripts/validate.mjs`.
- Docs: `README.md` (new recommended-settings section), `docs/install.md` and
  `docs/tools.md` (runtime exceptions no longer a manual step), release notes.
- This repository's own `.claude/settings.json` holds a project-scope
  `allowRead: ["~/.nvm"]` that becomes redundant once the user-scope entry
  exists. Whether Claude Code ignores project `allowRead` under the
  working-directory read block is unverified and is to be settled in design.
- Risk: HIGH (permissions and security policy). It needs Gard's independent
  review after the last edit, and Spencer owns the README/docs impact.

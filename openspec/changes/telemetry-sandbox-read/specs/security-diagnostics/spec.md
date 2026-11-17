# Spec Delta

## ADDED Requirements

### Requirement: Telemetry read exception is diagnosed without failing
When a loaded Claude settings scope enables the sandbox and the Claude install is present, `doctor` SHALL report whether `~/.claude/canonkit-activity` is covered by the effective user `sandbox.filesystem.allowRead`. The report SHALL never be WARN or FAIL, because leaving the folder closed is a valid choice. It MUST NOT edit settings.

#### Scenario: Folder not opened
- **GIVEN** the sandbox is enabled and the folder is not covered
- **WHEN** `doctor` runs
- **THEN** it reports an OK line saying the telemetry folder is closed to sandboxed commands by choice, what opening it exposes, and that the `canonkit install` customize review offers it
- **AND** the exit status is unaffected

#### Scenario: Folder opened
- **WHEN** the folder is covered by a user `allowRead` entry
- **THEN** `doctor` reports an OK line saying sandboxed commands can read the telemetry folder, and what that history holds (session IDs, project names, agent names, paths of files that gates flagged)

#### Scenario: Kit-owned entry is not a review-worthy exception
- **GIVEN** the receipt records `~/.claude/canonkit-activity` as appended by canonkit
- **WHEN** `doctor` assesses explicit filesystem exceptions in user settings
- **THEN** that item alone does not produce the filesystem-exceptions warning

#### Scenario: Not applicable
- **WHEN** no loaded scope enables the sandbox, the Claude install is absent, user `allowRead` is ambiguous, the Claude version is unknown or below the sandbox floor, or `~/.claude` or the folder is a symbolic link and the folder is not covered
- **THEN** `doctor` reports nothing about the telemetry read

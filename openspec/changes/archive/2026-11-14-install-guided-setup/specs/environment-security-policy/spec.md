# Spec Delta

## ADDED Requirements

### Requirement: Security changes follow the install's recommended-setup answer
In an interactive install, the security review SHALL follow the recommended-setup answer: *Yes* applies every listed change (replaced and added) without further security questions, *keep current* writes none of them and keeps weaker values, and *customize* shows a menu for runtime reads and one multi-select of the other changes, all checked by default. With `--recommended`, the recommended changes SHALL apply without a terminal, including runtime read exceptions.

#### Scenario: Recommended accepted in a terminal
- **GIVEN** an uncovered runtime location, a weaker project key and an absent strict key listed in the recommended-setup prompt
- **WHEN** the person chooses Yes
- **THEN** the read exception is appended to user settings, the weaker key is set to its strict value and the absent key is added, and no security question is asked

#### Scenario: Keep current leaves absent strict keys unset
- **GIVEN** an absent strict key listed with `+`
- **WHEN** the person chooses *No, keep current*
- **THEN** that key is not written and the output prints the recommended snippet for it

#### Scenario: --recommended without a terminal
- **WHEN** `canonkit install --claude --recommended` runs without a terminal on a supported environment with an uncovered runtime location
- **THEN** the missing runtime read items are appended to user settings and the output lists them

#### Scenario: Customize keeps the explicit review
- **WHEN** the person chooses *No, customize*
- **THEN** the runtime-read question is a menu with "Yes, add them (recommended)" preselected, and the other changes are one multi-select with every row checked
- **AND** an unchecked row keeps the current value, and an empty selection keeps all

### Requirement: Unapplied strict keys are reported, never claimed
After an interactive install in which any strict project key was left unwritten (keep current, unchecked in customize), the output SHALL list each unapplied key with its one-line reason and the command to apply it later (`canonkit install --recommended`). Install output SHALL NOT describe the project as protected or configured unless every strict key is effective across project, local and user settings.

#### Scenario: Sandbox row unchecked
- **WHEN** the person unchecks `sandbox.enabled` in customize
- **THEN** the output says `sandbox.enabled` is not set, that shell commands run with all the user's rights, and names `canonkit install --recommended`
- **AND** no line calls the project protected or configured

### Requirement: Sandbox auto-approval requires the full effective sandbox profile
`sandbox.autoAllowBashIfSandboxed` SHALL be listed and written only when `sandbox.enabled: true`, `sandbox.failIfUnavailable: true` and `sandbox.allowUnsandboxedCommands: false` are all effective after the person's answers (written now or already present). Otherwise it SHALL NOT be listed or pre-checked, and the output SHALL say auto-approval was not enabled because it requires the full sandbox profile. It SHALL never be written alone; existing explicit values stay preserved. The file read/write block keys do not affect this rule.

#### Scenario: One sandbox row unchecked
- **WHEN** the person unchecks any of `sandbox.enabled`, `sandbox.failIfUnavailable` or `sandbox.allowUnsandboxedCommands` in customize
- **THEN** the auto-approval row is unchecked and not written, and the output says why

#### Scenario: Full profile effective
- **GIVEN** all three sandbox keys effective at their strict values
- **WHEN** the person accepts the recommended setup
- **THEN** auto-approval is listed and written

### Requirement: Recommended runtime reads stay narrow
With `--recommended` or Yes, installation SHALL append only the detected items from the known runtime-location list, never a broader parent such as `~` or `~/.local`, SHALL skip items already covered by an existing entry, SHALL preserve existing entries, and SHALL write nothing when user settings are unreadable or ambiguous.

#### Scenario: Broader entry already present
- **GIVEN** user `allowRead` already contains `~/.local`
- **WHEN** `canonkit install --recommended` runs with pipx detected under it
- **THEN** nothing is appended for it

### Requirement: What is shown is what is written
The recommended-setup list SHALL be rendered from the same plan that the apply step executes, and SHALL include security rows, runtime reads and the legacy-hook migration of each settings file; security rows SHALL NOT be collapsed into a bare change count. A settings edit between the plan and the write SHALL abort the install before writing that file.

#### Scenario: Settings edited after the question
- **WHEN** the project settings file changes after the recommended-setup question and before the write
- **THEN** install aborts with the concurrent-edit message and that file is not written

## MODIFIED Requirements

### Requirement: Weaker repository values require confirmation
When the effective repository security settings hold a value weaker than the strict profile canonkit would write, an interactive installation SHALL show each such key with its current and recommended value and the reason, and SHALL apply the change only through the recommended-setup answer or the customize multi-select. Every security question SHALL be an arrow-key menu whose recommended option is preselected: Enter accepts it, a closed input counts as keep or decline (nothing written), and an interrupt aborts the installation before any write. Without an interactive terminal, the behavior of the previous release SHALL hold for each key.

#### Scenario: Weaker values in the repository settings
- **GIVEN** project settings with any of `sandbox.enabled: false`, `sandbox.failIfUnavailable: false`, `sandbox.allowUnsandboxedCommands: true`, `permissions.blockReadsOutsideWorkingDirectories: false` or `permissions.blockWritesOutsideWorkingDirectories: false`
- **WHEN** installation runs from an interactive terminal on an environment that supports those keys
- **THEN** each weaker key is listed with its current and recommended value
- **AND** only the keys the person left checked, or accepted with Yes, are written

#### Scenario: Enter accepts the recommended answer
- **WHEN** the person presses Enter at a security menu
- **THEN** the preselected recommended answer is taken, and the menu hint says "enter applies recommended"

#### Scenario: Closed input or interrupt
- **WHEN** the input closes (EOF) at a security question
- **THEN** that question counts as keep or decline and nothing is written for it
- **AND** an interrupt (Ctrl-C) aborts the installation before any write

#### Scenario: Weaker values without a terminal
- **WHEN** the same settings are found without an interactive terminal, with `--yes`, or as a dry run
- **THEN** those keys are set to the strict profile as in the previous release, and the change plan lists each one

#### Scenario: Weaker value in local settings
- **WHEN** the weaker value comes from the repository's `.claude/settings.local.json`
- **THEN** canonkit does not write that file, reports the key and the recommended edit, and keeps the automatic approval default suppressed
- **AND** that key is not offered as a selectable row

#### Scenario: Nothing weaker
- **WHEN** no repository or local value is weaker than the strict profile
- **THEN** installation asks no security question

### Requirement: Automatic installation of supported restrictions
Installation targeting Claude Code from a validated repository SHALL apply supported native security restrictions to `<repo>/.claude/settings.json` without a separate opt-in or hook-wiring flag, unless the person answered No to setting up the current project in an interactive install or passed `--no-project`. In an interactive install, each restriction absent today SHALL be listed and written according to the recommended-setup answer (Yes, or left checked in customize); without a terminal they are applied automatically as before. Outside a repository, canonkit SHALL report the missing target rather than writing a global fallback policy. Non-Claude-only installations MUST NOT add security enforcement in this delivery.

#### Scenario: Plain Claude installation
- **WHEN** the user installs Claude support from a repository without `--wire-hooks`, including through either installer wrapper
- **THEN** supported security settings are applied automatically to that repository's `.claude/settings.json` and their scope and limitations are reported
- **AND** optional tripwire hooks are not implicitly wired

#### Scenario: Project declined interactively
- **WHEN** the user installs Claude support from a repository in a terminal and answers No to the project question, or passes `--no-project`
- **THEN** `<repo>/.claude/settings.json` is not written, and the output says repository security is not configured for that project

#### Scenario: Global distribution without a repository target
- **WHEN** the user installs from a directory with no validated repository root
- **THEN** global agent/instruction distribution can proceed but security configuration is reported as pending a repository target
- **AND** no repository policy is written into the user's global Claude settings

### Requirement: Reinstallation migrates attributable legacy Claude hooks
Ordinary Claude installation without `--wire-hooks` SHALL unregister attributable legacy canonkit/meu-time handlers in resolved user settings and, when the current project is in scope (not declined interactively or by `--no-project`), in current repository settings. It MUST preserve unrelated integrations, metadata, modes and permissions. Ownership SHALL require a simple command to a canonical kit path, never a basename alone.

#### Scenario: Existing user upgrades to native defaults
- **WHEN** a pre-manifest or tracked installation contains canonical legacy handlers and ordinary Claude install runs
- **THEN** cleanup composes with supported security controls in one tracked JSON write per affected file after all selected targets pass preflight
- **AND** private snapshots, concurrent-edit checks and truthful post-migration instructions are retained, including `--no-reference` and dry-run behavior

#### Scenario: Project declined
- **WHEN** an interactive install runs from a repository whose settings hold legacy handlers and the person answers No to the project question
- **THEN** the repository settings are left unchanged, user settings are still migrated, and the output says the repository still holds legacy handlers and that installing with the project set up removes them

#### Scenario: Mixed or ambiguous integrations
- **WHEN** a group mixes kit and other handlers or a command mentions the kit through a wrapper or customized destination
- **THEN** only attributable handlers are removed, third-party order/matchers/metadata remain unchanged, and ambiguous registrations are preserved with sanitized warnings
- **AND** warnings contain key locations only; local/managed settings, other repositories, payloads and activity history are not modified or scanned for migration

#### Scenario: Explicit optional hooks and subsequent removal
- **WHEN** installation uses `--wire-hooks`
- **THEN** legacy cleanup is skipped and optional registration remains an explicit choice
- **AND** undo after a native migration never recreates removed gates; snapshots remain available for deliberate manual recovery, and ambiguous active wiring is retained conservatively

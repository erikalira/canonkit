# Spec Delta

## MODIFIED Requirements

### Requirement: The approved strict network setting has trusted global scope
For supported Claude versions, installation SHALL apply only `sandbox.network.strictAllowlist:true` and confirmed runtime read exceptions as automatic global access-policy changes, composed with the separately authorized legacy hook migration when applicable. Personal permissions, modes and domain lists MUST remain unchanged. The strict network key SHALL NOT be emitted as effective repository configuration. A preexisting true value MUST NOT become kit-owned merely by observation.

#### Scenario: Strict network configuration without hook wiring
- **WHEN** Claude installation runs with a version supporting the strict network key, with or without a repository target or `--wire-hooks`
- **THEN** the key is planned in the user settings file, composing with any explicitly requested hook wiring and confirmed runtime read exceptions in one tracked JSON change
- **AND** all unrelated user settings remain unchanged

#### Scenario: Existing strict network setting
- **WHEN** the trusted network key is already true before installation
- **THEN** canonkit observes it without claiming ownership or removing it during uninstall

#### Scenario: Unsupported or unknown version
- **WHEN** support for the strict network key is unknown or unavailable
- **THEN** canonkit reports the gap instead of claiming the global key or a repository substitute is enforced

#### Scenario: Other harnesses selected
- **WHEN** the user installs only Codex or OpenCode support
- **THEN** canonkit preserves its existing installation behavior without adding sandbox or security-policy enforcement to those harnesses

### Requirement: Native approval modes remain authoritative
Canonkit MUST preserve the selected Claude approval mode and MUST NOT set a default mode, bypass checks, add broad approvals or install decision hooks by default. When it enables the strict sandbox profile, it SHALL also enable sandbox automatic approval so that commands contained by that sandbox do not prompt; it MUST NOT enable it in any other case. Governance claims SHALL reflect actually active enforcement.

#### Scenario: User switches native modes
- **WHEN** the user selects Manual, Auto, Edit automatically or Plan
- **THEN** canonkit settings leave the harness's mode-specific approval behavior in charge of ordinary actions
- **AND** access restrictions remain separate from approval mode selection

#### Scenario: Optional decision hook is absent
- **WHEN** canonkit decision hooks are not registered or have been selectively removed
- **THEN** generated instructions describe review and authorization as governance without claiming automatic hook prompts, blocks or dispatch logs

#### Scenario: Additional access is attempted
- **WHEN** an action needs access outside the configured boundary
- **THEN** the applicable native deny or explicit authorization mechanism applies without a kit-generated blanket allow or approval hook override

#### Scenario: Strict profile installed on a new project
- **GIVEN** a supported sandbox capability and no explicit auto-approval value in project or user settings
- **WHEN** canonkit writes the strict sandbox profile
- **THEN** it also writes automatic approval as enabled
- **AND** no `permissions.allow` entry, default mode or hook is added

#### Scenario: Strict profile is not written
- **WHEN** the sandbox capability or Claude version does not support the strict profile, or the platform is native Windows
- **THEN** canonkit does not enable sandbox automatic approval

#### Scenario: Explicit value already present
- **GIVEN** an explicit auto-approval value, true or false, in project or user settings, including one written by an earlier canonkit version
- **WHEN** canonkit installs without an interactive terminal, with `--yes`, or as a dry run
- **THEN** that value is preserved and reported, not overwritten

#### Scenario: Existing false next to the strict profile
- **GIVEN** an explicit `false` in project or user settings and the full strict sandbox profile
- **WHEN** canonkit installs from an interactive terminal
- **THEN** it asks whether to keep `false` or change to `true`, naming `true` as the value recommended with the strict sandbox
- **AND** on "change" it writes `true` to the repository settings, and on "keep" it leaves every file unchanged
- **AND** when it installs without a terminal or diagnoses, it recommends `true`, shows the edit and does not change the file

#### Scenario: Publishing still needs confirmation
- **WHEN** sandbox automatic approval is enabled
- **THEN** generated instructions still require asking before `git commit` and `git push`
- **AND** canonkit does not claim that automatic approval enforces that confirmation

### Requirement: Repository data boundary and limited exceptions
Canonkit SHALL apply supported file-tool and shell restrictions independently, using the active session's repository boundary rather than the install directory. Exceptions SHALL be minimal, limited to runtime/toolchain, private temporary storage and harness operation; runtime read exceptions SHALL be detected from the machine and confirmed before they are written. Unrelated outside data MUST NOT gain access through kit-generated rules.

#### Scenario: Another project is opened later
- **WHEN** the user opens a repository other than the one used during installation
- **THEN** the later repository has its own settings and does not inherit a kit-generated allowance for the first repository or all sibling projects

#### Scenario: Windows drives and links
- **WHEN** a sandboxed session uses WSL mounts, symlinks, junctions, worktrees or additional working directories
- **THEN** validation accounts for the resolved access boundary and never grants an entire home or Windows drive merely to reach the repository
- **AND** unverified additional directories are reported as expanded scope

#### Scenario: File-tool controls are version-dependent
- **WHEN** the installed Claude version does not support an outside-working-directory read or write restriction
- **THEN** canonkit reports the specific missing control instead of claiming the key is effective or fabricating equivalent enforcement with hooks

#### Scenario: Shell reads need separate restrictions
- **WHEN** a sandbox profile permits reads outside the active repository by default
- **THEN** canonkit applies supported shell read restrictions and handles narrowly required runtime exceptions independently of the file-tool controls
- **AND** any unbounded or unverified external data access leaves shell read coverage partial or unknown

### Requirement: Restrictive and reversible installation lifecycle
Security installation SHALL preflight all selected targets, display a sanitized change plan, preserve stronger restrictions and unrelated settings, and track its changes with private backups and conservative undo. Malformed configuration or unsafe destination paths MUST stop the install before writes. An empty settings file is not malformed. Repeated installation MUST be idempotent.

#### Scenario: Broken settings in a mixed-target installation
- **WHEN** an automatically managed security target has malformed JSON, invalid key shapes or a symlinked destination
- **THEN** the entire selected installation refuses preflight without exposing configuration values or leaving a partial install

#### Scenario: Empty settings file
- **WHEN** the user or repository Claude settings file exists and is empty, whitespace-only or holds only a byte-order mark
- **THEN** canonkit reads it as an empty object and proceeds as if no settings were present
- **AND** the written file is valid JSON containing only the planned keys

#### Scenario: Reinstallation or environment change
- **WHEN** the selected profile would remove an existing deny or widen a previously installed restriction
- **THEN** canonkit preserves the stronger restriction and reports the conflict instead of loosening it automatically

#### Scenario: User edits settings after installation
- **WHEN** canonkit is uninstalled after the user has changed affected settings
- **THEN** undo removes or restores only provably attributable kit changes and preserves later user edits

#### Scenario: Project-only reversal
- **WHEN** the user requests `uninstall --project` from a validated repository
- **THEN** only attributable security changes for that current repository are eligible for reversal
- **AND** global distribution and other repositories remain untouched
- **AND** the global strict-network setting and runtime read exceptions are left unchanged

#### Scenario: Ordinary global removal
- **WHEN** the user requests uninstall without project scope
- **THEN** canonkit does not discover or modify repository security configurations through global receipts
- **AND** only a still-attributable kit-owned global network key and the runtime read items canonkit appended are eligible for conservative reversal, preserving preexisting values and later edits

#### Scenario: Dry run
- **WHEN** installation is requested with `--dry-run`
- **THEN** canonkit previews security changes and unknown checks without writing files, starting harnesses, performing network probes or claiming isolation was validated

## ADDED Requirements

### Requirement: Detected runtime read exceptions in user settings
On a sandbox-capable platform with a supported Claude version, installation SHALL detect the home-directory locations of the runtimes and canonkit-installed tools that sandboxed commands need, and compare them item by item with the user `sandbox.filesystem.allowRead` array. Only uncovered items SHALL be proposed, and only for known runtime locations. Equivalent spellings and broader existing entries count as covering.

#### Scenario: Everything already covered
- **GIVEN** user settings whose `allowRead` already contains `~/.nvm`, `~/.local/bin` and the pipx venv root, in any equivalent spelling
- **WHEN** installation runs on a machine using nvm and pipx
- **THEN** no runtime read change is proposed and the user settings file is not rewritten for it

#### Scenario: Missing item confirmed interactively
- **GIVEN** a detected runtime location not covered by the user `allowRead` array
- **WHEN** installation runs from an interactive terminal and the user confirms
- **THEN** only the missing items are appended in `~/`-relative form, existing entries and their order are kept, and the appended items are recorded as kit-owned

#### Scenario: Missing item declined or no terminal
- **WHEN** the user declines, or installation runs without an interactive terminal, with `--yes`, or as a dry run
- **THEN** the user settings file is not changed for runtime reads
- **AND** canonkit prints the recommended `allowRead` snippet

#### Scenario: Unknown or out-of-home location
- **WHEN** a runtime resolves outside the home directory, or inside it at a location that is not a known runtime manager or tool root
- **THEN** canonkit proposes no entry for it and reports that location as unhandled instead of granting its parent folder

#### Scenario: Unsupported environment
- **WHEN** the platform is native Windows, the sandbox capability is unavailable, or the Claude version is unknown or below the sandbox floor
- **THEN** no runtime read exception is proposed or written

### Requirement: Weaker repository values require confirmation
When the effective repository security settings hold a value weaker than the strict profile canonkit would write, an interactive installation SHALL ask whether to keep the existing value or apply the recommended one, stating which value is recommended for a secure environment and why. No security question SHALL have a default answer: only an explicit choice (or an explicit yes or no) is accepted, any other input is asked again, a closed input counts as keep or decline, and an interrupt aborts the installation before any write. Without an interactive terminal, the behavior of the previous release SHALL hold for each key.

#### Scenario: Weaker values in the repository settings
- **GIVEN** repository settings with any of `sandbox.enabled: false`, `sandbox.failIfUnavailable: false`, `sandbox.allowUnsandboxedCommands: true`, `permissions.blockReadsOutsideWorkingDirectories: false` or `permissions.blockWritesOutsideWorkingDirectories: false`
- **WHEN** installation runs from an interactive terminal on an environment that supports those keys
- **THEN** canonkit lists each weaker key with its current and recommended value and asks to keep or change
- **AND** only the keys the user chose to change are written

#### Scenario: Weaker values without a terminal
- **WHEN** the same settings are found without an interactive terminal, with `--yes`, or as a dry run
- **THEN** those keys are set to the strict profile as in the previous release, and the change plan lists each one

#### Scenario: Weaker value in local settings
- **WHEN** the weaker value comes from the repository's `.claude/settings.local.json`
- **THEN** canonkit does not write that file, reports the key and the recommended edit, and keeps the automatic approval default suppressed

#### Scenario: Nothing weaker
- **WHEN** no repository or local value is weaker than the strict profile
- **THEN** installation asks no security question

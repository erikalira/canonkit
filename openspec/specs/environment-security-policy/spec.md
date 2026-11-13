# environment-security-policy Specification

## Purpose

Apply the strongest supported Claude Code security configuration automatically while preserving native Windows compatibility and making containment limits explicit.

## Requirements

### Requirement: Capability-based environment selection
Canonkit SHALL select security controls from independently detected OS, WSL generation, container context, harness version and isolation capabilities. Unverified labels MUST NOT establish containment.

#### Scenario: Native Windows remains usable
- **WHEN** installation runs for Claude Code on native Windows
- **THEN** canonkit selects the strongest supported native profile and reports partial protection without requiring WSL or a container

#### Scenario: Container and WSL evidence overlap
- **WHEN** a Linux environment presents both WSL and container indicators
- **THEN** canonkit records both dimensions and evaluates actual capabilities instead of selecting a mutually exclusive OS label

#### Scenario: Marker or dependency is insufficient
- **WHEN** a container variable is present or a sandbox dependency exists without evidence that isolation works
- **THEN** canonkit does not describe the environment as contained

### Requirement: Automatic installation of supported restrictions
Installation targeting Claude Code from a validated repository SHALL apply supported native security restrictions to `<repo>/.claude/settings.json` without a separate opt-in or hook-wiring flag. Outside a repository, canonkit SHALL report the missing target rather than writing a global fallback policy. Non-Claude-only installations MUST NOT add security enforcement in this delivery.

#### Scenario: Plain Claude installation
- **WHEN** the user installs Claude support from a repository without `--wire-hooks`, including through either installer wrapper
- **THEN** supported security settings are applied automatically to that repository's `.claude/settings.json` and their scope and limitations are reported
- **AND** optional tripwire hooks are not implicitly wired

#### Scenario: Global distribution without a repository target
- **WHEN** the user installs from a directory with no validated repository root
- **THEN** global agent/instruction distribution can proceed but security configuration is reported as pending a repository target
- **AND** no repository policy is written into the user's global Claude settings

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

### Requirement: Native configuration is not shell authorization
The native Windows profile MUST NOT introduce broad shell, interpreter or network allow rules, bypass permission checks, or enable general command autoapproval. Canonkit SHALL identify permissions it cannot enforce without OS isolation.

#### Scenario: Windows security is installed
- **WHEN** the native Windows profile is applied
- **THEN** file-tool restrictions are installed where supported while shell filesystem and network containment remain explicitly unavailable
- **AND** canonkit does not suppress remaining approval prompts by granting arbitrary command execution

#### Scenario: Existing permissive personal rule
- **WHEN** an unrelated personal shell allow rule predates installation
- **THEN** canonkit reports the conflict without silently deleting that personal rule or claiming that the shell is contained

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

### Requirement: Reinstallation migrates attributable legacy Claude hooks
Ordinary Claude installation without `--wire-hooks` SHALL unregister attributable legacy canonkit/meu-time handlers in resolved user settings and current repository settings. It MUST preserve unrelated integrations, metadata, modes and permissions. Ownership SHALL require a simple command to a canonical kit path, never a basename alone.

#### Scenario: Existing user upgrades to native defaults
- **WHEN** a pre-manifest or tracked installation contains canonical legacy handlers and ordinary Claude install runs
- **THEN** cleanup composes with supported security controls in one tracked JSON write per affected file after all selected targets pass preflight
- **AND** private snapshots, concurrent-edit checks and truthful post-migration instructions are retained, including `--no-reference` and dry-run behavior

#### Scenario: Mixed or ambiguous integrations
- **WHEN** a group mixes kit and other handlers or a command mentions the kit through a wrapper or customized destination
- **THEN** only attributable handlers are removed, third-party order/matchers/metadata remain unchanged, and ambiguous registrations are preserved with sanitized warnings
- **AND** warnings contain key locations only; local/managed settings, other repositories, payloads and activity history are not modified or scanned for migration

#### Scenario: Explicit optional hooks and subsequent removal
- **WHEN** installation uses `--wire-hooks`
- **THEN** legacy cleanup is skipped and optional registration remains an explicit choice
- **AND** undo after a native migration never recreates removed gates; snapshots remain available for deliberate manual recovery, and ambiguous active wiring is retained conservatively

### Requirement: Strict sandbox configuration preserves explicit requirements
Where supported, canonkit SHALL configure shell sandboxing to refuse unsandboxed retries. Existing explicit personal or managed isolation requirements MUST NOT be weakened to accommodate a partial environment. Missing or unknown runtime evidence SHALL remain a reported gap rather than a containment claim.

#### Scenario: Existing strict policy on native Windows
- **WHEN** an explicit user or managed sandbox requirement already applies on native Windows
- **THEN** canonkit preserves it and explains the resulting compatibility conflict rather than disabling it automatically

#### Scenario: Sandbox-capable platform
- **WHEN** a verified supported sandbox profile is installed
- **THEN** commands are configured to remain sandboxed without unsandboxed retry or excluded-command escape paths introduced by canonkit
- **AND** sandbox automatic approval applies only to commands that run inside that sandbox

#### Scenario: Missing dependency or unknown effective override
- **WHEN** a dependency is missing or the effective boundary cannot be established
- **THEN** canonkit reports unavailable or unknown coverage and preserves existing fail-closed requirements rather than treating settings written to disk as runtime proof

#### Scenario: Marker or dependency is insufficient
- **WHEN** a container variable is present or a sandbox dependency exists without evidence that isolation works
- **THEN** canonkit does not describe the environment as contained

#### Scenario: Diagnostics for automatic approval
- **WHEN** automatic approval is enabled together with the strict profile (sandbox enabled, unavailable sandbox fails, unsandboxed retries refused)
- **THEN** diagnostics do not warn about it
- **AND** they warn when it is enabled with any weaker or missing element of that profile

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

### Requirement: Network authorization remains outside repository control
Canonkit SHALL add no project-process network destinations by default or infer authorization from code, detected stacks or unreviewed repository suggestions. Explicit exceptions in native settings SHALL be evaluated conservatively. If an effective policy ceiling cannot be established, coverage MUST be partial or unknown. Provider communication MUST be distinguished from project-process access.

#### Scenario: A dependency registry is suggested
- **WHEN** a project or stack pack names a package registry, Git host or documentation service
- **THEN** canonkit does not authorize that destination automatically

#### Scenario: Harness merges a repository expansion
- **WHEN** repository settings can widen the actual network policy despite the personal configuration
- **THEN** canonkit reports the expanded boundary as partial or unknown and does not claim a protected authorization ceiling

#### Scenario: Strict sandbox network configuration
- **WHEN** supported shell network restrictions are applied
- **THEN** destinations outside the approved list are denied rather than prompting for per-command additions
- **AND** local/private networks, metadata endpoints and host sockets gain no kit-generated exemptions

#### Scenario: Unsandboxed or separate network tool
- **WHEN** traffic originates from native Windows shell, a web tool, MCP server or hook outside the shell sandbox
- **THEN** canonkit evaluates the applicable separate controls and reports uncovered access instead of treating the shell domain list as enforcement for that traffic

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

### Requirement: No implicit machine provisioning
Automatic security configuration MUST NOT install WSL, Docker or system packages, elevate privileges, restart the machine, move repositories, or change system firewall or managed policy. Such preparation SHALL be offered as a separate explicit action.

#### Scenario: Windows user chooses native operation
- **WHEN** the user keeps using native Windows
- **THEN** canonkit applies available native protections without migrating the user or installing another environment

#### Scenario: Stronger environment is absent
- **WHEN** a requested isolation boundary requires unavailable infrastructure
- **THEN** canonkit explains the preparation required and does not perform that preparation as an installation side effect

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

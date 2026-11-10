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
For supported Claude versions, installation SHALL apply only `sandbox.network.strictAllowlist:true` as an automatic global access-policy change, composed with the separately authorized legacy hook migration when applicable. Personal permissions, modes and domain lists MUST remain unchanged. This key SHALL NOT be emitted as effective repository configuration. A preexisting true value MUST NOT become kit-owned merely by observation.

#### Scenario: Strict network configuration without hook wiring
- **WHEN** Claude installation runs with a version supporting the strict network key, with or without a repository target or `--wire-hooks`
- **THEN** the key is planned in the user settings file, composing with any explicitly requested hook wiring in one tracked JSON change
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
Canonkit MUST preserve the selected Claude approval mode and MUST NOT set a default mode, bypass checks, add broad approvals or install decision hooks by default. When enabling sandboxing, it SHALL retain native mode permission review instead of enabling sandbox-based automatic command approval. Governance claims SHALL reflect actually active enforcement.

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
- **AND** the user's native approval mode continues to decide permissions rather than a kit-added autoapproval shortcut

#### Scenario: Missing dependency or unknown effective override
- **WHEN** a dependency is missing or the effective boundary cannot be established
- **THEN** canonkit reports unavailable or unknown coverage and preserves existing fail-closed requirements rather than treating settings written to disk as runtime proof

### Requirement: Repository data boundary and limited exceptions
Canonkit SHALL apply supported file-tool and shell restrictions independently, using the active session's repository boundary rather than the install directory. Exceptions SHALL be minimal and documented for runtime/toolchain, private temporary storage and harness operation; unrelated outside data MUST NOT gain access through kit-generated rules.

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
- **THEN** canonkit applies supported shell read restrictions and documents narrowly required runtime exceptions independently of the file-tool controls
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
Security installation SHALL preflight all selected targets, display a sanitized change plan, preserve stronger restrictions and unrelated settings, and track its changes with private backups and conservative undo. Malformed configuration or unsafe destination paths MUST stop the install before writes. Repeated installation MUST be idempotent.

#### Scenario: Broken settings in a mixed-target installation
- **WHEN** an automatically managed security target has malformed JSON, invalid key shapes or a symlinked destination
- **THEN** the entire selected installation refuses preflight without exposing configuration values or leaving a partial install

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
- **AND** the global strict-network setting is left unchanged

#### Scenario: Ordinary global removal
- **WHEN** the user requests uninstall without project scope
- **THEN** canonkit does not discover or modify repository security configurations through global receipts
- **AND** only a still-attributable kit-owned global network key is eligible for conservative reversal, preserving preexisting values and later edits

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

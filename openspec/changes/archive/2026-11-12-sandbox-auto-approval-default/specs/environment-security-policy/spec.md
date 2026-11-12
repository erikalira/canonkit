## MODIFIED Requirements

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
- **WHEN** canonkit installs again
- **THEN** that value is preserved and reported, not overwritten

#### Scenario: Existing false next to the strict profile
- **GIVEN** an explicit `false` and the full strict sandbox profile
- **WHEN** canonkit installs or diagnoses
- **THEN** it recommends setting automatic approval to `true` and shows the edit
- **AND** it does not change the file

#### Scenario: Publishing still needs confirmation
- **WHEN** sandbox automatic approval is enabled
- **THEN** generated instructions still require asking before `git commit` and `git push`
- **AND** canonkit does not claim that automatic approval enforces that confirmation

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

# security-diagnostics Specification

## Purpose

Explain the protection actually available to each harness in the current environment without confusing configuration, tripwires or container labels with verified containment.

## Requirements

### Requirement: Read-only multi-harness diagnosis
`doctor` SHALL report security capabilities for Claude Code, Codex and OpenCode without modifying settings, private state or repositories. It MUST NOT run project code, perform network probes, or read credential contents. Missing unselected harnesses MUST NOT create false installation failures.

#### Scenario: Diagnosis in a Codex-only installation
- **WHEN** a Codex-only installation is diagnosed
- **THEN** canonkit reports applicable Codex security evidence and the absence of other harnesses without failing Claude-specific installation checks
- **AND** enforcement settings in all harnesses remain unchanged

#### Scenario: Security evidence cannot be safely inspected
- **WHEN** establishing a control would require accessing credential values or running repository code
- **THEN** doctor reports that evidence as unknown and leaves it untested

### Requirement: Separate configuration from evidence
Security reports SHALL identify environment dimensions, harness/version, desired profile, configured controls, effective evidence, coverage by surface, exceptions and correction steps. They SHALL distinguish verified, partial, unavailable and unknown coverage independently of existing OK/WARN/FAIL check severity.

#### Scenario: Native Windows report
- **WHEN** native Windows has the supported Claude file restrictions installed
- **THEN** the report states partial protection and identifies shell filesystem and network containment as unavailable
- **AND** it does not label the whole session isolated or guarantee prompt-free commands

#### Scenario: Settings exist but runtime evidence is absent
- **WHEN** sandbox settings are present without evidence of an effective running boundary
- **THEN** the report identifies them as configured and runtime verification as unknown

#### Scenario: Container exposure is unknown
- **WHEN** container markers exist but mounts, privilege, host sockets or egress cannot be verified
- **THEN** the report names those unknowns and does not infer containment from the container label

### Requirement: Report effective conflicts without granting access
Diagnosis SHALL identify known settings conflicts, sandbox escapes, expanded working directories and broad allow rules relevant to the current repository. Inaccessible managed, CLI or external policy inputs SHALL be reported as unknown. Reports MUST NOT silently repair or authorize anything.

#### Scenario: Repository settings widen access
- **WHEN** repository configuration adds an outside directory, proxy, domain or sandbox exclusion
- **THEN** doctor reports whether the effective harness controls reject that expansion or whether it leaves partial or unknown coverage

#### Scenario: Broken automatic security configuration
- **WHEN** kit-managed security configuration is malformed or no longer matches its supported profile
- **THEN** doctor reports FAIL with the affected key path and a correction command without printing configuration values

#### Scenario: Private or broad network authorization
- **WHEN** existing settings authorize private hosts, broad domain patterns or a custom proxy
- **THEN** doctor identifies the expanded boundary and enforcement limitations without treating the entries as newly approved by canonkit

### Requirement: Diagnostic severity preserves the existing exit contract
`doctor` SHALL preserve its nonzero-on-FAIL contract and use WARN for supported partial coverage without misconfiguration. Broken kit-managed security settings or an observable unmet existing personal/managed isolation requirement SHALL produce FAIL. Unknown runtime evidence MUST NOT become a verified result.

#### Scenario: Correctly configured native Windows
- **WHEN** native Windows is configured as the supported partial profile and plain doctor runs
- **THEN** its lack of shell containment is reported as WARN rather than a claim of misinstallation

#### Scenario: Existing isolation requirement is unmet
- **WHEN** an observable personal or managed policy requires a sandbox that the current environment cannot provide
- **THEN** doctor reports the unmet requirement as FAIL and returns nonzero without changing the profile

### Requirement: Actionable native remediation and honest entry-point scope
Reports SHALL offer concrete steps to repair supported native settings and optional routes to stronger isolation. They MUST distinguish ordinary Claude execution from any future canonkit-controlled launcher and MUST NOT claim to intercept direct binaries, shortcuts or editor extensions.

#### Scenario: Windows user wants to remain native
- **WHEN** native protection is incomplete or outdated
- **THEN** the report explains how to reapply supported native settings or update the harness without requiring WSL as the only correction

#### Scenario: User wants stronger containment
- **WHEN** the user requests an unavailable strict boundary
- **THEN** the report offers WSL2 or a validated container as preparation options without provisioning them or claiming those options are already secure

#### Scenario: Session environment differs from installation
- **WHEN** the current environment or harness version differs from the installed profile evidence
- **THEN** doctor recomputes desired controls and reports mismatches without silently rewriting settings or asserting that arbitrary direct launches are monitored

#### Scenario: Native approval mode is influenced by another source
- **WHEN** settings or integrations change approval behavior beyond the repository's declared restrictions
- **THEN** doctor identifies observable sources without changing the selected mode or assuming that canonkit caused the difference
- **AND** inactive canonkit decision hooks are not reported as enforced gates

### Requirement: Runtime read coverage is diagnosed
On a sandbox-capable platform, `doctor` SHALL compare the detected runtime locations with the effective user `sandbox.filesystem.allowRead` entries and report missing items and entries broad enough to reopen the home directory. It MUST NOT edit settings.

#### Scenario: Missing runtime read exception
- **WHEN** a detected runtime location is not covered by any user `allowRead` entry
- **THEN** doctor reports WARN naming the missing item and the snippet to add, or `canonkit install` to add it

#### Scenario: Over-broad read exception
- **WHEN** an `allowRead` entry covers the whole home directory, or a directory that contains it
- **THEN** doctor reports WARN that shell reads of the home directory are reopened and leaves shell read coverage partial

#### Scenario: Runtime reads covered
- **WHEN** every detected runtime location is covered and no entry reopens the home directory
- **THEN** doctor reports the runtime read exceptions as configured without a warning

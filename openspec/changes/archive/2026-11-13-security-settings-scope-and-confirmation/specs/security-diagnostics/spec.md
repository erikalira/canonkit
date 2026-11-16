# Spec Delta

## ADDED Requirements

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

# Spec Delta

## ADDED Requirements

### Requirement: Absent strict keys and unconfigured projects are diagnosed
`doctor` SHALL report each strict project key that is absent from the effective settings as a coverage gap, distinct from a weaker value, and SHALL report a project whose security was never configured by canonkit as "project security not configured". Neither state SHALL read as OK.

#### Scenario: Strict key absent
- **WHEN** `sandbox.enabled` is absent from project, local and user settings
- **THEN** doctor reports WARN that it is not set and how to apply it, separately from weaker-value findings

#### Scenario: Project never set up
- **WHEN** doctor runs in a project where install was declined with No or `--no-project`
- **THEN** doctor reports WARN "project security not configured for this project" and the command to set it up

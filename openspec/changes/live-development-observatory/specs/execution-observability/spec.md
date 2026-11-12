# Spec Delta

## Purpose

Provide a small, versioned read model of runtime evidence that multiple dashboard views can consume without turning presentation state into execution truth.

## ADDED Requirements

### Requirement: Runtime observations preserve evidence boundaries
The system SHALL normalize only allowlisted fields from supported runtime records, retain source and confidence, and leave unavailable identifiers or measurements absent. It SHALL NOT infer project, worktree, branch, workflow completion, approval, agent activity beyond observed lifecycle, or event identity when the source record does not establish them.

#### Scenario: Unsupported identity fields
- **WHEN** retained Claude Code records contain session and dispatch identifiers but no stable project, worktree or branch identity
- **THEN** the read model exposes those fields as unknown or null and does not correlate same-named projects across sessions

#### Scenario: Event has no stable ID
- **WHEN** an accepted source record has no stable event identifier
- **THEN** normalization does not fabricate one

#### Scenario: Lifecycle event is weaker than task outcome
- **WHEN** an agent start, stop, resume or end record is observed
- **THEN** the model reports only supported lifecycle evidence and does not claim code activity, successful work or review approval

### Requirement: Dispatch aggregation respects observed identity and time
The system SHALL correlate dispatch records only using observed identifiers within their session, preserve cumulative snapshot semantics, and mark concurrency only when observed intervals overlap. Missing measurements in the latest cumulative end record SHALL remain missing rather than retaining stale earlier measurements.

#### Scenario: Cumulative end record omits measurements
- **WHEN** a later cumulative end record for a dispatch omits duration or token measurements
- **THEN** the snapshot for that dispatch reports those measurements as unavailable

#### Scenario: Dispatches overlap
- **WHEN** two dispatches in the same session have observed intervals that overlap
- **THEN** both may be marked parallel; sequential or incomplete intervals alone do not establish parallel work

#### Scenario: Ambiguous stop event
- **WHEN** a stop event cannot be linked to exactly one dispatch by its observed runtime agent identifier
- **THEN** it remains an unassociated timeline observation and does not alter a guessed dispatch

### Requirement: Gate observations separate kind from decision
The system SHALL represent gate observation and decision separately, including allow, confirmation-requested, blocked and unknown outcomes where supported. It SHALL NOT treat every gate as blocking or as proof of approval.

#### Scenario: Non-blocking gate
- **WHEN** an excluded-by-config or context-size gate is observed
- **THEN** the observation remains visible with its non-blocking decision

#### Scenario: Gate requests confirmation
- **WHEN** a high-risk surface gate is observed
- **THEN** the display distinguishes the confirmation request from a completed user approval

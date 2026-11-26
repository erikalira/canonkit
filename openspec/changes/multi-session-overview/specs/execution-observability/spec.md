# Spec Delta

## ADDED Requirements

### Requirement: Read model classifies recent session activity
The snapshot SHALL identify the sessions whose latest observation falls within a fixed 15-minute window ending at the snapshot's generation time, and SHALL state that window. For each such session it SHALL list only the agents with an observed active dispatch. It SHALL NOT represent recent activity as a running, online or ended session.

#### Scenario: Session observed inside the window
- **WHEN** a session's latest observation is no more than 15 minutes older than the snapshot's generation time
- **THEN** the snapshot lists that session as having recent activity, with its latest observation time and type

#### Scenario: Session observed outside the window
- **WHEN** a session's latest observation is more than 15 minutes older than the snapshot's generation time
- **THEN** the snapshot does not list it as having recent activity, and the session remains in the full session list unchanged

#### Scenario: Dispatch without an end signal
- **WHEN** a dispatch in a recently active session has started but has no observed end and no later session activity
- **THEN** that dispatch's agent is not listed among the agents with an active dispatch, and the session counts it among dispatches without an end signal

#### Scenario: Agent type is not observed
- **WHEN** an active dispatch has no observed agent type
- **THEN** the agent is listed as unidentified and no name is inferred

#### Scenario: Existing consumers
- **WHEN** a consumer reads fields that existed before this change
- **THEN** their names, meaning and the schema version are unchanged

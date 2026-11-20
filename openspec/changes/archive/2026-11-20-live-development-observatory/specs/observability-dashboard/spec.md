# Spec Delta

## Purpose

Let a user inspect locally retained development observations as a graph and timeline while keeping runtime evidence, conditional process guidance and presentation state distinct.

## ADDED Requirements

### Requirement: Dashboard presents observed graph and conditional routes separately
The dashboard SHALL provide an interactive graph view of observations and a distinct reference view for conditional LOW, MEDIUM and HIGH routes. It SHALL identify connections as observed only to the extent supported by source records and SHALL NOT imply that a reference route was selected or executed.

#### Scenario: Session has dispatches and gates
- **WHEN** normalized dispatch or gate observations are available for a selected session
- **THEN** the user can inspect them in a navigable React Flow graph and select a node for its source, evidence, measurements and unknown states

#### Scenario: No workflow classification is observed
- **WHEN** the session has no trustworthy risk classification or workflow milestone
- **THEN** reference routes remain conditional, all route outcomes remain unknown, and no route is presented as the session's actual path

#### Scenario: Empty session
- **WHEN** no supported events are retained
- **THEN** the dashboard explains that no execution was observed and does not start a runtime or create a session to collect data

### Requirement: Timeline navigation reflects node correlation
The dashboard SHALL show accepted observations chronologically with event-type and agent filters. Selecting an observation SHALL select and frame its corresponding graph node when a correspondence is established, and SHALL keep uncorrelated observations inspectable without inventing a connection.

#### Scenario: Observation has a corresponding node
- **WHEN** a timeline entry maps to a graph node
- **THEN** selecting it selects and frames that node, including when graph state updates asynchronously

#### Scenario: Observation cannot be correlated
- **WHEN** a timeline entry lacks sufficient identifiers for a dispatch node
- **THEN** the event remains selectable and is shown without a fabricated dispatch link

### Requirement: Dashboard is passive and locally secured
The dashboard SHALL use the existing local Node server and retained data, preserve legacy dashboard endpoints and Activity view, and expose no command execution or approval controls. HTTP reads SHALL be limited to loopback same-origin requests and fixed packaged static assets; responses SHALL apply applicable security headers.

#### Scenario: Request has an untrusted Host or Origin
- **WHEN** a dashboard endpoint receives a non-loopback Host or mismatched Origin
- **THEN** the request is rejected without enabling CORS

#### Scenario: Static path attempts traversal
- **WHEN** a request attempts to escape the packaged frontend directory
- **THEN** the server rejects it and does not expose arbitrary files

#### Scenario: Installed package is used
- **WHEN** CanonKit installs the dashboard from the package
- **THEN** compiled frontend assets and runtime files are present, while normal CLI operation does not require loading frontend dependencies

### Requirement: Dashboard communicates stale and unknown data
The dashboard SHALL distinguish current connection status from retained snapshot age and visibly label unknown or uninstrumented information. It SHALL preserve the user's graph state across data-only refreshes to the extent implemented by the frontend.

#### Scenario: Connection is lost after observations
- **WHEN** polling fails after a snapshot was received
- **THEN** the last snapshot remains visible with a stale-data explanation and the dashboard retries

#### Scenario: Runtime cannot identify project context
- **WHEN** source records lack stable project, branch or worktree identity
- **THEN** the UI labels those values unavailable rather than grouping or naming projects by a potentially colliding basename

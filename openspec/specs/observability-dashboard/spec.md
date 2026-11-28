# observability-dashboard Specification

## Purpose

Let a user inspect locally retained development observations as a graph and timeline while keeping runtime evidence, conditional process guidance and presentation state distinct.

## Requirements

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

### Requirement: Dashboard lists recently active sessions together
The execution dashboard SHALL show one card for every session with recent activity at the same time. Each card SHALL show its short session ID, its project and branch or labels saying they are unavailable, the agents with an open dispatch, how many dispatches have no end seen, its last event, and that event's age. The panel SHALL call this recent activity, never running.

#### Scenario: Several sessions have recent activity
- **WHEN** the snapshot lists more than one session with recent activity
- **THEN** a card for each one is visible without changing the session selector, ordered by most recent observation first, under a heading that states how many sessions are shown

#### Scenario: No session has recent activity
- **WHEN** no session has an observation inside the window
- **THEN** the panel says that no session had activity in the last 15 minutes, and older sessions remain available in the selector

#### Scenario: No session was ever observed
- **WHEN** the snapshot contains no sessions at all
- **THEN** the panel says that no sessions have been observed yet and does not point to the selector

#### Scenario: Connection is lost
- **WHEN** polling fails after a snapshot was received
- **THEN** the panel keeps the last cards, states the time of that snapshot in the panel itself, and shows each event's age relative to that snapshot, so the ages do not read as current or keep growing as though fresh evidence had been checked

### Requirement: Graph shows the selected sessions together
The dashboard SHALL let the user choose several sessions and SHALL show all chosen sessions in one graph, each in its own visually distinct lane. It SHALL NOT draw an edge or imply an order between nodes of different sessions. Each card SHALL state in text and to assistive technology whether its session is shown.

#### Scenario: Default selection follows recent activity
- **WHEN** the user has not changed the selection
- **THEN** the graph shows every session with recent activity, adds new ones as they appear, and shows the most recently observed session when none is recent

#### Scenario: User toggles a session
- **WHEN** the user activates a card by pointer or keyboard
- **THEN** that session is added to or removed from the graph and timeline, the selection stops following recent activity, and a control to show all recent sessions again becomes available

#### Scenario: Older session is added
- **WHEN** the user picks a session outside the window from the session selector
- **THEN** it is added to the graph, and its card appears in the panel marked as outside the window so it can be removed again

#### Scenario: No session is selected
- **WHEN** the user removes every session from the selection
- **THEN** the graph says that no session is selected and how to add one, and does not fall back silently to another session

#### Scenario: Several sessions in one graph
- **WHEN** more than one session is selected
- **THEN** each session's dispatches and gates appear in its own lane under its session node, uncorrelated runtime signals of each session are summarised in one node per session, and no edge crosses lanes

#### Scenario: Header and counts with several sessions
- **WHEN** more than one session is selected
- **THEN** the header states how many sessions are shown instead of one project and branch, and the dispatch count covers all selected sessions

### Requirement: Timeline merges the selected sessions
The timeline SHALL show the events of all selected sessions in one chronological list, label each event with its session, and keep the existing event-type and agent filters. Selecting an event SHALL select and frame its node in that session's lane when a correspondence is established.

#### Scenario: Events from two sessions
- **WHEN** two sessions are selected and both have events
- **THEN** their events are interleaved by time and each row shows its short session ID

#### Scenario: Event maps to a node in another lane
- **WHEN** the user selects an event whose session is not the one inspected last
- **THEN** the node in that event's own session lane is selected and framed, and the inspector shows that session's record

#### Scenario: Summarised signal is selected
- **WHEN** the user selects a prompt, resume or stop event that is summarised in a per-session node
- **THEN** the summary node is selected and framed, and the inspector shows the selected event itself

### Requirement: Selection and layout survive polling
A new snapshot SHALL NOT reset the user's selection of sessions, moved nodes, selected node or inspector, except to drop sessions that no longer exist in the snapshot.

#### Scenario: New event arrives in a selected session
- **WHEN** a snapshot adds an event to one selected session while the user has moved nodes and selected one in another lane
- **THEN** the new node takes a free position in its own lane, and the moved nodes, selected node and inspector stay as they were

#### Scenario: Graph goes from one session to several again
- **WHEN** the selection drops to one session and a second session is added again later
- **THEN** each session's nodes, including ones the user moved, appear inside that session's own lane with their arrangement kept, and no lane overlaps another

#### Scenario: Dispatch ends between polls
- **WHEN** a snapshot records the end of a dispatch that was shown as active
- **THEN** its node and its edge stop showing the active state on that poll

#### Scenario: Session leaves the window while manually selected
- **WHEN** a manually selected session's latest event becomes older than 15 minutes
- **THEN** it stays in the graph and its card stays in the panel, marked as outside the window

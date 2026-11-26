# Spec Delta

## ADDED Requirements

### Requirement: Dashboard shows recently active sessions together
The execution dashboard SHALL show one card for every session with recent activity at the same time. Each card SHALL show its short session ID, its project and branch or a label saying they are unavailable, its working agents, how many of its dispatches have no end signal, its last observed event, and how long ago that event happened. The panel SHALL call this recent activity, never running.

#### Scenario: Several sessions have recent activity
- **WHEN** the snapshot lists more than one session with recent activity
- **THEN** a card for each one is visible without changing the session selector, ordered by most recent observation first

#### Scenario: Card is selected
- **WHEN** the user activates a session card by pointer or keyboard
- **THEN** the graph, inspector and timeline show that session, the selector shows that session too, and the card is marked as selected

#### Scenario: No session has recent activity
- **WHEN** no session has an observation inside the window
- **THEN** the panel says that no session had activity in the last 15 minutes, and older sessions remain available in the selector

#### Scenario: Polling refreshes the panel
- **WHEN** a new snapshot arrives while the user is viewing a session
- **THEN** the cards update, sessions that left the window drop out of the panel, and the open session, graph layout and selection stay where they were

#### Scenario: Connection is lost
- **WHEN** polling fails after a snapshot was received
- **THEN** the panel keeps the last cards and shows how long ago each session's last event happened relative to that snapshot, so the times do not keep growing as though fresh evidence had been checked

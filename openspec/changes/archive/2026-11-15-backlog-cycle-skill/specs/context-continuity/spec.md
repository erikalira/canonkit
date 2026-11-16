# Spec Delta

## ADDED Requirements

### Requirement: User-invoked backlog-item session cycle
CanonKit SHALL ship a core skill, invoked by the user only on every supported runtime, that runs one backlog item per session: select the next open item from the backlog the project already uses, confirm on disk that its description still holds, classify risk, size the planning ceremony to that risk, stop for the user's approval before editing, verify before review, close out, ask how to commit, and hand over the next-session prompt. The skill SHALL point to the existing orchestration, incidental-findings and handoff guidance instead of restating it, and SHALL NOT impose a planning tool, backlog file or release scheme the project does not use.

#### Scenario: Next item selected
- **WHEN** the user invokes the skill in a project whose instructions or files identify one backlog
- **THEN** the lead picks the highest-priority open item, reads its linked handoff and cited files, and reports any part that no longer matches the disk before planning

#### Scenario: Ambiguous backlog
- **WHEN** more than one backlog candidate exists and project instructions do not name one
- **THEN** the lead asks the user once which backlog to use instead of merging or guessing

#### Scenario: Ceremony sized by risk
- **WHEN** the item is LOW
- **THEN** it is done inline with only the close-out, without a planned change
- **WHEN** the item is MEDIUM with no structural choice to record
- **THEN** the planned change omits the design artifact
- **WHEN** the item is HIGH or has a structural alternative to record
- **THEN** the planned change carries the full package

#### Scenario: Approval before editing
- **WHEN** the plan is ready
- **THEN** the lead stops and waits for the user's approval before any edit

#### Scenario: Cycle does not close
- **WHEN** an owner vetoes and the fix does not fit the session, the item turns out to be several items, or it is obsolete
- **THEN** the lead stops, splits or drops the item, records the reason in the backlog, writes or updates the handoff with the real state, and hands over the next-session prompt, leaving no unrecorded half-done change

#### Scenario: Commit decision
- **WHEN** implementation, validation and required reviews are complete
- **THEN** the lead asks whether to commit (asking push separately), hand over only the message, or hand over the ready command, and does not commit without that answer

#### Scenario: Not selected implicitly
- **WHEN** a session never invokes the skill
- **THEN** no runtime loads or selects it on its own

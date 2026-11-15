# context-continuity Specification

## Purpose

Preserve the minimum trustworthy task state across handoffs and distinguish implementation readiness from authorization to finalize external actions.

## Requirements

### Requirement: Compact resumable handoff
Handoff guidance SHALL preserve the objective, authoritative artifacts, decisions, task/change state, actual validation, blockers, next step and minimal file references when continuity is needed. Known branch, revision and dirty state SHALL be distinguished from unknown state. It SHALL omit transcripts, prompts, secrets and sensitive data and create no parallel planning system.

#### Scenario: Resume an existing OpenSpec change
- **WHEN** work resumes after a context handoff
- **THEN** the agent reads the selected change, checks current work and evidence freshness, and continues the next pending task without repeating completed analysis

#### Scenario: Incomplete handoff
- **WHEN** a handoff lacks validation state or a next step
- **THEN** the agent identifies the missing information instead of inventing passing validation or inferring task completion

### Requirement: Task-scoped delegation
Delegation guidance SHALL send relevant criteria, constraints, interfaces, references and dependency state rather than full task history. Existing short reports and risk-based dispatch SHALL remain sufficient where applicable, without creating an agent for every task.

#### Scenario: Independent narrow task
- **WHEN** a permitted dispatch handles one bounded task
- **THEN** its brief contains only the context required for that task and its result returns through the existing short report

### Requirement: Safe finalization
Finalization guidance SHALL distinguish implemented work, validation, required review and PR readiness from authorization to commit, push, merge, publish or discard work. Worktree cleanup SHALL require verified ownership, checked unsaved changes and applicable authorization.

#### Scenario: Implementation is ready for review
- **WHEN** code and applicable checks are complete but a required review remains
- **THEN** the report states the pending review and does not claim merge authorization

#### Scenario: Worktree has unrelated edits
- **WHEN** cleanup encounters unowned or uncommitted work
- **THEN** it preserves the work and obtains the applicable decision before removing anything

### Requirement: Review brief with resolved diff scope
Guidance for dispatching a reviewer SHALL have the brief carry the diff scope the lead already resolved: the revision range (`<base>..<head>`, working tree against HEAD, or working tree against the base) and the work state it was resolved on, the exact command that shows the diff, the changed files with added and removed line counts, and untracked files listed separately. The guidance SHALL NOT require a new file in the repository.

#### Scenario: Reviewer dispatched on a committed branch
- **WHEN** the lead dispatches a reviewer for commits on a branch
- **THEN** the brief names the range, the diff command for it and each changed file with its line counts, so the reviewer can start from the diff without rediscovering the scope

#### Scenario: Review of uncommitted work
- **WHEN** the work under review is uncommitted
- **THEN** the brief says "working tree against HEAD", gives the matching diff command and lists untracked files separately, since the diff command does not show them

#### Scenario: Commits plus uncommitted edits
- **WHEN** the branch under review has commits and uncommitted edits
- **THEN** the brief reviews the working tree against the base, so neither part is hidden

#### Scenario: Large diff
- **WHEN** the diff is too large to read in one pass
- **THEN** the brief names per-file diff commands so the reviewer reads it in parts, and no file is written to the repository

#### Scenario: State not reproducible by git
- **WHEN** the reviewed state cannot be shown by a git command
- **THEN** the lead saves it in the scratch folder following the temporary-work rule and the brief carries that path

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

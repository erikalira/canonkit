# Spec Delta

## Purpose

Preserve the minimum trustworthy task state across handoffs and distinguish implementation readiness from authorization to finalize external actions.

## ADDED Requirements

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

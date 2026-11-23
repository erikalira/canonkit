# Spec Delta

## Purpose

Record, per subagent dispatch, the cost components needed to compare token-saving changes, without logging prompts, reports or tool output.

## ADDED Requirements

### Requirement: Cache writes are split by lifetime
The Claude Code hook SHALL record, in each `agent_end` token summary, the sum of 5-minute and 1-hour cache-write tokens from the subagent transcript, and SHALL record them as null when no API call reports the split.

#### Scenario: Transcript reports the split
- **WHEN** the subagent's API calls carry `usage.cache_creation.ephemeral_5m_input_tokens` and `ephemeral_1h_input_tokens`
- **THEN** `tokens.cache_creation_5m` and `tokens.cache_creation_1h` are their sums across calls

#### Scenario: Transcript lacks the split
- **WHEN** no API call carries `usage.cache_creation`
- **THEN** both fields are null, and `tokens.cache_creation` keeps its existing total

### Requirement: The cold-start floor is recorded apart
The hook SHALL record the first API call of a dispatch, in transcript order and counted once when split over entries, as `tokens.first_call` with its input, cache-read and cache-write tokens and their sum as `context`.

#### Scenario: Multi-call dispatch
- **WHEN** a dispatch made several API calls
- **THEN** `tokens.first_call` describes only the first, and the existing totals still cover all calls

### Requirement: The final call is waited for or flagged
At a background subagent's stop, the hook SHALL wait a bounded time for the `SubagentHandback` entry to reach the transcript before measuring, and SHALL mark the line incomplete when it does not arrive.

#### Scenario: Handback written late
- **WHEN** the handback entry is written within 1.5 s of the stop
- **THEN** `report_chars` is its message length, the token totals include that call, and `complete` is true

#### Scenario: Handback never written
- **WHEN** no handback entry appears within 1.5 s
- **THEN** the line is written with `complete: false` and the hook does not wait longer

#### Scenario: Handback already present
- **WHEN** the transcript already contains the handback at the stop
- **THEN** the hook does not wait

### Requirement: Brief and resume sizes are recorded as lengths
The hook SHALL record the length of a dispatch prompt in `agent_start.brief_chars` and of a resume message in `agent_resume.message_chars`, null when absent, and SHALL NOT record their text.

#### Scenario: Dispatch with a prompt
- **WHEN** an Agent tool call carries a prompt
- **THEN** `brief_chars` equals its length and the log line contains no part of it

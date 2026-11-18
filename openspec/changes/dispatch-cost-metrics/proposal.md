# Proposal

## Why

`docs/plans/token-cost-handoff.md` ranks proposals to cut the token cost of subagent dispatches. Every one of them must be judged against the dispatch log, and the log cannot yet tell them apart:

- Cache writes are one number, though the transcript separates 5-minute from 1-hour writes, which are priced differently. Every write observed in pitakus was 1-hour.
- The cold-start floor (the context of a dispatch's first API call) is mixed into the dispatch total, so a change to agent tools, skill lists or managed instructions cannot be measured on its own.
- The size of the brief sent to a subagent, and of a message that resumes one, is not recorded.
- `report_chars` is null in 26 of 43 retained `agent_end` lines. A read-only diagnosis of the matching transcripts (2026-11-18) showed a race: at `SubagentStop` the subagent's final assistant entry, the `SubagentHandback` call carrying the report, is not yet on disk. Every null line counted one API call fewer than its transcript; every complete line matched. The same race drops that final call, the one with the largest context, from the token totals, so past totals are underestimates.

## What Changes

- `agent_end.tokens` gains `cache_creation_5m`, `cache_creation_1h` and `first_call` (`input`, `cache_read`, `cache_creation`, `context`). Existing fields keep their meaning.
- At `SubagentStop`, when the transcript has no `SubagentHandback` yet, the hook re-reads it every 100 ms for at most 1.5 s. A background `agent_end` records `complete: false` when the handback never appeared, so analysis knows the last call may be missing.
- `agent_start` gains `brief_chars`; `agent_resume` gains `message_chars`. Lengths only, never text.
- `docs/telemetry.md` and `CHANGELOG.md` describe the new fields and the fix.

Out of scope: Codex and OpenCode adapters, dashboard presentation of the new fields, backfilling old log lines, and the token-saving proposals themselves (2 to 8 in the handoff).

## Capabilities

### New Capabilities

- `dispatch-metrics`: The Claude Code dispatch log records the cost components needed to compare dispatches: cache-write split, cold-start floor, brief and resume sizes, and a complete or flagged final call.

### Modified Capabilities

None. The dashboard read model reads `tokens` through an allowlist and ignores the added fields.

## Impact

`hooks/canonkit-hook.js` (dispatch metrics and the observability branch), `test/canonkit-hook.test.js`, `docs/telemetry.md`, `CHANGELOG.md`. The log format change is additive. A `SubagentStop` can take up to 1.5 s longer, only when the handback is missing. Privacy is unchanged: only numbers and lengths are logged.

## Acceptance criteria

1. With a transcript whose calls carry `usage.cache_creation.ephemeral_5m_input_tokens` and `ephemeral_1h_input_tokens`, `agent_end.tokens` sums each into `cache_creation_5m` and `cache_creation_1h`; with no call carrying the split, both are `null`, not 0.
2. `tokens.first_call` holds the first API call in transcript order (a call split over entries counted once), with `context = input + cache_read + cache_creation`.
3. A background `SubagentStop` whose `SubagentHandback` entry is written to the transcript within 1.5 s logs its `report_chars` and counts that call; one never written logs `complete: false` and returns within about 1.5 s; one already present causes no wait.
4. `agent_start.brief_chars` is the length of `tool_input.prompt` (null when absent); `agent_resume.message_chars` is the length of the message (null when absent). No text is logged.
5. Existing hook and dashboard tests still pass; the full suite runs once after the last edit.

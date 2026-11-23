# Design

## Evidence

Diagnosis run by the user on 2026-11-18 over the retained `agent_end` lines (structure and sizes only, no text):

- Every subagent transcript ends with an assistant entry calling `SubagentHandback`.
- Every `agent_end` with `report_chars: null` logged `api_calls` one lower than its transcript holds; every complete line matched it. The final entry is timestamped 130–520 ms before the hook's log line but reached disk after the hook read the file.
- Non-null values in lines where the handback was absent came from `last_assistant_message` (an `end_turn` text before the handback); later stops of the same agent had none.
- All first calls carry `usage.cache_creation` with both `ephemeral_5m_input_tokens` and `ephemeral_1h_input_tokens`.

## Decisions

**Bounded wait, then flag (chosen by the user).** In the `SubagentStop` branch, when `scanTranscript` finds no handback, wait 100 ms (`Atomics.wait` on a `SharedArrayBuffer`, synchronous like the rest of the hook) and rescan only if the file size changed, up to 1.5 s in total. If none appears, log `complete: false`; a complete line logs `complete: true`. Rejected: reconciling on a later main-thread event (more code, lost when the session ends first); flagging only (leaves about 60% of lines incomplete).

**Foreground dispatches do not wait.** Their report comes from the `PostToolUse` payload, not the transcript, and `complete` is omitted there. Whether their token totals suffer the same race is unmeasured; noted as a limitation.

**Null means unknown.** `cache_creation_5m`/`_1h` are `null` when no call carries the split, so old Claude Code versions are not read as "zero 1-hour writes". `first_call` is absent when there are no calls (`tokens` is already null then).

**No carry-forward of earlier measurements.** The existing `execution-observability` requirement says a later cumulative line's missing values stay missing. The wait removes the cause; `complete: false` marks what remains.

**Lengths are UTF-16 units**, like `report_chars`.

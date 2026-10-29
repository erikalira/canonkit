# Dispatch metrics, context contributors and the dashboard

The Claude Code hook records numbers and metadata about what each session spends
— never the text of a prompt, a command or a result. Everything stays on your
machine, in `~/.claude/canonkit-activity/`. Nothing is sent anywhere.

## Dashboard

`install` copies the dashboard to `~/.claude/canonkit-dashboard/`. Run:

```bash
node ~/.claude/canonkit-dashboard/serve.js              # Linux, macOS and Git Bash
node $HOME\.claude\canonkit-dashboard\serve.js          # Windows (PowerShell)
```

PowerShell does not expand `~` in arguments to external programs: with `~/`, Node
looks for the file inside the current folder and fails with `MODULE_NOT_FOUND`.

Then open `http://localhost:4317`: besides the timeline, it groups dispatches by
(model, effort) and by agent, with the number of dispatches, average tokens,
average report size and average duration.

## Dispatch metrics

Each subagent dispatch becomes two lines in
`~/.claude/canonkit-activity/events.jsonl`, linked by `id` (the `tool_use_id`):
`agent_start` (agent, description, `model`, `effort`; empty = inherited the
default) and `agent_end` (resolved model, duration, input / output / cache read /
cache write tokens, number of API calls, and `report_chars`, the size of the
report that came back into the dispatcher's context — it is re-read on every
later turn, so it is a cost separate from what the subagent spent). Only numbers
and metadata — never the text of the prompt or the result.

### Stable fields

Other tools may read these. There are two files in `~/.claude/canonkit-activity/`,
each rotating at 2 MB to a single `.1`:

- `events.jsonl` holds only low-volume enforcement and dispatch events;
  high-volume measurement events never go there, because the Stop gate reads it
  and a large volume would push the session's gates out of it.
- `tool-results.jsonl` holds `tool_result` (fields under
  [Context contributors](#context-contributors), below).

Up to 1.1.5, `tool_result` was written to `events.jsonl`; since 1.2.0 it goes to
`tool-results.jsonl`. The 1.1.5 lines stay in `events.jsonl` and its `.1` until
rotation pushes them out, and the dashboard reads both.

On every line: `ts` (ms since the epoch), `session` and `event`. In
`events.jsonl`, the events are `prompt`, `gate`, `agent_start`, `agent_launch`,
`agent_end`, `agent_stop` and `agent_resume`.

- `gate`: `kind` (`git`, `high-risk-surface`, `secret-block`, `secret-ask`,
  `perf-budget`, `excluded-by-config`, `context-size`, `definition-of-done`),
  `file`, `tool`, `project`; in `excluded-by-config`, `glob`; in
  `high-risk-surface`, `rule`, the rule that matched (`config`, `include`,
  `secret-path`, `strong`, `auth`, `migration`, `word`, `ambiguous`); in
  `definition-of-done` (the Stop gate blocked the turn), `files` (how many files)
  and `rules` (the rules of the gates that made it fire).
- `agent_resume`: `to`, `has_message` (boolean) and `project`.
- `agent_start`/`agent_end`: `id`, `agent`, `model`, `effort`; in `agent_end`,
  also `resolved_model`, `mode`, `duration_ms`, `tool_uses`, `tokens` and
  `report_chars`.

Unknown fields must be ignored by readers: new ones may appear without notice.

### One dispatch can have more than one `agent_end`

A continued or resumed agent writes a new line with the same `id` at every stop,
with **cumulative** tokens and duration. For cost, keep the last line per `id`
(that is what the dashboard does). Adding up every line counts the same work
again: on a real log, the naive sum gave 642M tokens against 495M deduplicated.

### Where the token numbers come from

Tokens are **summed from the subagent's transcript**, not read from the hook
payload: the `usage` that `PostToolUse` delivers describes only the last API call
(≈ the final context size) and underestimates exactly the dispatches with many
turns. On a background dispatch (the default), `PostToolUse` arrives at launch,
with no numbers, and `agent_end` is written on `SubagentStop`. If the transcript
cannot be read, `tokens` is `null` — never estimated.

Two limits, checked on a real transcript (2026-10-19). **Output is a floor**: the
transcript repeats, across several lines of the same call, the count from the
start of streaming, and for many calls the final count is never written. The hook
keeps the largest value seen per call; input and cache are complete. **In the
background, the report comes back through the `SubagentHandback` tool**, not as
the last text message, so `report_chars` measures the `message` of the last
`SubagentHandback` in the transcript and only falls back to
`last_assistant_message` when there is none.

## Context contributors

The same `PostToolUse` writes to `tool-results.jsonl` a single `tool_result` line
per recognized textual result of `Read`, `Grep`, `Glob`, `Bash` and `PowerShell`,
on the **main thread** and **inside subagents**:

```json
{"ts": 1234567890000, "session": "synthetic-session", "event": "tool_result", "thread": "main", "tool": "Read", "tool_use_id": "toolu_01Abc", "chars": 1200, "lines": 40}
{"ts": 1234567890001, "session": "synthetic-session", "event": "tool_result", "thread": "subagent", "agent_id": "a1b2c3d4e5f6a7b8c", "agent_type": "bob", "tool": "Bash", "tool_use_id": "toolu_01Def", "chars": 28000, "lines": 750}
```

`thread` says whose context received the result: `main` (the payload has no
`agent_id` key), `subagent` (a valid `agent_id` — the same one `agent_launch` /
`agent_end` record, and it is how the dashboard links the result to the dispatch)
or `unknown` (the key exists but the value is empty or invalid: it never becomes
main and is never attributed to an agent). A line **without** `thread` predates
the field and was only written for the main thread. `tool_use_id` (omitted when
missing or invalid) lets a reader drop the second line of a hook registered twice;
`agent_type` only appears when it passes the agent-type validator (the ID one plus
`.` and `:`, up to 128 characters, so that plugin agents like `plugin:reviewer`
keep their own row); a type with a space, slash or quote is omitted and the agent
shows up as `unknown`.

Only these fields are persisted: no content, input, prompt, command, path, project
basename or arbitrary status. `session` goes through the existing ID validator; a
missing/invalid session produces no measurement. `chars` uses UTF-16 units (like
`report_chars`); `lines` counts text lines, with CRLF counted once, no extra line
for a final terminator, and empty output is zero. For the shells, the numbers are
the sum of stdout and stderr, counted separately. Collection/write failures stay
silent and fail open. Gates and dispatch metrics are unchanged.

The contract was checked against `sdk-tools.d.ts` in
[`@anthropic-ai/claude-agent-sdk@0.3.300`](https://unpkg.com/@anthropic-ai/claude-agent-sdk@0.3.300/sdk-tools.d.ts)
and the local Claude Code 2.1.302 schemas (PowerShell and main-thread
identification). `Read` uses `file.content` when `type` is `text`; `Grep` uses
`content` in the `content`/`count` modes, or `filenames` in files mode; `Glob`
uses `filenames` joined by newline; the shells use `stdout`/`stderr`. Only
`agent_id` identifies a subagent; `agent_type` alone also exists on the main
thread with `--agent` and does not make it a subagent. Older runtimes without this
subagent identification have no guaranteed separation.

**Limits:** [PostToolUse](https://code.claude.com/docs/en/hooks#posttooluse)
exposes structured output, before the final formatting of the tool result: the
volume is the text in the payload, **not** tokens or exact context growth. It does
not include line prefixes, banners, images, other Read formats, or results of an
unknown schema. Those cases stay unmeasured, rather than an invented zero.
Truncated/persisted/background outputs measure only the text available in that
payload, without opening output files. There is no guaranteed exit code; success
or failure is not inferred from stderr. Tool failures that only produce
`PostToolUseFailure` are outside this phase.

### In the dashboard

The **Context contributors** section has a "retained history" window (all
sessions, subagents grouped by agent type) and one per session. In each: tool
results received by the main thread × subagents × unidentified (chars, calls,
average); the main thread's context by tool (total, share, calls, average and
largest result), where "Agents" reuses `agent_end.report_chars`, keeping the last
cumulative report per session/dispatch; and each subagent with its tools. Main and
subagents are separate contexts: a subagent's result stays in its context, and
only the report goes back to main. In the retained window, "dispatches" per type
counts the subagents identified by `agent_id` (in a `tool_result`,
`agent_launch` or `agent_end`), not the rows of the dispatch table: an
`agent_end` without `agent_id` adds its report to "Agents" but does not enter that
count.

A subagent without a measured result shows up with the reason, never as zero:
`no tool use` (`agent_end.tool_uses` = 0), `insufficient data` (the session has no
line written by a hook that measures subagents — earlier history) or
`no measured result` (it only used tools outside the five, an unknown payload, or
it is still running). The denominator is only the volume measured in the retained
files (`tool-results.jsonl` and `.1`, plus the 1.1.5 lines still in
`events.jsonl` and `.1`), not the whole session if earlier data was already
dropped. No "Other" category is invented for unknown volume.

**Windows.** The top counters and the timeline use the **last 300 events**
(excluding `tool_result`) and count *started* dispatches; the per-model and
per-agent tables use **the whole retained history** and count *finished*
dispatches. The numbers differ when the history passes 300 events, when a dispatch
is still running or when its start has already left the log. The dashboard shows
where each window starts.

**Tokens.** The per-model and per-agent tables show, besides the averages, Σ total,
input, output, cache read, cache write, API calls and "cache read %" = cache read ÷
(input + cache read + cache write), summed over the dispatches that have tokens
(the "with tokens" column). Every API call resends the whole context, so cache
read is counted again on every call: Σ total is volume processed, not new tokens
nor cost. Output is a floor (see above) and appears with `≥`. There is no cost
calculation: it would need verifiable per-model prices and a methodology for the
incomplete output.

The tool-result volume, including the subagents', has its own retention in
`tool-results.jsonl` and does not shorten the gate and dispatch history in
`events.jsonl`. The more tools a session uses, the less time the *volume* history
covers.

### Collecting on an existing installation

Reinstall from this checkout and update **the existing** `PostToolUse` entry to
the matcher above, avoiding duplicate hooks (or run
`npx canonkit install --wire-hooks`, which updates the entry instead of adding a
second one). The installer warns if it finds the old `Agent|Task` matcher, but
without `--wire-hooks` it still does not write to `settings.json`. Editing the
installed copies does not replace changing the source in this repository.

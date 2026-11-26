# Design

## Context

See proposal.md (Why) for the motivation. The facts that shape the approach are these:

- `executionSnapshot()` in `dashboard/execution-model.js` builds every session from the retained logs. Each session has `lastObservedAt`, which is computed from the full, uncapped observation list, and `dispatches[]`. Each dispatch has `executionState` and `agent`, the agent type such as `bob`. The 2 s poll of `/execution.json` returns all of this.
- The snapshot's `agents[]` holds only the runtime `agentId` and the derived activity. It has no agent type, and dispatches without an `agentId` are left out. It cannot name the agents on a card by itself.
- `projectId`, `worktreeId` and `branch` are always `null` today. The hooks do not record them, and the `execution-observability` spec forbids inferring them.
- A dispatch with no end becomes `unknown` unless the session shows later activity (`execution-model.js:134-137`). This is the existing evidence rule, and "working" must respect it.
- The React app (`dashboard/src/main.tsx`) is bundled by Vite and has no unit-test harness. The model is CommonJS and is covered by `node:test` in `test/dashboard.test.js`.

## Goals / Non-Goals

**Goals:**
- Keep the recent-activity rule in the read model, where `node:test` can test it and where the evidence rules already live. The UI only renders it.
- Reuse the current session-selection state, so a card click and the selector are one path.

**Non-Goals:**
- No new server endpoint, polling loop or log source.
- No change to how a single session's graph or timeline is built.

## Decisions

### 1. The window is evaluated in the read model against `generatedAt`

`executionSnapshot()` adds `recentActivity: { windowMs, sessions: [...] }`. A session is included when `generatedAt - lastObservedAt <= windowMs`, with `windowMs = 15 * 60 * 1000`. The function takes an optional `now` for tests, in the same spirit as the existing optional `limit`.

*Alternative:* compute it in the browser with `Date.now()`. It was rejected because it cannot be tested with the current harness, and it would make "recent" depend on the browser clock rather than the snapshot that holds the evidence.

### 2. Each entry is a summary, not a copy of the session

Each `recentActivity.sessions[]` entry holds `sessionId`, `runtime`, `projectId`, `branch`, `lastObservedAt`, `lastObservedType`, `workingAgents` and `unendedDispatches`. `workingAgents` comes from the dispatches with `executionState === 'active'`, as `{ executionId, agent }`, where `agent` stays `null` when no type was observed. `unendedDispatches` counts dispatches with `endedAt == null` whose state is not `active`. The entries are ordered by `lastObservedAt` descending.

The derivation runs after the existing state pass, so it sees the final `executionState`. `lastObservedType` comes from the full observation list, not the capped tail.

*Alternative:* extend `agents[]` with the agent type. It was rejected because it changes the meaning of an existing field and still leaves out dispatches without an `agentId`.

### 3. The fields are additive and `schemaVersion` stays 1

The only consumer is the bundled dashboard, and no existing field changes. This matches the spec's "Existing consumers" scenario.

### 4. The panel sits above the overview strip and drives a set of selected sessions

The first iteration opened one session per card (`aria-current`, "Viewing"). After a browser test the user asked for the sessions in one graph, so a card is now a real toggle.

`App` replaces `sessionId: string` with `selection: { mode: 'recent' } | { mode: 'manual', ids: string[] }`. In `recent` mode, the shown set is derived on each snapshot: every `recentActivity.sessions` ID, or the latest session when none is recent. The first card toggle copies the derived set into `manual` mode and then applies the toggle. "Show all recent" returns to `recent` mode. On each poll, `manual` IDs missing from `snapshot.sessions` are dropped and nothing else changes.

Cards are `<button aria-pressed>`, which is now correct because pressing toggles. They show a visible "▸ In graph" mark when pressed, so the state is not colour-only, and the full ID in `title`. The panel lists the union of recent sessions and manually selected ones. A selected session outside the window gets an "Outside 15-min window" line.

The `SESSION` selector becomes "Add session". It lists the sessions not shown yet, and picking one adds it in manual mode and resets the select.

The relative times are computed from `snapshot.generatedAt`, not `Date.now()`. When the connection drops, the ages freeze at the last snapshot. The panel then states the snapshot time itself ("as of …") and words ages as "before last update", so the panel is clear even without the stale banner above it. The microcopy uses "Recent activity · last 15 min", "Agents with an open dispatch", "Dispatches with no end seen", "Last event 3 min ago", "No session had activity in the last 15 minutes" and, with no sessions at all, "No sessions observed yet". It never uses "running", "live", "online" or "working". Missing project and branch show as the labelled pair "Project: not identified · Branch: unavailable".

*Alternative:* replace the selector with the panel. It was rejected because sessions older than 15 minutes would become unreachable.

*Alternative:* a single-session/all-sessions switch. It was rejected by the user in favour of choosing which sessions are shown.

### 5. Panel layout

The panel is a horizontally wrapping grid of cards. With many sessions it scrolls inside a capped height instead of pushing the graph off-screen. No virtualisation is added: the retained logs hold tens of sessions, not thousands.

### 6. One graph, one lane per session

`graphFor(sessions: Session[], view)` builds each session's subgraph exactly as today, runs `arrangeGraph` on each subgraph on its own, and then offsets each subgraph vertically. Each lane starts below the previous lane's lowest node, plus a gap. The order is the selection's recency order, so lanes are stable while the set is unchanged.

Every node and edge ID is namespaced by session. Node IDs already are. Edge IDs (`session-dispatch-${i}`, `session-gate-${i}`, `session-signal-${i}`) gain the session ID, because without it two sessions' edges collide and React Flow drops or mis-wires them. No edge is ever created between two sessions.

A lane is marked by its session node, whose title is "Session <short id>", and by a lane background. The lane background is a non-interactive group node behind the lane, which gives a visual boundary without implying a relation.

*Alternative:* one `arrangeGraph` over the merged graph. It was rejected because depth columns interleave sessions, and a viewer reads adjacent nodes as related.

### 7. Uncorrelated signals are summarised when several sessions are shown

With one session selected, the graph keeps today's behaviour: one node per uncorrelated prompt, resume or stop. With two or more sessions, each session gets one "Runtime signals" summary node instead, which shows the count and the latest signal's time. The timeline still lists every signal individually. Selecting one in the timeline frames the summary node and inspects the event itself.

*Why:* each prompt is a node, up to 300 per session. Eight sessions would put about 2,400 nodes into React Flow, rebuilt on a 2 s poll, and the dispatch and gate structure would drown.

*Alternative:* always summarise. It was rejected because the current single-session view lets a user click each prompt, and that already-reviewed behaviour should not change.

### 8. Inspector, timeline and header resolve the session from the record

`inspectNode` and `selectObservation` stop using a single `activeSession`. They parse the session ID from the node ID, or read it from the event's `sessionId`, and look the record up in that session.

The timeline is the selected sessions' observations merged by `timestamp`, with ties broken by session ID and then index. Each row shows `short(sessionId, 8)`. The agent filter lists agents across the selected sessions.

With no node selected, the inspector shows today's session details when one session is shown. When several are shown, it shows a compact list of the shown sessions with their IDs and dispatch counts.

The header shows the project and branch for one session and "N sessions" for several. `OBSERVED DISPATCHES` sums the shown sessions.

## Risks / Trade-offs

- [Render cost grows with the number of shown sessions, because the graph signature is a `JSON.stringify` of all nodes every 2 s] → Decision 7 bounds the node count to the dispatches and gates plus one node per session. Perry reviews this with a measurement taken from the production build, at the number of sessions the user actually runs.
- [A cross-session mis-correlation in the inspector or timeline, for example showing session A's record for a node in lane B] → Node and edge IDs are namespaced by session, and lookups resolve the session from the ID. The pure graph and timeline builders are moved into a testable module and covered by `node:test`.

- [A long quiet subagent makes a session look idle, because no events arrive while it works] → The card shows "last event N min ago" and "dispatches without end signal", which tells the user why. This is accepted, since the hooks emit nothing in between.
- [A session with no activity for 15 minutes or more but still open drops off the panel] → It stays in the selector. The window is fixed for now, and making it configurable is out of scope.
- [A larger poll payload] → The payload grows by one small summary per recent session, with no observations copied. This is negligible next to the 300-observation tails.
- [The card click resets the graph selection] → This is intended and matches the selector's existing behaviour. The graph layout of the newly opened session is rebuilt, as it is today when switching sessions.

## Migration Plan

None. The change only adds fields and UI. To roll it back, revert the commit, because nothing is persisted.

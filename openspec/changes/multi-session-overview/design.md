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

### 4. The panel sits above the overview strip and drives `sessionId`

A new `SessionOverview` component renders the cards as `<button>` elements with `aria-pressed` set for the open session, inside a labelled region. A click calls the existing `setSessionId`. That already resets the inspector (`main.tsx:238`) and keeps the selector in sync. The polling effect already keeps a selected session that is no longer recent, because it checks `data.sessions`, not the recent list. A session that leaves the window therefore stays open.

The relative times are computed from `snapshot.generatedAt`, not `Date.now()`. When the connection drops, the ages freeze at the last snapshot, and the existing stale banner explains why. The microcopy uses "Recent activity · last 15 min", "Last event 3 min ago" and "No session had activity in the last 15 minutes", and never "running", "live" or "online". Missing project and branch reuse the header's current wording, "Project not identified" and "Unavailable from runtime hooks".

*Alternative:* replace the selector with the panel. It was rejected because sessions older than 15 minutes would become unreachable.

### 5. Layout

The panel is a horizontally wrapping grid of cards. With many sessions it scrolls inside a capped height instead of pushing the graph off-screen. No virtualisation is added: the retained logs hold tens of sessions, not thousands.

## Risks / Trade-offs

- [A long quiet subagent makes a session look idle, because no events arrive while it works] → The card shows "last event N min ago" and "dispatches without end signal", which tells the user why. This is accepted, since the hooks emit nothing in between.
- [A session with no activity for 15 minutes or more but still open drops off the panel] → It stays in the selector. The window is fixed for now, and making it configurable is out of scope.
- [A larger poll payload] → The payload grows by one small summary per recent session, with no observations copied. This is negligible next to the 300-observation tails.
- [The card click resets the graph selection] → This is intended and matches the selector's existing behaviour. The graph layout of the newly opened session is rebuilt, as it is today when switching sessions.

## Migration Plan

None. The change only adds fields and UI. To roll it back, revert the commit, because nothing is persisted.

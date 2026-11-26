# Proposal

## Why

The observatory shows one session at a time. A `SESSION` selector picks which one, and by default it shows the session with the most recent observation. A user running several Claude Code sessions in parallel has to switch the selector back and forth to see what each one is doing, and cannot tell at a glance which sessions are still moving. The snapshot the server polls every 2 s already carries every session, its `lastObservedAt` and its dispatches. Only the UI is single-session.

## What Changes

- Add a **session overview panel** to the execution dashboard. It shows one card per session with recent activity: a short session ID, project and branch (labelled unavailable when the runtime does not supply them), the agents with an observed active dispatch, how many dispatches have no end signal, the last observed event type, and how long ago it happened.
- **Recent activity** means at least one observation in the last 15 minutes, measured from the snapshot's `generatedAt`. The UI calls this "recent activity", never "running" or "online", because the runtime emits no session-end signal.
- Selecting a card opens that session in the existing graph, inspector and timeline, the same as choosing it in the selector. The card for the open session is marked as selected.
- When no session has activity in the window, the panel says so and still offers the selector. Sessions outside the window leave the panel but stay in the selector.
- The read model (`execution.json`) adds a field that lists the sessions with recent activity, the window size, and the active agents on each. Existing fields keep their names and meaning, and `schemaVersion` stays at 1.
- Not in scope: a unified multi-session graph, a merged timeline, a configurable window, notifications, and any new source of project, branch or session-end identity.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `execution-observability`: adds a requirement to classify sessions with recent activity against a fixed window, relative to the snapshot time, without claiming a session is running.
- `observability-dashboard`: adds a requirement for the multi-session overview panel, its selection behaviour, its empty and stale states, and its wording.

## Impact

- Code: `dashboard/execution-model.js` gets the recent-activity derivation, `dashboard/src/main.tsx` and `dashboard/src/style.css` get the panel, and `test/dashboard.test.js` gets the tests.
- API: `execution.json` gets one new field. It is read only by the bundled dashboard, and `serve.js` needs no new endpoint.
- No new dependencies. No changes to hooks, log formats or retention.
- Risk: MEDIUM. The change alters dashboard behaviour on a shared local read model, and the main regression risks are the selection and graph-state preservation during polling.

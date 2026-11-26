# Tasks

## 1. Read model: recent session activity

- [ ] 1.1 In `dashboard/execution-model.js`, export `RECENT_ACTIVITY_WINDOW_MS` (15 min). Accept an optional `now` in `executionSnapshot(events, limit, now)` and use it as `generatedAt`. Verify that the existing `test/dashboard.test.js` cases still pass unchanged.
- [ ] 1.2 Add `recentActivity: { windowMs, sessions[] }` after the dispatch-state pass. Each entry has `sessionId`, `runtime`, `projectId`, `branch`, `lastObservedAt`, `lastObservedType` (taken from the full list), `workingAgents` (`{ executionId, agent|null }` for `active` dispatches) and `unendedDispatches`. Sort entries by `lastObservedAt` descending. Verify with new `node:test` cases for: inside the window, exactly at the boundary, outside the window (and the session is still in `sessions[]`), an unended dispatch with no later activity (counted as unended, not working), an active dispatch with no agent type (`agent: null`), and `lastObservedType` taken beyond the 300-observation cap.
- [ ] 1.3 Verify `schemaVersion` is still 1 and that existing fields are deep-equal to what a pre-change fixture produces, through a test on a representative fixture.

## 2. Dashboard: session overview panel

- [ ] 2.1 Add the `recentActivity` types and a `SessionOverview` component in `dashboard/src/main.tsx`. Render it above the overview strip, with one `<button aria-pressed>` card per entry: short ID, project and branch or the current unavailable labels, working agents (with "Unidentified agent" when `agent` is null), unended-dispatch count, last event type, and age measured from `snapshot.generatedAt`. Verify with `npm run dashboard:typecheck` and `npm run dashboard:build`.
- [ ] 2.2 Wire a card click to `setSessionId`, and add the empty state "No session had activity in the last 15 minutes", which points to the selector. Verify in a browser against a fixture log with two sessions inside the window and one outside it. Two cards show, clicking each one switches the graph, timeline and selector, and the older session is reachable only through the selector.
- [ ] 2.3 Style the panel in `dashboard/src/style.css`: a wrapping grid, a capped height with internal scroll, a selected state that does not rely on colour alone, a visible focus ring, and respect for reduced motion. Verify it with keyboard-only navigation (Tab to a card, then Enter or Space opens it) and at 200% zoom.
- [ ] 2.4 Verify polling behaviour in the browser. While a session is open with a moved node and a selected node, a new event in another session updates its card without moving the layout or clearing the selection. Stopping the server freezes the ages and shows the stale banner.
- [ ] 2.5 Update the dashboard paragraph in `README.md` and the dashboard section of `docs/telemetry.md` to mention the recent-activity panel and its 15-minute window, and say that it does not mean a session is running. Verify that `git diff` shows only those wording additions.

## 3. Integration

- [ ] 3.1 Run `npm test`, because `pretest` builds the dashboard. Record the totals in this change, then run `graphify update .`.
- [ ] 3.2 Before sync or archive, get Pixie's review of the panel's states and microcopy (MEDIUM, UX domain) and Spencer's drift check of the specs against the code. Record the outcomes here.

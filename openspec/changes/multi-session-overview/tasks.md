# Tasks

## 1. Read model: recent session activity

- [x] 1.1 In `dashboard/execution-model.js`, export `RECENT_ACTIVITY_WINDOW_MS` (15 min). Accept an optional `now` in `executionSnapshot(events, limit, now)` and use it as `generatedAt`. Verify that the existing `test/dashboard.test.js` cases still pass unchanged.
- [x] 1.2 Add `recentActivity: { windowMs, sessions[] }` after the dispatch-state pass. Each entry has `sessionId`, `runtime`, `projectId`, `branch`, `lastObservedAt`, `lastObservedType` (taken from the full list), `workingAgents` (`{ executionId, agent|null }` for `active` dispatches) and `unendedDispatches`. Sort entries by `lastObservedAt` descending. Verify with new `node:test` cases for: inside the window, exactly at the boundary, outside the window (and the session is still in `sessions[]`), an unended dispatch with no later activity (counted as unended, not working), an active dispatch with no agent type (`agent: null`), and `lastObservedType` taken beyond the 300-observation cap.
- [x] 1.3 Verify `schemaVersion` is still 1 and that existing fields keep their names and representative values (top-level and session key sets, agent activity, dispatch state), through a test on a representative fixture. The unchanged pre-existing tests cover the rest of the existing fields' meaning.

## 2. Dashboard: session overview panel

- [x] 2.1 Add the `recentActivity` types and a `SessionOverview` component in `dashboard/src/main.tsx`. Render it above the overview strip, with one `<button aria-pressed>` card per entry: short ID, project and branch or the current unavailable labels, working agents (with "Unidentified agent" when `agent` is null), unended-dispatch count, last event type, and age measured from `snapshot.generatedAt`. Verify with `npm run dashboard:typecheck` and `npm run dashboard:build`.
- [x] 2.2 Wire a card click to `setSessionId`, and add the empty state "No session had activity in the last 15 minutes", which points to the selector. Verify in a browser against a fixture log with two sessions inside the window and one outside it. Two cards show, clicking each one switches the graph, timeline and selector, and the older session is reachable only through the selector.
- [x] 2.3 Style the panel in `dashboard/src/style.css`: a wrapping grid, a capped height with internal scroll, a selected state that does not rely on colour alone, a visible focus ring, and respect for reduced motion. Verify it with keyboard-only navigation (Tab to a card, then Enter or Space opens it) and at 200% zoom.
- [ ] 2.4 Verify polling behaviour in the browser. While a session is open with a moved node and a selected node, a new event in another session updates its card without moving the layout or clearing the selection. Stopping the server freezes the ages and shows the stale banner.
- [x] 2.5 Update the dashboard paragraph in `README.md` and the dashboard section of `docs/telemetry.md` to mention the recent-activity panel and its 15-minute window, and say that it does not mean a session is running. Verify that `git diff` shows only those wording additions.
- [x] 2.6 Apply the UX review's concrete fixes (user-approved set): focus ring not clipped by the scroll container; panel states snapshot time and "before last update" when disconnected; `aria-current` with a "Viewing" mark and full ID in `title`; "Project: not identified · Branch: unavailable"; "Agents with an open dispatch" / "Dispatches with no end seen"; "No sessions observed yet" when the snapshot has no sessions; "Recent sessions" heading with the count. Verify with `npm run dashboard:typecheck`, `npm run dashboard:build` and `node --test test/dashboard.test.js`; the visual parts are covered by 2.2–2.4.

## 3. Integration

- [x] 3.1 Run `npm test`, because `pretest` builds the dashboard. Record the totals in this change, then run `graphify update .`.
  Result: 1287 tests, 1266 pass, 0 fail, 21 skipped (pre-existing skips); `graphify update .` rebuilt 4016 nodes / 6604 edges.
- [ ] 3.2 Before sync or archive, get Pixie's review of the panel's states and microcopy (MEDIUM, UX domain) and Spencer's drift check of the specs against the code. Record the outcomes here.
  Pixie (2026-11-26, code review, no browser): approve with conditions, no veto. The user chose the concrete fixes, applied in 2.6. Not applied by user choice: a first-load "Loading sessions…" line, stable card positions while focus is inside the panel, scrolling to the selected card, "just now", and mobile card density.
  Spencer (2026-11-26): no blocking drift. Fixed: wording of 1.3, branch label in design.md, and a stray formatting edit in main.tsx. Open: a final drift pass after 2.2–2.4, because the UI scenarios have no verification yet.
  2026-11-26: the user tested 2.2 and 2.3 in a browser and asked for the sessions in one graph. The scope grew; groups 4 and 5 below supersede the single-session card behaviour of 2.2 and 2.6, and 3.2 closes with group 5.

## 4. Multi-session graph

- [x] 4.1 Move the pure graph logic out of `main.tsx` into `dashboard/src/graph-model.js`, a plain ESM module with a `graph-model.d.ts` beside it, so that `node:test` runs it on Node 22 and 24 without a build. It holds `graphFor`, `arrangeGraph`, `referenceGraph`, `observationNodeId` and the helpers they use. Behaviour stays the same. Verify with `npm run dashboard:typecheck`, `npm run dashboard:build`, and a new `node:test` case asserting that the single-session graph keeps the same node IDs and positions logic as before.
- [x] 4.2 Change `graphFor` to take `Session[]`. Arrange each session's subgraph separately and offset it into its own lane, add a non-interactive lane background node, namespace every edge ID by session, and, when two or more sessions are shown, summarise uncorrelated signals in one "Runtime signals" node per session (design decisions 6 and 7). Verify with `node:test`: with two sessions, every node and edge ID is unique, no edge joins two sessions, lanes do not overlap vertically, the summary node appears only with two or more sessions, and the single-session output is unchanged apart from edge IDs.
- [x] 4.3 Add the selection model as pure functions in `graph-model.js`: derive the shown set for `recent` mode (falling back to the latest session), switch to `manual` on the first toggle, return to recent mode, and drop missing IDs on poll. In `App`, replace `sessionId` with this selection. Cards become `<button aria-pressed>` with a "▸ In graph" mark and an "Outside 15-min window" line for older selected sessions. Add a "Show all recent" control, turn the selector into "Add session", and show the empty-selection message. Verify with `node:test` cases for each selection transition, plus `npm run dashboard:typecheck`.
- [x] 4.4 Add a merged timeline builder to `graph-model.js`: sort by time, break ties by session and then index, and label each row with its session. In `App`, `inspectNode` and `selectObservation` resolve the session from the node ID or the event's `sessionId`, and selecting a summarised signal frames its summary node. The header shows "N sessions" and the dispatch count sums the shown sessions. With several sessions and no node selected, the inspector lists the shown sessions. Verify with `node:test` for merge order and node-ID resolution across two sessions, plus typecheck and build.
- [x] 4.5 Update the dashboard wording in `README.md` and `docs/telemetry.md`: you choose which sessions the graph shows, each session has its own lane, and nothing is inferred between sessions. Verify that `git diff` shows only wording changes in those files.

## 5. Integration after the multi-session graph

- [x] 5.1 Run `npm test` and `graphify update .`, and record the totals here.
  Result (2026-11-26): 1291 tests, 1270 pass, 0 fail, 21 skipped (pre-existing); `graphify update .` passed.
  Open defect against the spec scenario "New event arrives in a selected session": Bob reported that with several sessions, a new node avoids collisions only against kept nodes. It can land outside its own lane when a lane grows past the kept positions of the lane below. This must be fixed or covered by a test before 5.4.
- [ ] 5.2 Perry measures render and poll cost from the production build (`dashboard/dist`) at the number of sessions the user runs and at 8 sessions, and checks it against the dashboard's perceived-speed expectations (MEDIUM: node count grows with the number of shown sessions). Record the measurement and the verdict here.
- [ ] 5.3 Pixie re-reviews the toggle semantics, lanes, empty selection and merged timeline. Spencer runs the final drift check of the specs against the code. Record the outcomes here, then close 3.2.
- [ ] 5.4 The user verifies in a browser:
  - toggling cards adds and removes lanes;
  - "Show all recent" works;
  - an older session can be added and removed;
  - a timeline click frames the node in the right lane;
  - polling keeps the layout and selection;
  - stopping the server shows "as of …" (this also covers 2.4).
  Record what the user confirmed.

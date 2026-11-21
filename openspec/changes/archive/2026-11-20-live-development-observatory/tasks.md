# Tasks

Status below reflects the implementation and checks recorded in this worktree as of 2026-11-12. A checked task means the described work and evidence exist; it does not imply all acceptance criteria in the attachment are satisfied.

## 1. Existing event read model

- [x] 1.1 Normalize the allowlisted Claude Code lifecycle, prompt and gate events into versioned observations without raw prompts, arbitrary payloads, paths or fabricated event IDs; verify with deterministic dashboard fixtures.
- [x] 1.2 Aggregate dispatches by session plus observed dispatch ID, preserve the latest cumulative measurements including missing values, and infer parallelism only from overlapping observed intervals; verify duplicate, cumulative-null, ordering and overlap fixtures.
- [x] 1.3 Keep stop/resume and gate semantics conservative: correlate stop only to one uniquely identified dispatch, keep uncorrelatable events visible, and distinguish allow, confirmation-requested, blocked and unknown; verify lifecycle and gate fixtures.

## 2. Local server and dashboard

- [x] 2.1 Add `/execution.json` without changing legacy API responses; verify legacy endpoint compatibility and the execution read model using HTTP tests.
- [x] 2.2 Build the React Flow graph, separate observed execution from conditional LOW/MEDIUM/HIGH guidance, expose selected-node evidence and unknowns, and provide filtered timeline navigation; verify production build and TypeScript checking. No automated React rendering/interaction test exists; browser-rendered UX and accessibility remain unverified.
- [x] 2.3 Restrict requests to loopback same-origin access and fixed compiled assets, add applicable security headers, and reject traversal; verify Host, Origin, traversal, XSS-safe rendering and header tests.
- [x] 2.4 Preserve the Activity view, stale-snapshot explanation/retry, explicit layout action and future-only Agent Office label; verify source behavior and server/API dashboard tests. React connection/retry behavior has no rendered UI test; visual confirmation in a browser remains pending.

## 3. Package, docs and integration evidence

- [x] 3.1 Package runtime files and stable compiled assets without frontend sources or CLI runtime dependencies; verify `npm pack --dry-run` includes the asset bundle and third-party notices.
- [x] 3.2 Document local usage, schema, data boundaries and known runtime limits; verify README and telemetry instructions match the server and read model.
- [x] 3.3 Run `npm run dashboard:typecheck`, `npm run dashboard:build`, `npm test`, `npm pack --dry-run`, `git diff --check` and `graphify update .`; recorded outcomes: checks passed, full suite 1042 total / 1021 passed / 21 skipped / 0 failed, package 71 files, Graphify 2774 nodes / 4609 edges. npm audit was not verified because registry DNS returned `EAI_AGAIN`.
- [x] 3.4 Verify the compiled UI in a browser for readability, responsive behavior, keyboard operation, focus visibility and assistive-technology semantics; record the browser/environment and fix any demonstrated issues. Verified 2026-11-16 in Google Chrome 157.0.8103.78 (Linux, WSL2/WSLg) via chrome-devtools MCP, against fixture logs in a scratch HOME, at 1440×900 and 390×844 (mobile, reduced motion). Fixed: keyboard Enter selected a node but never opened the inspector; Backspace/Delete removed observed nodes from the passive view; nodes had no accessible name; edges were 9 invisible-focus tab stops; nodes and timeline rows had no visible focus ring; allowed and confirmation-requested gates were labeled "Completed" and "Unknown"; the session picker was off-screen at 390 px and the minimap covered the small canvas; programmatic camera/scroll ignored reduced motion; graph tabs lacked `aria-pressed`. Re-check passed: Lighthouse accessibility 100 (SEO meta description, irrelevant locally, is the only failure), typecheck, build, `test/dashboard.test.js` 21/21, `git diff --check`. Not tested with a real screen reader; semantics were checked through the accessibility tree.
- [x] 3.5 Observe a real, already-running Claude Code session and confirm the dashboard view against the records it produces without creating a session or invoking a model for telemetry. Verified 2026-11-16 on the implementing session itself, after the user enabled the hooks: 6 retained records (3 `prompt`, 1 `gate` context-size, 2 `agent_stop` with runtime agent IDs and no matching dispatch). `/execution.json` gave 6 observations with `eventId` null, project/worktree/branch null and the `project` field omitted; the gate decision was `allowed`; both stops stayed uncorrelated. The Chrome view (same environment as 3.4) matched: session node, Allowed gate, 5 "no dispatch link observed" nodes, 0 dispatches, "Project not identified". Coverage limit: the session dispatched no subagents, so real `agent_start`/`agent_end` correlation is covered only by fixtures.

## 4. Graph state stability

- [x] 4.4 Demonstrate graph viewport and selection stability across structural and data-only polling updates in an automated UI-level test or verified browser session. Verified browser session (same environment as 3.4): before the fix, the viewport and positions held but every poll dropped the selection, the inspector kept a superseded dispatch state, and new nodes were placed on top of existing ones. After the fix, with a data-only update (dispatch end) and then a structural one (new dispatch + gate), the viewport transform, kept positions and selection were unchanged; the inspector followed the latest snapshot (Completed, 42.0 s); and new nodes had no overlap. No automated UI-level test was added.

## Moved to follow-up changes (2026-11-16)

Out of scope per the proposal, so not tracked here. Each item is recorded in `CANONKIT_ROADMAP.md` and gets its own OpenSpec change:

- Former 4.1 project/worktree/branch identity, 4.2 workflow milestones/classification/approval evidence, 4.3 OpenSpec/Graphify links and freshness → Phase P6.1, items 3–5.
- Former 5.1 multi-runtime adapters → P6.2; 5.2 Agent Office 2D → P6.3; 5.3 3D study → P6.4; 5.4–5.5 retention, replay and metrics → P6.5; 5.6 dashboard actions → P6.6.

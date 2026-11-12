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
- [ ] 3.4 Verify the compiled UI in a browser for readability, responsive behavior, keyboard operation, focus visibility and assistive-technology semantics; record the browser/environment and fix any demonstrated issues.
- [ ] 3.5 Observe a real, already-running Claude Code session and confirm the dashboard view against the records it produces without creating a session or invoking a model for telemetry.

## 4. Missing acceptance criteria in this implementation

- [ ] 4.1 Define and implement reliable project/worktree/branch identity only from an authorized stable source; cover concurrent sessions, homonymous projects and separate worktrees without basename correlation.
- [ ] 4.2 Add source-backed workflow milestones/classification and explicit verification/approval evidence only where CanonKit/runtime artifacts expose stable identifiers; keep unknown states for absent or ambiguous evidence.
- [ ] 4.3 Add OpenSpec and Graphify artifact links/freshness only when those sources can be detected and correlated reliably; do not initialize, validate, sync, archive or refresh them automatically from dashboard polling.
- [ ] 4.4 Demonstrate graph viewport and selection stability across structural and data-only polling updates in an automated UI-level test or verified browser session.

## 5. Future work (roadmap only; not implemented here)

- [ ] 5.1 Investigate official/stable event sources for Codex, OpenCode and Copilot; specify per-runtime coverage and limitations before implementing adapters. Do not start duplicate sessions or add paid API dependencies.
- [ ] 5.2 Design an optional Agent Office 2D view using the same observation snapshot; validate presence semantics, session/worktree layout, accessibility, original/licensed assets and runtime performance before implementation.
- [ ] 5.3 Prototype and compare 3D options (including Three.js / React Three Fiber) against 2D and graph views for maintenance, performance, accessibility and cost; choose no engine until evidence supports one.
- [ ] 5.4 Evaluate authorized event retention and build replay/history only from retained observations; represent missing intervals without reconstruction.
- [ ] 5.5 Evaluate duration, dispatch and token metrics with explicit methodology; never equate token use with quality or present financial cost without verified pricing and complete inputs.
- [ ] 5.6 Consider dashboard actions only in a separately reviewed security change with official integrations, explicit user authorization and preserved runtime permissions; no action controls belong to this change.

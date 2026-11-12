# Proposal

## Why

The existing local dashboard exposed dispatch metrics but did not show observed execution as a navigable graph. A shared, versioned read model and graph/timeline view make current Claude Code hook evidence easier to inspect while preserving the distinction between runtime facts, workflow guidance and unknown state.

## What Changes

- Add a versioned, allowlisted projection of retained Claude Code hook events for the dashboard; do not alter hook collection or store prompts, transcripts, project paths or fabricated identifiers.
- Serve the projection and compiled React Flow dashboard from the existing loopback-only Node server, retaining the Activity page and legacy endpoints.
- Show observed dispatches, gates, a chronological timeline, and separate conditional LOW/MEDIUM/HIGH reference routes; selection and detail panels expose evidence and unknowns.
- Package static assets and runtime files so the installed dashboard runs with Node without loading frontend dependencies in the CLI.
- Record the actual implementation, limitations, verification evidence and staged future work in this change and `CANONKIT_ROADMAP.md`.

Out of scope for this implementation: new runtime instrumentation, Codex/OpenCode/Copilot adapters, reliable multi-project/worktree identity, OpenSpec/Graphify artifact linking in the UI, replay, cost/quality analytics, Agent Office rendering, and dashboard actions that control runtimes or approvals.

## Capabilities

### New Capabilities

- `execution-observability`: Versioned, privacy-limited normalization and aggregation of real runtime observations with honest correlation and state semantics.
- `observability-dashboard`: Local graph and timeline presentation of observed events and conditional guidance, preserving existing dashboard behavior and security boundaries.

### Modified Capabilities

None.

## Impact

Implementation is in `dashboard/`, the installer/catalog in `bin/cli.js`, package scripts and files, dashboard tests, `README.md`, `docs/telemetry.md` and `CHANGELOG.md`. The frontend uses React, TypeScript, Vite and `@xyflow/react`; compiled assets are shipped, while frontend sources and dependencies are not runtime requirements for the installed CLI. The implementation remains passive and local. No hook event format or CanonKit risk/delegation rule is changed.

Current status: implementation and listed automated checks are present in this worktree. Browser-rendered UX/accessibility and a live user session have not been verified. Criteria and follow-up tasks below remain open where the available evidence is insufficient.

# Design

## Context

The dashboard has a local Node server and retained Claude Code JSONL hook events. The existing activity view exposes aggregates; the new frontend is an independently compiled React/TypeScript app using React Flow. Hooks do not currently provide reliable branch/worktree/project identity, stable event IDs, full workflow milestones, or equivalent Codex/OpenCode/Copilot execution streams.

This change adds a read path, not instrumentation. The OpenSpec contracts in this change describe the intended behavior; task status records which parts have evidence in the current implementation. The canonical workflow remains CanonKit governance, OpenSpec durable change state, Graphify structural evidence, runtime logs observed execution, and dashboard presentation.

## Goals / Non-Goals

**Goals:** preserve the existing dashboard and install model; expose safe, versioned observations; make observed execution navigable; separate observed facts from reference routes and approvals; record the remaining work without presenting it as delivered.

**Non-Goals:** controlling agent runtimes; adding hooks or paid APIs; inferring missing IDs; implementing additional runtime adapters; visualizing OpenSpec/Graphify artifacts as validated facts; implementing replay, financial/quality scoring or Agent Office in this change.

## Decisions

### 1. Normalize retained records at read time

`dashboard/execution-model.js` projects an explicit event allowlist from existing records into schema version 1. It does not rewrite source logs. Its normalized record uses `runtime`, `source`, `confidence`, nullable `sessionId`, `eventId: null` where no stable ID exists, optional dispatch/agent IDs and an allowlisted `data` object. It intentionally does not copy prompts, raw payloads, filesystem paths or arbitrary fields.

This keeps the event contract independent of React Flow and lets future visualizations consume the same snapshot. Adding a new runtime requires a separately verified adapter and must not assume access to an editor extension's private state.

### 2. Correlation remains conservative

Dispatch IDs are correlated only within a session. `agent_stop` can update a dispatch only if the runtime agent ID matches exactly one dispatch in that session; `agent_resume` remains a timeline-only observation when it lacks a target ID. Parallel status requires overlapping observed intervals. Cumulative `agent_end` records replace prior measurements, including replacing them with unavailable values.

Project, worktree and branch identifiers stay null because current hooks expose only a cwd basename and session. Basename equality is not a safe identity. Workflow, approval and classification states stay unknown unless an explicit source establishes them.

### 3. Gates expose observation and decision separately

The current allowlist derives known decisions for documented gate kinds: excluded-by-config and context-size allow; high-risk surface and selected confirmation gates request confirmation; explicit block gates block; unknown kinds stay unknown. A confirmation request is not an approval. This mapping is deliberately not a generic `blocked` state.

### 4. Keep observed graph distinct from canonical reference routes

The observed view shows session membership and dispatch/gate evidence. It does not derive an execution DAG from timestamps or agent names. A separate reference view shows conditional LOW, MEDIUM and HIGH guidance routes with unknown current status. These templates are explanatory and do not prove that a risk was classified, a reviewer ran, or a gate passed.

The React Flow renderer is presentation only. Node positions and viewport belong to the UI; execution/approval truth remains in the normalized read model. Auto layout is explicit rather than run on each polling refresh.

### 5. Serve a compiled static app through the existing loopback server

The existing server remains the entry point, listens on loopback, and serves the API plus files from the fixed compiled asset directory. Host and Origin checks, normalized fixed paths, no CORS, CSP, frame restrictions and `nosniff` constrain the read surface. The prior Activity route uses its compatibility policy. No command, approval or write endpoint is added.

React, TypeScript, Vite and React Flow are build-time dependencies. The package includes compiled assets and notices; the installed CLI does not import frontend modules. Stable asset names let the installer track files across updates and removals.

### 6. Preserve compatibility and state limitations explicitly

The `/events.json`, `/dispatches.json` and `/context.json` contracts remain available; `/execution.json` is additive. The existing Activity overview remains at `/activity.html`. Polling reuses the local server and retained logs. Stale snapshots are labeled after disconnect. Log rotation and retention bound what can be shown.

## Risks / Trade-offs

- With no stable project/worktree identity, the UI can select a session but cannot safely group multiple worktrees or distinguish homonymous projects. This is an upstream observability gap, not a UI heuristic to fill.
- Event lifecycle is not workflow lifecycle. Current data cannot prove classification, code activity, test results, approval, OpenSpec acceptance or Graphify freshness.
- Some timeline entries intentionally have no graph-node relationship. Browser interaction and accessibility have not been visually verified, even though deterministic tests, TypeScript checking and production build pass.
- The package audit could not be completed because npm registry DNS resolution returned `EAI_AGAIN`; dependency review and bundled notices do not replace that check.
- Future multi-runtime, replay, 2D/3D and control features could widen privacy, performance and security boundaries. Each requires a separate design/review and must keep one shared observation model.

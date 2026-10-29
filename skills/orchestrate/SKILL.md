---
name: orchestrate
description: Use when planning or dispatching subagents (model and effort, parallel work, isolated writers), coordinating an existing OpenSpec change, or closing a MEDIUM/HIGH change involving multiple disciplines (Integration Review).
---

# Orchestrate

Orchestration rules whose short form lives in `~/AGENTS.md` and the project's tool block. This is the rationale and the procedure.

## Naming the model and effort

Every planned dispatch names its model and effort: **up** for a structural or
irreversible decision, **down** for a mechanical pass with a verifiable result. A
model chosen silently cannot be told apart from one forgotten, which is why it is
written down. The `model:` in an agent's frontmatter is the fallback for an ad-hoc
dispatch nobody planned, not a ceiling.

## Parallel delegation

Fan out to several subagents in parallel only for a HIGH change that raises
independent judgments in more than one owner's domain (Scott on scope, Pixie on
UX, Gard on security: one message, no shared mutable file), or when the user
asks for it. At MEDIUM, call the owners its named risks point at, one at a time.
One agent's output as another's input is sequential, not parallel.
A subagent hands back its result in its report, never "waiting on children" or
a promise of later results; a report that ends that way is unfinished: resume it.

Two agents *writing code* at the same time each get an isolated worktree (Claude
Code: `isolation: "worktree"` on the dispatch; elsewhere, a separate checkout) —
never concurrent file-editing agents in one tree, where each overwrites the
other's edits and invalidates the other's test run.

## OpenSpec change lifecycle

Use this bridge where the project already uses OpenSpec: **OpenSpec = durable
state; CanonKit = governance; Graphify = code evidence.**

1. Resolve the selected change, planning root and configured schema before work.
   Read its existing artifacts and applicable main specs. The usual locations
   are `openspec/changes/<change>/` and `openspec/specs/`; use the paths returned
   by OpenSpec for a custom schema or planning store. Do not initialize a second
   change or impose OpenSpec on a project that does not use it.
2. Classify risk using the roster: **LOW** stays inline when possible, updating
   only relevant existing artifacts; **MEDIUM** brings in owners of named risks;
   **HIGH** uses the roster's mandatory owners and an independent review after
   the last edit. A change directory does not make every owner mandatory.
3. Give each handoff the change path, relevant acceptance criteria, decisions,
   pending tasks and validation evidence. Use the existing schema's artifacts;
   for the default `spec-driven` schema, responsibilities map as follows:

   | Owner | Handoff and durable location |
   |---|---|
   | Scott | Define what must be true: scope in `proposal.md`, acceptance behavior in the change's specs. |
   | Archie, when needed | Resolve structural choices and record decisions, rationale and trade-offs in `design.md`. |
   | Bob | Implement the approved criteria and design; keep progress and validation evidence in `tasks.md`. |
   | Quinn, when review is needed | Validate behavior against the criteria; link findings and test evidence from the existing tasks. |
   | Spencer | Check implementation against the change and documentation; identify unrecorded drift and declared deltas awaiting main-spec sync. |

   Other owners participate for their named risks under the roster's rules.
   Do not duplicate these artifacts with a Scott PRD, standalone Bob plan,
   parallel Spencer spec or ADR repeating the design. Link an existing distinct
   document when needed; do not copy its decision into another source of truth.
4. Before closing, verify acceptance criteria and applicable tests, satisfy the
   required reviews and gates, and make tasks reflect work actually completed.
   For MEDIUM/HIGH, Spencer checks documentary drift, distinguishing it from
   declared deltas awaiting sync in step 5. Run the Integration Review below
   when multiple disciplines participated. Keep decisions, review outcomes and
   evidence in the existing change. Missing evidence, unresolved blockers,
   failed validation or unrecorded drift keeps it open; do not tick unfinished
   tasks to make it look complete.
5. Use the project's OpenSpec workflow to update/sync applicable spec deltas and
   verify the main specs, then archive when requested and authorized, respecting
   that workflow's prompts. Never archive while sync is running or failed, or
   report closure just because an archive command succeeded. If archive is not
   requested, report implementation readiness and the pending archive explicitly.

## Integration Review

For **MEDIUM/HIGH changes spanning multiple disciplines**, after the specialist
reviews and before closing the decision, whoever orchestrated reads the whole.
It is a reading step, not an agent and not an artifact. A LOW change skips it.

1. Do the specialists' recommendations contradict each other?
2. Did one property improve by sacrificing another, undocumented?
3. Is the end-to-end flow still coherent?
4. Is there a gap between responsibilities/handoffs, or a risk that fell between two agents?
5. Is it still the smallest sufficient solution?
6. Are product, UX, engineering, security, quality, and operations still aligned?
7. Only if Maya/Nova/Echo/Dana took part: still fun and understandable / visually coherent with the art direction / what matters still audible / hypothesis measurable without excess collection.

A contradiction becomes a named escalation to the decision owner, not an average
of the two recommendations.

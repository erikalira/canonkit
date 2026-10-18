---
name: orchestrate
description: Use when planning or dispatching subagents (naming the model and effort for each dispatch, fanning out in parallel, isolating agents that write code), or when closing a MEDIUM/HIGH change that involved more than one discipline (Integration Review before the decision is closed).
---

# Orchestrate

Three orchestration rules whose short form lives in `~/AGENTS.md`. This is the rationale and the procedure.

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

Two agents *writing code* at the same time each get an isolated worktree (Claude
Code: `isolation: "worktree"` on the dispatch; elsewhere, a separate checkout) —
never concurrent file-editing agents in one tree, where each overwrites the
other's edits and invalidates the other's test run.

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

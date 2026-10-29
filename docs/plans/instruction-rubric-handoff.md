# Handoff — rubric for instruction-quality audits

Source: canonkit × ECC comparison sessions, 2026-10-29. Result page:
https://claude.ai/artifact/CUFmdnykP7me74HW7ag76R

## Problem

Two audits of the same configs used different parameter sets (16 vs 17, with merges)
and no scoring anchors. Averages stopped being comparable, and unchanged code moved
±1 (once ±2) on evaluator judgment alone. Nothing records which parameters matter or why.

## Goal

1. A versioned rubric file (data, not prose), e.g. `evals/instruction-rubric.json`.
   Per parameter: stable `id`, name, what it measures, anchors for 0 / 5 / 10, weight,
   evidence required, `status` (`active` | `retired`), `added` / `retired` date + reason,
   `mergedFrom` (old ids) so old runs stay comparable.
2. A skill (`instruction-audit`) that scores each active parameter with evidence, saves
   the run to `evals/audits/<date>-<target>.json`, diffs against the previous run, tags
   each delta as **real** (cites a commit) or **evaluator** (no cite), and averages only
   across runs of the same rubric version.
3. Adding/removing a parameter = edit the rubric with a reason and bump its version;
   never delete, retire.

## Seed parameters (union of both rounds; decide merges)

| id | name | note |
|---|---|---|
| clarity | Clarity and precision | round 2 absorbed `rationale` |
| rationale | Explains the why | keep separate or merge? |
| proportionality | Effort proportional to risk | round 2 merged with `context-cost` |
| context-cost | Always-loaded context cost | measurable (words loaded) — good anchor |
| routing | Who to call and when not to | |
| governance | Ownership, authority, veto | |
| enforcement | Rules backed by hooks | round 2 reweighted "hook profiles" as a side door — anchor this |
| review-noise | Review without false positives | |
| memory | Memory and continuous learning | |
| self-measurement | Evals of own behavior | |
| observability | Per-dispatch cost telemetry | split from self-measurement in round 2 |
| stack-coverage | Domains and languages covered | |
| portability | Harness portability (and enforcement per harness) | |
| security | Config and supply-chain security | |
| install | Install, uninstall, maintenance | |
| consistency | Single source, no drift | |
| scope-focus | Scope discipline | new in round 2 |
| kit-ci | Tests and CI of the kit itself | new in round 2 |
| human-docs | Docs for humans | |

Round scores for back-filling run 1 and run 2 are on the result page above.

## Open decisions (ask the user)

- Personal skill (`~/.claude/skills`) or shipped in canonkit (`skills/`, Virgo's domain, MEDIUM)?
- Weights: equal, or weighted toward what canonkit is for (governance, proportionality)?
- Which parameters get measured anchors (word counts, case counts) vs. described anchors?

## First step

Ask the open decisions, then draft the rubric file with anchors; build the skill after
(the `anthropic-skills:skill-creator` skill can scaffold and eval it).

# Design

## Context

See [proposal.md](proposal.md) for motivation and the three delta specs for behavior. Inspection baseline: branch `fix`, HEAD `e701a50`, package `canonkit@2.4.0`, with pre-existing staged AGENTS/OpenSpec configuration. No active changes or main specs existed. Graphify queries located Bob, Scott, Quinn, orchestration and eval infrastructure before source inspection. Scott approved the MEDIUM scope with conditions: only fill gaps, preserve LOW proportionality and keep efficacy UNMEASURED.

## Goals / Non-Goals

**Goals:** one source for completion status semantics, small owner-specific protocol additions, compact resumable handoffs, and honest offline fixture calibration.

**Non-Goals:** a state engine, new skill/agent, automatic TDD/review gate, telemetry pipeline, model experiments, global installation or release. Source application does not demonstrate installed availability.

## Decisions

1. Put completion and handoff detail in the existing on-demand `orchestrate` skill; Bob and Quinn point to it rather than duplicating the four statuses. Keep existing description fields and resident blocks unchanged. A central utility would introduce machinery with no unmet deterministic need.
2. Edit only Bob's debugging/TDD guidance, Scott's missing clarification distinctions and Quinn's existing review. Two review aspects do not mean two reviewers; scope decisions remain Scott's and missing evidence is not a proven defect.
3. Extend existing `evals/quality-cases.json` and its offline calibration in `test/eval.test.js`: stale validation, green tests/missing behavior, review scope creep, repeated debugging, unobservable product outcome, benign LOW control, incomplete handoff. Reuse the runner and lexical judge unchanged; preserve tests requiring calibration for every case. This proves the fixture/judge contract, not reasoning or command execution.
4. Reuse current telemetry: tokens, duration, report sizes, tool-result volume and dispatch counts already exist. Cost lacks verified prices and complete output counts; exact context growth is not observable from payload sizes. Document these limits; defer new aggregation until a concrete question and reliable inputs exist.
5. Keep continuity in existing OpenSpec artifacts or the already established `docs/plans/<topic>-handoff.md`, when needed. Add only finalization distinctions and worktree ownership/dirty checks to orchestration; no branch CLI.
6. The user explicitly requests canonical instruction changes while forbidding paid evals. This overrides the historical roadmap's preference for a failing model eval before adding instructions and the propose skill's planning-only pause. Record the exception honestly: no claim of measured efficacy or token savings. Learning Loop is not invoked; its unmeasured proposals are not promoted as validated lessons.

## Coverage inventory

| Area | Existing coverage | Real delta / disposition |
|---|---|---|
| Completion | Bob reports implementation/validation/pending; OpenSpec closes after evidence/reviews | Explicit claim status, current evidence, parent verification |
| Debugging | Bob reproduces and isolates causes | Hypothesis sequence and contextual reassessment after about three failures |
| Product | Problem/user/objective/scope/metric/MVP already present | Constraints, decision/assumption separation, negative paths, no repeated discovery |
| Review | Quinn checks criteria, risk and concrete findings | Separate compliance and quality verdicts in same review |
| Testing | Risk-proportional tests and no weakened assertions already present | Selective regression-first sequence, honest unavailable RED |
| Continuity | OpenSpec mapping and repository handoffs already present | Minimal resumable state, task-scoped briefs, readiness/authorization separation |
| Telemetry | ALREADY COVERED for tokens/time/report/volume/dispatch counters | Document unsupported cost/context growth; no pipeline |
| Safe finish | Commit/push permission and HIGH review ALREADY COVERED | Small worktree cleanup and readiness clarification |

## Context-cost baseline

Whitespace-separated source words, using the default-profile formula in `test/cli.test.js`. Resident components: `reference/agents-block.md` 1,714; adapters Claude 449 / Codex 281 / OpenCode 327; ten core descriptions Archie 21, Bob 23, Gard 22, Perry 24, Pipe 22, Pixie 20, Quinn 25, Scott 20, Spencer 30, Virgo 22 (229 total); skill descriptions context-tune 40, learning-loop 19, orchestrate 37 (96 total). Totals: Claude **2,488**, Codex **2,320**, OpenCode **2,366**, limit 2,500 each. On-demand bodies are excluded. Remeasure after edits; source counts are not tokenizer or behavioral measurements.

## Risks / Trade-offs

- More on-demand text → keep detail in its existing owner and do not change descriptions; no resident increase.
- Lexical judges accept only calibrated answer patterns → test correct reports and multiple plausible incorrect reports containing expected words; explicitly retain efficacy UNMEASURED.
- False confidence from old validation or delegated claims → inspect diff/evidence freshness, reuse valid checks, never infer a pass.
- Cross-runtime distribution drift → existing hermetic installation/packaging checks, without touching personal installations. Native runtime efficacy remains UNMEASURED.

## Migration Plan

No data or global migration. Changes remain in canonical sources for future authorized installation. Run focused offline tests, repository tests, validation, packaging dry-run, OpenSpec strict validation, Graphify update and whitespace checks. Quinn reviews acceptance/quality and Spencer checks documentary drift sequentially; perform Integration Review in this change. Do not archive unless requested. Rollback, if requested later, removes only this change's edits after checking intervening work.

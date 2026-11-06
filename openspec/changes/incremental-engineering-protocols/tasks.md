# Tasks

## 1. Phase A — Reliability

- [x] 1.1 Add completion/freshness and systematic debugging guidance in existing owners; document in the team guide and calibrate stale-validation/repeated-debug fixtures with focused offline eval tests.

## 2. Phase B — Quality

- [x] 2.1 Fill Scott's discovery gaps, add Quinn's two review aspects and Bob's selective TDD; document ownership and calibrate missing-requirement, scope-creep, product-outcome and LOW-control fixtures with focused offline eval tests.

## 3. Phase C — Continuity and existing observability

- [x] 3.1 Extend compact handoff/readiness guidance, document telemetry coverage and offline limitations, and calibrate the incomplete-handoff fixture; verify focused offline eval tests without model calls.

## 4. Integration

- [x] 4.1 Run repository tests, validator, packaging dry-run, OpenSpec strict validation, Graphify update, whitespace/link checks and remeasure all resident profiles; record commands, failures, skipped checks and evidence limits.
- [x] 4.2 Obtain Quinn acceptance/quality and Spencer documentary-drift reviews, resolve actionable findings, perform Integration Review and record implementation readiness with behavioral efficacy UNMEASURED.

## Evidence

Planning: Scott approved with conditions; risk MEDIUM. Source baseline and coverage inventory are in [design.md](design.md). No model eval, global installation or release is authorized. Completed implementation evidence follows.

Phase A: completion semantics in orchestrate, Bob debugging and team documentation inspected. `node --test --test-reporter=spec test/eval.test.js`: 25/25 pass after correcting misplaced calibration entries (initial run 23/25). The sandbox initially denied Node's local subprocess with `spawn EPERM`; the authorized offline run outside it succeeded. These checks validate fixtures, judges and rescore, not model behavior.

Phase B: Scott clarification, Quinn review aspects and Bob selective TDD inspected against the specs; team guide updated. The same focused offline command passed 25/25 with four additional fixtures and positive/negative report calibrations. No runner or judge implementation changed.

Phase C: compact continuity/finalization in orchestrate and team, telemetry and eval guides inspected. Focused offline tests passed 25/25 with all seven new cases calibrated. Dashboard code confirms the existing duration/report/token tables and separate context contributors; no collector, aggregation code, new dashboard or global installation was added.

Integration evidence:

- `npm test`: exit 0, 1,105 tests in 89 suites; 1,101 passed, 0 failed, 4 skipped, duration 451.5 seconds. The compact captured summary does not identify all four skipped case names; their individual coverage is not claimed. No test or assertion was weakened to obtain this result. Source agent/skill/fixture edits preceded the run; subsequent edits only record OpenSpec evidence.

- `openspec validate incremental-engineering-protocols --strict`: passed; `git diff --check`: passed, with Git's existing LF/CRLF conversion warnings.
- `npm run pack:dry -- --json`: passed, canonkit 2.4.0, 53 entries, 185,674 compressed bytes / 577,246 unpacked bytes. Initial sandbox attempt lacked npm-cache write access; authorized retry passed without publication.
- `npm run validate -- --quiet`: original checkout command failed (17 failures / 4 warnings): Windows `bash` resolves to WSL without Node, and CRLF frontmatter is not accepted by the shell checks. No failure is reported as a pass. The same current source copied to an isolated temporary snapshot, normalized to LF and run through Git Bash/native Node/Python 3.12, passed all validator checks for 15 agents with zero warnings. Snapshot and temporary installations were removed; no global configuration changed. This verifies source integrity with the adapted environment, not the original command's portability.
- `graphify update .`: passed without LLM, 1,314 nodes / 2,345 edges. Parallel extraction was unavailable in the sandbox; Graphify completed sequentially. Generated graph/report files updated as required; semantic document efficacy is not measured.
- Relative file/heading links in the three edited guides checked. Source resident profiles remeasured: Claude 2,488 / Codex 2,320 / OpenCode 2,366 words, all unchanged (delta 0); per-component baseline in design remains valid. On-demand bodies grew; no token-savings claim is made.
- Existing local log availability checked read-only using aggregate presence of token/duration/report fields; no record content or identifiers persisted. No new telemetry aggregation was justified.

Reviews: Quinn approved inspected requirements compliance and technical quality without blockers; Spencer approved documentary consistency without blockers. Both identified final integration evidence as pending and treated the three declared delta specs awaiting sync/archive as expected, not drift. No concrete incidental findings were reported.

Integration Review: recommendations agree; scope, quality and instruction cost remain aligned. Existing owners retain decisions, LOW avoids ceremony, evidence and authorization stay separate, and no new runtime/dependency/collection surface was introduced. The source protocol and offline lexical contracts are VERIFIED with the recorded scope and environment limitations; LLM obedience, quality gains, token savings and native cross-runtime efficacy remain **UNMEASURED**. Implementation is ready for review/PR preparation; no merge or publication authorization is inferred. Main-spec sync and archive remain workflow follow-up.

## Workflow follow-up

- Sync declared deltas and archive only through the applicable OpenSpec workflow when requested; archive was not requested.
- Commit, push, merge, publication and worktree removal require their own applicable authorization.

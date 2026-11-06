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

## PR review corrections — 2026-11-06

- [x] Remove local Codex hooks, Claude settings, and generated OpenSpec integrations from version control; ignore their local copies and preserve canonical `openspec/` artifacts.
- [x] Restore baseline authorization gates, their installer matcher and dashboard behavior. Remove ask-once, scratchpad exemptions and quoted-arrow suppression from this PR. Add regressions for repeated successful edits, scratchpad gates and quoted shell writes.
- [x] Restore the 13 historical plans deleted by the branch and their local documentation links. Make this project's Graphify instructions proportional to structural exploration.
- [x] Validate the corrected tree, remeasure resident profiles, and obtain final security and documentary reviews.

The original implementation evidence above describes the earlier tree. Fresh
validation below supersedes it for these corrections; no original test count is
claimed for the corrected tree. The hook and dashboard runtime sources now match
`origin/main`; the remaining CLI changes concern the pre-existing Graphify
gitignore integration. Local generated files remain on disk but are untracked and
ignored. These corrections do not change the canonical resident instruction
blocks or agent/skill descriptions.

Fresh validation:

- OpenSpec strict validation and whitespace checks passed. Git comparisons confirm the hook, hook documentation, dashboard and 13 restored plans match `origin/main`.
- Source resident profiles remain Claude 2,488 / Codex 2,320 / OpenCode 2,366 words (margins 12 / 180 / 134). Canonical resident sources did not change during these corrections.
- Packaging dry-run passed: 53 entries; no publication or global installation.
- The repository validator passed all checks for 15 agents with no warnings in an isolated LF-normalized snapshot using Git Bash and native Node/Python. This retains the original checkout's documented Windows/CRLF portability limit. Cleanup initially failed on read-only Git objects; approved native PowerShell cleanup removed the snapshot.
- `graphify update .` passed without LLM calls: 1,386 nodes / 2,432 edges. The first update retained 47 old nodes from 15 generated integration files; explicit `.graphifyignore` rules removed them on the second update. Verified zero generated integration source paths remain. Cache-root spelling and community-label warnings remain tool limitations; semantic extraction/LLM labeling was not rerun.
- `npm test`: exit 0, 842 tests in 82 suites, 839 passed, 0 failed, 3 skipped, 373.8 seconds. All six new authorization regressions passed. The three skips are existing platform limits: `/dev/zero`, POSIX file modes and unavailable file-symlink creation on this Windows machine. The sandbox initially blocked test subprocesses with `spawn EPERM`; this result is from the complete offline suite restarted with approved escalation. Test counts fell with the removed feature suites; baseline tests remain and the new authorization regressions cover the restored guarantee. Only documentation/evidence edits followed the test run's source snapshot.

Risk of the authorization rollback is HIGH. Gard independently approved after
the last security-source/test edit with no remaining findings. Spencer approved
documentary consistency and then rechecked the final validation evidence, local
links and Graphify exclusions, with no blockers or incidental findings.
Intended specialist runtime: `gpt-6.1-sol`, effort `medium`; actual runtime
settings were not exposed for independent confirmation.

Integration Review: the security and documentary recommendations agree. Baseline
authorization and historical traceability are restored; canonical engineering
protocols and LOW proportionality remain intact. No new security exception is
accepted. Fresh validation is complete and the corrections are ready for review;
model efficacy remains UNMEASURED. No commit, push, archive, merge or publication
was performed.

### P1 follow-up — resident gate descriptions

The earlier correction missed stale ask-once and scratchpad claims in
`README.md` and `reference/routing-block.md`. Both now match `origin/main`,
including removal of the link to the deleted ask-once section. This is LOW-risk
documentation alignment with the existing gate; no runtime behavior changed.

Validation: the existing default instruction-profile test passed (1/1), and
`node scripts/check-enforced.mjs` confirmed all eight enforced rules have gates.
A targeted search found no remaining ask-once/scratchpad claims in active
README/reference/agent/skill/tool/hook documentation; historical plans and the
regression tests retain their historical or negative assertions. Whitespace
checks passed. Current resident totals supersede the earlier counts: Claude
**2,427** / Codex **2,320** / OpenCode **2,366** words, with margins **73 / 180 /
134**. The full runtime suite above was not rerun for this documentation-only fix.

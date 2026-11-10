# Design

## Context

Before this change, the HIGH-handoff procedure used three-label `laya_decide` checks with `min_confidence=0.8`. Historical synthetic cases frequently abstained; four per-dimension `noul` fixtures produced useful separation. This supports trying the latter in practice, not a claim of established real-world accuracy.

Maintainer direction on 2026-11-09: implement and use Laya on real tasks instead of spending more tokens on synthetic evaluation campaigns. Quality matters more than response time.

Laya remains an optional MCP service. This change modifies orchestration instructions, not Canonkit's runtime dependencies or enforcement.

## Goals / Non-Goals

**Goals:**

- Put per-dimension HIGH-handoff advice into practical use.
- Use specialized tools when actual input requires them.
- Learn from useful findings, false alarms and missed problems in existing task reports.
- Preserve ownership, direct evidence, independent review and content minimization.

**Non-Goals:**

- New benchmark campaigns, synthetic cases, calibration projects or evaluation infrastructure.
- New dependencies, automatic dispatch, approval gates or routine LOW/MEDIUM calls.
- Installing or reconfiguring a Laya server, or retaining task content in a new log.

## Decisions

### Use per-dimension signals in real HIGH handoffs

Use `laya_predict` with `noul` questions for explicit acceptance criteria and validation planning before dispatch. Compare their documentary coverage with the supplied objective, named HIGH risk and constraints to flag apparent omissions, without judging technical correctness or guaranteeing completeness. After return, inspect reported test results when applicable and disclosure of review status, including completed or pending review. Questions assess the actual brief/report against the supplied task, not the mere presence of instructions elsewhere in the request.

Initially, a `noul` score below 0.5 prompts source inspection. This is an investigation convention, not calibrated reliability or an approval threshold. High scores never establish completeness. Inapplicable tests do not become mandatory because of a classifier question; inspect the appropriate validation directly.

**Alternative considered:** another synthetic evaluation campaign before adoption. Not selected: the maintainer requests practical use with existing safeguards and targeted investigation only for concrete problems encountered.

### Keep the orchestrator as the control point

Laya advice is optional before HIGH dispatch or after return when a concrete semantic uncertainty about omissions warrants another signal and the MCP is available. Skip when direct inspection suffices; reuse advice while task context and evidence are unchanged. Reviews and follow-ups use the same selective rule, without separate records for unnecessary calls skipped. The orchestrator verifies findings against source material and direct evidence, corrects concrete omissions and records a compact disposition. Unavailable or malformed responses fall back to normal manual checks without indefinite retries. Laya cannot change risk, waive owners or reviews, establish test execution or grant approval.

Incomplete task context, cut-off briefs/reports or tool-reported truncation make affected signals partial even when numerically valid or high. Disclose the limited coverage and inspect the full relevant source manually; do not record a complete assessment of omitted content.

### Choose tools for the real input

- `laya_predict_long`: use when relevant input exceeds one context window. Inspect attributed source windows and contradictory or later statements; strongest-window results do not establish whole-document completeness or current validation.
- `laya_shortlist` / `laya_tournament`: use for an existing large candidate set when needed. Select according to candidate semantics and observed usefulness, not latency or an assumed universal option-count cutoff. A winner is a candidate suggestion; narrowed confidence does not cover discarded options or establish all required owners.
- Explicit `lang`: use when language is known. Use `lang_guess` only when uncertain and supported by the selected tool.
- `laya_predict_batch`: use for already-independent requests. Never wait for a return to batch it with its own pre-dispatch check.
- Do not use the evaluated `model_router` preset to classify tool need.

**Alternative considered:** choose tournament because it is faster. Not selected: speed is secondary to the quality of its suggestions.

### Learn through existing work evidence

In existing task evidence or the short report, record phase/target, call status, returned model when known, dimension scores and disposition. Add one short observation when useful: an omission caught, a false alarm or a problem discovered later that Laya missed. No new telemetry, dashboard, raw transcript archive or mandatory sample quota is introduced.

Record timing only when supplied and relevant; it does not decide adoption. Missing or failed calls describe integration health, not model quality. Investigate recurring concrete problems rather than routinely rerunning synthetic suites.

Historical limitation: the saved final score disagrees with the final audit for `context-truncated`. It is not current efficacy evidence; regenerating historical evaluation artifacts is outside this implementation.

## Risks / Trade-offs

- [False alarms or missed omissions] -> Inspect source and direct evidence regardless of favorable signals; correct concrete misses encountered in practice.
- [Language or checkpoint differences] -> Use supported language hints and record returned routing metadata when available; do not claim calibrated reliability.
- [Sensitive input] -> Send only sanitized, task-relevant content; retain no prompts, full reports, raw logs or secrets in usage notes.
- [Unavailable service or changed response] -> Disclose the gap and continue the existing manual process.

## Migration Plan

Replace the source handoff procedure, align orchestration documentation and validate the changed instructions and OpenSpec artifacts locally. Do not modify the historical eval suite or require new inference runs. Installed copies receive the source procedure through the existing reference installer; this change does not modify user-level installations or server configuration. Practical quality remains unmeasured until real calls occur.

# Proposal

## Why

Canonkit's experimental HIGH-handoff checks currently describe a confidence-gated, three-label `laya_decide` flow that the evaluation found mostly abstained. The latest synthetic evaluation supports per-dimension `laya_predict`/`noul` signals instead, while also showing that Laya must remain advisory and that long-context and large-option tools need narrower, measured use.

## What Changes

- Replace the HIGH-handoff check formulation with separate advisory signals for acceptance criteria, validation plans, applicable reported test results and disclosed review status; retain direct human verification and all existing HIGH ownership, evidence and independent-review requirements.
- Use specialized tools for real long-text, large-candidate, multilingual or independent-batch needs, without adding routine calls to LOW/MEDIUM work.
- Adopt the procedure in real work now. Record useful omissions, false alarms and missed problems in existing task evidence; additional synthetic evaluations are not a prerequisite for use.
- Keep Laya optional and selective on HIGH handoffs: consult it for concrete semantic uncertainty about omissions, skip when direct inspection suffices and reuse advice while task context and evidence are unchanged. Unavailable or failed calls fall back to the existing manual process, low signals prompt inspection rather than rejection, and no result approves work or waives required controls.
- Assess documentary coverage against the supplied objective, risk and constraints; treat signals from truncated or incomplete input as partial and inspect the full relevant source directly.

## Capabilities

### New Capabilities

- `laya-advisory-assessment`: supplemental, optional assessment of HIGH handoff briefs and returns, with conservative handling of long text and large candidate sets.

### Modified Capabilities

None. The repository has no existing main specs; this change introduces the first capability spec for Laya advisory behavior.

## Impact

- Affects `skills/orchestrate/SKILL.md`, `skills/orchestrate/laya-handoffs.md` and `docs/tools.md`. Existing evaluation fixtures, plans, audits and scorers remain historical evidence and are not expanded by this change.
- No new runtime dependency, service, automatic dispatch, authorization, enforcement gate or change to the LOW/MEDIUM workflow is intended.
- Evaluation evidence is synthetic and version-specific. Judge usefulness from real-use outcomes without retaining prompts, reports or sensitive content. Quality takes priority over latency; investigate concrete recurring failures rather than requiring another benchmark campaign.

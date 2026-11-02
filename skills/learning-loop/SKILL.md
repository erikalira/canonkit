---
name: learning-loop
description: Investigate a requested team-learning opportunity and prepare an evidence-based, human-reviewed proposal for a narrow instruction or project configuration change.
---

# Learning loop

Use this workflow on request. It is manual: do not inject lessons at session
start, ingest transcripts, automatically promote a lesson, or install changes.
A request to investigate is not authorization to apply a future proposal.

## Investigate

1. Bound the period and source, and inspect only available signals with the
   applicable permission. Record missing, malformed, sampled or rotated data
   and coverage gaps. Claude gate events count invocations, including retries;
   repeated gates are leads for investigation only, never a false-positive rate
   or a threshold for a change. A later tool call is not evidence of approval,
   decline, a write or an outcome. An absent rule is unknown. Codex and OpenCode
   discard hook logs: absent records do not mean absent events.
   For Claude, look read-only at `~/.claude/canonkit-activity/events.jsonl`
   and its rotated `events.jsonl.1`; the legacy directory is
   `~/.claude/meu-time-activity`. Numeric tool-result sizes may appear in
   `tool-results.jsonl` (and its rotated file), or historically in events.
   These are discovery locations, not paths to copy into proposals. Historical
   rows without a producer version cannot be assigned today's action mapping.
2. An explicit correction or veto/overrule can support investigation only if
   actually supplied. Record a concise paraphrase of the decision and rationale
   only with the person's permission; otherwise mark it unknown/unavailable.
   Dispatch and completion do not prove a verdict. Never join nearby events to
   infer human decisions. Prefer no change if the rule already works or evidence
   does not establish a useful correction.
3. Form one falsifiable hypothesis, a sanitized synthetic scenario, expected
   behavior and a protected counterexample. Identify the existing rule and the
   precise canonical source in `agents/`, `reference/`, or the relevant project
   `canonkit.json`. Project tuning remains project-specific; never edit generated
   installed copies. Prepare a reviewable diff without applying it unless the
   person has authorized that concrete change.

## Privacy

Use [proposal-template.md](proposal-template.md) for a durable proposal. Its
allowlist is: local proposal ID; dates and bounded period; harness and signal
category; aggregate counts by existing gate kind and, only if safe, fixed rule
identifier; synthetic scenario and expected behavior; intended public source
path and diff; case ID, revision, model/settings and aggregate results; review,
authorization, expiry and rollback decisions. Omit or coarsen revealing small
counts; omit a rule value if it may contain user-specific content. Never copy
raw task, detail, file, project name, session or agent identifiers, commands,
transcripts, secrets, log paths or unreviewed eval output. A source-controlled
target path is allowed only as the intended public change, not as a log path.
Keep separately authorized sensitive evidence in its original access-controlled
location. Do not publish saved eval transcripts.

## Evaluate and decide

Calibrate each case and fixed judge offline with a correct answer and plausible
wrong answers, including ones that contain expected keywords. Do not relax a
judge merely to pass. For a model-instruction claim, fix cases, controls, judge,
model, settings and comparable environment before runs. Require at least three
answered runs per side for each target and control. The baseline target must
fail (fewer than two thirds pass); the candidate target and each control on both
sides must hold (at least `ceil(2n/3)` passes). Report all attempts, answers,
errors and variance; infrastructure errors and unanswered runs are unmeasured,
not passes or failures. Never discard valid answers or selectively retry. Offline
calibration or rescoring is not a model run; do not invent measurements. Until
the evidence exists, leave the proposal awaiting evidence.

For deterministic project configuration, demonstrate a real fixture failing
before and passing after while a genuinely risky control still gates. This proves
configured behavior only. Never weaken an enforced security gate from counts
alone. A model judgment claim still needs behavioral runs. The quality runner
uses a checkout agent body but installed global skills; a body variant cannot
measure a skill, changed description, managed block or project configuration.
Routing uses installed instructions. Controlled installation or another
validated isolation method requires separate authorization; no existing run
establishes Codex/OpenCode behavior from Claude results.

Measure the default context-cost profile in whitespace-separated words (`wc -w`):
sum kit-owned instruction content automatically loaded at user and project level,
the descriptions of default agents, skills and commands, and any instructions
of kit-installed MCP servers. Exclude on-demand bodies and user text outside
managed markers. Record the profile, per-file component counts, total and
before/after delta; report other profiles separately.
The anchor is at most 2,500 words. If exceeded, propose a compensating cut and
remeasure the combined diff; never silently raise the budget.

Quinn reviews acceptance and coverage; route the actual change to owners required
by its risk. Record the actual human decision, decision-maker and date. A status
label is not authorization. Obtain applicable human authorization for each
concrete mutation, evaluation, installation, commit and push; ask before commit
or push. Never run paid evaluations without authorization. Missing approval or
measurements remain unknown or unmeasured, not implied by this workflow.

## Review and expiry

Treat application as the initial confirmation date. On manual inspection mark
review due 90 days after application or last confirmation. Reconfirm only with fresh relevant evidence and an explicit
maintainer decision; schedule the next review within 90 days. At 180 days or
later since last confirmation mark expired and request a decision. Expiry does
not automatically change or roll back source. An expired record is not current
confirmation and cannot support re-promotion without fresh evidence and an
explicit decision. Record the exact revert target, check intervening edits, and
apply the same risk, test and authorization rules to any revert.

# Learning loop — design proposal

Status: manual workflow implemented locally, 2026-11-02; behavioral efficacy
unmeasured. Item 6 of the
[handoff](canonkit-improvements-handoff.md#6-learning-loop-the-users-view-of-memory).
The proposed workflow changes team instructions or project configuration through
reviewable source diffs; it does not create a memory service. Its new process is
MEDIUM risk: an incorrect lesson can change shared behavior. A particular diff
may be HIGH and follows the existing owner and independent-review rules. Quinn
reviewed the acceptance criteria below. The user subsequently authorized
implementation; individual lessons still require their own evidence and
authorization. See the implementation record below.

## Evidence available today

| Signal | What it supports | Limits and source |
| --- | --- | --- |
| Claude gate events | Counts by gate kind, and where present rule, over a stated period can identify a candidate for investigation. | `hooks/canonkit-hook.js` records `ts`, `session`, `event`, `kind` and gate-specific fields; `logGate` and the Stop path add different fields. A gate is an invocation, not proof that a write happened, that it was a false alarm, or that a person approved or declined it. Retries and rotation affect counts. `events.jsonl.1` may hold older events. |
| Codex/OpenCode | An explicit correction or separately supplied evidence can identify an issue. | `hooks/canonkit-codex.js` and `hooks/canonkit-opencode.js` pass `logDir: null` and discard core logs. Absence of rows is not absence of events. |
| Dispatch and context metrics | Agent dispatch/resume/end events, durations, token counts and numeric tool-result sizes can describe observed process cost and volume. | `hooks/canonkit-hook.js` and `dashboard/serve.js` retain quantitative summaries. Dispatch or completion does not prove a review verdict, acceptance, veto or user approval; some metrics are unavailable or cumulative. No transcript ingestion is needed. |
| Eval failure | A named case and measured run can identify a repeatable behavioral miss, subject to its judge and sample. | `docs/evals.md` documents the runner and its exclusions. Errors and unanswered runs are unmeasured, not passes or failures. Offline rescoring is not a new model run. |
| User correction or overruled veto | An explicit human statement, recorded manually with its context and authority, can support investigating a change. | No existing event field reliably captures the statement, rationale, approval, decline, or links a veto to its resolution. A gate count cannot supply these facts. |

The core returns a decision to the harness separately from its log record
([record and `logGate`](../../hooks/canonkit-hook.js#L1053),
[`claudeOutput`](../../hooks/canonkit-hook.js#L1368)). That return
does not capture the subsequent human response. Do not join nearby events or
infer consent from later activity. Counts are investigation leads, not a
false-positive rate; no denominator of legitimate opportunities is available.

**Local snapshot, 2026-11-02, source revision `1e566fd`.** A read-only scan of
the current Claude activity file found 4,148 valid JSON lines and no malformed
lines, spanning 2026-06-22 17:45:56 UTC through 2026-11-02 03:18:04 UTC. Of
730 gate records, the counts were: `high-risk-surface` 309, `git` 184,
`context-size` 181, `secret-ask` 24, `definition-of-done` 19, `secret-block`
7, `git-bypass` 5 and `perf-budget` 1. Only two of the 309 HIGH-risk records
had a `rule` value; missing rules remain unknown and cannot be inferred
retroactively. None of the gate records contained decision, outcome, approval,
decline, permission decision, tool-use ID, harness, schema or version fields.
Current source maps gate kinds to hook actions (`ask`, `deny`, Stop `block`, or
context reminder), so the hook's intended action can be identified for a known
version. This is distinct from a human decision. The historical rows do not
pin their producer revision; do not backfill today's mapping as observed history.
The separate tool-results file had 2,535 lines; 119 historical tool-result
records also appeared in the activity file. No rotated or legacy files were
found in this snapshot.

These records mix projects and historical versions; counts are neither unique
incidents nor approvals, mistakes or false-positive rates. Logging is best
effort and may lose records. The writer rotates after the current file exceeds
approximately 2 MiB, keeping one rotated file
([writer and reader](../../hooks/canonkit-hook.js#L64)); the snapshot is not a
complete history. The absence of rotated or legacy files only describes this
inspection. No paid measurement was run and no score is raised by this snapshot.

## Manual workflow

1. On request, inspect available signals locally for a bounded date range and
   source. A recurring gate can prompt investigation; no threshold promotes a
   lesson. Note missing logs, rotations, sampling and harness coverage. Obtain
   an explicit user correction or veto/overrule record where the rationale
   depends on one; otherwise mark it unknown and do not claim it happened.
2. Reduce the evidence to the allowlist below. Form one narrow, falsifiable
   hypothesis and a sanitized, synthetic reproduction. Identify the existing
   rule and its canonical source. Prefer no change if the evidence does not
   establish a useful correction, or if the case reveals the existing rule is
   working as intended.
3. Produce a proposed diff to the canonical `agents/` source, a `reference/`
   managed block, or the relevant project `canonkit.json`, plus a case and
   counterexample. Project tuning stays project-specific; do not edit generated
   installed copies. Specify the actual canonical path in each proposal.
4. Validate the case and its judge offline, then obtain authorized behavioral
   evidence as described below. Quinn reviews the acceptance rule and coverage;
   route the proposed change to any owner required by its actual risk. The user
   authorizes the concrete diff before Virgo applies it. Follow existing review,
   install, commit and push permissions independently. Nothing is promoted or
   installed by this workflow automatically.
5. Record the decision, actual evidence and review date in the proposal. At
   review or expiry, a maintainer decides whether evidence confirms the lesson,
   whether to tighten or revert it, or whether to leave it pending a decision.
   Expiry triggers review, never automatic deletion or rollback.

## Privacy boundary

The durable proposal may contain only: a local proposal ID; dates and a bounded
period; harness and signal category; aggregate count by existing gate `kind`
and, if safe, its fixed rule identifier; sanitized synthetic scenario and
expected behavior; source-controlled path and diff; eval case ID, revision,
model/settings and aggregate outcomes; review, authorization, expiry and
rollback decisions. Record a human correction or veto as a concise paraphrase
of the decision and rationale only with the person's permission; otherwise mark
the evidence unavailable. Keep any separately authorized sensitive evidence in
its original access-controlled location, not in the proposal.

Never copy raw `task`, `detail`, `file`, project name, session/agent identifiers,
commands, transcripts, secrets, paths from logs, or unreviewed eval output into
the proposal. Event `rule` values must be checked for user-specific content;
omit them if uncertain. Counts can disclose sensitive activity in small groups:
omit or coarsen them when needed. A source-controlled target path is allowed
only when it is the intended public change, not a copied event path. Saved eval
transcripts may contain task content; the existing `--save` option is not an
instruction to commit or publish them.

## Proposal record (template, not a new schema)

- ID and date; status: investigating / proposed / awaiting evidence / authorized /
  applied / review due / expired / reaffirmed / revert proposed / closed without change.
- Source and bounded period; sanitized aggregate and known coverage gaps;
  explicit correction or veto decision and rationale, or `unknown`.
- Hypothesis, intended behavior and protected counterexample; why the existing
  instruction/configuration is insufficient; canonical target and proposed diff.
- Case ID and scenario, expected verdict, judge calibration, offline results;
  baseline and candidate revisions, matching model/settings, measured runs,
  errors and outcomes. Mark missing measurements `unmeasured`.
- Context-cost profile, per-component counts and total before/after; review
  owners, authorization and decision; applied revision if any.
- Last confirmation date, review due date, owner, rollback/revert target and
  decision. Store only the minimum allowlisted evidence above.

## Acceptance and evaluation

These are proposed acceptance cases, not results or instructions to build a new
runner. For each actual proposal, select applicable cases, retain the evidence
and record the actual human decision. An `authorized` status alone is not evidence
of authorization: identify the decision, decision-maker and date, within the
privacy boundary. The user authorizes the concrete diff before application;
evaluation, installation, commit and push each remain subject to their own
authorization.

| ID | Synthetic evidence or input | Expected decision or protected behavior | Evidence |
| --- | --- | --- | --- |
| L01 | Gate followed by a later tool call; no recorded response | Outcome remains unknown; later activity does not establish approval, decline or a false positive. | Deterministic record review |
| L02 | Repeated same-kind gates, including retries; no independent correction | Counts prompt investigation only; no false-positive rate or rule change is inferred. | Deterministic record review |
| L03 | Missing, malformed or rotated log; harness with no logs | Report coverage and incomplete data; do not infer no events or outcomes. | Deterministic record review |
| L04 | Log with task, path, identifier, command or transcript | Durable proposal excludes raw content and secrets; use a sanitized synthetic case and omit unsafe small counts or rule values. | Deterministic privacy review |
| L05 | Claimed correction or veto with no permitted human record | Mark it unknown/unavailable; do not invent rationale or approval. | Deterministic record review |
| L06 | Baseline and candidate with targeted case and protected control | Baseline fails target, candidate passes target and preserves control under the fixed judge and threshold below. | Later behavioral runs, or deterministic fixture for a config-only claim |
| L07 | Correct answer and wrong answer that includes expected keywords | Offline judge accepts the correct answer and rejects the plausible wrong answer; no judge change merely to turn results green. | Deterministic judge calibration |
| L08 | Three attempts with one answer and two errors, or no answer | Errors are unmeasured; runner's held result cannot satisfy the minimum evidence for promotion. | Deterministic summary review |
| L09 | Inspection at 90 days; inspection at 180 days since last confirmation without reconfirmation | At 90 days mark review due; at 180 days or later mark expired and request a decision. Keep source unchanged without an authorized decision. An expired record is not current confirmation and cannot support re-promotion; fresh evidence and an explicit decision are needed to reconfirm. No scheduled job or automatic rollback. | Deterministic record/date review |
| L10 | Candidate exceeds 2,500-word default profile | Propose a compensating cut, then measure the combined diff against the same method; do not silently loosen the anchor. | Deterministic count and diff review |
| L11 | Proposal targets generated installed copy or includes session-start injection | Redirect to canonical source or reject injection; no automatic install or promotion. | Deterministic source/diff review |
| L12 | Proposed diff or eval has no applicable human authorization | Leave awaiting authorization/evidence; do not apply, install, run paid evals, commit or push. | Deterministic decision-record review |

For a model-instruction claim, fix the case, judge, model, settings and comparable
environment before comparing baseline and candidate. Require at least **three
answered runs per side per targeted case and control**. Using the runners' two
thirds rule, the target must fail on baseline (fewer than two thirds pass) and
hold on candidate (at least two thirds pass); the control must hold on both.
For exactly three answers this means baseline target at most 1/3 passes,
candidate target and each control at least 2/3 passes. Report all attempts,
answers, errors and variance. More answers use `ceil(2n/3)` as the hold
threshold. This small sample supports only a limited behavioral observation.
The existing runners count two thirds of *answered* runs and can report a case
held with one answer; this proposal's minimum is stricter than their exit status.
Do not discard inconvenient valid answers or retry selectively to obtain a pass.
No paid run is authorized by this design. If either side lacks this evidence,
the proposal remains **awaiting evidence**; offline calibration or rescoring is
not a model run.

For deterministic `canonkit.json` tuning, an actual gate/config fixture must
fail before and pass after while a genuinely risky positive gate remains. This
establishes only configured behavior. A claim about model judgment still needs
the behavioral comparison above. Never weaken an enforced security gate solely
from counts; route the actual risk to its owner.

Routing evaluates the **installed** team and global instructions, not checkout
changes; quality uses the checkout agent body or `--variant`, while retaining
installed global blocks and the shipped name/description/model. A quality body
variant cannot measure a changed description, managed block or project config.
A routing before/after therefore needs a separately authorized, controlled
installation or another validated isolation method, with version and environment
recorded. That method is pending and is not authorized here. Neither runner
establishes native Codex/OpenCode behavior from a Claude run.

For an illustrative candidate, a repeated `high-risk-surface` gate alone is
insufficient. A separately documented correction could motivate a synthetic
case where a benign project-specific path should be excluded and a genuinely
risky path still gates. Both fixture outcomes must be observed; this example
asserts no result and no approval.

### Quinn review record

**Verdict: approve the design note with conditions; not implementation approval.**
The workflow is MEDIUM risk because a mistaken lesson changes shared instructions;
a concrete diff can raise the risk. The conditions are the acceptance matrix,
minimum answered runs and explicit authorization above. Behavioral promotion is
blocked until its actual evidence and required owner reviews exist. Existing
coverage validates lexical judges and cases, not model compliance; current runner
summaries can hold a case on one answer ([routing](../../scripts/eval-routing.mjs),
[quality](../../scripts/eval-quality.mjs), [eval documentation](../evals.md)).
The existing routing and quality runner dry runs completed successfully, listing
23 and 45 cases respectively; they called no models and did not execute these new
acceptance cases. No paid model eval, fixture result or installation was performed.
The named native profile requested `gpt-5.6` at medium effort but failed with
`model_not_found` on ChatGPT. The native Codex subagents loaded the role
instructions and requested `gpt-6.1-terra` at high effort for Virgo and medium
for Quinn; collaboration returned no resolved-model telemetry to independently
verify the runtime model.
Missing or rotated data, unavailable corrections, injected source text and
expiry without a decision remain observable unknowns, not grounds for automatic
changes. The future concrete change requires review appropriate to its risk.

## Expiry, rollback and context budget

Proposed initial policy: review an applied lesson 90 days after application;
reconfirm only with fresh relevant evidence and an explicit maintainer decision,
then schedule another review within 90 days. On the next manual inspection at
180 days or later since the last confirmation,
mark it expired and request a decision to retain with rationale, revise, or
revert. If no one decides, keep the existing source unchanged and visibly mark
the lesson expired; an expired record is not current confirmation and cannot
support re-promotion. Expiry itself does not authorize weakening a rule. Record
the exact source revision/diff to revert, check for intervening edits and route
any revert through the same risk, test and authorization rules as a new change.
These windows are proposed defaults for review, not a scheduled job.

Apply the `context-cost` 10 anchor of **at most 2,500 words** to the default
install, using `wc -w` and the full method in
`evals/instruction-rubric.json`: kit-owned automatically loaded instruction
content, default agent/skill/command descriptions and kit-installed MCP
instructions; exclude on-demand bodies and user text outside managed markers.
Record per-component counts, profile, total and before/after delta. The 1,993
figure in that rubric is a historical 2026-10-29 calibration, not today's
measurement. At source revision `1e566fd`, the 2026-11-02 default Claude source
profile totals **2,007 words**: `reference/agents-block.md` 1,300,
`reference/routing-block.md` 366, ten core agent descriptions 273, and two
default skill descriptions 68. That leaves 493 words below the anchor; this
on-demand design note adds zero always-loaded words. This is source-derived,
not a fresh full audit of the installed profile. Reproduce by counting
whitespace-separated words (`wc -w`) in those two complete source blocks,
the frontmatter `description` values of the ten core agents and those of the
default `orchestrate` and `context-tune` skills, summing the four components;
compare the actual installation and include any other applicable rubric inputs
before asserting an installed total. Report other profiles separately. If the
candidate exceeds the
anchor, propose a compensating cut or tightening and remeasure the combined
diff; do not silently change the budget.

There is no SessionStart injection, transcript ingestion, autonomous promotion,
new CLI, telemetry schema, dependency or storage service in this design. The
rejection of automatic handoff injection remains in
[`ecc-lessons-handoff.md`](ecc-lessons-handoff.md).

## Implementation record (2026-11-02)

The on-demand [learning-loop skill](../../skills/learning-loop/SKILL.md) and
[proposal template](../../skills/learning-loop/proposal-template.md) implement
the manual workflow. Virgo's body points to the skill. The existing skill copier
and install catalog include both files without installer or hook changes; no
new CLI, runtime service, telemetry schema or dependency was added. The
[user guide](../learning-loop.md) covers invocation and the proposal lifecycle.

Three synthetic quality cases cover unknown human outcomes, insufficient
evidence and a clean pending proposal. The existing judge is unchanged. During
independent review, Quinn identified accepted wrong recommendations and a
rejected correct negation; the new case expectations and calibration now cover
those examples in both directions. Quinn approved offline implementation quality
after the final correction. This is lexical calibration, not a model run or
evidence that a lesson improved behavior. The other design scenarios remain
manual review criteria; the three cases do not automate all twelve.

The default Claude source profile is now **2,026 words**: managed blocks
1,300 + 366, ten core agent descriptions 273, and three skill descriptions 87.
That is a 19-word increase from the design baseline, leaving 474 words below
the anchor. The new source-profile test guards the 2,500-word ceiling; the skill
body and template load on demand. A fresh installed-profile audit and behavioral
comparison remain unmeasured. No real user-level installation, paid eval, commit
or push was performed.

Verification: focused eval calibration 23/23 and scratch installation/uninstall
plus context-budget checks 2/2 passed. Both existing runners' dry-runs loaded
23 routing and 48 quality cases without model calls. `validate.sh` passed with
15 agents, and `npm pack --dry-run --json` included both new skill files among
40 package files. The full suite finished with **731 tests: 728 passed, 3 skipped,
0 failed** (213.7 seconds, Windows). The final eval-calibration delta also passed
its focused 23-test run. The optional skill
creator Python validator could not run because its environment lacks PyYAML;
the repository's skill/frontmatter validator passed. Initial attempts to start
Node/Bash checks in the sandbox failed on process creation; the successful checks
used the permitted execution context instead.

Spencer approved the documentation against the final workflow. Root's
Integration Review found the skill, template, installation lifecycle, tests and
guide consistent: no conflicting owner decisions, automatic changes or missing
handoff responsibilities. Offline implementation is ready for review. Behavioral
efficacy, native-harness model comparisons and publication remain unverified;
they are not implied by the passing suite. The existing cross-OS CI matrix was
not run locally.

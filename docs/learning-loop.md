# Learning from mistakes

Use the `learning-loop` skill to investigate a recurring gate, an eval failure,
an explicit user correction or an overruled veto, then propose a small change to
the relevant instruction or project configuration. Virgo owns the proposed
change; Quinn reviews the acceptance evidence.

For example, ask:

> Use learning-loop to investigate this recurring gate. Prepare a sanitized
> proposal with the evidence, a proposed diff and a regression case. Leave
> unavailable outcomes unknown and do not run paid evals.

You can also invoke `/learning-loop` in Claude Code or `$learning-loop` in Codex.
The skill and its proposal template are installed with the reference skills;
`install --no-reference` skips them. See
[installation](install.md#global-reference-blocks-and-skills).

## What you receive

The result is a proposal made from the skill's
[template](../skills/learning-loop/proposal-template.md), saved to a location you
choose. It contains a narrow hypothesis, sanitized evidence, a proposed source
diff, a case that can distinguish the old and proposed behavior, a protected
control, and review, authorization and expiry information. Missing measurements
stay `unmeasured`; the proposal is useful before it is ready to apply.

Repeated gates are leads for investigation. Existing gate events do not record
whether a person approved or declined, and later activity does not establish
consent. Codex and OpenCode currently produce no canonkit activity log. These
limits must remain visible in a proposal. Raw logs, commands, session identifiers
and transcripts do not belong in it.

A lesson changes the canonical agent or managed-block source, or a project's
`canonkit.json`. Generated installed copies are replaced on reinstall. Review
the concrete diff and authorize its application before Virgo changes the rule.
Installing, running paid evals, committing and pushing follow their own existing
permissions; preparing a proposal does not authorize them.

## Evidence and review

Instruction changes need a fixed case and judge, comparable baseline and
candidate runs, and a control against overcorrection. At least three answered
runs per side are required: the target fails on baseline and holds on candidate,
while the control holds on both, using the two-thirds threshold. Infrastructure
errors are unmeasured. An offline judge check or a runner's exit status alone
does not establish the improvement. See [evals](evals.md#learning-loop-cases).

A configuration-only claim can instead use an actual deterministic gate fixture
that fails before and passes after, retaining a genuinely risky positive gate.
It establishes the configured behavior, not model judgment. Changes to gates
still require the owners and reviews appropriate to their risk.

Review an applied lesson after 90 days. At a manual inspection 180 days or more
after application or its latest confirmation, mark it expired and request a
decision. Fresh
relevant evidence and an explicit decision are needed to reconfirm it. Expiry
does not edit or revert instructions automatically.

The skill runs on demand. There is no SessionStart injection or automatic
collection, promotion, installation or rollback. Its
[instructions](../skills/learning-loop/SKILL.md) carry the full workflow and
privacy rules; the [design note](plans/learning-loop-design.md) records the
initial investigation and acceptance rationale.

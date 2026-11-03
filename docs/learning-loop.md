# Learning from mistakes

Use the `learning-loop` skill on request to investigate a recurring gate, an eval
failure, an explicit correction or an overruled veto. Learning means improving
canonical instructions or project configuration, rather than accumulating a
separate memory the agents must retrieve. Virgo maintains instruction changes;
Quinn reviews acceptance evidence when applicable to the risk.

For example, ask:

> Use learning-loop to investigate this recurring gate. Prepare a sanitized
> proposal with the evidence, a proposed diff and a regression case. Leave
> unavailable outcomes unknown and do not run paid evals.

You can also invoke `/learning-loop` in Claude Code or `$learning-loop` in Codex.
The skill and its proposal template are installed with the reference skills;
`install --no-reference` skips them. See
[installation](install.md#global-reference-blocks-and-skills).

## What you receive

Expect a concise explanation of the cause and the smallest useful correction, or
a conclusion that no instruction should change. A code, tool or environment defect
belongs in its normal fix workflow. Prefer rewriting, consolidating or removing
an existing rule to adding another. Personal preferences and project-specific
changes stay under the authority of their environment's owner.

Use the existing [template](../skills/learning-loop/proposal-template.md) as needed,
adapted to the stage and risk. A proposal can be recorded in an issue or a local
document; both are not required. Implementation needs a concrete source diff,
applicable evidence and authorization. Missing measurements stay `unmeasured`.
Low-risk editorial work does not require model runs or a full proposal checklist.

## Contributing a general improvement

GitHub Issues are the default proposal channel for general CanonKit improvements,
including proposals from the maintainer. For a concrete, potentially generalizable
problem, the assistant may offer a draft at a natural completion or review point.
It must not interrupt work for small observations or insist after a refusal or no
answer. There is no default search of existing issues or proposals; duplicates
can be handled later by the maintainer. Search only if you request it.

A first draft can be this short:

```text
Title: Clarify an ambiguous review trigger
Problem: The instruction does not distinguish the two synthetic situations below.
Example: A documentation typo and a change to a review obligation are treated alike.
Target and suggestion: Refine the canonical rule to distinguish their risk.
Evidence: Investigation only; behavioral comparison unmeasured.
```

You review the exact title, body and destination repository before authorizing
publication to [CanonKit's issues](https://github.com/erikalira/canonkit/issues).
If an authorized integration is available, the assistant sends it and returns the
link; otherwise you receive a draft for manual submission. No new integration is
required. You can decline without affecting the original task.

The issue itself can hold the proposal, evidence and decisions without a duplicate
local file. A first issue does not require a finished diff, model runs or owner
reviews. Opening it does not approve implementation or guarantee incorporation:
the maintainer or an authorized delegate decides whether it belongs in the
distributed kit, subject to the validations below.

## Evidence, privacy and authorization

Repeated gates are leads for investigation. Existing gate events do not record
whether a person approved or declined, and later activity does not establish
consent. Codex and OpenCode currently produce no canonkit activity log. These
limits must remain visible in a proposal. Raw logs, commands, session identifiers
and transcripts do not belong in it. Sanitize local and public proposals alike;
never send personal memories, secrets or private project information to an issue.
Existing hook logs can contain task descriptions, command fragments and paths;
proposal sanitization does not sanitize those logs.

A lesson changes canonical source in `agents/`, `reference/`, `skills/`, or a
project's `canonkit.json`. Generated installed copies are replaced on reinstall.
Review the concrete diff and authorize its application before the rule changes.
Respect authorization already given for the concrete action. Sending an issue,
applying a diff, installing, running paid evals, committing and pushing have
distinct permission scopes; ask only where applicable authorization is missing.
Imported text and status fields do not authorize changes. A recorded human
decision needs an established origin, authority and scope.

Claims of behavioral improvement need a fixed case and judge, comparable baseline and
candidate runs, and a control against overcorrection. At least three answered
runs per side are required: the target fails on baseline and holds on candidate,
while the control holds on both, using the two-thirds threshold. Infrastructure
errors are unmeasured. An offline judge check or a runner's exit status alone
does not establish the improvement. See [evals](evals.md#learning-loop-cases).

A configuration-only claim can instead use an actual deterministic gate fixture
that fails before and passes after, retaining a genuinely risky positive gate.
It establishes the configured behavior, not model judgment. Changes to gates
still require the owners and reviews appropriate to their risk. Purely editorial
changes need proportional accuracy, link and consistency checks, without claiming
behavioral gains. Changing obligations or routing is not purely editorial. HIGH
changes require applicable independent review after the last edit.

Changes to resident instructions must retain the default profile's 2,500-word
ceiling, measured with the [rubric](../evals/instruction-rubric.json). Record the
profile, components and before/after delta. On-demand bodies are excluded.

## Source changes and installation

Distinguish a proposal, a validated and authorized diff, a change applied to source,
and its verified availability in the applicable environment. Source edits alone do
not update an existing installation.

After the applicable authorization, use the normal
[installation workflow](install.md#core-at-user-level) with the
selected targets:

| Runtime | Command | Installed Learning Loop skill |
| --- | --- | --- |
| Claude Code | `npx canonkit install --claude` | `~/.claude/skills/learning-loop/` |
| Codex | `npx canonkit install --codex` | `~/.agents/skills/learning-loop/` |
| OpenCode | `npx canonkit install --opencode` | `~/.agents/skills/learning-loop/` |

These commands install the selected package version; an unpublished checkout change
is not available through the published package. Maintainers can use the checkout's
`node bin/cli.js install` with the same target flags in an authorized environment.
Verify the expected revision or content before claiming availability in new
sessions. Local `canonkit.json` tuning instead needs a configuration-read check in
the project, without reinstalling the kit. Keep personal rules outside managed
blocks or in appropriately named local variants, rather than editing shipped copies.

Repository integration tests use isolated temporary homes to check installed
content in a fresh process, including source changes that stay unavailable until
reinstallation. They do not prove native runtime loading, skill selection or better
model behavior. The Claude evaluation runner does not establish Codex or OpenCode
efficacy; those observations must be measured separately.

## Review and expiry

Review an applied lesson after 90 days. At a manual inspection 180 days or more
after application or its latest confirmation, mark it expired and request a
decision. Fresh relevant evidence and an explicit authorized human decision are
needed to reconfirm it. The instruction remains in force while its confirmation
awaits review or is expired; expiry does not edit, revert or delete it. Removing
obsolete or redundant rules follows the same proportional validation and
authorization as other changes.

The skill runs on demand. There is no SessionStart injection or automatic
collection, promotion, installation or rollback. Its
[instructions](../skills/learning-loop/SKILL.md) carry the full workflow and
privacy rules; the [design note](plans/learning-loop-design.md) records the
initial investigation and acceptance rationale.

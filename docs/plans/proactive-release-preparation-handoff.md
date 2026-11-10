# Proactive release preparation — instruction proposal and handoff

Date: 2026-11-09. Owner: canonkit maintainers; documentary review: Spencer.
Risk: MEDIUM, a new completion obligation in distributed instructions.
Status: applied to canonical sources with the maintainer's requested default
for Keep a Changelog and Semantic Versioning. Behavioral efficacy remains
unmeasured; installed copies have not been updated.

## Goal and evidence

Keep the README useful for understanding and using the current product. Prepare
relevant release notes without a separate documentation request, and assess the
version impact of a complete delivery rather than incrementing versions per edit.

Bounded evidence: canonical-source inspection and a requested workflow improvement.
No telemetry, private logs or transcripts were ingested. The inspected worktree
has package version 3.0.0 and uncommitted changes on HEAD `1637bbd`; that HEAD
alone does not identify the inspected source state.

- `agents/spencer.md` already assigns release notes and defines their minimum
  structure, but does not establish a proactive completion trigger.
- `agents/bob.md` already points completion at `skills/orchestrate/SKILL.md`.
  That protocol qualifies verification claims but does not require assessing
  release documentation or version impact.
- `docs/releasing.md` defines canonkit's own release procedure, including notes
  in `docs/release-notes/X.Y.Z.md`. The kit's distributed instructions must also
  respect other projects' existing conventions.
- A trigger only in the roster or Spencer's body can miss inline work in Codex,
  OpenCode and Claude projects where that roster has not been loaded. Replace
  the existing incidental-findings paragraph in each harness adapter with a
  combined short pointer; keep the detailed policy in the existing skill.

Hypothesis: a completion trigger in the loaded adapters plus a single policy in
the completion protocol reduces implemented deliveries missing release notes,
while preserving proportionate LOW work and publication authorization. This is
a falsifiable hypothesis, not a measured improvement.

## Intended behavior and protected controls

1. A shipped CLI command changes without an explicit request for notes: prepare
   or update reader-oriented history in the project's existing destination.
   Update the README too if its current usage examples became incorrect.
2. A release batch has a determined target version: update its version manifests
   together, once, according to project policy and compatibility impact. Do not
   classify a breaking change as a patch merely because the diff is small.
3. A relevant implementation has no established release destination or version:
   retain a concise draft and pending decision in the existing task, PR or change
   artifact. Do not invent a new release process or claim a release exists.
4. A private-comment typo, investigation or unimplemented proposal: no fabricated
   release entry, version bump, extra artifact or mandatory Spencer dispatch.
   A LOW fix with real reader impact may still deserve a concise note.
5. A project uses an established changelog or versioning policy: preserve it;
   do not impose canonkit's directory layout. When no convention exists, use
   Keep a Changelog and Semantic Versioning (SemVer) as the defaults.
6. Local preparation does not authorize commit, push, tag, merge, publication,
   personal installation or paid evaluation. Existing authorization remains valid.

## Applied source changes

Apply the same adapter replacement in each of these three existing files:
`reference/routing-block.md`, `reference/codex-block.md` and
`reference/opencode-block.md`. No new roster rule or duplicate Bob procedure.

```diff
-On any task, including LOW without delegation, preserve concrete incidental
-findings using the `orchestrate` skill's incidental-findings procedure; do
-nothing extra without findings.
+Before delivering an implemented change, use the `orchestrate` skill's completion
+protocol, including documentation and release impact; LOW stays inline. Preserve
+concrete incidental findings through its incidental-findings procedure; do nothing
+extra without findings.
```

In `skills/orchestrate/SKILL.md`, extend its existing description trigger:

```diff
-description: Use when planning or dispatching subagents (model and effort, parallel work, isolated writers), coordinating an existing OpenSpec change, closing a MEDIUM/HIGH change involving multiple disciplines (Integration Review), or handling concrete incidental findings on any task, including LOW.
+description: Use when handling change completion, planning or dispatching subagents (model and effort, parallel work, isolated writers), coordinating an existing OpenSpec change, closing a MEDIUM/HIGH change involving multiple disciplines (Integration Review), or handling concrete incidental findings on any task, including LOW.
```

Preserve the incidental procedure's explicit reach when consolidating its pointer:

```diff
 ## Incidental findings

-When normal work reveals a concrete out-of-scope problem, use
+On any task, including LOW without delegation, when normal work reveals a
+concrete out-of-scope problem, use
 [the incidental-findings procedure](out-of-scope-issues.md) to preserve it and
```

Add the operational rule immediately after the `Evidence-based completion`
heading, before the existing verification-status guidance:

```diff
 ## Evidence-based completion

+Before delivery, briefly assess documentation, release history and version
+impact. For implemented changes relevant to users or maintainers, prepare or
+update release notes without waiting for a separate request. Follow the
+project's existing changelog, Unreleased or release-note convention; describe
+observable changes, compatibility breaks and required action. If no destination
+or version is established, retain a concise draft and the pending decision in
+the existing task, PR or change artifact instead of inventing a release process.
+Keep unimplemented work and unverified claims explicit.
+
+Keep the README focused on understanding and using the current product. Update
+it when current instructions or capabilities change; put chronological history
+in the changelog or release notes rather than appending patch notes to it.
+
+Determine version impact from the complete release batch, its manifests and
+project policy, using SemVer where applicable. During authorized release
+preparation with a determined target version, update the version files together
+and idempotently. Otherwise report the pending version decision. Do not bump per
+edit, for planning or for trivial editorial work. LOW assessment stays brief;
+no reader impact means no release artifact or extra dispatch. Preparation never
+implies authorization to commit, push, tag, merge or publish.
+
 Qualify the claim being made, using the existing short report rather than a new
```

In `agents/spencer.md`, rewrite its existing responsibility without changing the
frontmatter description or adding another procedure:

```diff
-- Create and maintain specs, technical documentation, API docs, runbooks, and release notes; structure PRDs together with Scott; review ADRs for clarity.
+- Maintain specs, technical documentation, API docs and runbooks for current use, and changelogs or release notes for change history; structure PRDs with Scott and review ADRs for clarity.
```

## Proposal-stage validation and review

The baseline and candidate profiles were calculated read-only, applying the
proposed adapter and skill-description substitutions in memory. This follows
the existing CLI test's whitespace-word method, including the roster, rendered
default adapter, core descriptions and skill descriptions. Source replacements
were checked against the current files. No canonical file was modified.

| Default profile | Before | Proposed | Delta | Budget |
| --- | ---: | ---: | ---: | ---: |
| Claude, optional hooks omitted | 2,283 | 2,296 | +13 | 2,500 |
| Codex | 2,388 | 2,401 | +13 | 2,500 |
| OpenCode | 2,434 | 2,447 | +13 | 2,500 |

Components: roster 1,782; core descriptions 229; skill descriptions 96 → 99.
Adapters: Claude 176 → 186, Codex 281 → 291, OpenCode 327 → 337. Spencer and
skill bodies are on demand and excluded from the resident-source profile.
The added on-demand completion consultation can still cost time and tokens;
that effect has not been measured. Optional-hook profiles are not measured here.

Spencer recommended the documentary policy. Virgo reviewed the final five-source
loading approach and resident budget, keeping roster and Bob unchanged. Quinn
approved the concrete cases and controls for a maintainer decision, without
blockers. These are proposal reviews, not application approval or evidence of
model compliance.

Behavioral efficacy remains **UNMEASURED**. No model runs, paid evaluations,
installation, canonical-source application, commit or publication were performed.
If evaluated under learning-loop, fix target/control cases, revisions, model and
settings before runs; calibrate the judge offline and record every attempt. At
least three answered runs per side are required before an efficacy claim. Keep
the proposal awaiting evidence until that evidence exists; do not infer it from
word counts, format checks or a review verdict.

## Implementation outcome

The maintainer approved the source changes with the adjustment that projects
without an established changelog or versioning policy default to Keep a Changelog
and SemVer. Applied the three adapter updates, the completion rule and the
Spencer responsibility change. Canonkit's own per-version release-note
destination remains unchanged as an established project convention.

Node is `v25.9.0`. An earlier full-suite run, before the portable validator was
added, reported 908 tests, 891 passed, 6 failed and 11 skipped. Five failures
could not create symlinks (`EPERM`); one dashboard test failed with
`null !== 0`. Their causes remain unverified. The resident-profile budget test
subsequently passed in isolation.

The new portable `npm.cmd run validate` runs without Bash and checks Python,
Node, Codex output and repository hygiene. It currently reports one failure:
`git diff --check HEAD` finds a new blank line at EOF in
`docs/plans/ecc-skills-knowledge-groups-handoff.md:1083`, a staged file outside
this task. This finding is confirmed and was not changed. Portable mode also
reports partial coverage because Bash syntax checks are not run. The validator
test now isolates its portable-mode assertions from repository hygiene state;
`node --test test/validate.test.js` passes all 4 tests, and both changed JS files
pass `node --check`.

Full Bash validation remains unverified. An approved Git Bash invocation was
blocked by the sandbox while creating
`\BaseNamedObjects\msys-2.0S5-1888ae32e00d56aa` (`NtCreateDirectoryObject`,
`0xC0000022`); WSL was not used. No permission, ExecutionPolicy or repository
state was changed to work around it. The requested `graphify update .` also
remains blocked: even after approval for a one-time read, the sandbox denied
`C:\Users\lirae\AppData\Roaming\Python\Python312\site-packages\graphify\__init__.py`.
No alternate access path was attempted. No installed copy was updated, so the
new rule is not yet available in already-installed teams. Behavioral efficacy
remains unmeasured.

## Decision and continuation

The user authorized applying this proposal with the Keep a Changelog and
SemVer default described above. No paid behavioral evaluation was authorized.
The source changes do not authorize a commit, push, tag, merge, publication,
personal installation or paid evaluation. Rollback means reverting these
specific hunks after checking intervening edits, not restoring whole files or
generated installed copies.

This is separate from `environment-aware-security`; its unfinished platform
validation is unaffected. Use this single proposal as the handoff rather than
duplicating it in another planning record. Continue in a separate session if
desired, beginning with this file and the concrete implementation decision.

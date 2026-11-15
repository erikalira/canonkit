---
name: backlog-cycle
description: Run one backlog item per session, from picking it to a next-session prompt, with an approval stop before any edit and a defined exit when the item does not close. Invoked by the user only.
disable-model-invocation: true
---

# Backlog cycle

One backlog item per session: pick, confirm, plan, stop for approval, implement,
verify, review, close, commit decision, hand over. This skill adds only that
sequence. The mechanics live elsewhere and are pointed to, not repeated.

It assumes no backlog file, planning tool, tracker or release scheme. Names such
as `todo.md`, OpenSpec or `release/X.Y.Z` are examples of what a project may use.

## 1. Pick and confirm

- Use the backlog the project already uses: the one its instructions name, else
  the one its files make obvious. Resolve it as the `orchestrate` skill's
  incidental-findings procedure does ("Choose the destination"). With more than
  one candidate and no instruction naming one, ask the user once. Never merge
  backlogs or create one.
- Take the highest-priority open item. Read its linked handoff or section and
  the files it cites.
- Confirm on disk that what they describe still exists. Report any mismatch
  before planning; it may lead to exit C below.

## 2. Classify and size the ceremony

Classify LOW / MEDIUM / HIGH with the team's risk scale and name the reviewing
owner.

- LOW: inline, no planned change, only the close-out (sections 7 to 9).
- MEDIUM with no structural choice to record: a planned change without a design
  artifact.
- HIGH, or a structural alternative worth recording: the full package.

Plan with the project's own planning workflow, if it has one (the `orchestrate`
skill's "OpenSpec change lifecycle" when it uses OpenSpec). Do not introduce one.

## 3. Stop for approval

Present the plan and stop. Make no edit until the user approves.

## 4. Implement

- At MEDIUM and HIGH the implementer is the owner the team's roster names, not
  the lead. Brief it with the lines and decisions already known; take model and
  effort for the dispatch from the `orchestrate` skill's "Naming the model and
  effort".
- While it works, the lead may prepare release notes and the version, without
  touching the implementer's files.
- Release: detect the one in progress from the project (branch name, version
  file, release-notes draft). Bump the version only through the project's release
  procedure, and only if this release has not bumped it yet. Never invent a
  version.

## 5. Verify before review

Before calling a reviewer:

- read the diff;
- run a cheap red check: would the new test fail without the fix?
- run the tests by reach (the `orchestrate` skill's "Verification by reach").

A review should not spend a round on what a test would have caught.

## 6. Review

Ask the right owner to review after the last edit, briefed as the `orchestrate`
skill's "Briefing a review" says; cross-discipline changes also get its
"Integration Review".

- A regression this change introduced is fixed in the change, and the owner
  confirms again.
- A problem that existed before is an incidental finding: record it through the
  `orchestrate` skill's incidental-findings procedure and continue.

## 7. Close out

Follow the `orchestrate` skill's "Evidence-based completion", then:

- tasks reflect the work actually done;
- remove the handoff this item resolved, unless it states its own closing
  condition;
- mark the item in the backlog;
- record the findings;
- run the project's own post-change steps, from its instructions;
- archive the planned change, if the workflow has that step;
- run the project's validation.

## 8. Commit decision

When implementation, validation and required reviews are complete, ask which of
three the user wants. Claude Code: `AskUserQuestion`; otherwise a plain question.

1. The lead commits, and asks about push separately.
2. The lead hands over only the commit message.
3. The lead hands over the ready `git add ... && git commit -m ...` command.

Do not commit, and do not push, before the answer.

## 9. Hand over

End with the next-session prompt, ready to paste, in the user's language: the
next item, its handoff, the release in progress, and an instruction to invoke
this skill. Handoff path and prompt format are in the managed block's "New
session when the subject changes".

## When the cycle does not close

Three cases leave no happy path:

- A. An owner vetoes and the fix does not fit this session.
- B. The item is several items.
- C. The item is obsolete, already done, or the disk does not match its handoff.

The exit is the same for all three:

1. Stop.
2. Split the item (B) or drop it (C); for A, keep it with the veto stated.
3. Record the reason in the backlog.
4. Write or update the handoff with the real state.
5. Hand over the next-session prompt (section 9).

Leave no half-done change unrecorded: either revert it with the user's
agreement, or say in the handoff exactly what is done and what is not.

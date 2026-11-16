# Design

## Context

`skills/orchestrate/SKILL.md` › "Briefing verification" already says a brief
carries the evidence the lead has (commands, counts, work state), but nothing
says what a review brief must contain about the diff itself. The skill is ~19 KB
and loads on demand, so a few lines there cost nothing per turn;
`reference/agents-block.md` loads every turn and is not touched.
`scripts/validate-python.py` guards two orchestrate headings against loss.

## Goals / Non-Goals

**Goals:**
- A reviewer's first call can be reading the diff.
- The guidance works for Claude Code and Codex alike (plain git commands).

**Non-Goals:**
- Changing agent files or how reviewers read (handoff proposal 2, P2).
- Measuring the gain (handoff proposal 3, P2); efficacy stays UNMEASURED.
- Any tooling that generates the brief automatically.

## Decisions

- **New section `## Briefing a review`, right after "Briefing verification".**
  A separate heading can be guarded by the validator and linked; folding it into
  the existing paragraph would bury it. Alternative: a line in each reviewer's
  agent file — rejected, it repeats the rule in many places and belongs to the
  dispatcher, not the reviewer.
- **Range forms.** Committed work: `<base>..<head>` with `git diff <base>..<head>`
  and `git diff --numstat <base>..<head>` (base = the merge base with the target
  branch, resolved to a revision). Uncommitted work: "working tree against HEAD"
  with `git diff HEAD`, plus `git ls-files --others --exclude-standard` for
  untracked files, which no `git diff` shows.
- **Large diffs: per-file commands, not a scratch copy.** The handoff suggested
  saving a large diff to scratch. The block's temporary-work rule forbids shell
  redirects, so the lead would have to read the whole diff into its own context
  to write it with the file tool — the cost we are removing. A git range is
  already reproducible, so the brief gives `git diff <range> -- <file>` per file
  and the reviewer reads in parts. Scratch is kept only for a state git cannot
  show (e.g. a patch received from elsewhere). "Large" is left to judgment, with
  an indicative figure (a few hundred changed lines).
- **Validator guard.** Add `## Briefing a review` to the orchestrate heading
  tuple in `validate_skills` of `scripts/validate-python.py`, and verify it fails when the
  heading is removed.

## Risks / Trade-offs

- [Brief grows for tiny reviews] → the section says the scope is a few lines;
  for a one-file LOW change it is one line.
- [Base resolved against a stale target branch] → the brief records the
  revisions it resolved, so the reviewer can see the state and a relayed claim
  stays checkable ("Relayed claims").
- [Deviation from the handoff's scratch suggestion] → recorded above; the user
  approves the proposal before implementation.

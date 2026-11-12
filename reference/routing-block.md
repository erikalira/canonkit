# canonkit — Claude Code specifics

The team (roster, risk scale, HIGH-risk routing, dispatch rules) is defined in
`~/AGENTS.md`, which projects under the home folder load as an ancestor; in a
project outside it, read `~/AGENTS.md` before dispatching any agent. This block
holds only what is specific to Claude Code, and is reinstalled like the agents:
local rules go outside the markers.

Before delivery, follow `orchestrate` completion for documentation and release
impact; LOW stays inline. Preserve incidental findings through its procedure;
otherwise, do nothing extra.

A decision that is the user's, with 2–4 real options (scope, a veto to accept or overrule,
a HIGH-risk choice, commit/push variants), is asked with `AskUserQuestion`, not buried in
prose: recommended option first, marked "(Recommended)", every pending question of the
turn in one call of up to 4. A subagent's open questions that depend on the user become
that call. Conventional defaults and LOW work are not asked: pick, and say what you picked.

Claude Code's native permission modes remain authoritative. Do not change the
user's selected mode, bypass permission checks, or add broad automatic approvals.
Repository access restrictions live in `.claude/settings.json`; supported user-only
controls remain in the user's settings. Instructions govern review and authorization:
ask before git commit or git push, never bypass Git hooks or signing, protect secrets,
and obtain independent review after the final edit of a HIGH-risk change.

Without optional canonkit hooks, those rules hold by judgment: do not claim automatic
hook prompts, secret blocks, dispatch logging or a Stop-hook review gate.

<!-- canonkit:optional-hooks:start -->
Optional canonkit hook registrations have been observed with the required matchers
and this package's payload. Runtime activation and higher-priority overrides still
belong to Claude Code. The following `[ENFORCED]` claims apply only while those hooks
actually run; they do not replace the native permission mode or provide OS isolation.

- `[ENFORCED]` **Only Perry loosens a performance budget**, and only with a measured floor
  justifying the new number. Raising a threshold to make a build pass is how a performance gate dies
  without anyone deciding to kill it. Anyone may tighten one, but the hook sees the path and not the
  direction, so tightening asks for a reviewer too — a false gate costs a dispatch, a false pass
  costs the budget. <!-- enforced-by: perf-budget -->
- `[ENFORCED]` **Gates fire on their own**: confirm on `git commit`/`git push`, on edits to
  HIGH-risk-surface or performance-budget files, and on a shell command that *writes* to one — Bash
  and PowerShell alike, because a gate wired to one shell on a machine with two is a gate with a
  side door. Obvious secrets are blocked. If a gate fires on something I classified LOW, reconsider
  the risk and whether a veto holder should weigh in — don't just dismiss the prompt. A project
  tunes which paths count in `.claude/canonkit.json`; editing it is itself gated, and it never
  reaches the secret check. <!-- enforced-by: git,git-bypass,secret-block,secret-ask,high-risk-surface,perf-budget -->
- `[ENFORCED]` **Every dispatch is logged** with its model and effort, then its tokens, duration
  and the size of the report it returned (`~/.claude/canonkit-activity/events.jsonl`), so a plan
  that names them is checkable against what ran. <!-- enforced-by: dispatch-log -->
- `[ENFORCED]` **No self-merge on HIGH risk.** A Stop hook blocks the turn once if a gated surface
  was edited and no independent reviewer was dispatched, or resumed with a message, **after that
  edit**; a reviewer subagent's own probes outside the project do not count as edits. Who counts as a reviewer
  and how to answer the gate: "No self-merge on HIGH risk" in `~/AGENTS.md`. <!-- enforced-by: definition-of-done -->
<!-- canonkit:optional-hooks:end -->

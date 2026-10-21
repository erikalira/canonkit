# canonkit — Claude Code specifics

The team (roster, risk scale, HIGH-risk routing, dispatch rules) is defined in
`~/AGENTS.md`, which projects under the home folder load as an ancestor; in a
project outside it, read `~/AGENTS.md` before dispatching any agent. This block
holds only what is specific to Claude Code, and is reinstalled like the agents:
local rules go outside the markers.

Each rule below is `[ENFORCED]`: a hook (`~/.claude/hooks/canonkit-hook.js`)
backs it, independently of my judgment.

- `[ENFORCED]` **Only Perry loosens a performance budget**, and only with a measured floor
  justifying the new number. Raising a threshold to make a build pass is how a performance gate dies
  without anyone deciding to kill it. Anyone may tighten one, but the hook sees the path and not the
  direction, so tightening asks for a reviewer too — a false gate costs a dispatch, a false pass
  costs the budget.
- `[ENFORCED]` **Gates fire on their own**: confirm on `git commit`/`git push`, on edits to
  HIGH-risk-surface or performance-budget files, and on a shell command that *writes* to one — Bash
  and PowerShell alike, because a gate wired to one shell on a machine with two is a gate with a
  side door. Obvious secrets are blocked. If a gate fires on something I classified LOW, reconsider
  the risk and whether a veto holder should weigh in — don't just dismiss the prompt. A project
  tunes which paths count in `.claude/canonkit.json`; editing it is itself gated, and it never
  reaches the secret check.
- `[ENFORCED]` **Every dispatch is logged** with its model and effort, then its tokens, duration
  and the size of the report it returned (`~/.claude/canonkit-activity/events.jsonl`), so a plan
  that names them is checkable against what ran.
- `[ENFORCED]` **No self-merge on HIGH risk.** A Stop hook blocks the turn once if a gated surface
  was edited and no independent reviewer was dispatched, or resumed with a message, **after that
  edit**; a reviewer subagent's own probes outside the project do not count as edits. Who counts as a reviewer
  and how to answer the gate: "No self-merge on HIGH risk" in `~/AGENTS.md`.

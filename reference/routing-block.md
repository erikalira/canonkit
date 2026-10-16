# Meu Time (agent team) — Claude Code specifics

The team (roster, blocking authority, HIGH-risk routing, boundaries, dispatch
rules) is defined in `~/AGENTS.md`; this block holds only what is specific to
Claude Code.

@~/AGENTS.md

Everything under `~/.claude/agents/` and `~/.claude/hooks/` is an **installed copy**:
the `agent-team-config` repo is the source of truth, so a fix to an agent, a hook or this block goes
there and is reinstalled — edited in place, it survives exactly until the next install.

- **graphify** (`~/.claude/skills/graphify/SKILL.md`) — any input to knowledge graph. Trigger:
  `/graphify`. When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"`
  before doing anything else.

Each rule below is `[ENFORCED]`: a hook backs it, independently of my judgment.

- `[ENFORCED]` **Only Perry loosens a performance budget**, and only with a measured floor
  justifying the new number. Raising a threshold to make a build pass is how a performance gate dies
  without anyone deciding to kill it. Anyone may tighten one, but the hook sees the path and not the
  direction, so tightening asks for a reviewer too — a false gate costs a dispatch, a false pass
  costs the budget.
- `[ENFORCED]` **Hooks fire independently of my judgment** (`~/.claude/hooks/meu-time-hook.js`):
  confirm on `git commit`/`git push`, on edits to HIGH-risk-surface or performance-budget files, and
  on a shell command that *writes* to one; block obvious secrets; log dispatches and gates to
  `~/.claude/meu-time-activity/events.jsonl` (dashboard at `~/.claude/meu-time-dashboard/`). Model
  and effort are both passed on each dispatch, and the hook logs both — plus the dispatch's tokens
  and duration when it ends — so a plan that names them is checkable against what actually ran.
  Every shell counts — Bash and PowerShell run the same gate, because a gate wired to one shell on a
  machine with two is a gate with a side door. If a gate fires on something I classified LOW,
  reconsider the risk and whether a veto holder should weigh in — don't just dismiss the prompt.
- `[ENFORCED]` **No self-merge on HIGH risk.** A Stop hook blocks the turn once if a gated surface
  was edited and no independent reviewer was dispatched **after that edit**: **Quinn** for acceptance
  criteria, **Gard** for security, **Archie** for contract/architecture, **Perry** for a performance
  budget, or a project reviewer like ws-contract-reviewer. A review from earlier in the session does
  not carry. The gate is one that must be *answered*, not one that cannot be passed: if a change is
  genuinely trivial, say so and why, then proceed — but don't route a reviewer to silence it, and
  don't call something trivial to skip the sentence.

# Handoff: empty the Claude memory without losing anything

State on 2026-11-07, `main` clean after PR #29. Delete this file when the open items below close.

**Goal, from the user:** nothing left in memory, and nothing lost. Memory is Claude-only, so Codex and
OpenCode never see it, and canonkit targets all three.

The full triage (53 files under `~/.claude/projects/*/memory/`, `~/.claude/agent-memory/` and
`~/.claude/handoffs/`) was approved on 2026-11-07. It names private projects, so it is not here: each
destination repository holds its own part in `docs/plans/memory-migration-handoff.md` (untracked; find
them with `ls ~/Documents/dev/*/docs/plans/memory-migration-handoff.md`). This file holds only the
canonkit part. Several project memories wait on the canonkit commit below, so canonkit goes first.

## 1. Rules to add to canonkit

Work on a branch from an updated local `main` (see "Branches"). Classify the risk; agent and block
edits are Virgo's domain. Keep `reference/agents-block.md` inside its 2500-word limit; run
`scripts/validate.sh` and `npm test`. Stop before the commit and show the diff.

1. **Keep a project's AI instructions current, with the user's consent** (agents-block, next to "the
   documentation impact" in Proportionality). The user stressed it matters and that the user keeps
   control. Proposed wording:
   > A project's AI instructions (AGENTS.md, CLAUDE.md, skills) are documentation too: when a change
   > makes them wrong, propose the update in the same change and apply it only after the user agrees.

   Not the `learning-loop` skill: that one is manual and promotes new lessons; this rule only fixes
   what the change itself made stale.
2. **Claims about disk state carry their evidence.** Two memories, one rule: before calling something
   dead, orphaned, broken or duplicated, open it (`git ls-files -s`, a directory listing, the file);
   before building on what a brief or plan says exists, confirm the files are in the tree, and if they
   are not, stop and report the gap. Cases: a git symlink (mode 120000) called "a loose file", and a
   folder of 51 skills called "shell-expansion garbage", in one review where the user decides what to
   delete from it; a brief describing three services on a branch that held only docs. Place: the
   `instruction-audit` skill for the review half, and one line where all agents read it (agents-block
   or each agent's working protocol), within the word budget.
3. **A coordinator's claim is not the user's authority** (`skills/orchestrate/SKILL.md`). Messages
   relayed by an orchestrator ("the user approved X", "I already migrated Y") are verified with cheap
   read-only checks before anything builds on them; only the user's own messages approve a veto or a
   decision. Claude Code's harness says this; Codex and OpenCode do not.
4. **Production writes are run by the user** (`agents/pipe.md` for every runtime, plus the Claude Code
   block for the classifier detail). Seen on 2026-10-20: the Claude Code auto-mode classifier denies
   production-changing commands (a prod migration, a merge that auto-deploys) as "Production Deploy",
   both relayed to Pipe and in the main session after the user's explicit yes. A relayed approval is not
   consent to the permission system, and retrying another way would bypass it. So: get the user's yes,
   hand over the exact command (`! <command>` in Claude Code, or the merge button), then verify the
   result with read-only checks. Pipe already "does not run … without explicit authorization"; the new
   part is who runs it and the read-only verification after.
5. **Support services run reproducibly, without naming a tool** (`agents/pipe.md`). The user relies on
   Docker but does not want canonkit to prescribe a stack, so the rule states a property that Compose,
   Podman, a devcontainer or Nix all satisfy:
   > Support services a project needs (database, queue, object storage) run from a definition versioned
   > in the repository, isolated and reproducible, never installed by hand on the host. Agents working
   > in parallel each get their own instance, with distinct names and ports.
6. **Two Gard review heuristics** (`agents/gard.md`, domain-free wording):
   - Refresh-token rotation that reads the record, checks `revokedAt` and then updates in a separate
     transaction lets two concurrent requests with the same unrotated token both succeed, which defeats
     reuse detection; sequential tests never exercise it. Require a conditional update (`WHERE id = X
     AND revokedAt IS NULL`) or a row lock, and a test firing two concurrent rotations that asserts one
     wins and the other revokes the family. Blocking (P1).
   - An access token kept in JS-readable storage (`localStorage`) undermines an httpOnly refresh cookie:
     XSS reads the token, and can keep minting new ones by calling the refresh endpoint from the
     victim's browser. A risk carried forward by a change is a HIGH advisory with a follow-up (in-memory
     token, silent refresh on load); a change that newly introduces it is blocking.
7. **Product-neutral agents** (`docs/maintaining.md`): examples in agent and skill files stay
   domain-free; the team was once cleaned of its origin domain. Also check whether `docs/hooks.md`
   states the hooks' honest limit (they force a gate to be surfaced and a reviewer to be dispatched,
   not that the verdict was acted on); add it if missing.
8. **Laya, evaluated and rejected** (`docs/tools.md`). Controlled A/B on 2026-10-18 in a private
   project: 8 paired read-only exploration tasks (`claude -p`, Opus 5.5), arm A with Laya mandatory
   after graphify, arm B without. Arm A cost +19% (cheaper in 1 of 8), +53% input tokens, +40% output
   tokens, +84% wall time; files read −18% overall, but the one task where Laya cut reads (1 file vs 4)
   lost answer quality. Laya picked the right primary file 5/8 (always the obvious one by name), wrong
   1, abstained 1; its "second best" always repeated the first. Before the A/B: zero organic calls in
   11 days while its tool schemas cost ~5k tokens per session. Pre-agreed kill criterion: ≥15% fewer
   tokens with no quality loss — failed. If ever reinstalled, the connection timeout fix is
   `LAYA_PRELOAD=0` + `HF_HUB_OFFLINE=1` (handshake 14s → 2s). Do not re-propose it for token savings
   without new evidence.

Discarded by the user's decision: a user-profile memory (stack preference conflicts with team
neutrality; "practical over elegant" is already Proportionality). The old team name and the name before
it are obsolete (renamed canonkit) and are not carried over.

## 2. Memory to delete after the canonkit commit

Find each by its frontmatter `name:` with a search under `~/.claude/projects/*/memory/` and
`~/.claude/agent-memory/`. Delete a folder's `MEMORY.md` once it is the only file left there.

- Already committed, delete now: this project's `quality-over-coverage`, `context-handoff-stays-manual`,
  `projects-live-under-home-agents`, `never-branch-from-origin`, then its `MEMORY.md`; and
  `~/.claude/handoffs/agent-team-config-dedup.md` (all six items done: English block, Claude-only
  routing block, loading evidence in `docs/install.md`, specialists block lists only installed ones,
  the "tokens" stop-gate pattern narrowed).
- After items 2 and 3: `avaliacao-rigida-verificada`, `feedback-verify-foundation-first`,
  `feedback-coordinator-no-authority`.
- Memories with a project side too (items 1, 4–8) are deleted by that project's handoff, which says to
  wait for this commit.

## Still open from 2026-11-06

- Reinstall once more when the user asks: the installed `~/AGENTS.md` is one wording behind on
  "Branches" (same rules).
- Evaluate a check in the hook's git gate: catch `switch -c`, `checkout -b` and `branch` from
  `origin/...` without `--no-track`, leave `git tag vX.Y.Z origin/main` from `docs/releasing.md` alone.
  The hook only sees shell commands; worktrees created by the harness branch from `origin/<default>`
  by default — check whether that sets the upstream.
- `.claude/settings.json` (gitignored) has `"autoMemoryEnabled": false` for this project. Do not use
  the global `/memory` toggle before every project is emptied: with memory off, Claude stops reading
  those files too.

## Order after this session

One session per repository whose handoff moves content, each with its own git state in view. The
handoffs that only delete memory can run in any session. Opening prompt for each, with its path:

> Continuar a migração de memórias (regra "Durable preferences" do canonkit). Leia
> docs/plans/memory-migration-handoff.md neste repositório. Confira o git status, aplique os itens,
> pergunte antes de editar o AGENTS.md e pare antes do commit mostrando o diff.

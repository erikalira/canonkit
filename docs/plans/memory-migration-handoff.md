# Handoff: empty the Claude memory without losing anything

State on 2026-11-06, branch `fix`. Delete this file when the open items below close.

**Goal, from the user:** nothing left in memory, and nothing lost. Memory is also Claude-only, so Codex and OpenCode never see it, and canonkit targets all three.

Memory for this project: `~/.claude/projects/<this project>/memory/`.

## Done, uncommitted, unstaged

| Memory | Now lives in | Delete after |
|---|---|---|
| `quality-over-coverage` | `docs/adr/0004-full-quality-harnesses-only.md` | ADR committed |
| `context-handoff-stays-manual` | `docs/adr/0005-manual-context-handoff.md` | ADR committed |
| `projects-live-under-home-agents` | Evidence in `docs/install.md`, machine facts in `~/AGENTS.md` outside the markers | `docs/install.md` committed |
| `never-branch-from-origin` | "Branches" in `reference/agents-block.md` | The block committed: it also carries staged changes, so the staged work goes first |
| `MEMORY.md` | Index only | Last, when empty |

The rule "project decisions and documentation stay in the repository" is in "Durable preferences" in `reference/agents-block.md`. New memory is off for this project through `.claude/settings.json`; confirm that in a new session. Also waiting for the same commit question: the "personal data" rule in `docs/maintaining.md` and the personal path removed from three files in `evals/audits/`. The old path stays in git history unless the user decides otherwise.

## Open

- Delete the memories above only after their commit, as the user decided. Ask before any commit.
- A reinstall on 2026-11-06 at 04:39 already carried the new rules into `~/AGENTS.md`, and "This machine" survived it. It also installed the working copy of the hook, unstaged changes included. The "Branches" text was then trimmed for the 2500-word limit, so the installed copy is one wording behind, with the same rules: reinstall once more when the user asks.
- Evaluate a check in the hook's git gate after the hook's current unstaged work lands, to keep the two apart. It should catch `switch -c`, `checkout -b` and `branch` from `origin/...` without `--no-track`, and leave `git tag vX.Y.Z origin/main` from `docs/releasing.md` alone. The hook only sees shell commands, and worktrees created by the harness branch from `origin/<default>` by default: check whether that sets the upstream.
- Nine other projects hold 34 memory files, unread: list them under `~/.claude/projects/*/memory/`. The user wants all of them emptied, each item ending up in its own project or in canonkit. First inventory and triage everything from one session; the edits to each repository then happen with that repository's own git state in view. The inventory names private projects, so it stays out of this repository and any published page. Do not use the global `/memory` toggle first: with memory off, Claude stops reading those files too.

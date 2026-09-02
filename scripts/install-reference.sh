#!/usr/bin/env bash
# Sync the team's global reference blocks into the files Claude Code and Codex
# read on every session.
#
# Two blocks, two files, because two runtimes read different things:
#
#   reference/agents-block.md   -> ~/AGENTS.md          (roster; Codex + Claude Code)
#   reference/routing-block.md  -> ~/.claude/CLAUDE.md  (routing; Claude Code only)
#
# The roster says who exists and what each one owns, and is runtime-neutral. The
# routing block says how work is dispatched - subagent_type, model floors, hooks,
# parallelism - which is meaningless to Codex, so it does not go in AGENTS.md.
#
# Only the block between the markers is managed. Everything else in those files
# - your graphify note, whatever you add later - is preserved untouched. Running
# this twice changes nothing the second time.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SYNC_PY="$REPO_ROOT/scripts/_sync_block.py"

# sync_block <block-file> <target-file> <start-marker> <end-marker>
#
# On the first run the helper also replaces a hand-written section carrying the
# block's own top-level heading, so syncing does not duplicate what was already
# there by hand.
sync_block() {
  local block="$1" target="$2" start="$3" end="$4"

  if [ ! -f "$block" ]; then
    echo "Missing $block" >&2
    exit 1
  fi

  if [ ! -f "$target" ]; then
    echo "Creating $target"
    mkdir -p "$(dirname "$target")"
    : > "$target"
  fi

  BLOCK="$block" TARGET="$target" START="$start" END="$end" python3 "$SYNC_PY"
}

# ~/AGENTS.md is read by Codex; ~/.claude/CLAUDE.md is read by Claude Code.
sync_block "$REPO_ROOT/reference/agents-block.md" "$HOME/AGENTS.md" "<!-- agent-team-config:start -->" "<!-- agent-team-config:end -->"

# Claude Code reads ~/.claude/CLAUDE.md. Ensure it imports AGENTS.md rather than
# carrying a second copy that can drift.
CLAUDE_MD="$HOME/.claude/CLAUDE.md"
# Tilde-style so the import resolves in every runtime. Under Git Bash on
# Windows, $HOME expands to an MSYS path (/c/Users/...) that Claude Code
# cannot resolve; "~" is correct on all three platforms.
IMPORT="@~/AGENTS.md"

mkdir -p "$(dirname "$CLAUDE_MD")"
if [ ! -f "$CLAUDE_MD" ]; then
  printf '%s\n' "$IMPORT" > "$CLAUDE_MD"
  echo "Created $CLAUDE_MD with import"
# Match any existing AGENTS.md import, not just this $HOME's exact path, so a
# moved home or a tilde-style import is not duplicated.
elif grep -qE '^@.*AGENTS\.md[[:space:]]*$' "$CLAUDE_MD"; then
  echo "already current: $CLAUDE_MD (imports AGENTS.md)"
else
  printf '%s\n%s' "$IMPORT" "$(cat "$CLAUDE_MD")" > "$CLAUDE_MD.tmp"
  mv "$CLAUDE_MD.tmp" "$CLAUDE_MD"
  echo "Added import to $CLAUDE_MD"
fi

# The routing rules live in CLAUDE.md itself rather than in the imported roster:
# they are Claude Code mechanics. Synced after the import so a freshly created
# CLAUDE.md keeps the import on its first line.
sync_block "$REPO_ROOT/reference/routing-block.md" "$CLAUDE_MD" "<!-- agent-team-config:routing:start -->" "<!-- agent-team-config:routing:end -->"

echo "Done."

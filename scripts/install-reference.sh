#!/usr/bin/env bash
# Sync the team's global reference blocks into the files Claude Code and Codex
# read on every session:
#
#   reference/agents-block.md   -> ~/AGENTS.md          (roster; Codex + Claude Code)
#   reference/routing-block.md  -> ~/.claude/CLAUDE.md  (routing; Claude Code only)
#
# Only the block between the markers is managed; everything else in those files
# is preserved. `install` already runs this — use it standalone after editing a
# block without changing an agent.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec node "$REPO_ROOT/bin/cli.js" reference "$@"

#!/usr/bin/env bash
# Install the agent team into the local Claude Code runtime.
#
# Agents in this repo are stored in the exact format the runtime expects, so
# installing is a copy — no generation step, nothing to keep in sync by hand.
# Edit agents/<name>.md, run this, done.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$REPO_ROOT/agents"

# Both paths are read by Claude Code; keeping them identical avoids the drift
# that a generated destination invites.
DESTS=("$HOME/.agents" "$HOME/.claude/agents")

if [ ! -d "$SRC" ]; then
  echo "Missing $SRC" >&2
  exit 1
fi

shopt -s nullglob
agents=("$SRC"/*.md)
if [ ${#agents[@]} -eq 0 ]; then
  echo "No agents found in $SRC" >&2
  exit 1
fi

for dest in "${DESTS[@]}"; do
  mkdir -p "$dest"
  for file in "${agents[@]}"; do
    cp "$file" "$dest/$(basename "$file")"
  done
  echo "Installed ${#agents[@]} agents -> $dest"
done

echo "Done."

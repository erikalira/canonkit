#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <agent-id>"
  echo "Example: $0 archie"
  exit 1
fi

AGENT="$1"
OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

AGENT_SRC="$REPO_ROOT/agents/$AGENT"
SKILLS_SRC="$REPO_ROOT/skills/$AGENT"
AGENT_DEST="$OPENCLAW_HOME/workspace-$AGENT"

if [ ! -f "$AGENT_SRC/AGENTS.md" ]; then
  echo "Missing $AGENT_SRC/AGENTS.md"
  exit 1
fi

echo "Syncing agent '$AGENT' to $AGENT_DEST"

mkdir -p "$AGENT_DEST"

cp "$AGENT_SRC/AGENTS.md" "$AGENT_DEST/AGENTS.md"

if [ -d "$SKILLS_SRC" ]; then
  rm -rf "$AGENT_DEST/skills"
  mkdir -p "$AGENT_DEST/skills"
  cp -R "$SKILLS_SRC/." "$AGENT_DEST/skills/"
fi

echo "Done."
echo "Files synced:"
find "$AGENT_DEST" -maxdepth 4 -type f | sort

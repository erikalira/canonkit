#!/usr/bin/env bash
set -euo pipefail

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

AGENT="archie"

echo "Syncing $AGENT to $OPENCLAW_HOME"

mkdir -p "$OPENCLAW_HOME/workspace-$AGENT"
rm -rf "$OPENCLAW_HOME/workspace-$AGENT/skills"
mkdir -p "$OPENCLAW_HOME/workspace-$AGENT/skills"

cp "$REPO_ROOT/agents/$AGENT/AGENTS.md" "$OPENCLAW_HOME/workspace-$AGENT/AGENTS.md"
cp -R "$REPO_ROOT/skills/$AGENT/." "$OPENCLAW_HOME/workspace-$AGENT/skills/"

echo "Done."
echo "Files synced:"
find "$OPENCLAW_HOME/workspace-$AGENT" -maxdepth 4 -type f | sort

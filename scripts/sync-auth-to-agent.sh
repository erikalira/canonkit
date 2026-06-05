#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <agent-id>"
  echo "Example: $0 scott"
  exit 1
fi

AGENT="$1"
OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"

SOURCE="$OPENCLAW_HOME/agents/archie/agent/auth-profiles.json"
DEST_DIR="$OPENCLAW_HOME/agents/$AGENT/agent"
DEST="$DEST_DIR/auth-profiles.json"

if [ ! -f "$SOURCE" ]; then
  echo "Missing source auth profile: $SOURCE"
  exit 1
fi

mkdir -p "$DEST_DIR"
cp "$SOURCE" "$DEST"
chmod 600 "$DEST"

echo "Synced auth profile from archie to $AGENT"
echo "$DEST"

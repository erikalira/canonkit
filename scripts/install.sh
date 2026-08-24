#!/usr/bin/env bash
# Install the CORE agent team into the local Claude Code runtime.
#
# Agents in this repo are stored in the exact format the runtime expects, so
# installing is a copy — no generation step, nothing to keep in sync by hand.
# Edit agents/<name>.md, run this, done.
#
# Only the core team is installed at user level. Domain specialists (maya, nova,
# echo, dana, iris) are installed per project, by copying the file into that
# repo's .claude/agents/. Their absence elsewhere is the point: it is what keeps
# the team from growing into every project that does not need them. See README.
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

# The core team, listed explicitly. A new file in agents/ is a specialist until
# it is named here, so adding one never silently installs it everywhere.
CORE=(archie bob gard pipe pixie quinn scott spencer virgo)

agents=()
missing=()
for name in "${CORE[@]}"; do
  if [ -f "$SRC/$name.md" ]; then
    agents+=("$SRC/$name.md")
  else
    missing+=("$name")
  fi
done

if [ ${#missing[@]} -gt 0 ]; then
  echo "Missing core agents in $SRC: ${missing[*]}" >&2
  exit 1
fi

# Specialists that a previous install may have left at user level. Removing them
# is what actually enforces the split — a leftover copy is available in every
# project and silently defeats the per-project rule. Only names this repo owns
# are touched; anything else in the destination is left alone.
SPECIALISTS=(maya nova echo dana iris)

for dest in "${DESTS[@]}"; do
  mkdir -p "$dest"
  for file in "${agents[@]}"; do
    cp "$file" "$dest/$(basename "$file")"
  done
  echo "Installed ${#agents[@]} agents -> $dest"

  for name in "${SPECIALISTS[@]}"; do
    if [ -f "$dest/$name.md" ]; then
      rm "$dest/$name.md"
      echo "  removed specialist left at user level: $name.md"
    fi
  done
done

echo
echo "Core installed. Domain specialists are per project:"
echo "  mkdir -p .claude/agents && cp $SRC/<name>.md .claude/agents/"
echo "Done."

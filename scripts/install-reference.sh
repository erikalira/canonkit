#!/usr/bin/env bash
# Sync the team description into the global reference files that Claude Code and
# Codex read on every session.
#
# Only the block between the markers is managed. Everything else in those files
# — your graphify note, the Codex model-assignment rules, whatever you add later
# — is preserved untouched. Running this twice changes nothing the second time.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BLOCK="$REPO_ROOT/reference/agents-block.md"

START="<!-- agent-team-config:start -->"
END="<!-- agent-team-config:end -->"

# ~/AGENTS.md is read by Codex; ~/.claude/CLAUDE.md is read by Claude Code.
# CLAUDE.md already imports AGENTS.md via @-reference, so the block lives in
# AGENTS.md and CLAUDE.md only needs to keep that import.
TARGET="$HOME/AGENTS.md"

if [ ! -f "$BLOCK" ]; then
  echo "Missing $BLOCK" >&2
  exit 1
fi

if [ ! -f "$TARGET" ]; then
  echo "Creating $TARGET"
  : > "$TARGET"
fi

# Rewrite with python so the marker handling is exact rather than sed-fragile.
BLOCK="$BLOCK" TARGET="$TARGET" START="$START" END="$END" python3 - <<'PY'
import os, pathlib, re

block = pathlib.Path(os.environ["BLOCK"]).read_text().strip()
target = pathlib.Path(os.environ["TARGET"])
start, end = os.environ["START"], os.environ["END"]

managed = f"{start}\n{block}\n{end}"
text = target.read_text()

pattern = re.compile(re.escape(start) + r".*?" + re.escape(end), re.S)

if pattern.search(text):
    new = pattern.sub(lambda _: managed, text, count=1)
    action = "updated managed block in"
else:
    # First run. Drop a pre-existing hand-written "# subagentes" section so the
    # managed block replaces it instead of duplicating it.
    legacy = re.compile(r"^#+ *subagentes\b.*?(?=^#[^#]|\Z)", re.S | re.M | re.I)
    if legacy.search(text):
        text = legacy.sub("", text)
        action = "replaced hand-written subagentes section in"
    else:
        action = "appended managed block to"
    text = text.rstrip()
    new = (text + "\n\n" if text else "") + managed + "\n"

if new != target.read_text():
    target.write_text(new)
    print(f"{action} {target}")
else:
    print(f"already current: {target}")
PY

# Claude Code reads ~/.claude/CLAUDE.md. Ensure it imports AGENTS.md rather than
# carrying a second copy that can drift.
CLAUDE_MD="$HOME/.claude/CLAUDE.md"
IMPORT="@$HOME/AGENTS.md"

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

echo "Done."

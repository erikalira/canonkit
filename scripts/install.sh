#!/usr/bin/env bash
# Install the CORE agent team into the local Claude Code runtime.
#
# Thin wrapper around bin/cli.js, which is the single implementation. This
# script used to carry its own copy of the core/specialist list, as did
# install.ps1 and add-specialist.sh; keeping those three honest cost validate.sh
# an entire section. The split now lives in each agent's frontmatter (tier:) and
# every installer derives from it.
#
# Also syncs the global reference blocks. Pass --no-reference for agents only.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec node "$REPO_ROOT/bin/cli.js" install "$@"

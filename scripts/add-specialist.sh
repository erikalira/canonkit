#!/usr/bin/env bash
# Install domain specialists into the CURRENT project.
#
#   ./scripts/add-specialist.sh maya nova
#   ./scripts/add-specialist.sh --remove nova
#   ./scripts/add-specialist.sh --list
#
# Thin wrapper around bin/cli.js. Kept because the flag interface is documented
# and in muscle memory; it maps onto the CLI's add/remove/list commands.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="$REPO_ROOT/bin/cli.js"

command=add
args=()
for a in "$@"; do
  case "$a" in
    --remove|-r) command=remove ;;
    --list|-l)   command=list ;;
    -h|--help)   exec node "$CLI" --help ;;
    *)           args+=("$a") ;;
  esac
done

exec node "$CLI" "$command" ${args[@]+"${args[@]}"}

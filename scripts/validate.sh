#!/usr/bin/env bash
# Backward-compatible Bash entry point for complete validation.
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/validate.mjs" --full "$@"

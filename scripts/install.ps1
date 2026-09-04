# Install the core agent team into the local Claude Code runtime on Windows.
#
# Thin wrapper around bin/cli.js, which is the single implementation and is
# itself cross-platform. Kept because it is the documented Windows entry point;
# `npx agent-team-config install` does the same thing without a clone.
[CmdletBinding()]
param([Parameter(ValueFromRemainingArguments = $true)] [string[]] $Forwarded)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
& node (Join-Path $RepoRoot "bin/cli.js") install @Forwarded
exit $LASTEXITCODE

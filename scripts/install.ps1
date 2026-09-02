# Install the core agent team into the local Claude Code runtime on Windows.
#
# Agents in this repo are already stored in the format expected by the runtime,
# so installation is a copy. Domain specialists remain project-scoped.
[CmdletBinding()]
param(
    [string] $DestinationRoot = $HOME
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$SourceDir = Join-Path $RepoRoot "agents"
$Destinations = @(
    (Join-Path $DestinationRoot ".agents")
    (Join-Path $DestinationRoot ".claude\agents")
)

# Keep these lists in sync with install.sh. validate.sh enforces parity.
$Core = @(
    "archie"
    "bob"
    "gard"
    "perry"
    "pipe"
    "pixie"
    "quinn"
    "scott"
    "spencer"
    "virgo"
)

$Specialists = @(
    "maya"
    "nova"
    "echo"
    "dana"
    "iris"
)

if (-not (Test-Path -LiteralPath $SourceDir -PathType Container)) {
    [Console]::Error.WriteLine("Missing $SourceDir")
    exit 1
}

$Missing = @(
    foreach ($Name in $Core) {
        $AgentPath = Join-Path $SourceDir "$Name.md"
        if (-not (Test-Path -LiteralPath $AgentPath -PathType Leaf)) {
            $Name
        }
    }
)

if ($Missing.Count -gt 0) {
    [Console]::Error.WriteLine(
        "Missing core agents in ${SourceDir}: $($Missing -join ' ')"
    )
    exit 1
}

foreach ($Destination in $Destinations) {
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null

    foreach ($Name in $Core) {
        $AgentPath = Join-Path $SourceDir "$Name.md"
        Copy-Item -LiteralPath $AgentPath -Destination $Destination -Force
    }

    Write-Output "Installed $($Core.Count) agents -> $Destination"

    foreach ($Name in $Specialists) {
        $SpecialistPath = Join-Path $Destination "$Name.md"
        if (Test-Path -LiteralPath $SpecialistPath -PathType Leaf) {
            Remove-Item -LiteralPath $SpecialistPath -Force
            Write-Output "  removed specialist left at user level: $Name.md"
        }
    }
}

Write-Output ""
Write-Output "Core installed. Domain specialists are per project:"
Write-Output "  New-Item -ItemType Directory -Force .claude\agents | Out-Null"
Write-Output "  Copy-Item `"$SourceDir\<name>.md`" .claude\agents\"
Write-Output "Done."

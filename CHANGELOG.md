# Changelog

Notable user-facing changes to CanonKit are recorded here.

## Unreleased

### Added

- A local Execution Graph and filterable timeline for observed Claude Code
  dispatch and gate events, with a separate Activity overview and conditional
  LOW/MEDIUM/HIGH reference routes.
- A versioned, allowlisted execution read model and static React Flow frontend.
  The installed dashboard contains compiled assets and runs with Node alone.
- Documentation of telemetry coverage, provenance, and the future Agent Office
  roadmap. Codex, OpenCode and Copilot execution streams remain uninstrumented.
- An opt-in sandbox read exception for the telemetry folder
  `~/.claude/canonkit-activity`, so sandboxed commands can run the dashboard or
  read telemetry. Only the **No, customize** review of `canonkit install` offers
  it, with "Keep closed" preselected, because every sandboxed command could then
  read session IDs, project names, agent names and the paths of files that gates
  flagged. *Yes*, `--recommended`, `--yes`, dry runs and runs without a terminal
  never add it. `uninstall` removes it, and with the sandbox enabled
  `canonkit doctor` reports its state as an OK line. Nothing changes unless you
  opt in.

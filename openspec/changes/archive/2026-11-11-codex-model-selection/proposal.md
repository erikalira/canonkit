# Proposal

## Why

Canonkit already stores model and effort choices, but Codex agents still inherit the session settings. People using Codex need the same explicit choice for each need level and optional agent override, using the models and effort levels their Codex installation reports.

## What Changes

- Discover Codex models and their per-model effort levels from `codex debug models`, recording the command's experimental confidence and falling back to `unknown` when discovery fails.
- Extend `models setup` and interactive install to offer Codex choices; offer effort levels for the selected model, not a union across models.
- Apply resolved Codex choices to generated agent TOML files, removing fields when a choice is cleared. Keep project choices within project-scoped files and report effective sources through `models show` and `doctor`.
- Update dispatch guidance, installation documentation and release notes for Codex. OpenCode and Copilot remain outside this change.

## Capabilities

### New Capabilities

- `model-selection`: Add Codex behavior to the model-selection capability being introduced by the in-progress `runtime-model-discovery` change. This change depends on that base; reconcile the deltas before syncing or archiving either change.

### Modified Capabilities

None. `model-selection` is not yet in the main spec inventory.

## Impact

- `bin/model-discovery.js`, `bin/models-command.js`, `bin/model-config.js`, `bin/cli.js`, affected tests and generated Codex agent files.
- `skills/orchestrate/SKILL.md`, managed Codex instruction block, `docs/install.md`, README and release notes.
- Codex CLI subprocess during explicit discovery only. No new dependency or credentials read by canonkit.

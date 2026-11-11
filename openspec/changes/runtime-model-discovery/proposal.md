# Proposal

## Why

Canonkit maps a Claude-axis label (`model: opus|sonnet|haiku`) onto other harnesses through hardcoded tables (`CODEX_EFFORTS` today, `CODEX_MODELS` before it). Model catalogs and reasoning-effort levels change monthly and differ between subscriptions, so every shipped equivalence is stale for someone. Each harness can tell us what it offers, so canonkit should read that at runtime and let the person choose from the real list instead of guessing a cross-vendor equivalence.

This change delivers that end to end for **Claude Code first**, where the dispatch tool takes `model` and `effort` parameters that override an agent's frontmatter. Other harnesses get the same configuration shape and adapters in a follow-up change; until then they inherit the session model.

## What Changes

- **BREAKING** Agent frontmatter declares a vendor-neutral need level instead of a Claude model label: `need: light|standard|deep` replaces `model: opus|sonnet|haiku`. The validator, agent parsing, `canonkit list` and the generators follow.
- **BREAKING** Remove the fixed cross-vendor mapping (`CODEX_EFFORTS`, `CANONKIT_CODEX_MODEL`). Codex, OpenCode and Copilot agents are generated with no model or effort, so they inherit the session's, until their follow-up change.
- A discovery adapter interface, with the Claude Code adapter implemented (aliases and effort levels the installed CLI reports). Other harnesses are recorded as `unknown: not yet supported`.
- New commands: `canonkit models refresh`, `canonkit models setup` (choose a model and effort per need level from the discovered list, optionally per agent), `canonkit models show [--json]` (effective choices with their source).
- Two configuration layers with override: user (`~/.canonkit/models.json`) and project (`.canonkit/models.json`, committable). Order: project agent → project level → user agent → user level → inherit. Need levels are the recommended path; per-agent overrides are optional.
- Claude Code dispatches carry the effective choice as the Agent tool's `model` and `effort` parameters, which honors project overrides even for user-level core agents. The `orchestrate` skill and the Claude/agents reference blocks say how.
- Claude Code agents are generated (no longer copied) and carry the user-level resolved `model:` as the default for unplanned dispatches.
- `doctor` warns (never fails) when a configured Claude model or effort is missing from the latest discovery, unverified, or the catalog is stale.
- Supersedes the uncommitted "inherit by default + `CODEX_EFFORTS`" edits in the working tree.

## Capabilities

### New Capabilities

- `model-selection`: discovering available models and efforts, storing the person's choices in user and project configuration, resolving them per agent, applying them to Claude Code agents and dispatches, and diagnosing drift.

### Modified Capabilities

None. No existing spec states requirements about agent model or effort selection.

## Impact

- Code: `bin/cli.js` (agent parsing, Claude install path, `codexAgent`/`opencodeAgent`/`copilotAgent` lose model/effort, `install`, `addSpecialists`, `doctor`, `list`, `usage`, new `models` command); new `bin/model-discovery.js`; `scripts/validate.mjs` and `scripts/validate-python.py`.
- Content: all 15 `agents/*.md` frontmatters; `skills/orchestrate/SKILL.md`; `reference/agents-block.md`, `reference/codex-block.md`, the Claude block.
- Docs: `docs/install.md`, `README.md`, `docs/release-notes/3.0.0.md`, a new ADR.
- Tests: `test/cli.test.js` agent generation; new adapter, resolution, command and doctor tests.
- Public contract: frontmatter field, config schemas and `models` commands → Archie review. Discovery runs a local CLI subprocess → Gard review. No new package dependency.
- Codex users lose the per-tier effort fallback until the follow-up change; their agents inherit the session's effort.

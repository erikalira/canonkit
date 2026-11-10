# Design

## Context

See proposal.md for motivation and specs/model-selection/spec.md for required behavior.

Current state (observed 2026-11-10):

- `readAgents` in `bin/cli.js` parses `name`, `tier`, `authority`, `model`; `scripts/validate.mjs` requires `model ∈ {opus, sonnet, haiku}`. `archie` and `iris` are `opus`; the other 13 are `sonnet`; nothing uses `haiku`.
- Claude Code agents are **copied** byte-for-byte (`ctx.copy`) to `~/.claude/agents` and `.claude/agents`; Codex, OpenCode and Copilot agents are **generated**.
- The working tree holds uncommitted edits (drop the Codex pin, keep a `CODEX_EFFORTS` table). This change replaces them.
- `~/.canonkit/` exists and holds `install-manifest.json`, `backups/`, `projects/`.
- Claude Code has no model-listing command. `claude --help` shows `--model` accepting aliases (`fable`, `opus`, `sonnet`) or full names, and `--effort` with `low, medium, high, xhigh, max`.
- Claude Code's Agent tool takes `model` (takes precedence over the agent's frontmatter) and `effort` parameters. Its `effort` is to be set only when instructions such as a skill explicitly ask — the orchestrate skill becomes that explicit instruction.
- Codex spawn-time model/effort overrides are unreliable in some builds (hidden or rejected in MultiAgentV2 and full-history forks); the role file is its reliable route. That is the follow-up change's problem.
- The `security-diagnostics` spec forbids network probes from `doctor`.

## Goals / Non-Goals

**Goals:**

- Working end to end in Claude Code: discover → choose → show → dispatch with parameters → doctor.
- Adapter and config shapes that the Codex/OpenCode/Copilot follow-up fills in without changing contracts.
- Every failure path ends at inherit.

**Non-Goals (this change):**

- Discovery adapters and applied choices for Codex, OpenCode and Copilot (they stay at inherit).
- Per-project shadow copies of core agents: in Claude Code the dispatch parameter carries project overrides.
- Automatic "best model" choice, cost or quota estimation, vendor HTTP APIs.

## Decisions

### D1. `need: light|standard|deep` replaces `model:`

Migration: `opus → deep` (archie, iris), `sonnet → standard` (the rest). `light` is defined but unused, as `haiku` was. Levels describe the work, so they stay true when vendors rename models.

*Alternative rejected:* keep `model: opus` as a level name. In Claude Code's frontmatter the harness itself acts on that field — the coupling being removed.

### D2. Adapter interface, Claude adapter first

`bin/model-discovery.js` exports adapters `{ harness, discover(run) → Catalog | Unknown }`, where `run` executes a command (injected so tests use fixtures).

- **claude**: runs `claude --help`; extracts aliases quoted in the `--model` description and efforts from the `--effort` parenthetical; `confidence: "help-text"`. If either part is missing → `unknown` with reason.
- **codex, opencode, copilot**: return `unknown: not yet supported` without starting a process. (Probes for the follow-up are already noted: `codex debug models` JSON, `opencode models` lines; Copilot unverified.)

Runner: `execFile` without a shell, 30 s timeout, stdin closed, capped buffer; any error → `unknown`.

The catalog lists aliases, not full model IDs: aliases always point at Claude's current model, so they are the stable choice. A full ID can still be typed in setup and is recorded `unverified`.

### D3. Catalog separate from choices

- `~/.canonkit/model-catalog.json` — machine cache, written only by discovery: `{ version: 1, harnesses: { claude: { status, discoveredAt, harnessVersion, source, confidence, models: [{ id, efforts }] } } }`. Never in a project.
- `~/.canonkit/models.json` (user) and `<project>/.canonkit/models.json` (project) — choices only:

```json
{
  "version": 1,
  "harnesses": {
    "claude": {
      "levels": { "standard": { "model": "sonnet", "effort": "medium" }, "deep": { "model": "opus", "effort": "high" } },
      "agents": { "quinn": { "effort": "high" } }
    }
  }
}
```

The values above are an example of a person's choice, not shipped defaults. Unknown keys are preserved on rewrite; an unknown `version` is refused rather than overwritten.

### D4. Field-wise resolution

`resolve(agent, harness, projectDir?)` walks project agent → project level → user agent → user level, separately for `model` and `effort`, returning values plus `source` per field, `inherit` when none.

### D5. Claude Code application: frontmatter default + dispatch parameters

- **Install / add**: Claude agents become generated (body unchanged). `model:` is written from the resolved choice — user config for `~/.claude/agents`, project-merged for project specialists in `.claude/agents`. This is the default for an unplanned dispatch. Effort in frontmatter only if the field is verified during implementation; otherwise omitted (the dispatch parameter covers it).
- **Dispatch**: the orchestrate skill tells the lead to read `canonkit models show --json` (inside the project) and pass the agent's `model` and `effort` as Agent tool parameters, omitting any that resolve to inherit. This is how project overrides reach user-level core agents.
- **Other harnesses**: `codexAgent`, `opencodeAgent`, `copilotAgent` write no model or effort.

A per-harness `HONORED_FIELDS` constant records what is verified, with source and date, so the follow-up enables fields with one line and a test. Values are serialized with `JSON.stringify` (YAML-safe) / `tomlString`, never raw.

### D6. Project override reach

Project choices apply to project-scoped agent files and to Claude Code dispatches inside the project via the `model`/`effort` parameters. No project copies of core agents. Text in a task prompt does not select a model; only the parameter does.

### D7. When discovery runs

`models refresh` and `models setup` always; non-dry-run `install` for selected targets before writing agents. `doctor` and `models show` only read files. Catalog older than 30 days → stale warning.

### D8. Commands

- `canonkit models refresh`
- `canonkit models setup [--project]` — TTY only; Claude Code levels first, then optional per-agent overrides; effort validated against the catalog; free text recorded `unverified: true`. Without a TTY it refuses and points to the JSON file.
- `canonkit models show [--json]`

Harness flags are accepted for forward compatibility, but only `--claude` has an effect in this change.

### D9. `CANONKIT_CODEX_MODEL` removed

If set, `install`/`add` print one warning that it is ignored until Codex support lands; they do not fail.

## Risks / Trade-offs

- [Help-text parsing is brittle] → low-confidence label, fixture tests, `unknown` fallback; full names accepted as unverified.
- [The lead may forget to pass the parameters] → frontmatter `model:` still gives the user-level default; doctor cannot detect this, so the orchestrate rule is explicit and the agents-block line stays validator-locked.
- [Codex users lose the per-tier effort fallback] → called out in release notes; follow-up change restores choice-based effort through role files.
- [Project config in a cloned repo carries odd strings] → only written to that project's files and passed as parameters, serialized safely, flagged by doctor when not in the catalog.
- [Breaking frontmatter for forked agents] → validator message names `need:`; release notes give the mapping.

## Migration Plan

1. Branch from updated local `main`; discard the superseded working-tree edits.
2. Ship in 3.0.0 with the `opus/sonnet → deep/standard` mapping, "run `canonkit install`, optionally `canonkit models setup`".
3. With no configuration, reinstall yields inherit everywhere — safe without setup.
4. Rollback: reinstall the previous version; older versions ignore the new `~/.canonkit/models*.json` files.

## Open Questions

- Whether Claude Code agent frontmatter honors an effort field: verified during implementation; omitted if not (the dispatch parameter already covers it).
- Staleness window (30 days) may be tuned without contract changes.

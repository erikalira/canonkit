# Proposal

## Why

Every canonkit agent inherits all of the harness's tools, so each subagent starts with the full built-in and MCP tool schemas in context before it reads a single file. The size of the saving has **not been measured for this change**: the measurement matrix (tasks 1.1-1.5) was skipped by decision on 2026-11-11, and the levels were chosen without it. A one-off probe that day (quinn 71,424 tokens against 30,142 for a read-only built-in agent) is confounded and is not evidence for any figure here.

Canonkit has no concept of tool access today: none of the 15 agent sources (10 core agents and 5 specialists) declares it, and no script or installer handles it. A search of this repository and of `canonkit-v1` (all branches) found no earlier `tools:` frontmatter either.

## What Changes

- Add a vendor-neutral `access` level to agent sources, alongside `need`: `read`, `inspect` (no file writes, MCP tools kept), `write-docs`, `full`. The measurement task may reduce the set.
- An agent without `access` keeps inheriting everything, so existing agents and specialists do not change behavior.
- Validation rejects an unknown or malformed `access` value, and rejects sources that carry harness restriction keys (`tools`, `disallowedTools`, `skills`, `mcpServers`, `omitClaudeMd`), because the installer copies source frontmatter into the generated Claude Code agent.
- The Claude Code installer translates the level into the generated agent's tool restriction. Other harnesses get no translation for now and the gap is documented.
- Assign levels to the core team: `read` for archie, quinn, scott, gard; `inspect` for pixie and perry (they need browser MCP evidence); `write-docs` for spencer; `full` for bob, virgo, pipe.
- Restricted levels keep reporting, cited skills and web research.
- Document that `access` limits context and exposed tools; it is not a security boundary (Bash can still write).
- `canonkit models show` prints each agent's level and effective restriction; the start-up cost is verified by a documented re-measurement recipe, not by a stored estimate.

## Capabilities

### New Capabilities
- `agent-tool-access`: how an agent source declares its tool access level, how that level is validated, how each harness installer translates it, and how the effective restriction is inspected and its cost re-measured.

### Modified Capabilities
<!-- None expected. `model-selection` governs model and effort per need level and stays as is; access is an independent axis. Revisit in the specs phase if the installer requirements overlap. -->

## Impact

- Code: `agents/*.md` frontmatter, `scripts/validate.mjs`, the Claude Code install path in `bin/cli.js`, install scripts, tests.
- Contract: the agent frontmatter is a public contract, so this is HIGH under the team's own table (Archie for the contract, independent review after the last edit).
- Docs: the agent-authoring docs and the install docs must describe `access`; `docs/` needs the "not a security control" note.
- Not affected: model and effort resolution, hooks, project-scoped specialists (they inherit until they declare a level).

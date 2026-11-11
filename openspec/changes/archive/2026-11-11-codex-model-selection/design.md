# Design

## Context

See [proposal.md](proposal.md) and [specs/model-selection/spec.md](specs/model-selection/spec.md). At proposal time, `runtime-model-discovery` supplied the catalog, version-1 `models.json` choices, field-wise resolution, setup UI and installation path; its Codex adapter still returned `unknown`, `HONORED_FIELDS.codex` was empty, and `codexAgent` wrote no model fields. That base change is now complete. Both changes have a `model-selection` delta that must be reconciled before main-spec sync.

OpenAI Docs checked 2026-11-10: [Codex CLI reference](https://learn.chatgpt.com/docs/cli/reference) calls `codex debug models` experimental and says `--bundled` skips remote refresh. [Subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents) names `model` and `model_reasoning_effort` in custom agent TOML. Explicit spawn values take precedence over `[agents]` defaults, but values in the custom agent file take precedence over both. An explicit model without effort uses that model's default effort before the file is applied; a file containing only `model` can preserve the previously resolved effort.

On this machine, CLI 0.166.0 returned 12 models from `codex debug models` and `--bundled`. A fresh, empty `CODEX_HOME` also returned a catalog without login, so command success alone does not prove account access. This installation has `models_cache.json`. An initial read-only spawn requested `gpt-6-luna`/`high` and was accepted, but the spawned agent could not inspect its effective runtime model or effort. Later child rollout `turn_context` records confirmed effective model and effort for inherit, explicit spawn override and project custom-file cases; see [runtime evidence](tasks.md#codex-runtime-evidence).

## Goals / Non-Goals

**Goals:** Reuse the existing schema and resolution order; produce valid model/effort pairs where the Codex catalog can verify them; keep discovery isolated to explicit entry points; make project overrides effective for core agents without changing user-level files.

**Non-Goals:** Promise that a debug catalog grants inference access, query credentials, use `--bundled` as an account-specific catalog, or change OpenCode/Copilot.

## Decisions

### D1. Use the default debug command as a low-confidence discovery source

Run `codex --version` and `codex debug models` through the existing bounded, shell-free trusted runner. Parse only `models[].slug`, `display_name`, `visibility`, `default_reasoning_level` and `supported_reasoning_levels[].effort`; retain ID and per-model efforts in canonkit's normalized catalog. Do not persist model instructions or messages. Mark confidence `experimental-debug` and account availability `unconfirmed`: the command may refresh remotely, read its local cache or return bundled data. Any malformed response or command failure becomes `unknown`. `--bundled` was rejected as the primary source because it intentionally skips account-specific refresh. No credential file is read by canonkit; Codex manages its own authentication.

### D2. Make the Codex effort menu dependent on the selected model

Refactor `askEntry` to accept a harness-specific offer provider rather than using the Claude union of efforts. For Codex, select a model first, then show only that model's effort list. A changed model does not silently retain an unsupported effort; offer inherit or a compatible value. For an unlisted model, allow an explicitly typed effort and mark the pair unverified. Keep the current value highlighted when it remains compatible. Preserve the version-1 `harnesses.codex` choices shape and field-wise resolution.

### D3. Apply choices in agent files and treat known conflicts as inherit

Add `model` and `effort` to `HONORED_FIELDS.codex`, mapping `effort` to the TOML key `model_reasoning_effort`; serialize values through `tomlString`. Rebuild generated files on reinstall so removed choices remove fields. Before writing, compare a resolved model/effort pair with that model's catalog entry. When the pair is known incompatible, write neither field and warn. A model-only or effort-only configuration cannot always be checked against an inherited setting: permit it with a clear doctor warning when compatibility is unknown. This preserves the existing field-wise configuration contract without claiming runtime certainty.

### D4. Materialize project overrides in project-scoped files

Because the custom agent file wins over spawn values, a planned dispatch cannot override a user-level core file that pins a model or effort. During a Codex install from a project with Codex project choices, generate project-scoped core agent files only for agents whose effective settings differ from their user-level settings. CLI 0.166.0 confirmed project-before-user resolution for duplicate `archie` agents: the spawned project's developer instruction marker appeared in its child rollout and reply. The current documentation confirms both locations but does not state that collision rule.

The existing global install manifest has a fixed catalog and rejects project paths. Extend the existing project-scoped manifest with a fixed catalog of `.codex/agents/<core>.toml` paths owned by Codex, and instantiate it for Codex-only installation too. Before any write or removal, verify the resolved destination stays under the repository root and refuse a linked or junctioned `.codex` or `.codex/agents` directory. Refuse an existing same-name project agent without a canonkit receipt. Reinstall and `uninstall --project` remove only shadows proven to belong to canonkit, preserving later user edits; retain retired core names in the manifest catalog so old receipts remain readable. Project specialists continue to use project-merged choices. `models show` continues to report resolved sources, and dispatch guidance explains the project file requirement. Document this Codex-specific exception to ADR 0006's rejection of Claude project core copies.

### D5. Keep the trust and read-only boundaries

The Codex subprocess runs only during `refresh`, `setup` and non-dry-run `install`; `doctor`, `show` and dry runs never start it. Retain the existing trusted binary resolution, timeout, output cap and closed stdin. Treat project `models.json` as untrusted, preserve its link and size checks, and write only canonkit-owned project files. No login command is started automatically.

## Risks / Trade-offs

- [Debug output is experimental and may include a bundled fallback] → Low-confidence catalog label, strict parser, `unknown` on failure, no access guarantee.
- [A model-only or effort-only choice may conflict with an inherited setting] → Warn when compatibility cannot be checked; require a compatible pair in interactive setup when both fields are set.
- [Project shadows can become stale] → Manifest ownership and reinstall cleanup; `doctor` reports drift.
- [Project-level model choices can weaken a reviewer] → Preserve the existing `doctor` comparison and dispatch warning for project-sourced reviewer settings.

## Migration Plan

1. Finish and validate `runtime-model-discovery` before applying this change; reconcile both `model-selection` deltas before spec sync or archive.
2. Existing Codex agents keep inheriting until the person runs `models setup --codex` or edits `harnesses.codex`, then reinstalls. Old version-1 choices remain valid.
3. A reinstall with empty Codex choices removes newly generated model fields and owned project shadows. Rolling back to the previous canonkit restores inherit on the next reinstall.

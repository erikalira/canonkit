# Handoff: model and effort selection for Codex

Date: 2026-11-10. Origin: `openspec/changes/runtime-model-discovery` (Claude Code first;
Codex, OpenCode and Copilot inherit the session model until their follow-up).

## Goal

Extend model selection to Codex: discover what the person's Codex offers, let them choose
a model and effort per need level (and optionally per agent), and apply the choice to the
generated Codex agents. Same configuration shape as Claude: `harnesses.codex` in
`~/.canonkit/models.json` and `<project>/.canonkit/models.json`.

## State to build on

- Branch `feat/runtime-model-discovery` (not yet merged when this was written). Check
  whether it merged before branching. If it did, branch from updated local `main` with no
  remote-tracking upstream.
- Contracts already in place, not to be changed without Archie:
  - adapter interface in `bin/model-discovery.js`: `ADAPTERS.codex.discover(run)` currently
    returns `unknown: not yet supported`;
  - catalog `~/.canonkit/model-catalog.json`;
  - choice files and field-wise resolution in `bin/model-config.js`;
  - `HONORED_FIELDS` / `APPLIED`;
  - `canonkit models refresh|setup|show` in `bin/models-command.js`;
  - the setup UI on `prompts`: select menus with the current value preselected, `other…`,
    an agent checklist, a summary and a save confirmation, plus the step offered in the
    interactive `install`.
- `codexAgent` in `bin/cli.js` currently writes no `model` or `model_reasoning_effort`.
- The removed `CANONKIT_CODEX_MODEL` prints a warning; `CODEX_EFFORTS` is gone (ADR 0006).

## Evidence gathered (verify before relying on it)

- On this machine, `codex debug models` (codex-cli 0.166.0) prints JSON:
  - `models[]` with `slug`, `display_name`, `visibility`, `default_reasoning_level` and
    `supported_reasoning_levels[].effort`;
  - efforts there include `ultra` ("automatic task delegation").
  - The output also carries long `model_messages` text: store only what is needed.
- Not yet checked:
  - whether `debug models` reads a local cache or calls the network, and whether it needs
    login;
  - whether `debug` is a stable interface (it is a debug subcommand: treat it as
    `confidence` below a contract and fall back to `unknown`);
  - the Codex agent role-file fields for model and effort in the current Codex docs;
  - whether spawn-time overrides work (the design noted they are unreliable in some builds,
    so the role file is the reliable route).
- Per-model efforts differ in Codex. The setup effort menu must offer only the chosen
  model's efforts. Claude's union-of-efforts shortcut does not fit.

## Constraints

- The `model-selection` spec still applies:
  - discovery only from `refresh`, `setup` or a non-dry-run install;
  - no credential read;
  - a dry run starts nothing;
  - `doctor` and `show` read files only;
  - every failure ends at inherit.
- Write values safely (`tomlString`), never raw.
- Risk: public contract (the Codex agent file content, the catalog shape if it changes) →
  Archie. A new subprocess and a decision on network or login → Gard. Independent review
  after the last edit.
- OpenCode and Copilot stay out of scope unless the person asks.

## First steps

1. Read this handoff, ADR 0006 and the `runtime-model-discovery` design, spec and tasks.
2. Verify the unchecked items above against current Codex docs and behavior (no answers
   from memory).
3. Propose an OpenSpec change (`openspec-propose`) before coding.

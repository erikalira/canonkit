# Design

## Context

See proposal.md for motivation. Observed state (`bin/cli.js`):

- `chooseTargets` shows the only install menu (harnesses, `prompts` multiselect, lazily imported). Non-TTY returns `DEFAULT_TARGETS`.
- Install is global (`~/.claude`, `$CODEX_HOME`, ...). Specialists (`addSpecialists`), stack packs (`StackPackStore`, both through `changeProject`) and tools (`toolAdd`) write into `process.cwd()`. `addSpecialists` already refuses when cwd is the canonkit package root.
- `list` and `toolList` already enumerate the catalog and the state of each item: specialists from `readAgents()`, packs from `STACK_PACK_IDS` + `StackPackStore().list()`, tools from `readTools()` (`tools/*.md`).
- `canonkit tool add` has its own confirmations, `--yes`, harness choice and optional `--with-git-hooks`; it does not install the binary.
- The install `case` already runs the menu, then `offerModelSetup`, then `trackedGlobal(install)`, with a buffered report unless `--verbose`.

## Goals / Non-Goals

**Goals**
- One terminal flow that surfaces tools, specialists and stacks from the single catalog.
- No second source of truth and no new installer.

**Non-Goals**
- Installing tool binaries (graphify, openspec): still only printing the pinned command.
- Making project items global, or changing receipts, manifests or pack target paths.
- Enabling `--with-git-hooks` from the menu (it stays an explicit flag; the menu never turns on repository-executing automation).
- A new dependency or TUI.

## Decisions

1. **Order: ask everything, then write.** Menus run first (harness, model step, tools, specialists, stacks); then global install; then project items. Alternative, asking project items after the global install finishes, was rejected because a cancel would leave a half-done run, contradicting the existing "Cancelled: nothing was installed".
2. **A catalog reader shared with `list`.** Extract a function returning `{ tools, specialists, stacks }` with name, description and state; `list`, `toolList` and the menu consume it. Rejected: hard-coding menu choices (drifts, the exact bug `STACK_PACK_IDS` validation exists to avoid).
3. **Project gate.** Offer project steps only when `projectRoot(cwd)` resolves and cwd is not `PACKAGE_ROOT`; otherwise one explanatory line. Same refusal rule `addSpecialists` already has, so the menu never offers what the command would refuse.
4. **Apply through existing entry points**: `changeProject(ctx, names)` for specialists + stacks (it already validates the whole request before writing) and `toolAdd` per tool, in that order, after the global install. A failure in one item is reported and does not skip the others; exit code is non-zero if any failed.
5. **Tools use their own confirmation.** The menu records the choice only; `toolAdd` prompts as it does today. `--yes` is not implied by the menu.
6. **Non-interactive selection by flag.** `--specialist <name>`, `--stack <name>` and `--tool <name>` (repeatable), valid only with `install`, validated against the catalog before any write. Alternative, reusing a positional list (`install typescript maya`), was rejected: it collides with `install` taking no arguments and hides the category. Flags follow the existing `--claude/--codex` pattern and the flag-validation block in `main`.
7. **Closing hint** is computed from the same catalog state: not-installed items per category, plus `canonkit list`.

## Risks / Trade-offs

- [Longer menu discourages the quick Enter-Enter install] → project steps default to nothing selected; harness defaults unchanged; one-line skip when not in a project.
- [Menu in the wrong directory writes into an unintended project] → show the resolved project path in the first project prompt and write only after the final selection.
- [Catalog reader refactor changes `list` output] → keep `list` output byte-identical, covered by an existing/new snapshot test.
- [Partial failure after the global install] → global install is already receipt-tracked and idempotent; the report names failed items and the command to retry.

## Migration Plan

Additive. Non-interactive behavior and `add` / `tool add` are unchanged. Rollback is reverting the change; nothing is persisted beyond what `add` and `tool add` already write.

## Open Questions

- Should the menu offer `--harness` selection for a chosen tool, or always use the tool's `defaultharness`? (Default assumed; deferrable, `tool add` can change it later.)

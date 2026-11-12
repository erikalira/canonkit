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

1. **Order: ask everything, then write.** Menus run first (harnesses, tools, specialists, stacks, selected tools' harnesses, then model setup); then global install; then project items. Model discovery is staged in memory and its catalog/config files are written only after the model step's final save confirmation. Alternative, asking project items after the global install finishes, was rejected because a cancel would leave a half-done run, contradicting the existing "Cancelled: nothing was installed".
2. **A catalog reader shared with `list`.** Extract a function returning `{ tools, specialists, stacks }` with name, description and state; `list`, `toolList` and the menu consume it. Rejected: hard-coding menu choices (drifts, the exact bug `STACK_PACK_IDS` validation exists to avoid).
3. **Project gate and target.** Use `repositoryRoot(cwd)` to require a real repository outside HOME and the canonkit package (including its subdirectories). The resolved current directory remains the displayed and written target because existing `add` and `tool add` commands act on cwd; do not silently redirect them to the Git root. When the gate fails, skip project steps with a one-line reason and the later commands.
4. **Apply through existing entry points**: `changeProject(ctx, [name])` for each specialist or stack, then `toolAdd` per tool, after the global install. Per-item application isolates collisions and other failures so later selections still run; exit code is non-zero if any failed.
5. **Tools keep both prompt boundaries.** The menu records each selected tool's harness choice before any write. `toolAdd` keeps its own setup confirmation after it prints the preflight; `--yes` is never implied by the menu, and `--with-git-hooks` is never enabled by the menu.
6. **Non-interactive selection by flag.** `--specialist <name>`, `--stack <name>` and `--tool <name>` (repeatable), valid only with `install`, validated against the catalog before any write. Alternative, reusing a positional list (`install typescript maya`), was rejected: it collides with `install` taking no arguments and hides the category. Flags follow the existing `--claude/--codex` pattern and the flag-validation block in `main`.
7. **Closing hint** is computed from the same catalog state: not-installed items per category, plus `canonkit list`.
8. **Tool harness defaults.** The interactive menu asks for a selected tool's harness before writes. Explicit flags and non-interactive runs use that tool's declared `defaultharness`, matching `tool add`'s existing no-menu behavior.
9. **Readable tool execution.** In `install`, print a compact tool-specific preflight (target, command and material warnings) before a named confirmation. Buffer routine subprocess output in the default flow and report a concise result; preserve warnings and replay full output on failure. `--verbose` shows the detailed preflight and streams the subprocess output. Direct `tool add` retains its detailed preflight and output. This keeps the existing confirmation boundary informed without adding an implicit `--yes` or enabling Git hooks.
10. **Output status language.** Successful changes and already-current items use explicit success/status labels; caution markers are reserved for warnings. Unknown informational detail remains visible as information instead of being marked as a warning.

## Risks / Trade-offs

- [Longer menu discourages the quick Enter-Enter install] → project steps default to nothing selected; harness defaults unchanged; one-line skip when not in a project.
- [Menu in the wrong directory writes into an unintended project] → show the resolved project path in the first project prompt and write only after the final selection.
- [Catalog reader refactor changes `list` output] → keep `list` output byte-identical, covered by an existing/new snapshot test.
- [Partial failure after the global install] → global install is already receipt-tracked and idempotent; the report names failed items and the command to retry.

## Migration Plan

Additive. Non-interactive behavior and `add` / `tool add` are unchanged. Rollback is reverting the change; nothing is persisted beyond what `add` and `tool add` already write.

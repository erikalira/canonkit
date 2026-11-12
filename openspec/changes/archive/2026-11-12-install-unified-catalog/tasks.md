# Tasks

## 1. Shared catalog

- [x] 1.1 Extract a catalog reader returning tools, specialists and stacks with description and state; make `list` and `toolList` use it. Verify: `canonkit list` and `canonkit tool list` output is unchanged (test compares before/after output) and a catalog test covers all three categories.
- [x] 1.2 Add a project-target check (resolved project root, not the canonkit package root) reused by the menu. Verify: unit test for repo, home dir and canonkit-root cases.

## 2. Interactive menu

- [x] 2.1 Add the tools, specialists and stack-pack multiselects after the harness menu, built from the catalog, nothing preselected, resolved project path shown, cancel returns null. Verify: menu test with injected `prompts` answers covers select, empty and cancel.
- [x] 2.2 Skip the project steps with a one-line reason and the later command when the project check fails. Verify: tests for canonkit root and no-repo cwd write no project file.
- [x] 2.3 Order the install case so all answers are collected before any write. Verify: cancel at the stack step leaves global and project trees unchanged.

## 3. Applying selections

- [x] 3.1 After the global install, apply specialists and stacks through `changeProject` and each tool through `toolAdd` (no implied `--yes`, no git hooks), continuing past a failed item and exiting non-zero. Verify: e2e with one colliding pack plus a valid one installs the valid one and exits non-zero.
- [x] 3.2 Honor `--dry-run` for the whole flow. Verify: e2e dry run prints would-install lines and the file tree is identical.

## 4. Flags and closing hint

- [x] 4.1 Add repeatable `--specialist`, `--stack`, `--tool` for `install`, validated against the catalog before any write; reject elsewhere in the flag checks and in `usage()`. Verify: tests for valid names, unknown name (lists valid names, nothing written) and misuse on other commands.
- [x] 4.2 Replace the closing hint with the not-yet-installed items per category. Verify: report test with some items installed shows only the remainder; non-TTY install without flags matches the previous output apart from the hint.

## 5. Documentation

- [x] 5.1 Update `docs/install.md`, `docs/tools.md`, README install section and `docs/team.md` where it says specialists are installed only by `add`; propose changes to AGENTS/CLAUDE blocks only if they become wrong, applying after user agreement. Verify: `canonkit` validation/docs checks pass (`npm test`).
- [x] 5.2 Final integration run: `npm test` plus a manual terminal run in a scratch project. Verify: all green and the flow installs one tool, one specialist and one stack end to end.
- [x] 5.3 Polish install output: show a compact tool preflight before a named confirmation, summarize successful subprocess output by default, preserve warnings/failure details, and make success/current/warning labels distinct. Verify output order, default summary, verbose output and unchanged confirmation behavior in tests; run full `npm test` and a scratch-project smoke.

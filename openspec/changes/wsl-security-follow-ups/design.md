# Design

## Context

`sandboxGit(project)` in `bin/cli.js` already drops `GIT_*` and passes `-c core.fsmonitor=false -c core.hooksPath=/dev/null`; `git-ignore-sandbox-files` uses it. `readRegularSync(file)` already stats before reading. `tool add` predates both and calls `runBin(git, …)` and `readFileSync` directly.

## Goals / Non-Goals

**Goals:** close the three items of issue #36 with the existing helpers; keep output identical for ordinary repositories.

**Non-Goals:** reworking `hookSnapshot` (it already filters `isFile()`); dangling-symlink handling in `.gitignore`; TOCTOU between stat and read (the threat is a hang, not a race).

## Decisions

- **One git runner with an option, not a second helper.** `sandboxGit(project, { keepHooksPath })`: the graphify preflight must read the real `core.hooksPath` and `rev-parse --git-path hooks`, so it opts out of the `hooksPath=/dev/null` override only. `-c core.hooksPath=/dev/null` would make the preflight report a hooks path that is not the repository's. Alternative (separate `projectGit`) duplicates the env filtering.
- **A text variant of `readRegularSync`.** `readRegularText(file)` returns UTF-8; call sites keep their own fallback (`""`, `false`, refusal). In `gitHooksPreflight` a non-regular hook is refused with the same "never overwrites" message; in `graphifyHooksProblems` it is a problem. In `gitignorePlan` the `ENOTREG` error propagates as a clear message.
- **Segment walk in `unsafeWriteRoot`.** Each touch path is cut at the first glob segment; every literal segment is `lstat`ed in order; the walk stops at the first absent one. Intermediate segments (and a trailing `/`) must be real directories; a literal final segment must not be a symlink. The function returns the relative path of the offender so the message names `.claude/skills`, not `.claude`.

## Risks / Trade-offs

- [Dropping `GIT_CONFIG_GLOBAL` in the preflight changes which global config git reads] → same behavior `git-ignore-sandbox-files` already has; the global `core.hooksPath` is still read from `~/.gitconfig`.
- [A literal file target that is a symlink is now refused] → only `.agents/skills/.openspec-target` is literal today; a symlink there was already a write-through.

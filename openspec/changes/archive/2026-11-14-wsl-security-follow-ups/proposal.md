# Proposal

## Why

Issue #36 lists three gaps left after the WSL resolver work (`806f6cb`): `tool add` still runs plain `git` in the project, so a repository-local `core.fsmonitor` (or an inherited `GIT_DIR`/`GIT_*`) runs or redirects code the repository chose; several project reads use `readFileSync`, which hangs forever on a FIFO; and the write-root check only looks at the first path segment, so a symlinked `.claude/skills` inside a real `.claude` is written through. Each is reachable by opening an untrusted repository.

## What Changes

- Every git call `canonkit tool add` makes in the project (the `.gitignore` tracked-files note and the graphify git-hooks preflight) runs with the repository's `core.fsmonitor` disabled and with every `GIT_*` environment variable removed. The preflight keeps reading the real `core.hooksPath`, which it needs to decide.
- Project and settings files that `tool add` and the legacy-hook migration read (`.gitignore`, git hook files, `.claude/settings*.json`, legacy activity logs) are read only when they are regular files; anything else (a FIFO, a device) is treated as unreadable or refused instead of blocking.
- The write-root check covers every directory segment of each path the chosen harnesses write to (`.claude`, then `.claude/skills`, …), and a literal file target that already exists as a symlink is refused too.

No breaking change: repositories with ordinary files and directories see identical output.

## Capabilities

### New Capabilities

- `project-tool-safety`: what canonkit guarantees when it integrates an external tool into a project it does not trust — how it runs git there, how it reads project files, and which write targets it refuses.

### Modified Capabilities

None.

## Impact

- Code: `bin/cli.js` (`sandboxGit`, `writeGitignore`, `gitHooksPreflight`, `graphifyHooksProblems`, `unsafeWriteRoot`, `settingsMention`, legacy log merge).
- Tests: `test/e2e/cli-tools.test.js` (fsmonitor, FIFO, nested symlink cases).
- Docs: `docs/release-notes/3.2.1.md`; `docs/plans/wsl-resolvers-handoff.md` closed.
- Risk: MEDIUM (security hardening of a shared CLI path, no public contract change). Gard reviews.

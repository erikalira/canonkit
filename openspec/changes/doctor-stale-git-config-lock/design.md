# Design

## Context

`sandboxPlaceholderDiagnosis()` in `bin/cli.js` already produces doctor's "sandbox placeholders" rows. It runs git through `sandboxGit()`, which drops `GIT_*`, forces `core.fsmonitor=false` and `core.hooksPath=/dev/null`. It returns early unless doctor runs at the repository root, because `.git/info/exclude` handling needs the root. `isNullDeviceStat()` in `bin/security.js` recognises the in-sandbox `/dev/null` view.

Evidence for the protected names: the Claude Code 2.1.322 bundle lists `${cwd}/.git/config.lock` and `${cwd}/.git/config.worktree.lock` among sandbox write denials. It also has a remote kill switch for a "nested .git/config.lock" deny, which covers the common dir of a worktree. In a live session, `<common-dir>/config.lock` showed as char device 1:3.

## Goals / Non-Goals

**Goals:**
- Name the orphaned lock, its cause and the safe removal step, using only what is on disk.

**Non-Goals:**
- Deleting the file. It is legitimate while a session is open, and canonkit cannot tell whether one is.
- Changing sandbox or settings rules, or adding the lock to `git-ignore-sandbox-files`.
- Detecting other `.git` placeholders, such as `.git/hooks` or `config.worktree`. Those paths normally exist, so the sandbox mounts over the real file instead of creating a new one.

## Decisions

- **Separate function, called beside `sandboxPlaceholderDiagnosis`.** The new function does not reuse `sandboxExcludeTarget`. That helper requires the repository root, and this check must also work from a subdirectory or a worktree. The function uses `git rev-parse --absolute-git-dir --git-common-dir` through `sandboxGit()`, resolves both paths, dedupes them, and checks the two lock names in each. Alternative: inside the existing function, which would inherit the root-only early return.
- **Signal = regular file, size 0, no owner write bit, checked with `lstat`.** Git creates its lock with mode 0666 & ~umask, so a lock in progress is writable and is not reported. A placeholder is 0444. Mode alone is not enough, and neither is size alone. Alternative: also require the mtime to be older than N minutes. That was rejected as a heuristic with no added discrimination.
- **Row shape:** `{ status: "WARN", check: "git config lock", scope: "project" }`, one row per path. A distinct check name keeps it apart from the exclude-related "sandbox placeholders" rows and their tests. The message gives `rm <path>` as text. Doctor runs nothing.
- **Windows/macOS:** the check is platform-neutral, but only bubblewrap creates these files. On Windows, a read-only attribute maps to mode 0444. That is accepted: the file blocks git there too, so the WARN is still true about the effect. Tests that need `chmod` to be effective skip where it is not, in line with the CI fixture rule in AGENTS.md.

## Risks / Trade-offs

- [The user deletes the placeholder while a session is open] → The message tells them to close Claude Code sessions in that repository first. Removing the host file during a live session does not break the sandbox; the mount persists in its namespace.
- [Claude Code changes the protected names] → The names are a small constant next to `SANDBOX_PLACEHOLDERS`, with a comment citing the observed version.
- [A non-sandbox tool leaves a 0444 empty lock] → The WARN says "probably". The effect on git and the removal step are still correct.

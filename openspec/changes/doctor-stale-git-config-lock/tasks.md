# Tasks

## 1. Doctor check

- [ ] 1.1 Add the protected lock names constant (`config.lock`, `config.worktree.lock`), with a comment citing Claude Code 2.1.322, and a read-only `gitConfigLockDiagnosis()` in `bin/cli.js`. It locates the git dir and common dir through `sandboxGit()`, `lstat`s each lock and emits a "git config lock" WARN only for an empty regular file with no owner write bit. Verify with the e2e tests in 1.3.
- [ ] 1.2 Call it from doctor next to `sandboxPlaceholderDiagnosis()`, inside the same never-fail guard. Verify that doctor's exit status is unchanged with and without a lock (e2e, 1.3).
- [ ] 1.3 Add e2e cases to the doctor block of `test/e2e/git-ignore-sandbox-files.test.js`:
  - WARN for an empty 0444 lock: in the main repo, from a subdirectory, and for the common dir from a linked worktree.
  - No row for a lock with content, a writable empty lock, no lock, a symlink lock, and outside a repository.
  - The file is unchanged after doctor runs (size, mode and mtime).
  - Skip the chmod-dependent cases where `chmod` 0444 is not effective.
  Verify with `node --test test/e2e/git-ignore-sandbox-files.test.js`.
- [ ] 1.4 Cover "inside the sandbox prints no row" through the existing null-device helper (`isNullDeviceStat`), as a unit case. Verify that the case passes.

## 2. Documentation

- [ ] 2.1 Add a section to `docs/adr/0007-sandbox-placeholder-exclude.md`: the sandbox also leaves placeholders inside `.git` (`config.lock`, `config.worktree.lock`); `.git/info/exclude` does not fix them; doctor reports them and never deletes them. Verify by reading it against the specs.
- [ ] 2.2 Describe the new doctor row and the safe removal in the sandbox placeholders section of `docs/install.md`. Add an entry to the next release notes (create the next patch file if none exists). Verify that the links resolve and the README/docs drift checks in `npm test` pass.

## 3. Integration

- [ ] 3.1 Run `npm test` and `graphify update .`. Verify that the suite is green and record the result in this change.

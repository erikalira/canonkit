# Tasks

## 1. Git calls through the hardened runner

- [x] 1.1 Add a `keepHooksPath` option to `sandboxGit` and route `writeGitignore`'s `ls-files` and every `gitHooksPreflight` call through it; verify a new e2e test where a repository-local `core.fsmonitor` script never runs during `tool add graphify` (with and without `--with-git-hooks`), and the existing `core.hooksPath is set` test still passes

## 2. FIFO-safe reads

- [x] 2.1 Add `readRegularText` and use it in the legacy log merge, `settingsMention`, `gitignorePlan`, `gitHooksPreflight` and `graphifyHooksProblems`; verify new e2e tests with a FIFO `.gitignore` and a FIFO `post-commit` hook end (with a child timeout) without hanging, and `grep -n "readFileSync(" bin/cli.js` shows none of those call sites

## 3. Nested write roots

- [x] 3.1 Make `unsafeWriteRoot` walk every literal segment of each touch path and return the offending relative path; verify the existing symlink test passes and a new case with a real `.claude` and a symlinked `.claude/skills` is refused naming `.claude/skills` with nothing run

## 4. Release and close-out

- [x] 4.1 Add `docs/release-notes/3.2.1.md` (Action required: none) and bump `package.json`/`package-lock.json` to 3.2.1; verify `npm test` passes
- [x] 4.2 Gard reviews the final diff; close `docs/plans/wsl-resolvers-handoff.md` and tick the P0 item in `todo.md`

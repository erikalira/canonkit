# Handoff: fix/todo-pontuais

Branch `fix/todo-pontuais` (published, upstream `origin/fix/todo-pontuais`, not
main). One item per session with the `backlog-cycle` skill.

## Done

- Shell-for-files rule vs auto mode: commit `e6f76d5` (Virgo implemented,
  Spencer approved). The behavioral effect is unmeasured; the closed item was
  removed from `todo.md` with the other done items.
- Output and labels (LOW, inline, 2026-11-28): `core.hooksPath` through
  `plain()`; `tildeText()` in `bin/install-report.js` replaces every home
  occurrence at a path boundary (case-insensitive only for a Windows home); a
  project-local `claude` now reports `project-local-binary-ignored` (doctor
  shows it in the generic line); test renamed. Subitems removed from `todo.md`.
  Committed in `7e94e6c`.
- Doc (LOW, inline, 2026-11-28): one sentence in `docs/install.md` (~L1206)
  says `context-tune`, `learning-loop` and `backlog-cycle` install like
  `orchestrate`; item removed from `todo.md`. The misplaced-heading finding
  went to `todo.md` (P3).

## Remaining scope, in order (user-approved 2026-11-28)

3. **lstat fail-open + empty JSON**: `telemetryReadSymlink` (`bin/security.js`
   ~L507) and `bin/model-discovery.js` / `bin/model-config.js`. Investigate
   first; touches sandbox permissions → Bob implements, Gard reviews.
4. **WSL git + FIFO reads** (MEDIUM): `sandboxGit` without `toolExec()`;
   `readFile`/`readFileSync` skipping `readRegularSync` in `tool add/remove`
   and doctor. Bob implements, Gard reviews after the last edit.

## Held for the next release (no release in progress; never invent a version)

Spencer's proposed release-notes entry, for `docs/release-notes/<next>.md`:

> ### Agents use file tools for reads, not just edits
> The "Dedicated tools, not the shell" rule now covers reads, the scratch
> folder and subagents, and holds even where Claude Code's auto-mode prompt
> invites `cat`, `sed` or heredocs. `cat`, `sed -n` and `node -e` are not used
> where a read tool works; `grep` and `find` only when no search tool is
> available. The reviewer agents' "Reading code and diffs" now says the same.
> Its effect on agent behavior has not been measured.

Also for the next release notes (fixes): `tool add graphify` filters control
characters from `core.hooksPath` in its refusal; the install summary shows `~`
for every home-folder path in a note; `doctor` reports a `claude` found inside
the project as `project-local-binary-ignored` instead of blaming a Windows copy.

## Notes

- `npm run validate` warns that Bash syntax validation was not run: the sandbox
  denies `registry.npmjs.org`. Not a failure.
- Delete this handoff when the four items above are done or moved.

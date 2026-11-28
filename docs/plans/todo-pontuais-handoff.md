# Handoff: fix/todo-pontuais

Branch `fix/todo-pontuais` (published, upstream `origin/fix/todo-pontuais`, not
main). All four approved items are done (last: WSL git + FIFO reads,
2026-11-28, Bob implemented, Gard approved after the last edit); their
findings are in `todo.md`. This file now only keeps release text.

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
the project as `project-local-binary-ignored` instead of blaming a Windows copy;
install no longer offers the activity-history read when `~/.claude` or that
folder cannot be checked (not only when it is a link); an empty, whitespace-only
or BOM-prefixed `models.json` no longer aborts with "not valid JSON";
`tool add`, `tool remove` and `doctor` refuse a FIFO (or other non-regular
file) as `AGENTS.md` or as a Codex/OpenCode hook file instead of hanging; on
WSL the git calls behind `tool add` no longer pick a Windows `git` from PATH.

## Closing condition

Delete this file once the next release's notes include the text above.

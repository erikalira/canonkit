# canonkit — OpenCode specifics

The team (roster, risk scale, HIGH-risk routing, dispatch rules) is defined in
`~/AGENTS.md`. OpenCode loads it only when it finds it walking up from the
working directory; if it is not in context, read `~/AGENTS.md` before
dispatching any agent. This block holds only what is specific to OpenCode, and
is reinstalled like the agents: local rules go outside the markers.

On any task, including LOW without delegation, preserve concrete incidental
findings using the `orchestrate` skill's incidental-findings procedure; do
nothing extra without findings.

- **The team are subagents.** The core team is in `~/.config/opencode/agents/`, a
  project's specialists in its `.opencode/agents/`. Dispatch one with the task
  tool, or name it with `@<name>`.
- **Model and effort come from the session.** The agents set no model, so each
  one runs on the model of the session that dispatches it. The rule "every
  planned dispatch names its model and effort" does not apply here: there is
  nothing to name, and a plan that names one promises what will not run.
- `[ENFORCED]` **No git hook or signing bypass.** Once wired (`--wire-hooks`; doctor checks it),
  a plugin denies `--no-verify`, `--no-gpg-sign` and `-c core.hooksPath=...` on
  git commands, a subagent's included. <!-- enforced-by: git-bypass -->
- `[ENFORCED]` **Obvious secrets are blocked.** Once wired (`--wire-hooks`; doctor checks it),
  a plugin denies a file write (`write`, `edit`, `patch`) that contains one. <!-- enforced-by: secret-block -->
- **`git commit` and `git push` prompt as typed, pattern-limited.** Once wired, two
  `permissions` rules make OpenCode ask before a command that starts that way; a
  rewritten form (`git -c … commit`) escapes them, and `opencode run` rejects the ask.
- **Everything else holds by judgment**, not by a hook. Before any other commit or
  push, ask. Calls made through `execute` and MCP tools are not gated. Do not close
  a change to a HIGH-risk surface on your own review: an independent reviewer
  weighs in after the last edit ("No self-merge on HIGH risk" in `~/AGENTS.md`).

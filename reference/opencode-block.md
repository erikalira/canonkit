# canonkit — OpenCode specifics

The team (roster, risk scale, HIGH-risk routing, dispatch rules) is defined in
`~/AGENTS.md`. OpenCode loads it only when it finds it walking up from the
working directory; if it is not in context, read `~/AGENTS.md` before
dispatching any agent. This block holds only what is specific to OpenCode, and
is reinstalled like the agents: local rules go outside the markers.

- **The team are subagents.** The core team is in `~/.config/opencode/agents/`, a
  project's specialists in its `.opencode/agents/`. Dispatch one with the task
  tool, or name it with `@<name>`.
- **Model and effort come from the session.** The agents set no model, so each
  one runs on the model of the session that dispatches it. The rule "every
  planned dispatch names its model and effort" does not apply here: there is
  nothing to name, and a plan that names one promises what will not run.
- **Nothing here is enforced.** In Claude Code a hook backs some of the team's
  rules; OpenCode runs no such hook, so they hold only by judgment, and no
  rule here is marked `[ENFORCED]`. Before `git commit` or `git push`, ask.
  Never write a secret into a file. Do not close a change to a HIGH-risk surface
  on your own review: an independent reviewer weighs in after the last edit
  ("No self-merge on HIGH risk" in `~/AGENTS.md`).

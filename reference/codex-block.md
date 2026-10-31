# canonkit — Codex specifics

The team (roster, risk scale, HIGH-risk routing, dispatch rules) is defined in
`~/AGENTS.md`. Codex does not read that file from a repository below your home
folder (it loads `~/.codex/AGENTS.md`, then each `AGENTS.md` from the git root
down to the working directory), so read `~/AGENTS.md` before dispatching any
agent. This block holds only what is specific to Codex, and is reinstalled like
the agents: local rules go outside the markers.

- **The team are Codex subagents** in `~/.codex/agents/`. Ask for one by name.
- **Model and effort come from the session.** The agents set no model, so the
  rule "every planned dispatch names its model and effort" does not apply here.
- `[ENFORCED]` **No git hook or signing bypass.** Once wired (`--wire-hooks`; doctor checks it),
  a hook denies `--no-verify`, `--no-gpg-sign` and `-c core.hooksPath=...` on
  git commands. <!-- enforced-by: git-bypass -->
- `[ENFORCED]` **Obvious secrets are blocked.** Once wired (`--wire-hooks`; doctor checks it),
  a hook denies a file write (`apply_patch`) that contains one. <!-- enforced-by: secret-block -->
- **Everything else holds by judgment**, not by a hook. Before `git commit` or
  `git push`, ask. Do not close a change to a HIGH-risk surface on your own
  review: an independent reviewer weighs in after the last edit ("No self-merge
  on HIGH risk" in `~/AGENTS.md`).

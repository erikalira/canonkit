# canonkit — Codex specifics

The team (roster, risk scale, HIGH-risk routing, dispatch rules) is defined in
`~/AGENTS.md`. Codex does not read that file from a repository below your home
folder (it loads `$CODEX_HOME/AGENTS.md`, then each `AGENTS.md` from the git root
down to the working directory), so read `~/AGENTS.md` before dispatching any
agent. This block holds only what is specific to Codex, and is reinstalled like
the agents: local rules go outside the markers.

Before delivery, follow `orchestrate` completion for documentation and release
impact; LOW stays inline. Preserve incidental findings through its procedure;
otherwise, do nothing extra.

- **The team are Codex subagents** in `$CODEX_HOME/agents/` (`~/.codex` by default). Ask for one by name.
- **Use the selected Codex model and effort.** Run `npx canonkit models show
  --json` in the project and read `harnesses.codex.agents.<agent>`. A generated
  custom agent file carries configured `model` and `model_reasoning_effort`;
  project core overrides require `npx canonkit install --codex` in that project.
  Its file wins over spawn parameters. Name "inherit" for unset fields and
  verify the effective runtime when it matters.
- **Structured questions use `request_user_input`.** For a decision that is the
  user's, with 2–4 real options, ask with it: recommended option first, pending
  questions together. It may be rejected as unavailable in the current mode
  (Plan only in some releases); then ask in text with numbered options.
- `[ENFORCED]` **No git hook or signing bypass.** Once wired (`--wire-hooks`; doctor checks it),
  a hook denies `--no-verify`, `--no-gpg-sign` and `-c core.hooksPath=...` on
  git commands. <!-- enforced-by: git-bypass -->
- `[ENFORCED]` **Obvious secrets are blocked.** Once wired (`--wire-hooks`; doctor checks it),
  a hook denies a file write (`apply_patch`) that contains one. <!-- enforced-by: secret-block -->
- **Everything else holds by judgment**, not by a hook. Before `git commit` or
  `git push`, ask. Do not close a change to a HIGH-risk surface on your own
  review: an independent reviewer weighs in after the last edit ("No self-merge
  on HIGH risk" in `~/AGENTS.md`).

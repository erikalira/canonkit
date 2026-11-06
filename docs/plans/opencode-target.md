# OpenCode as a third install target (2026-10-26)

Phase 1 is implemented (2026-10-26), not committed; commit only when the user asks.
Still to verify in practice: that a subagent without `model` runs on the session's model.

**Risk: MEDIUM** (new integration and an additive CLI flag; writes a new user
directory). Phase 2 (plugin with gates) touches secret blocking → **Gard** reviews.

## Facts checked against the docs (2026-10-26)

- Agents: `~/.config/opencode/agents/<name>.md` (global), `.opencode/agents/<name>.md`
  (project, discovered from cwd up to the project root). Frontmatter = an `agents`
  config entry; body = system prompt. `mode`: `primary | subagent | all`, and a
  custom agent **defaults to `primary`** when omitted. `.claude/agents` and
  `~/.agents` are not read. https://opencode.ai/v2/docs/agents/
- Rules: global `~/.config/opencode/AGENTS.md`; if absent, OpenCode falls back to
  `~/.claude/CLAUDE.md`. Project AGENTS.md found by walking up from cwd.
  https://opencode.ai/docs/rules/
- Skills: `~/.agents/skills` and `~/.claude/skills` are read natively — already
  covered by the existing installs. https://opencode.ai/docs/skills
- Plugins: `~/.config/opencode/plugins/`, `tool.execute.before(input, output)`, block
  by throwing. `session.idle` exists, but nothing that blocks the end of a turn; the
  docs don't say whether hooks fire inside subagents. https://opencode.ai/docs/plugins/
- The user's machine today has no `~/.config/opencode/AGENTS.md`, so OpenCode loads
  `~/.claude/CLAUDE.md`, whose `[ENFORCED]` claims are false there.

## Decisions

- **Generate, never symlink.** A junction would load agents as `primary` and with an
  invalid `model: sonnet`.
- **No model in OpenCode agents (user decision).** The user runs OpenCode's free
  models; the session model must always win. The generated frontmatter has no
  `model` and no `#variant`. Verify in practice that a subagent without `model`
  inherits the invoking session's model (expected, not yet tested).
- The OpenCode reference block says model/effort come from the session — the
  orchestrate rule "every dispatch names model and effort" doesn't apply there.
- The OpenCode block is its own: no `[ENFORCED]` until a plugin enforces it.
  Writing `~/.config/opencode/AGENTS.md` also ends the CLAUDE.md fallback.
- **OpenCode is opt-in** (decided during implementation): `--opencode` or the menu,
  where it starts unchecked. Without a flag or a terminal, install still writes
  Claude Code + Codex only — writing OpenCode's AGENTS.md ends its CLAUDE.md
  fallback, which nobody who didn't ask for OpenCode should get. The installer
  says so when it creates that file over an existing `~/.claude/CLAUDE.md`.
- The folder follows `$XDG_CONFIG_HOME/opencode` when set, as OpenCode does.

## Scope — phase 1

1. `TARGETS = ["claude", "codex", "opencode"]` (bin/cli.js ~285); `--opencode` flag
   and a menu entry; help text.
2. `opencodeAgent(agent)` next to `codexAgent` (bin/cli.js ~189): frontmatter
   `description`, `mode: subagent`; drop `name`, `tier`, `model`; body unchanged.
3. `installOpencode` → `~/.config/opencode/agents/`: core only, remove a stray
   specialist at user level, warn about (never delete) agents not owned by canonkit,
   same as `installCodex`.
4. `canonkit add/remove <specialist>` also writes/removes `.opencode/agents/<name>.md`.
5. `reference --opencode` writes the managed block to `~/.config/opencode/AGENTS.md`
   (between markers; local rules outside are preserved).
6. `doctor`: check `~/.config/opencode/agents` against the source when the target is
   installed.
7. Tests in test/cli.test.js mirroring the Codex ones; README + package.json
   description/keywords.

## Phase 2 (later, after testing in practice)

OpenCode plugin porting what can be ported from hooks/canonkit-hook.js: block
secrets, confirm on `git commit`/`git push` and edits to HIGH-risk surfaces,
activity log. The Stop/no-self-merge gate has no blocking equivalent — first test
`session.idle` and whether hooks fire inside subagents.

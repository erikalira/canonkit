# Installation reference

The README covers the happy path. This page is the detail: what each choice
writes, how the Codex and OpenCode targets differ, project-level specialists, the
global reference blocks and skills, and upgrading from an older name.

Hooks and their configuration have their own page: [hooks.md](hooks.md).

## Core, at user level

Without cloning anything:

```bash
npx canonkit install
```

It runs the same on Linux, macOS and Windows. In a terminal, it asks which
runtimes to install for, as a multiple choice — Claude Code and Codex come
checked, OpenCode does not; space toggles, Enter confirms, and at least one must
stay checked. `--claude`, `--codex` and `--opencode` answer without the menu (they
combine), and with no terminal (a script, CI) it installs for Claude Code and
Codex, as it did before the menu existed. OpenCode is opt-in because writing
`~/.config/opencode/AGENTS.md` ends OpenCode's fallback to `~/.claude/CLAUDE.md`
— not a change to make for someone who did not ask for OpenCode.

The menu is the only dependency (`prompts`, which brings `kleur` and `sisteransi`,
none with an install script), and it is only loaded when it appears: an install
decided by flag or with no terminal runs on plain Node. An installer that runs
**before** you trust the repository should not ask you to trust a dependency tree
larger than that.

| Choice | Writes |
| --- | --- |
| Claude Code | `~/.claude/agents`, hooks, dashboard, block in `~/.claude/CLAUDE.md`, `~/.claude/skills` |
| Codex | `~/.codex/agents/*.toml`, `~/.agents/skills` |
| OpenCode | `~/.config/opencode/agents/*.md`, block in `~/.config/opencode/AGENTS.md`, `~/.agents/skills` (no hooks) |
| more than one | the sum; the `~/AGENTS.md` block goes in with any choice |

`--wire-hooks` registers the Claude Code hook, so it is refused on an install
without Claude Code. `doctor` checks the Claude Code half and, if there are
canonkit agents in `~/.config/opencode/agents`, those too.

From a clone, the scripts still work — they are wrappers around the same
`bin/cli.js`:

```bash
./scripts/install.sh          # Linux and macOS
.\scripts\install.ps1         # Windows
```

For Claude Code it copies the 10 core agents to `~/.claude/agents`, the only
path Claude Code reads them from. `~/.agents` receives skills only
(`~/.agents/skills`, which Codex and OpenCode read); nothing verified reads
`~/.agents/<agent>.md`, so canonkit no longer writes it. It then syncs the global
reference blocks (`--no-reference` skips that step).

The core/specialist split is declared in **each agent's frontmatter** (`tier:`),
beside `name` and `model` — where the runtime already reads the other facts about
the agent. It used to be a literal list repeated in three installers, and keeping
the three honest cost a whole section of `validate.sh`. A new file in `agents/`
without a valid `tier` does not install: it fails, instead of assuming a default
— both possible defaults are wrong, one installs the agent everywhere and the
other hides it.

The installers also **remove** specialists left over at user level from earlier
installs; a forgotten copy there is available in every project and defeats the
rule. Only names this repository owns are touched.

## Codex

The same core also goes to `~/.codex/agents/<name>.toml`, in the custom-agent
format Codex reads: `name`, `description`, `developer_instructions`, plus `model`
and `model_reasoning_effort`. The instructions are the body of the same
`agents/<name>.md` — there is no second editable copy. Before this, the only thing
this repository could tell Codex was the roster in prose in `AGENTS.md`, which
describes the team but cannot call anyone.

The frontmatter `model` says how much the agent's *normal* work demands, on
Claude's axis. Codex has its own axis, so the intent crosses over through a
declared map — and not through a second model field in each agent, which would be
fifteen more lines to keep in sync and one more thing to drift:

| frontmatter | Codex | reasoning effort |
| --- | --- | --- |
| `opus` | `gpt-5.6` | `high` |
| `sonnet` | `gpt-5.6` | `medium` |
| `haiku` | `gpt-5.6-luna` | `low` |

Every agent on this team is a judgment agent, not a scanner optimized for speed —
which is why the fast models sit at the end of the map and nothing selects
`gpt-5.6-luna` today.

Your own Codex custom agents live in the same directory and are none of the
installer's business. The only thing it comments on is narrower: a file that
looks like an **old copy of an agent this repository owns**, in a format Codex
does not load from there — which leaves a second, diverging version of that agent
lying around. Reported, never removed: the name is not one the repository claims,
so deleting it is not an installer's decision.

Scaffolding (`.gitignore`, `.github/`), directories and your own agents raise no
warning. A warning that fires on `.gitignore` teaches you to ignore warnings.

## OpenCode

With `--opencode` (or checked in the menu), the core goes to
`~/.config/opencode/agents/<name>.md` (`$XDG_CONFIG_HOME/opencode` if set). It is
Markdown like the source, but **generated**, not copied or linked: the frontmatter
keeps only `description` and `mode: subagent`. Without `mode`, OpenCode loads a
custom agent as a primary agent; and `model: sonnet` is not an id it accepts. The
body is the same as `agents/<name>.md`.

**No model, by design:** the agents set neither `model` nor a variant. OpenCode
runs with whatever models the session has, and a subagent without `model` uses the
model of the agent that called it — the session's model always applies. That is
why the rule "every dispatch names its model and effort" does not apply there.

The block in `~/.config/opencode/AGENTS.md` (`reference/opencode-block.md`) is its
own: it points to `~/AGENTS.md` and says nothing is `[ENFORCED]` in OpenCode —
there is no hook there yet, the rules hold by judgment. Creating that file ends
OpenCode's fallback to `~/.claude/CLAUDE.md`; the installer warns when that
happens, so you can copy over any rules of yours that should keep applying there.

Skills: OpenCode reads `~/.agents/skills` and `~/.claude/skills` natively, so an
OpenCode-only install writes the skills to `~/.agents/skills`. Same rules as Codex
for specialists left at user level (removed) and for old copies of the
repository's agents (reported, never removed — here they load as a second agent,
since OpenCode reads every `.md` in the folder).

## Commands

| Command | What it does |
| --- | --- |
| `install` | core at user level + hooks + dashboard + global reference blocks + the `orchestrate` and `context-tune` skills |
| `install --wire-hooks` | the same, and registers the hook in `~/.claude/settings.json` (see [hooks.md](hooks.md)) |
| `install --no-reference` | only the agents, the hooks and the dashboard |
| `install --claude` / `--codex` / `--opencode` | only for those runtimes, without the menu |
| `doctor` | read-only check of the installation; exits 1 if any check is `FAIL` |
| `reference` | only the global blocks and the skills (`--claude`/`--codex`/`--opencode` narrow it; no menu) |
| `add <name>...` | specialists in the current project |
| `remove <name>...` | removes specialists from the current project |
| `list` | the roster and what is installed where (and points to `tool list`) |
| `tool add <graphify\|openspec>` | runs the tool's setup in this project and records it in `AGENTS.md` (see [tools.md](tools.md)) |
| `tool remove <name>` | removes the tool from `AGENTS.md` |
| `tool list` | pin, installed version and whether it is active in this project |

`--dry-run` works on all of them: it reports what would change without writing
anything. `--yes` exists only on `tool add`.

## Specialists, per project

Run **from inside the project** that will receive the agents:

```bash
cd ~/my-project
npx canonkit add maya nova
```

Choosing which specialists a project has remains your explicit decision — the
installer only takes care of what is easy to forget. **Four** destinations need to
know about the agent, and forgetting one of them is the failure it exists to
prevent:

- **Claude Code** reads `.claude/agents/<name>.md`
- **Codex** reads `.codex/agents/<name>.toml` — it does not look at `.claude/agents/`
- **OpenCode** reads `.opencode/agents/<name>.md`, generated as a subagent with no model
- **the project's `AGENTS.md`** is what tells the main agent *when* to call each
  one; without it the subagent exists and nobody calls it

All four are written in one step. The `AGENTS.md` block is rebuilt from what is
actually on disk, so it always reflects reality and not the command history.

```bash
npx canonkit list            # what this project has installed
npx canonkit remove nova     # removes the file and the entry
```

The one-line description that goes into the project's `AGENTS.md` is read from
`reference/agents-block.md` itself, not from a second list inside the installer —
the closing "Use when ..." sentence stays in the roster, because it is guidance
for choosing an agent and not a description of one.

Removing the last specialist takes the whole block out of `AGENTS.md`. Everything
outside the markers is preserved, and the script refuses to run inside the
`canonkit` repository itself or to install a core agent.

## Global reference blocks and skills

They already run as part of `install`. Standalone, for when you edited a block
without touching any agent:

```bash
npx canonkit reference
```

It syncs **two blocks** (three with `--opencode`), because each runtime reads
different things:

| Repository file | Goes to | Read by | Content |
| --- | --- | --- | --- |
| `reference/agents-block.md` | `~/AGENTS.md` | Codex and Claude Code | the whole team: who exists, blocking authority, HIGH routing, dispatch rules |
| `reference/routing-block.md` | `~/.claude/CLAUDE.md` | Claude Code | only what is specific to Claude: the pointer to `~/AGENTS.md` and the hooks' `[ENFORCED]` rules |
| `reference/opencode-block.md` | `~/.config/opencode/AGENTS.md` | OpenCode | only what is specific to OpenCode: the pointer to `~/AGENTS.md`, model taken from the session, nothing `[ENFORCED]` |

Alongside the blocks goes the `orchestrate` skill (`skills/orchestrate/SKILL.md`),
which holds what only matters at orchestration time: the rationale for naming
model and effort on every dispatch and the Integration Review procedure. The
`AGENTS.md` keeps one always-loaded line per rule, pointing to the skill, so the
rule does not vanish when the skill is not loaded. The skill is installed in
`~/.claude/skills/orchestrate/` (Claude Code) and in `~/.agents/skills/orchestrate/`
(Codex reads skills from `$HOME/.agents/skills`, per OpenAI's official skills
documentation). A diverged copy is preserved as `<file>.local.bak` before being
overwritten. The installer copies every file in the skill's folder, not only
`SKILL.md`.

The `context-tune` skill is a different kind: **it only runs when you call it**
(`/context-tune` in Claude Code, `$context-tune` in Codex). It measures the output
of the commands the agents run in the project (tests, build, lint), separates
signal from noise (color codes, banners, hints, verbose reporters) and silences
the noise where the configuration is saved in the project: `env` in
`.claude/settings.json` / `[shell_environment_policy.set]` in `.codex/config.toml`,
the tool's own config and, last, a script for agents. At the end it measures again
and shows the before and after. It runs once per project, instead of becoming a
rule in `AGENTS.md` that every session loads. That is why it weighs nothing per
session: Claude Code does not put the description of a skill with
`disable-model-invocation: true` in context, and Codex does not pick it on its
own because of `allow_implicit_invocation: false` in `agents/openai.yaml`.

`AGENTS.md` is runtime-neutral and is the only definition of the team. The
routing block keeps only what is Claude Code mechanics (hooks and what they
enforce) and only points to `~/AGENTS.md`, without `@`: projects live under a
folder that contains `AGENTS.md`, Claude Code already loads it as an ancestor, and
an import would load it twice. The block carries no team table of its own.

Only the part between the markers is managed:

```markdown
<!-- agent-team-config:start -->        <!-- agent-team-config:routing:start -->
...agents-block.md...                   ...routing-block.md...
<!-- agent-team-config:end -->          <!-- agent-team-config:routing:end -->
```

Everything outside the markers is preserved. The script is idempotent and, on the
first run, replaces the hand-written section instead of duplicating it —
identifying it by the block's own title, not by a regex passed by hand, because a
quoting mistake there silently duplicates the section instead of replacing it.

The roster states facts about the agents — which layer they are in, who has a
veto, who runs on opus. Those facts are stored elsewhere, so they can drift
without anything breaking. `validate.sh` is what makes that break (see
[maintaining.md](maintaining.md#validation)).

## Upgrading from `meu-time`

When upgrading from a version with the old name (`meu-time`), `install` moves
`~/.claude/meu-time-activity/` to `canonkit-activity/` (if both exist, it merges
the history, oldest first, and removes the old one) and replaces
`meu-time-hook.js` with a forwarder to `canonkit-hook.js`, which is never removed:
a project's `.claude/settings.json` may still run it, and `install` has no way to
find it. Point every `settings.json` at `canonkit-hook.js` and delete the
forwarder. Handling of the old name goes away in 2.0.

## Upgrading from 2.0: leftover `~/.agents/*.md`

2.0 also copied the core agents to `~/.agents/<agent>.md`. 2.1 stops writing
them and deletes nothing. The leftover copies are harmless: no harness reads
them, and nothing breaks if you leave them. `npx canonkit doctor` WARNs on each
one ("not read by any harness; 3.0 removes byte-identical copies"). 3.0 deletes
the copies that are byte-identical to the packaged agent; a copy you modified is
kept. Until then you can delete them by hand, including a modified one if you no
longer want it.

Delete them one file at a time. The 10 core names are `scott`, `archie`, `bob`,
`quinn`, `gard`, `pixie`, `perry`, `pipe`, `spencer` and `virgo`:

```bash
rm ~/.agents/scott.md        # repeat for each of the 10 names
```

Do not glob (`~/.agents/*.md`): the folder may hold files of your own, and only
those 10 names are canonkit's. Do not touch `~/.agents/skills`: it is where
canonkit installs skills now.

## Uninstalling

There is no `uninstall` command. To remove canonkit by hand, delete what the
table under [Core, at user level](#core-at-user-level) lists for the runtimes you
installed:

- the agent files canonkit owns in `~/.claude/agents`,
  `~/.codex/agents` and `~/.config/opencode/agents` (only the 10 core names; your
  own agents there are untouched by canonkit and should stay);
- if you upgraded from 2.0, the leftover `~/.agents/<agent>.md` copies, one file
  at a time as described in
  [Upgrading from 2.0](#upgrading-from-20-leftover-agentsmd); never the folder or a glob;
- the managed blocks between the `agent-team-config` markers in `~/AGENTS.md`,
  `~/.claude/CLAUDE.md` and `~/.config/opencode/AGENTS.md`;
- the `orchestrate` and `context-tune` folders in `~/.claude/skills` and
  `~/.agents/skills` (Codex and OpenCode read the latter);
- `~/.claude/hooks/canonkit-hook.js` and, if you upgraded from `meu-time`, the
  `meu-time-hook.js` forwarder next to it;
- the canonkit hook entries in `~/.claude/settings.json`. Remove them by hand: the
  `.bak` that `--wire-hooks` wrote is a fallback, and restoring it also undoes any
  change you made to `settings.json` after it was written;
- `~/.claude/canonkit-dashboard/` and, if you no longer want the history,
  `~/.claude/canonkit-activity/`;
- per project: `npx canonkit remove <name>` for each specialist,
  `npx canonkit tool remove <name>` for each tool, and `.claude/canonkit.json` if
  you created one. `tool remove` only takes the tool out of `AGENTS.md`; what the
  tool's own setup wrote (`openspec/`, `graphify-out/`, its skills and git hooks)
  stays — see [tools.md](tools.md) for how to undo each.

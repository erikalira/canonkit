# Installation reference

The README covers the happy path. This page is the detail: what each choice
writes, how the Codex and OpenCode targets differ, project-level specialists and
stack packs, global reference blocks and skills, and upgrading from an older name.

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
| Codex | `$CODEX_HOME/agents/*.toml` (`~/.codex` when `CODEX_HOME` is not set), block in `$CODEX_HOME/AGENTS.md`, `~/.agents/skills` |
| OpenCode | `~/.config/opencode/agents/*.md` (`$XDG_CONFIG_HOME/opencode` if set), block in `~/.config/opencode/AGENTS.md`, `~/.agents/skills` |
| more than one | the sum; the `~/AGENTS.md` block goes in with any choice |

`install` and `reference` also maintain `~/.canonkit/install-manifest.json`.
It records global artifacts by stable ID, resolved root, harness owners,
provenance and installed-byte hash. Private configuration snapshots live under
`~/.canonkit/backups/`. Project specialists and stack packs, external tool setup and activity
history are not owned by this global manifest. `--no-reference` skips the blocks
and skills and preserves earlier records for them.

`--wire-hooks` wires the hook of every runtime in the install, and only those:
Claude Code's in `~/.claude/settings.json`, Codex's in `$CODEX_HOME/hooks.json`,
OpenCode's as a plugin. What each one writes, and how to remove it, is in its
section below. Before anything is written, it refuses the whole install if it
would have to guess: a config file that does not parse, a Codex path it cannot
quote, or an OpenCode older than 2. `doctor` checks the Claude Code half and adds
Codex and OpenCode rows where canonkit has written something for them.

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

The installers report and preserve specialists left over at user level without
tracked provenance. Such a copy remains available in every project: inspect it
and remove it yourself if it should be project-only. Its name alone does not
prove that canonkit owns it.

## Codex

Every Codex path is under `$CODEX_HOME`, or `~/.codex` when it is not set; this
page writes `$CODEX_HOME` for both. Before 2.2 canonkit always wrote `~/.codex`,
so if you set `CODEX_HOME`, the agents now go where Codex reads them, and the old
copies in `~/.codex/agents` are yours to delete (the 10 core names only).

The same core also goes to `$CODEX_HOME/agents/<name>.toml`, in the custom-agent
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
| `opus` | `gpt-6.1-sol` | `high` |
| `sonnet` | `gpt-6.1-sol` | `medium` |
| `haiku` | `gpt-6-luna` | `low` |

Every agent on this team is a judgment agent, not a scanner optimized for speed —
which is why the fast models sit at the end of the map and nothing selects
`gpt-6-luna` today. These defaults are centralized in `CODEX_MODELS` in
`bin/cli.js`; they were checked against the [official model documentation](https://learn.chatgpt.com/docs/models?surface=web)
on 2026-11-03. Availability depends on the account and client.

### Follow the session model

Set `CANONKIT_CODEX_MODEL=inherit` when installing to avoid pinning a model
version in the generated agents:

```bash
CANONKIT_CODEX_MODEL=inherit node bin/cli.js install --codex
```

In PowerShell, from this checkout:

```powershell
$env:CANONKIT_CODEX_MODEL = 'inherit'
node bin/cli.js install --codex
```

For the published package, use `npx canonkit install --codex` with the same
environment variable. `inherit` omits the TOML `model` key and keeps each agent's
reasoning effort. [Codex resolves the model](https://learn.chatgpt.com/docs/agent-configuration/subagents)
from an explicit spawn selection, then its subagent default, then the parent
session. This follows your configuration; it does not guarantee the newest
model. If you also leave the top-level Codex model unset, the client uses its
recommended model.

You can set the variable to a concrete model ID instead, such as
`gpt-6.1-terra`. That pins the same model for every tier; efforts stay mapped as
above. The installer does not probe account access or fetch models from the
network. Unset the variable to restore the shipped mapping on the next install
(`Remove-Item Env:CANONKIT_CODEX_MODEL` in PowerShell, `unset CANONKIT_CODEX_MODEL`
in Bash).

This is an **install-time** choice, shared by `install` and specialist `add`.
Changing the variable alone does not update existing files. Re-run installation
to regenerate core agents, and `canonkit add <name>` in each project to
regenerate its specialists; start a new Codex session afterward. `reference`
only updates blocks and skills, so it does not regenerate agents. Historical
plans, eval records and hook fixtures retain the model IDs actually used.

Your own Codex custom agents live in the same directory and are none of the
installer's business. The only thing it comments on is narrower: a file that
looks like an **old copy of an agent this repository owns**, in a format Codex
does not load from there — which leaves a second, diverging version of that agent
lying around. Reported, never removed: the name is not one the repository claims,
so deleting it is not an installer's decision.

Scaffolding (`.gitignore`, `.github/`), directories and your own agents raise no
warning. A warning that fires on `.gitignore` teaches you to ignore warnings.

The block in `$CODEX_HOME/AGENTS.md` (`reference/codex-block.md`) is Codex's own.
Codex does not read `~/AGENTS.md` from a repository below your home folder, so
the block points the model at it. If an `AGENTS.override.md` sits beside it,
Codex reads that file instead and the block is not loaded; `doctor` WARNs.

### Codex hook (`--wire-hooks`)

On Windows, a long `CODEX_HOME` can make Codex's background server fail with
"path must be shorter than SUN_LEN". Start Codex with `codex --no-daemon` in
that case. This is a Codex socket-path limit, not a canonkit limit; it was seen
during the 2.2 release gate.

With `--wire-hooks`, install writes:

| What | Where |
| --- | --- |
| `canonkit-codex.js`, `canonkit-hook.js`, `package.json` | `$CODEX_HOME/canonkit/` |
| one `PreToolUse` group, matcher `Bash\|apply_patch`, command `node "<CODEX_HOME>/canonkit/canonkit-codex.js"` | `$CODEX_HOME/hooks.json` |
| the previous `hooks.json`, only when it changes | `hooks.json.canonkit-<timestamp>.bak` beside it |

Codex skips a new or changed hook until you trust it: run `/hooks` in Codex once
after the install. The trust covers the command, not the files it runs, so a
later install that refreshes `canonkit/` asks for nothing; it asks again only if
the command changes (for example, after you set `CODEX_HOME`). The other entries
in `hooks.json` are never touched, and nothing of yours moves, because Codex keys
trust by position.

Install refuses before writing anything if `hooks.json` does not parse, or if the
`$CODEX_HOME` path holds `"`, `$` or a backtick: the shell Codex runs the command
through would expand it, and a hook that cannot start fails without a word. A
plain install (no `--wire-hooks`) refreshes `canonkit/` only if it already
exists, so no copy sits there unused. `doctor` FAILs if those files differ from
the package's or the group is missing.

To remove it by hand: delete `$CODEX_HOME/canonkit/`, and delete the group whose
command names `canonkit-codex.js` from `hooks.json`. Restoring the `.bak` also
works, but it undoes any change you made to `hooks.json` after it was written.

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
own: it points to `~/AGENTS.md` and marks the two gates the plugin enforces once
wired; every other rule holds by judgment. Creating that file ends
OpenCode's fallback to `~/.claude/CLAUDE.md`; the installer warns when that
happens, so you can copy over any rules of yours that should keep applying there.

Skills: OpenCode reads `~/.agents/skills` and `~/.claude/skills` natively, so an
OpenCode-only install writes the skills to `~/.agents/skills`. Same rules as Codex
for specialists left at user level (removed) and for old copies of the
repository's agents (reported, never removed — here they load as a second agent,
since OpenCode reads every `.md` in the folder).

### OpenCode plugin (`--wire-hooks`)

The plugin is an OpenCode 2 plugin, and OpenCode 1 does not run it. Install
checks `opencode --version` first and refuses if `opencode` is not on PATH, prints
no version, or is older than 2. With `--wire-hooks`, install writes (all under
`~/.config/opencode`, or `$XDG_CONFIG_HOME/opencode`):

| What | Where |
| --- | --- |
| `canonkit-opencode.js`, `canonkit-hook.js`, `package.json` | `canonkit/` |
| the plugin, which loads `../canonkit/canonkit-opencode.js` | `plugins/canonkit.js` |
| two rules appended to `permissions`: `{"action": "shell", "resource": "git commit *", "effect": "ask"}` and the same for `git push *` | `opencode.json` |
| the previous `opencode.json`, only when it changes | `opencode.json.canonkit-<timestamp>.bak` beside it |

OpenCode loads every file in `plugins/`, so the plugin's presence is the wiring;
there is no trust step. `opencode plugin list` does not show it (that list holds
package plugins only). The two asks are config, not a gate: OpenCode applies the
last rule that matches, so they go at the end. If a later rule of yours allows
shell calls, install moves the asks after it and says so. V1 `permission` is
never written.

When your config denies some shell calls, install writes no asks, because an ask
appended after a deny it overlaps would turn that deny into a prompt. It prints
the two rules for you to place by hand: after the rules that allow shell calls
and before your deny rules. If an allow comes after your deny, put the asks just
before your deny rules.

Install refuses before writing anything if an `opencode.jsonc` exists (its
comments would not survive a rewrite), if `opencode.json` is not plain JSON or not
an object, or if its `permissions` is not an array of objects. A plain install
refreshes `canonkit/` and the plugin only where either already exists. `doctor`
FAILs if those files differ from the package's, and WARNs if the asks are not in
effect. It reads only the global `opencode.json`, so a project's own OpenCode
config can override the asks without `doctor` noticing.

Each `.bak` is a whole copy of `opencode.json`, provider keys included, and a new
one is written on every change: delete the old ones, and keep them out of a
dotfiles repository.

To remove it by hand: delete `plugins/canonkit.js` and `canonkit/`, and delete
the two `git commit *` and `git push *` ask rules from `permissions`.

## Commands

| Command | What it does |
| --- | --- |
| `install` | core at user level + hooks + dashboard + global reference blocks + the `orchestrate`, `context-tune` and `learning-loop` skills |
| `install --wire-hooks` | the same, and wires the hook of each runtime installed: `~/.claude/settings.json`, `$CODEX_HOME/hooks.json`, the OpenCode plugin (see [hooks.md](hooks.md)) |
| `install --no-reference` | only the agents, the hooks and the dashboard |
| `install --claude` / `--codex` / `--opencode` | only for those runtimes, without the menu |
| `doctor` | read-only check of the installation; exits 1 if any check is `FAIL` |
| `reference` | only the global blocks and core skills (`--claude`/`--codex`/`--opencode` narrow it; no menu; no stack packs) |
| `uninstall [--claude] [--codex] [--opencode]` | remove tracked global artifacts; without flags, all recorded harnesses |
| `add <name>...` | specialists or stack-pack skills in the current project |
| `remove <name>...` | removes specialists or tracked stack-pack files from the current project |
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

## Stack packs, per project

Stack packs are skills, not additional agents. They supply language/framework
guidance to Bob and Quinn without changing the roster or adding a review verdict.
The [stack-pack table in the README](../README.md#stack-packs-per-project) lists
all available packs, their guidance and individual install commands. Install only
the ones wanted, from the consuming project's directory:

```bash
npx canonkit add typescript react
npx canonkit add cpp csharp java python rust
npx canonkit add go kotlin swift
npx canonkit list
npx canonkit remove react
```

Each named pack writes two project-local copies of its `SKILL.md`:

- `.agents/skills/canonkit-<stack>/` for universal discovery;
- `.claude/skills/canonkit-<stack>/` for Claude Code.

An installed skill is available for selection when relevant; installing it does
not force a dispatch. React does not implicitly install TypeScript. There is no
stack detection, download, toolchain/dependency installation or build execution.
`install`, `reference` and global `uninstall` neither install nor remove project
packs. Core skills remain in `skills/`; pack sources ship in `stack-packs/`.

`add` and `remove` also accept mixed lists such as `add maya react`. All names
and pack destinations are checked before any specialist writes. The current
directory is the project boundary; the command does not search upward for a
different root. Pack writes refuse HOME, canonkit's own checkout and symlinks or
junctions below the canonical project boundary.

The project receipt `.canonkit/stack-packs.json` records fixed file IDs and
installed hashes, independently of the global install manifest. Keep it with
the installed copies: without it, an existing destination is an untracked
collision and is preserved. The receipt contains instruction-file metadata,
not credentials or machine-specific absolute paths. Do not share or version
temporary lock, recovery-lock or staging files.

Repeating `add` is idempotent when current and updates tracked, unchanged copies.
A locally edited copy or an untracked destination causes an install/update
conflict before writes. `remove` deletes only tracked files matching their
recorded hashes; it may remove an intact copy while preserving an edited one,
retain the latter's receipt and exit nonzero. Unrelated extra files remain and
do not make an otherwise completed removal fail.

`list` reports `installed`, `absent`, `partial`, `locally modified`,
`untracked/collision` or `partial (pending)` without writing or recovering state.
An installed pack may be from an older package; repeat `add` to update it.

Mutating commands serialize through a project lock and record pending intent
before changing each file. A retry recognizes the before/after bytes and
recovers interrupted work; a conflicting third state is preserved for manual
resolution. A stale lock is recovered only when its process is no longer alive;
an unrecognized or stranded recovery lock requires inspection. `--dry-run`
changes no files or directories and refuses a lock or pending operation instead
of recovering it. No transaction or rollback of legacy specialist writes is
promised for a mixed request that fails during execution.

## Global reference blocks and skills

They already run as part of `install`. Standalone, for when you edited a block
without touching any agent:

```bash
npx canonkit reference
```

It syncs the shared roster and one block for each selected runtime: **three
blocks** for the default Claude Code and Codex install, four with OpenCode too.
Each runtime reads different things:

| Repository file | Goes to | Read by | Content |
| --- | --- | --- | --- |
| `reference/agents-block.md` | `~/AGENTS.md` | Codex and Claude Code | the whole team: who exists, blocking authority, HIGH routing, dispatch rules |
| `reference/routing-block.md` | `~/.claude/CLAUDE.md` | Claude Code | only what is specific to Claude: the pointer to `~/AGENTS.md` and the hooks' `[ENFORCED]` rules |
| `reference/codex-block.md` | `$CODEX_HOME/AGENTS.md` | Codex | the pointer to `~/AGENTS.md`, generated model and effort, and the hook's two `[ENFORCED]` deny gates once wired |
| `reference/opencode-block.md` | `~/.config/opencode/AGENTS.md` (`$XDG_CONFIG_HOME/opencode` if set) | OpenCode | the pointer to `~/AGENTS.md`, model taken from the session, and the plugin's two `[ENFORCED]` deny gates once wired |

Alongside the blocks goes the `orchestrate` skill (`skills/orchestrate/SKILL.md`),
which holds what only matters at orchestration time: the rationale for naming
model and effort on every dispatch and the Integration Review procedure. The
`AGENTS.md` keeps one always-loaded line per rule, pointing to the skill, so the
rule does not vanish when the skill is not loaded. The skill is installed in
`~/.claude/skills/orchestrate/` (Claude Code) and in `~/.agents/skills/orchestrate/`
(Codex reads skills from `$HOME/.agents/skills`, per OpenAI's official skills
documentation). A diverged copy is preserved as `<file>.local.bak` before being
overwritten; existing backups stay intact and the next gets `.local-1.bak`,
`.local-2.bak`, and so on. Core agents, hooks and dashboard files have the same
protection. Edited OpenCode plugins are backed up under `~/.canonkit/backups/`,
outside the auto-loaded `plugins/` directory. The installer copies every file in the skill's folder, not only
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

The `learning-loop` skill investigates mistakes on demand and produces a
sanitized proposal for improving canonical instructions or project configuration.
Its template travels with the skill. General contributions use an optional,
user-reviewed GitHub issue, without a required duplicate local record or prior
issue search. Incorporation requires the concrete diff, applicable validation and
authorization. It does not inject lessons at session start or apply changes
automatically; see [learning from mistakes](learning-loop.md) for contribution,
update and review steps. Reinstall the relevant source/package version to update
shipped instructions; local `canonkit.json` tuning needs no reinstall.

`AGENTS.md` is runtime-neutral and is the only definition of the team. The
routing block keeps only what is Claude Code mechanics (hooks and what they
enforce) and only points to `~/AGENTS.md`, without `@`: projects live under a
folder that contains `AGENTS.md`, Claude Code already loads it as an ancestor, and
an import would load it twice. The block carries no team table of its own.

The double load was observed, not assumed: on 2026-10-16 a real session on Windows
showed `~/AGENTS.md` loaded once through the import, resolved as `C:\...`, and once
as an ancestor, resolved as `c:\...`. The paths differed only in drive-letter case,
which probably defeats the harness's duplicate check, so the import was dropped.

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
forwarder. `--wire-hooks` updates the global settings, but keeps the forwarder
because other projects cannot be enumerated. Its updates are tracked and its
previous bytes are backed up. Uninstall retains Claude's runtime while that
forwarder remains. Activity history keeps the existing move/merge migration and
is always preserved by uninstall.

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

```bash
npx canonkit uninstall --dry-run       # preview all recorded harnesses
npx canonkit uninstall --codex         # only the recorded Codex installation
npx canonkit uninstall                # all recorded harnesses; no install defaults/menu
```

Uninstall uses the manifest, not filenames alone. It detaches owned configuration
before removing executable files. Unrelated settings, handlers, matchers and
permission rules stay; it never restores a whole old configuration over later
changes. Shared roster/skills stay until their last recorded harness is removed.
Use the same `HOME`, `CODEX_HOME` and `XDG_CONFIG_HOME` as the installation.
A changed root is reported and preserved, never followed from a saved path.
Global tracking refuses symbolic links/junctions in destination paths, including
a linked `HOME`; use physical installation roots. It does not replace or follow
an instruction-file symlink to an unapproved target.

Unchanged owned files are removed individually; edited owned files first get an exclusive
`.local.bak` (numbered if necessary). A managed block is removed between its exact
markers, preserving every byte outside, including BOM, whitespace and mixed line
endings. Edited blocks are backed up first. Missing artifacts are safe to retry;
duplicate or incomplete markers stop removal of that harness. Only empty artifact
subdirectories are removed. Instruction/configuration files can remain empty.
Artifacts recorded as `observed` remain intact, including edits, without creating
a backup or removing their content.

Backups can contain secrets. They are private (POSIX permissions, restricted DACLs
on Windows), never overwritten, and retained after uninstall, along with private
snapshots and the manifest. Configuration changes also get dated backups beside
the configuration file. Activity history, project specialists/packs/configs, external
tool data and `~/.agents/<core>.md` leftovers are preserved.

Some wiring needs a manual step. Codex groups/handlers stay if removing them would
shift another hook's trust index; manually remove them and review `/hooks`, then
retry. OpenCode rules that install moved rather than appended stay until their
original order can be resolved manually. Preexisting or edited wiring, wrappers,
known project references, legacy forwarders and invalid configuration can also
keep a harness and its runtime intact. Other projects are not scanned. Removing
OpenCode's block leaves its instruction file in place, so it does not silently
switch back to Claude's fallback rules.

Exit status is 0 when selected tracked claims were handled, including observed
files that were preserved; 1 means manual cleanup or a retained harness remains.
Other selected harnesses can still be removed. Retry after resolving the reported
condition. An interrupted write has a persistent intent: the next real command
checks the actual before/after hashes and recovers it. Conflicting bytes, an
unknown manifest version, an active lock, or an ambiguous state stop changes.
`--dry-run` writes no files or locks and starts no subprocesses; pending recovery
must be resolved by a real command first.

**Upgrading from 2.2 or earlier:** there is no earlier manifest to infer ownership
from. Uninstall reports manual cleanup and removes nothing without a manifest.
Reinstalling with this version records identical preexisting artifacts as
`observed`, and preserves them on uninstall. Artifacts actually replaced by that
installation have their previous content backed up and are tracked as `modified`.
Identical preexisting wiring remains observed too, so its runtime can require
manual cleanup. There is no automatic adoption or force-delete option.

### Manual cleanup for pre-manifest installations and reported leftovers

Inspect and remove what the
table under [Core, at user level](#core-at-user-level) lists for the runtimes you
installed:

- the agent files canonkit owns in `~/.claude/agents`,
  `$CODEX_HOME/agents` and `~/.config/opencode/agents` (only the 10 core names; your
  own agents there are untouched by canonkit and should stay);
- if you upgraded from 2.0, the leftover `~/.agents/<agent>.md` copies, one file
  at a time as described in
  [Upgrading from 2.0](#upgrading-from-20-leftover-agentsmd); never the folder or a glob;
- the managed blocks between the `agent-team-config` markers in `~/AGENTS.md`,
  `~/.claude/CLAUDE.md`, `$CODEX_HOME/AGENTS.md` and `~/.config/opencode/AGENTS.md`;
- the `orchestrate`, `context-tune` and `learning-loop` folders in `~/.claude/skills` and
  `~/.agents/skills` (Codex and OpenCode read the latter);
- `~/.claude/hooks/canonkit-hook.js` and, if you upgraded from `meu-time`, the
  `meu-time-hook.js` forwarder next to it, after checking and updating references
  in the relevant global/project settings; other projects are not enumerated;
- the canonkit hook entries in `~/.claude/settings.json`. Remove them by hand: the
  `.bak` that `--wire-hooks` wrote is a fallback, and restoring it also undoes any
  change you made to `settings.json` after it was written;
- if you wired Codex: `$CODEX_HOME/canonkit/` and the `canonkit-codex.js` group in
  `$CODEX_HOME/hooks.json` ([Codex hook](#codex-hook---wire-hooks));
- if you wired OpenCode: `plugins/canonkit.js`, `canonkit/` and the two ask rules
  in `opencode.json` `permissions`, all under `~/.config/opencode` (or
  `$XDG_CONFIG_HOME/opencode`) ([OpenCode plugin](#opencode-plugin---wire-hooks));
- the dated `.canonkit-<timestamp>.bak` copies beside `settings.json`,
  `hooks.json` and `opencode.json`, once you no longer need them: each holds the
  whole file, secrets included;
- `~/.claude/canonkit-dashboard/` and, if you no longer want the history,
  `~/.claude/canonkit-activity/`;
- per project: `npx canonkit remove <name>` for each specialist,
  `npx canonkit tool remove <name>` for each tool, and `.claude/canonkit.json` if
  you created one. `tool remove` only takes the tool out of `AGENTS.md`; what the
  tool's own setup wrote (`openspec/`, `graphify-out/`, its skills and git hooks)
  stays — see [tools.md](tools.md) for how to undo each.

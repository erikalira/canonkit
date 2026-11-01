# Hooks and gates

The routing block promises `[ENFORCED]` gates: confirmation on `git commit`,
blocking of git hook and signing bypasses, blocking of secrets, and the
definition-of-done gate on `Stop`. What each gate
says and what to do when it fires is in the README
(["When a gate fires"](../README.md#when-a-gate-fires)); this page is how the hook
is wired, how it fails, and how a project tunes which paths count.

Claude Code has the full hook. Codex has the two deny gates, and OpenCode has the
same two through a plugin, plus two permission asks (see Codex and OpenCode below).
Everything on this page outside that section is about Claude Code.

## Codex and OpenCode

Codex and OpenCode 2 each get an adapter that runs the same core as Claude Code
(`canonkit-hook.js`, copied beside the adapter), and `--wire-hooks` wires it. What
each harness does with each gate:

| Gate | Claude Code | Codex | OpenCode |
| --- | --- | --- | --- |
| `git-bypass`: `--no-verify`, `--no-gpg-sign`, `-c core.hooksPath=...` on git | deny | deny | deny |
| `secret-block`: an obvious secret written to a file | deny | deny | deny |
| `git`: confirm before `git commit` / `git push` | ask | by judgment | by judgment, plus a permission ask on the command as typed |
| `secret-ask`, `high-risk-surface`, `perf-budget`: confirm an edit | ask | by judgment | by judgment |
| `definition-of-done`: Stop without an independent reviewer | block | not offered | not offered |
| `context-size`, `dispatch-log` | yes | not offered | not offered |

"By judgment" means the adapter lets the call through and the rule holds only as
text in that harness's block. Codex and OpenCode write no activity log, so the
dashboard and the dispatch metrics are Claude Code's alone.

The `[ENFORCED]` rules in `reference/codex-block.md` and
`reference/opencode-block.md` are held to this page by
`scripts/check-enforced.mjs`: each one must name a gate the adapter enforces, and
a harness with `[ENFORCED]` rules needs a `Verified on` row below, a real run in
which the gate denied.

| | Harness | Version | OS | Date | Seen denying |
| --- | --- | --- | --- | --- | --- |
| Verified on | codex | codex-cli 0.166.0 | Windows 11 Pro 10.0.26300 | 2026-10-30 | `git commit --no-verify` (Bash); `apply_patch` adding a file with an AWS-key-shaped value |
| Verified on | opencode | opencode v2.1.4 | Windows 11 Pro 10.0.26300 | 2026-10-31 | `git commit --no-verify` (shell, in the main session and a subagent); `write` of a file with an AWS-key-shaped value |

What `--wire-hooks` writes for each harness, and how to remove it by hand, is in
[install.md](install.md#codex-hook---wire-hooks).

### Codex

The hook is one `PreToolUse` group in `$CODEX_HOME/hooks.json` (`~/.codex` when
`CODEX_HOME` is not set), matcher `Bash|apply_patch`, running
`node "<CODEX_HOME>/canonkit/canonkit-codex.js"`. A shell call is gated as one
command. An `apply_patch` call is gated once per file it adds or updates, on its
`+` lines, and a `*** Move to:` destination counts as a path of its own. The first
deny wins: Codex shows "Blocked by hook" with canonkit's reason, and the call does
not run.

**Trust.** Codex skips a new or changed hook until you approve it in `/hooks`,
and install says so when it changes the group. The trust covers the command, not
the files it runs: canonkit keeps the command fixed, so you trust it once and a
later install that refreshes `canonkit/` asks nothing. The reverse is also true:
code swapped into `$CODEX_HOME/canonkit/` behind a trusted command runs without
review, as Claude Code's hook in `~/.claude/hooks/` does. `doctor` comparing those
files byte for byte with the package is what catches it.

**Fails open, silently.** If the adapter cannot run (a missing
`canonkit-hook.js`, say), it writes one line to stderr and exits 0, and Codex shows
nothing. Run `npx canonkit doctor` after an install or an upgrade: it is the only
place a broken Codex hook shows up.

### OpenCode

OpenCode 2 or later only. The plugin, `plugins/canonkit.js`, registers on
`execute.before` and loads `canonkit/canonkit-opencode.js`. `shell` is gated as
one command; `write`, `edit` and `patch` are gated as the files they write (`edit`
and `patch` go through the same code as `write`, but were not seen in a real
session: the model never chose `edit`, and `patch` is offered to GPT models only). A deny
throws, so the tool call fails with canonkit's reason. A subagent's calls are
gated too: the plugin sees the child session's own tool calls. Any other error is
swallowed, so the plugin fails open: a missing core makes it register nothing,
with one warning that shows only under `opencode --print-logs`. `opencode plugin
list` does not show the plugin (it lists package plugins only). As with Codex,
`doctor` is where a broken install shows up.

OpenCode has no trust step: whatever is in `plugins/` and `canonkit/` runs when
OpenCode starts.

**The two asks are config, not a gate.** A plugin cannot ask, so the prompt
before `git commit` and `git push` is two `permissions` rules in `opencode.json`.
They are pattern-limited:

- they match the command as typed: `git -c user.name=x commit` does not match
  `git commit *` and runs without a prompt;
- OpenCode applies the last rule that matches, so a rule added after them can
  silence them; `doctor` WARNs when that happens in the global `opencode.json`, but
  does not read a project's own OpenCode config;
- `opencode run` rejects an ask outright, and `--auto` approves it.

### Known gaps

- **OpenCode `execute` and MCP tools are not gated.** `execute` (Code Mode) reaches
  no gated tool on v2.1.4, but an MCP server that exposes a shell or a file write
  is reached through it, or directly, without the plugin seeing it. The OpenCode
  block says so.
- **No confirm gates.** Neither adapter can ask, so the confirm before
  `git commit`, `git push` and edits to gated files holds by judgment, except for
  OpenCode's pattern-limited asks.
- **No Stop gate.** "No self-merge on HIGH risk" holds by judgment in both: no
  hook checks that a reviewer ran after the last edit.
- **`doctor` is not target-aware yet.** A Codex- or OpenCode-only install still
  gets `FAIL` rows for the Claude Code agents, block and hook.

## Wiring

The gates only exist while `~/.claude/hooks/canonkit-hook.js` is on disk **and**
is referenced by `settings.json`. `install` copies the file; registering it in
`settings.json` is, by default, only **reported**, with the JSON ready to paste.

`npx canonkit install --wire-hooks` registers the hook in `~/.claude/settings.json`
(a dated backup `settings.json.canonkit-<timestamp>.bak`, only when something
changes; nothing besides the hook entries is changed; `settings.local.json` is
never written). To undo, restore the `.bak`. It holds the same values as
`settings.json`, `env` included: keep it out of a dotfiles repository.
`npx canonkit doctor` checks the installation (agents, blocks, hook, registration,
log, forwarder, config), only reads, and exits with 1 if any check is `FAIL`.

The split is deliberate. `settings.json` is yours — it carries permissions, env
and model choice that this installer does not rewrite unless you ask. A hook on
disk that no event references, on the other hand, does nothing and does not
complain, which is the worst possible failure mode for a gate: everyone keeps
believing it runs.

## What the git gates read

Both shells (Bash and PowerShell) go through the same check. The command is split
into tokens and into its separate commands (a new line, `;`, `&&`, `|`, `{ }`; line
continuations joined, comments dropped, a `$( )` or `( )` read as a command of its
own). That way `git` is found behind global options (`-C dir`, `-c key=value`),
env assignments, wrappers and shell keywords (`sudo -u x`, `timeout 60`, `then`,
`do`, `!`), `& 'C:\...\git.exe'`, or a preceding `npm test &&`.

**Confirm** on any `git commit` or `git push`. A plain text match is kept next to
the parsed one, so `bash -c "git commit ..."` is still confirmed.

**Block** (deny, no confirm offered) when the command skips the repository's hooks
or signing:

| Flag | Subcommands |
| --- | --- |
| `--no-verify` (and git's abbreviations, `--no-veri`) | `commit`, `push`, `merge`, `pull`, `am`, `rebase` |
| `-n`, alone or in a cluster (`-nm`) | `commit` only; in `push`, `-n` is `--dry-run` |
| `--no-gpg-sign` | `commit`, `merge`, `pull`, `am`, `rebase`, `cherry-pick`, `revert`, `commit-tree` |
| `-c core.hooksPath=...` | the hook-running subcommands above |
| `-c commit.gpgsign=false` (`0`, `no`, `off`) | the signing subcommands above |

It is a deny and not a confirm because the usual way in is a reflex: a pre-commit
hook fails and `--no-verify` is the shortest way past it. A confirm that shows the
flag gets approved on autopilot. The fix is whatever the hook reported. If you
really mean to skip it, run the command yourself (in Claude Code, prefix it with
`!`).

A commit message is data. Text inside `-m "..."`, a heredoc
(`-m "$(cat <<'EOF' ... EOF)"`) or a PowerShell here-string (`-m @'...'@`) is never
read as a flag, and neither is anything after `--`.

This is a tripwire for the reflex, not a sandbox. It does not see `HUSKY=0` or
`SKIP=...` in the environment, a persistent `git config commit.gpgsign false`, a
git alias (`git ci -n`), `git am -n`, PowerShell block comments (`<# ... #>`), or a
command wrapped in `bash -c "..."`, `pwsh -Command "..."` or `cmd /c`. The last one is
still confirmed as a commit or push, so you see the whole command.

## Who counts as a reviewer for the Stop gate

The definition-of-done gate is satisfied when, **after the last gated edit**, one
of these agents was dispatched, or resumed with a message (`SendMessage`): `quinn`,
`gard`, `archie`, `perry`, or one of the project reviewers the hook knows
(`ws-contract`, `multiplayer-isolation`, `next-perf-reviewer`). A name with a
suffix counts (`gard-strict` is Gard; `gardener` is not). A reviewer's own probes
outside the project are not counted as edits.

## It fails open

`main()` is wrapped in a `catch` that exits with 0, so a syntax error never locks
up your session. It just turns every gate off, silently. That is why
`validate.sh` runs `node --check` on every `hooks/*.js`, and why `doctor` runs it
on the installed copy. The Codex and OpenCode adapters fail open the same way
(see [Codex and OpenCode](#codex-and-opencode)).

Editing this file in place was always the only workflow it had, and that is how
it came to exist in a single copy, on a single machine. Versioning it inverts the
source of truth, so the installer protects that case: if an installed copy
diverges from the repository's, it is preserved as `<file>.local.bak` before
being overwritten. That holds for every copy: `canonkit-hook.js` is now installed
in up to three places (`~/.claude/hooks/`, `$CODEX_HOME/canonkit/` and
`~/.config/opencode/canonkit/`), and an edit made in one of them does not reach
the others.

## The core: `evaluate(evt, env)`

The gates live in one pure function, `evaluate(evt, env)`, in
`hooks/canonkit-hook.js`. `main()` is only the Claude Code adapter: stdin,
`normalizeClaude`, `evaluate`, then it writes the log lines, runs the
context-size reminder on `UserPromptSubmit`, prints the answer and exits. This
is an **internal contract** that the Codex and OpenCode adapters
(`canonkit-codex.js`, `canonkit-opencode.js`) build on. It is not a public API:
each adapter is installed beside its own copy of `canonkit-hook.js` from the same
package, so nothing outside the package calls it, and the shape below may change
between minor versions (the tests in `test/hook-core.test.js` are what hold it).

- `evt` is the normalized event: `event`, `tool`, `toolInput`, `cwd` (required),
  `session`, `agentId`/`agentType` (set only on a subagent's events), the Stop
  fields and the PostToolUse fields. `normalizeClaude(input, fallbackCwd)` builds
  it from Claude Code's hook input.
- `env` is everything else it may know about the machine: `{logDir, legacyLogDir,
  projectDir, home}`. The core never reads the process environment or looks up
  the home directory itself.
- It returns `{decision, kind, reason, logs}`. `decision` is `allow`, `ask`,
  `deny` or `block`; `kind` is one of `GATE_KINDS` or `null`; `logs` is a list of
  `{file, record}` that the adapter appends under `logDir`.
- `CLAUDE_GATE_MODES` declares, per kind, what the Claude adapter does with it:
  `enforce` (the harness acts on the decision), `text` (surfaced as text, the
  model decides) or `off` (not offered). Another adapter declares its own map in
  its own file.
- It **fails open** by itself: an error is an `allow` that keeps the logs recorded
  before it.
- Denies (git bypass flags, blocked secrets) are decided **before**
  `.claude/canonkit.json` is read, so a project config can never loosen them.

It writes nothing; it only reads (the activity log and the project config).

The context-size reminder is not part of the core. It parses Claude Code's
transcript and keeps its band state in `context-bands.json` in `logDir` (the
reminder is only given when that state persisted, or it would repeat on every
turn), so the Claude adapter runs it after `evaluate`, in its own `try`, and
logs its gate line after the prompt line. `context-size` stays in `GATE_KINDS`
because it is still a decision kind with a mode; `evaluate` never returns it.

## Events it must be registered for

In Claude Code, registration is checked **per event**: `PreToolUse`, `PostToolUse` (matcher
`Agent|Task|Read|Grep|Glob|Bash|PowerShell`), `SubagentStop`, `UserPromptSubmit`
and `Stop`. A hook wired to only some of them works halfway — the gates fire, so
nobody goes looking for the dispatch metrics that never get recorded.

What the hook records on those events is described in
[telemetry.md](telemetry.md).

## Per-project configuration: `.claude/canonkit.json`

Which paths count as a HIGH-risk surface or a performance budget is adjustable per
project in `.claude/canonkit.json`:

```json
{
  "version": 1,
  "highRisk": { "include": ["src/billing/**"], "exclude": ["src/domain/contracts/**"] },
  "perfBudgets": ["perf/thresholds.yml"]
}
```

Editing `canonkit.json` itself is a gate.

### Where it is read

In the nearest folder walking up from the session's cwd, stopping at
`CLAUDE_PROJECT_DIR` when the cwd is inside it (a config above the repository does
not apply to it) and, outside it, below home (`~/.claude/canonkit.json` is not a
project config); if none of them has the file, in `CLAUDE_PROJECT_DIR`.

The nearest file wins, whole: a nested one (a submodule, an example) replaces the
project's while the cwd is inside it — with one exception that only adds gates:
when the nearest file is below `CLAUDE_PROJECT_DIR` and the project has its own,
the project's additive lists (`highRisk.include`, `perfBudgets`) apply too,
matched against the path relative to the project. The project's `exclude` never
reaches the nested folder, and the nested `exclude` never cancels the project's
`include`.

In a worktree with its own config the same rule holds: the project's `include`
keeps adding gates, but anchored globs (with `/`) are matched against the path
relative to the main checkout and do not match inside the worktree; only globs
without `/` reach them. The cwd comes first in the search precisely because, in a
worktree, `CLAUDE_PROJECT_DIR` is the main checkout, where the worktree's anchored
globs would never match.

Globs match the path relative to the folder where the file is. Only a regular file
of up to 64 KiB is read, and only the first 100 entries of each list: a hook that
hangs or runs out of memory fails open. `version` is optional and only `1` is
read: any other version = defaults. Unknown keys are ignored. An invalid config =
defaults — a typo never turns a gate off.

### Glob dialect: gitignore-like, not gitignore

A glob with `/` matches the path relative to the project; without `/`, the file
name at any depth. `*` and `?` stay within one segment; `**` as a whole segment
crosses segments (anywhere else it is a `*`). A trailing `/` = everything below
the folder (`dir/` = `dir/**`). There is no `!` and no `[...]` (they are
literals). Case-insensitive. Before matching, every path is normalized (`\`, `//`,
`./`, `..`, NTFS stream suffix, Git Bash `/c/...`), so different spellings of the
same file give the same result.

### What `exclude` cannot reach

`include` beats `exclude`. A repository commits this file and whoever clones it
never goes through its edit gate, so `exclude`:

- never silences the secret check on content;
- never silences paths that hold credentials (`.env`, `secret`, `credential`,
  `.npmrc`, `github_token`, `*.pem`, `*.key`, `*.p12`, `*.pfx`,
  `id_rsa`/`id_ed25519`/`id_ecdsa`, `kubeconfig`, `.pgpass`, `*.tfvars`,
  `*.tfstate`...);
- never silences the strong terms (`auth`, `jwt`, `secret`, `credential`, `rbac`,
  `schema.prisma`, `migrations` in code...) — only the ambiguous words
  (`sessions`, `contracts`, `permissions`, `gateway`, `login`) and the token list.
  That is why `migrations` in prose (`docs/migration-guide.md`) does not count, and
  the word `author` (`AuthorCard`, `authors/`, `authoring/`, `AUTHORS.md`) is not
  `auth` — `authority`, `authorize`, `AUTHORITY` and `authOrRedirect` are;
- drops catch-all globs, judged by what they match, not by how they are spelled
  (`*`, `**`, `*.*`, `?*`...), and judged together: the glob that, added to the
  previous ones, would make the list match almost everything is dropped (`*.ts`,
  `*.go`, `*.rb`, `*.py`).

When an `exclude` silences a gate, the hook records an `excluded-by-config` event
(with the glob) that the dashboard shows and the Stop gate ignores.

### `perfBudgets`

`perfBudgets` only adds to the default list (lighthouserc, size-limit,
bundlesize, bundlewatch, `budget.json`/`budgets.json`/`*.budgets.json` at any
depth, `*perf-budget*`/`*performance-budget*`, `perfBudget.json` and similar
camelCase forms right before the extension, a `-` or a `_`
(`perfBudget-prod.json`), k6 thresholds...): removing a default would be
loosening the gate, and that belongs to Perry.

The defaults ignore `.md`/`.mdx` and generated folders (`node_modules`, `dist`,
`build`...), only inside the config's folder — outside it (a sibling worktree
without its own config, a file outside the project) the path stays absolute and
the gate asks; an entry of yours in `perfBudgets` applies as written.

Budgets inside general-purpose files — `angular.json`, the `size-limit` in
`package.json`, `next.config.*`, webpack hints — are opt-in via `perfBudgets`; k6
thresholds written inline in the script are a known gap.

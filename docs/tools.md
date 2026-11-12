# Project tools: graphify and openspec

Two third-party tools complement the team: **graphify** (a graph of the code,
updated on demand by default) and **openspec** (specs and acceptance criteria in
`openspec/`). Run **from inside the project**:

```bash
npx canonkit tool add openspec      # or graphify
npx canonkit tool add graphify --with-git-hooks  # opt-in: trust every branch
npx canonkit tool add graphify --dry-run
npx canonkit tool remove graphify
npx canonkit tool list
```

## canonkit integrates, it never installs

If the binary is not on `PATH`, canonkit prints the install command with the exact
version and exits with 1, writing nothing. Install it yourself, at these versions:

```bash
npm install --global --ignore-scripts @fission-ai/openspec@1.14.0
# Windows, macOS
python -I -m pip install --user --only-binary :all: graphifyy==0.9.76
# Linux and WSL (Debian/Ubuntu): there is no `python`, and PEP 668 makes pip refuse
# --user. The `cd ~` keeps a project folder off Python's import path (pipx has no -I);
# the parentheses run it in a subshell, so your terminal stays in the project.
sudo apt install pipx && pipx ensurepath
(cd ~ && pipx install graphifyy==0.9.76 --pip-args="--only-binary :all:")
```

> **graphifyy has two y's.** `graphify` with one y on PyPI is a different package.

The binary is only looked up on `PATH`, and canonkit ignores every relative,
nonexistent or in-project entry (by `realpath`, so links into the project count).
A binary found only inside the project (an activated `.venv`, `node_modules/.bin`)
gets a message saying exactly that, not "not on PATH". That includes
`<project>/node_modules/.bin`, which `npx canonkit` puts first: a local openspec
install is never used, and that is why the printed command is the global one. The
child process gets the same filtered `PATH` and, on Windows,
`NoDefaultCurrentDirectoryInExePath=1`, so that a binary planted in the project
(a `node.exe`, for example) is not executed by the tool's shim.

**On WSL, only the Linux side counts.** `tool add` and `tool list` ignore a binary
that lives on a Windows drive, such as an npm shim in `%APPDATA%\npm` reached
through interop: it is treated as not installed (`tool add` exits 1 and writes
nothing; `tool list` shows "not on PATH"), and the message prints the pinned install
command plus a line naming the ignored Windows copy. Drives are read from `/proc/self/mounts` (`drvfs`, or `9p` with
`aname=drvfs`, under any automount root; `/mnt/wsl` and `/usr/lib/wsl/drivers` do
not count). A symlink from a Linux folder into a Windows drive is ignored too.
`tool list` keeps its columns and adds a footnote naming Windows-only copies it
ignored. The same filter applies to the `PATH` of the tool's own steps, so Windows
programs (`explorer.exe`, `clip.exe`, `code`) are not on it; if nothing is left,
`PATH` is left unset, never empty (an empty `PATH` means the current directory, the
project). If a Windows copy comes earlier in your `PATH` than the Linux one, `tool add`
prints a non-blocking note: agents and shells that run bare `<bin>` get the Windows
one. To stop that, set `appendWindowsPath=false` under `[interop]` in
`/etc/wsl.conf`; canonkit only prints this and never edits `wsl.conf` or your `PATH`.
This is hygiene, not a defense against hostile binaries (see the ADR). `git`, the
security checks and model discovery still resolve binaries as before.

> **Claude Code sandbox.** A tool installed under `~/.nvm` or `~/.local` can be invisible
> to sandboxed Bash commands when the sandbox denies reading your home directory
> (`sandbox.filesystem.denyRead`), and `canonkit tool add` then reports it missing.
> That is a user-side setting: re-allow the folder with `sandbox.filesystem.allowRead`
> in your user settings, `~/.claude/settings.json`. For the defaults used here (nvm for
> Node, pipx for graphify), allow only what you use:
>
> ```json
> "sandbox": { "filesystem": { "allowRead": ["~/.nvm", "~/.local/bin", "~/.local/share/pipx"] } }
> ```
>
> `~/.local/bin/graphify` is a symlink into pipx's venvs, so the pipx folder must be
> readable too, or the link looks broken inside the sandbox. Its location depends on
> the pipx version and distribution (`~/.local/share/pipx` on Ubuntu 24.04, or
> `~/.local/pipx`): run `pipx environment --value PIPX_LOCAL_VENVS` and allow the
> folder above `venvs`.
>
> Another version manager (fnm, volta, asdf) has its own folder: add that one instead of
> `~/.nvm`. A Node installed system-wide (apt, NodeSource, `/usr/local`) needs nothing,
> unless the npm global prefix is inside your home (`npm config get prefix`, for example
> `~/.npm-global`): then allow that folder, because `openspec` is installed there. A project
> `.claude/settings.json` is not enough: a repository file cannot re-allow a path that a
> higher level denies. canonkit never writes it: the path is yours and it is a
> permission. The setting affects sandboxed Bash only and applies to the next command;
> see the Claude Code sandboxing docs.

With the binary present, `tool add`:

1. shows the absolute path, the version (with a warning if it differs from the pin
   — it never upgrades), the exact commands and the files that will be touched;
2. asks `y/N` (`--yes` skips; with no terminal and no `--yes`, it does not run);
3. runs the tool's own setup (`openspec init --tools claude,codex`;
   `graphify update .`; with `--with-git-hooks`, it first runs
   `graphify hook install`);
4. only if the setup succeeded, writes the tool's `.gitignore` block, when its
   registry entry has a `gitignore:` list (graphify does; see below);
5. last, writes the "Project tools" block into the project's `AGENTS.md`
   (markers `agent-team-config:complements:*`).

`--dry-run` executes nothing, not even `--version`. canonkit never creates a
`CLAUDE.md` in the project — with one, Claude Code stops reading `AGENTS.md` — and
warns loudly if the tool's setup creates one. That is why `graphify claude install`,
any `graphify <platform> install` and `graphify extract` (which calls an LLM) are
refused. The reasoning is in
[`docs/adr/0001-tool-namespace-integrate-only.md`](adr/0001-tool-namespace-integrate-only.md).

`tool remove` takes the entry out of the block (the last one removes the block)
and prints how to undo the setup. It does not touch `openspec/`,
`graphify-out/` or the `.gitignore` block. Running `add` or `remove` twice leaves
`AGENTS.md` and `.gitignore` the same.

Raising a pin is a MEDIUM change, reviewed by Gard. Whoever published the
`graphifyy` package has a Trusted Publishing attestation that matches the declared
repository; what remained open is in the ADR.

## openspec

The 1.14.0 `init` writes `openspec/`, `.claude/skills/openspec-*`,
`.claude/commands/opsx/`, `.agents/skills/openspec-*` and openspec's own
user-level configuration (`openspec/config.json` in `%APPDATA%` or
`$XDG_CONFIG_HOME`). It sends anonymous telemetry by default: canonkit sets
`OPENSPEC_TELEMETRY=0` and `DO_NOT_TRACK=1` only on the runs it makes itself; yours
keep sending unless you set one of those variables. The version matters: an old
openspec (1.4.1) with `--tools codex` wrote prompts to `~/.codex/prompts`.

In this repository, the generated skill/command copies and local runtime
settings are ignored. Keep `openspec/config.yaml` and the canonical change
artifacts versioned; regenerate integrations explicitly with the setup above.

OpenSpec holds the durable state; canonkit applies risk, ownership, gates and
reviews; Graphify provides evidence from the code. The handoff and closing bridge
is in [OpenSpec change lifecycle](../skills/orchestrate/SKILL.md#openspec-change-lifecycle):
reuse the change, the planning root and the artifacts of the selected schema.
Scott defines acceptance, Archie records structural decisions when needed, Bob
implements, Quinn validates behavior when review is needed, and Spencer checks for
drift before a MEDIUM/HIGH close. Completion depends on current evidence and
reviews, followed by a verified applicable sync and an authorized archive in the
project's workflow. A parallel PRD, plan or spec does not replace that state. The
contract was checked against the
[schema of the pinned version](https://github.com/Fission-AI/OpenSpec/blob/v1.14.0/schemas/spec-driven/schema.yaml)
and the
[archive workflow](https://github.com/Fission-AI/OpenSpec/blob/v1.14.0/src/core/templates/workflows/archive-change.ts).

## graphify

By default, the setup runs only `graphify update .`: it installs neither Git hooks
nor a merge driver. `--yes` skips the confirmation without enabling them.
`--with-git-hooks` is accepted only on `tool add graphify` and explicitly enables
`post-commit` and `post-checkout` in `.git/hooks/`, the merge driver in
`.git/config` and `.gitattributes`, with a risk warning before the confirmation.
In that mode it **does not run** if a `post-commit` or `post-checkout` that is not
graphify's already exists, or if `core.hooksPath` is set; in that case it prints
how to chain them by hand and exits with 1. A graphify `--dry-run` does not run
that check, so it does not show that refusal. In both modes it still requires Git,
the repository root, and the checks on files that could replace the package or the
hooks' interpreter.

**Migrating existing clones:** upgrading canonkit or repeating `tool add graphify`
without the flag preserves hooks, merge driver and attributes already configured.
The command detects existing automation and warns that it stays enabled; it does
not silently turn it off. To keep/reinstall the previous behavior, use
`npx canonkit tool add graphify --with-git-hooks` after weighing the risk. To move
to manual updates, review and run `graphify hook uninstall` (it removes the marked
blocks and the merge driver), check `graphify hook status`,
`git config --get-regexp '^merge\.graphify\.'` and the `.gitattributes` diff,
preserving the project's hooks. With hook managers, also check the manual
chaining. `tool remove` still removes only the entry in `AGENTS.md`. Decision and
upstream assessment: [ADR 0002](adr/0002-graphify-git-hooks-opt-in.md).

### What gets versioned

`tool add graphify` writes this block into the project's `.gitignore`, so only
the report is committed:

```gitignore
# agent-team-config:gitignore:graphify:start
# graphify: rebuilt locally; only the ! lines are versioned. Managed by canonkit tool add graphify.
graphify-out/*
!graphify-out/GRAPH_REPORT.md
# agent-team-config:gitignore:graphify:end
```

`GRAPH_REPORT.md` is what the project block tells agents to read first, so a
fresh clone has it. Everything else is rebuilt by `graphify update .` or is
local: `graph.json` (large, rewritten on every update), `cache/`, `manifest.json`
(mtime-based), `cost.json`, dated snapshots, saved queries in `memory/`, and
`.graphify_python`, the interpreter path graphify's hooks execute — keeping it
out of git is the same protection the preflight checks for.

- A `.gitignore` that already has rules for `graphify-out/` outside the block is
  left as it is: patterns are last-match-wins, and a block appended after them
  would overrule a decision the project made (versioning `graph.json`, say).
  `--dry-run` says which case applies.
- Ignoring does not untrack. If graphify output was committed before, `tool add`
  lists it and prints the command to stop tracking it
  (`git rm -r --cached -q -- graphify-out && git add -- graphify-out`); it never
  runs it.
- To version more (`graph.json`, for teammates who query without rebuilding), add
  a `!graphify-out/graph.json` line inside the block, or replace the block with
  your own rules.

### Keeping the graph fresh

Before using a report or query as structural evidence, check
`git status --porcelain --untracked-files=normal` in the project: the check
includes the index, unstaged changes and untracked files. If the query depends on
those changes, run `graphify update .` successfully before querying the graph. A
change that is demonstrably unrelated to the question does not require a rebuild
on its own. If the graph is known to be stale for the question, update it even
with a clean status: no local changes does not prove it matches HEAD. If the check
or refresh fails, is unavailable, or freshness remains unknown, say explicitly
that the graph may be stale and check the current files. This is guidance in the
project block (option A of the roadmap), with no new status command or automatic
monitoring. The four `graphify-*` eval cases calibrate these plans with the
existing judge; they do not run a real refresh.

### Before enabling the git hooks

> **Enable graphify's hooks/merge driver only where you trust every branch you
> check out.** The hooks and the merge driver start Python at the repository root
> (`-c` / `-m graphify`), and Python looks there first: a committed `graphify/` or
> `graphify.py` would run on commit, checkout or merge, before any review. The
> hooks also execute the interpreter named in `graphify-out/.graphify_python`.
> canonkit checks this only **once, at `tool add`** (it refuses if `graphify/` or
> `graphify.py` exists at the root, or if that file is versioned) and warns in the
> confirmation. Afterwards, a branch can bring a `graphify.py`, a module graphify
> imports (`networkx.py`, for example) or a `.pyc`/`.pyd`/`.so` without source, and
> the next checkout, commit or merge runs it with no signal at all. Only graphify
> can fix this (starting Python with `-I`/`-P`); reporting it upstream is open.

- The post-commit rebuild and the merge driver (which runs graphify on every
  merge) are third-party code **outside** canonkit's gate: the `git commit` is
  confirmed, what the hook does afterwards is not (see the warning above about what
  Python imports).
- graphify rewrites the skill copies it installed earlier at user level (for
  example `~/.claude/skills/graphify`) when a skill's stamp is older than the
  installed package: once per graphify upgrade, on any command (`--version`
  included), not on every run. On every run it makes, canonkit passes
  `GRAPHIFY_NO_AUTO_REFRESH=1`, graphify's documented option to avoid that. A
  graphify run outside canonkit (your shell, the hooks, agents running
  `graphify query`) still does it, unless `GRAPHIFY_NO_AUTO_REFRESH=1` is in your
  own environment.
- Git hooks are **per clone**: new clones only get them with
  `tool add graphify --with-git-hooks`.
- `GRAPH_REPORT.md` stays versioned (see [What gets versioned](#what-gets-versioned)),
  so with the hooks it gets dirty on every commit.
- canonkit never installs graphify's Claude hook. If you install it yourself, it
  and canonkit's hook both fire on `PreToolUse` with no guaranteed order; do not
  count on one running before the other.

## Experimental handoff checks

### Laya

Laya's MCP provides typed advisory signals. Use `laya_predict` with independent
`noul` questions for acceptance criteria and validation planning before dispatch,
then reported tests when applicable and review status after return.
Consult it selectively on HIGH handoffs when a concrete semantic uncertainty
about omissions warrants another signal and the MCP is available. Skip when
direct inspection suffices; reuse advice while task context and evidence are
unchanged. Signals prompt inspection of the source; high scores do not prove
completeness or establish that tests or review occurred.
See [the procedure](../skills/orchestrate/laya-handoffs.md) for request examples,
long-text and large-candidate tools, language hints, batching and fallback.

Maintainer direction on 2026-11-09: adopt this in real work rather than requiring
more synthetic evaluations. Quality takes priority over latency. Record a brief
useful finding, false alarm or missed problem in existing task evidence when
encountered; do not add a usage database, transcript archive or reporting quota.
Existing synthetic audits are historical, version-specific evidence, not a
prerequisite to practical use or a guarantee of real-task accuracy.

The earlier rejection recorded here concerned file selection/token savings.
Maintainer correction on 2026-11-09: Laya was not actually called; the rejection
was an adoption/integration failure, not a measurement of model quality. The
previous aggregate claims do not establish Laya efficacy without invocation
evidence and must not be used as a quality verdict.

For consultations actually selected, record decision-call evidence for the relevant
phase, with failures, abstentions and the orchestrator's response visible. It makes no
token-savings or accuracy claim. Laya remains advisory; direct validation and
independent HIGH review remain required. CanonKit does not install or configure
the server, and missing/failed calls fall back to the normal manual check with
an explicit status.

Historical integration smoke test on 2026-11-09 (previous three-label procedure):
two real `laya_decide` calls on a synthetic
HIGH authentication brief/return completed (`english`, CPU, no input truncation).
Both abstained on all four fields at the experimental 0.8 threshold; reported
confidence ranges were 0.0444–0.0524 before and 0.0026–0.0051 after. Disposition:
manual check; the synthetic return lacked validation and required review.
This verifies tool invocation/schema compatibility, not automatic agent
compliance or classifier usefulness on real HIGH delegations.

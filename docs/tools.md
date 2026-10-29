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
python -I -m pip install --user --only-binary :all: graphifyy==0.9.76
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

With the binary present, `tool add`:

1. shows the absolute path, the version (with a warning if it differs from the pin
   — it never upgrades), the exact commands and the files that will be touched;
2. asks `y/N` (`--yes` skips; with no terminal and no `--yes`, it does not run);
3. runs the tool's own setup (`openspec init --tools claude,codex`;
   `graphify update .`; with `--with-git-hooks`, it first runs
   `graphify hook install`);
4. last, and only if the setup succeeded, writes the "Project tools" block into
   the project's `AGENTS.md` (markers `agent-team-config:complements:*`).

`--dry-run` executes nothing, not even `--version`. canonkit never creates a
`CLAUDE.md` in the project — with one, Claude Code stops reading `AGENTS.md` — and
warns loudly if the tool's setup creates one. That is why `graphify claude install`,
any `graphify <platform> install` and `graphify extract` (which calls an LLM) are
refused. The reasoning is in
[`docs/adr/0001-tool-namespace-integrate-only.md`](adr/0001-tool-namespace-integrate-only.md).

`tool remove` takes the entry out of the block (the last one removes the block)
and prints how to undo the setup. It does not touch `openspec/` or
`graphify-out/`. Running `add` or `remove` twice leaves `AGENTS.md` the same.

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
- `graphify-out/` must be in `.gitignore` or be versioned on purpose. In this
  repository `GRAPH_REPORT.md` is versioned and gets dirty on every commit.
- canonkit never installs graphify's Claude hook. If you install it yourself, it
  and canonkit's hook both fire on `PreToolUse` with no guaranteed order; do not
  count on one running before the other.

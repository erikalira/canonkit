# Maintaining canonkit

For whoever changes agents, blocks, skills or the installer in this repository.
Measuring whether the instructions still work is in [evals.md](evals.md).

## Editing an agent

1. Edit `agents/<name>.md` in this repository.
2. If it is core, run `npx canonkit install` (or the clone's script).
3. If it is a specialist, run `npx canonkit add <name>` again in the projects that
   use it.
4. Run `npm run validate` and `npm test`.
5. Commit.
6. Before a release that changes instructions (blocks, descriptions, an agent
   body): `node bin/cli.js install` and `npm run eval -- --runs 3`; if the body of
   an agent with a quality case changed, also `npm run eval:quality -- --runs 3`.

Syncing the global blocks is not a step, because `install` already does it.

Do not edit `~/.claude/agents`, a project's `.claude/agents/`, or the
managed block in `~/AGENTS.md` — the next install overwrites them. This repository
is the only source of truth.

## File format

```markdown
---
name: <agent-id>
description: "Use when/for <trigger>. <authority>."   # < 300 characters
tier: core | specialist
model: opus | sonnet | haiku
---

You are <Name>, the agent team's <domain> agent.

## Mission
...
```

The `name` must match the filename. The `description` is what the delegating
model reads when deciding whether the agent fits a request, so it should say what
the agent owns and end with a short "Not for ..." routing boundary. Keep the
entire description line below 300 UTF-8 bytes. The `model` must be declared in the file
itself: stated anywhere else — a table, a note, a habit — it is an intention, and
the runtime quietly uses the session default instead. The `tier` decides where the
agent installs, and is read by every installer; it lives here for the same reason
the model does — a fact kept beside the thing it describes cannot drift from it.

The declared model is a **floor for the agent's normal work**, not a ceiling. A
dispatch may override it for a task that is clearly an outlier — up for a
structural or irreversible decision, down for a mechanical pass — and says so when
it does. Calibrate the floor on the work the agent usually gets; a floor set by
the hardest imaginable task makes every agent expensive for no gain.

The conventions every agent body follows are in
[team.md](team.md#conventions).

## Product-neutral examples

Agents and skills install in every project of whoever uses canonkit, so their
examples stay domain-free: an example taken from one product (its entities, its
stack, its business rules) reads as a rule in every other project. The team was
once cleaned of the domain it grew up in; a new example that names a product or
its flows is that drift coming back. Domain knowledge goes in a specialist,
installed only where it applies, or in the project's own `AGENTS.md`.

## Validation

```bash
npm run validate                # portable checks; reports Bash checks as not run
npm run validate:portable       # explicit portable mode
npm run validate:full           # complete checks, including bash -n
npm run validate -- --quiet     # failures and summary only
```

Validation is read-only and exits non-zero on a failure. Node.js and Python 3.11+
are required: Python retains the AST and TOML parser checks. The default and
portable commands run natively on Windows, Linux and macOS without invoking Bash.
They report a partial result because they do not run `bash -n`; they never count
that check as passed. Full validation also requires Bash and checks every
`scripts/*.sh` file. CI must use `npm run validate:full`.
Set `CANONKIT_PYTHON` or `CANONKIT_BASH` to select an explicit interpreter when
automatic executable discovery is unsuitable.

In PowerShell, invoke npm through `npm.cmd` if the local execution policy blocks
`npm.ps1`:

```powershell
npm.cmd run validate
npm.cmd run validate:full # requires Bash on PATH
npm.cmd run validate -- --quiet
```

The legacy `./scripts/validate.sh` entry point remains available in Bash and
selects full validation. Validation automates Virgo's protocol and checks the
conventions in [team.md](team.md#conventions):

- frontmatter — `name` matches the filename, `model` and `tier` declared and
  valid, `description` opening with "Use ...", including "Not for ..." and under 300 UTF-8 bytes (Claude
  Code lists the description of every installed agent on every turn: it is the
  delegation trigger, not a biography);
- structure — Mission, Responsibilities, Collaboration, Expected Output,
  authority, boundaries and risk: the team's **Risk scale** (in `AGENTS.md`) plus
  what the domain raises, or a domain-specific scale (Perry, specialists) — never a
  private copy of the generic one;
- bounded report — the Expected Output opens with the verdict, omits empty fields
  and has a line cap, because the report is re-read on every turn of whoever
  dispatched it;
- core does not name a specialist — a core agent installed in every project would,
  in most of them, point to an agent that does not exist; it points to the
  specialists the project installed;
- the veto rule — whoever declares a veto also says what to do when overruled;
- the core/specialist split — every agent declares `tier`, all have a summary line
  in   `reference/agents-block.md`, the roster lists no name without a file, and the
  roster's two sections match the declared `tier`; the README core table matches
  its names, order, ownership and authority;
- the escalation graph — no isolated core agent, and nobody escalating to a
  generic role ("the security owner") instead of a named agent;
- the roster and the routing block — every agent appears in the roster, the
  core/specialist split matches the installers, the authority column matches who
  declares a veto in their own file, the model rule matches the frontmatter, and
  the routing block points to `AGENTS.md` (without importing it) instead of
  repeating the table;
- skills cited by the blocks — every skill that `agents-block.md` or
  `routing-block.md` mentions must be shipped in `skills/`. The blocks load in
  every project of whoever installs; a skill that only exists on the package
  maintainer's machine becomes an instruction to call something that is not there;
- stack packs — `stack-packs/` matches the shared catalog, installed names are
  `canonkit-<stack>`, metadata is valid and every pack has a quality case;
- the npm package — `bin/cli.js` compiles, `files[]` includes `agents/` and
  `reference/` (the published CLI reads them at runtime, and a clone always has
  them — it is the packaging mistake that running from a clone never catches),
  `bin` points to the right file, LICENSE exists;
- Node and Python script syntax, shell-script syntax in full mode, and repository
  hygiene.

It checks the rule, not uniformity: `pipe` uses "Operational authority", `virgo`
does not classify product risk, and both pass.

The tests are separate and run the real CLI against a real filesystem, in a
throwaway `HOME`:

```bash
npm test
```

No mocks: the failure this installer can actually cause is writing the wrong bytes
into a file you already had — `~/AGENTS.md`, `~/.claude/CLAUDE.md`, a project's
`AGENTS.md` — and a mocked filesystem proves nothing about that.

`scripts/`, `test/`, `evals/` and `docs/` do not go into the npm package — the
tarball carries `bin/`, `agents/`, `reference/`, `hooks/`, `dashboard/`, `skills/`,
`stack-packs/`, `tools/`, the README and LICENSE. These checks belong to the clone.

## Stack packs

Edit `stack-packs/<stack>/SKILL.md`, not a consuming project's generated copy.
Packs can supply language/framework or design-practice knowledge. Keep each source
self-contained in one `SKILL.md` under the current lifecycle; optional knowledge
creates no owner, automatic installation or mandatory dispatch.
Its YAML name is `canonkit-<stack>`, matching the installed directory; the short
source ID is the argument to `canonkit add`. Keep pack sources outside `skills/`,
whose direct children are automatically installed at user scope.

`bin/stack-packs.js` is the single catalog and implements the project receipt,
lock and per-file pending intent. Destinations derive from that catalog, never
from paths in the receipt. New target files require a deliberate catalog and
receipt-compatibility decision; do not discard descriptors for previously owned
files. Keep project receipt logic separate from the global install manifest.

Use `test/stack-packs.test.js` for installation/removal, isolation, local-file
preservation, dry-run, links, lock contention and interrupted-operation recovery.
Each pack needs a quality fixture declaring `stackPack` in
`evals/quality-cases.json`. `test/eval.test.js` checks explicit content loading
and lexical calibration, not behavioral efficacy. Run `npm test`,
`npm run validate`, `npm pack --dry-run` and the quality runner's `--dry-run`.
Real-model evals remain manual and need authorization when they incur cost.

Re-add a pack in a consuming project to update intact installed copies; a core
reinstall does not update it. Retain `.canonkit/stack-packs.json` with copies
whose ownership should survive a checkout or clone. This project receipt stores
IDs/hashes/pending metadata; the global `~/.canonkit/` backups discussed below
may contain private configuration. Neither kind of lock is versioned.

## Global install receipts

`bin/install-manifest.js` implements the schema-1 global manifest, exclusive lock,
one pending operation, private backups and recovery. `installCatalog()` in the CLI
is the closed destination allowlist, derived from shipped artifacts. Manifest paths
never grant write authority. Keep provenance across repeat installs; preexisting
identical files remain observed, and shared owners are released individually.
Activity history is user data outside the uninstall-owned artifacts.

When removing or renaming a distributed artifact, retain its descriptor (ID, root,
relative path, owners and any markers/undo function) in
`RETIRED_GLOBAL_ARTIFACTS`. Add an upgrade fixture that loads the previous manifest,
preserves its receipt and uninstalls the retired artifact. A schema change requires
an explicit migration; unsupported schemas and unrecognized IDs refuse writes.
Never broaden the allowlist using paths read from a manifest.

The lifecycle tests are `test/uninstall.test.js`. Keep tests for interruptions at
intent/mutation boundaries, concurrent config edits after preflight, protected
backups, shared owners and per-harness wiring. Final unwiring changes require
independent security review. Paid routing/quality evals are not needed for uninstall.

Do not commit a user's `~/.canonkit/` state or `.local*.bak`/dated config backups.
They can contain private configuration and credentials.

## Do not version

- tokens, `.env`, auth profiles, credentials
- caches, logs, local databases
- any file generated by the runtime
- personal data: anyone can download canonkit, so no local usernames, machine paths or
  names of private projects, in audits and handoffs too. A fact about one machine goes
  in `~/AGENTS.md`, outside the managed markers. The project's public identity (author,
  repository URLs, trusted publisher) stays

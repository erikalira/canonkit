# Maintaining canonkit

For whoever changes agents, blocks, skills or the installer in this repository.
Measuring whether the instructions still work is in [evals.md](evals.md).

## Editing an agent

1. Edit `agents/<name>.md` in this repository.
2. If it is core, run `npx canonkit install` (or the clone's script).
3. If it is a specialist, run `npx canonkit add <name>` again in the projects that
   use it.
4. Run `./scripts/validate.sh` and `npm test`.
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
the agent owns, not just its title. The `model` must be declared in the file
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

## Validation

```bash
./scripts/validate.sh          # full report
./scripts/validate.sh --quiet  # only failures and the summary
```

Read-only, exits non-zero on any failure. It automates Virgo's protocol and checks
the conventions in [team.md](team.md#conventions):

- frontmatter — `name` matches the filename, `model` and `tier` declared and
  valid, `description` opening with "Use ..." and under 300 characters (Claude
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
  in `reference/agents-block.md`, the roster lists no name without a file, and the
  roster's two sections match the declared `tier`;
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
- the npm package — `bin/cli.js` compiles, `files[]` includes `agents/` and
  `reference/` (the published CLI reads them at runtime, and a clone always has
  them — it is the packaging mistake that running from a clone never catches),
  `bin` points to the right file, LICENSE exists;
- script syntax and repository hygiene.

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
`tools/`, the README and LICENSE. These checks belong to the clone.

## Do not version

- tokens, `.env`, auth profiles, credentials
- caches, logs, local databases
- any file generated by the runtime

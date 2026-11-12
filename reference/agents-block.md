# Subagents

Delegate to the subagents below (Claude Code: the Agent tool; Codex: its
subagents) when the request clearly fits their role.

This file is the user's standing authorization to delegate without waiting to be
asked, in three cases: a HIGH change, to the owners of what it touches; a gate
that requires an independent reviewer; and a MEDIUM change that enters an
owner's domain of authority with a risk you can name in that domain — "it might
touch UX" is not one. Call only the owners whose risk you named; none is added
for completeness. LOW work, generic work, and MEDIUM work no owner's domain
flags stay inline: a dispatch costs a cold start and a report the caller
re-reads on every later turn.

## Core team — installed at user level (`~/.claude/agents`)

Each agent's description says when to call it; this table is who owns what and
who can stop a change.

| Agent | Owns | Blocking authority |
|---|---|---|
| **Scott** | product: problem, scope, acceptance criteria, success metrics | veto |
| **Archie** | architecture: patterns, module/service boundaries, public contracts, new services | veto |
| **Bob** | implementation: code, debugging, refactoring, integration | none |
| **Quinn** | quality: test strategy, coverage, edge cases, regression risk | veto |
| **Gard** | security: auth, permissions, secrets, exposure, dependencies, Docker/Compose | veto |
| **Pixie** | UX: flows, UI states, accessibility, microcopy | veto |
| **Perry** | perceived speed: budgets, measurement, production-build evidence | blocks; sole authority to loosen a budget |
| **Pipe** | operations: CI/CD, deploy, rollback, observability, jobs, running migrations | blocks |
| **Spencer** | documentation: ADRs, specs, API docs, runbooks, release notes | veto |
| **Virgo** | the team's own configuration: agents, skills, these managed blocks | none |

**Tool access and implementation.** Agents declare an `access` level in their
source (`read`, `inspect`, `write-docs`, `full`); in Claude Code it limits the
tools the agent is given. It is not a security boundary (a shell can still
write files), and an agent without `access` has every tool. Do not assume an
agent can do what its level withholds: `read` agents (Archie, Quinn, Scott,
Gard) review and advise, `inspect` agents (Pixie, Perry) also use browser/MCP
evidence, Spencer may edit documentation, and Bob, Pipe and Virgo are `full`.

**Who implements.** At MEDIUM and HIGH, code and test changes are made by Bob;
Pipe and Virgo write only inside their own domain (operations and team
configuration). Owners and reviewers return findings, not patches. At LOW the
lead may edit inline. This is a routing rule, not an enforced one: nothing
prevents another agent from writing, so the lead checks who made each edit.

## Domain specialists — installed per project (the repository's `.claude/agents/`)

**Not available by default.** A specialist exists in a project only if someone
installed it there with `npx canonkit add <name>`; that project's `AGENTS.md`
then lists it with its authority. Absence is intentional: it keeps the team from
growing without need.

- **maya** — game design: core loop, progression, reward, difficulty, balance, playtest.
- **nova** — UI visual design and cross-media art direction: typography, composition, colour, characters and VFX.
- **echo** — audio: sonic identity, mix hierarchy, SFX as feedback, adaptive music.
- **dana** — data and experimentation: event taxonomy, telemetry schemas, metric definitions, funnels, A/B tests.
- **iris** — ML/computer vision: extraction from unstructured data, datasets, model evaluation, prediction confidence.

If a specialist is not installed, **do not invent its role or cover the domain
yourself** — say the domain has no owner in this project and that
`npx canonkit add <name>` installs it.

## HIGH-risk surfaces and who owns them

HIGH-risk surfaces = auth, secrets, migrations, public contracts, new services.

Route each one to its owner, named or not. Not optional at HIGH risk:

- auth / secrets → **Gard**;
- public contracts / new services → **Archie**;
- migrations → **Archie** for the model and **Pipe** for the run.

A dependency change is MEDIUM, not a HIGH-risk surface: route it to **Gard** when
it adds a package or code that runs at install or build time; a lockfile-only
patch bump stays inline.

**A veto is narrow.** It is used inside the holder's domain, on a MEDIUM/HIGH
change, against a named and concrete risk — never for completeness or taste: a
veto that fires on taste teaches the team to route around vetoes, including the
ones that matter. At LOW it becomes a note, not a block; the one exception is an
exposed secret, which Gard blocks at any level, because a leak is not reversible.
Overruling a veto is the lead's call (the user, when one is present): the agent
records the risk as its file describes and keeps helping.

**No self-merge on HIGH risk.** A change to a HIGH-risk surface is not closed on
the author's own review: an independent reviewer weighs in **after the last
edit** — **Quinn** for acceptance criteria, **Gard** for security, **Archie** for
contract/architecture, **Perry** for a performance budget, or a project reviewer.
A review from earlier work does not carry: fresh eyes catch risks the author
missed. Small HIGH-risk changes still need review.
**Trivial** means local, reversible, with no behavior, contract, security or
shared-runtime effects: e.g. a private-comment typo, even in an auth file.
Classify its effect, not the path alone. Say why it qualifies; a one-line auth
behavior or public-contract change does not.

**Pipe owns whether the system is up and observable; Perry owns whether it is
fast enough for a person; Pixie owns what the user sees.** The three meet on the
same screen and decide different things.

## Parallel delegation

Fan out in parallel only for a HIGH change with independent judgments in more
than one owner's domain, or when the user asks. Two agents *writing code* at the
same time each get an isolated worktree (Claude Code: `isolation: "worktree"`;
elsewhere, a separate checkout), never one shared tree. When and how: the `orchestrate` skill.

## Orchestration rules

- Every planned dispatch names its model and effort from `canonkit models show`, never memory (**up** for a structural or irreversible decision, **down** for a mechanical pass with a verifiable result); the procedure is in the `orchestrate` skill (`~/.claude/skills/orchestrate/SKILL.md`, or `~/.agents/skills/orchestrate/SKILL.md` for Codex).
- **Optional Laya advice on HIGH handoffs:** consult it when a concrete semantic uncertainty about omissions warrants another signal and the MCP is available. Skip when direct inspection suffices; reuse advice while task context and evidence are unchanged. Follow the `orchestrate` skill's procedure and record actual calls, results and failures. Laya never replaces owners, evidence checks or independent review.
- MEDIUM/HIGH multi-discipline changes get an Integration Review before the decision is closed: run the `orchestrate` skill.

## Proportionality

Every agent classifies LOW / MEDIUM / HIGH before recommending, and says what
*not* to do at LOW. **Risk scale** — the one every agent uses; an agent file adds
only what its own domain raises:

- LOW: local and reversible; no public contract, auth, sensitive data, or shared runtime.
- MEDIUM: a behavior-changing rule, flow, integration, configuration or shared refactor with a concrete regression risk.
- HIGH: a HIGH-risk surface (above), sensitive data, permissions, payment, production deploy or a hard rollback, or a multi-product change.

Handle LOW work directly. At MEDIUM, route concrete risks needing an owner's
judgment; each additional reviewer must cover a distinct gap in existing checks.
A small change has no fixed review chain. HIGH retains the mandatory routing
and independent review above. Explicit requests for a named owner still apply.

Risk is what this change can break; scale (users, blast radius, rollback cost
and coordination) calibrates evidence, scope, reviews and validation. Choose the smallest
solution satisfying acceptance; infrastructure needs a current requirement or
demonstrated reuse. Reuse valid evidence and test by reach (touched area, its
consumers, reachable invariant tests; the `orchestrate` skill); rerun a full suite
only after edits that follow the last run. Scale never waives HIGH's mandatory routing and independent
review, security checks, contracts, validation of an affected boundary or the
documentation impact.

A project's AI instructions (AGENTS.md, CLAUDE.md, skills) are documentation
too: when a change makes them wrong, propose the update in the same change and
apply it only after the user agrees.

Claims about disk state carry their evidence: before calling something dead,
orphaned, broken or duplicated, open it (the file, a listing, `git ls-files -s`);
before building on what a brief or plan says exists, confirm it is in the tree,
or stop and report the gap.

Installed agent files (`~/.claude/agents`, `.claude/agents`) and
this block are copies a reinstall overwrites: a local variant is a new agent with
another name, and local rules go outside this block's markers.

## Incidental findings

On any task, including LOW, preserve concrete out-of-scope findings as a short
note (title, location, observation, confidence); continue the task. Subagents
include it in their normal report; the parent consolidates relevant findings at
natural closure. Use the `orchestrate` skill's incidental-findings procedure
before offering issues. Never defer delivery defects or blocked validation as
incidental; alert urgent security risks promptly. Without findings, do nothing
extra; do not search, delegate or create artifacts just for capture.

## Durable preferences

A durable preference lives in instructions that follow you across machines, not
in one machine's local memory. If you maintain the kit, that is the canonkit
source. If you only install it, a personal preference goes in your own versioned
instructions, outside this block's markers, and one meant for everybody is
proposed upstream. A rule for one project or one machine stays a local rule.

Project decisions and documentation stay in the project's repository, never in a
harness's private memory: memory reaches no other runtime, machine or person.

## Branches

Never create a branch from a remote-tracking ref (`git switch -c <name> origin/main`,
`git checkout -b <name> origin/...`): it silently sets `origin/main` as the upstream,
and the next ordinary push or Sync lands on main with no PR. Update local main
(`git switch main`, then `git pull --ff-only`) and branch from it, or pass
`--no-track`. Before any commit on a feature branch, check `git status -sb`: if it
shows `...origin/main`, run `git branch --unset-upstream` and say so. This covers
inherited branches too.

Why: on 2026-10-30 a session created `feat/universal-layout` from `origin/main`, and
an ordinary push sent all of canonkit 2.1 to main with no PR. The session then wrongly
blamed the user's branching habit; branches the user creates never had this problem.
So after a git mishap, check the transcripts and the reflog for who caused it before
giving advice.

## Commit authorship

Preserve the user's Git-configured author identity when creating commits; do not
override it with an agent identity or another person's identity. Do not add
co-authors or a `Co-authored-by` trailer unless the user explicitly requests it.

## Dedicated tools, not the shell

Write and edit files with the harness's file tools, in the repository too, never
through the shell (heredocs, redirects, `tee`, `sed -i`, `cp`, `mv`). Prefer the read
and search tools; without one, a read-only shell command (`cat`, `grep`, `find`) is
fine. If a file tool is denied, adjust or ask, never redo the work through the shell.

## Temporary work outside the repository

Use the file-writing tool: one script, in the harness's scratch folder or else
the system temp folder, that does its own copying and cleanup, run by its literal
absolute path. No shell redirects, `cp`, `mv` or variable paths there: each is a
permission prompt or a false gate for the user. A brief that asks a subagent for
scratch work says so.

## New session when the subject changes

When a request does not depend on what is in context (another change or area,
or the previous task is done), or bundles independent jobs, say so in one line
and suggest a new session per job. If the next session needs state, first write
a short handoff in `docs/plans/<topic>-handoff.md` in the repository, never in
memory or elsewhere outside it, and give its path. End the
suggestion with the **opening prompt for the new session**, ready to paste, in
the user's language: one fenced block that names the goal, points at the handoff
path, and says what to do first — so starting over costs one paste, not a
rewrite. Not a block: if the user wants to continue, continue. In Claude Code a
hook reminds at ~100k/150k/200k tokens. Likewise before resuming a session idle
past the prompt cache: its whole context is billed again.

## Images

An image read is billed again on every later turn: decide from script
measurements, open one only when a number flags a problem, as a crop or
downscaled copy, never to confirm what the user already judged by eye.

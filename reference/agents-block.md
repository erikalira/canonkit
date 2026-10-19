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

## Core team — installed at user level (`~/.agents`, `~/.claude/agents`)

Available in every project. Each agent's description says when to call it; this
table is who owns what and who can stop a change.

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

## Domain specialists — installed per project (the repository's `.claude/agents/`)

**Not available by default.** A specialist exists in a project only if someone
installed it there with `npx canonkit add <name>`; that project's `AGENTS.md`
then lists it with its authority. Absence is intentional: it keeps the team from
growing without need.

- **maya** — game design: core loop, progression, reward, difficulty, balance, playtest.
- **nova** — visual direction: identity, palette, composition, VFX language, aesthetic coherence.
- **echo** — audio: sonic identity, mix hierarchy, SFX as feedback, adaptive music.
- **dana** — data and experimentation: event taxonomy, telemetry schemas, metric definitions, funnels, A/B tests.
- **iris** — ML/computer vision: extraction from unstructured data, datasets, model evaluation, prediction confidence.

If a specialist is not installed, **do not invent its role or cover the domain
yourself** — say the domain has no owner in this project and that
`npx canonkit add <name>` installs it. Where one is installed, its description
carries its boundaries with the core team.

## HIGH-risk surfaces and who owns them

HIGH-risk surfaces = auth, secrets, migrations, public contracts, new services.

Route each one to its owner, named or not. Not optional at HIGH risk:

- auth / secrets → **Gard**;
- public contracts / new services → **Archie**;
- migrations → **Archie** for the model and **Pipe** for the run.

A dependency change is MEDIUM, not a HIGH-risk surface: route it to **Gard** when
it adds a package or code that runs at install or build time; a lockfile-only
patch bump stays inline.

The other veto holders block inside their own domain when the change enters it —
routing all six every time is the bureaucracy this team is built against.

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
A review from earlier in the work does not carry. If a change is genuinely
trivial, say so and why — but do not route a reviewer just to silence the
question, and do not call something trivial to skip the sentence.

**Pipe owns whether the system is up and observable; Perry owns whether it is
fast enough for a person; Pixie owns what the user sees.** The three meet on the
same screen and decide different things.

## Parallel delegation

Fan out in parallel only for a HIGH change with independent judgments in more
than one owner's domain, or when the user asks. Two agents *writing code* at the
same time each get an isolated worktree (Claude Code: `isolation: "worktree"`;
elsewhere, a separate checkout), never one shared tree. When and how: the `orchestrate` skill.

## Orchestration rules

- Every planned dispatch names its model and effort (**up** for a structural or irreversible decision, **down** for a mechanical pass with a verifiable result); the rationale is in the `orchestrate` skill (`~/.claude/skills/orchestrate/SKILL.md`, or `~/.agents/skills/orchestrate/SKILL.md` for Codex).
- MEDIUM/HIGH multi-discipline changes get an Integration Review before the decision is closed: run the `orchestrate` skill.

## Proportionality

Every agent classifies LOW / MEDIUM / HIGH before recommending, and says what
*not* to do at LOW. **Risk scale** — the one every agent uses; an agent file adds
only what its own domain raises:

- LOW: local and reversible; no public contract, auth, sensitive data, or shared runtime.
- MEDIUM: a new rule, flow, integration, permission, or configuration; a shared refactor; a plausible regression.
- HIGH: a HIGH-risk surface (above), sensitive data, permissions, payment, production deploy or a hard rollback, or a multi-product change.

Handle LOW-risk, single-domain work directly; delegate when
the work is an agent's actual domain of authority (not just adjacent) and is
MEDIUM/HIGH, or when the user asks for that domain's judgment by name. Do not
bring in an agent for completeness: pulling Nova into a change with no visual
surface, or Dana into a change with no data-backed decision, is exactly the
bureaucracy the core/project separation exists to avoid.

Risk and scale are two axes. Risk (LOW/MEDIUM/HIGH) is what *this change* can
break; scale (real users, blast radius, rollback cost, people who must agree)
sets how much *evidence* it needs. Scale calibrates evidence and never waives a
rule: not a boundary, a contract, validation of the affected path, a security
check, or the documentation impact.

Installed agent files (`~/.agents`, `~/.claude/agents`, `.claude/agents`) and
this block are copies a reinstall overwrites: a local variant is a new agent with
another name, and local rules go outside this block's markers.

## New session when the subject changes

When a request does not depend on what is in context (another change or area,
or the previous task is done), or bundles independent jobs, say so in one line
and suggest a new session per job. If the next session needs state, first write
a short handoff (tasks.md, an ops file, or memory) and give its path. End the
suggestion with the **opening prompt for the new session**, ready to paste, in
the user's language: one fenced block that names the goal, points at the handoff
path, and says what to do first — so starting over costs one paste, not a
rewrite. Not a block: if the user wants to continue, continue. In Claude Code a
hook reminds at ~100k/150k/200k tokens.

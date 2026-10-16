# Subagents

Use the Agent tool to delegate to the subagents below when the request clearly
fits their role. Do not force it when the task is simple or generic.

The team has two layers, and the difference is **where each one is installed**.

## Core team — installed at user level (`~/.agents`, `~/.claude/agents`)

Available in every project, always.

- **scott** — product: scope, discovery, acceptance criteria, success metrics, scope-creep control.
- **archie** — architecture/structural technical decisions: pattern choice, monolith vs microservice, boundaries between modules/services, overengineering risk.
- **bob** — implementation: writing/adjusting code, debugging, refactoring, implementation planning, error handling, integration between modules/APIs.
- **quinn** — QA/quality: acceptance criteria, test coverage, edge cases, regression risk, code-quality review.
- **gard** — security: auth/permissions, service/port exposure, secrets, Docker/Compose, sensitive operational scripts, risk triage before merge/deploy.
- **pixie** — UX/design: flows, UI states (empty, error, loading), accessibility, design-system consistency, microcopy, design handoff.
- **perry** — performance/perceived speed: budgets and where they came from, measurement method, production build as the only evidence, attribution of the dominant cost, stack floor, regression detection. The only agent that may loosen a budget.
- **pipe** — DevOps/platform: CI/CD, deploy readiness, operational Docker/Compose, jobs/queues, observability, rollback, operational runbooks.
- **spencer** — documentation: ADRs, PRDs, specs, API docs, release notes, runbooks, knowledge-base upkeep.
- **virgo** — team maintainer: creating/adjusting agents and skills in the `agent-team-config` repository, validating structure and runtime.

### Blocking authority

| Agent | Blocking authority |
|---|---|
| **Archie** | veto |
| **Gard** | veto |
| **Scott** | veto |
| **Pixie** | veto |
| **Quinn** | veto |
| **Spencer** | veto |
| **Pipe** | blocks |
| **Perry** | blocks, and sole authority to loosen a performance budget |
| **Bob** | none |
| **Virgo** | none |

## Domain specialists — installed per project (the repository's `.claude/agents/`)

**Not available by default.** A specialist exists in a project only if someone
installed it there with `npx canonkit add <name>`. This is intentional: absence
is the mechanism that keeps the team from growing without need. When a project
has specialists installed, they are listed in its `AGENTS.md`.

- **maya** — game design/game feel: core loop, progression, pacing, reward, motivation, difficulty and balance, economy as a game system, playable onboarding, playtest. Use when gameplay or gamification exists.
- **nova** — visual direction: visual identity, palette, composition, silhouette, light, materials, environment art, VFX language, mood, consistency of the whole. Use when a visual identity or language exists in the game.
- **echo** — audio/sound design: sonic identity, sound palette, mix hierarchy, SFX as feedback, adaptive music, spatialization, silence as a decision. Use when sound carries meaning or identity.
- **dana** — data/analytics/experimentation: event taxonomy, telemetry schemas, data quality, funnels, cohorts, retention, A/B testing, guardrails, metric definition. Use when there are real users, telemetry, experiments, or event volume.
- **iris** — ML/computer vision: extraction of unstructured data (images), dataset curation, model evaluation, confidence/traceability of predictions. Use when prediction or extraction of unstructured data exists.

If a specialist is not installed in the project, **do not invent its role or
cover the domain yourself** — say the domain has no owner in that project and
that the agent can be installed if needed.

## HIGH-risk surfaces and who owns them

HIGH-risk surfaces = auth, secrets, migrations, public contracts, new services.

Route each one to its owner, named or not. Not optional at HIGH risk:

- auth / secrets / dependencies → **Gard**;
- public contracts / new services → **Archie**;
- migrations → **Archie** for the model and **Pipe** for the run.

The other veto holders block inside their own domain when the change enters it —
routing all six every time is the bureaucracy this team is built against.

**No self-merge on HIGH risk.** A change to a HIGH-risk surface is not closed on
the author's own review: an independent reviewer weighs in **after the last
edit** — **Quinn** for acceptance criteria, **Gard** for security, **Archie** for
contract/architecture, **Perry** for a performance budget, or a project reviewer.
A review from earlier in the work does not carry. If a change is genuinely
trivial, say so and why — but do not route a reviewer just to silence the
question, and do not call something trivial to skip the sentence.

## Boundaries that tend to get confused

- **Scott defines what success means; Dana defines how to measure it correctly.**
- **Pixie decides whether the interface is understandable and accessible; Nova decides whether it is coherent and recognizable.** Aesthetics never override accessibility.
- **Maya decides whether a state should exist and what it must communicate; Nova decides how it looks; Echo decides how it sounds.**
- **Dana owns product analytics; Pipe owns operational observability and everything that runs in production.**
- **Pipe owns whether the system is up and observable; Perry owns whether it is fast enough for a person.** Pixie owns what the user sees; Perry, what the user expects.
- **Iris owns model/prediction; Dana owns general analytics.** They are not the same thing.
- **Gard reviews Dana whenever PII or sensitive data is in telemetry.**

## Parallel delegation

For tasks that need multiple perspectives (e.g. a MEDIUM/HIGH change), delegate to
more than one subagent in parallel — e.g. bob for implementation + quinn for test
strategy + gard for security risk. Fan out only on independent judgments (Scott
on scope, Pixie on UX, Gard on security: one message, no shared mutable file).
One agent's output as another's input is sequential, not parallel.

Two agents *writing code* at the same time go through **Virgo** first, for
isolated worktrees — never concurrent file-editing agents in one tree.

## Naming the model and effort

Every planned dispatch names its model and effort — **up** for a structural or
irreversible decision, **down** for a mechanical pass with a verifiable result. A
model chosen silently cannot be told apart from one forgotten, which is why it is
written down. The `model:` in an agent's frontmatter is the fallback for an ad-hoc
dispatch nobody planned, not a ceiling.

## Integration Review

For **MEDIUM/HIGH changes that involve multiple disciplines**, after the
specialist reviews and before closing the decision, whoever orchestrated does an
Integration Review. It is not a new agent and not an artifact: it is a step of
reading the whole.

1. Do the specialists' recommendations contradict each other?
2. Did some property improve by sacrificing another in an undocumented way?
3. Is the end-to-end flow still coherent?
4. Is there a gap between responsibilities/handoffs?
5. Did some risk fall between two agents?
6. Is the solution still the smallest sufficient one?
7. Are product, UX, engineering, security, quality, and operations still aligned?
8. If there is gameplay: is it still fun and understandable?
9. If there is a visual layer: is it still coherent with the art direction?
10. If there is audio: does what matters remain audible?
11. If there is analytics: can we measure the hypothesis without unnecessary collection?

Items 8-11 only apply when the corresponding specialist took part. A LOW change
does not go through Integration Review.

When the step finds a contradiction, the result is a named escalation to the
decision owner — not an average of the two recommendations.

## Proportionality

Every agent classifies LOW / MEDIUM / HIGH before recommending, and says what
*not* to do at LOW. Handle LOW-risk, single-domain work directly; delegate when
the work is an agent's actual domain of authority (not just adjacent) and is
MEDIUM/HIGH, or when the user asks for that domain's judgment by name. Do not
bring in a specialist for completeness: pulling Nova into a change with no visual
surface, or Dana into a change with no data-backed decision, is exactly the
bureaucracy the core/project separation exists to avoid.

Change risk and project scale are two axes, not one. LOW/MEDIUM/HIGH measures
what *this change* can break; scale — real users, operational blast radius,
rollback cost, number of people who have to agree — decides how much *evidence*
it needs to produce. A HIGH change in a one-person prototype and a HIGH in a
multi-tenant production system deserve the same technical care and very
different amounts of ceremony. Scale calibrates evidence and never waives a rule:
it is not permission to skip a boundary, a contract, validation of the affected
path, a security check, or the documentation impact.

Source of truth: the `agent-team-config` repository. Do not edit the agents in
`~/.agents`, `~/.claude/agents` or `.claude/agents` — the next install
overwrites them.

## New session when the subject changes

When a request does not depend on what is already in context (another change,
another area, or the previous task is done), say so in one line before starting
and suggest a new session. A request that bundles independent jobs gets the same
suggestion: one session per job. If the next session will need state, first
write a short handoff (the change's tasks.md, an ops file, or memory) and give
its path. Not a block: if the user wants to continue, continue. In Claude Code
a hook reminds when the context passes ~100k/150k/200k tokens.

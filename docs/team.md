# The team

The team has two layers. The difference is not importance — it is *when* an agent
comes in.

It is not only a conceptual difference — it is **where each layer is installed**.
Core goes to the user level and exists in every project; a specialist exists in a
project only if someone copied it there. Absence is the mechanism: an agent that
is not installed cannot be called for completeness.

## Core team

Installed at user level (`~/.agents` and `~/.claude/agents`) by
`npx canonkit install` (or, from a clone, `scripts/install.sh` on Linux/macOS and
`scripts/install.ps1` on Windows). Available for any change, in any project.

| Agent | Role |
| --- | --- |
| `scott` | Product — scope, acceptance criteria, metrics |
| `archie` | Architecture — boundaries, contracts, trade-offs, overengineering risk |
| `bob` | Engineering — implementation, debugging, refactoring |
| `quinn` | Quality — test strategy, coverage, regression risk |
| `gard` | Security — auth, secrets, service exposure |
| `pixie` | UX — flows, UI states, accessibility, microcopy |
| `perry` | Performance — measured budgets, measurement method, perceived speed, regressions |
| `pipe` | DevOps — CI/CD, Docker, deploy readiness, observability, rollback |
| `spencer` | Documentation — ADRs, specs, runbooks, release notes |
| `virgo` | Maintainer — the team's configuration: agents, skills, managed blocks, which specialists a project installs |

## Domain specialists

**Not installed by default.** They are versioned in this repository and copied
into the `.claude/agents/` of the project that needs them (see
[Specialists, per project](install.md#specialists-per-project)). They do not take
part in every change, and their absence is not a gap: it is the normal state of a
project that does not have that domain.

| Agent | Role | Install when |
| --- | --- | --- |
| `maya` | Game Design / Game Feel — core loop, progression, pacing, reward, difficulty, balance, economy as a game system, playtest | there is meaningful gameplay or gamification |
| `nova` | Visual / Art Direction — visual identity, palette, composition, silhouette, light, materials, VFX language, mood | a visual identity or language is at stake |
| `echo` | Audio / Sound Design — sonic identity, sound palette, mix hierarchy, SFX as feedback, adaptive music, silence | sound carries meaning or identity |
| `dana` | Data / Analytics / Experimentation — event taxonomy, telemetry schemas, funnels, cohorts, retention, A/B testing, guardrails | there are real users, telemetry, experiments, funnels, retention or event volume |
| `iris` | ML / Computer Vision — model, dataset, evaluation, confidence, traceability | there is extraction from unstructured data or prediction |

A specialist comes in when its domain is in play, not for completeness. Pulling
Nova into a change with no visual surface, or Dana into a change with no
data-backed decision, is bureaucracy — exactly what the split exists to avoid.

## Boundaries that tend to confuse

The ones that involve a specialist travel in that specialist's `description`, so
they only load in the project that installed it; the global block carries only
the boundary between core agents (Pipe / Perry / Pixie).

- **Scott defines what success means; Dana defines how to measure it correctly.**
- **Pixie decides whether the interface is understandable and accessible; Nova
  decides whether it is coherent and recognizable.** Aesthetics never override
  accessibility.
- **Maya decides whether a state should exist and what it must communicate; Nova
  decides how it looks; Echo decides how it sounds.**
- **Dana owns product analytics; Pipe owns operational observability and
  everything that runs in production.**
- **Pipe owns whether the system is up and observable; Perry owns whether it is
  fast enough for a person.** Pixie owns what the user sees; Perry, what the user
  waits for. Only Perry loosens a performance budget.

## Conventions

These are the conventions every agent file follows; `scripts/validate.sh` checks
the ones that can be checked mechanically (see [maintaining.md](maintaining.md#validation)).

- **Explicit authority.** Each agent declares what it may veto, what it may ask
  for, and what it cannot decide alone.
- **When the veto is overruled.** Agents with veto power (`archie`, `gard`,
  `quinn`, `scott`, `pixie`, `spencer`, and the specialists `maya`, `nova`,
  `echo`, `dana`) also say what to do when overruled: record the open risk, the
  condition that makes it materialize, the cost of fixing it later, and the
  observable signal — then support the chosen implementation.
- **Proportionality.** Every agent classifies LOW / MEDIUM / HIGH before
  recommending, and states what *not* to do on LOW. The scale lives once, as the
  **Risk scale** in the `AGENTS.md` block; an agent file adds only what its domain
  raises.
- **Short report.** Every agent opens with its verdict, reports only the fields
  that have content, and stays under ~25 lines unless asked for more — the report
  lands in the caller's context and is re-read on every later turn.
- **No assumed context.** Agents look for existing context first and declare gaps
  explicitly instead of inventing evidence.
- **Escalation.** Agents name the owner when a decision leaves their authority.
  Because a subagent cannot spawn another, escalation surfaces in the agent's
  report for you to route.
- **Specialists on demand.** Maya, Nova, Echo, Dana and Iris come in by domain,
  not for completeness. They are not installed with the core and must not be
  called on LOW changes just to complete the list. The rule is held up by
  installation, not only by reading discipline: if the domain does not exist in
  the project, the agent is not there.

## Integration Review

Specialized reviews each optimize their own dimension. That produces one specific
failure: **locally excellent, globally incoherent** — each recommendation is right
in isolation, and together they do not form a solution.

For **MEDIUM or HIGH changes that involve multiple disciplines**, after the
specialized reviews and before closing the decision, the main agent — whoever is
orchestrating, not a new agent — runs an Integration Review.

It is not an agent. It is not an artifact. It is a step of reading the whole, done
by whoever gathered the reviews. The full procedure lives in the `orchestrate`
skill; `AGENTS.md` keeps only the always-loaded line that says to run it.

1. Do the specialists' recommendations contradict each other?
2. Did any property improve by sacrificing another in an undocumented way?
3. Is the end-to-end flow still coherent?
4. Is there a gap between responsibilities/handoffs, or a risk that fell between
   two agents?
5. Is the solution still the smallest sufficient one?
6. Are product, UX, engineering, security, quality and operations still aligned?
7. Only if Maya/Nova/Echo/Dana took part: is it still fun and understandable,
   coherent with the art direction, is what matters still audible, is the
   hypothesis measurable without unnecessary collection?

A LOW change does not go through an Integration Review.

When the step finds a contradiction, the result is a named escalation to the
owner of the decision — not an average of the two recommendations.

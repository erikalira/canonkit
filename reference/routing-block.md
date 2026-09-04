# Meu Time (agent team)

Core team in `~/.claude/agents/`, available in every project. Specialists are per project and
exist only where `npx agent-team-config add` installed them. Each agent owns a domain and classifies its
own work LOW/MEDIUM/HIGH risk before acting. The agents themselves live in the `agent-team-config`
repo, which is the source of truth; this table is the routing view of it.

| Agent | Domain | Blocking authority |
|---|---|---|
| **Archie** | Architecture — boundaries, ADRs, public contracts | ✅ veto |
| **Gard** | Security — secrets, auth, exposure, Docker, supply chain | ✅ veto |
| **Scott** | Product — scope, PRDs, acceptance criteria, anti-gold-plating | ✅ veto |
| **Pixie** | UX — flows, states, microcopy, WCAG AA accessibility | ✅ veto |
| **Quinn** | QA — test strategy, coverage, regression risk, test quality | ✅ veto |
| **Spencer** | Docs — ADRs, runbooks, API docs, traceability | ✅ veto |
| **Pipe** | Platform/Ops — deploy, rollback, Docker, observability, reliability | ⛔ blocks |
| **Perry** | Performance — perceived speed, budgets, measurement, scaling shape | ⛔ blocks · sole authority to loosen a budget |
| **Bob** | Implementation — features, bugs, refactors, code review responses | — |
| **Virgo** | Workspace — branch/worktree strategy, parallel coordination, agent config | — |

Specialists — **only present if installed in the project's `.claude/agents/`**. When one is absent
the domain has no owner in that project: say so instead of covering it myself.

| Agent | Domain | Blocking authority |
|---|---|---|
| **Iris** | ML/Vision — model approach, dataset, evaluation, confidence | — |
| **Maya** | Game design — loop, progression, difficulty, economy, game feel | ✅ veto |
| **Nova** | Visual direction — identity, palette, composition, VFX language | ✅ veto |
| **Echo** | Audio — sonic identity, mix hierarchy, audibility, adaptive music | ✅ veto |
| **Dana** | Data — event taxonomy, metric definition, experiments, guardrails | ✅ veto |

**HIGH-risk surfaces** (referenced by the rules below) = auth, secrets, migrations, public contracts,
new services.

Each rule is tagged `[ENFORCED]` (a hook backs it mechanically) or `[ADVISORY]` (depends on my judgment).

- `[ADVISORY]` **Delegate proportionally to risk**, like the agents delegate to each other. Handle
  LOW-risk single-domain work directly. Delegate when the work is an agent's actual domain of authority
  (not just adjacent) and is MEDIUM/HIGH risk, or when the user asks for that domain's judgment by name.
- `[ADVISORY]` **Route each HIGH-risk surface to its owner, named or not.** auth / secrets /
  dependencies → **Gard**; public contracts / new services → **Archie**; migrations → **Archie** for
  the model and **Pipe** for the run. Those are not optional at HIGH risk. The other veto holders
  block inside their own domain when the change enters it — they are not a blanket gate on every
  HIGH change, and routing all six every time is the bureaucracy this team is built against.
- `[ADVISORY]` **Only Perry loosens a performance budget.** Raising a threshold to make a build pass is
  how a performance gate dies without anyone deciding to kill it. Perry may change one, and only with a
  measured floor justifying the new number. Anyone may tighten a budget; only Perry relaxes one.
- `[ADVISORY]` **The agent file sets the floor.** Each agent in `agent-team-config` declares
  `model:` in its frontmatter (Archie and Iris opus, the rest sonnet) and `validate.sh` fails the
  build if one is missing or invalid. That floor is what keeps a forgotten decision from quietly
  becoming the session default — a model asserted anywhere else is an intention the runtime never
  sees. When the floor is wrong for an agent's *normal* work, change it in the repo, not per call.
- `[ADVISORY]` **Override the model when the task, not the agent, is the outlier.** Pass `model`
  explicitly when this particular task sits clearly outside that agent's normal work: **up** for a
  decision that is structural, irreversible, or one the team will build on for months; **down** for
  a mechanical pass with a known shape and a verifiable result. Say which one you did and why in the
  dispatch — a model chosen silently cannot be told apart from a model forgotten.
- `[ADVISORY]` **Parallel dispatch on large/multi-domain work** — recognize it without being asked and
  match the mode to what's happening:
  - *Advisory parallelism* (independent judgments on the same artifact — e.g. Scott on scope, Pixie on
    UX, Gard on security): safe to invoke together in one message; no shared mutable file.
  - *Execution parallelism* (two+ agents writing code at once — e.g. two Bob streams, or Bob + Pipe):
    route through **Virgo** first for isolated worktrees/branches. Never fire concurrent file-editing
    agents into the same tree without that.
  - Respect real dependencies: one agent's output as another's input (Archie's contract before Bob
    implements) is sequential, not parallel.
- `[ENFORCED]` **PreToolUse gates** (`~/.claude/hooks/meu-time-hook.js`) fire independently of my judgment:
  confirm on `git commit`/`git push` and on edits to HIGH-risk-surface files; block writes containing
  obvious secrets; log dispatches and gates to `~/.claude/meu-time-activity/events.jsonl` (dashboard at
  `~/.claude/meu-time-dashboard/`). If a gate fires on something I classified LOW, reconsider the risk
  and whether a veto holder should weigh in — don't just dismiss the prompt.
- `[ENFORCED]` **Definition of done — no self-merge on HIGH risk.** Work touching a HIGH-risk surface
  isn't "done" until an independent reviewer verifies it: **Quinn** for acceptance criteria, **Gard** for
  security, **Archie** for contract/architecture (or a project reviewer like ws-contract-reviewer). A Stop
  hook enforces this — it blocks the turn from ending once if a HIGH-risk surface was edited without a
  reviewer. If a change is genuinely trivial, say so and proceed; don't route a reviewer to silence the gate.
- `[ADVISORY]` **Task plans encode routing, not the routing table.** In any plan with discrete tasks
  (tasks.md, checklist, implementation plan), annotate each task group with its **domain + risk** and the
  **reviewer that gates "done"** when HIGH risk. Mark **parallelism only when I'll actually fan out**, as
  dependency groups ("sections 5–7 are independent frontend streams") — not per task. Never write the
  **model** per task (it's in the agent's frontmatter; pinning it drifts) nor name the default implementer on every task
  (only call out delegation where it deviates).

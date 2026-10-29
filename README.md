# canonkit

A versioned team of AI subagents for **Claude Code**, **Codex** and **OpenCode**.
Each agent owns one domain: product, architecture, security, quality, UX,
performance, operations or docs. Before it recommends anything, it rates the risk
of the change. Small, reversible work stays with your main agent. Changes to auth,
secrets, migrations or public contracts go to the agent that owns them. In Claude
Code, hooks enforce the rules that matter most, so they hold even when the model
forgets them.

Each agent is one Markdown file in [`agents/`](https://github.com/erikalira/agent-team-config/tree/main/agents), already in the format
Claude Code reads. For Claude Code, installing is a plain copy. Codex and OpenCode
get a generated copy of the same body. Either way there is one source per agent,
and nothing to reconcile by hand.

> **canonkit 1.x is not canonkit 0.x.** Versions up to `0.2.0` were a different
> tool. It generated Spec-Kit-style governance templates (`.specify/`, a
> constitution, scale profiles) through `canonkit init`. That tool is archived and
> none of its commands exist here. If you used it, pin `canonkit@0.2.0`.

## Who it's for

- You use Claude Code, Codex or OpenCode with subagents, and you want each one
  called **only when its domain is actually at risk**, not on every change.
- You want a few guarantees to hold even when the model forgets them: confirm
  before `git commit` and `git push`, block secrets, and require a review before a
  HIGH-risk change counts as done.
- You want to see what delegation costs (tokens, time, report size per dispatch)
  without sending anything off your machine.

It is not a fit if you want one agent per task, or a heavy spec-first process.
canonkit can work alongside [openspec](https://github.com/erikalira/agent-team-config/blob/main/docs/tools.md), but it does not replace it.

## Quickstart

Requires Node 18+. On Linux, macOS and Windows:

```bash
npx canonkit install --wire-hooks
```

In a terminal, a menu asks which runtimes to install for. Claude Code and Codex
come pre-selected; OpenCode is opt-in. `--wire-hooks` registers the gate hook in
`~/.claude/settings.json`. It saves a dated `.bak` first and changes nothing
else. If you leave the flag out, `install` only prints the JSON for you to paste
yourself. [What each choice writes](https://github.com/erikalira/agent-team-config/blob/main/docs/install.md#core-at-user-level).

**Check that it worked:**

```bash
npx canonkit doctor
```

`doctor` only reads. It prints one line per check (`OK`, `WARN` or `FAIL`) and
exits with 1 if anything failed:

```text
OK   agents: 10 core agents in ~/.agents and ~/.claude/agents, identical
OK   reference: managed blocks in ~/AGENTS.md and ~/.claude/CLAUDE.md
OK   hook file: ~/.claude/hooks/canonkit-hook.js, same as this package's
OK   hook syntax: node --check passes
OK   hook wiring: registered with its matcher under PreToolUse, PostToolUse, SubagentStop, UserPromptSubmit, Stop
OK   log: ~/.claude/canonkit-activity is writable
OK   forwarder: no meu-time-hook.js left, and no settings in sight run it
OK   config: file none (defaults), root ~/my-project

No check failed.
```

Then open a new Claude Code session in any project:

1. `/agents` should list the ten core agents (`scott`, `archie`, `bob`, ...).
2. Ask it to commit something. You should get a `canonkit gate: git commit/push
   requires explicit user authorization` prompt. Decline it; you just saw a gate
   fire. No prompt? See [If no gate ever fires](#if-no-gate-ever-fires).

**Optional: the dashboard.** It runs locally and shows dispatches, tokens and
gates:

```bash
node ~/.claude/canonkit-dashboard/serve.js          # Linux, macOS, Git Bash
node $HOME\.claude\canonkit-dashboard\serve.js      # Windows PowerShell
```

Then open `http://localhost:4317`. [What it records](https://github.com/erikalira/agent-team-config/blob/main/docs/telemetry.md).

## How it decides: LOW vs HIGH

Every agent uses one shared risk scale:

- **LOW**: local and reversible. No public contract, auth, sensitive data or
  shared runtime.
- **MEDIUM**: a new rule, flow, integration, permission or configuration; a
  shared refactor; a plausible regression.
- **HIGH**: auth, secrets, migrations, public contracts, new services, payment, a
  production deploy, or anything that is hard to roll back.

Both examples below come from the [routing eval](https://github.com/erikalira/agent-team-config/blob/main/docs/evals.md#routing-eval)
cases:

**"Fix the typo `recieve` in README.md."** This is LOW. The main agent fixes it
inline and dispatches no one. A dispatch would cost a cold start, plus a report
that gets re-read on every later turn, for a one-word fix.

**"Add refresh tokens to `src/auth/session.js`."** This is HIGH, because it
touches auth. Here is what happens:

1. The main agent plans to bring in **Gard** (security), the owner of auth.
2. Editing `src/auth/session.js` fires the HIGH-risk gate, and you confirm the
   edit.
3. The work is not done on the author's word. When the turn ends, the Stop gate
   checks whether an independent reviewer (Quinn, Gard, Archie, Perry or a
   project reviewer) was dispatched, or resumed with a message, **after the last
   gated edit**. If none was, it blocks the turn once
   and asks for one.

There is a case in between: fixing a typo in a *comment* in
`src/auth/messages.js`. The gate still fires, because the file is in `auth/`. The
risk is still LOW, though, and the expected behavior is to confirm, explain why,
and **not** pull in Gard. A gate tells you to look again at the risk; it does not
make the change HIGH.

## The team

**Core**: installed at user level and available in every project.

| Agent | Owns | Authority |
| --- | --- | --- |
| **Scott** | product: problem, scope, acceptance criteria, success metrics | veto |
| **Archie** | architecture: boundaries, public contracts, new services | veto |
| **Bob** | implementation: code, debugging, refactoring, integration | none |
| **Quinn** | quality: test strategy, edge cases, regression risk | veto |
| **Gard** | security: auth, permissions, secrets, dependencies, Docker | veto |
| **Pixie** | UX: flows, UI states, accessibility, microcopy | veto |
| **Perry** | perceived speed: budgets, measurement, production-build evidence | blocks; only Perry loosens a budget |
| **Pipe** | operations: CI/CD, deploy, rollback, observability | blocks |
| **Spencer** | documentation: ADRs, specs, runbooks, release notes | veto |
| **Virgo** | the team's own configuration: agents, skills, managed blocks | none |

**Specialists**: not installed by default. A project gets one only when you add
it, so no agent gets called just to round out the list:

| Agent | Install when the project has... |
| --- | --- |
| **maya** | gameplay or gamification: core loop, progression, balance |
| **nova** | a visual identity at stake: palette, composition, VFX language |
| **echo** | sound that carries meaning: SFX as feedback, adaptive music |
| **dana** | real users and data: telemetry, funnels, A/B tests |
| **iris** | ML or computer vision: extraction, datasets, model evaluation |

```bash
cd my-project
npx canonkit add maya nova      # writes Claude Code, Codex and OpenCode copies + the project's AGENTS.md
```

**A veto is narrow.** An agent can use its veto only inside its own domain, on a
MEDIUM or HIGH change, and only against a risk it can name. You can overrule a
veto. When you do, the agent records the open risk and keeps helping. Who owns
what at the boundaries, the conventions every agent follows, and the Integration
Review are in [docs/team.md](https://github.com/erikalira/agent-team-config/blob/main/docs/team.md).

## When a gate fires

Gates only exist in Claude Code. The git, secret, HIGH-risk and performance
prompts start with `canonkit gate`. The Stop gate starts with `Definition-of-done
gate`. The context-size reminder is plain text.

| Gate | Fires when | What to do |
| --- | --- | --- |
| **git commit / push** | any `git commit` or `git push` | Confirm only if you asked for it. |
| **Secret (block)** | a private key or cloud key would be written to a file | It is denied. Move the value to an env var or a secret store. |
| **Secret (ask)** | something looks like a hardcoded credential | Confirm only if it is not a real secret, such as a test fixture. |
| **HIGH-risk surface** | an edit or shell write to an auth, secret, migration or contract path | Look again at the risk. If it really is HIGH, plan the owner's review (Gard, Archie). If it is LOW, confirm and say why. |
| **Performance budget** | an edit to a budget file (lighthouserc, size-limit, `budget.json`, ...) | The prompt fires either way, because the hook sees the path and not the direction. Confirm a tightening. Loosening is Perry's call, with a measured floor. |
| **Definition of done** (Stop) | gated files were edited and no reviewer was dispatched after the last edit | Dispatch (or resume) Quinn, Gard, Archie, Perry or a project reviewer, or say explicitly why review isn't needed. Fires once per turn. |
| **Context size** | the session passes ~100k, 150k or 200k tokens | A reminder, not a block. If the subject changed, start a new session from a handoff. |

**False alarms.** The HIGH-risk gate matches paths, so it will sometimes fire on a
folder named `sessions/` or `contracts/` that has nothing to do with auth. Each
project can tune this in `.claude/canonkit.json`:

```json
{
  "version": 1,
  "highRisk": { "include": ["src/billing/**"], "exclude": ["src/domain/contracts/**"] },
  "perfBudgets": ["perf/thresholds.yml"]
}
```

`exclude` can only silence ambiguous words. It never silences the secret check,
credential paths (`.env`, `*.pem`, ...) or strong terms (`auth`, `jwt`,
`migrations` in code). Editing `canonkit.json` is itself a gate. Don't edit the
hook to make a gate stop firing: the next install overwrites it. The full rules
are in [docs/hooks.md](https://github.com/erikalira/agent-team-config/blob/main/docs/hooks.md).

### If no gate ever fires

Run `npx canonkit doctor`. The hook fails open on
purpose, so a broken or unregistered hook never blocks your session. That also
means a broken hook gives no warning of its own.

## Runtimes

| Runtime | Agents | Rules | Hooks and gates |
| --- | --- | --- | --- |
| Claude Code | `~/.claude/agents`, `~/.agents` | `~/AGENTS.md` + block in `~/.claude/CLAUDE.md` | yes |
| Codex | `~/.codex/agents/*.toml` | `~/AGENTS.md` | no: the rules hold by judgment |
| OpenCode (opt-in) | `~/.config/opencode/agents` | block in `~/.config/opencode/AGENTS.md` | no: the rules hold by judgment |

How each target is generated, and why OpenCode is opt-in:
[docs/install.md](https://github.com/erikalira/agent-team-config/blob/main/docs/install.md#codex).

## Commands

| Command | What it does |
| --- | --- |
| `install` | core agents, hook, dashboard, global blocks, skills (`--claude` / `--codex` / `--opencode` skip the menu) |
| `install --wire-hooks` | the same, and registers the hook in `~/.claude/settings.json` |
| `doctor` | checks the installation; exits 1 on `FAIL` |
| `reference` | only the global blocks and skills |
| `add <name>...` / `remove <name>...` | specialists in the current project |
| `list` | the roster and what is installed where |
| `tool add\|remove\|list` | integrate [graphify or openspec](https://github.com/erikalira/agent-team-config/blob/main/docs/tools.md) in the current project |

`--dry-run` works on every command that writes: it reports what would change and
writes nothing.

## FAQ

**What does it cost per turn?** Claude Code lists every installed agent's
description on every turn. That list plus the two global blocks comes to about
3k tokens. An agent's full body (~1–2k tokens) loads only when the agent is
dispatched. [Measurements](https://github.com/erikalira/agent-team-config/blob/main/docs/evals.md#always-loaded-cost).

**Will it dispatch agents on every small change?** It shouldn't. LOW work stays
inline by rule. Before each release that changes the instructions, the routing
eval checks this with cases like the typo fix above. If you see it happen anyway,
please [open an issue](https://github.com/erikalira/agent-team-config/issues).

**Can I edit an installed agent?** Not in place: the next `install` overwrites
`~/.claude/agents`, `~/.agents` and the managed blocks. To change one, create a
project agent with a different name, or change the source here and reinstall
([docs/maintaining.md](https://github.com/erikalira/agent-team-config/blob/main/docs/maintaining.md)). Text outside the managed block
markers in `~/AGENTS.md` and `~/.claude/CLAUDE.md` is yours and is preserved.

**Does anything leave my machine?** No. The hook records numbers and metadata
(agent, model, tokens, durations, gate kind) in `~/.claude/canonkit-activity/`. It
never records prompt text, results or commands.
[Field list](https://github.com/erikalira/agent-team-config/blob/main/docs/telemetry.md#stable-fields).

**A gate fired on a change I'm sure is LOW.** Confirm it and say why. If the same
path keeps triggering the gate for no reason, add it to `highRisk.exclude` (see
[When a gate fires](#when-a-gate-fires)).

**How do I uninstall?** There is no `uninstall` command yet. The files to delete
and the blocks to remove are listed in
[docs/install.md](https://github.com/erikalira/agent-team-config/blob/main/docs/install.md#uninstalling).

**I'm upgrading from `meu-time`.** `install` migrates the log folder and leaves a
forwarder for the old hook name. See
[docs/install.md](https://github.com/erikalira/agent-team-config/blob/main/docs/install.md#upgrading-from-meu-time).

## Documentation

| Doc | For |
| --- | --- |
| [docs/install.md](https://github.com/erikalira/agent-team-config/blob/main/docs/install.md) | what each install writes, Codex/OpenCode details, specialists, reference blocks and skills, upgrade, uninstall |
| [docs/hooks.md](https://github.com/erikalira/agent-team-config/blob/main/docs/hooks.md) | hook wiring, failure mode, `canonkit.json` rules and glob dialect |
| [docs/telemetry.md](https://github.com/erikalira/agent-team-config/blob/main/docs/telemetry.md) | dispatch metrics, log fields, context contributors, the dashboard |
| [docs/team.md](https://github.com/erikalira/agent-team-config/blob/main/docs/team.md) | full roster, domain boundaries, agent conventions, Integration Review |
| [docs/tools.md](https://github.com/erikalira/agent-team-config/blob/main/docs/tools.md) | graphify and openspec integration, with their security notes |
| [docs/maintaining.md](https://github.com/erikalira/agent-team-config/blob/main/docs/maintaining.md) | editing an agent, file format, `validate.sh`, tests |
| [docs/evals.md](https://github.com/erikalira/agent-team-config/blob/main/docs/evals.md) | routing and quality evals, methodology and results |
| [docs/adr/](https://github.com/erikalira/agent-team-config/tree/main/docs/adr) | architecture decisions |

## License

[MIT](https://github.com/erikalira/agent-team-config/blob/main/LICENSE)

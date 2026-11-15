# canonkit

[![npm version](https://img.shields.io/npm/v/canonkit)](https://www.npmjs.com/package/canonkit)
[![CI](https://github.com/erikalira/canonkit/actions/workflows/ci.yml/badge.svg)](https://github.com/erikalira/canonkit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/canonkit)](LICENSE)

A versioned team of AI subagents for **Claude Code**, **Codex**, **OpenCode** and
**GitHub Copilot**. Each agent owns a domain—product, architecture, security,
quality, UX, performance, operations or docs—and rates the risk before making a
recommendation. Routine, reversible work stays with your main agent; changes
that put auth, secrets, migrations or public contracts at risk go to the agent
that owns them.

Define each agent once in [`agents/`](https://github.com/erikalira/canonkit/tree/main/agents);
canonkit generates native profiles for all four runtimes from the same Markdown
source. For Claude Code, installation preserves your permission mode and
configures supported project restrictions; Codex and OpenCode keep their own
controls. Optional hooks add extra gates—including git-bypass and secret-write
tripwires for Codex and OpenCode—only when you explicitly enable them.

> **canonkit 1.x is not canonkit 0.x.** Versions up to `0.2.0` were a different
> tool. It generated Spec-Kit-style governance templates (`.specify/`, a
> constitution, scale profiles) through `canonkit init`. That tool is archived and
> none of its commands exist here. If you used it, pin `canonkit@0.2.0`.

## Who it's for

- You use Claude Code, Codex, OpenCode or GitHub Copilot with subagents, and you want each one
  called **only when its domain is actually at risk**, not on every change.
- You want native access restrictions with the approval mode you chose preserved,
  plus durable instructions for authorization and independent HIGH-risk review.
- You want optional tripwires for commits, pushes and secret writes, with their
  coverage and limits stated explicitly.
- You want to see what delegation costs (tokens, time, report size per dispatch)
  without sending anything off your machine.

It is not a fit if you want one agent per task, or a heavy spec-first process.
canonkit can work alongside [openspec](https://github.com/erikalira/canonkit/blob/main/docs/tools.md), but it does not replace it.

## Quickstart

### Install

```bash
cd my-project
npx canonkit install
```

Requires Node 18+ on Linux, macOS and Windows; in a terminal, all four runtimes start unselected and you must choose at least one. The runtime menu is followed by project setup: Yes opens the tools, specialists and stack menus (Graphify and OpenSpec start selected; specialists and stacks start empty); Claude Code and Codex then show model and security recommendations, which you can apply, keep current or customize, before a final USER / PROJECT summary asks before any writes.

### Install without the runtime menu

```bash
npx canonkit install --copilot
```

Runtime flags suppress the menu and can be combined; repeatable `--tool`, `--specialist` and `--stack` flags select project items in scripts. `--recommended` applies recommended models and security without the interactive review, and `--no-project` limits an install to user-level changes; a selected tool still asks before setup runs, the menu does not imply `--yes` or turn on Git hooks, its prompt names the tool and project, the default report summarizes successful tool output and retains warnings and actionable tool notes, and `--verbose` shows the full output. Without a terminal and without project-item flags, install keeps its existing target defaults and does not set up a project. See [the install flow](docs/install.md#guided-install-flow) and [scope terminology](docs/install.md#terms-used-by-install).

### Preview an install

```bash
npx canonkit install --dry-run
```

Preview before writing; [the install guide](docs/install.md#guided-install-flow) describes the project-item and tool-setup preview behavior.

When Claude Code is selected and the current Git repository can be validated, installation automatically merges supported security restrictions into the project's `<project>/.claude/settings.json`. It does not set `defaultMode`, change your Auto policy, add broad `allow` rules or wire decision hooks by default. Outside a Git repository it still installs the team at user level and reports project security setup as pending; it does not put a project policy in your user settings. The sole user-level access-policy key it adds is the supported native `sandbox.network.strictAllowlist: true` lock, whose scope must be user or managed settings. It adds no destinations and changes no approval mode. A plain Claude install also unregisters attributable older canonkit hooks from user settings and the validated current project. [What each choice writes](docs/install.md#core-at-user-level).

User-level Claude paths shown as `~/.claude` follow `CLAUDE_CONFIG_DIR` when set to an absolute directory; project settings stay in the project.

**This changes the install contract:** a plain Claude installation now writes supported project security settings and removes canonical older Claude hook registrations unless you pass `--wire-hooks`. Other user settings, saved permissions and unrelated integrations are preserved. Ambiguous commands, local/managed settings and other projects are left for manual review. [Migration and recovery](docs/install.md#returning-existing-claude-installations-to-native-approvals). Native Windows remains supported with partial protection: Claude's shell commands there have no OS sandbox. [Environment coverage](docs/install.md#native-security-per-project).

### Choose models

```bash
npx canonkit models setup
npx canonkit install --claude --codex
```

Agents use your session's model until you choose otherwise; to pick model and effort per need level from what your harness offers, answer Yes during interactive `npx canonkit install` instead, or run the commands above. Claude Code and Codex apply these choices; OpenCode and Copilot inherit the session model. See [Choosing models](docs/install.md#choosing-models).

### Verify installation

```bash
npx canonkit doctor
# Expected: checks report OK, WARN or FAIL; doctor exits with 1 if any check fails.
# Warning: the security report distinguishes configured settings from runtime evidence and does not prove a verified boundary.
```

`doctor` only reads; coverage has separate partial, unavailable and unknown results, correct native Windows configuration can be partial without being a failed installation, and missing runtimes you did not install for are not Claude-specific installation failures.

### Check Claude Code

```text
/agents
# Expected: the ten core agents (scott, archie, bob, ...) are listed.
```

Open a new Claude Code session in any project, then inspect `<repo>/.claude/settings.json` and the security report; your selected Manual, Auto, Edit automatically or Plan mode still controls ordinary approvals.

### Wire optional decision hooks

```bash
npx canonkit install --wire-hooks
```

This wires only runtimes selected for that install: Claude uses `~/.claude/settings.json`, Codex uses `$CODEX_HOME/hooks.json` (review `/hooks` once to trust it), and OpenCode uses its plugin. Hook `ask` decisions can force prompts even in Auto; choose this only when you want those additional gates. [Hook behavior](docs/hooks.md#native-controls-and-optional-hooks).

### Start the optional dashboard on Linux, macOS or Git Bash

```bash
node ~/.claude/canonkit-dashboard/serve.js
```

### Start the optional dashboard in Windows PowerShell

```powershell
node $HOME\.claude\canonkit-dashboard\serve.js
```

The dashboard runs locally and shows dispatches, tokens and gates recorded by the optional hooks; without those registrations, it does not create new dispatch telemetry. Open `http://localhost:4317`. [What it records](https://github.com/erikalira/canonkit/blob/main/docs/telemetry.md).

<!-- canonkit:security-settings:start -->
## Recommended security settings

This is the configuration `npx canonkit install --claude` aims for on macOS, or on
Linux/WSL2 with `bwrap` and `socat`, with Claude Code 2.1.314 or later (older
versions get fewer keys; `npx canonkit doctor` shows which). Project policy
lives in the project's `.claude/settings.json`; machine-specific policy lives
in your user settings. `a.b.c` below means key `c` inside `b` inside `a`. A
`settings.local.json` or managed policy can override these values, and `doctor`
flags conflicts. `npx canonkit doctor` shows what is missing. Per-version and per-platform detail,
the install review prompt and the non-interactive behavior are in
[docs/install.md](docs/install.md#security-review-during-install).

Project, `<project>/.claude/settings.json`:

```json
{
  "permissions": {
    "blockReadsOutsideWorkingDirectories": true,
    "blockWritesOutsideWorkingDirectories": true
  },
  "sandbox": {
    "enabled": true,
    "failIfUnavailable": true,
    "allowUnsandboxedCommands": false,
    "autoAllowBashIfSandboxed": true
  }
}
```

User, `~/.claude/settings.json`:

```json
{
  "sandbox": {
    "network": {
      "strictAllowlist": true
    },
    "filesystem": {
      "allowRead": [
        "~/.nvm",
        "~/.local/bin",
        "~/.local/share/pipx"
      ]
    }
  }
}
```

The `allowRead` list above is an example for nvm and pipx. The real list is
detected per machine, and an interactive install asks before adding it.

| Key | File | Why it exists, and what breaks without it |
| --- | --- | --- |
| `permissions.blockReadsOutsideWorkingDirectories` | project | file tools cannot read your other projects or home data; without it a prompt injection can read them |
| `permissions.blockWritesOutsideWorkingDirectories` | project | file tools cannot write outside this project; without it they can change files anywhere you can |
| `sandbox.enabled` | project | shell commands run in an OS sandbox; without it they run with all your user rights |
| `sandbox.failIfUnavailable` | project | a missing sandbox stops commands; without it they silently run unsandboxed |
| `sandbox.allowUnsandboxedCommands` | project | no command can escape the sandbox; without it a failed command may be retried outside it |
| `sandbox.autoAllowBashIfSandboxed` | project | sandboxed commands run without a prompt each, so project scripts run unprompted: use only with projects you trust (see docs/install.md); without it every command prompts and approvals pile up as permissions.allow rules |
| `sandbox.network.strictAllowlist` | user | sandboxed commands reach only domains you allowed, and project settings cannot widen it (from Claude 2.1.285) |
| `sandbox.filesystem.allowRead` | user | sandboxed commands can still read the runtimes they need (node, pipx tools) while the rest of home stays closed; detected per machine |
<!-- canonkit:security-settings:end -->

## How it decides: LOW vs HIGH

Every agent uses one shared risk scale:

- **LOW**: local and reversible. No public contract, auth, sensitive data or
  shared runtime.
- **MEDIUM**: a rule, flow, integration, configuration or shared refactor that
  changes behavior, with a concrete regression risk.
- **HIGH**: auth, secrets, migrations, public contracts, new services, payment, a
  production deploy, or anything that is hard to roll back.

### Risk and scale are two different questions

**Risk** is what this change can break. **Scale** is how much is around it: real
users, blast radius, rollback cost, people who must agree. Scale calibrates four
things, in both directions: **evidence, scope, reviews and validation**. It never
changes which rules apply:

| | Small scale (one person, easy rollback) | Large scale (real users, wide blast radius, costly rollback) |
|---|---|---|
| **Evidence** | Reuse what is still valid; a focused check can be enough. | Fresh evidence for every path the change affects. |
| **Scope** | The smallest solution that meets acceptance. | Still the smallest that meets acceptance, plus a rollout and rollback plan. |
| **Reviews** | No fixed chain: an extra reviewer only for a distinct gap. | The owners whose risks the change names, and more coordination. |
| **Validation** | The affected path. | The affected paths, wider and in stages. |
| **Never waived** | HIGH's mandatory owners and independent review, security checks, contracts, validation of the boundary the change touches, the documentation impact. | The same list. |
| **The excuse it does not buy** | "It's one line, it doesn't need review." | "It's 40 files, we can't validate every path." |

New infrastructure needs a current requirement or reuse that already exists, at
any scale: "we might need it later" is not one.

Both examples below come from the [routing eval](https://github.com/erikalira/canonkit/blob/main/docs/evals.md#routing-eval)
cases:

**"Fix the typo `recieve` in README.md."** This is LOW. The main agent fixes it
inline and dispatches no one. A dispatch would cost a cold start, plus a report
that gets re-read on every later turn, for a one-word fix.

**"Add refresh tokens to `src/auth/session.js`."** This is HIGH, because it
touches auth. Here is what happens:

1. The main agent plans to bring in **Gard** (security), the owner of auth.
2. The main agent follows the authorization and review instructions. If you also
   wired the optional hooks, editing `src/auth/session.js` fires their HIGH-risk
   gate and you confirm the edit.
3. The work is not done on the author's word. With hooks wired, the Stop gate
   checks whether an independent reviewer (Quinn, Gard, Archie, Perry or a
   project reviewer) was dispatched, or resumed with a message, **after the last
   gated edit**. If none was, it blocks the turn once
   and asks for one.

There is a case in between: fixing a typo in a *comment* in
`src/auth/messages.js`. The optional gate still fires, because the file is in `auth/`. The
risk is still LOW, though, and the expected behavior is to confirm, explain why,
and **not** pull in Gard. A gate tells you to look again at the risk; it does not
make the change HIGH.

## The team

**Core**: installed at user level and available in every project.

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

**Specialists**: not installed by default. A project gets one only when you
choose it in the install flow or add it explicitly, so no agent gets called
just to round out the list:

| Agent | Install when the project has... |
| --- | --- |
| **maya** | gameplay or gamification: core loop, progression, balance |
| **nova** | UI visual design and cross-media art direction: typography, composition, colour, characters and VFX |
| **echo** | sound that carries meaning: SFX as feedback, adaptive music |
| **dana** | real users and data: telemetry, funnels, A/B tests |
| **iris** | ML or computer vision: extraction, datasets, model evaluation |

### Add project specialists

```bash
cd my-project
npx canonkit add maya nova
# Expected: writes native agent profiles and the project's AGENTS.md.
```

**A veto is narrow.** An agent can use its veto only inside its own domain, on a
MEDIUM or HIGH change, and only against a risk it can name. You can overrule a
veto. When you do, the agent records the open risk and keeps helping. Who owns
what at the boundaries, the conventions every agent follows, and the Integration
Review are in [docs/team.md](https://github.com/erikalira/canonkit/blob/main/docs/team.md).

## Stack packs, per project

**Optional skills** add language, framework and design-practice guidance to the existing team.
Choose the packs your project uses; each is installed separately from the core.

| Pack | Guidance |
| --- | --- |
| [TypeScript](stack-packs/typescript/SKILL.md) | Type safety, async boundaries and module/build diagnostics |
| [C++](stack-packs/cpp/SKILL.md) | Resource ownership, lifetimes, concurrency and compiler/linker diagnostics |
| [C# / .NET](stack-packs/csharp/SKILL.md) | Nullability, async/resource lifetimes and solution/project builds |
| [Java](stack-packs/java/SKILL.md) | Resources, concurrency and Maven/Gradle diagnostics |
| [Python](stack-packs/python/SKILL.md) | Runtime data, mutable state, resources, async and environments |
| [React](stack-packs/react/SKILL.md) | Hooks, state/effects, hydration and configured framework boundaries |
| [Rust](stack-packs/rust/SKILL.md) | Ownership, lifetimes, async/unsafe invariants and Cargo diagnostics |
| [Go](stack-packs/go/SKILL.md) | Errors, goroutines/channels and module/workspace builds |
| [Kotlin](stack-packs/kotlin/SKILL.md) | Nullability, coroutines/Flow and JVM/Android/multiplatform builds |
| [Swift](stack-packs/swift/SKILL.md) | ARC, actors/concurrency and SwiftPM/Xcode diagnostics |
| [UI design](stack-packs/ui-design/SKILL.md) | Identity-preserving direction, representative screen and visual handoff |
| [UI review](stack-packs/ui-review/SKILL.md) | Rendered finish, accessible interaction, states and motion evidence |
| [Game art direction](stack-packs/game-art-direction/SKILL.md) | Character, environment and VFX coherence at intended scale |

### Add, inspect and remove packs

```bash
cd my-project
npx canonkit add typescript react
npx canonkit list
npx canonkit remove react
```

All packs are independently opt-in, including the three design-practice IDs above
when using a CLI that includes them; this table lists availability, not installed
state. No pack installs Nova, Maya or another pack. Existing agents update only
through explicit reinstall/re-add; see [installation](docs/install.md#stack-packs-per-project)
for updates and removal before downgrade: remove every pack the expanded CLI added
or re-added, not only the three design IDs; older installs show `partial` until
added again.

React and TypeScript are independent. Adding a pack installs its instructions;
it does not install compilers, runtimes or project dependencies.

Copies go to the project's `.agents/skills/canonkit-<stack>/`,
`.claude/skills/canonkit-<stack>/` and `.github/skills/canonkit-<stack>/`.
Local edits and unrelated files are preserved;
repeating `add` updates intact copies. Details, recovery and removal are in
[docs/install.md](https://github.com/erikalira/canonkit/blob/main/docs/install.md#stack-packs-per-project).

## When a gate fires

These optional gates require explicit wiring. This table is Claude Code. Codex and OpenCode, once wired, enforce only the git
bypass block and the secret block, with the same reason text
([which gate does what where](https://github.com/erikalira/canonkit/blob/main/docs/hooks.md#codex-and-opencode)).
The git, secret, HIGH-risk and performance prompts start with `canonkit gate`. The Stop gate starts with `Definition-of-done
gate`. The context-size reminder is plain text.

| Gate | Fires when | What to do |
| --- | --- | --- |
| **git commit / push** | any `git commit` or `git push`, including behind `git -C dir` or `git -c key=value` | Confirm only if you asked for it. |
| **git hook / signing bypass (block)** | `--no-verify`, `git commit -n`, `--no-gpg-sign`, `-c core.hooksPath=...` or `-c commit.gpgsign=false` | It is denied. Fix what the hook reported. If you really mean to skip it, run the command yourself (`!` in Claude Code). Details in [docs/hooks.md](https://github.com/erikalira/canonkit/blob/main/docs/hooks.md#what-the-git-gates-read). |
| **Secret (block)** | a private key or cloud key would be written to a file | It is denied. Move the value to an env var or a secret store. |
| **Secret (ask)** | something looks like a hardcoded credential | Confirm only if it is not a real secret, such as a test fixture. |
| **HIGH-risk surface** | an edit or shell write to an auth, secret, migration or contract path | The prompt asks for who imports or calls the file, which public contract it touches (or "none") and the rollback: answer before confirming. Look again at the risk. If it really is HIGH, plan the owner's review (Gard, Archie). If it is LOW, confirm and say why. |
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
are in [docs/hooks.md](https://github.com/erikalira/canonkit/blob/main/docs/hooks.md).

### If no gate ever fires

Without `--wire-hooks`, no canonkit decision gate is expected; the harness's
native approvals and project restrictions remain active. If you opted into the
hooks and a gate does not fire, run `npx canonkit doctor`. The hook fails open on
purpose, so a broken or unregistered hook never blocks your session. That also
means a broken hook gives no warning of its own.

## Runtimes

| Runtime | Agents | Rules | Hooks and gates |
| --- | --- | --- | --- |
| Claude Code | `~/.claude/agents` | `~/AGENTS.md` + block in `~/.claude/CLAUDE.md` | native project controls; gates only when explicitly wired |
| Codex | `$CODEX_HOME/agents/*.toml` (`~/.codex`) | `~/AGENTS.md` + block in `$CODEX_HOME/AGENTS.md` | the two deny gates (git bypass, secrets), once wired; the rest by judgment |
| OpenCode 2 (opt-in) | `~/.config/opencode/agents` | block in `~/.config/opencode/AGENTS.md` | the two deny gates, plus a prompt on `git commit`/`git push` as typed, once wired; the rest by judgment |
| GitHub Copilot (opt-in) | `~/.copilot/agents/*.agent.md` | profile descriptions + project `AGENTS.md` | no CanonKit hooks; uses Copilot's native agent profiles |

How each target is generated, including Copilot profiles and why OpenCode is opt-in:
[docs/install.md](https://github.com/erikalira/canonkit/blob/main/docs/install.md#github-copilot).
Which gate does what in each runtime:
[docs/hooks.md](https://github.com/erikalira/canonkit/blob/main/docs/hooks.md#codex-and-opencode).

## Commands

| Command | What it does |
| --- | --- |
| `install` | core distribution at user level; interactive project menus for tools, specialists and stack packs; repeatable `--tool`, `--specialist`, `--stack` selectors; supported native Claude security and user-scoped strict-network lock (`--claude` / `--codex` / `--opencode` / `--copilot` skip the runtime menu) |
| `install --verbose` | prints every step and full selected-tool output; the default names tool actions before confirmation and summarizes successful output |
| `install --wire-hooks` | distribution and native security; skips Claude hook cleanup and wires supported hooks (Claude Code, Codex, OpenCode) |
| `doctor` | read-only installation and security diagnosis; exits 1 on `FAIL` |
| `reference` | only the user-level blocks and skills |
| `uninstall [--claude] [--codex] [--opencode] [--copilot]` | remove tracked user-level artifacts; without flags, all recorded harnesses |
| `uninstall --project` | reverse attributable security changes only in the validated current project |
| `add <name>...` / `remove <name>...` | specialists or stack-pack skills in the current project |
| `list` | the roster and what is installed where |
| `tool add\|remove\|list` | integrate [graphify or openspec](https://github.com/erikalira/canonkit/blob/main/docs/tools.md) in the current project |

`--dry-run` works on every command that writes: it reports what would change and
writes nothing.

## FAQ

**What does it cost per turn?** Claude Code lists every installed agent's
description on every turn. That list plus the two user-level blocks comes to about
3k tokens. An agent's full body (~1–2k tokens) loads only when the agent is
dispatched. [Measurements](https://github.com/erikalira/canonkit/blob/main/docs/evals.md#always-loaded-cost).

**Will it dispatch agents on every small change?** It shouldn't. LOW work stays
inline by rule. Before each release that changes the instructions, the routing
eval checks this with cases like the typo fix above. If you see it happen anyway,
please [open an issue](https://github.com/erikalira/canonkit/issues).

**Can I edit an installed agent?** Not in place: the next `install` overwrites
`~/.claude/agents` and the managed blocks. To change one, create a
project agent with a different name, or change the source here and reinstall
([docs/maintaining.md](https://github.com/erikalira/canonkit/blob/main/docs/maintaining.md)). Text outside the managed block
markers in `~/AGENTS.md` and `~/.claude/CLAUDE.md` is yours and is preserved.

**Does anything leave my machine?** The hook keeps telemetry local in
`~/.claude/canonkit-activity/`; new records omit task descriptions and command
fragments, but still include paths and identifiers alongside counts and timing.
Older records can retain those texts until rotation. Both
[incidental findings for the project's backlog](https://github.com/erikalira/canonkit/blob/main/docs/out-of-scope-issues.md)
and the optional
[Learning Loop contribution](https://github.com/erikalira/canonkit/blob/main/docs/learning-loop.md#contributing-a-general-improvement)
supply sanitized drafts; writing or publishing them requires your review and
explicit authorization. CanonKit itself sends nothing. A finding leaves your
machine only when you publish it: through a tracker such as GitHub issues, or
in a contribution. A backlog file such as `todo.md` is edited locally, but if
your repository tracks it, the entry is published with your next push. That is
why entries are sanitized, and why vulnerabilities and secrets are never
written there. Raw logs and personal memories do not belong in a contribution.
[Field list](https://github.com/erikalira/canonkit/blob/main/docs/telemetry.md#stable-fields).

**A gate fired on a change I'm sure is LOW.** Confirm it and say why. If the same
path keeps triggering the gate for no reason, add it to `highRisk.exclude` (see
[When a gate fires](#when-a-gate-fires)).

**How do I uninstall?** Run `npx canonkit uninstall --dry-run` to preview, then
`npx canonkit uninstall` (or select harnesses with flags). It uses the install
manifest, backs up edited owned artifacts, preserves observed artifacts intact
and keeps content outside managed
blocks. Pre-manifest installations and ambiguous wiring need manual cleanup; see
[docs/install.md](https://github.com/erikalira/canonkit/blob/main/docs/install.md#uninstalling).
Project security is separate: from that project, use
`npx canonkit uninstall --project --dry-run`, then `npx canonkit uninstall --project`.
A user-level uninstall does not search for or remove project policies.

**I'm upgrading from `meu-time`.** `install` migrates the log folder and leaves a
forwarder for the old hook name. See
[docs/install.md](https://github.com/erikalira/canonkit/blob/main/docs/install.md#upgrading-from-meu-time).

## Documentation

| Doc | For |
| --- | --- |
| [docs/install.md](https://github.com/erikalira/canonkit/blob/main/docs/install.md) | what each install writes, Codex/OpenCode details, specialists, reference blocks and skills, upgrade, uninstall |
| [docs/hooks.md](https://github.com/erikalira/canonkit/blob/main/docs/hooks.md) | hook wiring, the gates per runtime, failure mode, `canonkit.json` rules and glob dialect |
| [docs/telemetry.md](https://github.com/erikalira/canonkit/blob/main/docs/telemetry.md) | dispatch metrics, log fields, context contributors, the dashboard |
| [docs/team.md](https://github.com/erikalira/canonkit/blob/main/docs/team.md) | full roster, domain boundaries, agent conventions, Integration Review |
| [docs/tools.md](https://github.com/erikalira/canonkit/blob/main/docs/tools.md) | graphify and openspec integration, with their security notes |
| [docs/maintaining.md](https://github.com/erikalira/canonkit/blob/main/docs/maintaining.md) | editing an agent, file format, `validate.sh`, tests |
| [docs/evals.md](https://github.com/erikalira/canonkit/blob/main/docs/evals.md) | routing and quality evals, methodology and results |
| [docs/learning-loop.md](https://github.com/erikalira/canonkit/blob/main/docs/learning-loop.md) | investigate mistakes and propose evaluated instruction changes |
| [docs/out-of-scope-issues.md](https://github.com/erikalira/canonkit/blob/main/docs/out-of-scope-issues.md) | preserve incidental findings and approve their entries for the project's backlog in a batch |
| [docs/adr/](https://github.com/erikalira/canonkit/tree/main/docs/adr) | architecture decisions |

## License

[MIT](https://github.com/erikalira/canonkit/blob/main/LICENSE)

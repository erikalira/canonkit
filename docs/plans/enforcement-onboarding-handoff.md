# Handoff: enforcement + onboarding fixes (2026-10-21)

Source: a review of canonkit 1.1.4 from an installer's point of view. Enforcement
scored 6.5/10 and onboarding 4.5/10; the rest of the package (proportionality,
roster, agent writing, evals) is not in scope. Nothing below is implemented yet.

Decisions already made by the user:

- The installer-facing README is **English**, a single file.
- "Meu Time" is renamed to **canonkit** everywhere: `hooks/canonkit-hook.js`,
  `~/.claude/canonkit-activity/`, gate messages ("canonkit gate (Gard): ...").

## Problems found

1. **Hook wiring is manual.** `install` copies the hook but only *prints* the
   `settings.json` JSON (bin/cli.js, hook post-check ~L410-470). Skip that step and
   every `[ENFORCED]` rule silently is not enforced.
2. **HIGH-risk path regex is broad** (hooks/meu-time-hook.js `HIGH_RISK_WORD`,
   ~L311): `sessions`, `contracts`, `permissions`, `gateway` match ordinary UI and
   domain folders. Confirmation fatigue teaches users to approve blindly.
3. **Perf-budget gate only knows `lighthouserc`** (`PERF_BUDGET_PATH`, ~L323),
   while Perry is stack-agnostic.
4. **"Meu Time" leaks to installers**: hook filename, log dir, gate messages,
   dashboard, routing block, tests, README, roadmap.
5. **README** (~7.5k words) mixes PT/EN and carries maintainer history ("Fase 7",
   commit hashes, "antes era..."), burying the install path.
6. **Specialists (maya, nova, echo, dana, iris) have zero eval cases**.

## Jobs, in order

Each is one session. A and B share files, so they run sequentially; D is
independent and may run any time.

### A — Hook: rename + calibration (HIGH: the enforcement surface itself)

- Rename `hooks/meu-time-hook.js` -> `hooks/canonkit-hook.js`; log dir
  `meu-time-activity` -> `canonkit-activity`. Update bin/cli.js (hook map ~L40,
  install), dashboard/serve.js + index.html, reference/routing-block.md,
  test/meu-time-hook.test.js (rename too), test/cli.test.js, test/dashboard.test.js.
- Migration on `install`: if `~/.claude/hooks/meu-time-hook.js` exists, keep the
  existing `.local.bak` behavior for a diverged copy, remove the old file, and
  report that settings.json still points at the old name (B fixes that). Move or
  read-through the old `events.jsonl` so the dashboard and the Stop gate keep
  history; the Stop gate must not lose a gated edit made just before upgrading.
- Calibrate `HIGH_RISK_WORD`: keep strong tokens; make the ambiguous words
  (`sessions`, `contracts`, `permissions`, `gateway`, `login`) require a code-ish
  context or add a per-project allow/deny list. Proposed config:
  `.claude/canonkit.json` -> `{ "highRisk": { "include": [...], "exclude": [...] },
  "perfBudgets": ["lighthouserc*", "size-limit*", ...] }`. **Exclude may never
  silence secret detection** (content check) — only path heuristics.
- Make `PERF_BUDGET_PATH` a default list (lighthouserc, .size-limit*, bundlesize,
  budget.json, k6 thresholds...) extended by the config above.
- Tests: false-positive fixtures (`src/components/SessionsList.tsx`,
  `docs/contracts-overview.md`?) and false-negative guards (`.env`, `auth/`,
  `migrations/`, `.npmrc`) — decide each case explicitly.
- Reviewers after the last edit: **Gard** (gate coverage, config cannot be used
  to disable secret blocking), **Perry** (perf-budget gate scope), **Quinn**
  (regex cases, migration). Archie only if the config file becomes a public
  contract other tools read — it does, so name it in the review.

### B — `canonkit doctor` + `install --wire-hooks` (HIGH: writes user settings)

- `canonkit doctor`: read-only; checks agents installed and identical in both
  dirs, reference blocks present, hook on disk, hook registered per event with
  the required matchers, `node --check` passes, log dir writable; non-zero exit
  on failure; one line per check.
- `install --wire-hooks`: merges the hook entries into `~/.claude/settings.json`
  — backup first, atomic write (`ctx.writeAtomic` exists), update an existing
  canonkit/meu-time entry instead of duplicating it, never touch other keys,
  refuse on invalid JSON. Without the flag, keep today's print-only behavior but
  end with "run `npx canonkit doctor`".
- Reviewers: **Gard** (writing a file that carries permissions), **Quinn**.

### C — README rewrite (MEDIUM, docs)

- English, installer-first: what it is, install, wire hooks / doctor, what each
  gate does and how to tune it (config from A), specialists, uninstall/upgrade
  from meu-time. Target well under 2k words.
- Move maintainer material (validation internals, eval methodology and results,
  history) to `docs/` (e.g. docs/maintaining.md, docs/evals.md) — move, do not
  delete; README links to it.
- Reviewer: **Spencer**.

### D — Specialist eval cases (MEDIUM, quality)

- Add positive / adversarial / low cases for maya, nova, echo, dana, iris to
  evals/quality-cases.json, following the core-agent shape; extend the hermetic
  coverage test. Real runs (`npm run eval:quality -- --runs 3`) cost credits:
  ask before running.
- Reviewer: **Quinn**.

## Before closing everything

- `npm test` and `npm run validate` green; version bump (rename is breaking for
  anyone reading the log path: minor at least, note it in release notes).
- Commit/push only when the user asks; branch is `feat/improve-roadmap`.

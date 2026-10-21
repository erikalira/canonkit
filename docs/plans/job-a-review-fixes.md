# Job A — review fixes (2026-10-21)

Job A of `enforcement-onboarding-handoff.md` is implemented but **uncommitted**
on `main` (handoff says branch `feat/improve-roadmap` — decide before commit).
`npm test` (209 pass, 1 pre-existing symlink skip) and `npm run validate` were
green before these fixes. Reviewers: Gard, Perry, Quinn, Archie. Quinn vetoed on
B1/B2; the others approved with conditions. After the fixes, **re-dispatch Gard
and Quinn** (review must post-date the last edit).

Reviewer probe scripts (useful as fixtures):
`C:\Users\lirae\AppData\Local\Temp\claude\c--Users-lirae-Documents-dev-agent-team-config\236cb6e9-593f-4417-8aec-9c00b72eab34\scratchpad\`
(probe.js, redos.js, run.js, redos2.js) — may be gone; findings below are enough.

## Blockers (fix first, test-first)

1. **ReDoS in `globMatcher`** (hooks/canonkit-hook.js, PROJECT CONFIG). `*a`×20+`b`
   took >100 s; `**/a`×30 hung. A hook that times out is non-blocking, so every gate
   (secret deny included) fails open, and a cloned repo's config can trigger it.
   Fix: replace the regex with a linear wildcard matcher (segment-aware two-pointer,
   O(n·m)), or collapse star runs + cap wildcards per glob (~8). Test: hostile globs
   (`*a`×20+`b`, `**?`×10+`#`, `**/a`×30+`/**/b`) on long paths finish < 50 ms.
2. **Path normalization.** Normalize every path once (posix-normalize after
   `\`→`/`, collapse `//` and `./`, resolve `..`, strip NTFS ADS suffix `::$DATA` /
   `:stream`, MSYS `/c/...` → `C:/...` when on win32) and run ALL checks
   (CONFIG_PATH, include, NOISE/TEST, SECRET_PATH, exclude, heuristics, perf) on the
   normalized form. Bypasses to turn into `ask` tests:
   - `src/legacy/../auth/x.ts` with `exclude: ["src/legacy/**"]` (Edit + Bash)
   - `src/components/../server/permissions.ts` (presentational escape)
   - `node_modules/../.env`, `build/../.env` (noise before secret)
   - `.claude/./canonkit.json`, `.claude//canonkit.json`, `.claude/canonkit.json::$DATA`
   - `include: ["src/payments/**"]` vs `./src/./payments/a.ts`, `src//payments/a.ts`,
     MSYS `/c/.../src/payments/a.ts`

## Should fix in this round

3. **Always leave the forwarder** for `~/.claude/hooks/meu-time-hook.js` (bin/cli.js
   `upgradeFromMeuTime`): a project-level `.claude/settings.json` can still run it and
   we cannot scan projects. Drop the remove branch; keep `.local.bak` once. Test: only
   a project settings file references it → forwarder present and gating.
4. **Log migration race:** if both `meu-time-activity` and `canonkit-activity` exist,
   append old `events.jsonl.1` + `events.jsonl` into the new log (old first? new log
   is append-only and gate logic uses ts, so prepend-by-rewrite: old.1, old, new.1,
   new → new), then remove the old dir; never repeat the note forever. Tests:
   legacy `.1` file, empty old dir + populated new, rename failure (EBUSY/EPERM) still
   exits 0, `settings.local.json` reference.
5. **Perf defaults (Perry):** `*perf*budget*` matches "superfluous" → use separator-
   bounded `*perf[-_]budget*` / `*performance[-_]budget*` (write as explicit globs);
   skip `.md/.mdx` for DEFAULT globs only (explicit `perfBudgets` still gate prose);
   skip NOISE (node_modules, dist, build) for defaults; add `bundlewatch*`,
   `.bundlewatch*`, `*.budgets.json`; `budget.json`/`budgets.json` at any depth is an
   accepted trade-off → record it in a test (`src/finance/budget.json` asks) OR narrow
   to a lighthouse/perf ancestor — Perry offered either. Negative tests:
   `superfluous-budget.ts`, `perfBudgetFormatter.ts`?, `docs/performance-budget.md`.
   README: angular.json / package.json size-limit / next.config / webpack hints are
   opt-in via `perfBudgets`; inline k6 thresholds are a known gap.
6. **SECRET_PATH (Gard P3):** add key files: `*.pem`, `*.key`, `*.p12`, `*.pfx`,
   `id_rsa`/`id_ed25519`/`id_ecdsa`, `kubeconfig`, `.pgpass`, `*.tfvars`, `*.tfstate`.
   Note this is a NEW default gate (MEDIUM) — say so in release notes.
7. **NOISE_PATH substring bug (pre-existing):** `src/distribution/auth/x.ts`,
   `src/buildings/auth/x.ts` are allowed. Anchor to whole segments.

## Contract items (Archie)

8. Config lookup: `CLAUDE_PROJECT_DIR` → walk up from cwd to first
   `.claude/canonkit.json` (stop at home / fs root) → cwd. `rel()` uses that root.
9. Reserve optional `"version": 1`; unknown keys ignored (document it).
10. Trailing `/` in a glob = `dir/**`. Document dialect as "gitignore-like, not
    gitignore": no `!`, no `[...]`, case-insensitive.
11. Export `projectConfig`/`globMatcher` from the hook; guard main with
    `require.main === module` (the forwarder uses `require` — make the forwarder call
    an exported `run()` instead, or it will stop gating!). `projectConfig` returns
    `ignored: [{where, why}]` for doctor. Test: malformed fixture → defaults + ignored.
12. Docs: list stable `events.jsonl` fields; unknown fields ignored. Legacy
    (meu-time) handling sunsets in 2.0 — note in plan/release notes.

## Decision needed from the user (Gard P2 #5)

A repo-committed `exclude: ["**"]` silently turns off auth/migration/contract gates
for anyone who clones (a clone never passes the edit gate). Options:
- (a) reject catch-all excludes (`*`, `**`, `**/*`) + log an `excluded-by-config`
  event so the dashboard shows it;
- (b) (a) plus: never let `exclude` silence STRONG terms (auth, migrations) — only the
  ambiguous words and the ordinary WORD list;
- (c) honor a project config only after its hash is approved and recorded in
  `~/.claude` (trust-on-first-use) — changes the contract, needs Archie.

## Backlog (not job A)

- Stop gate counts gate events from reviewer subagents' own probes (they share the
  session id) — skip gate events whose PreToolUse carries `agent_id` of a reviewer,
  or only count main-thread gates. Seen this session.
- Job B: `--wire-hooks` must rewrite the old command and delete the forwarder;
  doctor WARNs on a remaining forwarder and prints the resolved config + `ignored`.
- Shell write targets miss `cp`, `mv`, `sed -i`, `node -e`, quoted paths with spaces.

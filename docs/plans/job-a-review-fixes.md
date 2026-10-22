# Job A — review fixes (2026-10-21)

Job A of `enforcement-onboarding-handoff.md` is **committed on `main`**: the
implementation in 698ad04, the review fixes (rounds 1–3) in aa50ed0.
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

**Decided: (b).** Catch-all excludes go to `ignored`; STRONG terms, migrations
and secret paths are beyond `exclude`; a silenced gate logs `excluded-by-config`.
Side effect handled: with no escape hatch left on STRONG terms, `author` (not
`authorize`) no longer matches `auth`.

## Status (2026-10-21, second session)

Items 1–12 applied on top of commit 698ad04 (committed in aa50ed0).
Tests written first for B1/B2. Gard and Quinn re-review after the last edit.

Round 2 (from that re-review; tests first, seen failing):
- Gard P1: HARD_SECRET runs before the config is read; config read only if a
  regular file ≤ 64 KiB; only the first 100 entries per list, rest = one line.
- Gard P2: lookup walks up from cwd first, CLAUDE_PROJECT_DIR is the fallback
  (worktrees). Catch-all = matches most of 10 sample paths (`*.*`, `**/*.*`).
  Stop gate reads events.jsonl.1 too.
- Quinn C1: `..` stops at a drive root; `\\?\` / `\\?\UNC\` prefixes stripped.
- Quinn C2: `author` carve-out is the lowercase word only (author, authors,
  authored, authorship); authority, authOrRedirect, etc. ask.
- Quinn M1 (decided): migrations in prose files (.md, .txt...) do not gate;
  in code they always do, beyond exclude.
- L2: camelCase `*perfbudget.*` defaults restore perfBudget.json coverage.
- L3: hook tests run from the fake HOME and create projects under it.
- L5: a failed merge restores events.jsonl.1; dry-run with both logs tested.
- L6: dashboard does not count excluded-by-config as fired; shows the glob.
- Open, for the user: Gard P3 — gate `.claude/settings*.json` as config
  (`disableAllHooks` turns every gate off). Not done: changes gate scope.
- Not done: Linux run (no CI; POSIX branch untested — run once before release).

Round 2 review (after the last edit): **Gard approve, Quinn veto lifted, Perry
accepts the perf default list.** Nothing blocks a commit.

## Round 3 candidates (all LOW, optional; any hook edit needs a fresh review)

1. Catch-all on the union of excludes, not per glob (`["*.ts","*.go","*.rb","*.py"]`
   and `*s*` pass today; reach = ambiguous words + token names only).
2. Lookup order (Gard + Quinn): when cwd is inside CLAUDE_PROJECT_DIR, stop the
   walk at it (checking it too) — no parent `/tmp/.claude/canonkit.json`. A nested
   config (submodule, example) still replaces the project's while cwd is inside
   it; add a test. This reverses item 8's order → **Archie must acknowledge**
   (public contract).
3. `AUTHORS`/`AUTHORS.md`/`src/authoring/` ask with no escape: allow uppercase
   AUTHORS as a word and `authoring`, or record the trade-off in a test.
4. Perry (optional): `*perfbudget-*`, `*perfbudget_*`, `*performancebudget-*`,
   `*performancebudget_*` for `perfBudget-prod.json`.
5. L5 restore path untested (needs an injected write failure) — fine to leave.
6. User decision pending: gate `.claude/settings*.json` as config (Gard P3).
7. Backlog for job B: the Stop gate counts reviewers' probe gates (shared
   session id) and does not see a reviewer resumed by SendMessage (no
   agent_start) — both fired this session.

## Round 3 (2026-10-21, third session) — items 1–4 applied, tests first

- 1: excludes are judged together; the glob that tips the union over the
  catch-all line (and any after it that would) is ignored, earlier ones stand.
- 2: **Archie accepted** cwd-first + CLAUDE_PROJECT_DIR fallback as the contract
  (item 8's order withdrawn; pre-release, no migration), the bound at
  CLAUDE_PROJECT_DIR when cwd is inside it (segment-wise, case-insensitive on
  win32), and nearest-wins with no merge. Residual risk for Gard: a submodule's
  config is third-party content and drops the project's `include` while cwd is
  inside it. Recommendation (job B): doctor prints the config `file` and `root`.
- 3: uppercase `AUTHORS`/`AUTHOR` as a whole word and `authoring` are author;
  `AUTHORITY`, `AUTH_OR_GUEST` stay auth.
- 4: `*perfbudget-*`, `*perfbudget_*`, `*performancebudget-*`, `*performancebudget_*`.
- Review: **Gard approve with P1, Quinn approve.** Applied (tests first, seen
  failing): Gard P1 — noise/test folders count only on a project-relative path,
  so a file outside a nested config's folder fails closed (a `build/` above the
  project let .env through; pre-existing, reachable via nested configs; the
  soft-secret test-file skip uses the same rule); Gard P3 — MSYS `/c/...`
  CLAUDE_PROJECT_DIR/cwd normalized before resolve; Quinn — cwd == project dir
  test, union reason says "with the excludes before it", perfBudget-formatter.ts
  pinned as an accepted over-match, sibling-prefix test marked as documentation,
  README drift. Re-review after that edit: **Gard approve (P1 closed), Quinn
  approve** with one condition, applied after: a test pinning absolute in-project
  test/noise paths as still skipped (Windows + MSYS forms) and a README/release-note
  clause that the skips hold only inside the config folder. Test and docs only;
  the hook is unchanged since the last review. Nothing blocks a commit.
- Job B (Gard P2): also apply the project's own `include` when the nearest
  config sits below CLAUDE_PROJECT_DIR (adds gates only); doctor prints
  `file`/`root`. Known P3: the catch-all samples miss `*.js`, `src/**`
  (reach = ambiguous words + token names).

## Release notes (draft, for the version bump — jobs A + B)

Job B items come from docs/plans/job-b-doctor-wire-hooks.md.

- **Breaking:** the hook is `canonkit-hook.js` and its log is
  `~/.claude/canonkit-activity/`. `install` moves or merges the old log and
  leaves `meu-time-hook.js` as a forwarder; only `install --wire-hooks` removes
  it, and only when it is the unedited forwarder and no settings file it can see
  (`~/.claude/settings{,.local}.json`, and `.claude/settings{,.local}.json` of cwd
  and CLAUDE_PROJECT_DIR) still runs it. A project elsewhere that still runs it
  then runs nothing; `canonkit doctor` there FAILs and names the file. Legacy
  handling sunsets in 2.0.
- **Action needed after upgrading:** the PreToolUse matcher now includes
  `SendMessage`. An existing install keeps gating, but `doctor` FAILs `hook
  wiring` (and `install` reports it) until the matcher is widened —
  `npx canonkit install --wire-hooks` does it.
- **New:** `install --wire-hooks` registers the hook under every event with its
  matcher in `~/.claude/settings.json`: dated backup
  (`settings.json.canonkit-<timestamp>.bak`) only when bytes change, atomic
  write keeping the file's mode, every other key and hook kept, an old
  `meu-time-hook.js` command rewritten in place, duplicates removed, a hook that
  shared an entry with the user's own hooks moved to its own entry (their
  matcher untouched). It refuses, writing nothing, a settings.json that is not
  JSON, not an object, or has a `hooks`/event of the wrong shape. A command that
  only wraps the hook (anything but `node <path>/<hook>.js`, shell syntax in the
  path included) is left and reported by key path; the hook's own entry is still
  written, so under that event it runs twice until the wrapper is removed — the
  output says so. Backups carry the same values as settings.json (`env`
  included): keep them out of a dotfiles repo. `settings.local.json` is never
  written. Without the flag, install still only prints the wiring.
  `--wire-hooks` is valid only with `install`. To undo it, restore the
  `settings.json.canonkit-<timestamp>.bak` it wrote.
- **New:** `canonkit doctor` — read-only, one line per check (`OK|WARN|FAIL`:
  agents, reference, hook file, hook syntax, hook wiring, log, forwarder,
  config), exit 1 on any FAIL. The config line shows the resolved `file`, `root`,
  the project file applied under a nested config, and every ignored entry.
- **Stop gate:** a reviewer resumed with `SendMessage` (with a message) after the
  last gated edit counts as review — resolved by the agent's `name` or agent id
  in the same session, and only if the resumed agent is a reviewer. A reviewer
  subagent's own gates outside the project (its probes) no longer block the
  parent; gates under `~/.claude` always count. Reviewer names are bounded
  (`gardener` is not Gard). Gate events now log `agent_id`, `agent_type` (subagents
  only) and `in_project`; `agent_start` logs `name`; SendMessage logs
  `agent_resume` with the target and whether a message was sent, never its text.
  Known residual: a SendMessage that then fails still credits.
- **New default gate (MEDIUM):** key and credential files are secret paths —
  `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa`/`id_ed25519`/`id_ecdsa`/`id_dsa`,
  `kubeconfig`, `.kube/config`, `.pgpass`, `*.tfvars`, `*.tfstate`.
- **New:** `.claude/canonkit.json` (`version`, `highRisk.include/exclude`,
  `perfBudgets`), looked up from cwd upward, stopping at CLAUDE_PROJECT_DIR
  when cwd is inside it (else below home), then CLAUDE_PROJECT_DIR; the
  nearest file applies whole — and when it sits strictly below
  CLAUDE_PROJECT_DIR, the project file's `highRisk.include` and `perfBudgets`
  apply as well, anchored at the project (a nested folder can add gates, never
  shed the project's; the project's `exclude` never reaches it).
  `exclude` cannot silence secrets, STRONG terms or migrations; catch-alls are
  rejected, judged together with the excludes before them.
- **Calibrated:** ambiguous words (sessions, contracts, permissions, gateway,
  login) gate only in code outside presentational folders; noise folders match
  whole segments only (`src/distribution/` is source), and only inside the
  config's folder (outside it, e.g. a sibling worktree with no config, a test or
  node_modules path asks); `author` is not `auth`.
- **Perf budgets:** default list extended (size-limit, bundlesize, bundlewatch,
  budget files, separator-bounded perf-budget names, k6 thresholds); defaults
  skip `.md`/`.mdx` and generated folders.
- **Fixed:** glob matching is linear (a hostile config could time the hook out,
  and a timed-out hook fails open); every path is normalized before any check.
- **Fixed:** atomic writes (project `AGENTS.md`, settings.json) keep the target's
  mode; a 0600 file no longer comes back 0644 on POSIX.
- **Before release (Gard P1, Quinn C1):** from real payloads, (a) a subagent's
  PreToolUse carries `agent_type` equal to its `subagent_type` (else the probe
  skip never fires — safe, but inert); (b) the main thread, `--agent gard`
  included, never carries `agent_id` (else its own out-of-project gated edits
  would escape the Stop gate). Run `npm test` on Linux and record the mode test
  passing (macOS too if possible: `realish` across /var → /private/var).

## Backlog (not job A)

- ~~Stop gate counts gate events from reviewer subagents' own probes~~ — done in
  job B (docs/plans/job-b-doctor-wire-hooks.md).
- ~~Job B: `--wire-hooks` rewrites the old command and deletes the forwarder;
  doctor WARNs on a remaining forwarder and prints the resolved config~~ — done.
- Shell write targets miss `cp`, `mv`, `sed -i`, `node -e`, quoted paths with spaces.

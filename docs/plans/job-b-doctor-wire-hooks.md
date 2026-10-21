# Job B — doctor + install --wire-hooks + Stop gate (2026-10-21)

Source: docs/plans/enforcement-onboarding-handoff.md (B) and
docs/plans/job-a-review-fixes.md ("Round 3", "Backlog"). Job A is committed
(aa50ed0). Nothing of job B is committed; commit only when the user asks.

**Risk: HIGH** (writes ~/.claude/settings.json, deletes the forwarder, changes the
config contract and the Stop gate). Pre-code consultation done: **Archie and Gard
approve with the conditions below; no veto.** Reviewers after the last edit:
**Gard** (wire-hooks, forwarder, Stop gate, A1) + **Quinn**; **Archie** for the
`projectConfig` shape. ADR amendment of the job A lookup rule → **Spencer**
(check docs/adr/ for the job A config record first).

## Scope

1. `install --wire-hooks` rewrites the old command and removes the forwarder.
2. `canonkit doctor`: the handoff's checks + WARN on a remaining forwarder +
   prints the resolved config (`file`, `root`, `ignored`).
3. Project additive lists apply under a nested config (Gard P2).
4. Stop gate: skip reviewers' probe gates; credit a reviewer resumed by SendMessage.

## Decisions (conditions to implement)

**wire-hooks (Gard G1/G2)**
- Refuse (exit 1, write nothing, no backup) on invalid JSON, non-object root,
  `hooks` not an object, an event value not an array.
- Backup only when bytes change: `settings.json.canonkit-<ISO ts>.bak`, made with
  `copyFile` (keeps mode), never overwrites an earlier one. Dry-run: no backup.
- Atomic write preserving the target's mode: read its mode, chmod the tmp file
  before the rename (writeAtomic today drops 0600 → 0644 on POSIX).
- Output names key paths only, never settings values.
- Rewrite only exact command shapes `node <path>/meu-time-hook.js` (path quoted
  or not). Anything else containing the name (a wrapper) stays and is reported.
- Canonical command `node "<abs, forward slashes>/canonkit-hook.js"`; dedupe ours;
  own entry with an old matcher widened in place; in an entry shared with the
  user's hooks, our hook moves to its own entry (user matcher untouched).
- settings.local.json never written.
- Forwarder deleted only if `content === HOOK_FORWARDER` (exact) AND a raw-bytes
  scan of ~/.claude/settings.json, settings.local.json, and .claude/settings.json
  + settings.local.json of cwd and CLAUDE_PROJECT_DIR finds no `meu-time-hook.js`;
  any unreadable file in that list → keep. Otherwise keep and name the file.
  After deletion, print in the same run: a project's settings that still runs it
  now runs nothing; `canonkit doctor` there FAILs. Dry-run never claims deletion.
- Recorded residuals: lost update if Claude Code writes settings.json during
  install (LOW, backup covers); invisible project still running meu-time-hook.js
  loses its gates after deletion (MEDIUM, user's call — they asked for it).

**Wiring check (Archie A2)** — `reportHookWiring` checks matcher coverage only for
PostToolUse; extend it to PreToolUse (shared function used by install print-only,
--wire-hooks and doctor), and add `SendMessage` to HOOK_EVENTS.PreToolUse.

**Config (Archie A1)** — rule: "the nearest file applies whole; the project
file's additive lists (`highRisk.include`, `perfBudgets`) apply as well" when the
nearest config sits strictly below CLAUDE_PROJECT_DIR and the project dir has its
own file. The nested `exclude` never cancels the project's include. Shape:
`cfg.project` = the same object `projectConfig` returns (`root, file, include,
perf, ignored, rel`) with `exclude: []`, or `null`; callers test
`cfg.project.include` against `cfg.project.rel(fp)`. Never push its globs into
`cfg.include`. Update test "a nested config applies whole, no merge"
(test/canonkit-hook.test.js ~L935): it pins the old contract.

**Doctor (Archie A4)** — human-only lines `OK|WARN|FAIL <check>: <detail>`; the
exit code (1 on any FAIL) is the contract. Uses the package's hook module for
`projectConfig` (does not execute ~/.claude code). Read-only (log-dir check must
leave no file behind — test snapshots HOME).

**Stop gate (Gard G3/G4, Archie A3)**
- Gate events gain `agent_id`, `agent_type` (subagent only) and `in_project`;
  readers: the Stop gate. agent_start gains `name`; new `{event:'agent_resume',
  to, has_message}` on PreToolUse SendMessage. Cap `name`/`to` like `task`.
  Never log message content.
- Skip a gate only if logged from a subagent whose agent_type is a reviewer AND
  `in_project === false`. Missing `in_project` counts. Compare realpaths,
  case-insensitive on win32. Never skip a path under ~/.claude.
- REVIEWER gets a boundary: `/^(quinn|gard|…)(?:-|$)/` (`gardener` is not Gard).
- Resume credit: `to` (strip trailing ` [ref]`) resolves in THIS session to the
  latest agent_start with that `name` (any type) or, by agent_id, via
  agent_launch/agent_end → agent_start; credit only if that start's `agent` is a
  reviewer, `message` is a non-empty string, and it post-dates the last gate.
  Never test REVIEWER on `to`/`name`. Residual: a failed SendMessage still credits.
- Verify `agent_type` on a real subagent PreToolUse payload before release.

## Status

- Tests written (test/cli.test.js: "install --wire-hooks", "the meu-time
  forwarder", "doctor", print-only line), seen failing: 28 fail / 3 pass (the 3
  are pre-existing forwarder tests matched by the name filter).
- Still to write, tests first: wrapper command left + reported; hand-edited
  forwarder kept; mode preserved (POSIX, skip on win32); PreToolUse coverage in
  install print-only; doctor config line with `cfg.project`; hook tests for the
  Stop gate (reviewer probe outside project skipped / inside counts / bob counts /
  main `--agent gard` counts / no in_project counts / ~/.claude never skipped /
  `gardener` not a reviewer / resume by name, by agent_id, latest-name-wins,
  non-reviewer, unknown target, before gate, empty message / SendMessage always
  allowed and logs no content) and the A1 include + perfBudgets merge.
- Then implement, `npm test` + `npm run validate`, update the release-notes draft
  in job-a-review-fixes.md, dispatch Gard + Quinn (+ Archie on the shape).

**2026-10-21, implemented (committed in 1f28afc).** Missing tests written and seen failing
(46 fail), then all green: `npm test` 319 pass / 0 fail / 3 skipped (platform),
`npm run validate` all checks passed. Release-notes draft updated.
Implementation choices beyond the decisions above:
- Hand-edited forwarder: `upgradeFromMeuTime` refreshes only an older forwarder
  (mark, no `.run()`); one with the mark that calls `run()` but differs is left
  untouched, so Gard's exact-content check keeps it (before, any mark-bearing file
  was overwritten without backup).
- Wiring coverage (`wiringGaps`) reads the matcher anchored (`^(?:m)$`): a false
  FAIL costs one --wire-hooks run, a false pass hides a gap.
- `doctor` merges `settings.local.json` hooks into the wiring check (the runtime
  merges them); the forwarder check reuses install's scan list.
- Stop gate `in_project` is against CLAUDE_PROJECT_DIR, else cwd; a path under
  `~/.claude` is logged as in-project (never skipped); any error counts as inside.
- `cap()` (200 chars) now applies to `task` as well as `name`/`to`.
- The routing block's Stop-gate sentence mentions resume credit and probes.
Pending before release: `agent_type` on a real subagent payload; Linux run;
ADR amendment of the job A lookup rule (Spencer; no config ADR exists in
docs/adr/ — 0001/0002 are tool records).

**Reviews after the last code edit (2026-10-21): no veto.**
- Archie approve; condition met (README "Onde é lido" states A1 + worktree).
- Gard approve; P3 notes applied (regex rejects shell syntax in the path, scan
  matches `meu-time-hook` without `.js`, backup warning). Re-check of the follow-up
  diff: approve, G1–G4 intact.
- Quinn approve; C2 decided: canonkit's own entry is still written beside a
  wrapper and the output says the hook runs twice there until the wrapper goes
  (user may flip to "don't add when wrapped"). SHIPPED_FORWARDERS added;
  best-effort chmod; tests added (shell-syntax wrapper, duplicate in one entry,
  dry-run "would remove", extensionless runner, doctor local-only wiring, log
  FAIL, shell-path in_project, agent_end link through a non-reviewer).
- Spencer no veto; applied: README worktree wording, README mention of
  `--wire-hooks`/`doctor` (+ rollback, backup secrets), release notes heading,
  "--wire-hooks only with install", rollback line, routing block "(subagent)".
State: `npm test` 326 pass / 0 fail / 3 skipped; `npm run validate` green.
Still open:
- Release gate (Gard P1, Quinn C1): real payloads — subagent PreToolUse carries
  `agent_type`; the main thread (incl. `--agent`) never carries `agent_id`. Linux
  (and macOS) `npm test` run with the mode test passing.
- ADR 0003 "Project config lookup and additive nested lists" (Spencer recommends,
  non-blocking; Archie owns content, Spencer drafts).
- Optional: doctor shows how many project excludes are not applied under a nested
  config (Archie); log a refused chmod (Gard).

# TODO

## Priorities

Updated 2026-11-14 from the handoffs in `docs/plans/` and the findings
collected along the way. P0 = do now, P4 = when there is room. Items backed by
a handoff keep their details there; items without one carry them inline.

### P0 — security

- [x] **Issue #36: WSL security follow-ups**: done in 3.2.1 (OpenSpec
  `wsl-security-follow-ups`, archived; Gard approved). Two pre-existing gaps
  Gard noted went to P3 below.

### P1 — high gain, low cost

- [x] **Review brief with the diff scope resolved**: done in 3.2.1 (OpenSpec
  `review-brief-diff-scope`, archived; Quinn approved). New `## Briefing a
  review` in `skills/orchestrate/SKILL.md`.
- [x] **Broken links** to `plans/learning-loop-design.md` (removed in `d1cf49d`):
  done in 3.2.1. `docs/evals.md` now points to the skill's "Evaluate and
  decide" section; the design-note clause in `docs/learning-loop.md` was dropped.
- [x] **Housekeeping**: done in 3.2.1. Deleted
  `docs/plans/release-3.1.0-handoff.md`; OpenSpec `install-guided-setup` was
  already archived (`2026-11-14-install-guided-setup`); dropped the `~/.agents`
  item from the [improvements handoff](docs/plans/canonkit-improvements-handoff.md).

### P2 — consistency and pending decisions

- [x] **User/project terminology** in `doctor`, `uninstall`, `models` and
  security diagnostics: done in 3.2.1 (Pixie approved). Wording in `41968ef`;
  the short `doctor` report now groups general checks under "User level" and
  "This project" (rows carry an optional `scope`; `--verbose` unchanged). The
  follow-up note was deleted.
- [x] **User/project terminology in the docs prose**: done in 3.2.1 (Spencer
  approved). README, `docs/install.md` and `docs/hooks.md` say "user level" /
  "project"; "Git repository" stays only for the validation precondition.
  `SECURITY_SETTINGS` uses `scope: "project"` and project wording in its
  reasons. The section is "Native security, per project"; the old
  `#native-security-per-repository` anchor is kept. Remaining "global" uses in
  `docs/install.md` (e.g. heading "Global reference blocks and skills", L95,
  183, 906-907, 1132-1134, 1181, 1301, 1316) were left: low priority, and the
  heading may be a link target.
- [x] **Install guidance for a selected tool that is not installed**: done in
  3.2.1 (Pixie approved). A missing recommended tool starts unselected as
  `(recommended, not installed)`; selecting it prints the guidance before any
  write and skips it, which does not count as a failure. The review screen lists
  it as skipped. Explicit `--tool` flags are unchanged.
- [ ] **Economical reading for reviewer agents** and before/after measurement
  via telemetry ([handoff](docs/plans/review-speed-handoff.md), proposals 2–3).
- [ ] **Decisions** ([handoff](docs/plans/canonkit-improvements-handoff.md)):
  keep `skills/context-tune` in core or not; unknown keys WARN or FAIL.
- [ ] **Skill for the one-backlog-item-per-session cycle**
  ([handoff](docs/plans/backlog-cycle-skill-handoff.md)). Virgo writes it;
  decide scope (core or project) first.
- [ ] **Incidental findings go to the project's backlog, not GitHub issues by
  default** ([handoff](docs/plans/backlog-cycle-skill-handoff.md), "Achados fora
  do escopo"). Decided 2026-11-14: change the core. The destination becomes the
  backlog the project already uses (a file such as `todo.md`, or its tracker);
  GitHub issues only when that is the project's backlog. Touches
  `skills/orchestrate/out-of-scope-issues.md`, `## Incidental findings` in
  `reference/agents-block.md` and `docs/out-of-scope-issues.md`; keep the
  private channel for vulnerabilities and secrets. MEDIUM (changes agent
  behavior in every project); Virgo writes it, Spencer for the docs. Do it
  before the backlog-cycle skill, which only points to it.

### P3 — improvements without urgency

- [ ] **`tool add` leftovers from the issue #36 review** (Gard, 2026-11-14).
  Both predate 3.2.1 and neither blocks it.
  - **Raw `core.hooksPath` in output:** `gitHooksPreflight` in `bin/cli.js`
    prints the repository's `core.hooksPath` unfiltered in "core.hooksPath is
    set (…)"; a hostile value could carry terminal escape sequences. Fix: pass
    it through `plain()`. Confidence: medium.
  - **Top-level file targets not walked:** `unsafeWriteRoot` only checks touch
    paths that contain a `/`, so a literal top-level target (e.g. `AGENTS.md`)
    that is a symlink is not refused. Today `AGENTS.md` is written through on
    purpose (see the cli-tools test), so decide first whether any such target
    should be refused. Confidence: medium.
- [ ] **Empty-file rule in other JSON readers**: `bin/model-discovery.js`
  (~L299) and `bin/model-config.js` (L141) parse JSON files and may not apply
  the 3.1.1 rule that an empty, whitespace-only or BOM-only file reads as `{}`
  (`readSettingsText` in `bin/security.js`). Whether either reads a Claude
  `settings.json` was not checked. Confidence: low. Next step: check which
  files they read; if a user can empty one by hand, reuse `readSettingsText`.
- [ ] **Doctor flags Bash allow rules made redundant by the sandbox**:
  `assessClaude` in `bin/security.js` (the `saved-approvals` check) only counts
  `permissions.allow` rules. With the strict sandbox and
  `autoAllowBashIfSandboxed: true`, saved `Bash(...)` approvals add nothing and
  keep pre-approving commands if the sandbox is ever turned off. Doctor could
  point them out, without deleting anything (the spec forbids touching personal
  permissions). Confidence: medium (optional idea from the exploration). Next
  step: decide whether it is wanted; if so, open an OpenSpec change for
  `security-diagnostics`.
- [ ] **Type checking for the CLI** (JSDoc + `checkJs`, no build step). The CLI
  (~8.1k lines in `bin/`, `bin/cli.js` alone ~4.4k) has no static type
  checking: no `tsconfig`/`jsconfig`, and almost no JSDoc. A full `.ts`
  migration is not recommended for now: Node does not strip types inside
  `node_modules`, so a published `.ts` package would need a build step and
  `dist/`, and `hooks/` must stay plain JS. Confidence: medium (raised
  2026-11-13). Next steps:
  1. Add `jsconfig.json`/`tsconfig.json` with `checkJs`, `noEmit` and `strict`
     adopted gradually, plus `typescript` as a devDependency (`@types/prompts`
     is already there).
  2. Add `// @ts-check` file by file, starting with the smaller, contract-like
     modules: `model-config`, `install-manifest`, `security`,
     `recommended-models`. Type the core structures with `@typedef` (manifest,
     model config, security settings).
  3. Add an `npm run typecheck` script (`tsc -p . --noEmit`) and include it in
     `validate`/CI.
- [ ] **Graphify/OpenSpec pins and hooks**: waits for your decision and the
  ADR 0001 stability window ([handoff](docs/plans/tool-pins-update-handoff.md)).
- [ ] **Deferred ECC decisions**: generic gate for destructive commands or
  migrations, as its own change with Gard and Pipe
  ([handoff](docs/plans/ecc-skills-knowledge-groups-handoff.md), item 2).

### P4 — evaluations, user actions and cosmetics

- [ ] **Real-model evaluations** (spend credit; need authorization):
  - full quality corpus baseline and learning loop / stack pack effectiveness
    ([handoff](docs/plans/canonkit-improvements-handoff.md));
  - `eval:quality --runs 3` for the ECC-changed agents
    ([handoff](docs/plans/ecc-skills-knowledge-groups-handoff.md));
  - Laya version check and eval rerun
    ([handoff](docs/plans/laya-eval-rerun-handoff.md)).
- [ ] **User actions**: `node bin/cli.js install` to update `~/.claude`; review
  the pending `permissions.allow` lines
  ([handoff](docs/plans/ecc-skills-knowledge-groups-handoff.md), item 1).
- [ ] **Rubric E1/E3/E4**: only with a new versioned rubric revision.
- [ ] **Doctor reads the install receipt twice**: `securityDiagnosis` in
  `bin/cli.js` builds a separate dry-run `InstallManifest` only to read the
  receipt's owned `allowRead` items, which duplicates the later `checkTracked`
  receipt load. Confidence: low (cosmetic). Next step: read the receipt once
  and pass it to both.
- [ ] **Known limitations accepted in 3.1.1** (Gard, cosmetic):
  - **NVM_DIR drift:** if `NVM_DIR` differs between install and doctor (or is a
    symlink), the kit-appended nvm item is no longer recognized as kit-owned,
    and the `filesystem-exceptions` WARN comes back as noise. It fails safe.
  - **Ctrl-C newline:** after a Ctrl-C during the security review, the terminal
    gets no trailing newline.

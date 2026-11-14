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
- [ ] **Housekeeping**:
  - delete `docs/plans/release-3.1.0-handoff.md` (3.1.0 and 3.2.0 are tagged);
  - archive OpenSpec `install-guided-setup` (only open task is the branch
    rename, superseded by the 3.2.0 merge);
  - drop the `~/.agents` removal item from the
    [improvements handoff](docs/plans/canonkit-improvements-handoff.md) (install
    and doctor already handle it).

### P2 — consistency and pending decisions

- [ ] **User/project terminology** in `doctor`, `uninstall`, `models` and
  security diagnostics ([note](docs/plans/install-follow-up-renames.md)).
  MEDIUM; Pixie for the wording.
- [ ] **Install guidance for a selected tool that is not installed**: in the
  guided `install`, Graphify and OpenSpec come preselected without checking the
  binary. If one is missing, the user only finds out at the end:
  - `toolAdd` → `printMissing` (`bin/cli.js` ~L3580, ~L4751) prints the pinned
    install command after the other choices are already applied;
  - the install then ends as failed.

  Wanted: check the binary when the menu is built, mark the missing tool
  ("not installed") and show how to install it (the pinned command from
  `docs/tools.md`) before applying anything. Then the user either skips the
  tool or installs it and re-runs `npx canonkit tool add <tool>`. Decide
  whether a skipped missing tool still counts as a failure. MEDIUM; Pixie for
  the flow and wording, Quinn for tests. Seen 2026-11-14 when `~/.local/bin`
  left the PATH and graphify looked uninstalled.
- [ ] **Economical reading for reviewer agents** and before/after measurement
  via telemetry ([handoff](docs/plans/review-speed-handoff.md), proposals 2–3).
- [ ] **Decisions** ([handoff](docs/plans/canonkit-improvements-handoff.md)):
  keep `skills/context-tune` in core or not; unknown keys WARN or FAIL.
- [ ] **Skill for the one-backlog-item-per-session cycle**
  ([handoff](docs/plans/backlog-cycle-skill-handoff.md)). Virgo writes it;
  decide scope (core or project) first.

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
  ([handoff](docs/plans/ecc-skills-knowledge-groups-handoff.md), item 5).

### P4 — evaluations, user actions and cosmetics

- [ ] **Real-model evaluations** (spend credit; need authorization):
  - full quality corpus baseline and learning loop / stack pack effectiveness
    ([handoff](docs/plans/canonkit-improvements-handoff.md));
  - `eval:quality --runs 3` for the ECC-changed agents
    ([handoff](docs/plans/ecc-skills-knowledge-groups-handoff.md), item 2);
  - Laya version check and eval rerun
    ([handoff](docs/plans/laya-eval-rerun-handoff.md)).
- [ ] **User actions**: `node bin/cli.js install` to update `~/.claude`; review
  the pending `permissions.allow` lines
  ([handoff](docs/plans/ecc-skills-knowledge-groups-handoff.md), items 3–4).
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

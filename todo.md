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
- [ ] **Alternative Canonkit installation channels** (target a near-term
  release). Alongside the documented `npx canonkit install`, document global
  npm installation and evaluate Homebrew, WinGet and a standalone installer
  script. Keep every channel on the same CLI implementation and version/update
  path; account for platform and runtime requirements and ongoing manifest
  maintenance.
- [x] **Economical reading for reviewer agents**: done in 3.2.1 (`697ef43`;
  Quinn approved). Quinn, Gard, Archie and Perry have a `## Reading code and
  diffs` section before the Pre-report gate. No baseline was taken (user's
  choice); the measurement is the item below.
- [ ] **Measure review speed before/after via telemetry**
  ([handoff](docs/plans/review-speed-handoff.md), proposal 3, "Medição
  antes/depois"). Waits for enough post-3.2.1 review dispatches; until then the
  effect of proposals 1 and 2 is UNMEASURED. Checked 2026-11-16: the two
  telemetry files are absent in this environment; keep this item open.
- [ ] **Suggest OpenSpec when work starts, not only once a change exists**
  (raised 2026-11-17). The "OpenSpec change lifecycle" in
  `skills/orchestrate/SKILL.md` (~L245) and the block in `tools/openspec.md`
  cover only an already selected change; nothing says when to open one.
  Proposal: when the project already uses OpenSpec and the work is MEDIUM/HIGH
  and spans sessions or has acceptance criteria and decisions worth keeping, the
  agent asks (`AskUserQuestion`): explore first (`/opsx:explore`) when the
  problem is still ambiguous, or propose the change (`/opsx:propose`) when the
  scope is clear. Never starts on its own; LOW never; projects without OpenSpec
  stay without it. MEDIUM (team configuration for every project): Virgo
  implements.
- [ ] **Decisions** ([handoff](docs/plans/canonkit-improvements-handoff.md)):
  keep `skills/context-tune` in core or not; unknown keys WARN or FAIL.
- [x] **Skill for the one-backlog-item-per-session cycle**: done in 3.2.1
  (OpenSpec `backlog-cycle-skill`, archived). Core skill
  `skills/backlog-cycle/`, user-invoked only (`disable-model-invocation`,
  Codex `allow_implicit_invocation: false`), reads the backlog the project
  already uses. Its handoff was removed after the first real cycle.
- [x] **Incidental findings go to the project's backlog, not GitHub issues by
  default**: done in 3.2.1. The destination is the backlog the project already
  uses (a file such as `todo.md`, or its tracker); GitHub issues only when that
  is the project's backlog; no backlog means the notes stay in the report.
  Changed `skills/orchestrate/out-of-scope-issues.md`, `SKILL.md`,
  `## Incidental findings` in `reference/agents-block.md` and
  `docs/out-of-scope-issues.md`; vulnerabilities and secrets keep the private
  channel. The backlog-cycle skill can now point to it.
- [x] **`npx canonkit models show` fails inside the Claude Code sandbox**:
  addressed in 3.2.1. Install offers a narrow read grant for
  `~/.canonkit/models.json`, so the sandbox can see user model choices. When
  `npx` cannot run, the managed blocks and `orchestrate` use the installed agent
  file's model and effort without guessing. The agent reports project overrides
  it cannot verify through the CLI. No global install or wider network grant is
  required.

### P3 — improvements without urgency

- [ ] **`docs/install.md` names only `orchestrate` among the shipped skills**
  (Spencer, 2026-11-15). The paragraph "Alongside the blocks goes the
  `orchestrate` skill" (~L1153) gives only orchestrate's install paths;
  `context-tune`, `learning-loop` and `backlog-cycle` are described later
  (~L1186–1218). Fix: one sentence there pointing to them. Confidence: medium;
  impact low.

- [ ] **Keep the reviewers' `## Reading code and diffs` copies in sync** (Quinn,
  2026-11-15). The section is identical in `agents/quinn.md`, `gard.md`,
  `archie.md` and `perry.md`, but no check asserts that, so the four can drift
  silently. Fix: a check in `scripts/validate-python.py`. Confidence: medium;
  impact low.

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
- [ ] **Issue #36 leftovers** (checked 2026-11-16 against 3.2.1). The
  issue is still open on GitHub; the 3.2.1 change closed its three main gaps
  (fsmonitor/`GIT_*` in `tool add` git calls, FIFO reads in `tool add` and the
  legacy-hook migration, nested write roots). Close the issue once these are
  done or moved here for good. Still open:
  - **`sandboxGit` without the WSL filter:** `resolveBin("git", { cwd })` in
    `bin/cli.js` (`sandboxGit`) passes no `windowsRoots`, so on WSL it may pick
    an extensionless Windows `git` and run it through interop. Fix: spread
    `toolExec()`. Confidence: suspected reachability, confirmed from the code.
  - **FIFO reads outside the 3.2.1 scope:** `readFile` of `AGENTS.md` in
    `tool add` (dry run and after setup) and `tool remove`, and the doctor's
    Codex/OpenCode hook `readFileSync` checks, still skip `readRegularSync`.
    Confidence: confirmed from the code; the doctor reads are under the user's
    own folders.
  - **Misleading label for a project-local `claude`:** `collectEnvironment` in
    `bin/security.js` sets it to null, so a Windows copy on PATH yields
    `windows-binary-ignored` although the project-local copy is the cause. Same
    result (version unknown); only the message is wrong.
  - **`plain()` keeps bidi and line separators:** U+202A–202E, U+2066–2069,
    U+2028/2029 pass through into reported paths. Cosmetic.
  - **`windowsOnlyHits` not injectable** in `collectEnvironment`, unlike
    `resolve` and `version`. Harmless while the default roots are `[]`.
  - **No `~` in the install summary's Windows-copy warning**
    (`bin/install-report.js`); the generic branch replaces only the first
    occurrence, case-sensitively. Cosmetic.
  - **Misleading test name:** "an injected run bypasses the Windows filter
    entirely" in `test/model-discovery.test.js` only shows the injected run is
    used.
- [ ] **Empty-file rule in other JSON readers**: `bin/model-discovery.js`
  (~L299) and `bin/model-config.js` (L141) parse JSON files and may not apply
  the 3.1.1 rule that an empty, whitespace-only or BOM-only file reads as `{}`
  (`readSettingsText` in `bin/security.js`). Whether either reads a Claude
  `settings.json` was not checked. Confidence: low. Next step: check which
  files they read; if a user can empty one by hand, reuse `readSettingsText`.
- [ ] **Shell-for-files rule loses to the auto-mode prompt** (edits and reads):
  `reference/agents-block.md` ("Dedicated tools, not the shell", "Temporary work
  outside the repository") and the Claude Code block ("File work uses Read, Edit
  and Write") forbid shell edits and prefer the read/search tools over shell
  reads. Occurrences, all 2026-11-17:
  - futlens: Claude edited its scratchpad script with
    `sed -i ... && bash ssr-check.sh`, which triggered a permission prompt;
  - canonkit, session that archived `telemetry-sandbox-read`: the Bob subagent
    tried `sed -i` on a test file and the sandbox denied it;
  - same session: the lead ran `node -e` only to read and compare specs where
    Read sufficed; the user rejected it.
  Likely cause: Claude Code's auto-mode system prompt explicitly invites `cat`,
  `sed -n`, `grep`, heredocs and short scripts for reads and small edits, and
  the block never says it overrides that guidance, or that the scratchpad and
  subagents count. Confidence: high (three occurrences in two projects, lead and
  subagent, edit and read). Next step: run `learning-loop` on the transcripts;
  if confirmed, add one sentence to the Claude Code block: the rule holds in
  auto mode, in the scratchpad and for subagents, for reads as well as edits,
  despite harness guidance. Do not widen the hook to ask on every `sed -i`: it
  would add prompts, not remove them.
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
- [ ] **Adopt Prettier project-wide** (decided 2026-11-17). Today the repo has
  no formatter config, so an editor's format-on-save rewrites a whole file: on
  2026-11-16 one Ctrl+S turned a 51-line change to `bin/cli.js` into a
  5,200-line diff (`be964ea`, undone in `4c23dd7`). To do: add a
  `.prettierrc` matching the current style (double quotes, wide lines) and a
  `.prettierignore` (`graphify-out/`, `dashboard/dist/`, generated files);
  `prettier` as a devDependency only (the published CLI stays dependency-light);
  `npm run format` / `format:check`, with the check in `validate`/CI. Reformat
  in one dedicated commit and list it in `.git-blame-ignore-revs`. Watch: the
  post-preflight tests in `test/e2e/` count exact source strings in
  `bin/cli.js`, so reformatting breaks them; make them format-independent
  first. Confidence: high (cause confirmed by the user). MEDIUM (shared tooling
  and CI): Pipe for CI.
- [ ] **Telemetry read: LOW notes from the 6.2 review** (Gard and Quinn,
  2026-11-17; OpenSpec `telemetry-sandbox-read`, approved without blockers).
  Any code change here touches sandbox permissions: Bob implements, Gard
  reviews.
  - **Doctor silent cases only unit-tested** (Quinn): ambiguous `allowRead`,
    unknown or below-floor version and a symlinked folder are proven only by
    `compileTelemetryRead` tests; the doctor wiring (`bin/cli.js` ~L2758-2765)
    is not. Add one e2e case (Claude 2.1.301, sandbox on, expect no row).
  - **"Already covered" does not check bytes** (Quinn): the e2e test asserts the
    entry is kept, not that `settings.json` is byte-identical.
  - **Test-only export** (Quinn): `applySecurityAnswer` is exported only for a
    test; mark it with a comment.
  - **Loose regex** (Quinn): the first telemetry e2e test's output regex has a
    broad `|` alternative. Harmless; tighten it.
  - **Symlink check before the prompts** (Gard): `telemetryReadSymlink` runs at
    plan time (`bin/cli.js` ~L637), not at write time. Needs same-user write
    access to `~/.claude`. Option: re-check right before applying.
  - **lstat errors fail open** (Gard): `telemetryReadSymlink` (`bin/security.js`
    ~L507) treats any error as "not a link"; only ENOENT is clearly benign.
    Option: treat other errors as `telemetry-read-symlink`.
  - **Exposure sentence omits usage metadata** (Gard): the folder also holds
    tool names, token and size counts, models and timestamps. Optional
    rewording of `TELEMETRY_EXPOSURE` (and the docs that quote it verbatim).
  - **Offered when the sandbox is off** (Gard): install offers the read even
    when no scope sets `sandbox.enabled`, where it has no effect. Confusing, not
    harmful. Confidence: medium.
- [ ] **Graphify/OpenSpec pins and hooks**: waits for your decision and the
  ADR 0001 stability window ([handoff](docs/plans/tool-pins-update-handoff.md)).
- [ ] **Deferred ECC decisions**: generic gate for destructive commands or
  migrations, as its own change with Gard and Pipe
  ([handoff](docs/plans/ecc-skills-knowledge-groups-handoff.md), item 2).

- [ ] **Allow rules for the OpenSpec skills** (decided 2026-11-16, target the
  next release, not 3.2.1). When `canonkit tool add openspec` sets up Claude,
  write `Skill(<name>)` allow rules with exact names for the five skills
  (`openspec-propose`, `-apply-change`, `-archive-change`, `-explore`,
  `-sync-specs`) in the project's `.claude/settings.json`. Such a rule skips
  only the prompt to invoke the skill; its edits and commands still ask. This
  changes the install contract: it is the first `allow` rule canonkit writes
  (README.md:67 says it adds none). To do: confirm the native `Skill(...)`
  rule syntax (is `Skill(name:*)` valid?); record ownership in the install
  receipt so `uninstall` removes the rules and `doctor` does not count them as
  `saved-approvals` (bin/security.js:617); update the README and
  `docs/install.md`. MEDIUM: implementation by Bob, review by Gard.

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
- [ ] **Batch the Windows ACL spawns** (open GitHub issue). `restrictWindows`
  in `bin/install-manifest.js` spawns one `powershell.exe` per private
  directory, plus `whoami.exe` and one `icacls.exe` per private file. With
  them stubbed, a fresh `install --claude` went from ~1.1 s to ~0.85 s (test
  runs, not real use). Suggestion: one PowerShell call per process with the
  same DACL; `test/e2e/acl-windows.test.js` already reads the result back.
  Touches a security control: Gard reviews. Confidence: cost confirmed,
  batching not investigated.
- [ ] **Doctor reads the install receipt twice**: `securityDiagnosis` in
  `bin/cli.js` builds a separate dry-run `InstallManifest` only to read the
  receipt's owned `allowRead` items, which duplicates the later `checkTracked`
  receipt load. Confidence: low (cosmetic). Next step: read the receipt once
  and pass it to both.
- [ ] **Doctor flattens nested `allowRead`**: `bin/cli.js` (~L2751) uses
  `rawReads.flat()`, so a nested `[["~/.claude/canonkit-activity"]]` would
  count as coverage. Unreachable today: `parseSecuritySettings`
  (`bin/security.js` ~L190) rejects non-string items. Confidence: low. Next
  step: harden only if the parser is relaxed.
- [ ] **Known limitations accepted in 3.1.1** (Gard, cosmetic):
  - **NVM_DIR drift:** if `NVM_DIR` differs between install and doctor (or is a
    symlink), the kit-appended nvm item is no longer recognized as kit-owned,
    and the `filesystem-exceptions` WARN comes back as noise. It fails safe.
  - **Ctrl-C newline:** after a Ctrl-C during the security review, the terminal
    gets no trailing newline.

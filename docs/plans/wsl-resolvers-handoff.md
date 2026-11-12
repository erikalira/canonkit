# Handoff: Windows binaries in the other resolvers, safeGit, FIFO reads

State on 2026-11-12, branch `docs/ecc-skills-knowledge-groups-review`. Replaces
`docs/plans/wsl-tools-handoff.md` (its items are done; delete it when this file is
read). Delete this file when the work below closes.

## Done and committed (do not redo)

- `tool add|list` resolve tools on the Linux side only on WSL (`windowsRoots`, read from
  `/proc/self/mounts`; Windows-only copies are reported, never run). See ADR 0001 amendment
  2026-11-12 and `docs/tools.md`.
- Dica de sandbox in `tool add|list` (dangling link, generic line), "Run it inside WSL with a
  Linux-side npm" line for the Windows-only case.
- `canonkit git-ignore-sandbox-files [--remove] [--dry-run]` (ADR 0007), the doctor rows, the
  `add` messages, tolerance of the empty/`/dev/null` placeholder in `doctor`, FIFO guard in
  `legacyRunners` and doctor `text()`, `isolatedEnv` dropping `GIT_*`.
- `tool add openspec --harness` (ADR 0008): claude, codex, opencode, github-copilot.
- Last full `npm test`: 1129 tests, 1108 pass, 0 fail, 21 skipped.

## Not done, each its own change

1. **Windows binaries in the other resolvers (HIGH; Archie and Gard approved the direction).**
   Archie's design report (2026-11-12): `windowsRoots` must be threaded into
   - `bin/cli.js` ~1613 (`resolveBin("opencode")` for the `--wire-hooks` version gate) and the
     `binVersion` call after it (the child PATH is only filtered when `windowsRoots` is passed);
   - `bin/model-discovery.js` ~58/74/347 (`systemRunner` -> `trustedRunner` -> `refreshCatalog`,
     into `resolveBin` and `runBin`);
   - `bin/security.js` ~93-112 (`collectEnvironment`: the `resolve("claude")` call, bwrap/socat
     lookups and `version(...)`), with `resolve`/`version` still injectable.
   Rules: call `readWindowsRoots()` ONCE per command at the call site (like `toolExec`): install,
   doctor, `models refresh`, `--wire-hooks`; library defaults stay `[]`. Keep REPORTING the
   Windows copy, never silent: security gets a new `versionEvidence` value
   (`windows-binary-ignored`, wording "unknown; a Windows copy at <path> was ignored (it reads
   Windows settings, not these)", paths through `plain()`); discovery reason "claude found only
   on the Windows side; not run through WSL interop"; the opencode refusal names the ignored
   copy and the fix. Visible behavior change to put in the release notes and review with Gard: on
   WSL with only a Windows `claude`, `install` gets `claudeVersion=null`, so version-gated
   security settings write less. No `--allow-windows` opt-in. Tests: injected roots (no real
   host mounts), `test/support/fake-mounts.mjs` for e2e, one test per production call site
   proving a fake-mount Windows `claude` is never executed.
2. **`safeGit`:** `core.fsmonitor=false` and no `GIT_*` on the older git calls: `bin/cli.js`
   ~2622 (`ls-files -c -i --exclude-standard` in the tool gitignore note) and
   `gitHooksPreflight` (~2646: rev-parse, ls-files, config, rev-parse --git-path). Keep the
   `config core.hooksPath` read raw (it needs the real value). Gard rated it P2/P3.
   `sandboxGit` already does this for the new command and can be the model.
3. **FIFO reads:** the same unguarded `readFileSync` pattern remains at `bin/cli.js` ~995
   (log rotation; a FIFO there hangs `install`), ~1130, ~2244, ~2278, ~2655, and the async
   `readFile` at ~3067 and ~3102 (a FIFO `AGENTS.md` hangs `tool add`). `readRegularSync` exists.
4. Optional (Gard P3): `unsafeWriteRoot` checks only top-level write roots; a symlinked
   `.claude/skills` inside a real `.claude` is not caught.
5. The user's own uncommitted edits (`reference/agents-block.md`, `reference/routing-block.md`,
   `skills/orchestrate/SKILL.md`, `.worktrees/`) are not part of this work: leave them out.

## How the team ran this (keep doing it)

HIGH: Archie (contract) and Gard (security) review the design, Bob implements, Quinn checks the
tests by mutation-style reasoning, Spencer writes ADR and docs, then an independent review after
the LAST edit. Briefs to subagents must say: use Read/Glob (and Grep when available), no
compound shell commands (`cd x; ...`, pipes, `;`): each triggers a permission prompt for the
user (project `.claude/settings.json` has `autoAllowBashIfSandboxed: false`). Run `npm test`
(full, not only test:fast). The user commits; ask before any commit.

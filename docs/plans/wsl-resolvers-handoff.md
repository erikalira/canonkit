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
- WSL resolver follow-up (item 1) completed in `806f6cb`: `windowsRoots` now
  reaches the OpenCode install gate, model discovery and security checks. The
  release suite on 2026-11-12 ran 1159 tests: 1138 passed, 21 skipped, 0 failed.

## Closed

1. **Windows binaries in the other resolvers — done.** Committed in `806f6cb`;
   see ADR 0001 amendment, `docs/install.md` and the 3.1.0 release notes.

## Not done — tracked in [issue #36](https://github.com/erikalira/canonkit/issues/36)

2. **`safeGit`:** harden the older Git calls with `core.fsmonitor=false` and no
   `GIT_*`, as described in issue #36.
3. **FIFO reads:** guard the remaining reads listed in issue #36.
4. **`unsafeWriteRoot`:** cover nested write roots as described in issue #36.

Keep unrelated working-tree and staged changes outside these follow-ups.

## How the team ran this (keep doing it)

HIGH: Archie (contract) and Gard (security) review the design, Bob implements, Quinn checks the
tests by mutation-style reasoning, Spencer writes ADR and docs, then an independent review after
the LAST edit. Briefs to subagents must say: use Read/Glob (and Grep when available), no
compound shell commands (`cd x; ...`, pipes, `;`): each triggers a permission prompt for the
user (project `.claude/settings.json` has `autoAllowBashIfSandboxed: false`). Run `npm test`
(full, not only test:fast). The user commits; ask before any commit.

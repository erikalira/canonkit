# Handoff: `canonkit tool add` on WSL (graphify, openspec)

Context: `tool add graphify` and `tool add openspec` were tested from `~/dev/futlens`
on WSL (Ubuntu 24.04.2, Python 3.12.3, node v26.13.1 via nvm, Linux side, not Windows).

## Done (committed on `docs/ecc-skills-knowledge-groups-review`)

- `tools/graphify.md`, `docs/tools.md`: Linux/WSL install is
  `(cd ~ && pipx install graphifyy=={pin} --pip-args="--only-binary :all:")`. Windows/macOS keep
  `python -I -m pip ...`. Gard review (LOW): pipx 1.4.3 runs `python -m pip` without `-I` and
  inherits the cwd, so the `cd ~` keeps a cloned project off Python's import path; the subshell
  leaves the user's terminal in place.
- ADR 0001: WSL validation (pipx 1.4.3, graphify 0.9.76) and the pipx/cwd rationale.
- `docs/tools.md`: sandbox note. A tool under `~/.nvm` or `~/.local` can be invisible to the
  Claude Code sandbox; `sandbox.filesystem.allowRead` must be in the **user** settings
  (`~/.claude/settings.json`), a project file cannot re-allow a path a higher level denies.
  Lean list for nvm + pipx: `["~/.nvm", "~/.local/bin", "~/.local/share/pipx"]` (pipx's home varies:
  check `pipx environment --value PIPX_LOCAL_VENVS`; confirmed `~/.local/share/pipx` on 2026-11-12); system-wide Node needs
  nothing unless the npm global prefix is in the home. canonkit never writes it (permission,
  user-specific path).
- `test/e2e/cli-tools.test.js`: forbids `pipx run` instead of every `pipx`. Note `npm run
  test:fast` does not cover `test/e2e`; `npm test` does (1018 tests, 0 fail at the last run).
- Checked and dropped: `npm install --global` does not read the project `.npmrc` (npm 11.20.0
  docs, "not read in global mode"), so the openspec printed command needs no `cd ~`. From the
  docs; a planted-`.npmrc` experiment was blocked by the sandbox write setting.

## Not done yet

1. **openspec harness choice (largest; needs Archie + Gard).** `tools/openspec.md` hardcodes
   `init --tools claude,codex`. Proposed: a `--harness` flag validated against a fixed list
   (SAFE_ARG forbids free text), an interactive prompt on a TTY with `claude,codex` preselected,
   `--yes`/no TTY keep the default, and the printed `touches` lists only what the choice writes.
   Confirm the accepted values with `openspec init --help` (1.14.0). Archie owns the new flag
   (contract), Gard the allowlist. Run `npm test` after.
2. **openspec WSL binary (optional warning).** `resolveBin` picked
   `/mnt/c/Users/.../npm/openspec` (Windows binary through WSL interop, version 1.16.0 vs pin
   1.14.0, config under `%APPDATA%`). Fix is user-side (install with the nvm npm, nvm bin before
   `/mnt/c/...` in PATH); consider a warning in `tool add` when the resolved binary is under
   `/mnt/` on WSL. Small, but it touches `tool add` output, so Archie for the contract.
3. **futlens hooks.** The graphify hooks in `~/dev/futlens` came from a Windows copy of `.git/`
   and may point at a Windows Python (`graphify-out/.graphify_python`). If they fail:
   `graphify hook uninstall && graphify hook install`.

## Branch note

The edits sit on the docs branch. `CANONKIT_ROADMAP.md` is modified in the working tree and is
not part of this work (left out of the commit). To move the commit elsewhere: branch from local
`main` with `--no-track`, never from `origin/main`.

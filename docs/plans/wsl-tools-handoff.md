# Handoff: `canonkit tool add` on WSL (graphify, openspec)

Context: `tool add graphify` and `tool add openspec` were tested from `~/dev/futlens`
on WSL (Ubuntu 24.04.2, Python 3.12.3, node v26.13.1 via nvm). Both ran, with the
gaps below. Nothing here is committed.

## Already edited (uncommitted, on `docs/ecc-skills-knowledge-groups-review`)

- `tools/graphify.md`: `install:` now has a Windows/macOS line (`pip --user`) and a
  Linux/WSL line (`pipx install graphifyy=={pin} --pip-args="--only-binary :all:"`, run from
  the home directory, `sudo apt install pipx` first).
- `docs/tools.md`: the install block shows the same pair.
- Not run: `npm run test:fast` (the sandbox could not see node). `parseTool` was read and the
  new line satisfies it (`{pin}` present; tests use `some`/regex on `graphifyy==`).
- Branch note: the edits sit on the docs branch next to a modified `CANONKIT_ROADMAP.md`
  that differs from `main`. To move them: stash the roadmap, branch from local `main` with
  `--no-track`, apply, then restore. Ask before committing.

## Verified on the user's machine

- `python` does not exist (only `python3`) and PEP 668 blocks `pip --user`
  (`/usr/lib/python3.12/EXTERNALLY-MANAGED`). `pipx install graphifyy==0.9.76 ...` worked and
  `tool add graphify` then ran `graphify update .` (3286 nodes, 6651 edges).
- The graphify hooks (`post-commit`, `post-checkout`, `merge.graphify`) in futlens were not
  canonkit's: the repo was copied from Windows with `.git/` and the hooks came along.
  They may point at a Windows Python (`graphify-out/.graphify_python`); recreate with
  `graphify hook uninstall && graphify hook install` if they fail.

## Not done yet

1. **Gard review** of the graphify install wording. The `-I` guard from the ADR (a cloned
   project cannot be imported as pip) does not exist with pipx; today it is only an instruction
   to run from the home directory. Decide if that is acceptable or needs a stronger check.
2. **ADR 0001**: add one line that the WSL path was validated with pipx 1.4.3 and graphify
   0.9.76 (the ADR only records the Windows check).
3. **openspec, WSL binary**: `resolveBin` picked `/mnt/c/Users/.../npm/openspec` (Windows
   binary through WSL interop, version 1.16.0 vs pin 1.14.0, config under `%APPDATA%`).
   The user has node in WSL, so `npm install --global --ignore-scripts
   @fission-ai/openspec@1.14.0` goes to `~/.nvm`; the nvm bin must come before `/mnt/c/...`
   in PATH. Consider a warning in `tool add` when the resolved binary is under `/mnt/` on WSL.
4. **openspec, harness choice**: `tools/openspec.md` hardcodes `init --tools claude,codex`.
   Proposed: a `--harness` flag validated against a fixed list (SAFE_ARG forbids free text),
   an interactive prompt on a TTY with `claude,codex` preselected, `--yes`/no TTY keep the
   default, and the printed `touches` lists only what the choice writes. Confirm the accepted
   values with `openspec init --help` (1.14.0). Archie owns the new flag (contract), Gard the
   allowlist.
5. **Docs note on the Claude Code sandbox**: tools installed under `~/.nvm` or `~/.local` can be
   invisible to the Claude Code sandbox (it denies reading `/home/lira` outside a few paths).
   Fix is user-side: `.claude/settings.local.json` with
   `{"sandbox":{"filesystem":{"allowRead":["~/.nvm"]}}}`, then restart the session. The user
   already added it. canonkit must not install it (user-specific path, a permission, and
   CLAUDE.md forbids broad automatic approvals): a note in `docs/tools.md` only. The exact key
   name was not confirmed; check `/sandbox` or `claude-code-guide`.

## Order

Restart the session (so the sandbox sees node), run `npm run test:fast`, then items 2, 5,
1, then 4 (largest, needs Archie + Gard), with 3 as an optional warning.

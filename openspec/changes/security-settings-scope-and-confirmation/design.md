# Design

## Context

See proposal.md for motivation. Current state that shapes the approach:

- `prepareSecurity` (`bin/cli.js`) builds two plans before any write. The user
  plan comes from `compileNetworkSecurity` and holds `strictAllowlist` only. The
  repository plan comes from `compileSecurity`. Both are written through
  `InstallManifest` with private snapshots, a concurrent-edit digest check and
  ownership metadata that drives undo.
- Ownership (`scalarOwnership` in `bin/security.js`) only knows boolean scalars:
  `{beforePresent, beforeValue, afterValue}` per key path. It cannot express
  "these three strings were appended to an array".
- `compileSecurity` unconditionally `set()`s `sandbox.enabled`,
  `failIfUnavailable`, `allowUnsandboxedCommands` and both `block*` keys, which
  overwrites weaker repository values without telling the user apart from the
  change plan. It preserves an explicit `autoAllowBashIfSandboxed` from any
  scope.
- `parseSecuritySettings` and `readHooksFileForWiring` both call `JSON.parse`
  on the raw text, so an empty file fails. `parseProjectLocalSandboxSettings`
  already treats 0 bytes as `{}`.
- Install already has two interactivity signals: `process.stdin.isTTY &&
  process.stdout.isTTY` (menus) and `confirm(yes, question, confirmAction)`
  (tool setup), with `confirmAction` as the test seam.
- Runtime read exceptions are documented by hand in `docs/tools.md`
  ("Claude Code sandbox" note): `~/.nvm`, `~/.local/bin`, the pipx venv root.

## Goals / Non-Goals

**Goals:**
- One security-review step in install that gathers every question (runtime
  reads, weaker repository values) after preflight and before the first write.
- Array-item ownership so undo removes exactly the `allowRead` items canonkit
  appended.
- A single shared rule for "empty settings file", used by every Claude
  settings reader.
- README blocks that are mechanically checked against the compiler output.

**Non-Goals:**
- Writing `settings.local.json` (it stays read-only to canonkit).
- Generic runtime discovery: only known runtime managers and the tools canonkit
  itself installs are detected.
- Touching personal `permissions.allow` rules, even redundant ones.
- `allowWrite` exceptions or network `allowedDomains`.
- Codex, OpenCode or Copilot settings.

## Decisions

### D1. Runtime detection is a fixed table of known roots

Detection resolves each binary with the existing Windows-PATH-filtered lookup,
takes its `realpath`, and maps it to a known root:

| Runtime | Detected from | Proposed entry |
|---|---|---|
| Node via nvm | `node` realpath under `$NVM_DIR` (default `~/.nvm`) | `~/.nvm` (or `$NVM_DIR` in `~/` form) |
| pipx tools (graphify) | tool symlink in `~/.local/bin` and its realpath target | `~/.local/bin` and the folder above `venvs` (`~/.local/share/pipx` or `~/.local/pipx`) |

Anything else under home (volta, fnm, asdf, a hand-built prefix) is reported as
an unhandled location and is not proposed. Locations outside home need no
entry, since the read block only closes user-data roots.

*Alternative considered:* propose the binary's own directory for any unknown
location. Rejected: it guesses at a boundary, a version bump changes the path,
and the spec requires minimal exceptions. The table grows by explicit edits,
each with its own test.

### D2. Coverage is path-based, not string-based

Each existing entry and each candidate is normalized: expand a leading `~`,
resolve to an absolute path, drop a trailing separator. On Windows the
comparison ignores case. A candidate is covered when an existing entry equals
it or is an ancestor of it. New entries are written in `~/`-relative form so
the file stays portable across user names. An entry equal to home, or an
ancestor of it, is a broad entry: it covers everything and is reported by
`doctor`.

*Alternative considered:* exact string match. Rejected: `/home/u/.nvm` and
`~/.nvm/` would be proposed again, which is the "already has everything, still
edits" case the user called out.

### D3. Array-item ownership next to scalar ownership

A new ownership kind records, for `sandbox.filesystem.allowRead`, the list of
strings canonkit appended (`appendedItems`). Undo removes each recorded item
only if it is still present exactly once and unchanged. It removes the array
and empty parents only if they did not exist before and are now empty. Items
the user added or edited later are kept. The global user-settings catalog entry
combines scalar ownership for `strictAllowlist` with this array ownership.
Validation of the metadata shape rejects anything else, as the scalar validator
does.

*Alternative considered:* snapshot-and-restore the whole array. Rejected: it
would drop entries the user added after install.

### D4. One security review step, grouped prompts

After both plans are compiled and preflight passed, install runs a review step
that may ask at most two questions, each one grouped:

```
Security review
  Runtime folders sandboxed commands need to read (user settings):
    + ~/.local/share/pipx      graphify (pipx)
  Add them? (recommended so sandboxed commands can find your tools) [Y/n]

  Repository settings weaker than the recommended strict sandbox:
    sandbox.autoAllowBashIfSandboxed   false -> true   (sandboxed commands run without a prompt each)
    sandbox.allowUnsandboxedCommands   true  -> false  (no command escapes the sandbox)
  [A]pply recommended / [K]eep current / [C]hoose per key  (A)
```

"Choose per key" asks y/n per listed key. The defaults are the recommended
values. Each line carries a one-line reason taken from the same table that
feeds the README (D6), so the wording never diverges.

Interactivity follows the existing rule: TTY on stdin and stdout, not
`--yes`, not `--dry-run`, not `TERM=dumb`. Tests drive the prompts through the
existing `confirmAction` seam, extended with a `choose` callback for the
three-way question.

Non-interactive outcomes reproduce 3.1.0 for each key. Weaker repository
booleans are set to the strict value and listed in the plan.
`autoAllowBashIfSandboxed` keeps an explicit value and prints the
recommendation. Runtime reads are printed as a snippet and not written.

*Alternative considered:* one prompt per key. Rejected: up to seven sequential
prompts on a first install. Also rejected: asking before preflight. A question
answered before a preflight failure would be wasted.

### D5. `compileSecurity` reports weaker values instead of deciding

`compileSecurity` returns, next to `changes`, a `weaker` list:
`{path, current, recommended, source: "project" | "user" | "local"}`. The
review step turns the answers into the final plan:
- **project or user `autoAllow… false`:** "change" writes `true` to the project
  file, which outranks the user scope;
- **local:** reported only;
- **non-interactive:** the 3.1.0 rule applies.

This keeps the compiler pure and testable without prompts.

### D6. Shared empty-settings rule and README source of truth

A single `readSettingsText(bytes)` helper strips a BOM and returns `{}` when
the remaining text is empty or whitespace. `parseSecuritySettings`,
`readHooksFileForWiring` and the doctor readers use it, and malformed JSON
still throws as before.

The README section is generated content between markers
(`<!-- canonkit:security-settings:start/end -->`). `scripts/validate.mjs` builds
the expected blocks by running the compilers against a fully supported Linux
environment fixture and fails on any difference. The reason column comes from
one table in `bin/security.js`, the same one D4 uses. The README shows
`allowRead` with the nvm and pipx example values and says that the real list
is detected per machine. The check compares that key's presence, not its
values.

### D7. This repository's project `allowRead`

`.claude/settings.json` here carries `sandbox.filesystem.allowRead:
["~/.nvm"]`. A comment in `compileSecurity` says project `allowRead` is ignored
under the working-directory read block. Verification is a task: start a
session in a scratch repository whose user settings lack `~/.nvm` and whose
project settings carry it, then run `node --version`. If the read is refused,
the entry is dead and is removed in this change. If the read succeeds, the
entry stays, the code comment is corrected, and canonkit still writes runtime
reads only to user scope (D1 to D3 are unchanged either way).

## Risks / Trade-offs

- [A wrong root grants more than intended (for example, `~/.local` instead of
  `~/.local/bin`)] → Fixed table with one test per row. Unknown locations are
  never generalized to a parent. `doctor` flags home-level entries.
- [Prompting changes CI or scripted installs] → Non-interactive behavior is
  identical to 3.1.0 per key, with a regression test per key.
- [A user answers "keep" every time and is asked again on every install] →
  Accepted for now: the question is the point. Doctor shows the same
  recommendation. A remembered choice can come later without a spec change.
- [Undo of appended items races a user edit] → The existing concurrent-edit
  digest check plus "present exactly once and unchanged" before removal.
- [README check is brittle to wording edits] → It compares JSON blocks and the
  reason table, not prose around them.

## Migration Plan

- An upgrade from 3.0.0 or 3.1.0 on an interactive terminal surfaces the
  leftover `autoAllowBashIfSandboxed: false` through the review prompt. Without
  a terminal, nothing changes beyond 3.1.0 behavior.
- Existing manual `allowRead` entries are observed, not owned. Only items
  appended by this version are recorded for undo.
- Rollback: reinstalling 3.1.0 leaves the written keys in place, since they are
  valid settings. `uninstall` from this version removes only attributable
  items. No data migration.
- Release notes call out the new prompt and the end of the manual
  `docs/tools.md` step.

## Open Questions

- Whether more runtime managers (volta, fnm, asdf, bun) join the D1 table.
  Each would be an added table row and test, with no change to specs or
  approach.

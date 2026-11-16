# Proposal

## Why

`canonkit install` mixes user-level and project-level writes without saying
which is which, and its two most consequential steps take the most effort:
model selection asks for a model and effort per need level per harness, and the
security review comes last, in a different question style (y/n, A/K/C). The
same two levels are also named five ways across the CLI and docs ("global",
"user-level", "machine", "repository", "project"), so a person cannot tell from
the output where a change landed. First-time installs should take a few answers,
with a recommended setup accepted by Enter, and the output should name the
level of every write.

This ships in 3.2.0 together with the security-settings work already on the
3.1.1 branch: it adds behavior, so it is a minor release, not a patch.

## What Changes

- **User level is mandatory; the project is an explicit question.** After the
  harness choice, inside a valid project (a Git repository outside canonkit
  and HOME, the same target `canonkit add` accepts), install asks "Also set up
  this project (`<path>`)?" with Yes preselected. The project-item menus
  (tools, specialists, stack packs) and repository security settings follow
  only on Yes. Outside a valid project the question is not shown.
- **Recommended setup in one question.** Install asks "Use the recommended
  setup?" with: *Yes, use recommended* (preselected), *No, keep current* (only
  when a configuration already exists), *No, customize* (today's model setup
  and security review). The recommended setup is shown in the prompt before it
  is accepted:
  - Claude Code: `deep` opus/medium, `standard` sonnet/medium, `light` haiku/low
    (documented family aliases the harness resolves to its current version).
  - Codex: per tier, the highest-version discovered model matching
    `gpt-<version>-sol` (deep), `gpt-<version>-luna` (standard),
    `gpt-<version>-terra` (light), version compared numerically; effort medium,
    medium, low when the model reports it. A tier with no match inherits the
    session model and is reported.
  - Security: the existing recommendations (strict repository sandbox values
    applied, runtime read exceptions added to user settings).
- **`--recommended` flag** applies the recommended setup without asking, for
  scripts and CI. Without a terminal and without the flag, install behaves as
  today: no model is pinned, security follows the current non-interactive
  rules.
- **`--no-project` flag** declines the project without a terminal (or skips
  the question in one): only the user level is written. It conflicts with
  project-item flags.
- **Final summary grouped by level** (USER / PROJECT) before confirmation.
- **Unified terms: *user* and *project*.** "User level" is the per-OS-user
  installation (follows `CLAUDE_CONFIG_DIR`, matches Claude Code's `user`
  settings scope); "project" keeps the meaning in ADR 0006 item 4. "Global" and
  "machine" stop naming a level; "repository" stays only as the noun for the
  Git repository. Applied to a glossary, the install flow and its messages,
  README and `docs/install.md`; other commands are listed as follow-up.
- **ADR 0006 amended**: a recommended per-harness default that the person
  confirms is not the rejected "automatic best model" nor a cross-vendor
  mapping; Claude aliases are stable and Codex uses a naming rule over the
  discovered catalog, not a shipped table.
- **Release bookkeeping**: the release branch, `package.json` version and
  release notes move from 3.1.1 to 3.2.0.

## Capabilities

### New Capabilities

- `install-guided-setup`: the interactive install sequence (harnesses, project
  question, recommended-setup question, project items, level-grouped summary),
  the `--recommended` flag, and the user/project terminology the install
  output uses.

### Modified Capabilities

- `install-unified-catalog`: project items are offered only after the person
  answers Yes to setting up the current project, instead of whenever the
  directory is a valid target.
- `model-selection`: adds the recommended per-harness preset and the Codex
  `gpt-<version>-sol|luna|terra` highest-version rule; setup and install offer
  it as the first, preselected choice.
- `environment-security-policy`: the interactive security review is skipped
  when the recommended setup is accepted (its recommendations are applied),
  and repository settings (security values and legacy-hook migration) are
  written only when the project is in scope. Interactive answers govern absent
  strict keys too; unapplied keys are reported, auto-approval requires the full
  effective sandbox profile, and recommended runtime reads stay narrow.
- `security-diagnostics`: doctor reports absent strict keys and projects whose
  security was never configured as gaps.

## Impact

- `bin/cli.js`: install branch of `main`, `chooseTargets`,
  `chooseProjectItems`, `prepareSecurity` (split user and project plans by
  scope), `reviewSecurity`, `usage()`, install messages.
- `bin/models-command.js` (`offerModelSetup`, `setup`) and
  `bin/model-discovery.js` (Codex tier matching).
- `docs/adr/0006-runtime-model-discovery.md`, a terminology glossary,
  `README.md`, `docs/install.md`, release notes, `package.json`.
- Tests for the install menu, model setup, security review and dry run.
- Writes user and repository security settings, so the change is HIGH risk:
  security review (Gard) and independent review after the last edit.

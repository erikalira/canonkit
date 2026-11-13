# Design

## Context

See proposal.md (Why) and the specs for the required behavior. The current shape
that constrains the approach:

- `main` in `bin/cli.js` collects answers before writing: `chooseTargets`, then
  `chooseProjectItems` (only when `resolveProjectTarget` finds a valid project),
  then `offerModelSetup`. `install()` runs afterwards and calls
  `prepareSecurity` (read-only preflight that compiles the user plan and, when a
  repository root exists, the project plan) and then `reviewSecurity`, which asks
  its own questions *inside* `install()`.
- The recommended-setup prompt must list pending security changes before the
  answer (spec: *Accepting the recommended setup is an explicit security
  answer*), so the security plan has to exist before that question, i.e. before
  `install()` starts writing.
- `models setup` already discovers (`refreshCatalog`), validates and writes
  `~/.canonkit/models.json` through `readChoices` / `setChoice` /
  `writeChoices`; `prompts` is the only interactive dependency.
- The `security-settings-scope-and-confirmation` change is complete but not
  archived; its environment-security-policy delta (runtime reads, weaker
  values, no-default questions) is the baseline this change builds on.

## Goals / Non-Goals

**Goals:**
- One answer path for first-time installs: harnesses, project Yes/No, Enter on
  recommended.
- Reuse the existing compilers, setup and review; the new flow only decides
  which of them run and with which answers.
- Keep every non-terminal path byte-for-byte as in 3.1.1 unless `--recommended`.

**Non-Goals:**
- Recommended presets for OpenCode or GitHub Copilot (no model adapter yet).
- Renaming "global" / "repository" in commands other than `install` (doctor,
  uninstall, models, security diagnostics); listed as follow-up.
- Changing what "recommended security" means: it is exactly the existing
  recommendations (strict repository values, detected runtime reads).

## Decisions

### D1. Split install into a read-only plan and an apply phase
`install()` gets a planning step that runs today's preflight and
`prepareSecurity` and returns the plans without writing; `main` runs it after the
project question and before the recommended-setup question, renders the pending
security changes into that prompt, then calls apply with the answers. The
`reviewSecurity` decisions become data passed in (`securityAnswer: "recommended"
| "keep" | "customize"`), with `customize` still calling today's interactive
review.
*Alternative:* ask the recommended question inside `install()` where the plan
already exists. Rejected: menus would again be split across `main` and
`install()`, and cancel-writes-nothing would depend on where the question sits.
*Concurrency:* the existing digest checks before each write stay, so a settings
edit between plan and apply still aborts as today.

### D2. Project scope is a boolean threaded through the plan
`prepareSecurity` and the Codex project step take `projectInScope`. When false,
the project plan is not compiled for writing (no `projectManifest`, no
`installProjectCodex`, no repository legacy-hook migration); a read-only probe
of repository settings may run only to report legacy handlers left behind.
Non-interactive runs keep `projectInScope = true` when a repository root exists,
which is today's behavior, unless `--no-project` sets it to false (in a terminal
it also skips the question). `--no-project` with `--tool`/`--specialist`/`--stack`
is rejected in argument validation, before any read of settings.

### D3. Recommended presets live in one module, not in agent sources
A small `recommended` export next to model setup holds the Claude preset
(`opus`/`sonnet`/`haiku`, medium/medium/low) and the Codex tier table
(`sol`/`luna`/`terra`, medium/medium/low). Resolution runs against the
discovery catalog: a value is written only when discovered (spec: *Recommended
per-harness model setup*). Applying the preset replaces only `levels` for the
harness and keeps `agents` overrides.
*Alternative:* store presets in `models.json` defaults. Rejected: that file is
the person's choices; mixing kit defaults would make `models show` sources
ambiguous.

### D4. Codex tier matching by pattern and numeric version
Match `^gpt-(\d+(?:\.\d+)*)-(sol|luna|terra)$` over discovered visible ids;
compare versions as arrays of integers (missing parts are 0), pick the max per
tier. Ids with extra suffixes (e.g. `-mini`) do not match and are ignored. No
list of version numbers is shipped, so new releases need no kit update.
*Alternative:* semver library. Rejected: ids are not semver and a dependency is
not justified for a 10-line comparison.

### D5. One prompt type for every question
Every new and migrated question uses `prompts` `select` or `multiselect` with
`instructions: false` and the existing `prompt` test seam. Tables are printed
with `console.log` above the prompt, never inside `message` or `hint`, so a
Windows redraw cannot miscount them; a frame stays within 78 columns. The hint
states what Enter does. The harness menu starts with nothing selected
(`min: 1`); tools graphify and openspec start selected and tagged
"(recommended)"; specialists and stacks start empty and untagged.

### D5b. Customize reuses the same resolver and the same rows
`setup`'s `askEntry` receives the resolved recommended entry for the level,
prints the level's shared-format row, tags the matching option "(recommended)"
and the current one "(current)", and preselects the current value when it
exists and the recommended one otherwise (Enter never silently overwrites a
person's model choice).

### D5c. Security questions are menus that default to the recommended answer
This reverses the no-default decision of `security-settings-scope-and-confirmation`
(its design, "No question in the review has a default"), by the user's
decision. The typed `[A]/[K]/[C]` and `[y/n]` questions are replaced by a select
(runtime reads) and one pre-checked multi-select (replaced and added keys);
unchecked keeps the current value. `askLine`, `askReviewMode` and the
`confirmAction`/`choose` seams of the review are removed with their tests. EOF
still means keep/decline, and Ctrl-C aborts before any write. The answer
governs every listed row, absent strict keys included; non-terminal runs keep
the previous release's rules.

### D5d. One row renderer
A single module renders `label  current  marker  recommended` rows (markers
`= -> + !`, legend, collapse of matching rows, 78-column limit) for the
recommended screen, customize questions, the summary and the `--recommended`
output lines. No call site formats a value pair itself. Changed security rows
are never collapsed into a count.

### D5e. Security conditions live in the compiler (Gard review)
`compileSecurity` takes the person's per-key answers and returns which strict
keys stay unapplied; it decides auto-approval only when `sandbox.enabled`,
`failIfUnavailable` and `allowUnsandboxedCommands` are effective at strict
values after the answers, so install and doctor cannot diverge. The CLI only
renders: unapplied keys with reasons and `canonkit install --recommended`, and
never the words "protected"/"configured" for a partial profile.

### D6. `--recommended` is an answer, not a mode
`--recommended` sets `securityAnswer = "recommended"` and the model answer to
recommended, skipping only that question. It composes with `--dry-run`
(preview, no discovery started: Claude preset shown, Codex "resolved at
install") and with harness flags. Combined with `--yes`, `--yes` keeps its
meaning for tool confirmations only.

### D7. Terminology: user / project
A glossary section in `docs/install.md` defines *user level* and *project*
(ADR 0006 item 4). Install messages that say "global", "machine" or
"repository control" for the level are reworded; "repository" stays for the Git
repository. ADR 0006 gets an amendment section recording the recommended preset
and why it is neither cross-vendor mapping nor automatic choice.

## Risks / Trade-offs

- [Plan/apply split regresses the just-shipped security review] → keep
  `reviewSecurity` intact for `customize`; drive the new answers through the
  same plan edits it already makes; rerun the security and e2e install tests.
- [Enter applies security changes, in the recommended prompt and in customize] →
  every change is listed with current and recommended values before the
  answer; EOF writes nothing; the reversal of the earlier no-default rule is
  recorded in the spec and D5c.
- [Codex naming changes again] → no match leaves the tier inherit and reports
  it; nothing breaks, only the recommendation is absent.
- [Tests that match install output text break on the rewording] → change
  wording only in install paths and update those assertions in the same task.
- [Two unarchived changes touch environment-security-policy] → archive
  `security-settings-scope-and-confirmation` before this one.

## Migration Plan

- Release as 3.2.0 together with the 3.1.1 security work: rename the branch
  `release/3.1.1-security-settings` to `release/3.2.0`, push it with its own
  upstream and delete the old remote branch (each push asked first), move `docs/release-notes/3.1.1.md` to 3.2.0,
  bump `package.json` and the lockfile.
- No data migration: `models.json` keeps version 1; existing choices are
  preserved unless the person accepts the recommended setup.
- Rollback: reinstall 3.1.x; the recommended setup writes only through
  `models.json` and tracked security keys, both reversible with the existing
  uninstall.

## Open Questions

- Exact wording of the two new prompts and the summary layout; settle during
  implementation with Pixie's microcopy review, without changing behavior.

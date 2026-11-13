# Spec Delta

## Purpose

Guides an interactive `canonkit install` through a short sequence that always sets up the user level, asks whether to also set up the current project, and offers a recommended model and security setup that can be accepted in one answer, naming every write as user or project.

## ADDED Requirements

### Requirement: The user level is always installed
`canonkit install` SHALL always install the user level (the per-OS-user installation under the harness's user configuration, honoring `CLAUDE_CONFIG_DIR`). No choice in the flow SHALL skip it; project-only work stays with `canonkit add` and `canonkit tool add`.

#### Scenario: Interactive install from a project
- **WHEN** a person runs `canonkit install` in a terminal inside a valid project and answers No to the project question
- **THEN** the user level is installed for the selected harnesses and no project file is written

#### Scenario: Install outside a project
- **WHEN** `canonkit install` runs in a terminal from the home directory
- **THEN** the user level is installed and the project question is not shown

### Requirement: The harness menu starts with nothing selected
The interactive "Install the team for" menu SHALL start with no harness selected and SHALL NOT advance until at least one is selected. Pressing Enter with none selected SHALL keep the menu open and say that at least one harness must be picked. Without a terminal and without a harness flag, install SHALL keep installing Claude Code and Codex.

#### Scenario: Enter with nothing selected
- **WHEN** the person presses Enter at the harness menu without selecting anything
- **THEN** the menu stays open and shows that at least one harness is required

#### Scenario: No terminal
- **WHEN** `canonkit install` runs without a terminal and without a harness flag
- **THEN** Claude Code and Codex are installed, as in the previous release

### Requirement: Every interactive install question uses one menu pattern
In a terminal, every install question SHALL be an arrow-key menu (a select or a multi-select) with the library's instruction block disabled; none SHALL be a typed `[y/n]` or letter-choice question. An option that is the current value SHALL be tagged "(current)" and canonkit's recommended option SHALL be tagged "(recommended)"; both tags are text. Each menu hint SHALL say what Enter does. Text printed before a menu SHALL be plain ASCII lines of at most 78 columns, and a menu frame SHALL NOT exceed 78 columns.

#### Scenario: Security question in a terminal
- **WHEN** a security question is asked
- **THEN** it is a menu whose recommended option is tagged "(recommended)" and preselected, and no typed answer is accepted

#### Scenario: Narrow terminal
- **WHEN** the longest catalog item or settings key is shown in an 80-column terminal
- **THEN** no printed line or menu frame exceeds 78 columns

### Requirement: Current and recommended values share one format
Model levels per harness, user security changes, project security changes and every customize question SHALL show each value as a row `label  current  marker  recommended`, using the column names "current" and "recommended", the unset value "(not set)", and the markers `=` (already recommended), `->` (replaced), `+` (not set today, added) and `!` (no recommendation available, with a reason). One legend line SHALL precede the first row of a screen. A group whose rows all match SHALL collapse to one `=` line, and matching security rows in a mixed group SHALL collapse to a count. Meaning SHALL NOT depend on color. The same row format, without padding, SHALL be used for the non-terminal output of `--recommended`.

#### Scenario: Reinstall with mixed levels
- **GIVEN** Claude Code levels deep opus/medium, standard opus/high, light unset
- **WHEN** the recommended-setup question is shown
- **THEN** the rows read `deep ... =`, `standard ... ->` and `light ... +` in the same columns as the security rows

#### Scenario: Strict key absent today
- **GIVEN** `permissions.blockReadsOutsideWorkingDirectories` absent from the project settings
- **WHEN** the recommended-setup question is shown with the project in scope
- **THEN** a row `permissions.blockReadsOutsideWorkingDirectories  (not set)  +  true` is listed under PROJECT

#### Scenario: Codex tier without a match
- **GIVEN** Codex discovery lists no `gpt-<version>-terra` model
- **WHEN** the recommended-setup question is shown
- **THEN** the `light` row shows `!` and the reason, and nothing is recommended for it

### Requirement: The interactive install asks whether to set up the current project
In a terminal, after the harness choice and only when the current directory is a valid project (the same target `canonkit add` accepts), install SHALL print one line saying what setting up the project adds, then ask whether to also set up that project, naming its path, with Yes preselected and tagged "(recommended)". Cancelling the question SHALL write nothing.

#### Scenario: Valid project
- **WHEN** install runs in a terminal from inside a Git repository outside canonkit and HOME
- **THEN** after the harness menu it asks "Also set up this project?" naming the path, with "Yes, set up this project (recommended)" preselected and "No, user level only" as the alternative

#### Scenario: Not a valid project
- **WHEN** install runs from the canonkit source repository or outside any repository
- **THEN** the project question is not shown and the output says in one line that project items are added from the target project with `canonkit add`

#### Scenario: Cancel at the project question
- **WHEN** the person cancels the project question
- **THEN** nothing is written and the output says "Cancelled: nothing was installed."

### Requirement: Declining the project limits writes to the user level
When the person answers No to the project question, install SHALL NOT write any project file: no project items, no project security settings and no project-scoped Codex agent files.

#### Scenario: Project declined in a repository with weak settings
- **GIVEN** a repository whose `.claude/settings.json` has `sandbox.enabled: false`
- **WHEN** the person answers No to the project question
- **THEN** that file is unchanged and the output says project security was not configured because the project was not set up

### Requirement: The --no-project flag declines the project
`canonkit install --no-project` SHALL behave as an answer of No to the project question: the project question is not shown and no project file is written, with or without a terminal. Combined with a project-item flag (`--tool`, `--specialist`, `--stack`), install SHALL fail before any write and say the flags conflict.

#### Scenario: --no-project without a terminal
- **GIVEN** a repository whose `.claude/settings.json` has `sandbox.enabled: false`
- **WHEN** `canonkit install --claude --no-project` runs from it without a terminal
- **THEN** the user level is installed, that file is unchanged, and the output says the project was not set up

#### Scenario: --no-project with project items
- **WHEN** `canonkit install --no-project --specialist maya` runs
- **THEN** install writes nothing and reports that `--no-project` conflicts with project-item flags

### Requirement: The interactive install offers a recommended setup
In a terminal, for Claude Code or Codex targets, install SHALL print the recommended setup in the shared row format (models per harness, then security under USER and, when the project is in scope, under PROJECT) and then ask one question, "Use the recommended setup?", with options *Yes, use recommended* (preselected), *No, keep current* (only when the user configuration already holds a model choice for a selected harness) and *No, customize*. The printed block SHALL end with a count of rows replaced, added and already recommended.

#### Scenario: First install
- **WHEN** a person with no model configuration runs install in a terminal for Claude Code
- **THEN** the levels are listed with `+` rows, the question offers Yes and Customize, and Enter accepts Yes

#### Scenario: Reinstall with existing choices
- **GIVEN** a user configuration with Claude Code level choices
- **WHEN** install runs in a terminal for Claude Code
- **THEN** the question also offers *No, keep current*
- **AND** each level shows its current and recommended model and effort in one row, e.g. `standard  opus/high  ->  sonnet/medium`, and a matching level shows `=`

#### Scenario: Only other harnesses
- **WHEN** the selected harnesses are only OpenCode or GitHub Copilot
- **THEN** the recommended-setup question is not shown

#### Scenario: Cancel
- **WHEN** the person presses Ctrl-C or Esc at any install question, or the input closes
- **THEN** nothing is written and the output says "Cancelled: nothing was installed." (or "Input closed: nothing was installed.")

### Requirement: The answer governs every listed security change
The recommended-setup prompt SHALL list every security change that install would make, in the shared row format: runtime read exceptions for user settings and, when the project is in scope, every project key that would be replaced (`->`) or added because it is absent (`+`). Choosing Yes SHALL be the explicit confirmation for exactly those rows. *No, keep current* SHALL write none of them, absent keys included. No separate security question SHALL follow Yes or keep current.

#### Scenario: Recommended with security changes
- **GIVEN** an uncovered runtime location, a weaker key and an absent strict key
- **WHEN** the recommended-setup question is shown
- **THEN** it lists all three with current and recommended values
- **AND** choosing Yes applies exactly those rows and asks no further security question

#### Scenario: Keep current writes no security row
- **GIVEN** the same three rows
- **WHEN** the person chooses *No, keep current*
- **THEN** none of the three is written, and the snippet for the runtime reads and the keys is printed

#### Scenario: Recommended with nothing to change
- **WHEN** no security change is pending
- **THEN** the prompt lists only the model rows and says security is already at the recommended profile

### Requirement: Keep current and customize preserve today's choices
*No, keep current* SHALL leave the model configuration unchanged and write no listed security row, and SHALL print the recommended snippet. *No, customize* SHALL run the model setup and a security review, each as menus in the shared pattern. Model questions SHALL show the level's row and tag the recommended option, with the current value preselected when one exists. Security SHALL be one menu for runtime reads and one multi-select of all other changes (replaced and added), every row checked by default, where an unchecked row keeps the current value.

#### Scenario: Keep current
- **WHEN** the person chooses *No, keep current*
- **THEN** `~/.canonkit/models.json` is unchanged, no listed security row is written, and the snippet is printed

#### Scenario: Customize
- **WHEN** the person chooses *No, customize*
- **THEN** each model question shows the level's row and tags "(recommended)" and "(current)" options
- **AND** the security multi-select lists every replaced and added row checked, its hint says unchecked settings keep their current value, and Enter applies the checked rows

### Requirement: The --recommended flag applies the recommended setup without asking
`canonkit install --recommended` SHALL apply the recommended model and security setup without the recommended-setup question, including in a non-terminal run. Without a terminal and without the flag, install SHALL keep the previous release's behavior: no model choice is written and security follows its non-interactive rules.

#### Scenario: CI with --recommended
- **WHEN** `canonkit install --claude --recommended` runs without a terminal
- **THEN** the recommended Claude levels are saved to the user configuration and the recommended security changes are applied
- **AND** each change is printed as one line `<Applying|would apply> <user|project> <area> <name>: <current> <marker> <recommended>` using the shared markers

#### Scenario: CI without the flag
- **WHEN** `canonkit install --claude` runs without a terminal
- **THEN** no model choice is written and the output matches the previous release

#### Scenario: Dry run with --recommended
- **WHEN** `canonkit install --recommended --dry-run` runs
- **THEN** it prints what the recommended setup would write, starts no harness program, and writes nothing

### Requirement: Install output names the level of every write
Install output and the confirmation summary SHALL group what is written under *user* and *project* and use those two terms for the installation levels. "Global" and "machine" SHALL NOT name a level in install output; "repository" SHALL name only the Git repository.

#### Scenario: Summary before writing
- **WHEN** an interactive install with the project in scope reaches its summary
- **THEN** the summary lists harnesses, model choices and user security changes under USER, and project items and project security changes under PROJECT, and ends with a menu "Write these changes?" whose options are "Yes, install" and "No, cancel (nothing is written)"
- **AND** a declined project shows "not set up" under PROJECT and a kept security answer shows "unchanged (kept current)"

#### Scenario: Install messages
- **WHEN** install reports a security change to `~/.claude/settings.json`
- **THEN** the line calls it a user setting, not a global or machine setting

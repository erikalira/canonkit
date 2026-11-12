## ADDED Requirements

### Requirement: The interactive install offers every installable category
When `canonkit install` runs in a terminal without harness flags, after the harness choice it SHALL offer, in this order, optional tools, domain specialists and stack packs, each as a multi-select whose items are the ones the matching `add` / `tool add` command accepts today.

#### Scenario: A user installs from a terminal in a project
- **WHEN** a user runs `canonkit install` in a terminal inside a valid project
- **THEN** after the harness menu they are offered tools, specialists and stack packs
- **AND** each list shows every item the catalog defines, with a one-line description and its current state

#### Scenario: A new specialist or stack is added to the kit
- **WHEN** a specialist agent file or stack-pack id is added to the catalog
- **THEN** it appears in the install menu without a separate menu edit

### Requirement: Project items are offered only against a valid project
Tools, specialists and stack packs are project-scoped. The install flow SHALL offer them only when the current directory is a valid target for `canonkit add`; otherwise it SHALL skip those steps, say why in one line and print the command to run later from a project.

#### Scenario: Install runs from the canonkit repository
- **WHEN** the current directory is the canonkit source repository
- **THEN** no project item is offered and no project file is written
- **AND** the output says project items are added from the target project

#### Scenario: Install runs from the home directory
- **WHEN** the current directory is not inside a project (no repository root)
- **THEN** the project steps are skipped with the same one-line explanation

### Requirement: Selections reuse the existing installers
Each selected specialist, stack pack or tool SHALL be applied through the same behavior as `canonkit add <name>` or `canonkit tool add <name>`, including their validation, collision handling, receipts, confirmations and dry-run output.

#### Scenario: A stack pack collides with unowned content
- **GIVEN** an untracked `.claude/skills/canonkit-<id>/` directory
- **WHEN** the user selects that pack in the menu
- **THEN** the pack is reported as a collision, nothing is overwritten
- **AND** the remaining selections are still applied and the install exits non-zero

#### Scenario: A tool is not on PATH
- **WHEN** the user selects a tool whose binary is missing
- **THEN** the flow prints the tool's pinned install command and does not install the binary itself
- **AND** the tool's own confirmation step is not bypassed by the menu

### Requirement: Selection happens before any write, and cancelling writes nothing
The flow SHALL collect every answer before applying anything. Cancelling any menu SHALL leave the machine and the project unchanged and report that nothing was installed.

#### Scenario: The user cancels at the stack step
- **WHEN** the user cancels the stack-pack menu after choosing harnesses and specialists
- **THEN** nothing is written globally or in the project
- **AND** the output says "Cancelled: nothing was installed."

### Requirement: Skipping the project steps is a valid choice
Choosing no tool, specialist or stack SHALL be allowed, and the install SHALL then do exactly what an install without those steps does.

#### Scenario: Enter on empty project lists
- **WHEN** the user confirms the project menus without selecting anything
- **THEN** only the harness install runs and no project file is written

### Requirement: Non-interactive install is unchanged unless asked
Without a terminal, `canonkit install` SHALL NOT show any menu and SHALL NOT write project items. Project items are selected without a terminal only by explicit flags that name them.

#### Scenario: Install in CI
- **WHEN** `canonkit install` runs with no TTY and no project-item flag
- **THEN** its writes and output match the behavior before this change

#### Scenario: Install with explicit project items
- **WHEN** a script runs install with a flag naming a specialist, stack or tool
- **THEN** that item is validated before any write and applied after the harness install
- **AND** an unknown name fails with the lists of valid names, writing nothing

### Requirement: Dry run previews the whole flow
With `--dry-run`, the flow SHALL show what the harness install and each selected project item would do, and SHALL write nothing.

#### Scenario: Dry run with selections
- **WHEN** the user selects items in the menu with `--dry-run`
- **THEN** every selected item prints its would-install line and no file changes

### Requirement: The end of install says what was not installed
After a successful install the output SHALL list, by category, the items that were available but not chosen, and the command to add them later. It SHALL NOT list items already installed.

#### Scenario: Some stacks are installed
- **WHEN** install finishes with two stacks selected
- **THEN** the closing lines list the remaining stacks, specialists and tools not yet active, and point to `canonkit list`

### Requirement: Install output makes tool actions and outcomes clear
When `install` runs selected tool setup, it SHALL show the tool, project target, command and material warnings before asking for confirmation. The confirmation SHALL name the tool and target. In the default install output, successful tool output SHALL be summarized, while warnings and failures remain visible; `--verbose` SHALL show the detailed preflight and tool output. Success, already-current status and warnings SHALL use distinct textual labels.

#### Scenario: A selected tool is about to run
- **WHEN** install is about to run a selected tool's setup
- **THEN** the output names the tool, project, command and any material warning before the confirmation
- **AND** the confirmation names the tool and project
- **AND** the existing tool confirmation is still required unless the user explicitly passed `--yes`

#### Scenario: A tool succeeds in the default install flow
- **WHEN** a selected tool setup succeeds without `--verbose`
- **THEN** canonkit prints a concise outcome summary instead of the tool's routine progress output
- **AND** any material warning from the tool remains visible

#### Scenario: A tool fails or install is verbose
- **WHEN** a selected tool setup fails, or install runs with `--verbose`
- **THEN** the full tool output is visible for diagnosis
- **AND** `--verbose` shows detailed per-step information as the setup runs

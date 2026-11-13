# Spec Delta

## MODIFIED Requirements

### Requirement: The interactive install offers every installable category
When `canonkit install` runs in a terminal without harness flags, after the harness choice and after the person answers Yes to setting up the current project, it SHALL offer, in this order, optional tools, domain specialists and stack packs, each as a multi-select whose items are the ones the matching `add` / `tool add` command accepts today.

#### Scenario: A user installs from a terminal in a project
- **WHEN** a user runs `canonkit install` in a terminal inside a valid project and answers Yes to the project question
- **THEN** they are offered tools, specialists and stack packs
- **AND** each list shows every item the catalog defines, with a one-line description and its current state

#### Scenario: The user declines the project
- **WHEN** a user runs `canonkit install` in a terminal inside a valid project and answers No to the project question
- **THEN** no tool, specialist or stack-pack menu is shown and no project file is written

#### Scenario: Preselection in the menus
- **WHEN** the project item menus are shown
- **THEN** the optional tools `graphify` and `openspec` are preselected and tagged "(recommended)"
- **AND** no domain specialist and no stack pack is preselected or tagged "(recommended)"

#### Scenario: A new specialist or stack is added to the kit
- **WHEN** a specialist agent file or stack-pack id is added to the catalog
- **THEN** it appears in the install menu without a separate menu edit

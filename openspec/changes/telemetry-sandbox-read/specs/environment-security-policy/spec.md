# Spec Delta

## ADDED Requirements

### Requirement: Telemetry read exception is opt-in and confirmed
On a sandbox-capable platform with a supported Claude version, when the Claude target is installed and `~/.claude/canonkit-activity` is not covered by user `sandbox.filesystem.allowRead`, an interactive installation SHALL offer that folder as a read exception through its own question, separate from runtime reads. The question SHALL state the trade-off and SHALL preselect keeping the folder closed.

#### Scenario: Offered in the customize review
- **GIVEN** the folder is not covered by user `allowRead`
- **WHEN** the person chooses *No, customize* in an interactive installation
- **THEN** a separate menu offers the telemetry read and has "Keep closed" preselected
- **AND** it says that every sandboxed command could then read the activity history: session IDs, project names, agent names and the paths of files that gates flagged, secret-looking files included; that older records can also hold the first 80 characters of commands and dispatch descriptions; and that it holds no prompts and no tool output

#### Scenario: Person opts in
- **WHEN** the person selects the option that adds the telemetry read
- **THEN** `~/.claude/canonkit-activity` is appended to user `allowRead` in `~/`-relative form, existing entries and their order are kept, and the item is recorded as kit-owned

#### Scenario: Enter or closed input keeps it closed
- **WHEN** the person presses Enter at that menu, or the input closes
- **THEN** user settings are not changed for the telemetry read

#### Scenario: Already covered
- **GIVEN** user `allowRead` already contains the folder or a broader entry covering it, in any equivalent spelling
- **WHEN** installation runs
- **THEN** the telemetry read is not offered and the file is not rewritten for it

#### Scenario: Unsupported environment
- **WHEN** the platform is native Windows, the sandbox capability is unavailable, the Claude version is unknown or below the sandbox floor, or the Claude target is not installed
- **THEN** the telemetry read is not offered or written

#### Scenario: Re-install after opt-in
- **GIVEN** the person opted in earlier and the receipt records the item as kit-owned
- **WHEN** installation runs again
- **THEN** the telemetry read is not offered, user settings are not rewritten for it, and the receipt keeps the item as kit-owned

#### Scenario: Telemetry folder is a symbolic link
- **WHEN** `~/.claude/canonkit-activity` or `~/.claude` is a symbolic link
- **THEN** the telemetry read is not offered or written, and the output says why and prints the snippet for the person to add by hand

### Requirement: Telemetry read stays outside the recommended set
The telemetry read exception SHALL NOT be listed among the rows that the recommended-setup *Yes* or `--recommended` apply, and SHALL NOT be written by *Yes*, *No, keep current*, `--recommended`, `--yes`, a dry run or an installation without an interactive terminal. Those paths SHALL print the snippet and say that the customize review offers it.

#### Scenario: Recommended setup accepted
- **GIVEN** the folder is not covered by user `allowRead`
- **WHEN** the person chooses *Yes* at the recommended-setup question, or runs `canonkit install --claude --recommended`
- **THEN** the telemetry read is not written and no further security question is asked
- **AND** the output prints the `allowRead` snippet for it and names *No, customize* as the way to add it

#### Scenario: No terminal, --yes or dry run
- **WHEN** installation runs without an interactive terminal, with `--yes`, or as a dry run
- **THEN** user settings are not changed for the telemetry read and the snippet is printed

#### Scenario: Entry removed by hand
- **GIVEN** the person opted in, then removed the entry from user settings by hand
- **WHEN** installation runs with *Yes* or `--recommended`
- **THEN** the entry is not added again

### Requirement: Telemetry read exception stays narrow
Installation SHALL propose and write only the exact folder `~/.claude/canonkit-activity`, never `~/.claude`, the home directory or another parent, and SHALL write nothing for it when user settings are unreadable or ambiguous. Uninstall SHALL remove the item only when the receipt records it as kit-owned and it is still present unchanged.

#### Scenario: Ambiguous user settings
- **WHEN** user `allowRead` is not an array of plain path strings
- **THEN** the telemetry read is neither offered nor written

#### Scenario: Uninstall after opt-in
- **GIVEN** the person opted in and the receipt records the item as kit-owned
- **WHEN** canonkit is uninstalled for Claude
- **THEN** the item is removed from user `allowRead` and every other entry is kept

#### Scenario: User-added identical entry
- **GIVEN** the person added `~/.claude/canonkit-activity` by hand, and the receipt does not record it
- **WHEN** installation and then uninstall run
- **THEN** canonkit neither records it as kit-owned nor removes it

#### Scenario: Look-alike paths
- **WHEN** user `allowRead` holds `~/.claude/canonkit-activity2`, `~/.claude/canonkit-activity-evil` or `~/.claude/canonkit-activity/../x`
- **THEN** none of them counts as covering the telemetry folder, and none is trusted as kit-owned

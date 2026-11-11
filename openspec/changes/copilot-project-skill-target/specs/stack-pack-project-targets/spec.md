# Spec Delta

## Purpose

Define which project directories a stack pack owns, how pack state is reported, and how receipts written by earlier CLI versions are read and completed, so installed paths and ownership stay predictable.

## ADDED Requirements

### Requirement: A pack owns one skill copy per fixed project target
Adding a stack pack SHALL install exactly one `SKILL.md` for it under each fixed project target, `.agents/skills/canonkit-<id>/`, `.claude/skills/canonkit-<id>/` and `.github/skills/canonkit-<id>/`, and record each copy under the key `<id>:<target>:SKILL.md` in the schema-1 receipt.

#### Scenario: A pack is added to a clean project
- **WHEN** a user adds one pack in a project with none of its destinations
- **THEN** one `SKILL.md` exists at each of the three targets
- **AND** the receipt holds three entries for that pack and no entry for other packs

#### Scenario: Pack state is reported from all targets
- **WHEN** every target copy is tracked and present and none is edited
- **THEN** the pack is reported as installed
- **AND** if any target copy is missing or untracked, it is not reported as installed

### Requirement: Receipts from the two-target CLI are read without migration
A schema-1 receipt that lists only the `.agents` and `.claude` entries of a pack SHALL be accepted as is, and the pack SHALL be reported as `partial` until its third copy is added. Reading or listing SHALL NOT rewrite the receipt.

#### Scenario: A legacy install is listed
- **GIVEN** a receipt written by the two-target CLI for a pack whose two copies are intact
- **WHEN** the user lists packs with the current CLI
- **THEN** that pack is reported as `partial`
- **AND** the receipt file is byte-identical afterwards

### Requirement: Re-adding a legacy pack completes it without altering existing copies
Adding a pack that is `partial` because only its two original copies exist SHALL create the third copy and its receipt entry, and SHALL leave every other pack unchanged. Where the existing copies match the current pack source, their bytes and receipt hashes SHALL also stay unchanged; otherwise they are updated like any tracked, unedited copy.

#### Scenario: A legacy pack is re-added
- **GIVEN** a two-target install of one pack alongside an unrelated pack
- **WHEN** the user adds the legacy pack again
- **THEN** the pack is reported as installed with three tracked copies
- **AND** the original two copies and the unrelated pack keep their previous bytes and hashes

### Requirement: An unowned destination at any target is a collision
If the destination directory of a pack at any target exists and is not tracked by the receipt, the pack SHALL be reported as `untracked/collision`, and adding it SHALL fail without overwriting or removing the unowned content.

#### Scenario: A legacy install meets a pre-existing third destination
- **GIVEN** a two-target install and an untracked `.github/skills/canonkit-<id>/` directory
- **WHEN** the user lists packs and then adds the pack again
- **THEN** the pack is reported as `untracked/collision`, not `partial`
- **AND** the add fails with a collision error and the untracked content is unchanged

### Requirement: Unknown receipt entries are still rejected
The CLI SHALL keep rejecting receipt entries it does not know. Compatibility with older receipts SHALL NOT be obtained by accepting unknown keys, deleting the receipt or adding a receipt version.

#### Scenario: An older CLI meets a three-target receipt
- **GIVEN** a receipt that includes a `<id>:copilot:SKILL.md` entry
- **WHEN** a CLI that predates the third target reads it
- **THEN** it rejects the receipt as invalid rather than ignoring the entry

### Requirement: Downgrade guidance names every pack the newer CLI wrote
Installation documentation SHALL state that, before downgrading to a CLI without the third target, the user must remove with the newer CLI every pack it added or re-added, not only recently introduced IDs, and that packs installed only by the older CLI report `partial` until added again.

#### Scenario: A user reads the downgrade instructions
- **WHEN** a user follows the documented removal before downgrading
- **THEN** the older CLI can read the remaining receipt
- **AND** the instructions do not tell the user to delete the receipt

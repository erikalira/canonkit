# Spec Delta

## ADDED Requirements

### Requirement: Review brief with resolved diff scope
Guidance for dispatching a reviewer SHALL have the brief carry the diff scope the lead already resolved: the revision range (`<base>..<head>`, working tree against HEAD, or working tree against the base) and the work state it was resolved on, the exact command that shows the diff, the changed files with added and removed line counts, and untracked files listed separately. The guidance SHALL NOT require a new file in the repository.

#### Scenario: Reviewer dispatched on a committed branch
- **WHEN** the lead dispatches a reviewer for commits on a branch
- **THEN** the brief names the range, the diff command for it and each changed file with its line counts, so the reviewer can start from the diff without rediscovering the scope

#### Scenario: Review of uncommitted work
- **WHEN** the work under review is uncommitted
- **THEN** the brief says "working tree against HEAD", gives the matching diff command and lists untracked files separately, since the diff command does not show them

#### Scenario: Commits plus uncommitted edits
- **WHEN** the branch under review has commits and uncommitted edits
- **THEN** the brief reviews the working tree against the base, so neither part is hidden

#### Scenario: Large diff
- **WHEN** the diff is too large to read in one pass
- **THEN** the brief names per-file diff commands so the reviewer reads it in parts, and no file is written to the repository

#### Scenario: State not reproducible by git
- **WHEN** the reviewed state cannot be shown by a git command
- **THEN** the lead saves it in the scratch folder following the temporary-work rule and the brief carries that path

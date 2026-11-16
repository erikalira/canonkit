# project-tool-safety Specification

## Purpose
Defines what canonkit guarantees when it integrates an external tool into a project it does not trust: how it runs git there, how it reads project files, and which write targets it refuses.

## Requirements

### Requirement: Git in the project runs without repository-chosen code
Every git command canonkit runs in a project while adding a tool SHALL run with the repository's `core.fsmonitor` disabled and with no `GIT_*` variable inherited from the caller's environment, in any letter case.

#### Scenario: A repository-local fsmonitor is never run
- **WHEN** the project sets `core.fsmonitor` to a script and `canonkit tool add graphify` runs (with or without `--with-git-hooks`)
- **THEN** the script never runs

#### Scenario: An inherited GIT_DIR does not redirect git
- **WHEN** `GIT_DIR` in the caller's environment points to another repository
- **THEN** the git checks of `tool add` inspect the project's own repository

#### Scenario: The hooks preflight still sees core.hooksPath
- **WHEN** the project sets `core.hooksPath` and `tool add graphify --with-git-hooks` runs
- **THEN** canonkit still refuses and says `core.hooksPath is set`

### Requirement: Project files are read only when they are regular files
Files canonkit reads from a project or a `.claude` directory while adding a tool or migrating legacy hooks SHALL be read only when they are regular files (a symlink to a regular file counts); any other kind SHALL be treated as unreadable, and the command SHALL NOT block on it.

#### Scenario: A FIFO .gitignore does not hang tool add
- **WHEN** `.gitignore` in the project is a FIFO and `canonkit tool add graphify` runs
- **THEN** the command ends with an error naming `.gitignore` as not a regular file, and writes nothing to it

#### Scenario: A FIFO git hook is not treated as foreign or as graphify's
- **WHEN** `.git/hooks/post-commit` is a FIFO and `tool add graphify --with-git-hooks` runs
- **THEN** the command refuses without hanging and without overwriting it

### Requirement: Every segment of a write target is checked
Before running a tool's setup, canonkit SHALL refuse when any existing directory segment of a path the chosen harnesses or the tool write to is a symlink or not a directory, and when an existing literal file target is a symlink; nothing SHALL run.

#### Scenario: A symlinked nested directory is refused
- **WHEN** `.claude` is a real directory and `.claude/skills` is a symlink, and `tool add openspec --harness=claude --yes` runs
- **THEN** canonkit refuses, names `.claude/skills`, and runs nothing

#### Scenario: Absent segments are allowed
- **WHEN** `.claude` exists but `.claude/skills` does not
- **THEN** the check passes and setup runs

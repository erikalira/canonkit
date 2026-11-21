# Spec Delta

## Purpose

Detect and explain the files that the Claude Code sandbox leaves on the host where it write-protects a path, so users can recognise a leftover placeholder and remove it safely without canonkit touching it.

## ADDED Requirements

### Requirement: Doctor reports an orphaned git config lock
`canonkit doctor` SHALL report one WARN for each git config lock (`config.lock` or `config.worktree.lock` in the repository's git dir or common dir, each path once) that is a regular file of size 0 without owner write permission. The WARN SHALL name the path, say it is probably left by the Claude Code sandbox, say git cannot change the repository's config while it exists, and say to delete it from the user's own terminal after closing Claude Code sessions in that repository.

#### Scenario: Empty read-only lock in the main repository
- **WHEN** doctor runs inside a git repository whose `.git/config.lock` is a 0-byte file with mode 0444
- **THEN** doctor prints one WARN naming that path, the probable sandbox cause, the blocked config writes and the removal instruction
- **AND** doctor's exit status is the same as without the file

#### Scenario: Linked worktree
- **WHEN** doctor runs inside a linked worktree and the common dir's `config.lock` is a 0-byte 0444 file
- **THEN** doctor reports that common-dir path

#### Scenario: Run from a subdirectory
- **WHEN** doctor runs from a subdirectory of a repository with an empty read-only `config.lock`
- **THEN** doctor reports the same WARN as from the repository root

### Requirement: Doctor does not flag live or genuine locks
Doctor MUST NOT report a git config lock that is missing, has content, is writable by its owner, or appears as the null character device (a sandbox placeholder seen from inside a live sandbox). Doctor MUST NOT report a lock that is a symbolic link or a directory.

#### Scenario: Lock with content
- **WHEN** `.git/config.lock` is a read-only file with content
- **THEN** doctor prints no git config lock row

#### Scenario: Writable empty lock
- **WHEN** `.git/config.lock` is a 0-byte file with owner write permission, as git creates while it writes config
- **THEN** doctor prints no git config lock row

#### Scenario: No lock
- **WHEN** there is no `config.lock` or `config.worktree.lock`
- **THEN** doctor prints no git config lock row

#### Scenario: Inside the sandbox
- **WHEN** doctor runs inside the Claude Code sandbox, where the lock is `/dev/null` (character device 1:3)
- **THEN** doctor prints no git config lock row

### Requirement: Diagnosis is read-only and runs no repository code
The git config lock diagnosis MUST NOT delete, rename, change the mode of or write any file. It MUST locate git directories without running code named by the repository's configuration, such as fsmonitor or hooks. A failure to locate or inspect them MUST produce no row and MUST NOT fail doctor.

#### Scenario: File left untouched
- **WHEN** doctor reports an orphaned lock
- **THEN** the lock still exists afterwards, with the same size, mode and mtime

#### Scenario: Not a repository
- **WHEN** doctor runs outside any git repository
- **THEN** doctor prints no git config lock row and its exit status is unaffected

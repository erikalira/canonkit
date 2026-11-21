# Proposal

## Why

The Claude Code sandbox (bubblewrap, Linux/WSL2) write-protects `.git/config.lock` and `.git/config.worktree.lock` with a built-in rule (observed in Claude Code 2.1.322; canonkit writes no such rule). The sandbox does this by mounting `/dev/null` on the path, which leaves a 0-byte, read-only (0444) file on the host. When a session does not exit cleanly, that file stays behind. Git then reads it as a held lock and refuses every config write: `git branch --set-upstream-to` fails with "could not lock config file .git/config: File exists", and VS Code offers "Publish Branch" for a branch that is already published. This happened in a user project on 2026-11-15, and it took a manual investigation to trace it back to the sandbox. `canonkit doctor` already diagnoses the sandbox's other placeholders, so it is the natural place to name this one.

## What Changes

- `canonkit doctor` reports a WARN when a git config lock (`config.lock` or `config.worktree.lock`, in the repository's git dir or common dir) is an empty, read-only regular file. The warning names the path, gives the likely cause (an orphaned sandbox placeholder) and the effect (git cannot change this repository's config), and says how to remove the file: from the user's own terminal, after closing the Claude Code sessions open in that repository.
- Doctor never deletes or changes the file. It stays silent for a lock that has content, a lock that is writable (a real git lock in progress), a missing lock, and the `/dev/null` device that the lock appears as inside a live sandbox.
- ADR 0007 gains a note: the sandbox also leaves placeholders inside `.git`. `git-ignore-sandbox-files` does not address them, because an exclude rule does not stop git from honouring a lock file.
- Nothing changes in settings, sandbox rules or the install policy. The protection belongs to Claude Code, and widening it would weaken the sandbox.

## Capabilities

### New Capabilities
- `sandbox-placeholders`: how canonkit detects and reports the files that the Claude Code sandbox leaves on the host. This change starts the capability with the git-config-lock diagnosis; the existing project-root placeholder behavior (ADR 0007) can move here later.

### Modified Capabilities
<!-- none: security-diagnostics covers security settings coverage, not leftover files -->

## Impact

- `bin/cli.js`: the doctor's placeholder diagnosis (`sandboxPlaceholderDiagnosis`) gains the lock check. Git is called through the existing hardened runner, with `GIT_*` dropped and fsmonitor/hooksPath disabled.
- `test/e2e/git-ignore-sandbox-files.test.js` (doctor block): new cases.
- Docs: `docs/adr/0007-sandbox-placeholder-exclude.md`, the doctor/sandbox placeholder section of `docs/install.md`, and the release notes of the next version.
- No dependency, settings or public CLI flag changes. The doctor exit contract is unchanged: WARN never makes doctor exit with an error.

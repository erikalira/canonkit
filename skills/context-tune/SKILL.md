---
name: context-tune
description: Run once per project to cut the noise its commands put into an agent's context (color codes, banners, tips, progress bars, verbose test reporters) by saving quiet settings in the project, measured before and after. Invoked by the user only.
disable-model-invocation: true
---

# Context tune

Every line a command prints enters the agent's context, and is read again on every
later turn. Noise that one setting can silence costs less silenced in the project
than forbidden by a rule that every session loads. This skill finds that noise,
silences it where the setting stays saved, and shows the measured difference.

This is what the agent reads, not what a person waits for: Perry's budgets and
production performance are out of scope.

## 1. Measure the baseline

- List the commands agents actually run here: test, build, lint, typecheck. Read
  them from the project's scripts (package.json, Makefile, justfile, pyproject,
  Cargo.toml, ...), its CI config and its `AGENTS.md`.
- Run each once the way an agent would, stdout and stderr together into a scratch
  file. Record characters, lines and the exit code.
- Do not run anything with side effects (deploy, migrate, publish, seed a shared
  database) or that takes more than a few minutes: list it and ask.

## 2. Separate signal from noise

- **Signal**: failures, error messages, assertion diffs, the final summary,
  warnings someone acts on. Security advisories are always signal.
- **Noise**: ANSI color and cursor codes, spinners and progress bars, banners and
  tips (dotenv v17's `injected env (N) from .env // tip: ...` is the typical
  case), one line per passing test when the summary already counts them,
  download and install chatter.

Name the source of each noisy line (which tool, which version) before touching it.

## 3. Silence it where the setting stays saved, in this order

1. **Environment for the agent only.** Claude Code: the `env` key in the
   project's `.claude/settings.json` (shared with the team) or
   `.claude/settings.local.json` (only this machine). Codex:
   `[shell_environment_policy.set]` in `.codex/config.toml`, which Codex loads only
   for a trusted project. Usual candidates: `NO_COLOR=1`, `FORCE_COLOR=0`,
   `GIT_PAGER=cat`, plus a tool's own quiet variable (`DOTENV_CONFIG_QUIET=true`).
   A person's terminal is untouched.
2. **The tool's configuration in the repository**, when the project's own code or
   config prints the noise: `quiet: true` on dotenv's `config()`, the log level in
   the test setup, the test reporter. Change it only if a person running the
   command loses nothing they read; otherwise use step 3.
3. **A script for agents**, e.g. `test:agent` with a compact reporter, plus one
   line in the project's `AGENTS.md` naming it. Last resort: that line is loaded
   by every session in the project.

Check every flag and variable against the version installed in the project (its
docs or changelog), not from memory: quiet options are renamed between versions.

## 4. What not to do

- Switch modes such as `CI=true` without saying what else they change.
- Silence security output (`npm audit`, advisories): that is Gard's call.
- Hide failures. After tuning, a failing test must still show its name, message
  and diff; confirm that from the reporter's docs or a quick failing case, not
  from a quiet green run.
- Change global configuration (`~/.npmrc`, global git config, user-level
  settings). Everything stays in the project.
- Change CI configuration without Pipe: CI output is read by people too.

## 5. Measure again and report

Run the same commands again and report:

| Command | Before (chars / lines) | After | Same exit code? |
|---|---|---|---|

Rough tokens ≈ chars / 4. Then list each change with its file and the noise it
removed. Changes in steps 1 and 2 are LOW (local, reversible); a change to CI is
MEDIUM and goes through Pipe.

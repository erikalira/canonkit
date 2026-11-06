# Handoff: tool pins and the graphify block

State on 2026-11-06, branch `fix`, with unrelated changes already staged. Nothing below is implemented. Delete this file when the work closes.

Latest versions: graphifyy 0.9.103 (PyPI, published 2026-11-05), @fission-ai/openspec 1.16.0 (npm, 2026-10-30). Pins in `tools/*.md`: 0.9.76 and 1.14.0. Installed locally: 0.9.103 and 1.16.0.

**Why:** the user felt `tool add graphify` left the install incomplete and that graphify's own AGENTS.md section beats canonkit's rules.

## Findings

Read from the installed source, 0.9.101 first and 0.9.103 where noted, and partly from v0.9.76:

- `graphify codex install` writes the `## graphify` section plus a `.codex/hooks.json` hook running `graphify hook-check`, which is only `sys.exit(0)`. Without `--project` the hook holds an absolute machine path. It does not install the skill.
- `hook install` writes 4 hooks in 0.9.103 (adds post-merge, post-rewrite); v0.9.76 has neither. `GRAPHIFY_HOOKS` in `bin/cli.js` knows only 2, so `graphifyHooksProblems` would warn "unexpected new git hook" for the other two (inferred from the code, not run). `docs/tools.md` and ADR 0002 also say 2. The detection regex in `gitHooksPreflight` does not see the merge and rewrite blocks either.
- 0.9.103 hooks still start Python without `-I`/`-P`, so the ADR 0002 risk stands, and post-merge and post-rewrite add pull, merge and rebase as triggers.
- `openspec init --tools claude,codex` leaves out OpenCode.
- `graphify --version` on 0.9.103 warned about stale skills and did not rewrite them, which disagrees with `docs/tools.md`. Re-check on the chosen version.
- ADR 0001 passed over releases younger than 2 weeks. 0.9.103 reaches 14 days on 2026-11-19 and 1.16.0 on 2026-11-13.

## Proposed scope

1. Port graphify's rules into `tools/graphify.md` (1 to 3 rule lines), keeping canonkit's freshness rule: query before the first grep/read, repeat the rule in subagent prompts, `path`/`explain`, report only for broad review or when `graph.json` is absent, `graphify update .` after code changes. Review the `graphify-*` eval cases. Update the "read first" rationale in `docs/tools.md` and ADR 0003.
2. Keep refusing `codex install`.
3. Keep git hooks opt-in, but print the enabling command and its risk at the end of `tool add`. Hooks by default was weighed on 2026-11-06 and dropped: repository code would run before review on pull, checkout, merge and rebase in every project.
4. Teach `GRAPHIFY_HOOKS`, the detection regex, the touches line, the warnings, tests and docs about the 4 hooks.
5. Raise the pins with Gard's review (MEDIUM, per `docs/tools.md`), then re-check `openspec init` output on 1.16.0 and the versions and links in `docs/tools.md`.

## Open

- Pins: dropped by the user on 2026-11-06, so 0.9.76 and 1.14.0 stay and item 5 and Gard's review are out. Items 1 to 4 were not confirmed either way: ask before starting. With the pin on 2 hooks and newer installs writing 4, item 4 must accept 2 or 4.
- Whether to run the real eval (it spends API credit) and whether to add OpenCode to `openspec init`. Default: neither.
- `bin/cli.js` and `test/cli.test.js` already have staged changes, so keep this work unstaged and ask before any commit.

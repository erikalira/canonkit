# Handoff: `canonkit tool` (2026-10-19)

Implementation of docs/plans/complements.md is **done, uncommitted**. Reviews after
the last code edit: Quinn **approve**, Gard **approve with changes** (all landed).
`env -u NoDefaultCurrentDirectoryInExePath npm test`: 150 tests, 149 pass, 1 skipped
(symlink test — this machine cannot create file symlinks). `npm run validate` passes.

## What is in the working tree

- bin/exec.js (new) — the only spawn helper: safePathDirs (drops relative, missing,
  and in-project PATH entries by realpath), resolveBin, projectOnlyHit, commandFor
  (.cmd via ComSpec `/d /v:off /s /c`, verbatim), runBin (no shell, stdin closed,
  timeout, child PATH filtered + NoDefaultCurrentDirectoryInExePath=1 on win32),
  binVersion (runs from the binary's own dir).
- bin/cli.js — replaceProjectBlock/readProjectBlock (shared by the specialists and
  tools blocks), ctx.writeAtomic (temp + rename, through symlinks), registry parser,
  toolAdd/toolRemove/toolList, graphify preflight (hooks, core.hooksPath, shadowing
  graphify/ or graphify.py, tracked graphify-out/.graphify_python), hook post-check.
- tools/graphify.md (pin 0.9.76, env GRAPHIFY_NO_AUTO_REFRESH=1), tools/openspec.md
  (pin 1.14.0, env OPENSPEC_TELEMETRY=0 + DO_NOT_TRACK=1).
- test/exec.test.js (new), new describes at the end of test/cli.test.js.
- package.json files[] + scripts/validate.sh include tools/.
- docs/adr/0001-tool-namespace-integrate-only.md (new), README.md section
  "Ferramentas, por projeto".
- Pre-existing, not from this work: graphify-out/GRAPH_REPORT.md was already staged.

## Open before committing / publishing

1. Commit (only when the user asks). Branch first — the tree is on main.
2. Run the symlink test once on Linux/macOS (no CI): "an AGENTS.md that is a symlink
   is written through, not replaced".
3. ~~F3 follow-up~~ done: the stub logs cwd to argv.log.cwd; test "--version runs from
   the binary's own directory, the setup from the project" (fails if binVersion runs
   in the project). Quinn approved after the edit. 151 tests, 150 pass, 1 skipped.
4. Report upstream to graphify: hooks/merge driver should start Python with -I/-P or
   PYTHONSAFEPATH (accepted residual risk R1 in the ADR). User's call.
5. User decision pending: ~/.claude/skills/graphify/SKILL.md was rewritten to the
   0.9.76 skill during verification (installed graphify is 0.9.63). Options: run
   `graphify install --platform claude` with 0.9.63, or leave until upgrading.
6. Telemetry off for canonkit's openspec runs was implemented on Gard's
   recommendation; the user may revert it (one registry line).
7. Sigstore bundle of the graphifyy wheel not verified offline (ADR open item).
8. Minor, undocumented: when the project is the home folder or a parent of it, the
   PATH filter drops user-level tool dirs (fails closed: "not on PATH").

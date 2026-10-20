---
name: graphify
bin: graphify
pin: 0.9.76
requires: Python >= 3.10 and git
install:
  - python -I -m pip install --user --only-binary :all: graphifyy=={pin}
  - (the PyPI name has two y's — graphifyy; `graphify` with one y is a different package)
preflight: git-hooks
env:
  - GRAPHIFY_NO_AUTO_REFRESH=1
setup:
  - hook install
  - update .
touches:
  - .git/hooks/post-commit and .git/hooks/post-checkout (new files; existing hooks are never touched)
  - .git/config (merge.graphify driver) and .gitattributes
  - graphify-out/ (graph.json, GRAPH_REPORT.md)
notes:
  - the hooks and the merge driver import graphify from the repository root first; a committed graphify/ or graphify.py would run on commit, checkout and merge — do not enable this where you check out untrusted branches.
  - canonkit sets GRAPHIFY_NO_AUTO_REFRESH=1 for its own runs only; set it in your own environment too, or graphify (from agents, hooks, your shell) rewrites the user-level skills it installed after each upgrade.
undo:
  - graphify hook uninstall
---
Before structural report/query use, run `git status --porcelain --untracked-files=normal`; if dirty changes affect the question (or the graph is known stale for it), run `graphify update .` successfully first.
If the check/refresh fails, is unavailable or freshness remains unknown, explicitly warn that the graph may be stale and verify against current files; clean status alone does not prove freshness.
Read graphify-out/GRAPH_REPORT.md or use `graphify query "<question>"` before broad file scans; the graph is evidence, while module boundaries stay Archie's call.

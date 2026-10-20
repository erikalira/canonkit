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
Read graphify-out/GRAPH_REPORT.md before sweeping files to answer a structural question; `graphify query "<question>"` for the rest.
The git hooks rebuild it on commit and checkout; after edits not yet committed, run `graphify update .` before trusting it.
The graph is evidence, not a decision: module boundaries stay Archie's call.

## graphify

This project has a knowledge graph at graphify-out/ for structural exploration and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- Use Graphify when a question needs architecture, dependency paths or relationships across files. When graphify-out/graph.json exists, use `graphify query "<question>"`, `graphify path "<A>" "<B>"` or `graphify explain "<concept>"` to scope that exploration. Direct searches and file reads are appropriate for simple lookups and local edits; subagent briefs should carry only the context their task needs.
- Dirty graphify-out/ files are expected after hooks or incremental updates. Check freshness before relying on the graph as structural evidence.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

## CI test fixtures

Before treating a local test pass as merge readiness, check whether its fixtures depend on tools installed on `PATH` or on operating-system capabilities. Set those conditions explicitly in the test; keep a separate test for the real missing-tool behavior. The CI matrix runs Node 22 and 24 on Ubuntu, macOS, and Windows. A pass on one developer machine does not establish a pass across that matrix.

<!-- agent-team-config:complements:start -->
# Project tools

This project uses the optional tools below. Each is a third-party program the
project installed; canonkit wrote only this block.

- **graphify** — Before structural report/query use, run `git status --porcelain --untracked-files=normal`; if dirty changes affect the question (or the graph is known stale for it), run `graphify update .` successfully first.
  If the check/refresh fails, is unavailable or freshness remains unknown, explicitly warn that the graph may be stale and verify against current files; clean status alone does not prove freshness.
  Read graphify-out/GRAPH_REPORT.md or use `graphify query "<question>"` before broad file scans; the graph is evidence, while module boundaries stay Archie's call.
- **openspec** — OpenSpec holds durable change state (normally openspec/changes/ and openspec/specs/); CanonKit governs risk, owners and reviews; Graphify supplies code evidence.
  Keep scope, acceptance criteria, decisions and progress in the selected change's existing artifacts, not a parallel PRD, implementation plan or spec.
  Use the orchestrate skill's OpenSpec change lifecycle: LOW stays inline; MEDIUM/HIGH require acceptance, applicable reviews and Spencer's drift check before sync/archive.

Managed by canonkit: `npx canonkit tool add|remove <name>` changes this list.
<!-- agent-team-config:complements:end -->

# Graph Report - agent-team-config  (2026-10-17)

## Corpus Check
- 33 files · ~44,205 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 3)

## Summary
- 285 nodes · 518 edges · 25 communities (18 shown, 7 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 55 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `18438db1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- meu-time-hook.js
- package.json
- cli.js
- Subagents
- Pipe — DevOps / Platform / Operations Agent
- Echo — Audio / Sound Design Agent
- Pixie — UX / Design Agent
- Dana — Data / Analytics / Experimentation Agent
- Spencer — Documentation / Knowledge Steward Agent
- Perry — Performance / User-Perceived Speed Agent
- cli.test.js
- Smallest Sufficient Architecture
- validate.sh
- Scott — Product / Product Lead Agent
- Performance Budget
- Virgo — Agent Team Maintainer
- Orchestrate
- dashboard/package.json
- hooks/package.json
- canonkit
- add-specialist.sh
- install-reference.sh
- install.sh script
- routing-block.md

## God Nodes (most connected - your core abstractions)
1. `Pipe — DevOps / Platform / Operations Agent` - 22 edges
2. `Scott — Product / Product Lead Agent` - 21 edges
3. `Echo — Audio / Sound Design Agent` - 21 edges
4. `Pixie — UX / Design Agent` - 21 edges
5. `Dana — Data / Analytics / Experimentation Agent` - 21 edges
6. `Spencer — Documentation / Knowledge Steward Agent` - 21 edges
7. `Perry — Performance / User-Perceived Speed Agent` - 21 edges
8. `Quinn — Quality / QA / Test Strategy Agent` - 21 edges
9. `Bob — Engineering / Implementation Agent` - 20 edges
10. `Gard — Security Agent` - 20 edges

## Surprising Connections (you probably didn't know these)
- `Arquivos de referência globais` --references--> `install()`  [INFERRED]
  README.md → bin/cli.js
- `Comandos` --references--> `install()`  [INFERRED]
  README.md → bin/cli.js
- `Editing an agent` --references--> `install()`  [INFERRED]
  README.md → bin/cli.js
- `Hooks` --references--> `install()`  [INFERRED]
  README.md → bin/cli.js
- `Core, no usuário` --references--> `tier()`  [INFERRED]
  README.md → scripts/_check_routing.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Agents holding domain veto authority** — agents_archie_archie, agents_gard_gard, agents_scott_scott, agents_pixie_pixie, agents_quinn_quinn, agents_spencer_spencer, agents_dana_dana, agents_maya_maya, agents_nova_nova, agents_echo_echo [EXTRACTED 1.00]
- **Smallest-sufficient-solution doctrine across domains** — agents_archie_smallest_sufficient_architecture, agents_bob_smallest_correct_change, agents_scott_mvp, agents_gard_mitigation_priority, agents_dana_governing_principle, agents_spencer_minimum_structures [INFERRED 0.85]
- **Shared LOW/MEDIUM/HIGH risk triage protocol** — agents_archie_risk_classification, agents_bob_implementation_protocol, agents_gard_mitigation_priority, agents_quinn_test_strategy, agents_pipe_rollback_plan, agents_dana_experiment_protocol, agents_maya_core_loop, agents_nova_visual_language, agents_echo_mix_hierarchy, agents_pixie_interface_states [INFERRED 0.95]

## Communities (25 total, 7 thin omitted)

### Community 0 - "meu-time-hook.js"
Cohesion: 0.08
Nodes (35): dispatches(), fs, HTML, http, LOG, os, parse(), path (+27 more)

### Community 1 - "package.json"
Cohesion: 0.08
Nodes (25): author, bin, canonkit, bugs, url, description, engines, node (+17 more)

### Community 2 - "cli.js"
Cohesion: 0.10
Nodes (42): addSpecialists(), AGENTS_DIR, applyBlock(), applyBlockLf(), AUTHORITIES, CODEX_MODELS, codexAgent(), context() (+34 more)

### Community 3 - "Subagents"
Cohesion: 0.18
Nodes (10): Blocking authority, Boundaries that tend to get confused, Core team — installed at user level (`~/.agents`, `~/.claude/agents`), Domain specialists — installed per project (the repository's `.claude/agents/`), HIGH-risk surfaces and who owns them, New session when the subject changes, Orchestration rules, Parallel delegation (+2 more)

### Community 4 - "Pipe — DevOps / Platform / Operations Agent"
Cohesion: 0.14
Nodes (18): Bob — Engineering / Implementation Agent, Explicit Failure Path Handling, Handoff Handling, Implementation Protocol, Event Taxonomy, Gard — Security Agent, P0–P3 Mitigation Priority, Secret Exposure Checklist (+10 more)

### Community 5 - "Echo — Audio / Sound Design Agent"
Cohesion: 0.19
Nodes (14): Audibility Checklist, Echo — Audio / Sound Design Agent, Mix Drift, Non-Audio Equivalent, Sonic Identity, Verifiable Audio Principles, Aesthetics Is Not UX, Nova — Visual / Art Direction Agent (+6 more)

### Community 6 - "Pixie — UX / Design Agent"
Cohesion: 0.21
Nodes (14): Archie — Architecture / Technical Lead Agent, Architectural Veto, Connascence (Strength × Locality), LOW / MEDIUM / HIGH Risk Classification, Analytics Contract, AI Proposes; the Domain Decides, Confidence Calibration, Iris — Machine Learning / Computer Vision Agent (+6 more)

### Community 7 - "Dana — Data / Analytics / Experimentation Agent"
Cohesion: 0.21
Nodes (12): Dana — Data / Analytics / Experimentation Agent, Data Quality Checklist, Experiment Protocol, Do Not Collect an Event Without a Decision, Mix Hierarchy, Core Loop, Game Feel, Maya — Game Design / Game Feel Agent (+4 more)

### Community 8 - "Spencer — Documentation / Knowledge Steward Agent"
Cohesion: 0.47
Nodes (6): When the Veto Is Overruled, ADR (Architecture Decision Record), Documentation Drift, Minimum Document Structures, Spencer — Documentation / Knowledge Steward Agent, Traceability

### Community 9 - "Perry — Performance / User-Perceived Speed Agent"
Cohesion: 0.38
Nodes (7): Dominant Cost Attribution, Measurement Discipline, Perry — Performance / User-Perceived Speed Agent, Quinn — Quality / QA / Test Strategy Agent, Regression Risk, Test Quality (Determinism, Isolation, Honest Failure), Test Strategy Proportional to Risk

### Community 10 - "cli.test.js"
Cohesion: 0.10
Nodes (15): parseAgent(), ref_node_assert_strict, ref_node_child_process, ref_node_fs, ref_node_fs_promises, ref_node_os, ref_node_path, ref_node_test (+7 more)

### Community 11 - "Smallest Sufficient Architecture"
Cohesion: 0.33
Nodes (6): Smallest Sufficient Architecture, Smallest Correct Change, UI Block Separation Rule, Domain Shift, Scaling Shape of Cost, Smallest Sufficient MVP

### Community 12 - "validate.sh"
Cohesion: 0.29
Nodes (9): Fitness Function, Declared Property Verification, Composite Control Checklist, Agent Frontmatter (name, description, model), fail(), head_(), pass(), validate.sh script (+1 more)

### Community 13 - "Scott — Product / Product Lead Agent"
Cohesion: 0.33
Nodes (6): Metric Definition (Numerator, Denominator, Window, Exclusions), Testable Acceptance Criteria, Acceptance Criteria, Scope Control, Scott — Product / Product Lead Agent, Success Metric

### Community 14 - "Performance Budget"
Cohesion: 0.50
Nodes (4): Economy as a Play System, Stack Floor Measurement, Performance Budget, Reliability Target and Error Budget

### Community 15 - "Virgo — Agent Team Maintainer"
Cohesion: 0.67
Nodes (4): Core / Specialist Split, Default Worktree Scope, Installation Scripts, Virgo — Agent Team Maintainer

### Community 16 - "Orchestrate"
Cohesion: 0.50
Nodes (3): Integration Review, Naming the model and effort, Orchestrate

### Community 19 - "canonkit"
Cohesion: 0.09
Nodes (22): pathlib, re, Agents, Arquivos de referência globais, canonkit, Codex, Comandos, Conventions (+14 more)

## Knowledge Gaps
- **75 isolated node(s):** `PACKAGE_ROOT`, `AGENTS_DIR`, `REFERENCE_DIR`, `HOOKS_DIR`, `DASHBOARD_DIR` (+70 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 114 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `log()` connect `meu-time-hook.js` to `cli.test.js`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `install()` connect `cli.js` to `canonkit`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Scott — Product / Product Lead Agent` (e.g. with `LOW / MEDIUM / HIGH Risk Classification` and `When the Veto Is Overruled`) actually correct?**
  _`Scott — Product / Product Lead Agent` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Echo — Audio / Sound Design Agent` (e.g. with `LOW / MEDIUM / HIGH Risk Classification` and `When the Veto Is Overruled`) actually correct?**
  _`Echo — Audio / Sound Design Agent` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Pixie — UX / Design Agent` (e.g. with `LOW / MEDIUM / HIGH Risk Classification` and `When the Veto Is Overruled`) actually correct?**
  _`Pixie — UX / Design Agent` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Dana — Data / Analytics / Experimentation Agent` (e.g. with `LOW / MEDIUM / HIGH Risk Classification` and `When the Veto Is Overruled`) actually correct?**
  _`Dana — Data / Analytics / Experimentation Agent` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PACKAGE_ROOT`, `AGENTS_DIR`, `REFERENCE_DIR` to the rest of the system?**
  _75 weakly-connected nodes found - possible documentation gaps or missing edges._
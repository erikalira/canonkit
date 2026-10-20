# Graph Report - agent-team-config  (2026-10-19)

## Corpus Check
- 40 files · ~50,420 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 3)

## Summary
- 337 nodes · 632 edges · 27 communities (20 shown, 7 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 55 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `85065aef`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- meu-time-hook.js
- package.json
- cli.js
- Subagents
- Quinn — Quality / QA / Test Strategy Agent
- Echo — Audio / Sound Design Agent
- Pixie — UX / Design Agent
- Dana — Data / Analytics / Experimentation Agent
- Spencer — Documentation / Knowledge Steward Agent
- Pipe — DevOps / Platform / Operations Agent
- eval-routing.mjs
- Bob — Engineering / Implementation Agent
- validate.sh
- Scott — Product / Product Lead Agent
- Perry — Performance / User-Perceived Speed Agent
- Virgo — Agent Team Maintainer
- Orchestrate
- dashboard/package.json
- hooks/package.json
- canonkit
- add-specialist.sh
- install-reference.sh
- install.sh script
- routing-block.md
- Context tune
- Q: Como avaliar de 0 a 10 a qualidade e o ROI das instrucoes instaladas pelo canonkit?

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
- `Editing an agent` --references--> `install()`  [INFERRED]
  README.md → bin/cli.js
- `Arquivos de referência globais` --references--> `install()`  [INFERRED]
  README.md → bin/cli.js
- `Comandos` --references--> `install()`  [INFERRED]
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

## Communities (27 total, 7 thin omitted)

### Community 0 - "meu-time-hook.js"
Cohesion: 0.08
Nodes (38): dispatches(), fs, HTML, http, LOG, os, parse(), path (+30 more)

### Community 1 - "package.json"
Cohesion: 0.07
Nodes (27): author, bin, canonkit, bugs, url, description, engines, node (+19 more)

### Community 2 - "cli.js"
Cohesion: 0.08
Nodes (49): addSpecialists(), AGENTS_DIR, applyBlock(), applyBlockLf(), AUTHORITIES, CODEX_MODELS, codexAgent(), context() (+41 more)

### Community 3 - "Subagents"
Cohesion: 0.22
Nodes (8): Core team — installed at user level (`~/.agents`, `~/.claude/agents`), Domain specialists — installed per project (the repository's `.claude/agents/`), HIGH-risk surfaces and who owns them, New session when the subject changes, Orchestration rules, Parallel delegation, Proportionality, Subagents

### Community 4 - "Quinn — Quality / QA / Test Strategy Agent"
Cohesion: 0.18
Nodes (12): Implementation Protocol, Gard — Security Agent, P0–P3 Mitigation Priority, Secret Exposure Checklist, Dependency Supply Chain Review, Plausible Threat Actor, Incident Severity Classification, Edge-Case Checklist (+4 more)

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

### Community 9 - "Pipe — DevOps / Platform / Operations Agent"
Cohesion: 0.25
Nodes (8): Explicit Failure Path Handling, Event Taxonomy, Declared Dependency Failure Mode, Jobs and Queues Checklist, Reliability and Observability Standards, Pipe — DevOps / Platform / Operations Agent, Rollback Plan, Operational Runbook

### Community 10 - "eval-routing.mjs"
Cohesion: 0.07
Nodes (43): parseAgent(), ref_node_assert_strict, ref_node_child_process, ref_node_fs, ref_node_fs_promises, ref_node_os, ref_node_path, ref_node_test (+35 more)

### Community 11 - "Bob — Engineering / Implementation Agent"
Cohesion: 0.29
Nodes (8): Smallest Sufficient Architecture, Bob — Engineering / Implementation Agent, Handoff Handling, Smallest Correct Change, UI Block Separation Rule, Domain Shift, Scaling Shape of Cost, Smallest Sufficient MVP

### Community 12 - "validate.sh"
Cohesion: 0.29
Nodes (9): Fitness Function, Declared Property Verification, Composite Control Checklist, Agent Frontmatter (name, description, model), fail(), head_(), pass(), validate.sh script (+1 more)

### Community 13 - "Scott — Product / Product Lead Agent"
Cohesion: 0.33
Nodes (6): Metric Definition (Numerator, Denominator, Window, Exclusions), Testable Acceptance Criteria, Acceptance Criteria, Scope Control, Scott — Product / Product Lead Agent, Success Metric

### Community 14 - "Perry — Performance / User-Perceived Speed Agent"
Cohesion: 0.38
Nodes (7): Economy as a Play System, Dominant Cost Attribution, Stack Floor Measurement, Measurement Discipline, Performance Budget, Perry — Performance / User-Perceived Speed Agent, Reliability Target and Error Budget

### Community 15 - "Virgo — Agent Team Maintainer"
Cohesion: 0.67
Nodes (4): Core / Specialist Split, Default Worktree Scope, Installation Scripts, Virgo — Agent Team Maintainer

### Community 16 - "Orchestrate"
Cohesion: 0.40
Nodes (4): Integration Review, Naming the model and effort, Orchestrate, Parallel delegation

### Community 19 - "canonkit"
Cohesion: 0.10
Nodes (19): pathlib, re, Agents, canonkit, Conventions, Core, no usuário, Core Team, Custo sempre carregado (+11 more)

### Community 25 - "Context tune"
Cohesion: 0.29
Nodes (6): 1. Measure the baseline, 2. Separate signal from noise, 3. Silence it where the setting stays saved, in this order, 4. What not to do, 5. Measure again and report, Context tune

### Community 26 - "Q: Como avaliar de 0 a 10 a qualidade e o ROI das instrucoes instaladas pelo canonkit?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Como avaliar de 0 a 10 a qualidade e o ROI das instrucoes instaladas pelo canonkit?, Source Nodes

## Knowledge Gaps
- **95 isolated node(s):** `PACKAGE_ROOT`, `AGENTS_DIR`, `REFERENCE_DIR`, `HOOKS_DIR`, `DASHBOARD_DIR` (+90 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 137 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `log()` connect `meu-time-hook.js` to `eval-routing.mjs`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `install()` connect `cli.js` to `canonkit`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `canonkit` connect `canonkit` to `cli.js`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Scott — Product / Product Lead Agent` (e.g. with `LOW / MEDIUM / HIGH Risk Classification` and `When the Veto Is Overruled`) actually correct?**
  _`Scott — Product / Product Lead Agent` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Echo — Audio / Sound Design Agent` (e.g. with `LOW / MEDIUM / HIGH Risk Classification` and `When the Veto Is Overruled`) actually correct?**
  _`Echo — Audio / Sound Design Agent` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Pixie — UX / Design Agent` (e.g. with `LOW / MEDIUM / HIGH Risk Classification` and `When the Veto Is Overruled`) actually correct?**
  _`Pixie — UX / Design Agent` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Dana — Data / Analytics / Experimentation Agent` (e.g. with `LOW / MEDIUM / HIGH Risk Classification` and `When the Veto Is Overruled`) actually correct?**
  _`Dana — Data / Analytics / Experimentation Agent` has 2 INFERRED edges - model-reasoned connections that need verification._
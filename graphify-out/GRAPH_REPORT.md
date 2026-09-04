# Graph Report - agent-team-config  (2026-09-04)

## Corpus Check
- Corpus is ~38,083 words - fits in a single context window. You may not need a graph.

## Summary
- 253 nodes · 461 edges · 24 communities (19 shown, 4 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.86)
- Token cost: 257,811 input · 7,400 output

## Community Hubs (Navigation)
- Package and Install Surface
- npm Package Manifest
- Installer Implementation
- Specialists and Proportionality
- Implementation, Security and Ops
- Audio and Visual Craft
- Risk and Interface States
- Product Value and Measurement
- Architecture and Docs Authority
- Test Strategy and Acceptance
- Verifiable Properties and Validation
- Smallest Sufficient Solution
- validate.sh Reporting Helpers
- Game Feel and Sensory Language
- Budgets and Floors
- Team Maintenance and Split
- Contract Ownership
- Empirical Protocols
- Measurement Discipline
- Routing Block Checker
- add-specialist Wrapper
- install-reference Wrapper
- install.sh Wrapper

## God Nodes (most connected - your core abstractions)
1. `Pipe — DevOps / Platform / Operations Agent` - 22 edges
2. `Dana — Data / Analytics / Experimentation Agent` - 21 edges
3. `Echo — Audio / Sound Design Agent` - 21 edges
4. `Perry — Performance / User-Perceived Speed Agent` - 21 edges
5. `Pixie — UX / Design Agent` - 21 edges
6. `Quinn — Quality / QA / Test Strategy Agent` - 21 edges
7. `Scott — Product / Product Lead Agent` - 21 edges
8. `Spencer — Documentation / Knowledge Steward Agent` - 21 edges
9. `Archie — Architecture / Technical Lead Agent` - 20 edges
10. `Bob — Engineering / Implementation Agent` - 20 edges

## Surprising Connections (you probably didn't know these)
- `The agent file sets the model floor` --semantically_similar_to--> `Declared model is a floor, not a ceiling`  [INFERRED] [semantically similar]
  reference/routing-block.md → README.md
- `Boundaries that commonly confuse (README)` --semantically_similar_to--> `Boundaries that commonly confuse (agents-block)`  [INFERRED] [semantically similar]
  README.md → reference/agents-block.md
- `Core Team (user-level install)` --semantically_similar_to--> `Core team roster (agents-block)`  [INFERRED] [semantically similar]
  README.md → reference/agents-block.md
- `Domain Specialists (per-project install)` --semantically_similar_to--> `Domain specialists roster (agents-block)`  [INFERRED] [semantically similar]
  README.md → reference/agents-block.md
- `Convention: proportionality (LOW/MEDIUM/HIGH)` --semantically_similar_to--> `Proportionality (agents-block)`  [INFERRED] [semantically similar]
  README.md → reference/agents-block.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Agents holding domain veto authority** — agents_archie_archie, agents_gard_gard, agents_scott_scott, agents_pixie_pixie, agents_quinn_quinn, agents_spencer_spencer, agents_dana_dana, agents_maya_maya, agents_nova_nova, agents_echo_echo [EXTRACTED 1.00]
- **Shared LOW/MEDIUM/HIGH risk triage protocol** — agents_archie_risk_classification, agents_bob_implementation_protocol, agents_gard_mitigation_priority, agents_quinn_test_strategy, agents_pipe_rollback_plan, agents_dana_experiment_protocol, agents_maya_core_loop, agents_nova_visual_language, agents_echo_mix_hierarchy, agents_pixie_interface_states [INFERRED 0.95]
- **Smallest-sufficient-solution doctrine across domains** — agents_archie_smallest_sufficient_architecture, agents_bob_smallest_correct_change, agents_scott_mvp, agents_gard_mitigation_priority, agents_dana_governing_principle, agents_spencer_minimum_structures [INFERRED 0.85]
- **Agents that hold veto authority** — reference_routing_block_archie, reference_routing_block_gard, reference_routing_block_scott, reference_routing_block_pixie, reference_routing_block_quinn, reference_routing_block_spencer, reference_routing_block_maya, reference_routing_block_nova, reference_routing_block_echo, reference_routing_block_dana, readme_convention_veto_overruled [EXTRACTED 1.00]
- **canonkit install pipeline (agents, Codex, reference blocks)** — readme_install_command, readme_tier_frontmatter, readme_codex_export, readme_reference_command, readme_managed_markers, readme_validate_sh [EXTRACTED 1.00]
- **Specialist gating by installation, not discipline** — readme_domain_specialists, readme_absence_as_mechanism, readme_add_command, readme_three_destinations, readme_convention_specialists_on_demand, reference_agents_block_domain_specialists [EXTRACTED 1.00]

## Communities (24 total, 4 thin omitted)

### Community 0 - "Package and Install Surface"
Cohesion: 0.06
Nodes (52): Agent file format, Boundaries that commonly confuse (README), canonkit, canonkit 1.0 is not canonkit 0.x, Codex custom agent export, Codex model / reasoning-effort map, Convention: named escalation, Convention: explicit authority (+44 more)

### Community 1 - "npm Package Manifest"
Cohesion: 0.05
Nodes (37): author, bin, canonkit, bugs, url, description, engines, node (+29 more)

### Community 2 - "Installer Implementation"
Cohesion: 0.11
Nodes (30): addSpecialists(), AGENTS_DIR, applyBlock(), CODEX_MODELS, codexAgent(), context(), core(), esc() (+22 more)

### Community 3 - "Specialists and Proportionality"
Cohesion: 0.16
Nodes (16): Absence as the mechanism, canonkit add, Convention: no assumed context, Convention: proportionality (LOW/MEDIUM/HIGH), Convention: specialists on demand, Domain Specialists (per-project install), Integration Review (README), canonkit list (+8 more)

### Community 4 - "Implementation, Security and Ops"
Cohesion: 0.19
Nodes (14): Bob — Engineering / Implementation Agent, Explicit Failure Path Handling, Handoff Handling, Implementation Protocol, Gard — Security Agent, P0–P3 Mitigation Priority, Dependency Supply Chain Review, Plausible Threat Actor (+6 more)

### Community 5 - "Audio and Visual Craft"
Cohesion: 0.19
Nodes (14): Audibility Checklist, Echo — Audio / Sound Design Agent, Mix Drift, Non-Audio Equivalent, Sonic Identity, Verifiable Audio Principles, Aesthetics Is Not UX, Nova — Visual / Art Direction Agent (+6 more)

### Community 6 - "Risk and Interface States"
Cohesion: 0.31
Nodes (10): LOW / MEDIUM / HIGH Risk Classification, AI Proposes; the Domain Decides, Confidence Calibration, Iris — Machine Learning / Computer Vision Agent, Model and Dataset Versioning / Model Card, Perry — Performance / User-Perceived Speed Agent, Engineering Handoff, Required Interface States (+2 more)

### Community 7 - "Product Value and Measurement"
Cohesion: 0.24
Nodes (10): Dana — Data / Analytics / Experimentation Agent, Event Taxonomy, Do Not Collect an Event Without a Decision, Metric Definition (Numerator, Denominator, Window, Exclusions), Meaningful Choice, Reliability and Observability Standards, Scope Control, Scott — Product / Product Lead Agent (+2 more)

### Community 8 - "Architecture and Docs Authority"
Cohesion: 0.38
Nodes (7): Archie — Architecture / Technical Lead Agent, Connascence (Strength × Locality), When the Veto Is Overruled, Documentation Drift, Minimum Document Structures, Spencer — Documentation / Knowledge Steward Agent, Traceability

### Community 9 - "Test Strategy and Acceptance"
Cohesion: 0.29
Nodes (7): Secret Exposure Checklist, Edge-Case Checklist, Quinn — Quality / QA / Test Strategy Agent, Regression Risk, Test Strategy Proportional to Risk, Testable Acceptance Criteria, Acceptance Criteria

### Community 10 - "Verifiable Properties and Validation"
Cohesion: 0.33
Nodes (6): Fitness Function, Declared Property Verification, Composite Control Checklist, ADR (Architecture Decision Record), Agent Frontmatter (name, description, model), scripts/validate.sh

### Community 11 - "Smallest Sufficient Solution"
Cohesion: 0.33
Nodes (6): Smallest Sufficient Architecture, Smallest Correct Change, UI Block Separation Rule, Domain Shift, Scaling Shape of Cost, Smallest Sufficient MVP

### Community 12 - "validate.sh Reporting Helpers"
Cohesion: 0.60
Nodes (5): fail(), head_(), pass(), validate.sh script, warn()

### Community 13 - "Game Feel and Sensory Language"
Cohesion: 0.40
Nodes (5): Mix Hierarchy, Core Loop, Game Feel, Maya — Game Design / Game Feel Agent, Visual Language

### Community 14 - "Budgets and Floors"
Cohesion: 0.50
Nodes (4): Economy as a Play System, Stack Floor Measurement, Performance Budget, Reliability Target and Error Budget

### Community 15 - "Team Maintenance and Split"
Cohesion: 0.67
Nodes (4): Core / Specialist Split, Default Worktree Scope, Installation Scripts, Virgo — Agent Team Maintainer

### Community 16 - "Contract Ownership"
Cohesion: 0.67
Nodes (3): Architectural Veto, Analytics Contract, Model Output Contract

### Community 17 - "Empirical Protocols"
Cohesion: 0.67
Nodes (3): Data Quality Checklist, Experiment Protocol, Playtest Protocol

### Community 18 - "Measurement Discipline"
Cohesion: 0.67
Nodes (3): Dominant Cost Attribution, Measurement Discipline, Test Quality (Determinism, Isolation, Honest Failure)

## Ambiguous Edges - Review These
- `Convention: named escalation` → `Parallel delegation of subagents`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to

## Knowledge Gaps
- **53 isolated node(s):** `PACKAGE_ROOT`, `AGENTS_DIR`, `REFERENCE_DIR`, `ROSTER`, `ROUTING` (+48 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 84 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Convention: named escalation` and `Parallel delegation of subagents`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Meu Time routing table` connect `Package and Install Surface` to `Specialists and Proportionality`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `Pipe — DevOps / Platform / Operations Agent` connect `Implementation, Security and Ops` to `Audio and Visual Craft`, `Risk and Interface States`, `Product Value and Measurement`, `Architecture and Docs Authority`, `Test Strategy and Acceptance`, `Game Feel and Sensory Language`, `Budgets and Floors`, `Team Maintenance and Split`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Dana — Data / Analytics / Experimentation Agent` (e.g. with `LOW / MEDIUM / HIGH Risk Classification` and `When the Veto Is Overruled`) actually correct?**
  _`Dana — Data / Analytics / Experimentation Agent` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Echo — Audio / Sound Design Agent` (e.g. with `LOW / MEDIUM / HIGH Risk Classification` and `When the Veto Is Overruled`) actually correct?**
  _`Echo — Audio / Sound Design Agent` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Pixie — UX / Design Agent` (e.g. with `LOW / MEDIUM / HIGH Risk Classification` and `When the Veto Is Overruled`) actually correct?**
  _`Pixie — UX / Design Agent` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PACKAGE_ROOT`, `AGENTS_DIR`, `REFERENCE_DIR` to the rest of the system?**
  _53 weakly-connected nodes found - possible documentation gaps or missing edges._
# Graph Report - .  (2026-08-20)

## Corpus Check
- Corpus is ~10,804 words - fits in a single context window. You may not need a graph.

## Summary
- 18 nodes · 23 edges · 7 communities (3 shown, 4 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.95)
- Token cost: 18,028 input · 0 output

## Community Hubs (Navigation)
- Architecture and Quality
- Security and Maintenance
- Product and Source of Truth
- ML Decision Boundary
- Installation Script
- Authority and Escalation
- Context Independence

## God Nodes (most connected - your core abstractions)
1. `Agent Team Config` - 11 edges
2. `Archie — Architecture` - 4 edges
3. `Pipe — Operations` - 4 edges
4. `Bob — Engineering` - 3 edges
5. `Gard — Security` - 3 edges
6. `Quinn — Quality` - 3 edges
7. `Spencer — Documentation` - 3 edges
8. `Proportional LOW MEDIUM HIGH Risk` - 3 edges
9. `Iris — ML and Computer Vision` - 2 edges
10. `Pixie — UX` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Agent Team Config` --references--> `Iris — ML and Computer Vision`  [EXTRACTED]
  README.md → agents/iris.md
- `Agent Team Config` --references--> `Virgo — Team Maintainer`  [EXTRACTED]
  README.md → agents/virgo.md
- `Pipe — Operations` --implements--> `Proportional LOW MEDIUM HIGH Risk`  [INFERRED]
  agents/pipe.md → README.md
- `Agent Team Config` --references--> `Archie — Architecture`  [EXTRACTED]
  README.md → agents/archie.md
- `Agent Team Config` --references--> `Bob — Engineering`  [EXTRACTED]
  README.md → agents/bob.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Shared Proportional Risk Classification** — agents_archie_architecture_agent, agents_bob_engineering_agent, agents_gard_security_agent, agents_iris_ml_vision_agent, agents_pipe_operations_agent, agents_pixie_ux_agent, agents_quinn_quality_agent, agents_scott_product_agent, agents_spencer_documentation_agent [EXTRACTED 1.00]
- **Cross-Functional Agent Handoffs** — agents_archie_architecture_agent, agents_bob_engineering_agent, agents_gard_security_agent, agents_iris_ml_vision_agent, agents_pipe_operations_agent, agents_pixie_ux_agent, agents_quinn_quality_agent, agents_scott_product_agent, agents_spencer_documentation_agent, agents_virgo_maintainer_agent [INFERRED 0.95]

## Communities (7 total, 4 thin omitted)

### Community 0 - "Architecture and Quality"
Cohesion: 0.67
Nodes (4): Archie — Architecture, Bob — Engineering, Quinn — Quality, Proportional LOW MEDIUM HIGH Risk

### Community 1 - "Security and Maintenance"
Cohesion: 0.50
Nodes (4): Gard — Security, Pipe — Operations, Spencer — Documentation, Virgo — Team Maintainer

### Community 2 - "Product and Source of Truth"
Cohesion: 0.67
Nodes (4): Pixie — UX, Scott — Product, Agent Team Config, Repository as Source of Truth

## Knowledge Gaps
- **2 isolated node(s):** `install.sh script`, `Explicit Authority and Escalation`
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Agent Team Config` connect `Product and Source of Truth` to `Architecture and Quality`, `Security and Maintenance`, `ML Decision Boundary`?**
  _High betweenness centrality (0.444) - this node is a cross-community bridge._
- **Why does `Iris — ML and Computer Vision` connect `ML Decision Boundary` to `Product and Source of Truth`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `Pipe — Operations` connect `Security and Maintenance` to `Architecture and Quality`, `Product and Source of Truth`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `install.sh script`, `Repository as Source of Truth`, `Explicit Authority and Escalation` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
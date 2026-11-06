# Graph Report - agent-team-config  (2026-11-06)

## Corpus Check
- 145 files · ~258,707 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 6)

## Summary
- 1314 nodes · 2345 edges · 100 communities (87 shown, 13 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 189 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e701a509`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- serve.js
- package.json
- cli.js
- Subagents
- with
- Pipe — DevOps / Platform / Operations Agent
- dashboard.test.js
- canonkit-hook.js
- canonkit-codex.js
- InstallManifest
- eval-routing.mjs
- publish
- install
- toolAdd
- stack-packs.js
- Design
- Orchestrate
- dashboard/package.json
- hooks/package.json
- Maintaining canonkit
- add-specialist.sh
- install-reference.sh
- install.sh script
- cli.test.js
- routing-block.md
- Context tune
- Q: Como avaliar de 0 a 10 a qualidade e o ROI das instrucoes instaladas pelo canonkit?
- hook-core.test.js
- hook-opencode.test.js
- canonkit-hook.test.js
- isObject
- main
- P0 — fechar os maiores gaps de evidência
- ADDED Requirements
- doctor
- hook-codex.test.js
- check-enforced.mjs
- decide
- replaceProjectBlock
- updates
- slash
- ADR 0005 — Contexto inflado se resolve com handoff manual
- main
- canonkit
- .agents/skills/openspec-explore/SKILL.md
- CANONKIT_ROADMAP.md
- .claude/skills/openspec-explore/SKILL.md
- Evals
- Hooks and gates
- ADDED Requirements
- Fase 4 — OpenSpec como artefato durável do change lifecycle
- explore.md
- configFor
- ADR 0001 — `canonkit tool`: um namespace próprio, que só integra
- Dispatch metrics, context contributors and the dashboard
- opencodeDir
- Jobs, in order
- loadConfig
- ADDED Requirements
- stack-packs.test.js
- Learning loop
- The team
- highRisk
- graphifyHooksProblems
- Ordem sugerida
- Fase 5 — Freshness explícita do Graphify
- Per-project configuration: `.claude/canonkit.json`
- For users
- num
- scripts
- Go
- Java
- Kotlin
- Swift
- Fase 8 — Gate quantitativo para Caveman / Shunt
- Learning from mistakes
- C++
- C# / .NET
- Python
- React
- Rust
- TypeScript
- Fase 7 — Testar a “solution ladder” antes de adicioná-la ao Bob
- Releasing canonkit
- Q: quais desses ajustes ainda fazem sentido?
- Q: agora falta o passo 9 do handoff!
- ref_node_module
- chooseTargets
- Keeping findings outside the current task
- Handoff: empty the Claude memory without losing anything
- Codex
- 2.3.0.md
- canonkit 2.4.0
- repository
- AGENTS.md
- OpenCode

## God Nodes (most connected - your core abstractions)
1. `doctor()` - 57 edges
2. `install()` - 44 edges
3. `decide()` - 31 edges
4. `context()` - 23 edges
5. `InstallManifest` - 22 edges
6. `Pipe — DevOps / Platform / Operations Agent` - 22 edges
7. `Scott — Product / Product Lead Agent` - 21 edges
8. `Perry — Performance / User-Perceived Speed Agent` - 21 edges
9. `Quinn — Quality / QA / Test Strategy Agent` - 21 edges
10. `Echo — Audio / Sound Design Agent` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Publisher e pin — o que foi verificado (2026-10-19)` --references--> `install()`  [INFERRED]
  docs/adr/0001-tool-namespace-integrate-only.md → bin/cli.js
- `Wiring` --references--> `install()`  [INFERRED]
  docs/hooks.md → bin/cli.js
- `Editing an agent` --references--> `install()`  [INFERRED]
  docs/maintaining.md → bin/cli.js
- `A — Hook: rename + calibration (HIGH: the enforcement surface itself)` --references--> `install()`  [INFERRED]
  docs/plans/enforcement-onboarding-handoff.md → bin/cli.js
- `Problems found` --references--> `install()`  [INFERRED]
  docs/plans/enforcement-onboarding-handoff.md → bin/cli.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Agents holding domain veto authority** — agents_archie_archie, agents_gard_gard, agents_scott_scott, agents_pixie_pixie, agents_quinn_quinn, agents_spencer_spencer, agents_dana_dana, agents_maya_maya, agents_nova_nova, agents_echo_echo [EXTRACTED 1.00]
- **Smallest-sufficient-solution doctrine across domains** — agents_archie_smallest_sufficient_architecture, agents_bob_smallest_correct_change, agents_scott_mvp, agents_gard_mitigation_priority, agents_dana_governing_principle, agents_spencer_minimum_structures [INFERRED 0.85]
- **Shared LOW/MEDIUM/HIGH risk triage protocol** — agents_archie_risk_classification, agents_bob_implementation_protocol, agents_gard_mitigation_priority, agents_quinn_test_strategy, agents_pipe_rollback_plan, agents_dana_experiment_protocol, agents_maya_core_loop, agents_nova_visual_language, agents_echo_mix_hierarchy, agents_pixie_interface_states [INFERRED 0.95]

## Communities (100 total, 13 thin omitted)

### Community 0 - "serve.js"
Cohesion: 0.12
Nodes (25): addTo(), agentStatus(), contextContributors(), dispatches(), fs, HTML, http, json() (+17 more)

### Community 1 - "package.json"
Cohesion: 0.10
Nodes (20): author, bin, canonkit, bugs, url, description, devDependencies, @types/prompts@^2.4.9 (+12 more)

### Community 2 - "cli.js"
Cohesion: 0.06
Nodes (43): activeTools(), AGENTS_DIR, AUTHORITIES, CLAUDE_MD, CODEX, CODEX_MODELS, copyKeepingLocal(), DASHBOARD_DIR (+35 more)

### Community 3 - "Subagents"
Cohesion: 0.15
Nodes (12): Branches, Core team — installed at user level (`~/.claude/agents`), Domain specialists — installed per project (the repository's `.claude/agents/`), Durable preferences, HIGH-risk surfaces and who owns them, Incidental findings, New session when the subject changes, Orchestration rules (+4 more)

### Community 4 - "with"
Cohesion: 0.05
Nodes (40): concurrency, cancel-in-progress, group, run, SHA256, VERSION, jobs, secrets (+32 more)

### Community 5 - "Pipe — DevOps / Platform / Operations Agent"
Cohesion: 0.05
Nodes (20): Archie — Architecture / Technical Lead Agent, Bob — Engineering / Implementation Agent, Dana — Data / Analytics / Experimentation Agent, Echo — Audio / Sound Design Agent, Gard — Security Agent, Iris — Machine Learning / Computer Vision Agent, Maya — Game Design / Game Feel Agent, Nova — Visual / Art Direction Agent (+12 more)

### Community 6 - "dashboard.test.js"
Cohesion: 0.07
Nodes (11): REPO, SCRIPT, repo, { contextContributors, retainedTotals }, HOOK, SERVER, CLI, manifest() (+3 more)

### Community 7 - "canonkit-hook.js"
Cohesion: 0.07
Nodes (32): ASK_ONCE_RULES, CATCH_ALL_SAMPLES, CLAUDE_GATE_MODES, CMD_PREFIX, CMD_PREFIX_VALUE, CONFIG_KEYS, DEFAULT_BANDS, EDIT_SUCCESS (+24 more)

### Community 8 - "canonkit-codex.js"
Cohesion: 0.11
Nodes (26): CODEX_GATE_MODES, codexEnv(), codexOutput(), core(), fs, isObj(), main(), normalizeCodex() (+18 more)

### Community 9 - "InstallManifest"
Cohesion: 0.26
Nodes (10): absent(), atomic(), digest(), exclusivePrivate(), InstallManifest, read(), regularPath(), removeManagedBlock() (+2 more)

### Community 10 - "eval-routing.mjs"
Cohesion: 0.13
Nodes (33): parseAgent(), readStackPack(), STACK_PACK_IDS, validateStackPacks(), agentDefinition(), CASES, EXPECT_KEYS, judgeReport() (+25 more)

### Community 11 - "publish"
Cohesion: 0.07
Nodes (27): concurrency, cancel-in-progress, group, jobs, publish, test, name, on (+19 more)

### Community 12 - "install"
Cohesion: 0.13
Nodes (26): addSpecialists(), changeProject(), codexAgent(), codexModelOverride(), core(), install(), installCodex(), installOpencode() (+18 more)

### Community 13 - "toolAdd"
Cohesion: 0.18
Nodes (23): confirm(), gitHooksPreflight(), loud(), printMissing(), refuseOpencodeBelow2(), toolAdd(), toolEnv(), toolList() (+15 more)

### Community 14 - "stack-packs.js"
Cohesion: 0.19
Nodes (11): absent(), bytes(), catalog(), digest(), exists(), object(), PACKAGE_ROOT, safePath() (+3 more)

### Community 15 - "Design"
Cohesion: 0.08
Nodes (22): Context, Context-cost baseline, Coverage inventory, Decisions, Design, Goals / Non-Goals, Migration Plan, Risks / Trade-offs (+14 more)

### Community 16 - "Orchestrate"
Cohesion: 0.06
Nodes (30): ADR 0002 — Hooks Git do Graphify por opt-in, Compatibilidade e migração, Decisão, Evidência upstream, Validação e limites, ADR 0003 — `tool add` escreve um bloco no `.gitignore`, Alternativas consideradas, Consequências aceitas (+22 more)

### Community 19 - "Maintaining canonkit"
Cohesion: 0.20
Nodes (8): Do not version, Editing an agent, File format, Maintaining canonkit, Stack packs, Validation, agent_text(), tier()

### Community 23 - "cli.test.js"
Cohesion: 0.12
Nodes (18): backups(), claudeDir(), CLI, CORE, FORWARDER(), isolatedEnv(), OC_ASKS, read() (+10 more)

### Community 25 - "Context tune"
Cohesion: 0.29
Nodes (6): 1. Measure the baseline, 2. Separate signal from noise, 3. Silence it where the setting stays saved, in this order, 4. What not to do, 5. Measure again and report, Context tune

### Community 26 - "Q: Como avaliar de 0 a 10 a qualidade e o ROI das instrucoes instaladas pelo canonkit?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Como avaliar de 0 a 10 a qualidade e o ROI das instrucoes instaladas pelo canonkit?, Source Nodes

### Community 27 - "hook-core.test.js"
Cohesion: 0.08
Nodes (15): ADAPTER_KINDS, ADAPTERS, ENV_KEYS, { evaluate, GATE_KINDS, RECORD_KINDS }, FS_CALLBACK_WRITES, FS_PROMISE_WRITES, FS_WRITES, fx (+7 more)

### Community 28 - "hook-opencode.test.js"
Cohesion: 0.11
Nodes (15): OPENCODE_PLUGIN, adapter, call(), coreModule, denied(), fixture(), FIXTURES, FIXTURES_DIR (+7 more)

### Community 29 - "canonkit-hook.test.js"
Cohesion: 0.14
Nodes (14): OpenCode, canonkit — OpenCode specifics, activity(), decide(), edit(), HOOK, hookEnv(), inProject() (+6 more)

### Community 30 - "isObject"
Cohesion: 0.21
Nodes (17): asksNotInEffect(), decidesShell(), deniesShell(), isDeny(), isObject(), isOurHook(), mentionsHook(), readHooksFileForWiring() (+9 more)

### Community 31 - "main"
Cohesion: 0.18
Nodes (17): codexHome(), codexHooksPath(), configuration(), equalJson(), filesUnder(), globalManifest(), installCatalog(), installSkills() (+9 more)

### Community 32 - "P0 — fechar os maiores gaps de evidência"
Cohesion: 0.12
Nodes (17): Casos iniciais, Critério de aceite, Critério de aceite, Critério de aceite, Dashboard, Depois, Fase 1 — Telemetria de contexto do main thread, Fase 2 — Fazer o routing eval validar `model` e `effort` (+9 more)

### Community 33 - "ADDED Requirements"
Cohesion: 0.12
Nodes (16): ADDED Requirements, Purpose, Requirement: Evidence-qualified completion, Requirement: Honest offline evidence, Requirement: Hypothesis-driven debugging, Requirement: Selective regression-first testing, Requirement: Two aspects within existing review, Scenario: Code changed after a passing test (+8 more)

### Community 34 - "doctor"
Cohesion: 0.33
Nodes (4): context(), doctor(), root(), line()

### Community 35 - "hook-codex.test.js"
Cohesion: 0.14
Nodes (10): bash(), codexInput(), { evaluate, GATE_KINDS }, FIXTURES, FIXTURES_DIR, HOOKS_DIR, { normalizeCodex, parsePatch, codexOutput, CODEX_GATE_MODES }, patch() (+2 more)

### Community 36 - "check-enforced.mjs"
Cohesion: 0.13
Nodes (10): HOOK_FILES, adapters, BLOCKS, { GATE_KINDS, RECORD_KINDS }, known, listed, out, REPO (+2 more)

### Community 37 - "decide"
Cohesion: 0.15
Nodes (15): askFor(), cap(), decide(), denyFor(), editPath(), fileKey(), gitBypass(), includedPathReason() (+7 more)

### Community 38 - "replaceProjectBlock"
Cohesion: 0.23
Nodes (14): applyBlock(), applyBlockLf(), esc(), gitignoreMarkers(), gitignorePlan(), gitignoreRoot(), outsideBlock(), readProjectBlock() (+6 more)

### Community 39 - "updates"
Cohesion: 0.14
Nodes (13): patterns, prefix, default-days, actions, interval, updates, commit-message, cooldown (+5 more)

### Community 40 - "slash"
Cohesion: 0.26
Nodes (13): codexCommand(), codexHooksDir(), installCodexHooks(), isOurCodexHook(), legacyRunners(), pathKey(), readCodexHooksForWiring(), refuseUnquotableCodexPath() (+5 more)

### Community 41 - "ADR 0005 — Contexto inflado se resolve com handoff manual"
Cohesion: 0.15
Nodes (11): ADR 0004 — Só harnesses que rodam o time em qualidade plena, Alternativas consideradas, Consequências aceitas, Contexto, Decisão, ADR 0005 — Contexto inflado se resolve com handoff manual, Alternativas consideradas, Consequências aceitas (+3 more)

### Community 42 - "main"
Cohesion: 0.19
Nodes (13): The core: `evaluate(evt, env)`, canonkit 2.1.0, For users, Internal, Next, allow(), claudeEnv(), claudeOutput() (+5 more)

### Community 43 - "canonkit"
Cohesion: 0.15
Nodes (13): canonkit, Commands, Documentation, FAQ, How it decides: LOW vs HIGH, If no gate ever fires, License, Quickstart (+5 more)

### Community 44 - ".agents/skills/openspec-explore/SKILL.md"
Cohesion: 0.17
Nodes (11): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, Planning a Change, The Stance, What You Don't Have To Do (+3 more)

### Community 45 - "CANONKIT_ROADMAP.md"
Cohesion: 0.17
Nodes (11): 1. Princípios do roadmap, CanonKit — Roadmap de Evolução, Definition of Done do roadmap, Fase 10 — período de freeze, Fase 9 — Dashboard de eficiência por agente e por tipo de trabalho, Não objetivos, Ordem recomendada de implementação, P4 — maturação (+3 more)

### Community 46 - ".claude/skills/openspec-explore/SKILL.md"
Cohesion: 0.17
Nodes (11): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, Planning a Change, The Stance, What You Don't Have To Do (+3 more)

### Community 48 - "Evals"
Cohesion: 0.17
Nodes (12): Always-loaded cost, Case format, Engineering protocol fixtures, Evals, Learning-loop cases, Quality eval, Results: 2.2.0 pre-publish, partial (2026-11-02), Results: lean bodies (2026-10-18) (+4 more)

### Community 49 - "Hooks and gates"
Cohesion: 0.17
Nodes (12): Ask once per file per session, Codex, Codex and OpenCode, Events it must be registered for, Hooks and gates, It fails open, Known gaps, Shell write targets (+4 more)

### Community 50 - "ADDED Requirements"
Cohesion: 0.17
Nodes (11): ADDED Requirements, Purpose, Requirement: Compact resumable handoff, Requirement: Safe finalization, Requirement: Task-scoped delegation, Scenario: Implementation is ready for review, Scenario: Incomplete handoff, Scenario: Independent narrow task (+3 more)

### Community 51 - "Fase 4 — OpenSpec como artefato durável do change lifecycle"
Cohesion: 0.18
Nodes (11): Caminho sugerido, Critério de aceite, Critério de aceite, Fase 4 — OpenSpec como artefato durável do change lifecycle, Fase 6 — Reavaliar o trust boundary dos hooks do Graphify, Fluxo desejado, Implementação provável, Objetivo (+3 more)

### Community 52 - "explore.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, Planning a Change, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 53 - "configFor"
Cohesion: 0.33
Nodes (11): configFor(), danglingLink(), inScratchpad(), isWithin(), locateConfig(), normalizePath(), onProject(), projectConfig() (+3 more)

### Community 54 - "ADR 0001 — `canonkit tool`: um namespace próprio, que só integra"
Cohesion: 0.20
Nodes (10): ADR 0001 — `canonkit tool`: um namespace próprio, que só integra, Alternativas consideradas, Consequências aceitas, Contexto, Decisão, Publisher e pin — o que foi verificado (2026-10-19), Revisar quando, Stable fields (+2 more)

### Community 55 - "Dispatch metrics, context contributors and the dashboard"
Cohesion: 0.20
Nodes (10): Collecting on an existing installation, Context contributors, Dashboard, Dispatch metrics, Dispatch metrics, context contributors and the dashboard, Engineering baseline coverage, In the dashboard, One dispatch can have more than one `agent_end` (+2 more)

### Community 56 - "opencodeDir"
Cohesion: 0.36
Nodes (9): asksByHand(), installOpencodeHooks(), opencodeAgentsDir(), opencodeConfigPath(), opencodeDir(), opencodeHooksDir(), opencodePluginPath(), readOpencodeConfigForWiring() (+1 more)

### Community 57 - "Jobs, in order"
Cohesion: 0.22
Nodes (8): A — Hook: rename + calibration (HIGH: the enforcement surface itself), B — `canonkit doctor` + `install --wire-hooks` (HIGH: writes user settings), Before closing everything, C — README rewrite (MEDIUM, docs), D — Specialist eval cases (MEDIUM, quality), Handoff: enforcement + onboarding fixes (2026-10-21), Jobs, in order, Problems found

### Community 58 - "loadConfig"
Cohesion: 0.25
Nodes (9): editSucceeded(), globList(), globMatcher(), isCatchAll(), isObj(), loadConfig(), matchSegment(), matchSegments() (+1 more)

### Community 59 - "ADDED Requirements"
Cohesion: 0.22
Nodes (8): ADDED Requirements, Purpose, Requirement: Existing requirements stay authoritative, Requirement: Proportional product clarification, Scenario: Clear small request, Scenario: Project uses OpenSpec, Scenario: Vague product outcome, Spec Delta

### Community 60 - "stack-packs.test.js"
Cohesion: 0.22
Nodes (4): CLI, REPO, setup(), snapshot()

### Community 61 - "Learning loop"
Cohesion: 0.22
Nodes (7): Learning proposal, Evaluate and decide, General contributions, Investigate, Learning loop, Privacy, Review and expiry

### Community 62 - "The team"
Cohesion: 0.25
Nodes (8): Boundaries that tend to confuse, Conventions, Core team, Domain specialists, Engineering delivery, Integration Review, Learning loop, The team

### Community 63 - "highRisk"
Cohesion: 0.32
Nodes (8): highRisk(), isAbsolutePath(), isNoise(), isPerfBudget(), isTestFile(), namesAuth(), projectAdds(), projectPath()

### Community 64 - "graphifyHooksProblems"
Cohesion: 0.29
Nodes (6): graphifyHooksProblems(), hookSnapshot(), Findings, Handoff: tool pins and the graphify block, Open, Proposed scope

### Community 65 - "Ordem sugerida"
Cohesion: 0.29
Nodes (7): Bob, Ordem sugerida, Perry, Pipe, Scott, Spencer, Virgo

### Community 66 - "Fase 5 — Freshness explícita do Graphify"
Cohesion: 0.29
Nodes (7): Critério de aceite, Fase 5 — Freshness explícita do Graphify, Objetivo, Opção A — instrução + check leve, Opção B — status no CanonKit, Opções, da menor para a maior, Problema

### Community 67 - "Per-project configuration: `.claude/canonkit.json`"
Cohesion: 0.29
Nodes (7): Glob dialect: gitignore-like, not gitignore, Optional editor schema, Per-project configuration: `.claude/canonkit.json`, `perfBudgets`, Protecting lint and test configuration, What `exclude` cannot reach, Where it is read

### Community 68 - "For users"
Cohesion: 0.29
Nodes (7): canonkit 2.2.0, Changes, For users, Internal, Known gaps, Next, Rollback

### Community 69 - "num"
Cohesion: 0.38
Nodes (7): contextBands(), contextReminder(), currentContextTokens(), num(), scanTranscript(), transcriptUsage(), usageTotals()

### Community 70 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, eval, eval:quality, pack:dry, prepublishOnly, test, validate

### Community 71 - "Go"
Cohesion: 0.29
Nodes (6): Establish the project, Go, Implementation and diagnosis, Security when relevant, Team boundary, Verify the changed boundary

### Community 72 - "Java"
Cohesion: 0.29
Nodes (6): Establish the project, Implementation and diagnosis, Java, Team boundary, Verify the changed boundary, get()

### Community 73 - "Kotlin"
Cohesion: 0.29
Nodes (6): Establish the project, Framework boundaries when present, Implementation and diagnosis, Kotlin, Team boundary, Verify the changed boundary

### Community 74 - "Swift"
Cohesion: 0.29
Nodes (6): Establish the project, Implementation and diagnosis, Security when relevant, Swift, Team boundary, Verify the changed boundary

### Community 75 - "Fase 8 — Gate quantitativo para Caveman / Shunt"
Cohesion: 0.33
Nodes (6): Fase 8 — Gate quantitativo para Caveman / Shunt, P3 — decidir se ferramentas externas ainda são necessárias, Ponytail, Se o principal custo for `Bash`, logs, JSON e test output, Se o principal custo for `Read`, Se o problema for sessão longa

### Community 76 - "Learning from mistakes"
Cohesion: 0.33
Nodes (6): Contributing a general improvement, Evidence, privacy and authorization, Learning from mistakes, Review and expiry, Source changes and installation, What you receive

### Community 77 - "C++"
Cohesion: 0.33
Nodes (5): C++, Establish the project, Implementation and diagnosis, Team boundary, Verify the changed boundary

### Community 78 - "C# / .NET"
Cohesion: 0.33
Nodes (5): C# / .NET, Establish the project, Implementation and diagnosis, Team boundary, Verify the changed boundary

### Community 79 - "Python"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, Python, Team boundary, Verify the changed boundary

### Community 80 - "React"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, React, Team boundary, Verify the changed boundary

### Community 81 - "Rust"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, Rust, Team boundary, Verify the changed boundary

### Community 82 - "TypeScript"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, Team boundary, TypeScript, Verify the changed boundary

### Community 83 - "Fase 7 — Testar a “solution ladder” antes de adicioná-la ao Bob"
Cohesion: 0.40
Nodes (5): Critério de aceite, Fase 7 — Testar a “solution ladder” antes de adicioná-la ao Bob, Importante, P2 — melhorias condicionais, Resultado medido

### Community 84 - "Releasing canonkit"
Cohesion: 0.40
Nodes (4): One-time setup (account owner), Release, Releasing canonkit, When it fails

### Community 85 - "Q: quais desses ajustes ainda fazem sentido?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: quais desses ajustes ainda fazem sentido?, Source Nodes

### Community 86 - "Q: agora falta o passo 9 do handoff!"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: agora falta o passo 9 do handoff!, Source Nodes

### Community 87 - "ref_node_module"
Cohesion: 0.60
Nodes (3): require, setup(), warn()

### Community 88 - "chooseTargets"
Cohesion: 0.50
Nodes (4): chooseTargets(), dependencies, prompts@2.4.2, prompts

### Community 89 - "Keeping findings outside the current task"
Cohesion: 0.50
Nodes (4): Availability and evidence limits, Example: two findings during an unrelated plan, Keeping findings outside the current task, Review and publication

### Community 90 - "Handoff: empty the Claude memory without losing anything"
Cohesion: 0.50
Nodes (3): Done, uncommitted, unstaged, Handoff: empty the Claude memory without losing anything, Open

### Community 91 - "Codex"
Cohesion: 0.67
Nodes (3): Codex, Codex hook (`--wire-hooks`), Follow the session model

### Community 93 - "canonkit 2.4.0"
Cohesion: 0.67
Nodes (3): canonkit 2.4.0, For users, Verification and limits

### Community 94 - "repository"
Cohesion: 0.67
Nodes (3): repository, type, url

## Knowledge Gaps
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Known dead ends** — questions that led nowhere; don't re-derive.
- "quais desses ajustes ainda fazem sentido?" -> `scanTranscript()`, `transcriptUsage()`
- "agora falta o passo 9 do handoff!" -> `Hooks`, `HOOK`

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `install()` connect `install` to `cli.js`, `slash`, `main`, `canonkit`, `toolAdd`, `Hooks and gates`, `Maintaining canonkit`, `cli.test.js`, `ADR 0001 — `canonkit tool`: um namespace próprio, que só integra`, `Dispatch metrics, context contributors and the dashboard`, `opencodeDir`, `Jobs, in order`, `Codex`, `2.3.0.md`, `canonkit 2.4.0`, `isObject`, `main`?**
  _High betweenness centrality (0.195) - this node is a cross-community bridge._
- **Are the 33 inferred relationships involving `doctor()` (e.g. with `.agents/skills/openspec-apply-change/SKILL.md` and `.agents/skills/openspec-archive-change/SKILL.md`) actually correct?**
  _`doctor()` has 33 INFERRED edges - model-reasoned connections that need verification._
- **Should `serve.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1206896551724138 - nodes in this community are weakly interconnected._
- **Why does `evaluate()` connect `main` to `For users`, `decide`, `canonkit-hook.js`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Are the 20 inferred relationships involving `install()` (e.g. with `Publisher e pin — o que foi verificado (2026-10-19)` and `Wiring`) actually correct?**
  _`install()` has 20 INFERRED edges - model-reasoned connections that need verification._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Why does `doctor()` connect `doctor` to `OpenCode`, `cli.js`, `For users`, `replaceProjectBlock`, `slash`, `canonkit`, `.agents/skills/openspec-explore/SKILL.md`, `install`, `.claude/skills/openspec-explore/SKILL.md`, `Hooks and gates`, `explore.md`, `cli.test.js`, `opencodeDir`, `Codex`, `canonkit-hook.test.js`, `isObject`, `main`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
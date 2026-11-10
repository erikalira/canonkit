# Graph Report - agent-team-config  (2026-11-09)

## Corpus Check
- 204 files · ~433,761 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 6, .jsonc 1)

## Summary
- 2108 nodes · 3536 edges · 169 communities (149 shown, 20 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 277 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1637bbd1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- install
- package.json
- cli.js
- Subagents
- with
- Pixie — UX / Design Agent
- ref_node_fs
- canonkit-hook.js
- serve.js
- InstallManifest
- eval-routing.mjs
- publish
- install
- toolAdd
- laya-cases.mjs
- Dana — Data / Analytics / Experimentation Agent
- Tasks
- dashboard/package.json
- hooks/package.json
- Inventário completo por grupo
- add-specialist.sh
- install-reference.sh
- install.sh script
- cli.test.js
- routing-block.md
- stack-packs.js
- Q: Como avaliar de 0 a 10 a qualidade e o ROI das instrucoes instaladas pelo canonkit?
- hook-core.test.js
- hook-opencode.test.js
- Hooks and gates
- ADDED Requirements
- main
- P0 — fechar os maiores gaps de evidência
- ADDED Requirements
- Keeping findings outside the current task
- hook-codex.test.js
- Requirements
- decide
- check-enforced.mjs
- updates
- ADDED Requirements
- ADR 0005 — Contexto inflado se resolve com handoff manual
- main
- canonkit
- Stack packs — implementation plan
- CANONKIT_ROADMAP.md
- The team
- Requirements
- Evals
- ADDED Requirements
- Echo — Audio / Sound Design Agent
- Fase 4 — OpenSpec como artefato durável do change lifecycle
- canonkit-hook.test.js
- configFor
- tool
- Implementar Out-of-Scope Issue Capture no CanonKit
- projectConfig
- Jobs, in order
- Learning loop — design proposal
- ADDED Requirements
- Orchestrate
- Learning loop
- learning-loop.md
- context
- Learning Loop — plano consolidado de melhoria das instruções
- Ordem sugerida
- Fase 5 — Freshness explícita do Graphify
- Requirements
- isObject
- Virgo — Agent Team Maintainer
- Job A — review fixes (2026-10-21)
- Go
- Java
- Kotlin
- Swift
- Fase 8 — Gate quantitativo para Caveman / Shunt
- Learning from mistakes
- C++
- Pipe — DevOps / Platform / Operations Agent
- stack-packs.test.js
- React
- Proactive release preparation — instruction proposal and handoff
- validate.mjs
- Fase 7 — Testar a “solution ladder” antes de adicioná-la ao Bob
- Python
- Q: quais desses ajustes ainda fazem sentido?
- Q: agora falta o passo 9 do handoff!
- Handoff — rubric for instruction-quality audits
- ADDED Requirements
- Handoff — lessons from ECC (affaan-m/ecc v2.2.3)
- Handoff: empty the Claude memory without losing anything
- Handoff: `canonkit tool` (2026-10-19)
- Project tools: graphify and openspec
- Decisions
- Tasks
- AGENTS.md
- Spencer — Documentation / Knowledge Steward Agent
- copilot-setup-steps
- ui-focused-visual-workflow/design.md
- ADDED Requirements
- Requirements
- doctor
- TypeScript
- Design
- Decisions
- Proposal
- ADDED Requirements
- dashboard.test.js
- validate-python.py
- Tasks
- uninstall.test.js
- OpenSpec Agent
- ref_node_test
- product-discovery Specification
- Proposal
- OpenCode as a third install target (2026-10-26)
- Proposal
- Bob — Engineering / Implementation Agent
- ADDED Requirements
- Rendered interface review
- ecc-skills-knowledge-groups-handoff.md
- Requirement: Restrictive and reversible installation lifecycle
- Requirements
- Requirement: Restrictive and reversible installation lifecycle
- Perry — Performance / User-Perceived Speed Agent
- config.yaml
- canonkit 2.1.0
- Handoff: Laya version check, eval rerun, and new-resource exploration
- Installation reference
- Requirement: Network authorization remains outside repository control
- Requirement: Repository data boundary and limited exceptions
- scripts
- tools.md
- Interface design
- eval-laya.mjs
- canonkit 2.2.0
- Requirement: The approved strict network setting has trusted global scope
- chooseTargets
- Tasks
- Requirement: Network authorization remains outside repository control
- Requirement: Repository data boundary and limited exceptions
- Requirement: The approved strict network setting has trusted global scope
- Requirement: Capability-based environment selection
- Requirement: Native approval modes remain authoritative
- Requirement: Reinstallation migrates attributable legacy Claude hooks
- Requirement: Strict sandbox configuration preserves explicit requirements
- Requirement: Capability-based environment selection
- Requirement: Native approval modes remain authoritative
- Requirement: Reinstallation migrates attributable legacy Claude hooks
- Requirement: Strict sandbox configuration preserves explicit requirements
- Requirement: Native configuration is not shell authorization
- Requirement: No implicit machine provisioning
- Requirement: Native configuration is not shell authorization
- Requirement: No implicit machine provisioning
- 2.3.0.md
- canonkit 2.4.0
- Game art direction
- Rust
- canonkit 2.5.0
- Native security, per repository
- 4. Universal layout + enforcement outside Claude Code (largest real gap)
- C# / .NET
- eval-laya.test.js
- canonkit 3.0.0
- Releasing canonkit
- validate.sh script

## God Nodes (most connected - your core abstractions)
1. `doctor()` - 61 edges
2. `install()` - 46 edges
3. `Inventário completo por grupo` - 29 edges
4. `installDistribution()` - 27 edges
5. `InstallManifest` - 26 edges
6. `decide()` - 26 edges
7. `Pipe — DevOps / Platform / Operations Agent` - 23 edges
8. `securityDiagnosis()` - 22 edges
9. `Perry — Performance / User-Perceived Speed Agent` - 22 edges
10. `Dana — Data / Analytics / Experimentation Agent` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Editing an agent` --references--> `install()`  [INFERRED]
  docs/maintaining.md → bin/cli.js
- `Global install receipts` --references--> `installCatalog()`  [INFERRED]
  docs/maintaining.md → bin/cli.js
- `Publisher e pin — o que foi verificado (2026-10-19)` --references--> `install()`  [INFERRED]
  docs/adr/0001-tool-namespace-integrate-only.md → bin/cli.js
- `Stack packs, per project` --references--> `install()`  [INFERRED]
  docs/install.md → bin/cli.js
- `Upgrading from `meu-time`` --references--> `install()`  [INFERRED]
  docs/install.md → bin/cli.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Agents holding domain veto authority** — agents_archie_archie, agents_gard_gard, agents_scott_scott, agents_pixie_pixie, agents_quinn_quinn, agents_spencer_spencer, agents_dana_dana, agents_maya_maya, agents_nova_nova, agents_echo_echo [EXTRACTED 1.00]
- **Smallest-sufficient-solution doctrine across domains** — agents_archie_smallest_sufficient_architecture, agents_bob_smallest_correct_change, agents_scott_mvp, agents_gard_mitigation_priority, agents_dana_governing_principle, agents_spencer_minimum_structures [INFERRED 0.85]
- **Shared LOW/MEDIUM/HIGH risk triage protocol** — agents_archie_risk_classification, agents_bob_implementation_protocol, agents_gard_mitigation_priority, agents_quinn_test_strategy, agents_pipe_rollback_plan, agents_dana_experiment_protocol, agents_maya_core_loop, agents_nova_visual_language, agents_echo_mix_hierarchy, agents_pixie_interface_states [INFERRED 0.95]

## Communities (169 total, 20 thin omitted)

### Community 0 - "install"
Cohesion: 0.11
Nodes (44): applyClaudeUserPlan(), claudeHome(), install(), optionalBytes(), prepareSecurity(), readHooksFileForWiring(), readSettingsForWiring(), scopedSecurityManifest() (+36 more)

### Community 1 - "package.json"
Cohesion: 0.09
Nodes (23): author, bin, canonkit, bugs, url, description, devDependencies, @types/prompts@^2.4.9 (+15 more)

### Community 2 - "cli.js"
Cohesion: 0.06
Nodes (53): AGENTS_DIR, applyBlock(), applyBlockLf(), AUTHORITIES, CLAUDE_MD, CODEX, CODEX_MODELS, DASHBOARD_DIR (+45 more)

### Community 3 - "Subagents"
Cohesion: 0.14
Nodes (13): Branches, Core team — installed at user level (`~/.claude/agents`), Domain specialists — installed per project (the repository's `.claude/agents/`), Durable preferences, HIGH-risk surfaces and who owns them, Images, Incidental findings, New session when the subject changes (+5 more)

### Community 4 - "with"
Cohesion: 0.05
Nodes (40): concurrency, cancel-in-progress, group, run, SHA256, VERSION, jobs, secrets (+32 more)

### Community 5 - "Pixie — UX / Design Agent"
Cohesion: 0.21
Nodes (3): Archie — Architecture / Technical Lead Agent, Iris — Machine Learning / Computer Vision Agent, Pixie — UX / Design Agent

### Community 6 - "ref_node_fs"
Cohesion: 0.12
Nodes (6): REPO, SCRIPT, repo, CLI, REPO, VALIDATOR

### Community 7 - "canonkit-hook.js"
Cohesion: 0.08
Nodes (33): CATCH_ALL_SAMPLES, CLAUDE_GATE_MODES, CMD_PREFIX, CMD_PREFIX_VALUE, CONFIG_KEYS, DEFAULT_BANDS, fs, GATE_KINDS (+25 more)

### Community 8 - "serve.js"
Cohesion: 0.06
Nodes (51): addTo(), agentStatus(), contextContributors(), dispatches(), fs, HTML, http, json() (+43 more)

### Community 9 - "InstallManifest"
Cohesion: 0.22
Nodes (10): absent(), atomic(), digest(), exclusivePrivate(), InstallManifest, read(), regularPath(), removeManagedBlock() (+2 more)

### Community 10 - "eval-routing.mjs"
Cohesion: 0.14
Nodes (32): parseAgent(), readStackPack(), validateStackPacks(), agentDefinition(), CASES, EXPECT_KEYS, judgeReport(), main() (+24 more)

### Community 11 - "publish"
Cohesion: 0.07
Nodes (27): concurrency, cancel-in-progress, group, jobs, publish, test, name, on (+19 more)

### Community 12 - "install"
Cohesion: 0.14
Nodes (28): addSpecialists(), changeProject(), codexAgent(), codexModelOverride(), copilotAgent(), copilotAgentsDir(), copyKeepingLocal(), core() (+20 more)

### Community 13 - "toolAdd"
Cohesion: 0.11
Nodes (33): activeTools(), confirm(), gitHooksPreflight(), loud(), printMissing(), refuseOpencodeBelow2(), toolAdd(), toolEnv() (+25 more)

### Community 14 - "laya-cases.mjs"
Cohesion: 0.33
Nodes (8): contract(), createPlan(), enTicket, ownerQuestion, prediction(), ptTicket, ticketChecks(), ticketQuestions

### Community 15 - "Dana — Data / Analytics / Experimentation Agent"
Cohesion: 0.18
Nodes (3): Dana — Data / Analytics / Experimentation Agent, Maya — Game Design / Game Feel Agent, Scott — Product / Product Lead Agent

### Community 16 - "Tasks"
Cohesion: 0.05
Nodes (40): 1. CI on three OS, 2. Provenance and secret scan, 3. Review-noise to 10, 5. Uninstall, 6. Learning loop (the user's view of memory), 7. Stack packs, opt-in per project, 9. Leftovers (low value now), Decisions already made by the user (+32 more)

### Community 19 - "Inventário completo por grupo"
Cohesion: 0.05
Nodes (40): Achados de documentação a preservar, Como interpretar as tabelas, Continuação em uma sessão por grupo, Fontes, recorte e verificação, G01 — UI, UX e acessibilidade, G02 — Motion de interfaces, G03 — Frontend web e ferramentas, G04 — Mobile e interfaces nativas (+32 more)

### Community 23 - "cli.test.js"
Cohesion: 0.11
Nodes (19): renderRoutingBlock(), backups(), claudeDir(), CLI, CORE, FORWARDER(), isolatedEnv(), OC_ASKS (+11 more)

### Community 25 - "stack-packs.js"
Cohesion: 0.19
Nodes (10): absent(), bytes(), catalog(), digest(), exists(), object(), safePath(), samePath() (+2 more)

### Community 26 - "Q: Como avaliar de 0 a 10 a qualidade e o ROI das instrucoes instaladas pelo canonkit?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Como avaliar de 0 a 10 a qualidade e o ROI das instrucoes instaladas pelo canonkit?, Source Nodes

### Community 27 - "hook-core.test.js"
Cohesion: 0.09
Nodes (15): ADAPTER_KINDS, ADAPTERS, ENV_KEYS, { evaluate, GATE_KINDS, RECORD_KINDS }, FS_CALLBACK_WRITES, FS_PROMISE_WRITES, FS_WRITES, fx (+7 more)

### Community 28 - "hook-opencode.test.js"
Cohesion: 0.11
Nodes (14): OPENCODE_PLUGIN, adapter, call(), coreModule, denied(), FIXTURES, FIXTURES_DIR, HOOKS_DIR (+6 more)

### Community 29 - "Hooks and gates"
Cohesion: 0.14
Nodes (14): Events it must be registered for, Glob dialect: gitignore-like, not gitignore, Hooks and gates, It fails open, Optional editor schema, Per-project configuration: `.claude/canonkit.json`, `perfBudgets`, Protecting lint and test configuration (+6 more)

### Community 30 - "ADDED Requirements"
Cohesion: 0.09
Nodes (22): ADDED Requirements, Purpose, Requirement: Actionable native remediation and honest entry-point scope, Requirement: Diagnostic severity preserves the existing exit contract, Requirement: Read-only multi-harness diagnosis, Requirement: Report effective conflicts without granting access, Requirement: Separate configuration from evidence, Scenario: Broken automatic security configuration (+14 more)

### Community 31 - "main"
Cohesion: 0.29
Nodes (10): codexHome(), codexHooksPath(), globalManifest(), main(), syncBlock(), syncReference(), toolCommand(), trackedGlobal() (+2 more)

### Community 32 - "P0 — fechar os maiores gaps de evidência"
Cohesion: 0.12
Nodes (17): Casos iniciais, Critério de aceite, Critério de aceite, Critério de aceite, Dashboard, Depois, Fase 1 — Telemetria de contexto do main thread, Fase 2 — Fazer o routing eval validar `model` e `effort` (+9 more)

### Community 33 - "ADDED Requirements"
Cohesion: 0.09
Nodes (22): ADDED Requirements, Purpose, Requirement: HIGH handoff signals identify missing details for manual inspection, Requirement: Large candidate sets do not automate owner assignment, Requirement: Laya cannot replace Canonkit governance or direct evidence, Requirement: Laya receives only minimized task-relevant content, Requirement: Long-text assessment preserves uncertainty and attribution, Requirement: Practical adoption prioritizes quality without additional benchmark campaigns (+14 more)

### Community 34 - "Keeping findings outside the current task"
Cohesion: 0.50
Nodes (4): Availability and evidence limits, Example: two findings during an unrelated plan, Keeping findings outside the current task, Review and publication

### Community 35 - "hook-codex.test.js"
Cohesion: 0.14
Nodes (9): codexInput(), { evaluate, GATE_KINDS }, FIXTURES, FIXTURES_DIR, HOOKS_DIR, { normalizeCodex, parsePatch, codexOutput, CODEX_GATE_MODES }, patch(), REPO (+1 more)

### Community 36 - "Requirements"
Cohesion: 0.09
Nodes (22): laya-advisory-assessment Specification, Purpose, Requirement: HIGH handoff signals identify missing details for manual inspection, Requirement: Large candidate sets do not automate owner assignment, Requirement: Laya cannot replace Canonkit governance or direct evidence, Requirement: Laya receives only minimized task-relevant content, Requirement: Long-text assessment preserves uncertainty and attribution, Requirement: Practical adoption prioritizes quality without additional benchmark campaigns (+14 more)

### Community 37 - "decide"
Cohesion: 0.15
Nodes (17): 8. Small fixes from the audit, decide(), gitBypass(), gitCalls(), includedPathReason(), num(), readEvents(), reportChars() (+9 more)

### Community 38 - "check-enforced.mjs"
Cohesion: 0.13
Nodes (10): HOOK_FILES, adapters, BLOCKS, { GATE_KINDS, RECORD_KINDS }, known, listed, out, REPO (+2 more)

### Community 39 - "updates"
Cohesion: 0.14
Nodes (13): patterns, prefix, default-days, actions, interval, updates, commit-message, cooldown (+5 more)

### Community 40 - "ADDED Requirements"
Cohesion: 0.05
Nodes (39): ADDED Requirements, Requirement: Composite-control inspection follows a reported risk, Requirement: Content states and flow outcomes are explicit, Requirement: Design decisions follow the product and existing direction, Requirement: Design handoffs are implementable and proportionate, Requirement: Interface skills are independently opt-in, Requirement: Motion preserves purpose access and stability, Requirement: Rendered review matches the changed experience (+31 more)

### Community 41 - "ADR 0005 — Contexto inflado se resolve com handoff manual"
Cohesion: 0.15
Nodes (11): ADR 0004 — Só harnesses que rodam o time em qualidade plena, Alternativas consideradas, Consequências aceitas, Contexto, Decisão, ADR 0005 — Contexto inflado se resolve com handoff manual, Alternativas consideradas, Consequências aceitas (+3 more)

### Community 42 - "main"
Cohesion: 0.18
Nodes (14): Native controls and optional hooks, Returning to native approvals, The core: `evaluate(evt, env)`, Evidence available today, Next, allow(), claudeEnv(), claudeOutput() (+6 more)

### Community 43 - "canonkit"
Cohesion: 0.15
Nodes (13): canonkit, Commands, Documentation, FAQ, How it decides: LOW vs HIGH, If no gate ever fires, License, Risk and scale are two different questions (+5 more)

### Community 44 - "Stack packs — implementation plan"
Cohesion: 0.20
Nodes (9): Acceptance and verification, Contract and layout, Go, Kotlin and Swift expansion (2026-11-02), Implementation sequence and review requirements, Initial seven-pack implementation record, Intended behavior, Planning record, Stack packs — implementation plan (+1 more)

### Community 45 - "CANONKIT_ROADMAP.md"
Cohesion: 0.17
Nodes (11): 1. Princípios do roadmap, CanonKit — Roadmap de Evolução, Definition of Done do roadmap, Fase 10 — período de freeze, Fase 9 — Dashboard de eficiência por agente e por tipo de trabalho, Não objetivos, Ordem recomendada de implementação, P4 — maturação (+3 more)

### Community 46 - "The team"
Cohesion: 0.25
Nodes (8): Boundaries that tend to confuse, Conventions, Core team, Domain specialists, Engineering delivery, Integration Review, Learning loop, The team

### Community 47 - "Requirements"
Cohesion: 0.09
Nodes (22): Purpose, Requirement: Actionable native remediation and honest entry-point scope, Requirement: Diagnostic severity preserves the existing exit contract, Requirement: Read-only multi-harness diagnosis, Requirement: Report effective conflicts without granting access, Requirement: Separate configuration from evidence, Requirements, Scenario: Broken automatic security configuration (+14 more)

### Community 48 - "Evals"
Cohesion: 0.17
Nodes (12): Always-loaded cost, Case format, Engineering protocol fixtures, Evals, Learning-loop cases, Quality eval, Results: 2.2.0 pre-publish, partial (2026-11-02), Results: lean bodies (2026-10-18) (+4 more)

### Community 49 - "ADDED Requirements"
Cohesion: 0.10
Nodes (20): ADDED Requirements, Requirement: Composite controls preserve one interaction target, Requirement: Interface and gameplay states remain distinct, Requirement: LOW changes remain proportionate, Requirement: Nova provides UI-first visual direction, Requirement: Pixie owns UX and accessibility, Requirement: Shared decisions have distinct owners, Requirement: Skills do not create authority or mandatory dependencies (+12 more)

### Community 51 - "Fase 4 — OpenSpec como artefato durável do change lifecycle"
Cohesion: 0.18
Nodes (11): Caminho sugerido, Critério de aceite, Critério de aceite, Fase 4 — OpenSpec como artefato durável do change lifecycle, Fase 6 — Reavaliar o trust boundary dos hooks do Graphify, Fluxo desejado, Implementação provável, Objetivo (+3 more)

### Community 52 - "canonkit-hook.test.js"
Cohesion: 0.19
Nodes (11): activity(), decide(), HOOK, hookEnv(), inProject(), logged(), pre(), readLog() (+3 more)

### Community 53 - "configFor"
Cohesion: 0.36
Nodes (10): configFor(), isObj(), isWithin(), loadConfig(), locateConfig(), normalizePath(), onProject(), projectPath() (+2 more)

### Community 54 - "tool"
Cohesion: 0.05
Nodes (36): ADR 0001 — `canonkit tool`: um namespace próprio, que só integra, Alternativas consideradas, Consequências aceitas, Contexto, Decisão, Publisher e pin — o que foi verificado (2026-10-19), Revisar quando, ADR 0002 — Hooks Git do Graphify por opt-in (+28 more)

### Community 55 - "Implementar Out-of-Scope Issue Capture no CanonKit"
Cohesion: 0.08
Nodes (25): 10. Orçamento de contexto, 11.1. Verificações determinísticas, 11.2. Verificações documentais, 11.3. Cenários comportamentais, 11. Testes e critérios de aceitação, 12. Documentação, 13. Entregáveis, 1. Investigar a arquitetura existente (+17 more)

### Community 56 - "projectConfig"
Cohesion: 0.40
Nodes (5): Decisions (conditions to implement), Job B — doctor + install --wire-hooks + Stop gate (2026-10-21), Status, cap(), projectConfig()

### Community 57 - "Jobs, in order"
Cohesion: 0.22
Nodes (8): A — Hook: rename + calibration (HIGH: the enforcement surface itself), B — `canonkit doctor` + `install --wire-hooks` (HIGH: writes user settings), Before closing everything, C — README rewrite (MEDIUM, docs), D — Specialist eval cases (MEDIUM, quality), Handoff: enforcement + onboarding fixes (2026-10-21), Jobs, in order, Problems found

### Community 58 - "Learning loop — design proposal"
Cohesion: 0.22
Nodes (9): Acceptance and evaluation, Consolidated workflow implementation (2026-11-02), Expiry, rollback and context budget, Implementation record (2026-11-02), Learning loop — design proposal, Manual workflow, Privacy boundary, Proposal record (template, not a new schema) (+1 more)

### Community 59 - "ADDED Requirements"
Cohesion: 0.12
Nodes (16): ADDED Requirements, Purpose, Requirement: Evidence-qualified completion, Requirement: Honest offline evidence, Requirement: Hypothesis-driven debugging, Requirement: Selective regression-first testing, Requirement: Two aspects within existing review, Scenario: Code changed after a passing test (+8 more)

### Community 60 - "Orchestrate"
Cohesion: 0.18
Nodes (11): Briefing scratch work, Compact continuity and finalization, Evidence-based completion, Experimental Laya checks on HIGH handoffs, Incidental findings, Integration Review, Naming the model and effort, OpenSpec change lifecycle (+3 more)

### Community 61 - "Learning loop"
Cohesion: 0.33
Nodes (6): Evaluate and decide, General contributions, Investigate, Learning loop, Privacy, Review and expiry

### Community 63 - "context"
Cohesion: 0.12
Nodes (16): context(), Round 3 (2026-10-21, third session) — items 1–4 applied, tests first, Scope, Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness (+8 more)

### Community 64 - "Learning Loop — plano consolidado de melhoria das instruções"
Cohesion: 0.17
Nodes (12): 10. Aceitação e entregáveis, 1. Objetivo e princípio arquitetural, 2. Escopo e exclusões, 3. Investigar antes de implementar, 4. Fluxo de aprendizado, 5. Proporcionalidade, evidência e validação, 6. Governança e enforcement, 7. Contexto e documentação humana (+4 more)

### Community 65 - "Ordem sugerida"
Cohesion: 0.29
Nodes (7): Bob, Ordem sugerida, Perry, Pipe, Scott, Spencer, Virgo

### Community 66 - "Fase 5 — Freshness explícita do Graphify"
Cohesion: 0.29
Nodes (7): Critério de aceite, Fase 5 — Freshness explícita do Graphify, Objetivo, Opção A — instrução + check leve, Opção B — status no CanonKit, Opções, da menor para a maior, Problema

### Community 67 - "Requirements"
Cohesion: 0.12
Nodes (16): engineering-delivery Specification, Purpose, Requirement: Evidence-qualified completion, Requirement: Honest offline evidence, Requirement: Hypothesis-driven debugging, Requirement: Selective regression-first testing, Requirement: Two aspects within existing review, Requirements (+8 more)

### Community 68 - "isObject"
Cohesion: 0.16
Nodes (22): asksNotInEffect(), configuration(), copilotHome(), decidesShell(), deniesShell(), equalJson(), filesUnder(), installCatalog() (+14 more)

### Community 70 - "Job A — review fixes (2026-10-21)"
Cohesion: 0.15
Nodes (14): Backlog (not job A), Blockers (fix first, test-first), Contract items (Archie), Decision needed from the user (Gard P2 #5), Job A — review fixes (2026-10-21), Release notes (draft, for the version bump — jobs A + B), Round 3 candidates (all LOW, optional; any hook edit needs a fresh review), Status (2026-10-21, second session) (+6 more)

### Community 71 - "Go"
Cohesion: 0.29
Nodes (6): Establish the project, Go, Implementation and diagnosis, Security when relevant, Team boundary, Verify the changed boundary

### Community 72 - "Java"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, Java, Team boundary, Verify the changed boundary

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

### Community 79 - "stack-packs.test.js"
Cohesion: 0.18
Nodes (7): PACKAGE_ROOT, STACK_PACK_IDS, TARGETS, CLI, REPO, roots, snapshot()

### Community 80 - "React"
Cohesion: 0.25
Nodes (5): Establish the project, Implementation and diagnosis, React, Team boundary, Verify the changed boundary

### Community 81 - "Proactive release preparation — instruction proposal and handoff"
Cohesion: 0.25
Nodes (7): Applied source changes, Decision and continuation, Goal and evidence, Implementation outcome, Intended behavior and protected controls, Proactive release preparation — instruction proposal and handoff, Proposal-stage validation and review

### Community 82 - "validate.mjs"
Cohesion: 0.19
Nodes (27): checkBashScript(), filesIn(), findBash(), findPython(), frontmatterField(), gitResult(), main(), parseArgs() (+19 more)

### Community 83 - "Fase 7 — Testar a “solution ladder” antes de adicioná-la ao Bob"
Cohesion: 0.40
Nodes (5): Critério de aceite, Fase 7 — Testar a “solution ladder” antes de adicioná-la ao Bob, Importante, P2 — melhorias condicionais, Resultado medido

### Community 84 - "Python"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, Python, Team boundary, Verify the changed boundary

### Community 85 - "Q: quais desses ajustes ainda fazem sentido?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: quais desses ajustes ainda fazem sentido?, Source Nodes

### Community 86 - "Q: agora falta o passo 9 do handoff!"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: agora falta o passo 9 do handoff!, Source Nodes

### Community 87 - "Handoff — rubric for instruction-quality audits"
Cohesion: 0.29
Nodes (6): First step, Goal, Handoff — rubric for instruction-quality audits, Open decisions (ask the user), Problem, Seed parameters (union of both rounds; decide merges)

### Community 88 - "ADDED Requirements"
Cohesion: 0.14
Nodes (14): ADDED Requirements, Requirement: Game-art knowledge is an optional project skill, Requirement: Game-art procedures load only for relevant surfaces, Requirement: Game-art procedures preserve domain boundaries, Requirement: Game-art review uses surface-specific visual criteria, Requirement: Knowledge availability does not fabricate a specialist, Scenario: A game settings menu needs layout polish, Scenario: A visual proposal changes a reward rule (+6 more)

### Community 89 - "Handoff — lessons from ECC (affaan-m/ecc v2.2.3)"
Cohesion: 0.33
Nodes (5): Adopt (fits canonkit's purpose), Docs for humans (user priority), Handoff — lessons from ECC (affaan-m/ecc v2.2.3), Rejected (would break the purpose), Routing

### Community 90 - "Handoff: empty the Claude memory without losing anything"
Cohesion: 0.33
Nodes (5): 1. Rules to add to canonkit, 2. Memory to delete after the canonkit commit, Handoff: empty the Claude memory without losing anything, Order after this session, Still open from 2026-11-06

### Community 91 - "Handoff: `canonkit tool` (2026-10-19)"
Cohesion: 0.50
Nodes (3): Handoff: `canonkit tool` (2026-10-19), Open before committing / publishing, What is in the working tree

### Community 92 - "Project tools: graphify and openspec"
Cohesion: 0.22
Nodes (9): Before enabling the git hooks, canonkit integrates, it never installs, Experimental handoff checks, graphify, Keeping the graph fresh, Laya, openspec, Project tools: graphify and openspec (+1 more)

### Community 93 - "Decisions"
Cohesion: 0.13
Nodes (14): 1. One small security helper; existing CLI owns mutations, 2. Automatic best-supported default, existing strict requirements preserved, 3. Restrict each surface with its actual controls, 4. Network closed to new destinations; no stack-derived grants, 5. Separate repository security from global distribution and hook wiring, 6. Read-only diagnosis, evidence per harness, 7. Native-default upgrade migration (authorized 2026-11-09), Consultation and source evidence (+6 more)

### Community 94 - "Tasks"
Cohesion: 0.14
Nodes (13): 1. Environment evidence and capability selection, 2. Claude policy and native Windows profile, 3. Automatic installation and conservative undo, 4. Read-only diagnostics across harnesses, 5. Integration evidence and independent review, Archive decision — 2026-11-09, Hook-upgrade migration evidence, 2026-11-09, Implementation decisions and evidence (+5 more)

### Community 100 - "copilot-setup-steps"
Cohesion: 0.11
Nodes (17): permissions, runs-on, steps, timeout-minutes, jobs, copilot-setup-steps, name, on (+9 more)

### Community 101 - "ui-focused-visual-workflow/design.md"
Cohesion: 0.18
Nodes (6): Purpose, Spec Delta, Purpose, Spec Delta, Purpose, Spec Delta

### Community 102 - "ADDED Requirements"
Cohesion: 0.17
Nodes (11): ADDED Requirements, Purpose, Requirement: Compact resumable handoff, Requirement: Safe finalization, Requirement: Task-scoped delegation, Scenario: Implementation is ready for review, Scenario: Incomplete handoff, Scenario: Independent narrow task (+3 more)

### Community 103 - "Requirements"
Cohesion: 0.17
Nodes (11): context-continuity Specification, Purpose, Requirement: Compact resumable handoff, Requirement: Safe finalization, Requirement: Task-scoped delegation, Requirements, Scenario: Implementation is ready for review, Scenario: Incomplete handoff (+3 more)

### Community 104 - "doctor"
Cohesion: 0.13
Nodes (30): asksByHand(), codexCommand(), codexHooksDir(), doctor(), installCodexHooks(), installOpencodeHooks(), isOurCodexHook(), legacyRunners() (+22 more)

### Community 105 - "TypeScript"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, Team boundary, TypeScript, Verify the changed boundary

### Community 106 - "Design"
Cohesion: 0.18
Nodes (10): Choose tools for the real input, Context, Decisions, Design, Goals / Non-Goals, Keep the orchestrator as the control point, Learn through existing work evidence, Migration Plan (+2 more)

### Community 107 - "Decisions"
Cohesion: 0.15
Nodes (13): 1. Keep Nova UI-first with explicit cross-media visual authority, 2. Clarify UX boundaries without transferring accessibility, 3. Provide three independent single-file skills, 4. Separate evidence collection from domain judgment, 5. Extend the catalog without changing pack storage, 6. Verify contracts and prepare behavioural evaluation separately, Context, Decisions (+5 more)

### Community 108 - "Proposal"
Cohesion: 0.25
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 109 - "ADDED Requirements"
Cohesion: 0.22
Nodes (8): ADDED Requirements, Purpose, Requirement: Existing requirements stay authoritative, Requirement: Proportional product clarification, Scenario: Clear small request, Scenario: Project uses OpenSpec, Scenario: Vague product outcome, Spec Delta

### Community 110 - "dashboard.test.js"
Cohesion: 0.12
Nodes (6): require, setup(), warn(), { contextContributors, retainedTotals }, HOOK, SERVER

### Community 111 - "validate-python.py"
Cohesion: 0.09
Nodes (20): Core, at user level, Do not version, Editing an agent, File format, Global install receipts, Maintaining canonkit, Product-neutral examples, Stack packs (+12 more)

### Community 112 - "Tasks"
Cohesion: 0.13
Nodes (15): 1. UI-first ownership and agent guidance, 2. Optional skills and compatible project distribution, 3. Integration, independent review and delivery evidence, Accepted V/L traceability, Context measurements, Document checks, G01–G03 planning revision — 2026-11-09, Implementation evidence — 2026-11-09 (current working tree) (+7 more)

### Community 113 - "uninstall.test.js"
Cohesion: 0.18
Nodes (5): CLI, manifest(), manifestFile(), markers, store()

### Community 114 - "OpenSpec Agent"
Cohesion: 0.20
Nodes (9): Agent-Compatible CLI Commands (prefer `--json` for structured output), Available Commands, Best Practices, Creating New Changes, Interactive CLI Commands (use when prompted by the user), Key Directories, OpenSpec Agent, What is OpenSpec? (+1 more)

### Community 115 - "ref_node_test"
Cohesion: 0.57
Nodes (4): isCanonicalClaudeHook(), mentionsKit(), migrateClaudeHooks(), object()

### Community 116 - "product-discovery Specification"
Cohesion: 0.22
Nodes (8): product-discovery Specification, Purpose, Requirement: Existing requirements stay authoritative, Requirement: Proportional product clarification, Requirements, Scenario: Clear small request, Scenario: Project uses OpenSpec, Scenario: Vague product outcome

### Community 117 - "Proposal"
Cohesion: 0.25
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 118 - "OpenCode as a third install target (2026-10-26)"
Cohesion: 0.40
Nodes (4): Decisions, Facts checked against the docs (2026-10-26), OpenCode as a third install target (2026-10-26), Phase 2 (later, after testing in practice)

### Community 119 - "Proposal"
Cohesion: 0.25
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 121 - "ADDED Requirements"
Cohesion: 0.29
Nodes (6): ADDED Requirements, Purpose, Requirement: Automatic installation of supported restrictions, Scenario: Global distribution without a repository target, Scenario: Plain Claude installation, Spec Delta

### Community 122 - "Rendered interface review"
Cohesion: 0.22
Nodes (8): Choose the relevant checks, Composite controls when the risk calls for it, Evidence, verdict and recheck, M1 — Inspect the intended visual language, M2 — Exercise applicable states and outcomes, M3 — Rendered content, access and failures, M4 — Motion, geometry and continuity, Rendered interface review

### Community 123 - "ecc-skills-knowledge-groups-handoff.md"
Cohesion: 0.25
Nodes (6): 1. Measure the baseline, 2. Separate signal from noise, 3. Silence it where the setting stays saved, in this order, 4. What not to do, 5. Measure again and report, Context tune

### Community 124 - "Requirement: Restrictive and reversible installation lifecycle"
Cohesion: 0.29
Nodes (7): Requirement: Restrictive and reversible installation lifecycle, Scenario: Broken settings in a mixed-target installation, Scenario: Dry run, Scenario: Ordinary global removal, Scenario: Project-only reversal, Scenario: Reinstallation or environment change, Scenario: User edits settings after installation

### Community 125 - "Requirements"
Cohesion: 0.29
Nodes (6): environment-security-policy Specification, Purpose, Requirement: Automatic installation of supported restrictions, Requirements, Scenario: Global distribution without a repository target, Scenario: Plain Claude installation

### Community 126 - "Requirement: Restrictive and reversible installation lifecycle"
Cohesion: 0.29
Nodes (7): Requirement: Restrictive and reversible installation lifecycle, Scenario: Broken settings in a mixed-target installation, Scenario: Dry run, Scenario: Ordinary global removal, Scenario: Project-only reversal, Scenario: Reinstallation or environment change, Scenario: User edits settings after installation

### Community 128 - "config.yaml"
Cohesion: 0.50
Nodes (3): githubCopilot, cloudAgent, schema

### Community 129 - "canonkit 2.1.0"
Cohesion: 0.67
Nodes (3): canonkit 2.1.0, For users, Internal

### Community 130 - "Handoff: Laya version check, eval rerun, and new-resource exploration"
Cohesion: 0.25
Nodes (7): CanonKit rules to respect, First steps for the new session, Goal, Handoff: Laya version check, eval rerun, and new-resource exploration, New resources to try (verify exposure in 0.4.30 MCP), Prior evidence (this session, 2026-11-09), Prior score snapshot

### Community 131 - "Installation reference"
Cohesion: 0.18
Nodes (11): Commands, GitHub Copilot, Installation reference, Manual cleanup for pre-manifest installations and reported leftovers, OpenCode, OpenCode plugin (`--wire-hooks`), Specialists, per project, Stack packs, per project (+3 more)

### Community 132 - "Requirement: Network authorization remains outside repository control"
Cohesion: 0.40
Nodes (5): Requirement: Network authorization remains outside repository control, Scenario: A dependency registry is suggested, Scenario: Harness merges a repository expansion, Scenario: Strict sandbox network configuration, Scenario: Unsandboxed or separate network tool

### Community 133 - "Requirement: Repository data boundary and limited exceptions"
Cohesion: 0.40
Nodes (5): Requirement: Repository data boundary and limited exceptions, Scenario: Another project is opened later, Scenario: File-tool controls are version-dependent, Scenario: Shell reads need separate restrictions, Scenario: Windows drives and links

### Community 134 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, eval, eval:quality, pack:dry, prepublishOnly, test, validate, validate:full (+1 more)

### Community 135 - "tools.md"
Cohesion: 0.17
Nodes (9): Before dispatch and after return, Invocation evidence and learning from use, Laya advice in practical HIGH handoffs, Requests, Tools for matching inputs, Choose the destination and prepare drafts, Incidental findings and project issues, Obtain authorization and publish (+1 more)

### Community 136 - "Interface design"
Cohesion: 0.29
Nodes (7): Evidence and handoff, Interface design, M1 — Direction and concrete finish, M2 — States and promised outcomes, M3 — Design for actual content and operation, M4 — Purposeful and stable motion, Scope and authority

### Community 137 - "eval-laya.mjs"
Cohesion: 0.62
Nodes (6): at(), finite(), main(), matches(), observed(), scoreRun()

### Community 138 - "canonkit 2.2.0"
Cohesion: 0.67
Nodes (3): canonkit 2.2.0, Internal, Next

### Community 139 - "Requirement: The approved strict network setting has trusted global scope"
Cohesion: 0.40
Nodes (5): Requirement: The approved strict network setting has trusted global scope, Scenario: Existing strict network setting, Scenario: Other harnesses selected, Scenario: Strict network configuration without hook wiring, Scenario: Unsupported or unknown version

### Community 140 - "chooseTargets"
Cohesion: 0.50
Nodes (4): chooseTargets(), dependencies, prompts@2.4.2, prompts

### Community 141 - "Tasks"
Cohesion: 0.40
Nodes (4): 1. Implement practical use, 2. Verify the instructions, 3. Apply the static-audit corrections, Tasks

### Community 142 - "Requirement: Network authorization remains outside repository control"
Cohesion: 0.40
Nodes (5): Requirement: Network authorization remains outside repository control, Scenario: A dependency registry is suggested, Scenario: Harness merges a repository expansion, Scenario: Strict sandbox network configuration, Scenario: Unsandboxed or separate network tool

### Community 143 - "Requirement: Repository data boundary and limited exceptions"
Cohesion: 0.40
Nodes (5): Requirement: Repository data boundary and limited exceptions, Scenario: Another project is opened later, Scenario: File-tool controls are version-dependent, Scenario: Shell reads need separate restrictions, Scenario: Windows drives and links

### Community 144 - "Requirement: The approved strict network setting has trusted global scope"
Cohesion: 0.40
Nodes (5): Requirement: The approved strict network setting has trusted global scope, Scenario: Existing strict network setting, Scenario: Other harnesses selected, Scenario: Strict network configuration without hook wiring, Scenario: Unsupported or unknown version

### Community 145 - "Requirement: Capability-based environment selection"
Cohesion: 0.50
Nodes (4): Requirement: Capability-based environment selection, Scenario: Container and WSL evidence overlap, Scenario: Marker or dependency is insufficient, Scenario: Native Windows remains usable

### Community 146 - "Requirement: Native approval modes remain authoritative"
Cohesion: 0.50
Nodes (4): Requirement: Native approval modes remain authoritative, Scenario: Additional access is attempted, Scenario: Optional decision hook is absent, Scenario: User switches native modes

### Community 147 - "Requirement: Reinstallation migrates attributable legacy Claude hooks"
Cohesion: 0.50
Nodes (4): Requirement: Reinstallation migrates attributable legacy Claude hooks, Scenario: Existing user upgrades to native defaults, Scenario: Explicit optional hooks and subsequent removal, Scenario: Mixed or ambiguous integrations

### Community 148 - "Requirement: Strict sandbox configuration preserves explicit requirements"
Cohesion: 0.50
Nodes (4): Requirement: Strict sandbox configuration preserves explicit requirements, Scenario: Existing strict policy on native Windows, Scenario: Missing dependency or unknown effective override, Scenario: Sandbox-capable platform

### Community 149 - "Requirement: Capability-based environment selection"
Cohesion: 0.50
Nodes (4): Requirement: Capability-based environment selection, Scenario: Container and WSL evidence overlap, Scenario: Marker or dependency is insufficient, Scenario: Native Windows remains usable

### Community 150 - "Requirement: Native approval modes remain authoritative"
Cohesion: 0.50
Nodes (4): Requirement: Native approval modes remain authoritative, Scenario: Additional access is attempted, Scenario: Optional decision hook is absent, Scenario: User switches native modes

### Community 151 - "Requirement: Reinstallation migrates attributable legacy Claude hooks"
Cohesion: 0.50
Nodes (4): Requirement: Reinstallation migrates attributable legacy Claude hooks, Scenario: Existing user upgrades to native defaults, Scenario: Explicit optional hooks and subsequent removal, Scenario: Mixed or ambiguous integrations

### Community 152 - "Requirement: Strict sandbox configuration preserves explicit requirements"
Cohesion: 0.50
Nodes (4): Requirement: Strict sandbox configuration preserves explicit requirements, Scenario: Existing strict policy on native Windows, Scenario: Missing dependency or unknown effective override, Scenario: Sandbox-capable platform

### Community 153 - "Requirement: Native configuration is not shell authorization"
Cohesion: 0.67
Nodes (3): Requirement: Native configuration is not shell authorization, Scenario: Existing permissive personal rule, Scenario: Windows security is installed

### Community 154 - "Requirement: No implicit machine provisioning"
Cohesion: 0.67
Nodes (3): Requirement: No implicit machine provisioning, Scenario: Stronger environment is absent, Scenario: Windows user chooses native operation

### Community 155 - "Requirement: Native configuration is not shell authorization"
Cohesion: 0.67
Nodes (3): Requirement: Native configuration is not shell authorization, Scenario: Existing permissive personal rule, Scenario: Windows security is installed

### Community 156 - "Requirement: No implicit machine provisioning"
Cohesion: 0.67
Nodes (3): Requirement: No implicit machine provisioning, Scenario: Stronger environment is absent, Scenario: Windows user chooses native operation

### Community 158 - "canonkit 2.4.0"
Cohesion: 0.67
Nodes (3): canonkit 2.4.0, For users, Verification and limits

### Community 159 - "Game art direction"
Cohesion: 0.33
Nodes (5): Authority and scope, Establish the direction and viewing context, Findings and evidence, Game art direction, Review the relevant surfaces

### Community 160 - "Rust"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, Rust, Team boundary, Verify the changed boundary

### Community 161 - "canonkit 2.5.0"
Cohesion: 0.67
Nodes (3): canonkit 2.5.0, For users, Verification and limits

### Community 162 - "Native security, per repository"
Cohesion: 0.33
Nodes (6): Diagnosis and conservative reversal, Environment and version coverage, Native approval modes stay native, Native security, per repository, Network and separate tools, Returning existing Claude installations to native approvals

### Community 163 - "4. Universal layout + enforcement outside Claude Code (largest real gap)"
Cohesion: 0.17
Nodes (12): Codex, Codex and OpenCode, Known gaps, OpenCode, 4. Universal layout + enforcement outside Claude Code (largest real gap), askFor(), contextBands(), contextReminder() (+4 more)

### Community 164 - "C# / .NET"
Cohesion: 0.33
Nodes (5): C# / .NET, Establish the project, Implementation and diagnosis, Team boundary, Verify the changed boundary

### Community 166 - "canonkit 3.0.0"
Cohesion: 0.67
Nodes (3): canonkit 3.0.0, Verification and release limits, What changes for users

### Community 167 - "Releasing canonkit"
Cohesion: 0.50
Nodes (4): One-time setup (account owner), Release, Releasing canonkit, When it fails

## Knowledge Gaps
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Known dead ends** — questions that led nowhere; don't re-derive.
- "quais desses ajustes ainda fazem sentido?" -> `scanTranscript()`, `transcriptUsage()`
- "agora falta o passo 9 do handoff!" -> `Hooks`, `HOOK`

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `install()` connect `install` to `canonkit 2.1.0`, `cli.js`, `Installation reference`, `install`, `toolAdd`, `Tasks`, `cli.test.js`, `2.3.0.md`, `canonkit 2.4.0`, `main`, `Native security, per repository`, `canonkit`, `Stack packs — implementation plan`, `tool`, `Jobs, in order`, `Job A — review fixes (2026-10-21)`, `Decisions`, `doctor`, `validate-python.py`, `Proposal`?**
  _High betweenness centrality (0.146) - this node is a cross-community bridge._
- **Are the 33 inferred relationships involving `doctor()` (e.g. with `mentionsHook()` and `ruleText()`) actually correct?**
  _`doctor()` has 33 INFERRED edges - model-reasoned connections that need verification._
- **Should `install` be split into smaller, more focused modules?**
  _Cohesion score 0.1096938775510204 - nodes in this community are weakly interconnected._
- **Why does `Installation reference` connect `Installation reference` to `install`, `Native security, per repository`, `doctor`, `validate-python.py`, `learning-loop.md`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Are the 27 inferred relationships involving `install()` (e.g. with `Publisher e pin — o que foi verificado (2026-10-19)` and `Wiring`) actually correct?**
  _`install()` has 27 INFERRED edges - model-reasoned connections that need verification._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Why does `doctor()` connect `doctor` to `install`, `cli.js`, `Installation reference`, `canonkit 2.2.0`, `install`, `cli.test.js`, `Hooks and gates`, `ADDED Requirements`, `main`, `Native security, per repository`, `4. Universal layout + enforcement outside Claude Code (largest real gap)`, `canonkit 3.0.0`, `main`, `canonkit`, `Requirements`, `projectConfig`, `context`, `isObject`, `Job A — review fixes (2026-10-21)`, `validate-python.py`, `Proposal`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
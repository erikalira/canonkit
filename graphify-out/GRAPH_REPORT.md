# Graph Report - agent-team-config  (2026-11-10)

## Corpus Check
- 228 files · ~465,800 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 6, .jsonc 1, .log 1)

## Summary
- 2368 nodes · 4084 edges · 181 communities (161 shown, 20 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 352 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fe57a6d6`
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
- eval-quality.mjs
- publish
- install
- exec.js
- eval-laya.mjs
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
- Proposal
- Q: Como avaliar de 0 a 10 a qualidade e o ROI das instrucoes instaladas pelo canonkit?
- hook-core.test.js
- hook-opencode.test.js
- Hooks and gates
- ADDED Requirements
- 4. Universal layout + enforcement outside Claude Code (largest real gap)
- P0 — fechar os maiores gaps de evidência
- ADDED Requirements
- doctor
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
- StackPackStore
- Implementar Out-of-Scope Issue Capture no CanonKit
- Priority list
- Jobs, in order
- Learning loop — design proposal
- ADDED Requirements
- Orchestrate
- Learning loop
- unknown
- ADDED Requirements
- Learning Loop — plano consolidado de melhoria das instruções
- Ordem sugerida
- Fase 5 — Freshness explícita do Graphify
- Requirements
- isObject
- Virgo — Agent Team Maintainer
- Job A — review fixes (2026-10-21)
- Go
- README.md
- Kotlin
- Swift
- Fase 8 — Gate quantitativo para Caveman / Shunt
- Learning from mistakes
- model-discovery.js
- Pipe — DevOps / Platform / Operations Agent
- model-config.js
- scripts
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
- models-command.test.js
- copilot-setup-steps
- ui-focused-visual-workflow/design.md
- ADDED Requirements
- Requirements
- models-command.js
- TypeScript
- Design
- Decisions
- Proposal
- ADDED Requirements
- Spencer — Documentation / Knowledge Steward Agent
- validate-python.py
- Tasks
- contextReminder
- OpenSpec Agent
- ref_node_test
- product-discovery Specification
- Proposal
- highRisk
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
- Java
- Handoff: Laya version check, eval rerun, and new-resource exploration
- canonkit-opencode.js
- Requirement: Network authorization remains outside repository control
- Requirement: Repository data boundary and limited exceptions
- openspec-explore/SKILL.md
- slash
- Interface design
- codex-block.md
- Releasing canonkit
- Requirement: The approved strict network setting has trusted global scope
- Tasks
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
- uninstall.test.js
- Tasks
- 2.3.0.md
- canonkit 2.4.0
- stack-packs.test.js
- projectConfig
- tool
- addSpecialists
- Handoff: verificação proporcional (quando rodar a suíte completa)
- Proposal
- opencodeDir
- validate.sh script
- install.md
- Handoff — canonkit improvements, by priority (2026-10-29)
- Game art direction
- Rust
- claudeAgent
- OpenCode as a third install target (2026-10-26)
- tools.md
- Keeping findings outside the current task
- prompts
- canonkit 2.2.0
- canonkit 2.5.0
- repository

## God Nodes (most connected - your core abstractions)
1. `doctor()` - 86 edges
2. `install()` - 61 edges
3. `installDistribution()` - 33 edges
4. `Inventário completo por grupo` - 29 edges
5. `InstallManifest` - 27 edges
6. `decide()` - 26 edges
7. `addSpecialists()` - 23 edges
8. `Pipe — DevOps / Platform / Operations Agent` - 23 edges
9. `securityDiagnosis()` - 22 edges
10. `Perry — Performance / User-Perceived Speed Agent` - 22 edges

## Surprising Connections (you probably didn't know these)
- `D3. Apply choices in agent files and treat known conflicts as inherit` --references--> `tomlString()`  [INFERRED]
  openspec/changes/codex-model-selection/design.md → bin/cli.js
- `2. Choice interface and diagnosis` --references--> `doctor()`  [INFERRED]
  openspec/changes/codex-model-selection/tasks.md → bin/cli.js
- `Requests` --references--> `report()`  [INFERRED]
  skills/orchestrate/laya-handoffs.md → scripts/eval-quality.mjs
- `CLI` --references--> `addSpecialists()`  [INFERRED]
  docs/plans/complements.md → bin/cli.js
- `Where the token numbers come from` --references--> `usage()`  [INFERRED]
  docs/telemetry.md → bin/cli.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Agents holding domain veto authority** — agents_archie_archie, agents_gard_gard, agents_scott_scott, agents_pixie_pixie, agents_quinn_quinn, agents_spencer_spencer, agents_dana_dana, agents_maya_maya, agents_nova_nova, agents_echo_echo [EXTRACTED 1.00]
- **Smallest-sufficient-solution doctrine across domains** — agents_archie_smallest_sufficient_architecture, agents_bob_smallest_correct_change, agents_scott_mvp, agents_gard_mitigation_priority, agents_dana_governing_principle, agents_spencer_minimum_structures [INFERRED 0.85]
- **Shared LOW/MEDIUM/HIGH risk triage protocol** — agents_archie_risk_classification, agents_bob_implementation_protocol, agents_gard_mitigation_priority, agents_quinn_test_strategy, agents_pipe_rollback_plan, agents_dana_experiment_protocol, agents_maya_core_loop, agents_nova_visual_language, agents_echo_mix_hierarchy, agents_pixie_interface_states [INFERRED 0.95]

## Communities (181 total, 20 thin omitted)

### Community 0 - "install"
Cohesion: 0.13
Nodes (37): applyClaudeUserPlan(), claudeHome(), optionalBytes(), prepareSecurity(), scopedSecurityManifest(), securityDiagnosis(), securityDigest(), settingsPath() (+29 more)

### Community 1 - "package.json"
Cohesion: 0.10
Nodes (20): author, bin, canonkit, bugs, url, description, devDependencies, @types/prompts@^2.4.9 (+12 more)

### Community 2 - "cli.js"
Cohesion: 0.06
Nodes (56): AGENTS_DIR, applyBlock(), applyBlockLf(), AUTHORITIES, CLAUDE_MD, CODEX, DASHBOARD_DIR, DEFAULT_TARGETS (+48 more)

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
Cohesion: 0.08
Nodes (9): REPO, SCRIPT, repo, { contextContributors, retainedTotals }, HOOK, SERVER, CLI, REPO (+1 more)

### Community 7 - "canonkit-hook.js"
Cohesion: 0.08
Nodes (31): CATCH_ALL_SAMPLES, CLAUDE_GATE_MODES, CMD_PREFIX, CMD_PREFIX_VALUE, CONFIG_KEYS, DEFAULT_BANDS, fs, GATE_KINDS (+23 more)

### Community 8 - "serve.js"
Cohesion: 0.07
Nodes (41): addTo(), agentStatus(), contextContributors(), dispatches(), fs, HTML, http, json() (+33 more)

### Community 9 - "InstallManifest"
Cohesion: 0.22
Nodes (10): absent(), atomic(), digest(), exclusivePrivate(), InstallManifest, read(), regularPath(), removeManagedBlock() (+2 more)

### Community 10 - "eval-quality.mjs"
Cohesion: 0.13
Nodes (33): parseAgent(), readStackPack(), STACK_PACK_IDS, validateStackPacks(), agentDefinition(), CASES, EXPECT_KEYS, judgeReport() (+25 more)

### Community 11 - "publish"
Cohesion: 0.07
Nodes (27): concurrency, cancel-in-progress, group, jobs, publish, test, name, on (+19 more)

### Community 12 - "install"
Cohesion: 0.16
Nodes (27): changeProject(), codexAgent(), codexHome(), codexHooksPath(), copilotAgent(), copilotAgentsDir(), core(), globalManifest() (+19 more)

### Community 13 - "exec.js"
Cohesion: 0.09
Nodes (40): activeTools(), confirm(), getTool(), gitHooksPreflight(), loud(), printMissing(), readTools(), refuseOpencodeBelow2() (+32 more)

### Community 14 - "eval-laya.mjs"
Cohesion: 0.14
Nodes (17): Manual cleanup for pre-manifest installations and reported leftovers, Uninstalling, contract(), createPlan(), enTicket, ownerQuestion, prediction(), ptTicket (+9 more)

### Community 15 - "Dana — Data / Analytics / Experimentation Agent"
Cohesion: 0.18
Nodes (3): Dana — Data / Analytics / Experimentation Agent, Maya — Game Design / Game Feel Agent, Scott — Product / Product Lead Agent

### Community 16 - "Tasks"
Cohesion: 0.07
Nodes (24): Context, Context-cost baseline, Coverage inventory, Decisions, Design, Goals / Non-Goals, Migration Plan, Risks / Trade-offs (+16 more)

### Community 19 - "Inventário completo por grupo"
Cohesion: 0.05
Nodes (40): Achados de documentação a preservar, Como interpretar as tabelas, Continuação em uma sessão por grupo, Fontes, recorte e verificação, G01 — UI, UX e acessibilidade, G02 — Motion de interfaces, G03 — Frontend web e ferramentas, G04 — Mobile e interfaces nativas (+32 more)

### Community 23 - "cli.test.js"
Cohesion: 0.10
Nodes (20): forbiddenStep(), parseTool(), backups(), claudeDir(), CLI, CORE, FORWARDER(), isolatedEnv() (+12 more)

### Community 25 - "Proposal"
Cohesion: 0.05
Nodes (38): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why, ADDED Requirements (+30 more)

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
Cohesion: 0.09
Nodes (21): Codex, Codex and OpenCode, Events it must be registered for, Glob dialect: gitignore-like, not gitignore, Hooks and gates, It fails open, Known gaps, OpenCode (+13 more)

### Community 30 - "ADDED Requirements"
Cohesion: 0.09
Nodes (22): ADDED Requirements, Purpose, Requirement: Actionable native remediation and honest entry-point scope, Requirement: Diagnostic severity preserves the existing exit contract, Requirement: Read-only multi-harness diagnosis, Requirement: Report effective conflicts without granting access, Requirement: Separate configuration from evidence, Scenario: Broken automatic security configuration (+14 more)

### Community 31 - "4. Universal layout + enforcement outside Claude Code (largest real gap)"
Cohesion: 0.31
Nodes (10): configuration(), copilotHome(), equalJson(), filesUnder(), installCatalog(), installSkills(), serializeSettings(), unwireTrackedHooks() (+2 more)

### Community 32 - "P0 — fechar os maiores gaps de evidência"
Cohesion: 0.12
Nodes (17): Casos iniciais, Critério de aceite, Critério de aceite, Critério de aceite, Dashboard, Depois, Fase 1 — Telemetria de contexto do main thread, Fase 2 — Fazer o routing eval validar `model` e `effort` (+9 more)

### Community 33 - "ADDED Requirements"
Cohesion: 0.09
Nodes (22): ADDED Requirements, Purpose, Requirement: HIGH handoff signals identify missing details for manual inspection, Requirement: Large candidate sets do not automate owner assignment, Requirement: Laya cannot replace Canonkit governance or direct evidence, Requirement: Laya receives only minimized task-relevant content, Requirement: Long-text assessment preserves uncertainty and attribution, Requirement: Practical adoption prioritizes quality without additional benchmark campaigns (+14 more)

### Community 34 - "doctor"
Cohesion: 0.10
Nodes (32): doctor(), install(), warnIgnoredCodexModel(), Choosing models, Codex, Codex hook (`--wire-hooks`), Commands, Core, at user level (+24 more)

### Community 35 - "hook-codex.test.js"
Cohesion: 0.14
Nodes (9): codexInput(), { evaluate, GATE_KINDS }, FIXTURES, FIXTURES_DIR, HOOKS_DIR, { normalizeCodex, parsePatch, codexOutput, CODEX_GATE_MODES }, patch(), REPO (+1 more)

### Community 36 - "Requirements"
Cohesion: 0.09
Nodes (22): laya-advisory-assessment Specification, Purpose, Requirement: HIGH handoff signals identify missing details for manual inspection, Requirement: Large candidate sets do not automate owner assignment, Requirement: Laya cannot replace Canonkit governance or direct evidence, Requirement: Laya receives only minimized task-relevant content, Requirement: Long-text assessment preserves uncertainty and attribution, Requirement: Practical adoption prioritizes quality without additional benchmark campaigns (+14 more)

### Community 37 - "decide"
Cohesion: 0.17
Nodes (13): 8. Small fixes from the audit, decide(), gitBypass(), gitCalls(), includedPathReason(), readEvents(), reportChars(), resumedStart() (+5 more)

### Community 38 - "check-enforced.mjs"
Cohesion: 0.11
Nodes (13): HOOK_FILES, require, setup(), warn(), adapters, BLOCKS, { GATE_KINDS, RECORD_KINDS }, known (+5 more)

### Community 39 - "updates"
Cohesion: 0.14
Nodes (13): patterns, prefix, default-days, actions, interval, updates, commit-message, cooldown (+5 more)

### Community 40 - "ADDED Requirements"
Cohesion: 0.05
Nodes (39): ADDED Requirements, Requirement: Composite-control inspection follows a reported risk, Requirement: Content states and flow outcomes are explicit, Requirement: Design decisions follow the product and existing direction, Requirement: Design handoffs are implementable and proportionate, Requirement: Interface skills are independently opt-in, Requirement: Motion preserves purpose access and stability, Requirement: Rendered review matches the changed experience (+31 more)

### Community 41 - "ADR 0005 — Contexto inflado se resolve com handoff manual"
Cohesion: 0.10
Nodes (18): ADR 0004 — Só harnesses que rodam o time em qualidade plena, Alternativas consideradas, Consequências aceitas, Contexto, Decisão, ADR 0005 — Contexto inflado se resolve com handoff manual, Alternativas consideradas, Consequências aceitas (+10 more)

### Community 42 - "main"
Cohesion: 0.15
Nodes (17): Native controls and optional hooks, Returning to native approvals, The core: `evaluate(evt, env)`, Evidence available today, canonkit 2.1.0, For users, Internal, Next (+9 more)

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
Cohesion: 0.09
Nodes (22): ADDED Requirements, Purpose, Requirement: Composite controls preserve one interaction target, Requirement: Interface and gameplay states remain distinct, Requirement: LOW changes remain proportionate, Requirement: Nova provides UI-first visual direction, Requirement: Pixie owns UX and accessibility, Requirement: Shared decisions have distinct owners (+14 more)

### Community 51 - "Fase 4 — OpenSpec como artefato durável do change lifecycle"
Cohesion: 0.18
Nodes (11): Caminho sugerido, Critério de aceite, Critério de aceite, Fase 4 — OpenSpec como artefato durável do change lifecycle, Fase 6 — Reavaliar o trust boundary dos hooks do Graphify, Fluxo desejado, Implementação provável, Objetivo (+3 more)

### Community 52 - "canonkit-hook.test.js"
Cohesion: 0.19
Nodes (11): activity(), decide(), HOOK, hookEnv(), inProject(), logged(), pre(), readLog() (+3 more)

### Community 53 - "configFor"
Cohesion: 0.57
Nodes (7): configFor(), isWithin(), locateConfig(), normalizePath(), onProject(), projectPath(), samePath()

### Community 54 - "StackPackStore"
Cohesion: 0.19
Nodes (11): absent(), bytes(), catalog(), digest(), exists(), object(), PACKAGE_ROOT, safePath() (+3 more)

### Community 55 - "Implementar Out-of-Scope Issue Capture no CanonKit"
Cohesion: 0.08
Nodes (25): 10. Orçamento de contexto, 11.1. Verificações determinísticas, 11.2. Verificações documentais, 11.3. Cenários comportamentais, 11. Testes e critérios de aceitação, 12. Documentação, 13. Entregáveis, 1. Investigar a arquitetura existente (+17 more)

### Community 56 - "Priority list"
Cohesion: 0.14
Nodes (15): installHooks(), 1. CI on three OS, 2. Provenance and secret scan, 3. Review-noise to 10, 4. Universal layout + enforcement outside Claude Code (largest real gap), 5. Uninstall, 6. Learning loop (the user's view of memory), 7. Stack packs, opt-in per project (+7 more)

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
Cohesion: 0.15
Nodes (13): Briefing scratch work, Briefing verification, Compact continuity and finalization, Evidence-based completion, Experimental Laya checks on HIGH handoffs, Incidental findings, Integration Review, Naming the model and effort (+5 more)

### Community 61 - "Learning loop"
Cohesion: 0.33
Nodes (6): Evaluate and decide, General contributions, Investigate, Learning loop, Privacy, Review and expiry

### Community 62 - "unknown"
Cohesion: 0.11
Nodes (20): discoverModels(), parseCodexModels(), unknown(), refresh(), Constraints, Evidence gathered (verify before relying on it), First steps, Goal (+12 more)

### Community 63 - "ADDED Requirements"
Cohesion: 0.05
Nodes (37): ADDED Requirements, Purpose, Requirement: Claude Code dispatches carry the effective choice, Requirement: Discovery degrades to unknown, never to failure, Requirement: Discovery is explicit and contained, Requirement: Doctor reports drift without failing, Requirement: Inspect effective choices, Requirement: Install applies resolved choices where verified (+29 more)

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
Cohesion: 0.14
Nodes (14): Requirement: Evidence-qualified completion, Requirement: Honest offline evidence, Requirement: Hypothesis-driven debugging, Requirement: Selective regression-first testing, Requirement: Two aspects within existing review, Requirements, Scenario: Code changed after a passing test, Scenario: Green tests miss the requirement (+6 more)

### Community 68 - "isObject"
Cohesion: 0.28
Nodes (13): asksNotInEffect(), decidesShell(), deniesShell(), isDeny(), isObject(), isOurHook(), mentionsHook(), reportHookWiring() (+5 more)

### Community 70 - "Job A — review fixes (2026-10-21)"
Cohesion: 0.18
Nodes (12): Backlog (not job A), Blockers (fix first, test-first), Contract items (Archie), Decision needed from the user (Gard P2 #5), Job A — review fixes (2026-10-21), Release notes (draft, for the version bump — jobs A + B), Round 3 candidates (all LOW, optional; any hook edit needs a fresh review), Status (2026-10-21, second session) (+4 more)

### Community 71 - "Go"
Cohesion: 0.29
Nodes (6): Establish the project, Go, Implementation and diagnosis, Security when relevant, Team boundary, Verify the changed boundary

### Community 72 - "README.md"
Cohesion: 0.11
Nodes (15): C++, Establish the project, Implementation and diagnosis, Team boundary, Verify the changed boundary, C# / .NET, Establish the project, Implementation and diagnosis (+7 more)

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

### Community 77 - "model-discovery.js"
Cohesion: 0.11
Nodes (25): ADAPTERS, applyClaudePolicy(), availableModelsIn(), CLAUDE_DOCUMENTED_ALIASES, claudeModelPolicy(), discover(), HARNESSES, inside() (+17 more)

### Community 79 - "model-config.js"
Cohesion: 0.24
Nodes (10): APPLIED, checkEntry(), empty(), FIELDS, readChoices(), refuseProjectLinks(), setChoice(), SOURCES (+2 more)

### Community 80 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, eval, eval:quality, pack:dry, prepublishOnly, test, validate, validate:full (+1 more)

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

### Community 96 - "models-command.test.js"
Cohesion: 0.20
Nodes (7): claudeRunner(), CLI, codexRunner(), HELP, NOW, ok(), REPO

### Community 100 - "copilot-setup-steps"
Cohesion: 0.11
Nodes (17): permissions, runs-on, steps, timeout-minutes, jobs, copilot-setup-steps, name, on (+9 more)

### Community 101 - "ui-focused-visual-workflow/design.md"
Cohesion: 0.18
Nodes (6): Purpose, Spec Delta, Purpose, Spec Delta, engineering-delivery Specification, Purpose

### Community 102 - "ADDED Requirements"
Cohesion: 0.17
Nodes (11): ADDED Requirements, Purpose, Requirement: Compact resumable handoff, Requirement: Safe finalization, Requirement: Task-scoped delegation, Scenario: Implementation is ready for review, Scenario: Incomplete handoff, Scenario: Independent narrow task (+3 more)

### Community 103 - "Requirements"
Cohesion: 0.17
Nodes (11): context-continuity Specification, Purpose, Requirement: Compact resumable handoff, Requirement: Safe finalization, Requirement: Task-scoped delegation, Requirements, Scenario: Implementation is ready for review, Scenario: Incomplete handoff (+3 more)

### Community 104 - "models-command.js"
Cohesion: 0.18
Nodes (23): projectConfigPath(), resolve(), userConfigPath(), Aborted, askEntry(), day(), effective(), inspectCodexProjectFiles() (+15 more)

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

### Community 111 - "validate-python.py"
Cohesion: 0.06
Nodes (34): Do not version, Editing an agent, File format, Global install receipts, Maintaining canonkit, Product-neutral examples, Stack packs, Validation (+26 more)

### Community 112 - "Tasks"
Cohesion: 0.25
Nodes (8): Accepted V/L traceability, Context measurements, Document checks, Implementation evidence — 2026-11-09 (current working tree), Independent reviews (final implementation), Integration Review, Preserved incidental finding, Spec scenario coverage

### Community 113 - "contextReminder"
Cohesion: 0.38
Nodes (7): contextBands(), contextReminder(), currentContextTokens(), num(), scanTranscript(), transcriptUsage(), usageTotals()

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

### Community 118 - "highRisk"
Cohesion: 0.38
Nodes (7): highRisk(), isAbsolutePath(), isNoise(), isPerfBudget(), isTestFile(), namesAuth(), projectAdds()

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

### Community 129 - "Java"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, Java, Team boundary, Verify the changed boundary

### Community 130 - "Handoff: Laya version check, eval rerun, and new-resource exploration"
Cohesion: 0.25
Nodes (7): CanonKit rules to respect, First steps for the new session, Goal, Handoff: Laya version check, eval rerun, and new-resource exploration, New resources to try (verify exposure in 0.4.30 MCP), Prior evidence (this session, 2026-11-09), Prior score snapshot

### Community 131 - "canonkit-opencode.js"
Cohesion: 0.26
Nodes (10): inputOf(), isObj(), normalizeOpencode(), onExecuteBefore(), onShellCreate(), OPENCODE_GATE_MODES, opencodeDecision(), opencodeEnv() (+2 more)

### Community 132 - "Requirement: Network authorization remains outside repository control"
Cohesion: 0.40
Nodes (5): Requirement: Network authorization remains outside repository control, Scenario: A dependency registry is suggested, Scenario: Harness merges a repository expansion, Scenario: Strict sandbox network configuration, Scenario: Unsandboxed or separate network tool

### Community 133 - "Requirement: Repository data boundary and limited exceptions"
Cohesion: 0.40
Nodes (5): Requirement: Repository data boundary and limited exceptions, Scenario: Another project is opened later, Scenario: File-tool controls are version-dependent, Scenario: Shell reads need separate restrictions, Scenario: Windows drives and links

### Community 134 - "openspec-explore/SKILL.md"
Cohesion: 0.13
Nodes (15): context(), Round 3 (2026-10-21, third session) — items 1–4 applied, tests first, Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, Planning a Change (+7 more)

### Community 135 - "slash"
Cohesion: 0.21
Nodes (14): codexCommand(), codexHooksDir(), copyKeepingLocal(), installCodexHooks(), installDashboard(), isOurCodexHook(), readCodexHooksForWiring(), readHooksFileForWiring() (+6 more)

### Community 136 - "Interface design"
Cohesion: 0.25
Nodes (7): Evidence and handoff, Interface design, M1 — Direction and concrete finish, M2 — States and promised outcomes, M3 — Design for actual content and operation, M4 — Purposeful and stable motion, Scope and authority

### Community 138 - "Releasing canonkit"
Cohesion: 0.40
Nodes (4): One-time setup (account owner), Release, Releasing canonkit, When it fails

### Community 139 - "Requirement: The approved strict network setting has trusted global scope"
Cohesion: 0.40
Nodes (5): Requirement: The approved strict network setting has trusted global scope, Scenario: Existing strict network setting, Scenario: Other harnesses selected, Scenario: Strict network configuration without hook wiring, Scenario: Unsupported or unknown version

### Community 140 - "Tasks"
Cohesion: 0.29
Nodes (7): 1. UI-first ownership and agent guidance, 2. Optional skills and compatible project distribution, 3. Integration, independent review and delivery evidence, G01–G03 planning revision — 2026-11-09, Planning evidence, Tasks, Workflow follow-up

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

### Community 157 - "uninstall.test.js"
Cohesion: 0.18
Nodes (5): CLI, manifest(), manifestFile(), markers, store()

### Community 158 - "Tasks"
Cohesion: 0.15
Nodes (13): projectRoot(), 10.3 Closure evidence (2026-11-10), 10. Setup interface (user feedback, 2026-11-10), 1. Start clean from the superseded edits, 3. Discovery, 4. Choices: storage and resolution, 6. Claude Code application, 7. Doctor (+5 more)

### Community 160 - "canonkit 2.4.0"
Cohesion: 0.67
Nodes (3): canonkit 2.4.0, For users, Verification and limits

### Community 161 - "stack-packs.test.js"
Cohesion: 0.20
Nodes (5): CLI, REPO, roots, setup(), snapshot()

### Community 162 - "projectConfig"
Cohesion: 0.33
Nodes (6): Decisions (conditions to implement), Job B — doctor + install --wire-hooks + Stop gate (2026-10-21), Scope, Status, cap(), projectConfig()

### Community 163 - "tool"
Cohesion: 0.05
Nodes (40): ADR 0001 — `canonkit tool`: um namespace próprio, que só integra, Alternativas consideradas, Consequências aceitas, Contexto, Decisão, Publisher e pin — o que foi verificado (2026-10-19), Revisar quando, ADR 0002 — Hooks Git do Graphify por opt-in (+32 more)

### Community 164 - "addSpecialists"
Cohesion: 0.60
Nodes (5): addSpecialists(), choiceFor(), codexChoiceFor(), installProjectCodex(), catalogPath()

### Community 165 - "Handoff: verificação proporcional (quando rodar a suíte completa)"
Cohesion: 0.29
Nodes (6): Ajustes sugeridos na sessão de origem, Evidência da sessão de origem, Handoff: verificação proporcional (quando rodar a suíte completa), Objetivo, Regra proposta pela pessoa, Restrições conhecidas

### Community 166 - "Proposal"
Cohesion: 0.29
Nodes (6): Capabilities, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 167 - "opencodeDir"
Cohesion: 0.36
Nodes (9): asksByHand(), installOpencodeHooks(), opencodeAgentsDir(), opencodeConfigPath(), opencodeDir(), opencodeHooksDir(), opencodePluginPath(), readOpencodeConfigForWiring() (+1 more)

### Community 170 - "Handoff — canonkit improvements, by priority (2026-10-29)"
Cohesion: 0.40
Nodes (5): Decisions already made by the user, First step for the next session, Handoff — canonkit improvements, by priority (2026-10-29), Parameters this list does not move, Rubric follow-ups (instruction-audit, not canonkit)

### Community 171 - "Game art direction"
Cohesion: 0.33
Nodes (5): Authority and scope, Establish the direction and viewing context, Findings and evidence, Game art direction, Review the relevant surfaces

### Community 172 - "Rust"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, Rust, Team boundary, Verify the changed boundary

### Community 173 - "claudeAgent"
Cohesion: 0.40
Nodes (4): claudeAgent(), Claude Code agent frontmatter: `model` and `effort` (task 6.2, part of 9.2), Evidence, Real dispatch with the value from `models show` (task 9.2)

### Community 174 - "OpenCode as a third install target (2026-10-26)"
Cohesion: 0.40
Nodes (4): Decisions, Facts checked against the docs (2026-10-26), OpenCode as a third install target (2026-10-26), Phase 2 (later, after testing in practice)

### Community 175 - "tools.md"
Cohesion: 0.17
Nodes (9): Before dispatch and after return, Invocation evidence and learning from use, Laya advice in practical HIGH handoffs, Requests, Tools for matching inputs, Choose the destination and prepare drafts, Incidental findings and project issues, Obtain authorization and publish (+1 more)

### Community 176 - "Keeping findings outside the current task"
Cohesion: 0.50
Nodes (4): Availability and evidence limits, Example: two findings during an unrelated plan, Keeping findings outside the current task, Review and publication

### Community 177 - "prompts"
Cohesion: 0.50
Nodes (4): chooseTargets(), dependencies, prompts@2.4.2, prompts

### Community 178 - "canonkit 2.2.0"
Cohesion: 0.67
Nodes (3): canonkit 2.2.0, Internal, Next

### Community 179 - "canonkit 2.5.0"
Cohesion: 0.67
Nodes (3): canonkit 2.5.0, For users, Verification and limits

### Community 180 - "repository"
Cohesion: 0.67
Nodes (3): repository, type, url

## Knowledge Gaps
- **1 isolated node(s):** `ADR-0006`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1197 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Known dead ends** — questions that led nowhere; don't re-derive.
- "quais desses ajustes ainda fazem sentido?" -> `scanTranscript()`, `transcriptUsage()`
- "agora falta o passo 9 do handoff!" -> `Hooks`, `HOOK`

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `doctor()` connect `doctor` to `install`, `cli.js`, `openspec-explore/SKILL.md`, `slash`, `install`, `cli.test.js`, `Proposal`, `Hooks and gates`, `ADDED Requirements`, `Tasks`, `projectConfig`, `addSpecialists`, `Proposal`, `opencodeDir`, `ADR 0005 — Contexto inflado se resolve com handoff manual`, `install.md`, `canonkit`, `main`, `claudeAgent`, `Requirements`, `canonkit 2.2.0`, `unknown`, `ADDED Requirements`, `isObject`, `Job A — review fixes (2026-10-21)`, `model-config.js`, `models-command.js`, `validate-python.py`, `Proposal`?**
  _High betweenness centrality (0.158) - this node is a cross-community bridge._
- **Are the 53 inferred relationships involving `doctor()` (e.g. with `mentionsHook()` and `ruleText()`) actually correct?**
  _`doctor()` has 53 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ADR-0006` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `install` be split into smaller, more focused modules?**
  _Cohesion score 0.13048780487804879 - nodes in this community are weakly interconnected._
- **Why does `install()` connect `doctor` to `install`, `cli.js`, `slash`, `install`, `exec.js`, `cli.test.js`, `Hooks and gates`, `Tasks`, `2.3.0.md`, `canonkit 2.4.0`, `tool`, `addSpecialists`, `opencodeDir`, `ADR 0005 — Contexto inflado se resolve com handoff manual`, `main`, `canonkit`, `Stack packs — implementation plan`, `Priority list`, `Jobs, in order`, `unknown`, `ADDED Requirements`, `Job A — review fixes (2026-10-21)`, `model-config.js`, `Decisions`, `models-command.js`, `validate-python.py`, `Proposal`?**
  _High betweenness centrality (0.153) - this node is a cross-community bridge._
- **Are the 38 inferred relationships involving `install()` (e.g. with `Publisher e pin — o que foi verificado (2026-10-19)` and `Decisão`) actually correct?**
  _`install()` has 38 INFERRED edges - model-reasoned connections that need verification._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
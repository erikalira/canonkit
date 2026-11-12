# Graph Report - canonkit  (2026-11-12)

## Corpus Check
- 240 files · ~488,512 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 6, .jsonc 1)

## Summary
- 2724 nodes · 4686 edges · 199 communities (174 shown, 25 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 337 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1a38c7a2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- security.js
- package.json
- cli.js
- Subagents
- with
- Pixie — UX / Design Agent
- ref_node_path
- canonkit-hook.js
- serve.js
- InstallManifest
- eval-quality.mjs
- publish
- installDistribution
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
- cli-harness.js
- routing-block.md
- ADDED Requirements
- Q: Como avaliar de 0 a 10 a qualidade e o ROI das instrucoes instaladas pelo canonkit?
- hook-core.test.js
- hook-opencode.test.js
- Hooks and gates
- ADDED Requirements
- install
- P0 — fechar os maiores gaps de evidência
- ADDED Requirements
- Installation reference
- hook-codex.test.js
- Requirements
- cli-install.test.js
- check-enforced.mjs
- updates
- Requirements
- ADR 0005 — Contexto inflado se resolve com handoff manual
- allow
- canonkit
- ADDED Requirements
- CANONKIT_ROADMAP.md
- The team
- Requirements
- Evals
- ADDED Requirements
- Echo — Audio / Sound Design Agent
- Fase 4 — OpenSpec como artefato durável do change lifecycle
- canonkit-hook.test.js
- configFor
- ADDED Requirements
- ADDED Requirements
- 4. Universal layout + enforcement outside Claude Code (largest real gap)
- Requirements
- StackPackStore
- ADDED Requirements
- Orchestrate
- Learning loop
- ADDED Requirements
- Requirements
- doctor
- Ordem sugerida
- Fase 5 — Freshness explícita do Graphify
- Requirements
- isObject
- Virgo — Agent Team Maintainer
- Requirements
- Go
- README.md
- Kotlin
- Swift
- Fase 8 — Gate quantitativo para Caveman / Shunt
- Learning from mistakes
- model-discovery.js
- Pipe — DevOps / Platform / Operations Agent
- ADDED Requirements
- Tasks
- Requirements
- validate.mjs
- Fase 7 — Testar a “solution ladder” antes de adicioná-la ao Bob
- Python
- Q: quais desses ajustes ainda fazem sentido?
- Q: agora falta o passo 9 do handoff!
- Requirements
- Tasks
- Decisions
- ref_node_child_process
- ADDED Requirements
- Project tools: graphify and openspec
- Decisions
- Tasks
- AGENTS.md
- slash
- Handoff — conhecimentos das skills do ECC para revisão no CanonKit
- copilot-setup-steps
- Decisions
- ADDED Requirements
- Requirements
- models-command.js
- Requirements
- Design
- codexAgent
- P5 — evidência de resultado: do sinal à correção
- ADDED Requirements
- install-report.js
- validate-python.py
- unknown
- decide
- OpenSpec Agent
- migrateClaudeHooks
- product-discovery Specification
- Proposal
- Context contributors
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
- Proposal
- Handoff: Laya version check, eval rerun, and new-resource exploration
- canonkit-opencode.js
- Requirement: Network authorization remains outside repository control
- Requirement: Repository data boundary and limited exceptions
- openspec-explore/SKILL.md
- Proposal
- Interface design
- codex-block.md
- Proposal
- Requirement: The approved strict network setting has trusted global scope
- ADR 0001 — `canonkit tool`: um namespace próprio, que só integra
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
- highRisk
- Proposal
- 2.3.0.md
- canonkit 2.4.0
- renderDoctorReport
- Proposal
- Go
- Go
- React
- React
- Requirement: Person chooses from the discovered list
- validate.sh script
- install.md
- Handoff — canonkit improvements, by priority (2026-10-29)
- Tasks
- Rust
- ADR 0006 — Modelo e effort escolhidos pela pessoa, a partir do que o harness informa
- Requirement: Codex discovery reports models and their own efforts
- tools.md
- Keeping findings outside the current task
- canonkit 3.0.0
- Requirement: Codex generated agents apply resolved choices
- Requirement: Codex setup ties effort to the chosen model
- Spencer — Documentation / Knowledge Steward Agent
- Requirement: User and project configuration with override
- React
- Quinn — Quality / QA / Test Strategy Agent
- model-selection Specification
- opencode-plugin.mjs
- orchestrate/SKILL.md
- Requirement: Claude Code dispatches carry the effective choice
- Requirement: Discovery degrades to unknown, never to failure
- Requirement: Vendor-neutral agent need level
- Requirement: Project configuration stays inside the project
- Requirement: Runtime discovery per harness
- PROVENANCE.md
- contextReminder
- Fase 12 — Capturar feedback real e vinculá-lo à hipótese de produto
- C# / .NET
- TypeScript
- Fase 15 — Medir latência da interação e custo por tarefa concluída

## God Nodes (most connected - your core abstractions)
1. `doctor()` - 94 edges
2. `install()` - 61 edges
3. `installDistribution()` - 34 edges
4. `Inventário completo por grupo` - 29 edges
5. `InstallManifest` - 27 edges
6. `decide()` - 26 edges
7. `unknown()` - 23 edges
8. `Pipe — DevOps / Platform / Operations Agent` - 23 edges
9. `securityDiagnosis()` - 22 edges
10. `toolAdd()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Publisher e pin — o que foi verificado (2026-10-19)` --references--> `install()`  [INFERRED]
  docs/adr/0001-tool-namespace-integrate-only.md → bin/cli.js
- `Upgrading from `meu-time`` --references--> `install()`  [INFERRED]
  docs/install.md → bin/cli.js
- `Editing an agent` --references--> `install()`  [INFERRED]
  docs/maintaining.md → bin/cli.js
- `For users` --references--> `install()`  [INFERRED]
  docs/release-notes/2.1.0.md → bin/cli.js
- `For users` --references--> `install()`  [INFERRED]
  docs/release-notes/2.3.0.md → bin/cli.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Agents holding domain veto authority** — agents_archie_archie, agents_gard_gard, agents_scott_scott, agents_pixie_pixie, agents_quinn_quinn, agents_spencer_spencer, agents_dana_dana, agents_maya_maya, agents_nova_nova, agents_echo_echo [EXTRACTED 1.00]
- **Smallest-sufficient-solution doctrine across domains** — agents_archie_smallest_sufficient_architecture, agents_bob_smallest_correct_change, agents_scott_mvp, agents_gard_mitigation_priority, agents_dana_governing_principle, agents_spencer_minimum_structures [INFERRED 0.85]
- **Shared LOW/MEDIUM/HIGH risk triage protocol** — agents_archie_risk_classification, agents_bob_implementation_protocol, agents_gard_mitigation_priority, agents_quinn_test_strategy, agents_pipe_rollback_plan, agents_dana_experiment_protocol, agents_maya_core_loop, agents_nova_visual_language, agents_echo_mix_hierarchy, agents_pixie_interface_states [INFERRED 0.95]

## Communities (199 total, 25 thin omitted)

### Community 0 - "security.js"
Cohesion: 0.16
Nodes (26): prepareSecurity(), scopedSecurityManifest(), securityDiagnosis(), absent(), assessClaude(), atLeast(), classifyEnvironment(), collectEnvironment() (+18 more)

### Community 1 - "package.json"
Cohesion: 0.06
Nodes (35): author, bin, canonkit, bugs, url, dependencies, prompts, description (+27 more)

### Community 2 - "cli.js"
Cohesion: 0.05
Nodes (57): AGENTS_DIR, applyBlock(), applyBlockLf(), AUTHORITIES, CLAUDE_MD, CODEX, confirm(), DASHBOARD_DIR (+49 more)

### Community 3 - "Subagents"
Cohesion: 0.14
Nodes (13): Branches, Core team — installed at user level (`~/.claude/agents`), Domain specialists — installed per project (the repository's `.claude/agents/`), Durable preferences, HIGH-risk surfaces and who owns them, Images, Incidental findings, New session when the subject changes (+5 more)

### Community 4 - "with"
Cohesion: 0.05
Nodes (40): concurrency, cancel-in-progress, group, run, SHA256, VERSION, jobs, secrets (+32 more)

### Community 6 - "ref_node_path"
Cohesion: 0.08
Nodes (14): REPO, SCRIPT, repo, roots, snapshot(), command(), claudeRunner(), codexRunner() (+6 more)

### Community 7 - "canonkit-hook.js"
Cohesion: 0.08
Nodes (31): CATCH_ALL_SAMPLES, CLAUDE_GATE_MODES, CMD_PREFIX, CMD_PREFIX_VALUE, CONFIG_KEYS, DEFAULT_BANDS, fs, GATE_KINDS (+23 more)

### Community 8 - "serve.js"
Cohesion: 0.07
Nodes (41): addTo(), agentStatus(), contextContributors(), dispatches(), fs, HTML, http, json() (+33 more)

### Community 9 - "InstallManifest"
Cohesion: 0.08
Nodes (35): absent(), atomic(), digest(), exclusivePrivate(), InstallManifest, read(), regularPath(), removeManagedBlock() (+27 more)

### Community 10 - "eval-quality.mjs"
Cohesion: 0.13
Nodes (34): PACKAGE_ROOT, readStackPack(), STACK_PACK_IDS, TARGETS, validateStackPacks(), agentDefinition(), CASES, EXPECT_KEYS (+26 more)

### Community 11 - "publish"
Cohesion: 0.07
Nodes (27): concurrency, cancel-in-progress, group, jobs, publish, test, name, on (+19 more)

### Community 12 - "installDistribution"
Cohesion: 0.13
Nodes (33): changeProject(), claudeHome(), codexHome(), codexHooksPath(), copilotAgentsDir(), copilotHome(), copyKeepingLocal(), core() (+25 more)

### Community 13 - "exec.js"
Cohesion: 0.10
Nodes (45): activeTools(), getTool(), gitHooksPreflight(), loud(), plain(), printMissing(), readTools(), refuseOpencodeBelow2() (+37 more)

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
Cohesion: 0.07
Nodes (27): G01 — UI, UX e acessibilidade, G02 — Motion de interfaces, G03 — Frontend web e ferramentas, G04 — Mobile e interfaces nativas, G06 — Arquitetura, APIs e frameworks backend, G07 — Bancos, ORM e migrações, G08 — Testes, regressão e verificação, G09 — Segurança, permissões e supply chain (+19 more)

### Community 23 - "cli-harness.js"
Cohesion: 0.08
Nodes (26): Validation, home, accessOf(), assertPrivate(), fixture(), POWERSHELL, SYSTEM, win32Only (+18 more)

### Community 25 - "ADDED Requirements"
Cohesion: 0.05
Nodes (39): 1. Specify the behavior that exists; do not change code, 2. Generate the legacy fixture from the real baseline module, 3. Reuse the existing e2e suite and harness, 4. Verify documentation, edit only on contradiction, Context, Decisions, Design, Goals / Non-Goals (+31 more)

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

### Community 31 - "install"
Cohesion: 0.13
Nodes (19): applyClaudeUserPlan(), install(), optionalBytes(), readHooksFileForWiring(), readSettingsForWiring(), securityDigest(), settingsPath(), warnIgnoredCodexModel() (+11 more)

### Community 32 - "P0 — fechar os maiores gaps de evidência"
Cohesion: 0.12
Nodes (17): Casos iniciais, Critério de aceite, Critério de aceite, Critério de aceite, Dashboard, Depois, Fase 1 — Telemetria de contexto do main thread, Fase 2 — Fazer o routing eval validar `model` e `effort` (+9 more)

### Community 33 - "ADDED Requirements"
Cohesion: 0.09
Nodes (22): ADDED Requirements, Purpose, Requirement: HIGH handoff signals identify missing details for manual inspection, Requirement: Large candidate sets do not automate owner assignment, Requirement: Laya cannot replace Canonkit governance or direct evidence, Requirement: Laya receives only minimized task-relevant content, Requirement: Long-text assessment preserves uncertainty and attribution, Requirement: Practical adoption prioritizes quality without additional benchmark campaigns (+14 more)

### Community 34 - "Installation reference"
Cohesion: 0.12
Nodes (16): Choosing models, Commands, Diagnosis and conservative reversal, Environment and version coverage, GitHub Copilot, Installation reference, Native security, per repository, Network and separate tools (+8 more)

### Community 35 - "hook-codex.test.js"
Cohesion: 0.14
Nodes (9): codexInput(), { evaluate, GATE_KINDS }, FIXTURES, FIXTURES_DIR, HOOKS_DIR, { normalizeCodex, parsePatch, codexOutput, CODEX_GATE_MODES }, patch(), REPO (+1 more)

### Community 36 - "Requirements"
Cohesion: 0.09
Nodes (22): laya-advisory-assessment Specification, Purpose, Requirement: HIGH handoff signals identify missing details for manual inspection, Requirement: Large candidate sets do not automate owner assignment, Requirement: Laya cannot replace Canonkit governance or direct evidence, Requirement: Laya receives only minimized task-relevant content, Requirement: Long-text assessment preserves uncertainty and attribution, Requirement: Practical adoption prioritizes quality without additional benchmark campaigns (+14 more)

### Community 37 - "cli-install.test.js"
Cohesion: 0.17
Nodes (27): copilotAgent(), HOOK_FILES, readAgents(), 2. Need levels in agent sources, dangling(), setup(), wsl(), backups() (+19 more)

### Community 38 - "check-enforced.mjs"
Cohesion: 0.14
Nodes (9): adapters, BLOCKS, { GATE_KINDS, RECORD_KINDS }, known, listed, out, REPO, requireCjs (+1 more)

### Community 39 - "updates"
Cohesion: 0.14
Nodes (13): patterns, prefix, default-days, actions, interval, updates, commit-message, cooldown (+5 more)

### Community 40 - "Requirements"
Cohesion: 0.05
Nodes (41): interface-design-workflow Specification, Purpose, Requirement: Composite-control inspection follows a reported risk, Requirement: Content states and flow outcomes are explicit, Requirement: Design decisions follow the product and existing direction, Requirement: Design handoffs are implementable and proportionate, Requirement: Interface skills are independently opt-in, Requirement: Motion preserves purpose access and stability (+33 more)

### Community 41 - "ADR 0005 — Contexto inflado se resolve com handoff manual"
Cohesion: 0.14
Nodes (11): ADR 0004 — Só harnesses que rodam o time em qualidade plena, Alternativas consideradas, Consequências aceitas, Contexto, Decisão, ADR 0005 — Contexto inflado se resolve com handoff manual, Alternativas consideradas, Consequências aceitas (+3 more)

### Community 42 - "allow"
Cohesion: 0.15
Nodes (17): Native controls and optional hooks, Returning to native approvals, The core: `evaluate(evt, env)`, Native approval modes stay native, canonkit 2.1.0, For users, Internal, Next (+9 more)

### Community 43 - "canonkit"
Cohesion: 0.15
Nodes (13): canonkit, Commands, Documentation, FAQ, How it decides: LOW vs HIGH, If no gate ever fires, License, Risk and scale are two different questions (+5 more)

### Community 44 - "ADDED Requirements"
Cohesion: 0.05
Nodes (39): ADDED Requirements, Requirement: Composite-control inspection follows a reported risk, Requirement: Content states and flow outcomes are explicit, Requirement: Design decisions follow the product and existing direction, Requirement: Design handoffs are implementable and proportionate, Requirement: Interface skills are independently opt-in, Requirement: Motion preserves purpose access and stability, Requirement: Rendered review matches the changed experience (+31 more)

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
Cohesion: 0.05
Nodes (37): ADDED Requirements, Purpose, Requirement: Claude Code dispatches carry the effective choice, Requirement: Discovery degrades to unknown, never to failure, Requirement: Discovery is explicit and contained, Requirement: Doctor reports drift without failing, Requirement: Inspect effective choices, Requirement: Install applies resolved choices where verified (+29 more)

### Community 51 - "Fase 4 — OpenSpec como artefato durável do change lifecycle"
Cohesion: 0.18
Nodes (11): Caminho sugerido, Critério de aceite, Critério de aceite, Fase 4 — OpenSpec como artefato durável do change lifecycle, Fase 6 — Reavaliar o trust boundary dos hooks do Graphify, Fluxo desejado, Implementação provável, Objetivo (+3 more)

### Community 52 - "canonkit-hook.test.js"
Cohesion: 0.26
Nodes (11): activity(), decide(), HOOK, hookEnv(), inProject(), logged(), pre(), project() (+3 more)

### Community 53 - "configFor"
Cohesion: 0.31
Nodes (11): configFor(), isObj(), isWithin(), loadConfig(), locateConfig(), normalizePath(), onProject(), projectPath() (+3 more)

### Community 54 - "ADDED Requirements"
Cohesion: 0.13
Nodes (15): ADDED Requirements, Purpose, Requirement: Codex discovery reports models and their own efforts, Requirement: Codex generated agents apply resolved choices, Requirement: Codex setup ties effort to the chosen model, Scenario: Catalog is available without login, Scenario: Choice is cleared, Scenario: Codex reports a catalog (+7 more)

### Community 55 - "ADDED Requirements"
Cohesion: 0.06
Nodes (30): ADDED Requirements, Purpose, Requirement: Absent access preserves current behavior, Requirement: Access is not a security boundary, Requirement: Claude Code translation, Requirement: Effective access is inspectable, Requirement: Harness field names reserved, Requirement: Other harnesses unaffected (+22 more)

### Community 56 - "4. Universal layout + enforcement outside Claude Code (largest real gap)"
Cohesion: 0.14
Nodes (15): 1. CI on three OS, 2. Provenance and secret scan, 3. Review-noise to 10, 4. Universal layout + enforcement outside Claude Code (largest real gap), 5. Uninstall, 6. Learning loop (the user's view of memory), 7. Stack packs, opt-in per project, 9. Leftovers (low value now) (+7 more)

### Community 57 - "Requirements"
Cohesion: 0.06
Nodes (30): agent-tool-access Specification, Purpose, Requirement: Absent access preserves current behavior, Requirement: Access is not a security boundary, Requirement: Claude Code translation, Requirement: Effective access is inspectable, Requirement: Harness field names reserved, Requirement: Other harnesses unaffected (+22 more)

### Community 58 - "StackPackStore"
Cohesion: 0.20
Nodes (10): absent(), bytes(), catalog(), digest(), exists(), object(), safePath(), samePath() (+2 more)

### Community 59 - "ADDED Requirements"
Cohesion: 0.12
Nodes (16): ADDED Requirements, Purpose, Requirement: Evidence-qualified completion, Requirement: Honest offline evidence, Requirement: Hypothesis-driven debugging, Requirement: Selective regression-first testing, Requirement: Two aspects within existing review, Scenario: Code changed after a passing test (+8 more)

### Community 60 - "Orchestrate"
Cohesion: 0.12
Nodes (16): Briefing by access level, Briefing scratch work, Briefing verification, Compact continuity and finalization, Evidence-based completion, Experimental Laya checks on HIGH handoffs, Incidental findings, Integration Review (+8 more)

### Community 61 - "Learning loop"
Cohesion: 0.22
Nodes (7): Learning proposal, Evaluate and decide, General contributions, Investigate, Learning loop, Privacy, Review and expiry

### Community 62 - "ADDED Requirements"
Cohesion: 0.08
Nodes (25): ADDED Requirements, Purpose, Requirement: ACL stubbing is test-only and absent from shipped code, Requirement: CLI spawns go through the shared harness, Requirement: Deterministic runtime discovery in CLI tests, Requirement: Fast tier for the inner loop, Requirement: Full suite remains the publish gate, Requirement: No wall-clock test budget (+17 more)

### Community 63 - "Requirements"
Cohesion: 0.08
Nodes (25): Purpose, Requirement: ACL stubbing is test-only and absent from shipped code, Requirement: CLI spawns go through the shared harness, Requirement: Deterministic runtime discovery in CLI tests, Requirement: Fast tier for the inner loop, Requirement: Full suite remains the publish gate, Requirement: No wall-clock test budget, Requirement: Real ACL coverage is retained on Windows (+17 more)

### Community 64 - "doctor"
Cohesion: 0.10
Nodes (29): asksByHand(), doctor(), Critério de aceite, Fase 14 — Explicitar a cobertura técnica por harness, Implementação provável, Problema, Codex, Codex hook (`--wire-hooks`) (+21 more)

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
Cohesion: 0.20
Nodes (18): asksNotInEffect(), configuration(), decidesShell(), deniesShell(), equalJson(), isDeny(), isObject(), isOurHook() (+10 more)

### Community 70 - "Requirements"
Cohesion: 0.09
Nodes (22): Purpose, Requirement: Composite controls preserve one interaction target, Requirement: Interface and gameplay states remain distinct, Requirement: LOW changes remain proportionate, Requirement: Nova provides UI-first visual direction, Requirement: Pixie owns UX and accessibility, Requirement: Shared decisions have distinct owners, Requirement: Skills do not create authority or mandatory dependencies (+14 more)

### Community 71 - "Go"
Cohesion: 0.29
Nodes (6): Establish the project, Go, Implementation and diagnosis, Security when relevant, Team boundary, Verify the changed boundary

### Community 72 - "README.md"
Cohesion: 0.11
Nodes (15): C++, Establish the project, Implementation and diagnosis, Team boundary, Verify the changed boundary, Authority and scope, Establish the direction and viewing context, Findings and evidence (+7 more)

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
Nodes (21): ADAPTERS, applyClaudePolicy(), availableModelsIn(), CLAUDE_DOCUMENTED_ALIASES, claudeModelPolicy(), HARNESSES, inside(), optionText() (+13 more)

### Community 79 - "ADDED Requirements"
Cohesion: 0.10
Nodes (20): ADDED Requirements, Requirement: Composite controls preserve one interaction target, Requirement: Interface and gameplay states remain distinct, Requirement: LOW changes remain proportionate, Requirement: Nova provides UI-first visual direction, Requirement: Pixie owns UX and accessibility, Requirement: Shared decisions have distinct owners, Requirement: Skills do not create authority or mandatory dependencies (+12 more)

### Community 80 - "Tasks"
Cohesion: 0.09
Nodes (22): 1. UI-first ownership and agent guidance, 2. Optional skills and compatible project distribution, 3. Integration, independent review and delivery evidence, Accepted V/L traceability, Context measurements, Current evidence (HEAD `2c603c3`; working tree clean apart from archive renames,, Decision (user, 2026-11-11), Document checks (+14 more)

### Community 81 - "Requirements"
Cohesion: 0.12
Nodes (16): game-art-direction Specification, Purpose, Requirement: Game-art knowledge is an optional project skill, Requirement: Game-art procedures load only for relevant surfaces, Requirement: Game-art procedures preserve domain boundaries, Requirement: Game-art review uses surface-specific visual criteria, Requirement: Knowledge availability does not fabricate a specialist, Requirements (+8 more)

### Community 82 - "validate.mjs"
Cohesion: 0.09
Nodes (47): ACCESS_LEVELS, accessProblem(), claudeRestriction(), describeRestriction(), READ_TOOLS, RESERVED_KEYS, reservedKeyOf(), claudeAgent() (+39 more)

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

### Community 87 - "Requirements"
Cohesion: 0.12
Nodes (16): Purpose, Requirement: A pack owns one skill copy per fixed project target, Requirement: An unowned destination at any target is a collision, Requirement: Downgrade guidance names every pack the newer CLI wrote, Requirement: Re-adding a legacy pack completes it without altering existing copies, Requirement: Receipts from the two-target CLI are read without migration, Requirement: Unknown receipt entries are still rejected, Requirements (+8 more)

### Community 88 - "Tasks"
Cohesion: 0.15
Nodes (12): 10.3 Closure evidence (2026-11-10), 10. Setup interface (user feedback, 2026-11-10), 1. Start clean from the superseded edits, 3. Discovery, 4. Choices: storage and resolution, 6. Claude Code application, 7. Doctor, 8. Guidance and documentation (+4 more)

### Community 89 - "Decisions"
Cohesion: 0.12
Nodes (15): Context, D1. `need: light|standard|deep` replaces `model:`, D2. Adapter interface, Claude adapter first, D3. Catalog separate from choices, D4. Field-wise resolution, D6. Project override reach, D7. When discovery runs, D8. Commands (+7 more)

### Community 90 - "ref_node_child_process"
Cohesion: 0.10
Nodes (5): { contextContributors, retainedTotals }, HOOK, SERVER, HERE, REPO

### Community 91 - "ADDED Requirements"
Cohesion: 0.14
Nodes (14): ADDED Requirements, Requirement: Game-art knowledge is an optional project skill, Requirement: Game-art procedures load only for relevant surfaces, Requirement: Game-art procedures preserve domain boundaries, Requirement: Game-art review uses surface-specific visual criteria, Requirement: Knowledge availability does not fabricate a specialist, Scenario: A game settings menu needs layout polish, Scenario: A visual proposal changes a reward rule (+6 more)

### Community 92 - "Project tools: graphify and openspec"
Cohesion: 0.22
Nodes (9): Before enabling the git hooks, canonkit integrates, it never installs, Experimental handoff checks, graphify, Keeping the graph fresh, Laya, openspec, Project tools: graphify and openspec (+1 more)

### Community 93 - "Decisions"
Cohesion: 0.13
Nodes (14): 1. One small security helper; existing CLI owns mutations, 2. Automatic best-supported default, existing strict requirements preserved, 3. Restrict each surface with its actual controls, 4. Network closed to new destinations; no stack-derived grants, 5. Separate repository security from global distribution and hook wiring, 6. Read-only diagnosis, evidence per harness, 7. Native-default upgrade migration (authorized 2026-11-09), Consultation and source evidence (+6 more)

### Community 94 - "Tasks"
Cohesion: 0.14
Nodes (13): 1. Environment evidence and capability selection, 2. Claude policy and native Windows profile, 3. Automatic installation and conservative undo, 4. Read-only diagnostics across harnesses, 5. Integration evidence and independent review, Archive decision — 2026-11-09, Hook-upgrade migration evidence, 2026-11-09, Implementation decisions and evidence (+5 more)

### Community 96 - "slash"
Cohesion: 0.26
Nodes (13): codexCommand(), codexHooksDir(), installCodexHooks(), isOurCodexHook(), legacyRunners(), pathKey(), readCodexHooksForWiring(), refuseUnquotableCodexPath() (+5 more)

### Community 97 - "Handoff — conhecimentos das skills do ECC para revisão no CanonKit"
Cohesion: 0.17
Nodes (12): Achados de documentação a preservar, Como interpretar as tabelas, Deltas propostos por destino, Fontes, recorte e verificação, Handoff — conhecimentos das skills do ECC para revisão no CanonKit, Mapa dos grupos, O que já está presente, sem confundir com paridade ECC, Objetivo e próximo passo (+4 more)

### Community 100 - "copilot-setup-steps"
Cohesion: 0.11
Nodes (17): permissions, runs-on, steps, timeout-minutes, jobs, copilot-setup-steps, name, on (+9 more)

### Community 101 - "Decisions"
Cohesion: 0.15
Nodes (13): 1. Keep Nova UI-first with explicit cross-media visual authority, 2. Clarify UX boundaries without transferring accessibility, 3. Provide three independent single-file skills, 4. Separate evidence collection from domain judgment, 5. Extend the catalog without changing pack storage, 6. Verify contracts and prepare behavioural evaluation separately, Context, Decisions (+5 more)

### Community 102 - "ADDED Requirements"
Cohesion: 0.17
Nodes (11): ADDED Requirements, Purpose, Requirement: Compact resumable handoff, Requirement: Safe finalization, Requirement: Task-scoped delegation, Scenario: Implementation is ready for review, Scenario: Incomplete handoff, Scenario: Independent narrow task (+3 more)

### Community 103 - "Requirements"
Cohesion: 0.17
Nodes (11): context-continuity Specification, Purpose, Requirement: Compact resumable handoff, Requirement: Safe finalization, Requirement: Task-scoped delegation, Requirements, Scenario: Implementation is ready for review, Scenario: Incomplete handoff (+3 more)

### Community 104 - "models-command.js"
Cohesion: 0.10
Nodes (49): addSpecialists(), choiceFor(), chooseTargets(), codexChoiceFor(), installProjectCodex(), main(), uninstallProject(), APPLIED (+41 more)

### Community 105 - "Requirements"
Cohesion: 0.15
Nodes (13): Requirement: Discovery is explicit and contained, Requirement: Doctor reports drift without failing, Requirement: Inspect effective choices, Requirement: Install applies resolved choices where verified, Requirement: Need levels are the recommended path, Requirement: No shipped cross-vendor equivalence, Requirements, Scenario: Choice removed from configuration (+5 more)

### Community 106 - "Design"
Cohesion: 0.18
Nodes (10): Choose tools for the real input, Context, Decisions, Design, Goals / Non-Goals, Keep the orchestrator as the control point, Learn through existing work evidence, Migration Plan (+2 more)

### Community 107 - "codexAgent"
Cohesion: 0.38
Nodes (7): codexAgent(), opencodeAgent(), tomlString(), usage(), D5. Claude Code application: frontmatter default + dispatch parameters, Impact, 5. Commands

### Community 108 - "P5 — evidência de resultado: do sinal à correção"
Cohesion: 0.18
Nodes (11): Critério de aceite, Critério de aceite, Definição proposta, Fase 11 — Definir e medir signal-to-fix, Fase 13 — Consolidar evidências de conclusão, sem novo documento obrigatório, Implementação provável, Implementação provável, P5 — evidência de resultado: do sinal à correção (+3 more)

### Community 109 - "ADDED Requirements"
Cohesion: 0.22
Nodes (8): ADDED Requirements, Purpose, Requirement: Existing requirements stay authoritative, Requirement: Proportional product clarification, Scenario: Clear small request, Scenario: Project uses OpenSpec, Scenario: Vague product outcome, Spec Delta

### Community 110 - "install-report.js"
Cohesion: 0.27
Nodes (9): HARNESS, harnessOfDir(), norm(), ORDER, plural(), renderInstallReport(), shortPath(), home (+1 more)

### Community 111 - "validate-python.py"
Cohesion: 0.06
Nodes (29): Core, at user level, Do not version, Editing an agent, File format, Global install receipts, Maintaining canonkit, Product-neutral examples, Stack packs (+21 more)

### Community 112 - "unknown"
Cohesion: 0.16
Nodes (14): discover(), parseCodexModels(), unknown(), G05 — Linguagens, concorrência e runtime, Context, D1. Use the default debug command as a low-confidence discovery source, D3. Apply choices in agent files and treat known conflicts as inherit, D4. Materialize project overrides in project-scoped files (+6 more)

### Community 113 - "decide"
Cohesion: 0.15
Nodes (14): 8. Small fixes from the audit, cap(), decide(), gitBypass(), gitCalls(), includedPathReason(), readEvents(), reportChars() (+6 more)

### Community 114 - "OpenSpec Agent"
Cohesion: 0.20
Nodes (9): Agent-Compatible CLI Commands (prefer `--json` for structured output), Available Commands, Best Practices, Creating New Changes, Interactive CLI Commands (use when prompted by the user), Key Directories, OpenSpec Agent, What is OpenSpec? (+1 more)

### Community 115 - "migrateClaudeHooks"
Cohesion: 0.90
Nodes (4): isCanonicalClaudeHook(), mentionsKit(), migrateClaudeHooks(), object()

### Community 116 - "product-discovery Specification"
Cohesion: 0.22
Nodes (8): product-discovery Specification, Purpose, Requirement: Existing requirements stay authoritative, Requirement: Proportional product clarification, Requirements, Scenario: Clear small request, Scenario: Project uses OpenSpec, Scenario: Vague product outcome

### Community 117 - "Proposal"
Cohesion: 0.25
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 118 - "Context contributors"
Cohesion: 0.18
Nodes (11): Collecting on an existing installation, Context contributors, Dashboard, Dispatch metrics, Dispatch metrics, context contributors and the dashboard, Engineering baseline coverage, In the dashboard, One dispatch can have more than one `agent_end` (+3 more)

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
Cohesion: 0.22
Nodes (6): Purpose, Spec Delta, Purpose, Spec Delta, Purpose, Spec Delta

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

### Community 129 - "Proposal"
Cohesion: 0.18
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 130 - "Handoff: Laya version check, eval rerun, and new-resource exploration"
Cohesion: 0.25
Nodes (7): CanonKit rules to respect, First steps for the new session, Goal, Handoff: Laya version check, eval rerun, and new-resource exploration, New resources to try (verify exposure in 0.4.30 MCP), Prior evidence (this session, 2026-11-09), Prior score snapshot

### Community 131 - "canonkit-opencode.js"
Cohesion: 0.26
Nodes (11): core, inputOf(), isObj(), normalizeOpencode(), onExecuteBefore(), onShellCreate(), OPENCODE_GATE_MODES, opencodeDecision() (+3 more)

### Community 132 - "Requirement: Network authorization remains outside repository control"
Cohesion: 0.40
Nodes (5): Requirement: Network authorization remains outside repository control, Scenario: A dependency registry is suggested, Scenario: Harness merges a repository expansion, Scenario: Strict sandbox network configuration, Scenario: Unsandboxed or separate network tool

### Community 133 - "Requirement: Repository data boundary and limited exceptions"
Cohesion: 0.40
Nodes (5): Requirement: Repository data boundary and limited exceptions, Scenario: Another project is opened later, Scenario: File-tool controls are version-dependent, Scenario: Shell reads need separate restrictions, Scenario: Windows drives and links

### Community 134 - "openspec-explore/SKILL.md"
Cohesion: 0.14
Nodes (14): context(), Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, Planning a Change, The Stance (+6 more)

### Community 135 - "Proposal"
Cohesion: 0.25
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 136 - "Interface design"
Cohesion: 0.25
Nodes (7): Evidence and handoff, Interface design, M1 — Direction and concrete finish, M2 — States and promised outcomes, M3 — Design for actual content and operation, M4 — Purposeful and stable motion, Scope and authority

### Community 138 - "Proposal"
Cohesion: 0.25
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 139 - "Requirement: The approved strict network setting has trusted global scope"
Cohesion: 0.40
Nodes (5): Requirement: The approved strict network setting has trusted global scope, Scenario: Existing strict network setting, Scenario: Other harnesses selected, Scenario: Strict network configuration without hook wiring, Scenario: Unsupported or unknown version

### Community 140 - "ADR 0001 — `canonkit tool`: um namespace próprio, que só integra"
Cohesion: 0.20
Nodes (10): ADR 0001 — `canonkit tool`: um namespace próprio, que só integra, Alternativas consideradas, Consequências aceitas, Contexto, Decisão, Emenda 2026-11-12 — WSL: o resolvedor ignora binários do lado Windows, Publisher e pin — o que foi verificado (2026-10-19), Revisar quando (+2 more)

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

### Community 157 - "highRisk"
Cohesion: 0.38
Nodes (7): highRisk(), isAbsolutePath(), isNoise(), isPerfBudget(), isTestFile(), namesAuth(), projectAdds()

### Community 158 - "Proposal"
Cohesion: 0.29
Nodes (6): Capabilities, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 160 - "canonkit 2.4.0"
Cohesion: 0.67
Nodes (3): canonkit 2.4.0, For users, Verification and limits

### Community 161 - "renderDoctorReport"
Cohesion: 0.46
Nodes (6): clip(), label(), mark(), renderDoctorReport(), wrap(), rows

### Community 162 - "Proposal"
Cohesion: 0.29
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 163 - "Go"
Cohesion: 0.29
Nodes (6): Establish the project, Go, Implementation and diagnosis, Security when relevant, Team boundary, Verify the changed boundary

### Community 164 - "Go"
Cohesion: 0.29
Nodes (6): Establish the project, Go, Implementation and diagnosis, Security when relevant, Team boundary, Verify the changed boundary

### Community 165 - "React"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, React, Team boundary, Verify the changed boundary

### Community 166 - "React"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, React, Team boundary, Verify the changed boundary

### Community 167 - "Requirement: Person chooses from the discovered list"
Cohesion: 0.40
Nodes (5): Requirement: Person chooses from the discovered list, Scenario: Assign a level for Claude Code, Scenario: Choices are menus of what was discovered, Scenario: Nothing is written before confirmation, Scenario: Offered during the interactive install

### Community 169 - "install.md"
Cohesion: 0.17
Nodes (7): canonkit 2.5.0, For users, Verification and limits, One-time setup (account owner), Release, Releasing canonkit, When it fails

### Community 170 - "Handoff — canonkit improvements, by priority (2026-10-29)"
Cohesion: 0.40
Nodes (5): Decisions already made by the user, First step for the next session, Handoff — canonkit improvements, by priority (2026-10-29), Parameters this list does not move, Rubric follow-ups (instruction-audit, not canonkit)

### Community 171 - "Tasks"
Cohesion: 0.20
Nodes (10): 1. Baseline and discovery, 2. Choice interface and diagnosis, 3. Generated agents and project reach, 4. Guidance and delivery checks, Baseline evidence, Codex runtime evidence, Final verification (2026-11-10, after last edit), Integration and documentation review (+2 more)

### Community 172 - "Rust"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, Rust, Team boundary, Verify the changed boundary

### Community 173 - "ADR 0006 — Modelo e effort escolhidos pela pessoa, a partir do que o harness informa"
Cohesion: 0.29
Nodes (7): Adendo: Codex (2026-11-10), ADR 0006 — Modelo e effort escolhidos pela pessoa, a partir do que o harness informa, Alternativas consideradas, Consequências aceitas, Contexto, Decisão, Quando reavaliar

### Community 174 - "Requirement: Codex discovery reports models and their own efforts"
Cohesion: 0.50
Nodes (4): Requirement: Codex discovery reports models and their own efforts, Scenario: Catalog is available without login, Scenario: Codex reports a catalog, Scenario: Debug output changes or refresh fails

### Community 175 - "tools.md"
Cohesion: 0.15
Nodes (10): ADR 0002 — Hooks Git do Graphify por opt-in, Compatibilidade e migração, Decisão, Evidência upstream, Validação e limites, ADR 0003 — `tool add` escreve um bloco no `.gitignore`, Alternativas consideradas, Consequências aceitas (+2 more)

### Community 176 - "Keeping findings outside the current task"
Cohesion: 0.50
Nodes (4): Availability and evidence limits, Example: two findings during an unrelated plan, Keeping findings outside the current task, Review and publication

### Community 177 - "canonkit 3.0.0"
Cohesion: 0.29
Nodes (7): canonkit 3.0.0, Clearer command output, Maintainers, Model selection (breaking), Team instructions, Verification and release limits, What changes for users

### Community 178 - "Requirement: Codex generated agents apply resolved choices"
Cohesion: 0.50
Nodes (4): Requirement: Codex generated agents apply resolved choices, Scenario: Choice is cleared, Scenario: Effective pair becomes incompatible, Scenario: User choice is installed

### Community 179 - "Requirement: Codex setup ties effort to the chosen model"
Cohesion: 0.50
Nodes (4): Requirement: Codex setup ties effort to the chosen model, Scenario: Existing effort conflicts with a new model, Scenario: Model has fewer effort levels, Scenario: Setup is cancelled

### Community 181 - "Requirement: User and project configuration with override"
Cohesion: 0.50
Nodes (4): Requirement: User and project configuration with override, Scenario: Nothing configured, Scenario: Project overrides a level, Scenario: Project raises only effort

### Community 182 - "React"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, React, Team boundary, Verify the changed boundary

### Community 185 - "opencode-plugin.mjs"
Cohesion: 0.83
Nodes (3): require, setup(), warn()

### Community 186 - "orchestrate/SKILL.md"
Cohesion: 0.17
Nodes (9): Before dispatch and after return, Invocation evidence and learning from use, Laya advice in practical HIGH handoffs, Requests, Tools for matching inputs, Choose the destination and prepare drafts, Incidental findings and project issues, Obtain authorization and publish (+1 more)

### Community 187 - "Requirement: Claude Code dispatches carry the effective choice"
Cohesion: 0.67
Nodes (3): Requirement: Claude Code dispatches carry the effective choice, Scenario: Dispatch in a project with a deep override, Scenario: Nothing configured

### Community 188 - "Requirement: Discovery degrades to unknown, never to failure"
Cohesion: 0.67
Nodes (3): Requirement: Discovery degrades to unknown, never to failure, Scenario: Claude CLI output changed, Scenario: Harness not yet supported

### Community 189 - "Requirement: Vendor-neutral agent need level"
Cohesion: 0.67
Nodes (3): Requirement: Vendor-neutral agent need level, Scenario: Agent declares a need level, Scenario: Agent still names a vendor model

### Community 193 - "contextReminder"
Cohesion: 0.38
Nodes (7): contextBands(), contextReminder(), currentContextTokens(), num(), scanTranscript(), transcriptUsage(), usageTotals()

### Community 194 - "Fase 12 — Capturar feedback real e vinculá-lo à hipótese de produto"
Cohesion: 0.33
Nodes (6): Critério de aceite, Fase 12 — Capturar feedback real e vinculá-lo à hipótese de produto, Fluxo desejado, Implementação provável, Privacidade, Problema

### Community 195 - "C# / .NET"
Cohesion: 0.33
Nodes (5): C# / .NET, Establish the project, Implementation and diagnosis, Team boundary, Verify the changed boundary

### Community 196 - "TypeScript"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, Team boundary, TypeScript, Verify the changed boundary

### Community 197 - "Fase 15 — Medir latência da interação e custo por tarefa concluída"
Cohesion: 0.40
Nodes (5): Critério de aceite, Fase 15 — Medir latência da interação e custo por tarefa concluída, Implementação provável, Problema, Segurança / privacidade

## Knowledge Gaps
- **1209 isolated node(s):** `READ_TOOLS`, `PACKAGE_ROOT`, `AGENTS_DIR`, `REFERENCE_DIR`, `HOOKS_DIR` (+1204 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1371 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Known dead ends** — questions that led nowhere; don't re-derive.
- "quais desses ajustes ainda fazem sentido?" -> `scanTranscript()`, `transcriptUsage()`
- "agora falta o passo 9 do handoff!" -> `Hooks`, `HOOK`

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `doctor()` connect `doctor` to `security.js`, `Proposal`, `cli.js`, `openspec-explore/SKILL.md`, `InstallManifest`, `installDistribution`, `ADR 0001 — `canonkit tool`: um namespace próprio, que só integra`, `Hooks and gates`, `ADDED Requirements`, `Proposal`, `renderDoctorReport`, `Installation reference`, `cli-install.test.js`, `allow`, `Tasks`, `canonkit`, `CANONKIT_ROADMAP.md`, `ADR 0006 — Modelo e effort escolhidos pela pessoa, a partir do que o harness informa`, `Requirements`, `canonkit 3.0.0`, `ADDED Requirements`, `isObject`, `validate.mjs`, `Tasks`, `Decisions`, `slash`, `models-command.js`, `Requirements`, `codexAgent`, `P5 — evidência de resultado: do sinal à correção`, `validate-python.py`, `unknown`, `Proposal`?**
  _High betweenness centrality (0.183) - this node is a cross-community bridge._
- **Are the 60 inferred relationships involving `doctor()` (e.g. with `mentionsHook()` and `ruleText()`) actually correct?**
  _`doctor()` has 60 INFERRED edges - model-reasoned connections that need verification._
- **What connects `READ_TOOLS`, `PACKAGE_ROOT`, `AGENTS_DIR` to the rest of the system?**
  _1209 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Why does `install()` connect `install` to `security.js`, `cli.js`, `Proposal`, `installDistribution`, `exec.js`, `ADR 0001 — `canonkit tool`: um namespace próprio, que só integra`, `2.3.0.md`, `canonkit 2.4.0`, `Installation reference`, `cli-install.test.js`, `Requirement: Person chooses from the discovered list`, `allow`, `canonkit`, `ADR 0006 — Modelo e effort escolhidos pela pessoa, a partir do que o harness informa`, `canonkit 3.0.0`, `ADDED Requirements`, `4. Universal layout + enforcement outside Claude Code (largest real gap)`, `ADDED Requirements`, `Requirements`, `doctor`, `Tasks`, `Decisions`, `Decisions`, `slash`, `models-command.js`, `Requirements`, `codexAgent`, `validate-python.py`, `unknown`, `Proposal`, `Context contributors`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Are the 38 inferred relationships involving `install()` (e.g. with `Publisher e pin — o que foi verificado (2026-10-19)` and `Decisão`) actually correct?**
  _`install()` has 38 INFERRED edges - model-reasoned connections that need verification._
- **Should `cli.js` be split into smaller, more focused modules?**
  _Cohesion score 0.053551912568306013 - nodes in this community are weakly interconnected._
# Graph Report - canonkit  (2026-11-12)

## Corpus Check
- 257 files · ~518,492 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 6, .jsonc 1)

## Summary
- 2912 nodes · 5106 edges · 203 communities (179 shown, 24 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 414 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6918f0e1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- security.js
- package.json
- cli.js
- Subagents
- with
- Spencer — Documentation / Knowledge Steward Agent
- cli-harness.js
- canonkit-hook.js
- serve.js
- InstallManifest
- eval-quality.mjs
- publish
- main
- toolAdd
- eval-laya.mjs
- Dana — Data / Analytics / Experimentation Agent
- Tasks
- dashboard/package.json
- hooks/package.json
- Inventário completo por grupo
- add-specialist.sh
- install-reference.sh
- install.sh script
- Gard — Security Agent
- routing-block.md
- ADDED Requirements
- Q: Como avaliar de 0 a 10 a qualidade e o ROI das instrucoes instaladas pelo canonkit?
- hook-core.test.js
- hook-opencode.test.js
- Hooks and gates
- ADDED Requirements
- ADDED Requirements
- P0 — fechar os maiores gaps de evidência
- ADDED Requirements
- install
- hook-codex.test.js
- Requirements
- cli-install.test.js
- check-enforced.mjs
- updates
- Requirements
- ADR 0005 — Contexto inflado se resolve com handoff manual
- ADR 0001 — `canonkit tool`: um namespace próprio, que só integra
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
- Pixie — UX / Design Agent
- ADDED Requirements
- Orchestrate
- Learning loop
- ADDED Requirements
- Requirements
- model-discovery.js
- Ordem sugerida
- Fase 5 — Freshness explícita do Graphify
- Requirements
- canonkit-opencode.js
- Virgo — Agent Team Maintainer
- Requirements
- git-ignore-sandbox-files.test.js
- C# / .NET
- install-report.js
- Swift
- Fase 8 — Gate quantitativo para Caveman / Shunt
- Proposal
- models-command.js
- Pipe — DevOps / Platform / Operations Agent
- ADDED Requirements
- Tasks
- Requirements
- validate.mjs
- Fase 7 — Testar a “solution ladder” antes de adicioná-la ao Bob
- models-command.test.js
- Q: quais desses ajustes ainda fazem sentido?
- Q: agora falta o passo 9 do handoff!
- Requirements
- Tasks
- Decisions
- ref_node_path
- ADDED Requirements
- Proposal
- Decisions
- Tasks
- AGENTS.md
- Tasks
- Security policy
- copilot-setup-steps
- Decisions
- ADDED Requirements
- Requirements
- Perry — Performance / User-Perceived Speed Agent
- Requirements
- Design
- Requirement: Native approval modes remain authoritative
- P5 — evidência de resultado: do sinal à correção
- ADDED Requirements
- highRisk
- validate-python.py
- unknown
- decide
- OpenSpec Agent
- opencode-plugin.mjs
- product-discovery Specification
- Proposal
- sandbox-auto-approval-default/proposal.md
- Proposal
- Bob — Engineering / Implementation Agent
- ADDED Requirements
- Rendered interface review
- ecc-skills-knowledge-groups-handoff.md
- Requirement: Restrictive and reversible installation lifecycle
- Requirements
- Requirement: Restrictive and reversible installation lifecycle
- Learning from mistakes
- config.yaml
- isObject
- Handoff: Laya version check, eval rerun, and new-resource exploration
- Context tune
- Requirement: Network authorization remains outside repository control
- Requirement: Repository data boundary and limited exceptions
- openspec-explore/SKILL.md
- Proposal
- Interface design
- codex-block.md
- Proposal
- Requirement: The approved strict network setting has trusted global scope
- doctor
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
- TypeScript
- Proposal
- Fase 12 — Capturar feedback real e vinculá-lo à hipótese de produto
- Fase 15 — Medir latência da interação e custo por tarefa concluída
- renderDoctorReport
- ref_node_assert
- Go
- Go
- React
- React
- README.md
- validate.sh script
- install.md
- ADR 0008 — `tool add openspec --harness`: o usuário escolhe para quais harnesses o openspec é configurado
- install-unified-catalog/proposal.md
- Rust
- Design
- legacyRunners
- tools.md
- ADR 0006 — Modelo e effort escolhidos pela pessoa, a partir do que o harness informa
- Context contributors
- Game art direction
- Incidental findings and project issues
- Kotlin
- contextReminder
- installSkills
- Requirement: Person chooses from the discovered list
- allow
- Requirement: Codex discovery reports models and their own efforts
- Handoff — canonkit improvements, by priority (2026-10-29)
- Go
- Requirement: Codex generated agents apply resolved choices
- Requirement: Codex setup ties effort to the chosen model
- Requirement: User and project configuration with override
- model-selection Specification
- PROVENANCE.md
- Project tools: graphify and openspec
- Requirement: Claude Code dispatches carry the effective choice
- Requirement: Discovery degrades to unknown, never to failure
- Requirement: Vendor-neutral agent need level
- Tasks
- Requirement: Project configuration stays inside the project
- Requirement: Runtime discovery per harness
- Python
- Keeping findings outside the current task

## God Nodes (most connected - your core abstractions)
1. `doctor()` - 108 edges
2. `install()` - 75 edges
3. `installDistribution()` - 34 edges
4. `toolAdd()` - 34 edges
5. `Inventário completo por grupo` - 29 edges
6. `main()` - 27 edges
7. `InstallManifest` - 27 edges
8. `decide()` - 26 edges
9. `securityDiagnosis()` - 25 edges
10. `4. Universal layout + enforcement outside Claude Code (largest real gap)` - 24 edges

## Surprising Connections (you probably didn't know these)
- `Publisher e pin — o que foi verificado (2026-10-19)` --references--> `install()`  [INFERRED]
  docs/adr/0001-tool-namespace-integrate-only.md → bin/cli.js
- `Editing an agent` --references--> `install()`  [INFERRED]
  docs/maintaining.md → bin/cli.js
- `Dashboard` --references--> `install()`  [INFERRED]
  docs/telemetry.md → bin/cli.js
- `Impact` --references--> `install()`  [INFERRED]
  openspec/changes/archive/2026-11-09-environment-aware-security/proposal.md → bin/cli.js
- `Why` --references--> `install()`  [INFERRED]
  openspec/changes/archive/2026-11-11-faster-test-suite/proposal.md → bin/cli.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Agents holding domain veto authority** — agents_archie_archie, agents_gard_gard, agents_scott_scott, agents_pixie_pixie, agents_quinn_quinn, agents_spencer_spencer, agents_dana_dana, agents_maya_maya, agents_nova_nova, agents_echo_echo [EXTRACTED 1.00]
- **Smallest-sufficient-solution doctrine across domains** — agents_archie_smallest_sufficient_architecture, agents_bob_smallest_correct_change, agents_scott_mvp, agents_gard_mitigation_priority, agents_dana_governing_principle, agents_spencer_minimum_structures [INFERRED 0.85]
- **Shared LOW/MEDIUM/HIGH risk triage protocol** — agents_archie_risk_classification, agents_bob_implementation_protocol, agents_gard_mitigation_priority, agents_quinn_test_strategy, agents_pipe_rollback_plan, agents_dana_experiment_protocol, agents_maya_core_loop, agents_nova_visual_language, agents_echo_mix_hierarchy, agents_pixie_interface_states [INFERRED 0.95]

## Communities (203 total, 24 thin omitted)

### Community 0 - "security.js"
Cohesion: 0.12
Nodes (40): applyClaudeUserPlan(), claudeHome(), optionalBytes(), prepareSecurity(), readProjectLocalSandbox(), resolveInstallProjectTarget(), scopedSecurityManifest(), securityDiagnosis() (+32 more)

### Community 1 - "package.json"
Cohesion: 0.06
Nodes (35): author, bin, canonkit, bugs, url, dependencies, prompts, description (+27 more)

### Community 2 - "cli.js"
Cohesion: 0.04
Nodes (86): activeTools(), addressedNames(), AGENTS_DIR, applyBlock(), applyBlockLf(), AUTHORITIES, CLAUDE_MD, CODEX (+78 more)

### Community 3 - "Subagents"
Cohesion: 0.12
Nodes (15): Branches, Commit authorship, Core team — installed at user level (`~/.claude/agents`), Dedicated tools, not the shell, Domain specialists — installed per project (the repository's `.claude/agents/`), Durable preferences, HIGH-risk surfaces and who owns them, Images (+7 more)

### Community 4 - "with"
Cohesion: 0.05
Nodes (40): concurrency, cancel-in-progress, group, run, SHA256, VERSION, jobs, secrets (+32 more)

### Community 6 - "cli-harness.js"
Cohesion: 0.10
Nodes (17): Validation, home, FAKE_MOUNTS, wsl(), fixture(), roots, setup(), snapshot() (+9 more)

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
Cohesion: 0.07
Nodes (49): parseAgent(), absent(), bytes(), catalog(), digest(), exists(), object(), PACKAGE_ROOT (+41 more)

### Community 11 - "publish"
Cohesion: 0.07
Nodes (27): concurrency, cancel-in-progress, group, jobs, publish, test, name, on (+19 more)

### Community 12 - "main"
Cohesion: 0.10
Nodes (21): chooseHarness(), chooseProjectItems(), chooseTargets(), harnessName(), liftHarness(), liftProjectSelections(), main(), toolCommand() (+13 more)

### Community 13 - "toolAdd"
Cohesion: 0.12
Nodes (38): confirm(), gitHooksPreflight(), harnessStaticTouches(), loud(), printMissing(), readInstallCatalog(), refuseOpencodeBelow2(), toolAdd() (+30 more)

### Community 14 - "eval-laya.mjs"
Cohesion: 0.14
Nodes (17): Manual cleanup for pre-manifest installations and reported leftovers, Uninstalling, contract(), createPlan(), enTicket, ownerQuestion, prediction(), ptTicket (+9 more)

### Community 16 - "Tasks"
Cohesion: 0.07
Nodes (24): Context, Context-cost baseline, Coverage inventory, Decisions, Design, Goals / Non-Goals, Migration Plan, Risks / Trade-offs (+16 more)

### Community 19 - "Inventário completo por grupo"
Cohesion: 0.05
Nodes (39): Achados de documentação a preservar, Como interpretar as tabelas, Deltas propostos por destino, Fontes, recorte e verificação, G01 — UI, UX e acessibilidade, G02 — Motion de interfaces, G03 — Frontend web e ferramentas, G04 — Mobile e interfaces nativas (+31 more)

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

### Community 31 - "ADDED Requirements"
Cohesion: 0.08
Nodes (25): ADDED Requirements, Requirement: Dry run previews the whole flow, Requirement: Install output makes tool actions and outcomes clear, Requirement: Non-interactive install is unchanged unless asked, Requirement: Project items are offered only against a valid project, Requirement: Selection happens before any write, and cancelling writes nothing, Requirement: Selections reuse the existing installers, Requirement: Skipping the project steps is a valid choice (+17 more)

### Community 32 - "P0 — fechar os maiores gaps de evidência"
Cohesion: 0.12
Nodes (17): Casos iniciais, Critério de aceite, Critério de aceite, Critério de aceite, Dashboard, Depois, Fase 1 — Telemetria de contexto do main thread, Fase 2 — Fazer o routing eval validar `model` e `effort` (+9 more)

### Community 33 - "ADDED Requirements"
Cohesion: 0.09
Nodes (22): ADDED Requirements, Purpose, Requirement: HIGH handoff signals identify missing details for manual inspection, Requirement: Large candidate sets do not automate owner assignment, Requirement: Laya cannot replace Canonkit governance or direct evidence, Requirement: Laya receives only minimized task-relevant content, Requirement: Long-text assessment preserves uncertainty and attribution, Requirement: Practical adoption prioritizes quality without additional benchmark campaigns (+14 more)

### Community 34 - "install"
Cohesion: 0.07
Nodes (34): install(), warnIgnoredCodexModel(), Alternativas consideradas, Choosing models, Codex, Codex hook (`--wire-hooks`), Commands, Core, at user level (+26 more)

### Community 35 - "hook-codex.test.js"
Cohesion: 0.14
Nodes (9): codexInput(), { evaluate, GATE_KINDS }, FIXTURES, FIXTURES_DIR, HOOKS_DIR, { normalizeCodex, parsePatch, codexOutput, CODEX_GATE_MODES }, patch(), REPO (+1 more)

### Community 36 - "Requirements"
Cohesion: 0.09
Nodes (22): laya-advisory-assessment Specification, Purpose, Requirement: HIGH handoff signals identify missing details for manual inspection, Requirement: Large candidate sets do not automate owner assignment, Requirement: Laya cannot replace Canonkit governance or direct evidence, Requirement: Laya receives only minimized task-relevant content, Requirement: Long-text assessment preserves uncertainty and attribution, Requirement: Practical adoption prioritizes quality without additional benchmark campaigns (+14 more)

### Community 37 - "cli-install.test.js"
Cohesion: 0.19
Nodes (24): HOOK_FILES, dangling(), setup(), wsl(), backups(), claudeDir(), codexCommand(), commandsIn() (+16 more)

### Community 38 - "check-enforced.mjs"
Cohesion: 0.12
Nodes (12): adapters, BLOCKS, { GATE_KINDS, RECORD_KINDS }, known, listed, out, REPO, requireCjs (+4 more)

### Community 39 - "updates"
Cohesion: 0.14
Nodes (13): patterns, prefix, default-days, actions, interval, updates, commit-message, cooldown (+5 more)

### Community 40 - "Requirements"
Cohesion: 0.05
Nodes (41): interface-design-workflow Specification, Purpose, Requirement: Composite-control inspection follows a reported risk, Requirement: Content states and flow outcomes are explicit, Requirement: Design decisions follow the product and existing direction, Requirement: Design handoffs are implementable and proportionate, Requirement: Interface skills are independently opt-in, Requirement: Motion preserves purpose access and stability (+33 more)

### Community 41 - "ADR 0005 — Contexto inflado se resolve com handoff manual"
Cohesion: 0.14
Nodes (11): ADR 0004 — Só harnesses que rodam o time em qualidade plena, Alternativas consideradas, Consequências aceitas, Contexto, Decisão, ADR 0005 — Contexto inflado se resolve com handoff manual, Alternativas consideradas, Consequências aceitas (+3 more)

### Community 42 - "ADR 0001 — `canonkit tool`: um namespace próprio, que só integra"
Cohesion: 0.25
Nodes (8): ADR 0001 — `canonkit tool`: um namespace próprio, que só integra, Alternativas consideradas, Consequências aceitas, Contexto, Decisão, Emenda 2026-11-12 (2) — o mesmo filtro em mais três resolvedores, Publisher e pin — o que foi verificado (2026-10-19), Revisar quando

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
Cohesion: 0.20
Nodes (13): Stable fields, activity(), decide(), HOOK, hookEnv(), inProject(), logged(), pre() (+5 more)

### Community 53 - "configFor"
Cohesion: 0.31
Nodes (11): configFor(), isObj(), isWithin(), loadConfig(), locateConfig(), normalizePath(), onProject(), projectPath() (+3 more)

### Community 54 - "ADDED Requirements"
Cohesion: 0.12
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

### Community 58 - "Pixie — UX / Design Agent"
Cohesion: 0.17
Nodes (4): Iris — Machine Learning / Computer Vision Agent, Pixie — UX / Design Agent, Quinn — Quality / QA / Test Strategy Agent, Scott — Product / Product Lead Agent

### Community 59 - "ADDED Requirements"
Cohesion: 0.12
Nodes (16): ADDED Requirements, Purpose, Requirement: Evidence-qualified completion, Requirement: Honest offline evidence, Requirement: Hypothesis-driven debugging, Requirement: Selective regression-first testing, Requirement: Two aspects within existing review, Scenario: Code changed after a passing test (+8 more)

### Community 60 - "Orchestrate"
Cohesion: 0.12
Nodes (17): Briefing by access level, Briefing scratch work, Briefing verification, Compact continuity and finalization, Evidence-based completion, Experimental Laya checks on HIGH handoffs, Incidental findings, Integration Review (+9 more)

### Community 61 - "Learning loop"
Cohesion: 0.22
Nodes (7): Learning proposal, Evaluate and decide, General contributions, Investigate, Learning loop, Privacy, Review and expiry

### Community 62 - "ADDED Requirements"
Cohesion: 0.08
Nodes (25): ADDED Requirements, Purpose, Requirement: ACL stubbing is test-only and absent from shipped code, Requirement: CLI spawns go through the shared harness, Requirement: Deterministic runtime discovery in CLI tests, Requirement: Fast tier for the inner loop, Requirement: Full suite remains the publish gate, Requirement: No wall-clock test budget (+17 more)

### Community 63 - "Requirements"
Cohesion: 0.08
Nodes (25): Purpose, Requirement: ACL stubbing is test-only and absent from shipped code, Requirement: CLI spawns go through the shared harness, Requirement: Deterministic runtime discovery in CLI tests, Requirement: Fast tier for the inner loop, Requirement: Full suite remains the publish gate, Requirement: No wall-clock test budget, Requirement: Real ACL coverage is retained on Windows (+17 more)

### Community 64 - "model-discovery.js"
Cohesion: 0.11
Nodes (21): ADAPTERS, applyClaudePolicy(), availableModelsIn(), CLAUDE_DOCUMENTED_ALIASES, claudeModelPolicy(), HARNESSES, inside(), optionText() (+13 more)

### Community 65 - "Ordem sugerida"
Cohesion: 0.29
Nodes (7): Bob, Ordem sugerida, Perry, Pipe, Scott, Spencer, Virgo

### Community 66 - "Fase 5 — Freshness explícita do Graphify"
Cohesion: 0.29
Nodes (7): Critério de aceite, Fase 5 — Freshness explícita do Graphify, Objetivo, Opção A — instrução + check leve, Opção B — status no CanonKit, Opções, da menor para a maior, Problema

### Community 67 - "Requirements"
Cohesion: 0.12
Nodes (16): engineering-delivery Specification, Purpose, Requirement: Evidence-qualified completion, Requirement: Honest offline evidence, Requirement: Hypothesis-driven debugging, Requirement: Selective regression-first testing, Requirement: Two aspects within existing review, Requirements (+8 more)

### Community 68 - "canonkit-opencode.js"
Cohesion: 0.23
Nodes (11): core, inputOf(), isObj(), normalizeOpencode(), onExecuteBefore(), onShellCreate(), OPENCODE_GATE_MODES, opencodeDecision() (+3 more)

### Community 70 - "Requirements"
Cohesion: 0.09
Nodes (22): Purpose, Requirement: Composite controls preserve one interaction target, Requirement: Interface and gameplay states remain distinct, Requirement: LOW changes remain proportionate, Requirement: Nova provides UI-first visual direction, Requirement: Pixie owns UX and accessibility, Requirement: Shared decisions have distinct owners, Requirement: Skills do not create authority or mandatory dependencies (+14 more)

### Community 71 - "git-ignore-sandbox-files.test.js"
Cohesion: 0.16
Nodes (11): Emenda 2026-11-12 — WSL: o resolvedor ignora binários do lado Windows, What the git gates read, CATALOG, FAKE_NULLDEV, git(), gitDir, homeFor(), HOMES (+3 more)

### Community 72 - "C# / .NET"
Cohesion: 0.33
Nodes (5): C# / .NET, Establish the project, Implementation and diagnosis, Team boundary, Verify the changed boundary

### Community 73 - "install-report.js"
Cohesion: 0.26
Nodes (10): HARNESS, harnessOfDir(), norm(), ORDER, plural(), renderInstallReport(), renderRemainingItems(), shortPath() (+2 more)

### Community 74 - "Swift"
Cohesion: 0.29
Nodes (6): Establish the project, Implementation and diagnosis, Security when relevant, Swift, Team boundary, Verify the changed boundary

### Community 75 - "Fase 8 — Gate quantitativo para Caveman / Shunt"
Cohesion: 0.33
Nodes (6): Fase 8 — Gate quantitativo para Caveman / Shunt, P3 — decidir se ferramentas externas ainda são necessárias, Ponytail, Se o principal custo for `Bash`, logs, JSON e test output, Se o principal custo for `Read`, Se o problema for sessão longa

### Community 76 - "Proposal"
Cohesion: 0.20
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 77 - "models-command.js"
Cohesion: 0.08
Nodes (64): claudeRestriction(), describeRestriction(), addSpecialists(), changeProject(), choiceFor(), claudeAgent(), codexAgent(), codexChoiceFor() (+56 more)

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
Cohesion: 0.10
Nodes (41): ACCESS_LEVELS, accessProblem(), READ_TOOLS, RESERVED_KEYS, reservedKeyOf(), 1. Measure before building, 2. Source format and validation, 3. Claude Code translation (+33 more)

### Community 83 - "Fase 7 — Testar a “solution ladder” antes de adicioná-la ao Bob"
Cohesion: 0.40
Nodes (5): Critério de aceite, Fase 7 — Testar a “solution ladder” antes de adicioná-la ao Bob, Importante, P2 — melhorias condicionais, Resultado medido

### Community 84 - "models-command.test.js"
Cohesion: 0.08
Nodes (20): accessOf(), assertPrivate(), fixture(), POWERSHELL, SYSTEM, win32Only, manifest(), manifestFile() (+12 more)

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
Cohesion: 0.22
Nodes (9): D1. `need: light|standard|deep` replaces `model:`, D2. Adapter interface, Claude adapter first, D3. Catalog separate from choices, D4. Field-wise resolution, D6. Project override reach, D7. When discovery runs, D8. Commands, D9. `CANONKIT_CODEX_MODEL` removed (+1 more)

### Community 90 - "ref_node_path"
Cohesion: 0.07
Nodes (11): REPO, SCRIPT, repo, { contextContributors, retainedTotals }, HOOK, SERVER, HERE, REPO (+3 more)

### Community 91 - "ADDED Requirements"
Cohesion: 0.14
Nodes (14): ADDED Requirements, Requirement: Game-art knowledge is an optional project skill, Requirement: Game-art procedures load only for relevant surfaces, Requirement: Game-art procedures preserve domain boundaries, Requirement: Game-art review uses surface-specific visual criteria, Requirement: Knowledge availability does not fabricate a specialist, Scenario: A game settings menu needs layout polish, Scenario: A visual proposal changes a reward rule (+6 more)

### Community 92 - "Proposal"
Cohesion: 0.29
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 93 - "Decisions"
Cohesion: 0.13
Nodes (14): 1. One small security helper; existing CLI owns mutations, 2. Automatic best-supported default, existing strict requirements preserved, 3. Restrict each surface with its actual controls, 4. Network closed to new destinations; no stack-derived grants, 5. Separate repository security from global distribution and hook wiring, 6. Read-only diagnosis, evidence per harness, 7. Native-default upgrade migration (authorized 2026-11-09), Consultation and source evidence (+6 more)

### Community 94 - "Tasks"
Cohesion: 0.14
Nodes (13): 1. Environment evidence and capability selection, 2. Claude policy and native Windows profile, 3. Automatic installation and conservative undo, 4. Read-only diagnostics across harnesses, 5. Integration evidence and independent review, Archive decision — 2026-11-09, Hook-upgrade migration evidence, 2026-11-09, Implementation decisions and evidence (+5 more)

### Community 96 - "Tasks"
Cohesion: 0.20
Nodes (10): 1. Baseline and discovery, 2. Choice interface and diagnosis, 3. Generated agents and project reach, 4. Guidance and delivery checks, Baseline evidence, Codex runtime evidence, Final verification (2026-11-10, after last edit), Integration and documentation review (+2 more)

### Community 97 - "Security policy"
Cohesion: 0.17
Nodes (10): One-time setup (account owner), Release, Releasing canonkit, When it fails, In scope, Out of scope, Reporting a vulnerability, Security policy (+2 more)

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

### Community 105 - "Requirements"
Cohesion: 0.15
Nodes (13): Requirement: Discovery is explicit and contained, Requirement: Doctor reports drift without failing, Requirement: Inspect effective choices, Requirement: Install applies resolved choices where verified, Requirement: Need levels are the recommended path, Requirement: No shipped cross-vendor equivalence, Requirements, Scenario: Choice removed from configuration (+5 more)

### Community 106 - "Design"
Cohesion: 0.18
Nodes (10): Choose tools for the real input, Context, Decisions, Design, Goals / Non-Goals, Keep the orchestrator as the control point, Learn through existing work evidence, Migration Plan (+2 more)

### Community 107 - "Requirement: Native approval modes remain authoritative"
Cohesion: 0.12
Nodes (16): MODIFIED Requirements, Requirement: Native approval modes remain authoritative, Requirement: Strict sandbox configuration preserves explicit requirements, Scenario: Additional access is attempted, Scenario: Diagnostics for automatic approval, Scenario: Existing false next to the strict profile, Scenario: Existing strict policy on native Windows, Scenario: Explicit value already present (+8 more)

### Community 108 - "P5 — evidência de resultado: do sinal à correção"
Cohesion: 0.18
Nodes (11): Critério de aceite, Critério de aceite, Definição proposta, Fase 11 — Definir e medir signal-to-fix, Fase 13 — Consolidar evidências de conclusão, sem novo documento obrigatório, Implementação provável, Implementação provável, P5 — evidência de resultado: do sinal à correção (+3 more)

### Community 109 - "ADDED Requirements"
Cohesion: 0.22
Nodes (8): ADDED Requirements, Purpose, Requirement: Existing requirements stay authoritative, Requirement: Proportional product clarification, Scenario: Clear small request, Scenario: Project uses OpenSpec, Scenario: Vague product outcome, Spec Delta

### Community 110 - "highRisk"
Cohesion: 0.38
Nodes (7): highRisk(), isAbsolutePath(), isNoise(), isPerfBudget(), isTestFile(), namesAuth(), projectAdds()

### Community 111 - "validate-python.py"
Cohesion: 0.05
Nodes (34): Do not version, Editing an agent, File format, Global install receipts, Maintaining canonkit, Product-neutral examples, Stack packs, Context (+26 more)

### Community 112 - "unknown"
Cohesion: 0.16
Nodes (14): discover(), parseCodexModels(), unknown(), G05 — Linguagens, concorrência e runtime, Context, D1. Use the default debug command as a low-confidence discovery source, D3. Apply choices in agent files and treat known conflicts as inherit, D4. Materialize project overrides in project-scoped files (+6 more)

### Community 113 - "decide"
Cohesion: 0.15
Nodes (14): 8. Small fixes from the audit, cap(), decide(), gitBypass(), gitCalls(), includedPathReason(), readEvents(), reportChars() (+6 more)

### Community 114 - "OpenSpec Agent"
Cohesion: 0.20
Nodes (9): Agent-Compatible CLI Commands (prefer `--json` for structured output), Available Commands, Best Practices, Creating New Changes, Interactive CLI Commands (use when prompted by the user), Key Directories, OpenSpec Agent, What is OpenSpec? (+1 more)

### Community 115 - "opencode-plugin.mjs"
Cohesion: 0.83
Nodes (3): require, setup(), warn()

### Community 116 - "product-discovery Specification"
Cohesion: 0.22
Nodes (8): product-discovery Specification, Purpose, Requirement: Existing requirements stay authoritative, Requirement: Proportional product clarification, Requirements, Scenario: Clear small request, Scenario: Project uses OpenSpec, Scenario: Vague product outcome

### Community 117 - "Proposal"
Cohesion: 0.25
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 118 - "sandbox-auto-approval-default/proposal.md"
Cohesion: 0.29
Nodes (6): Capabilities, Impact, Modified Capabilities, New Capabilities, What Changes, Why

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

### Community 127 - "Learning from mistakes"
Cohesion: 0.33
Nodes (6): Contributing a general improvement, Evidence, privacy and authorization, Learning from mistakes, Review and expiry, Source changes and installation, What you receive

### Community 128 - "config.yaml"
Cohesion: 0.50
Nodes (3): githubCopilot, cloudAgent, schema

### Community 129 - "isObject"
Cohesion: 0.08
Nodes (49): asksByHand(), asksNotInEffect(), codexCommand(), codexHome(), codexHooksDir(), codexHooksPath(), configuration(), copyKeepingLocal() (+41 more)

### Community 130 - "Handoff: Laya version check, eval rerun, and new-resource exploration"
Cohesion: 0.25
Nodes (7): CanonKit rules to respect, First steps for the new session, Goal, Handoff: Laya version check, eval rerun, and new-resource exploration, New resources to try (verify exposure in 0.4.30 MCP), Prior evidence (this session, 2026-11-09), Prior score snapshot

### Community 131 - "Context tune"
Cohesion: 0.29
Nodes (6): 1. Measure the baseline, 2. Separate signal from noise, 3. Silence it where the setting stays saved, in this order, 4. What not to do, 5. Measure again and report, Context tune

### Community 132 - "Requirement: Network authorization remains outside repository control"
Cohesion: 0.40
Nodes (5): Requirement: Network authorization remains outside repository control, Scenario: A dependency registry is suggested, Scenario: Harness merges a repository expansion, Scenario: Strict sandbox network configuration, Scenario: Unsandboxed or separate network tool

### Community 133 - "Requirement: Repository data boundary and limited exceptions"
Cohesion: 0.40
Nodes (5): Requirement: Repository data boundary and limited exceptions, Scenario: Another project is opened later, Scenario: File-tool controls are version-dependent, Scenario: Shell reads need separate restrictions, Scenario: Windows drives and links

### Community 134 - "openspec-explore/SKILL.md"
Cohesion: 0.16
Nodes (15): context(), Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, Planning a Change, The Stance (+7 more)

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

### Community 140 - "doctor"
Cohesion: 0.07
Nodes (40): doctor(), Critério de aceite, Fase 14 — Explicitar a cobertura técnica por harness, Implementação provável, Problema, Achado incidental (não tratado aqui), ADR 0007 — `git-ignore-sandbox-files`: esconder os placeholders do sandbox em `.git/info/exclude`, Consequências aceitas (+32 more)

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

### Community 157 - "TypeScript"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, Team boundary, TypeScript, Verify the changed boundary

### Community 158 - "Proposal"
Cohesion: 0.29
Nodes (6): Capabilities, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 159 - "Fase 12 — Capturar feedback real e vinculá-lo à hipótese de produto"
Cohesion: 0.33
Nodes (6): Critério de aceite, Fase 12 — Capturar feedback real e vinculá-lo à hipótese de produto, Fluxo desejado, Implementação provável, Privacidade, Problema

### Community 160 - "Fase 15 — Medir latência da interação e custo por tarefa concluída"
Cohesion: 0.40
Nodes (5): Critério de aceite, Fase 15 — Medir latência da interação e custo por tarefa concluída, Implementação provável, Problema, Segurança / privacidade

### Community 161 - "renderDoctorReport"
Cohesion: 0.46
Nodes (6): clip(), label(), mark(), renderDoctorReport(), wrap(), rows

### Community 162 - "ref_node_assert"
Cohesion: 0.23
Nodes (6): isCanonicalClaudeHook(), mentionsKit(), migrateClaudeHooks(), object(), agent(), src()

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

### Community 167 - "README.md"
Cohesion: 0.11
Nodes (15): C++, Establish the project, Implementation and diagnosis, Team boundary, Verify the changed boundary, Establish the project, Implementation and diagnosis, Java (+7 more)

### Community 169 - "install.md"
Cohesion: 0.25
Nodes (3): canonkit 2.5.0, For users, Verification and limits

### Community 170 - "ADR 0008 — `tool add openspec --harness`: o usuário escolhe para quais harnesses o openspec é configurado"
Cohesion: 0.33
Nodes (6): ADR 0008 — `tool add openspec --harness`: o usuário escolhe para quais harnesses o openspec é configurado, Alternativas consideradas, Consequências aceitas, Contexto, Decisão, Revisitar quando

### Community 171 - "install-unified-catalog/proposal.md"
Cohesion: 0.33
Nodes (5): Capabilities, Modified Capabilities, New Capabilities, What Changes, Why

### Community 172 - "Rust"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, Rust, Team boundary, Verify the changed boundary

### Community 173 - "Design"
Cohesion: 0.29
Nodes (6): Context, Decisions, Design, Goals / Non-Goals, Migration Plan, Risks / Trade-offs

### Community 174 - "legacyRunners"
Cohesion: 0.14
Nodes (14): legacyRunners(), pathKey(), readRegularSync(), retireForwarder(), unsafeWriteRoot(), Closed, Done and committed (do not redo), Handoff: Windows binaries in the other resolvers, safeGit, FIFO reads (+6 more)

### Community 175 - "tools.md"
Cohesion: 0.14
Nodes (10): ADR 0002 — Hooks Git do Graphify por opt-in, Compatibilidade e migração, Decisão, Evidência upstream, Validação e limites, ADR 0003 — `tool add` escreve um bloco no `.gitignore`, Alternativas consideradas, Consequências aceitas (+2 more)

### Community 176 - "ADR 0006 — Modelo e effort escolhidos pela pessoa, a partir do que o harness informa"
Cohesion: 0.29
Nodes (7): Adendo: Codex (2026-11-10), ADR 0006 — Modelo e effort escolhidos pela pessoa, a partir do que o harness informa, Alternativas consideradas, Consequências aceitas, Contexto, Decisão, Quando reavaliar

### Community 177 - "Context contributors"
Cohesion: 0.20
Nodes (10): Collecting on an existing installation, Context contributors, Dashboard, Dispatch metrics, Dispatch metrics, context contributors and the dashboard, Engineering baseline coverage, In the dashboard, One dispatch can have more than one `agent_end` (+2 more)

### Community 178 - "Game art direction"
Cohesion: 0.33
Nodes (5): Authority and scope, Establish the direction and viewing context, Findings and evidence, Game art direction, Review the relevant surfaces

### Community 179 - "Incidental findings and project issues"
Cohesion: 0.40
Nodes (4): Choose the destination and prepare drafts, Incidental findings and project issues, Obtain authorization and publish, Preserve and continue

### Community 180 - "Kotlin"
Cohesion: 0.29
Nodes (6): Establish the project, Framework boundaries when present, Implementation and diagnosis, Kotlin, Team boundary, Verify the changed boundary

### Community 181 - "contextReminder"
Cohesion: 0.38
Nodes (7): contextBands(), contextReminder(), currentContextTokens(), num(), scanTranscript(), transcriptUsage(), usageTotals()

### Community 182 - "installSkills"
Cohesion: 0.40
Nodes (5): copilotAgentsDir(), copilotHome(), filesUnder(), installSkills(), list()

### Community 183 - "Requirement: Person chooses from the discovered list"
Cohesion: 0.40
Nodes (5): Requirement: Person chooses from the discovered list, Scenario: Assign a level for Claude Code, Scenario: Choices are menus of what was discovered, Scenario: Nothing is written before confirmation, Scenario: Offered during the interactive install

### Community 184 - "allow"
Cohesion: 0.12
Nodes (20): Native controls and optional hooks, Returning to native approvals, The core: `evaluate(evt, env)`, G17 — Catálogo, instalação e ferramentas do ECC, Handoff: close the release as 3.1.0, Prepared, Still required by the release workflow, Verification (+12 more)

### Community 185 - "Requirement: Codex discovery reports models and their own efforts"
Cohesion: 0.50
Nodes (4): Requirement: Codex discovery reports models and their own efforts, Scenario: Catalog is available without login, Scenario: Codex reports a catalog, Scenario: Debug output changes or refresh fails

### Community 186 - "Handoff — canonkit improvements, by priority (2026-10-29)"
Cohesion: 0.40
Nodes (5): Decisions already made by the user, First step for the next session, Handoff — canonkit improvements, by priority (2026-10-29), Parameters this list does not move, Rubric follow-ups (instruction-audit, not canonkit)

### Community 187 - "Go"
Cohesion: 0.29
Nodes (6): Establish the project, Go, Implementation and diagnosis, Security when relevant, Team boundary, Verify the changed boundary

### Community 188 - "Requirement: Codex generated agents apply resolved choices"
Cohesion: 0.50
Nodes (4): Requirement: Codex generated agents apply resolved choices, Scenario: Choice is cleared, Scenario: Effective pair becomes incompatible, Scenario: User choice is installed

### Community 189 - "Requirement: Codex setup ties effort to the chosen model"
Cohesion: 0.50
Nodes (4): Requirement: Codex setup ties effort to the chosen model, Scenario: Existing effort conflicts with a new model, Scenario: Model has fewer effort levels, Scenario: Setup is cancelled

### Community 190 - "Requirement: User and project configuration with override"
Cohesion: 0.50
Nodes (4): Requirement: User and project configuration with override, Scenario: Nothing configured, Scenario: Project overrides a level, Scenario: Project raises only effort

### Community 193 - "Project tools: graphify and openspec"
Cohesion: 0.20
Nodes (10): Before enabling the git hooks, canonkit integrates, it never installs, Experimental handoff checks, graphify, Keeping the graph fresh, Laya, openspec, openspec harnesses (`--harness`) (+2 more)

### Community 194 - "Requirement: Claude Code dispatches carry the effective choice"
Cohesion: 0.67
Nodes (3): Requirement: Claude Code dispatches carry the effective choice, Scenario: Dispatch in a project with a deep override, Scenario: Nothing configured

### Community 195 - "Requirement: Discovery degrades to unknown, never to failure"
Cohesion: 0.67
Nodes (3): Requirement: Discovery degrades to unknown, never to failure, Scenario: Claude CLI output changed, Scenario: Harness not yet supported

### Community 196 - "Requirement: Vendor-neutral agent need level"
Cohesion: 0.67
Nodes (3): Requirement: Vendor-neutral agent need level, Scenario: Agent declares a need level, Scenario: Agent still names a vendor model

### Community 197 - "Tasks"
Cohesion: 0.29
Nodes (6): 1. Security review before code, 2. Default value, 3. Diagnostics, 4. Documentation, 5. Closure, Tasks

### Community 201 - "Python"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, Python, Team boundary, Verify the changed boundary

### Community 206 - "Keeping findings outside the current task"
Cohesion: 0.50
Nodes (4): Availability and evidence limits, Example: two findings during an unrelated plan, Keeping findings outside the current task, Review and publication

## Knowledge Gaps
- **1277 isolated node(s):** `READ_TOOLS`, `PACKAGE_ROOT`, `AGENTS_DIR`, `REFERENCE_DIR`, `HOOKS_DIR` (+1272 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1450 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Known dead ends** — questions that led nowhere; don't re-derive.
- "quais desses ajustes ainda fazem sentido?" -> `scanTranscript()`, `transcriptUsage()`
- "agora falta o passo 9 do handoff!" -> `Hooks`, `HOOK`

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `doctor()` connect `doctor` to `security.js`, `isObject`, `cli.js`, `openspec-explore/SKILL.md`, `InstallManifest`, `main`, `Hooks and gates`, `ADDED Requirements`, `Proposal`, `renderDoctorReport`, `install`, `cli-install.test.js`, `ADR 0001 — `canonkit tool`: um namespace próprio, que só integra`, `canonkit`, `CANONKIT_ROADMAP.md`, `legacyRunners`, `Design`, `ADR 0006 — Modelo e effort escolhidos pela pessoa, a partir do que o harness informa`, `ADDED Requirements`, `Requirements`, `installSkills`, `allow`, `Tasks`, `Proposal`, `models-command.js`, `Tasks`, `Decisions`, `Tasks`, `Requirements`, `P5 — evidência de resultado: do sinal à correção`, `validate-python.py`, `unknown`, `Proposal`?**
  _High betweenness centrality (0.182) - this node is a cross-community bridge._
- **Are the 72 inferred relationships involving `doctor()` (e.g. with `mentionsHook()` and `ruleText()`) actually correct?**
  _`doctor()` has 72 INFERRED edges - model-reasoned connections that need verification._
- **What connects `READ_TOOLS`, `PACKAGE_ROOT`, `AGENTS_DIR` to the rest of the system?**
  _1277 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `security.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12473572938689217 - nodes in this community are weakly interconnected._
- **Why does `install()` connect `install` to `security.js`, `isObject`, `cli.js`, `Proposal`, `main`, `toolAdd`, `doctor`, `Hooks and gates`, `ADDED Requirements`, `cli-install.test.js`, `ADR 0001 — `canonkit tool`: um namespace próprio, que só integra`, `ADR 0008 — `tool add openspec --harness`: o usuário escolhe para quais harnesses o openspec é configurado`, `canonkit`, `Design`, `legacyRunners`, `ADR 0006 — Modelo e effort escolhidos pela pessoa, a partir do que o harness informa`, `Context contributors`, `ADDED Requirements`, `Requirement: Person chooses from the discovered list`, `4. Universal layout + enforcement outside Claude Code (largest real gap)`, `allow`, `ADDED Requirements`, `Requirements`, `Project tools: graphify and openspec`, `Tasks`, `models-command.js`, `Tasks`, `Decisions`, `Decisions`, `Requirements`, `validate-python.py`, `unknown`, `Proposal`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **Are the 51 inferred relationships involving `install()` (e.g. with `Emenda 2026-11-12 (2) — o mesmo filtro em mais três resolvedores` and `Publisher e pin — o que foi verificado (2026-10-19)`) actually correct?**
  _`install()` has 51 INFERRED edges - model-reasoned connections that need verification._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
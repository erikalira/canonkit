# Graph Report - canonkit  (2026-11-12)

## Corpus Check
- 258 files · ~481,054 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 6, .jsonc 1)

## Summary
- 2890 nodes · 4983 edges · 193 communities (175 shown, 18 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 361 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f8764aec`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- security.js
- package.json
- cli.js
- Subagents
- with
- Requirements
- git-ignore-sandbox-files.test.js
- canonkit-hook.js
- serve.js
- InstallManifest
- eval-quality.mjs
- publish
- main
- toolAdd
- eval-laya.mjs
- ADDED Requirements
- Tasks
- dashboard/package.json
- hooks/package.json
- syncClaudeRouting
- add-specialist.sh
- install-reference.sh
- install.sh script
- Requirement: Native approval modes remain authoritative
- routing-block.md
- ADDED Requirements
- Q: Como avaliar de 0 a 10 a qualidade e o ROI das instrucoes instaladas pelo canonkit?
- hook-core.test.js
- hook-opencode.test.js
- Hooks and gates
- ADR 0005 — Contexto inflado se resolve com handoff manual
- model-config.js
- P0 — fechar os maiores gaps de evidência
- ADDED Requirements
- install
- hook-codex.test.js
- Requirements
- cli-install.test.js
- ref_node_fs
- updates
- Requirements
- addSpecialists
- git
- canonkit
- ADDED Requirements
- CANONKIT_ROADMAP.md
- The team
- Requirements
- Evals
- ADDED Requirements
- dashboard.test.js
- Fase 4 — OpenSpec como artefato durável do change lifecycle
- canonkit-hook.test.js
- configFor
- Tasks
- ADDED Requirements
- Implementation evidence — 2026-11-09 (HISTORICAL working-tree record)
- Requirements
- Pipe — DevOps / Platform / Operations Agent
- ADDED Requirements
- Orchestrate
- Learning loop
- ADDED Requirements
- Requirements
- model-discovery.js
- canonkit 3.0.0
- Requirement: Rendered review matches the changed experience
- Requirements
- Design
- 2026-11-12-sandbox-auto-approval-default/proposal.md
- Requirements
- Tasks
- C# / .NET
- install-report.js
- Swift
- Java
- React
- models-command.js
- Requirement: Motion preserves purpose access and stability
- ADDED Requirements
- Tasks
- Requirements
- validate.mjs
- Handoff — pendências da revisão de skills do ECC
- uninstall.test.js
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
- Requirement: Review preserves evidence limits and freshness
- Security policy
- copilot-setup-steps
- Decisions
- ADDED Requirements
- Requirements
- Handoff — pendências do Graphify e OpenSpec
- Requirements
- Design
- canonkit 2.5.0
- P5 — evidência de resultado: do sinal à correção
- ADDED Requirements
- highRisk
- validate-python.py
- Decisions
- decide
- OpenSpec Agent
- opencode-plugin.mjs
- product-discovery Specification
- Proposal
- environment-security-policy Specification
- Proposal
- ADDED Requirements
- Rendered interface review
- 2026-11-11-ui-focused-visual-workflow/design.md
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
- TypeScript
- Proposal
- renderDoctorReport
- migrateClaudeHooks
- Go
- Go
- React
- React
- C++
- validate.sh script
- install.md
- ADR 0008 — `tool add openspec --harness`: o usuário escolhe para quais harnesses o openspec é configurado
- Rust
- unsafeWriteRoot
- tools.md
- ADR 0006 — Modelo e effort escolhidos pela pessoa, a partir do que o harness informa
- usage
- Game art direction
- Laya advice in practical HIGH handoffs
- Kotlin
- contextReminder
- installDistribution
- Requirement: Person chooses from the discovered list
- allow
- Requirement: Codex discovery reports models and their own efforts
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
- Requirement: Project configuration stays inside the project
- Requirement: Runtime discovery per harness
- Python

## God Nodes (most connected - your core abstractions)
1. `doctor()` - 106 edges
2. `install()` - 74 edges
3. `installDistribution()` - 34 edges
4. `toolAdd()` - 34 edges
5. `main()` - 27 edges
6. `InstallManifest` - 27 edges
7. `decide()` - 26 edges
8. `securityDiagnosis()` - 25 edges
9. `addSpecialists()` - 23 edges
10. `runCli()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Publisher e pin — o que foi verificado (2026-10-19)` --references--> `install()`  [INFERRED]
  docs/adr/0001-tool-namespace-integrate-only.md → bin/cli.js
- `Editing an agent` --references--> `install()`  [INFERRED]
  docs/maintaining.md → bin/cli.js
- `For users` --references--> `install()`  [INFERRED]
  docs/release-notes/2.1.0.md → bin/cli.js
- `Dashboard` --references--> `install()`  [INFERRED]
  docs/telemetry.md → bin/cli.js
- `Impact` --references--> `install()`  [INFERRED]
  openspec/changes/archive/2026-11-09-environment-aware-security/proposal.md → bin/cli.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Agents holding domain veto authority** — agents_archie_archie, agents_gard_gard, agents_scott_scott, agents_pixie_pixie, agents_quinn_quinn, agents_spencer_spencer, agents_dana_dana, agents_maya_maya, agents_nova_nova, agents_echo_echo [EXTRACTED 1.00]
- **Smallest-sufficient-solution doctrine across domains** — agents_archie_smallest_sufficient_architecture, agents_bob_smallest_correct_change, agents_scott_mvp, agents_gard_mitigation_priority, agents_dana_governing_principle, agents_spencer_minimum_structures [INFERRED 0.85]
- **Shared LOW/MEDIUM/HIGH risk triage protocol** — agents_archie_risk_classification, agents_bob_implementation_protocol, agents_gard_mitigation_priority, agents_quinn_test_strategy, agents_pipe_rollback_plan, agents_dana_experiment_protocol, agents_maya_core_loop, agents_nova_visual_language, agents_echo_mix_hierarchy, agents_pixie_interface_states [INFERRED 0.95]

## Communities (193 total, 18 thin omitted)

### Community 0 - "security.js"
Cohesion: 0.13
Nodes (38): applyClaudeUserPlan(), optionalBytes(), prepareSecurity(), readProjectLocalSandbox(), scopedSecurityManifest(), securityDiagnosis(), securityDigest(), uninstallProject() (+30 more)

### Community 1 - "package.json"
Cohesion: 0.06
Nodes (35): author, bin, canonkit, bugs, url, dependencies, prompts, description (+27 more)

### Community 2 - "cli.js"
Cohesion: 0.05
Nodes (59): addressedNames(), AGENTS_DIR, AUTHORITIES, CLAUDE_MD, CODEX, composeSetup(), confirm(), DASHBOARD_DIR (+51 more)

### Community 3 - "Subagents"
Cohesion: 0.12
Nodes (15): Branches, Commit authorship, Core team — installed at user level (`~/.claude/agents`), Dedicated tools, not the shell, Domain specialists — installed per project (the repository's `.claude/agents/`), Durable preferences, HIGH-risk surfaces and who owns them, Images (+7 more)

### Community 4 - "with"
Cohesion: 0.05
Nodes (40): concurrency, cancel-in-progress, group, run, SHA256, VERSION, jobs, secrets (+32 more)

### Community 5 - "Requirements"
Cohesion: 0.07
Nodes (27): install-unified-catalog Specification, Purpose, Requirement: Dry run previews the whole flow, Requirement: Install output makes tool actions and outcomes clear, Requirement: Non-interactive install is unchanged unless asked, Requirement: Project items are offered only against a valid project, Requirement: Selection happens before any write, and cancelling writes nothing, Requirement: Selections reuse the existing installers (+19 more)

### Community 6 - "git-ignore-sandbox-files.test.js"
Cohesion: 0.08
Nodes (27): Validation, home, accessOf(), assertPrivate(), fixture(), POWERSHELL, SYSTEM, win32Only (+19 more)

### Community 7 - "canonkit-hook.js"
Cohesion: 0.08
Nodes (30): CATCH_ALL_SAMPLES, CLAUDE_GATE_MODES, CMD_PREFIX, CMD_PREFIX_VALUE, CONFIG_KEYS, DEFAULT_BANDS, fs, GATE_KINDS (+22 more)

### Community 8 - "serve.js"
Cohesion: 0.06
Nodes (52): addTo(), agentStatus(), contextContributors(), dispatches(), fs, HTML, http, json() (+44 more)

### Community 9 - "InstallManifest"
Cohesion: 0.10
Nodes (29): absent(), atomic(), digest(), exclusivePrivate(), InstallManifest, read(), regularPath(), removeManagedBlock() (+21 more)

### Community 10 - "eval-quality.mjs"
Cohesion: 0.08
Nodes (42): absent(), bytes(), catalog(), digest(), exists(), object(), PACKAGE_ROOT, readStackPack() (+34 more)

### Community 11 - "publish"
Cohesion: 0.07
Nodes (27): concurrency, cancel-in-progress, group, jobs, publish, test, name, on (+19 more)

### Community 12 - "main"
Cohesion: 0.09
Nodes (24): changeProject(), chooseHarness(), chooseProjectItems(), chooseTargets(), discoverModels(), harnessName(), liftHarness(), liftProjectSelections() (+16 more)

### Community 13 - "toolAdd"
Cohesion: 0.13
Nodes (39): activeTools(), getTool(), gitHooksPreflight(), loud(), printMissing(), readInstallCatalog(), readTools(), refuseOpencodeBelow2() (+31 more)

### Community 14 - "eval-laya.mjs"
Cohesion: 0.14
Nodes (17): Manual cleanup for pre-manifest installations and reported leftovers, Uninstalling, contract(), createPlan(), enTicket, ownerQuestion, prediction(), ptTicket (+9 more)

### Community 15 - "ADDED Requirements"
Cohesion: 0.08
Nodes (25): ADDED Requirements, Requirement: Dry run previews the whole flow, Requirement: Install output makes tool actions and outcomes clear, Requirement: Non-interactive install is unchanged unless asked, Requirement: Project items are offered only against a valid project, Requirement: Selection happens before any write, and cancelling writes nothing, Requirement: Selections reuse the existing installers, Requirement: Skipping the project steps is a valid choice (+17 more)

### Community 16 - "Tasks"
Cohesion: 0.07
Nodes (24): Context, Context-cost baseline, Coverage inventory, Decisions, Design, Goals / Non-Goals, Migration Plan, Risks / Trade-offs (+16 more)

### Community 19 - "syncClaudeRouting"
Cohesion: 0.16
Nodes (20): applyBlock(), applyBlockLf(), esc(), gitignoreMarkers(), gitignorePlan(), gitignoreRoot(), graphifyHooksProblems(), hookSnapshot() (+12 more)

### Community 23 - "Requirement: Native approval modes remain authoritative"
Cohesion: 0.12
Nodes (16): MODIFIED Requirements, Requirement: Native approval modes remain authoritative, Requirement: Strict sandbox configuration preserves explicit requirements, Scenario: Additional access is attempted, Scenario: Diagnostics for automatic approval, Scenario: Existing false next to the strict profile, Scenario: Existing strict policy on native Windows, Scenario: Explicit value already present (+8 more)

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

### Community 30 - "ADR 0005 — Contexto inflado se resolve com handoff manual"
Cohesion: 0.05
Nodes (33): ADR 0004 — Só harnesses que rodam o time em qualidade plena, Alternativas consideradas, Consequências aceitas, Contexto, Decisão, ADR 0005 — Contexto inflado se resolve com handoff manual, Alternativas consideradas, Consequências aceitas (+25 more)

### Community 31 - "model-config.js"
Cohesion: 0.23
Nodes (14): checkEntry(), empty(), FIELDS, HONORED_FIELDS, readChoices(), refuseProjectLinks(), setChoice(), SOURCES (+6 more)

### Community 32 - "P0 — fechar os maiores gaps de evidência"
Cohesion: 0.08
Nodes (24): Bob, Casos iniciais, Critério de aceite, Critério de aceite, Critério de aceite, Dashboard, Depois, Fase 1 — Telemetria de contexto do main thread (+16 more)

### Community 33 - "ADDED Requirements"
Cohesion: 0.09
Nodes (22): ADDED Requirements, Purpose, Requirement: HIGH handoff signals identify missing details for manual inspection, Requirement: Large candidate sets do not automate owner assignment, Requirement: Laya cannot replace Canonkit governance or direct evidence, Requirement: Laya receives only minimized task-relevant content, Requirement: Long-text assessment preserves uncertainty and attribution, Requirement: Practical adoption prioritizes quality without additional benchmark campaigns (+14 more)

### Community 34 - "install"
Cohesion: 0.08
Nodes (30): install(), warnIgnoredCodexModel(), Alternativas consideradas, Choosing models, Codex, Commands, Core, at user level, Diagnosis and conservative reversal (+22 more)

### Community 35 - "hook-codex.test.js"
Cohesion: 0.13
Nodes (11): Evidence, bash(), codexInput(), { evaluate, GATE_KINDS }, FIXTURES, FIXTURES_DIR, HOOKS_DIR, { normalizeCodex, parsePatch, codexOutput, CODEX_GATE_MODES } (+3 more)

### Community 36 - "Requirements"
Cohesion: 0.09
Nodes (22): laya-advisory-assessment Specification, Purpose, Requirement: HIGH handoff signals identify missing details for manual inspection, Requirement: Large candidate sets do not automate owner assignment, Requirement: Laya cannot replace Canonkit governance or direct evidence, Requirement: Laya receives only minimized task-relevant content, Requirement: Long-text assessment preserves uncertainty and attribution, Requirement: Practical adoption prioritizes quality without additional benchmark campaigns (+14 more)

### Community 37 - "cli-install.test.js"
Cohesion: 0.15
Nodes (27): HOOK_FILES, dangling(), setup(), wsl(), FAKE_MOUNTS, wsl(), repo(), backups() (+19 more)

### Community 38 - "ref_node_fs"
Cohesion: 0.11
Nodes (12): adapters, BLOCKS, { GATE_KINDS, RECORD_KINDS }, known, listed, out, REPO, requireCjs (+4 more)

### Community 39 - "updates"
Cohesion: 0.14
Nodes (13): patterns, prefix, default-days, actions, interval, updates, commit-message, cooldown (+5 more)

### Community 40 - "Requirements"
Cohesion: 0.05
Nodes (41): interface-design-workflow Specification, Purpose, Requirement: Composite-control inspection follows a reported risk, Requirement: Content states and flow outcomes are explicit, Requirement: Design decisions follow the product and existing direction, Requirement: Design handoffs are implementable and proportionate, Requirement: Interface skills are independently opt-in, Requirement: Motion preserves purpose access and stability (+33 more)

### Community 41 - "addSpecialists"
Cohesion: 0.32
Nodes (12): addSpecialists(), codexAgent(), copilotAgent(), opencodeAgent(), parseAgent(), readAgents(), tomlString(), D5. Claude Code application: frontmatter default + dispatch parameters (+4 more)

### Community 42 - "git"
Cohesion: 0.14
Nodes (15): ADR 0001 — `canonkit tool`: um namespace próprio, que só integra, Alternativas consideradas, Consequências aceitas, Contexto, Emenda 2026-11-12 (2) — o mesmo filtro em mais três resolvedores, Emenda 2026-11-12 — WSL: o resolvedor ignora binários do lado Windows, Publisher e pin — o que foi verificado (2026-10-19), Revisar quando (+7 more)

### Community 43 - "canonkit"
Cohesion: 0.15
Nodes (13): canonkit, Commands, Documentation, FAQ, How it decides: LOW vs HIGH, If no gate ever fires, License, Risk and scale are two different questions (+5 more)

### Community 44 - "ADDED Requirements"
Cohesion: 0.09
Nodes (23): ADDED Requirements, Requirement: Composite-control inspection follows a reported risk, Requirement: Content states and flow outcomes are explicit, Requirement: Design decisions follow the product and existing direction, Requirement: Design handoffs are implementable and proportionate, Requirement: Interface skills are independently opt-in, Requirement: Review uses available tooling without expanding authorization, Requirement: Skill lifecycle preserves existing project ownership (+15 more)

### Community 45 - "CANONKIT_ROADMAP.md"
Cohesion: 0.09
Nodes (22): 1. Princípios do roadmap, CanonKit — Roadmap de Evolução, Critério de aceite, Definition of Done do roadmap, Fase 10 — período de freeze, Fase 7 — Testar a “solution ladder” antes de adicioná-la ao Bob, Fase 8 — Gate quantitativo para Caveman / Shunt, Fase 9 — Dashboard de eficiência por agente e por tipo de trabalho (+14 more)

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

### Community 50 - "dashboard.test.js"
Cohesion: 0.15
Nodes (3): { contextContributors, retainedTotals }, HOOK, SERVER

### Community 51 - "Fase 4 — OpenSpec como artefato durável do change lifecycle"
Cohesion: 0.11
Nodes (18): Caminho sugerido, Critério de aceite, Critério de aceite, Critério de aceite, Fase 4 — OpenSpec como artefato durável do change lifecycle, Fase 5 — Freshness explícita do Graphify, Fase 6 — Reavaliar o trust boundary dos hooks do Graphify, Fluxo desejado (+10 more)

### Community 52 - "canonkit-hook.test.js"
Cohesion: 0.15
Nodes (16): Decisão, Stable fields, canonkit — OpenCode specifics, activity(), decide(), edit(), HOOK, hookEnv() (+8 more)

### Community 53 - "configFor"
Cohesion: 0.27
Nodes (12): configFor(), isObj(), isWithin(), loadConfig(), locateConfig(), normalizePath(), onProject(), projectConfig() (+4 more)

### Community 54 - "Tasks"
Cohesion: 0.06
Nodes (32): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why, ADDED Requirements (+24 more)

### Community 55 - "ADDED Requirements"
Cohesion: 0.06
Nodes (30): ADDED Requirements, Purpose, Requirement: Absent access preserves current behavior, Requirement: Access is not a security boundary, Requirement: Claude Code translation, Requirement: Effective access is inspectable, Requirement: Harness field names reserved, Requirement: Other harnesses unaffected (+22 more)

### Community 56 - "Implementation evidence — 2026-11-09 (HISTORICAL working-tree record)"
Cohesion: 0.25
Nodes (8): Accepted V/L traceability, Context measurements, Document checks, Implementation evidence — 2026-11-09 (HISTORICAL working-tree record), Independent reviews (final implementation), Integration Review, Preserved incidental finding, Spec scenario coverage

### Community 57 - "Requirements"
Cohesion: 0.06
Nodes (30): agent-tool-access Specification, Purpose, Requirement: Absent access preserves current behavior, Requirement: Access is not a security boundary, Requirement: Claude Code translation, Requirement: Effective access is inspectable, Requirement: Harness field names reserved, Requirement: Other harnesses unaffected (+22 more)

### Community 58 - "Pipe — DevOps / Platform / Operations Agent"
Cohesion: 0.05
Nodes (15): Archie — Architecture / Technical Lead Agent, Bob — Engineering / Implementation Agent, Dana — Data / Analytics / Experimentation Agent, Echo — Audio / Sound Design Agent, Gard — Security Agent, Iris — Machine Learning / Computer Vision Agent, Maya — Game Design / Game Feel Agent, Nova — Visual / Art Direction Agent (+7 more)

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
Nodes (27): ADAPTERS, applyClaudePolicy(), availableModelsIn(), CLAUDE_DOCUMENTED_ALIASES, claudeModelPolicy(), discover(), HARNESSES, inside() (+19 more)

### Community 65 - "canonkit 3.0.0"
Cohesion: 0.29
Nodes (7): canonkit 3.0.0, Clearer command output, Maintainers, Model selection (breaking), Team instructions, Verification and release limits, What changes for users

### Community 66 - "Requirement: Rendered review matches the changed experience"
Cohesion: 0.29
Nodes (7): Requirement: Rendered review matches the changed experience, Scenario: A failed request or missing asset affects the journey, Scenario: A form or overlay needs accessible operation, Scenario: A screenshot is the only available evidence, Scenario: Loading content changes geometry, Scenario: Long content breaks a narrow layout, Scenario: Supported translations or themes expose a defect

### Community 67 - "Requirements"
Cohesion: 0.12
Nodes (16): engineering-delivery Specification, Purpose, Requirement: Evidence-qualified completion, Requirement: Honest offline evidence, Requirement: Hypothesis-driven debugging, Requirement: Selective regression-first testing, Requirement: Two aspects within existing review, Requirements (+8 more)

### Community 68 - "Design"
Cohesion: 0.29
Nodes (6): Context, Decisions, Design, Goals / Non-Goals, Migration Plan, Risks / Trade-offs

### Community 69 - "2026-11-12-sandbox-auto-approval-default/proposal.md"
Cohesion: 0.29
Nodes (6): Capabilities, Impact, Modified Capabilities, New Capabilities, What Changes, Why

### Community 70 - "Requirements"
Cohesion: 0.09
Nodes (22): Purpose, Requirement: Composite controls preserve one interaction target, Requirement: Interface and gameplay states remain distinct, Requirement: LOW changes remain proportionate, Requirement: Nova provides UI-first visual direction, Requirement: Pixie owns UX and accessibility, Requirement: Shared decisions have distinct owners, Requirement: Skills do not create authority or mandatory dependencies (+14 more)

### Community 71 - "Tasks"
Cohesion: 0.29
Nodes (6): 1. Security review before code, 2. Default value, 3. Diagnostics, 4. Documentation, 5. Closure, Tasks

### Community 72 - "C# / .NET"
Cohesion: 0.33
Nodes (5): C# / .NET, Establish the project, Implementation and diagnosis, Team boundary, Verify the changed boundary

### Community 73 - "install-report.js"
Cohesion: 0.39
Nodes (8): HARNESS, harnessOfDir(), norm(), ORDER, plural(), renderInstallReport(), renderRemainingItems(), shortPath()

### Community 74 - "Swift"
Cohesion: 0.29
Nodes (6): Establish the project, Implementation and diagnosis, Security when relevant, Swift, Team boundary, Verify the changed boundary

### Community 75 - "Java"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, Java, Team boundary, Verify the changed boundary

### Community 76 - "React"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, React, Team boundary, Verify the changed boundary

### Community 77 - "models-command.js"
Cohesion: 0.14
Nodes (22): installProjectCodex(), APPLIED, projectConfigPath(), resolve(), userConfigPath(), catalogPath(), Aborted, askEntry() (+14 more)

### Community 78 - "Requirement: Motion preserves purpose access and stability"
Cohesion: 0.40
Nodes (5): Requirement: Motion preserves purpose access and stability, Scenario: A gesture or continuous animation is introduced, Scenario: A user requests reduced motion, Scenario: Motion raises a credible runtime cost concern, Scenario: The user reverses an animated interaction

### Community 79 - "ADDED Requirements"
Cohesion: 0.10
Nodes (20): ADDED Requirements, Requirement: Composite controls preserve one interaction target, Requirement: Interface and gameplay states remain distinct, Requirement: LOW changes remain proportionate, Requirement: Nova provides UI-first visual direction, Requirement: Pixie owns UX and accessibility, Requirement: Shared decisions have distinct owners, Requirement: Skills do not create authority or mandatory dependencies (+12 more)

### Community 80 - "Tasks"
Cohesion: 0.14
Nodes (14): 1. UI-first ownership and agent guidance, 2. Optional skills and compatible project distribution, 3. Integration, independent review and delivery evidence, Current evidence (HEAD `2c603c3`; working tree clean apart from archive renames,, Decision (user, 2026-11-11), Final review — 2026-11-11 (HEAD `2c603c3`, implementation committed on `main`), G01–G03 planning revision — 2026-11-09, Implemented scope vs. authorization (+6 more)

### Community 81 - "Requirements"
Cohesion: 0.12
Nodes (16): game-art-direction Specification, Purpose, Requirement: Game-art knowledge is an optional project skill, Requirement: Game-art procedures load only for relevant surfaces, Requirement: Game-art procedures preserve domain boundaries, Requirement: Game-art review uses surface-specific visual criteria, Requirement: Knowledge availability does not fabricate a specialist, Requirements (+8 more)

### Community 82 - "validate.mjs"
Cohesion: 0.09
Nodes (47): ACCESS_LEVELS, accessProblem(), claudeRestriction(), describeRestriction(), READ_TOOLS, RESERVED_KEYS, reservedKeyOf(), claudeAgent() (+39 more)

### Community 83 - "Handoff — pendências da revisão de skills do ECC"
Cohesion: 0.50
Nodes (3): Ainda falta, Handoff — pendências da revisão de skills do ECC, Restrições

### Community 84 - "uninstall.test.js"
Cohesion: 0.22
Nodes (5): manifest(), manifestFile(), markers, run(), store()

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
Nodes (13): projectRoot(), 10.3 Closure evidence (2026-11-10), 10. Setup interface (user feedback, 2026-11-10), 1. Start clean from the superseded edits, 3. Discovery, 4. Choices: storage and resolution, 6. Claude Code application, 7. Doctor (+5 more)

### Community 89 - "Decisions"
Cohesion: 0.22
Nodes (9): D1. `need: light|standard|deep` replaces `model:`, D2. Adapter interface, Claude adapter first, D3. Catalog separate from choices, D4. Field-wise resolution, D6. Project override reach, D7. When discovery runs, D8. Commands, D9. `CANONKIT_CODEX_MODEL` removed (+1 more)

### Community 90 - "ref_node_path"
Cohesion: 0.07
Nodes (21): STACK_PACK_IDS, REPO, SCRIPT, repo, roots, setup(), snapshot(), REPO (+13 more)

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

### Community 96 - "Requirement: Review preserves evidence limits and freshness"
Cohesion: 0.50
Nodes (4): Requirement: Review preserves evidence limits and freshness, Scenario: A correction changes the layout, Scenario: Browser access is unavailable, Scenario: Component tests pass without rendered motion evidence

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

### Community 107 - "canonkit 2.5.0"
Cohesion: 0.67
Nodes (3): canonkit 2.5.0, For users, Verification and limits

### Community 108 - "P5 — evidência de resultado: do sinal à correção"
Cohesion: 0.09
Nodes (22): Critério de aceite, Critério de aceite, Critério de aceite, Critério de aceite, Definição proposta, Fase 11 — Definir e medir signal-to-fix, Fase 12 — Capturar feedback real e vinculá-lo à hipótese de produto, Fase 13 — Consolidar evidências de conclusão, sem novo documento obrigatório (+14 more)

### Community 109 - "ADDED Requirements"
Cohesion: 0.22
Nodes (8): ADDED Requirements, Purpose, Requirement: Existing requirements stay authoritative, Requirement: Proportional product clarification, Scenario: Clear small request, Scenario: Project uses OpenSpec, Scenario: Vague product outcome, Spec Delta

### Community 110 - "highRisk"
Cohesion: 0.38
Nodes (7): highRisk(), isAbsolutePath(), isNoise(), isPerfBudget(), isTestFile(), namesAuth(), projectAdds()

### Community 111 - "validate-python.py"
Cohesion: 0.06
Nodes (31): Do not version, Editing an agent, File format, Global install receipts, Maintaining canonkit, Product-neutral examples, Stack packs, Context (+23 more)

### Community 112 - "Decisions"
Cohesion: 0.20
Nodes (10): Context, D1. Use the default debug command as a low-confidence discovery source, D3. Apply choices in agent files and treat known conflicts as inherit, D4. Materialize project overrides in project-scoped files, D5. Keep the trust and read-only boundaries, Decisions, Design, Goals / Non-Goals (+2 more)

### Community 113 - "decide"
Cohesion: 0.14
Nodes (15): askFor(), cap(), decide(), denyFor(), gitBypass(), gitCalls(), includedPathReason(), readEvents() (+7 more)

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

### Community 119 - "Proposal"
Cohesion: 0.25
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 121 - "ADDED Requirements"
Cohesion: 0.29
Nodes (6): ADDED Requirements, Purpose, Requirement: Automatic installation of supported restrictions, Scenario: Global distribution without a repository target, Scenario: Plain Claude installation, Spec Delta

### Community 122 - "Rendered interface review"
Cohesion: 0.22
Nodes (8): Choose the relevant checks, Composite controls when the risk calls for it, Evidence, verdict and recheck, M1 — Inspect the intended visual language, M2 — Exercise applicable states and outcomes, M3 — Rendered content, access and failures, M4 — Motion, geometry and continuity, Rendered interface review

### Community 123 - "2026-11-11-ui-focused-visual-workflow/design.md"
Cohesion: 0.17
Nodes (6): Purpose, Spec Delta, Purpose, Spec Delta, Purpose, Spec Delta

### Community 124 - "Requirement: Restrictive and reversible installation lifecycle"
Cohesion: 0.29
Nodes (7): Requirement: Restrictive and reversible installation lifecycle, Scenario: Broken settings in a mixed-target installation, Scenario: Dry run, Scenario: Ordinary global removal, Scenario: Project-only reversal, Scenario: Reinstallation or environment change, Scenario: User edits settings after installation

### Community 125 - "Requirements"
Cohesion: 0.20
Nodes (10): Requirement: Automatic installation of supported restrictions, Requirement: Native configuration is not shell authorization, Requirement: No implicit machine provisioning, Requirements, Scenario: Existing permissive personal rule, Scenario: Global distribution without a repository target, Scenario: Plain Claude installation, Scenario: Stronger environment is absent (+2 more)

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
Cohesion: 0.14
Nodes (25): asksNotInEffect(), codexCommand(), codexHooksDir(), decidesShell(), deniesShell(), installCodexHooks(), isDeny(), isObject() (+17 more)

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
Cohesion: 0.09
Nodes (34): doctor(), Critério de aceite, Fase 14 — Explicitar a cobertura técnica por harness, Implementação provável, Problema, Achado incidental (não tratado aqui), ADR 0007 — `git-ignore-sandbox-files`: esconder os placeholders do sandbox em `.git/info/exclude`, Consequências aceitas (+26 more)

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
Cohesion: 0.22
Nodes (9): Requirement: Native approval modes remain authoritative, Scenario: Additional access is attempted, Scenario: Existing false next to the strict profile, Scenario: Explicit value already present, Scenario: Optional decision hook is absent, Scenario: Publishing still needs confirmation, Scenario: Strict profile installed on a new project, Scenario: Strict profile is not written (+1 more)

### Community 151 - "Requirement: Reinstallation migrates attributable legacy Claude hooks"
Cohesion: 0.50
Nodes (4): Requirement: Reinstallation migrates attributable legacy Claude hooks, Scenario: Existing user upgrades to native defaults, Scenario: Explicit optional hooks and subsequent removal, Scenario: Mixed or ambiguous integrations

### Community 152 - "Requirement: Strict sandbox configuration preserves explicit requirements"
Cohesion: 0.33
Nodes (6): Requirement: Strict sandbox configuration preserves explicit requirements, Scenario: Diagnostics for automatic approval, Scenario: Existing strict policy on native Windows, Scenario: Marker or dependency is insufficient, Scenario: Missing dependency or unknown effective override, Scenario: Sandbox-capable platform

### Community 153 - "Requirement: Native configuration is not shell authorization"
Cohesion: 0.67
Nodes (3): Requirement: Native configuration is not shell authorization, Scenario: Existing permissive personal rule, Scenario: Windows security is installed

### Community 154 - "Requirement: No implicit machine provisioning"
Cohesion: 0.67
Nodes (3): Requirement: No implicit machine provisioning, Scenario: Stronger environment is absent, Scenario: Windows user chooses native operation

### Community 157 - "TypeScript"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, Team boundary, TypeScript, Verify the changed boundary

### Community 158 - "Proposal"
Cohesion: 0.29
Nodes (6): Capabilities, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 161 - "renderDoctorReport"
Cohesion: 0.46
Nodes (6): clip(), label(), mark(), renderDoctorReport(), wrap(), rows

### Community 162 - "migrateClaudeHooks"
Cohesion: 0.57
Nodes (4): isCanonicalClaudeHook(), mentionsKit(), migrateClaudeHooks(), object()

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

### Community 167 - "C++"
Cohesion: 0.33
Nodes (5): C++, Establish the project, Implementation and diagnosis, Team boundary, Verify the changed boundary

### Community 169 - "install.md"
Cohesion: 0.17
Nodes (7): Availability and evidence limits, Example: two findings during an unrelated plan, Keeping findings outside the current task, Review and publication, Handoff — pendências das melhorias CanonKit, Limites, Pendências

### Community 170 - "ADR 0008 — `tool add openspec --harness`: o usuário escolhe para quais harnesses o openspec é configurado"
Cohesion: 0.33
Nodes (6): ADR 0008 — `tool add openspec --harness`: o usuário escolhe para quais harnesses o openspec é configurado, Alternativas consideradas, Consequências aceitas, Contexto, Decisão, Revisitar quando

### Community 172 - "Rust"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, Rust, Team boundary, Verify the changed boundary

### Community 174 - "unsafeWriteRoot"
Cohesion: 0.25
Nodes (7): unsafeWriteRoot(), Ainda falta, Handoff — follow-ups de segurança WSL, canonkit 3.1.0, For users, Not in this release, Verification and limits

### Community 175 - "tools.md"
Cohesion: 0.15
Nodes (10): ADR 0002 — Hooks Git do Graphify por opt-in, Compatibilidade e migração, Decisão, Evidência upstream, Validação e limites, ADR 0003 — `tool add` escreve um bloco no `.gitignore`, Alternativas consideradas, Consequências aceitas (+2 more)

### Community 176 - "ADR 0006 — Modelo e effort escolhidos pela pessoa, a partir do que o harness informa"
Cohesion: 0.29
Nodes (7): Adendo: Codex (2026-11-10), ADR 0006 — Modelo e effort escolhidos pela pessoa, a partir do que o harness informa, Alternativas consideradas, Consequências aceitas, Contexto, Decisão, Quando reavaliar

### Community 177 - "usage"
Cohesion: 0.11
Nodes (18): usage(), Collecting on an existing installation, Context contributors, Dashboard, Dispatch metrics, Dispatch metrics, context contributors and the dashboard, Engineering baseline coverage, In the dashboard (+10 more)

### Community 178 - "Game art direction"
Cohesion: 0.33
Nodes (5): Authority and scope, Establish the direction and viewing context, Findings and evidence, Game art direction, Review the relevant surfaces

### Community 179 - "Laya advice in practical HIGH handoffs"
Cohesion: 0.18
Nodes (8): Before dispatch and after return, Invocation evidence and learning from use, Laya advice in practical HIGH handoffs, Tools for matching inputs, Choose the destination and prepare drafts, Incidental findings and project issues, Obtain authorization and publish, Preserve and continue

### Community 180 - "Kotlin"
Cohesion: 0.29
Nodes (6): Establish the project, Framework boundaries when present, Implementation and diagnosis, Kotlin, Team boundary, Verify the changed boundary

### Community 181 - "contextReminder"
Cohesion: 0.38
Nodes (7): contextBands(), contextReminder(), currentContextTokens(), num(), scanTranscript(), transcriptUsage(), usageTotals()

### Community 182 - "installDistribution"
Cohesion: 0.10
Nodes (42): asksByHand(), choiceFor(), claudeHome(), codexChoiceFor(), codexHome(), codexHooksPath(), configuration(), copilotAgentsDir() (+34 more)

### Community 183 - "Requirement: Person chooses from the discovered list"
Cohesion: 0.40
Nodes (5): Requirement: Person chooses from the discovered list, Scenario: Assign a level for Claude Code, Scenario: Choices are menus of what was discovered, Scenario: Nothing is written before confirmation, Scenario: Offered during the interactive install

### Community 184 - "allow"
Cohesion: 0.11
Nodes (22): Native controls and optional hooks, Returning to native approvals, The core: `evaluate(evt, env)`, Handoff: close the release as 3.1.0, Prepared, Still required by the release workflow, Verification, canonkit 2.1.0 (+14 more)

### Community 185 - "Requirement: Codex discovery reports models and their own efforts"
Cohesion: 0.50
Nodes (4): Requirement: Codex discovery reports models and their own efforts, Scenario: Catalog is available without login, Scenario: Codex reports a catalog, Scenario: Debug output changes or refresh fails

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

### Community 201 - "Python"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, Python, Team boundary, Verify the changed boundary

## Knowledge Gaps
- **1253 isolated node(s):** `READ_TOOLS`, `PACKAGE_ROOT`, `AGENTS_DIR`, `REFERENCE_DIR`, `HOOKS_DIR` (+1248 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1438 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Known dead ends** — questions that led nowhere; don't re-derive.
- "quais desses ajustes ainda fazem sentido?" -> `scanTranscript()`, `transcriptUsage()`
- "agora falta o passo 9 do handoff!" -> `Hooks`, `HOOK`

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `doctor()` connect `doctor` to `security.js`, `isObject`, `cli.js`, `openspec-explore/SKILL.md`, `main`, `syncClaudeRouting`, `Hooks and gates`, `ADR 0005 — Contexto inflado se resolve com handoff manual`, `model-config.js`, `Proposal`, `renderDoctorReport`, `install`, `cli-install.test.js`, `addSpecialists`, `git`, `canonkit`, `CANONKIT_ROADMAP.md`, `unsafeWriteRoot`, `Requirements`, `ADR 0006 — Modelo e effort escolhidos pela pessoa, a partir do que o harness informa`, `ADDED Requirements`, `installDistribution`, `Tasks`, `allow`, `canonkit 3.0.0`, `Design`, `Tasks`, `models-command.js`, `validate.mjs`, `Tasks`, `Decisions`, `Requirements`, `P5 — evidência de resultado: do sinal à correção`, `validate-python.py`, `Decisions`, `Proposal`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **Are the 70 inferred relationships involving `doctor()` (e.g. with `mentionsHook()` and `ruleText()`) actually correct?**
  _`doctor()` has 70 INFERRED edges - model-reasoned connections that need verification._
- **What connects `READ_TOOLS`, `PACKAGE_ROOT`, `AGENTS_DIR` to the rest of the system?**
  _1253 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `security.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13356562137049943 - nodes in this community are weakly interconnected._
- **Why does `install()` connect `install` to `security.js`, `isObject`, `cli.js`, `Requirements`, `Proposal`, `main`, `toolAdd`, `ADDED Requirements`, `Hooks and gates`, `model-config.js`, `cli-install.test.js`, `addSpecialists`, `git`, `ADR 0008 — `tool add openspec --harness`: o usuário escolhe para quais harnesses o openspec é configurado`, `canonkit`, `unsafeWriteRoot`, `ADR 0006 — Modelo e effort escolhidos pela pessoa, a partir do que o harness informa`, `usage`, `ADDED Requirements`, `installDistribution`, `Requirement: Person chooses from the discovered list`, `allow`, `ADDED Requirements`, `Requirements`, `canonkit 3.0.0`, `Project tools: graphify and openspec`, `Design`, `Tasks`, `models-command.js`, `Tasks`, `Decisions`, `Decisions`, `Requirements`, `validate-python.py`, `Decisions`, `Proposal`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Are the 50 inferred relationships involving `install()` (e.g. with `Emenda 2026-11-12 (2) — o mesmo filtro em mais três resolvedores` and `Publisher e pin — o que foi verificado (2026-10-19)`) actually correct?**
  _`install()` has 50 INFERRED edges - model-reasoned connections that need verification._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
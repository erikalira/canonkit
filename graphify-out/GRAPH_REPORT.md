# Graph Report - live-development-observatory  (2026-11-12)

## Corpus Check
- 243 files · ~494,550 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 7, .jsonc 1, .css 1)

## Summary
- 2774 nodes · 4609 edges · 195 communities (181 shown, 14 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 300 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f4b5c04e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- eval-quality.mjs
- cli.js
- serve.js
- validate-python.py
- InstallManifest
- installDistribution
- ADDED Requirements
- Requirements
- Requirements
- Inventário completo por grupo
- ADDED Requirements
- ADDED Requirements
- security.js
- ref_node_path
- validate.mjs
- install
- model-discovery.js
- canonkit-hook.js
- isObject
- cli-install.test.js
- ADDED Requirements
- Requirements
- exec.js
- package.json
- hook-core.test.js
- cli-harness.js
- Tasks
- doctor
- ADDED Requirements
- Requirements
- unknown
- eval-laya.mjs
- main.tsx
- install.md
- ADDED Requirements
- ADDED Requirements
- ADDED Requirements
- Requirements
- Requirements
- Requirements
- models-command.js
- Tasks
- hook-opencode.test.js
- ADR 0002 — Hooks Git do Graphify por opt-in
- models-command.test.js
- addSpecialists
- openspec-explore/SKILL.md
- Hooks and gates
- decide
- P0 — fechar os maiores gaps de evidência
- ADDED Requirements
- ADDED Requirements
- Requirements
- Requirements
- Requirements
- allow
- Priority list
- ecc-skills-knowledge-groups-handoff.md
- Decisions
- canonkit-hook.test.js
- Orchestrate
- dana.md
- pipe.md
- ADR 0001 — `canonkit tool`: um namespace próprio, que só integra
- scripts
- ref_node_child_process
- hook-codex.test.js
- echo.md
- ADR 0006 — Modelo e effort escolhidos pela pessoa, a partir do que o harness informa
- ADR 0005 — Contexto inflado se resolve com handoff manual
- Tasks
- Subagents
- check-enforced.mjs
- bob.md
- maya.md
- spencer.md
- canonkit-opencode.js
- Decisions
- canonkit
- archie.md
- gard.md
- perry.md
- quinn.md
- install-report.js
- CANONKIT_ROADMAP.md
- compilerOptions
- Evals
- ADDED Requirements
- Tasks
- Requirements
- iris.md
- pixie.md
- scott.md
- Fase 4 — OpenSpec como artefato durável do change lifecycle
- P5 — evidência de resultado: do sinal à correção
- Native security, per repository
- configFor
- Design
- nova.md
- OpenSpec Agent
- Tasks
- devDependencies
- uninstall.test.js
- Frontend third-party notices
- model-config.js
- Project tools: graphify and openspec
- ADDED Requirements
- product-discovery Specification
- Learning loop
- renderDoctorReport
- Handoff: Laya version check, eval rerun, and new-resource exploration
- The team
- Decisions
- Proposal
- Proposal
- Proposal
- Requirement: Person chooses from the discovered list
- Proposal
- Interface design
- Rendered interface review
- migrateClaudeHooks
- Ordem sugerida
- Fase 5 — Freshness explícita do Graphify
- 4. Universal layout + enforcement outside Claude Code (largest real gap)
- highRisk
- Design
- ADDED Requirements
- Requirement: Restrictive and reversible installation lifecycle
- Proposal
- ADDED Requirements
- Proposal
- Proposal
- Requirements
- Requirement: Restrictive and reversible installation lifecycle
- Go
- Kotlin
- Swift
- Go
- Go
- Fase 12 — Capturar feedback real e vinculá-lo à hipótese de produto
- Fase 8 — Gate quantitativo para Caveman / Shunt
- Learning from mistakes
- Context tune
- README.md
- C# / .NET
- Releasing canonkit
- Java
- Python
- Requirement: User and project configuration with override
- Rust
- React
- React
- Fase 7 — Testar a “solution ladder” antes de adicioná-la ao Bob
- Spec Delta
- syncClaudeRouting
- Handoff: `canonkit tool add` on WSL (graphify, openspec)
- Requirement: Network authorization remains outside repository control
- Requirement: Repository data boundary and limited exceptions
- Requirement: The approved strict network setting has trusted global scope
- Tasks
- Requirement: Network authorization remains outside repository control
- Requirement: Repository data boundary and limited exceptions
- Requirement: The approved strict network setting has trusted global scope
- Changelog
- Keeping findings outside the current task
- opencode-plugin.mjs
- Requirement: Capability-based environment selection
- Requirement: Native approval modes remain authoritative
- Requirement: Reinstallation migrates attributable legacy Claude hooks
- Requirement: Strict sandbox configuration preserves explicit requirements
- Requirement: Claude Code dispatches carry the effective choice
- Requirement: Vendor-neutral agent need level
- Requirement: Capability-based environment selection
- Requirement: Native approval modes remain authoritative
- Requirement: Reinstallation migrates attributable legacy Claude hooks
- Requirement: Strict sandbox configuration preserves explicit requirements
- canonkit 2.5.0
- Requirement: Native configuration is not shell authorization
- Requirement: No implicit machine provisioning
- Requirement: Native configuration is not shell authorization
- Requirement: No implicit machine provisioning
- repository
- AGENTS.md
- dashboard/package.json
- hooks/package.json
- codex-block.md
- routing-block.md
- add-specialist.sh
- install-reference.sh
- install.sh script
- validate.sh script
- PROVENANCE.md

## God Nodes (most connected - your core abstractions)
1. `doctor()` - 94 edges
2. `install()` - 61 edges
3. `installDistribution()` - 34 edges
4. `Inventário completo por grupo` - 29 edges
5. `InstallManifest` - 27 edges
6. `decide()` - 26 edges
7. `unknown()` - 23 edges
8. `securityDiagnosis()` - 22 edges
9. `toolAdd()` - 22 edges
10. `4. Universal layout + enforcement outside Claude Code (largest real gap)` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Publisher e pin — o que foi verificado (2026-10-19)` --references--> `install()`  [INFERRED]
  docs/adr/0001-tool-namespace-integrate-only.md → bin/cli.js
- `Editing an agent` --references--> `install()`  [INFERRED]
  docs/maintaining.md → bin/cli.js
- `For users` --references--> `install()`  [INFERRED]
  docs/release-notes/2.1.0.md → bin/cli.js
- `Impact` --references--> `install()`  [INFERRED]
  openspec/changes/archive/2026-11-09-environment-aware-security/proposal.md → bin/cli.js
- `Why` --references--> `install()`  [INFERRED]
  openspec/changes/archive/2026-11-11-faster-test-suite/proposal.md → bin/cli.js

## Import Cycles
- None detected.

## Communities (195 total, 14 thin omitted)

### Community 0 - "eval-quality.mjs"
Cohesion: 0.07
Nodes (48): absent(), bytes(), catalog(), digest(), exists(), object(), PACKAGE_ROOT, readStackPack() (+40 more)

### Community 1 - "cli.js"
Cohesion: 0.06
Nodes (42): AGENTS_DIR, AUTHORITIES, CLAUDE_MD, CODEX, confirm(), DASHBOARD_DIR, DEFAULT_TARGETS, forbiddenStep() (+34 more)

### Community 2 - "serve.js"
Cohesion: 0.06
Nodes (50): EVENTS, executionSnapshot(), finite(), normalizeEvent(), ACTIVITY_HTML, addTo(), agentStatus(), allowedRequest() (+42 more)

### Community 3 - "validate-python.py"
Cohesion: 0.05
Nodes (37): Authority, Collaboration, Conduct, Default scope, Expected output, Mission, Responsibilities, Security rules (+29 more)

### Community 4 - "InstallManifest"
Cohesion: 0.08
Nodes (35): absent(), atomic(), digest(), exclusivePrivate(), InstallManifest, read(), regularPath(), removeManagedBlock() (+27 more)

### Community 5 - "installDistribution"
Cohesion: 0.12
Nodes (36): asksByHand(), changeProject(), claudeHome(), codexHome(), codexHooksPath(), copilotAgentsDir(), copilotHome(), copyKeepingLocal() (+28 more)

### Community 6 - "ADDED Requirements"
Cohesion: 0.05
Nodes (39): 1. Specify the behavior that exists; do not change code, 2. Generate the legacy fixture from the real baseline module, 3. Reuse the existing e2e suite and harness, 4. Verify documentation, edit only on contradiction, Context, Decisions, Design, Goals / Non-Goals (+31 more)

### Community 7 - "Requirements"
Cohesion: 0.05
Nodes (42): model-selection Specification, Purpose, Requirement: Claude Code dispatches carry the effective choice, Requirement: Codex generated agents apply resolved choices, Requirement: Codex setup ties effort to the chosen model, Requirement: Discovery is explicit and contained, Requirement: Doctor reports drift without failing, Requirement: Inspect effective choices (+34 more)

### Community 8 - "Requirements"
Cohesion: 0.05
Nodes (41): interface-design-workflow Specification, Purpose, Requirement: Composite-control inspection follows a reported risk, Requirement: Content states and flow outcomes are explicit, Requirement: Design decisions follow the product and existing direction, Requirement: Design handoffs are implementable and proportionate, Requirement: Interface skills are independently opt-in, Requirement: Motion preserves purpose access and stability (+33 more)

### Community 9 - "Inventário completo por grupo"
Cohesion: 0.05
Nodes (39): Achados de documentação a preservar, Como interpretar as tabelas, Deltas propostos por destino, Fontes, recorte e verificação, G01 — UI, UX e acessibilidade, G02 — Motion de interfaces, G03 — Frontend web e ferramentas, G04 — Mobile e interfaces nativas (+31 more)

### Community 10 - "ADDED Requirements"
Cohesion: 0.05
Nodes (39): ADDED Requirements, Requirement: Composite-control inspection follows a reported risk, Requirement: Content states and flow outcomes are explicit, Requirement: Design decisions follow the product and existing direction, Requirement: Design handoffs are implementable and proportionate, Requirement: Interface skills are independently opt-in, Requirement: Motion preserves purpose access and stability, Requirement: Rendered review matches the changed experience (+31 more)

### Community 11 - "ADDED Requirements"
Cohesion: 0.10
Nodes (20): ADDED Requirements, Requirement: Discovery degrades to unknown, never to failure, Requirement: Discovery is explicit and contained, Requirement: Doctor reports drift without failing, Requirement: Inspect effective choices, Requirement: Install applies resolved choices where verified, Requirement: Need levels are the recommended path, Requirement: No shipped cross-vendor equivalence (+12 more)

### Community 12 - "security.js"
Cohesion: 0.15
Nodes (33): applyClaudeUserPlan(), optionalBytes(), prepareSecurity(), scopedSecurityManifest(), securityDiagnosis(), securityDigest(), uninstallProject(), absent() (+25 more)

### Community 13 - "ref_node_path"
Cohesion: 0.12
Nodes (8): REPO, SCRIPT, repo, HERE, REPO, command(), REPO, VALIDATOR

### Community 14 - "validate.mjs"
Cohesion: 0.07
Nodes (58): ACCESS_LEVELS, accessProblem(), claudeRestriction(), describeRestriction(), READ_TOOLS, RESERVED_KEYS, reservedKeyOf(), claudeAgent() (+50 more)

### Community 15 - "install"
Cohesion: 0.09
Nodes (27): install(), warnIgnoredCodexModel(), Wiring, Choosing models, Codex, Codex hook (`--wire-hooks`), Commands, Core, at user level (+19 more)

### Community 16 - "model-discovery.js"
Cohesion: 0.11
Nodes (24): ADAPTERS, applyClaudePolicy(), availableModelsIn(), CLAUDE_DOCUMENTED_ALIASES, claudeModelPolicy(), discover(), HARNESSES, inside() (+16 more)

### Community 17 - "canonkit-hook.js"
Cohesion: 0.08
Nodes (31): CATCH_ALL_SAMPLES, CLAUDE_GATE_MODES, CMD_PREFIX, CMD_PREFIX_VALUE, CONFIG_KEYS, DEFAULT_BANDS, fs, GATE_KINDS (+23 more)

### Community 18 - "isObject"
Cohesion: 0.14
Nodes (27): asksNotInEffect(), codexCommand(), codexHooksDir(), decidesShell(), deniesShell(), installCodexHooks(), isDeny(), isObject() (+19 more)

### Community 19 - "cli-install.test.js"
Cohesion: 0.19
Nodes (24): HOOK_FILES, dangling(), setup(), wsl(), backups(), claudeDir(), codexCommand(), commandsIn() (+16 more)

### Community 20 - "ADDED Requirements"
Cohesion: 0.06
Nodes (30): ADDED Requirements, Purpose, Requirement: Absent access preserves current behavior, Requirement: Access is not a security boundary, Requirement: Claude Code translation, Requirement: Effective access is inspectable, Requirement: Harness field names reserved, Requirement: Other harnesses unaffected (+22 more)

### Community 21 - "Requirements"
Cohesion: 0.06
Nodes (30): agent-tool-access Specification, Purpose, Requirement: Absent access preserves current behavior, Requirement: Access is not a security boundary, Requirement: Claude Code translation, Requirement: Effective access is inspectable, Requirement: Harness field names reserved, Requirement: Other harnesses unaffected (+22 more)

### Community 22 - "exec.js"
Cohesion: 0.16
Nodes (33): activeTools(), gitHooksPreflight(), loud(), plain(), printMissing(), refuseOpencodeBelow2(), toolAdd(), toolCommand() (+25 more)

### Community 23 - "package.json"
Cohesion: 0.07
Nodes (27): author, bin, canonkit, bugs, url, dependencies, prompts, description (+19 more)

### Community 24 - "hook-core.test.js"
Cohesion: 0.09
Nodes (15): ADAPTER_KINDS, ADAPTERS, ENV_KEYS, { evaluate, GATE_KINDS, RECORD_KINDS }, FS_CALLBACK_WRITES, FS_PROMISE_WRITES, FS_WRITES, fx (+7 more)

### Community 25 - "cli-harness.js"
Cohesion: 0.12
Nodes (15): Validation, home, fixture(), roots, setup(), snapshot(), ACL_STUB, CLI (+7 more)

### Community 26 - "Tasks"
Cohesion: 0.07
Nodes (24): Context, Context-cost baseline, Coverage inventory, Decisions, Design, Goals / Non-Goals, Migration Plan, Risks / Trade-offs (+16 more)

### Community 27 - "doctor"
Cohesion: 0.09
Nodes (33): doctor(), Critério de aceite, Fase 14 — Explicitar a cobertura técnica por harness, Implementação provável, Problema, canonkit 2.2.0, Changes, For users (+25 more)

### Community 28 - "ADDED Requirements"
Cohesion: 0.08
Nodes (25): ADDED Requirements, Purpose, Requirement: ACL stubbing is test-only and absent from shipped code, Requirement: CLI spawns go through the shared harness, Requirement: Deterministic runtime discovery in CLI tests, Requirement: Fast tier for the inner loop, Requirement: Full suite remains the publish gate, Requirement: No wall-clock test budget (+17 more)

### Community 29 - "Requirements"
Cohesion: 0.08
Nodes (25): Purpose, Requirement: ACL stubbing is test-only and absent from shipped code, Requirement: CLI spawns go through the shared harness, Requirement: Deterministic runtime discovery in CLI tests, Requirement: Fast tier for the inner loop, Requirement: Full suite remains the publish gate, Requirement: No wall-clock test budget, Requirement: Real ACL coverage is retained on Windows (+17 more)

### Community 30 - "unknown"
Cohesion: 0.09
Nodes (24): parseCodexModels(), unknown(), Context, D1. Use the default debug command as a low-confidence discovery source, D3. Apply choices in agent files and treat known conflicts as inherit, D4. Materialize project overrides in project-scoped files, Decisions, Design (+16 more)

### Community 31 - "eval-laya.mjs"
Cohesion: 0.14
Nodes (17): Manual cleanup for pre-manifest installations and reported leftovers, Uninstalling, contract(), createPlan(), enTicket, ownerQuestion, prediction(), ptTicket (+9 more)

### Community 32 - "main.tsx"
Cohesion: 0.16
Nodes (22): AgentPresence, App(), arrangeGraph(), Detail(), DetailRow(), Dispatch, fmtDate(), fmtTime() (+14 more)

### Community 33 - "install.md"
Cohesion: 0.18
Nodes (4): Choose the destination and prepare drafts, Incidental findings and project issues, Obtain authorization and publish, Preserve and continue

### Community 34 - "ADDED Requirements"
Cohesion: 0.09
Nodes (22): ADDED Requirements, Purpose, Requirement: Actionable native remediation and honest entry-point scope, Requirement: Diagnostic severity preserves the existing exit contract, Requirement: Read-only multi-harness diagnosis, Requirement: Report effective conflicts without granting access, Requirement: Separate configuration from evidence, Scenario: Broken automatic security configuration (+14 more)

### Community 35 - "ADDED Requirements"
Cohesion: 0.09
Nodes (22): ADDED Requirements, Purpose, Requirement: HIGH handoff signals identify missing details for manual inspection, Requirement: Large candidate sets do not automate owner assignment, Requirement: Laya cannot replace Canonkit governance or direct evidence, Requirement: Laya receives only minimized task-relevant content, Requirement: Long-text assessment preserves uncertainty and attribution, Requirement: Practical adoption prioritizes quality without additional benchmark campaigns (+14 more)

### Community 36 - "ADDED Requirements"
Cohesion: 0.10
Nodes (20): ADDED Requirements, Requirement: Composite controls preserve one interaction target, Requirement: Interface and gameplay states remain distinct, Requirement: LOW changes remain proportionate, Requirement: Nova provides UI-first visual direction, Requirement: Pixie owns UX and accessibility, Requirement: Shared decisions have distinct owners, Requirement: Skills do not create authority or mandatory dependencies (+12 more)

### Community 37 - "Requirements"
Cohesion: 0.09
Nodes (22): laya-advisory-assessment Specification, Purpose, Requirement: HIGH handoff signals identify missing details for manual inspection, Requirement: Large candidate sets do not automate owner assignment, Requirement: Laya cannot replace Canonkit governance or direct evidence, Requirement: Laya receives only minimized task-relevant content, Requirement: Long-text assessment preserves uncertainty and attribution, Requirement: Practical adoption prioritizes quality without additional benchmark campaigns (+14 more)

### Community 38 - "Requirements"
Cohesion: 0.09
Nodes (22): Purpose, Requirement: Actionable native remediation and honest entry-point scope, Requirement: Diagnostic severity preserves the existing exit contract, Requirement: Read-only multi-harness diagnosis, Requirement: Report effective conflicts without granting access, Requirement: Separate configuration from evidence, Requirements, Scenario: Broken automatic security configuration (+14 more)

### Community 39 - "Requirements"
Cohesion: 0.09
Nodes (22): Purpose, Requirement: Composite controls preserve one interaction target, Requirement: Interface and gameplay states remain distinct, Requirement: LOW changes remain proportionate, Requirement: Nova provides UI-first visual direction, Requirement: Pixie owns UX and accessibility, Requirement: Shared decisions have distinct owners, Requirement: Skills do not create authority or mandatory dependencies (+14 more)

### Community 40 - "models-command.js"
Cohesion: 0.13
Nodes (33): chooseTargets(), installProjectCodex(), main(), projectConfigPath(), projectRoot(), resolve(), setChoice(), userConfigPath() (+25 more)

### Community 41 - "Tasks"
Cohesion: 0.09
Nodes (22): 1. UI-first ownership and agent guidance, 2. Optional skills and compatible project distribution, 3. Integration, independent review and delivery evidence, Accepted V/L traceability, Context measurements, Current evidence (HEAD `2c603c3`; working tree clean apart from archive renames,, Decision (user, 2026-11-11), Document checks (+14 more)

### Community 42 - "hook-opencode.test.js"
Cohesion: 0.11
Nodes (14): OPENCODE_PLUGIN, adapter, call(), coreModule, denied(), FIXTURES, FIXTURES_DIR, HOOKS_DIR (+6 more)

### Community 43 - "ADR 0002 — Hooks Git do Graphify por opt-in"
Cohesion: 0.15
Nodes (10): ADR 0002 — Hooks Git do Graphify por opt-in, Compatibilidade e migração, Decisão, Evidência upstream, Validação e limites, ADR 0003 — `tool add` escreve um bloco no `.gitignore`, Alternativas consideradas, Consequências aceitas (+2 more)

### Community 44 - "models-command.test.js"
Cohesion: 0.13
Nodes (15): accessOf(), assertPrivate(), fixture(), POWERSHELL, SYSTEM, win32Only, opencodeBin(), writeCommand() (+7 more)

### Community 45 - "addSpecialists"
Cohesion: 0.40
Nodes (10): addSpecialists(), choiceFor(), codexAgent(), codexChoiceFor(), copilotAgent(), opencodeAgent(), tomlString(), D5. Claude Code application: frontmatter default + dispatch parameters (+2 more)

### Community 46 - "openspec-explore/SKILL.md"
Cohesion: 0.14
Nodes (14): context(), Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, Planning a Change, The Stance (+6 more)

### Community 47 - "Hooks and gates"
Cohesion: 0.14
Nodes (14): Events it must be registered for, Glob dialect: gitignore-like, not gitignore, Hooks and gates, It fails open, Optional editor schema, Per-project configuration: `.claude/canonkit.json`, `perfBudgets`, Protecting lint and test configuration (+6 more)

### Community 48 - "decide"
Cohesion: 0.14
Nodes (18): 8. Small fixes from the audit, cap(), decide(), gitBypass(), gitCalls(), includedPathReason(), num(), readEvents() (+10 more)

### Community 49 - "P0 — fechar os maiores gaps de evidência"
Cohesion: 0.12
Nodes (17): Casos iniciais, Critério de aceite, Critério de aceite, Critério de aceite, Dashboard, Depois, Fase 1 — Telemetria de contexto do main thread, Fase 2 — Fazer o routing eval validar `model` e `effort` (+9 more)

### Community 50 - "ADDED Requirements"
Cohesion: 0.12
Nodes (16): ADDED Requirements, Purpose, Requirement: Evidence-qualified completion, Requirement: Honest offline evidence, Requirement: Hypothesis-driven debugging, Requirement: Selective regression-first testing, Requirement: Two aspects within existing review, Scenario: Code changed after a passing test (+8 more)

### Community 51 - "ADDED Requirements"
Cohesion: 0.14
Nodes (14): ADDED Requirements, Requirement: Game-art knowledge is an optional project skill, Requirement: Game-art procedures load only for relevant surfaces, Requirement: Game-art procedures preserve domain boundaries, Requirement: Game-art review uses surface-specific visual criteria, Requirement: Knowledge availability does not fabricate a specialist, Scenario: A game settings menu needs layout polish, Scenario: A visual proposal changes a reward rule (+6 more)

### Community 52 - "Requirements"
Cohesion: 0.12
Nodes (16): engineering-delivery Specification, Purpose, Requirement: Evidence-qualified completion, Requirement: Honest offline evidence, Requirement: Hypothesis-driven debugging, Requirement: Selective regression-first testing, Requirement: Two aspects within existing review, Requirements (+8 more)

### Community 53 - "Requirements"
Cohesion: 0.12
Nodes (16): game-art-direction Specification, Purpose, Requirement: Game-art knowledge is an optional project skill, Requirement: Game-art procedures load only for relevant surfaces, Requirement: Game-art procedures preserve domain boundaries, Requirement: Game-art review uses surface-specific visual criteria, Requirement: Knowledge availability does not fabricate a specialist, Requirements (+8 more)

### Community 54 - "Requirements"
Cohesion: 0.12
Nodes (16): Purpose, Requirement: A pack owns one skill copy per fixed project target, Requirement: An unowned destination at any target is a collision, Requirement: Downgrade guidance names every pack the newer CLI wrote, Requirement: Re-adding a legacy pack completes it without altering existing copies, Requirement: Receipts from the two-target CLI are read without migration, Requirement: Unknown receipt entries are still rejected, Requirements (+8 more)

### Community 55 - "allow"
Cohesion: 0.16
Nodes (16): Native controls and optional hooks, Returning to native approvals, The core: `evaluate(evt, env)`, canonkit 2.1.0, For users, Internal, Next, allow() (+8 more)

### Community 56 - "Priority list"
Cohesion: 0.12
Nodes (16): 1. CI on three OS, 2. Provenance and secret scan, 3. Review-noise to 10, 5. Uninstall, 6. Learning loop (the user's view of memory), 7. Stack packs, opt-in per project, 9. Leftovers (low value now), Decisions already made by the user (+8 more)

### Community 57 - "ecc-skills-knowledge-groups-handoff.md"
Cohesion: 0.22
Nodes (6): Purpose, Spec Delta, Purpose, Spec Delta, Purpose, Spec Delta

### Community 58 - "Decisions"
Cohesion: 0.12
Nodes (15): Context, D1. `need: light|standard|deep` replaces `model:`, D2. Adapter interface, Claude adapter first, D3. Catalog separate from choices, D4. Field-wise resolution, D6. Project override reach, D7. When discovery runs, D8. Commands (+7 more)

### Community 59 - "canonkit-hook.test.js"
Cohesion: 0.19
Nodes (13): Decisão, activity(), decide(), HOOK, hookEnv(), inProject(), logged(), pre() (+5 more)

### Community 60 - "Orchestrate"
Cohesion: 0.12
Nodes (16): Briefing by access level, Briefing scratch work, Briefing verification, Compact continuity and finalization, Evidence-based completion, Experimental Laya checks on HIGH handoffs, Incidental findings, Integration Review (+8 more)

### Community 61 - "dana.md"
Cohesion: 0.13
Nodes (14): Anti-patterns to avoid, Authority, Boundaries, Collaboration, Context rules, Data quality checklist, Expected output, Experiment protocol (+6 more)

### Community 62 - "pipe.md"
Cohesion: 0.13
Nodes (14): Boundaries, Collaboration, Conservative production approach, Context rules, Expected output, How to handle deployment and rollback, How to handle incidents and runbooks, Jobs and queues checklist (+6 more)

### Community 63 - "ADR 0001 — `canonkit tool`: um namespace próprio, que só integra"
Cohesion: 0.29
Nodes (7): ADR 0001 — `canonkit tool`: um namespace próprio, que só integra, Alternativas consideradas, Consequências aceitas, Contexto, Emenda 2026-11-12 — WSL: o resolvedor ignora binários do lado Windows, Publisher e pin — o que foi verificado (2026-10-19), Revisar quando

### Community 64 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, dashboard:build, dashboard:typecheck, eval, eval:quality, pack:dry, prepack, prepublishOnly (+7 more)

### Community 65 - "ref_node_child_process"
Cohesion: 0.11
Nodes (4): { contextContributors, retainedTotals, allowedRequest, localHost, server }, HOOK, { normalizeEvent, executionSnapshot }, SERVER

### Community 66 - "hook-codex.test.js"
Cohesion: 0.14
Nodes (9): codexInput(), { evaluate, GATE_KINDS }, FIXTURES, FIXTURES_DIR, HOOKS_DIR, { normalizeCodex, parsePatch, codexOutput, CODEX_GATE_MODES }, patch(), REPO (+1 more)

### Community 67 - "echo.md"
Cohesion: 0.14
Nodes (13): Analysis protocol, Anti-patterns to avoid, Audibility checklist, Authority, Boundaries, Collaboration, Context rules, Expected output (+5 more)

### Community 68 - "ADR 0006 — Modelo e effort escolhidos pela pessoa, a partir do que o harness informa"
Cohesion: 0.29
Nodes (7): Adendo: Codex (2026-11-10), ADR 0006 — Modelo e effort escolhidos pela pessoa, a partir do que o harness informa, Alternativas consideradas, Consequências aceitas, Contexto, Decisão, Quando reavaliar

### Community 69 - "ADR 0005 — Contexto inflado se resolve com handoff manual"
Cohesion: 0.14
Nodes (11): ADR 0004 — Só harnesses que rodam o time em qualidade plena, Alternativas consideradas, Consequências aceitas, Contexto, Decisão, ADR 0005 — Contexto inflado se resolve com handoff manual, Alternativas consideradas, Consequências aceitas (+3 more)

### Community 70 - "Tasks"
Cohesion: 0.14
Nodes (13): 1. Environment evidence and capability selection, 2. Claude policy and native Windows profile, 3. Automatic installation and conservative undo, 4. Read-only diagnostics across harnesses, 5. Integration evidence and independent review, Archive decision — 2026-11-09, Hook-upgrade migration evidence, 2026-11-09, Implementation decisions and evidence (+5 more)

### Community 71 - "Subagents"
Cohesion: 0.14
Nodes (13): Branches, Core team — installed at user level (`~/.claude/agents`), Domain specialists — installed per project (the repository's `.claude/agents/`), Durable preferences, HIGH-risk surfaces and who owns them, Images, Incidental findings, New session when the subject changes (+5 more)

### Community 72 - "check-enforced.mjs"
Cohesion: 0.14
Nodes (9): adapters, BLOCKS, { GATE_KINDS, RECORD_KINDS }, known, listed, out, REPO, requireCjs (+1 more)

### Community 73 - "bob.md"
Cohesion: 0.15
Nodes (12): Authority, Boundaries, Collaboration, Context Rules, Debugging, Expected output, How to Handle Handoffs, Implementation Protocol (+4 more)

### Community 74 - "maya.md"
Cohesion: 0.15
Nodes (12): Analysis protocol, Anti-patterns to avoid, Authority, Boundaries, Collaboration, Context rules, Expected output, Mission (+4 more)

### Community 75 - "spencer.md"
Cohesion: 0.15
Nodes (12): Approach, Authority, Boundaries, Collaboration, Context rules, Documentation protocol, Expected output, Minimum structures (+4 more)

### Community 76 - "canonkit-opencode.js"
Cohesion: 0.26
Nodes (11): core, inputOf(), isObj(), normalizeOpencode(), onExecuteBefore(), onShellCreate(), OPENCODE_GATE_MODES, opencodeDecision() (+3 more)

### Community 77 - "Decisions"
Cohesion: 0.15
Nodes (13): 1. Keep Nova UI-first with explicit cross-media visual authority, 2. Clarify UX boundaries without transferring accessibility, 3. Provide three independent single-file skills, 4. Separate evidence collection from domain judgment, 5. Extend the catalog without changing pack storage, 6. Verify contracts and prepare behavioural evaluation separately, Context, Decisions (+5 more)

### Community 78 - "canonkit"
Cohesion: 0.15
Nodes (13): canonkit, Commands, Documentation, FAQ, How it decides: LOW vs HIGH, If no gate ever fires, License, Risk and scale are two different questions (+5 more)

### Community 79 - "archie.md"
Cohesion: 0.17
Nodes (11): Analysis protocol, Anti-patterns, Authority, Boundaries, Collaboration, Expected output, Mission, Pre-report gate (+3 more)

### Community 80 - "gard.md"
Cohesion: 0.17
Nodes (11): Analysis protocol, Authority, Boundaries, Collaboration, Expected output, Mission, Pre-report gate, Responsibilities (+3 more)

### Community 81 - "perry.md"
Cohesion: 0.17
Nodes (11): Analysis protocol, Boundaries, Collaboration, Context rules, Expected output, Measurement discipline, Mission, Operational authority (+3 more)

### Community 82 - "quinn.md"
Cohesion: 0.17
Nodes (11): Analysis protocol, Authority, Boundaries, Collaboration, Edge-case checklist, Expected output, Mission, Pre-report gate (+3 more)

### Community 83 - "install-report.js"
Cohesion: 0.27
Nodes (9): HARNESS, harnessOfDir(), norm(), ORDER, plural(), renderInstallReport(), shortPath(), home (+1 more)

### Community 84 - "CANONKIT_ROADMAP.md"
Cohesion: 0.17
Nodes (11): 1. Princípios do roadmap, CanonKit — Roadmap de Evolução, Definition of Done do roadmap, Fase 10 — período de freeze, Fase 9 — Dashboard de eficiência por agente e por tipo de trabalho, Não objetivos, Ordem recomendada de implementação, P4 — maturação (+3 more)

### Community 85 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, jsx, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 86 - "Evals"
Cohesion: 0.17
Nodes (12): Always-loaded cost, Case format, Engineering protocol fixtures, Evals, Learning-loop cases, Quality eval, Results: 2.2.0 pre-publish, partial (2026-11-02), Results: lean bodies (2026-10-18) (+4 more)

### Community 87 - "ADDED Requirements"
Cohesion: 0.17
Nodes (11): ADDED Requirements, Purpose, Requirement: Compact resumable handoff, Requirement: Safe finalization, Requirement: Task-scoped delegation, Scenario: Implementation is ready for review, Scenario: Incomplete handoff, Scenario: Independent narrow task (+3 more)

### Community 88 - "Tasks"
Cohesion: 0.13
Nodes (14): usage(), Where the token numbers come from, 10.3 Closure evidence (2026-11-10), 10. Setup interface (user feedback, 2026-11-10), 1. Start clean from the superseded edits, 4. Choices: storage and resolution, 5. Commands, 6. Claude Code application (+6 more)

### Community 89 - "Requirements"
Cohesion: 0.17
Nodes (11): context-continuity Specification, Purpose, Requirement: Compact resumable handoff, Requirement: Safe finalization, Requirement: Task-scoped delegation, Requirements, Scenario: Implementation is ready for review, Scenario: Incomplete handoff (+3 more)

### Community 90 - "iris.md"
Cohesion: 0.18
Nodes (10): Authority, Boundaries, Collaboration, Context rules, Expected output, Mission, Modeling protocol, Non-negotiable principle (+2 more)

### Community 91 - "pixie.md"
Cohesion: 0.18
Nodes (10): Analysis protocol, Authority, Boundaries, Checklist WCAG AA, Collaboration, Composite-control invariant, Expected output, Mission (+2 more)

### Community 92 - "scott.md"
Cohesion: 0.18
Nodes (10): Analysis protocol, Authority, Boundaries, Collaboration, Context rules, Expected output, Mission, Responsibilities (+2 more)

### Community 93 - "Fase 4 — OpenSpec como artefato durável do change lifecycle"
Cohesion: 0.18
Nodes (11): Caminho sugerido, Critério de aceite, Critério de aceite, Fase 4 — OpenSpec como artefato durável do change lifecycle, Fase 6 — Reavaliar o trust boundary dos hooks do Graphify, Fluxo desejado, Implementação provável, Objetivo (+3 more)

### Community 94 - "P5 — evidência de resultado: do sinal à correção"
Cohesion: 0.12
Nodes (16): Critério de aceite, Critério de aceite, Critério de aceite, Definição proposta, Fase 11 — Definir e medir signal-to-fix, Fase 13 — Consolidar evidências de conclusão, sem novo documento obrigatório, Fase 15 — Medir latência da interação e custo por tarefa concluída, Implementação provável (+8 more)

### Community 95 - "Native security, per repository"
Cohesion: 0.33
Nodes (6): Diagnosis and conservative reversal, Environment and version coverage, Native approval modes stay native, Native security, per repository, Network and separate tools, Returning existing Claude installations to native approvals

### Community 96 - "configFor"
Cohesion: 0.31
Nodes (11): configFor(), isObj(), isWithin(), loadConfig(), locateConfig(), normalizePath(), onProject(), projectPath() (+3 more)

### Community 97 - "Design"
Cohesion: 0.18
Nodes (10): Choose tools for the real input, Context, Decisions, Design, Goals / Non-Goals, Keep the orchestrator as the control point, Learn through existing work evidence, Migration Plan (+2 more)

### Community 98 - "nova.md"
Cohesion: 0.20
Nodes (9): Analysis protocol, Authority, Boundaries, Collaboration, Context rules, Expected output, Mission, Responsibilities (+1 more)

### Community 99 - "OpenSpec Agent"
Cohesion: 0.20
Nodes (9): Agent-Compatible CLI Commands (prefer `--json` for structured output), Available Commands, Best Practices, Creating New Changes, Interactive CLI Commands (use when prompted by the user), Key Directories, OpenSpec Agent, What is OpenSpec? (+1 more)

### Community 100 - "Tasks"
Cohesion: 0.20
Nodes (10): 1. Baseline and discovery, 2. Choice interface and diagnosis, 3. Generated agents and project reach, 4. Guidance and delivery checks, Baseline evidence, Codex runtime evidence, Final verification (2026-11-10, after last edit), Integration and documentation review (+2 more)

### Community 101 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, react, react-dom, @types/prompts, @types/react, @types/react-dom, typescript, vite (+2 more)

### Community 102 - "uninstall.test.js"
Cohesion: 0.22
Nodes (5): manifest(), manifestFile(), markers, run(), store()

### Community 103 - "Frontend third-party notices"
Cohesion: 0.40
Nodes (4): BSD 3-Clause License, Frontend third-party notices, ISC License, MIT License

### Community 104 - "model-config.js"
Cohesion: 0.29
Nodes (10): APPLIED, checkEntry(), empty(), FIELDS, HONORED_FIELDS, readChoices(), refuseProjectLinks(), SOURCES (+2 more)

### Community 105 - "Project tools: graphify and openspec"
Cohesion: 0.22
Nodes (9): Before enabling the git hooks, canonkit integrates, it never installs, Experimental handoff checks, graphify, Keeping the graph fresh, Laya, openspec, Project tools: graphify and openspec (+1 more)

### Community 106 - "ADDED Requirements"
Cohesion: 0.22
Nodes (8): ADDED Requirements, Purpose, Requirement: Existing requirements stay authoritative, Requirement: Proportional product clarification, Scenario: Clear small request, Scenario: Project uses OpenSpec, Scenario: Vague product outcome, Spec Delta

### Community 107 - "product-discovery Specification"
Cohesion: 0.22
Nodes (8): product-discovery Specification, Purpose, Requirement: Existing requirements stay authoritative, Requirement: Proportional product clarification, Requirements, Scenario: Clear small request, Scenario: Project uses OpenSpec, Scenario: Vague product outcome

### Community 108 - "Learning loop"
Cohesion: 0.22
Nodes (7): Learning proposal, Evaluate and decide, General contributions, Investigate, Learning loop, Privacy, Review and expiry

### Community 109 - "renderDoctorReport"
Cohesion: 0.46
Nodes (6): clip(), label(), mark(), renderDoctorReport(), wrap(), rows

### Community 110 - "Handoff: Laya version check, eval rerun, and new-resource exploration"
Cohesion: 0.25
Nodes (7): CanonKit rules to respect, First steps for the new session, Goal, Handoff: Laya version check, eval rerun, and new-resource exploration, New resources to try (verify exposure in 0.4.30 MCP), Prior evidence (this session, 2026-11-09), Prior score snapshot

### Community 111 - "The team"
Cohesion: 0.25
Nodes (8): Boundaries that tend to confuse, Conventions, Core team, Domain specialists, Engineering delivery, Integration Review, Learning loop, The team

### Community 112 - "Decisions"
Cohesion: 0.25
Nodes (8): 1. One small security helper; existing CLI owns mutations, 2. Automatic best-supported default, existing strict requirements preserved, 3. Restrict each surface with its actual controls, 4. Network closed to new destinations; no stack-derived grants, 5. Separate repository security from global distribution and hook wiring, 6. Read-only diagnosis, evidence per harness, 7. Native-default upgrade migration (authorized 2026-11-09), Decisions

### Community 113 - "Proposal"
Cohesion: 0.25
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 114 - "Proposal"
Cohesion: 0.25
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 115 - "Proposal"
Cohesion: 0.25
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 116 - "Requirement: Person chooses from the discovered list"
Cohesion: 0.40
Nodes (5): Requirement: Person chooses from the discovered list, Scenario: Assign a level for Claude Code, Scenario: Choices are menus of what was discovered, Scenario: Nothing is written before confirmation, Scenario: Offered during the interactive install

### Community 117 - "Proposal"
Cohesion: 0.25
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 118 - "Interface design"
Cohesion: 0.25
Nodes (7): Evidence and handoff, Interface design, M1 — Direction and concrete finish, M2 — States and promised outcomes, M3 — Design for actual content and operation, M4 — Purposeful and stable motion, Scope and authority

### Community 119 - "Rendered interface review"
Cohesion: 0.22
Nodes (8): Choose the relevant checks, Composite controls when the risk calls for it, Evidence, verdict and recheck, M1 — Inspect the intended visual language, M2 — Exercise applicable states and outcomes, M3 — Rendered content, access and failures, M4 — Motion, geometry and continuity, Rendered interface review

### Community 120 - "migrateClaudeHooks"
Cohesion: 0.31
Nodes (8): isCanonicalClaudeHook(), mentionsKit(), migrateClaudeHooks(), object(), configuration(), equalJson(), unwireTrackedHooks(), unwireTrackedPermissions()

### Community 121 - "Ordem sugerida"
Cohesion: 0.29
Nodes (7): Bob, Ordem sugerida, Perry, Pipe, Scott, Spencer, Virgo

### Community 122 - "Fase 5 — Freshness explícita do Graphify"
Cohesion: 0.29
Nodes (7): Critério de aceite, Fase 5 — Freshness explícita do Graphify, Objetivo, Opção A — instrução + check leve, Opção B — status no CanonKit, Opções, da menor para a maior, Problema

### Community 123 - "4. Universal layout + enforcement outside Claude Code (largest real gap)"
Cohesion: 0.33
Nodes (7): 4. Universal layout + enforcement outside Claude Code (largest real gap), askFor(), contextBands(), contextReminder(), currentContextTokens(), denyFor(), projectConfig()

### Community 124 - "highRisk"
Cohesion: 0.38
Nodes (7): highRisk(), isAbsolutePath(), isNoise(), isPerfBudget(), isTestFile(), namesAuth(), projectAdds()

### Community 125 - "Design"
Cohesion: 0.29
Nodes (6): Consultation and source evidence, Context, Design, Goals / Non-Goals, Migration Plan, Risks / Trade-offs

### Community 126 - "ADDED Requirements"
Cohesion: 0.29
Nodes (6): ADDED Requirements, Purpose, Requirement: Automatic installation of supported restrictions, Scenario: Global distribution without a repository target, Scenario: Plain Claude installation, Spec Delta

### Community 127 - "Requirement: Restrictive and reversible installation lifecycle"
Cohesion: 0.29
Nodes (7): Requirement: Restrictive and reversible installation lifecycle, Scenario: Broken settings in a mixed-target installation, Scenario: Dry run, Scenario: Ordinary global removal, Scenario: Project-only reversal, Scenario: Reinstallation or environment change, Scenario: User edits settings after installation

### Community 128 - "Proposal"
Cohesion: 0.18
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 129 - "ADDED Requirements"
Cohesion: 0.13
Nodes (15): ADDED Requirements, Purpose, Requirement: Codex discovery reports models and their own efforts, Requirement: Codex generated agents apply resolved choices, Requirement: Codex setup ties effort to the chosen model, Scenario: Catalog is available without login, Scenario: Choice is cleared, Scenario: Codex reports a catalog (+7 more)

### Community 130 - "Proposal"
Cohesion: 0.29
Nodes (6): Capabilities, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 131 - "Proposal"
Cohesion: 0.29
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 132 - "Requirements"
Cohesion: 0.29
Nodes (6): environment-security-policy Specification, Purpose, Requirement: Automatic installation of supported restrictions, Requirements, Scenario: Global distribution without a repository target, Scenario: Plain Claude installation

### Community 133 - "Requirement: Restrictive and reversible installation lifecycle"
Cohesion: 0.29
Nodes (7): Requirement: Restrictive and reversible installation lifecycle, Scenario: Broken settings in a mixed-target installation, Scenario: Dry run, Scenario: Ordinary global removal, Scenario: Project-only reversal, Scenario: Reinstallation or environment change, Scenario: User edits settings after installation

### Community 134 - "Go"
Cohesion: 0.29
Nodes (6): Establish the project, Go, Implementation and diagnosis, Security when relevant, Team boundary, Verify the changed boundary

### Community 135 - "Kotlin"
Cohesion: 0.29
Nodes (6): Establish the project, Framework boundaries when present, Implementation and diagnosis, Kotlin, Team boundary, Verify the changed boundary

### Community 136 - "Swift"
Cohesion: 0.29
Nodes (6): Establish the project, Implementation and diagnosis, Security when relevant, Swift, Team boundary, Verify the changed boundary

### Community 137 - "Go"
Cohesion: 0.29
Nodes (6): Establish the project, Go, Implementation and diagnosis, Security when relevant, Team boundary, Verify the changed boundary

### Community 138 - "Go"
Cohesion: 0.29
Nodes (6): Establish the project, Go, Implementation and diagnosis, Security when relevant, Team boundary, Verify the changed boundary

### Community 139 - "Fase 12 — Capturar feedback real e vinculá-lo à hipótese de produto"
Cohesion: 0.33
Nodes (6): Critério de aceite, Fase 12 — Capturar feedback real e vinculá-lo à hipótese de produto, Fluxo desejado, Implementação provável, Privacidade, Problema

### Community 140 - "Fase 8 — Gate quantitativo para Caveman / Shunt"
Cohesion: 0.33
Nodes (6): Fase 8 — Gate quantitativo para Caveman / Shunt, P3 — decidir se ferramentas externas ainda são necessárias, Ponytail, Se o principal custo for `Bash`, logs, JSON e test output, Se o principal custo for `Read`, Se o problema for sessão longa

### Community 141 - "Learning from mistakes"
Cohesion: 0.33
Nodes (6): Contributing a general improvement, Evidence, privacy and authorization, Learning from mistakes, Review and expiry, Source changes and installation, What you receive

### Community 142 - "Context tune"
Cohesion: 0.33
Nodes (5): 1. Measure the baseline, 2. Separate signal from noise, 4. What not to do, 5. Measure again and report, Context tune

### Community 143 - "README.md"
Cohesion: 0.11
Nodes (15): C++, Establish the project, Implementation and diagnosis, Team boundary, Verify the changed boundary, Authority and scope, Establish the direction and viewing context, Findings and evidence (+7 more)

### Community 144 - "C# / .NET"
Cohesion: 0.33
Nodes (5): C# / .NET, Establish the project, Implementation and diagnosis, Team boundary, Verify the changed boundary

### Community 145 - "Releasing canonkit"
Cohesion: 0.50
Nodes (4): One-time setup (account owner), Release, Releasing canonkit, When it fails

### Community 146 - "Java"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, Java, Team boundary, Verify the changed boundary

### Community 147 - "Python"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, Python, Team boundary, Verify the changed boundary

### Community 148 - "Requirement: User and project configuration with override"
Cohesion: 0.50
Nodes (4): Requirement: User and project configuration with override, Scenario: Nothing configured, Scenario: Project overrides a level, Scenario: Project raises only effort

### Community 149 - "Rust"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, Rust, Team boundary, Verify the changed boundary

### Community 150 - "React"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, React, Team boundary, Verify the changed boundary

### Community 151 - "React"
Cohesion: 0.33
Nodes (5): Establish the project, Implementation and diagnosis, React, Team boundary, Verify the changed boundary

### Community 152 - "Fase 7 — Testar a “solution ladder” antes de adicioná-la ao Bob"
Cohesion: 0.40
Nodes (5): Critério de aceite, Fase 7 — Testar a “solution ladder” antes de adicioná-la ao Bob, Importante, P2 — melhorias condicionais, Resultado medido

### Community 154 - "syncClaudeRouting"
Cohesion: 0.11
Nodes (26): applyBlock(), applyBlockLf(), esc(), gitignoreMarkers(), gitignorePlan(), gitignoreRoot(), graphifyHooksProblems(), hookSnapshot() (+18 more)

### Community 155 - "Handoff: `canonkit tool add` on WSL (graphify, openspec)"
Cohesion: 0.40
Nodes (4): Branch note, Done (committed on `docs/ecc-skills-knowledge-groups-review`), Handoff: `canonkit tool add` on WSL (graphify, openspec), Not done yet

### Community 156 - "Requirement: Network authorization remains outside repository control"
Cohesion: 0.40
Nodes (5): Requirement: Network authorization remains outside repository control, Scenario: A dependency registry is suggested, Scenario: Harness merges a repository expansion, Scenario: Strict sandbox network configuration, Scenario: Unsandboxed or separate network tool

### Community 157 - "Requirement: Repository data boundary and limited exceptions"
Cohesion: 0.40
Nodes (5): Requirement: Repository data boundary and limited exceptions, Scenario: Another project is opened later, Scenario: File-tool controls are version-dependent, Scenario: Shell reads need separate restrictions, Scenario: Windows drives and links

### Community 158 - "Requirement: The approved strict network setting has trusted global scope"
Cohesion: 0.40
Nodes (5): Requirement: The approved strict network setting has trusted global scope, Scenario: Existing strict network setting, Scenario: Other harnesses selected, Scenario: Strict network configuration without hook wiring, Scenario: Unsupported or unknown version

### Community 159 - "Tasks"
Cohesion: 0.40
Nodes (4): 1. Implement practical use, 2. Verify the instructions, 3. Apply the static-audit corrections, Tasks

### Community 160 - "Requirement: Network authorization remains outside repository control"
Cohesion: 0.40
Nodes (5): Requirement: Network authorization remains outside repository control, Scenario: A dependency registry is suggested, Scenario: Harness merges a repository expansion, Scenario: Strict sandbox network configuration, Scenario: Unsandboxed or separate network tool

### Community 161 - "Requirement: Repository data boundary and limited exceptions"
Cohesion: 0.40
Nodes (5): Requirement: Repository data boundary and limited exceptions, Scenario: Another project is opened later, Scenario: File-tool controls are version-dependent, Scenario: Shell reads need separate restrictions, Scenario: Windows drives and links

### Community 162 - "Requirement: The approved strict network setting has trusted global scope"
Cohesion: 0.40
Nodes (5): Requirement: The approved strict network setting has trusted global scope, Scenario: Existing strict network setting, Scenario: Other harnesses selected, Scenario: Strict network configuration without hook wiring, Scenario: Unsupported or unknown version

### Community 163 - "Changelog"
Cohesion: 0.50
Nodes (3): Added, Changelog, Unreleased

### Community 164 - "Keeping findings outside the current task"
Cohesion: 0.50
Nodes (4): Availability and evidence limits, Example: two findings during an unrelated plan, Keeping findings outside the current task, Review and publication

### Community 165 - "opencode-plugin.mjs"
Cohesion: 0.83
Nodes (3): require, setup(), warn()

### Community 166 - "Requirement: Capability-based environment selection"
Cohesion: 0.50
Nodes (4): Requirement: Capability-based environment selection, Scenario: Container and WSL evidence overlap, Scenario: Marker or dependency is insufficient, Scenario: Native Windows remains usable

### Community 167 - "Requirement: Native approval modes remain authoritative"
Cohesion: 0.50
Nodes (4): Requirement: Native approval modes remain authoritative, Scenario: Additional access is attempted, Scenario: Optional decision hook is absent, Scenario: User switches native modes

### Community 168 - "Requirement: Reinstallation migrates attributable legacy Claude hooks"
Cohesion: 0.50
Nodes (4): Requirement: Reinstallation migrates attributable legacy Claude hooks, Scenario: Existing user upgrades to native defaults, Scenario: Explicit optional hooks and subsequent removal, Scenario: Mixed or ambiguous integrations

### Community 169 - "Requirement: Strict sandbox configuration preserves explicit requirements"
Cohesion: 0.50
Nodes (4): Requirement: Strict sandbox configuration preserves explicit requirements, Scenario: Existing strict policy on native Windows, Scenario: Missing dependency or unknown effective override, Scenario: Sandbox-capable platform

### Community 170 - "Requirement: Claude Code dispatches carry the effective choice"
Cohesion: 0.67
Nodes (3): Requirement: Claude Code dispatches carry the effective choice, Scenario: Dispatch in a project with a deep override, Scenario: Nothing configured

### Community 171 - "Requirement: Vendor-neutral agent need level"
Cohesion: 0.67
Nodes (3): Requirement: Vendor-neutral agent need level, Scenario: Agent declares a need level, Scenario: Agent still names a vendor model

### Community 173 - "Requirement: Capability-based environment selection"
Cohesion: 0.50
Nodes (4): Requirement: Capability-based environment selection, Scenario: Container and WSL evidence overlap, Scenario: Marker or dependency is insufficient, Scenario: Native Windows remains usable

### Community 174 - "Requirement: Native approval modes remain authoritative"
Cohesion: 0.50
Nodes (4): Requirement: Native approval modes remain authoritative, Scenario: Additional access is attempted, Scenario: Optional decision hook is absent, Scenario: User switches native modes

### Community 175 - "Requirement: Reinstallation migrates attributable legacy Claude hooks"
Cohesion: 0.50
Nodes (4): Requirement: Reinstallation migrates attributable legacy Claude hooks, Scenario: Existing user upgrades to native defaults, Scenario: Explicit optional hooks and subsequent removal, Scenario: Mixed or ambiguous integrations

### Community 176 - "Requirement: Strict sandbox configuration preserves explicit requirements"
Cohesion: 0.50
Nodes (4): Requirement: Strict sandbox configuration preserves explicit requirements, Scenario: Existing strict policy on native Windows, Scenario: Missing dependency or unknown effective override, Scenario: Sandbox-capable platform

### Community 178 - "canonkit 2.5.0"
Cohesion: 0.67
Nodes (3): canonkit 2.5.0, For users, Verification and limits

### Community 179 - "Requirement: Native configuration is not shell authorization"
Cohesion: 0.67
Nodes (3): Requirement: Native configuration is not shell authorization, Scenario: Existing permissive personal rule, Scenario: Windows security is installed

### Community 180 - "Requirement: No implicit machine provisioning"
Cohesion: 0.67
Nodes (3): Requirement: No implicit machine provisioning, Scenario: Stronger environment is absent, Scenario: Windows user chooses native operation

### Community 181 - "Requirement: Native configuration is not shell authorization"
Cohesion: 0.67
Nodes (3): Requirement: Native configuration is not shell authorization, Scenario: Existing permissive personal rule, Scenario: Windows security is installed

### Community 182 - "Requirement: No implicit machine provisioning"
Cohesion: 0.67
Nodes (3): Requirement: No implicit machine provisioning, Scenario: Stronger environment is absent, Scenario: Windows user chooses native operation

### Community 183 - "repository"
Cohesion: 0.67
Nodes (3): repository, type, url

## Knowledge Gaps
- **1345 isolated node(s):** `READ_TOOLS`, `PACKAGE_ROOT`, `AGENTS_DIR`, `REFERENCE_DIR`, `HOOKS_DIR` (+1340 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1492 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `doctor()` connect `doctor` to `Proposal`, `cli.js`, `Proposal`, `InstallManifest`, `installDistribution`, `Requirements`, `ADDED Requirements`, `security.js`, `validate.mjs`, `install`, `isObject`, `cli-install.test.js`, `syncClaudeRouting`, `unknown`, `ADDED Requirements`, `Requirements`, `models-command.js`, `addSpecialists`, `openspec-explore/SKILL.md`, `Hooks and gates`, `allow`, `Decisions`, `ADR 0006 — Modelo e effort escolhidos pela pessoa, a partir do que o harness informa`, `canonkit`, `CANONKIT_ROADMAP.md`, `Tasks`, `P5 — evidência de resultado: do sinal à correção`, `Native security, per repository`, `Tasks`, `model-config.js`, `renderDoctorReport`, `Proposal`?**
  _High betweenness centrality (0.173) - this node is a cross-community bridge._
- **Are the 60 inferred relationships involving `doctor()` (e.g. with `mentionsHook()` and `ruleText()`) actually correct?**
  _`doctor()` has 60 INFERRED edges - model-reasoned connections that need verification._
- **What connects `READ_TOOLS`, `PACKAGE_ROOT`, `AGENTS_DIR` to the rest of the system?**
  _1345 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `eval-quality.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.07146087743102668 - nodes in this community are weakly interconnected._
- **Why does `install()` connect `install` to `cli.js`, `validate-python.py`, `installDistribution`, `Requirements`, `ADDED Requirements`, `security.js`, `validate.mjs`, `isObject`, `cli-install.test.js`, `exec.js`, `doctor`, `ADDED Requirements`, `Requirements`, `models-command.js`, `addSpecialists`, `allow`, `Priority list`, `Decisions`, `ADR 0001 — `canonkit tool`: um namespace próprio, que só integra`, `ADR 0006 — Modelo e effort escolhidos pela pessoa, a partir do que o harness informa`, `canonkit`, `Tasks`, `Native security, per repository`, `model-config.js`, `Decisions`, `Proposal`, `Requirement: Person chooses from the discovered list`, `Proposal`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Are the 38 inferred relationships involving `install()` (e.g. with `Publisher e pin — o que foi verificado (2026-10-19)` and `Decisão`) actually correct?**
  _`install()` has 38 INFERRED edges - model-reasoned connections that need verification._
- **Should `cli.js` be split into smaller, more focused modules?**
  _Cohesion score 0.057004830917874394 - nodes in this community are weakly interconnected._
# Spec Delta

## Purpose

Let each person run canonkit agents on the models and reasoning efforts their own harnesses and subscriptions actually offer, discovered at runtime and chosen by them, instead of a cross-vendor equivalence shipped in the package.

## ADDED Requirements

### Requirement: Vendor-neutral agent need level
Every agent source SHALL declare its demand as a need level `light`, `standard` or `deep`, and SHALL NOT name a vendor model. Validation MUST fail an agent with a missing or unknown need level, or with a vendor model label.

#### Scenario: Agent declares a need level
- **WHEN** an agent source declares `need: deep`
- **THEN** validation passes and the agent resolves its model through the `deep` level

#### Scenario: Agent still names a vendor model
- **WHEN** an agent source declares `model: opus` instead of a need level
- **THEN** validation fails and names the field to replace

### Requirement: No shipped cross-vendor equivalence
Canonkit SHALL NOT ship a mapping from one vendor's models or efforts to another's. Without a configured choice, a generated agent MUST omit model and effort so the harness uses the session model and its own default effort.

#### Scenario: Install with no model configuration
- **WHEN** a person installs for Claude Code and Codex with no model configuration
- **THEN** no generated agent pins a model or reasoning effort

### Requirement: Runtime discovery per harness
`canonkit models refresh` SHALL ask each supported installed harness what models and efforts it offers and record, per harness, the normalized entries with model id and supported efforts when known, plus the discovery time, harness version and source command.

#### Scenario: Claude Code reports aliases and efforts
- **WHEN** Claude Code is installed and its CLI reports model aliases and effort levels
- **THEN** the record lists those aliases as models, each with the reported efforts

### Requirement: Discovery degrades to unknown, never to failure
A harness without an adapter, or whose CLI is absent, fails or times out, SHALL be recorded as `unknown` with the reason, and the command MUST continue with the other harnesses and exit successfully.

#### Scenario: Harness not yet supported
- **WHEN** `models refresh` runs with Codex installed
- **THEN** Codex is recorded as unknown with reason "not yet supported" and Claude Code is still discovered

#### Scenario: Claude CLI output changed
- **WHEN** the Claude CLI output no longer contains recognizable model or effort information
- **THEN** Claude Code is recorded as unknown with the reason and the command exits successfully

### Requirement: Discovery is explicit and contained
Discovery SHALL run only the harness's own read-only commands, only from `models refresh`, `models setup` or a non-dry-run install. It MUST NOT read credential contents or store tokens, and a dry run MUST NOT start any program.

#### Scenario: Dry-run install
- **WHEN** `canonkit install --dry-run` runs
- **THEN** no harness program is started and the output says discovery would run

### Requirement: Person chooses from the discovered list
`canonkit models setup` SHALL present the discovered models and efforts and let the person assign one model and effort to each need level, and optionally to individual agents. A value outside the discovered list MUST be accepted only on explicit entry and recorded as unverified.

#### Scenario: Assign a level for Claude Code
- **WHEN** the person runs setup and picks a discovered Claude model and effort for `standard`
- **THEN** the chosen values are saved for Claude Code's `standard` level

#### Scenario: Choices are menus of what was discovered
- **WHEN** discovery reported models and efforts
- **THEN** setup offers them, plus inherit, as selectable lists with the current value preselected, and a model outside the list only through an explicit "other" entry

#### Scenario: Nothing is written before confirmation
- **WHEN** the person cancels at any question or declines the final save
- **THEN** the choices file is unchanged

#### Scenario: Offered during the interactive install
- **WHEN** the person runs `install` in a terminal without a harness flag and selects Claude Code
- **THEN** install offers the setup step before writing agents, and a cancel there cancels the install; a flag-driven or non-terminal install never asks

### Requirement: Need levels are the recommended path
Setup SHALL offer need-level assignment first and present per-agent overrides as optional. Reports MUST mark per-agent overrides distinctly from level assignments.

#### Scenario: Override one agent
- **WHEN** the person keeps level assignments and adds an override for one agent
- **THEN** only that agent resolves to the override and `models show` labels it as an agent override

### Requirement: User and project configuration with override
Choices SHALL be stored in a user configuration and an optional project configuration. Per harness and agent, the effective choice MUST resolve in order: project agent override, project level, user agent override, user level, inherit. Model and effort resolve independently.

#### Scenario: Project overrides a level
- **WHEN** the user configuration sets `deep` for Claude Code and the project configuration sets a different `deep` model
- **THEN** inside that project, `deep` agents resolve to the project's model

#### Scenario: Project raises only effort
- **WHEN** the project configuration sets only an effort for `standard`
- **THEN** `standard` agents resolve to the user's model with the project's effort

#### Scenario: Nothing configured
- **WHEN** neither configuration sets a choice for a harness
- **THEN** every agent of that harness resolves to inherit

### Requirement: Project configuration stays inside the project
Project configuration SHALL affect only project-scoped agent files and dispatches inside that project. It MUST NOT change user-level installed agents or any file outside the project.

#### Scenario: Install from inside a configured project
- **WHEN** `canonkit install` runs from a project with its own model configuration
- **THEN** user-level agents are generated from the user configuration only

### Requirement: Inspect effective choices
`canonkit models show` SHALL print, per harness and agent, the effective model and effort and the layer each came from, with a machine-readable form. It MUST read stored data only and start no harness program.

#### Scenario: Show as JSON inside a project
- **WHEN** the person runs `models show --json` inside a configured project
- **THEN** the output lists each agent's resolved model, effort and source layer, or inherit

### Requirement: Claude Code dispatches carry the effective choice
In Claude Code, instructions SHALL direct every planned dispatch to pass the agent's effective model and effort from `models show` as the dispatch's model and effort parameters, and to omit a parameter that resolves to inherit. Instructions MUST NOT name vendor models as defaults.

#### Scenario: Dispatch in a project with a deep override
- **WHEN** the lead dispatches a `deep` agent in a project whose configuration overrides the `deep` model
- **THEN** the dispatch passes the project's model as its model parameter

#### Scenario: Nothing configured
- **WHEN** the agent resolves to inherit for model and effort
- **THEN** the dispatch passes neither parameter

### Requirement: Install applies resolved choices where verified
`install` and `add` SHALL write a resolved model or effort into a generated agent only in a field that harness is verified to honor, and MUST omit any field not resolved or not verified. Reinstalling MUST remove previously written values the configuration no longer sets.

#### Scenario: Choice removed from configuration
- **WHEN** a Claude model was configured, installed, then removed from configuration and install runs again
- **THEN** the regenerated Claude agents no longer carry that model

### Requirement: Doctor reports drift without failing
`doctor` SHALL warn, not fail, when a configured model or effort is absent from the latest discovery, when a choice is unverified, or when the discovery record is missing or stale, and SHALL state that affected agents fall back to inherit. Doctor MUST use stored data and start no harness program.

#### Scenario: Configured model disappeared
- **WHEN** the latest Claude discovery no longer lists the configured `deep` model
- **THEN** doctor warns, names the model, the level and the agents affected, and exits with its usual status

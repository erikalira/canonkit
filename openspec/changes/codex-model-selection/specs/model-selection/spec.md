# Spec Delta

## Purpose

Lets a person choose models and reasoning efforts offered by each supported harness for canonkit agents, with safe inheritance when a choice cannot be applied.

## ADDED Requirements

### Requirement: Codex discovery reports models and their own efforts
When Codex discovery succeeds, canonkit SHALL record model IDs and each model's supported effort levels from the Codex catalog. It MUST label the experimental source and MUST NOT treat a bundled fallback as proof of account access.

#### Scenario: Codex reports a catalog
- **WHEN** `models refresh --codex` receives a valid Codex model catalog
- **THEN** the stored Codex entries contain model IDs and the effort levels reported for each ID

#### Scenario: Catalog is available without login
- **WHEN** Codex returns only its bundled catalog without authentication
- **THEN** canonkit identifies that source as bundled or unconfirmed for account access, rather than asserting that the listed models are available to the person

#### Scenario: Debug output changes or refresh fails
- **WHEN** Codex exits unsuccessfully, times out, or returns an unrecognized catalog
- **THEN** Codex discovery is recorded as `unknown` with a reason, while discovery of other selected harnesses continues

### Requirement: Codex setup ties effort to the chosen model
Codex setup SHALL offer the selected model's reported efforts only. A model or effort outside its reported pair MUST require explicit entry or retention and be marked unverified.

#### Scenario: Model has fewer effort levels
- **WHEN** the person selects a Codex model whose catalog entry supports only `low` and `medium`
- **THEN** its effort menu offers `low`, `medium`, and inherit, without effort levels from other models

#### Scenario: Existing effort conflicts with a new model
- **WHEN** the person changes the model and the previous effort is unsupported by the new model
- **THEN** setup requires a new compatible effort or inherit before saving

#### Scenario: Setup is cancelled
- **WHEN** the person cancels Codex setup or declines the save confirmation
- **THEN** the choices file is unchanged

### Requirement: Codex generated agents apply resolved choices
Canonkit SHALL write a configured Codex model and compatible effort to fields the current Codex agent format honors. It SHALL omit unresolved fields and remove previously generated fields after choices are cleared.

#### Scenario: User choice is installed
- **WHEN** a user-level Codex choice resolves to a model and effort
- **THEN** the installed agent file contains `model` and `model_reasoning_effort` with those values

#### Scenario: Choice is cleared
- **WHEN** a previously configured Codex agent resolves to inherit after reinstall
- **THEN** its generated file contains neither setting

#### Scenario: Effective pair becomes incompatible
- **WHEN** independently resolved model and effort values are incompatible in the latest catalog
- **THEN** canonkit writes neither setting for that agent, reports the conflict, and lets the agent inherit

### Requirement: Codex project choices reach project dispatches
A project Codex choice SHALL affect dispatches in that project without changing user-level installed files. `models show` SHALL identify the source of each effective field, and `doctor` SHALL warn about unverified or incompatible values using stored data only.

#### Scenario: Project overrides a core agent
- **WHEN** a project config changes a core Codex agent's model or effort and the project-scoped agent is installed
- **THEN** a dispatch of that agent in the project uses the effective project choice, while its user-level file remains based on user choices

#### Scenario: Project agent already belongs to someone else
- **WHEN** a project already has a same-name agent file that canonkit does not own
- **THEN** install preserves that file and reports that it could not apply the project override

#### Scenario: Project destination is linked
- **WHEN** a project `.codex` agent destination resolves through a link or junction outside the repository
- **THEN** install refuses the write and leaves the destination unchanged

#### Scenario: Show and doctor are read-only
- **WHEN** `models show` or `doctor` examines Codex choices
- **THEN** neither command starts Codex, and both identify conflicts or unverified choices from stored data

#### Scenario: Project core file is missing or diverges
- **WHEN** a project choice requires a core agent file that is absent, unowned, edited or stale against the current choices or agent instructions
- **THEN** `models show` reports its project file status and `doctor` warns without starting Codex

#### Scenario: Project choice is cleared before reinstall
- **WHEN** a receipt-owned project core file remains after its project choice is cleared
- **THEN** `models show` reports pending removal and `doctor` warns until a project reinstall retires it

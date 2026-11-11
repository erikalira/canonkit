# Spec Delta

## Purpose

Let each canonkit agent declare, in a vendor-neutral way, how much of the harness's tool surface it needs, so that agents which only read start with less context while every other agent keeps its current behavior.

## ADDED Requirements

### Requirement: Vendor-neutral access level
An agent source MAY declare one access level; when it does, the declaration SHALL be a single lowercase `access: <value>` line whose value is `read`, `inspect`, `write-docs` or `full`. `read` is reading, shell and web research without MCP tools; `inspect` is everything except editing and writing files, MCP tools included; `write-docs` is `read` plus editing and writing files; `full` is no restriction.

#### Scenario: Declared level
- **WHEN** an agent source declares `access: read`
- **THEN** validation accepts the source and records the level for installers

#### Scenario: Malformed declaration
- **WHEN** an agent source writes `access` as a list, on several lines, or with a different case
- **THEN** validation fails instead of ignoring the declaration

### Requirement: Harness field names reserved
An agent source SHALL NOT carry a frontmatter key that a harness would interpret as a tool or context restriction, including `tools`, `disallowedTools`, `skills`, `mcpServers` and `omitClaudeMd`.

#### Scenario: Reserved key in a source
- **WHEN** an agent source contains the key `tools`
- **THEN** validation fails and names the key and the source

#### Scenario: Generated agent keeps only installer output
- **WHEN** an agent is installed for Claude Code
- **THEN** every tool restriction in the generated agent comes from the installer's translation of `access`, never from a key copied out of the source

### Requirement: Absent access preserves current behavior
An agent source without `access` SHALL install exactly as it does without this capability: it inherits every tool the harness offers.

#### Scenario: Legacy agent
- **WHEN** an agent source has no `access` field and is installed
- **THEN** the generated agent has no tool restriction

#### Scenario: Project specialist
- **WHEN** a project specialist installed with `canonkit add` declares no `access`
- **THEN** it inherits every tool until its owner declares a level

### Requirement: Unknown access value rejected
Validation SHALL fail an agent source whose `access` is not one of the accepted values, and the accepted values SHALL be defined once and shared by validation and installation.

#### Scenario: Misspelled level
- **WHEN** an agent source declares `access: readonly`
- **THEN** validation fails and lists the accepted values

#### Scenario: Value lists cannot drift
- **WHEN** the accepted levels change in one place
- **THEN** validation and the installer both use the new list, or a test fails

### Requirement: Claude Code translation
When installing for Claude Code, the installer SHALL translate each declared level into a tool restriction in the generated agent: `read` and `write-docs` allow only the tools their definition names, `inspect` withholds only file editing and writing, and `full` adds no restriction.

#### Scenario: Read agent
- **WHEN** an agent with `access: read` is installed for Claude Code
- **THEN** the generated agent cannot call file-editing, file-writing or MCP tools

#### Scenario: Inspect agent
- **WHEN** an agent with `access: inspect` is installed for Claude Code
- **THEN** the generated agent cannot edit or write files and keeps every MCP tool, whatever the name the server was installed under

#### Scenario: Full agent
- **WHEN** an agent with `access: full` is installed for Claude Code
- **THEN** the generated agent carries no tool restriction

### Requirement: Restriction keeps what the team rules need
A restricted agent SHALL keep the ability to deliver its final message to the caller, to invoke an installed skill that its own instructions cite, and, for `read`, `inspect` and `write-docs`, to search and fetch the web. A level that would remove any of them SHALL NOT be installed.

#### Scenario: Cited skill
- **WHEN** a restricted agent's instructions cite the `orchestrate` skill
- **THEN** the generated agent can still invoke that skill

#### Scenario: Result delivery
- **WHEN** a restricted agent finishes a review, in foreground or in background
- **THEN** its report reaches the caller as it does for an unrestricted agent

#### Scenario: Platform capability check
- **WHEN** a restricted `read` agent needs to verify a platform capability
- **THEN** it can search or fetch the web instead of answering from memory

### Requirement: Other harnesses unaffected
A harness without an access translation SHALL install the agent as if `access` were absent, without error or warning noise, and the documentation SHALL state which harnesses translate the level.

#### Scenario: Codex install
- **WHEN** an agent with `access: read` is installed for a harness that has no translation
- **THEN** the install succeeds and the generated agent carries no restriction

### Requirement: Access is not a security boundary
Documentation and validation messages SHALL describe `access` as a reduction of the tools exposed to an agent's context, and MUST NOT describe it as sandboxing or as protection against a shell that can write.

#### Scenario: Reader of the docs
- **WHEN** the agent-authoring documentation describes `access`
- **THEN** it states that shell access may still write files

### Requirement: Effective access is inspectable
`canonkit models show` SHALL print, per harness and agent, the declared level and the tool restriction it resolves to. It MUST read stored data only and MUST NOT start any agent or harness program. Canonkit SHALL document a re-measurement recipe for the start-up cost of an installed agent, and SHALL NOT print token figures it cannot observe.

#### Scenario: Show run
- **WHEN** `canonkit models show` is run
- **THEN** it prints each agent's level and effective restriction and starts no agent

#### Scenario: Cost not invented
- **WHEN** a user wants to know the start-up cost of an installed agent
- **THEN** the documentation gives a recipe to measure it, and the show output prints no estimated token count

# Spec Delta

## Purpose

Let each canonkit agent declare, in a vendor-neutral way, how much of the harness's tool surface it needs, adding a `build` level that withholds coordination tools and tying the `Skill` tool to citation on allowlist levels.

## MODIFIED Requirements

### Requirement: Vendor-neutral access level
An agent source MAY declare one access level; when it does, the declaration SHALL be a single lowercase `access: <value>` line whose value is `read`, `inspect`, `write-docs`, `build` or `full`. `read` is reading, shell and web research without MCP tools; `inspect` is the `build` capability set minus editing and writing files, MCP tools included; `write-docs` is `read` plus editing and writing files; `build` is everything except coordinating other agents, interacting with the user, scheduling and publishing; `full` is no restriction.

#### Scenario: Declared level
- **WHEN** an agent source declares `access: read`
- **THEN** validation accepts the source and records the level for installers

#### Scenario: Build level declared
- **WHEN** an agent source declares `access: build`
- **THEN** validation accepts the source and records the level for installers

#### Scenario: Malformed declaration
- **WHEN** an agent source writes `access` as a list, on several lines, or with a different case
- **THEN** validation fails instead of ignoring the declaration

### Requirement: Claude Code translation
When installing for Claude Code, the installer SHALL translate each declared level into a tool restriction in the generated agent: `read` and `write-docs` allow only the tools their definition names, `build` withholds only the coordination tools, `inspect` withholds the same coordination tools and file editing and writing, and `full` adds no restriction. The coordination tools SHALL be named exactly (no wildcards) in one list shared by `build` and `inspect`, SHALL include the Claude Docs MCP server, and SHALL NOT include report delivery, `ToolSearch`, `Monitor`, `TaskStop` or any other MCP server.

#### Scenario: Read agent
- **WHEN** an agent with `access: read` is installed for Claude Code
- **THEN** the generated agent cannot call file-editing, file-writing or MCP tools

#### Scenario: Inspect agent
- **WHEN** an agent with `access: inspect` is installed for Claude Code
- **THEN** the generated agent cannot edit or write files or use the coordination tools, and keeps every MCP tool other than the Claude Docs server, whatever the name that other server was installed under

#### Scenario: Build agent
- **WHEN** an agent with `access: build` is installed for Claude Code
- **THEN** the generated agent cannot call the coordination tools or the Claude Docs MCP server, and keeps file editing and writing, the shell, the web, every other MCP tool, report delivery, `ToolSearch`, `Monitor` and `TaskStop`

#### Scenario: Shared coordination list
- **WHEN** a tool is added to the coordination list
- **THEN** both the `build` and the `inspect` restriction contain it, or a test fails

#### Scenario: Full agent
- **WHEN** an agent with `access: full` is installed for Claude Code
- **THEN** the generated agent carries no tool restriction

### Requirement: Restriction keeps what the team rules need
A restricted agent SHALL keep the ability to deliver its final message to the caller, to invoke an installed skill that its own instructions cite, and, for `read`, `inspect`, `write-docs` and `build`, to search and fetch the web. An agent's instructions "cite a skill" when they contain a backticked kebab-case name immediately followed by the word "skill" (for example the `orchestrate` skill), whether or not the skill ships with canonkit. For the allowlist levels `read` and `write-docs`, the `Skill` tool SHALL be kept if and only if the agent's instructions cite a skill. A level that would remove any of the kept abilities SHALL NOT be installed.

#### Scenario: Cited skill
- **WHEN** a restricted agent's instructions cite the `orchestrate` skill
- **THEN** the generated agent can still invoke that skill

#### Scenario: Citing agent on an allowlist level
- **WHEN** an agent with `access: read` or `access: write-docs` has instructions that cite a skill
- **THEN** the generated allowlist includes `Skill`

#### Scenario: Non-citing agent on an allowlist level
- **WHEN** an agent with `access: read` or `access: write-docs` has instructions that cite no skill
- **THEN** the generated allowlist omits `Skill`

#### Scenario: Result delivery
- **WHEN** a restricted agent finishes a review, in foreground or in background
- **THEN** its report reaches the caller as it does for an unrestricted agent

#### Scenario: Platform capability check
- **WHEN** a restricted `read` agent needs to verify a platform capability
- **THEN** it can search or fetch the web instead of answering from memory

### Requirement: Effective access is inspectable
`canonkit models show` SHALL print, per harness and agent, the declared level and the tool restriction it resolves to; for an agent on an allowlist level it SHALL also print whether `Skill` is kept and the citation that kept it. It MUST read stored data only and MUST NOT start any agent or harness program. Canonkit SHALL document a re-measurement recipe for the start-up cost of an installed agent, and SHALL NOT print token figures it cannot observe.

#### Scenario: Show run
- **WHEN** `canonkit models show` is run
- **THEN** it prints each agent's level and effective restriction and starts no agent

#### Scenario: Skill decision shown
- **WHEN** `canonkit models show` is run and an allowlist agent keeps `Skill`
- **THEN** it prints the citation that kept it, and for an allowlist agent without `Skill` it says no skill is cited

#### Scenario: Cost not invented
- **WHEN** a user wants to know the start-up cost of an installed agent
- **THEN** the documentation gives a recipe to measure it, and the show output prints no estimated token count

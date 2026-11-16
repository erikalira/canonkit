# Spec Delta

## ADDED Requirements

### Requirement: Recommended per-harness model setup
Canonkit SHALL define one recommended setup per supported harness, each in that harness's own model names, never mapped across vendors. Claude Code: `deep` opus/medium, `standard` sonnet/medium, `light` haiku/low. Codex: the tier rule below, with efforts medium, medium, low. A recommended value SHALL be saved only when the latest discovery lists it for that harness; otherwise that level is left unset (inherit) and reported.

#### Scenario: Recommended Claude levels
- **GIVEN** Claude Code discovery lists `opus`, `sonnet`, `haiku` and efforts `low` and `medium`
- **WHEN** the recommended setup is applied
- **THEN** the user configuration holds `deep` opus/medium, `standard` sonnet/medium and `light` haiku/low for Claude Code

#### Scenario: Recommended value not discovered
- **GIVEN** Claude Code discovery is unknown
- **WHEN** the recommended setup is applied
- **THEN** no Claude Code level is written and the output says the levels inherit the session model until `canonkit models refresh` succeeds

#### Scenario: Existing choices
- **GIVEN** a user configuration with a Claude Code override for one agent
- **WHEN** the recommended setup is applied
- **THEN** the three level choices are replaced and the agent override is kept

### Requirement: Codex recommended models follow the tier naming rule
For Codex, the recommended model of each level SHALL be the discovered model whose id matches `gpt-<version>-<tier>`, with tier `sol` for `deep`, `luna` for `standard` and `terra` for `light`, choosing the highest version compared numerically per dot-separated part. Tiers are resolved independently. A tier with no match, or whose model does not report the recommended effort, SHALL leave that field unset and be reported.

#### Scenario: Mixed versions
- **GIVEN** Codex discovery lists `gpt-6-sol`, `gpt-6.1-sol`, `gpt-6-luna`, `gpt-6.1-terra` and `gpt-5.9-terra`
- **WHEN** the recommended setup is applied
- **THEN** `deep` is `gpt-6.1-sol`, `standard` is `gpt-6-luna` and `light` is `gpt-6.1-terra`

#### Scenario: Numeric comparison
- **GIVEN** Codex discovery lists `gpt-6.9-sol` and `gpt-6.10-sol`
- **WHEN** the deep tier is resolved
- **THEN** `gpt-6.10-sol` is chosen

#### Scenario: Missing tier
- **GIVEN** Codex discovery lists no model ending in `-terra`
- **WHEN** the recommended setup is applied
- **THEN** `light` is left unset (inherit) and the output names the missing tier

#### Scenario: Effort not reported
- **GIVEN** the chosen `light` model reports efforts `medium` and `high` only
- **WHEN** the recommended setup is applied
- **THEN** `light` is saved with that model and no effort, and the output says the effort inherits

## MODIFIED Requirements

### Requirement: Person chooses from the discovered list
`canonkit models setup` SHALL present the discovered models and efforts and let the person assign one model and effort to each need level, and optionally to individual agents. A value outside the discovered list MUST be accepted only on explicit entry and recorded as unverified.

#### Scenario: Assign a level for Claude Code
- **WHEN** the person runs setup and picks a discovered Claude model and effort for `standard`
- **THEN** the chosen values are saved for Claude Code's `standard` level

#### Scenario: Choices are menus of what was discovered
- **WHEN** discovery reported models and efforts
- **THEN** setup offers them, plus inherit, as selectable lists with the current value preselected, and a model outside the list only through an explicit "other" entry

#### Scenario: Setup shows current and recommended
- **WHEN** setup asks for a level's model or effort for Claude Code or Codex
- **THEN** it first prints the level's row `level  current  marker  recommended` in the shared format, and the menu tags the matching options "(current)" and "(recommended)"
- **AND** with no current value, the recommended option is preselected; with a current value, the current one stays preselected, and the hint says which one Enter takes
- **AND** when the recommended value was not discovered, the row shows `!` with the reason and no option is tagged "(recommended)"

#### Scenario: Nothing is written before confirmation
- **WHEN** the person cancels at any question or declines the final save
- **THEN** the choices file is unchanged

#### Scenario: Offered during the interactive install
- **WHEN** the person runs `install` in a terminal without a harness flag and selects Claude Code or Codex
- **THEN** install offers the recommended-setup question before writing agents, setup runs only when the person chooses to customize, and a cancel there cancels the install
- **AND** a flag-driven or non-terminal install never asks, and writes model choices only with `--recommended`

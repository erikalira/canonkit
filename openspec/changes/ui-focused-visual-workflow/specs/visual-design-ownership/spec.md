# Spec Delta

## Purpose

Keep interface usability and visual design separately accountable while making Nova's normal work interface-focused and loading game-art procedures only when relevant.

## ADDED Requirements

### Requirement: Nova provides UI-first visual direction
Nova SHALL primarily guide interface typography, composition, spacing, density, iconography, colour roles and coherence. Nova SHALL retain explicit visual-direction authority across media, with game-art procedures supplied by optional specialist knowledge rather than repeated in the normal interface protocol.

#### Scenario: Interface work uses an interface protocol
- **WHEN** Nova reviews a dashboard's visual design
- **THEN** the review addresses the interface's intended hierarchy and visual language
- **AND** it does not require character, lighting, material or VFX checks unrelated to the screen

#### Scenario: Game-art authority remains discoverable
- **WHEN** an installed Nova is considered for a character or environment art-direction request
- **THEN** Nova's description and mission identify visual direction across media as within scope
- **AND** the optional game-art skill adds knowledge without creating another decision owner

### Requirement: Pixie owns UX and accessibility
Pixie SHALL own tasks, information priority, navigation, interaction, interface states, recovery, microcopy and accessibility. Pixie's consistency judgments SHALL concern comprehension and interaction rather than aesthetic preference. Nova SHALL own the visual expression of those requirements without overriding accessibility.

#### Scenario: A beautiful flow remains confusing
- **WHEN** a polished interface obscures the primary task or recovery action
- **THEN** Pixie identifies the comprehension or interaction defect
- **AND** aesthetic approval does not waive it

#### Scenario: A usable screen diverges visually
- **WHEN** a usable screen breaks established typography or component styling without justification
- **THEN** visual consistency is assessed under Nova's authority
- **AND** the report does not invent an accessibility failure to justify an aesthetic concern

### Requirement: Shared decisions have distinct owners
For hierarchy, density, responsive layout and motion, Pixie SHALL define functional priorities and access requirements, including motion purpose, continuity and reduced-motion needs. Nova SHALL define visual expression within them, Bob SHALL implement and Quinn SHALL verify under existing risk rules. Performance measurement/budgets and shared technical contracts SHALL remain with their existing owners; no automatic review chain is created.

#### Scenario: A narrow layout changes information presentation
- **WHEN** a responsive proposal hides information or changes navigation to achieve a composition
- **THEN** Pixie evaluates preservation of the task and reading order
- **AND** Nova evaluates the composition within those requirements

#### Scenario: Expressive motion conflicts with access or runtime cost
- **WHEN** a visual motion proposal conflicts with reduced-motion needs, task feedback or a credible performance concern
- **THEN** Pixie's functional/access requirements constrain Nova's visual expression and Perry retains measurement/budget decisions
- **AND** the skill neither overrides those owners nor requires dispatch without a concrete risk under existing rules

### Requirement: Interface and gameplay states remain distinct
Pixie SHALL own interface-state requirements. Maya SHALL own gameplay-state requirements when installed and applicable. Nova SHALL own their visual expression. An interface request SHALL NOT require Maya merely because it includes states or belongs to a game project.

#### Scenario: An ordinary form has an error state
- **WHEN** a form needs validation feedback and a recovery action
- **THEN** those requirements belong to Pixie
- **AND** Maya is not required to determine whether the interface state exists

#### Scenario: A gameplay consequence changes
- **WHEN** a visual proposal changes what a gameplay consequence communicates
- **THEN** the gameplay decision is routed to the installed gameplay owner
- **AND** Nova retains visual-direction responsibility

### Requirement: Skills do not create authority or mandatory dependencies
The design skills SHALL supply procedures without new vetoes or automatic dispatch chains. References to optional skills or specialists SHALL be conditional on availability. Core UX instructions SHALL remain meaningful in projects with no visual specialist installed.

#### Scenario: A skill is present without Nova
- **WHEN** an interface skill is installed but Nova is absent
- **THEN** existing concrete visual requirements can still be implemented
- **AND** a missing owner for a new visual direction is disclosed rather than fabricated or installed implicitly

### Requirement: Composite controls preserve one interaction target
Pixie SHALL retain the invariant that a composite control presents a coherent target, state and visible focus across its parts. Detailed rendered inspection procedures SHALL live in the optional review skill, without making that skill a prerequisite for recognising an interaction defect.

#### Scenario: Parts react as separate controls
- **WHEN** a single composite control reports different states depending on the hovered region
- **THEN** the behaviour is identified as an interaction-consistency concern
- **AND** the visual harmony of a correction remains a visual-design judgment

### Requirement: LOW changes remain proportionate
A local reversible change inside an established direction SHALL NOT require a new direction document, design system or full specialist review chain. Agent vetoes SHALL remain bounded by the existing risk and authority rules.

#### Scenario: Existing spacing is corrected locally
- **WHEN** a spacing correction preserves the established interaction and visual direction
- **THEN** it can be handled inline with focused verification
- **AND** no complete design-and-review ceremony is imposed

#### Scenario: A LOW label change has no motion effect
- **WHEN** a local label adjustment preserves established behaviour and does not affect animated geometry
- **THEN** verification focuses on the changed label and its relevant fit/accessibility
- **AND** it does not require unrelated reduced-motion, whole-flow, theme/locale matrix or performance checks

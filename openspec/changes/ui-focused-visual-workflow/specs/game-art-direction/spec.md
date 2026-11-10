# Spec Delta

## Purpose

Make game-art expertise available on demand while preserving Nova's visual authority and keeping gameplay, implementation, audio and interface responsibilities distinct.

## ADDED Requirements

### Requirement: Game-art knowledge is an optional project skill
CanonKit SHALL offer `game-art-direction` as a project-local skill independent of UI packs and specialists. It SHALL participate in the same tracked-file lifecycle and preservation guarantees as the interface packs. Adding it SHALL NOT install Nova, Maya, UI skills or global instructions.

#### Scenario: Only game-art knowledge is requested
- **WHEN** a user adds `game-art-direction` in a consuming project
- **THEN** only its namespaced project skill copies and pack ownership metadata are added
- **AND** no specialist, UI pack or global instruction is installed implicitly

### Requirement: Game-art review uses surface-specific visual criteria
The skill SHALL guide review of character silhouettes, value structure, lighting, materials, environment composition, VFX distinction and asset-family coherence where relevant. Findings SHALL relate an observed asset to an explicit visual principle at its intended scale, distance or context, with the smallest sufficient correction.

#### Scenario: Characters merge at gameplay scale
- **WHEN** character designs are distinguishable in close-up but not at their intended gameplay size
- **THEN** the review evaluates silhouette and value separation at that size
- **AND** it recommends a correction tied to the required visual distinction

#### Scenario: Effects express different events identically
- **WHEN** visually similar effects are intended to communicate different gameplay events
- **THEN** the review identifies the distinction that fails in the intended context
- **AND** proposes a visual correction while leaving changes to gameplay meaning with its owner

### Requirement: Game-art procedures preserve domain boundaries
The skill SHALL supply knowledge under existing visual authority, without a new veto or agent role. Gameplay states, progression and balance SHALL remain with Maya when applicable; implementation, technical contracts, performance budgets and audio SHALL remain with their existing owners.

#### Scenario: A visual proposal changes a reward rule
- **WHEN** an art-direction suggestion requires changing a gameplay reward or consequence
- **THEN** it identifies the gameplay decision for the relevant owner
- **AND** does not treat the art skill as authority to change that rule

#### Scenario: An effect is expensive to render
- **WHEN** a visual direction raises a credible rendering-cost concern
- **THEN** the visual review can propose a cheaper expression of the same intent
- **AND** it does not approve a new performance budget or prescribe an unreviewed rendering architecture

### Requirement: Game-art procedures load only for relevant surfaces
Game-art guidance SHALL apply when the requested work needs game-specific visual analysis. A project being a game SHALL NOT by itself require the game-art procedure for an ordinary menu, form or HUD layout, or make Maya mandatory for interface-only work.

#### Scenario: A game settings menu needs layout polish
- **WHEN** the task concerns only typography, spacing and interaction in a game's settings menu
- **THEN** ordinary UI design and UX criteria apply
- **AND** character, lighting, material and VFX reviews are not required

### Requirement: Knowledge availability does not fabricate a specialist
Without Nova or another explicitly designated visual owner, the skill SHALL disclose the missing authority for new visual-direction decisions rather than impersonating a specialist. Absence of the skill SHALL NOT remove an installed Nova's visual authority or prevent ordinary work within established principles; specialist-specific evidence gaps SHALL remain explicit.

#### Scenario: The skill is installed without a visual owner
- **WHEN** a new game-art direction is requested with the skill present but no installed or designated visual owner
- **THEN** the missing decision owner is identified
- **AND** the skill does not claim to create one or install one automatically

#### Scenario: Nova is present without the game-art pack
- **WHEN** Nova is asked to assess established visual coherence without the optional pack
- **THEN** Nova retains visual-direction authority
- **AND** does not require automatic pack installation or fabricate surface-specific evidence

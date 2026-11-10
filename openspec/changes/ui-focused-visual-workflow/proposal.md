# Proposal

## Why

CanonKit separates UX from visual direction, but Nova's protocol emphasizes game art while interface design and rendered critique remain underspecified. Make Nova UI-first and move game-art procedures into an optional skill so interface work receives concrete visual guidance without loading game-specific checklists.

## What Changes

- Restructure Nova around interface typography, composition, spacing, density, iconography, semantic colour and visual coherence. Retain the `nova` specialist ID and explicit authority over visual direction across media.
- Clarify Pixie's ownership of tasks, information priority, interactions, interface states, recovery and accessibility. Nova determines their visual expression; Maya owns gameplay states only.
- Extract lighting, materials, character silhouettes, environment composition and VFX-specific procedures into an optional `game-art-direction` skill used under Nova's visual authority.
- Add optional `ui-design` and `ui-review` skills for reference-informed design, a representative screen, actionable handoffs and proportionate rendered review. Move Pixie's detailed composite-control inspection procedure into `ui-review`, retaining the interaction invariant in Pixie.
- Incorporate the accepted G01–G03 review findings: concrete visual finish within the existing identity; explicit content states and flow outcomes; rendered checks of representative content, accessibility, supported themes/locales and relevant failures; purposeful, interruptible motion with reduced-motion alternatives and stable layouts. Apply checks to the changed experience and its risks, without requiring every combination or adding LOW ceremony.
- Distribute the three skills as single-file project packs through the existing explicit `add`/`remove`/`list` lifecycle, with no implicit specialist or pack installation.
- Update affected routing descriptions, ownership documentation, installation guidance and offline evaluation fixtures. Preserve LOW proportionality and distinguish checked instructions from measured UI outcomes.

Out of scope: a new agent, a standalone design-system skill, gameplay/engine development guidance, new dependencies or browser automation infrastructure, multi-file pack support, global reinstallation, paid evaluations, release and changes to an application UI. G04 mobile/native procedures and new framework/platform/library packs are deferred to a future focused stack-pack change; this change does not add native-platform acceptance or import framework recipes as universal rules.

## Capabilities

### New Capabilities

- `visual-design-ownership`: UI-first visual authority, UX boundaries, conditional game-art knowledge and proportional handoffs among existing agents.
- `interface-design-workflow`: optional interface design and rendered review procedures, evidence limits and project-local delivery.
- `game-art-direction`: optional game-art critique procedures under existing visual authority, with explicit gameplay, engineering and audio boundaries.

### Modified Capabilities

None. Six main capabilities now exist: context-continuity, engineering-delivery, environment-security-policy, laya-advisory-assessment, product-discovery and security-diagnostics. This change reuses existing product clarification, engineering evidence and continuity requirements without modifying them. The incremental-engineering-protocols change is archived.

## Impact

Instruction changes are MEDIUM; extending public pack IDs and their installation lifecycle is HIGH under the project's existing contract classification. Implementation touches `agents/nova.md`, `agents/pixie.md`, affected ownership/routing documentation, three new `stack-packs/<id>/SKILL.md` sources, the catalog in `bin/stack-packs.js`, and relevant lifecycle/routing/quality tests. Existing destination paths, receipt schema, specialist tiers, core installation behaviour and security gates remain compatible. No new dependency or package version change is planned.

This change currently authorizes planning artifacts only. Implementation requires a subsequent apply request; neither planning completion nor validation authorizes installation, commit, push, publication or archive.

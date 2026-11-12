---
name: canonkit-ui-design
description: "Shape a new interface direction or improve visual finish within an existing product identity, using references, a representative screen and an implementable handoff. Use ui-review for rendered verification."
---

# Interface design

## Scope and authority

Use the existing task, constraints and approved direction. Pixie owns tasks,
information/reading priority, interaction, interface states and accessibility;
an installed Nova or explicitly designated visual owner owns visual expression.
Bob implements; Quinn verifies. Shared technical contracts remain Archie's,
measurement/budgets Perry's. This skill adds knowledge, no owner, veto or review
chain. If new direction lacks a visual decision owner, disclose that gap; concrete
established requirements can still be implemented. Never install an agent or
another pack implicitly. A game menu/form/HUD layout is ordinary UI unless
game-specific art or gameplay meaning is actually involved.

Select the steps affected by the request. LOW copy, colour or spacing fixes in
an established direction need only focused fit/access checks, no new brief, token
audit, full journey or state × viewport × theme × locale matrix.

## M1 — Direction and concrete finish

Read relevant local screens, components, tokens, assets and product priorities.
Identify exemplars that already express the identity. For any reference, explain
the useful observation, intended effect and adaptation; local references can
suffice. Preserve the identity during polish unless a departure is requested or
justified. Do not copy defects or substitute a generic landing page.

Inspect typography, text wrapping, emphasis, spacing rhythm, optical alignment,
icon weight/scale, borders, surfaces and meaningful assets at intended usage size.
A finish finding names the element, established rule or intended effect, observed
defect and smallest correction. Prefer suitable existing components/tokens;
introduce only needed decisions at the project's existing proportional location.

For new direction spanning screens, make one representative screen concrete
before broad application. Hand off layout rules, typography/colour relationships,
relevant responsive constraints, component reuse and state appearance. Distinguish
visual decisions from pending UX questions. No new design system, fixed file
format, reference quota, style ban or universal score is required.

## M2 — States and promised outcomes

For the changed flow, identify applicable states with **trigger, visible or
accessible feedback, and safe next action**:

- Loading: meaningful waiting/progress while work is pending.
- Empty: explain absence and an available next step.
- Error: actionable recovery, with input retained where supported or required.
- Partial data: distinguish available content from unavailable portions.
- Success: confirm the completed result promised by the action and what follows.
- Permission: explain the access boundary and safe request/return path.

Include validation and disabled behaviour when relevant. Do not add unrelated
states, authentication changes, cancellation, undo or retry features merely to
complete a checklist. Define the actual final result and relevant recovery;
check repeated actions, interruption or out-of-order completion when they can undo
that result. Trace handlers/shared state only for a concrete risk/defect, using
existing Bob/Quinn debugging and regression methods.

## M3 — Design for actual content and operation

Use real or representative text/data/assets, including long labels and realistic
empty/partial content at relevant narrow/wide sizes. For already supported themes
and locales affected by the change, consider text fit, formatting, placeholders,
contrast and RTL reading/action order where applicable. Review translated text in
product context; parsing catalogs does not verify fit. Do not add localization,
themes or translation-sync workflows.

Define relevant semantic names/roles, keyboard operation, logical visible focus,
field-error association, overlay focus entry/return and meaningful status
announcements. Include applicable pointer/touch target usability and input
requirements. Use the project's adopted accessibility standard and current
platform guidance; verify exact criteria before citing them. AA focus visibility/
non-obscuration is not AAA focus appearance; no one target-size number fits every
platform. Only when the surface is native or mobile, also cover enlarged text, safe areas, orientation, back navigation and offline or interrupted states; no fixed device list or size limits. Accessibility requirements constrain visual expression.

Arrange for rendered checks of actual assets, layout stability during loading,
and relevant console/network failures. Distinguish expected failed requests used
to exercise recovery from broken journeys.

## M4 — Purposeful and stable motion

For added/changed motion, name its attention, feedback or continuity purpose.
Reuse suitable existing motion values/mechanisms. Specify normal and reduced
variants preserving information, feedback, visible content and operable actions;
essential content must not wait for the full animation.

Define behaviour on rapid reversal, changed intent or navigation: intended final
state, appropriate focus, no residual interactive exit surface or delayed required
action. Preserve reading and target geometry when fallback/content, assets,
counters or labels change, even without animation. Applicable drag/swipe gestures
need an operable alternative. Continuous work pauses/stops or cleans up when no
longer needed and returns in the intended state.

Credible runtime cost concerns use Perry's existing measurement/budget method.
No mandatory motion library, timing/spring preset, hardware count, speculative
optimization or universal property ban is introduced.

## Evidence and handoff

Use available project/browser tooling and local artifacts without installing
tools, uploading private material or expanding production authorization. State
missing capabilities. Record decisions and checks at the existing handoff
location, with relevant surface/conditions, observation, local evidence and smallest
correction. Separate passed/failed, **untested** with its access limitation and
**not applicable** with a specific reason. Missing test access is not non-applicability.

Missing rendered access leaves rendered conclusions partial/unverified. A screenshot
cannot verify keyboard/focus or time-dependent motion; builds/component checks and
automated accessibility checks do not prove rendered behaviour or full compliance.
A regression claim needs a comparable baseline: content/state, viewport, theme
and rendering conditions must match sufficiently. Without it, report current
observations and inconclusive regression comparison. Recheck only affected evidence
after corrections. Offline instruction checks do not measure behavioural efficacy.

Coverage references: ECC [frontend direction](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/frontend-design-direction/SKILL.md),
[design system](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/design-system/SKILL.md)
and [interface finish](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/make-interfaces-feel-better/SKILL.md).

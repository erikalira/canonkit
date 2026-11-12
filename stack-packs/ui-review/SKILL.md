---
name: canonkit-ui-review
description: "Critique or verify a rendered interface change: visual finish, content/states, accessible interaction and purposeful motion with explicit evidence limits. Use ui-design for establishing a new visual direction."
---

# Rendered interface review

## Choose the relevant checks

Inspect the changed surface and concrete failure modes with available local
project/browser tools. No particular provider, new dependency, external upload or
production mutation is required or authorized by this skill. Disclose missing
capabilities. LOW local changes inside an established direction get focused
verification: a label change without motion/geometry effects needs fit and access
checks, no new brief, token audit, whole-flow audit, performance run or universal
state × viewport × theme × locale matrix.

Skills collect evidence without creating an owner or veto. Pixie judges task and
reading priority, comprehension, interaction, interface states and accessibility;
an installed Nova or designated visual owner judges visual expression. Bob
implements, Quinn verifies; Archie retains shared technical contracts and Perry
measurement/budgets. Route concrete risks using existing rules, not a full chain.
Without a visual owner, disclose missing authority for new direction and continue
concrete established work. Never impersonate or install a specialist/pack.
A game's ordinary menu/form/HUD layout needs no game-art or gameplay review.

## M1 — Inspect the intended visual language

Identify local component/token/asset exemplars and stated direction. Explain what
a reference contributes and any justified departure. Use representative meaningful
assets at their intended scale. Inspect typography, wrapping, spacing rhythm,
optical alignment, icon weight/scale, borders/surfaces and composition at relevant
narrow/wide sizes. For each defect name the element, intended effect or existing
rule, observed failure and smallest correction within the identity. Polish does
not authorize a replacement brand. For direction spanning screens, review the
representative screen and its reusable layout/responsive/state handoff before
broad application. Separate visual defects from functional/accessibility defects.

## M2 — Exercise applicable states and outcomes

For the changed flow identify the trigger, visible/accessible feedback and safe
next action for applicable loading (meaningful waiting/progress), empty (explain
absence/next step), error (actionable recovery), partial-data (available versus
unavailable portions), success (completed result/next action) and permission
(access boundary and safe request/return) states. Include validation and disabled
behaviour where relevant; state existence remains Pixie's decision, not permission
to change authentication or product scope.

Exercise the action's promised final result and supported recovery. Preserve input,
cancellation, undo and retry when required or supported, without inventing features.
When affected, check repeated actions, interruptions and out-of-order updates
cannot undo the intended result. Trace handlers/shared state only for a concrete
risk/defect using existing debugging/regression methods.

## M3 — Rendered content, access and failures

- Use real or representative content/data/assets, including long labels, at relevant
  narrow/wide viewports. Check overflow, reading order and action availability.
- Exercise affected supported themes/locales: text fit, formatting, placeholders,
  contrast and RTL where applicable. Inspect translated text in context; catalog
  parsing is insufficient. Add no themes/locales or synchronization service.
- Exercise relevant keyboard operation, semantic names/roles, logical visible
  focus, overlay focus entry/return, field-error association and meaningful
  dynamic status announcements. Check applicable pointer/touch operation and target
  usability against the adopted standard/current platform guidance. Verify exact
  criteria before citing them; AA focus visibility/non-obscuration and AAA focus
  appearance differ, and targets have contextual exceptions.
- Only when the surface is native or mobile: check enlarged text, safe areas,
  orientation, back navigation and offline or interrupted states; no fixed
  device list or size limits.
- Observe loading/layout stability as fallback becomes content or assets,
  counters/labels change, with or without animation. Preserve reading and targets.
- Relate relevant missing assets and console/network failures to the user outcome.
  Distinguish expected failure requests exercising recovery from unintended breakage.

### Composite controls when the risk calls for it

For a new, restructured or reportedly fragmented control, hover each relevant
region (wrapper, icon, label, indicator) separately and exercise keyboard focus.
Check whole-control state, coherent visible focus and reacting parts resolving
together. Use rendered or computed evidence: compare computed transitions and
colours across parts after entering each region. Different targets for state
variants or a transition on only one part can split an otherwise valid control.
An already coherent control's local label/colour/spacing edit does not require
this computed-style pass. Pixie owns interaction coherence; visual harmony stays
with the installed visual owner.

## M4 — Motion, geometry and continuity

Identify the changed motion's attention, feedback or continuity purpose and
existing motion values/mechanisms. Exercise normal and reduced-motion preferences:
content stays visible, information/feedback is preserved and actions remain
operable without waiting for full animation. Check start/end states, rapid
open/close reversal, changed intent and navigation where affected. The intended
final state and focus must settle without a residual interactive exit surface or
delayed required feedback/action.

Check stable geometry during fallback/content, asset, counter and label changes
even without animation. For relevant dragging/swiping, exercise the relevant
input/device context and an operable alternative. Continuous work must pause/stop
or clean up when no longer needed, returning in the intended state. For credible
cost risks use Perry's existing measurement/budget method and report actual
evidence or its absence. Smooth appearance or source-level optimization does not
prove performance. Do not impose libraries, presets, hardware gates or universal
bans on layout animation/native controls.

## Evidence, verdict and recheck

Record the reviewed surface, only conditions needed to interpret the claim
(content/viewport/state/theme/locale/motion preference), observation, available
local screenshot/test artifact and smallest correction. Separate passed/failed,
untested with limitation, and not applicable with a specific reason.
Unavailable permission/test data is **untested**, not not-applicable or passed.

Missing browser/rendered access means partial/unverified rendered conclusions.
A screenshot supports visible composition, not keyboard/focus, unobserved states
or time-dependent motion. Builds/component logic and automated accessibility
checks prove only their scope, not full rendered/motion/accessibility approval.

Distinguish current assessment from visual regression: a baseline must have
comparable content/state, viewport, theme and rendering conditions. No baseline
or a non-comparable capture means inconclusive comparison; current defects remain
reportable. After a structural/visual correction repeat affected viewport and
interaction checks before reusing their pass; unrelated evidence stays valid.
Keep reports proportional and separate observed defects from evidence gaps.
Offline schema/lexical checks do not establish instruction efficacy or full
accessibility compliance.

Coverage references: ECC [browser QA](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/browser-qa/SKILL.md),
[frontend accessibility](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/frontend-a11y/SKILL.md),
[motion foundations](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/motion-foundations/SKILL.md)
and [advanced motion](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/motion-advanced/SKILL.md).

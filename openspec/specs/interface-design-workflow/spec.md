# interface-design-workflow Specification

## Purpose

Provide optional project-local procedures for intentional interface design and evidence-based rendered review without replacing agent ownership or imposing a new design system.

## Requirements

### Requirement: Interface skills are independently opt-in
CanonKit SHALL offer `ui-design` and `ui-review` as independently installable project skills through its existing pack lifecycle. Adding either SHALL NOT install the other, a specialist or a global skill, or change the project's agent roster.

#### Scenario: Only the design skill is requested
- **WHEN** a user explicitly adds `ui-design` in a consuming project
- **THEN** its namespaced skill copies are installed in that project
- **AND** `ui-review`, Nova, other packs and HOME files are unchanged

### Requirement: Design decisions follow the product and existing direction
The design procedure SHALL establish the user's task, information priority, existing visual system, relevant constraints and reference observations before recommending changes. It SHALL use existing exemplars, explain important choices and preserve an established direction unless a departure is requested or justified. Finish findings SHALL identify an element, observed defect and smallest correction within that direction.

#### Scenario: An existing application needs polish
- **WHEN** a user requests visual improvement within an established product
- **THEN** the procedure identifies specific typography, composition or consistency opportunities
- **AND** it does not invent a replacement brand or impose a generic landing-page layout

#### Scenario: A reference informs a concrete finish decision
- **WHEN** a reference or existing component informs a typography, spacing, optical alignment, icon, surface or asset decision
- **THEN** the handoff identifies the useful observation and how it applies at the intended usage size
- **AND** it distinguishes justified adaptations from what the product already establishes, without treating a stylistic heuristic as a universal rule

### Requirement: Design handoffs are implementable and proportionate
For a new direction or change across screens, the design procedure SHALL use a representative screen to establish reusable visual decisions and produce a handoff with layout rules, relevant responsive constraints and state appearance. It SHALL reuse existing components and tokens where suitable without requiring a new design system or fixed document format.

#### Scenario: A direction will be applied to several screens
- **WHEN** a visual direction is established for a multi-screen interface
- **THEN** a representative screen makes the proposed rules concrete before broad application
- **AND** the handoff distinguishes visual choices from pending UX decisions

### Requirement: Content states and flow outcomes are explicit
For the changed flow, the procedures SHALL identify applicable loading, empty, error, partial-data, success and permission states with trigger, feedback and safe next action. They SHALL include validation/disabled behaviour where relevant, verify the action's promised result and recovery, and distinguish justified non-applicability from missing test access. Checks SHALL follow the changed behaviour and risks, without requiring unrelated states or exhaustive shared-state audits.

#### Scenario: Partial data arrives while another section fails
- **WHEN** a changed flow can present some data while another portion is unavailable
- **THEN** its handoff and review distinguish available content from the missing portion and identify the supported next action
- **AND** the procedure does not reduce the entire experience to an unexplained spinner or generic success

#### Scenario: A form fails and then succeeds
- **WHEN** the changed form supports validation, submission failure and successful retry
- **THEN** review exercises relevant field feedback, recovery and the actual completed result promised by the action
- **AND** input preservation, cancellation or undo are checked when required or supported, rather than invented as extra functionality

#### Scenario: A state cannot be reached with available test access
- **WHEN** permission or test-data limitations prevent exercising an applicable state
- **THEN** that state is reported as untested with its limitation
- **AND** it is not marked not applicable or passed to complete a report

#### Scenario: Later state updates can undo the intended action
- **WHEN** a change affects a sequence where retries, interruption or out-of-order results can invalidate the action's result
- **THEN** review checks the relevant final state and recovery, using existing debugging and regression methods
- **AND** unrelated controls do not require handler-by-handler tracing

### Requirement: Rendered review matches the changed experience
The review procedure SHALL inspect representative content/assets, long content, states and interactions at relevant viewport sizes. It SHALL check loading/layout stability, supported themes/locales affected by the change, relevant rendering/console/network failures and accessible operation. Findings SHALL distinguish visual, functional and accessibility concerns. Check selection SHALL follow the changed surface and risks rather than every combination of review dimensions.

#### Scenario: Long content breaks a narrow layout
- **WHEN** long labels or data are reviewed at a narrow target viewport
- **THEN** the review checks overflow, action availability and the intended reading order
- **AND** reports observed defects with a specific correction

#### Scenario: A screenshot is the only available evidence
- **WHEN** review access provides a screenshot but no interactive session
- **THEN** the report can assess the visible composition
- **AND** it marks keyboard, focus behaviour and unobserved states as unverified

#### Scenario: Supported translations or themes expose a defect
- **WHEN** a changed surface has supported locales or themes with relevant length, formatting, placeholder, directionality or contrast differences
- **THEN** review exercises representative affected conditions with meaningful content and assets
- **AND** it checks text fit, reading order and action availability without adding locales, themes or a translation synchronization workflow

#### Scenario: A form or overlay needs accessible operation
- **WHEN** a form, overlay or dynamic feedback is created or changed
- **THEN** review checks relevant semantics/names, keyboard operation, visible logical focus, focus entry/return, field-error association and meaningful status announcements
- **AND** applicable pointer/touch operation and target usability are checked against the adopted standard without claiming full compliance from source inspection or automation alone

#### Scenario: A failed request or missing asset affects the journey
- **WHEN** review encounters a console/network failure or missing asset relevant to the changed experience
- **THEN** it relates that signal to the observed user outcome and required correction or limitation
- **AND** it distinguishes expected failures used to exercise an error state from unintended breakage

#### Scenario: Loading content changes geometry
- **WHEN** content, an asset, a counter or a control label changes during a reviewed loading sequence, with or without animation
- **THEN** review checks that geometry remains stable enough to preserve reading and action targets
- **AND** any correction is tied to the observed shift, rather than an unmeasured universal ban on animated properties

### Requirement: Motion preserves purpose access and stability
For added or changed motion, the procedures SHALL identify its attention, feedback or continuity purpose and verify reduced-motion behaviour preserving information and actions. They SHALL check relevant interruption, final state, focus, gesture alternatives, stable layout and cleanup of continuous work. Credible performance risks SHALL use existing measurement and budget ownership, without mandatory libraries, presets or new budgets for LOW work.

#### Scenario: A user requests reduced motion
- **WHEN** the changed animated experience is exercised with normal and reduced-motion preferences
- **THEN** the selected behaviour preserves content, meaningful feedback and operable actions while respecting the preference
- **AND** the reduced variant does not leave essential content hidden or require the full animation to complete the task

#### Scenario: The user reverses an animated interaction
- **WHEN** the user rapidly opens/closes, changes intent or navigates during an affected transition
- **THEN** the experience resolves to the intended final state with appropriate focus
- **AND** no residual exiting surface remains an unintended interaction target or delays required feedback/actions

#### Scenario: A gesture or continuous animation is introduced
- **WHEN** the changed interaction depends on dragging/swiping or runs continuous animation work
- **THEN** applicable gesture operation is checked on the relevant input/device context with an operable alternative
- **AND** continuous work pauses/stops or cleans up when no longer needed, preserving the intended state on return

#### Scenario: Motion raises a credible runtime cost concern
- **WHEN** a motion change plausibly affects user-facing performance or an existing budget
- **THEN** the concern uses the existing performance owner's measurement method and reports actual evidence or its absence
- **AND** visual smoothness or a source-level optimization claim alone does not establish a passing performance result

### Requirement: Review preserves evidence limits and freshness
Review findings SHALL identify the surface, relevant review conditions, observation and available local evidence. They SHALL distinguish passed/failed, untested and justified not-applicable items. Missing rendered access SHALL produce a partial or unverified conclusion. Affected checks SHALL be repeated after a correction; source inspection, build/component checks or automated accessibility results SHALL NOT establish complete rendered, motion or accessibility approval.

#### Scenario: Browser access is unavailable
- **WHEN** source can be read but the interface cannot be rendered
- **THEN** the report distinguishes source-level findings from unverified rendered behaviour
- **AND** does not claim a completed rendered review

#### Scenario: A correction changes the layout
- **WHEN** a fix changes a previously inspected layout or control structure
- **THEN** the affected viewport and interaction checks are repeated before their passing results are reused

#### Scenario: Component tests pass without rendered motion evidence
- **WHEN** component logic or build checks pass but no appropriate rendered session exercises the relevant transition
- **THEN** the report preserves the passing claim for those checks
- **AND** time-dependent motion and layout conclusions remain unverified

### Requirement: Visual regression requires a baseline
The review procedure SHALL distinguish current visual assessment from visual regression comparison. Without an appropriate baseline, a regression-comparison claim SHALL be inconclusive, while independently supported findings about the current interface remain reportable.

#### Scenario: No prior capture exists
- **WHEN** a current screenshot is available without a comparable baseline
- **THEN** the review can identify present overflow or inconsistency
- **AND** it does not claim that visual regression comparison passed

#### Scenario: The baseline uses different rendering conditions
- **WHEN** prior and current captures differ in relevant content/state, viewport, theme or rendering conditions
- **THEN** review establishes comparability or reports the regression comparison as inconclusive
- **AND** it does not treat an unrelated screenshot difference as an established regression

### Requirement: Composite-control inspection follows a reported risk
For a new, restructured or reportedly fragmented composite control, the review procedure SHALL compare state, focus and transition behaviour across relevant regions. Existing coherent controls receiving a local copy, colour or spacing change SHALL NOT require an unrelated computed-style inspection.

#### Scenario: A control's icon and label react at different times
- **WHEN** a restructured composite control is reviewed
- **THEN** relevant hover regions and keyboard focus are exercised
- **AND** rendered or computed evidence is used to check whether the parts resolve as one interaction target

### Requirement: Skill lifecycle preserves existing project ownership
The new skills SHALL coexist with existing packs using the established tracked-file lifecycle. Updates and removals SHALL preserve local modifications, unrelated files and other installed packs, reporting conflicts rather than silently overwriting or deleting them. Global core operations SHALL remain separate.

#### Scenario: Design packs are added beside React
- **WHEN** the three design-related packs are added to a project already tracking React
- **THEN** the prior React files and ownership records remain intact
- **AND** removing one design pack leaves the other packs unchanged

#### Scenario: A skill copy has a local edit
- **WHEN** an update or removal encounters a locally modified tracked copy
- **THEN** the copy is preserved and the conflict is reported under existing lifecycle semantics
- **AND** unresolved ownership is not discarded to force success

### Requirement: Review uses available tooling without expanding authorization
The interface procedures SHALL use available project and browser tooling without requiring a particular provider, new dependency, external upload or production mutation. Missing capabilities SHALL be disclosed, and any additional action SHALL remain subject to existing authorization rules.

#### Scenario: Optional research service is unavailable
- **WHEN** interface design can proceed from local references without an external service
- **THEN** the procedure continues using those references
- **AND** does not require connecting a service or uploading private material

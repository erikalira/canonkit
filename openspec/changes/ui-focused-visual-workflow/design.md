# Design

## Context

See [proposal.md](proposal.md) for motivation and scope. The capability contracts are [ownership](specs/visual-design-ownership/spec.md), [interface workflow](specs/interface-design-workflow/spec.md) and [game art](specs/game-art-direction/spec.md).

Historical planning baseline: `1637bbd`, with a clean implementation tree before this change's artifacts. At the 2026-11-09 revision, HEAD remains `1637bbd1f39a357bbf3a4a6d41498015ada06006` and the working tree includes pre-existing staged changes. Six main capabilities now exist; the incremental-engineering-protocols change is archived. Reuse [product discovery](../../specs/product-discovery/spec.md), [engineering delivery](../../specs/engineering-delivery/spec.md) and [context continuity](../../specs/context-continuity/spec.md) rather than restating their protocols. Graphify scoped relationships; direct current sources establish the behaviour below.

The user approved incorporation of every V/L finding from G01–G03 in the [ECC knowledge review](../../../docs/plans/ecc-skills-knowledge-groups-handoff.md), retaining its classifications for future use. G04 is explicitly deferred, including its portable mobile/native additions, to a future focused stack-pack change. This revision changes planning only; the existing catalog contract and implementation authorization remain unchanged.

- `agents/nova.md` already owns cross-media visual direction but its responsibilities, veto examples and analysis protocol emphasize characters, lighting, materials and VFX.
- `agents/pixie.md` owns UX and accessibility, but its broad visual-consistency veto can overlap Nova. Its composite-control section mixes an enduring interaction invariant with a detailed computed-style procedure.
- Nova and `docs/team.md` currently attribute state existence/meaning to Maya without qualifying gameplay. Pixie's core body also names optional specialists; touched visual boundaries should instead refer to the installed owner generically.
- `skills/*` installs globally. `stack-packs/*` is the existing project-local, opt-in skill source, currently used for languages/frameworks.
- `bin/stack-packs.js` treats IDs as opaque catalog keys and controls one `SKILL.md` per pack at `.agents/skills/canonkit-<id>/` and `.claude/skills/canonkit-<id>/`. It has a schema-1 receipt, fixed destinations, local-edit protection and interrupted-operation recovery.
- Quality evaluation composes one explicitly selected pack into an existing agent definition. Lifecycle and packaging checks are offline; model evaluations are separate and require authorization when they incur cost.

## Goals / Non-Goals

**Goals:** use the existing ownership and installation extension points; shorten Nova's normal protocol; make visual choices and evidence actionable; preserve ordinary work without optional packs; keep existing receipt and isolation guarantees.

**Non-Goals:** see the proposal's exclusions. In particular, this design does not generalize pack infrastructure or introduce a separate art/UI agent, a new evidence engine, mandatory research service or fixed report-file schema.

## Decisions

### 1. Keep Nova UI-first with explicit cross-media visual authority

Retain `name: nova`, `tier: specialist`, its declared model and narrow visual veto. Its concise mission/description must identify interface visual design and cross-media visual direction so game-art requests can still find the right owner. Organize the body around:

1. UI-first mission, responsibilities and visual authority.
2. Shared principles: intention, hierarchy, semantic colour, coherence, concrete references and verifiable findings.
3. A short interface-focused analysis protocol and proportional output.
4. Conditional use of installed specialist knowledge for game-art surfaces.

Move game-specific checklists, veto examples and reporting detail to `game-art-direction`; retain the generic authority needed to evaluate screens or assets against a stated direction. The skill carries examples/procedures, not a second veto or required prerequisite. Nova can still review ordinary visual coherence without the pack and must disclose evidence gaps.

Acceptance includes a shorter Nova body than the baseline, measured with the same whitespace-word method before/after, alongside behavioural criteria. At `1637bbd`, stripping YAML frontmatter and splitting the trimmed body on whitespace gives Nova 1,383 words and Pixie 862 words. Word count alone does not establish quality. Keep descriptions within repository limits and measure the existing resident profiles against their 2,500-word budget.

Alternatives: making Nova strictly UI-only would leave game-art authority uncovered; creating another art agent would expand the roster; leaving all game details in conditional agent sections would keep the body large. The agreed UI-first role plus optional knowledge avoids those costs.

### 2. Clarify UX boundaries without transferring accessibility

Pixie determines what users must perceive, understand and do. Nova determines its visual expression. Amend the consistency veto to cover comprehension/interaction rather than unqualified aesthetics. Preserve the composite-control invariant in Pixie and place its detailed region-hover, focus and computed-transition inspection in `ui-review`.

| Decision | Pixie | Nova | Existing engineering owners |
| --- | --- | --- | --- |
| Hierarchy | task and reading priority | typography, emphasis and composition | Bob implements |
| Density | necessary information, legibility and operability | scale, rhythm, alignment and spacing | Bob implements |
| Responsive layout | task preservation, order and interaction changes | composition at relevant sizes | Bob implements |
| Motion | purpose, feedback, continuity, reduced motion and access requirements | visual language within those requirements | Bob implements; Quinn verifies; Perry owns relevant measurement/cost/budget |
| Tokens | functional meaning and accessibility | visual relationships and values | Bob implements; Archie owns a shared technical contract when applicable |

Correct the state boundary in Nova and team documentation: Pixie owns interface states; Maya owns gameplay states. HUDs/menus do not trigger gameplay or game-art review merely because the project is a game.

Bob and Quinn keep their existing engineering/verification roles. Edit their bodies only if a concrete contradictory boundary is found; place normal usage guidance in the skill and team documentation rather than adding duplicated protocols to every agent.

### 3. Provide three independent single-file skills

| Source / public ID | Installed skill name | Trigger and procedure |
| --- | --- | --- |
| `stack-packs/ui-design/SKILL.md` / `ui-design` | `canonkit-ui-design` | New interface direction or requested visual improvement: task/constraints, existing design language, commented references, representative screen when establishing reusable rules, implementable handoff. |
| `stack-packs/ui-review/SKILL.md` / `ui-review` | `canonkit-ui-review` | Rendered interface critique or verification of a changed surface: relevant viewport/state/content checks, interaction/accessibility evidence, concrete findings and affected rechecks. |
| `stack-packs/game-art-direction/SKILL.md` / `game-art-direction` | `canonkit-game-art-direction` | Game-specific asset direction: character silhouette/value, intended viewing scale, lighting/materials, environments, VFX distinction and asset-family coherence. |

Keep each skill self-contained in `SKILL.md`; no scripts, reference folders or dependencies in this version. This fits the existing ownership mechanism. If future content warrants multiple files, treat that installation change separately rather than shipping untracked files.

Descriptions should discriminate design, review and game-art work. Existing platform/API guidance, framework packs and browser controls remain the mechanisms when available; these skills add design procedures rather than duplicating those tools or requiring a maintainer-only plugin.

`ui-design` reuses the existing component/token system and records only new decisions at the proportional location already used by the project. A token audit or new design system is not mandatory. `ui-review` uses existing browser/testing tools; it does not install tooling or prescribe an external service. Specific UI/game-art data stays local unless an otherwise authorized action permits sharing.

The reviewed source is ECC at [`d2ef2680594f9a17526a6e1a2e18b3d242c5d17b`](https://github.com/affaan-m/ECC/tree/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills), including [frontend direction](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/frontend-design-direction/SKILL.md), [design-system](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/design-system/SKILL.md) and [browser QA](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/browser-qa/SKILL.md). The handoff retains the complete G01–G04 classification, evidence and source links; it is a comparative index, not a second implementation spec. Incorporate the following G01–G03 deltas into the two UI skills, not resident tutorials:

| Complement | Design and review procedure | Observable check |
| --- | --- | --- |
| M1: direction and finish | Identify existing component/token/asset exemplars; explain what a reference contributes and any justified departure. Inspect typography, spacing rhythm, optical alignment, icon weight/scale, borders/surfaces and meaningful assets at their usage size. | A finding identifies the element, existing rule or intended effect, observed defect and smallest correction; a polish request does not produce an unsolicited replacement identity. |
| M2: states and flow outcomes | For the changed flow, identify applicable loading, empty, error, partial-data, success and permission states, plus validation/disabled states when relevant. Record each trigger, visible or accessible feedback and safe next action. | Exercise the intended result and relevant recovery path. Check repeated actions, interruptions or out-of-order results when the change can affect them; trace handlers/shared state only for a concrete risk or defect, reusing Bob/Quinn's debugging and regression mechanisms. |
| M3: rendered finish | Use real or representative content, long labels/data and assets at relevant narrow/wide sizes. Check supported themes/locales affected by the change, including formatting, placeholders and RTL where applicable. Exercise keyboard/focus, semantic names/roles, field-error association, meaningful status announcements and applicable touch/gesture operation. Inspect relevant asset, console and network failures. | Actions and reading order remain usable; focus enters/returns appropriately for changed overlays; errors and status are perceivable. Distinguish expected failed requests from broken journeys. Passing component logic/build checks cannot establish rendered layout, motion or complete accessibility. |
| M4: purposeful and stable motion | Name the attention, feedback or continuity purpose. Reuse suitable project motion values/mechanisms. Define reduced-motion behaviour that preserves information/actions; test rapid reversal or navigation, start/end states and stable geometry during content or label changes. | With normal/reduced preferences the task remains operable and content visible; interruption leaves the intended final state, no stranded focus or residual interactive exit surface. Continuous work stops/pauses when no longer needed; applicable gestures have an operable alternative. Measure credible cost risks through Perry's existing method. |

M2 distinguishes the states rather than requiring six new features: loading shows meaningful waiting/progress; empty explains absence and a next step; error provides actionable recovery; partial data distinguishes available and unavailable portions; success confirms the completed result and next action; permission explains the access boundary and safe request/return path. Cancellation, undo, retry and input preservation apply only where supported or required. State requirements remain Pixie's; this does not authorize changes to authentication or product behaviour.

M3 applies to already supported themes/locales; it neither adds localization nor synchronizes translation catalogs. Relevant translated text is reviewed in product context, not certified by JSON parsing. Use the project's adopted accessibility standard and applicable platform guidance, checking exact criteria before citing them; do not confuse WCAG AA focus visibility/non-obscuration with AAA focus appearance or impose one hit-target number across platforms.

Select checks by the changed surface and concrete failure modes, not the full product of state × viewport × theme × locale. A local LOW change reuses established decisions and receives focused verification; no new brief, token audit, research quota or complete journey audit is required. Normative procedures live in the specs; these examples guide their implementation.

Reject blanket aesthetic bans, universal scores, fixed breakpoints/timing/spring presets, hardware-count animation gates, mandatory motion libraries and universal prohibitions on layout animation or native controls. Prefer suitable existing components and platform mechanisms; framework recipes remain in their own optional packs. Do not add the ECC checker, style-rule files/hooks, translation/conversion services or native/mobile procedures from G04.

### 4. Separate evidence collection from domain judgment

The review skill records the inspected surface, relevant content/viewport/state/theme/locale or motion preference, actual observation, available local screenshot/test artifact and proposed correction. Include only dimensions needed to interpret the claim. It supports a current visual assessment without pretending that a missing or non-comparable baseline proves visual regression safety.

Rendered access missing means partial/unverified rendered conclusions. Distinguish passed/failed checks, not-applicable items with a specific reason and untested items with a limitation; unavailable test access is not non-applicability. A screenshot cannot establish keyboard, focus or time-dependent motion behaviour. An automated accessibility check cannot establish full compliance. For regression comparison, ensure the baseline represents comparable content/state, viewport, theme and rendering conditions. Recheck the affected surface after a structural or visual correction; do not invalidate unrelated evidence automatically. No mandatory JSON evidence schema/checker is introduced.

Skills can collect evidence while Nova/Pixie or another installed project owner supplies the relevant judgment. They do not require a full agent chain on every edit. With no visual specialist, concrete established directions can still be implemented, but a new direction's missing decision owner must be explicit. A LOW local adjustment stays inline.

### 5. Extend the catalog without changing pack storage

Add the three opaque IDs to the catalog in `bin/stack-packs.js`. Preserve source root, module/receipt names, schema version, file IDs, target directories, validation, locking and recovery semantics. Explain in README/install documentation that the existing pack mechanism also distributes practice-specific skills; do not rename infrastructure to match terminology.

Pack-only `add` must continue to write no agent roster, specialist or HOME file. Mixed explicit requests such as a specialist plus packs keep the established behaviour. No pack implies Nova, Maya, another pack or a global install. Core/reference/global-uninstall isolation remains intact.

An expanded CLI reads existing receipts without migration. An older CLI rejects unknown new pack IDs; this is **not** bidirectional downgrade compatibility. Document the removal-before-downgrade procedure below rather than deleting metadata or weakening unknown-entry validation.

### 6. Verify contracts and prepare behavioural evaluation separately

| Area | Existing mechanism and additions |
| --- | --- |
| Pack integrity | Shared catalog validation and a quality fixture for each new ID; validate all three skills with `skill-creator`'s `quick_validate.py` when available. |
| Lifecycle | Reuse all-catalog tests for two targets, idempotence, dry-run, collision, links, local edits, interruption and global isolation. Add a mixed React + three-pack test preserving old bytes/hashes/schema and selective removal. |
| Eval loading | Extend existing selected-pack composition/isolation checks using the current loader; calibrate relevant positive/adversarial reports with existing offline judges. Do not add a visual scoring engine. |
| Ownership and routing | Update existing case sets for UI-first Nova, UX-vs-visual concerns, absent specialist, LOW inline work, conditional game-art use and no implicit installation. Preserve game-art discovery after Nova's description changes. |
| Behavioural acceptance | Prepare cases for a beautiful/confusing form, usable/visually inconsistent screen, long-content narrow layout, fragmented composite control, missing browser/baseline, game menu without Maya, character readability and skill-without-owner. Offline calibration does not execute those experiences. |
| Accepted G01–G03 deltas | Extend existing case sets with positive/adversarial evidence for M1–M4: identity-preserving polish/real assets; partial data and recovery/final result; unsupported-state access reported as untested; supported theme/locale fit and associated form errors/focus; relevant console/network failures; reduced motion, rapid reversal, stable loading geometry, gesture alternative and continuous-work cleanup. Preserve a LOW counterexample requiring only focused checks. Cases can cover related criteria together; no new evaluator or universal matrix. |
| Distribution/docs | `npm test`, `npm run validate`, `npm pack --dry-run`, routing/quality `--dry-run`, strict OpenSpec validation and Graphify update after code changes; inspect tarball contents and affected ownership/install docs. |

Real-model and real-interface results remain UNMEASURED unless separately run with appropriate authorization and usable evidence. Passing lexical fixtures or a dry-run does not prove improved visual judgment or runtime skill discovery.

## Risks / Trade-offs

- [A slimmer Nova loses game-art discoverability] -> Preserve cross-media authority in the description/mission and cover game-art routing plus optional-skill cases.
- [UX and visual authority overlap] -> Use the decision table, qualify Pixie's veto and keep requirements/visual expression distinct in handoffs.
- [Moving procedures weakens projects without optional packs] -> Keep Pixie's interaction invariant and Nova's visual principles/authority in their agents; skills deepen the method rather than create the role.
- [Practice-specific skills stretch the term stack pack] -> Explain the broadened catalog content while keeping stable paths and receipts.
- [Older CLI cannot read receipts containing new IDs] -> Remove new packs with the expanded CLI before downgrade; preserve unresolved conflicts.
- [Skill instructions grow into generic tutorials or arbitrary style rules] -> Keep only decisions/procedures that affect the requested workflow; validate small-change and established-direction cases.
- [Schema/fixture checks are mistaken for improved UI quality] -> Report measured facts separately and leave behavioural efficacy UNMEASURED without actual runs.

## Migration Plan

1. Implement source changes and validate them using isolated test HOME/project fixtures. Do not update this machine's installed agents or consuming projects as part of apply by default.
2. After separately authorized distribution/use, existing Nova copies update through explicit project re-add; Pixie follows the normal core reinstall. Explain both without executing them automatically.
3. Consumers explicitly add only desired packs using a CLI version that includes the new IDs. Old receipts need no migration; adding packs must preserve their existing files/hashes.
4. To roll back before use/distribution, revert the reviewed source change normally. To downgrade a consumer after use, run removal of the new packs with the expanded CLI first. Preserve edited copies and unresolved receipt entries, resolve reported conflicts, and only then downgrade. Never delete the receipt to bypass validation.

## Planning Review

Historical review before the G01–G03 revision: Archie approved the proposed catalog fit with compatibility/independence conditions incorporated above. Source inspection confirmed the one-file catalog and old-CLI unknown-entry rejection. Spencer independently approved that planning set with no documentary blocker; its Integration Review found no contradiction with the prior Virgo/Pixie ownership assessments. Those verdicts do not approve the newly revised acceptance criteria. Current revision review and validation belong in `tasks.md`. Implementation still requires independent review after its last relevant edit, including public-contract/preservation review, quality acceptance and HIGH documentary review; final integration must check the implemented result.

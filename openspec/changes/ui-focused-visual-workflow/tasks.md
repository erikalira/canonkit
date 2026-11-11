# Tasks

Implementation was applied under the explicit apply request of 2026-11-09 and is
committed on `main`; 3.4 and 3.5 remain open (see "Final review — 2026-11-11").
Use [design.md](design.md) and the three capability specs for acceptance. Source
implementation and offline validation do not authorize consumer installation,
paid evaluation, release, spec sync or archive.

## 1. UI-first ownership and agent guidance

- [x] 1.1 Restructure `agents/nova.md` around UI visual craft and common visual principles, retaining its specialist ID/model, cross-media visual authority and bounded veto. Remove the detailed game-art procedure for extraction in group 2. Verify the description remains discoverable for UI and game-art requests, passes repository metadata rules and the body is shorter than the recorded 1,383-word baseline using the same method.
- [x] 1.2 Clarify `agents/pixie.md` around task/reading priority, interaction, interface states and accessibility, including motion purpose/continuity/reduced-motion requirements; narrow consistency judgments to comprehension/interaction and retain the composite-control invariant while extracting the detailed inspection procedure for group 2. Verify ordinary work without a visual specialist remains meaningful, detailed M1–M4 procedures stay in optional packs and LOW changes require no full review chain.
- [x] 1.3 Update affected ownership summaries in `reference/agents-block.md`, `README.md` and `docs/team.md`, qualifying Maya's state authority as gameplay and retaining optional-specialist boundaries. Add/calibrate relevant ownership, absent-specialist, motion-access-vs-expression/performance, game-art-discovery and LOW cases in existing routing/quality case sets and `test/eval.test.js`; verify focused offline eval tests and dry-runs without model calls.

## 2. Optional skills and compatible project distribution

- [x] 2.1 Create the three single-file sources `stack-packs/ui-design/SKILL.md`, `stack-packs/ui-review/SKILL.md` and `stack-packs/game-art-direction/SKILL.md`, with names `canonkit-<id>`, and register their IDs in the existing catalog. Verify descriptions distinguish design/review/game art, optional references do not invent agents, no extra files or dependencies are required, and shared catalog validation plus available skill-format validation passes.
- [x] 2.2 Complete the skills' concrete procedures: M1 identity-preserving references/exemplars and concrete finish; M2 applicable states with trigger/feedback/next action, promised final result and recovery; M3 representative content/assets, supported theme/locale fit, accessible form/overlay/status operation and relevant console/network failures; M4 purposeful reduced-motion/interruptible interactions, stable loading geometry, gesture alternatives and continuous-work cleanup. Include composite controls, comparable-baseline and untested-vs-not-applicable evidence limits, representative-screen handoff and game-art criteria extracted from Nova. Add a quality case per new ID and calibrate positive/adversarial reports for these criteria using existing mechanisms; related scenarios can share cases. Retain missing browser/baseline, no implicit installation, ordinary game UI, absent-owner and LOW focused-check counterexamples. Verify `test/eval.test.js` and quality `--dry-run` load only the selected pack without changing authority/model; no G04 native procedure, universal matrix, new tooling or framework recipe is required.
- [x] 2.3 Extend `test/stack-packs.test.js` (now `test/e2e/stack-packs.test.js`) with mixed React + three-design-pack coexistence and selective removal, preserving original bytes/hashes and schema-1 records. Reuse existing all-catalog tests for independent installation, two targets, idempotence, dry-run, local edits, collisions, links, interruption and global isolation; verify the focused lifecycle suite passes and unresolved ownership is preserved.
- [x] 2.4 Update the README pack table, `docs/install.md`, affected maintenance/eval guidance and CLI presentation text only where the language/framework-only description is no longer accurate. Document opt-in use, explicit agent updates and removal with the expanded CLI before downgrade. Verify examples distinguish future available IDs from already installed state, name the fixed targets (their set is owned by the pack mechanism, see Final review 2026-11-11), preserve receipt/path terminology and promise no automatic specialist or pack installation.

## 3. Integration, independent review and delivery evidence

- [x] 3.1 Run `npm test`, `npm run validate`, `npm pack --dry-run`, routing and quality eval `--dry-run`; inspect that the package includes all three skill sources and unchanged global/project separation. Record commands, outcomes, skipped checks and any failures in this change without invoking real-model evals or installing into the user's HOME/projects.
- [x] 3.2 Remeasure Nova/Pixie body size and existing resident context profiles against the documented baseline/budget; inspect that interface requests no longer carry game-art procedures or resident M1–M4 tutorials and that format/lexical checks are not described as measured UI improvement. Record behavioural efficacy and native discovery as UNMEASURED unless separately supported.
- [x] 3.3 After code changes, run `graphify update .`, strict validation of this OpenSpec change and whitespace/link checks; verify graph output freshness, current main-spec references and pinned ECC sources. Map all accepted G01–G03 V/L findings and spec scenarios to implemented guidance and appropriate cases/evidence, including supported locale checks and gesture/continuous-motion cases; keep G04 deferred and distinguish planning sufficiency from implementation or efficacy.
- [x] 3.4 Obtain independent review after the final relevant implementation edit: Archie for the public pack contract/preservation guarantees, Quinn for acceptance and quality, and Spencer for HIGH-risk documentary drift. Route any remaining named UX-boundary risk to Pixie; record verdicts, resolve blockers and repeat only affected checks/reviews.
- [x] 3.5 Perform Integration Review across ownership, procedural skills, installation and evidence. Verify no contradictory boundaries or unresolved required work remain; report implemented scope, current evidence, limitations and readiness separately from authorization to commit, install, publish or archive.

## Implementation evidence — 2026-11-09 (HISTORICAL working-tree record)

> Historical: this section records the 2026-11-09 working tree at HEAD `1637bbd`,
> before the 3.0.0 restructure. Test paths, counts, the `validate.sh` mirror
> procedure and the 2,500-word budget below are superseded by "Final review —
> 2026-11-11". Notably `test/stack-packs.test.js` is now
> `test/e2e/stack-packs.test.js`, and `test/cli.test.js:2346` is now
> `test/e2e/cli-doctor.test.js:402`. "Catalog-only" and "two targets" describe this
> change's own edits at that time; the committed tree also carries a Copilot target
> (see Final review).

- Baseline: `main`, HEAD `1637bbd1f39a357bbf3a4a6d41498015ada06006`.
  Pre-existing staged work was read before edits and remains in the index.
  Initial index-file SHA-256 (metadata fingerprint, not a tree identity):
  `45C15479242BABE2AC1D078D24D9D5DDDB5C40EAC52233B1BC48E49DC88F5A2E`.
  Git refreshed index stat metadata during read-only inspection; staged entry
  names/modes/blob IDs are the preservation boundary, not index-file bytes.
  This evidence describes unpublished working-tree sources, not consumer copies.
- Implemented 1.1–2.4: UI-first Nova and bounded Pixie responsibilities; three
  optional, independently selected single-file packs; only the shared catalog
  ID list changed in distribution code. Receipt schema/targets/locking/recovery
  remain the existing implementation. README/team/install/maintenance/eval
  guidance records explicit updates and removal before downgrade.
- Focused checks: `node --test test/eval.test.js` passed 26/26 after correcting
  a lexical calibration that rejected reversed wording of available/partial data.
  The lifecycle suite passed all 19 cases in the combined run (its eval result
  became historical until the focused correction passed). New coexistence
  coverage preserves React bytes/hashes and schema-1 ownership, selective removal
  and unresolved local edits. Generic catalog cases exercise all 13 packs.
  Windows file symlinks were unavailable; directory junction checks ran.
- Three `quick_validate.py stack-packs/<id>` calls passed. Strict OpenSpec
  validation passed. Routing/quality dry-runs loaded all cases without model
  calls; selected-pack composition/isolation is checked offline.
- Package/validation evidence: `npm pack --dry-run --json` succeeded (59 entries),
  with all three skill sources included and global/project directories separate.
  Direct routing/quality `--dry-run` loaded 30/77 cases, no models called.
  Full test completion and documentary review are being completed.
  The first restricted test invocation failed with subprocess `EPERM`; rerunning
  with subprocess access used isolated temporary HOME/project fixtures.
  Direct `npm run validate` used WSL Bash without Node and rejected CRLF agent
  headers; an additional real Nova output-cap line-wrap defect was corrected.
  The corrected source snapshot then passed `npm run validate` in a disposable
  LF mirror using native Git Bash/Node: all checks, 15 agents, 13 packs, zero
  warnings. Temporary mirror used current tracked/untracked files and isolated
  HOME; it was cleaned by its script. No checkout normalization or validator
  change was made. Two initial temporary-wrapper invocations failed before
  validation (cmd quoting, then guessed npm path); the confirmed wrapper path
  resolved them. Direct-checkout validation remains an environment-limited failure,
  not a pass. Original-tree `git diff --check` is checked separately.
- `graphify update .` succeeded after the final code edit: 2,052 nodes,
  3,369 edges, 160 communities, AST-only, zero model
  calls. It refreshed code relationships and reported sequential extraction
  fallback, Windows path-alias stat-cache warning and changed community labels.
  Semantic document extraction/LLM relabeling were not run; graph freshness is
  limited to the code update.
- Behavioural efficacy, real-interface outcomes and native skill discovery:
  **UNMEASURED**. No paid eval, consumer/HOME install, commit/push, publication,
  main-spec sync or archive is part of this apply.

### Independent reviews (final implementation)

- Archie — **APPROVE**, HIGH public contract: catalog-only extension, fixed
  paths/schema, preservation tests and documented downgrade limits; no blockers.
  **Superseded 2026-11-11:** this approval covered the 2026-11-09 two-target
  tree and does not hold for HEAD (see Final review).
- Pixie — **APPROVE**, MEDIUM UX boundaries and M1–M4: no blockers. Her sole copy
  note (escaped apostrophe) was fixed and she confirmed the final file approval.
- Quinn — **APPROVE WITH CONDITIONS**, HIGH acceptance/quality: implementation
  complies, calibrated fixtures/lifecycle assertions are appropriate; finish the
  required full-suite evidence before delivery. A full run exposed the obsolete
  installed-Nova summary assertion at `test/cli.test.js:2346`; it was updated to
  the approved UI/cross-media wording and focused summary/context tests passed
  2/2. Quinn independently approved that final test edit without further
  re-review, conditional only on the full-suite outcome now running.
  A compact-output full-run wrapper initially failed to encode the test symbols
  (`UnicodeEncodeError`) before returning a suite result; it supplies no passing
  evidence. Its stdout encoding was corrected and a fresh full run started.
- Spencer — **APPROVE**, HIGH documentary drift: no blockers. Declared main-spec
  deltas await separately authorized sync; historical handoff classifications
  remain intact. Her optional current-workflow wording correction is applied.
  Dispatch
  presets: Archie `gpt-6.1-sol/high`; Pixie, Quinn and Spencer
  `gpt-6.1-sol/medium`. Runtime preset selection is exposed; effective model and
  effort telemetry were not independently exposed. No Laya call was warranted:
  direct inspection resolved the specific boundaries.

### Integration Review

The orchestrator read the implementation and specialist reports as a whole.
No recommendations conflict: Archie approves reuse of the existing lifecycle;
Pixie approves the functional/visual split; Quinn approves acceptance and tests
subject to final full-suite evidence; Spencer approves documentation and declared
unsynced deltas. No property was improved by an undocumented trade-off.

The end-to-end path remains explicit selection → two project skill copies →
existing owner judgment → focused checks → evidence-qualified report. Skills
do not create owners or fill absent-specialist authority. M1–M4 deepen procedures
without resident tutorials, additional infrastructure or a LOW review chain;
game-specific procedures stay conditional and G04 stays deferred.

Product, UX, engineering, contract preservation, quality and installation
operations are aligned; existing security/authorization boundaries remain intact.
The visually relevant instructions preserve coherent art direction within UX
requirements. No audio or telemetry change exists. This is the smallest sufficient
solution under the existing extension points. No source/review blocker remains;
final delivery verification still awaits the full-suite result.

### Preserved incidental finding

- **Confirmed — checkout validation portability**, `scripts/validate.sh:50`:
  the direct Windows checkout uses CRLF Markdown while the shell header check
  expects LF; the default Bash also resolves to WSL without Node. The current
  source passed in the LF/Git-Bash mirror. No validator/platform expansion is
  included in this visual-workflow change. **Superseded 2026-11-11:** `npm run
  validate` now runs `scripts/validate.mjs --portable` and passes natively with one
  coverage warning (Bash syntax validation not run); `scripts/validate.sh:50` no
  longer exists (see `docs/maintaining.md`).
- **Confirmed — pre-existing staged EOF whitespace**,
  `docs/plans/ecc-skills-knowledge-groups-handoff.md`: the cached diff contains
  a final blank-line warning. The protected staged content was retained;
  current unstaged diff and the 18-file Markdown local-link/whitespace check pass.

### Context measurements

Whitespace-word method: strip YAML frontmatter for bodies; default source profile
is managed roster + adapter block (Claude optional hooks omitted) + ten core
descriptions + three shipped global skill descriptions. Bodies/project packs and
user text outside managed blocks are excluded. This measures source profiles,
not installed runtime context.

| Component/profile | Before apply | Current | Delta / budget |
| --- | ---: | ---: | --- |
| Nova body | 1,383 | 687 | −696 |
| Pixie body | 862 | 720 | −142 |
| Resident roster block | 1,841 | 1,845 | +4 |
| Core agent descriptions | 229 | 231 | +2 |
| Global skill descriptions | 96 | 96 | 0 |
| Claude adapter | 176 | 176 | 0 |
| Codex adapter | 281 | 281 | 0 |
| OpenCode adapter | 327 | 327 | 0 |
| Claude profile | 2,342 | 2,348 | +6 / 2,500 |
| Codex profile | 2,447 | 2,453 | +6 / 2,500 |
| OpenCode profile | 2,493 | 2,499 | +6 / 2,500 |

Existing source-profile test passed; no budget was loosened. (Historical: the
2,500 budget and these profile totals date from 2026-11-09. The repository's
always-loaded ceiling was later raised to 3,000 in `7e76ef4`, enforced at
`test/e2e/cli-install.test.js:525`; Nova 687 / Pixie 720 body words were
re-measured on 2026-11-11, profile totals were not.) Nova's interface
protocol has no resident game-art checklist; detailed M1–M4 procedures are in
optional packs. Shorter bodies and lexical fixtures do not measure UI improvement.

### Document checks

Final document checks: 18 Markdown files, 172 local links and 329 ECC skill-link
references checked with zero errors; the inventory's explicitly named main
entrypoint remains historical while individual references use the pinned SHA.
The three primary ECC sources were retrieved at
`d2ef2680594f9a17526a6e1a2e18b3d242c5d17b`; no upstream code/checker ran.
Current main product/engineering/continuity specs were read and reused without
sync. Strict OpenSpec validation and current unstaged whitespace check pass.

### Accepted V/L traceability

All rows use the self-contained `ui-design`/`ui-review` M1–M4 guidance; evidence
below is source inspection and calibrated offline fixtures, not executed UI tests.
Classifications in the handoff and G04's deferred L remain unchanged.

| Accepted finding | Guidance | Existing quality case / evidence |
| --- | --- | --- |
| G01 frontend-a11y: form/overlay/status operation | M3 semantics, field/error, focus entry/return, announcements | `visual-review-rendered-access` |
| G01 browser-qa: failures/assets/themes | M3 expected failures versus broken journey, real assets/themes | `visual-review-rendered-access` |
| G01 click-path-audit: final result/recovery | M2 promised result, input/retry/order only when affected | `visual-review-flow-states` |
| G01 frontend-design-direction: complete applicable states | M2 trigger/feedback/next action, partial-data, untested access | `visual-review-flow-states` |
| G01 make-interfaces-feel-better: finish/stability | M1 exemplars, optical/type/icon/surface/asset finish; M3/M4 geometry | `visual-design-identity`, `visual-review-motion` |
| G01 i18n-sync: context/string fit | M3 supported locales, formatting/placeholders/RTL in context | `visual-review-rendered-access` |
| G02 motion-foundations: purpose/reduction | M4 information/actions visible with reduced preference | `visual-review-motion` |
| G02 motion-patterns: continuity/interruption | M4 reversal/navigation, final state, focus/exit surface | `visual-review-motion` |
| G02 motion-advanced: gestures/continuous work | M4 input context/alternative, pause/stop/cleanup/return | `visual-review-motion` |
| G03 react-performance: stable progressive content | M3/M4 fallback/content/assets/counters/labels, with/without animation | `visual-review-motion` |

### Spec scenario coverage

All 47 scenarios are mapped below. Case IDs are in the existing routing/quality
corpora; lifecycle evidence is in `test/e2e/stack-packs.test.js` (formerly `test/stack-packs.test.js`). A source-inspection
entry is deliberately narrower than a behavioural test; no application was run.

| Spec / exact scenario | Implemented guidance | Offline evidence |
| --- | --- | --- |
| game-art-direction — Only game-art knowledge is requested | Scope/authority | all-catalog independent two-target install tests |
| game-art-direction — Characters merge at gameplay scale | Review surfaces | visual-game-art-scale |
| game-art-direction — Effects express different events identically | Review surfaces: VFX | visual-game-art-scale |
| game-art-direction — A visual proposal changes a reward rule | Authority/scope | visual-game-art-scale |
| game-art-direction — An effect is expensive to render | Review surfaces: cost | source boundary inspection; visual-game-art-scale |
| game-art-direction — A game settings menu needs layout polish | Authority/scope | visual-ui-low-game-menu |
| game-art-direction — The skill is installed without a visual owner | Authority/scope | visual-owner-absent; shared no-owner rule inspection |
| game-art-direction — Nova is present without the game-art pack | Authority/scope; Nova protocol | visual-usable-without-game-art routing |
| interface-design-workflow — Only the design skill is requested | ui-design scope | all-catalog independent installation |
| interface-design-workflow — An existing application needs polish | ui-design/review M1 | visual-design-identity |
| interface-design-workflow — A reference informs a concrete finish decision | ui-design/review M1 | visual-design-identity |
| interface-design-workflow — A direction will be applied to several screens | ui-design M1 handoff | visual-design-identity |
| interface-design-workflow — Partial data arrives while another section fails | M2 | visual-review-flow-states |
| interface-design-workflow — A form fails and then succeeds | M2 | visual-review-flow-states |
| interface-design-workflow — A state cannot be reached with available test access | Evidence/M2 | visual-review-flow-states |
| interface-design-workflow — Later state updates can undo the intended action | M2 | visual-review-flow-states |
| interface-design-workflow — Long content breaks a narrow layout | M3 | visual-review-rendered-access |
| interface-design-workflow — A screenshot is the only available evidence | Evidence | visual-review-evidence |
| interface-design-workflow — Supported translations or themes expose a defect | M3 | visual-review-rendered-access |
| interface-design-workflow — A form or overlay needs accessible operation | M3 | visual-review-rendered-access |
| interface-design-workflow — A failed request or missing asset affects the journey | M3 | visual-review-rendered-access |
| interface-design-workflow — Loading content changes geometry | M3/M4 | visual-review-motion |
| interface-design-workflow — A user requests reduced motion | M4 | visual-review-motion |
| interface-design-workflow — The user reverses an animated interaction | M4 | visual-review-motion |
| interface-design-workflow — A gesture or continuous animation is introduced | M4 | visual-review-motion |
| interface-design-workflow — Motion raises a credible runtime cost concern | M4/boundaries | visual-review-motion; visual-motion-boundary routing |
| interface-design-workflow — Browser access is unavailable | Evidence | visual-review-evidence |
| interface-design-workflow — A correction changes the layout | Evidence/recheck | visual-review-evidence |
| interface-design-workflow — Component tests pass without rendered motion evidence | Evidence | visual-review-motion; visual-review-evidence |
| interface-design-workflow — No prior capture exists | Evidence/baseline | source inspection of no-baseline rule; visual-review-evidence |
| interface-design-workflow — The baseline uses different rendering conditions | Evidence/baseline | visual-review-evidence |
| interface-design-workflow — A control's icon and label react at different times | Composite controls | visual-review-composite |
| interface-design-workflow — Design packs are added beside React | Lifecycle | React + design coexistence contract test |
| interface-design-workflow — A skill copy has a local edit | Lifecycle | coexistence/local-conflict + generic edit-preservation tests |
| interface-design-workflow — Optional research service is unavailable | Scope/evidence | source inspection of local-reference/tool availability rules |
| visual-design-ownership — Interface work uses an interface protocol | Nova mission/protocol | visual-nova-ui routing |
| visual-design-ownership — Game-art authority remains discoverable | Nova description/mission | visual-nova-game-discovery routing; metadata test |
| visual-design-ownership — A beautiful flow remains confusing | Pixie responsibilities/authority | visual-ux-confusing routing |
| visual-design-ownership — A usable screen diverges visually | Nova authority/Pixie boundary | visual-nova-ui routing |
| visual-design-ownership — A narrow layout changes information presentation | Nova/Pixie responsive boundary; M3 | source inspection; visual-review-rendered-access |
| visual-design-ownership — Expressive motion conflicts with access or runtime cost | Nova/Pixie motion boundary | visual-motion-boundary routing |
| visual-design-ownership — An ordinary form has an error state | Pixie interface-state boundary; M2 | visual-review-flow-states |
| visual-design-ownership — A gameplay consequence changes | game-art scope/Nova boundary | visual-game-art-scale |
| visual-design-ownership — A skill is present without Nova | skills authority/scope | visual-owner-absent |
| visual-design-ownership — Parts react as separate controls | Pixie invariant/review composite | visual-review-composite |
| visual-design-ownership — Existing spacing is corrected locally | LOW boundaries/M1 scope | visual-ui-low-game-menu; source inspection |
| visual-design-ownership — A LOW label change has no motion effect | LOW scope | visual-ui-low-game-menu |

## Final review — 2026-11-11 (HEAD `2c603c3`, implementation committed on `main`)

**Status: 3.4 and 3.5 checked (12/12).** The earlier HIGH public-contract block was
cleared for this change by the corrections and Archie's scoped re-review below, and
the carry-over is now tracked as the planned change
[`copilot-project-skill-target`](../copilot-project-skill-target/proposal.md)
(artifacts only, validated strict; not implemented, not reviewed). Nothing here authorizes commit, install, publish, spec sync or archive.

### Current evidence (HEAD `2c603c3`; working tree clean apart from archive renames,
two staged main-spec adds from other changes and a CRLF-only note on `bin/cli.js`)

- `npm test`: 1003 tests, 999 pass, 0 fail, 4 skipped (152 s).
- `npm run validate`: pass, 1 warning (Bash syntax validation not run; coverage PARTIAL).
- `npm pack --dry-run --json`: 64 entries, includes all three skill sources.
- `openspec validate ui-focused-visual-workflow --strict`: valid. `git diff --check`: clean.
- Routing/quality `--dry-run`: 30 and 77 cases loaded, no model called.
- Quinn's targeted runs: `node --test test/eval.test.js` 26/26; default source
  instruction profile guard passes at the current 3,000-word ceiling.
- Nova body 687 words (baseline 1,383), Pixie 720: re-measured. Profile totals not re-measured.
- Behavioural efficacy, real-interface outcomes, native skill discovery: **UNMEASURED**.
  No Laya call, paid eval or consumer install was made.

### Independent reviews (after the last edit to implementation sources)

Dispatch (from `canonkit models show`, all "user level"): Archie `opus`/medium;
Quinn and Spencer `sonnet`/medium. Pixie was not dispatched: no new UX-boundary
risk was named and the UX surfaces were unchanged since her earlier approval.

- **Quinn — APPROVE WITH CONDITIONS, no blockers.** All 14 cited case IDs exist
  and are exercised; M1–M4 fixtures assert the stated criteria; coexistence test
  (`test/e2e/stack-packs.test.js:105-145`) is real; LOW counterexamples preserved;
  efficacy kept UNMEASURED. Conditions (path corrections, historical budget) applied
  in this file; `docs/evals.md` budget text corrected.
- **Spencer — APPROVE WITH CONDITIONS, no blockers.** The three capability specs
  are declared deltas awaiting authorized sync, not drift. Conditions: stale test
  paths/"in progress" wording (applied here), `docs/release-notes/3.0.0.md`
  statements (corrected, see below).
- **Archie — scoped re-review 2026-11-11: APPROVE WITH CONDITIONS; block cleared
  for this change.** Downgrade text verified true against `1637bbd` and HEAD with a
  read-only script (old CLI rejects the copilot key; HEAD `list` reports legacy
  installs `partial`; removing every pack the expanded CLI added/re-added unblocks
  the old CLI). Two residual `design.md` wording conditions (lines 102, 124) and an
  `install.md` refinement were applied and confirmed by grep. The Copilot target
  itself remains unreviewed here (separate change). Original verdict follows.
- **Archie — BLOCK (narrow), original.** The skill extension itself is sound. Blocker: commit
  `2861645` also added `copilot: ".github"` to `TARGETS` in `bin/stack-packs.js`
  (baseline had `agents`, `claude` only), so each pack now owns a third copy at
  `.github/skills/canonkit-<id>/SKILL.md` and receipt key `<id>:copilot:SKILL.md`.
  This change's artifacts (`design.md`, tasks above) and its earlier Archie approval
  describe a two-target, catalog-only contract. Archie also showed with a read-only
  script that a receipt written by the expanded CLI for any added pack makes the
  1637bbd CLI fail ("Invalid stack-pack receipt entry"), so `docs/install.md`
  ("remove the three design IDs before downgrading") is insufficient, and that no
  test uses a genuine legacy two-target receipt.

### Decision (user, 2026-11-11)

The Copilot project target belongs to a **separate OpenSpec change**, not this one.
Consequences recorded here:

- This change's scope stays: UI-first Nova/Pixie split, three optional skills,
  catalog IDs. It does not own, specify or approve the `.github/skills` target, the
  `list()` "partial" semantics for legacy installs or the downgrade procedure for it.
- The separate change must: add a spec delta for the target set; correct
  `design.md`-style "two targets" claims where they remain; fix
  `docs/install.md:823-827` and README downgrade notes (remove every pack the
  expanded CLI added or re-added before downgrading; legacy two-target installs
  show "partial" until re-added); add a fixture with a real two-target schema-1
  receipt asserting it reads without migration, `list` reports "partial" and
  agents/claude bytes and hashes are preserved when the third copy is added; and
  obtain its own Archie review. No schema 2, receipt deletion or relaxed
  unknown-entry validation.
- **Corrected in this change (user-authorized, 2026-11-11):** `docs/install.md`
  downgrade paragraph and README note now say to remove every pack the expanded CLI
  added or re-added, and that older installs show `partial` until re-added;
  `design.md` (Context, decision 5, verification table, migration step 4) no longer
  claims catalog-only/two targets and records that a genuine legacy two-target
  receipt has no repository fixture; task 2.4 no longer says "both" targets.
- **Still open (carry-over to the separate Copilot-target change):** the
  legacy-receipt fixture, the target spec delta and Archie's review of the Copilot
  target itself; also Archie's observation that a legacy install with a
  pre-existing untracked `.github/skills/canonkit-<id>/` reports
  `untracked/collision` (not `partial`) and re-add throws a collision error. Archie's block
  on 3.4 clears only through a scoped re-review of the corrected claims above.

### Integration Review (3.5) — closed 2026-11-11

Ownership (Nova/Pixie/Maya), procedural skills, spec deltas and evidence are
mutually consistent (Quinn, Spencer, Archie's checks Q4/Q5). The contradiction is
between installation and the documented contract: the delivered receipt/target
behaviour is wider than this change records, and its downgrade guidance is wrong.
Escalated to the user, who assigned it to a separate change. Resolution: the
doc and design claims here were corrected and re-reviewed by Archie, and the
remaining required work (target spec delta, legacy-receipt fixture, Archie review
of the target itself) is tracked in `copilot-project-skill-target`. No required
work of this change remains unresolved; the follow-up is not a prerequisite of
this change's deliverables.

### Implemented scope vs. authorization

Implemented and committed: Nova/Pixie restructure, three skills, catalog IDs,
eval cases, docs. Pending: scoped Archie re-review, follow-up change for the
Copilot target, release-note destination decision (no version chosen), main-spec
sync. Not authorized by this record: commit, install, publish, sync, archive.

### Incidental findings preserved

- Commit `2861645` bundles Copilot support, security, hooks, CLI and this change
  (high confidence); it hid the contract edit from a change-scoped review.
- Two staged main-spec adds (`model-selection`, `test-suite-execution`) belong to
  other changes; keep them out of any commit for this one.
- `docs/release-notes/3.0.0.md` verification counts (880/890) predate the test-suite
  restructure; refresh at publish time (medium confidence).

## Workflow follow-up

- Sync delta specs and archive only when requested under the OpenSpec workflow after implementation and required review; this apply performs neither action.
- Real-model evaluations and a representative real-interface comparison can later measure effectiveness when separately authorized; offline checks alone do not satisfy that claim.

## Planning evidence

- All implementation tasks are intentionally unchecked.
- The following initial reviews/checks predate the G01–G03 acceptance revision; they remain historical and do not approve the new criteria or establish the current working-tree state.
- The planning-only Archie review approved the existing single-file catalog approach with independence, receipt-preservation and downgrade conditions recorded in `design.md`; it does not replace final implementation review.
- `openspec validate "ui-focused-visual-workflow" --strict` passed for the complete artifact set. A focused read-only check verified all six Markdown artifacts' local links and trailing whitespace; `git diff --check` passed. Git status showed only this new change directory, with no implementation edits.
- Spencer independently approved the planning documents with no blockers, confirming the exact three-capability/spec mapping, the 12 measurable tasks and the distinction between planning and implementation; Spencer also ran strict validation successfully.
- Planning Integration Review found the ownership, optional-skill and catalog decisions consistent with the prior Virgo/Pixie assessments and Archie's compatibility conditions. No unresolved planning blocker remains. No application UI, installer change, real-model evaluation, installation, sync or archive was performed.

## G01–G03 planning revision — 2026-11-09

- Authorized scope: incorporate every V/L finding from the reviewed G01–G03 ideas, record all G01–G04 classifications in the [handoff](../../../docs/plans/ecc-skills-knowledge-groups-handoff.md), and defer G04 mobile/native additions to a future stack-pack change. No implementation, installation, main-spec sync, commit, release or archive is authorized by this revision.
- M1–M4 in `design.md` consolidate the additions; `interface-design-workflow` provides observable scenarios and `visual-design-ownership` preserves owner and LOW boundaries. Framework/library recipes, fixed metrics/matrices and new evidence infrastructure remain excluded.
- Validation: `openspec validate ui-focused-visual-workflow --strict` and `git diff --check` passed after the acceptance edits. A read-only Python document check covered all seven Markdown files (handoff plus six change artifacts): local links/whitespace, requirement description limits, 314 unique pinned inventory entries, 28 groups, all 31 reviewed skills, ten accepted V/L mappings and 12 still-unchecked tasks. G05–G28 were compared against the pre-existing index version and preserved. The first inline checker attempt failed to locate a Unicode heading through the shell pipeline; rerunning with ASCII heading prefixes passed with zero document errors.
- Independent MEDIUM planning review: Pixie approved the six-file revision without UX blockers. Her clarification moved loading/layout stability into rendered review, explicitly with or without animation; a focused follow-up approved the final spec/handoff state. Dispatch requested the Pixie role (`gpt-6.1-sol`, medium); effective model/effort were not independently exposed by the review runtime. This is planning acceptance only, not application verification or implementation review.
- Integration Review: the ten accepted findings have scoped, observable acceptance; roles, LOW proportionality, single-file distribution and evidence limits remain consistent. G04 is recorded but deferred, and the handoff points to the change rather than duplicating its implementation contract. No unresolved planning blocker remains.
- No source agents, skills, packs, catalog, main specs or pre-existing staged work were modified by this revision. Application tests, package/eval runs and Graphify update were not needed for planning-only edits; implementation checks and final independent reviews remain pending in groups 1–3 above. No real-model efficacy evaluation or real-interface comparison ran; efficacy remains UNMEASURED.

# engineering-delivery Specification

## Purpose

Keep engineering completion and review claims proportional to current evidence while supporting disciplined debugging and useful regression tests.

## Requirements

### Requirement: Evidence-qualified completion
Delivery guidance SHALL distinguish VERIFIED, PARTIALLY VERIFIED, UNVERIFIED and BLOCKED for the claim being made, record relevant commands actually run and limitations, and invalidate affected evidence after a relevant edit. It SHALL require no irrelevant build or E2E for LOW work.

#### Scenario: Code changed after a passing test
- **WHEN** the affected code changes after the last passing test
- **THEN** the earlier result is historical evidence and cannot verify the current behavior without relevant validation

#### Scenario: Incomplete or failed validation
- **WHEN** some criteria are checked, none have sufficient evidence, or a known failure remains
- **THEN** completion is respectively PARTIALLY VERIFIED, UNVERIFIED or BLOCKED and identifies pending evidence or the failure

#### Scenario: Received subagent report
- **WHEN** a subagent claims success
- **THEN** the parent checks the relevant diff and evidence before adopting that claim, reusing valid evidence without automatically rerunning tests

### Requirement: Hypothesis-driven debugging
Engineering guidance SHALL reproduce a defect or state the reproduction limit, inspect evidence and recent changes, test a concrete root-cause hypothesis with a small intervention, and validate the original failure and relevant regressions. Around three failed fixes SHALL prompt contextual reconsideration rather than an automatic block or mandatory architecture dispatch.

#### Scenario: Repeated unsuccessful fixes
- **WHEN** roughly three fixes fail without resolving a defect
- **THEN** the engineer reassesses hypotheses, dependencies or architecture before another similar edit and escalates only a named decision outside engineering authority

### Requirement: Selective regression-first testing
Guidance SHALL prioritize a failing regression test for reproducible bugs, business logic, invariants and testable contracts when practical, then the smallest correction and relevant passing checks. It SHALL forbid fabricated RED evidence, weakened assertions and hidden failures while exempting changes without useful automation.

#### Scenario: Pre-fix test cannot be run
- **WHEN** a regression test cannot be executed before the fix
- **THEN** the report records the limitation without altering correct code to manufacture failure

### Requirement: Two aspects within existing review
An applicable review SHALL report requirements compliance and technical quality separately, inspecting implementation and available evidence. Missing evidence SHALL be distinguished from a demonstrated defect. Risk routing and Scott's scope authority SHALL remain unchanged without automatic extra reviewers.

#### Scenario: Green tests miss the requirement
- **WHEN** tests pass but an acceptance behavior is absent
- **THEN** the review names the compliance gap independently of technical findings and does not treat green tests as full acceptance

#### Scenario: Review requests an unrelated feature
- **WHEN** a reviewer proposes functionality outside approved scope
- **THEN** the proposal is separated from defects and routed to the scope owner rather than becoming an implementation obligation

### Requirement: Honest offline evidence
Instruction validation SHALL distinguish deterministic format, schema, distribution and lexical-judge evidence from model efficacy. Behavioral efficacy SHALL remain UNMEASURED without authorized model measurements; no paid evaluations SHALL run without specific authorization.

#### Scenario: Offline fixtures pass
- **WHEN** synthetic report calibration and repository checks pass without model runs
- **THEN** the report states what those checks prove and retains UNMEASURED for instruction obedience and behavioral improvement

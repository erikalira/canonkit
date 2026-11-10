# Spec Delta

## Purpose

Provides optional Laya-based signals that help orchestrators inspect HIGH handoff briefs and completion reports without replacing Canonkit's ownership, evidence, approval or review requirements.

## ADDED Requirements

### Requirement: HIGH handoff signals identify missing details for manual inspection
When a concrete semantic uncertainty about omissions warrants another signal and Laya is available, Canonkit MAY assess HIGH handoff briefs or returns by relevant dimensions. Acceptance and validation questions SHALL compare documentary coverage against the supplied objective, named HIGH risk and constraints without certifying technical correctness or completeness. Low signals SHALL prompt direct inspection rather than blocking or approving work.

#### Scenario: Direct inspection suffices or relevant evidence is unchanged
- **WHEN** direct inspection resolves the uncertainty or applicable advice already covers unchanged task context and evidence
- **THEN** the orchestrator may skip the consultation or reuse that advice, including for reviews and follow-ups
- **AND** no Laya call or separate skip record is required

#### Scenario: HIGH brief lacks actionable acceptance or validation detail
- **WHEN** a HIGH task is about to be dispatched and a Laya signal for acceptance criteria or validation planning is below the advisory threshold
- **THEN** the orchestrator inspects and addresses the possible omission before dispatch
- **AND** the signal alone does not reject the dispatch

#### Scenario: A brief includes criteria and a plan but omits part of the supplied task
- **WHEN** a selected consultation assesses a brief that states criteria and validation but appears to omit part of the supplied objective, named HIGH risk or constraints
- **THEN** the questions assess that documentary coverage rather than mere presence
- **AND** the orchestrator verifies any suspected omission directly rather than treating the signal as a technical verdict

#### Scenario: HIGH completion report may omit validation or review status
- **WHEN** a HIGH task returns and a Laya signal indicates applicable test results or review-status disclosure may be missing
- **THEN** the orchestrator checks the report and direct validation evidence before adopting the work
- **AND** a high signal does not count as evidence that tests ran or review is complete

#### Scenario: Tests are inapplicable or independent review is already complete
- **WHEN** the task requires another form of validation or its report explicitly discloses completed independent review
- **THEN** the orchestrator inspects the applicable validation and review evidence
- **AND** it does not require irrelevant tests or a pending-review declaration merely to satisfy a Laya signal

### Requirement: Laya cannot replace Canonkit governance or direct evidence
Laya assessments SHALL remain advisory and MUST NOT authorize work, change risk, select or waive required owners, satisfy independent review, establish that tests ran, or override user approval.

#### Scenario: Laya reports every handoff dimension as present
- **WHEN** all Laya signals for a HIGH handoff appear favorable
- **THEN** the orchestrator still obtains required owner participation, direct validation evidence and independent review

#### Scenario: Laya is unavailable or its assessment fails
- **WHEN** no usable Laya tool is available or an assessment errors or returns unusable data
- **THEN** the orchestrator discloses the gap and follows the existing manual HIGH handoff process without retrying indefinitely

### Requirement: Laya receives only minimized task-relevant content
Inputs sent to Laya SHALL be limited to sanitized information needed for the specific assessment and MUST exclude credentials, secrets, raw logs and unrelated private context.

#### Scenario: A handoff includes sensitive or unrelated material
- **WHEN** the orchestrator prepares a Laya assessment from a brief or report containing sensitive or unrelated content
- **THEN** it removes that content and sends only the relevant objective, criteria, constraints and report details

### Requirement: Long-text assessment preserves uncertainty and attribution
When a relevant brief or report exceeds the normal prediction context, Canonkit MAY use Laya's long-text assessment and SHALL treat window attribution as a navigation hint, not independent evidence.

#### Scenario: Relevant input is incomplete or truncated
- **WHEN** relevant task context is incomplete, the brief/report is cut off or the tool reports truncation
- **THEN** the orchestrator treats affected signals as partial even if numerically valid or high, discloses limited coverage and inspects the full relevant source manually
- **AND** it does not record a complete assessment of omitted content

#### Scenario: A long report contains a buried validation signal
- **WHEN** Laya identifies a relevant window in a long report
- **THEN** the orchestrator inspects that portion of the source report and validates its claims directly
- **AND** the prediction does not establish that the reported event or test actually occurred

#### Scenario: A long report includes older or contradictory validation claims
- **WHEN** the attributed window mentions successful tests but other statements qualify their relevance to the current work
- **THEN** the orchestrator checks the source context and direct evidence for the current work state before adopting the claim

### Requirement: Large candidate sets do not automate owner assignment
For an existing large candidate set, Canonkit MAY use a shortlist or tournament-style Laya suggestion chosen for candidate semantics and observed usefulness rather than speed, but SHALL leave owner selection and dispatch under the existing human and governance process.

#### Scenario: Tournament returns a suggested owner
- **WHEN** Laya selects a candidate from a large owner list
- **THEN** the orchestrator treats it only as a suggested candidate and applies the existing risk and ownership rules before dispatch

### Requirement: Practical adoption prioritizes quality without additional benchmark campaigns
Canonkit SHALL support practical use of the advisory procedure without requiring a new synthetic evaluation campaign, and SHALL judge usefulness from real findings and corrections rather than latency. Observations SHALL remain compact in existing task evidence and MUST NOT retain prompts, full reports, transcripts or sensitive content in a separate usage record.

#### Scenario: Laya catches an omission or raises a false alarm during real work
- **WHEN** the orchestrator verifies a useful omission, false alarm or missed problem
- **THEN** it records the relevant short observation and disposition in existing task evidence
- **AND** it does not require a new benchmark, infrastructure or sample quota to continue normal work

# product-discovery Specification

## Purpose

Help the existing product owner clarify consequential uncertainty and observable acceptance without imposing discovery ceremony on clear requests.

## Requirements

### Requirement: Proportional product clarification
Product guidance SHALL reuse existing problem, user, outcome, constraints, non-goals and success signals. For MEDIUM/HIGH it SHALL separate confirmed facts, unverified assumptions, approved decisions and genuinely blocking questions, and include relevant negative acceptance paths. Clear requests SHALL proceed without repeated discovery.

#### Scenario: Vague product outcome
- **WHEN** a request has no observable outcome or acceptance criteria
- **THEN** the product owner identifies the missing decision through a focused question or authorized assumption, labels hypotheses and suggests the smallest useful experiment

#### Scenario: Clear small request
- **WHEN** an authorized request already provides adequate criteria
- **THEN** the product owner reuses those criteria without demanding a new PRD, metric or discovery round

### Requirement: Existing requirements stay authoritative
Product guidance SHALL use the selected OpenSpec change and applicable specs as the source of truth where OpenSpec exists, reuse existing requirements elsewhere, and create no parallel brief or PRD repeating those decisions.

#### Scenario: Project uses OpenSpec
- **WHEN** an existing change defines scope and acceptance behavior
- **THEN** product clarification updates or references those artifacts instead of creating competing requirements documents

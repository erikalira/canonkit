---
name: canonkit-java
description: "Use for Java implementation, resource or concurrency correctness, and Maven/Gradle compilation or dependency diagnostics. Framework guidance applies only when present."
---

# Java

## Establish the project

Read the JDK/toolchain declaration, affected module, Maven/Gradle wrapper and
shared dependency/BOM configuration. Use the wrapper and repository check tasks.
Do not substitute a local newer JDK or change dependency versions just because
one build invocation fails.

## Implementation and diagnosis

- Inspect resource lifetime across every exit path. Use existing AutoCloseable
  APIs and try-with-resources where appropriate; manual close after a successful
  read leaves exception paths unprotected. Closing a borrowed resource can also
  violate the caller's ownership contract.
- Preserve exception context and distinguish an expected absence from a failed
  operation. Optional's type does not make unchecked `get()` safe; use the
  surrounding domain contract instead of replacing failures with null.
- Inspect singleton/static mutable state and executor boundaries. Thread-safe
  containers do not make a multi-step invariant atomic. Avoid blocking operations
  on a configured reactive/event-loop thread.
- For dependency or symbol errors, examine resolved dependency trees, BOMs,
  module source sets and annotation processors before adding duplicate versions.
  A generated-source failure may be a processor configuration issue.
- Apply Spring, Quarkus and ORM conventions only when detected in the module.
  Check actual transaction/proxy boundaries, query loading and pagination rather
  than demanding an architecture rewrite or a new framework.
- Keep schema/migration and public API changes visible to their existing owners;
  a Java compile fix does not authorize a database or contract change.

## Verify the changed boundary

Run the affected module's existing build/tests and relevant static checks.
For resource cleanup, test exceptions and ownership, not only a successful read.
Use the repository's established unit/integration split; do not require an
application context or external service for an otherwise local unit test.
Report a missing JDK, wrapper prerequisite or service rather than suppress tests.

## Team boundary

Use this knowledge while Bob implements or Quinn reviews; the skill adds no
reviewer, verdict or mandatory dispatch. Route the actual change by the existing
risk rules. Report the checks that ran and prerequisites that were unavailable.

Coverage references: [ECC Java reviewer](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/java-reviewer.md) and [build resolver](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/java-build-resolver.md).

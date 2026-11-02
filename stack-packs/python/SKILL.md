---
name: canonkit-python
description: "Use for Python implementation or diagnosis involving runtime data, mutable state, resource cleanup, async behavior and the project's existing environment."
---

# Python

## Establish the project

Read the supported Python version, pyproject/setup configuration, lockfile and
environment/test commands. Use the chosen environment manager and installed
checks. Avoid mixing a system interpreter with a project environment or adding
another formatter/type checker simply because it is familiar.

## Implementation and diagnosis

- Default arguments are evaluated once. A mutable default can share state
  across calls; create the value per call when independence is intended. Do not
  replace a deliberately shared cache without checking its contract.
- Type annotations and `cast` do not validate runtime values. Check external
  shapes at the boundary using the project's existing validation approach;
  preserve distinctions between absent data and failures.
- Use context-manager ownership for resources, including failure paths.
  A broad exception handler that returns an empty result can turn an I/O or
  parsing failure into a successful-looking answer; preserve useful context.
- In async code, trace task ownership, cleanup and cancellation. Blocking I/O
  or CPU work can stall the loop; use existing async APIs or the established
  execution boundary rather than wrapping a blocking call in `async def`.
- Avoid unobserved tasks and assumptions about GIL protection for compound
  shared-state operations. Check the configured concurrency model.
- For import failures, inspect package layout, working directory and environment
  before changing sys.path or installing another package. Framework-specific
  ORM/transaction/request checks apply only to a framework actually in use.

## Verify the changed boundary

Run focused tests under the declared interpreter and relevant installed lint/
type checks. Test successive calls for accidental sharing and exceptions for
cleanup. Avoid asserting only the type annotation or mocking away the behavior
under review. Report missing prerequisites without installing tools implicitly.

## Team boundary

Use this knowledge while Bob implements or Quinn reviews; the skill adds no
reviewer, verdict or mandatory dispatch. Route the actual change by the existing
risk rules. Report the checks that ran and prerequisites that were unavailable.

Coverage reference: [ECC Python reviewer](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/python-reviewer.md).

---
name: canonkit-typescript
description: "Use for TypeScript implementation, type errors, module resolution and review of type or async boundaries. React component behavior belongs to the React pack."
---

# TypeScript

## Establish the project

Read the relevant package scripts, lockfile, tsconfig inheritance/references,
package module mode and runtime target. In a monorepo, find the configuration
that actually owns the changed file. Use the installed compiler and package
manager; a bundler succeeding does not prove a type check passed.

Prefer the project's check command. Without one, use an existing local compiler
with the relevant config and non-emitting check; do not run project-reference
build mode blindly, because it can write outputs. Avoid changing module mode,
strictness or dependency versions merely to eliminate a diagnostic.

## Implementation and diagnosis

- At external JSON/config/API boundaries, start with `unknown` and validate the
  properties the code consumes. A generic, assertion or non-null assertion
  changes the checker, not the runtime value. Preserve discriminated-union
  exhaustiveness when adding variants.
- Track promise ownership: each failure needs an observer appropriate to the
  caller. `forEach(async ...)` does not await callbacks; choose sequential or
  bounded concurrent work from ordering and resource constraints, not habit.
- Distinguish an absent property, `undefined` and `null` when the external
  contract does. Changing compiler flags can affect consumers beyond this file.
- For resolution errors, inspect exports, file extensions, path aliases and
  runtime loader behavior together. A type-check-only alias does not configure
  the runtime. Do not paper over missing declarations with broad `any` shims.
- For callback/event code, check cancellation, error propagation and captured
  state rather than forcing a synchronous API to accept an async callback.

## Verify the changed boundary

Run the relevant type check and focused tests. A regression test for untrusted
input should supply the invalid runtime value, rather than just compile a cast.
Keep JavaScript interoperability and the repository's lint/format configuration.
Do not download a compiler or disable checks as a diagnostic shortcut.

## Team boundary

Use this knowledge while Bob implements or Quinn reviews; the skill adds no
reviewer, verdict or mandatory dispatch. Route the actual change by the existing
risk rules. Report the checks that ran and prerequisites that were unavailable.

Coverage reference: [ECC TypeScript reviewer](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/typescript-reviewer.md).

---
name: canonkit-rust
description: "Use for Rust implementation, ownership/lifetime errors, async and unsafe invariants, or Cargo workspace/feature/build diagnostics."
---

# Rust

## Establish the project

Read the toolchain pin, Cargo workspace, edition, rust-version/MSRV, lockfile
and relevant feature/target selection. Use the project's check/test commands.
Do not upgrade the edition or compiler as an incidental workaround for code
that must still build at the declared baseline.

## Implementation and diagnosis

- Follow which value owns borrowed data and how long each user can live.
  A spawned task may outlive the calling scope; move appropriate owned data
  into the task or keep work scoped to the owner. `clone`, leaks and `unsafe`
  are not default borrow-checker repairs.
- Prefer the existing error model and propagate recoverable failures with
  useful context. Adding `unwrap`/`expect` to satisfy a type error changes a
  recoverable failure into a panic; distinguish proven invariants from inputs.
  Match a critical enum exhaustively without a wildcard, and do not discard a
  `Result` or `#[must_use]` value.
- Inspect unsafe blocks through their actual safety invariants: validity,
  alignment, aliasing, initialization and lifetime. A SAFETY comment must explain
  why the operation is valid, not merely label the block.
- Check lock scope and blocking work across await points. An async function can
  still block its executor; follow the configured runtime's existing boundary
  for blocking work. Check cancellation and dropped futures for cleanup or
  partially applied state; do not assume every spawned task finishes. An
  unbounded channel hides backpressure next to that cancellation risk.
- For Cargo failures, inspect feature unification, target-specific dependencies,
  workspace membership and actual compiler diagnostics before editing versions
  or suppressing lints. Borrowed slices/str can express access without ownership,
  but changing a public signature still follows contract review rules.

## Verify the changed boundary

Run relevant Cargo checks/tests with the established target/features and
format/lint commands already used by CI. Exercise error/cancellation paths where
state crosses async boundaries. Compile-time lifetime checks and runtime tests
prove different properties; report unavailable targets or native prerequisites.
Do not add a runtime/dependency or weaken lint settings as a routine repair.

## Team boundary

Use this knowledge while Bob implements or Quinn reviews; the skill adds no
reviewer, verdict or mandatory dispatch. Route the actual change by the existing
risk rules. Report the checks that ran and prerequisites that were unavailable.

Coverage references: [ECC Rust reviewer](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/rust-reviewer.md) and [build resolver](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/rust-build-resolver.md).

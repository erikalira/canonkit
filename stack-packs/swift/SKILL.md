---
name: canonkit-swift
description: "Use for Swift implementation, ARC and actor/task isolation, or Swift Package Manager and Xcode build diagnostics."
---

# Swift

## Establish the project

Read `Package.swift` tools version, resolved dependencies, language mode, strict
concurrency/default-isolation settings and deployment targets. For Xcode projects,
identify workspace/project, scheme, configuration, SDK and destination from CI.
Distinguish SwiftPM libraries/server code from Apple UI apps. Preserve the existing
compiler baseline, signing settings and package pins while diagnosing failures.

## Implementation and diagnosis

- Follow ownership through stored closures, delegates, tasks and cancellation
  callbacks. A strong capture is wrong when its retention/lifetime is wrong, not
  because a closure escapes. Use `weak` when the referenced owner may disappear
  and absence has defined behavior; `unowned` needs a proven longer lifetime or
  access can trap. Adding weak captures everywhere can drop required work. Check
  both cycles and intentional lifetime extension before changing captures.
- Preserve optional and error contracts. Force unwrap/cast/`try!` need established
  invariants, not external input assumptions. `try?` and empty catches may hide
  meaningful failures; throwing the existing error directly can be correct. Do
  not crash or invent domain wrappers merely to silence a recoverable error.
- Trace mutable state and non-Sendable values across isolation boundaries using
  the project's language mode. Prefer ownership transfer, immutable Sendable data
  or existing actor/synchronization boundaries as appropriate. `nonisolated`,
  `@preconcurrency` and `@unchecked Sendable` do not establish thread safety by
  themselves; do not use them as automatic compiler fixes.
- Actors serialize isolated execution between suspension points, not whole async
  operations. Across `await`, another call can change state. Reserve/update state
  before suspension, or revalidate it afterward before committing; account for
  rollback if an operation fails. Capturing a local snapshot does not preserve an
  invariant about current actor state. `@MainActor` also permits reentrancy.
- Keep UI state on the project's main-actor boundary when UI is present. An async
  function can still perform blocking work; inspect actual isolation/executor
  rules for the configured Swift version instead of assuming async means background.
- Structured tasks connect child lifetimes and failures to their parent. An
  unstructured `Task` needs explicit ownership/cancellation where its lifetime
  matters. Cancellation is cooperative; propagate cancellation/failure, check it
  at relevant work boundaries and preserve cleanup. Calling cancel does not prove
  completion or undo a partially committed operation.
- For build failures, read the first actionable type/conformance/isolation error
  with its callers, imports and package target membership. Check SDK availability
  separately from compiler syntax support. Use the existing SwiftPM/Xcode build
  route; do not update packages/tools versions, reset package caches, wipe Derived
  Data or alter signing/provisioning to make an unrelated error disappear.

## Security when relevant

Validate decoded external values and impose input/resource limits before untrusted
decoding can allocate unbounded data; `Codable` does not supply domain validation.
Keep SQL values bound and process arguments controlled; path strings need a real
containment model, not an arbitrary prefix test. In Apple apps, use the established
Keychain mechanism for credentials and preserve ATS/TLS protections. Apply these
Apple-specific APIs only where available. Gard owns actual security risk.

## Verify the changed boundary

Run the affected package tests or configured Xcode scheme/destination and existing
format/lint checks. Exercise actor interleaving, cancellation/error paths or capture
lifetimes where changed; passing concurrency checks alone does not rule out logic
races. Report unavailable Apple SDKs, simulators or signing prerequisites instead
of claiming verification on unsupported hosts. Do not install tools as a repair.

## Team boundary

Bob implements and Quinn judges with this knowledge. The skill adds no reviewer,
verdict or mandatory dispatch; existing risk classification and owner routing apply.

Official references: [ARC](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/),
[concurrency](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/),
and [actor reentrancy](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0306-actors.md#actor-reentrancy).
Coverage references: [ECC Swift reviewer](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/swift-reviewer.md)
and [build resolver](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/swift-build-resolver.md).

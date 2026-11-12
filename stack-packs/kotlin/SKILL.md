---
name: canonkit-kotlin
description: "Use for Kotlin implementation, nullability and coroutine/Flow correctness, or Kotlin/Gradle and multiplatform build diagnostics."
---

# Kotlin

## Establish the project

Read the Gradle wrapper, Kotlin/plugin versions, version catalog and configured
Java toolchain/JVM target. Identify JVM, Android or multiplatform targets and the
actual source sets; `commonMain` cannot assume JVM/Android APIs. Preserve existing
module boundaries, dependency constraints and compiler options. Inspect task and
configuration names before assuming every module has `runtimeClasspath` or `test`.

## Implementation and diagnosis

- Trace nullable values and Java platform types to their source. `!!` asserts an
  invariant; it does not validate external data. Choose a safe call, explicit
  failure or boundary check according to the contract, rather than replacing
  every null with a default. For an unstable mutable property, capture a local
  `val` for a safe smart cast; that snapshot does not synchronize concurrent state.
- Keep coroutine work in a scope with a known lifetime and failure policy.
  `GlobalScope` or a newly detached scope can outlive the owner and disconnect
  cancellation. Prefer the project's structured scope or explicit lifecycle owner;
  use supervision only where independent child failure is intended.
- Preserve cancellation through broad catches and `runCatching`: rethrow
  `CancellationException` or narrow the catch to the recoverable exception.
  Cancellation is cooperative; CPU loops need appropriate checks and blocking
  APIs may need their established cancellation bridge. Cleanup still belongs in
  `finally`/resource scopes; suspending cleanup there needs `NonCancellable`. Do not turn cancellation into a successful fallback
  merely to satisfy a return type.
- A `suspend` modifier does not move blocking work off the caller's dispatcher.
  Follow the API's threading contract; use an appropriate dispatcher for blocking
  IO and bounded CPU work, without adding redundant IO switches around already
  main-safe suspend APIs. Avoid `runBlocking` on a UI or request executor.
- Inspect Flow producer/collector lifetimes, buffering, cancellation and sharing
  policy. A hot `StateFlow` does not finish normally; tie collection to its owner.
  `flowOn` changes the upstream context, not where collection runs. Equality conflation means mutating the same collection in place can suppress
  updates. Publish fresh immutable snapshots and use atomic `update` for concurrent
  read-modify-write; its lambda may run more than once, so keep side effects out.
  `asStateFlow` hides mutation methods, not mutable objects stored inside the value.
- For build failures, distinguish missing imports/visibility from source-set,
  dependency, generated-code (KSP/kapt) and Java/Kotlin target mismatches. Use the
  existing wrapper and focused tasks/dependency insight before editing versions.
  Do not add warning suppressions, refresh all dependencies or delete caches as
  the default response to a compiler error.

## Framework boundaries when present

For Android, collect UI flows with the established lifecycle-aware mechanism.
For Compose, inspect effect and remember keys, state identity and stable item
keys against real state changes; do not memoize every lambda or impose a new
architecture. Backend Kotlin does not inherit Android/Compose requirements.
When Android exposure is actually touched, check exported components/deep links,
intent trust, WebView bridges, credential storage and TLS settings. Route concrete
security risks to Gard; the skill creates no separate security authority.

## Verify the changed boundary

Run the affected wrapper tasks and configured lint/tests for the relevant source
sets and targets. Cover cancellation vs ordinary failure, null/platform inputs,
or Flow emission/lifecycle behavior when changed; prefer `runTest` with virtual time for coroutine tests. Report unavailable SDKs/native
targets; do not install toolchains or add dependencies as an incidental fix.

## Team boundary

Bob implements and Quinn judges using this knowledge. The skill adds no reviewer,
verdict or mandatory dispatch; existing project conventions and owner routing apply.

Official references: [null safety](https://kotlinlang.org/docs/null-safety.html),
[coroutine cancellation](https://kotlinlang.org/docs/cancellation-and-timeouts.html),
and [StateFlow equality and updates](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-core/kotlinx.coroutines.flow/-state-flow/).
Coverage references: [ECC Kotlin reviewer](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/kotlin-reviewer.md)
and [build resolver](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/kotlin-build-resolver.md).

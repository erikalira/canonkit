---
name: canonkit-cpp
description: "Use for C++ implementation, lifetime and ownership review, compiler or linker errors, and existing CMake/build diagnostics."
---

# C++

## Establish the project

Find the compiler/toolchain, standard version, platform ABI, build presets and
existing test targets. Follow the current CMake or other build system. Separate
compile diagnostics from link failures before changing include paths or flags.
Use the project's build directory/preset; do not regenerate or clean unrelated
outputs merely to try a fix.

## Implementation and diagnosis

- Make the owner of each resource explicit. Prefer the established RAII type;
  a raw pointer can be a valid non-owning view. Introducing shared ownership is
  a lifetime decision, not a universal replacement for pointers.
- Trace `string_view`, spans, references and iterators back to their owners.
  Returning a view into a local value or retaining it after mutation/reallocation
  can dangle even when the code compiles. A smart pointer elsewhere does not
  extend the viewed object's lifetime.
- Check copy/move/destruction behavior as one invariant for resource-owning
  types. Prefer existing value types/rule of zero where they express the intent;
  do not add custom special members without a resource-management reason.
- For shared mutable data, inspect lock scope, lock ordering and thread lifetime.
  A lock guard does not help when a reference escapes past the protected scope.
- For template failures, isolate the first relevant instantiation and constraints.
  For unresolved symbols, compare declarations, definitions, translation-unit
  inclusion and linked targets/ABI before adding libraries or weakening flags.
- At input-driven sizes, consider bounds and signed/unsigned conversions before
  allocation/indexing. Preserve error handling instead of silencing warnings.

## Verify the changed boundary

Build the affected target and run focused tests. Use configured sanitizer or
static-analysis targets when they exercise the lifetime/concurrency issue;
report when those facilities are unavailable. Do not install a new compiler,
raise the language standard or add a build dependency as a default repair.

## Team boundary

Use this knowledge while Bob implements or Quinn reviews; the skill adds no
reviewer, verdict or mandatory dispatch. Route the actual change by the existing
risk rules. Report the checks that ran and prerequisites that were unavailable.

Coverage references: [ECC C++ reviewer](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/cpp-reviewer.md) and [build resolver](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/cpp-build-resolver.md).

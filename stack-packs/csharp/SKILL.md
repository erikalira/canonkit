---
name: canonkit-csharp
description: "Use for C#/.NET implementation, nullable and async correctness, resource lifetimes, or solution/project build diagnostics."
---

# C# / .NET

## Establish the project

Read `global.json`, the affected project/solution, target frameworks and shared
build/package properties. Respect the repository's SDK and package-management
choices. Use its build/test scripts and existing analyzers; avoid a target
framework or SDK upgrade as an incidental compile fix.

## Implementation and diagnosis

- Nullable annotations and the null-forgiving operator do not validate incoming
  values. Preserve checks at serialization, configuration and API boundaries;
  identify the concrete path to a null dereference before suggesting a change.
- Follow a task through its completion. Returning an in-flight task from a
  `using` scope can dispose the resource before the operation finishes; await
  within the intended lifetime. Use `await using` for asynchronous disposal
  when supported by the resource and target framework.
- Propagate cancellation where the operation's existing contract supports it.
  Distinguish caller cancellation from a failure; do not swallow either into a
  success value. Keep `async void` to APIs that require it, such as event handlers.
- Avoid `.Result`/`.Wait()` as an async fix: they block and may deadlock in a
  synchronization context. Decide continuation/context behavior from the host
  and library contract rather than imposing `ConfigureAwait` globally.
- Inspect DI scopes and resource ownership before sharing a service across
  tasks. Concurrent collections do not make compound read-modify-write logic
  atomic. Avoid using one EF context concurrently.
- Apply ASP.NET Core, EF Core or Blazor-specific guidance only when those
  frameworks are present. Check translated queries and component/disposal
  lifetimes rather than importing a new framework or dependency.

## Verify the changed boundary

Build/test the affected project with its existing targets and test framework.
For lifetime bugs, exercise failure/cancellation as well as successful completion;
a passing build alone does not show the resource stayed alive. Keep existing
analyzer strictness and report missing SDK/workload prerequisites.

## Team boundary

Use this knowledge while Bob implements or Quinn reviews; the skill adds no
reviewer, verdict or mandatory dispatch. Route the actual change by the existing
risk rules. Report the checks that ran and prerequisites that were unavailable.

Coverage reference: [ECC C# reviewer](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/csharp-reviewer.md).

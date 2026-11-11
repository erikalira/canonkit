---
name: canonkit-go
description: "Use for Go implementation, error identity, goroutine/channel lifetimes, or module/workspace and native build diagnostics."
---

# Go

## Establish the project

Read `go.mod`, any `go.work`, toolchain directive, replacements and vendoring
policy. Match the CI package selection, build tags, GOOS/GOARCH and CGO setting;
missing C headers or a cross-compiler are different from Go type errors. Preserve
the declared baseline and selected dependency versions while diagnosing failures.

## Implementation and diagnosis

- Trace errors to the caller's contract. Add useful context with `%w` when callers
  must inspect the underlying error, and use `errors.Is`/`errors.As` for wrapped
  sentinels/types. `%v` preserves text but loses unwrap identity. Returning `err`
  directly can be correct; wrapping every return or exposing implementation errors
  as a new public contract is not required. Handle recoverable failures as errors,
  rather than panics or ignored results.
- Give each goroutine an owner, an exit path and a way to observe completion.
  Propagate the caller's context through blocking operations; calling cancel does
  not join workers. Check sends and receives when a consumer exits early. A
  cancellation-aware select, channel ownership and coordinated closure must agree;
  the sending side closes only after all senders finish. Buffer size alone does
  not repair an unbounded producer or a leak. Bound concurrency and backpressure
  according to the existing workload contract.
- Protect shared maps/state with the project's synchronization model. Check lock
  scope around callbacks and blocking work; a race-free access can still deadlock.
  Interpret loop-variable capture using the module's language version, not a
  blanket pre-Go-1.22 workaround.
- `defer` runs at function exit, not iteration exit. For many opened files or
  responses, use an iteration helper with scoped cleanup or an explicit close,
  preserving error-path cleanup and meaningful close errors. Do not remove cleanup
  just to reduce resource accumulation.
- Diagnose imports, receiver method sets, build constraints and module/workspace
  selection before changing dependencies. Use existing `go list`, `go env` or
  `go mod why` diagnostics as needed. `go mod tidy` can change module files and
  consider other targets; use it for an intended module edit, review the diff,
  and do not run it for every import or clear the module cache as a routine fix.

## Security when relevant

Bind SQL values and allowlist dynamic identifiers. `os/exec` does not invoke a
shell by default; keep executable choice and arguments controlled, and check
option injection even without a shell. Preserve TLS verification and timeouts.
For untrusted filesystem paths, a cleaned string/prefix check is insufficient:
account for path components, platform names, symlinks and races. Use a supported
rooted filesystem API when the threat model needs traversal resistance, without
silently raising the project's Go baseline. Route concrete security risk to Gard.

## Verify the changed boundary

Run the relevant build/tests and existing format/vet/lint checks with the actual
workspace, tags and targets. Use race testing where shared-state changes warrant
it and the platform supports it; it detects only exercised races. Test cancellation,
early consumer exit and error identity where affected. Report unavailable CGO or
target prerequisites; do not install missing tools or weaken checks as a repair.

## Team boundary

Bob implements and Quinn judges with this knowledge; the skill adds no agent,
verdict or mandatory dispatch. Existing risk and owner routing remain in effect.
Report which checks ran, rather than treating this checklist as execution evidence.

Official references: [error wrapping and contracts](https://go.dev/blog/go1.13-errors),
[pipeline cancellation](https://go.dev/blog/pipelines), and
[traversal-resistant file APIs](https://go.dev/blog/osroot).
Coverage references: [ECC Go reviewer](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/go-reviewer.md)
and [build resolver](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/go-build-resolver.md).

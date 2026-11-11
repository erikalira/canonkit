---
name: canonkit-react
description: "Use for React component and hook behavior, state/effect lifetimes, hydration and configured framework boundaries. TypeScript-only diagnostics belong to the TypeScript pack."
---

# React

## Establish the project

Read the installed React/framework versions, bundler and package scripts.
Distinguish plain client React, SSR and configured Server Components before
applying framework rules. A JSX project need not use TypeScript; this pack does
not require or install the TypeScript pack.

## Implementation and diagnosis

- Follow hook call order and reactive dependencies. A missing dependency can
  leave a stale closure; suppressing lint or adding an empty array does not fix
  ownership. Prefer a functional state update when the new value depends on the
  previous value rather than a captured snapshot.
- An effect owns subscriptions, timers and in-flight work it starts. Clean up
  subscriptions and prevent outdated async results from replacing newer state;
  abort or ignore obsolete work according to the API. Check unmount and rapid
  input changes, not just one successful request.
- Derive values during rendering when they are pure functions of current
  props/state. Avoid an effect chain that stores copies of the same data.
  Preserve immutable state identity and stable keys when list items move.
- For hydration failures, compare initial server/client output and environment-
  dependent data. Blanket hydration suppression hides the mismatch rather than
  establishing consistent initial output.
- Apply server/client import and serialization boundaries only in a framework
  that uses them. Review private values passed to client components and handle
  server actions as actual endpoints, following existing owner routing.
- Prefer semantic controls, labels and reachable interaction states. Verify
  keyboard interaction and loading/error/empty behavior for the flow changed.
- Memoization is a measured optimization, not a default correctness fix. Follow
  the installed compiler/framework behavior and locate a meaningful cost first.

## Verify the changed boundary

Use existing build/lint/component tests and browser verification when relevant.
For async ordering, test out-of-order completion and cleanup. A type check does
not verify hook lifetimes or hydration. Do not disable rules, add a state library
or upgrade React/framework majors to bypass a diagnostic.

## Team boundary

Use this knowledge while Bob implements or Quinn reviews; the skill adds no
reviewer, verdict or mandatory dispatch. Route the actual change by the existing
risk rules. Report the checks that ran and prerequisites that were unavailable.

Coverage references: [ECC React reviewer](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/react-reviewer.md) and [build resolver](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/react-build-resolver.md).

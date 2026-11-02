# Stack packs — implementation plan

Status: implemented locally, 2026-11-02; behavioral efficacy unmeasured. Item 7 of the
[improvements handoff](canonkit-improvements-handoff.md#7-stack-packs-opt-in-per-project).
The user authorized implementation with "continue" after reviewing the plan.
No core reinstall, release, paid eval, commit or push was performed.
Virgo prepared the initial plan through a native Codex subagent. The requested
scope is seven packs: **typescript, cpp, csharp, java, python, react, rust**;
the repeated TypeScript in the original request is one pack, and C# was added
by the user's follow-up. This explicit choice supersedes the handoff's
recommendation to start with two or three.

## Intended behavior

From a consuming project:

```sh
npx canonkit add typescript
npx canonkit add react
npx canonkit add cpp csharp java python rust
npx canonkit list
npx canonkit remove react
```

These commands are implemented in this checkout; this change has not been released.
Each add installs only the named packs in the current project. React does not
implicitly install TypeScript. No stack detection, suggestions or automatic
installation in this first version. The core install and reference commands
never install packs, even in a repository containing the corresponding build
files. Installing a pack copies instructions; it does not install toolchains,
dependencies, hooks or agents, or execute a build.

An installed skill becomes discoverable; its body is loaded when relevant.
Opt-in concerns installation, not a requirement to explicitly invoke the skill
on every task. The descriptions distinguish language guidance from framework
guidance. A pack contributes knowledge to Bob's implementation and Quinn's
quality review; it has no verdict, veto, model, roster entry or mandatory agent
dispatch of its own. Existing owner routing still applies to the actual change.

## Evidence and risk

The working tree was clean on `feat/learning-loop` before this task. The checkout
remote is `https://github.com/erikalira/canonkit.git`. Existing learning-loop
work remains the baseline; do not reset, reinstall, or replace it.

The baseline code established these constraints, which the implementation addresses:

- `bin/cli.js`, `installSkills`: every direct `skills/*/SKILL.md` is installed at
  user scope. `installCatalog` also claims those files for global uninstall.
  Packs need a separate source root, not a new folder beside core skills.
- `addSpecialists` implemented `add/remove` for project agents and
  rebuilds their managed block. Packs must not be treated as specialists.
- `bin/install-manifest.js` owns the global install receipt. A new project
  receipt must not extend that ownership to project files or reuse arbitrary
  paths from user-controlled state as write authority.
- `scripts/eval-quality.mjs`, `runCase`: the runner supplied the agent's body,
  but no pack. The new optional `stackPack` field explicitly loads the selected
  pack's body; a language fixture alone would not establish that it was loaded.
- The existing graph identifies `addSpecialists`, `installSkills` and their
  callers, but its line locations predate the current CLI. Current source was
  read to confirm these findings; no graph rebuild was needed.

The skills' instructional content is MEDIUM risk. The implementation is HIGH
under the standing roster because it extends the public `add/remove/list`
contract, adds distributed paths and introduces removal ownership. Archie owns
the contract decision; Gard reviews the concrete risk of writes/deletes escaping
the project or consuming a forged receipt; Quinn reviews acceptance coverage and
changes to validation/evals. Independent review must follow the last relevant
code edit. A planning review does not satisfy that implementation gate.

Scott is not needed to settle stack count: the user explicitly selected seven.
No new services, dependencies, agents or runtime hooks are proposed.

## Contract and layout

| Concern | Contract |
| --- | --- |
| Pack sources | `stack-packs/<stack>/SKILL.md`; `package.json.files` includes `stack-packs`. |
| Installed names | `canonkit-typescript`, `canonkit-cpp`, `canonkit-csharp`, `canonkit-java`, `canonkit-python`, `canonkit-react`, `canonkit-rust`; YAML `name` matches the installed directory. CLI IDs remain the short stack names; C# uses `csharp`. |
| Universal project target | `.agents/skills/canonkit-<stack>/`, always installed by explicit `add`. |
| Claude adapter target | `.claude/skills/canonkit-<stack>/`, installed by the same explicit `add`, preserving the existing project add convention of serving multiple harnesses. |
| Project receipt | `.canonkit/stack-packs.json`, versioned metadata with catalog IDs, hashes for each owned target file and a minimal pending operation. Paths are derived from the shipped catalog, not accepted from the receipt. No transcript or backup of unrelated content. |
| Core targets and global receipt | Unchanged. `install`, `reference` and global `uninstall` neither own nor modify project packs. |
| Discovery | `list` adds a separate stack-pack section; no new roster or always-loaded instruction block. Show installed, absent, partial, locally modified or untracked/collision state from the files/receipt. It never recovers pending state or writes. |
| Existing names | Existing specialist commands keep their behavior. Validate all names before any write; mixed lists such as `add maya react` are supported. Reject unknown/core names with the appropriate guidance. |
| Project boundary | Resolve the current project directory canonically. Refuse use inside canonkit's own source checkout; do not install at user scope when invoked from HOME. Nested-directory behavior stays aligned with existing project `add`, not an implicit search for another root. |
| Dry run | Both add and remove describe projected actions while changing zero bytes, including no receipt, directory, lock or backup creation. |

Use a small pack catalog and focused helpers rather than refactoring the entire
CLI or generalizing the global uninstall engine. The catalog is the single list
used by add/remove/list, packaging validation and the eval loader. No manifest
migration for existing specialist installations is part of this change.

Preservation rules are part of the contract:

1. Preflight every requested name, pack, destination and receipt before mutation.
   Invalid names, malformed receipts, conflicting unowned files, or linked
   destination components cause a clear failure before writes begin. For mixed
   requests, complete pack preflight before calling the existing specialist
   writer; this does not promise rollback of the legacy specialist path.
2. Refuse symbolic links/junctions in managed destination components or the
   receipt. Derive all destinations from fixed catalog entries under the
   canonical project root. Apply the same checks to add, list and remove.
3. An existing untracked destination is a collision, even if its name matches.
   Do not adopt it silently. Re-adding a tracked pack is byte-idempotent when
   current, and updates only files still matching their installed hash.
4. Preserve locally edited files and unrelated files. Report a conflict rather
   than overwriting them or using a destructive force option. Removal deletes
   only tracked, unchanged pack files and removes only empty owned directories.
5. Serialize mutating pack operations with a project lock. Before touching a
   managed file, atomically record pending intent in the same receipt: catalog
   ID, `beforeHash` and `afterHash` (`null` means absent). On retry, a matching
   before/after state can be completed or reconciled; preserve a third state as
   a conflict. Do not clear ownership evidence just because a command failed.
   Test interrupted copies/removals/receipt writes and concurrent adds; define
   lock cleanup and stale-lock recovery without stealing a live operation.
6. Keep receipt evidence for unresolved managed residues; return nonzero when a
   requested install/update/removal remains incomplete. Removal may clean an
   intact target while retaining the edited target's hash and entry. Unrelated
   extra files remain untouched but do not retain pack ownership or make an
   otherwise successful removal fail. A remaining untracked destination is
   listed as a collision, not as an installed pack. Use atomic metadata writes
   without promising a whole-filesystem transaction. On execution failure,
   report which requested changes completed and which remain unresolved.

Archie's planning review accepted the layout and scope and required the lock,
pending intent and state distinctions above. Amend this plan if implementation
reveals a materially different contract rather than maintaining a second design.

## Seven skill contents and ECC reference

Reference inspected on 2026-11-02:
[ECC agents at revision b38be6a](https://github.com/affaan-m/ECC/tree/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents).
Use its domain coverage as a reference, writing concise canonkit guidance rather
than importing reviewer identities or their complete prompts.

| Pack | Guidance that changes decisions | ECC files |
| --- | --- | --- |
| TypeScript | Preserve the project's package manager, TS version, module mode and relevant tsconfig; narrow external `unknown` at runtime, distinguish assertions from validation, handle promises/async iteration, and reproduce build errors before changing configuration. | [typescript-reviewer](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/typescript-reviewer.md) |
| C++ | Establish compiler/standard and existing CMake or other build setup; reason about ownership, RAII, view/reference lifetimes, iterator invalidation and synchronization; distinguish compilation/linking failures. Use existing sanitizer/test targets where relevant. | [cpp-reviewer](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/cpp-reviewer.md), [cpp-build-resolver](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/cpp-build-resolver.md) |
| C# | Honor `global.json`, target frameworks and existing solution/project build settings; reason about nullable references, async task lifetimes, cancellation propagation and `using`/`await using` disposal. Diagnose sync-over-async and shared-state hazards; apply ASP.NET Core, EF Core or Blazor guidance only when present. | [csharp-reviewer](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/csharp-reviewer.md) |
| Java | Honor JDK/toolchain and Maven/Gradle wrappers; diagnose dependency/BOM/annotation-processor problems before changing versions; handle resources, exceptions and concurrent state. Apply Spring/Quarkus/ORM guidance only when actually present. | [java-reviewer](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/java-reviewer.md), [java-build-resolver](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/java-build-resolver.md) |
| Python | Use the declared Python version/environment/tooling; distinguish type annotations from runtime validation; avoid shared mutable defaults, preserve context-manager cleanup and error propagation, and check blocking operations in async paths. | [python-reviewer](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/python-reviewer.md) |
| React | Follow the installed React/framework/bundler versions; cover hook rules, stale closures, effect cleanup, state identity, list keys, hydration and semantic interactions. RSC/client boundaries apply only where supported/configured; JSX projects do not require TypeScript. No memoization mandate without evidence. | [react-reviewer](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/react-reviewer.md), [react-build-resolver](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/react-build-resolver.md) |
| Rust | Honor edition, MSRV, workspace, lockfile and feature selection; reason about ownership/lifetimes, error propagation, async blocking/cancellation and unsafe invariants. Do not treat cloning, panicking, unsafe code or an edition upgrade as default compiler fixes. | [rust-reviewer](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/rust-reviewer.md), [rust-build-resolver](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/agents/rust-build-resolver.md) |

Each pack starts with specific `name`/`description`, a short implementation and
diagnostic workflow, concrete pitfalls, relevant checks and the Bob/Quinn
boundary. Prefer one self-contained file; add references only when needed.
Prefer project-defined verification commands over a compulsory tool list.
Do not install missing tools, weaken checks, add dependencies, upgrade framework
majors or replace project conventions merely because the pack offers an example.
Do not copy ECC's blanket MUST BE USED dispatch rules, universal severity tables,
arbitrary function-size gates, or links to skills canonkit does not ship.
Retain attribution and comply with the source license if text is adapted.

## Acceptance and verification

| Observable acceptance | Verification method |
| --- | --- |
| Seven named packs ship, all outside the core install. | Validate pack metadata/catalog and `npm pack --dry-run` contents; isolated `install` and `reference` tests prove no pack appears at HOME or in the current project. |
| Explicit add affects only requested packs and current project. | Exercise each pack with temporary HOME/project; compare both target copies and repeat add; compare a second project and HOME before/after. Prove `add react` does not add TypeScript. |
| Existing specialists and mixed lists work. | Preserve existing specialist tests; cover add/remove for `maya react`, unknown/core names and full-request validation before writes. |
| Dry run has no side effects. | Compare tree and file bytes before/after add/remove, including absent destinations and conflicts. |
| Install/update/removal preserves local ownership. | Test edited/untracked files, extra files, corrupt/forged receipts, symlinks/junctions, partial targets, interrupted writes and retry, lock contention and recovery. Assert external sentinel files remain unchanged. |
| Every pack has at least one meaningful quality case. | Add seven fixtures, validate schema, verify pack inclusion in the agent definition, and test judges against a detecting answer and plausible incorrect answers. |
| Quality cases actually load the selected content. | Add optional `stackPack` to quality-case metadata; validate against the catalog and compose the selected SKILL body explicitly into the eval agent's instructions. Cases without it retain existing definitions. Unknown IDs fail before launching a model. |
| Claims match evidence. | Record offline results separately from behavioral effectiveness. No score increase or claim of successful automatic skill selection follows from a dry run or a regex judge. |

Initial quality fixtures:

- TypeScript: unchecked external data asserted as a domain type; the answer must
  identify the runtime boundary and reject a cast-only correction.
- C++: returning a `string_view` into an expired local string; the answer must
  identify the dangling lifetime rather than merely recommend smart pointers.
- C#: returning an in-flight read task from a `using` scope disposes its stream
  before completion; the answer must keep disposal after the awaited operation,
  rather than remove cleanup or block with `.Result`.
- Java: resource closure on an exception path; the answer must address cleanup,
  without demanding a framework change.
- Python: cross-call state caused by a mutable default; the answer must identify
  shared state and an appropriate per-call default.
- React: an outdated asynchronous result overwrites state after the selected
  input changes; the answer must address ordering/cleanup, not suppress deps.
- Rust: a spawned task borrows state that cannot outlive its owner; the answer
  must establish correct ownership/lifetime without leaking or using unsafe.

These measure behavior with explicitly supplied content. They do not measure
native Codex discovery or prove the pack improves the base model; a future
authorized comparison would need runs with and without the pack. Use small
benign controls where a fixture's judge otherwise rewards generic complaints.
Do not require language toolchains in canonkit's ordinary test suite just to
validate fixtures. The existing quality runner remains Claude-based; native
Codex planning agents do not make its eventual results Codex measurements.

During implementation run `npm test`, `npm run validate`, `npm pack --dry-run`
and only `node scripts/eval-quality.mjs --dry-run` for eval preparation.
Extend `scripts/validate.sh` with pack metadata/catalog/case coverage checks and
its existing offline conventions. Do not run paid evals. Behavioral efficacy
stays **unmeasured** until separately authorized. No actual core reinstall,
commit, push or release is part of this plan's execution authorization.

## Implementation sequence and review requirements

1. Apply Archie's accepted CLI/layout/ownership decisions from this plan; route
   material deviations back to Archie before changing the contract.
2. Add the small pack catalog and project add/remove/list path, receipt and
   preservation tests, retaining specialist behavior.
3. Write all seven skills; add package distribution and metadata checks.
4. Prepare quality fixtures and optional pack-content loading; Quinn reviews
   schema/judge/coverage changes. Run the offline checks above.
5. Update README, `docs/install.md`, `docs/evals.md`, `docs/maintaining.md` and
   the item-7 handoff to describe final behavior and measurement limits.
6. Obtain Archie/Gard/Quinn reviews of their changed surfaces after the last
   relevant edit. Spencer checks documentation against the final implementation.
   Perform the Integration Review from `orchestrate`, resolve contradictions,
   and record evidence here before declaring implementation ready.

Dispatches remain sequential unless independent HIGH-risk judgments warrant
parallelism. No concurrent writers share this checkout. Choose a supported
native Codex model explicitly for structural review; do not silently use an
unsupported generated-agent model or change the user's installation.

## Planning record

- Initial Virgo dispatch used the installed native role's configured
  `gpt-5.6`/`medium`; the runtime rejected it with `model_not_found` for this
  ChatGPT account. No role instructions ran on that failed dispatch.
- A native Codex subagent then read `agents/virgo.md` and prepared the plan,
  using the session's inherited settings. Its effective model identifier was
  not exposed. Local session configuration reads `gpt-6.1-sol`/`high`; that is
  configuration evidence, not proof of a hidden runtime identifier.
- Archie reviewed the contract through a native Codex subagent explicitly
  dispatched as `gpt-6.1-sol`/`high`. He accepted layout/scope with requirements
  for lock/pending recovery, mixed-request preflight and ownership state
  distinctions; those requirements are incorporated above. This is a design
  review, not acceptance of unimplemented code.
- Spencer reviewed both planning documents through a native Codex subagent
  explicitly dispatched as `gpt-6.1-sol`/`medium`: approved, no blockers. He
  confirmed the proposed status, original six-stack scope, source references and
  distinction between offline checks and behavioral measurement.
- The user subsequently added C# (`csharp`), bringing the scope to seven packs.
  Its guidance references ECC's `csharp-reviewer` at the same pinned revision;
  installation names, examples, acceptance counts and quality fixtures now
  include it. This local planning amendment changes no architectural contract
  and does not claim a new specialist review or behavioral measurement.
- Planning Integration Review: no contradiction remained between Virgo's proposal,
  Archie's conditions and Spencer's documentary review. The separate source
  root prevents accidental core installation; one catalog and a small project
  receipt support explicit installation/removal without new agents or services.
  That planning review did not claim implementation readiness or behavioral improvement.
- At planning close, local Markdown link targets existed, no trailing whitespace
  was found and `git diff --check` passed. Changes at that stage were limited to
  this plan and the item-7 status/link in the handoff.

## Implementation record

The local implementation adds `bin/stack-packs.js`, the seven source skills,
project CLI integration, package distribution, explicit quality-case loading,
seven fixtures and offline validation/contract tests. Existing specialist,
global install and global uninstall paths retain their ownership boundaries.
Pack staging files live under `.canonkit/`, so an interrupted atomic copy does
not strand temporary files in an untracked skill directory.

- Bob implemented the code and tests as the sole checkout writer, then stopped
  edits before independent review. Root updated the documentation afterward.
- The 41 focused stack-pack/eval tests passed. Repository validation passed;
  all seven skills also passed `skill-creator`'s `quick_validate.py` using an
  existing local Python environment, without installing dependencies.
- The quality runner's dry run validated 55 cases, including seven supplied-pack
  cases, without calling a model. Behavioral efficacy remains unmeasured.
- Archie independently reviewed the final code as `gpt-6.1-sol`/`high` and
  approved the contract, layout, recovery and explicit-content eval boundary.
- Gard independently approved the write/removal boundary as
  `gpt-6.1-sol`/`high`, including a separate TEMP reproduction of cross-pack
  interrupted removal, subsequent installation and extra-file preservation.
- The full suite passed before the final judge calibration: 749 tests,
  746 passed, three platform skips and no failures. Windows junctions were
  tested; file-symlink creation was unavailable in this environment. Cross-OS
  CI was not run here.
- Quinn found four judges accepting a correct diagnosis with a wrong fix.
  Root strengthened the correction signals and added seven negative probes
  plus valid alternatives, including Markdown formatting. The affected
  `test/eval.test.js` suite then passed 25/25. Quinn independently checked the
  final delta and approved it; installer code did not change during this fix.
- `npm pack --dry-run --offline` confirmed 48 package files, including all seven
  source `SKILL.md` files and `bin/stack-packs.js`. No package was published.
- Final repository validation passed again after the judge changes, using Git
  Bash and an existing Python installation through a process-local function.
  No host configuration was changed. `git diff --check` and checks of 19 local
  documentation link targets passed.
- Spencer reviewed README, installation, eval, maintenance, plan and handoff
  documentation against the final implementation as `gpt-6.1-sol`/`medium`:
  approved, no documentary blockers.
- Final Integration Review: Archie, Gard, Quinn and Spencer agree on scope and
  evidence. File ownership, explicit opt-in and core separation remain intact;
  the judge correction changes neither installation behavior nor authority.
  The end-to-end CLI/file lifecycle and offline checks are covered, with no
  unresolved handoff or blocker. The change is ready for user review in this
  checkout. Behavioral efficacy, native skill selection, publication and
  cross-OS CI remain unmeasured or unperformed as stated above. No paid eval,
  core reinstall, commit or push was performed.

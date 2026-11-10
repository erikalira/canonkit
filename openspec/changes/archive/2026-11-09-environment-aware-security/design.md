# Design

## Context

See `proposal.md` for motivation and the two delta specs for observable behavior.

Observed implementation anchors (planning baseline `1637bbd`):

- `bin/cli.js:395` owns installation; preflight currently reads Claude settings only with `--wire-hooks`. `scripts/install.sh` and `scripts/install.ps1` forward to this same CLI.
- `bin/cli.js:948` validates hook JSON; `:1066` writes global hook registration. The existing global catalog tracks user-level Claude `settings.json` as one JSON artifact (`:2515`); its undo currently understands hooks only. That global artifact is not the destination for the newly requested repository security policy.
- `bin/install-manifest.js` already provides locks, private snapshots, atomic writes, destination checks and tracked undo. Extend its catalog/undo integration rather than creating another backup store.
- `bin/cli.js:1676` implements read-only doctor with OK/WARN/FAIL and nonzero on FAIL. It still assumes Claude in several installation checks; diagnostics must become target-aware.
- `reference/canonkit.schema.json` currently describes project hook heuristics, not trusted security authorization. `docs/hooks.md` documents fail-open hook behavior and partial adapters.
- `test/cli.test.js:1405` expects plain installation not to create global settings. The newly authorized single strict-network key intentionally changes that assertion for supported Claude versions; global hooks, modes and permission lists remain untouched without explicit wiring. Add separate assertions for automatic repository settings. `test/uninstall.test.js` already checks preservation of unrelated settings and later edits.
- Graphify was consulted for navigation (~1,600-token query, no extraction/API); its 2026-11-06 snapshot predates some current source. Direct reads, not graph edges, establish these anchors. Main OpenSpec spec inventory was empty.

## Goals / Non-Goals

**Goals:**

- Compile a small, evidence-based native security plan for the current repository and apply it through the existing installation lifecycle.
- Support native Windows deliberately; separate partial permissions from OS-enforced shell boundaries.
- Keep restrictions and diagnosis useful when dependencies, runtime metadata or managed policy cannot be inspected.

**Non-Goals:**

- No new security service, general policy engine, dedicated profile-management CLI, launcher or universal session interception.
- No automatic routing into WSL/container in this delivery. Earlier consultation discussed routing as an optional future path; the user clarified that native Windows itself must remain usable.
- No installation of managed policy, OS packages, WSL, Docker, firewall rules or authentication changes. A separately authorized personal cleanup can unregister canonkit hooks; it does not implement the broader installer plan.
- No changes to the governance requirement to ask before commit/push. Avoiding permission prompts never bypasses those rules.

## Decisions

### 1. One small security helper; existing CLI owns mutations

Add `bin/security.js` with environment evidence, capability selection, desired-setting compilation and bounded configuration assessment. Keep filesystem mutation in the existing CLI/manifest flow. Inject platform, filesystem and process-probe dependencies so combinations are testable without pretending one host ran all five environments.

Use records for OS/kernel, WSL generation, container indicators, harness/version, dependencies and scope of evidence. Container and WSL are independent dimensions. Mark uncertainty explicitly; environment variables alone never establish containment. Avoid reading credential contents, arbitrary process environments or unrelated projects.

Alternative rejected: a separate policy engine or an inheritance tree per OS. The same Linux kernel can be in WSL and a container; available controls and overrides matter more than the label.

### 2. Automatic best-supported default, existing strict requirements preserved

`install` targeting Claude from a resolved repository computes and applies supported native restrictions to `<repo>/.claude/settings.json`, independent of `--wire-hooks` and `--no-reference`. No extra security confirmation is introduced: automatic activation is the user's explicit choice. Outside a repository, global distribution can proceed but reports repository security as pending; it must not guess a project or write its policy globally. One separate, explicitly approved global network key is described in decision 4. Selecting only other harnesses does not mutate Claude settings or add security enforcement to them.

Preserve the user's selected Manual, Auto, Edit automatically and Plan modes: do not write `permissions.defaultMode`, change `autoMode` policy, introduce bypass flags or broad `allow` entries. Decisions for ordinary actions belong to the native harness. When enabling a shell sandbox, use regular permission review (`sandbox.autoAllowBashIfSandboxed: false`) rather than an automatic-command approval shortcut. Do not overwrite an unrelated existing personal sandbox choice; report its effect separately. Additional access is denied by native restrictions or explicitly authorized through supported native mechanisms. Do not implement a second classifier or a replacement prompt system in hooks.

Do not add a new isolation-check flag or launch command. Normal installation supports partial environments; existing personal/managed requirements are preserved. On supported environments, configure the harness's own strict sandbox behavior, including refusal of unsandboxed retries. An observable requirement conflict is a diagnostic failure; unknown runtime evidence is reported as unknown. Static installation cannot certify future sessions or hidden command-line overrides. A proposed pre-write runtime-proof flag was rejected during review because read-only diagnosis has no supported universal runtime attestation source.

| Environment/capability | Automatic configuration | Honest coverage |
| --- | --- | --- |
| Claude on native Windows | Supported file restrictions, existing restrictive permissions, separate tool/network assessment; no broad new command approvals | Partial: no native Claude shell sandbox |
| WSL2 with working prerequisites | Strict shell sandbox settings plus file-tool boundaries; assess mounted drives and interoperability | Per-surface evidence required; WSL label is insufficient |
| Linux with working prerequisites | Same strict shell profile; assess namespace/AppArmor availability | Configured until runtime evidence establishes a boundary |
| macOS with working sandbox | Strict shell profile plus file-tool restrictions | Per-surface evidence required |
| Devcontainer/container | Evaluate its underlying OS and sandbox separately; assess exposed mounts, sockets, privilege and egress | Container presence alone never establishes protection |
| Unsupported version, WSL1, missing dependency or unknown environment | Apply only verified supported restrictions and report gaps; preserve existing strict requirements | Partial/unavailable/unknown; an observable unmet existing requirement is FAIL |

Existing stricter settings, including a user-required sandbox on native Windows, are preserved even if they prevent shell use. Native compatibility is not permission to remove that requirement. Report the conflict and a deliberate operator correction rather than silently loosening it.

Alternative rejected: blocking native Windows by default. It contradicts the clarified requirement. Also rejected: making arbitrary unsandboxed commands prompt-free; permission rules and command-text checks cannot provide the requested containment.

### 3. Restrict each surface with its actual controls

For supported Claude versions, set `permissions.blockReadsOutsideWorkingDirectories` (>=2.1.257) and `permissions.blockWritesOutsideWorkingDirectories` (>=2.1.314). Both are admitted in repository settings. Use a verified version matrix for all emitted controls. Identify unsupported keys rather than inserting guessed controls. Use `Read` and `Edit` for path rules; `Write(path)` does not match a path permission rule.

These two file blocks use special native precedence: a true value in any loaded source applies, and a false elsewhere cannot lift it. Do not apply ordinary last-source boolean merging to these keys in diagnosis.

Use working-directory controls for the repository scope. If path rules are necessary, resolve them according to the native setting's declared scope; a path relative to a global file is not the active repository. Do not add sibling repos or additional working directories. Existing expanded directories must be assessed as scope expansion; links, junctions, worktree metadata and UNC paths need boundary tests.

Where the shell sandbox is available, compile enabled, fail-if-unavailable and no-unsandboxed-retry settings, with no kit-added exclusions, weaker isolation, host sockets or broad external write exceptions. Keep ordinary approval decisions in the selected native mode; do not enable sandbox autoapproval. Existing exemptions must be reported as gaps, not silently blessed or silently erased.

Shell reads need a separate assessment: the default sandbox permits many reads outside the repository. Supported working-directory read controls integrate with the sandbox to restrict home/data/mounted-volume regions and reopen working directories plus the harness's runtime exceptions. With that control active, Claude ignores repository `allowRead` and `allowWrite` entries: do not emit compensating allowances that would be ineffective. Preserve stronger explicit `denyRead` regions and assess links, worktree metadata, filesystem-disabled settings and glob-related exceptions independently. Do not introduce whole-home or whole-drive grants. If unclassified outside data remains reachable or the native integration cannot establish the intended region, report shell read coverage as partial/unknown. File-tool restriction and sandbox activation alone never prove a universal repository-only boundary.

Distinguish runtime/toolchain access, private temporary storage, provider communication and the harness's documented internal file exceptions from project data. Do not mount/read credential stores to satisfy toolchain discovery. Provider authentication must not become ambient credentials for project subprocesses; inherited sensitive environment and outside hooks remain explicit coverage concerns.

Native Windows receives every supported permission restriction, but the shell remains outside an OS boundary. Do not install broad `Bash`, `PowerShell`, interpreter-eval or bypass approvals. Existing permission prompts may remain. Deny unsupported/unapproved access where the harness has an enforceable deny; never substitute automatic grants to meet the prompt-reduction goal.

Web, MCP, hooks and subagents are assessed separately. A shell sandbox setting cannot establish their coverage. This delivery does not enable new web/MCP access or rewrite unknown user integrations; such integrations leave overall coverage partial/unknown unless separate effective controls establish a boundary. Canonkit decision hooks remain absent by default and optional; observability is not permission approval. Generated routing text must condition enforcement and logging claims on actual active registrations. A selective native-mode restoration removes only attributable canonkit registrations, preserves other integrations, and changes only the kit's managed instruction block to remove stale enforcement claims.

### 4. Network closed to new destinations; no stack-derived grants

The settings reference establishes that `sandbox.network.strictAllowlist` is supported from >=2.1.219 only in user or managed settings; a repository cannot turn it on or off. After this incompatibility was found during apply, the user explicitly approved a single global exception: set that key true in the resolved Claude user settings for Claude-targeted installations, even without a repository or optional hook wiring. Emit no repository substitute. This changes neither `permissions.allow` nor approval mode, hooks, domain lists or any other global security control.

The separate protection against repository-supplied domain lists and proxy ports requires >=2.1.285. Earlier versions that support the key receive it with an explicit ceiling gap; its presence must not imply that newer repository lock behavior exists.

Use this supported strict domain-list behavior for sandboxed project traffic, with no newly added destinations by default. Existing explicit destinations remain subject to denies and trusted-source locks; surface broad domains, private addresses, proxies and socket exceptions as expanded access. Repository exceptions cannot widen a ceiling whose native trusted lock ignores them. Do not equate a domain allowlist with universal protection against exfiltration or private-network access, and do not apply sandbox network claims to native Windows shell traffic.

Keep provider traffic separate: the harness must contact its configured provider, while subprocesses do not inherit permission to use that destination merely because the harness needs it. Package installation, Git hosting, documentation and local development services need explicit persistent authorization; none has been selected in this session. Users can maintain explicitly approved native exceptions in the appropriate project, personal or managed settings. Installation must not infer grants from code, stack detection or unreviewed repository suggestions. Stack packs can recommend destinations in documentation, not authorize them.

No `canonkit.json` network authorization key is added: native `.claude/settings.json` holds the working policy. Repository settings are writable configuration, not an immutable authorization ceiling. Local settings, command-line options and managed inputs can change effective behavior; diagnose that fact. Only count a protected ceiling when effective harness/managed locks or a separately verified external boundary establish it. A checked-in setting or an installed personal setting alone cannot prove protection against changes by the agent.

Alternative rejected: automatically approve npm/PyPI/GitHub based on stack detection. Dependencies can run arbitrary code, and broad hosting domains also enable unwanted uploads.

### 5. Separate repository security from global distribution and hook wiring

Preflight every selected target and the full security plan before writing agents or settings. Validate shapes of the security-owned keys in addition to existing hook validation. Reject malformed JSON, unsafe destination paths and conflicts that cannot be conservatively merged. No secret/configuration values are printed: logs name paths, keys, control IDs and counts.

Resolve the repository root canonically and validate `<repo>/.claude/settings.json` before creating it. Global distribution and optional existing hook wiring continue to resolve the user's Claude configuration directory, including supported `CLAUDE_CONFIG_DIR`; they do not acquire authority to install a repository policy there. Never learn write destinations from a receipt or save the cwd as a global repository allowance.

The sole approved global security mutation is the trusted network key from decision 4. Compose it and any explicitly requested hook wiring in the existing global `settings.json` catalog entry and a single tracked write. Validate all selected targets before writes. A preexisting true value is observed, not owned; undo restores/removes only the still-attributable key while preserving personal lists, mode, domains and later edits. Global uninstall can reverse this global change; project-only uninstall leaves it intact. Do not bypass a managed setting or treat a syntactically written key as evidence of runtime containment.

Reuse the existing manifest mechanics with an explicit project scope: a catalog authorizes only the current resolved repository settings target, and private receipts/snapshots are separated by a canonical-root digest under `~/.canonkit/projects/`. Normalize canonical-root case on Windows before hashing. The receipt stores provenance, not policy; the working security settings remain in `.claude/settings.json`. A scoped state-directory parameter must be validated by the caller rather than read as authority from persisted data. Keep global distribution receipts separate and use a fixed lock order when both stores participate.

Add only the explicit reversal scope `uninstall --project`, which requires the current validated repository and removes only attributable project security settings. It does not remove global distribution and rejects incompatible harness selections. Ordinary global uninstall never enumerates or alters repositories. This scope flag is for conservative removal, not a new runtime permission mode or isolation-proof mechanism.

Project JSON undo recognizes owned scalar changes and array additions. Restore a scalar only when its current value still equals the last kit-installed value and provenance establishes ownership; remove only attributable added array entries. Preserve later changes and stronger restrictions. Never restore an entire historical settings file over current user data. Preflight both the global distribution and project security plans before either writes; do not pretend two independent filesystem targets form an OS transaction.

Repeat installs add no duplicate rules or unnecessary backups. Removal of a security setting on upgrade is a policy change, not cleanup; do not widen access automatically. Catalog retirement must retain enough knowledge to undo old owned keys safely.

`--dry-run` performs no writes or subprocess execution, including version checks. It prints the safely determinable plan and identifies unperformed checks; it cannot claim runtime proof using imagined evidence.

### 6. Read-only diagnosis, evidence per harness

Reuse existing doctor output severity and exit rules. Add coverage values `verified`, `partial`, `unavailable`, `unknown` with per-surface reasons. Ordinary native partial coverage is WARN; broken kit-managed configuration is FAIL; an observable unmet existing personal/managed isolation requirement is FAIL. Missing unselected harnesses are informational.

Resolve only the current repository's relevant settings and selected harness roots. Inspect known nonsecret keys through a supported metadata reader or a bounded reader for explicitly supported formats. Unrecognized TOML/JSONC constructs, merged profiles and unavailable managed/CLI inputs are unknown, never parsed through eval or treated as permissive defaults. Do not introduce a general parser dependency merely for reporting.

Read-only evidence collection may run a fixed, trusted external version/capability probe through safe binary resolution, outside project startup context, with a timeout and no network or project code. It must not start authenticated agent sessions, provision a sandbox, create test files or execute project hooks. If proof requires any of those, report unknown; behavioral boundary tests are separate validation work, not hidden doctor probes.

Codex diagnosis distinguishes the selected permission profile, approval policy, network/filesystem scope and Windows sandbox implementation where safely available; do not assume Claude's native-Windows limitation applies to Codex. OpenCode diagnosis distinguishes ordered rules, external-directory controls, policies and subagent permissions from actual OS isolation. Both remain read-only and version-aware.

No SessionStart enforcement hook or wrapper is added. A direct launch has only the protections Claude actually enforces. Doctor recomputes the environment when invoked; detection at install time cannot prove that every future terminal, extension or shortcut loads the same effective settings.

### 7. Native-default upgrade migration (authorized 2026-11-09)

The user approved extending native defaults to users with existing canonkit hooks. Without `--wire-hooks`, compose selective removal with the existing global/network and current-repository/security plans; write each settings file once through its existing receipt. This is a second expressly approved global mutation category, limited to legacy kit registrations, and does not authorize changing permission lists or approval modes. Both settings files and hook shapes pass preflight before any selected installation writes. Do not enumerate other repositories or edit local/managed settings.

Only accept a simple `node <path>` command with one literal absolute argument whose normalized target is the active Claude configuration root's known `hooks/canonkit-hook.js` or `hooks/meu-time-hook.js`. Do not infer ownership from a basename, variables, relative paths, shell operators or wrappers. Preserve ambiguous registrations and log key locations only. Keep third-party handler order and all group metadata; remove an emptied kit-only group only when it has no other metadata. Hook payloads, old forwarders and history stay available because other scopes may still refer to them. Explicit wiring skips this migration and remains available.

Apply the global plan before reference rendering; dry-run rendering uses its planned settings so inactive gates are not advertised. Canonical attribution also governs activity claims: a foreign homonym cannot establish an active gate. With `--no-reference`, every native installation reconciles only an already existing valid Claude managed block, preserving every byte outside it, including BOM and mixed line endings; it creates no block, roster or skills. Reconciliation on retries cannot depend on finding new removals, because a prior attempt may have removed registrations before distribution failed. The two stores are not an all-or-nothing transaction: preserve completed changes and recoverable receipts on later failure, report completed/preserved stages, and never compensate by restoring gates automatically. Existing scalar undo does not restore removed registrations. Global hook undo permits a no-op when no attributable handler remains, preserving historical snapshots; active ambiguous wiring still refuses removal. Rewiring known canonical hooks explicitly after migration is removable without reactivating the original gates on uninstall. Private snapshots support deliberate manual recovery, not automatic whole-file restoration.

Gard, Archie and Pipe were consulted before implementation and approved this bounded design with conditions on canonical ownership, one-write composition, truthful rendering, conservative undo, failure reporting and isolated regression evidence. Their prior implementation approvals do not cover this new behavior; obtain affected final reviews after the last edit and Spencer's documentary check.

## Risks / Trade-offs

- [Native shell has host authority] -> retain permission checks, avoid broad automatic grants, state partial coverage. The user can remain native without a fabricated guarantee.
- [Automatic settings changes break formerly allowed operations] -> mark the public-contract change, preview sanitized diffs, preserve stronger/user-owned settings, document persistent authorization and recovery.
- [Configuration is widened by project/CLI/managed inputs] -> assess effective precedence where observable; unknown evidence prevents verification and fails an explicit requirement.
- [Container/WSL exposes host data or services] -> test actual mounts, interoperability, sockets and egress; do not use an environment label as proof.
- [Settings snapshots contain private values] -> reuse private backups and existing ACL checks; never include full settings in reports, fixtures or planning artifacts.
- [Only one host is available during implementation] -> fixture tests prove selection/merge behavior; platform behavior needs separate recorded runs. Unavailable runs remain pending and the corresponding boundary remains unverified.

## Migration Plan

1. Implement evidence selection and reversible security planning behind the existing installation flow; retain old receipts and security-key provenance.
2. Update tests for the authorized global network-key addition and selective legacy-hook migration without `--wire-hooks`; preserve all unrelated global settings, and test automatic repository security, native approval modes, truthful hook claims, explicit reactivation and unchanged non-Claude targets.
3. Document the breaking automatic default, native partial profile, supported versions, separate surfaces and preservation of existing strict requirements. Follow the project's release process; do not silently publish this public-contract change.
4. Run synthetic fixture validation and safe platform integration checks, then independent Gard/Archie/Quinn reviews after implementation's final edit and Spencer documentation review. Do not infer closure from OpenSpec planning status.
5. On rollback/uninstall, use conservative tracked undo, preserving later operator edits. Explain that removing owned restrictions can reduce protection; never restore an old whole settings snapshot automatically.

## Consultation and source evidence

Gard and Archie approved the direction with conditions before any implementation. The user explicitly selected automatic activation, Claude-first enforcement, diagnostics for all three harnesses, and minimal documented exceptions, then clarified that users choosing only native Windows must receive its best available configuration. That clarification replaces the earlier recommendation to require WSL/container by default. No scope dispute required Scott.

The subsequent native-mode clarification supersedes the initial global automatic-permissions design: keep Claude as native as possible, restore its mode behavior, and keep repository access policy in `.claude/settings.json`. During implementation, the user approved only the trusted global strict-network key after its user-only scope was verified; Gard/Archie required isolated ownership, conservative undo and preservation of all personal lists and modes. Personal removal of attributable installed hooks is separately authorized; it is not evidence that future installer tasks are implemented. The installed Claude checked during remediation was 2.1.302: the read-boundary key was present in the binary, while the general write-boundary key was absent and officially requires >=2.1.314. Do not upgrade the harness or install unsupported keys silently.

The available consultations ran with Gard `gpt-6.1-sol/medium` and Archie `gpt-6.1-sol/high`; the initial handoff requested Opus/high, which this runtime did not provide. This records the actual agent configuration rather than attributing the review to an unavailable model.

Official sources checked on 2026-11-07; implementation must pin the tested version/capability matrix, not assume all current keys exist on older clients:

- [Claude sandbox and effective setting locks](https://code.claude.com/docs/en/sandboxing): platform support, shell-only scope, strict settings, network restrictions and override limitations.
- [Claude working-directory file controls](https://code.claude.com/docs/en/permissions#block-file-tool-reads-and-writes-outside-the-working-directories): separate file controls, internal exceptions and version floor.
- [Claude settings scopes](https://code.claude.com/docs/en/settings) and [devcontainers](https://code.claude.com/docs/en/devcontainer): configuration roots and container limitations.
- [OpenAI Windows sandbox documentation](https://learn.chatgpt.com/docs/windows/windows-sandbox) and [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference): Codex has its own native Windows implementations and permission-profile semantics; diagnose without mutating them.
- [OpenCode permissions](https://opencode.ai/docs/permissions/): tool rules and subagent permissions are distinct from shell containment.
- [Microsoft WSL installation](https://learn.microsoft.com/windows/wsl/install): stronger-environment preparation can require administrator privileges and reboot; it is separate from this installer.

The former `docs/plans/environment-security-handoff.md` is retired once this proposal is complete; decisions and verified caveats now live in this change. The handoff's historical personal shell-rule observation was not rechecked and authorizes no personal settings change.

# Proposal

## Why

Canonkit currently installs hooks whose checks are deliberately fail-open; they cannot contain arbitrary code, filesystem access or network traffic. Users need security configured automatically for their actual environment, including native Windows, with an honest account of the protection available.

## What Changes

- Detect OS, WSL generation, container context, harness version and available isolation capabilities as separate dimensions, with evidence rather than trusting environment labels.
- **BREAKING:** installation targeting Claude Code from a resolved repository automatically applies supported native security restrictions to that repository's `.claude/settings.json`, even without `--wire-hooks`. Preview and report changes, preserve stronger controls, and track reversible changes through the existing installation machinery. Outside a repository, leave repository security pending. `doctor` remains read-only.
- Apply one explicitly approved global exception: `sandbox.network.strictAllowlist: true` in Claude user settings, because Claude ignores this key in repository settings. Preserve personal permissions, domain lists, modes and unrelated integrations; this key does not isolate native Windows shell traffic.
- Preserve Claude's selected Manual, Auto, Edit automatically and Plan behavior. Do not set a default approval mode, introduce bypass/blanket approvals, or install decision hooks by default. Optional hooks and governance instructions must describe their actual role without claiming inactive enforcement.
- **BREAKING upgrade migration:** ordinary Claude installation also unregisters attributable legacy canonkit/meu-time command handlers in the resolved user settings and current repository settings. Preserve other integrations, modes and permissions; retain ambiguous commands with sanitized warnings. Explicit `--wire-hooks` keeps or reactivates the optional hooks. Do not scan other repositories or modify local/managed settings, payloads or history.
- Support native Windows directly with the strongest available permission controls and explicit partial coverage. Do not require WSL, install operating-system components, or autoauthorize unsandboxed shell execution.
- Enable strict shell sandbox settings where supported; refuse unsandboxed retries and restrict shell reads and file tools separately while retaining the native mode's approval checks. Preserve existing explicit requirements without silent downgrade; settings alone do not prove containment.
- Default project-process network access to no newly authorized destinations. Preserve explicit user-approved restrictions and destinations without widening them; distinguish provider communication from project traffic. Never derive grants from stack packs or repository content; report partial/unknown coverage when the effective harness policy can still be widened.
- Extend diagnosis across Claude Code, Codex and OpenCode, distinguishing desired settings, written settings, effective controls, evidence and gaps. Enforcement changes in this delivery target Claude only.

## Capabilities

### New Capabilities

- `environment-security-policy`: automatic capability-based Claude configuration, native Windows compatibility, strict sandbox settings, filesystem/network boundaries and conservative installation lifecycle.
- `security-diagnostics`: evidence-based environment and per-harness coverage reports, actionable corrections and read-only validation.

### Modified Capabilities

None. The main spec inventory is empty; existing installation and hook contracts are documented in `docs/install.md` and `docs/hooks.md`.

## Impact

- HIGH risk: security policy and the public `install` contract. Gard and Archie consulted before proposal; independent implementation review remains mandatory.
- Affects `bin/cli.js`, small security helpers under `bin/`, scoped installation receipts/undo, conditional routing instructions, relevant CLI and uninstall tests, README and installation/hook documentation. Security must not depend on wiring the optional tripwire hooks or modifying the user's native approval mode.
- No new package or service is required by this plan. No enforcement changes to Codex/OpenCode, managed-policy installation, launcher, automatic WSL/container provisioning, project relocation or system firewall changes.
- The user's latest clarification makes native Windows a supported partial profile. This replaces the earlier recommendation to require WSL/container for all Windows use. Minimal documented runtime/toolchain, private-temp and provider exceptions are accepted; complete containment and prompt-free arbitrary commands cannot be promised in partial profiles.
- The user subsequently requested a native Claude experience with project settings in `.claude/settings.json`, then approved only the global strict-network key after its scope limitation was verified. These decisions supersede the initial global automatic-permissions plan. A separate authorized personal configuration cleanup does not implement the broader installer change.

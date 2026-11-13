# Installation reference

The README covers the happy path. This page is the detail: what each choice
writes, how the Codex, OpenCode and Copilot targets differ, project-level tools,
specialists and stack packs, model recommendations, security scope, reference
blocks and skills, and upgrading from an older name.

Hooks and their configuration have their own page: [hooks.md](hooks.md).

Owner: canonkit maintainers (Spencer). Last reviewed: 2026-11-12.

Interactive install previews use text headings and `=`, `->`, `+` and `!`
markers so current, recommended, added and unresolved values remain readable
without color. Headings may be bold in a capable terminal; piped output stays
plain. The final review groups model and security status under user and project.

## Core, at user level

### Terms used by install

- **User level** means configuration in the user's home or configured harness
  directory. It is available across projects for that user.
- **Project** means the current validated Git worktree and its project-scoped
  files. Install asks before writing project items or project security settings.
- **Repository** refers only to the Git repository. It does not mean the user's
  home or all projects on the machine.

Without cloning anything:

```bash
npx canonkit install
```

It runs the same on Linux, macOS and Windows. In a terminal, choose one or more
runtimes; all start unselected. Space toggles, Enter confirms, and at least one
must be selected. `--claude`, `--codex`, `--opencode` and `--copilot` select
targets without the menu (they combine), and with no terminal and no target
flags it installs for Claude Code and Codex. OpenCode is opt-in because writing
`~/.config/opencode/AGENTS.md` ends OpenCode's fallback to `~/.claude/CLAUDE.md`
— not a change to make for someone who did not ask for OpenCode.

The menu is the only dependency (`prompts`, which brings `kleur` and `sisteransi`,
none with an install script), and it is only loaded when it appears: an install
decided by flag or with no terminal runs on plain Node. An installer that runs
**before** you trust the repository should not ask you to trust a dependency tree
larger than that.

### Guided install flow

After choosing runtimes, an interactive install asks whether to set up the
current project when it is a valid Git project outside the canonkit source and
your home directory. Choosing Yes opens the optional tools, specialists and
stack packs menus. Graphify and OpenSpec are preselected as recommended tools;
specialists and stacks start unselected. Choosing No keeps the install at user
level and skips project security and legacy-hook migration. Without a valid
project target, the project question and menus are skipped. Explicit project
item flags without a valid target fail before any writes.
When OpenSpec is selected from the project tool menu, it uses the same harness
targets selected at the start of install; install does not ask that choice a
second time. `canonkit tool add openspec` still offers its own harness choice.

For Claude Code and Codex, the next screen shows the recommended model and
security changes, including `=`, `->`, `+` and `!` markers. Choose the
recommended setup, keep current settings when available, or customize. The
customize path lets you choose model levels and answer security changes in one
multi-select. A final summary groups writes under USER and PROJECT and asks
before applying them. `--recommended` applies the recommendations without the
interactive screens; `--no-project` selects user-level-only scope. These flags
are useful for scripts and screen readers.

Preview the interactive defaults without writing, or preview the unattended
recommended path from a Git project:

```bash
cd my-project
npx canonkit install --dry-run
npx canonkit install --recommended --dry-run
npx canonkit install --recommended --no-project --dry-run
```

The menu collects its selections before installation begins. Cancelling or
closing input before final confirmation leaves user and project files unchanged
and reports that nothing was installed. Before a selected tool runs, install shows its project,
command, write locations and any material warning, then asks a confirmation
that names the tool and project. The menu does not imply `--yes` and never
enables Git hooks. By default, successful tool output is summarized; warnings,
failures and actionable tool notes remain visible. `--verbose` shows the
detailed plan and full tool output. `--dry-run` previews the global and selected
project steps without writing files or running tool setup.

For scripts or CI, select project items explicitly; these flags can be repeated:

```bash
npx canonkit install --specialist maya --stack typescript --tool openspec
```

They are validated against the catalog before installation writes anything and
are only valid with `install`. Without a TTY and without these flags, `install`
keeps its previous behavior: it installs the selected global runtimes and does
not write project items. A tool's confirmation remains separate; pass `--yes`
explicitly only when you intend to skip it. The closing report lists items that
remain available in each category and points to `canonkit list`.

| Choice | Writes |
| --- | --- |
| Claude Code | `~/.claude/agents`, hook files, dashboard, block in `~/.claude/CLAUDE.md`, `~/.claude/skills`; supported native security settings in the validated current repository's `.claude/settings.json`; the supported `sandbox.network.strictAllowlist: true` lock in user settings, and, after you confirm, the detected runtime folders appended to `sandbox.filesystem.allowRead` in user settings |
| Codex | `$CODEX_HOME/agents/*.toml` (`~/.codex` when `CODEX_HOME` is not set), block in `$CODEX_HOME/AGENTS.md`, `~/.agents/skills` |
| OpenCode | `~/.config/opencode/agents/*.md` (`$XDG_CONFIG_HOME/opencode` if set), block in `~/.config/opencode/AGENTS.md`, `~/.agents/skills` |
| GitHub Copilot | `~/.copilot/agents/*.agent.md`, `~/.copilot/skills` |
| more than one | the sum; the `~/AGENTS.md` block goes in with any choice |

Copilot profiles use the native custom-agent Markdown format and are available
to GitHub Copilot CLI and VS Code's Copilot harness. CanonKit leaves the model
unset so the active Copilot session chooses it. Copilot has no CanonKit hook
integration; `--wire-hooks` does not write Copilot files.

Claude paths shown as `~/.claude` use `CLAUDE_CONFIG_DIR` instead when set.
It must be an absolute directory; agents, hooks, dashboard, instructions, skills
and user settings use that same resolved root. Repository `.claude/settings.json`
stays under the validated repository. Use the same configuration roots for
install, reference, doctor and uninstall; a changed recorded root is refused.

`install` and `reference` also maintain `~/.canonkit/install-manifest.json`.
It records global artifacts by stable ID, resolved root, harness owners,
provenance and installed-byte hash. Private configuration snapshots live under
`~/.canonkit/backups/`. Project specialists and stack packs, external tool setup and activity
history are not owned by this global manifest. Repository security has a separate
scoped receipt, described below. `--no-reference` skips block and skill
distribution and preserves earlier records for them; it does not skip repository
security or the Claude hook migration described below. Each native-default
Claude install reconciles an existing canonkit block in the Claude instruction
file to retire stale hook claims, without creating a new block or distributing skills.

On Windows, tracked file replacements retry `EPERM`, `EACCES` and `EBUSY`
rename errors up to five times, with 1.5 seconds of total backoff. The original
stays in place until replacement succeeds; a concurrent edit stops the write.
If the error persists, close applications holding the reported file and rerun
the same install command. Keep the manifest and private snapshots: the next
run uses them to recover interrupted work. Completed settings writes remain.

Without `--wire-hooks`, a Claude-targeted install also unregisters attributable
older canonkit command handlers in user settings and the validated current
repository's `.claude/settings.json`. Outside a repository, only user settings
are migrated. Selecting only Codex, OpenCode or Copilot leaves Claude settings alone.

`--wire-hooks` wires hooks for every selected runtime that supports them, and only those:
Claude Code's in `~/.claude/settings.json`, Codex's in `$CODEX_HOME/hooks.json`,
OpenCode's as a plugin. What each one writes, and how to remove it, is in its
section below. Before anything is written, it refuses the whole install if it
would have to guess: a config file that does not parse, a Codex path it cannot
quote, or an OpenCode older than 2. Project security is preflighted before the
selected installation writes too. `doctor` checks selected/installed targets;
an absent unselected runtime does not create false Claude-specific failures.

From a clone, the scripts still work — they are wrappers around the same
`bin/cli.js`:

```bash
./scripts/install.sh          # Linux and macOS
.\scripts\install.ps1         # Windows
```

For Claude Code it copies the 10 core agents to `~/.claude/agents`, the only
path Claude Code reads them from. Copilot's 10 core profiles go to
`~/.copilot/agents`, with core skills in `~/.copilot/skills`.
`~/.agents` receives skills only
(`~/.agents/skills`, which Codex and OpenCode read); nothing verified reads
`~/.agents/<agent>.md`, so canonkit no longer writes it. It then syncs the global
reference blocks (`--no-reference` skips distribution, with the existing-block
correction for migrated Claude hooks described below).

The core/specialist split is declared in **each agent's frontmatter** (`tier:`),
beside `name` and `need` — where the runtime already reads the other facts about
the agent. It used to be a literal list repeated in three installers, and keeping
the three honest cost a whole section of `validate.sh`. A new file in `agents/`
without a valid `tier` does not install: it fails, instead of assuming a default
— both possible defaults are wrong, one installs the agent everywhere and the
other hides it.

The installers report and preserve specialists left over at user level without
tracked provenance. Such a copy remains available in every project: inspect it
and remove it yourself if it should be project-only. Its name alone does not
prove that canonkit owns it.

## Native security, per repository

**Install contract change:** a plain installation targeting Claude Code now
merges supported native restrictions into `<repo>/.claude/settings.json` when
the current Git repository root can be validated. Both installer wrappers use
the same behavior. No separate security opt-in is required. Outside a validated
repository, global team distribution still runs, but project security is
reported as pending; no project policy fallback or guessed repository is used.
The sole approved global access-policy key is
`sandbox.network.strictAllowlist: true`, because Claude does not accept this
lock from project settings. It is applied only on a supported client and changes
no allow entry or approval mode. Separately, plain installation removes
attributable older Claude hook registrations as described below. This user-level lock can also
be applied outside a repository while project setup remains pending.

Preview from the repository, then apply and diagnose:

```bash
cd my-project
npx canonkit install --claude --dry-run
npx canonkit install --claude
npx canonkit doctor
```

The preview writes no settings, receipt, backup or lock and starts no version or
capability subprocess. Checks that were not run remain unknown. On a real
installation, unsafe paths or malformed settings stop preflight before any
selected-target writes. Reports name affected keys and controls, never their
private values. Existing settings and stricter restrictions are preserved.

### Security review during install

Claude's project settings (`<repo>/.claude/settings.json`) hold supported
repository restrictions: `permissions.block*OutsideWorkingDirectories` and
sandbox switches. User settings (`~/.claude/settings.json`) hold the strict
network lock and detected runtime read exceptions. The [README security
reference](../README.md#recommended-security-settings) explains each key and
its scope.

The recommended setup screen includes weaker values, absent strict keys,
runtime reads and legacy-hook migration from the same install plan. **Yes, use
recommended** applies all listed changes. **No, keep current** writes none of
the security changes and prints the relevant manual snippet. **No, customize**
asks whether to add detected runtime reads (Yes is preselected), then shows the
other eligible changes as a prechecked multi-select. Unchecking a sandbox
requirement also leaves automatic bash approval off. Keys controlled by
`settings.local.json` are not selectable. A final confirmation occurs before
any plan is applied. EOF, Escape or Ctrl-C cancels before writes.

`--recommended` skips the questions and applies the recommended answers.
`--recommended --dry-run` prints `would apply` rows and starts no discovery
processes. With no terminal and without `--recommended`, existing non-terminal
behavior is preserved. An empty settings file is treated as `{}`; malformed or
ambiguous settings stop preflight before writes.

Only detected known runtime locations are proposed. Install resolves `node` and
`graphify`, maps supported paths such as nvm and pipx to narrow `allowRead`
entries, and skips locations already covered by existing entries. Other custom
locations are reported rather than guessed. Confirmed additions are tracked so
`uninstall` removes only entries still present exactly once and unchanged.
`canonkit doctor` reports runtime-read coverage and whether project security is
configured for the current project; it writes nothing.

### Returning existing Claude installations to native approvals

This migration runs automatically on `install` when Claude is selected and
`--wire-hooks` is absent, including with `--no-reference`. To inspect it first:

```bash
npx canonkit install --claude --dry-run
npx canonkit install --claude
npx canonkit doctor
```

The preview reports removal counts and ambiguous indexed key locations without
printing commands or configuration values. It writes no settings, backups,
receipts or locks. To abort before applying, stop after the preview; to retain
optional gates, choose `install --claude --wire-hooks`, which skips this cleanup
and explicitly wires user-level hooks instead.

Only a simple `node <absolute-path>` command targeting `hooks/canonkit-hook.js`
or `hooks/meu-time-hook.js` under the active Claude configuration root qualifies
for automatic removal. Quoted absolute paths are accepted. A basename alone,
`~`, environment-variable expansion, wrappers, path segments `.` or `..`, and
paths in another configuration root do not establish ownership. Commands
mentioning these hook names that cannot be attributed remain with a `WARN`; inspect their source in Claude's
`/hooks` view. Unrelated handlers and group metadata are preserved.

Cleanup covers only the active user `settings.json` and the validated current
repository's `.claude/settings.json`. It never enumerates other repositories
or removes entries from `settings.local.json` or managed settings. Hook payloads,
the legacy forwarder and activity logs remain. The migration does not promise
that all gates disappear: a preserved wrapper, local setting or managed
registration can still activate them.

Hook removal and supported native controls are composed into one tracked write
per settings file. User settings are applied before managed instruction blocks
are refreshed; a preview renders those blocks from the proposed plan. A normal
install refreshes the kit's managed hook claims. With `--no-reference`, every
Claude install without `--wire-hooks` still reconciles an existing, validated
canonkit block in the active Claude root's `CLAUDE.md`. This includes retries
after an earlier run removed hooks but failed before updating instructions.
This narrow exception creates no document, instruction block, roster or skills
and preserves user bytes outside the managed block, including BOM and mixed line
endings. A preserved third-party command with the same hook filename does not
justify active `[ENFORCED]` claims: those require canonical registrations.
Personal modes and saved permissions remain intact.

The global and project receipt stores are separate, not one transaction. If a
later stage fails, already completed settings changes remain; output identifies
the completed stages. Fix the reported conflict, such as a concurrent settings
edit, then re-run the same install. Removed gates are not silently restored.

Private snapshots under `~/.canonkit/backups/` and the project receipt's
`backups/` directory preserve an auditable pre-change record. Uninstall does not
recreate migrated hooks, including hooks recorded by older receipts. For manual
recovery, inspect the corresponding snapshot privately, compare its hook entries
with current settings, and restore only the intended handlers after reviewing
their paths. Confirm registration in `/hooks` in a fresh Claude session and run
`doctor`. Never restore a whole settings snapshot over later edits. These
snapshots may contain credentials; keep them out of version control.

After migration, start a fresh Claude session and inspect `/hooks` for remaining
sources. `doctor` should report native controls and coverage gaps; absent optional
hooks are expected. Native approval decisions resume without a promise of the
same historical prompt count. Commit/push authorization and independent HIGH-risk
review remain instruction-based requirements.

### Native approval modes stay native

Canonkit does not set `permissions.defaultMode`, change your Auto policy,
enable bypass, or add broad `allow` entries. Manual, Auto, Edit automatically
and Plan retain the harness's ordinary approval behavior. When canonkit enables
the strict shell sandbox profile (`enabled: true`, `failIfUnavailable: true`,
and `allowUnsandboxedCommands: false`) and neither project nor user settings
choose a value, it also sets `sandbox.autoAllowBashIfSandboxed: true`. This
removes per-command review for Bash commands that actually run inside the
sandbox. The working directory remains writable, including project files and
scripts; use this default only with repositories you trust. Canonkit reports
runtime containment as unverified, so it does not promise that sandbox
protections cover `.git` paths in every supported environment. To keep command
review, set `sandbox.autoAllowBashIfSandboxed` to `false` in your project or
user settings. An existing explicit project or user choice is never overwritten
silently: an interactive install asks whether to keep a `false` or change it to
`true` (see [Security review during install](#security-review-during-install)),
and without a terminal it is preserved and the recommendation is printed.

If you want confirmation before publishing, add content-scoped `ask` rules for
Git commit and push commands. Claude Code documents that these rules still
apply to sandbox auto-approval:

```json
{
  "permissions": {
    "ask": ["Bash(git commit *)", "Bash(git push *)"]
  }
}
```

These settings provide the prompts; canonkit's commit/push instruction remains
governance only and does not enforce them.

Access restrictions and approval mode are separate. An `allow` rule is a
preauthorization, not a filesystem or network boundary. Removing one does not
add a deny or disable the command. In Auto, an action outside `allow` can still
be approved by the native classifier; explicit native `ask` and `deny` rules
have their own behavior. Do not add `Bash(*)`, interpreter-eval wildcards or a
package-runner wildcard to simulate isolation or make every operation prompt-free.

### Environment and version coverage

The detector records OS, WSL generation, container indicators, harness version
and prerequisites separately. A container inside WSL is not a different,
mutually exclusive operating system. A marker or a dependency on `PATH` is
evidence to inspect, not proof of containment.

On WSL, `bwrap`, `socat` and `claude` are looked up on the Linux side only. A
Windows `claude` (for example `claude.exe` reached through interop) is never run,
because it reads Windows settings, not the WSL ones. With only that copy, the
Claude version is unknown, so settings gated by version (file-read and file-write
blocks, sandbox, network lock) are written less than with a Linux-side Claude.
`install` says so with a `WARN security claude: a Windows copy at <path> was
ignored ...` line (a warning-marked line in the short summary; not printed in
`--dry-run`, which does not probe versions), and `canonkit doctor` shows it in
`security claude version` ("unknown; a Windows copy at <path> was ignored ...").
Install Claude Code inside WSL to restore them.

| Environment | Configuration and limits |
| --- | --- |
| Claude on native Windows | Apply supported file-tool restrictions and retain native approvals. Shell filesystem/network containment is unavailable; report partial protection without requiring WSL. |
| WSL2 or Linux | Configure supported shell isolation when the prerequisites, including `bubblewrap` and `socat`, are available. Assess mounted data, namespace restrictions and effective overrides separately. |
| macOS | Configure the supported shell sandbox and separate file-tool controls. Runtime evidence and effective policy still matter. |
| Devcontainer/container | Evaluate its underlying OS and capabilities. Exposed mounts, privileges, host sockets and egress can leave coverage partial or unknown. |
| WSL1, unsupported client or missing/unknown capability | Apply only controls whose support is established, preserve existing strict requirements, and report the gaps. Do not silently weaken a user or managed requirement. |

The supported Claude floor for the read-boundary setting is 2.1.257.
The general file-tool write-boundary setting requires 2.1.314 or later. The
user-scoped strict network lock requires 2.1.219 or later; this implementation
uses 2.1.302 as the conservative floor for its other sandbox switches. Unknown
versions do not justify emitting unsupported keys. A 2.1.302 native installation
can therefore receive this minimal restriction, merged with existing settings:

```json
{
  "permissions": {
    "blockReadsOutsideWorkingDirectories": true
  }
}
```

Every emitted key is listed below. Version gates live in
[`bin/security.js`](../bin/security.js) and are checked in
[`test/security.test.js`](../test/security.test.js); those fixtures establish
compiler behavior, not containment on the listed platforms.

| Key and installed value | Install floor | Official contract |
| --- | --- | --- |
| `permissions.blockReadsOutsideWorkingDirectories: true` | 2.1.257 | [Read boundary](https://code.claude.com/docs/en/settings-reference#permissions-blockreadsoutsideworkingdirectories) |
| `permissions.blockWritesOutsideWorkingDirectories: true` | 2.1.314 | [Write boundary](https://code.claude.com/docs/en/settings-reference#permissions-blockwritesoutsideworkingdirectories) |
| `sandbox.enabled: true` | 2.1.302 (conservative) | [Shell sandbox](https://code.claude.com/docs/en/settings-reference#sandbox-enabled) |
| `sandbox.failIfUnavailable: true` | 2.1.302 (conservative) | [Startup failure policy](https://code.claude.com/docs/en/settings-reference#sandbox-failifunavailable) |
| `sandbox.allowUnsandboxedCommands: false` | 2.1.302 (conservative) | [Unsandboxed retry](https://code.claude.com/docs/en/settings-reference#sandbox-allowunsandboxedcommands) |
| `sandbox.autoAllowBashIfSandboxed: true` when neither project nor user sets a choice and the strict sandbox profile is written (or when you confirm the change from an explicit `false`) | 2.1.302 (conservative) | [Sandbox auto-approval](https://code.claude.com/docs/en/settings-reference#sandbox-autoallowbashifsandboxed) |
| `sandbox.network.strictAllowlist: true` in user settings only | 2.1.219 | [Strict network list](https://code.claude.com/docs/en/settings-reference#sandbox-network-strictallowlist) |
| `sandbox.filesystem.allowRead` items for detected runtimes, appended in user settings only after confirmation | 2.1.302 (conservative) | [Sandboxing](https://code.claude.com/docs/en/sandboxing) |

The four shell switches additionally require an available, unverified sandbox
capability. The 2.1.302 floors are canonkit's supported baseline, not claims
about the switches' first release. Actual platform boundary checks remain
pending; no supported environment is certified by these fixtures.

The supported write control is added only on a compatible client. On supported
sandbox platforms the read control also contributes the native shell read
boundary; canonkit does not add compensating project `allowRead`/`allowWrite`
exceptions to reopen it. Neither key is a Windows shell sandbox. Native
internal-file exceptions, additional working
directories and resolved links must be considered; a key on disk does not prove
that every tool stays inside the repository. Canonkit never upgrades Claude,
installs WSL/Docker/system packages, changes a firewall, elevates privileges,
moves the project or restarts the machine as part of this configuration.

For both file-boundary keys, `true` in any loaded settings source keeps the
block on; another source's `false` does not lift it. The write block also limits
Claude's own settings edits and worktree tools. Check the linked native contract
before changing a workflow that edits configuration or uses subagent worktrees.

### Network and separate tools

Canonkit adds no project-process network destinations by default. A detected
stack or an instruction in project code cannot authorize npm, PyPI, Git hosting,
documentation or local services automatically. Provider communication belongs
to the harness; it does not grant project subprocesses permission to contact
the same endpoint.

Native project settings hold the repository policy, not an immutable ceiling.
User, managed and command-line inputs can affect the effective boundary. The
approved `sandbox.network.strictAllowlist: true` lock is written to user settings,
never as an ignored project key. For the sandbox proxy, it prevents destinations
outside the approved list from becoming a per-command approval prompt. From
Claude 2.1.285, its [trusted-scope lock](https://code.claude.com/docs/en/sandboxing#locks-that-apply-without-an-admin-required-sandbox)
also prevents repository domain lists and proxy ports from widening that native
network list; earlier supported versions do not establish that ceiling. Explicit shell
destination exceptions belong in supported user or managed settings; project
content and stack packs cannot supply them automatically. Existing explicit
authorizations are preserved, and proxy/socket exceptions are assessed separately.
This lock adds no destination, does not enable sandboxing on Windows, and does
not restrict WebFetch, MCP or hook traffic by itself. A command containing `localhost` or a Playwright
`baseURL` does not constrain every network request that its code can make.

Shell restrictions do not cover file tools, web tools, MCP servers, hooks or
subagents automatically. Those surfaces have separate controls and unknowns.
In particular, native Windows shell commands remain outside Claude's OS sandbox.

### Diagnosis and conservative reversal

`doctor` remains read-only. Alongside `OK`, `WARN` and `FAIL` severity, security
reports keep severity separate from coverage. Coverage can be verified,
partial, unavailable or unknown; this implementation reports partial,
unavailable or unknown because it collects no runtime boundary proof. Reports
show environment, harness/version, configured controls, exceptions and correction
steps. `desired-profile` and `desired-controls` describe the current supported
plan; configured controls describe observed files; `tracked-policy` compares
written, owned values with private installation evidence. Effective session
policy remains unknown where managed, CLI or runtime evidence is unavailable.
Configuration is not runtime verification. Correct native Windows partial
coverage is a warning; malformed observed settings or an observable unmet existing
isolation requirement can fail. Observable settings come from user, user-local,
repository and repository-local files, with scope conflicts reported separately.
This bounded inspection does not resolve the harness's complete effective policy.
A hidden CLI/managed override or an unsupported
TOML/JSONC shape stays unknown, not permissive by assumption.

Codex and OpenCode security diagnosis is read-only in this release. Codex has
its own native Windows sandbox implementations; Claude's Windows limitation must
not be applied to it. OpenCode permissions and subagent policies are not evidence
of OS containment. Diagnosis does not read credential contents, run project code,
start authenticated agent sessions, perform network probes or repair settings.

Illustrative excerpts for native Windows with Claude 2.1.302 and the read
restriction installed (not a transcript or runtime test):

```text
OK   security claude file-reads: partial: outside-working-directory read restriction configured; harness exceptions remain
WARN security claude file-writes: partial: write restriction unavailable or unconfigured; requires Claude >=2.1.314
WARN security claude shell: unavailable: native Windows shell has no Claude OS filesystem/network containment
WARN security claude effective-policy: unknown: managed, CLI, plugin and runtime policy inputs are not fully observable; web/MCP/hooks are separate surfaces
```

`doctor` also checks every receipt-owned security key against its installed
boolean, including `false`, in its original user or repository file. Changing
or deleting a key, or deleting that settings file, produces `FAIL`, for example:

```text
FAIL security claude tracked-policy: partial: tracked repository permissions.blockReadsOutsideWorkingDirectories is missing or changed; re-run canonkit install in this repository
```

Review any deliberate edit before reapplying `npx canonkit install --claude`;
then rerun `npx canonkit doctor`. Update Claude separately for newer supported
controls. A preexisting, observed value has no kit ownership to compare or
reverse. An existing `sandbox.enabled: true` plus `failIfUnavailable: true`
in the observed policy fails when the current sandbox capability is unavailable;
installation preserves that requirement. For stronger shell isolation, prepare
WSL2 or a validated container separately and test its actual boundary. These are
optional operator actions; canonkit does not provision or intercept launches.

Repository security receipts and private snapshots are separated under
`~/.canonkit/projects/<canonical-root-digest>/`; all project-settings backups
stay in its `backups/` subdirectory, with no backup copy beside the repository
settings. The manifest records provenance,
not permission authority. The root is canonicalized, with case normalized on
Windows. A saved path never authorizes another target. Working policy remains
in the repository's `.claude/settings.json`.

The native setting scopes and version requirements are tracked against
[Claude permissions](https://code.claude.com/docs/en/permissions#block-file-tool-reads-and-writes-outside-the-working-directories),
[sandbox settings](https://code.claude.com/docs/en/sandboxing) and
[settings precedence](https://code.claude.com/docs/en/settings), reviewed on
2026-11-08. A supported key or static version check is still not a recorded
runtime boundary test.

To preview and reverse canonkit-attributable security changes and Codex core
agent overrides in the current validated repository:

```bash
npx canonkit uninstall --project --dry-run
npx canonkit uninstall --project
```

Project-only removal leaves global distribution, the user-scoped network lock
and other repositories alone. Edited Codex core files and preexisting
same-name agents stay in the project.
Ordinary global uninstall does not enumerate or modify repository policies.
Undo uses per-key provenance: it reverses an owned scalar only while its current
value still matches the installed value, restoring the original boolean or
removing a newly added key. Undo preserves later user edits and unrelated
settings; it never restores an entire old settings snapshot over the current
file. Refusals name the condition
to resolve, after which the same scoped command can be retried. Private backups
can contain secrets and must stay out of version control.

The network lock is tracked with the global Claude settings artifact, alongside
optional hook wiring. Global removal reverses only an attributable kit change;
a `true` value that already existed before installation is not adopted as kit
ownership. Other settings remain intact. Migrated hook removals are not reversed;
use the selective manual recovery above if a registration must be restored.

## Tool access levels

An agent source may declare `access: <level>` (one lowercase line in the agent's frontmatter):

`access` reduces the tools exposed to an agent's context. It is **not a security
boundary**, and `read` is not read-only: it keeps Bash, so an agent can still write files.

| Level | Claude Code translation |
|---|---|
| `read` | allowlist: Read, Grep, Glob, Bash, WebSearch, WebFetch, Skill (no MCP tools) |
| `inspect` | denylist: Edit, Write, NotebookEdit. Unlike `read`, it keeps every MCP tool (such as browser tools), whatever name it was installed under |
| `write-docs` | the `read` allowlist plus Edit and Write |
| `full` | no restriction |

No `access` means no restriction, so project specialists behave as before.
Sources may not carry `tools`, `disallowedTools`, `skills`, `mcpServers` or
`omitClaudeMd`; validation rejects them. Only **Claude Code** translates
`access`; Codex, OpenCode and Copilot install the agent unrestricted. For Codex this is a gap in the harness, not an omission: per its subagent documentation (read 2026-11-11), a custom agent file cannot set an allowlist, a sandbox, approvals or MCP scope (it inherits the parent turn's), and read-only can only be asked for in instructions. It can only switch off whole features (`features.shell_tool`, `features.apps` and similar) and skills, which would also remove the shell a reviewer uses to run tests, so no level maps to it.

`canonkit models show` prints each agent's level and the restriction it resolves
to (it reads the stored config only, starts no agent and prints no token count). To measure
the start-up cost yourself, dispatch the same trivial task to an installed agent
with and without `access` (reinstall after removing the line), in the foreground
and in the background, and compare the token usage each run reports.

## Choosing models

Each agent declares how demanding its normal work is, as a **need level** in its
frontmatter: `light`, `standard` or `deep` (archie and iris are `deep`, the others
`standard`, nothing is `light` today). The level names no vendor model. You map
each level to a model and a reasoning effort that your harness actually offers, and
canonkit applies that. With no choices, every agent inherits the session's model
and effort.

Canonkit used to ship that map itself (a Claude label per agent, and a table
translating it to Codex models). Catalogs and effort levels change monthly and
differ between subscriptions, so a shipped table goes stale for someone. The
harness is asked instead.

This version applies choices to **Claude Code and Codex**. OpenCode and GitHub
Copilot agents inherit the session model.

```bash
npx canonkit models refresh            # ask each harness what it offers
npx canonkit models setup              # choose per need level, then optional per-agent overrides
npx canonkit models setup --project    # the same, for this project only
npx canonkit models show               # what each agent resolves to, and from where
npx canonkit models show --json        # the same, for tools and the orchestrate skill
npx canonkit install --claude          # write the user-level defaults into ~/.claude/agents
npx canonkit install --codex           # write Codex agents, including project core overrides
```

**Discovery.** `models refresh` runs the harness's own read-only commands and
records the answer in `~/.canonkit/model-catalog.json`, a cache on this machine.
For Claude Code it runs `claude --version` and `claude --help`, and reads the model
aliases and effort levels the help text lists. The help quotes only example aliases,
so the list adds the family aliases Claude Code documents (`fable`, `opus`,
`sonnet`, `haiku`; the ones its Agent tool accepts). When Claude Code's
`availableModels` applies (managed settings, else your Claude user settings at
`CLAUDE_CONFIG_DIR/settings.json` when set or `~/.claude/settings.json`;
only that key is read), the list keeps the aliases it permits and adds the
versions it names. Claude Code has no command that lists every version your account
can use, so other versions go through `other…`. That text is not a contract, so the
record says `confidence: "help-text"`, and anything it does not recognize becomes
`unknown` with the reason, never an error. The binary is looked up on PATH outside
the enclosing repository (a `claude` in its `node_modules/.bin` is never run, from
any subfolder; on WSL a binary found only on the Windows side is reported as "found
only on the Windows side; not run through WSL interop" and not run), with no shell, closed stdin, a 30-second timeout and no
`NODE_OPTIONS`-style loader variables. Canonkit reads no credential; Claude's
help-based probe does not use the network. Codex discovery runs the experimental
`codex debug models` command. Codex may refresh its catalog over the network,
use its local cache, or fall back to the catalog bundled with the CLI. It can
return models without login, so the record marks account access as unconfirmed;
listed models do not prove the account can run them. Canonkit stores only visible
model IDs and their per-model efforts, not the full debug output. A non-dry-run
`install` and `models setup` refresh discovery too; `install`
leaves a record that is under a day old and unchanged as it is, so reinstalling
rewrites nothing. `models show` and `doctor` only read files, and a dry run starts
nothing.

**Setup.** `models setup` needs a terminal. For each need level it shows two menus,
model and effort, listing what the harness reported plus `inherit`; the current
value starts highlighted, so Enter keeps it. Then a checklist of agents to
override (agents that already have an override start checked; unchecking one
removes it), a summary, and a save confirmation. Nothing is written before that
confirmation, and Ctrl+C at any point writes nothing. A model outside the list (a
newer alias, `sonnet[1m]`, or a full model ID such as `claude-opus-5-2`) goes
through `other…` and is marked `"unverified": true`. The Agent tool's `model`
parameter takes only the listed aliases, so such a value reaches an agent through
its installed frontmatter (your user choices), not through a dispatch.

The interactive `install` (no harness flag, in a terminal) offers the same step
right after the harness menu when Claude Code is selected, so the agents are
written with the choices just made: Yes is highlighted on a first install, No
once you have choices. A flag-driven or scripted install never asks.

Without a terminal, edit the file directly:

```json
{
  "version": 1,
  "harnesses": {
    "claude": {
      "levels": { "standard": { "model": "sonnet", "effort": "medium" }, "deep": { "model": "opus", "effort": "high" } },
      "agents": { "quinn": { "effort": "high" } }
    }
  }
}
```

These values are an example of a person's choice, not defaults. Unknown keys are
kept when canonkit rewrites the file. A file with another `version` is refused, not
overwritten; new keys keep version 1, and the version changes only when an existing
field changes meaning.

**Where choices live, and which wins.** User choices are in
`~/.canonkit/models.json`. Project choices are in `.canonkit/models.json` at the
root of the Git repository you run from (from any subfolder; outside a repository,
the current folder), which you can commit. A file in a folder above the repository
never applies, and a project file or `.canonkit` folder that is a symbolic link or
junction is refused. For each agent, model and effort resolve separately, first
match wins:

1. project agent override
2. project level
3. user agent override
4. user level
5. inherit

So a project can raise only the effort of `standard` and keep your model. `models
show` prints the layer each value came from; "agent override" marks a per-agent
entry. In `models show --json` (`"version": 1`), each agent has `model` and `effort`
as `{ value, source, unverified }`, and `model.alias` says whether the value is an
alias, the only kind of value the Agent tool's `model` parameter takes. `source`
is text for people; read `value`.

A project file comes with the repository, so a repository you cloned can change
which model your agents run on. `doctor` lists every agent whose model or effort a
project file changes from what your own choices give.

**How Claude Code receives them.** Two ways:

- `install` writes the user-level result into each agent's frontmatter in
  `~/.claude/agents` (`model:` and `effort:`, the fields Claude Code
  [documents](https://code.claude.com/docs/en/sub-agents) for agents). That is the
  default for a dispatch that names nothing. `add` does the same for a project's
  specialists in `.claude/agents`, with the project's choices on top. Re-run
  `install` after changing your choices. A value you removed disappears on the
  next install.
- A planned dispatch passes the effective values as the Agent tool's `model` and
  `effort` parameters, read from `models show --json` (the `orchestrate` skill
  says how). The parameters win over the frontmatter, and they are how a
  project's choices reach the user-level core agents, which install never
  rewrites per project. The `model` parameter takes an alias only, so a full
  model ID reaches an agent through its frontmatter.

Model choices are verified by running Claude Code; the `effort` field is documented
but showed no observable effect in the same test (the evidence is in
`openspec/changes/runtime-model-discovery/evidence.md`).

**Doctor.** `doctor` warns, never fails, when the discovery is missing or older
than 30 days, when a configured model or effort is not in the latest discovery,
or when a choice is unverified. Each warning names the level or agent and the
agents affected; if Claude Code rejects a value, those agents fall back to
inherit.

## Codex

Every Codex path is under `$CODEX_HOME`, or `~/.codex` when it is not set; this
page writes `$CODEX_HOME` for both. Before 2.2 canonkit always wrote `~/.codex`,
so if you set `CODEX_HOME`, the agents now go where Codex reads them, and the old
copies in `~/.codex/agents` are yours to delete (the 10 core names only).

The same core also goes to `$CODEX_HOME/agents/<name>.toml`, in the custom-agent
format Codex reads: `name`, `description` and `developer_instructions`. The
instructions are the body of the same `agents/<name>.md` — there is no second
editable copy. Before this, the only thing this repository could tell Codex was
the roster in prose in `AGENTS.md`, which describes the team but cannot call
anyone.

The generated agents use `model` and `model_reasoning_effort` when configured
through `npx canonkit models setup --codex`. Effort choices are offered for the
selected model. Unset fields inherit. Reinstall after changing choices. A Codex
install from a repository with project choices writes core overrides to that
project's `.codex/agents/` when they differ from user choices; the user-level
files retain the user choices. Project specialists added with `canonkit add`
use the merged project and user choices. A project custom agent file wins over
explicit spawn parameters. `uninstall --project` removes only receipt-owned
core overrides whose bytes still match; edits and preexisting same-name files
are preserved. `models show --json` reports `projectFile.status` for affected
core agents; `doctor` warns when a project file is missing, stale, edited,
unowned or waiting for removal. Run `install --codex` in the repository after
changing its choices. A linked `.codex` destination is refused. `CANONKIT_CODEX_MODEL`
is ignored: `install` and `add` print one warning when it is set.

Your own Codex custom agents live in the same directory and are none of the
installer's business. The only thing it comments on is narrower: a file that
looks like an **old copy of an agent this repository owns**, in a format Codex
does not load from there — which leaves a second, diverging version of that agent
lying around. Reported, never removed: the name is not one the repository claims,
so deleting it is not an installer's decision.

Scaffolding (`.gitignore`, `.github/`), directories and your own agents raise no
warning. A warning that fires on `.gitignore` teaches you to ignore warnings.

The block in `$CODEX_HOME/AGENTS.md` (`reference/codex-block.md`) is Codex's own.
Codex does not read `~/AGENTS.md` from a repository below your home folder, so
the block points the model at it. If an `AGENTS.override.md` sits beside it,
Codex reads that file instead and the block is not loaded; `doctor` WARNs.

### Codex hook (`--wire-hooks`)

On Windows, a long `CODEX_HOME` can make Codex's background server fail with
"path must be shorter than SUN_LEN". Start Codex with `codex --no-daemon` in
that case. This is a Codex socket-path limit, not a canonkit limit; it was seen
during the 2.2 release gate.

With `--wire-hooks`, install writes:

| What | Where |
| --- | --- |
| `canonkit-codex.js`, `canonkit-hook.js`, `package.json` | `$CODEX_HOME/canonkit/` |
| one `PreToolUse` group, matcher `Bash\|apply_patch`, command `node "<CODEX_HOME>/canonkit/canonkit-codex.js"` | `$CODEX_HOME/hooks.json` |
| the previous `hooks.json`, only when it changes | `hooks.json.canonkit-<timestamp>.bak` beside it |

Codex skips a new or changed hook until you trust it: run `/hooks` in Codex once
after the install. The trust covers the command, not the files it runs, so a
later install that refreshes `canonkit/` asks for nothing; it asks again only if
the command changes (for example, after you set `CODEX_HOME`). The other entries
in `hooks.json` are never touched, and nothing of yours moves, because Codex keys
trust by position.

Install refuses before writing anything if `hooks.json` does not parse, or if the
`$CODEX_HOME` path holds `"`, `$` or a backtick: the shell Codex runs the command
through would expand it, and a hook that cannot start fails without a word. A
plain install (no `--wire-hooks`) refreshes `canonkit/` only if it already
exists, so no copy sits there unused. `doctor` FAILs if those files differ from
the package's or the group is missing.

To remove it by hand: delete `$CODEX_HOME/canonkit/`, and delete the group whose
command names `canonkit-codex.js` from `hooks.json`. Restoring the `.bak` also
works, but it undoes any change you made to `hooks.json` after it was written.

## OpenCode

With `--opencode` (or checked in the menu), the core goes to
`~/.config/opencode/agents/<name>.md` (`$XDG_CONFIG_HOME/opencode` if set). It is
Markdown like the source, but **generated**, not copied or linked: the frontmatter
keeps only `description` and `mode: subagent`. Without `mode`, OpenCode loads a
custom agent as a primary agent; and `model: sonnet` is not an id it accepts. The
body is the same as `agents/<name>.md`.

**No model, by design:** the agents set neither `model` nor a variant. OpenCode
runs with whatever models the session has, and a subagent without `model` uses the
model of the agent that called it — the session's model always applies. That is
why the rule "every dispatch names its model and effort" does not apply there.

The block in `~/.config/opencode/AGENTS.md` (`reference/opencode-block.md`) is its
own: it points to `~/AGENTS.md` and marks the two gates the plugin enforces once
wired; every other rule holds by judgment. Creating that file ends
OpenCode's fallback to `~/.claude/CLAUDE.md`; the installer warns when that
happens, so you can copy over any rules of yours that should keep applying there.

Skills: OpenCode reads `~/.agents/skills` and `~/.claude/skills` natively, so an
OpenCode-only install writes the skills to `~/.agents/skills`. Same rules as Codex
for specialists left at user level (removed) and for old copies of the
repository's agents (reported, never removed — here they load as a second agent,
since OpenCode reads every `.md` in the folder).

### OpenCode plugin (`--wire-hooks`)

The plugin is an OpenCode 2 plugin, and OpenCode 1 does not run it. Install
checks `opencode --version` first and refuses if `opencode` is not on PATH, prints
no version, or is older than 2. On WSL only a Linux-side `opencode` counts: a
Windows copy is ignored (never run through interop), the refusal names it, and the fix is
to install OpenCode 2 or later inside WSL. With `--wire-hooks`, install writes (all under
`~/.config/opencode`, or `$XDG_CONFIG_HOME/opencode`):

| What | Where |
| --- | --- |
| `canonkit-opencode.js`, `canonkit-hook.js`, `package.json` | `canonkit/` |
| the plugin, which loads `../canonkit/canonkit-opencode.js` | `plugins/canonkit.js` |
| two rules appended to `permissions`: `{"action": "shell", "resource": "git commit *", "effect": "ask"}` and the same for `git push *` | `opencode.json` |
| the previous `opencode.json`, only when it changes | `opencode.json.canonkit-<timestamp>.bak` beside it |

OpenCode loads every file in `plugins/`, so the plugin's presence is the wiring;
there is no trust step. `opencode plugin list` does not show it (that list holds
package plugins only). The two asks are config, not a gate: OpenCode applies the
last rule that matches, so they go at the end. If a later rule of yours allows
shell calls, install moves the asks after it and says so. V1 `permission` is
never written.

When your config denies some shell calls, install writes no asks, because an ask
appended after a deny it overlaps would turn that deny into a prompt. It prints
the two rules for you to place by hand: after the rules that allow shell calls
and before your deny rules. If an allow comes after your deny, put the asks just
before your deny rules.

Install refuses before writing anything if an `opencode.jsonc` exists (its
comments would not survive a rewrite), if `opencode.json` is not plain JSON or not
an object, or if its `permissions` is not an array of objects. A plain install
refreshes `canonkit/` and the plugin only where either already exists. `doctor`
FAILs if those files differ from the package's, and WARNs if the asks are not in
effect. It reads only the global `opencode.json`, so a project's own OpenCode
config can override the asks without `doctor` noticing.

Each `.bak` is a whole copy of `opencode.json`, provider keys included, and a new
one is written on every change: delete the old ones, and keep them out of a
dotfiles repository.

To remove it by hand: delete `plugins/canonkit.js` and `canonkit/`, and delete
the two `git commit *` and `git push *` ask rules from `permissions`.

## GitHub Copilot

With `--copilot` (or selected in the install menu), CanonKit writes native custom
agent profiles to `~/.copilot/agents/<name>.agent.md` and core skills to
`~/.copilot/skills/`. The same locations are used by GitHub Copilot CLI and
VS Code's Copilot harness. The generated profile contains the source agent's
`name`, `description` and instruction body; it leaves `model` unset so the
current Copilot session chooses the model.

From a project, `npx canonkit add <specialist>` also writes
`.github/agents/<name>.agent.md`; optional skill packs are copied to
`.github/skills/`. Existing Copilot files are managed through the normal
backup/receipt behavior for global installs and the project receipt for skill
packs. `uninstall --copilot` removes only tracked global Copilot files.
Copilot does not use CanonKit's hook adapters, so `--wire-hooks` adds no Copilot
hook files or settings.

## Commands

| Command | What it does |
| --- | --- |
| `install` | core at user level + hook files + dashboard + global reference blocks + core skills; supported strict-network lock and native Claude security; unregisters attributable older Claude hooks in user/current-repository settings |
| `install --wire-hooks` | distribution and native security; skips Claude hook cleanup and wires selected runtimes that support hooks: `~/.claude/settings.json`, `$CODEX_HOME/hooks.json`, the OpenCode plugin (see [hooks.md](hooks.md)) |
| `install --no-reference` | agents, hook files, dashboard, native security and Claude hook migration; skips block/skill distribution, but reconciles an existing Claude managed block on each native-default install, including retries |
| `install --claude` / `--codex` / `--opencode` / `--copilot` | only for those runtimes, without the menu |
| `doctor` | read-only target-aware installation and security diagnosis; exits 1 if any check is `FAIL` |
| `reference` | only the global blocks and core skills (`--claude`/`--codex`/`--opencode`/`--copilot` narrow it; no menu; no stack packs) |
| `uninstall [--claude] [--codex] [--opencode] [--copilot]` | remove tracked global artifacts; without flags, all recorded harnesses |
| `uninstall --project` | reverse only attributable Claude security settings for the validated current repository; preserves global installation and other repositories |
| `add <name>...` | specialists or stack-pack skills in the current project |
| `remove <name>...` | removes specialists or tracked stack-pack files from the current project |
| `list` | the roster and what is installed where (and points to `tool list`) |
| `tool add <graphify\|openspec>` | runs the tool's setup in this project and records it in `AGENTS.md` (see [tools.md](tools.md)) |
| `tool remove <name>` | removes the tool from `AGENTS.md` |
| `tool list` | pin, installed version and whether it is active in this project |
| `git-ignore-sandbox-files [--remove] [--dry-run]` | opt in: make git ignore the Claude Code sandbox's 0-byte placeholder files, in this clone's `.git/info/exclude` (see [below](#sandbox-placeholders-per-clone)) |

`--dry-run` works on all of them: it reports what would change without writing
anything. `--yes` and `--harness` exist only on `tool add` (see [tools.md](tools.md)).

## Sandbox placeholders, per clone

On Linux/WSL (bubblewrap), Claude Code's sandbox leaves real 0-byte files in the
project root (`.mcp.json`, `.bashrc`, `.claude/settings.local.json`,
`.claude/agents`, ...) as mount points for paths it write-protects. macOS
(Seatbelt) behaviour was not verified. Outside the sandbox they show as untracked,
can be committed by accident, and make `canonkit add` stop. `doctor` warns when it
sees them and prints the command, `canonkit git-ignore-sandbox-files`.

That command makes git ignore the empty files the Claude Code sandbox leaves in
the project root; it does not touch the sandbox or any permission.

`canonkit add <specialist>` when such a file sits where a directory is needed
(exit 1, nothing written): outside the sandbox the message says the path "is an
empty file, but a directory is needed there" and to delete it and run the command
again; inside the sandbox the path is write-protected, so run it from your own
terminal.

From the repository root, in a terminal **outside** the sandbox. Run inside it,
once the usual refusals (see exit codes) have passed, add/reconcile changes
nothing, leaves an existing block as it is and exits 0, with a notice on stderr
(the placeholders look like devices there): "Inside the Claude Code sandbox,
git-ignore-sandbox-files changed nothing and left any existing block as it is. Run
it from your own terminal; --remove still works here." `--remove` still works there:

```bash
npx canonkit git-ignore-sandbox-files --dry-run   # prints the names and "Would write"; not the block lines
npx canonkit git-ignore-sandbox-files             # writes it to .git/info/exclude
npx canonkit git-ignore-sandbox-files --remove    # removes only the managed block
```

Exit codes: 0 when it skips (no git, bare repo, not the repo root) or finishes,
and also inside the sandbox, but only after the refusals below have passed; 1 for
refusals (symlinked or non-regular `info` or `exclude`, altered or duplicated
markers), which apply inside the sandbox too, and for usage errors.

Only known names that are 0-byte, regular and untracked are listed; a name that
can be a directory also gets `!/name/`, so a real directory stays visible. Names
your own exclude lines already cover are skipped. The rule is local to this clone
(shared by its worktrees), never the committed `.gitignore`, and `install` does not
run it. It hides by path, not by content: if you later put a real `.mcp.json`
there, it stays hidden until you re-run the command or `--remove` (`doctor` warns).
`--remove` deletes only the managed block and never changes your own lines. It is
not byte-exact: adding the block collapses trailing blank lines and whitespace at
the end of the file, and turns a mixed-EOL file into all-CRLF when it was CRLF;
`--remove` also drops the one blank line that adding the block appended.

Honest limits:

- Names are matched literally (`x`, `/x`, `!/x`, `/x/`). A glob line of your own
  outside the block (for example `.claude/*`) is not recognised as covering a name,
  so for names that can be directories the block's `!/x/` line can make a real
  directory you had hidden by glob visible again. The caveat concerns globs in the
  exclude file itself; a `.gitignore` rule still wins over `info/exclude`.
- If `.git` is a file whose `gitdir:` points to another valid git directory, the
  command writes that repository's `info/exclude` (static placeholder names only).
  A linked worktree uses the main repository's shared exclude, and the command says
  so; a submodule writes its own `modules/<name>/info/exclude` (not shared); from
  the main checkout there is no extra notice.
- Every git call the command makes, and the `doctor` rows, run with
  `core.fsmonitor=false`, `core.hooksPath=/dev/null` and without any `GIT_*`
  environment variable, so a repo-local config cannot run code. `doctor` is
  read-only and runs no repo code.
- `doctor` also warns when a name in the block stopped being an empty regular file
  (it gained content or became a symlink), or became a directory where only a file
  fits (e.g. `.mcp.json`); a real directory under a directory-capable name is quiet.

It reduces noise in `git status`; it protects nothing. Reasoning:
[ADR 0007](adr/0007-sandbox-placeholder-exclude.md).

## Specialists, per project

Run **from inside the project** that will receive the agents:

```bash
cd ~/my-project
npx canonkit add maya nova
```

Choosing which specialists a project has remains your explicit decision — the
install menu or `add` command only installs what you choose. Four native profiles and
the project's `AGENTS.md` need to know about the agent, and forgetting one is
the failure this command prevents:

- **Claude Code** reads `.claude/agents/<name>.md`
- **Codex** reads `.codex/agents/<name>.toml` — it does not look at `.claude/agents/`
- **OpenCode** reads `.opencode/agents/<name>.md`, generated as a subagent with no model
- **GitHub Copilot** reads `.github/agents/<name>.agent.md`
- **the project's `AGENTS.md`** is what tells the main agent *when* to call each
  one; without it the subagent exists and nobody calls it

All four native profiles and the `AGENTS.md` block are written in one step. The
block is rebuilt from what is actually on disk, so it reflects reality rather
than command history.

```bash
npx canonkit list            # what this project has installed
npx canonkit remove nova     # removes the file and the entry
```

The one-line description that goes into the project's `AGENTS.md` is read from
`reference/agents-block.md` itself, not from a second list inside the installer —
the closing "Use when ..." sentence stays in the roster, because it is guidance
for choosing an agent and not a description of one.

Removing the last specialist takes the whole block out of `AGENTS.md`. Everything
outside the markers is preserved, and the script refuses to run inside the
`canonkit` repository itself or to install a core agent.

## Stack packs, per project

Stack packs are skills, not additional agents. They supply language/framework or
design-practice knowledge to the existing owners without changing the roster or
adding a review verdict. UI design, UI review and game-art direction are independent
optional packs; none installs Nova, Maya, another pack or HOME instructions.
The [stack-pack table in the README](../README.md#stack-packs-per-project) lists
all available packs, their guidance and individual install commands. Install only
the ones wanted, from the consuming project's directory:

```bash
npx canonkit add typescript react
npx canonkit add cpp csharp java python rust
npx canonkit add go kotlin swift
npx canonkit add ui-design ui-review game-art-direction  # only if wanted
npx canonkit list
npx canonkit remove react
```

These commands describe IDs available in a CLI that includes the packs; they do
not assert any pack is already installed. Use `list` for the current project.
Each named pack writes three project-local copies of its `SKILL.md`:

- `.agents/skills/canonkit-<stack>/` for universal discovery;
- `.claude/skills/canonkit-<stack>/` for Claude Code;
- `.github/skills/canonkit-<stack>/` for GitHub Copilot in VS Code.

An installed skill is available for selection when relevant; installing it does
not force a dispatch. React does not implicitly install TypeScript. There is no
stack detection, download, toolchain/dependency installation or build execution.
`install`, `reference` and global `uninstall` neither install nor remove project
packs. Core skills remain in `skills/`; pack sources ship in `stack-packs/`.

`add` and `remove` also accept mixed lists such as `add maya react`. All names
and pack destinations are checked before any specialist writes. The current
directory is the project boundary; the command does not search upward for a
different root. Pack writes refuse HOME, canonkit's own checkout and symlinks or
junctions below the canonical project boundary.

The project receipt `.canonkit/stack-packs.json` records fixed file IDs and
installed hashes, independently of the global install manifest. Keep it with
the installed copies: without it, an existing destination is an untracked
collision and is preserved. The receipt contains instruction-file metadata,
not credentials or machine-specific absolute paths. Do not share or version
temporary lock, recovery-lock or staging files.

Agent updates are explicit and separate: re-add an installed Nova in the consuming
project to update that specialist; use the normal core reinstall to update Pixie.
Adding a pack does neither. This source change performs no consumer installation.

The expanded CLI reads existing schema-1 receipts without migration. Older CLIs
reject receipts containing entries they do not know: compatibility is not
bidirectional. This covers more than the three design IDs. A pack that the
expanded CLI adds or re-adds, of any ID, also records the `.github/skills` copy
under a `<id>:copilot:SKILL.md` receipt key, which an older CLI rejects as an
invalid entry. Before downgrading, use the expanded CLI to `remove` every pack it
added or re-added (for example `remove react ui-design ui-review game-art-direction`,
naming every ID that `list` does not show as `absent` or as `partial` from an older
install; `locally modified` and `partial (pending)` packs also block an older CLI). An install made only by an older CLI
has no third copy, so the expanded CLI's `list` reports it as `partial` until you
`add` it again. Resolve reported conflicts first; edited copies and unresolved
ownership remain preserved. Never delete the receipt to force downgrade.

Repeating `add` is idempotent when current and updates tracked, unchanged copies.
A locally edited copy or an untracked destination causes an install/update
conflict before writes. `remove` deletes only tracked files matching their
recorded hashes; it may remove an intact copy while preserving an edited one,
retain the latter's receipt and exit nonzero. Unrelated extra files remain and
do not make an otherwise completed removal fail.

`list` reports `installed`, `absent`, `partial`, `locally modified`,
`untracked/collision` or `partial (pending)` without writing or recovering state.
An installed pack may be from an older package; repeat `add` to update it.

Mutating commands serialize through a project lock and record pending intent
before changing each file. A retry recognizes the before/after bytes and
recovers interrupted work; a conflicting third state is preserved for manual
resolution. A stale lock is recovered only when its process is no longer alive;
an unrecognized or stranded recovery lock requires inspection. `--dry-run`
changes no files or directories and refuses a lock or pending operation instead
of recovering it. No transaction or rollback of legacy specialist writes is
promised for a mixed request that fails during execution.

## Global reference blocks and skills

They already run as part of `install`. Standalone, for when you edited a block
without touching any agent:

```bash
npx canonkit reference
```

It syncs the shared roster and one block for each selected runtime: **three
blocks** for the default Claude Code and Codex install, four with OpenCode too.
Each runtime reads different things:

| Repository file | Goes to | Read by | Content |
| --- | --- | --- | --- |
| `reference/agents-block.md` | `~/AGENTS.md` | Codex and Claude Code | the whole team: who exists, blocking authority, HIGH routing, dispatch rules |
| `reference/routing-block.md` | `~/.claude/CLAUDE.md` | Claude Code | only what is specific to Claude: the pointer to `~/AGENTS.md` and the hooks' `[ENFORCED]` rules |
| `reference/codex-block.md` | `$CODEX_HOME/AGENTS.md` | Codex | the pointer to `~/AGENTS.md`, generated model and effort, and the hook's two `[ENFORCED]` deny gates once wired |
| `reference/opencode-block.md` | `~/.config/opencode/AGENTS.md` (`$XDG_CONFIG_HOME/opencode` if set) | OpenCode | the pointer to `~/AGENTS.md`, model taken from the session, and the plugin's two `[ENFORCED]` deny gates once wired |

Alongside the blocks goes the `orchestrate` skill (`skills/orchestrate/SKILL.md`),
which holds what only matters at orchestration time: the rationale for naming
model and effort on every dispatch and the Integration Review procedure. The
`AGENTS.md` keeps one always-loaded line per rule, pointing to the skill, so the
rule does not vanish when the skill is not loaded. The skill is installed in
`~/.claude/skills/orchestrate/` (Claude Code) and in `~/.agents/skills/orchestrate/`
(Codex reads skills from `$HOME/.agents/skills`, per OpenAI's official skills
documentation). A diverged copy is preserved as `<file>.local.bak` before being
overwritten; existing backups stay intact and the next gets `.local-1.bak`,
`.local-2.bak`, and so on. Core agents, hooks and dashboard files have the same
protection. Edited OpenCode plugins are backed up under `~/.canonkit/backups/`,
outside the auto-loaded `plugins/` directory. The installer copies every file in the skill's folder, not only
`SKILL.md`.

The experimental Laya procedure in `orchestrate/laya-handoffs.md` provides optional
advice on HIGH handoffs when a concrete semantic uncertainty warrants another
signal. Direct inspection can suffice, and advice can be reused while task context
and evidence are unchanged. Selected consultations record actual results and
failures; the procedure does not install an MCP server or enforce a hook gate.
Existing review requirements still apply.
To test source changes locally before an npm release, run from this checkout:

```bash
node bin/cli.js reference --claude --codex
```

This syncs the global reference blocks and skills from the checkout without a
full core installation. Start a fresh session so the runtime loads the updated
instructions, with your existing Laya MCP connected. See the
[procedure](../skills/orchestrate/laya-handoffs.md) for the experiment's evidence.

The `context-tune` skill is a different kind: **it only runs when you call it**
(`/context-tune` in Claude Code, `$context-tune` in Codex). It measures the output
of the commands the agents run in the project (tests, build, lint), separates
signal from noise (color codes, banners, hints, verbose reporters) and silences
the noise where the configuration is saved in the project: `env` in
`.claude/settings.json` / `[shell_environment_policy.set]` in `.codex/config.toml`,
the tool's own config and, last, a script for agents. At the end it measures again
and shows the before and after. It runs once per project, instead of becoming a
rule in `AGENTS.md` that every session loads. That is why it weighs nothing per
session: Claude Code does not put the description of a skill with
`disable-model-invocation: true` in context, and Codex does not pick it on its
own because of `allow_implicit_invocation: false` in `agents/openai.yaml`.

The `learning-loop` skill investigates mistakes on demand and produces a
sanitized proposal for improving canonical instructions or project configuration.
Its template travels with the skill. General contributions use an optional,
user-reviewed GitHub issue, without a required duplicate local record or prior
issue search. Incorporation requires the concrete diff, applicable validation and
authorization. It does not inject lessons at session start or apply changes
automatically; see [learning from mistakes](learning-loop.md) for contribution,
update and review steps. Reinstall the relevant source/package version to update
shipped instructions; local `canonkit.json` tuning needs no reinstall.

`AGENTS.md` is runtime-neutral and is the only definition of the team. The
routing block keeps only what is Claude Code mechanics (hooks and what they
enforce) and only points to `~/AGENTS.md`, without `@`: projects live under a
folder that contains `AGENTS.md`, Claude Code already loads it as an ancestor, and
an import would load it twice. The block carries no team table of its own.

The double load was observed, not assumed: on 2026-10-16 a real session on Windows
showed `~/AGENTS.md` loaded once through the import, resolved as `C:\...`, and once
as an ancestor, resolved as `c:\...`. The paths differed only in drive-letter case,
which probably defeats the harness's duplicate check, so the import was dropped.

Only the part between the markers is managed:

```markdown
<!-- agent-team-config:start -->        <!-- agent-team-config:routing:start -->
...agents-block.md...                   ...routing-block.md...
<!-- agent-team-config:end -->          <!-- agent-team-config:routing:end -->
```

Everything outside the markers is preserved. The script is idempotent and, on the
first run, replaces the hand-written section instead of duplicating it —
identifying it by the block's own title, not by a regex passed by hand, because a
quoting mistake there silently duplicates the section instead of replacing it.

The roster states facts about the agents — which layer they are in, who has a
veto, who runs on opus. Those facts are stored elsewhere, so they can drift
without anything breaking. `validate.sh` is what makes that break (see
[maintaining.md](maintaining.md#validation)).

## Upgrading from `meu-time`

When upgrading from a version with the old name (`meu-time`), `install` moves
`~/.claude/meu-time-activity/` to `canonkit-activity/` (if both exist, it merges
the history, oldest first, and removes the old one) and replaces
`meu-time-hook.js` with a forwarder to `canonkit-hook.js`. Installation preserves
the forwarder because other projects may still run it and are not enumerated.
A plain Claude install unregisters attributable handlers in user settings and
the current repository; inspect remaining sources before deleting the forwarder.
If retaining optional gates, update intended registrations to `canonkit-hook.js`.
`--wire-hooks` updates the global settings and keeps the forwarder. Its updates are tracked and its
previous bytes are backed up. Uninstall retains Claude's runtime while that
forwarder remains. Activity history keeps the existing move/merge migration and
is always preserved by uninstall.

## Upgrading from 2.0: leftover `~/.agents/*.md`

2.0 also copied the core agents to `~/.agents/<agent>.md`. 2.1 stops writing
them; no harness reads them. From 3.0, `npx canonkit install` (with Claude Code
selected) deletes each copy that is a regular file byte-identical to the
packaged agent (line endings aside) and logs it. A copy you modified, or one
that is not a regular file, is kept and logged as kept. `npx canonkit doctor`
WARNs on what is left. `--dry-run` shows nothing deleted.

To remove a kept copy you no longer want, delete it yourself.

Delete by hand one file at a time. The 10 core names are `scott`, `archie`, `bob`,
`quinn`, `gard`, `pixie`, `perry`, `pipe`, `spencer` and `virgo`:

```bash
rm ~/.agents/scott.md        # repeat for each of the 10 names
```

Do not glob (`~/.agents/*.md`): the folder may hold files of your own, and only
those 10 names are canonkit's. Do not touch `~/.agents/skills`: it is where
canonkit installs skills now.

## Uninstalling

```bash
npx canonkit uninstall --dry-run       # preview all recorded harnesses
npx canonkit uninstall --codex         # only the recorded Codex installation
npx canonkit uninstall                # all recorded harnesses; no install defaults/menu
npx canonkit uninstall --project       # only current-repository security settings
```

The first three commands operate on global distribution only. `--project` is a
separate scope with its own validated repository catalog and receipt; it never
searches global receipts for projects to remove. See
[project security reversal](#diagnosis-and-conservative-reversal).

Uninstall uses the manifest, not filenames alone. It detaches owned configuration
before removing executable files. Unrelated settings, handlers, matchers and
permission rules stay. An emptied Claude hook group with additional metadata
keeps that metadata. Uninstall never restores a whole old configuration over later
changes. Shared roster/skills stay until their last recorded harness is removed.
Use the same `HOME`, `CLAUDE_CONFIG_DIR`, `CODEX_HOME` and `XDG_CONFIG_HOME`
as the installation.
A changed root is reported and preserved, never followed from a saved path.
Global tracking refuses symbolic links/junctions in destination paths, including
a linked `HOME`; use physical installation roots. It does not replace or follow
an instruction-file symlink to an unapproved target.

Unchanged owned files are removed individually; edited owned files first get an exclusive
`.local.bak` (numbered if necessary). A managed block is removed between its exact
markers, preserving every byte outside, including BOM, whitespace and mixed line
endings. Edited blocks are backed up first. Missing artifacts are safe to retry;
duplicate or incomplete markers stop removal of that harness. Only empty artifact
subdirectories are removed. Instruction/configuration files can remain empty.
Artifacts recorded as `observed` remain intact, including edits, without creating
a backup or removing their content.

Backups can contain secrets. They are private (POSIX permissions, restricted DACLs
on Windows), never overwritten, and retained after uninstall, along with private
snapshots and the manifest. Global configuration changes also get dated backups
beside the configuration file; project security backups stay in the private
project receipt store. Activity history, project specialists/packs/configs, external
tool data and `~/.agents/<core>.md` leftovers are preserved.

Some wiring needs a manual step. Codex groups/handlers stay if removing them would
shift another hook's trust index; manually remove them and review `/hooks`, then
retry. OpenCode rules that install moved rather than appended stay until their
original order can be resolved manually. Preexisting or edited wiring, wrappers,
known project references, legacy forwarders and invalid configuration can also
keep a harness and its runtime intact. Other projects are not scanned. Removing
Claude's user-level registrations during migration does not remove a remaining
local setting or wrapper: these can still retain the runtime during uninstall.
Removing OpenCode's block leaves its instruction file in place, so it does not silently
switch back to Claude's fallback rules.

Exit status is 0 when selected tracked claims were handled, including observed
files that were preserved; 1 means manual cleanup or a retained harness remains.
Other selected harnesses can still be removed. Retry after resolving the reported
condition. An interrupted write has a persistent intent: the next real command
checks the actual before/after hashes and recovers it. Conflicting bytes, an
unknown manifest version, an active lock, or an ambiguous state stop changes.
`--dry-run` writes no files or locks and starts no subprocesses; pending recovery
must be resolved by a real command first.

**Upgrading from 2.2 or earlier:** there is no earlier manifest to infer ownership
from. Uninstall reports manual cleanup and removes nothing without a manifest.
Reinstalling with this version records identical preexisting artifacts as
`observed`, and preserves them on uninstall. Artifacts actually replaced by that
installation have their previous content backed up and are tracked as `modified`.
Identical preexisting wiring remains observed too, so its runtime can require
manual cleanup. There is no automatic adoption or force-delete option.

### Manual cleanup for pre-manifest installations and reported leftovers

Inspect and remove what the
table under [Core, at user level](#core-at-user-level) lists for the runtimes you
installed:

- the agent files canonkit owns in `~/.claude/agents`,
  `$CODEX_HOME/agents`, `~/.config/opencode/agents` and `~/.copilot/agents`
  (only the 10 core names; your
  own agents there are untouched by canonkit and should stay);
- if you upgraded from 2.0, the leftover `~/.agents/<agent>.md` copies, one file
  at a time as described in
  [Upgrading from 2.0](#upgrading-from-20-leftover-agentsmd); never the folder or a glob;
- the managed blocks between the `agent-team-config` markers in `~/AGENTS.md`,
  `~/.claude/CLAUDE.md`, `$CODEX_HOME/AGENTS.md` and `~/.config/opencode/AGENTS.md`;
- the `orchestrate`, `context-tune` and `learning-loop` folders in `~/.claude/skills`,
  `~/.agents/skills` (Codex and OpenCode) and `~/.copilot/skills`;
- `~/.claude/hooks/canonkit-hook.js` and, if you upgraded from `meu-time`, the
  `meu-time-hook.js` forwarder next to it, after checking and updating references
  in the relevant global/project settings; other projects are not enumerated;
- the canonkit hook entries in `~/.claude/settings.json`. Remove them by hand: the
  `.bak` that `--wire-hooks` wrote is a fallback, and restoring it also undoes any
  change you made to `settings.json` after it was written;
- if you wired Codex: `$CODEX_HOME/canonkit/` and the `canonkit-codex.js` group in
  `$CODEX_HOME/hooks.json` ([Codex hook](#codex-hook---wire-hooks));
- if you wired OpenCode: `plugins/canonkit.js`, `canonkit/` and the two ask rules
  in `opencode.json` `permissions`, all under `~/.config/opencode` (or
  `$XDG_CONFIG_HOME/opencode`) ([OpenCode plugin](#opencode-plugin---wire-hooks));
- the dated `.canonkit-<timestamp>.bak` copies beside `settings.json`,
  `hooks.json` and `opencode.json`, once you no longer need them: each holds the
  whole file, secrets included;
- `~/.claude/canonkit-dashboard/` and, if you no longer want the history,
  `~/.claude/canonkit-activity/`;
- per project: `npx canonkit remove <name>` for each specialist,
  `npx canonkit tool remove <name>` for each tool, and `.claude/canonkit.json` if
  you created one. `tool remove` only takes the tool out of `AGENTS.md`; what the
  tool's own setup wrote (`openspec/`, `graphify-out/`, its skills and git hooks)
  stays — see [tools.md](tools.md) for how to undo each.
